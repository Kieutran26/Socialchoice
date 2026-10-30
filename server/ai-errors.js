// Only fixed messages and diagnostic metadata cross the HTTP boundary.
export class AiError extends Error {}
const providerReasons = new Set(['CANCELLED', 'UNKNOWN', 'INVALID_ARGUMENT', 'DEADLINE_EXCEEDED', 'NOT_FOUND', 'ALREADY_EXISTS', 'PERMISSION_DENIED', 'RESOURCE_EXHAUSTED', 'FAILED_PRECONDITION', 'ABORTED', 'OUT_OF_RANGE', 'UNIMPLEMENTED', 'INTERNAL', 'UNAVAILABLE', 'DATA_LOSS', 'UNAUTHENTICATED', 'INVALID_ERROR_RESPONSE']);
export function safeProviderReason(value) { return providerReasons.has(value) ? value : undefined; }
export function aiFailureDiagnostic(error) {
    if (!(error instanceof AiError) || !['binding', 'relay', 'provider'].includes(error.stage) || !/^AI_[A-Z_]{1,50}$/.test(error.code)) return {};
    return { code: error.code, stage: error.stage,
        ...(Number.isInteger(error.providerStatus) && error.providerStatus >= 100 && error.providerStatus <= 599 ? { providerStatus: error.providerStatus } : {}),
        ...(safeProviderReason(error.providerReason) ? { providerReason: error.providerReason } : {}),
    };
}
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
