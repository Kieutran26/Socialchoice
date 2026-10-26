import { createHmac, timingSafeEqual } from 'node:crypto';
import { fail } from './validation.js';

export const LICENSE_AUTHORITY_PATH = '/internal/license-authority';
const signature = (body, key) => createHmac('sha256', Buffer.from(key, 'hex')).update('socialchoice-license-authority-v1\n' + body).digest('hex');
export function createLicenseAuthority(env) {
    return async (operation, input) => {
        if (!env.CUSTOMER_DIRECTORY) fail('License verification unavailable', 503);
        const body = JSON.stringify({ operation, input, until: Date.now() + 30000 });
        const directory = env.CUSTOMER_DIRECTORY.get(env.CUSTOMER_DIRECTORY.idFromName('customer-directory-v1'));
        const response = await directory.fetch(new Request('https://socialchoice.internal' + LICENSE_AUTHORITY_PATH, { method: 'POST', headers: { 'content-type': 'application/json', 'x-license-signature': signature(body, env.SOCIALCHOICE_STORAGE_KEY) }, body }));
        const result = await response.json();
        if (!response.ok || operation === 'status' && typeof result.active !== 'boolean') fail('License verification unavailable', 503);
        return result;
    };
}
export async function handleLicenseAuthority(request, env, directory) {
    try {
        if (request.method !== 'POST') fail('License authority denied', 403);
        const body = await request.text(); if (Buffer.byteLength(body) > 12000) fail('License authority denied', 403);
        const supplied = request.headers.get('x-license-signature') || '', expected = signature(body, env.SOCIALCHOICE_STORAGE_KEY);
        if (!/^[a-f0-9]{64}$/.test(supplied) || !timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(expected, 'hex'))) fail('License authority denied', 403);
        const value = JSON.parse(body);
        // Permit a small difference between actor I/O clocks without extending the signed expiry.
        const now = Date.now();
        if (!Number.isSafeInteger(value.until) || value.until <= now || value.until > now + 30000 + 5000) fail('License authority denied', 403);
        if (value.operation === 'status') return Response.json(directory.licenseStatus(value.input), { headers: { 'Cache-Control': 'no-store' } });
        if (value.operation === 'customers') return Response.json(directory.licenseCustomers(value.input), { headers: { 'Cache-Control': 'no-store' } });
        if (value.operation === 'revoke') return Response.json(directory.revokeLicense(value.input), { headers: { 'Cache-Control': 'no-store' } });
        fail('License authority denied', 403);
    } catch (error) { return Response.json({ message: error.status ? error.message : 'License verification unavailable' }, { status: error.status || 503, headers: { 'Cache-Control': 'no-store' } }); }
}
