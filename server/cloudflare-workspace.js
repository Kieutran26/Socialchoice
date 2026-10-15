import { linkedinConfig } from './linkedin-config.js';
import { createLinkedinConnection } from './linkedin-connection.js';
import { tiktokConfig } from './tiktok-config.js';
import { createTiktokConnection } from './tiktok-connection.js';
import { createTiktokGraph } from './tiktok-graph.js';
import { createTiktokTokens } from './tiktok-tokens.js';
import { createFacebookPublisher } from './facebook-publisher.js';
import { DurableObject } from 'cloudflare:workers';
import { cloudflareSqlite } from './cloudflare-sqlite.js';
import { createStoreCore } from './store-core.js';
import { SqliteMap } from './sqlite-map.js';
import { createAdminAuth } from './admin-auth.js';
import { createMetaConnection } from './meta-connection.js';
import { metaConfig } from './meta-config.js';
import { threadsConfig } from './threads-config.js';
import { createThreadsConnection } from './threads-connection.js';
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
        metaSettings.mediaOrigin = backendOrigin;
        const linkedinSettings=linkedinConfig(env);
        if(linkedinSettings.ready && (publicOrigin ? linkedinSettings.origin!==publicOrigin : !['localhost','127.0.0.1'].includes(new URL(linkedinSettings.redirectUri).hostname)))throw new Error('LinkedIn callback origin mismatch');
        const threadsSettings=threadsConfig(env);
        threadsSettings.mediaOrigin=backendOrigin;
        if(threadsSettings.ready&&threadsSettings.origin!==publicOrigin)throw new Error('Threads callback origin mismatch');
        if (metaSettings.ready && metaSettings.origin !== publicOrigin) throw new Error('Meta callback origin mismatch');
        const meta = createMetaConnection(store, auth, metaSettings, { states: privateMap('oauth'), pending: privateMap('pages') });
        const linkedin=createLinkedinConnection(store,auth,linkedinSettings,{states:privateMap('linkedin-oauth'),pending:privateMap('linkedin-profile')});
        const threads=createThreadsConnection(store,auth,threadsSettings,{states:privateMap('threads-oauth'),pending:privateMap('threads-profile')});
        const tiktokSettings=tiktokConfig(env);
        const tiktokGraph=tiktokSettings.ready?createTiktokGraph(tiktokSettings):null;
        const tiktokTokens=createTiktokTokens(store,tiktokSettings,tiktokGraph);
        const tiktokCreators=privateMap('tiktok-creators');
        const tiktok=createTiktokConnection(store,auth,tiktokSettings,{graph:tiktokGraph,tokens:tiktokTokens,creators:tiktokCreators,states:privateMap('tiktok-oauth'),pending:privateMap('tiktok-profile')});
        const publisher = createFacebookPublisher(store, metaSettings, { linkedinConfig:linkedinSettings,threadsConfig:threadsSettings,tiktokConfig:tiktokSettings,tiktokTokens,tiktokCreators,tiktokGraph, wake: async time => { const alarm = await ctx.storage.getAlarm(); if (!alarm || time < alarm) await ctx.storage.setAlarm(time); } });
        this.publisher = publisher;
        ctx.blockConcurrencyWhile(() => this.reconcilePhotos());
        const allowedHosts = new Set([new URL(publicOrigin).hostname, new URL(backendOrigin).hostname]);
        this.handler = createHttpHandler({ store, auth, meta, linkedin, threads, tiktok, tiktokSettings, publisher, metaSettings, threadsSettings, publicOrigin, allowedHosts });
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
