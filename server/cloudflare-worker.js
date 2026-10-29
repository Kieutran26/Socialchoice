export { SocialchoiceWorkspace } from './cloudflare-workspace.js';
export { SocialchoiceCustomerDirectory } from './cloudflare-customer-directory.js';
export { SocialchoiceCustomerWorkspace } from './customer-workspace.js';
import { customerCookie } from './customer-directory.js';

export default {
    async fetch(request, env) {
        if (!new URL(request.url).pathname.startsWith('/api/')) return Response.json({ message: 'Endpoint not found' }, { status: 404 });
        if (env.SOCIALCHOICE_WEB_LICENSE_PUBLIC_KEY) {
            if (!env.CUSTOMER_DIRECTORY || !env.CUSTOMER_WORKSPACES) return Response.json({ message: 'Customer activation is not available yet' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
            return env.CUSTOMER_DIRECTORY.get(env.CUSTOMER_DIRECTORY.idFromName('customer-directory-v1')).fetch(request);
        }
        if (new URL(request.url).pathname === '/api/customer/config') return Response.json({ ready: false }, { headers: { 'Cache-Control': 'no-store' } });
        if (new URL(request.url).pathname.startsWith('/api/customer/') || customerCookie(request) !== undefined) return Response.json({ message: 'Customer activation is not available yet' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
        const workspace = env.WORKSPACE.get(env.WORKSPACE.idFromName('single-admin-workspace'));
        return workspace.fetch(request);
    },
};

export { SocialchoiceAiEgress } from './cloudflare-ai-egress.js';
