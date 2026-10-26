import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import { createStore } from './store.js';
import { SqliteMap } from './sqlite-map.js';
import { createCustomerDirectory } from './customer-directory.js';
import { createAdminWebLicenses } from './admin-web-licenses.js';
import { createLicenseAuthority, handleLicenseAuthority } from './license-authority.js';
import { issueWebLicense } from './web-license-issuer.js';

test('owner tracking records successful sign-ins, preserves legacy unknown dates and exposes no credentials', async () => {
    const store = createStore(':memory:'), issuer = generateKeyPairSync('ed25519'), storageKey = randomBytes(32).toString('hex');
    const signed = issueWebLicense({ privateKey: issuer.privateKey, email: 'customer@example.com', licensedTo: 'Fixture', edition: 'starter', purchaseConfirmed: true });
    const env = { SOCIALCHOICE_STORAGE_KEY: storageKey, SOCIALCHOICE_WEB_LICENSE_PUBLIC_KEY: signed.publicKeyHex, SOCIALCHOICE_WEB_LICENSE_PRIVATE_KEY: Buffer.from(issuer.privateKey.export({ type: 'pkcs8', format: 'pem' })).toString('base64') };
    let directory = createCustomerDirectory(store, storageKey, signed.publicKeyHex);
    env.CUSTOMER_DIRECTORY = { idFromName: name => name, get: () => ({ fetch: request => handleLicenseAuthority(request, env, directory) }) };
    const authority = createLicenseAuthority(env), records = new SqliteMap(store, storageKey, 'issued-web-licenses');
    const admin = createAdminWebLicenses(store, records, env, authority), password = 'long-fixture-password-2026';
    const row = async () => (await admin.list()).items[0];
    try {
        const issued = admin.issue({ requestId: randomUUID(), email: signed.claims.email, licensedTo: 'Fixture', edition: 'starter', purchaseConfirmed: true });
        assert.equal((await row()).activated, false); assert.equal((await row()).last_login_at, null);
        const registered = directory.register({ email: issued.email, password, license: issued.token });
        const initial = await row(); assert.equal(initial.activated, true); assert.ok(initial.activated_at); assert.ok(initial.last_login_at);
        const accounts = new SqliteMap(store, storageKey, 'customer-accounts');
        const account = accounts.get(issued.email);
        accounts.set(issued.email, { ...account, activated_at: undefined, last_login_at: '2020-01-01T00:00:00.000Z' });
        assert.throws(() => directory.login({ email: issued.email, password: 'incorrect' }), { status: 401 });
        assert.equal((await row()).last_login_at, '2020-01-01T00:00:00.000Z');
        directory.login({ email: issued.email, password });
        const legacy = await row(); assert.equal(legacy.activated, true); assert.equal(legacy.activated_at, null); assert.ok(legacy.last_login_at > '2020');
        directory = createCustomerDirectory(store, storageKey, signed.publicKeyHex); assert.deepEqual(await row(), legacy);
        const beforeRecovery = accounts.get(issued.email); accounts.set(issued.email, { ...beforeRecovery, last_login_at: '2020-01-01T00:00:00.000Z' });
        directory.recover({ email: issued.email, password, recoveryCode: registered.recoveryCode });
        assert.ok((await row()).last_login_at > '2020');
        await admin.revoke({ requestId: issued.request_id, confirmed: true });
        const revoked = await row(); assert.equal(revoked.status, 'revoked'); assert.equal(revoked.activated, true);
        assert.throws(() => directory.login({ email: issued.email, password }), { status: 403 });
        assert.equal((await row()).last_login_at, revoked.last_login_at);
        assert.doesNotMatch(JSON.stringify(await admin.list()), /SCW1|password|recovery|session|PRIVATE KEY/);
        assert.equal((await authority('customers', [randomUUID()])).items[0].activated, false);
        await assert.rejects(() => authority('customers', ['invalid']), { status: 503 });
        assert.throws(() => directory.licenseCustomers(Array(101).fill(issued.license_id)));
        await assert.rejects(() => createAdminWebLicenses(store, records, env).list(), { status: 503 });
        await assert.rejects(() => createAdminWebLicenses(store, records, env, async () => ({ items: [] })).list(), { status: 503 });
    } finally { store.close(); }
});
