import { isAbsolute } from 'node:path';

export function runtimeConfig(env = process.env) {
    const host = env.SOCIALCHOICE_BIND_HOST || '127.0.0.1';
    const port = Number(env.PORT || env.SOCIALCHOICE_API_PORT || 3001);
    if (!['127.0.0.1', '0.0.0.0'].includes(host) || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid server bind configuration');
    if (host === '0.0.0.0' && (!env.SOCIALCHOICE_PUBLIC_ORIGIN || !env.SOCIALCHOICE_ADMIN_PASSWORD_HASH || !env.SOCIALCHOICE_DB_PATH || !isAbsolute(env.SOCIALCHOICE_DB_PATH))) throw new Error('Public listener requires HTTPS app origin, admin password hash and absolute persistent database path');
    return { host, port };
}
