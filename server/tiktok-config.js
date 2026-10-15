export function tiktokConfig(env = process.env) {
    const values = { clientKey: env.TIKTOK_CLIENT_KEY, clientSecret: env.TIKTOK_CLIENT_SECRET, redirectUri: env.TIKTOK_REDIRECT_URI, key: env.META_TOKEN_ENCRYPTION_KEY };
    const missing = Object.entries(values).filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) return { ready: false, missing };
    let redirect; try { redirect = new URL(values.redirectUri); } catch { return { ready: false, missing: ['valid TikTok callback'] }; }
    if (!/^[a-zA-Z0-9_-]{8,256}$/.test(values.clientKey) || !/^[a-zA-Z0-9_-]{8,256}$/.test(values.clientSecret) || !/^[a-f0-9]{64}$/i.test(values.key) || redirect.protocol !== 'https:' || redirect.pathname !== '/api/tiktok/callback' || redirect.search || redirect.hash || redirect.username || redirect.password || env.SOCIALCHOICE_PUBLIC_ORIGIN && env.SOCIALCHOICE_PUBLIC_ORIGIN !== redirect.origin) return { ready: false, missing: ['valid TikTok configuration'] };
    // This release deliberately cannot enable public posting by changing an env flag.
    return { ...values, ready: true, missing: [], origin: redirect.origin, secure: true, mode: 'sandbox', mediaOrigin: redirect.origin };
}
