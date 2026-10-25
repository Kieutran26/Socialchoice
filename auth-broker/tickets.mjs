const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const purposes = new Set(['authorization', 'handoff']);

export function encode(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decode(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid ticket');
  const bytes = Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4)), c => c.charCodeAt(0));
  if (encode(bytes) !== value) throw new Error('Invalid ticket');
  return bytes;
}

export function origin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.origin !== value) throw new Error('Invalid broker origin');
  return url.origin;
}

export function loopback(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || Number(url.port) < 1024 || url.pathname !== '/socialchoice/oauth/callback' || url.search || url.hash || url.username || url.password || value !== `http://127.0.0.1:${url.port}/socialchoice/oauth/callback`) throw new Error('Invalid callback');
  return url.href;
}

export function authorizationContext(value) {
  if (!value || !['facebook', 'instagram', 'threads', 'linkedin', 'tiktok'].includes(value.provider) || !/^[A-Za-z0-9_-]{43,128}$/.test(value.state) || !/^[A-Za-z0-9_-]{43}$/.test(value.challenge)) throw new Error('Invalid authorization');
  // Reject non-canonical SHA256 encodings as well as malformed challenges.
  if (decode(value.challenge).length !== 32) throw new Error('Invalid challenge');
  return { provider: value.provider, state: value.state, challenge: value.challenge, redirect: loopback(value.redirect) };
}

async function key(secret) {
  if (typeof secret !== 'string' || !/^[a-fA-F0-9]{64}$/.test(secret)) throw new Error('Broker not configured');
  return crypto.subtle.importKey('raw', Uint8Array.from(secret.match(/../g), n => parseInt(n, 16)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function aad(publicOrigin, purpose) {
  if (!purposes.has(purpose)) throw new Error('Invalid purpose');
  return encoder.encode(`socialchoice.oauth.v1\n${origin(publicOrigin)}\n${purpose}`);
}

export async function seal(secret, publicOrigin, purpose, payload, now = Date.now()) {
  const ttl = purpose === 'authorization' ? 600_000 : 90_000;
  const plaintext = encoder.encode(JSON.stringify({ version: 1, issued: now, expires: now + ttl, payload }));
  if (plaintext.length > 12_000) throw new Error('Ticket too large');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(publicOrigin, purpose) }, await key(secret), plaintext);
  return `${encode(iv)}.${encode(ciphertext)}`;
}

export async function open(secret, publicOrigin, purpose, ticket, now = Date.now()) {
  if (typeof ticket !== 'string' || ticket.length > 17_000) throw new Error('Invalid ticket');
  const parts = ticket.split('.');
  if (parts.length !== 2) throw new Error('Invalid ticket');
  const iv = decode(parts[0]);
  if (iv.length !== 12) throw new Error('Invalid ticket');
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad(publicOrigin, purpose) }, await key(secret), decode(parts[1]));
  const result = JSON.parse(decoder.decode(plaintext));
  const ttl = purpose === 'authorization' ? 600_000 : 90_000;
  if (result.version !== 1 || !Number.isSafeInteger(result.issued) || !Number.isSafeInteger(result.expires) || result.issued > now || result.expires <= now || result.expires - result.issued !== ttl) throw new Error('Expired ticket');
  return result.payload;
}

export async function verifyProof(verifier, challenge) {
  if (typeof verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) throw new Error('Invalid verifier');
  const actual = encode(await crypto.subtle.digest('SHA-256', encoder.encode(verifier)));
  if (actual !== challenge) throw new Error('Invalid verifier');
}
