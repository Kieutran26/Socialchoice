import { fail } from './validation.js';

export const TIKTOK_SCOPES = ['user.info.basic', 'video.publish'];
export function tiktokToken(value, now = Date.now()) {
    if (!value || typeof value.open_id !== 'string' || !/^[\w.-]{1,256}$/.test(value.open_id) || typeof value.access_token !== 'string' || !value.access_token || typeof value.refresh_token !== 'string' || !value.refresh_token || value.token_type?.toLowerCase() !== 'bearer' || !Number.isSafeInteger(value.expires_in) || value.expires_in <= 0 || value.expires_in > 86400 * 2 || !Number.isSafeInteger(value.refresh_expires_in) || value.refresh_expires_in <= 0 || value.refresh_expires_in > 366 * 86400 || typeof value.scope !== 'string' || !TIKTOK_SCOPES.every(s => value.scope.split(',').includes(s))) fail('TikTok did not confirm identity, expiry and publishing permissions. Reconnect TikTok.', 409);
    return { platform: 'tiktok', profileId: value.open_id, token: value.access_token, refreshToken: value.refresh_token, scopes: TIKTOK_SCOPES, expiresAt: now + value.expires_in * 1000, refreshExpiresAt: now + value.refresh_expires_in * 1000 };
}
export function tiktokCreator(value) {
    if (!value || typeof value.creator_username !== 'string' || !/^[a-zA-Z0-9._]{1,100}$/.test(value.creator_username) || typeof value.creator_nickname !== 'string' || !value.creator_nickname || value.creator_nickname.length > 256 || !Array.isArray(value.privacy_level_options) || !value.privacy_level_options.includes('SELF_ONLY') || !['comment_disabled','duet_disabled','stitch_disabled'].every(k => typeof value[k] === 'boolean') || !Number.isSafeInteger(value.max_video_post_duration_sec) || value.max_video_post_duration_sec <= 0) fail('TikTok creator settings unavailable. Try again later.', 409);
    return { username: value.creator_username, nickname: value.creator_nickname, privacy: ['SELF_ONLY'], commentDisabled: value.comment_disabled, duetDisabled: value.duet_disabled, stitchDisabled: value.stitch_disabled, maxDuration: value.max_video_post_duration_sec };
}
export function createTiktokGraph(config) {
    async function request(path, body, token, form = false) {
        let response, value;
        try { response = await fetch('https://open.tiktokapis.com/v2/' + path, { method: body === undefined ? 'GET' : 'POST', redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json; charset=UTF-8' }, ...(body !== undefined ? { body: form ? new URLSearchParams(body) : JSON.stringify(body) } : {}) }); } catch { fail('TikTok request unavailable or unconfirmed', 502); }
        try { value = await response.json(); } catch { fail('TikTok returned an invalid response', 502); }
        const code = typeof value?.error === 'string' ? value.error : value?.error?.code;
        if (!response.ok || code && code !== 'ok') throw Object.assign(new Error('TikTok denied or could not confirm the request. Check account access and private sandbox eligibility.'), { status: 502, tiktokCode: code, tiktokHttpStatus: response.status });
        if (!value || typeof value !== 'object' || Array.isArray(value) || !form && value.error?.code !== 'ok') fail('TikTok returned an invalid response', 502);
        return form ? value : value.data;
    }
    return {
        exchange: async code => tiktokToken(await request('oauth/token/', { client_key: config.clientKey, client_secret: config.clientSecret, code, redirect_uri: config.redirectUri, grant_type: 'authorization_code' }, null, true)),
        refresh: async refreshToken => tiktokToken(await request('oauth/token/', { client_key: config.clientKey, client_secret: config.clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }, null, true)),
        async profile(token) { const result = await request('user/info/?fields=open_id,display_name', undefined, token); const p = result?.user; if (!p || typeof p.open_id !== 'string' || !/^[\w.-]{1,256}$/.test(p.open_id) || typeof p.display_name !== 'string') fail('TikTok returned an invalid identity', 502); return { id: p.open_id, name: p.display_name }; },
        creator: async token => tiktokCreator(await request('post/publish/creator_info/query/', {}, token)),
        async create(token, caption, options, mediaUrl) {
            const result = await request('post/publish/video/init/', { post_info: { title: caption, privacy_level: options.privacy, disable_comment: !options.allowComment, disable_duet: !options.allowDuet, disable_stitch: !options.allowStitch, brand_content_toggle: false, brand_organic_toggle: options.ownBrand, is_aigc: options.aiGenerated }, source_info: { source: 'PULL_FROM_URL', video_url: mediaUrl } }, token);
            if (typeof result?.publish_id !== 'string' || !/^[\x21-\x7e]{1,64}$/.test(result.publish_id)) fail('TikTok did not return a publishing reference', 502);
            return result.publish_id;
        },
        async status(token, publishId) { const value = await request('post/publish/status/fetch/', { publish_id: publishId }, token); if (!['PROCESSING_UPLOAD','PROCESSING_DOWNLOAD','SEND_TO_USER_INBOX','PUBLISH_COMPLETE','FAILED'].includes(value?.status)) fail('TikTok returned an invalid publication status', 502); return value.status; },
    };
}
