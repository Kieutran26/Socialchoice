import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';

const origin = process.argv[2];
assert.ok(origin && new URL(origin).protocol === 'https:' && new URL(origin).origin === origin, 'Pass the exact deployed HTTPS origin');
const request = async (path, options = {}) => fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...options });
const status = await request('/status');
assert.equal(status.status, 200);
assert.equal(status.headers.get('cache-control'), 'no-store');
assert.equal(status.headers.get('access-control-allow-origin'), null);
const health = await status.json();
assert.equal(health.protocol, 1);
const hosts = { facebook: 'www.facebook.com', instagram: 'www.facebook.com', threads: 'threads.net', linkedin: 'www.linkedin.com', tiktok: 'www.tiktok.com' };
const callback = 'http://127.0.0.1:49200/socialchoice/oauth/callback';
for (const [provider, host] of Object.entries(hosts)) {
    assert.equal(health.providers[provider], true, `${provider} server credential setup missing`);
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const query = new URLSearchParams({ provider, state, challenge, redirect: callback });
    const start = await request('/start?' + query);
    assert.equal(start.status, 302);
    assert.equal(start.headers.get('referrer-policy'), 'no-referrer');
    const location = new URL(start.headers.get('location'));
    assert.equal(location.hostname, host);
    assert.equal(location.searchParams.get('redirect_uri'), `${origin}/callback/${provider}`);
    assert.ok(!location.searchParams.has('client_secret'));
    const ticket = location.searchParams.get('state');
    assert.ok(ticket?.includes('.'));
    const denial = await request(`/callback/${provider}?` + new URLSearchParams({ state: ticket, error: 'access_denied' }));
    assert.equal(denial.status, 302);
    const returned = new URL(denial.headers.get('location'));
    assert.equal(returned.origin + returned.pathname, callback);
    assert.equal(returned.searchParams.get('state'), state);
    assert.equal(returned.searchParams.get('error'), 'authorization_denied');
    assert.equal(returned.searchParams.get('ticket'), null);
    const unsafe = await request('/start?' + new URLSearchParams({ provider, state, challenge, redirect: 'https://attacker.example/callback' }));
    assert.equal(unsafe.status, 400);
    assert.equal(unsafe.headers.get('location'), null);
    console.log(`PASS ${provider}: readiness, official authorization target, exact callback, encrypted state/denial, no remote redirect`);
}
for (const options of [{}, { Origin: 'https://attacker.example' }]) {
    const invalid = await request('/exchange', { method: 'POST', headers: { 'Content-Type': 'application/json', ...options }, body: JSON.stringify({ ticket: 'invalid', verifier: randomBytes(32).toString('base64url') }) });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.headers.get('cache-control'), 'no-store');
    assert.equal(invalid.headers.get('access-control-allow-origin'), null);
}
console.log('PASS deployed broker boundary checks. Provider registration, real OAuth grants and account import are NOT established by this test. No real authorization-code exchange or publication was attempted.');
