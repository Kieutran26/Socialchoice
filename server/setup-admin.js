import { writeFileSync, existsSync } from 'node:fs';
import { hashPassword } from './admin-auth.js';

// The password arrives through redirected stdin; it never appears in command arguments.
let password = '';
for await (const chunk of process.stdin) {
    password += chunk;
    if (Buffer.byteLength(password) > 4096) throw new Error('Password input too large');
}
const destination = '.env.admin';
if (existsSync(destination)) throw new Error('.env.admin already exists. Move it to a protected backup before replacing it.');
const hash = hashPassword(password.replace(/\r?\n$/, ''));
writeFileSync(destination, `SOCIALCHOICE_ADMIN_PASSWORD_HASH=${hash}\n`, { mode: 0o600, flag: 'wx' });
console.log('Admin password hash saved to .env.admin. Keep this file private.');
