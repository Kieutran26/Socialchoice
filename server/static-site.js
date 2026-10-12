import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
export function serveSite(req, res, directory) {
    if (!['GET', 'HEAD'].includes(req.method)) return false;
    const root = resolve(directory);
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let path = resolve(root, `.${pathname}`);
    if (!path.startsWith(root + sep) && path !== root) return false;
    try { if (!statSync(path).isFile()) path = resolve(root, 'index.html'); }
    catch { if (extname(pathname)) return false; path = resolve(root, 'index.html'); }
    try {
        const content = readFileSync(path);
        res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' });
        res.end(req.method === 'HEAD' ? undefined : content);
        return true;
    } catch { return false; }
}
