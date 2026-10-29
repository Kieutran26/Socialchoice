import { isDesktop } from './desktop/runtime';
import { aiRequest as nativeRequest } from './desktop/ai';
export async function aiRequest(action, input = {}) {
    if (isDesktop()) return nativeRequest(action, input);
    const response = await fetch('/api/ai/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Socialchoice-Client': 'local-ui' }, body: JSON.stringify(input) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'AI request failed');
    return result;
}
