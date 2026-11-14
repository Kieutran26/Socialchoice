import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { fail } from './validation.js';

export const MCP_SCOPES = ['posts:read', 'posts:write', 'posts:publish'];
export const DEFAULT_MCP_SCOPES = ['posts:read', 'posts:write'];

function sha256Hex(value) {
    return createHash('sha256').update(String(value)).digest('hex');
}

function sha256Base64Url(value) {
    return createHash('sha256').update(String(value)).digest('base64url');
}

function encodeWorkspacePrefix(workspaceId = 'admin') {
    return Buffer.from(String(workspaceId || 'admin'), 'utf8').toString('base64url');
}

export function decodeWorkspacePrefix(tokenOrCode) {
    if (typeof tokenOrCode !== 'string') return null;
    const match = /^sc_(?:mcp|code|ref|ctx)_([A-Za-z0-9_-]+)_([A-Za-z0-9_-]+)$/.exec(tokenOrCode.trim());
    if (!match) return null;
    try {
        return Buffer.from(match[1], 'base64url').toString('utf8') || 'admin';
    } catch {
        return null;
    }
}

function generatePrefixedSecret(kind, workspaceId = 'admin', bytes = 24) {
    const prefix = encodeWorkspacePrefix(workspaceId);
    const random = randomBytes(bytes).toString('base64url');
    return `sc_${kind}_${prefix}_${random}`;
}

export function normalizeScopes(input, fallback = DEFAULT_MCP_SCOPES) {
    const raw = Array.isArray(input)
        ? input
        : typeof input === 'string'
        ? input.split(/[\s,]+/)
        : [];
    const valid = [...new Set(raw.map((s) => s.trim()).filter((s) => MCP_SCOPES.includes(s)))];
    if (!valid.length) return [...fallback];
    // Always include posts:read when any higher scope is granted
    if (!valid.includes('posts:read')) valid.unshift('posts:read');
    return valid;
}

export function verifyPkce(codeVerifier, codeChallenge, method = 'S256') {
    if (!codeChallenge) return true;
    if (typeof codeVerifier !== 'string' || codeVerifier.length < 43 || codeVerifier.length > 128) {
        return false;
    }
    const normalizedMethod = String(method || 'S256').toUpperCase();
    const computed = normalizedMethod === 'PLAIN' ? codeVerifier : sha256Base64Url(codeVerifier);
    const a = Buffer.from(computed, 'utf8');
    const b = Buffer.from(String(codeChallenge), 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
}

export function createMcpStore(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS mcp_clients (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS mcp_auth_requests (
            handle TEXT PRIMARY KEY,
            code_hash TEXT,
            data TEXT NOT NULL,
            expires_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS mcp_grants (
            id TEXT PRIMARY KEY,
            token_hash TEXT UNIQUE NOT NULL,
            refresh_hash TEXT,
            data TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            expires_at INTEGER
        );
    `);

    const cleanupExpired = () => {
        const now = Date.now();
        db.prepare('DELETE FROM mcp_auth_requests WHERE expires_at <= ?').run(now);
    };

    return {
        registerClient(input = {}) {
            cleanupExpired();
            const clientName =
                typeof input.client_name === 'string' && input.client_name.trim()
                    ? input.client_name.trim().slice(0, 120)
                    : 'AI Assistant (MCP Client)';
            const redirectUris = Array.isArray(input.redirect_uris)
                ? input.redirect_uris
                      .filter((u) => typeof u === 'string' && u.trim())
                      .map((u) => u.trim())
                : [];
            if (!redirectUris.length) {
                fail('redirect_uris is required for client registration', 400);
            }
            for (const uri of redirectUris) {
                try {
                    new URL(uri);
                } catch {
                    fail(`Invalid redirect_uri: ${uri}`, 400);
                }
            }
            const id = `mcp_client_${randomUUID().replace(/-/g, '')}`;
            const now = Date.now();
            const client = {
                client_id: id,
                client_name: clientName,
                redirect_uris: redirectUris,
                grant_types: Array.isArray(input.grant_types)
                    ? input.grant_types
                    : ['authorization_code', 'refresh_token'],
                response_types: Array.isArray(input.response_types) ? input.response_types : ['code'],
                token_endpoint_auth_method: input.token_endpoint_auth_method || 'none',
                client_id_issued_at: Math.floor(now / 1000),
            };
            db.prepare('INSERT INTO mcp_clients (id, data, created_at) VALUES (?, ?, ?)').run(
                id,
                JSON.stringify(client),
                now
            );
            return client;
        },

        getClient(clientId) {
            if (!clientId || typeof clientId !== 'string') return null;
            const row = db.prepare('SELECT data FROM mcp_clients WHERE id = ?').get(clientId);
            if (row) return JSON.parse(row.data);
            // Allow ad-hoc public OAuth clients (e.g. Claude / ChatGPT static client IDs)
            return {
                client_id: clientId,
                client_name:
                    clientId.toLowerCase().includes('claude')
                        ? 'Claude'
                        : clientId.toLowerCase().includes('chatgpt') || clientId.toLowerCase().includes('openai')
                        ? 'ChatGPT'
                        : clientId,
                redirect_uris: [],
                token_endpoint_auth_method: 'none',
                adhoc: true,
            };
        },

        createAuthRequest({
            client_id,
            client_name,
            redirect_uri,
            scope,
            state = '',
            code_challenge = '',
            code_challenge_method = 'S256',
            resource = '',
            workspace_id = 'admin',
        }) {
            cleanupExpired();
            if (!client_id || typeof client_id !== 'string') fail('client_id is required', 400);
            if (!redirect_uri || typeof redirect_uri !== 'string') fail('redirect_uri is required', 400);
            try {
                new URL(redirect_uri);
            } catch {
                fail('Invalid redirect_uri', 400);
            }
            const client = this.getClient(client_id);
            if (!client.adhoc && client.redirect_uris.length && !client.redirect_uris.includes(redirect_uri)) {
                fail('redirect_uri does not match registered client', 400);
            }
            const handle = generatePrefixedSecret('ctx', workspace_id, 18);
            const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
            const requestedScopes = normalizeScopes(scope, DEFAULT_MCP_SCOPES);
            const record = {
                handle,
                client_id,
                client_name: client_name || client.client_name || 'AI Assistant',
                redirect_uri,
                requested_scopes: requestedScopes,
                state: String(state || ''),
                code_challenge: String(code_challenge || ''),
                code_challenge_method: String(code_challenge_method || 'S256'),
                resource: String(resource || ''),
                workspace_id: String(workspace_id || 'admin'),
                status: 'pending',
                created_at: new Date().toISOString(),
                expires_at: expiresAt,
            };
            db.prepare(
                'INSERT INTO mcp_auth_requests (handle, code_hash, data, expires_at) VALUES (?, NULL, ?, ?)'
            ).run(handle, JSON.stringify(record), expiresAt);
            return record;
        },

        getAuthRequest(handle) {
            cleanupExpired();
            if (!handle || typeof handle !== 'string') return null;
            const row = db
                .prepare('SELECT data, expires_at FROM mcp_auth_requests WHERE handle = ?')
                .get(handle);
            if (!row || row.expires_at <= Date.now()) return null;
            const parsed = JSON.parse(row.data);
            return parsed.status === 'pending' ? parsed : null;
        },

        consumeAuthRequestDecision(handle, { action, scopes, workspace_id }) {
            cleanupExpired();
            const row = db
                .prepare('SELECT data, expires_at FROM mcp_auth_requests WHERE handle = ?')
                .get(handle);
            if (!row || row.expires_at <= Date.now()) {
                fail('This authorization request has expired or was already used.', 400);
            }
            const reqData = JSON.parse(row.data);
            if (reqData.status !== 'pending') {
                fail('This authorization request has already been processed.', 400);
            }
            if (action === 'deny') {
                db.prepare('DELETE FROM mcp_auth_requests WHERE handle = ?').run(handle);
                const redirect = new URL(reqData.redirect_uri);
                redirect.searchParams.set('error', 'access_denied');
                redirect.searchParams.set('error_description', 'The user denied the request.');
                if (reqData.state) redirect.searchParams.set('state', reqData.state);
                return { redirect_url: redirect.toString(), status: 'denied' };
            }

            const effectiveWorkspace = workspace_id || reqData.workspace_id || 'admin';
            const grantedScopes = normalizeScopes(scopes || reqData.requested_scopes, DEFAULT_MCP_SCOPES);
            const rawCode = generatePrefixedSecret('code', effectiveWorkspace, 24);
            const codeHash = sha256Hex(rawCode);
            const codeExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
            const updated = {
                ...reqData,
                workspace_id: effectiveWorkspace,
                granted_scopes: grantedScopes,
                status: 'approved',
                approved_at: new Date().toISOString(),
                expires_at: codeExpiresAt,
            };
            db.prepare(
                'UPDATE mcp_auth_requests SET code_hash = ?, data = ?, expires_at = ? WHERE handle = ?'
            ).run(codeHash, JSON.stringify(updated), codeExpiresAt, handle);

            const redirect = new URL(reqData.redirect_uri);
            redirect.searchParams.set('code', rawCode);
            if (reqData.state) redirect.searchParams.set('state', reqData.state);
            return {
                redirect_url: redirect.toString(),
                code: rawCode,
                scopes: grantedScopes,
                status: 'approved',
            };
        },

        exchangeAuthorizationCode({ code, client_id, redirect_uri, code_verifier }) {
            cleanupExpired();
            if (!code || typeof code !== 'string') fail('Authorization code is required', 400);
            const codeHash = sha256Hex(code);
            const row = db
                .prepare('SELECT handle, data, expires_at FROM mcp_auth_requests WHERE code_hash = ?')
                .get(codeHash);
            if (!row || row.expires_at <= Date.now()) {
                fail('Invalid or expired authorization code', 400);
            }
            // Atomically delete so authorization code is strictly single-use
            db.prepare('DELETE FROM mcp_auth_requests WHERE handle = ?').run(row.handle);

            const reqData = JSON.parse(row.data);
            if (reqData.status !== 'approved') {
                fail('Authorization code is not approved', 400);
            }
            if (client_id && reqData.client_id && client_id !== reqData.client_id) {
                fail('client_id mismatch', 400);
            }
            if (redirect_uri && reqData.redirect_uri && redirect_uri !== reqData.redirect_uri) {
                fail('redirect_uri mismatch', 400);
            }
            if (
                reqData.code_challenge &&
                !verifyPkce(code_verifier, reqData.code_challenge, reqData.code_challenge_method)
            ) {
                fail('PKCE verification failed', 400);
            }

            return this.issueGrant({
                client_id: reqData.client_id,
                client_name: reqData.client_name,
                scopes: reqData.granted_scopes || reqData.requested_scopes,
                workspace_id: reqData.workspace_id || 'admin',
                kind: 'oauth',
            });
        },

        exchangeRefreshToken({ refresh_token, client_id, scope }) {
            if (!refresh_token || typeof refresh_token !== 'string') {
                fail('refresh_token is required', 400);
            }
            const refreshHash = sha256Hex(refresh_token);
            const row = db
                .prepare('SELECT id, data FROM mcp_grants WHERE refresh_hash = ?')
                .get(refreshHash);
            if (!row) fail('Invalid refresh token', 400);
            const grant = JSON.parse(row.data);
            if (grant.revoked_at) fail('Grant has been revoked', 400);
            if (client_id && grant.client_id && client_id !== grant.client_id) {
                fail('client_id mismatch', 400);
            }
            const requestedScopes = scope
                ? normalizeScopes(scope, grant.scopes)
                : grant.scopes;
            // Ensure refresh cannot escalate scopes beyond original grant
            if (requestedScopes.some((s) => !grant.scopes.includes(s))) {
                fail('Cannot request scopes beyond original grant', 400);
            }
            db.prepare('DELETE FROM mcp_grants WHERE id = ?').run(row.id);
            return this.issueGrant({
                client_id: grant.client_id,
                client_name: grant.client_name,
                scopes: requestedScopes,
                workspace_id: grant.workspace_id || 'admin',
                kind: grant.kind || 'oauth',
            });
        },

        issueGrant({
            client_id = 'personal_token',
            client_name = 'Personal AI Token',
            scopes = DEFAULT_MCP_SCOPES,
            workspace_id = 'admin',
            kind = 'oauth',
            ttlSeconds = 30 * 24 * 60 * 60, // 30 days default
        }) {
            const id = randomUUID();
            const now = Date.now();
            const expiresAt = ttlSeconds ? now + ttlSeconds * 1000 : null;
            const accessToken = generatePrefixedSecret('mcp', workspace_id, 28);
            const refreshToken = kind === 'oauth' ? generatePrefixedSecret('ref', workspace_id, 28) : null;
            const normalized = normalizeScopes(scopes, DEFAULT_MCP_SCOPES);

            const record = {
                id,
                client_id,
                client_name,
                scopes: normalized,
                workspace_id: String(workspace_id || 'admin'),
                kind,
                token_preview: `${accessToken.slice(0, 14)}…${accessToken.slice(-4)}`,
                created_at: new Date(now).toISOString(),
                last_used_at: null,
                expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
                revoked_at: null,
            };

            db.prepare(
                'INSERT INTO mcp_grants (id, token_hash, refresh_hash, data, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(
                id,
                sha256Hex(accessToken),
                refreshToken ? sha256Hex(refreshToken) : null,
                JSON.stringify(record),
                now,
                expiresAt
            );

            return {
                grant: record,
                access_token: accessToken,
                token_type: 'Bearer',
                expires_in: ttlSeconds || 31536000,
                ...(refreshToken ? { refresh_token: refreshToken } : {}),
                scope: normalized.join(' '),
            };
        },

        verifyAccessToken(rawToken) {
            if (!rawToken || typeof rawToken !== 'string') return null;
            const clean = rawToken.replace(/^Bearer\s+/i, '').trim();
            if (!clean) return null;
            const tokenHash = sha256Hex(clean);
            const row = db
                .prepare('SELECT id, data, expires_at FROM mcp_grants WHERE token_hash = ?')
                .get(tokenHash);
            if (!row) return null;
            if (row.expires_at && row.expires_at <= Date.now()) return null;
            const record = JSON.parse(row.data);
            if (record.revoked_at) return null;
            const updated = {
                ...record,
                last_used_at: new Date().toISOString(),
            };
            db.prepare('UPDATE mcp_grants SET data = ? WHERE id = ?').run(
                JSON.stringify(updated),
                row.id
            );
            return updated;
        },

        listGrants() {
            const now = Date.now();
            return db
                .prepare(
                    'SELECT data, expires_at FROM mcp_grants WHERE expires_at IS NULL OR expires_at > ? ORDER BY created_at DESC'
                )
                .all(now)
                .map((row) => JSON.parse(row.data))
                .filter((grant) => !grant.revoked_at);
        },

        revokeGrant(id) {
            if (!id || typeof id !== 'string') fail('Grant ID required', 400);
            const result = db.prepare('DELETE FROM mcp_grants WHERE id = ?').run(id);
            return { revoked: result?.changes ? 1 : 0, id };
        },
    };
}
