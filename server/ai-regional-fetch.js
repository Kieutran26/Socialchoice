// Gemini runs through a private US-jurisdiction actor; workspace storage stays in place.
export function isGeminiEndpoint(value) {
    try {
        const url = new URL(value);
        return url.origin === 'https://generativelanguage.googleapis.com' && !url.username && !url.password && !url.search && !url.hash
            && /^\/v1beta\/models\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}:generateContent$/.test(url.pathname);
    } catch { return false; }
}
export function createRegionalAiFetch(namespace, directFetch = fetch) {
    return (url, options) => {
        if (!isGeminiEndpoint(url)) return directFetch(url, options);
        if (!namespace) throw new Error('Regional AI binding is unavailable');
        const us = namespace.jurisdiction('us');
        const actor = us.get(us.idFromName('gemini-us-v1'));
        return actor.fetch(new Request(url, options));
    };
}

// Only a private Durable Object binding can reach this handler. No public relay route.
export async function forwardGeminiRequest(request, fetcher = fetch) {
    if (request.method !== 'POST' || !isGeminiEndpoint(request.url))
        return new Response(null, { status: 400 });
    const key = request.headers.get('x-goog-api-key');
    if (!key || key.length > 512 || /\s/.test(key)) return new Response(null, { status: 400 });
    const reader = request.body?.getReader();
    if (!reader) return new Response(null, { status: 400 });
    const chunks = []; let size = 0;
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 100000) { await reader.cancel(); return new Response(null, { status: 413 }); }
        chunks.push(value);
    }
    const body = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    // Credentials exist only for this call. Never persist, log, or forward client cookies.
    return fetcher(request.url, {
        method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(45000),
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body,
    });
}
