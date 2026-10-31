import { fail } from './validation.js';
export const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
export function validAiModel(provider, model) {
    return typeof model === 'string' && (provider === 'openrouter' ? /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,199}$/ : /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/).test(model);
}
export async function listOpenRouterModels(fetcher = fetch) {
    const response = await fetcher('https://openrouter.ai/api/v1/models', { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(20000) });
    if (!response.ok) { await response.body?.cancel(); fail('Could not load OpenRouter models. Try again.', 502); }
    const reader = response.body?.getReader(); if (!reader) fail('Invalid OpenRouter model list', 502);
    const chunks = []; let size = 0;
    try { while (true) { const {value,done} = await reader.read(); if (done) break; size += value.byteLength; if (size > 8 * 1024 * 1024) fail('Invalid OpenRouter model list', 502); chunks.push(value); } }
    catch (error) { await reader.cancel().catch(() => {}); throw error; }
    const bytes = new Uint8Array(size); let offset=0; for (const chunk of chunks) { bytes.set(chunk,offset); offset+=chunk.length; }
    let data; try { data=JSON.parse(new TextDecoder().decode(bytes)); } catch { fail('Invalid OpenRouter model list',502); }
    if (!Array.isArray(data.data) || data.data.length > 3000) fail('Invalid OpenRouter model list',502);
    return { models: data.data.filter(model => validAiModel('openrouter',model.id) && typeof model.name==='string' && model.architecture?.input_modalities?.includes('text') && model.architecture?.output_modalities?.includes('text')).map(model => ({id:model.id,name:model.name.slice(0,200),vision:model.architecture.input_modalities.includes('image'),promptPrice:typeof model.pricing?.prompt==='string'?model.pricing.prompt:null,completionPrice:typeof model.pricing?.completion==='string'?model.pricing.completion:null})).sort((a,b)=>a.name.localeCompare(b.name)) };
}
