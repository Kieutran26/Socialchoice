import { createHash } from 'node:crypto';
import { fail } from './validation.js';

const numeric = value => typeof value === 'string' && /^\d+$/.test(value);
const digest = value => createHash('sha256').update(value).digest('hex');
const granted = (info, scope, id) => Array.isArray(info.granular_scopes) && info.granular_scopes.some(grant => grant?.scope === scope && Array.isArray(grant.target_ids) && grant.target_ids.includes(id));
function checked(info, config, type, userId, pageId) {
    if (!info || info.is_valid !== true || info.app_id !== config.appId || info.type !== type || info.user_id !== userId
        || pageId && info.profile_id !== pageId || !Array.isArray(info.scopes) || info.scopes.some(scope => typeof scope !== 'string')) fail('Meta could not verify the Page access grant. Reconnect Facebook.', 409);
    for (const value of [info.expires_at, info.data_access_expires_at]) if (value !== undefined && (!Number.isSafeInteger(value) || value < 0 || value > 0 && value * 1000 <= Date.now())) fail('Facebook authorization expired. Reconnect Facebook.', 409);
    return info;
}

export async function discoverGrantedPages(request, config, userToken, profile, fields) {
    const inspect = async token => (await request('debug_token', { input_token: token }, `${config.appId}|${config.appSecret}`)).data;
    const user = checked(await inspect(userToken), config, 'USER', profile.id);
    const ids = [...new Set((user.granular_scopes || []).filter(grant => grant?.scope === 'pages_show_list').flatMap(grant => Array.isArray(grant.target_ids) ? grant.target_ids : []))];
    if (ids.length > 100 || ids.some(id => !numeric(id))) fail('Meta returned an invalid Page access grant', 502);
    const pages = [];
    for (const id of ids) {
        let page;
        try { page = await request(id, { fields }, userToken); }
        catch (error) { if ([10, 200].includes(error.metaCode)) continue; throw error; }
        if (page.id !== id || typeof page.name !== 'string') fail('Facebook Page identity mismatch', 409);
        if (typeof page.access_token !== 'string' || !page.access_token) continue;
        const info = checked(await inspect(page.access_token), config, 'PAGE', profile.id, id);
        const publishing = ['pages_manage_posts', 'pages_read_engagement'].every(scope => user.scopes.includes(scope) && info.scopes.includes(scope) && granted(user, scope, id) && granted(info, scope, id));
        const expiries = [user, info].flatMap(value => [value.expires_at, value.data_access_expires_at]).filter(value => value > 0).map(value => value * 1000);
        pages.push({ ...page, tasks: [], pageGrant: { appId: config.appId, pageId: id, userId: profile.id, tokenDigest: digest(page.access_token), publishing, expiresAt: expiries.length ? Math.min(...expiries) : null } });
    }
    return pages;
}

export function hasVerifiedPagePublishGrant(credential, account, config) {
    const grant = credential.pageGrant;
    return !!grant && grant.publishing === true && grant.appId === config.appId && grant.pageId === account.external_id && grant.userId === credential.profileId
        && typeof credential.token === 'string' && grant.tokenDigest === digest(credential.token)
        && (grant.expiresAt === null || Number.isSafeInteger(grant.expiresAt) && grant.expiresAt > Date.now());
}
