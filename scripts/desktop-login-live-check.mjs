import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { boundedJson } from '../auth-broker/provider-http.mjs';

// Owner-mediated live OAuth probe; no tokens, identities or tickets are persisted.
const [origin, provider = 'facebook'] = process.argv.slice(2);
assert.ok(origin && new URL(origin).protocol === 'https:' && new URL(origin).origin === origin);
assert.equal(origin, 'https://socialchoice-login.nguyenngockieutran.workers.dev', 'Live grants may only use the owner-approved deployed broker');
assert.ok(['facebook', 'instagram', 'threads', 'linkedin', 'tiktok'].includes(provider));
const state = randomBytes(32).toString('base64url');
let verifier = randomBytes(32).toString('base64url');
let claimed = false;
let timer;
let phase = 'authorization';
let exchangeStatus;
let brokerStage;
let brokerReason;
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  const address = server.address();
  const url = new URL(req.url, 'http://127.0.0.1');
  if (req.method !== 'GET' || req.headers.host !== `127.0.0.1:${address?.port}` || url.pathname !== '/socialchoice/oauth/callback' || url.searchParams.getAll('state').length !== 1 || url.searchParams.get('state') !== state || claimed) {
    res.writeHead(400); res.end('Invalid callback'); return;
  }
  claimed = true;
  try {
    if (url.searchParams.has('error')) throw new Error('Authorization denied');
    assert.equal(url.searchParams.getAll('ticket').length, 1);
    const ticket = url.searchParams.get('ticket');
    assert.ok(ticket && ticket.length < 18000);
    phase = 'exchange';
    const response = await fetch(origin + '/exchange', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket, verifier }),
    });
    exchangeStatus = response.status;
    if (!response.ok) {
      const failure = await boundedJson(response, 4096);
      if (['code_exchange', 'grant_validation', 'identity_verification'].includes(failure.stage)) brokerStage = failure.stage;
      if (['required_permissions_missing', 'grant_expired'].includes(failure.reason)) brokerReason = failure.reason;
    }
    assert.equal(response.status, 200);
    phase = 'verified-envelope';
    const result = await boundedJson(response, 2 * 1024 * 1024);
    assert.equal(result.protocol, 1);
    assert.equal(result.provider, provider);
    assert.ok(result.verified && typeof result.verified === 'object');
    assert.ok(Array.isArray(result.verified.destinations));
    console.log(JSON.stringify({ status: 'PASS', provider, destinationCount: result.verified.destinations.length, detail: 'Real code exchange and identity/destination verification; no native import, publishing or credential persistence' }));
    res.end('Socialchoice login verified. No account was imported or post published. You may close this tab.');
  } catch {
    process.exitCode = 1;
    console.log(JSON.stringify({ status: 'FAIL', provider, phase, exchangeStatus, brokerStage, brokerReason, detail: 'Authorization not confirmed; secret-bearing responses omitted' }));
    res.writeHead(400); res.end('Socialchoice login could not be confirmed. Start a new login.');
  } finally {
    verifier = ''; clearTimeout(timer); server.close();
  }
});
server.requestTimeout = 10000;
server.headersTimeout = 10000;
server.maxHeadersCount = 50;
server.on('error', () => { verifier = ''; clearTimeout(timer); process.exitCode = 1; console.log('FAIL live probe listener'); });
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const port = server.address().port;
console.log(JSON.stringify({ pid: process.pid, port, start: origin + '/start?' + new URLSearchParams({ provider, state, challenge: createHash('sha256').update(verifier).digest('base64url'), redirect: `http://127.0.0.1:${port}/socialchoice/oauth/callback` }) }));
timer = setTimeout(() => { verifier = ''; server.close(); process.exitCode = 1; console.log('FAIL live probe timed out'); }, 600000);
process.on('SIGINT', () => { verifier = ''; clearTimeout(timer); server.close(); });
