// Fixed diagnostic categories are shared by the API and browser boundary.
const providerReasons = new Set(['CANCELLED', 'UNKNOWN', 'INVALID_ARGUMENT', 'DEADLINE_EXCEEDED', 'NOT_FOUND', 'ALREADY_EXISTS', 'PERMISSION_DENIED', 'RESOURCE_EXHAUSTED', 'FAILED_PRECONDITION', 'ABORTED', 'OUT_OF_RANGE', 'UNIMPLEMENTED', 'INTERNAL', 'UNAVAILABLE', 'DATA_LOSS', 'UNAUTHENTICATED', 'INVALID_ERROR_RESPONSE', 'ACCOUNT_RESTRICTED', 'KEY_LIMIT_EXCEEDED', 'REGION_RESTRICTED', 'EU_ENDPOINT_REQUIRED', 'GEOGRAPHIC_RESTRICTION', 'POLICY_BLOCKED', 'MODEL_RESTRICTED', 'ACCESS_DENIED']);
export const safeProviderReason = value => providerReasons.has(value) ? value : undefined;
export function providerReasonMessage(reason) {
    return {
        GEOGRAPHIC_RESTRICTION: 'The AI provider rejected this request because of a geographic restriction. Check the provider account and deployment region, or contact provider support.',
        REGION_RESTRICTED: 'The OpenRouter workspace requires a different data region. Check its allowed API regions.',
        EU_ENDPOINT_REQUIRED: 'The OpenRouter workspace requires the EU API endpoint. The current global endpoint is not allowed.',
        ACCOUNT_RESTRICTED: 'AI inference is blocked on this provider account. Contact provider support.',
        KEY_LIMIT_EXCEEDED: 'The AI key or workspace spending limit has been reached. Check the provider budget.',
        POLICY_BLOCKED: 'The AI provider blocked this request under its content or guardrail policy.',
        MODEL_RESTRICTED: 'This AI model is not allowed by the provider account or workspace policy.',
    }[safeProviderReason(reason)];
}
