import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function configureProxy(config, origin) {
    const url = new URL(origin);
    if (url.origin !== origin || url.protocol !== 'https:' || url.username || url.password || ['socialchoice.vercel.app', 'localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Use the exact HTTPS origin of the deployed backend');
    return { ...config, rewrites: [{ source: '/api/:path*', destination: `${origin}/api/:path*` }, ...(config.rewrites || []).filter(rule => rule.source !== '/api/:path*')], headers: [{ source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }, { key: 'x-vercel-enable-rewrite-caching', value: '0' }] }, ...(config.headers || []).filter(rule => rule.source !== '/api/:path*')] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    if (!process.argv[2]) throw new Error('Provide the verified backend HTTPS origin');
    const previous = readFileSync('vercel.json', 'utf8');
    const configured = configureProxy(JSON.parse(previous), process.argv[2]);
    writeFileSync('vercel.json.before-api-proxy', previous, { flag: 'wx' });
    writeFileSync('vercel.json', JSON.stringify(configured, null, 2) + '\n');
    console.log('Vercel API proxy configured locally. Deploy only after backend health is verified. Original configuration saved for rollback.');
}
