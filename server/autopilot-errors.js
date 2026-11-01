import { aiFailureDiagnostic } from './ai-errors.js';

const stages = new Set(['source_check', 'source_list', 'source_image', 'ai_analysis', 'save_result']);
const codes = new Set(['SOURCE_ACCESS_DENIED', 'SOURCE_CHANGED', 'SOURCE_MEMBERSHIP_UNVERIFIED', 'IMAGE_INVALID']);
// Persist only fixed enums and an HTTP status. Never messages, URLs, headers or provider bodies.
export function autopilotFailureDiagnostic(error, stage) {
    const ai = aiFailureDiagnostic(error);
    let code = codes.has(error.code) ? error.code : ai.code;
    const providerStatus = ai.providerStatus ?? error.providerStatus;
    if (code === 'AI_PROVIDER_REJECTED') {
        code = [401, 403].includes(providerStatus) ? 'AI_ACCESS_DENIED'
            : providerStatus === 402 ? 'AI_BILLING_REQUIRED'
            : providerStatus === 429 ? 'AI_RATE_LIMIT'
            : providerStatus === 404 ? 'AI_MODEL_UNAVAILABLE'
            : providerStatus >= 500 ? 'AI_PROVIDER_UNAVAILABLE' : 'AI_REQUEST_REJECTED';
    }
    if (!code) code = ['TimeoutError', 'AbortError'].includes(error.name) ? 'TIMEOUT'
        : error.status === 409 ? 'REVIEW_REQUIRED' : 'PROVIDER_OR_ASSET_ERROR';
    return { stage: stages.has(stage) ? stage : 'source_check', code,
        ...(Number.isInteger(providerStatus) && providerStatus >= 100 && providerStatus <= 599 ? { providerStatus } : {}) };
}
