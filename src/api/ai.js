import { isDesktop } from './desktop/runtime';
import { aiRequest as nativeRequest } from './desktop/ai';
import { readAiResponse } from './ai-response';
export async function aiRequest(action, input = {}) {
    if (isDesktop()) return nativeRequest(action, input);
    const response = await fetch('/api/ai/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Socialchoice-Client': 'local-ui' }, body: JSON.stringify(input) });
    return readAiResponse(response);
}
