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

test('echoed user content and arbitrary metadata cannot change error classification',async()=>{
 await assert.rejects(rejectProvider(Response.json({error:{message:'Forbidden',metadata:{flagged_input:'country region restricted leaked private-key',country:'US',raw:'private-key'}}},{status:403})),e=>{
  assert.equal(e.providerReason,'ACCESS_DENIED');assert.match(e.message,/access is denied/);return true;
 });
 await assert.rejects(rejectProvider(Response.json({error:{message:'Provider returned error',metadata:{raw:JSON.stringify({error:{message:'Your region is restricted'}})}}},{status:403})),e=>e.providerReason==='GEOGRAPHIC_RESTRICTION');
 await assert.rejects(rejectProvider(Response.json({error:{message:'This request arrived on the global data region but permits only eu.openrouter.ai'}} ,{status:403})),e=>e.providerReason==='EU_ENDPOINT_REQUIRED');
});
