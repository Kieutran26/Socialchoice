// Only fixed messages and diagnostic metadata cross the HTTP boundary.
export class AiError extends Error {}
const ioSteps = new Set(['actor_request','provider_headers','provider_body']);
export const safeAiIoStep = value => ioSteps.has(value) ? value : undefined;
import { safeProviderReason } from '../src/api/ai-diagnostics.js';
export { safeProviderReason };
export function aiFailureDiagnostic(error) {
    if (!(error instanceof AiError) || !['binding', 'relay', 'provider'].includes(error.stage) || !/^AI_[A-Z_]{1,50}$/.test(error.code)) return {};
    return { code: error.code, stage: error.stage,
        ...(safeAiIoStep(error.ioStep) ? { ioStep: error.ioStep } : {}),
        ...(Number.isInteger(error.providerStatus) && error.providerStatus >= 100 && error.providerStatus <= 599 ? { providerStatus: error.providerStatus } : {}),
        ...(safeProviderReason(error.providerReason) ? { providerReason: error.providerReason } : {}),
    };
}
export function aiError(message, status, code, stage, providerStatus) {
    return Object.assign(new AiError(message), { status, code, stage,
        ...(providerStatus === undefined ? {} : { providerStatus }) });
}

export function relayError(timeout = false, ioStep) {
    return Object.assign(aiError(timeout
        ? 'AI relay timed out. Check your provider before trying again.'
        : 'Could not connect through the AI relay. Please try again later.',
    timeout ? 504 : 502, timeout ? 'AI_RELAY_TIMEOUT' : 'AI_RELAY_UNREACHABLE', 'relay'),safeAiIoStep(ioStep)?{ioStep}:{});
}
