import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { hashPassword } from './admin-auth.js';

// Exercise the actual bundled Worker and SQLite actor, with an isolated test database.
const require = createRequire(import.meta.url);
const { Miniflare, convertV4MiniflareOptions } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
test('Worker authentication and Vietnamese content survive runtime restart', async () => {
    const build = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--dry-run', '--outdir', 'worker-dist'], { encoding: 'utf8', env: { ...process.env, XDG_CONFIG_HOME: join(process.cwd(), '.wrangler/config'), WRANGLER_SEND_METRICS: 'false' } });
    assert.equal(build.status, 0, build.stderr);
    const directory = mkdtempSync(join(tmpdir(), 'socialchoice-worker-'));
    const origin = 'https://socialchoice.vercel.app';
    const password = randomBytes(20).toString('hex');
    const options = convertV4MiniflareOptions({
        modules: true, scriptPath: 'worker-dist/cloudflare-worker.js', compatibilityDate: '2026-10-06', compatibilityFlags: ['nodejs_compat'],
        durableObjects: { WORKSPACE: { className: 'SocialchoiceWorkspace', useSQLite: true } },
        bindings: { SOCIALCHOICE_PUBLIC_ORIGIN: origin, SOCIALCHOICE_BACKEND_ORIGIN: origin, SOCIALCHOICE_ADMIN_PASSWORD_HASH: hashPassword(password), SOCIALCHOICE_STORAGE_KEY: randomBytes(32).toString('hex') },
    });
    options.resourcePersistencePath = directory;
    let runtime = new Miniflare(options);
    const request = (path, args, cookie) => runtime.dispatchFetch(origin + path, {
        method: args ? 'POST' : 'GET', headers: { host: new URL(origin).host, 'x-socialchoice-client': 'local-ui', 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
        ...(args ? { body: JSON.stringify({ args }) } : {}),
    });
    try {
        const anonymous = await request('/api/session');
        assert.equal(anonymous.status, 401, await anonymous.text());
        const login = await request('/api/auth/login', [password]);
        assert.equal(login.status, 200, await login.text());
        const cookie = login.headers.get('set-cookie').split(';')[0];
        assert.match(login.headers.get('set-cookie'), /HttpOnly.*Secure/);
        const saved = await request('/api/entities/Brand/create', [{ name: 'Thương hiệu Việt' }], cookie);
        assert.equal(saved.status, 200, await saved.clone().text());
        const brand = await saved.json();
        const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=', 'base64');
        const upload = await runtime.dispatchFetch(origin+'/api/media/upload', { method:'POST', headers:{ cookie, 'x-socialchoice-client':'local-ui', 'content-type':'image/png', 'x-image-brand':brand.id, 'x-image-name':encodeURIComponent('ảnh-test.png') }, body:png });
        assert.equal(upload.status,200,await upload.clone().text());
        const asset = await upload.json();
        await runtime.dispose(); runtime = new Miniflare(options);
        assert.equal((await runtime.dispatchFetch(origin+asset.file_url)).status,401);
        const storedImage = await runtime.dispatchFetch(origin+asset.file_url,{headers:{cookie}});
        assert.equal(storedImage.status,200);
        assert.deepEqual(Buffer.from(await storedImage.arrayBuffer()),png);
        assert.equal((await request('/api/session', undefined, cookie)).status, 200);
        const list = await request('/api/entities/Brand/list', [], cookie);
        assert.equal((await list.json()).items[0].name, brand.name);
        const draftResponse = await request('/api/entities/Post/create', [{ title: 'Bản nháp kiểm tra', caption: 'Chưa gửi đến Facebook', brand_id: brand.id }], cookie);
        assert.equal(draftResponse.status, 200);
        const draft = await draftResponse.json();
        assert.equal((await request('/api/publishing/prepare', [draft.id])).status, 401);
        const prepare = await request('/api/publishing/prepare', [draft.id], cookie);
        assert.equal(prepare.status, 409);
        assert.match((await prepare.json()).message, /Configure Meta/);
        assert.equal((await request('/api/publishing/publish', ['nonexistent'], cookie)).status, 404);
        const history = await request('/api/entities/PublishJob/list', [], cookie);
        assert.equal((await history.json()).items.length, 0);
        await request('/api/auth/logout', [], cookie);
        assert.equal((await request('/api/session', undefined, cookie)).status, 401);
        for (let n = 0; n < 5; n++) assert.equal((await request('/api/auth/login', ['incorrect'])).status, 401);
        await runtime.dispose(); runtime = new Miniflare(options);
        assert.equal((await request('/api/auth/login', [password])).status, 429);
    } finally { await runtime.dispose(); rmSync(directory, { recursive: true, force: true }); }
});
