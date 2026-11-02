import { createMetaVault } from './meta-vault.js';
import { fail } from './validation.js';

export function createXTokens(store, config, graph) {
    const vault = config.ready ? createMetaVault(store, config.key) : null;
    const active = new Map();

    function validate(account, value) {
        if (!config.ready || account.platform !== 'x' || account.connection_status !== 'connected' || value.platform !== 'x' || (account.external_id && value.profileId && value.profileId !== account.external_id)) {
            fail('Reconnect X and grant publishing permissions', 409);
        }
    }

    return {
        vault,
        peek(account) {
            const value = vault?.read(account.credential_id);
            validate(account, value || {});
            return value;
        },
        async get(account) {
            if (active.has(account.credential_id)) return active.get(account.credential_id);
            const value = this.peek(account);
            if (value && Number.isFinite(value.expiresAt) && value.expiresAt > Date.now() + 60000) {
                return value;
            }
            if (!value?.refreshToken) {
                if (value?.token) return value;
                fail('X authorization expired. Reconnect X.', 409);
            }
            const promise = (async () => {
                const next = await graph.refresh(value.refreshToken);
                const current = store.get('SocialAccount', account.id);
                if (current.credential_id !== account.credential_id || !store.readCredential(account.credential_id)) {
                    fail('X connection changed. Reconnect X.', 409);
                }
                const updated = {
                    ...next,
                    profileId: value.profileId || account.external_id,
                };
                validate(current, updated);
                vault.save(account.credential_id, updated);
                return updated;
            })();
            active.set(account.credential_id, promise);
            try { return await promise; } finally { active.delete(account.credential_id); }
        },
    };
}

