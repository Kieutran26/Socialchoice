import { fail } from './validation.js';
import { parseLinkedinMentions } from '../src/lib/publishing-content.js';

export const LINKEDIN_SCOPES = ['openid', 'profile', 'w_member_social'];
export const linkedinMemberId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
export function linkedinProfile(value) {
    if (!linkedinMemberId(value?.sub) || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 256) fail('LinkedIn returned an invalid member profile', 502);
    return { id: value.sub, username: value.name };
}
export function linkedinTokenDetails(value, appId, now = Date.now()) {
    const scopes = typeof value?.scope === 'string' ? value.scope.split(/[ ,]+/) : [];
    if (value?.active !== true || value.client_id !== appId || value.auth_type !== '3L' || !LINKEDIN_SCOPES.every(scope => scopes.includes(scope)) || !Number.isSafeInteger(value.expires_at) || value.expires_at * 1000 <= now) throw Object.assign(new Error('LinkedIn authorization or publishing permissions expired. Reconnect LinkedIn.'), { status: 409, linkedinGrantInvalid: true });
    return { scopes: LINKEDIN_SCOPES, expiresAt: value.expires_at * 1000 };
}
export function linkedinPublishedId(id) {
    if (typeof id !== 'string' || !/^urn:li:(ugcPost|share):\d+$/.test(id)) fail('LinkedIn did not confirm a publication ID', 502);
    return { id, url: `https://www.linkedin.com/feed/update/${id}/` };
}
export function createLinkedinGraph(config) {
    async function request(url, token, body, form = false) {
        let response;
        try { response = await fetch(url, { method: body ? 'POST' : 'GET', redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-Restli-Protocol-Version': '2.0.0', ...(body ? { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' } : {}) }, ...(body ? { body: form ? new URLSearchParams(body) : JSON.stringify(body) } : {}) }); }
        catch { fail('LinkedIn request unavailable or unconfirmed', 502); }
        if (!response.ok) throw Object.assign(new Error('LinkedIn denied or could not confirm this request'), { status: 502, linkedinStatus: response.status, linkedinGrantInvalid: !!token && [401, 403].includes(response.status) });
        return response;
    }
    const json = async (...args) => { try { return await (await request(...args)).json(); } catch (error) { if (error.status) throw error; fail('LinkedIn returned an invalid response', 502); } };
    return {
        async exchange(code) {
            const value = await json('https://www.linkedin.com/oauth/v2/accessToken', null, { grant_type: 'authorization_code', code, client_id: config.appId, client_secret: config.appSecret, redirect_uri: config.redirectUri }, true);
            if (typeof value.access_token !== 'string' || !value.access_token || !Number.isSafeInteger(value.expires_in) || value.expires_in <= 0 || value.expires_in > 366 * 86400) fail('LinkedIn returned an invalid token lifetime', 502);
            return { token: value.access_token, expiresAt: Date.now() + value.expires_in * 1000 };
        },
        async profile(token) { return linkedinProfile(await json('https://api.linkedin.com/v2/userinfo', token)); },
        async permissions(token) { return linkedinTokenDetails(await json('https://www.linkedin.com/oauth/v2/introspectToken', null, { client_id: config.appId, client_secret: config.appSecret, token }, true), config.appId); },
        async organizations(token) {
                try {
                    const value = await json('https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&projection=(elements*(organizationalTarget~(id,localizedName,vanityName)))', token);
                    const elements = Array.isArray(value?.elements) ? value.elements : [];
                    return elements
                        .map(entry => {
                            const target = entry?.['organizationalTarget~'] || {};
                            const urn = typeof entry?.organizationalTarget === 'string' ? entry.organizationalTarget : '';
                            const rawId = target.id ?? urn.split(':').at(-1);
                            const id = rawId !== undefined && rawId !== null ? String(rawId).trim() : '';
                            const name = typeof target.localizedName === 'string' ? target.localizedName.trim() : '';
                            const vanity = typeof target.vanityName === 'string' && target.vanityName.trim() ? target.vanityName.trim() : id;
                            if (!linkedinMemberId(id) || !name) return null;
                            return { id, name, username: vanity, account_type: 'page' };
                        })
                        .filter(Boolean);
                } catch {
                    return [];
                }
            },
        async register(profileId, video, token, accountType = 'profile') {
                if (!linkedinMemberId(profileId)) fail('Valid LinkedIn member required');
                const owner = accountType === 'page' ? `urn:li:organization:${profileId}` : `urn:li:person:${profileId}`;
                const value = (await json('https://api.linkedin.com/v2/assets?action=registerUpload', token, { registerUploadRequest: { recipes: [`urn:li:digitalmediaRecipe:feedshare-${video ? 'video' : 'image'}`], owner, serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }] } })).value;
                const uploadUrl = value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
                let url; try { url = new URL(uploadUrl); } catch { fail('LinkedIn returned no media upload URL', 502); }
                if (url.origin !== 'https://api.linkedin.com' || !url.pathname.startsWith('/mediaUpload/') || url.username || url.password || url.hash || !/^urn:li:digitalmediaAsset:[a-zA-Z0-9_-]+$/.test(value.asset)) fail('LinkedIn returned an invalid media upload destination', 502);
                return { asset: value.asset, uploadUrl: url.href };
            },
        async upload(uploadUrl, bytes, token) {
                const url = new URL(uploadUrl);
                if (url.origin !== 'https://api.linkedin.com' || !url.pathname.startsWith('/mediaUpload/') || url.username || url.password || url.hash) fail('Invalid LinkedIn upload destination', 409);
                let response;
                try { response = await fetch(url, { method: 'PUT', redirect: 'manual', signal: AbortSignal.timeout(40000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' }, body: bytes }); } catch { fail('LinkedIn media upload is unconfirmed', 502); }
                if (!response.ok) throw Object.assign(new Error('LinkedIn media upload was not confirmed'), { status: 502, linkedinStatus: response.status });
            },
        async assetStatus(asset, token) {
                if (!/^urn:li:digitalmediaAsset:[a-zA-Z0-9_-]+$/.test(asset)) fail('Invalid LinkedIn asset', 409);
                const data = await json(`https://api.linkedin.com/v2/assets/${encodeURIComponent(asset.split(':').at(-1))}`, token);
                if (data.id !== asset.split(':').at(-1)) fail('LinkedIn returned a different media asset', 502);
                if (['BLOCKED', 'ABANDONED', 'DELETED', 'SCHEDULED_DELETION'].includes(data.status)) return 'failed';
                const states = data.recipes?.map(value => value.status) || [];
                if (!states.length) fail('LinkedIn did not confirm media processing', 502);
                if (data.status === 'ALLOWED' && states.every(value => value === 'AVAILABLE')) return 'ready';
                return states.some(value => ['CLIENT_ERROR', 'SERVER_ERROR'].includes(value)) ? 'failed' : 'processing';
            },
        async publish(profileId, caption, assets, video, token, accountType = 'profile') {
                    if (!linkedinMemberId(profileId)) fail('Valid LinkedIn member required');
                    const parsed = parseLinkedinMentions(caption);
                    const shareCommentary = parsed.attributes.length ? { text: parsed.text, attributes: parsed.attributes } : { text: parsed.text };
                    const author = accountType === 'page' ? `urn:li:organization:${profileId}` : `urn:li:person:${profileId}`;
                    const content = { shareCommentary, shareMediaCategory: assets.length ? video ? 'VIDEO' : 'IMAGE' : 'NONE', ...(assets.length ? { media: assets.map(media => ({ status: 'READY', media })) } : {}) };
                    const response = await request('https://api.linkedin.com/v2/ugcPosts', token, { author, lifecycleState: 'PUBLISHED', specificContent: { 'com.linkedin.ugc.ShareContent': content }, visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' } });
                    if (response.status !== 201) fail('LinkedIn publication is unconfirmed', 502);
                    return linkedinPublishedId(response.headers.get('x-restli-id'));
                },
        async publishComment(actorIdOrUrn, postUrn, text, token) {
                    const actor = String(actorIdOrUrn).startsWith('urn:li:') ? String(actorIdOrUrn) : `urn:li:person:${actorIdOrUrn}`;
                    const parsed = parseLinkedinMentions(text);
                    const message = parsed.attributes.length ? { text: parsed.text, attributes: parsed.attributes } : { text: parsed.text };
                    const response = await request(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments`, token, { actor, object: postUrn, message });
                    const id = response.headers.get('x-restli-id');
                    if (!id) fail('LinkedIn comment is unconfirmed', 502);
                    return { id };
                },
            };
        }
