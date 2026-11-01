import { randomUUID } from 'node:crypto';
import { createMetaVault } from './meta-vault.js';
import { createPostizClient } from './postiz-client.js';
import { fail } from './validation.js';

export function createPostizConnection(store, config, fetcher) {
    const client = createPostizClient(config, fetcher);
    const vault = config.ready ? createMetaVault(store, config.encryptionKey) : null;
    return {
        client,
        async execute(operation, _req, _res, args = []) {
            if (operation === 'status') return { ready: config.ready, platforms: ['facebook'] };
            if (!config.ready) fail('Postiz is not configured', 409);
            if (operation === 'channels') return { channels: await client.channels() };
            if (operation === 'import') {
                const [brandId, ids] = args;
                const brand = store.get('Brand', brandId);
                if (brand.is_demo || brand.status !== 'active') fail('Choose an active live brand', 409);
                if (!Array.isArray(ids) || !ids.length || ids.length > 30 || new Set(ids).size !== ids.length) fail('Choose up to 30 different Postiz channels');
                const channels = await client.channels();
                if (ids.some(id => !channels.some(row => row.id === id && !row.disabled))) fail('Choose connected channels returned by Postiz', 409);
                return store.transaction(() => {
                    for (const id of ids) {
                        const channel = channels.find(row => row.id === id);
                        const existing = store.all('SocialAccount').find(row => row.connection_provider === 'postiz' && row.external_id === id && row.brand_id === brandId && !row.is_demo);
                        const credentialId = randomUUID();
                        vault.save(credentialId, { backend: 'postiz', integrationId: id });
                        store.verifiedAccount({ name: channel.name, platform: 'facebook', account_type: 'page', external_id: id, brand_id: brandId, connection_provider: 'postiz', connection_status: 'connected', credential_id: credentialId, scopes: [], is_demo: false, last_synced_at: new Date().toISOString() }, existing?.id);
                        if (existing?.credential_id) vault.remove(existing.credential_id);
                    }
                    return { imported: ids.length };
                });
            }
            const account = store.get('SocialAccount', args[0]);
            if (account.is_demo || account.connection_provider !== 'postiz' || !account.credential_id) fail('Postiz connection required', 409);
            if (operation === 'disconnect') {
                store.transaction(() => { vault.remove(account.credential_id); store.verifiedAccount({ credential_id: null, connection_status: 'disconnected' }, account.id); });
                return { disconnected: true };
            }
            if (operation === 'check') {
                const channel = (await client.channels()).find(row => row.id === account.external_id && !row.disabled);
                if (store.get('SocialAccount', account.id).credential_id !== account.credential_id) fail('Connection changed. Check again.', 409);
                store.verifiedAccount({ connection_status: channel ? 'connected' : 'expired', ...(channel ? { name: channel.name } : {}), last_synced_at: new Date().toISOString() }, account.id);
                return { connected: !!channel };
            }
            fail('Endpoint not found', 404);
        },
    };
}
