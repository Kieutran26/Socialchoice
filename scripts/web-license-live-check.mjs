import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

const origin = 'https://socialchoice.vercel.app';
const expectedReady = process.argv.includes('--enabled');
const results = [];
async function get(path, status, options) {
    const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...options });
    assert.equal(response.status, status, `${path}: unexpected status ${response.status}`);
    results.push({ path, status }); return response;
}
const hash = value => createHash('sha256').update(value).digest('hex');
const localIndex = readFileSync('dist/index.html');
assert.equal(hash(await (await get('/', 200)).bytes()), hash(localIndex));
for (const asset of readdirSync('dist/assets').filter(name => /\.(js|css)$/.test(name))) {
    assert.equal(hash(await (await get('/assets/' + asset, 200)).bytes()), hash(readFileSync('dist/assets/' + asset)));
}
for (const file of readdirSync('public').filter(name => /^(privacy\.html|terms\.html|tiktok.*\.txt)$/.test(name))) {
    assert.equal(hash(await (await get('/' + file, 200)).bytes()), hash(readFileSync('public/' + file)));
}
const config = await (await get('/api/customer/config', 200)).json();
assert.equal(config.ready, expectedReady);
assert.equal((await (await get('/api/health', 200)).json()).backend, 'sqlite');
await get('/api/session', 401, { headers: { 'x-socialchoice-client': 'local-ui' } });
await get('/api/entities/Brand/list', 401, { method: 'POST', headers: { 'x-socialchoice-client': 'local-ui', 'content-type': 'application/json' }, body: JSON.stringify({ args: [] }) });
if (expectedReady) {
    assert.equal(config.multipleDevices, true); assert.equal(config.purchase, 'one-time');
    // Explicit one-off authorization probe consumes a registration throttle attempt.
    // Keep routine deployment checks free of account-directory writes.
    if (process.argv.includes('--probe-invalid-license')) await get('/api/customer/register', 403, { method: 'POST', headers: { origin, 'x-socialchoice-client': 'local-ui', 'content-type': 'application/json' }, body: JSON.stringify({ args: [{ email: 'unlicensed-check@example.com', password: 'invalid-license-check-password', license: 'not-a-license' }] }) });
    await get('/api/customer/login', 403, { method: 'POST', headers: { origin: 'https://cross-origin.example', 'x-socialchoice-client': 'local-ui', 'content-type': 'application/json' }, body: JSON.stringify({ args: [{ email: 'unlicensed-check@example.com', password: 'invalid-license-check-password' }] }) });
}
console.log(JSON.stringify({ origin, ready: config.ready, assetHashesMatch: true, results }, null, 2));
