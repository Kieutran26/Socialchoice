import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createStore } from './store.js';
import { createAdminAuth, hashPassword } from './admin-auth.js';
import { createMetaVault } from './meta-vault.js';
import { threadsConfig } from './threads-config.js';
import { createThreadsConnection } from './threads-connection.js';
import { createThreadsGraph, threadsContainerState, threadsPublishedMedia, threadsTokenDetails } from './threads-graph.js';

const configuration = () => threadsConfig({ THREADS_APP_ID: '123', THREADS_APP_SECRET: 'synthetic-secret', THREADS_REDIRECT_URI: 'http://127.0.0.1:3001/api/threads/callback', META_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('hex') });
function fixture(graph) {
    const store = createStore(':memory:'), sessions = new Map(), states = new Map(), pending = new Map();
    const auth = createAdminAuth(hashPassword('synthetic threads test password'), false, { sessions });
    let sessionCookie, flowCookie;
    auth.login({ headers: {} }, { setHeader(_, value) { sessionCookie = value.split(';')[0]; } }, 'synthetic threads test password');
    const req = { headers: { cookie: sessionCookie } }, config = configuration(), brand = store.write('Brand', { name: 'Synthetic test brand' });
    const res = { setHeader(_, value) { flowCookie = value.split(';')[0]; }, writeHead() {}, end() {} };
    const connection = createThreadsConnection(store, auth, config, { states, pending, graph });
    return { store, sessions, states, pending, auth, req, res, config, brand, connection, cookie: () => flowCookie };
}

test('Threads config has independent credentials and exact callback origin', () => {
    assert.equal(threadsConfig({ META_APP_ID: '123', META_APP_SECRET: 'secret' }).ready, false);
    const env = { THREADS_APP_ID: '123', THREADS_APP_SECRET: 'secret', THREADS_REDIRECT_URI: 'https://app.example/api/threads/callback', META_TOKEN_ENCRYPTION_KEY: 'a'.repeat(64) };
    assert.equal(threadsConfig(env).ready, true);
    for (const redirect of ['http://app.example/api/threads/callback','https://app.example/api/meta/callback','https://app.example/api/threads/callback?x=1','https://user@app.example/api/threads/callback']) assert.equal(threadsConfig({ ...env, THREADS_REDIRECT_URI: redirect }).ready, false);
    assert.equal(threadsConfig({ ...env, SOCIALCHOICE_PUBLIC_ORIGIN: 'https://other.example' }).ready, false);
});

test('synthetic OAuth cancellation, replay, expiry and session binding never import credentials', async () => {
    const f = fixture({ exchange() { throw new Error('must not contact provider'); } });
    try {
        const start = await f.connection.execute('start', f.req, f.res, [f.brand.id]), url = new URL(start.url), state = url.searchParams.get('state');
        assert.equal(url.origin, 'https://threads.net'); assert.equal(url.searchParams.has('client_secret'), false);
        await assert.rejects(() => f.connection.callback({ url: `/api/threads/callback?state=${state}&error=denied`, headers: {} }, f.res), { status: 400 });
        const callback = { url: `/api/threads/callback?state=${state}&error=denied`, headers: { cookie: f.cookie() } };
        await f.connection.callback(callback, f.res);
        await assert.rejects(() => f.connection.callback(callback, f.res), { status: 400 });
        const next = await f.connection.execute('start', f.req, f.res, [f.brand.id]);
        f.auth.logout(f.req, { setHeader() {} });
        await assert.rejects(() => f.connection.callback({ url: `/api/threads/callback?state=${new URL(next.url).searchParams.get('state')}&code=synthetic`, headers: { cookie: f.cookie() } }, f.res), { status: 400 });
        assert.equal(f.store.all('SocialAccount').length, 0);
    } finally { f.store.close(); }
});

test('synthetic OAuth profile requires explicit selection and SQLite stores only encrypted independent credential', async () => {
    const expiry = Date.now() + 60000;
    const graph = { async exchange() { return { token: 'synthetic-threads-token', profileId: '789', expiresAt: expiry }; }, async profile() { return { id: '789', username: 'synthetic_user' }; }, async permissions() { return { scopes: ['threads_basic','threads_content_publish'], expiresAt: expiry }; } };
    const f = fixture(graph);
    try {
        const start = await f.connection.execute('start', f.req, f.res, [f.brand.id]);
        await f.connection.callback({ url: `/api/threads/callback?state=${new URL(start.url).searchParams.get('state')}&code=synthetic`, headers: { cookie: f.cookie() } }, f.res);
        assert.equal(f.store.all('SocialAccount').length, 0);
        const profile = await f.connection.execute('profile', f.req, f.res);
        assert.equal(profile.profile.id, '789'); assert.equal(JSON.stringify(profile).includes('synthetic-threads-token'), false);
        await assert.rejects(() => f.connection.execute('import', f.req, f.res, ['790']), { status: 400 });
        assert.deepEqual(await f.connection.execute('import', f.req, f.res, ['789']), { imported: 1 });
        const account = f.store.all('SocialAccount')[0];
        assert.equal(account.platform, 'threads'); assert.equal(account.account_type, 'profile');
        assert.equal(f.store.readCredential(account.credential_id).includes('synthetic-threads-token'), false);
        const credential = createMetaVault(f.store, f.config.key).read(account.credential_id);
        assert.equal(credential.platform, 'threads'); assert.equal(credential.expiresAt, expiry);
        credential.expiresAt = Date.now() - 1; createMetaVault(f.store, f.config.key).save(account.credential_id, credential);
        await assert.rejects(() => f.connection.execute('check', f.req, f.res, [account.id]), { metaCode: 190 });
        assert.equal(f.store.get('SocialAccount', account.id).connection_status, 'expired');
        await f.connection.execute('disconnect', f.req, f.res, [account.id]);
        assert.equal(f.store.readCredential(account.credential_id), undefined);
    } finally { f.store.close(); }
});

test('late expired session during synthetic exchange leaves no pending credential', async () => {
    let f;
    const graph = { async exchange() { f.auth.logout(f.req, { setHeader() {} }); return { token: 'synthetic', profileId: '789', expiresAt: Date.now() + 60000 }; }, async profile() { return { id: '789', username: 'synthetic' }; }, async permissions() { return { scopes: ['threads_basic','threads_content_publish'], expiresAt: Date.now() + 60000 }; } };
    f = fixture(graph);
    try {
        const start = await f.connection.execute('start', f.req, f.res, [f.brand.id]);
        await f.connection.callback({ url: `/api/threads/callback?state=${new URL(start.url).searchParams.get('state')}&code=synthetic`, headers: { cookie: f.cookie() } }, f.res);
        assert.equal(f.pending.size, 0); assert.equal(f.store.all('SocialAccount').length, 0);
    } finally { f.store.close(); }
});

test('Threads status, identity, scope and permalink parsers reject unconfirmed synthetic results', () => {
    assert.equal(threadsContainerState({ id: '12', status: 'FINISHED' }, '12'), 'FINISHED');
    assert.throws(() => threadsContainerState({ id: '12', status_code: 'FINISHED' }, '12'));
    const media = { id: '12', owner: { id: '34' }, permalink: 'https://www.threads.com/@user/post/Abcd' };
    assert.deepEqual(threadsPublishedMedia(media, '12', '34'), { id: '12', url: media.permalink });
    for (const permalink of ['https://threads.com.evil/@user/post/Abcd','https://threads.net/@user/post/Abcd?token=secret','http://threads.net/@user/post/Abcd']) assert.throws(() => threadsPublishedMedia({ ...media, permalink }, '12', '34'));
    assert.throws(() => threadsPublishedMedia(media, '12', '35'));
    const data = { is_valid: true, app_id: '1', user_id: '2', scopes: ['threads_basic','threads_content_publish'], expires_at: Math.floor(Date.now()/1000)+60 };
    assert.equal(threadsTokenDetails({ data }, '1', '2').scopes.length, 2);
    assert.throws(() => threadsTokenDetails({ data: { ...data, scopes: ['threads_basic'] } }, '1', '2'));
    assert.throws(() => threadsTokenDetails({ data }, '3', '2'));
});

test('synthetic Graph contract pins Threads host, uses status and never automatically publishes text container', async () => {
    const previous = globalThis.fetch, calls = [];
    globalThis.fetch = async (url, init) => { calls.push({ url: new URL(url), init }); return new Response(JSON.stringify({ id: '12' }), { status: 200 }); };
    try {
        const graph = createThreadsGraph(configuration());
        for (const asset of [null, { file_type: 'image' }, { file_type: 'video' }]) await graph.create('34', asset, 'https://app.example/signed', 'synthetic text', 'synthetic-token');
        await graph.publish('34', '12', 'synthetic-token');
        assert.ok(calls.every(call => call.url.hostname === 'graph.threads.net' && call.init.redirect === 'manual'));
        assert.deepEqual(calls.slice(0,3).map(call => call.init.body.get('media_type')), ['TEXT','IMAGE','VIDEO']);
        assert.ok(calls.every(call => !call.init.body.has('auto_publish_text')));
        assert.equal(calls[3].init.body.get('creation_id'), '12');
    } finally { globalThis.fetch = previous; }
});

test('synthetic token exchange verifies short identity, bounded long lifetime and actual granted scopes', async () => {
    const previous = globalThis.fetch, calls = [], expiry = Math.floor(Date.now()/1000)+600;
    const results = [{ access_token: 'synthetic-short', user_id: '789' }, { access_token: 'synthetic-long', token_type: 'bearer', expires_in: 600 }, { id: '789', username: 'synthetic' }, { data: { is_valid: true, app_id: '123', user_id: '789', scopes: ['threads_basic','threads_content_publish'], expires_at: expiry } }];
    globalThis.fetch = async (url, init) => { calls.push({ url: new URL(url), init }); return new Response(JSON.stringify(results.shift())); };
    try {
        const graph = createThreadsGraph(configuration()), credential = await graph.exchange('synthetic-code');
        assert.equal(credential.profileId, '789'); assert.equal(credential.token, 'synthetic-long');
        assert.equal((await graph.profile(credential.token)).id, '789');
        assert.equal((await graph.permissions(credential.token, '789')).expiresAt, expiry*1000);
        assert.equal(calls[0].url.pathname, '/oauth/access_token');
        assert.equal(calls[0].init.body.get('grant_type'), 'authorization_code');
        assert.equal(calls[1].url.pathname, '/access_token');
        assert.equal(calls[1].url.searchParams.get('grant_type'), 'th_exchange_token');
        assert.equal(calls[3].url.pathname, '/debug_token');
        assert.equal(calls[3].init.headers.Authorization, 'Bearer synthetic-long');
    } finally { globalThis.fetch = previous; }
});

test('access check identity mismatch and late code190 never corrupt a reconnected synthetic credential', async () => {
    let f, old;
    const graph = { async profile() { f.store.verifiedAccount({ credential_id: 'new-credential' }, old.id); throw Object.assign(new Error('synthetic expiry'), { metaCode: 190 }); } };
    f = fixture(graph);
    try {
        old = f.store.verifiedAccount({ name: 'Synthetic profile', brand_id: f.brand.id, platform: 'threads', account_type: 'profile', external_id: '789', credential_id: 'old-credential', scopes: ['threads_basic','threads_content_publish'], connection_status: 'connected' });
        createMetaVault(f.store, f.config.key).save('old-credential', { platform: 'threads', token: 'synthetic', profileId: '789', scopes: ['threads_basic','threads_content_publish'], expiresAt: Date.now()+60000 });
        await assert.rejects(() => f.connection.execute('check', f.req, f.res, [old.id]), { metaCode: 190 });
        assert.equal(f.store.get('SocialAccount', old.id).connection_status, 'connected');
        assert.equal(f.store.get('SocialAccount', old.id).credential_id, 'new-credential');
    } finally { f.store.close(); }
});
