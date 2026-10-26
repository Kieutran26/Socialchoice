import { createPrivateKey, createPublicKey, sign, randomUUID } from 'node:crypto';
import { WEB_LICENSE_DOMAIN, validateWebClaims, accountEmail } from './web-license.js';

export function issueWebLicense({ privateKey, email, licensedTo, edition, purchaseConfirmed }) {
    if (purchaseConfirmed !== true) throw new Error('Confirm the purchase before issuing a customer license');
    const key = typeof privateKey === 'string' ? createPrivateKey(privateKey) : privateKey;
    if (key?.asymmetricKeyType !== 'ed25519') throw new Error('An Ed25519 issuer key is required');
    const claims = validateWebClaims({ schema: 1, product: 'socialchoice-web', license_id: randomUUID(), licensed_to: licensedTo, email: accountEmail(email), edition, issued_at: new Date().toISOString() });
    const payload = Buffer.from(JSON.stringify(claims));
    return { token: `SCW1.${payload.toString('base64url')}.${sign(null, Buffer.concat([WEB_LICENSE_DOMAIN, payload]), key).toString('base64url')}`, claims, publicKeyHex: Buffer.from(createPublicKey(key).export({ format: 'jwk' }).x, 'base64url').toString('hex') };
}
