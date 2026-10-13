import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from './index.js';
import { createAdminAuth, hashPassword } from './admin-auth.js';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

test('admin session protects entities, rotates cookies, rejects cross-origin login and revokes logout', async () => {
    const { server } = createApi({ dbPath: ':memory:', passwordHash: hashPassword('a separate test passphrase') });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const headers = { 'X-Socialchoice-Client': 'local-ui', 'Content-Type': 'application/json' };
    const post = (path, args, extra = {}) => fetch(base + path, { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify({ args }) });
    try {
        assert.equal((await fetch(base + '/session', { headers })).status, 401);
        assert.equal((await post('/entities/Brand/create', [{ name: 'Blocked' }])).status, 401);
        assert.equal((await post('/collaboration/prepare', ['absent','1234'])).status,401);
        assert.equal((await post('/collaboration/invite', ['absent'])).status,401);
        assert.equal((await post('/auth/login', ['a separate test passphrase'], { Origin: 'https://evil.example' })).status, 403);
        assert.equal((await post('/auth/login', ['wrong'])).status, 401);
        const login = await post('/auth/login', ['a separate test passphrase']);
        assert.equal(login.status, 200);
        const cookie = login.headers.get('set-cookie');
        assert.match(cookie, /HttpOnly; SameSite=Strict/);
        const authenticated = { Cookie: cookie.split(';')[0] };
        assert.equal((await post('/collaboration/prepare',['absent','1234'],{...authenticated,Origin:'https://evil.example'})).status,403);
        assert.equal((await post('/collaboration/list',[1234],authenticated)).status,410);
        const session = await fetch(base + '/session', { headers: { ...headers, ...authenticated } });
        assert.equal((await session.json()).mode, 'admin-session');
        assert.equal((await post('/entities/Brand/create', [{ name: 'Real persisted brand' }], authenticated)).status, 200);
        const second = await post('/auth/login', ['a separate test passphrase'], authenticated);
        assert.notEqual(second.headers.get('set-cookie'), cookie);
        assert.equal((await fetch(base + '/session', { headers: { ...headers, ...authenticated } })).status, 401);
        const fresh = { Cookie: second.headers.get('set-cookie').split(';')[0] };
        assert.equal((await post('/auth/logout', [], fresh)).status, 200);
        assert.equal((await fetch(base + '/session', { headers: { ...headers, ...fresh } })).status, 401);
    } finally { await new Promise(resolve => server.close(resolve)); }
});

test('password validation, attempt limit and secure public configuration fail closed', () => {
    assert.throws(() => hashPassword('short'));
    assert.throws(() => createAdminAuth('invalid'));
    assert.throws(() => createApi({ dbPath: ':memory:', publicOrigin: 'https://socialchoice.example', passwordHash: '' }));
    const auth = createAdminAuth(hashPassword('another test passphrase'), true);
    const req = { headers: {} }; let cookie;
    const res = { setHeader: (_, value) => { cookie = value; } };
    auth.login(req, res, 'another test passphrase');
    assert.match(cookie, /; Secure$/);
    for (let i = 0; i < 5; i++) assert.throws(() => auth.login(req, res, 'incorrect'), { status: 401 });
    assert.throws(() => auth.login(req, res, 'another test passphrase'), { status: 429 });
});

test('local password setup stores only a hash and refuses to replace credentials', () => {
    const directory = mkdtempSync(join(tmpdir(), 'socialchoice-admin-'));
    const script = resolve('server/setup-admin.js');
    const password = 'Mật khẩu thử nghiệm riêng biệt';
    try {
        const first = spawnSync(process.execPath, [script], { cwd: directory, input: password + '\r\n', encoding: 'utf8' });
        assert.equal(first.status, 0);
        const saved = readFileSync(join(directory, '.env.admin'), 'utf8');
        assert.equal(saved.includes(password), false);
        assert.equal(first.stdout.includes(password), false);
        const auth = createAdminAuth(saved.trim().split('=')[1]);
        assert.doesNotThrow(() => auth.login({ headers: {} }, { setHeader() {} }, password));
        const second = spawnSync(process.execPath, [script], { cwd: directory, input: 'replacement test passphrase', encoding: 'utf8' });
        assert.notEqual(second.status, 0);
        assert.equal(readFileSync(join(directory, '.env.admin'), 'utf8'), saved);
    } finally { rmSync(directory, { recursive: true }); }
});

test('sessions expire at eight hours and cannot be reused by a new server instance', () => {
    const originalNow = Date.now;
    let now = originalNow();
    Date.now = () => now;
    try {
        const hash = hashPassword('session expiration test passphrase');
        const auth = createAdminAuth(hash);
        let cookie;
        auth.login({ headers: {} }, { setHeader: (_, value) => { cookie = value; } }, 'session expiration test passphrase');
        const req = { headers: { cookie: cookie.split(';')[0] } };
        assert.doesNotThrow(() => auth.require(req));
        assert.throws(() => createAdminAuth(hash).require(req), { status: 401 });
        now += 8 * 60 * 60 * 1000;
        assert.throws(() => auth.require(req), { status: 401 });
    } finally { Date.now = originalNow; }
});
