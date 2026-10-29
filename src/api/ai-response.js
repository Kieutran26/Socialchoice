// Trust only application-owned fixed messages, even when a proxy returns JSON.
const safeMessages = new Set([
    'AI encryption is not configured on the server.', 'Choose a provider and a valid model ID.',
    'Enter a valid API key.', 'Review and confirm the AI request.', 'AI input exceeds the supported limit.',
    'Add a brief or caption first.', 'Strategy must belong to the selected brand.', 'Select a supported platform.',
    'An AI request is already running. Try again shortly.', 'Configure your AI key in Settings',
    'AI settings could not be decrypted. Remove the key, then save it again.',
    'AI API key is invalid or expired. Replace it in Settings.',
    'AI API key was blocked by the provider. Create a new key in your provider console.',
    'AI provider does not support the server region. Use a supported provider or deployment region.',
    'AI API billing or credits are required. Check billing in your provider console.',
    'AI provider quota or rate limit reached.',
    'AI model was not found or is unavailable to this API account. Copy an available model ID from your provider console.',
    'AI API access is denied. Check key restrictions, API enablement and model permissions in your provider console.',
    'AI provider is temporarily unavailable. Try again later.',
    'AI provider rejected the request parameters. Check model compatibility and API account requirements.',
    'AI provider rejected the request. Check your key and model.', 'AI provider redirect was blocked.',
    'AI returned no complete suggestion. Try a shorter request.', 'AI provider returned an invalid response.',
    'AI provider timed out. Check your provider before trying again.',
    'Could not connect to the AI provider. Please try again later.',
    'Regional AI binding is unavailable. Contact the server administrator.',
    'AI relay timed out. Check your provider before trying again.',
    'Could not connect through the AI relay. Please try again later.',
    'Sign in required', 'Session expired', 'Origin not allowed', 'Cross-site request denied',
    'Application request header required', 'JSON POST required', 'Request too large', 'Invalid JSON', 'AI input required',
]);

// A hosting proxy can return HTML or an empty body instead of the API's JSON.
export async function readAiResponse(response) {
    let result;
    try { result = await response.json(); } catch { /* Use a fixed message; never display proxy bodies. */ }
    if (!response.ok || !result || typeof result !== 'object' || Array.isArray(result)) {
        const message = safeMessages.has(result?.message) ? result.message
            : response.status === 504 ? 'AI gateway timed out. Check your provider before trying again.'
                : 'AI gateway returned an invalid response. Please try again later.';
        throw Object.assign(new Error(message), { status: response.status,
            stage: ['binding', 'relay', 'provider'].includes(result?.stage) ? result.stage : 'proxy',
            ...(typeof result?.code === 'string' && /^AI_[A-Z_]{1,50}$/.test(result.code) ? { code: result.code } : {}),
            ...(Number.isInteger(result?.providerStatus) && result.providerStatus >= 100 && result.providerStatus <= 599 ? { providerStatus: result.providerStatus } : {}),
        });
    }
    return result;
}
