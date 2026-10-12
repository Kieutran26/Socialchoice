import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { fail } from './validation.js';

export function createMetaVault(store, keyHex) {
    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== 32) throw new Error('Meta encryption key must contain 32 bytes');
    return {
        save(id, value) {
            const iv = randomBytes(12);
            const cipher = createCipheriv('aes-256-gcm', key, iv);
            cipher.setAAD(Buffer.from(id));
            const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
            store.saveCredential(id, JSON.stringify({ iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') }));
        },
        read(id) {
            try {
                const stored = store.readCredential(id);
                if (!stored) fail('Facebook credential unavailable. Reconnect Facebook.', 409);
                const { iv, tag, data } = JSON.parse(stored);
                const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
                cipher.setAAD(Buffer.from(id)); cipher.setAuthTag(Buffer.from(tag, 'base64'));
                return JSON.parse(Buffer.concat([cipher.update(Buffer.from(data, 'base64')), cipher.final()]).toString());
            } catch { fail('Facebook credential unavailable. Reconnect Facebook.', 409); }
        },
        remove: id => store.deleteCredential(id),
    };
}
