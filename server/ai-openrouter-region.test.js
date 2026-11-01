import test from 'node:test';
import assert from 'node:assert/strict';
import {createRegionalAiFetch,forwardGeminiRequest,isOpenRouterEndpoint} from './ai-regional-fetch.js';
const url='https://openrouter.ai/api/v1/chat/completions';
const options={method:'POST',headers:{Authorization:'Bearer private-key',cookie:'private-cookie','x-goog-api-key':'unrelated'},body:JSON.stringify({model:'example/model',messages:[]})};
test('OpenRouter inference uses its own US actor and forwards only its credential',async()=>{
 let calls=0;
 const namespace={jurisdiction(region){assert.equal(region,'us');return {idFromName(name){assert.equal(name,'openrouter-us-v1');return 'id';},get(){return {fetch:request=>forwardGeminiRequest(request,async(target,init)=>{
  calls++;assert.equal(target,url);assert.equal(init.redirect,'manual');assert.deepEqual(init.headers,{'Content-Type':'application/json',Authorization:'Bearer private-key','HTTP-Referer':'https://socialchoice.vercel.app','X-Title':'Socialchoice'});
  return Response.json({choices:[{message:{content:'OK'},finish_reason:'stop'}]});
 })};}};}};
 const response=await createRegionalAiFetch(namespace,()=>{throw Error('must not run directly');})(url,options);
 assert.equal((await response.json()).choices[0].message.content,'OK');assert.equal(calls,1);
});
test('OpenRouter actor cannot become a public proxy or forward arbitrary credentials',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return new Response('unexpected');};
 for(const target of [url+'?key=secret',url+'#hash','https://openrouter.ai/api/v1/key','https://openrouter.ai.evil.test/api/v1/chat/completions','http://openrouter.ai/api/v1/chat/completions']){
  assert.equal(isOpenRouterEndpoint(target),false);
  assert.equal((await forwardGeminiRequest(new Request(target,options),fetcher)).status,400);
 }
 for(const auth of ['', 'Basic private-key','Bearer key with spaces']) assert.equal((await forwardGeminiRequest(new Request(url,{...options,headers:{Authorization:auth}}),fetcher)).status,400);
 assert.equal(calls,0);
});
