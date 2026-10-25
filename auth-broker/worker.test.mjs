import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { encode } from './tickets.mjs';
import { grantSchema, handle } from './worker.mjs';

const identity = { active: true, client_id: 'fixture-client', auth_type: '3L', scope: 'openid profile w_member_social', expires_at: Math.floor(Date.now()/1000)+3600 };
const env = { PUBLIC_ORIGIN: 'https://login.example.com', BROKER_STATE_KEY: '16'.repeat(32), LINKEDIN_CLIENT_ID: 'fixture-client', LINKEDIN_CLIENT_SECRET: 'fixture-secret' };
const verifier = 'v'.repeat(64);
const challenge = encode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));

test('broker deployment declares no customer storage, tracing or request logging', async () => {
  const config = JSON.parse(await readFile(new URL('./wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(config.observability.enabled, false);
  assert.equal(config.observability.logs.enabled, false);
  assert.equal(config.observability.logs.invocation_logs, false);
  assert.equal(config.observability.traces.enabled, false);
  assert.equal(config.logpush, false);
  for (const name of ['d1_databases', 'durable_objects', 'kv_namespaces', 'r2_buckets', 'analytics_engine_datasets', 'tail_consumers', 'queues', 'services']) assert.equal(config[name], undefined);
});
async function handoff() {
  const start = new URL('/start', env.PUBLIC_ORIGIN);
  start.search = new URLSearchParams({ provider: 'linkedin', state: 's'.repeat(64), challenge, redirect: 'http://127.0.0.1:49200/socialchoice/oauth/callback' }).toString();
  const response = await handle(new Request(start), env);
  assert.equal(response.status, 302);
  const destination = new URL(response.headers.get('Location'));
  assert.equal(destination.origin, 'https://www.linkedin.com');
  assert.ok(!destination.href.includes(env.LINKEDIN_CLIENT_SECRET));
  const callback = new URL('/callback/linkedin', env.PUBLIC_ORIGIN);
  callback.search = new URLSearchParams({ state: destination.searchParams.get('state'), code: 'fixture-private-code' }).toString();
  const completed = await handle(new Request(callback), env);
  assert.equal(completed.status, 302);
  const local = new URL(completed.headers.get('Location'));
  assert.equal(local.origin, 'http://127.0.0.1:49200');
  assert.equal(local.searchParams.get('state'), 's'.repeat(64));
  assert.ok(!local.href.includes('fixture-private-code'));
  return local.searchParams.get('ticket');
}
function redeem(ticket, proof = verifier, headers = {}) {
  return new Request(`${env.PUBLIC_ORIGIN}/exchange`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ ticket, verifier: proof }) });
}

test('stateless browser handoff redeems only with native proof at fixed provider endpoint', async () => {
  const ticket = await handoff(); let calls = 0;
  const fetcher = async (url, options) => {
    calls++;
    if (url.endsWith('/introspectToken')) return Response.json(identity);
    if (url.endsWith('/userinfo')) return Response.json({ sub: 'profile-1', name: 'Fixture Profile' });
    assert.equal(url, 'https://www.linkedin.com/oauth/v2/accessToken');
    assert.equal(options.redirect, 'error');
    assert.equal(options.body.get('client_secret'), env.LINKEDIN_CLIENT_SECRET);
    assert.equal(options.body.get('code'), 'fixture-private-code');
    assert.equal(options.body.get('redirect_uri'), `${env.PUBLIC_ORIGIN}/callback/linkedin`);
    return Response.json({ access_token: 'fixture-native-token', expires_in: 3600 });
  };
  for (const request of [redeem(ticket, 'w'.repeat(64)), redeem(ticket, verifier, { Origin: 'https://evil.example' }), redeem(ticket, verifier, { 'Sec-Fetch-Site': 'same-origin' })]) assert.equal((await handle(request, env, fetcher)).status, 400);
  assert.equal(calls, 0);
  const result = await handle(redeem(ticket), env, fetcher);
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
  assert.equal(result.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal((await result.json()).verified.destinations[0].token, 'fixture-native-token');
  assert.equal(calls, 3);
});

test('invalid callback and duplicate query never redirect, errors never echo credentials', async () => {
  for (const path of ['/callback/linkedin?state=bad&code=secret', '/start?provider=linkedin&provider=tiktok', '/callback/linkedin?state=a&state=b']) {
    const response = await handle(new Request(env.PUBLIC_ORIGIN + path), env);
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('Location'), null);
    assert.ok(!(await response.text()).includes('secret'));
  }
  const wrongHost = await handle(new Request('https://evil.example/status'), env);
  assert.equal(wrongHost.status, 503);
  const ticket = await handoff();
  const failed = await handle(redeem(ticket), env, async () => { throw new Error('fixture-secret fixture-native-token'); });
  assert.equal(failed.status, 400);
  assert.ok(!(await failed.text()).includes('fixture-'));
});

test('oversized provider data is rejected and readiness reveals no credentials', async () => {
  const ticket = await handoff();
  const response = await handle(redeem(ticket), env, async () => Response.json({ access_token: 'x'.repeat(70_000) }));
  assert.equal(response.status, 400);
  const status = await handle(new Request(`${env.PUBLIC_ORIGIN}/status`), env);
  assert.deepEqual(await status.json(), { protocol: 1, providers: { facebook: false, instagram: false, threads: false, linkedin: true, tiktok: false } });
});

test('replayed handoff cannot turn a provider-consumed code into another grant', async () => {
  const ticket = await handoff(); let consumed = false;
  const provider = async url => {
    if (url.endsWith("/introspectToken")) return Response.json(identity);
    if (url.endsWith("/userinfo")) return Response.json({ sub: "profile-1", name: "Fixture Profile" });
    if (consumed) return Response.json({ error: 'invalid_grant' }, { status: 400 });
    consumed = true;
    return Response.json({ access_token: 'fixture-once', expires_in: 3600 });
  };
  assert.equal((await handle(redeem(ticket), env, provider)).status, 200);
  const replay = await handle(redeem(ticket), env, provider);
  assert.equal(replay.status, 400);
  assert.ok(!(await replay.text()).includes('fixture-once'));
});

test('provider grants strip arbitrary and identity-token fields and reject malformed credentials', () => {
  assert.deepEqual(grantSchema('linkedin', { access_token: 'fixture', expires_in: 3600, id_token: 'not-needed', arbitrary: { private: true } }), { access_token: 'fixture', expires_in: 3600 });
  for (const fields of [{ refresh_token: 'x'.repeat(16_385) }, { token_type: 'mac' }, { expires_in: '3600' }, { scope: 'x'.repeat(2049) }, { access_token: 'line\nbreak' }]) assert.throws(() => grantSchema('linkedin', { access_token: 'fixture', expires_in: 3600, ...fields }));
  assert.throws(() => grantSchema('threads', { access_token: 'fixture', user_id: Number.MAX_SAFE_INTEGER + 1 }));
  assert.equal(grantSchema('threads', { access_token: 'fixture', user_id: '9007199254740999' }).user_id, '9007199254740999');
  const tiktok = { access_token: 'fixture', token_type: 'bearer', expires_in: 86400, refresh_token: 'refresh', refresh_expires_in: 864000, scope: 'user.info.basic,video.publish', open_id: 'profile' };
  assert.deepEqual(grantSchema('tiktok', tiktok), tiktok);
  assert.throws(() => grantSchema('tiktok', { ...tiktok, scope: 'user.info.basic' }));
});
