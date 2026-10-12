import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Miniflare, convertV4MiniflareOptions } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const runtime = new Miniflare(convertV4MiniflareOptions({
    modules: true, compatibilityDate: '2026-10-06', compatibilityFlags: ['nodejs_compat'],
    script: `export default { async fetch() {
        const results = [];
        for (const mode of ['error', 'manual']) {
            try {
                const r = await fetch('https://graph.facebook.com/v26.0/oauth/access_token', { method:'POST', redirect:mode, signal:AbortSignal.timeout(20000), headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({client_id:'1115808334255427',grant_type:'client_credentials'}) });
                results.push({mode,status:r.status,type:r.headers.get('content-type')});
            } catch (e) { results.push({mode,name:e.name,message:e.message}); }
        }
        return Response.json(results);
    }};`,
}));
try { console.log(await (await runtime.dispatchFetch('http://localhost/')).text()); }
finally { await runtime.dispose(); }
