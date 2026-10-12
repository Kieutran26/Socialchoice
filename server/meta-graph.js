import { createHmac } from 'node:crypto';
import { fail } from './validation.js';

export function createMetaGraph(config) {
    async function request(path, params = {}, token, method = 'GET') {
        const step = path === 'oauth/access_token' ? (params.grant_type ? 'token_exchange' : 'code_exchange') : ({ me: 'profile', 'me/permissions': 'permissions', 'me/accounts': 'pages' }[path] || 'page_check');
        const reject = (message, status, code, subcode) => {
            throw Object.assign(new Error(message), { status, metaStep: step, ...(Number.isSafeInteger(code) ? { metaCode: code } : {}), ...(Number.isSafeInteger(subcode) ? { metaSubcode: subcode } : {}) });
        };
        const url = new URL(`https://graph.facebook.com/${config.version}/${path}`);
        const fields = new URLSearchParams(params);
        if (token) fields.set('appsecret_proof', createHmac('sha256', config.appSecret).update(token).digest('hex'));
        if (method === 'GET') url.search = fields.toString();
        let response, data;
        try {
            response = await fetch(url, { method, redirect: 'error', signal: AbortSignal.timeout(20000), headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(method !== 'GET' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) }, ...(method !== 'GET' ? { body: fields } : {}) });
            data = await response.json();
        } catch { reject('Meta request unavailable. Try again later.', 502); }
        if (!data || typeof data !== 'object' || Array.isArray(data)) reject('Meta returned an unexpected response', 502);
        if (!response.ok || data.error) reject(data.error?.code === 190 ? 'Facebook authorization expired. Reconnect Facebook.' : 'Meta denied this request. Check app permissions and access.', [190, 10, 200].includes(data.error?.code) ? 409 : 502, data.error?.code, data.error?.error_subcode);
        return data;
    }
    return {
        async exchange(code) {
            const short = await request('oauth/access_token', { client_id: config.appId, client_secret: config.appSecret, redirect_uri: config.redirectUri, code }, undefined, 'POST');
            if (typeof short.access_token !== 'string' || !short.access_token) fail('Meta returned no access token', 502);
            const long = await request('oauth/access_token', { grant_type: 'fb_exchange_token', client_id: config.appId, client_secret: config.appSecret, fb_exchange_token: short.access_token }, undefined, 'POST');
            if (typeof long.access_token !== 'string' || !long.access_token) fail('Meta returned no access token', 502);
            return long.access_token;
        },
        async discover(token) {
            const profile = await request('me', { fields: 'id,name' }, token);
            const permissions = await request('me/permissions', {}, token);
            if (!/^\d+$/.test(profile.id) || typeof profile.name !== 'string' || !Array.isArray(permissions.data) || permissions.data.some(p => !p || typeof p.permission !== 'string' || typeof p.status !== 'string')) fail('Meta returned an unexpected response', 502);
            const scopes = permissions.data.filter(p => p.status === 'granted').map(p => p.permission);
            if (!scopes.includes('pages_show_list')) fail('Facebook Page permission was not granted', 409);
            const pages = []; let after;
            for (let i = 0; i < 50; i++) {
                const result = await request('me/accounts', { fields: 'id,name,access_token,tasks', limit: '100', ...(after ? { after } : {}) }, token);
                if (!Array.isArray(result.data) || result.data.some(p => !p || typeof p.id !== 'string' || !/^\d+$/.test(p.id) || typeof p.name !== 'string' || (p.access_token !== undefined && typeof p.access_token !== 'string') || (p.tasks !== undefined && (!Array.isArray(p.tasks) || p.tasks.some(task => typeof task !== 'string'))))) fail('Meta returned an unexpected response', 502);
                pages.push(...result.data.filter(p => typeof p.access_token === 'string' && p.access_token));
                if (!result.paging?.next) return { profile, scopes, pages };
                const next = result.paging.cursors?.after;
                if (!next || next === after) fail('Meta Page list pagination incomplete', 502);
                after = next;
            }
            fail('Meta Page list exceeds supported size', 502);
        },
        async check(pageId, token) {
            const result = await request(pageId, { fields: 'id,name' }, token);
            if (result.id !== pageId) fail('Facebook Page identity mismatch', 409);
            return result;
        },
    };
}
