import { createPrivateKey, createPublicKey, createHash } from 'node:crypto';
import { issueWebLicense } from './web-license-issuer.js';
import { accountId, accountEmail } from './web-license.js';
import { fail } from './validation.js';

export function createAdminWebLicenses(store, records, env, authority) {
    let key;
    try {
        const encoded = env.SOCIALCHOICE_WEB_LICENSE_PRIVATE_KEY;
        if (typeof encoded !== 'string' || encoded.length > 10000) throw new Error();
        const candidate = createPrivateKey(Buffer.from(encoded, 'base64').toString('utf8'));
        if (candidate.asymmetricKeyType !== 'ed25519') throw new Error();
        const publicHex = Buffer.from(createPublicKey(candidate).export({ format: 'jwk' }).x, 'base64url').toString('hex');
        if (publicHex !== env.SOCIALCHOICE_WEB_LICENSE_PUBLIC_KEY) throw new Error();
        key = candidate;
    } catch { /* A missing or mismatched issuer cannot grant licenses. */ }
    const metadata = item => ({ request_id: item.request_id, ...item.claims, status: item.revoked_at ? 'revoked' : 'active', revoked_at: item.revoked_at || null });
    return {
        status: () => ({ ready: !!key }),
        async list() {
            const items = [...records].map(([, item]) => metadata(item)).sort((a, b) => b.issued_at.localeCompare(a.issued_at)).slice(0, 100);
            if (!items.length) return { items };
            if (!authority) fail('Customer account information unavailable', 503);
            const customers = await authority('customers', items.map(item => item.license_id));
            if (!Array.isArray(customers?.items) || customers.items.length !== items.length) fail('Customer account information unavailable', 503);
            const byId = new Map(customers.items.map(item => [item.license_id, item]));
            return { items: items.map(item => {
                const customer = byId.get(item.license_id);
                if (!customer || typeof customer.activated !== 'boolean') fail('Customer account information unavailable', 503);
                return { ...item, activated: customer.activated, activated_at: customer.activated_at, last_login_at: customer.last_login_at };
            }) };
        },
        download(id) {
            if (!accountId(id)) fail('Valid license request required');
            const item = records.get(id); if (!item) fail('License not found', 404);
            if (item.revoked_at) fail('This license has been revoked. Contact the site owner.', 403);
            return { ...metadata(item), token: item.token };
        },
        async revoke(input) {
            if (!input || Object.keys(input).length !== 2 || !accountId(input.requestId) || input.confirmed !== true) fail('Confirm the license revocation');
            const item = records.get(input.requestId); if (!item) fail('License not found', 404);
            if (item.revoked_at) return metadata(item);
            if (!authority) fail('License verification unavailable', 503);
            // Commit central denial first. If local persistence fails, repeating this request reconciles history safely.
            const revoked = await authority('revoke', item.token);
            const next = { ...item, revoked_at: revoked.revoked_at };
            records.set(input.requestId, next);
            return metadata(next);
        },
        issue(input) {
            if (!key) fail('Web license signing is not configured', 503);
            const fields = ['requestId', 'email', 'licensedTo', 'edition', 'purchaseConfirmed'];
            if (!input || typeof input !== 'object' || Object.keys(input).length !== fields.length || fields.some(name => !Object.hasOwn(input, name))) fail('Invalid license details');
            if (!accountId(input.requestId)) fail('Valid license request required');
            if (input.purchaseConfirmed !== true) fail('Confirm the purchase before issuing a customer license');
            const details = { email: accountEmail(input.email), licensedTo: typeof input.licensedTo === 'string' ? input.licensedTo.trim() : input.licensedTo, edition: input.edition, purchaseConfirmed: true };
            const digest = createHash('sha256').update(JSON.stringify(details)).digest('hex');
            return store.transaction(() => {
                const saved = records.get(input.requestId);
                if (saved) { if (saved.revoked_at) fail('This license has been revoked. Contact the site owner.', 403); if (saved.digest !== digest) fail('License request already used with different details', 409); return { ...metadata(saved), token: saved.token }; }
                if ([...records].some(([, item]) => item.claims.email === details.email)) fail('A web license was already issued for this email. Download the existing file.', 409);
                let result; try { result = issueWebLicense({ privateKey: key, ...details }); } catch { fail('Enter a valid customer email, name and edition'); }
                const item = { request_id: input.requestId, claims: result.claims, token: result.token, digest };
                records.set(input.requestId, item);
                return { ...metadata(item), token: item.token };
            });
        },
    };
}
