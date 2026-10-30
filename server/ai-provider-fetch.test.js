import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchAiProvider} from './ai-provider-fetch.js';
import {aiError} from './ai-errors.js';
const url='https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';
const options=()=>({method:'POST',signal:AbortSignal.timeout(45000),body:'fixed body'});
const unavailable=(headers={})=>Response.json({error:{status:'UNAVAILABLE'}},{status:503,headers});
const reject=async response=>{
 const data=await response.json();
 throw Object.assign(aiError('Fixed safe refusal',502,'AI_PROVIDER_REJECTED','provider',response.status),{providerReason:data.error?.status});
};

test('Gemini stops after a maximum of two overload replies',async()=>{
 let calls=0;const init=options();
 const response=await fetchAiProvider(async(target,input)=>{calls++;assert.equal(target,url);assert.equal(input,init);return unavailable();},url,init,reject);
 assert.equal(response.status,503);assert.equal(calls,2);
});

test('OpenAI, unrelated statuses, unrecognized bodies and uncertain failures never retry',async()=>{
 for(const [target,reply] of [
  ['https://api.openai.com/v1/chat/completions',()=>unavailable()],
  [url,()=>Response.json({error:{status:'UNAVAILABLE'}},{status:500})],
  [url,()=>Response.json({error:{status:'RESOURCE_EXHAUSTED'}},{status:429})],
  [url,()=>Response.json({error:{status:'INTERNAL'}},{status:503})],
  [url,()=>new Response('private invalid response',{status:503})],
  [url,()=>{throw new DOMException('private timeout','TimeoutError');}],
  [url,()=>{throw Error('private network failure');}],
 ]){
  let calls=0;
  try{await fetchAiProvider(async()=>{calls++;return reply();},target,options(),reject);}catch{}
  assert.equal(calls,1);
 }
});

test('retry wait and second call share the original abort deadline',async()=>{
 let calls=0;
 await assert.rejects(fetchAiProvider(async()=>{calls++;return unavailable({'retry-after':'2'});},url,{...options(),signal:AbortSignal.timeout(30)},reject),{name:'TimeoutError'});
 assert.equal(calls,1);
 const controller=new AbortController();controller.abort();
 await assert.rejects(fetchAiProvider(async()=>{calls++;return unavailable();},url,{...options(),signal:controller.signal},reject),{name:'AbortError'});
 assert.equal(calls,1);
});

test('long provider Retry-After instructions return the original error without retry',async()=>{
 for(const value of ['60',new Date(Date.now()+60000).toUTCString()]){
  let calls=0;
  await assert.rejects(fetchAiProvider(async()=>{calls++;return unavailable({'retry-after':value});},url,options(),reject),{providerStatus:503,providerReason:'UNAVAILABLE'});
  assert.equal(calls,1);
 }
});

test('a second transport failure never starts a third provider request',async()=>{
 let calls=0;
 await assert.rejects(fetchAiProvider(async()=>{calls++;if(calls===1)return unavailable();throw new DOMException('private timeout','TimeoutError');},url,options(),reject),{name:'TimeoutError'});
 assert.equal(calls,2);
});
