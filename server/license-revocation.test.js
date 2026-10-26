import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import { createStore } from './store.js';
import { createCustomerDirectory } from './customer-directory.js';
import { createAdminWebLicenses } from './admin-web-licenses.js';
import { SqliteMap } from './sqlite-map.js';
import { issueWebLicense } from './web-license-issuer.js';
import { createLicenseAuthority, handleLicenseAuthority, LICENSE_AUTHORITY_PATH } from './license-authority.js';
import { licensedGraph } from './licensed-graph.js';
import { createTiktokTokens } from './tiktok-tokens.js';

test('revocation denies all sessions, activation and recovery, persists and preserves other accounts', async () => {
    const store = createStore(':memory:'), issuer = generateKeyPairSync('ed25519'), storageKey = randomBytes(32).toString('hex');
    const signed = email => issueWebLicense({ privateKey: issuer.privateKey, email, licensedTo: 'Fixture', edition: 'starter', purchaseConfirmed: true });
    const a = signed('a@example.com'), b = signed('b@example.com'), pending = signed('pending@example.com');
    const env = { SOCIALCHOICE_STORAGE_KEY: storageKey, SOCIALCHOICE_WEB_LICENSE_PUBLIC_KEY: a.publicKeyHex, SOCIALCHOICE_WEB_LICENSE_PRIVATE_KEY: Buffer.from(issuer.privateKey.export({ type: 'pkcs8', format: 'pem' })).toString('base64') };
    let directory = createCustomerDirectory(store, storageKey, a.publicKeyHex);
    env.CUSTOMER_DIRECTORY = { idFromName: name => name, get: () => ({ fetch: request => handleLicenseAuthority(request, env, directory) }) };
    const authority = createLicenseAuthority(env), password = 'fixture-password-very-long';
    const request = result => new Request('https://app.example/api/session', { headers: { cookie: result.cookie.split(';')[0] } });
    try {
        const first = directory.register({ email: 'a@example.com', password, license: a.token });
        const second = directory.login({ email: 'a@example.com', password });
        const other = directory.register({ email: 'b@example.com', password, license: b.token });
        const revoked = await authority('revoke', a.token);
        assert.equal((await authority('status', a.claims.license_id)).active, false);
        for (const session of [first, second]) assert.throws(() => directory.resolve(request(session)), { status: 401 });
        assert.throws(() => directory.login({ email: 'a@example.com', password }), { status: 403 });
        assert.throws(() => directory.recover({ email: 'a@example.com', password, recoveryCode: first.recoveryCode }), { status: 403 });
        assert.equal(directory.resolve(request(other)).email, 'b@example.com');
        assert.deepEqual(await authority('revoke', a.token), revoked);
        await authority('revoke', pending.token);
        assert.throws(() => directory.register({ email: 'pending@example.com', password, license: pending.token }), { status: 403 });
        directory = createCustomerDirectory(store, storageKey, a.publicKeyHex);
        assert.equal(directory.licenseStatus(a.claims.license_id).active, false);
        assert.equal(directory.resolve(request(other)).email, 'b@example.com');
        const forged = await handleLicenseAuthority(new Request('https://socialchoice.internal' + LICENSE_AUTHORITY_PATH, { method: 'POST', headers: { 'x-license-signature': '0'.repeat(64) }, body: JSON.stringify({ operation: 'revoke', input: b.token, until: Date.now() + 1000 }) }), env, directory);
        assert.equal(forged.status, 403); assert.equal(directory.licenseStatus(b.claims.license_id).active, true);
        const records = new SqliteMap(store, storageKey, 'issued-web-licenses');
        const admin = createAdminWebLicenses(store, records, env, authority);
        const issued = admin.issue({ requestId: randomUUID(), email: 'owner-issued@example.com', licensedTo: 'Fixture', edition: 'business', purchaseConfirmed: true });
        await assert.rejects(() => admin.revoke({ requestId: issued.request_id, confirmed: false }));
        const result = await admin.revoke({ requestId: issued.request_id, confirmed: true });
        assert.equal(result.status, 'revoked'); assert.deepEqual(await admin.revoke({ requestId: issued.request_id, confirmed: true }), result);
        assert.throws(() => admin.download(issued.request_id), { status: 403 });
        assert.equal((await admin.list()).items[0].status, 'revoked');
        const another = admin.issue({ requestId: randomUUID(), email: 'partial@example.com', licensedTo: 'Fixture', edition: 'starter', purchaseConfirmed: true });
        const write = records.set.bind(records); let failOnce = true;
        records.set = (...args) => { if (failOnce) { failOnce = false; throw new Error('local persistence failed'); } return write(...args); };
        await assert.rejects(() => admin.revoke({ requestId: another.request_id, confirmed: true }), /local persistence/);
        const central = await authority('status', another.license_id); assert.equal(central.active, false);
        const reconciled = await admin.revoke({ requestId: another.request_id, confirmed: true });
        assert.equal(reconciled.revoked_at, central.revoked_at); assert.equal(reconciled.status, 'revoked');
    } finally { store.close(); }
});

test('provider calls recheck revocation and fail closed when authority is unavailable', async () => {
    let active = true, calls = 0;
    const graph = licensedGraph({ publish: async () => { calls++; return 'sent'; } }, async () => { if (!active) throw new Error('revoked'); });
    assert.equal(await graph.publish(), 'sent'); active = false;
    await assert.rejects(() => graph.publish(), /revoked/); assert.equal(calls, 1);
    const offline = licensedGraph({ publish: async () => { calls++; } }, async () => { throw new Error('unavailable'); });
    await assert.rejects(() => offline.publish(), /unavailable/); assert.equal(calls, 1);
});

test('revocation or authority outage blocks rotating TikTok refresh without poisoning the stored credential', async () => {
    const store = createStore(':memory:');
    try {
        let active = true, refreshCalls = 0;
        const config = { ready: true, key: randomBytes(32).toString('hex') };
        const graph = licensedGraph({ refresh: async () => { refreshCalls++; throw new Error('should not send'); } }, async () => { if (!active) throw new Error('license unavailable or revoked'); });
        const tokens = createTiktokTokens(store, config, graph);
        const brand = store.write('Brand', { name: 'Fixture' });
        const scopes = ['user.info.basic', 'video.publish'];
        const account = store.verifiedAccount({ name: 'Fixture', username: 'fixture', platform: 'tiktok', account_type: 'profile', external_id: 'fixture-profile', brand_id: brand.id, credential_id: 'fixture-tiktok', connection_status: 'connected', scopes });
        const credential = { platform: 'tiktok', profileId: account.external_id, token: 'fixture', refreshToken: 'fixture-refresh', expiresAt: Date.now() + 1000, refreshExpiresAt: Date.now() + 3600000, scopes };
        tokens.vault.save(account.credential_id, credential);
        active = false;
        await assert.rejects(() => tokens.get(account), /license unavailable or revoked/);
        assert.equal(refreshCalls, 0); assert.deepEqual(tokens.peek(account), credential);
        await assert.rejects(() => tokens.get(account), /license unavailable or revoked/);
        assert.equal(refreshCalls, 0); assert.deepEqual(tokens.peek(account), credential);
    } finally { store.close(); }
});
