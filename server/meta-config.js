export function metaConfig(env = process.env) {
    const values = { appId: env.META_APP_ID, appSecret: env.META_APP_SECRET, version: env.META_GRAPH_VERSION, redirectUri: env.META_REDIRECT_URI, key: env.META_TOKEN_ENCRYPTION_KEY };
    const missing = Object.entries(values).filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) return { ready: false, missing };
    let redirect;
    try { redirect = new URL(values.redirectUri); } catch { return { ready: false, missing: ['valid redirectUri'] }; }
    if (!/^\d+$/.test(values.appId) || !/^v\d+\.0$/.test(values.version) || !/^[a-f0-9]{64}$/i.test(values.key) || redirect.pathname !== '/api/meta/callback' || redirect.search || redirect.hash || redirect.username || redirect.password || (redirect.protocol !== 'https:' && !(redirect.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(redirect.hostname)))) return { ready: false, missing: ['valid Meta configuration'] };
    if (env.META_LOGIN_CONFIG_ID && !/^\d+$/.test(env.META_LOGIN_CONFIG_ID)) return { ready: false, missing: ['valid login config ID'] };
    return { ...values, ...(env.META_LOGIN_CONFIG_ID ? { loginConfigId: env.META_LOGIN_CONFIG_ID } : {}), ready: true, missing: [], origin: redirect.origin, secure: redirect.protocol === 'https:' };
}
