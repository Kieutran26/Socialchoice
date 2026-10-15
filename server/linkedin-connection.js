import { randomBytes, randomUUID } from 'node:crypto';
import { linkedinConfig } from './linkedin-config.js';
import { createLinkedinGraph, LINKEDIN_SCOPES } from './linkedin-graph.js';
import { createMetaVault } from './meta-vault.js';
import { safeConnectionFailure } from './meta-connection.js';
import { fail } from './validation.js';

export function createLinkedinConnection(store, auth, config = linkedinConfig(), { states = new Map(), pending = new Map(), graph = config.ready ? createLinkedinGraph(config) : null } = {}) {
    const vault = config.ready ? createMetaVault(store, config.key) : null;
    const ttl = 10 * 60 * 1000;
    const clean = () => { for (const map of [states, pending]) for (const [key, value] of map) if (value.expires <= Date.now() || !auth.sessionActive(value.session || key)) map.delete(key); };
    const requireConfig = () => { if (!config.ready || !auth.enabled) fail('Configure Linkedin and admin sign-in before connecting Linkedin', 409); };
    const cookie = (value, age) => `socialchoice_linkedin_oauth=${value}; Path=/api/linkedin/callback; HttpOnly; SameSite=Lax; Max-Age=${age}${config.secure ? '; Secure' : ''}`;
    const requireBrand = id => { const brand = store.get('Brand', id); if (brand.is_demo || brand.status !== 'active') fail('Choose an active real brand', 409); return brand; };
    const accountFor = id => { const account = store.get('SocialAccount', id); if (account.is_demo || account.platform !== 'linkedin' || !account.credential_id) fail('This destination has no Linkedin connection', 409); return account; };
    const validCredential = (credential, account) => {
        if (credential.platform !== 'linkedin' || credential.profileId !== account.external_id || !LINKEDIN_SCOPES.every(scope => credential.scopes?.includes(scope))) fail('Linkedin credential identity mismatch. Reconnect Linkedin.', 409);
        if (!Number.isSafeInteger(credential.expiresAt) || credential.expiresAt <= Date.now()) throw Object.assign(new Error('Linkedin authorization expired. Reconnect Linkedin.'), { status: 409, metaCode: 190 });
    };
    return {
        async callback(req, res) {
            requireConfig(); clean();
            const url = new URL(req.url, config.origin), state = url.searchParams.get('state'), ticket = states.get(state);
            const nonce = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith('socialchoice_linkedin_oauth='))?.slice('socialchoice_linkedin_oauth='.length);
            if (!ticket || ticket.nonce !== nonce || !auth.sessionActive(ticket.session)) fail('Linkedin connection request expired or invalid. Start again.', 400);
            states.delete(state); res.setHeader('Set-Cookie', cookie('', 0));
            const finish = outcome => { res.writeHead(303, { Location: `${config.origin}/accounts?linkedin=${outcome}`, 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' }); res.end(); };
            if (url.searchParams.has('error')) { pending.delete(ticket.session); return finish('cancelled'); }
            const code = url.searchParams.get('code');
            if (!code || code.length > 4096) fail('Linkedin returned no authorization code', 400);
            pending.set(ticket.session, { session: ticket.session, flowId: state, processing: true, expires: ticket.expires });
            try {
                requireBrand(ticket.brandId);
                const credential = await graph.exchange(code);
                const profile = await graph.profile(credential.token);
                credential.profileId = profile.id;
                const details = await graph.permissions(credential.token, profile.id);
                if (!auth.sessionActive(ticket.session) || ticket.expires <= Date.now() || pending.get(ticket.session)?.flowId !== state) fail('Linkedin connection request expired', 401);
                requireBrand(ticket.brandId);
                pending.set(ticket.session, { session: ticket.session, credential: { ...credential, scopes: details.scopes, expiresAt: Math.min(credential.expiresAt, details.expiresAt), platform: 'linkedin' }, profile, brandId: ticket.brandId, expires: Date.now() + ttl });
                return finish('select');
            } catch (error) {
                if (pending.get(ticket.session)?.flowId === state) {
                    pending.delete(ticket.session);
                    if (auth.sessionActive(ticket.session) && ticket.expires > Date.now()) pending.set(ticket.session, { session: ticket.session, failure: safeConnectionFailure(error), expires: Date.now() + ttl });
                }
                return finish('failed');
            }
        },
        async execute(operation, req, res, args = []) {
            clean();
            if (operation === 'status') return { ready: config.ready && auth.enabled, missing: config.missing, adminRequired: !auth.enabled, publishing: 'text_photo_video_publish_now' };
            if (operation === 'profile' && (!config.ready || !auth.enabled)) return { profile: null, pending: false };
            if (operation === 'disconnect') {
                if (!auth.enabled) fail('Sign in required', 401);
                auth.require(req);
                const account = accountFor(args[0]);
                store.transaction(() => {
                    if (!store.all('SocialAccount').some(other => other.id !== account.id && other.credential_id === account.credential_id)) store.deleteCredential(account.credential_id);
                    store.verifiedAccount({ credential_id: null, scopes: [], connection_status: 'disconnected' }, account.id);
                });
                return { disconnected: true };
            }
            requireConfig(); const session = auth.sessionKey(req);
            if (operation === 'start') {
                if (args.length !== 1) fail('Linkedin brand required');
                if (req.headers.origin && req.headers.origin !== config.origin) fail('Open Socialchoice at the configured Linkedin callback origin', 409);
                requireBrand(args[0]);
                if (states.size >= 100) fail('Too many Linkedin connection requests', 429);
                for (const [key, value] of states) if (value.session === session) states.delete(key);
                pending.delete(session);
                const state = randomBytes(32).toString('hex'), nonce = randomBytes(32).toString('hex');
                states.set(state, { session, nonce, brandId: args[0], expires: Date.now() + ttl });
                res.setHeader('Set-Cookie', cookie(nonce, ttl / 1000));
                const url = new URL('https://www.linkedin.com/oauth/v2/authorization');
                url.search = new URLSearchParams({ client_id: config.appId, redirect_uri: config.redirectUri, state, response_type: 'code', scope: LINKEDIN_SCOPES.join(' ') }).toString();
                return { url: url.href };
            }
            if (operation === 'profile') {
                const result = pending.get(session);
                if (!result || result.processing) return { profile: null, pending: false };
                if (result.failure) return { profile: null, pending: false, failure: result.failure };
                return { pending: true, platform: 'linkedin', brandId: result.brandId, profile: result.profile, scopes: result.credential.scopes, expiresAt: result.credential.expiresAt };
            }
            if (operation === 'import') {
                const result = pending.get(session);
                if (!result || result.failure || result.processing) fail('Linkedin profile selection expired. Connect again.', 409);
                requireBrand(result.brandId);
                if (args.length !== 1 || args[0] !== result.profile.id) fail('Select the profile returned by Linkedin');
                validCredential(result.credential, { external_id: result.profile.id });
                store.transaction(() => {
                    const existing = store.all('SocialAccount').find(account => !account.is_demo && account.platform === 'linkedin' && account.external_id === result.profile.id && account.brand_id === result.brandId);
                    const credentialId = randomUUID(); vault.save(credentialId, result.credential);
                    store.verifiedAccount({ name: result.profile.username, username: result.profile.username, external_id: result.profile.id, brand_id: result.brandId, platform: 'linkedin', account_type: 'profile', is_demo: false, credential_id: credentialId, scopes: result.credential.scopes, connection_status: 'connected', last_synced_at: new Date().toISOString() }, existing?.id);
                    if (existing?.credential_id && !store.all('SocialAccount').some(account => account.credential_id === existing.credential_id)) vault.remove(existing.credential_id);
                });
                pending.delete(session); return { imported: 1 };
            }
            if (operation === 'check') {
                const account = accountFor(args[0]);
                try {
                    const credential = vault.read(account.credential_id); validCredential(credential, account);
                    const profile = await graph.profile(credential.token);
                    await graph.permissions(credential.token);
                    if (profile.id !== account.external_id) fail('Linkedin profile identity changed. Reconnect Linkedin.', 409);
                    if (store.get('SocialAccount', account.id).credential_id !== account.credential_id) fail('Linkedin connection changed. Check again.', 409);
                    store.verifiedAccount({ name: profile.username, username: profile.username, connection_status: 'connected', last_synced_at: new Date().toISOString() }, account.id);
                    return { connected: true };
                } catch (error) {
                    if ((error.metaCode === 190 || error.linkedinGrantInvalid) && store.get('SocialAccount', account.id).credential_id === account.credential_id) store.verifiedAccount({ connection_status: 'expired' }, account.id);
                    throw error;
                }
            }
            fail('Endpoint not found', 404);
        },
    };
}
