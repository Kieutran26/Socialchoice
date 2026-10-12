import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

// Send private values directly to Wrangler; never render them in output or CLI arguments.
try {
    const admin = parseEnv(readFileSync('.env.admin', 'utf8')).SOCIALCHOICE_ADMIN_PASSWORD_HASH;
    if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(admin || '')) throw new Error('Run setup:admin locally first');
    const path = '.env.cloudflare';
    if (!existsSync(path)) writeFileSync(path, `SOCIALCHOICE_STORAGE_KEY=${randomBytes(32).toString('hex')}\n`, { flag: 'wx', mode: 0o600 });
    const key = parseEnv(readFileSync(path, 'utf8')).SOCIALCHOICE_STORAGE_KEY;
    if (!/^[a-f0-9]{64}$/.test(key || '')) throw new Error('Invalid private storage key; preserve its original backup');
    const secrets = { SOCIALCHOICE_ADMIN_PASSWORD_HASH: admin, SOCIALCHOICE_STORAGE_KEY: key };
    if (existsSync('.env.meta')) {
        const meta = parseEnv(readFileSync('.env.meta', 'utf8'));
        const cloud = JSON.parse(readFileSync('wrangler.jsonc', 'utf8')).vars;
        if (meta.META_APP_ID !== cloud.META_APP_ID) throw new Error('Local Meta app does not match the cloud app; no secrets uploaded');
        // The cloud manifest owns the public callback; the local callback may remain loopback.
        for (const name of ['META_APP_SECRET', 'META_TOKEN_ENCRYPTION_KEY', 'META_GRAPH_VERSION', 'META_LOGIN_CONFIG_ID']) if (meta[name]) secrets[name] = meta[name];
    }
    const result = spawnSync(process.execPath, [resolve('node_modules/wrangler/bin/wrangler.js'), 'secret', 'bulk'], {
        input: JSON.stringify(secrets), encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'],
        env: { ...process.env, XDG_CONFIG_HOME: resolve('.wrangler/config'), WRANGLER_SEND_METRICS: 'false' },
    });
    if (result.error || result.status !== 0) throw new Error('Private Cloudflare setup did not complete; retain the local key and retry after authorized login');
    console.log('Private Cloudflare configuration saved. Preserve .env.cloudflare securely.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
