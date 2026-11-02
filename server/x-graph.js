import { createHash } from 'node:crypto';
import { fail } from './validation.js';

export const X_SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];

export function generatePkcePair() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let verifier = '';
    const bytes = new Uint8Array(64);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < bytes.length; i++) {
        verifier += chars[bytes[i] % chars.length];
    }
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
}

export function xToken(value, now = Date.now()) {
    if (!value || typeof value.access_token !== 'string' || !value.access_token) {
        fail('X did not return an access token. Reconnect X.', 409);
    }
    const expiresIn = Number.isSafeInteger(value.expires_in) ? value.expires_in : 7200;
    const grantedScopes = typeof value.scope === 'string' ? value.scope.split(' ') : (Array.isArray(value.scope) ? value.scope : X_SCOPES);
    return {
        platform: 'x',
        token: value.access_token,
        refreshToken: value.refresh_token || '',
        scopes: grantedScopes,
        expiresAt: now + expiresIn * 1000,
    };
}

export function createXGraph(config) {
    const basicAuth = 'Basic ' + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    async function tokenRequest(params) {
        let response, data;
        try {
            response = await fetch('https://api.twitter.com/2/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': basicAuth,
                },
                body: new URLSearchParams(params),
                signal: AbortSignal.timeout(20000),
            });
        } catch {
            fail('X token request unavailable or timed out', 502);
        }
        try {
            data = await response.json();
        } catch {
            fail('X returned an invalid token response', 502);
        }
        if (!response.ok || !data?.access_token) {
            const msg = data?.error_description || data?.error || 'X authentication failed';
            throw Object.assign(new Error(`X authorization error: ${msg}`), { status: 502, xError: data });
        }
        return data;
    }

    return {
        async exchange(code, verifier) {
            const data = await tokenRequest({
                grant_type: 'authorization_code',
                code,
                redirect_uri: config.redirectUri,
                code_verifier: verifier,
                client_id: config.clientId,
            });
            return xToken(data);
        },

        async refresh(refreshToken) {
            const data = await tokenRequest({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: config.clientId,
            });
            return xToken(data);
        },

        async profile(token) {
            let response, data;
            try {
                response = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name', {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: AbortSignal.timeout(15000),
                });
            } catch {
                fail('X profile request timed out or unavailable', 502);
            }
            try {
                data = await response.json();
            } catch {
                fail('X returned an invalid profile response', 502);
            }
            if (!response.ok || !data?.data?.id) {
                fail('X could not confirm account identity', 502);
            }
            const u = data.data;
            return {
                id: u.id,
                username: u.username,
                name: u.name,
                avatar: u.profile_image_url || '',
            };
        },

        async createTweet(token, text) {
            let response, data;
            try {
                response = await fetch('https://api.twitter.com/2/tweets', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text }),
                    signal: AbortSignal.timeout(20000),
                });
            } catch {
                fail('X tweet request timed out or unconfirmed', 502);
            }
            try {
                data = await response.json();
            } catch {
                fail('X returned an invalid tweet response', 502);
            }
            if (!response.ok || !data?.data?.id) {
                const errDetail = data?.detail || data?.title || 'Could not publish tweet';
                throw Object.assign(new Error(`X publishing failed: ${errDetail}`), { status: 502, xError: data });
            }
            return {
                id: data.data.id,
                text: data.data.text,
            };
        },
    };
}

