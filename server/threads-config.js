export function threadsConfig(env = process.env) {
    const values = { appId: env.THREADS_APP_ID, appSecret: env.THREADS_APP_SECRET, redirectUri: env.THREADS_REDIRECT_URI, key: env.META_TOKEN_ENCRYPTION_KEY };
    const missing = Object.entries(values).filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) return { ready: false, missing };
    let redirect;
    try { redirect = new URL(values.redirectUri); } catch { return { ready: false, missing: ['valid redirectUri'] }; }
    if (!/^\d+$/.test(values.appId) || !/^[a-f0-9]{64}$/i.test(values.key) || redirect.pathname !== '/api/threads/callback' || redirect.search || redirect.hash || redirect.username || redirect.password || (redirect.protocol !== 'https:' && !(redirect.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(redirect.hostname)))) return { ready: false, missing: ['valid Threads configuration'] };
    if (env.SOCIALCHOICE_PUBLIC_ORIGIN && env.SOCIALCHOICE_PUBLIC_ORIGIN !== redirect.origin) return { ready: false, missing: ['matching callback origin'] };
    return { ...values, version: 'v1.0', ready: true, missing: [], origin: redirect.origin, secure: redirect.protocol === 'https:' };
}
