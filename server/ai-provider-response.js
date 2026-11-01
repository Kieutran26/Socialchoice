import { aiError, safeProviderReason } from './ai-errors.js';
import { awaitAiIo } from './ai-io-deadline.js';

export async function readProviderJson(response, signal) {
    const reader = response.body?.getReader();
    if (!reader) return {};
    const decoder = new TextDecoder();
    let content = '', bytes = 0;
    try { while (true) {
        const { value, done } = signal ? await awaitAiIo(reader.read(),signal) : await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 262144) { void reader.cancel().catch(()=>{}); throw aiError('AI provider returned an invalid response.', 502, 'AI_PROVIDER_INVALID_RESPONSE', 'provider', response.status); }
        content += decoder.decode(value, { stream: true });
    }} catch(error) { void reader.cancel().catch(()=>{}); throw error; }
    const data = JSON.parse(content + decoder.decode());
    if (!data || typeof data !== 'object' || Array.isArray(data))
        throw aiError('AI provider returned an invalid response.', 502, 'AI_PROVIDER_INVALID_RESPONSE', 'provider', response.status);
    return data;
}

export async function rejectProvider(response, signal) {
    let data, invalidErrorResponse = false;
    try { data = await readProviderJson(response,signal); } catch(error) { if(signal?.aborted)throw error;data = {}; invalidErrorResponse = true; }
    // Classify private provider details; never return raw messages, keys or prompts.
    const detail = JSON.stringify(data?.error || {}).slice(0, 262144);
    let message;
    if (/API_KEY_INVALID|API_KEY_EXPIRED|invalid_api_key|api key not valid/i.test(detail) || response.status === 401)
        message = 'AI API key is invalid or expired. Replace it in Settings.';
    else if (/leaked|reported as leaked/i.test(detail))
        message = 'AI API key was blocked by the provider. Create a new key in your provider console.';
    else if (/location.*not supported|unsupported.*location|region.*not supported/i.test(detail))
        message = 'AI provider does not support the server region. Use a supported provider or deployment region.';
    else if (data?.error?.code === 'insufficient_quota' || response.status === 402)
        message = 'AI API billing or credits are required. Check billing in your provider console.';
    else if (response.status === 429)
        message = 'AI provider quota or rate limit reached.';
    else if (/billing|credit|paid plan/i.test(detail))
        message = 'AI API billing or credits are required. Check billing in your provider console.';
    else if (/model_not_found/i.test(detail) || response.status === 404)
        message = 'AI model was not found or is unavailable to this API account. Copy an available model ID from your provider console.';
    else if (response.status === 403)
        message = 'AI API access is denied. Check key restrictions, API enablement and model permissions in your provider console.';
    else if (response.status >= 500)
        message = 'AI provider is temporarily unavailable. Try again later.';
    else if (response.status === 400 || response.status === 422)
        message = 'AI provider rejected the request parameters. Check model compatibility and API account requirements.';
    else message = 'AI provider rejected the request. Check your key and model.';
    const error = aiError(message, 502, 'AI_PROVIDER_REJECTED', 'provider', response.status);
    error.providerReason = invalidErrorResponse ? 'INVALID_ERROR_RESPONSE' : safeProviderReason(data?.error?.status)
        || (response.status === 403 ? classifyAccessDenial(detail) : undefined);
    throw error;
}


// Fixed categories only: upstream messages may contain prompts or credentials.
export function classifyAccessDenial(detail) {
    if (/inference is blocked|account (?:is |has been )?(?:disabled|blocked|restricted|suspended)|user (?:is )?banned/i.test(detail)) return 'ACCOUNT_RESTRICTED';
    if (/key limit exceeded|budget.*exceeded|spending limit/i.test(detail)) return 'KEY_LIMIT_EXCEEDED';
    if (/eu\.openrouter\.ai/i.test(detail)) return 'EU_ENDPOINT_REQUIRED';
    if (/country|territory|geograph|region.*restrict/i.test(detail)) return 'GEOGRAPHIC_RESTRICTION';
    if (/data region|allowed.*hostnames/i.test(detail)) return 'REGION_RESTRICTED';
    if (/guardrail|content.policy|moderation|content filter/i.test(detail)) return 'POLICY_BLOCKED';
    if (/model.*(?:not allowed|not permitted|denied)|allowlist|author.*banned/i.test(detail)) return 'MODEL_RESTRICTED';
    return 'ACCESS_DENIED';
}
