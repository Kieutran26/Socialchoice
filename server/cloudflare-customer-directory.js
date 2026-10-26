import { DurableObject } from 'cloudflare:workers';
import { cloudflareSqlite } from './cloudflare-sqlite.js';
import { createStoreCore } from './store-core.js';
import { createCustomerDirectory } from './customer-directory.js';
import { createCustomerGateway } from './customer-gateway.js';
import { webPublicKey } from './web-license.js';
import { LICENSE_AUTHORITY_PATH, handleLicenseAuthority } from './license-authority.js';

export class SocialchoiceCustomerDirectory extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        this.env = env;
        try {
            webPublicKey(env.SOCIALCHOICE_WEB_LICENSE_PUBLIC_KEY);
            if (!/^[a-f0-9]{64}$/i.test(env.SOCIALCHOICE_STORAGE_KEY || '')) return;
            const store = createStoreCore(cloudflareSqlite(ctx.storage), work => ctx.storage.transactionSync(work));
            const directory = createCustomerDirectory(store, env.SOCIALCHOICE_STORAGE_KEY, env.SOCIALCHOICE_WEB_LICENSE_PUBLIC_KEY);
            this.directory = directory;
            this.handler = createCustomerGateway({ directory, env,
                forwardCustomer: (id, request) => env.CUSTOMER_WORKSPACES.get(env.CUSTOMER_WORKSPACES.idFromName(id)).fetch(request),
                forwardOwner: request => env.WORKSPACE.get(env.WORKSPACE.idFromName('single-admin-workspace')).fetch(request),
            });
        } catch { /* Missing issuer setup must not enable public customer access. */ }
    }
    async fetch(request) {
        if (!this.handler) return Response.json({ message: 'Customer activation is not available yet' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
        if (new URL(request.url).pathname === LICENSE_AUTHORITY_PATH) return handleLicenseAuthority(request, this.env, this.directory);
        return this.handler(request);
    }
}
