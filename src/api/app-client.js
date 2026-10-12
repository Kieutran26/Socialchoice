async function request(path, args) {
    const response = await fetch(`/api/${path}`, {
        method: args ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', 'X-Socialchoice-Client': 'local-ui' },
        ...(args ? { body: JSON.stringify({ args }) } : {}),
    });
    const result = await response.json();
    if (!response.ok) {
        const error = Object.assign(new Error(result.message || 'Request failed'), { status: response.status });
        window.dispatchEvent(new CustomEvent('socialchoice:error', { detail: error.message }));
        throw error;
    }
    return result;
}

// Compatibility with the existing page contracts; no Base44 SDK or hosted service is used.
export const appClient = {
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
    publishing: { check: () => request('publishing/check', []) },
    posts: { save: (plan) => request('posts/save', [plan]) },
    integrations: { Core: {
        /** @returns {Promise<{file_url: string}>} */
        UploadPublicFile: async (..._args) => { throw new Error('Media upload requires a storage backend; not configured in Phase A.'); },
    } },
};
