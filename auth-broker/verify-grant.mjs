import { providerJson } from './provider-http.mjs';

const required = {
  facebook: ['pages_show_list', 'pages_manage_posts', 'pages_read_engagement'],
  instagram: ['pages_show_list', 'pages_read_engagement', 'instagram_basic', 'instagram_content_publish'],
  threads: ['threads_basic', 'threads_content_publish'],
  linkedin: ['openid', 'profile', 'w_member_social'], tiktok: ['user.info.basic', 'video.publish'],
};
const id = value => typeof value === 'string' && /^[A-Za-z0-9_.-]{1,256}$/.test(value);
function label(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 256 || /[\x00-\x1f\x7f]/.test(value)) throw new Error('Invalid profile');
  return value;
}
function scopes(provider, value) {
  if (!Array.isArray(value) || value.length > 100 || value.some(scope => typeof scope !== 'string' || scope.length > 128) || !required[provider].every(scope => value.includes(scope))) throw Object.assign(new Error('Missing permissions'), {invalidGrant:true});
  return value;
}
function expiry(value, now, allowNever = false) {
  // Meta uses zero for valid tokens without a scheduled expiry; validity is checked separately.
  if (allowNever && value === 0) return 0;
  if (Number.isSafeInteger(value) && value * 1000 <= now) throw Object.assign(new Error('Grant expired'), {invalidGrant:true});
  if (!Number.isSafeInteger(value) || value * 1000 <= now || value * 1000 > now + 366 * 86400_000) throw new Error('Invalid expiry');
  return value * 1000;
}
async function proof(secret, token) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(token)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function verifyGrant(provider, config, grant, fetcher = fetch, now = Date.now()) {
  const request = (url, token, fields) => providerJson(url, token, fields, fetcher);
  if (provider === 'linkedin') {
    const details = await request('https://www.linkedin.com/oauth/v2/introspectToken', null, { client_id: config.id, client_secret: config.secret, token: grant.access_token });
    if (details.active !== true || details.client_id !== config.id || details.auth_type !== '3L') throw Object.assign(new Error('Invalid grant identity'), {invalidGrant:true});
    const granted = scopes(provider, typeof details.scope === 'string' ? details.scope.split(/[ ,]+/) : []);
    const expiresAt = expiry(details.expires_at, now);
    const profile = await request('https://api.linkedin.com/v2/userinfo', grant.access_token);
    if (!id(profile.sub)) throw new Error('Invalid profile');
    return { profileName: label(profile.name), destinations: [{ id: profile.sub, name: label(profile.name), username: profile.name, scopes: granted, expiresAt, token: grant.access_token }] };
  }
  if (provider === 'tiktok') {
    const granted = scopes(provider, grant.scope.split(','));
    const value = await request('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name', grant.access_token);
    if (value?.error?.code && value.error.code !== 'ok') throw new Error('Invalid profile');
    const profile = value.data?.user;
    if (!profile || profile.open_id !== grant.open_id || !id(profile.open_id)) throw new Error('Invalid profile');
    return { profileName: label(profile.display_name), destinations: [{ id: profile.open_id, name: label(profile.display_name), scopes: granted, expiresAt: now + grant.expires_in * 1000, token: grant.access_token }] };
  }
  if (provider === 'threads') {
    const details = await request(`https://graph.threads.net/debug_token?${new URLSearchParams({ input_token: grant.access_token })}`, grant.access_token);
    const data = details.data;
    if (!data || data.is_valid !== true || String(data.app_id) !== config.id || String(data.user_id) !== grant.user_id) throw Object.assign(new Error('Invalid grant identity'), {invalidGrant:true});
    const granted = scopes(provider, data.scopes), expiresAt = expiry(data.expires_at, now);
    const profile = await request('https://graph.threads.net/v1.0/me?fields=id,username', grant.access_token);
    if (profile.id !== grant.user_id || !id(profile.id)) throw new Error('Invalid profile');
    return { profileName: label(profile.username), destinations: [{ id: profile.id, name: label(profile.username), username: profile.username, scopes: granted, expiresAt, token: grant.access_token }] };
  }
  const base = `https://graph.facebook.com/${config.version}/`;
  const details = await request(`${base}debug_token?${new URLSearchParams({ input_token: grant.access_token })}`, `${config.id}|${config.secret}`);
  const data = details.data;
  if (!data || data.is_valid !== true || String(data.app_id) !== config.id || !id(data.user_id)) throw new Error('Invalid grant identity');
  const granted = scopes(provider, data.scopes), expiresAt = expiry(data.expires_at, now, true);
  const userProof = await proof(config.secret, grant.access_token);
  const profile = await request(`${base}me?${new URLSearchParams({ fields: 'id,name', appsecret_proof: userProof })}`, grant.access_token);
  if (profile.id !== data.user_id) throw new Error('Invalid profile');
  const destinations = []; let after;
  for (let page = 0; page < 4; page++) {
    const fields = provider === 'instagram' ? 'id,name,access_token,tasks,instagram_business_account{id,username}' : 'id,name,access_token,tasks';
    const list = await request(`${base}me/accounts?${new URLSearchParams({ fields, limit: '100', appsecret_proof: userProof, ...(after ? { after } : {}) })}`, grant.access_token);
    if (!Array.isArray(list.data) || list.data.length > 100) throw new Error('Invalid Page list');
    for (const item of list.data) {
      if (!id(item.id) || !Array.isArray(item.tasks) || item.tasks.some(task => typeof task !== 'string') || typeof item.access_token !== 'string' || !item.access_token || item.access_token.length > 16384) throw new Error('Invalid Page');
      if (!item.tasks.some(task => ['CREATE_CONTENT', 'MANAGE', 'PROFILE_PLUS_CREATE_CONTENT', 'PROFILE_PLUS_FULL_CONTROL'].includes(task))) continue;
      const identity = provider === 'instagram' ? item.instagram_business_account : item;
      if (!identity) continue;
      if (!id(identity.id)) throw new Error('Invalid Page identity');
      const name = label(provider === 'instagram' ? identity.username : identity.name);
      if (!destinations.some(account => account.id === identity.id)) destinations.push({ id: identity.id, name, username: provider === 'instagram' ? identity.username : '', pageId: item.id, pageName: label(item.name), scopes: granted, tasks: item.tasks, token: item.access_token, appsecretProof: await proof(config.secret, item.access_token), expiresAt });
    }
    if (destinations.length > 300) throw new Error('Too many destinations');
    if (!list.paging?.next) return { profileName: label(profile.name), destinations, version: config.version };
    const next = list.paging?.cursors?.after;
    if (typeof next !== 'string' || !next || next.length > 2048 || next === after) throw new Error('Invalid Page pagination');
    after = next;
  }
  throw new Error('Incomplete Page list');
}
