import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { hashPassword } from './admin-auth.js';
import { issueWebLicense } from '../scripts/web-license-owner.mjs';

const require = createRequire(import.meta.url);
const { Miniflare, convertV4MiniflareOptions } = createRequire(require.resolve('wrangler/package.json'))('miniflare');

test('real customer Workers isolate records, media, OAuth and sessions while preserving the owner workspace', async () => {
    const build = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--dry-run', '--outdir', 'worker-dist/customer'], { encoding: 'utf8', env: { ...process.env, XDG_CONFIG_HOME: join(process.cwd(), '.wrangler/config'), WRANGLER_SEND_METRICS: 'false' } });
    assert.equal(build.status, 0, build.stderr);
    const directory = mkdtempSync(join(tmpdir(), 'socialchoice-customer-worker-')), origin = 'https://socialchoice.vercel.app';
    const issuer = generateKeyPairSync('ed25519'), password = randomBytes(20).toString('hex');
    const issue = email => issueWebLicense({ privateKey: issuer.privateKey, email, licensedTo: 'Fixture customer', edition: 'starter', purchaseConfirmed: true });
    const licenseA = issue('a@example.com'), licenseB = issue('b@example.com');
    const options = convertV4MiniflareOptions({ modules: true, scriptPath: 'worker-dist/customer/cloudflare-worker.js', compatibilityDate: '2026-10-06', compatibilityFlags: ['nodejs_compat'],
        durableObjects: { WORKSPACE: { className: 'SocialchoiceWorkspace', useSQLite: true }, CUSTOMER_DIRECTORY: { className: 'SocialchoiceCustomerDirectory', useSQLite: true }, CUSTOMER_WORKSPACES: { className: 'SocialchoiceCustomerWorkspace', useSQLite: true } },
        bindings: { SOCIALCHOICE_PUBLIC_ORIGIN: origin, SOCIALCHOICE_BACKEND_ORIGIN: origin, SOCIALCHOICE_ADMIN_PASSWORD_HASH: hashPassword(password), SOCIALCHOICE_STORAGE_KEY: randomBytes(32).toString('hex'), SOCIALCHOICE_WEB_LICENSE_PUBLIC_KEY: licenseA.publicKeyHex, META_APP_ID: '12345', META_APP_SECRET: 'fixture-secret', META_GRAPH_VERSION: 'v26.0', META_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('hex'), META_REDIRECT_URI: origin + '/api/meta/callback' },
    });
    options.resourcePersistencePath = directory;
    let runtime = new Miniflare(options);
    const request = (path, args, cookie, extras = {}) => runtime.dispatchFetch(origin + path, { redirect: 'manual', method: args ? 'POST' : 'GET', headers: { 'x-socialchoice-client': 'local-ui', 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...extras }, ...(args ? { body: JSON.stringify({ args }) } : {}) });
    const cookieFrom = response => response.headers.get('set-cookie').split(';')[0];
    const register = async (email, license) => { const response = await request('/api/customer/register', [{ email, password, license }]); assert.equal(response.status, 200, await response.clone().text()); return { cookie: cookieFrom(response), recoveryCode: (await response.json()).recoveryCode }; };
    try {
        assert.equal((await (await request('/api/customer/config')).json()).ready, true);
        assert.equal((await request('/api/session')).status, 401);
        const owner = await request('/api/auth/login', [password]); assert.equal(owner.status, 200); const ownerCookie = cookieFrom(owner);
        const ownerBrand = await (await request('/api/entities/Brand/create', [{ name: 'Existing owner brand' }], ownerCookie)).json();
        const a = await register('a@example.com', licenseA.token), b = await register('b@example.com', licenseB.token);
        assert.match(a.cookie, /^socialchoice_customer=/);
        const aSession = await (await request('/api/session', undefined, a.cookie)).json();
        assert.equal(aSession.email, 'a@example.com'); assert.equal(aSession.license.multiple_devices, true); assert.equal(aSession.role, 'customer');
        const brandResponse = await request('/api/entities/Brand/create', [{ name: 'Private A brand' }], a.cookie);
        assert.equal(brandResponse.status, 200, await brandResponse.clone().text()); const brand = await brandResponse.json();
        assert.equal((await (await request('/api/entities/Brand/list', [], b.cookie)).json()).items.length, 0);
        assert.equal((await request('/api/entities/Brand/update', [brand.id, { name: 'Cross-tenant overwrite' }], b.cookie)).status, 404);
        assert.equal((await request('/api/entities/Post/create', [{ brand_id: brand.id, title: 'Cross-tenant reference' }], b.cookie)).status, 404);
        const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=', 'base64');
        const upload = await runtime.dispatchFetch(origin + '/api/media/upload', { method: 'POST', headers: { cookie: a.cookie, 'x-socialchoice-client': 'local-ui', 'content-type': 'image/png', 'x-image-brand': brand.id, 'x-image-name': 'fixture.png' }, body: png });
        assert.equal(upload.status, 200, await upload.clone().text()); const asset = await upload.json();
        assert.equal((await runtime.dispatchFetch(origin + asset.file_url, { headers: { cookie: b.cookie } })).status, 404);
        assert.equal((await runtime.dispatchFetch(origin + asset.file_url)).status, 401);
        const ownImage = await runtime.dispatchFetch(origin + asset.file_url, { headers: { cookie: a.cookie } }); assert.equal(ownImage.status, 200); assert.deepEqual(Buffer.from(await ownImage.arrayBuffer()), png);
        assert.equal((await request('/api/session', undefined, undefined, { 'x-socialchoice-workspace-context': 'forged.context' })).status, 401);
        assert.equal((await request('/api/customer/login', [{ email: 'a@example.com', password }], undefined, { origin: 'https://attacker.example' })).status, 403);
        const start = await request('/api/meta/start', [brand.id, 'facebook'], a.cookie); assert.equal(start.status, 200, await start.clone().text());
        const authUrl = new URL((await start.json()).url), nonce = cookieFrom(start), callback = '/api/meta/callback?state=' + authUrl.searchParams.get('state') + '&error=access_denied';
        assert.equal((await request(callback, undefined, b.cookie + '; ' + nonce)).status, 400);
        const denied = await request(callback, undefined, a.cookie + '; ' + nonce, { 'sec-fetch-site': 'cross-site' }); assert.equal(denied.status, 303); assert.ok(denied.headers.get('location').endsWith('meta=cancelled'));
        const secondLogin = await request('/api/customer/login', [{ email: 'a@example.com', password }]); assert.equal(secondLogin.status, 200); const secondCookie = cookieFrom(secondLogin);
        assert.equal((await request('/api/session', undefined, a.cookie)).status, 200);
        await request('/api/auth/logout', [], secondCookie); assert.equal((await request('/api/session', undefined, secondCookie)).status, 401); assert.equal((await request('/api/session', undefined, a.cookie)).status, 200);
        await runtime.dispose(); runtime = new Miniflare(options);
        assert.equal((await (await request('/api/entities/Brand/list', [], a.cookie)).json()).items[0].id, brand.id);
        assert.equal((await (await request('/api/entities/Brand/list', [], ownerCookie)).json()).items[0].id, ownerBrand.id);
        assert.equal((await (await request('/api/entities/Brand/list', [], b.cookie)).json()).items.length, 0);
        const recovered = await request('/api/customer/recover', [{ email: 'a@example.com', password: password + '-new', recoveryCode: a.recoveryCode }]); assert.equal(recovered.status, 200, await recovered.clone().text());
        assert.equal((await request('/api/session', undefined, a.cookie)).status, 401);
        assert.equal((await request('/api/session', undefined, cookieFrom(recovered))).status, 200);
        assert.equal((await request('/api/customer/register', [{ email: 'a@example.com', password, license: licenseA.token }])).status, 409);
        assert.equal((await request('/api/customer/register', [{ email: 'wrong@example.com', password, license: licenseA.token }])).status, 403);
        const publicMedia = '/api/workspaces/' + aSession.id + '/api/instagram-media/00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000002?expires=0&signature=' + '0'.repeat(64);
        assert.equal((await request(publicMedia)).status, 403);
        assert.equal((await request('/api/workspaces/' + aSession.id + '/api/session', undefined, b.cookie)).status, 404);
    } finally { await runtime.dispose(); rmSync(directory, { recursive: true, force: true }); }
});
