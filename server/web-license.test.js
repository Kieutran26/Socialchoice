import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { issueWebLicense } from '../scripts/web-license-owner.mjs';
import { verifyWebLicense } from './web-license.js';
import { createCustomerDirectory } from './customer-directory.js';
import { createStore } from './store.js';

const key = generateKeyPairSync('ed25519');
const issue = email => issueWebLicense({ privateKey: key.privateKey, email, licensedTo: 'Test owner', edition: 'professional', purchaseConfirmed: true });
const password = 'fixture-password-very-long';
const req = cookie => new Request('https://app.example/api/session', { headers: cookie ? { cookie: cookie.split(';')[0] } : {} });

test('web licenses require a valid issuer, exact web product and confirmed purchase', () => {
    const value = issue('owner@example.com');
    assert.equal(verifyWebLicense(value.token, value.publicKeyHex).email, 'owner@example.com');
    assert.throws(() => issueWebLicense({ privateKey: key.privateKey, email: 'owner@example.com', licensedTo: 'Owner', edition: 'starter' }));
    assert.throws(() => issueWebLicense({ privateKey: key.privateKey, email: 'invalid', licensedTo: 'Owner', edition: 'starter', purchaseConfirmed: true }));
    const other = issueWebLicense({ privateKey: generateKeyPairSync('ed25519').privateKey, email: 'owner@example.com', licensedTo: 'Other', edition: 'business', purchaseConfirmed: true });
    for (const token of [value.token + 'x', value.token.replace('SCW1', 'SC2'), other.token, value.token.replace('SCW1.', 'SCW1.=')]) assert.throws(() => verifyWebLicense(token, value.publicKeyHex));
});

test('one license activates one account, supports independent devices and recovery revokes all old sessions', () => {
    const store = createStore(':memory:'), firstLicense = issue('first@example.com'), secondLicense = issue('second@example.com');
    const directory = createCustomerDirectory(store, randomBytes(32).toString('hex'), firstLicense.publicKeyHex);
    try {
        assert.throws(() => directory.register({ email: 'wrong@example.com', password, license: firstLicense.token }), /different email/);
        const first = directory.register({ email: 'first@example.com', password, license: firstLicense.token });
        const second = directory.register({ email: 'second@example.com', password, license: secondLicense.token });
        assert.notEqual(first.identity.id, second.identity.id);
        assert.equal(directory.resolve(req(first.cookie)).id, first.identity.id);
        const otherDevice = directory.login({ email: 'first@example.com', password });
        assert.equal(directory.resolve(req(otherDevice.cookie)).id, first.identity.id);
        directory.logout(otherDevice.identity);
        assert.throws(() => directory.resolve(req(otherDevice.cookie)), /Sign in required/);
        assert.equal(directory.resolve(req(first.cookie)).id, first.identity.id);
        assert.throws(() => directory.register({ email: 'first@example.com', password, license: firstLicense.token }), /already activated/);
        assert.throws(() => directory.recover({ email: 'first@example.com', password, recoveryCode: '0'.repeat(64) }), /Invalid account recovery/);
        const recovered = directory.recover({ email: 'first@example.com', password: password + '-new', recoveryCode: first.recoveryCode });
        assert.throws(() => directory.resolve(req(first.cookie)), /Sign in required/);
        assert.equal(directory.resolve(req(recovered.cookie)).id, first.identity.id);
        assert.notEqual(recovered.recoveryCode, first.recoveryCode);
        assert.equal(directory.resolve(req(second.cookie)).id, second.identity.id);
        assert.throws(() => directory.login({ email: 'first@example.com', password }), /Incorrect email/);
        assert.throws(() => directory.recover({ email: 'first@example.com', password, recoveryCode: first.recoveryCode }), /Invalid account recovery/);
    } finally { store.close(); }
});

test('unconfigured or forged customer licensing never enables an account', () => {
    const store = createStore(':memory:');
    try {
        const value = issue('owner@example.com'), directory = createCustomerDirectory(store, randomBytes(32).toString('hex'), undefined);
        assert.throws(() => directory.register({ email: 'owner@example.com', password, license: value.token }), /valid Socialchoice web license/);
        assert.equal(directory.resolve(req()), null);
    } finally { store.close(); }
});

test('changing anonymous email cannot bypass the IP attempt limit or block another IP', () => {
    const store = createStore(':memory:'), value = issue('legitimate@example.com');
    try {
        const directory = createCustomerDirectory(store, randomBytes(32).toString('hex'), value.publicKeyHex);
        for (let i = 0; i < 5; i++) assert.throws(() => directory.login({ email: `unknown${i}@example.com`, password }, '192.0.2.1'), { status: 401 });
        assert.throws(() => directory.login({ email: 'another@example.com', password }, '192.0.2.1'), { status: 429 });
        const customer = directory.register({ email: 'legitimate@example.com', password, license: value.token }, '192.0.2.2');
        assert.equal(directory.resolve(req(customer.cookie)).email, 'legitimate@example.com');
    } finally { store.close(); }
});
