import { customerCookie } from './customer-directory.js';
import { CONTEXT_HEADER, signCustomerContext } from './customer-context.js';
import { accountId } from './web-license.js';
import { boundedJson } from '../auth-broker/provider-http.mjs';

const json = (value, status = 200, headers = {}) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
export function createCustomerGateway({ directory, env, forwardCustomer, forwardOwner }) {
    async function forward(request, identity) {
        const headers = new Headers(request.headers); headers.delete(CONTEXT_HEADER);
        headers.set(CONTEXT_HEADER, signCustomerContext(identity, env.SOCIALCHOICE_STORAGE_KEY, identity.needsBootstrap));
        const response = await forwardCustomer(identity.id, new Request(request, { headers }));
        if (response.ok && identity.needsBootstrap) directory.workspaceReady(identity);
        return response;
    }
    return async request => {
        try {
            const url = new URL(request.url), path = url.pathname;
            if (![env.SOCIALCHOICE_PUBLIC_ORIGIN, env.SOCIALCHOICE_BACKEND_ORIGIN].includes(url.origin)) return json({ message: 'Allowed host required' }, 403);
            const media = path.match(/^\/api\/workspaces\/([a-f0-9-]{36})(\/api\/instagram-media\/[a-f0-9-]{36}\/[a-f0-9-]{36})$/);
            if (media) {
                if (!accountId(media[1]) || !['GET', 'HEAD'].includes(request.method)) return json({ message: 'Media fetch requires GET or HEAD' }, 405);
                const headers = new Headers(request.headers); headers.delete(CONTEXT_HEADER); url.pathname = media[2];
                return forwardCustomer(media[1], new Request(url, { method: request.method, headers }));
            }
            const callback = request.method === 'GET' && /^\/api\/(meta|threads|linkedin|tiktok)\/callback$/.test(path);
            if (!callback && (request.headers.get('origin') && request.headers.get('origin') !== env.SOCIALCHOICE_PUBLIC_ORIGIN || request.headers.get('sec-fetch-site') === 'cross-site')) return json({ message: 'Origin not allowed' }, 403);
            if (path === '/api/customer/config' && request.method === 'GET') return json({ ready: true, multipleDevices: true, purchase: 'one-time' });
            if (/^\/api\/customer\/(register|login|recover)$/.test(path)) {
                if (request.method !== 'POST' || request.headers.get('x-socialchoice-client') !== 'local-ui' || request.headers.get('content-type') !== 'application/json') return json({ message: 'JSON application POST required' }, 415);
                const body = await boundedJson(request, 14000);
                if (!Array.isArray(body?.args) || body.args.length !== 1 || !body.args[0] || typeof body.args[0] !== 'object' || Array.isArray(body.args[0])) return json({ message: 'Account details required' }, 400);
                const operation = path.split('/').at(-1), input = body.args[0];
                const allowed = operation === 'register' ? ['email', 'password', 'license'] : operation === 'recover' ? ['email', 'password', 'recoveryCode'] : ['email', 'password'];
                if (Object.keys(input).length !== allowed.length || allowed.some(key => !Object.hasOwn(input, key))) return json({ message: 'Invalid account details' }, 400);
                const result = directory[operation](input, request.headers.get('cf-connecting-ip') || 'unknown');
                // Account/recovery commit returns its recovery code independently of workspace availability.
                // The next authenticated request bootstraps the workspace and can safely retry on failure.
                return json({ ok: true, ...(result.recoveryCode ? { recoveryCode: result.recoveryCode } : {}) }, 200, { 'Set-Cookie': result.cookie });
            }
            if (path === '/api/auth/logout' && request.method === 'POST' && customerCookie(request) !== undefined) {
                if (request.headers.get('x-socialchoice-client') !== 'local-ui') return json({ message: 'Application request header required' }, 403);
                const identity = directory.resolve(request);
                return json({ ok: true }, 200, { 'Set-Cookie': directory.logout(identity) });
            }
            const identity = directory.resolve(request);
            if (identity) {
                if (path.startsWith('/api/customer/') || path === '/api/auth/login') return json({ message: 'Endpoint not found' }, 404);
                return forward(request, identity);
            }
            const headers = new Headers(request.headers); headers.delete(CONTEXT_HEADER);
            return forwardOwner(new Request(request, { headers }));
        } catch (error) { return json({ message: error.status ? error.message : 'Account request could not be completed' }, error.status || 400); }
    };
}
