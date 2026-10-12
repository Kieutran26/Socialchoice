import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { fail } from './validation.js';

export function hashPassword(password) {
    if (typeof password !== 'string' || password.length < 15 || password.length > 256) fail('Use a password between 15 and 256 characters');
    const salt = randomBytes(16).toString('hex');
    return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function createAdminAuth(passwordHash, secure = false) {
    if (passwordHash && !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(passwordHash)) throw new Error('Invalid admin password hash');
    const sessions = new Map();
    let failures = 0;
    let windowEnd = 0;
    const ttl = 8 * 60 * 60 * 1000;
    const cookie = (value, age) => `socialchoice_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`;
    const token = (req) => req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('socialchoice_session='))?.slice('socialchoice_session='.length);
    return {
        enabled: !!passwordHash,
        login(req, res, password) {
            if (!passwordHash) fail('Admin sign-in is not configured', 409);
            const now = Date.now();
            if (now >= windowEnd) { failures = 0; windowEnd = now + 15 * 60 * 1000; }
            if (failures >= 5) fail('Too many attempts. Try again in 15 minutes.', 429);
            if (typeof password !== 'string' || password.length > 256) fail('Incorrect password', 401);
            const [salt, expected] = passwordHash.split(':');
            if (!timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(expected, 'hex'))) {
                failures++; fail('Incorrect password', 401);
            }
            for (const [id, expiry] of sessions) if (expiry <= now) sessions.delete(id);
            if (sessions.size >= 100) sessions.delete(sessions.keys().next().value);
            sessions.delete(token(req));
            const id = randomBytes(32).toString('hex');
            sessions.set(id, now + ttl);
            res.setHeader('Set-Cookie', cookie(id, ttl / 1000));
        },
        require(req) {
            if (!passwordHash) return;
            const id = token(req);
            if (!id || !sessions.has(id) || sessions.get(id) <= Date.now()) {
                sessions.delete(id); fail('Sign in required', 401);
            }
        },
        logout(req, res) {
            sessions.delete(token(req));
            res.setHeader('Set-Cookie', cookie('', 0));
        },
    };
}
