import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createStore } from './store.js';
import { createAdminAuth, hashPassword } from './admin-auth.js';
import { xConfig } from './x-config.js';
import { createXConnection } from './x-connection.js';

const configuration = () => xConfig({
    X_CLIENT_ID: 'test-client-id',
    X_CLIENT_SECRET: 'test-client-secret',
    X_REDIRECT_URI: 'http://127.0.0.1:3001/api/x/callback',
    META_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
});

function fixture(graph) {
    const store = createStore(':memory:');
    const sessions = new Map(), states = new Map(), pending = new Map();
    const auth = createAdminAuth(hashPassword('synthetic x test password'), false, { sessions });
    let sessionCookie, flowCookie;
    auth.login({ headers: {} }, { setHeader(_, value) { sessionCookie = value.split(';')[0]; } }, 'synthetic x test password');
    const req = { headers: { cookie: sessionCookie } };
    const config = configuration();
    const brand = store.write('Brand', { name: 'X Test Brand' });
    const res = { setHeader(_, value) { flowCookie = value.split(';')[0]; }, writeHead() {}, end() {} };
    const connection = createXConnection(store, auth, config, { states, pending, graph });
    return { store, sessions, states, pending, auth, req, res, config, brand, connection, cookie: () => flowCookie };
}

test('X config validates client ID, secret, and redirect URI', () => {
    assert.equal(xConfig({}).ready, false);
    const env = {
        X_CLIENT_ID: 'client123',
        X_CLIENT_SECRET: 'secret123',
        X_REDIRECT_URI: 'https://app.example/api/x/callback',
        META_TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
    };
    assert.equal(xConfig(env).ready, true);
    assert.equal(xConfig({ ...env, X_REDIRECT_URI: 'https://app.example/api/other' }).ready, false);
    assert.equal(xConfig({ ...env, SOCIALCHOICE_PUBLIC_ORIGIN: 'https://mismatch.example' }).ready, false);
});

test('X OAuth start generates PKCE challenge and binds state', async () => {
    const f = fixture({ exchange() { throw new Error('stub'); } });
    try {
        const start = await f.connection.execute('start', f.req, f.res, [f.brand.id]);
        const url = new URL(start.url);
        assert.equal(url.origin, 'https://twitter.com');
        assert.equal(url.searchParams.get('client_id'), 'test-client-id');
        assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
        assert.ok(url.searchParams.get('code_challenge'));
        assert.ok(url.searchParams.get('state'));
    } finally {
        f.store.close();
    }
});

test('X OAuth callback exchanges code and imports profile', async () => {
    const expiry = Date.now() + 3600 * 1000;
    const graph = {
        async exchange() {
            return {
                platform: 'x',
                token: 'x-access-token-123',
                refreshToken: 'x-refresh-token-123',
                scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
                expiresAt: expiry,
            };
        },
        async profile() {
            return {
                id: '987654321',
                username: 'socialchoice_dev',
                name: 'Socialchoice Dev',
            };
        },
    };
    const f = fixture(graph);
    try {
        const start = await f.connection.execute('start', f.req, f.res, [f.brand.id]);
        const state = new URL(start.url).searchParams.get('state');
        await f.connection.callback({ url: `/api/x/callback?state=${state}&code=auth-code-123`, headers: { cookie: f.cookie() } }, f.res);

        const profile = await f.connection.execute('profile', f.req, f.res);
        assert.equal(profile.pending, true);
        assert.equal(profile.profile.id, '987654321');
        assert.equal(profile.profile.username, 'socialchoice_dev');

        const imported = await f.connection.execute('import', f.req, f.res, ['987654321']);
        assert.deepEqual(imported, { imported: 1 });

        const accounts = f.store.all('SocialAccount');
        assert.equal(accounts.length, 1);
        assert.equal(accounts[0].platform, 'x');
        assert.equal(accounts[0].external_id, '987654321');
        assert.equal(accounts[0].connection_status, 'connected');

        // Check account status
        const check = await f.connection.execute('check', f.req, f.res, [accounts[0].id]);
        assert.deepEqual(check, { connected: true });

        // Disconnect
        const disconnected = await f.connection.execute('disconnect', f.req, f.res, [accounts[0].id]);
        assert.deepEqual(disconnected, { disconnected: true });
        assert.equal(f.store.get('SocialAccount', accounts[0].id).connection_status, 'disconnected');
    } finally {
        f.store.close();
    }
});

