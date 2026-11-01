import test from 'node:test';
import assert from 'node:assert/strict';
import {rejectProvider} from './ai-provider-response.js';
import {aiFailureDiagnostic} from './ai-errors.js';
test('access denial diagnostics classify provider failures without returning private details', async()=>{
 for (const [message,reason] of [['Inference is blocked on this account','ACCOUNT_RESTRICTED'],['Key limit exceeded','KEY_LIMIT_EXCEEDED'],['The key workspace permits requests only on allowed hostnames: data region','REGION_RESTRICTED'],['Blocked by guardrail','POLICY_BLOCKED'],['This model is not allowed','MODEL_RESTRICTED'],['Forbidden','ACCESS_DENIED']]) {
  await assert.rejects(rejectProvider(Response.json({error:{message:message+' private-key private-prompt',metadata:{raw:'private-key'}}},{status:403})),e=>{
   assert.equal(aiFailureDiagnostic(e).providerReason,reason);
   assert.ok(!JSON.stringify(aiFailureDiagnostic(e)).includes('private'));
   assert.ok(!e.message.includes('private'));return true;
  });
 }
});
