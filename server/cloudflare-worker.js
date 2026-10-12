export { SocialchoiceWorkspace } from './cloudflare-workspace.js';

export default {
    async fetch(request, env) {
        if (!new URL(request.url).pathname.startsWith('/api/')) return Response.json({ message: 'Endpoint not found' }, { status: 404 });
        const workspace = env.WORKSPACE.get(env.WORKSPACE.idFromName('single-admin-workspace'));
        return workspace.fetch(request);
    },
};
