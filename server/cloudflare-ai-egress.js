import { DurableObject } from 'cloudflare:workers';
import { forwardGeminiRequest } from './ai-regional-fetch.js';

export class SocialchoiceAiEgress extends DurableObject {
    async fetch(request) { return forwardGeminiRequest(request); }
}
