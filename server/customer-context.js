import { createHmac, timingSafeEqual } from 'node:crypto';
import { accountId, verifyWebLicense } from './web-license.js';
import { fail } from './validation.js';

export const CONTEXT_HEADER = 'x-socialchoice-workspace-context';
export function signCustomerContext(identity, key, bootstrap = false) {
    const payload = Buffer.from(JSON.stringify({ ...identity, bootstrap, until: Date.now() + 30000 })).toString('base64url');
    return payload + '.' + createHmac('sha256', Buffer.from(key, 'hex')).update('customer-context-v1\n' + payload).digest('hex');
}
export function readCustomerContext(value, key) {
    try {
        if (typeof value !== 'string' || value.length > 16000) throw new Error();
        const [payload, signature, extra] = value.split('.');
        const expected = createHmac('sha256', Buffer.from(key, 'hex')).update('customer-context-v1\n' + payload).digest('hex');
        if (extra || !/^[a-f0-9]{64}$/.test(signature || '') || !timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) throw new Error();
        const context = JSON.parse(Buffer.from(payload, 'base64url').toString());
        if (!accountId(context.id) || !/^[a-f0-9]{64}$/.test(context.session) || !Number.isSafeInteger(context.expires) || context.expires <= Date.now() || context.expires > Date.now() + 8 * 3600000 || !Number.isSafeInteger(context.until) || context.until <= Date.now() || context.until > Date.now() + 30000 || typeof context.bootstrap !== 'boolean') throw new Error();
        return context;
    } catch { fail('Sign in required', 401); }
}
export function createCustomerWorkspaceAuth(privateMap, env) {
    const sessions = privateMap('customer-sessions'), account = privateMap('customer-identity');
    function licensed(context) {
        const claims = verifyWebLicense(context.license, env.SOCIALCHOICE_WEB_LICENSE_PUBLIC_KEY);
        if (claims.email !== context.email) fail('A valid Socialchoice web license is required', 403);
        return claims;
    }
    function requireRequest(req) {
        const context = readCustomerContext(req.headers[CONTEXT_HEADER], env.SOCIALCHOICE_STORAGE_KEY);
        licensed(context);
        if (account.get('identity')?.id !== context.id || sessions.get(context.session) !== context.expires || context.expires <= Date.now()) fail('Sign in required', 401);
        return context;
    }
    return {
        enabled: true,
        accept(value) {
            const context = readCustomerContext(value, env.SOCIALCHOICE_STORAGE_KEY); licensed(context);
            const existing = account.get('identity');
            if (existing && existing.id !== context.id) fail('Workspace identity mismatch', 403);
            if (context.bootstrap) {
                for (const [key, expires] of sessions) if (expires <= Date.now()) sessions.delete(key);
                account.set('identity', { id: context.id, email: context.email, license: context.license }); sessions.set(context.session, context.expires);
            }
            if (sessions.get(context.session) !== context.expires) fail('Sign in required', 401);
            return context;
        },
        require: requireRequest,
        sessionKey: req => requireRequest(req).session,
        sessionActive: id => typeof id === 'string' && sessions.get(id) > Date.now(),
        identity(req) { const value = requireRequest(req), claims = licensed(value); return { id: value.id, full_name: claims.licensed_to, email: value.email, role: 'customer', mode: 'web-customer', license: { license_id: claims.license_id, edition: claims.edition, perpetual: true, multiple_devices: true } }; },
        logout(req) { sessions.delete(requireRequest(req).session); },
        licenseActive() { try { const value = account.get('identity'); return !!value && licensed(value).email === value.email; } catch { return false; } },
    };
}
