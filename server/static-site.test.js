import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi } from './index.js';
import { hashPassword } from './admin-auth.js';

test('standalone server serves SPA routes and assets while keeping workspace API private', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'socialchoice-site-'));
    writeFileSync(join(directory, 'index.html'), '<html>Test built application</html>');
    writeFileSync(join(directory, 'app.js'), 'console.log("test asset")');
    const { server } = createApi({ dbPath: ':memory:', siteDirectory: directory, passwordHash: hashPassword('static site test passphrase') });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        assert.equal(await (await fetch(base + '/calendar')).text(), '<html>Test built application</html>');
        const asset = await fetch(base + '/app.js');
        assert.match(asset.headers.get('content-type'), /javascript/);
        assert.equal((await fetch(base + '/missing.js')).status, 404);
        assert.equal((await fetch(base + '/.env.admin')).status, 404);
        assert.equal((await fetch(base + '/api/entities/Brand/filter', { method: 'POST', headers: { 'X-Socialchoice-Client': 'local-ui' } })).status, 401);
    } finally {
        await new Promise(resolve => server.close(resolve));
        rmSync(directory, { recursive: true });
    }
});
