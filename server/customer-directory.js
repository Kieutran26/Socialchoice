import { randomBytes, randomUUID, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { hashPassword } from './admin-auth.js';
import { SqliteMap } from './sqlite-map.js';
import { accountEmail, verifyWebLicense } from './web-license.js';
import { fail } from './validation.js';

export const CUSTOMER_COOKIE = 'socialchoice_customer';
const ttl = 8 * 60 * 60 * 1000;
export const digest = value => createHash('sha256').update(value).digest('hex');
export function customerCookie(request) {
    const values = (request.headers.get('cookie') || '').split(';').map(value => value.trim()).filter(value => value.startsWith(CUSTOMER_COOKIE + '='));
    if (values.length > 1) fail('Sign in required', 401);
    return values[0]?.slice(CUSTOMER_COOKIE.length + 1);
}
export function createCustomerDirectory(store, storageKey, publicKey) {
    const map = name => new SqliteMap(store, storageKey, 'customer-' + name);
    const accounts = map('accounts'), licenses = map('licenses'), sessions = map('sessions'), throttle = map('throttle'), accountThrottle = map('account-throttle');
    const identity = (account, session, expires, bootstrap = false) => {
        let license; try { license = verifyWebLicense(account.license, publicKey); } catch { fail('A valid Socialchoice web license is required', 403); }
        if (license.email !== account.email || licenses.get(license.license_id) !== account.id) fail('A valid Socialchoice web license is required', 403);
        return { id: account.id, email: account.email, name: license.licensed_to, session, expires, license: account.license, needsBootstrap: bootstrap };
    };
    const validatePassword = password => { if (typeof password !== 'string' || password.length < 15 || password.length > 256) fail('Use a password between 15 and 256 characters'); };
    const clean = () => { for (const [key, value] of sessions) if (value.expires <= Date.now()) sessions.delete(key); for (const [key, value] of throttle) if (value.expires <= Date.now()) throttle.delete(key); };
    function limit(email, ip, action) {
        clean(); const key = digest(`${action}\n${ip}`), now = Date.now();
        const value = throttle.get(key) || { count: 0, expires: now + 15 * 60000 };
        if (value.count >= 5) fail('Too many attempts. Try again in 15 minutes.', 429);
        // Anonymous email strings cannot allocate counters. Capacity pressure evicts an IP counter, never globally blocks onboarding.
        if (throttle.size >= 10000 && !throttle.has(key)) throttle.delete(throttle.keys().next().value);
        throttle.set(key, { ...value, count: value.count + 1 });
        if (accounts.has(email)) {
            const accountKey = digest(`${action}\n${email}`), saved = accountThrottle.get(accountKey);
            const counter = saved && saved.expires > now ? saved : { count: 0, expires: now + 15 * 60000 };
            if (counter.count >= 5) fail('Too many attempts. Try again in 15 minutes.', 429);
            accountThrottle.set(accountKey, { ...counter, count: counter.count + 1 });
        }
    }
    function session(account) {
        clean(); if (sessions.size >= 10000) fail('Sign-in is temporarily unavailable', 503);
        const token = randomBytes(32).toString('hex'), key = digest(token), expires = Date.now() + ttl;
        sessions.set(key, { email: account.email, expires, ready: false });
        return { identity: identity(account, key, expires, true), cookie: `${CUSTOMER_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${ttl / 1000}` };
    }
    const equalDigest = (left, right) => typeof left === 'string' && typeof right === 'string' && /^[a-f0-9]{64}$/.test(left) && /^[a-f0-9]{64}$/.test(right) && timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
    return {
        resolve(request) {
            const token = customerCookie(request); if (token === undefined) return null;
            if (!/^[a-f0-9]{64}$/.test(token)) fail('Sign in required', 401);
            const key = digest(token), saved = sessions.get(key);
            if (!saved || saved.expires <= Date.now()) { sessions.delete(key); fail('Sign in required', 401); }
            const account = accounts.get(saved.email); if (!account) fail('Sign in required', 401);
            return identity(account, key, saved.expires, saved.ready !== true);
        },
        workspaceReady(identity) { const saved = sessions.get(identity.session); if (saved && saved.expires === identity.expires && saved.email === identity.email) sessions.set(identity.session, { ...saved, ready: true }); },
        register(input, ip = '') {
            const email = accountEmail(input?.email); if (!email) fail('Enter a valid email address');
            limit(email, ip, 'register'); validatePassword(input.password);
            let license; try { license = verifyWebLicense(input.license, publicKey); } catch { fail('A valid Socialchoice web license is required', 403); }
            if (license.email !== email) fail('This license belongs to a different email address', 403);
            const recoveryCode = randomBytes(32).toString('hex');
            const account = { id: randomUUID(), email, password: hashPassword(input.password), license: input.license.trim(), recovery: digest(recoveryCode) };
            return store.transaction(() => {
                if (accounts.has(email) || licenses.has(license.license_id)) fail('Account or license already activated. Sign in instead.', 409);
                accounts.set(email, account); licenses.set(license.license_id, account.id);
                return { ...session(account), recoveryCode };
            });
        },
        login(input, ip = '') {
            const email = accountEmail(input?.email) || ''; limit(email, ip, 'login');
            const account = accounts.get(email), hash = account?.password || '00'.repeat(16) + ':' + '00'.repeat(64);
            const [salt, expected] = hash.split(':');
            const password = typeof input?.password === 'string' && input.password.length <= 256 ? input.password : '';
            const match = timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(expected, 'hex'));
            if (!account || !match) fail('Incorrect email or password', 401);
            return session(account);
        },
        recover(input, ip = '') {
            const email = accountEmail(input?.email) || ''; limit(email, ip, 'recover'); validatePassword(input?.password);
            const account = accounts.get(email);
            if (!account || typeof input?.recoveryCode !== 'string' || input.recoveryCode.length !== 64 || !equalDigest(account.recovery, digest(input.recoveryCode))) fail('Invalid account recovery details', 401);
            const recoveryCode = randomBytes(32).toString('hex');
            return store.transaction(() => {
                identity(account, '', Date.now() + ttl);
                for (const [key, value] of sessions) if (value.email === email) sessions.delete(key);
                const next = { ...account, password: hashPassword(input.password), recovery: digest(recoveryCode) };
                accounts.set(email, next); return { ...session(next), recoveryCode };
            });
        },
        logout(identity) { sessions.delete(identity.session); return `${CUSTOMER_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`; },
    };
}
