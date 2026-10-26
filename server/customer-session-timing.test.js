import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { signCustomerContext, readCustomerContext } from './customer-context.js';
import { createLicenseAuthority, handleLicenseAuthority } from './license-authority.js';

test('signed customer context tolerates a slightly older receiver clock without extending expiry', t => {
    const issued = Date.now(), key = randomBytes(32).toString('hex');
    const identity = { id: randomUUID(), session: 'a'.repeat(64), expires: issued + 8 * 3600000 };
    t.mock.method(Date, 'now', () => issued);
    const signed = signCustomerContext(identity, key);
    for (const behind of [1, 1000, 5000]) {
        Date.now.mock.mockImplementation(() => issued - behind);
        assert.equal(readCustomerContext(signed, key).id, identity.id);
    }
    Date.now.mock.mockImplementation(() => issued - 5001);
    assert.throws(() => readCustomerContext(signed, key), { status: 401 });
    Date.now.mock.mockImplementation(() => issued + 30000);
    assert.throws(() => readCustomerContext(signed, key), { status: 401 });
    Date.now.mock.mockImplementation(() => issued);
    const expired = signCustomerContext({ ...identity, expires: issued - 1 }, key);
    assert.throws(() => readCustomerContext(expired, key), { status: 401 });
    assert.throws(() => readCustomerContext(signed + 'x', key), { status: 401 });
});

test('license authority accepts clock differences but still rejects expired and forged messages', async t => {
    const issued = Date.now(); let behind = 1;
    t.mock.method(Date, 'now', () => issued);
    const env = { SOCIALCHOICE_STORAGE_KEY: randomBytes(32).toString('hex') };
    const directory = { licenseStatus: () => ({ active: true }) };
    env.CUSTOMER_DIRECTORY = { idFromName: name => name, get: () => ({ fetch: async request => {
        Date.now.mock.mockImplementation(() => issued - behind);
        return handleLicenseAuthority(request, env, directory);
    } }) };
    const authority = createLicenseAuthority(env);
    for (behind of [1, 1000, 5000]) {
        Date.now.mock.mockImplementation(() => issued);
        assert.equal((await authority('status', randomUUID())).active, true);
    }
    for (behind of [5001, -30001]) {
        Date.now.mock.mockImplementation(() => issued);
        await assert.rejects(() => authority('status', randomUUID()), { status: 503 });
    }
    Date.now.mock.mockImplementation(() => issued);
    const forged = await handleLicenseAuthority(new Request('https://socialchoice.internal/internal/license-authority', {
        method: 'POST', headers: { 'x-license-signature': '0'.repeat(64) },
        body: JSON.stringify({ operation: 'status', input: randomUUID(), until: issued + 30000 }),
    }), env, directory);
    assert.equal(forged.status, 403);
});
