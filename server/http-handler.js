import { fail } from './validation.js';
import { Buffer } from 'node:buffer';
import { savePostPlan } from './post-plans.js';
export function createHttpHandler({ store, auth, meta, metaSettings, publicOrigin, frontendPort, allowedHosts, serveStatic }) {
    return async (req, res) => {
        const send = (status, value) => {
            res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
            res.end(JSON.stringify(value));
        };
        try {
            // Accept only configured hosts; public access retains session and browser-origin checks.
            const host = req.headers.host?.split(':')[0];
            if (!allowedHosts.has(host)) fail('Allowed host required', 403);
            const origins = publicOrigin ? [publicOrigin] : [`http://127.0.0.1:${frontendPort}`, `http://localhost:${frontendPort}`, `http://127.0.0.1:${req.socket.localPort}`, `http://localhost:${req.socket.localPort}`];
            if (req.method === 'GET' && req.url?.startsWith('/api/meta/callback?')) return await meta.callback(req, res);
            if (req.headers.origin && !origins.includes(req.headers.origin)) fail('Origin not allowed', 403);
            if (req.headers['sec-fetch-site'] === 'cross-site') fail('Cross-site request denied', 403);
            if (!req.url.startsWith('/api/')) {
                if (serveStatic && serveStatic(req, res)) return;
                fail('Endpoint not found', 404);
            }
            if (req.url === '/api/health' && req.method === 'GET') return send(200, { backend: 'sqlite', mode: auth.enabled ? 'admin-session' : 'local-only', meta: metaSettings.ready ? 'configured' : 'configuration_required', publishing: 'not_implemented' });
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
            const metaRoute = req.url?.match(/^\/api\/meta\/(status|start|pages|import|disconnect|check)$/);
            if (metaRoute) {
                if (req.method === 'GET' && ['status', 'pages'].includes(metaRoute[1])) return send(200, await meta.execute(metaRoute[1], req, res));
                if (req.method !== 'POST' || !req.headers['content-type']?.startsWith('application/json')) fail('JSON POST required', 415);
                let body = '';
                for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 16384) fail('Request too large', 413); }
                let input; try { input = JSON.parse(body); } catch { fail('Invalid JSON'); }
                if (!Array.isArray(input?.args)) fail('Arguments array required');
                return send(200, await meta.execute(metaRoute[1], req, res, input.args));
            }
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
    };
}
