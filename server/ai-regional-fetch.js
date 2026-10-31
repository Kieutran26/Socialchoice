import { aiError, relayError } from './ai-errors.js';

// Gemini runs through a private US-jurisdiction actor; workspace storage stays in place.
export function isGeminiEndpoint(value) {
    try {
        const url = new URL(value);
        return url.origin === 'https://generativelanguage.googleapis.com' && !url.username && !url.password && !url.search && !url.hash
            && /^\/v1beta\/models\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}:generateContent$/.test(url.pathname);
    } catch { return false; }
}
export function createRegionalAiFetch(namespace, directFetch = fetch) {
    const deadlines = new WeakMap();
    return async (url, options) => {
        if (!isGeminiEndpoint(url)) return directFetch(url, options);
        let actor;
        try {
            const us = namespace.jurisdiction('us');
            actor = us.get(us.idFromName('gemini-us-v1'));
        } catch {
            throw aiError('Regional AI binding is unavailable. Contact the server administrator.', 503, 'AI_BINDING_UNAVAILABLE', 'binding');
        }
        let response;
        try {
            options.signal?.throwIfAborted();
            let deadline = options.signal && deadlines.get(options.signal);
            if (!deadline) {
                deadline = Date.now() + 45000;
                if (options.signal) deadlines.set(options.signal, deadline);
            }
            const headers = new Headers(options.headers);
            headers.set('x-socialchoice-ai-deadline', String(deadline));
            response = await actor.fetch(new Request(url, { ...options, headers }));
        }
        catch (error) { throw relayError(['TimeoutError', 'AbortError'].includes(error.name)); }
        const failure = response.headers.get('x-socialchoice-ai-failure');
        if (failure === 'AI_RELAY_TIMEOUT' || failure === 'AI_RELAY_UNREACHABLE') {
            await response.body?.cancel();
            throw relayError(failure === 'AI_RELAY_TIMEOUT');
        }
        if (response.headers.get('x-socialchoice-ai-response') !== 'provider') {
            await response.body?.cancel();
            throw relayError(response.status === 504);
        }
        return response;
    };
}

// Only a private Durable Object binding can reach this handler. No public relay route.
export async function forwardGeminiRequest(request, fetcher = fetch) {
    if (request.method !== 'POST' || !isGeminiEndpoint(request.url))
        return new Response(null, { status: 400 });
    const key = request.headers.get('x-goog-api-key');
    if (!key || key.length > 512 || /\s/.test(key)) return new Response(null, { status: 400 });
    const deadlineHeader = request.headers.get('x-socialchoice-ai-deadline');
    const deadline = deadlineHeader === null ? undefined : Number(deadlineHeader);
    if (deadline !== undefined && (!Number.isSafeInteger(deadline) || deadline <= 0)) return new Response(null, { status: 400 });
    const reader = request.body?.getReader();
    if (!reader) return new Response(null, { status: 400 });
    const maxBody = request.headers.get('x-socialchoice-ai-purpose') === 'asset-analysis' ? 4300000 : 100000;
    const chunks = []; let size = 0;
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBody) { await reader.cancel(); return new Response(null, { status: 413 }); }
        chunks.push(value);
    }
    const body = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    // Credentials exist only for this call. Never persist, log, or forward client cookies.
    try {
        const remaining = deadline === undefined ? 45000 : Math.min(45000, deadline - Date.now());
        if (remaining <= 0) throw new DOMException('AI deadline expired', 'TimeoutError');
        const signal = AbortSignal.any([request.signal, AbortSignal.timeout(remaining)]);
        signal.throwIfAborted();
        const response = await fetcher(request.url, {
            method: 'POST', redirect: 'manual', signal,
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body,
        });
        // Distinguish a real Google reply from an actor/platform-generated HTTP error.
        const headers = new Headers(response.headers);
        headers.delete('x-socialchoice-ai-failure');
        headers.set('x-socialchoice-ai-response', 'provider');
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    } catch (error) {
        const safe = relayError(['TimeoutError', 'AbortError'].includes(error.name));
        return Response.json({ message: safe.message }, { status: safe.status,
            headers: { 'Cache-Control': 'no-store', 'x-socialchoice-ai-failure': safe.code } });
    }
}
