import { linkedinConfig } from './linkedin-config.js';
import { createLinkedinConnection } from './linkedin-connection.js';
import { tiktokConfig } from './tiktok-config.js';
import { createTiktokConnection } from './tiktok-connection.js';
import { createTiktokGraph } from './tiktok-graph.js';
import { createTiktokTokens } from './tiktok-tokens.js';
import { createFacebookPublisher } from './facebook-publisher.js';
import { createHttpHandler } from './http-handler.js';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createStore } from './store.js';
import { createAdminAuth } from './admin-auth.js';
import { serveSite } from './static-site.js';
import { createMetaConnection } from './meta-connection.js';
import { metaConfig } from './meta-config.js';
import { threadsConfig } from './threads-config.js';
import { createThreadsConnection } from './threads-connection.js';
import { runtimeConfig } from './runtime-config.js';

export function createApi({ dbPath = resolve(process.env.SOCIALCHOICE_DB_PATH || 'data/socialchoice.sqlite'), frontendPort = Number(process.env.SOCIALCHOICE_FRONTEND_PORT || 5173), passwordHash = process.env.SOCIALCHOICE_ADMIN_PASSWORD_HASH, publicOrigin = process.env.SOCIALCHOICE_PUBLIC_ORIGIN, backendOrigin = process.env.SOCIALCHOICE_BACKEND_ORIGIN || process.env.RENDER_EXTERNAL_URL, siteDirectory = process.env.SOCIALCHOICE_SERVE_DIST === 'true' ? 'dist' : null } = {}) {
    if (publicOrigin && (new URL(publicOrigin).origin !== publicOrigin || !publicOrigin.startsWith('https://') || !passwordHash)) throw new Error('Public mode requires an HTTPS origin and admin password hash');
    if (backendOrigin && (!publicOrigin || new URL(backendOrigin).origin !== backendOrigin || !backendOrigin.startsWith('https://'))) throw new Error('Backend origin requires an authenticated HTTPS app origin');
    const allowedHosts = new Set(['127.0.0.1', 'localhost', ...(publicOrigin ? [new URL(publicOrigin).hostname] : []), ...(backendOrigin ? [new URL(backendOrigin).hostname] : [])]);
    const auth = createAdminAuth(passwordHash, !!publicOrigin);
    const metaSettings = metaConfig();
    metaSettings.mediaOrigin = backendOrigin || publicOrigin;
    const linkedinSettings=linkedinConfig();
        if(linkedinSettings.ready && (publicOrigin ? linkedinSettings.origin!==publicOrigin : !['localhost','127.0.0.1'].includes(new URL(linkedinSettings.redirectUri).hostname)))throw new Error('LinkedIn callback origin mismatch');
        const threadsSettings=threadsConfig();
    threadsSettings.mediaOrigin=backendOrigin||publicOrigin;
    if(threadsSettings.ready && (publicOrigin?threadsSettings.origin!==publicOrigin:!['localhost','127.0.0.1'].includes(new URL(threadsSettings.redirectUri).hostname)))throw new Error('Threads callback origin must match the Socialchoice app origin');
    if (metaSettings.ready && (publicOrigin ? metaSettings.origin !== publicOrigin : !['127.0.0.1', 'localhost'].includes(new URL(metaSettings.redirectUri).hostname))) throw new Error('Meta callback origin must match the Socialchoice app origin');
    const store = createStore(dbPath);
    const meta = createMetaConnection(store, auth, metaSettings);
    const linkedin=createLinkedinConnection(store,auth,linkedinSettings);
        const threads=createThreadsConnection(store,auth,threadsSettings);
    const tiktokSettings=tiktokConfig();
        const tiktokGraph=tiktokSettings.ready?createTiktokGraph(tiktokSettings):null;
        const tiktokTokens=createTiktokTokens(store,tiktokSettings,tiktokGraph);
        const tiktokCreators=new Map();
        const tiktok=createTiktokConnection(store,auth,tiktokSettings,{graph:tiktokGraph,tokens:tiktokTokens,creators:tiktokCreators,});
        const publisher = createFacebookPublisher(store, metaSettings,{linkedinConfig:linkedinSettings,threadsConfig:threadsSettings,tiktokConfig:tiktokSettings,tiktokTokens,tiktokCreators,tiktokGraph});
    publisher.resumePhotos();
    const server = createServer(createHttpHandler({ store, auth, meta, linkedin, threads, tiktok, tiktokSettings, publisher, metaSettings, threadsSettings, publicOrigin, frontendPort, allowedHosts, serveStatic: siteDirectory ? (req, res) => serveSite(req, res, siteDirectory) : null }));
    server.on('close', () => { publisher.close(); store.close(); });
    return { server, store };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const { host, port } = runtimeConfig();
    const { server } = createApi();
    server.listen(port, host, () => console.log(`Socialchoice API listening on port ${port}`));
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
}
