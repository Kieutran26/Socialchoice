import { createPublishingNotifications } from './publishing-notifications.js';
import { createFacebookMetrics } from './facebook-metrics.js';
import { createInstagramMediaAccess } from './instagram-media-access.js';
import { fail } from './validation.js';
import { Buffer } from 'node:buffer';
import { saveTemplate, createTemplateDraft } from './post-templates.js';
import { savePostPlan } from './post-plans.js';
import { MAX_IMAGE_BYTES } from './image-storage.js';
import { videoUploadRequest, serveMedia } from './media-http.js';
export function createHttpHandler({ store, auth, meta, publisher, metaSettings, linkedin, threads, threadsSettings = {}, tiktok, tiktokSettings = {}, publicOrigin, frontendPort, allowedHosts, serveStatic }) {
    const notifications=createPublishingNotifications(store);
    const metrics=createFacebookMetrics(store,metaSettings);
    const instagramMedia=createInstagramMediaAccess(store,metaSettings,threadsSettings,tiktokSettings);
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
            if (req.method === 'GET' && req.url?.startsWith('/api/linkedin/callback?') && linkedin) return await linkedin.callback(req,res);
            if (req.method === 'GET' && req.url?.startsWith('/api/threads/callback?') && threads) return await threads.callback(req,res);
            if (req.method==='GET'&&req.url?.startsWith('/api/tiktok/callback?')&&tiktok)return await tiktok.callback(req,res);
            // Signed GET/HEAD capabilities authorize only their exact delivery media, independently of browser origin.
            if (instagramMedia.serve(req,res)) return;
            if (req.headers.origin && !origins.includes(req.headers.origin)) fail('Origin not allowed', 403);
            if (req.headers['sec-fetch-site'] === 'cross-site') fail('Cross-site request denied', 403);
            if (!req.url.startsWith('/api/')) {
                if (serveStatic && serveStatic(req, res)) return;
                fail('Endpoint not found', 404);
            }
            if (req.url === '/api/health' && req.method === 'GET') return send(200, { backend: 'sqlite', mode: auth.enabled ? 'admin-session' : 'local-only', meta: metaSettings.ready ? 'configured' : 'configuration_required', publishing: publisher ? 'text_photo_video_publish_now' : 'not_implemented' });
            const imageRead = req.url.match(/^\/api\/media\/files\/([a-f0-9-]{36})$/);
            if (imageRead && req.method === 'GET') {
                auth.require(req);
                const asset = store.all('MediaAsset').find(asset => asset.storage_id === imageRead[1]);
                if (!asset) fail('Stored image not found', 404);
                return serveMedia(req,res,store,asset);
            }
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
            if(await videoUploadRequest(req,store,send)) return;
            if (req.url === '/api/media/upload' && req.method === 'POST') {
                const chunks = []; let length = 0;
                for await (const chunk of req) { const bytes = Buffer.from(chunk); length += bytes.length; if (length > MAX_IMAGE_BYTES) fail('Images must be at most 3 MiB', 413); chunks.push(bytes); }
                let name; try { name = decodeURIComponent(req.headers['x-image-name'] || ''); } catch { fail('Valid image filename required'); }
                return send(200, store.images.upload(req.headers['x-image-brand'], name, req.headers['content-type'], Buffer.concat(chunks)));
            }
            const metaRoute = req.url?.match(/^\/api\/meta\/(status|start|pages|import|disconnect|check)$/);
            const threadsRoute=req.url?.match(/^\/api\/threads\/(status|start|profile|import|disconnect|check)$/);
            const tiktokRoute=req.url?.match(/^\/api\/tiktok\/(status|start|profile|import|disconnect|check|creator)$/);
            const linkedinRoute=req.url?.match(/^\/api\/linkedin\/(status|start|profile|import|disconnect|check)$/);
            if (metaRoute || threadsRoute || tiktokRoute || linkedinRoute) {
                const service=linkedinRoute?linkedin:tiktokRoute?tiktok:threadsRoute?threads:meta,operation=(linkedinRoute||tiktokRoute||threadsRoute||metaRoute)[1];
                if(!service)fail('Threads is not configured',409);
                if (req.method === 'GET' && ['status', 'pages','profile'].includes(operation)) return send(200, await service.execute(operation, req, res));
                if (req.method !== 'POST' || !req.headers['content-type']?.startsWith('application/json')) fail('JSON POST required', 415);
                let body = '';
                for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 16384) fail('Request too large', 413); }
                let input; try { input = JSON.parse(body); } catch { fail('Invalid JSON'); }
                if (!Array.isArray(input?.args)) fail('Arguments array required');
                return send(200, await service.execute(operation, req, res, input.args));
            }
            if (req.url === '/api/auth/logout' && req.method === 'POST') { auth.logout(req, res); return send(200, { ok: true }); }
            if (req.url === '/api/session' && req.method === 'GET') return send(200, auth.identity ? auth.identity(req) : { id: 'local-owner', full_name: 'Workspace owner', role: 'admin', mode: auth.enabled ? 'admin-session' : 'local-only' });
            if (req.url === '/api/publishing/check' && req.method === 'POST') return send(200, { unavailable: !metaSettings.ready, queued: store.queuedAttempts().length, nextDue: store.queuedAttempts().length ? new Date(Math.min(...store.queuedAttempts().map(attempt=>attempt.scheduledFor))).toISOString() : null, message: metaSettings.ready ? 'Confirmed Facebook schedules run automatically. Uncertain deliveries are not resent.' : 'Configure Meta before publishing' });
            const publishingRoute = req.url?.match(/^\/api\/publishing\/(prepare|publish|status|prepareSchedule|schedule|cancelSchedule|prepareBatch|confirmBatch|batchStatus|prepareRetry|cancelPage)$/);
            if (req.url?.startsWith('/api/collaboration/')) fail('Facebook collaboration is unavailable', 410);
            const notificationRoute=req.url?.match(/^\/api\/notifications\/(list|read|readAll)$/);
            const metricsRoute=req.url?.match(/^\/api\/metrics\/(list|refresh)$/);
            const match = req.url?.match(/^\/api\/entities\/([A-Za-z]+)\/([A-Za-z]+)$/);
            const templateRoute = req.url?.match(/^\/api\/templates\/(save|createDraft)$/);
            const savingPost = req.url === '/api/posts/save';
            if ((!match && !savingPost && !publishingRoute && !notificationRoute && !metricsRoute && !templateRoute) || req.method !== 'POST') fail('Endpoint not found', 404);
            if (!req.headers['content-type']?.startsWith('application/json')) fail('JSON required', 415);
            let body = '';
            for await (const chunk of req) {
                body += chunk;
                if (Buffer.byteLength(body) > 1024 * 1024) fail('Request too large', 413);
            }
            let input;
            try { input = JSON.parse(body); } catch { fail('Invalid JSON'); }
            if (!Array.isArray(input.args)) fail('Arguments array required');
            if(metricsRoute){if(input.args.length!==1)fail('Metrics filters required');return send(200,await metrics[metricsRoute[1]](input.args[0]));}
            if(notificationRoute){const operation=notificationRoute[1];if(input.args.length!==(operation==='read'?1:0))fail('Invalid notification request');return send(200,notifications[operation](...input.args));}
            if (publishingRoute) {
                if(publishingRoute[1]==='prepareBatch'){if(!publisher||input.args.length!==1)fail('Batch entries required');return send(200,publisher.prepareBatch(input.args[0]));}
                if (!publisher || !(publishingRoute[1] === 'prepareSchedule' ? [2,3] : publishingRoute[1] === 'prepareRetry' ? [2] : [1]).includes(input.args.length) || input.args.some(arg=>typeof arg !== 'string')) fail('Publishing request ID required');
                if(tiktok&&['prepare','prepareSchedule','prepareRetry'].includes(publishingRoute[1])) {
                    const post=store.get('Post',input.args[0]);
                    for(const id of post.account_ids||[])if(store.get('SocialAccount',id).platform==='tiktok')await tiktok.execute('creator',req,res,[id]);
                }
                return send(200, await publisher[publishingRoute[1]](...input.args));
            }
            if (templateRoute) {
                if (input.args.length !== 1) fail('Template request requires one argument');
                return send(200, templateRoute[1] === 'save' ? saveTemplate(store, input.args[0]) : createTemplateDraft(store, input.args[0]));
            }
            if (savingPost) return send(200, savePostPlan(store, input.args[0]));
            send(200, store.execute(match[1], match[2], input.args));
        } catch (error) {
            send(error.status || 500, { message: error.status ? error.message : 'Internal server error' });
        }
    };
}
