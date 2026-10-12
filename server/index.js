import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createStore } from './store.js';
import { fail } from './validation.js';
import { savePostPlan } from './post-plans.js';
import { createAdminAuth } from './admin-auth.js';
import { serveSite } from './static-site.js';

export function createApi({ dbPath = resolve(process.env.SOCIALCHOICE_DB_PATH || 'data/socialchoice.sqlite'), frontendPort = Number(process.env.SOCIALCHOICE_FRONTEND_PORT || 5173), passwordHash = process.env.SOCIALCHOICE_ADMIN_PASSWORD_HASH, publicOrigin = process.env.SOCIALCHOICE_PUBLIC_ORIGIN, siteDirectory = process.env.SOCIALCHOICE_SERVE_DIST === 'true' ? 'dist' : null } = {}) {
    if (publicOrigin && (new URL(publicOrigin).origin !== publicOrigin || !publicOrigin.startsWith('https://') || !passwordHash)) throw new Error('Public mode requires an HTTPS origin and admin password hash');
    const auth = createAdminAuth(passwordHash, !!publicOrigin);
    const store = createStore(dbPath);
    const server = createServer(async (req, res) => {
        const send = (status, value) => {
            res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
            res.end(JSON.stringify(value));
        };
        try {
            // Loopback-only API, no public authentication bypass. Reject cross-site/DNS rebinding requests.
            const host = req.headers.host?.split(':')[0];
            if (!['127.0.0.1', 'localhost'].includes(host) && req.headers.host !== (publicOrigin && new URL(publicOrigin).host)) fail('Local host required', 403);
            const origins = publicOrigin ? [publicOrigin] : [`http://127.0.0.1:${frontendPort}`, `http://localhost:${frontendPort}`, `http://127.0.0.1:${req.socket.localPort}`, `http://localhost:${req.socket.localPort}`];
            if (req.headers.origin && !origins.includes(req.headers.origin)) fail('Origin not allowed', 403);
            if (req.headers['sec-fetch-site'] === 'cross-site') fail('Cross-site request denied', 403);
            if (!req.url.startsWith('/api/')) {
                if (siteDirectory && serveSite(req, res, siteDirectory)) return;
                fail('Endpoint not found', 404);
            }
            if (req.url === '/api/health' && req.method === 'GET') return send(200, { backend: 'sqlite', mode: auth.enabled ? 'admin-session' : 'local-only', meta: 'configuration_required', publishing: 'not_implemented' });
            if (req.headers['x-socialchoice-client'] !== 'local-ui') fail('Application request header required', 403);
            if (req.url === '/api/auth/login' && req.method === 'POST') {
                if (!req.headers['content-type']?.startsWith('application/json')) fail('JSON required', 415);
                let body = '';
                for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 4096) fail('Request too large', 413); }
                let input;
                try { input = JSON.parse(body); } catch { fail('Invalid JSON'); }
                auth.login(req, res, input?.args?.[0]);
                return send(200, { ok: true });
            }
            auth.require(req);
            if (req.url === '/api/auth/logout' && req.method === 'POST') { auth.logout(req, res); return send(200, { ok: true }); }
            if (req.url === '/api/session' && req.method === 'GET') return send(200, { id: 'local-owner', full_name: 'Workspace owner', role: 'admin', mode: auth.enabled ? 'admin-session' : 'local-only' });
            if (req.url === '/api/publishing/check' && req.method === 'POST') return send(200, { picked: 0, processed: 0, published: 0, blocked: 0, failed: 0, deferred: 0, postsUpdated: 0, unavailable: true, message: 'Publishing and automatic delivery are not implemented in Phase A.' });
            const match = req.url?.match(/^\/api\/entities\/([A-Za-z]+)\/([A-Za-z]+)$/);
            const savingPost = req.url === '/api/posts/save';
            if ((!match && !savingPost) || req.method !== 'POST') fail('Endpoint not found', 404);
            if (!req.headers['content-type']?.startsWith('application/json')) fail('JSON required', 415);
            let body = '';
            for await (const chunk of req) {
                body += chunk;
                if (Buffer.byteLength(body) > 1024 * 1024) fail('Request too large', 413);
            }
            let input;
            try { input = JSON.parse(body); } catch { fail('Invalid JSON'); }
            if (!Array.isArray(input.args)) fail('Arguments array required');
            if (savingPost) return send(200, savePostPlan(store, input.args[0]));
            send(200, store.execute(match[1], match[2], input.args));
        } catch (error) {
            send(error.status || 500, { message: error.status ? error.message : 'Internal server error' });
        }
    });
    server.on('close', () => store.close());
    return { server, store };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const { server } = createApi();
    const port = Number(process.env.SOCIALCHOICE_API_PORT || 3001);
    server.listen(port, '127.0.0.1', () => console.log(`Socialchoice local API: http://127.0.0.1:${port}`));
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
}
