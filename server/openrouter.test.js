import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiWriting } from './ai-writing.js';
import { createAssetIntelligence } from './autopilot-intelligence.js';
import { createStore } from './store.js';
import { listOpenRouterModels, validAiModel } from './openrouter.js';
const key='cd'.repeat(32);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=','base64');
test('OpenRouter catalog is fixed, bounded, sanitized and independent of saved provider secrets',async()=>{
 let calls=0;
 const store=createStore(':memory:');try{
 const ai=createAiWriting(store,key,async(url,options)=>{
  calls++;assert.equal(url,'https://openrouter.ai/api/v1/models');assert.equal(options.redirect,'manual');assert.equal(options.headers,undefined);
  return Response.json({data:[{id:'google/test:free',name:'Gemini',architecture:{input_modalities:['text','image'],output_modalities:['text']},pricing:{prompt:'0',completion:'0'},secret:'not-public'},{id:'bad model',name:'Bad',architecture:{input_modalities:['text'],output_modalities:['text']}}]});
 });
 await ai('save',{provider:'gemini',model:'test',key:'original-key'});
 const result=await ai('models');assert.equal(result.models.length,1);assert.equal(result.models[0].vision,true);assert.ok(!JSON.stringify(result).includes('secret'));await ai('models');assert.equal(calls,1);assert.equal((await ai('status')).provider,'gemini');
 }finally{store.close();}
 assert.equal(validAiModel('gemini','google/test'),false);
 assert.equal(validAiModel('openrouter','anthropic/test:free'),true);
 await assert.rejects(listOpenRouterModels(async()=>new Response(null,{status:302})),{status:502});
 await assert.rejects(listOpenRouterModels(async()=>new Response('x'.repeat(8*1024*1024+1))),{status:502});
});
test('OpenRouter uses encrypted distinct credentials, fixed chat endpoint and complete output only',async()=>{
 const store=createStore(':memory:');let calls=0;try{
 const ai=createAiWriting(store,key,async(url,options)=>{
  calls++;assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');assert.equal(options.redirect,'manual');assert.equal(options.headers.Authorization,'Bearer router-secret');
  const body=JSON.parse(options.body);assert.equal(body.model,'google/test:free');assert.equal(body.max_tokens,256);assert.equal(body.max_completion_tokens,undefined);assert.equal(body.provider.allow_fallbacks,false);
  return Response.json({choices:[{finish_reason:'stop',message:{content:'OK'}}]});
 });
 await ai('save',{provider:'gemini',model:'old',key:'gemini-secret'});
 await assert.rejects(ai('save',{provider:'openrouter',model:'google/test:free',key:''}));
 const saved=await ai('save',{provider:'openrouter',model:'google/test:free',key:'router-secret'});assert.ok(!JSON.stringify(saved).includes('secret'));assert.ok(!store.readCredential('ai:writing').includes('router-secret'));assert.equal((await ai('test')).text,'OK');assert.equal(calls,1);
 }finally{store.close();}
});
test('OpenRouter image analysis uses inline image and preserves schema/provider/model metadata',async()=>{
 const store=createStore(':memory:');try{
 const ai=createAiWriting(store,key);await ai('save',{provider:'openrouter',model:'anthropic/test',key:'router-secret'});
 const intelligence=createAssetIntelligence(store,key,async(url,options)=>{
  assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');assert.equal(options.redirect,'manual');const body=JSON.parse(options.body);
  assert.equal(body.max_tokens,3000);assert.match(body.messages[0].content[1].image_url.url,/^data:image\/png;base64,/);
  return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({summary:'Test',tags:['test'],ocr:'TEST',suggested_uses:[],warnings:[]})}}]});
 });
 const result=await intelligence.analyze({mime:'image/png'},png,{provider:'openrouter',model:'anthropic/test'});assert.equal(result.provider,'openrouter');assert.equal(result.ocr,'TEST');
 await assert.rejects(intelligence.analyze({mime:'image/png'},png,{provider:'gemini',model:'anthropic/test'}),{status:409});
 }finally{store.close();}
});
