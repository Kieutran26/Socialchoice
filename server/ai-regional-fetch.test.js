import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegionalAiFetch, forwardGeminiRequest, isGeminiEndpoint } from './ai-regional-fetch.js';
const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent';
const options = { method:'POST', headers:{'x-goog-api-key':'private-key',cookie:'private-cookie',Authorization:'private-auth'}, body:'{"contents":[]}' };
test('Gemini uses a private US jurisdiction while OpenAI remains direct', async () => {
 let relayed=0, direct=0;
 const actor={fetch:async request=>{relayed++;assert.equal(request.url,url);return new Response('regional');}};
 const namespace={jurisdiction(value){assert.equal(value,'us');return {idFromName(name){assert.equal(name,'gemini-us-v1');return 'id';},get(id){assert.equal(id,'id');return actor;}};}};
 const request=createRegionalAiFetch(namespace,async()=>{direct++;return new Response('direct');});
 assert.equal(await (await request(url,options)).text(),'regional');
 await request('https://api.openai.com/v1/chat/completions',options);
 assert.equal(relayed,1);assert.equal(direct,1);
 assert.throws(()=>createRegionalAiFetch(undefined)(url,options),/binding/);
});
test('regional relay restricts destination, bounds body and strips unrelated credentials', async () => {
 let calls=0;
 const fetcher=async (target,init)=>{calls++;assert.equal(target,url);assert.equal(init.redirect,'manual');assert.deepEqual(init.headers,{'Content-Type':'application/json','x-goog-api-key':'private-key'});assert.equal(new TextDecoder().decode(init.body),options.body);return new Response('OK');};
 assert.equal(await (await forwardGeminiRequest(new Request(url,options),fetcher)).text(),'OK');
 for (const target of ['https://example.com/', url+'?key=secret',url+'#hash','http://generativelanguage.googleapis.com/v1beta/models/x:generateContent','https://user:pass@generativelanguage.googleapis.com/v1beta/models/x:generateContent']) {
  assert.equal(isGeminiEndpoint(target),false);
  if (!new URL(target).username) assert.equal((await forwardGeminiRequest(new Request(target,options),fetcher)).status,400);
 }
 assert.equal((await forwardGeminiRequest(new Request(url),fetcher)).status,400);
 assert.equal((await forwardGeminiRequest(new Request(url,{...options,headers:{}}),fetcher)).status,400);
 assert.equal((await forwardGeminiRequest(new Request(url,{...options,body:'x'.repeat(100001)}),fetcher)).status,413);
 assert.equal(calls,1);
});
