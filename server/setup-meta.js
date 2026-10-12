import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { metaConfig } from './meta-config.js';

try {
    if (existsSync('.env.meta')) throw new Error('.env.meta already exists. Keep the existing encryption key; edit configuration locally instead.');
    let input = '';
    for await (const chunk of process.stdin) { input += chunk; if (Buffer.byteLength(input) > 16384) throw new Error('Configuration input too large'); }
    const values = JSON.parse(input);
    const env = { META_APP_ID: values.appId, META_APP_SECRET: values.appSecret, META_GRAPH_VERSION: values.version, META_REDIRECT_URI: values.redirectUri, META_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('hex'), ...(values.loginConfigId ? { META_LOGIN_CONFIG_ID: values.loginConfigId } : {}) };
    if (Object.values(env).some(v => typeof v !== 'string' || /[\r\n"'\s#]/.test(v)) || !metaConfig(env).ready) throw new Error('Invalid Meta configuration. Check App ID, API version and callback URI.');
    writeFileSync('.env.meta', Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { flag: 'wx', mode: 0o600 });
    console.log('Meta configuration saved privately to .env.meta. Restart Socialchoice, then connect on Facebook. No connection has been verified yet.');
} catch {
    console.error('Meta setup failed. Check the input and whether .env.meta already exists. No secret values are displayed.');
    process.exitCode = 1;
}
