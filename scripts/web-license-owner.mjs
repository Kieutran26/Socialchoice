import { createPrivateKey } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { initializeIssuer } from './license-issuer.mjs';
import { issueWebLicense } from '../server/web-license-issuer.js';
export { issueWebLicense } from '../server/web-license-issuer.js';
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
