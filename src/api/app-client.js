import { uploadVideo } from './video-upload.js';
async function request(path, args) {
    const response = await fetch(`/api/${path}`, {
        method: args ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', 'X-Socialchoice-Client': 'local-ui' },
        ...(args ? { body: JSON.stringify({ args }) } : {}),
    });
    const result = await response.json();
    if (!response.ok) {
        const error = Object.assign(new Error(result.message || 'Request failed'), { status: response.status, ...(result.diagnostic ? {diagnostic:result.diagnostic} : {}) });
        window.dispatchEvent(new CustomEvent('socialchoice:error', { detail: error.message }));
        throw error;
    }
    return result;
}

// Compatibility with the existing page contracts; no Base44 SDK or hosted service is used.
export const appClient = {
    media: {
        uploadVideo,
        upload: (file, brandId, onProgress = (_value) => {}) => new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/media/upload');
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.setRequestHeader('X-Socialchoice-Client', 'local-ui');
            xhr.setRequestHeader('X-Image-Brand', brandId);
            xhr.setRequestHeader('X-Image-Name', encodeURIComponent(file.name));
            xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
            xhr.onload = () => { try { const result = JSON.parse(xhr.responseText); if (xhr.status >= 200 && xhr.status < 300) resolve(result); else reject(new Error(result.message || 'Image upload failed')); } catch { reject(new Error('Image upload failed')); } };
            xhr.onerror = () => reject(new Error('Image upload failed'));
            xhr.timeout = 60000;
            xhr.ontimeout = () => reject(new Error('Image upload timed out. Check the library before uploading again.'));
            xhr.send(file);
        }),
    },
    entities: new Proxy(/** @type {Record<string, Record<string, (...args: any[]) => Promise<any>>>} */ ({}), {
        get: (_, entity) => new Proxy({}, { get: (_, operation) => (...args) => request(`entities/${String(entity)}/${String(operation)}`, args) }),
    }),
    auth: {
        me: () => request('session'),
        logout: async () => { await request('auth/logout', []); window.location.assign('/'); },
        loginViaEmailPassword: (password, legacyPassword = undefined) => request('auth/login', [legacyPassword ?? password]),
        loginWithProvider: (..._args) => { throw new Error('OAuth sign-in is not configured.'); },
        register: async (..._args) => { throw new Error('Hosted registration is not configured.'); },
        /** @returns {Promise<{access_token: string}>} */
        verifyOtp: async (..._args) => { throw new Error('Email verification is not configured.'); },
        resendOtp: async (..._args) => { throw new Error('Email delivery is not configured.'); },
        resetPasswordRequest: async (..._args) => { throw new Error('Password recovery is not configured.'); },
        resetPassword: async (..._args) => { throw new Error('Password recovery is not configured.'); },
        setToken: (..._args) => { throw new Error('Hosted tokens are not used in local-only mode.'); },
    },
    notifications: {list:()=>request('notifications/list',[]),read:ids=>request('notifications/read',[ids]),readAll:()=>request('notifications/readAll',[])},
    publishing: {prepareBatch:entries=>request('publishing/prepareBatch',[entries]),confirmBatch:id=>request('publishing/confirmBatch',[id]),batchStatus:id=>request('publishing/batchStatus',[id]), prepareSchedule:(id,time,timezone)=>request('publishing/prepareSchedule',timezone ? [id,time,timezone] : [id,time]), schedule:id=>request('publishing/schedule',[id]), cancelSchedule:id=>request('publishing/cancelSchedule',[id]), check: () => request('publishing/check', []), prepare: id => request('publishing/prepare', [id]), publish: id => request('publishing/publish', [id]), status: id => request('publishing/status', [id]) },
    meta: {
        status: () => request('meta/status'), pages: () => request('meta/pages'),
        start: (brandId) => request('meta/start', [brandId]),
        importPages: (ids) => request('meta/import', [ids]),
        disconnect: (id) => request('meta/disconnect', [id]), check: (id) => request('meta/check', [id]),
    },
    posts: { save: (plan) => request('posts/save', [plan]) },
    integrations: { Core: {
        /** @returns {Promise<{file_url: string}>} */
        UploadPublicFile: async (..._args) => { throw new Error('Media upload requires a storage backend; not configured in Phase A.'); },
    } },
};
