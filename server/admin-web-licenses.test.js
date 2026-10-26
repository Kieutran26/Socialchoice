import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createPublicKey, randomUUID, randomBytes } from 'node:crypto';
import { createStore } from './store.js';
import { SqliteMap } from './sqlite-map.js';
import { createAdminWebLicenses } from './admin-web-licenses.js';
import { verifyWebLicense } from './web-license.js';
import { createCustomerDirectory } from './customer-directory.js';

const issuer = generateKeyPairSync('ed25519');
const env = { SOCIALCHOICE_WEB_LICENSE_PRIVATE_KEY: Buffer.from(issuer.privateKey.export({ format: 'pem', type: 'pkcs8' })).toString('base64'), SOCIALCHOICE_WEB_LICENSE_PUBLIC_KEY: Buffer.from(createPublicKey(issuer.privateKey).export({ format: 'jwk' }).x, 'base64url').toString('hex') };
test('web owner issuance persists exact retries and downloads without exposing signing material', async () => {
    const store = createStore(':memory:'), records = new SqliteMap(store, randomBytes(32).toString('hex'), 'issued-web-licenses');
    try {
        const service = createAdminWebLicenses(store, records, env);
        const input = { requestId: randomUUID(), email: 'Customer@Example.com', licensedTo: 'Khách thử', edition: 'professional', purchaseConfirmed: true };
        const first = service.issue(input);
        assert.equal(verifyWebLicense(first.token, env.SOCIALCHOICE_WEB_LICENSE_PUBLIC_KEY).email, 'customer@example.com');
        assert.deepEqual(service.issue(input), first); assert.equal(records.size, 1);
        assert.throws(() => service.issue({ ...input, requestId: randomUUID(), email: 'customer@example.com' }), { status: 409 });
        assert.deepEqual(service.download(input.requestId), first);
        assert.throws(() => service.issue({ ...input, edition: 'business' }), { status: 409 });
        assert.throws(() => service.issue({ ...input, requestId: randomUUID(), purchaseConfirmed: false }));
        assert.throws(() => service.issue({ ...input, requestId: randomUUID(), email: 'invalid' }));
        assert.throws(() => service.issue({ ...input, requestId: randomUUID(), edition: 'invalid' }));
        assert.equal(records.size, 1);
        const directory = createCustomerDirectory(store, randomBytes(32).toString('hex'), env.SOCIALCHOICE_WEB_LICENSE_PUBLIC_KEY);
        const restarted = createAdminWebLicenses(store, records, env, async (_, ids) => directory.licenseCustomers(ids));
        assert.deepEqual(restarted.download(input.requestId), first);
        assert.equal((await restarted.list()).items.length, 1);
        const publicList = JSON.stringify(await restarted.list());
        assert.doesNotMatch(publicList, /SCW1|PRIVATE KEY|privateKey|publicKeyHex/);
        assert.throws(() => restarted.download(randomUUID()), { status: 404 });
        for (const broken of [{}, { ...env, SOCIALCHOICE_WEB_LICENSE_PUBLIC_KEY: '0'.repeat(64) }, { ...env, SOCIALCHOICE_WEB_LICENSE_PRIVATE_KEY: 'invalid' }]) {
            const unavailable = createAdminWebLicenses(store, records, broken);
            assert.equal(unavailable.status().ready, false); assert.throws(() => unavailable.issue({ ...input, requestId: randomUUID() }), { status: 503 });
        }
    } finally { store.close(); }
});
