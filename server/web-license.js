import { createPublicKey, verify } from 'node:crypto';
import { Buffer } from 'node:buffer';

export const WEB_LICENSE_DOMAIN = Buffer.from('Socialchoice web account license v1\0');
export const WEB_EDITIONS = ['starter', 'professional', 'business'];
export const accountEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value.toLowerCase() : null;
export const accountId = value => typeof value === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
export function webPublicKey(hex) {
    if (!/^[a-f0-9]{64}$/i.test(hex || '')) throw new Error('Configure the web license issuer public key');
    return createPublicKey({ format: 'jwk', key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(hex, 'hex').toString('base64url') } });
}
export function validateWebClaims(claims) {
    const fields = ['schema', 'product', 'license_id', 'licensed_to', 'email', 'edition', 'issued_at'];
    if (!claims || typeof claims !== 'object' || Array.isArray(claims) || Object.keys(claims).length !== fields.length || fields.some(key => !Object.hasOwn(claims, key)) || claims.schema !== 1 || claims.product !== 'socialchoice-web' || !accountId(claims.license_id) || !accountEmail(claims.email) || accountEmail(claims.email) !== claims.email || !WEB_EDITIONS.includes(claims.edition) || typeof claims.licensed_to !== 'string' || !claims.licensed_to.trim() || claims.licensed_to.length > 160 || /[\x00-\x1f\x7f]/.test(claims.licensed_to) || typeof claims.issued_at !== 'string' || !Number.isFinite(Date.parse(claims.issued_at)) || Date.parse(claims.issued_at) > Date.now() + 300000) throw new Error('Invalid web license');
    return claims;
}
export function verifyWebLicense(token, publicKeyHex) {
    try {
        if (typeof token !== 'string' || token.length > 8192) throw new Error();
        const parts = token.trim().split('.');
        if (parts.length !== 3 || parts[0] !== 'SCW1' || parts.slice(1).some(value => !/^[A-Za-z0-9_-]+$/.test(value))) throw new Error();
        const payload = Buffer.from(parts[1], 'base64url'), signature = Buffer.from(parts[2], 'base64url');
        if (payload.toString('base64url') !== parts[1] || signature.toString('base64url') !== parts[2] || signature.length !== 64 || !verify(null, Buffer.concat([WEB_LICENSE_DOMAIN, payload]), webPublicKey(publicKeyHex), signature)) throw new Error();
        return validateWebClaims(JSON.parse(payload.toString('utf8')));
    } catch { throw new Error('A valid Socialchoice web license is required'); }
}
