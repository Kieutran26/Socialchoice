import { authorizationContext, open, origin, seal, verifyProof } from './tickets.mjs';

const securityHeaders = {
  'Cache-Control': 'no-store', 'Pragma': 'no-cache',
  'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};
function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8' } });
}
function redirect(url) { return new Response(null, { status: 302, headers: { ...securityHeaders, Location: url.href } }); }

export function providerConfig(env, provider) {
  const meta = provider === 'facebook' || provider === 'instagram';
  const prefix = meta ? 'META' : provider.toUpperCase();
  const id = env[`${prefix}_CLIENT_ID`];
  const secret = env[`${prefix}_CLIENT_SECRET`];
  if (!['facebook', 'instagram', 'threads', 'linkedin', 'tiktok'].includes(provider) || typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,256}$/.test(id) || typeof secret !== 'string' || !secret || secret.length > 1024 || meta && !/^v\d+\.0$/.test(env.META_GRAPH_VERSION || '')) return null;
  const callback = `${origin(env.PUBLIC_ORIGIN)}/callback/${provider}`;
  const scopes = {
    facebook: 'pages_show_list,pages_read_engagement,pages_read_user_content,pages_manage_posts',
    instagram: 'pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish',
    threads: 'threads_basic,threads_content_publish',
    linkedin: 'openid profile w_member_social',
    tiktok: 'user.info.basic,video.publish',
  }[provider];
  const authorize = {
    facebook: `https://www.facebook.com/${env.META_GRAPH_VERSION}/dialog/oauth`,
    instagram: `https://www.facebook.com/${env.META_GRAPH_VERSION}/dialog/oauth`,
    threads: 'https://threads.net/oauth/authorize',
    linkedin: 'https://www.linkedin.com/oauth/v2/authorization',
    tiktok: 'https://www.tiktok.com/v2/auth/authorize/',
  }[provider];
  return { id, secret, callback, scopes, authorize, version: env.META_GRAPH_VERSION };
}

async function boundedJson(response, limit) {
  if (!response.body) throw new Error('Missing body');
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new Error('Body too large');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

async function tokenRequest(url, fields, fetcher) {
  const response = await fetcher(url, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20_000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(fields),
  });
  if (!response.ok) { await response.body?.cancel(); throw new Error('Authorization denied'); }
  const result = await boundedJson(response, 64 * 1024);
  if (!result || Array.isArray(result) || typeof result.access_token !== 'string' || !result.access_token || result.access_token.length > 16_384 || result.error) throw new Error('Invalid authorization');
  return result;
}

export function grantSchema(provider, value) {
  const text = (key, max, required = false) => {
    const result = value[key];
    if (result === undefined && !required) return undefined;
    if (typeof result !== 'string' || !result || result.length > max || /[\x00-\x1f\x7f]/.test(result)) throw new Error('Invalid grant');
    return result;
  };
  const duration = (key, max, required = false) => {
    const result = value[key];
    if (result === undefined && !required) return undefined;
    if (!Number.isSafeInteger(result) || result <= 0 || result > max) throw new Error('Invalid grant');
    return result;
  };
  const grant = { access_token: text('access_token', 16_384, true) };
  const tokenType = text('token_type', 32, provider === 'tiktok');
  if (tokenType !== undefined) {
    if (tokenType.toLowerCase() !== 'bearer') throw new Error('Invalid grant');
    grant.token_type = 'bearer';
  }
  const expires = duration('expires_in', provider === 'tiktok' ? 172_800 : 366 * 86400, ['linkedin', 'tiktok'].includes(provider));
  if (expires !== undefined) grant.expires_in = expires;
  if (['linkedin', 'tiktok'].includes(provider)) {
    const refresh = text('refresh_token', 16_384, provider === 'tiktok');
    if (refresh !== undefined) grant.refresh_token = refresh;
    const refreshExpiry = duration('refresh_expires_in', 366 * 86400, provider === 'tiktok');
    if (refreshExpiry !== undefined) grant.refresh_expires_in = refreshExpiry;
    const scope = text('scope', 2048, provider === 'tiktok');
    if (scope !== undefined) grant.scope = scope;
  }
  if (provider === 'tiktok') {
    const id = text('open_id', 256, true);
    if (!/^[\w.-]+$/.test(id)) throw new Error('Invalid grant');
    if (!['user.info.basic', 'video.publish'].every(scope => grant.scope.split(',').includes(scope))) throw new Error('Invalid grant');
    grant.open_id = id;
  }
  if (provider === 'threads') {
    const id = value.user_id;
    if (!(typeof id === 'string' && /^\d{1,128}$/.test(id) || Number.isSafeInteger(id) && id > 0)) throw new Error('Invalid grant');
    grant.user_id = String(id);
  }
  return grant;
}

async function exchange(provider, config, code, fetcher) {
  const fields = { client_id: config.id, client_secret: config.secret, redirect_uri: config.callback, code, grant_type: 'authorization_code' };
  if (provider === 'tiktok') {
    delete fields.client_id; fields.client_key = config.id;
    return tokenRequest('https://open.tiktokapis.com/v2/oauth/token/', fields, fetcher);
  }
  if (provider === 'linkedin') return tokenRequest('https://www.linkedin.com/oauth/v2/accessToken', fields, fetcher);
  if (provider === 'threads') return tokenRequest('https://graph.threads.net/oauth/access_token', fields, fetcher);
  return tokenRequest(`https://graph.facebook.com/${config.version}/oauth/access_token`, fields, fetcher);
}

export async function handle(request, env, fetcher = fetch) {
  try {
    const publicOrigin = origin(env.PUBLIC_ORIGIN);
    const url = new URL(request.url);
    if (url.origin !== publicOrigin || url.hash || url.href.length > 24_000 || !/^[a-fA-F0-9]{64}$/.test(env.BROKER_STATE_KEY || '')) return json({ error: 'Broker unavailable' }, 503);
    if (request.method === 'GET' && url.pathname === '/status') {
      return json({ protocol: 1, providers: Object.fromEntries(['facebook', 'instagram', 'threads', 'linkedin', 'tiktok'].map(name => [name, Boolean(providerConfig(env, name))])) });
    }
    if (request.method === 'GET' && url.pathname === '/start') {
      if ([...url.searchParams.keys()].some(key => !['provider', 'state', 'challenge', 'redirect'].includes(key)) || [...url.searchParams.keys()].some(key => url.searchParams.getAll(key).length !== 1)) return json({ error: 'Invalid authorization' }, 400);
      const context = authorizationContext(Object.fromEntries(url.searchParams));
      const config = providerConfig(env, context.provider);
      if (!config) return json({ error: 'Provider not configured' }, 409);
      const state = await seal(env.BROKER_STATE_KEY, publicOrigin, 'authorization', context);
      const target = new URL(config.authorize);
      target.search = new URLSearchParams({ [context.provider === 'tiktok' ? 'client_key' : 'client_id']: config.id, redirect_uri: config.callback, response_type: 'code', scope: config.scopes, state }).toString();
      return redirect(target);
    }
    if (request.method === 'GET' && /^\/callback\/(facebook|instagram|threads|linkedin|tiktok)$/.test(url.pathname)) {
      if (['state', 'code', 'error'].some(key => url.searchParams.getAll(key).length > 1)) return json({ error: 'Invalid callback' }, 400);
      const context = authorizationContext(await open(env.BROKER_STATE_KEY, publicOrigin, 'authorization', url.searchParams.get('state')));
      if (context.provider !== url.pathname.split('/')[2]) return json({ error: 'Invalid callback' }, 400);
      const target = new URL(context.redirect);
      target.searchParams.set('state', context.state);
      if (url.searchParams.has('error')) target.searchParams.set('error', 'authorization_denied');
      else {
        const code = url.searchParams.get('code');
        if (!code || code.length > 8192 || /[\x00-\x20\x7f]/.test(code)) return json({ error: 'Invalid callback' }, 400);
        target.searchParams.set('ticket', await seal(env.BROKER_STATE_KEY, publicOrigin, 'handoff', { ...context, code }));
      }
      return redirect(target);
    }
    if (request.method === 'POST' && url.pathname === '/exchange') {
      // Only the native client redeems tickets. Browser scripts never receive token responses.
      if (request.headers.has('Origin') || request.headers.has('Sec-Fetch-Site') || request.headers.get('Content-Type') !== 'application/json' || url.search) return json({ error: 'Invalid exchange' }, 400);
      const body = await boundedJson(request, 24_000);
      if (!body || Object.keys(body).sort().join(',') !== 'ticket,verifier') return json({ error: 'Invalid exchange' }, 400);
      const payload = await open(env.BROKER_STATE_KEY, publicOrigin, 'handoff', body.ticket);
      const context = authorizationContext(payload);
      await verifyProof(body.verifier, context.challenge);
      if (typeof payload.code !== 'string' || !payload.code || payload.code.length > 8192) return json({ error: 'Invalid exchange' }, 400);
      const config = providerConfig(env, context.provider);
      if (!config) return json({ error: 'Provider not configured' }, 409);
      const grant = grantSchema(context.provider, await exchange(context.provider, config, payload.code, fetcher));
      return json({ protocol: 1, provider: context.provider, grant });
    }
    return json({ error: 'Not found' }, 404);
  } catch {
    // Never include provider errors, authorization codes, tickets or credentials in logs/responses.
    return json({ error: 'Authorization could not be confirmed. Start a new login.' }, 400);
  }
}

export default { fetch: (request, env) => handle(request, env) };
