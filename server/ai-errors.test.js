import test from 'node:test';
import assert from 'node:assert/strict';
import {aiError,aiFailureDiagnostic} from './ai-errors.js';
test('AI diagnostics include only allowlisted metadata from application-owned errors',()=>{
 const error=aiError('private-key message',502,'AI_PROVIDER_REJECTED','provider',503);
 Object.assign(error,{providerReason:'UNAVAILABLE',key:'private-key',prompt:'private prompt',stack:'private stack'});
 assert.deepEqual(aiFailureDiagnostic(error),{code:'AI_PROVIDER_REJECTED',stage:'provider',providerStatus:503,providerReason:'UNAVAILABLE'});
 assert.deepEqual(aiFailureDiagnostic(Object.assign(Error('secret'),error)),{});
 error.providerReason='private-key';error.providerStatus=999;
 assert.deepEqual(aiFailureDiagnostic(error),{code:'AI_PROVIDER_REJECTED',stage:'provider'});
 error.code='private-key';assert.deepEqual(aiFailureDiagnostic(error),{});
});
