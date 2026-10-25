import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorizationContext, encode, loopback, open, origin, seal, verifyProof } from './tickets.mjs';

const secret = '16'.repeat(32);
const publicOrigin = 'https://login.example.com';
const now = 1_000_000;
const verifier = 'v'.repeat(64);
const challenge = encode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
const context = { provider: 'facebook', state: 's'.repeat(64), challenge, redirect: 'http://127.0.0.1:49200/socialchoice/oauth/callback' };

test('encrypted tickets bind origin, purpose, key and exact expiration', async () => {
  const ticket = await seal(secret, publicOrigin, 'authorization', context, now);
  assert.deepEqual(await open(secret, publicOrigin, 'authorization', ticket, now + 1), context);
  for (const args of [
    [secret, 'https://other.example.com', 'authorization', ticket, now],
    [secret, publicOrigin, 'handoff', ticket, now],
    ['17'.repeat(32), publicOrigin, 'authorization', ticket, now],
    [secret, publicOrigin, 'authorization', ticket, now + 600_000],
    [secret, publicOrigin, 'authorization', ticket, now - 1],
    [secret, publicOrigin, 'authorization', ticket.slice(0, -4) + 'AAAA', now],
  ]) await assert.rejects(open(...args));
  const handoff = await seal(secret, publicOrigin, 'handoff', { ...context, code: 'private-code' }, now);
  assert.equal((await open(secret, publicOrigin, 'handoff', handoff, now + 89_999)).code, 'private-code');
  await assert.rejects(open(secret, publicOrigin, 'handoff', handoff, now + 90_000));
  assert.ok(!handoff.includes('private-code'));
  assert.notEqual(ticket, await seal(secret, publicOrigin, 'authorization', context, now));
});

test('desktop callback cannot redirect to a remote host or inject parameters', () => {
  assert.equal(loopback(context.redirect), context.redirect);
  for (const suffix of ['?', '#']) assert.throws(() => loopback(context.redirect + suffix));
  for (const value of ['http://localhost:49200/socialchoice/oauth/callback', 'https://127.0.0.1:49200/socialchoice/oauth/callback', 'http://127.0.0.1.evil.test:49200/socialchoice/oauth/callback', `${context.redirect}?next=evil`, `${context.redirect}#fragment`, 'http://user@127.0.0.1:49200/socialchoice/oauth/callback', 'http://127.0.0.1:80/socialchoice/oauth/callback', 'http://127.0.0.1:49200/other']) assert.throws(() => loopback(value));
  for (const value of ['http://login.example.com', `${publicOrigin}/`, `${publicOrigin}/path`, 'https://user@login.example.com']) assert.throws(() => origin(value));
});

test('authorization validates provider, state, challenge and desktop proof', async () => {
  assert.deepEqual(authorizationContext(context), context);
  await verifyProof(verifier, challenge);
  await assert.rejects(verifyProof('w'.repeat(64), challenge));
  await assert.rejects(verifyProof('v'.repeat(42), challenge));
  for (const value of [{ ...context, provider: 'arbitrary' }, { ...context, state: 'short' }, { ...context, challenge: 'x'.repeat(43) }]) assert.throws(() => authorizationContext(value));
  await assert.rejects(seal(secret, publicOrigin, 'unexpected', {}, now));
  await assert.rejects(seal(secret, publicOrigin, 'handoff', { code: 'x'.repeat(12_000) }, now));
  await assert.rejects(open(secret, publicOrigin, 'handoff', 'x'.repeat(17_001), now));
});
