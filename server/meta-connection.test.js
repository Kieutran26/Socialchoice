import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createStore } from './store.js';
import { createMetaVault } from './meta-vault.js';
import { metaConfig } from './meta-config.js';
import { createMetaConnection, safeConnectionFailure } from './meta-connection.js';
import { createAdminAuth, hashPassword } from './admin-auth.js';
import { createApi } from './index.js';

function configuration() {
    return metaConfig({ META_APP_ID: '123456', META_APP_SECRET: 'test-only-app-secret', META_GRAPH_VERSION: 'v25.0', META_REDIRECT_URI: 'http://127.0.0.1:3001/api/meta/callback', META_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('hex') });
}

test('connection diagnostics expose only a known step and numeric Meta codes', () => {
    const sensitive = new Error('private token in a remote message');
    Object.assign(sensitive, { metaStep: 'code_exchange', metaCode: 190, metaSubcode: 123, token: 'private token', request: 'private URL' });
    assert.deepEqual(safeConnectionFailure(sensitive), { step: 'code_exchange', code: 190, subcode: 123 });
    assert.deepEqual(safeConnectionFailure({ metaStep: 'private token', metaCode: 'private token', metaSubcode: NaN }), { step: 'connection' });
});

test('Meta configuration rejects incomplete credentials and nonlocal HTTP redirects', () => {
    assert.equal(metaConfig({}).ready, false);
    const base = { META_APP_ID: '123', META_APP_SECRET: 'secret', META_GRAPH_VERSION: 'v25.0', META_REDIRECT_URI: 'http://example.com/api/meta/callback', META_TOKEN_ENCRYPTION_KEY: 'a'.repeat(64) };
    assert.equal(metaConfig(base).ready, false);
    assert.equal(metaConfig({ ...base, META_REDIRECT_URI: 'https://example.com/api/meta/callback' }).ready, true);
    assert.equal(metaConfig({ ...base, META_REDIRECT_URI: 'https://example.com/other' }).ready, false);
});

test('encrypted credential survives restart, authenticates identity and stays outside entity contracts', () => {
    const directory = mkdtempSync(join(tmpdir(), 'socialchoice-meta-'));
    const path = join(directory, 'store.sqlite');
    const key = randomBytes(32).toString('hex');
    let store = createStore(path);
    try {
        const vault = createMetaVault(store, key);
        vault.save('credential-a', { token: 'private-unit-test-token' });
        const ciphertext = store.readCredential('credential-a');
        assert.equal(ciphertext.includes('private-unit-test-token'), false);
        assert.throws(() => store.execute('OAuthCredential', 'filter', [{}]));
        store.close(); store = createStore(path);
        assert.equal(createMetaVault(store, key).read('credential-a').token, 'private-unit-test-token');
        assert.equal(readFileSync(path).includes(Buffer.from('private-unit-test-token')), false);
        store.saveCredential('credential-b', ciphertext);
        assert.throws(() => createMetaVault(store, key).read('credential-b'), { status: 409 });
        assert.throws(() => createMetaVault(store, randomBytes(32).toString('hex')).read('credential-a'), { status: 409 });
        createMetaVault(store, key).remove('credential-a');
        assert.throws(() => createMetaVault(store, key).read('credential-a'), { status: 409 });
    } finally { store.close(); rmSync(directory, { recursive: true }); }
});

test('OAuth start binds state to admin session and cookie; invalid/cancelled/replayed callbacks never contact Meta', async () => {
    const store = createStore(':memory:');
    const auth = createAdminAuth(hashPassword('oauth test admin passphrase'));
    let sessionCookie, flowCookie;
    auth.login({ headers: {} }, { setHeader: (_, value) => { sessionCookie = value.split(';')[0]; } }, 'oauth test admin passphrase');
    const req = { headers: { cookie: sessionCookie } };
    const brand = store.write('Brand', { name: 'Test brand' });
    const meta = createMetaConnection(store, auth, configuration());
    const res = { setHeader: (_, value) => { flowCookie = value.split(';')[0]; }, writeHead() {}, end() {} };
    try {
        const result = await meta.execute('start', req, res, [brand.id]);
        const url = new URL(result.url);
        assert.equal(url.hostname, 'www.facebook.com');
        assert.ok(url.searchParams.get('scope').split(',').includes('pages_read_user_content'));
        assert.equal(url.searchParams.has('client_secret'), false);
        const state = url.searchParams.get('state');
        await assert.rejects(() => meta.callback({ url: `/api/meta/callback?state=${state}&error=access_denied`, headers: {} }, res), { status: 400 });
        await meta.callback({ url: `/api/meta/callback?state=${state}&error=access_denied`, headers: { cookie: flowCookie } }, res);
        await assert.rejects(() => meta.callback({ url: `/api/meta/callback?state=${state}&code=never-used`, headers: { cookie: flowCookie } }, res), { status: 400 });
        await assert.rejects(() => meta.execute('import', req, res, [['unknown-page']]), { status: 409 });
        assert.equal(store.all('SocialAccount').length, 0);
        const second = await meta.execute('start', req, res, [brand.id]);
        auth.logout(req, { setHeader() {} });
        await assert.rejects(() => meta.callback({ url: `/api/meta/callback?state=${new URL(second.url).searchParams.get('state')}&error=access_denied`, headers: { cookie: flowCookie } }, res), { status: 400 });
    } finally { store.close(); }
});

test('manual account operations cannot forge credentials or modify verified platform metadata', () => {
    const store = createStore(':memory:');
    try {
        const brand = store.write('Brand', { name: 'Brand' });
        assert.throws(() => store.write('SocialAccount', { name: 'Fake Page', brand_id: brand.id, credential_id: 'invented' }), { status: 409 });
        const account = store.verifiedAccount({ name: 'Internal invariant test', brand_id: brand.id, external_id: '123', credential_id: 'server-test-id', connection_status: 'connected' });
        assert.throws(() => store.execute('SocialAccount', 'update', [account.id, { external_id: '456' }]), { status: 409 });
        assert.throws(() => store.execute('SocialAccount', 'update', [account.id, { connection_status: 'disconnected' }]), { status: 409 });
        assert.throws(() => store.execute('SocialAccount', 'delete', [account.id]), { status: 409 });
        assert.doesNotThrow(() => store.execute('SocialAccount', 'update', [account.id, { name: 'Internal renamed record' }]));
    } finally { store.close(); }
});

test('Meta setup generates a private stable key without leaking secret or overwriting configuration', () => {
    const directory = mkdtempSync(join(tmpdir(), 'socialchoice-meta-setup-'));
    const script = resolve('server/setup-meta.js');
    const input = JSON.stringify({ appId: '123', appSecret: 'private-test-only-meta-secret', version: 'v25.0', redirectUri: 'http://127.0.0.1:3001/api/meta/callback' });
    try {
        const first = spawnSync(process.execPath, [script], { cwd: directory, input, encoding: 'utf8' });
        assert.equal(first.status, 0);
        assert.equal((first.stdout + first.stderr).includes('private-test-only-meta-secret'), false);
        const contents = readFileSync(join(directory, '.env.meta'), 'utf8');
        assert.match(contents, /META_TOKEN_ENCRYPTION_KEY=[a-f0-9]{64}/);
        const second = spawnSync(process.execPath, [script], { cwd: directory, input, encoding: 'utf8' });
        assert.notEqual(second.status, 0);
        assert.equal(readFileSync(join(directory, '.env.meta'), 'utf8'), contents);
    } finally { rmSync(directory, { recursive: true }); }
});

test('unconfigured Meta HTTP routes expose no credentials and reject OAuth/import', async () => {
    const { server } = createApi({ dbPath: ':memory:', passwordHash: undefined });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/meta/`;
    const headers = { 'X-Socialchoice-Client': 'local-ui', 'Content-Type': 'application/json' };
    try {
        const status = await (await fetch(base + 'status', { headers })).json();
        assert.equal(status.ready, false);
        assert.equal(status.adminRequired, true);
        assert.equal(JSON.stringify(status).includes('test-only-app-secret'), false);
        assert.deepEqual(await (await fetch(base + 'pages', { headers })).json(), { pages: [], pending: false });
        assert.equal((await fetch(base + 'start', { method: 'POST', headers, body: JSON.stringify({ args: ['unknown'] }) })).status, 409);
        assert.equal((await fetch(base + 'callback?code=never-used&state=invalid', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 409);
    } finally { await new Promise(resolve => server.close(resolve)); }
});
