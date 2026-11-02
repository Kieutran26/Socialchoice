export function linkedinConfig(env = process.env) {
    const trim = value => typeof value === 'string' ? value.trim() : value;
    const values = { appId: trim(env.LINKEDIN_CLIENT_ID), appSecret: trim(env.LINKEDIN_CLIENT_SECRET), redirectUri: trim(env.LINKEDIN_REDIRECT_URI) || (env.SOCIALCHOICE_PUBLIC_ORIGIN ? `${trim(env.SOCIALCHOICE_PUBLIC_ORIGIN)}/api/linkedin/callback` : undefined), key: trim(env.META_TOKEN_ENCRYPTION_KEY || env.SOCIALCHOICE_STORAGE_KEY) };
    const missing = Object.entries(values).filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) return { ready: false, missing };
    let redirect;
    try { redirect = new URL(values.redirectUri); } catch { return { ready: false, missing: ['valid redirectUri'] }; }
    const publicOrigin = trim(env.SOCIALCHOICE_PUBLIC_ORIGIN);
    if (!/^[a-zA-Z0-9]{6,64}$/.test(values.appId) || !/^[a-f0-9]{64}$/i.test(values.key) || redirect.pathname !== '/api/linkedin/callback' || redirect.search || redirect.hash || redirect.username || redirect.password || (redirect.protocol !== 'https:' && !(redirect.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(redirect.hostname))) || publicOrigin && publicOrigin !== redirect.origin) return { ready: false, missing: ['valid LinkedIn configuration'] };
    return { ...values, ready: true, missing: [], origin: redirect.origin, secure: redirect.protocol === 'https:' };
}
