import { randomBytes, randomUUID } from 'node:crypto';
import { metaConfig } from './meta-config.js';
import { createMetaGraph } from './meta-graph.js';
import { createMetaVault } from './meta-vault.js';
import { fail } from './validation.js';

export function createMetaConnection(store, auth, config = metaConfig()) {
    const graph = config.ready ? createMetaGraph(config) : null;
    const vault = config.ready ? createMetaVault(store, config.key) : null;
    const states = new Map(), pending = new Map();
    const ttl = 10 * 60 * 1000;
    const clean = () => {
        for (const map of [states, pending]) for (const [key, value] of map) if (value.expires <= Date.now()) map.delete(key);
    };
    const requireConfig = () => { if (!config.ready || !auth.enabled) fail('Configure Meta and admin sign-in before connecting Facebook', 409); };
    const cookie = (value, age) => `socialchoice_oauth=${value}; Path=/api/meta/callback; HttpOnly; SameSite=Lax; Max-Age=${age}${config.secure ? '; Secure' : ''}`;
    const requireBrand = id => {
        const brand = store.get('Brand', id);
        if (brand.is_demo || brand.status !== 'active') fail('Choose an active real brand', 409);
        return brand;
    };
    return {
        async callback(req, res) {
            requireConfig(); clean();
            const url = new URL(req.url, config.origin);
            const state = url.searchParams.get('state');
            const ticket = states.get(state);
            const nonce = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('socialchoice_oauth='))?.slice('socialchoice_oauth='.length);
            if (!ticket || ticket.nonce !== nonce || !auth.sessionActive(ticket.session)) fail('Facebook connection request expired or invalid. Start again.', 400);
            states.delete(state); res.setHeader('Set-Cookie', cookie('', 0));
            if (url.searchParams.has('error')) { res.writeHead(303, { Location: config.origin + '/accounts?meta=cancelled', 'Referrer-Policy': 'no-referrer' }); res.end(); return; }
            const code = url.searchParams.get('code');
            if (!code || code.length > 4096) fail('Facebook returned no authorization code', 400);
            try {
                requireBrand(ticket.brandId);
                const userToken = await graph.exchange(code);
                const discovered = await graph.discover(userToken);
                if (!auth.sessionActive(ticket.session)) fail('Sign in required', 401);
                pending.set(ticket.session, { ...discovered, brandId: ticket.brandId, expires: Date.now() + ttl });
                res.writeHead(303, { Location: config.origin + '/accounts?meta=select', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' }); res.end();
            } catch { res.writeHead(303, { Location: config.origin + '/accounts?meta=failed', 'Referrer-Policy': 'no-referrer' }); res.end(); }
        },
        async execute(operation, req, res, args = []) {
            clean();
            if (operation === 'status') return { ready: config.ready && auth.enabled, missing: config.missing, adminRequired: !auth.enabled, publishing: 'not_implemented' };
            if (operation === 'pages' && (!config.ready || !auth.enabled)) return { pages: [], pending: false };
            if (operation === 'disconnect') {
                if (!auth.enabled) fail('Sign in required', 401);
                const account = store.get('SocialAccount', args[0]);
                if (account.is_demo || account.platform !== 'facebook' || !account.credential_id) fail('This destination has no Facebook connection', 409);
                store.transaction(() => {
                    store.deleteCredential(account.credential_id);
                    store.verifiedAccount({ credential_id: null, scopes: [], connection_status: 'disconnected' }, account.id);
                });
                return { disconnected: true };
            }
            requireConfig();
            const session = auth.sessionKey(req);
            if (operation === 'start') {
                if (req.headers.origin && req.headers.origin !== config.origin) fail('Open Socialchoice at the configured Facebook callback origin', 409);
                requireBrand(args[0]);
                if (states.size >= 100) fail('Too many Facebook connection requests', 429);
                pending.delete(session);
                const state = randomBytes(32).toString('hex'), nonce = randomBytes(32).toString('hex');
                states.set(state, { session, nonce, brandId: args[0], expires: Date.now() + ttl });
                res.setHeader('Set-Cookie', cookie(nonce, ttl / 1000));
                const url = new URL(`https://www.facebook.com/${config.version}/dialog/oauth`);
                url.search = new URLSearchParams({ client_id: config.appId, redirect_uri: config.redirectUri, state, response_type: 'code', scope: 'pages_show_list,pages_read_engagement', auth_type: 'rerequest' }).toString();
                if (config.loginConfigId) url.searchParams.set('config_id', config.loginConfigId);
                return { url: url.href };
            }
            if (operation === 'pages') {
                const result = pending.get(session);
                if (!result) return { pages: [], pending: false };
                return { pending: true, brandId: result.brandId, profileName: result.profile.name, scopes: result.scopes, pages: result.pages.map(p => ({ id: p.id, name: p.name, tasks: p.tasks || [] })) };
            }
            if (operation === 'import') {
                const result = pending.get(session);
                if (!result) fail('Facebook Page selection expired. Connect again.', 409);
                requireBrand(result.brandId);
                const ids = args[0];
                if (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some(id => !result.pages.some(p => p.id === id))) fail('Select Pages returned by Facebook');
                const imported = store.transaction(() => [...new Set(ids)].map(id => {
                    const page = result.pages.find(p => p.id === id);
                    const existing = store.all('SocialAccount').find(a => !a.is_demo && a.platform === 'facebook' && a.external_id === id && a.brand_id === result.brandId);
                    // A new identity prevents stale access checks from modifying a reconnected token.
                    const credentialId = randomUUID();
                    vault.save(credentialId, { token: page.access_token, profileId: result.profile.id, scopes: result.scopes });
                    const account = store.verifiedAccount({ name: page.name, external_id: id, brand_id: result.brandId, platform: 'facebook', account_type: 'page', is_demo: false, credential_id: credentialId, scopes: result.scopes, connection_status: 'connected', last_synced_at: new Date().toISOString() }, existing?.id);
                    if (existing?.credential_id) vault.remove(existing.credential_id);
                    return account;
                }));
                pending.delete(session);
                return { imported: imported.length };
            }
            const account = store.get('SocialAccount', args[0]);
            if (account.is_demo || account.platform !== 'facebook' || !account.credential_id) fail('This destination has no Facebook connection', 409);
            if (operation === 'check') {
                try {
                    const credential = vault.read(account.credential_id);
                    const page = await graph.check(account.external_id, credential.token);
                    if (store.get('SocialAccount', account.id).credential_id !== account.credential_id) fail('Facebook connection changed. Check again.', 409);
                    store.verifiedAccount({ name: page.name, connection_status: 'connected', last_synced_at: new Date().toISOString() }, account.id);
                    return { connected: true };
                } catch (error) {
                    if (error.status === 409 && store.get('SocialAccount', account.id).credential_id === account.credential_id) store.verifiedAccount({ connection_status: 'expired' }, account.id);
                    throw error;
                }
            }
            fail('Endpoint not found', 404);
        },
    };
}
