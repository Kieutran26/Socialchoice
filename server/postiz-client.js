import { fail } from './validation.js';

export function postizConfig(env = process.env) {
    const enabled = env.SOCIALCHOICE_POSTIZ_ENABLED === 'true';
    if (!enabled) return { ready: false };
    const base = env.SOCIALCHOICE_POSTIZ_URL || 'http://localhost:4007/api/public/v1';
    const url = new URL(base);
    if (url.username || url.password || url.search || url.hash || !(url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Postiz requires HTTPS or loopback HTTP');
    const key = env.SOCIALCHOICE_POSTIZ_API_KEY;
    const encryptionKey = env.SOCIALCHOICE_POSTIZ_ENCRYPTION_KEY;
    return { ready: !!key && /^[a-f0-9]{64}$/i.test(encryptionKey || ''), base: base.replace(/\/$/, ''), key, encryptionKey };
}

export function createPostizClient(config, fetcher = fetch) {
    async function request(path, { method = 'GET', body } = {}) {
        if (!config.ready) fail('Postiz is not configured', 409);
        let response;
        try {
            response = await fetcher(config.base + path, { method, redirect: 'error', signal: AbortSignal.timeout(30000), headers: { Authorization: config.key, ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}) });
        } catch { throw Object.assign(new Error('Cannot reach Postiz. Check the connection before retrying.'), { status: 502 }); }
        if (!response.ok) throw Object.assign(new Error(response.status === 401 ? 'Postiz API key was rejected' : 'Postiz request failed'), { status: 502, remoteStatus: response.status });
        try { return await response.json(); } catch { fail('Invalid Postiz response', 502); }
    }
    return {
        request,
        async channels() {
            const rows = await request('/integrations');
            if (!Array.isArray(rows)) fail('Invalid Postiz channel response', 502);
            return rows.filter(row => row.identifier === 'facebook' && typeof row.id === 'string' && typeof row.name === 'string').map(row => ({ id: row.id, name: row.name, disabled: row.disabled !== false, platform: 'facebook' }));
        },
        async upload(asset, bytes) {
            const form = new FormData();
            form.append('file', new Blob([bytes], { type: asset.mime_type }), asset.filename || asset.name);
            const result = await request('/upload', { method: 'POST', body: form });
            if (!result?.id || typeof result.path !== 'string') fail('Invalid Postiz upload response', 502);
            return { id: result.id, path: result.path };
        },
        create: body => request('/posts', { method: 'POST', body }),
        async posts(time) {
            const startDate = new Date(time - 86400000).toISOString(), endDate = new Date(Math.max(Date.now(), time) + 86400000).toISOString();
            const result = await request('/posts?' + new URLSearchParams({ startDate, endDate }));
            if (!Array.isArray(result?.posts)) fail('Invalid Postiz post response', 502);
            return result.posts;
        },
    };
}
