import test from 'node:test';
import assert from 'node:assert/strict';
import { runtimeConfig } from './runtime-config.js';
import { configureProxy } from './configure-api-proxy.js';
import { createApi } from './index.js';
import { hashPassword } from './admin-auth.js';
import { request } from 'node:http';

test('public listener fails without explicit authentication and persistent database path', () => {
    assert.deepEqual(runtimeConfig({}), { host: '127.0.0.1', port: 3001 });
    assert.throws(() => runtimeConfig({ SOCIALCHOICE_BIND_HOST: '0.0.0.0' }));
    assert.throws(() => runtimeConfig({ PORT: 'invalid' }));
    assert.deepEqual(runtimeConfig({ PORT: '10000', SOCIALCHOICE_BIND_HOST: '0.0.0.0', SOCIALCHOICE_PUBLIC_ORIGIN: 'https://socialchoice.vercel.app', SOCIALCHOICE_ADMIN_PASSWORD_HASH: 'configured', SOCIALCHOICE_DB_PATH: '/var/data/socialchoice.sqlite' }), { host: '0.0.0.0', port: 10000 });
});

test('API proxy preserves SPA fallback and refuses insecure or circular destinations', () => {
    const previous = { framework: 'vite', rewrites: [{ source: '/(.*)', destination: '/index.html' }] };
    const next = configureProxy(previous, 'https://verified-backend.example');
    assert.equal(next.rewrites[0].destination, 'https://verified-backend.example/api/:path*');
    assert.deepEqual(next.rewrites[1], previous.rewrites[0]);
    assert.equal(next.headers[0].headers[1].value, '0');
    assert.throws(() => configureProxy(previous, 'http://backend.example'));
    assert.throws(() => configureProxy(previous, 'https://socialchoice.vercel.app'));
    assert.throws(() => configureProxy(previous, 'https://backend.example/some-path'));
});

test('reverse-proxied backend accepts configured host while retaining origin and session protections', async () => {
    const { server } = createApi({ dbPath: ':memory:', passwordHash: hashPassword('proxy authentication test password'), publicOrigin: 'https://socialchoice.vercel.app', backendOrigin: 'https://verified-backend.example' });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const status = (path, headers) => new Promise((resolve, reject) => {
        const req = request(base + path, { headers }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
        req.on('error', reject); req.end();
    });
    try {
        const headers = { Host: 'verified-backend.example', 'X-Socialchoice-Client': 'local-ui' };
        assert.equal(await status('/health', headers), 200);
        assert.equal(await status('/session', headers), 401);
        assert.equal(await status('/session', { ...headers, Origin: 'https://unrelated.example' }), 403);
        assert.equal(await status('/health', { Host: 'unrelated.example' }), 403);
    } finally { await new Promise(resolve => server.close(resolve)); }
});
