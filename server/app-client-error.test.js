import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Test simulation of request error parser in src/api/app-client.js
function parseResponseError({ rawText, status, ok, silent = false }) {
    let result = {};
    let parseFailed = false;
    try {
        result = rawText ? JSON.parse(rawText) : {};
    } catch {
        parseFailed = true;
    }

    const events = [];
    const dispatch = (name, detail) => {
        events.push({ name, detail });
    };

    if (!ok) {
        let errorMessage = result?.message;
        if (parseFailed || typeof errorMessage !== 'string' || !errorMessage.trim()) {
            errorMessage = 'Máy chủ đang tạm thời không khả dụng. Vui lòng thử lại sau.';
        }

        const error = Object.assign(new Error(errorMessage), {
            status: status,
            isNonJson: parseFailed,
            ...(result?.diagnostic ? { diagnostic: result.diagnostic } : {}),
        });

        if (!silent) {
            dispatch('socialchoice:error', error.message);
        }
        return { error, events };
    }

    if (parseFailed) {
        const error = Object.assign(new Error('Máy chủ đang tạm thời không khả dụng. Vui lòng thử lại sau.'), {
            status: status,
            isNonJson: true,
        });
        if (!silent) {
            dispatch('socialchoice:error', error.message);
        }
        return { error, events };
    }

    return { result, events };
}

describe('appClient error handling & non-JSON sanitization', () => {
    it('1. When backend returns HTML (e.g. Cloudflare Error 1101), sanitizes message to friendly text without raw HTML', () => {
        const cloudflare1101Html = `<!DOCTYPE html>
<html>
<head><title>Worker threw exception | socialchoice-api.nguyenngockieutran.workers.dev | Cloudflare</title></head>
<body><h1>Error 1101</h1><p>Worker threw exception</p></body>
</html>`;

        const { error } = parseResponseError({
            rawText: cloudflare1101Html,
            status: 500,
            ok: false,
        });

        assert.ok(error, 'Throws error');
        assert.equal(error.message, 'Máy chủ đang tạm thời không khả dụng. Vui lòng thử lại sau.');
        assert.equal(error.message.includes('<'), false, 'Does not leak HTML tags');
        assert.equal(error.message.includes('Worker threw exception'), false, 'Does not leak internal error');
        assert.equal(error.status, 500, 'Preserves HTTP 500 status');
        assert.equal(error.isNonJson, true);
    });

    it('2. When backend returns non-JSON plain text with 502 Bad Gateway, sanitizes cleanly', () => {
        const { error } = parseResponseError({
            rawText: 'Bad Gateway: connection refused to upstream DO',
            status: 502,
            ok: false,
        });

        assert.equal(error.message, 'Máy chủ đang tạm thời không khả dụng. Vui lòng thử lại sau.');
        assert.equal(error.status, 502);
        assert.equal(error.isNonJson, true);
    });

    it('3. When backend returns valid JSON error (401 Sign in required), preserves exact message and status', () => {
        const { error, events } = parseResponseError({
            rawText: JSON.stringify({ message: 'Sign in required' }),
            status: 401,
            ok: false,
            silent: false,
        });

        assert.equal(error.message, 'Sign in required');
        assert.equal(error.status, 401);
        assert.equal(error.isNonJson, false);
        assert.equal(events.length, 1);
        assert.equal(events[0].detail, 'Sign in required');
    });

    it('4. Silent requests (e.g. session polling) do NOT emit socialchoice:error events', () => {
        const { error, events } = parseResponseError({
            rawText: '<html/>',
            status: 503,
            ok: false,
            silent: true,
        });

        assert.equal(error.message, 'Máy chủ đang tạm thời không khả dụng. Vui lòng thử lại sau.');
        assert.equal(events.length, 0, 'No event dispatched when silent=true');
    });

    it('5. 200 OK with non-JSON response (e.g. SPA index fallback instead of API JSON) fails closed safely', () => {
        const { error } = parseResponseError({
            rawText: '<!DOCTYPE html><html><body>SPA Root</body></html>',
            status: 200,
            ok: true,
        });

        assert.ok(error);
        assert.equal(error.message, 'Máy chủ đang tạm thời không khả dụng. Vui lòng thử lại sau.');
        assert.equal(error.status, 200);
        assert.equal(error.isNonJson, true);
    });
});
