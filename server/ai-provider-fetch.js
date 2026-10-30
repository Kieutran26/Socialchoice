import { AiError } from './ai-errors.js';
import { isGeminiEndpoint } from './ai-regional-fetch.js';

function retryDelay(value) {
    if (!value) return 1000;
    const seconds = /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : NaN;
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
    return Number.isFinite(delay) ? Math.max(1000, Math.ceil(delay)) : 1000;
}

function waitForRetry(signal, delay) {
    signal.throwIfAborted();
    return new Promise((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(signal.reason); };
        const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, delay);
        signal.addEventListener('abort', abort, { once: true });
    });
}

// Only a parsed, definitive Gemini overload rejection is eligible, never uncertain I/O.
export async function fetchAiProvider(fetcher, url, options, rejectProvider) {
    options.signal.throwIfAborted();
    const response = await fetcher(url, options);
    if (response.status !== 503 || !isGeminiEndpoint(url)) return response;
    const delay = retryDelay(response.headers.get('retry-after'));
    try { await rejectProvider(response); }
    catch (error) {
        if (!(error instanceof AiError) || error.stage !== 'provider' || error.providerStatus !== 503
            || error.providerReason !== 'UNAVAILABLE' || delay > 10000) throw error;
        await waitForRetry(options.signal, delay);
        options.signal.throwIfAborted();
        // Reuse the original signal: the delay and both calls share one total deadline.
        return fetcher(url, options);
    }
    return response;
}
