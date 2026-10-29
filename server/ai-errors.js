// Only fixed messages and diagnostic metadata cross the HTTP boundary.
export class AiError extends Error {}
export function aiError(message, status, code, stage, providerStatus) {
    return Object.assign(new AiError(message), { status, code, stage,
        ...(providerStatus === undefined ? {} : { providerStatus }) });
}

export function relayError(timeout = false) {
    return aiError(timeout
        ? 'AI relay timed out. Check your provider before trying again.'
        : 'Could not connect through the AI relay. Please try again later.',
    timeout ? 504 : 502, timeout ? 'AI_RELAY_TIMEOUT' : 'AI_RELAY_UNREACHABLE', 'relay');
}
