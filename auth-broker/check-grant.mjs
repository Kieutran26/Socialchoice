import { providerJson } from './provider-http.mjs';
import { verifyGrant } from './verify-grant.mjs';

export async function checkGrant(provider, config, input, fetcher = fetch) {
  if (!input || Object.keys(input).some(key => !['provider', 'token', 'id', 'pageId', 'appsecretProof'].includes(key)) || typeof input.token !== 'string' || !input.token || input.token.length > 16384 || !/^[A-Za-z0-9_.-]{1,256}$/.test(input.id)) throw new Error('Invalid check');
  const request = (url, token) => providerJson(url, token, undefined, fetcher);
  if (provider === 'linkedin' || provider === 'threads') {
    const value = await verifyGrant(provider, config, { access_token: input.token, user_id: input.id }, fetcher);
    if (value.destinations.length !== 1 || value.destinations[0].id !== input.id) throw Object.assign(new Error('Identity changed'), {invalidGrant:true});
  } else if (provider === 'tiktok') {
    const value = await request('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name', input.token);
    if (value.data?.user?.open_id !== input.id) throw Object.assign(new Error('Identity changed'), {invalidGrant:true});
    // This read-only endpoint requires video.publish; profile access alone proves only user.info.basic.
    const creator = await providerJson('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', input.token, {}, fetcher, false);
    if (!creator.data || typeof creator.data.creator_nickname !== 'string' || !Array.isArray(creator.data.privacy_level_options) || !creator.data.privacy_level_options.includes('SELF_ONLY')) throw Object.assign(new Error('Creator access unavailable'), {invalidGrant:true});
  } else {
    if (!/^[0-9a-f]{64}$/i.test(input.appsecretProof || '') || !/^\d{1,256}$/.test(input.pageId || '')) throw new Error('Invalid Page proof');
    const base = `https://graph.facebook.com/${config.version}/`;
    const details = await request(`${base}debug_token?${new URLSearchParams({ input_token: input.token })}`, `${config.id}|${config.secret}`);
    if (!details.data || !Array.isArray(details.data.scopes) || details.data.scopes.length > 100 || details.data.scopes.some(scope => typeof scope !== 'string' || scope.length > 128) || !Number.isSafeInteger(details.data.expires_at) || details.data.expires_at < 0 || details.data.expires_at * 1000 > Date.now() + 366 * 86400_000) throw new Error('Malformed token inspection');
    const required = provider === 'instagram' ? ['pages_show_list', 'instagram_basic', 'instagram_content_publish', 'pages_read_engagement'] : ['pages_show_list', 'pages_manage_posts', 'pages_read_engagement'];
    if (details.data?.is_valid !== true || String(details.data.app_id) !== config.id || !required.every(scope => details.data.scopes?.includes(scope)) || Number.isSafeInteger(details.data.expires_at) && details.data.expires_at !== 0 && details.data.expires_at * 1000 <= Date.now()) throw Object.assign(new Error('Permissions changed'), {invalidGrant:true});
    const page = await request(`${base}${input.pageId}?${new URLSearchParams({ fields: provider === 'instagram' ? 'id,instagram_business_account{id}' : 'id', appsecret_proof: input.appsecretProof })}`, input.token);
    if (page.id !== input.pageId || (provider === 'instagram' ? page.instagram_business_account?.id : page.id) !== input.id) throw Object.assign(new Error('Identity changed'), {invalidGrant:true});
  }
  return { checked: true, id: input.id };
}
