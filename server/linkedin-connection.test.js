import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createStore } from './store.js';
import { createAdminAuth, hashPassword } from './admin-auth.js';
import { createMetaVault } from './meta-vault.js';
import { linkedinConfig } from './linkedin-config.js';
import { createLinkedinConnection } from './linkedin-connection.js';
import { createLinkedinGraph, linkedinProfile, linkedinPublishedId, linkedinTokenDetails } from './linkedin-graph.js';

const configuration = () => linkedinConfig({ LINKEDIN_CLIENT_ID: 'abc123', LINKEDIN_CLIENT_SECRET: 'synthetic-secret', LINKEDIN_REDIRECT_URI: 'http://127.0.0.1:3001/api/linkedin/callback', META_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('hex') });
function fixture(graph) {
    const store = createStore(':memory:'), sessions = new Map(), states = new Map(), pending = new Map();
    const auth = createAdminAuth(hashPassword('synthetic linkedin test password'), false, { sessions });
    let sessionCookie, flowCookie;
    auth.login({ headers: {} }, { setHeader(_, value) { sessionCookie = value.split(';')[0]; } }, 'synthetic linkedin test password');
    const req = { headers: { cookie: sessionCookie } }, config = configuration(), brand = store.write('Brand', { name: 'Synthetic test brand' });
    const res = { setHeader(_, value) { flowCookie = value.split(';')[0]; }, writeHead() {}, end() {} };
    const connection = createLinkedinConnection(store, auth, config, { states, pending, graph });
    return { store, sessions, states, pending, auth, req, res, config, brand, connection, cookie: () => flowCookie };
}

test('Linkedin config has independent credentials and exact callback origin', () => {
    assert.equal(linkedinConfig({ META_APP_ID: 'abc123', META_APP_SECRET: 'secret' }).ready, false);
    const env = { LINKEDIN_CLIENT_ID: 'abc123', LINKEDIN_CLIENT_SECRET: 'secret', LINKEDIN_REDIRECT_URI: 'https://app.example/api/linkedin/callback', META_TOKEN_ENCRYPTION_KEY: 'a'.repeat(64) };
    assert.equal(linkedinConfig(env).ready, true);
    for (const redirect of ['http://app.example/api/linkedin/callback','https://app.example/api/meta/callback','https://app.example/api/linkedin/callback?x=1','https://user@app.example/api/linkedin/callback']) assert.equal(linkedinConfig({ ...env, LINKEDIN_REDIRECT_URI: redirect }).ready, false);
    assert.equal(linkedinConfig({ ...env, SOCIALCHOICE_PUBLIC_ORIGIN: 'https://other.example' }).ready, false);
});

test('synthetic OAuth cancellation, replay, expiry and session binding never import credentials', async () => {
    const f = fixture({ exchange() { throw new Error('must not contact provider'); } });
    try {
        const start = await f.connection.execute('start', f.req, f.res, [f.brand.id]), url = new URL(start.url), state = url.searchParams.get('state');
        assert.equal(url.origin, 'https://www.linkedin.com'); assert.equal(url.searchParams.has('client_secret'), false);
        await assert.rejects(() => f.connection.callback({ url: `/api/linkedin/callback?state=${state}&error=denied`, headers: {} }, f.res), { status: 400 });
        const callback = { url: `/api/linkedin/callback?state=${state}&error=denied`, headers: { cookie: f.cookie() } };
        await f.connection.callback(callback, f.res);
        await assert.rejects(() => f.connection.callback(callback, f.res), { status: 400 });
        const next = await f.connection.execute('start', f.req, f.res, [f.brand.id]);
        f.auth.logout(f.req, { setHeader() {} });
        await assert.rejects(() => f.connection.callback({ url: `/api/linkedin/callback?state=${new URL(next.url).searchParams.get('state')}&code=synthetic`, headers: { cookie: f.cookie() } }, f.res), { status: 400 });
        assert.equal(f.store.all('SocialAccount').length, 0);
    } finally { f.store.close(); }
});

test('synthetic OAuth profile requires explicit selection and SQLite stores only encrypted independent credential', async () => {
    const expiry = Date.now() + 60000;
    const graph = { async exchange() { return { token: 'synthetic-linkedin-token', profileId: '789', expiresAt: expiry }; }, async profile() { return { id: '789', username: 'synthetic_user' }; }, async permissions() { return { scopes: ['openid','profile','w_member_social'], expiresAt: expiry }; } };
    const f = fixture(graph);
    try {
        const start = await f.connection.execute('start', f.req, f.res, [f.brand.id]);
        await f.connection.callback({ url: `/api/linkedin/callback?state=${new URL(start.url).searchParams.get('state')}&code=synthetic`, headers: { cookie: f.cookie() } }, f.res);
        assert.equal(f.store.all('SocialAccount').length, 0);
        const profile = await f.connection.execute('profile', f.req, f.res);
        assert.equal(profile.profile.id, '789'); assert.equal(JSON.stringify(profile).includes('synthetic-linkedin-token'), false);
        await assert.rejects(() => f.connection.execute('import', f.req, f.res, ['790']), { status: 400 });
        assert.deepEqual(await f.connection.execute('import', f.req, f.res, ['789']), { imported: 1 });
        const account = f.store.all('SocialAccount')[0];
        assert.equal(account.platform, 'linkedin'); assert.equal(account.account_type, 'profile');
        assert.equal(f.store.readCredential(account.credential_id).includes('synthetic-linkedin-token'), false);
        const credential = createMetaVault(f.store, f.config.key).read(account.credential_id);
        assert.equal(credential.platform, 'linkedin'); assert.equal(credential.expiresAt, expiry);
        credential.expiresAt = Date.now() - 1; createMetaVault(f.store, f.config.key).save(account.credential_id, credential);
        await assert.rejects(() => f.connection.execute('check', f.req, f.res, [account.id]), { metaCode: 190 });
        assert.equal(f.store.get('SocialAccount', account.id).connection_status, 'expired');
        await f.connection.execute('disconnect', f.req, f.res, [account.id]);
        assert.equal(f.store.readCredential(account.credential_id), undefined);
    } finally { f.store.close(); }
});

