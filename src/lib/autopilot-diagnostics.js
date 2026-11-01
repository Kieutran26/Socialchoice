const messages = {
    SOURCE_ACCESS_DENIED: 'Source access was denied. Check public sharing and server API key restrictions.',
    SOURCE_CHANGED: 'The source file changed or moved. Sync the folder before analyzing again.',
    SOURCE_MEMBERSHIP_UNVERIFIED: 'The file could not be verified in this folder. Check access and sync again.',
    IMAGE_INVALID: 'The downloaded file is not a supported image. Use PNG, JPEG or still WebP.',
    AI_ACCESS_DENIED: 'AI access was denied. Check the key and model permissions in Settings.',
    AI_BILLING_REQUIRED: 'AI credits are required. Check billing with your AI provider.',
    AI_RATE_LIMIT: 'The AI rate limit was reached. Check your provider before retrying.',
    AI_MODEL_UNAVAILABLE: 'The selected AI model is unavailable. Choose another model in Settings.',
    AI_PROVIDER_UNAVAILABLE: 'The AI provider is temporarily unavailable. Check its status before retrying.',
    AI_REQUEST_REJECTED: 'The AI provider rejected this request. Check model compatibility.',
    AI_PROVIDER_REDIRECT: 'The AI provider redirected the request. The redirect was blocked.',
    AI_PROVIDER_INVALID_RESPONSE: 'The AI provider returned an invalid response. No result was accepted.',
    AI_ANALYSIS_INCOMPLETE: 'AI did not return a complete analysis. No result was accepted.',
    AI_ANALYSIS_INVALID: 'AI returned an analysis that did not match the required format. No result was accepted.',
};
const stages = {
    source_check: 'Checking the source', source_list: 'Reading source metadata',
    source_image: 'Downloading the source image', ai_analysis: 'Analyzing the image with AI', save_result: 'Saving the analysis',
};
export function autopilotDiagnosticLabels(diagnostic) {
    return { message: messages[diagnostic?.code] || '', stage: stages[diagnostic?.stage] || '' };
}
