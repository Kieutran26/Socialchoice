import { fail } from './validation.js';

export async function adminLicenseRequest(req, auth, service, send) {
    if (!req.url.startsWith('/api/admin/licenses/')) return false;
    // Customer workspace auth has an identity method. Local unrestricted mode cannot issue licenses.
    if (!auth.enabled || auth.identity) fail('Site owner access required', 403);
    const route = req.url.match(/^\/api\/admin\/licenses\/(status|list|issue|download|revoke)$/)?.[1];
    if (!route) fail('Endpoint not found', 404);
    if (route === 'status' || route === 'list') {
        if (req.method !== 'GET') fail('GET required', 405);
        send(200, service ? await service[route]() : route === 'status' ? { ready: false } : { items: [] }); return true;
    }
    if (req.method !== 'POST' || req.headers['content-type'] !== 'application/json') fail('JSON POST required', 415);
    let body = '';
    for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 8000) fail('Request too large', 413); }
    let parsed; try { parsed = JSON.parse(body); } catch { fail('Invalid JSON'); }
    if (!Array.isArray(parsed?.args) || parsed.args.length !== 1) fail('License details required');
    if (!service) fail('Web license signing is not configured', 503);
    send(200, await service[route](parsed.args[0])); return true;
}
