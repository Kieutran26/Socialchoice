import test from 'node:test';
import assert from 'node:assert/strict';
import { readAiResponse } from '../src/api/ai-response.js';

test('AI client handles HTML, empty, malformed and timeout proxy replies without showing private bodies', async () => {
 for (const [status,body] of [[502,'<html>private-key internal proxy</html>'],[502,''],[200,'invalid JSON'],[504,'private prompt']]) {
  await assert.rejects(readAiResponse(new Response(body,{status})),error=>error.stage==='proxy' && error.status===status && !error.message.includes('private') && error.message.includes(status===504?'timed out':'invalid response'));
 }
});

test('AI client preserves safe API diagnostics and successful responses', async () => {
 const diagnostic={message:'AI API key is invalid or expired. Replace it in Settings.',code:'AI_PROVIDER_REJECTED',stage:'provider',providerStatus:403,providerReason:'KEY_LIMIT_EXCEEDED'};
 await assert.rejects(readAiResponse(Response.json(diagnostic,{status:502})),{...diagnostic,status:502});
 for (const result of [{configured:true,provider:'gemini',model:'test-model'},{text:'A complete suggestion'}])
  assert.deepEqual(await readAiResponse(Response.json(result)),result);
});

test('JSON proxy messages never leak private text, including forged diagnostic fields', async () => {
 for (const extra of [{},{stage:'provider',code:'AI_PROVIDER_REJECTED',providerStatus:400}]) {
  await assert.rejects(readAiResponse(Response.json({message:'private-key private prompt',...extra},{status:502})),error=>!error.message.includes('private') && error.message.includes('invalid response'));
 }
});
