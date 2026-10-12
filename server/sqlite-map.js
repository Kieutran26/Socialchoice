import { createHash } from 'node:crypto';
import { createMetaVault } from './meta-vault.js';

// Encrypted private transient state survives actor eviction without exposing session/OAuth tokens.
export class SqliteMap {
    constructor(store, key, namespace) {
        this.store = store; this.vault = createMetaVault(store, key); this.prefix = `state:${namespace}:`;
    }
    id(key) { return this.prefix + createHash('sha256').update(String(key)).digest('hex'); }
    get(key) {
        const id = this.id(key);
        return this.store.readCredential(id) ? this.vault.read(id).value : undefined;
    }
    has(key) { return !!this.store.readCredential(this.id(key)); }
    set(key, value) { this.vault.save(this.id(key), { key, value }); return this; }
    delete(key) { this.vault.remove(this.id(key)); }
    *entries() {
        for (const id of this.store.credentialIds(this.prefix)) {
            const { key, value } = this.vault.read(id);
            yield [key, value];
        }
    }
    *keys() { for (const [key] of this.entries()) yield key; }
    get size() { return this.store.credentialIds(this.prefix).length; }
    [Symbol.iterator]() { return this.entries(); }
}
