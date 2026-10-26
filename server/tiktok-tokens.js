import { createMetaVault } from './meta-vault.js';
import { fail } from './validation.js';
import { LICENSE_CHECK_DENIED } from './licensed-graph.js';

// The refresh claim is encrypted and durable: a lost rotating response requires reconnect.
export function createTiktokTokens(store, config, graph) {
    const vault = config.ready ? createMetaVault(store, config.key) : null;
    const active = new Map();
    function validate(account, value) {
        if (!config.ready || account.platform !== 'tiktok' || account.connection_status !== 'connected' || value.platform !== 'tiktok' || value.profileId !== account.external_id || !['user.info.basic','video.publish'].every(s => value.scopes?.includes(s) && account.scopes?.includes(s)) || !Number.isFinite(value.expiresAt)) fail('Reconnect TikTok and grant publishing permissions', 409);
    }
    return {
        vault,
        peek(account) { const value = vault?.read(account.credential_id); validate(account, value || {}); if (value.refreshing || value.expiresAt <= Date.now() && value.refreshExpiresAt <= Date.now()) fail('TikTok authorization expired or refresh is unconfirmed. Reconnect TikTok.', 409); return value; },
        async get(account) {
            if (active.has(account.credential_id)) return active.get(account.credential_id);
            const value = this.peek(account); if (value.expiresAt > Date.now() + 60000) return value;
            if (!value.refreshToken || !Number.isFinite(value.refreshExpiresAt) || value.refreshExpiresAt <= Date.now()) fail('TikTok authorization expired. Reconnect TikTok.', 409);
            vault.save(account.credential_id, { ...value, refreshing: true });
            const promise = (async () => {
                let next;
                try { next = await graph.refresh(value.refreshToken); }
                catch (error) {
                    // An entitlement denial happens before any refresh request; it is not a lost rotating response.
                    if (error[LICENSE_CHECK_DENIED] && store.readCredential(account.credential_id)) {
                        const current = vault.read(account.credential_id);
                        if (current?.refreshing && current.refreshToken === value.refreshToken && current.token === value.token) vault.save(account.credential_id, value);
                    }
                    throw error;
                }
                const current = store.get('SocialAccount', account.id);
                if (current.credential_id !== account.credential_id || !store.readCredential(account.credential_id) || next.profileId !== account.external_id) fail('TikTok connection changed. Reconnect TikTok.', 409);
                validate(current, next); vault.save(account.credential_id, next); return next;
            })();
            active.set(account.credential_id, promise);
            try { return await promise; } finally { active.delete(account.credential_id); }
        },
    };
}
