export async function handleWebRequest(request, handler) {
    const url = new URL(request.url);
    const headers = Object.fromEntries(request.headers);
    // Workers route by the request URL; a forwarded Host header is not authoritative.
    headers.host = url.host;
    const req = { method: request.method, url: url.pathname + url.search, headers, socket: { localPort: 443 }, async *[Symbol.asyncIterator]() { if (request.body) for await (const chunk of request.body) yield Buffer.from(chunk); } };
    let status = 200, body = '';
    const responseHeaders = new Headers();
    const res = {
        setHeader: (key, value) => responseHeaders.set(key, value),
        writeHead(code, values) { status = code; for (const [key, value] of Object.entries(values || {})) responseHeaders.set(key, value); },
        end(value = '') { body = value; },
    };
    await handler(req, res);
    return new Response(body, { status, headers: responseHeaders });
}
import { Buffer } from 'node:buffer';
