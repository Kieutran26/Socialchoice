import { createPrivateKey, createPublicKey, sign, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { initializeIssuer } from './license-issuer.mjs';
import { WEB_LICENSE_DOMAIN, validateWebClaims, accountEmail } from '../server/web-license.js';

export function issueWebLicense({ privateKey, email, licensedTo, edition, purchaseConfirmed }) {
    if (purchaseConfirmed !== true) throw new Error('Confirm the purchase before issuing a customer license');
    const key = typeof privateKey === 'string' ? createPrivateKey(privateKey) : privateKey;
    if (key?.asymmetricKeyType !== 'ed25519') throw new Error('An Ed25519 issuer key is required');
    const claims = validateWebClaims({ schema: 1, product: 'socialchoice-web', license_id: randomUUID(), licensed_to: licensedTo, email: accountEmail(email), edition, issued_at: new Date().toISOString() });
    const payload = Buffer.from(JSON.stringify(claims));
    return { token: `SCW1.${payload.toString('base64url')}.${sign(null, Buffer.concat([WEB_LICENSE_DOMAIN, payload]), key).toString('base64url')}`, claims, publicKeyHex: Buffer.from(createPublicKey(key).export({ format: 'jwk' }).x, 'base64url').toString('hex') };
}
function cli() {
    const [action, ...args] = process.argv.slice(2), flags = {};
    for (let i = 0; i < args.length; i++) {
        const name = args[i];
        if (!['--key', '--email', '--licensee', '--edition', '--out', '--confirm-purchase'].includes(name) || Object.hasOwn(flags, name)) throw new Error('Invalid or duplicate option');
        flags[name] = name === '--confirm-purchase' ? true : args[++i];
        if (!flags[name]) throw new Error('Missing option value');
    }
    if (!flags['--out']) throw new Error('Provide an exclusive --out path');
    if (action === 'init') {
        if (Object.keys(flags).length !== 1) throw new Error('init accepts only --out');
        initializeIssuer(flags['--out'], process.env.SOCIALCHOICE_ISSUER_PASSPHRASE); console.log('Encrypted issuer created outside source. Keep an independent private backup.'); return;
    }
    if (action !== 'issue' || !flags['--key']) throw new Error('Use init or issue with --key, --email, --licensee, --edition, --out and --confirm-purchase');
    const passphrase = process.env.SOCIALCHOICE_ISSUER_PASSPHRASE;
    if (!passphrase || passphrase.length < 16) throw new Error('Enter issuer passphrase privately through SOCIALCHOICE_ISSUER_PASSPHRASE');
    const privateKey = createPrivateKey({ key: readFileSync(flags['--key']), passphrase });
    const result = issueWebLicense({ privateKey, email: flags['--email'], licensedTo: flags['--licensee'], edition: flags['--edition'], purchaseConfirmed: flags['--confirm-purchase'] === true });
    writeFileSync(resolve(flags['--out']), result.token + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ licenseId: result.claims.license_id, edition: result.claims.edition, output: resolve(flags['--out']) }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) { try { cli(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
