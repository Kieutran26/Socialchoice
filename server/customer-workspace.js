import { DurableObject } from 'cloudflare:workers';
import { createCloudWorkspaceRuntime } from './cloudflare-workspace-runtime.js';
import { handleWebRequest } from './web-request-adapter.js';
import { readCustomerContext, CONTEXT_HEADER } from './customer-context.js';

export class SocialchoiceCustomerWorkspace extends DurableObject {
    constructor(ctx, env) { super(ctx, env); this.ctx = ctx; this.env = env; }
    async start(id) {
        if (this.runtime) return;
        await this.ctx.blockConcurrencyWhile(async () => {
            const saved = await this.ctx.storage.get('customer-id');
            if (saved && saved !== id) throw new Error('Workspace identity mismatch');
            if (!saved) await this.ctx.storage.put('customer-id', id);
            this.runtime = createCloudWorkspaceRuntime(this.ctx, this.env, id);
        });
    }
    async fetch(request) {
        try {
            const value = request.headers.get(CONTEXT_HEADER), path = new URL(request.url).pathname;
            const publicMedia = ['GET', 'HEAD'].includes(request.method) && /^\/api\/instagram-media\/[a-f0-9-]{36}\/[a-f0-9-]{36}$/.test(path);
            const identity = value ? readCustomerContext(value, this.env.SOCIALCHOICE_STORAGE_KEY) : null;
            const savedId = await this.ctx.storage.get('customer-id');
            if (!identity && (!publicMedia || !savedId)) return Response.json({ message: 'Sign in required' }, { status: 401 });
            if (identity && savedId && identity.id !== savedId) return Response.json({ message: 'Workspace identity mismatch' }, { status: 403 });
            await this.start(identity?.id || savedId);
            if (identity) this.runtime.auth.accept(value);
            if (!this.runtime.auth.licenseActive()) return Response.json({ message: 'A valid Socialchoice web license is required' }, { status: 403 });
            await this.runtime.authorize();
            await this.runtime.publisher.resumePhotos();
            return handleWebRequest(request, this.runtime.handler);
        } catch (error) { return Response.json({ message: error.status ? error.message : 'Customer workspace unavailable' }, { status: error.status || 503, headers: { 'Cache-Control': 'no-store' } }); }
    }
    async alarm() {
        const id = await this.ctx.storage.get('customer-id'); if (!id) return;
        await this.start(id);
        try { await this.runtime.authorize(); }
        catch (error) { if (error.status === 403) { await this.ctx.storage.deleteAlarm(); return; } throw error; }
        await this.runtime.publisher.runPhotos();
    }
}
