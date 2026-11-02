export function xConfig(env = process.env) {
    const clientId = env.X_CLIENT_ID || env.TWITTER_CLIENT_ID;
    const clientSecret = env.X_CLIENT_SECRET || env.TWITTER_CLIENT_SECRET;
    const redirectUri = env.X_REDIRECT_URI || env.TWITTER_REDIRECT_URI || (env.SOCIALCHOICE_PUBLIC_ORIGIN ? `${env.SOCIALCHOICE_PUBLIC_ORIGIN}/api/x/callback` : undefined);
    const key = env.META_TOKEN_ENCRYPTION_KEY || env.SOCIALCHOICE_STORAGE_KEY;
    const values = { clientId, clientSecret, redirectUri, key };
    const missing = Object.entries(values).filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) return { ready: false, missing };
    let redirect;
    try { redirect = new URL(redirectUri); } catch { return { ready: false, missing: ['valid redirectUri'] }; }
    if (!clientId || !clientSecret || !/^[a-f0-9]{64}$/i.test(key) || redirect.pathname !== '/api/x/callback' || redirect.search || redirect.hash || redirect.username || redirect.password || (redirect.protocol !== 'https:' && !(redirect.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(redirect.hostname)))) {
        return { ready: false, missing: ['valid X configuration'] };
    }
    if (env.SOCIALCHOICE_PUBLIC_ORIGIN && env.SOCIALCHOICE_PUBLIC_ORIGIN !== redirect.origin) return { ready: false, missing: ['matching callback origin'] };
    return { clientId, clientSecret, redirectUri, key, ready: true, missing: [], origin: redirect.origin, secure: redirect.protocol === 'https:' };
}

