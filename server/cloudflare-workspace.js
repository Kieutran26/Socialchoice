import { createFacebookPublisher } from './facebook-publisher.js';
import { DurableObject } from 'cloudflare:workers';
import { cloudflareSqlite } from './cloudflare-sqlite.js';
import { createStoreCore } from './store-core.js';
import { SqliteMap } from './sqlite-map.js';
import { createAdminAuth } from './admin-auth.js';
import { createMetaConnection } from './meta-connection.js';
import { metaConfig } from './meta-config.js';
import { createHttpHandler } from './http-handler.js';
import { handleWebRequest } from './web-request-adapter.js';

export class SocialchoiceWorkspace extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        this.env = env;
        if (!env.SOCIALCHOICE_ADMIN_PASSWORD_HASH || !/^[a-f0-9]{64}$/i.test(env.SOCIALCHOICE_STORAGE_KEY || '')) return;
        const publicOrigin = env.SOCIALCHOICE_PUBLIC_ORIGIN;
        if (!publicOrigin || new URL(publicOrigin).origin !== publicOrigin || !publicOrigin.startsWith('https://')) throw new Error('HTTPS app origin required');
        const backendOrigin = env.SOCIALCHOICE_BACKEND_ORIGIN;
        if (!backendOrigin || new URL(backendOrigin).origin !== backendOrigin || !backendOrigin.startsWith('https://')) throw new Error('HTTPS backend origin required');
        const store = createStoreCore(cloudflareSqlite(ctx.storage), work => ctx.storage.transactionSync(work));
        const privateMap = name => new SqliteMap(store, env.SOCIALCHOICE_STORAGE_KEY, name);
        const auth = createAdminAuth(env.SOCIALCHOICE_ADMIN_PASSWORD_HASH, true, { sessions: privateMap('sessions'), throttle: privateMap('throttle') });
        const metaSettings = metaConfig(env);
        if (metaSettings.ready && metaSettings.origin !== publicOrigin) throw new Error('Meta callback origin mismatch');
        const meta = createMetaConnection(store, auth, metaSettings, { states: privateMap('oauth'), pending: privateMap('pages') });
        const publisher = createFacebookPublisher(store, metaSettings, { wake: async time => { const alarm = await ctx.storage.getAlarm(); if (!alarm || time < alarm) await ctx.storage.setAlarm(time); } });
        this.publisher = publisher;
        ctx.blockConcurrencyWhile(() => this.reconcilePhotos());
        const allowedHosts = new Set([new URL(publicOrigin).hostname, new URL(backendOrigin).hostname]);
        this.handler = createHttpHandler({ store, auth, meta, publisher, metaSettings, publicOrigin, allowedHosts });
    }
    async fetch(request) {
        if (!this.handler) return Response.json({ message: 'Configure private admin and storage secrets before deployment', ready: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
        await this.reconcilePhotos();
        return handleWebRequest(request, this.handler);
    }
    async reconcilePhotos() {
        if (this.publisher) await this.publisher.resumePhotos();
    }
    async alarm() { if (this.publisher) await this.publisher.runPhotos(); }
}
