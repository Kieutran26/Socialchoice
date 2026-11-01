import { fail } from './validation.js';

export const THREADS_SCOPES = ['threads_basic', 'threads_content_publish'];
const numericId = value => typeof value === 'string' && /^\d+$/.test(value);
export function threadsProfile(value) {
    if (!numericId(value?.id) || typeof value.username !== 'string' || !/^[a-zA-Z0-9._]{1,100}$/.test(value.username)) fail('Threads returned an invalid profile', 502);
    return { id: value.id, username: value.username };
}
export function threadsContainerState(value, id) {
    if (value?.id !== id || !['IN_PROGRESS', 'FINISHED', 'ERROR', 'EXPIRED', 'PUBLISHED'].includes(value.status)) fail('Threads returned an invalid container status', 502);
    return value.status;
}
export function threadsPublishedMedia(value, id, profileId) {
    let url; try { url = new URL(value?.permalink); } catch { fail('Threads did not confirm a publication link', 502); }
    if (value.id !== id || value.owner?.id !== profileId || url.protocol !== 'https:' || !['threads.net', 'www.threads.net', 'threads.com', 'www.threads.com'].includes(url.hostname) || url.username || url.password || url.port || !/^\/@[a-zA-Z0-9._]+\/post\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname) || url.search || url.hash) fail('Threads publication identity mismatch', 409);
    return { id, url: url.href };
}
export function threadsTokenDetails(value, appId, profileId, now = Date.now()) {
    const data = value?.data;
    if (!data || data.is_valid !== true || String(data.app_id) !== appId || String(data.user_id) !== profileId || !Array.isArray(data.scopes) || data.scopes.some(scope => typeof scope !== 'string') || !THREADS_SCOPES.every(scope => data.scopes.includes(scope))) fail('Threads identity or publishing permissions were not confirmed. Reconnect Threads.', 409);
    if (!Number.isSafeInteger(data.expires_at) || data.expires_at * 1000 <= now) throw Object.assign(new Error('Threads authorization expired. Reconnect Threads.'), { status: 409, metaCode: 190 });
    return { scopes: data.scopes.filter(scope => THREADS_SCOPES.includes(scope)), expiresAt: data.expires_at * 1000 };
}
export function createThreadsGraph(config) {
    async function request(path, params = {}, token, method = 'GET', unversioned = false) {
        const url = new URL(`https://graph.threads.net/${unversioned ? '' : 'v1.0/'}${path}`);
        const fields = new URLSearchParams(params);
        if (method === 'GET') url.search = fields.toString();
        let response, data;
        try { response = await fetch(url, { method, redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) }, ...(method === 'POST' ? { body: fields } : {}) }); }
        catch { fail('Threads request unavailable or unconfirmed', 502); }
        if (response.status >= 300 && response.status < 400) fail('Threads returned an unexpected redirect', 502);
        try { data = await response.json(); } catch { fail('Threads returned an invalid response', 502); }
        if (!data || typeof data !== 'object' || Array.isArray(data)) fail('Threads returned an invalid response', 502);
        if (!response.ok || data.error) throw Object.assign(new Error(data.error?.code === 190 ? 'Threads authorization expired. Reconnect Threads.' : 'Threads denied or could not confirm this request'), { status: data.error?.code === 190 ? 409 : 502, metaCode: data.error?.code, metaHttpStatus: response.status });
        return data;
    }
    const confirmedId = value => { if (!numericId(value.id)) fail('Threads returned no confirmed ID', 502); return value.id; };
    return {
        async exchange(code) {
            const short = await request('oauth/access_token', { client_id: config.appId, client_secret: config.appSecret, redirect_uri: config.redirectUri, code, grant_type: 'authorization_code' }, undefined, 'POST', true);
            if (typeof short.access_token !== 'string' || !short.access_token || !numericId(String(short.user_id))) fail('Threads returned an invalid access token', 502);
            // Reject unsafe JSON numbers rather than silently rounding an account identity.
            if (typeof short.user_id === 'number' && !Number.isSafeInteger(short.user_id)) fail('Threads returned an unsafe profile identity', 502);
            const long = await request('access_token', { grant_type: 'th_exchange_token', client_secret: config.appSecret, access_token: short.access_token }, undefined, 'GET', true);
            if (typeof long.access_token !== 'string' || !long.access_token || long.token_type?.toLowerCase() !== 'bearer' || !Number.isSafeInteger(long.expires_in) || long.expires_in <= 0 || long.expires_in > 90 * 86400) fail('Threads returned an invalid token lifetime', 502);
            return { token: long.access_token, profileId: String(short.user_id), expiresAt: Date.now() + long.expires_in * 1000 };
        },
        async profile(token) { return threadsProfile(await request('me', { fields: 'id,username' }, token)); },
        async permissions(token, profileId) { return threadsTokenDetails(await request('debug_token', { input_token: token }, token, 'GET', true), config.appId, profileId); },
        async create(profileId, asset, publicUrl, text, token, replyToId) {
                if (!numericId(profileId)) fail('Valid Threads profile required');
                const media = asset ? (asset.file_type === 'video' ? { media_type: 'VIDEO', video_url: publicUrl } : { media_type: 'IMAGE', image_url: publicUrl }) : { media_type: 'TEXT' };
                return confirmedId(await request(`${profileId}/threads`, { ...media, text, ...(replyToId ? { reply_to_id: replyToId } : {}) }, token, 'POST'));
            },
        async status(id, token) { return threadsContainerState(await request(id, { fields: 'id,status,error_message' }, token), id); },
        async publish(profileId, id, token) { return confirmedId(await request(`${profileId}/threads_publish`, { creation_id: id }, token, 'POST')); },
        async verify(profileId, id, token) { return threadsPublishedMedia(await request(id, { fields: 'id,permalink,owner' }, token), id, profileId); },
        };
    }
