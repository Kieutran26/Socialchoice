import { consumeAutopilotBatch } from './autopilot-queue.js';
export { SocialchoiceWorkspace } from './cloudflare-workspace.js';
export { SocialchoiceCustomerDirectory } from './cloudflare-customer-directory.js';
export { SocialchoiceCustomerWorkspace } from './customer-workspace.js';
import { customerCookie } from './customer-directory.js';

export default {
    queue: consumeAutopilotBatch,
    async fetch(request, env) {
        // 1. Fast CORS preflight directly at the Edge without touching Durable Objects
        if (request.method === 'OPTIONS') {
            const origin = request.headers.get('Origin') || '*';
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Socialchoice-Client, X-Requested-With',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Max-Age': '86400',
                },
            });
        }

        const url = new URL(request.url);
        const pathname = url.pathname.toLowerCase();

        // 2. Block vulnerability scanners before they reach Durable Objects
        const userAgent = (request.headers.get('User-Agent') || '').toLowerCase();
        const isScanner =
            pathname.includes('.php') ||
            pathname.includes('.env') ||
            pathname.includes('.git') ||
            pathname.includes('wp-admin') ||
            pathname.includes('wp-login') ||
            pathname.includes('xmlrpc') ||
            pathname.includes('actuator') ||
            userAgent.includes('sqlmap') ||
            userAgent.includes('nikto') ||
            userAgent.includes('zgrab');

        if (isScanner) {
            return new Response('Not Found', { status: 404 });
        }

        // 3. Fast health check without touching Durable Objects
        if (pathname === '/api/health' || pathname === '/health') {
            return Response.json({ status: 'ok', time: new Date().toISOString() });
        }
        if (
            !pathname.startsWith('/api/') &&
            !pathname.startsWith('/s/') &&
            pathname !== '/mcp' &&
            !pathname.startsWith('/.well-known/')
        ) {
            return Response.json({ message: 'Endpoint not found' }, { status: 404 });
        }
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
