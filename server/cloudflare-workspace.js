import { DurableObject } from 'cloudflare:workers';
import { createCloudWorkspaceRuntime } from './cloudflare-workspace-runtime.js';
import { handleWebRequest } from './web-request-adapter.js';

// Preserve this class and its original single-admin actor identity across deployments.
export class SocialchoiceWorkspace extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        this.runtime = createCloudWorkspaceRuntime(ctx, env);
        ctx.blockConcurrencyWhile(() => this.reconcilePhotos());
    }
    async fetch(request) {
        if (!this.runtime) return Response.json({ message: 'Configure private admin and storage secrets before deployment', ready: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
        await this.reconcilePhotos();
        return handleWebRequest(request, this.runtime.handler);
    }
    async reconcilePhotos() { if (this.runtime) await this.runtime.publisher.resumePhotos(); }
    async runAutopilot() {
        if (!this.runtime) return { paused: true, pendingAt: null };
        try {
            const result = await this.runtime.autopilot.execute('run', {});
            return { result, pendingAt: this.runtime.autopilot.pendingAt() };
        } catch (error) {
            if ([403, 409].includes(error.status)) return { paused: true, pendingAt: null };
            throw error;
        }
    }
    async alarm() { if (this.runtime) await this.runtime.publisher.runPhotos(); }
}
