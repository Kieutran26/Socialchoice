import { createHash } from 'node:crypto';
import { fail } from './validation.js';
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
export function parsePublicDriveFolder(value) {
    let url;
    try { url = new URL(value); } catch { fail('Enter a public Google Drive folder link', 400); }
    const match = url.pathname.match(/^\/drive(?:\/u\/\d+)?\/folders\/([a-zA-Z0-9_-]{1,200})\/?$/);
    const resourceKey = url.searchParams.get('resourcekey');
    if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com' || url.port || url.username || url.password || !match || resourceKey && !/^[a-zA-Z0-9_-]{1,200}$/.test(resourceKey)) fail('Enter a public Google Drive folder link', 400);
    return { folder: match[1], resource_key: resourceKey || null, access: 'public' };
}
export const IMAGE_LIMIT = 3 * 1024 * 1024;
export async function boundedBytes(response, limit) {
    const reader = response.body?.getReader(); if (!reader) fail('Empty source response', 502);
    const chunks = []; let size = 0;
    try {
        while (true) {
            const { value, done } = await reader.read(); if (done) break;
            size += value.byteLength; if (size > limit) fail('Source response exceeds limit', 413); chunks.push(value);
        }
    } catch (error) { await reader.cancel().catch(() => {}); throw error; }
    const result = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; } return result;
}
export async function providerJson(response) {
    if (!response.ok) { await response.body?.cancel().catch(() => {}); throw Object.assign(new Error('Source provider request failed'), { status: response.status === 401 || response.status === 403 ? 409 : 502, retryable: response.status === 429 || response.status >= 500 }); }
    let data; try { data = JSON.parse(new TextDecoder().decode(await boundedBytes(response, 1024 * 1024))); } catch { fail('Invalid source response', 502); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail('Invalid source response', 502); return data;
}
export function createDriveProvider(config, vault, fetcher = fetch, isCurrent = () => true) {
    const tokenRequest = body => fetcher('https://oauth2.googleapis.com/token', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...body }).toString() }).then(providerJson);
    const credentialId = source => `autopilot:drive:${source.id}:${source.generation || 0}`;
    async function token(source) {
        const grant = vault.read(credentialId(source));
        if (grant.expires > Date.now() + 60000) return grant.access_token;
        const next = await tokenRequest({ grant_type: 'refresh_token', refresh_token: grant.refresh_token });
        if (typeof next.access_token !== 'string' || !Number.isFinite(next.expires_in) || next.expires_in <= 0 || next.scope && !next.scope.split(' ').includes(DRIVE_SCOPE)) fail('Drive reconnect required', 409);
        if (!isCurrent(source)) fail('Drive connection changed', 409);
        vault.save(credentialId(source), { ...grant, access_token: next.access_token, refresh_token: next.refresh_token || grant.refresh_token, expires: Date.now() + next.expires_in * 1000 }); return next.access_token;
    }
    const request = async (source, path, params = {}, resourceKey) => {
        if (source.access === 'public') {
            if (!config.apiKey) fail('Public Drive requires a server API key', 409);
            const keys = [[source.folder, source.resource_key], [path.startsWith('files/') ? path.slice(6) : '', resourceKey]].filter(([, key]) => key);
            const response = await fetcher(`https://www.googleapis.com/drive/v3/${path}?${new URLSearchParams(params)}`, { headers: { 'X-Goog-Api-Key': config.apiKey, ...(keys.length ? { 'X-Goog-Drive-Resource-Keys': keys.map(([id, key]) => id + '/' + key).join(',') } : {}) }, redirect: 'error', signal: AbortSignal.timeout(20000) });
            if (!response.ok) { await response.body?.cancel().catch(() => {}); throw Object.assign(new Error([401, 403, 404].includes(response.status) ? 'Public Drive folder or file is unavailable. Check Anyone with the link access and server API key restrictions.' : 'Public Drive request failed'), { status: [401,403,404].includes(response.status) ? 409 : 502, retryable: response.status === 429 || response.status >= 500 }); }
            return response;
        }
        return fetcher(`https://www.googleapis.com/drive/v3/${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${await token(source)}` }, redirect: 'error', signal: AbortSignal.timeout(20000) });
    };
    async function verify(source) {
        const folder = await providerJson(await request(source, 'files/' + source.folder, { fields: 'id,mimeType,trashed', supportsAllDrives: 'true' }));
        if (folder.id !== source.folder || folder.mimeType !== 'application/vnd.google-apps.folder' || folder.trashed) fail('Choose an accessible public Drive folder', 409);
    }
    return {
        verify,
        async exchange(source, code, verifier) {
            const grant = await tokenRequest({ grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: config.redirectUri });
            if (typeof grant.access_token !== 'string' || typeof grant.refresh_token !== 'string' || !grant.refresh_token || !Number.isFinite(grant.expires_in) || grant.expires_in <= 0 || !grant.scope?.split(' ').includes(DRIVE_SCOPE)) fail('Drive offline read permission required. Reconnect.', 409);
            // Verify the selected folder before retaining a grant.
            if (!isCurrent(source)) fail('Drive connection changed', 409);
            vault.save(credentialId(source), { access_token: grant.access_token, refresh_token: grant.refresh_token, expires: Date.now() + grant.expires_in * 1000 });
            try {
                const folder = await providerJson(await request(source, `files/${source.folder}`, { fields: 'id,mimeType,trashed', supportsAllDrives: 'true' }));
                if (!isCurrent(source) || folder.id !== source.folder || folder.mimeType !== 'application/vnd.google-apps.folder' || folder.trashed) fail('Choose an accessible Drive folder', 409);
            } catch (error) { vault.remove(credentialId(source)); throw error; }
        },
        disconnect: source => vault.remove(credentialId(source)),
        async list(source) {
            if (source.access === 'public') await verify(source);
            const data = await providerJson(await request(source, 'files', { q: `'${source.folder}' in parents and trashed = false`, fields: 'nextPageToken,incompleteSearch,files(id,name,mimeType,size,version,modifiedTime,md5Checksum,resourceKey)', pageSize: '100', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true', ...(source.cursor ? { pageToken: source.cursor } : {}) }));
            if (!Array.isArray(data.files) || data.incompleteSearch || data.nextPageToken && typeof data.nextPageToken !== 'string') fail('Incomplete Drive listing', 502);
            return { files: data.files.filter(file => !file.mimeType?.startsWith('application/vnd.google-apps.')).map(file => ({ id: file.id, name: file.name, mime: file.mimeType, size: Number(file.size), resource_key: file.resourceKey || null, version: file.md5Checksum || `${file.version}:${file.modifiedTime}` })), cursor: data.nextPageToken || null };
        },
        async image(source, asset) {
            // Re-check membership/version before sending bytes to an AI provider.
            const meta = await providerJson(await request(source, `files/${encodeURIComponent(asset.external_id)}`, { fields: 'id,parents,trashed,version,modifiedTime,md5Checksum', supportsAllDrives: 'true' }, asset.resource_key));
            if (meta.trashed || !meta.parents?.includes(source.folder) || (meta.md5Checksum || `${meta.version}:${meta.modifiedTime}`) !== asset.version) fail('Source changed. Sync before analyzing.', 409);
            const response = await request(source, `files/${encodeURIComponent(asset.external_id)}`, { alt: 'media', supportsAllDrives: 'true' }, asset.resource_key);
            if (!response.ok) { await providerJson(response); }
            const bytes = await boundedBytes(response, IMAGE_LIMIT);
            if (meta.md5Checksum) {
                if (createHash('md5').update(bytes).digest('hex') !== meta.md5Checksum) fail('Source changed during download. Sync again.', 409);
            } else {
                const after = await providerJson(await request(source, `files/${encodeURIComponent(asset.external_id)}`, { fields: 'parents,trashed,version,modifiedTime', supportsAllDrives: 'true' }, asset.resource_key));
                if (after.trashed || !after.parents?.includes(source.folder) || `${after.version}:${after.modifiedTime}` !== asset.version) fail('Source changed during download. Sync again.', 409);
            }
            return bytes;
        },
    };
}
export function createR2Provider(bucket, root) {
    const prefix = source => `${root}${source.folder}`;
    return {
        async list(source) {
            if (!bucket) fail('R2 binding required', 409);
            const page = await bucket.list({ prefix: prefix(source), limit: 100, include: ['httpMetadata'], ...(source.cursor ? { cursor: source.cursor } : {}) });
            return { files: page.objects.filter(o => !o.key.endsWith('/')).map(o => ({ id: o.key, name: o.key.slice(prefix(source).length), mime: o.httpMetadata?.contentType || 'application/octet-stream', size: o.size, version: o.etag })), cursor: page.truncated ? page.cursor : null };
        },
        async image(source, asset) {
            if (!bucket || !asset.external_id.startsWith(prefix(source))) fail('Storage object outside source', 403);
            const object = await bucket.get(asset.external_id, { onlyIf: { etagMatches: asset.version } });
            if (!object?.body || object.size > IMAGE_LIMIT) fail('Source changed or unavailable. Sync again.', 409);
            return boundedBytes(new Response(object.body), IMAGE_LIMIT);
        },
    };
}
