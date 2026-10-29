import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegionalAiFetch, forwardGeminiRequest, isGeminiEndpoint } from './ai-regional-fetch.js';
const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent';
const options = { method:'POST', headers:{'x-goog-api-key':'private-key',cookie:'private-cookie',Authorization:'private-auth'}, body:'{"contents":[]}' };
test('Gemini uses a private US jurisdiction while OpenAI remains direct', async () => {
 let relayed=0, direct=0;
 const actor={fetch:async request=>{relayed++;assert.equal(request.url,url);return new Response('regional',{headers:{'x-socialchoice-ai-response':'provider'}});}};
 const namespace={jurisdiction(value){assert.equal(value,'us');return {idFromName(name){assert.equal(name,'gemini-us-v1');return 'id';},get(id){assert.equal(id,'id');return actor;}};}};
 const request=createRegionalAiFetch(namespace,async()=>{direct++;return new Response('direct');});
 assert.equal(await (await request(url,options)).text(),'regional');
 await request('https://api.openai.com/v1/chat/completions',options);
 assert.equal(relayed,1);assert.equal(direct,1);
 await assert.rejects(createRegionalAiFetch(undefined)(url,options),/binding/);
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

test('binding and relay exceptions have safe, distinct diagnostic stages without retry', async () => {
 for (const [namespace, stage, status] of [
  [undefined, 'binding', 503],
  [{jurisdiction(){throw Error('private-key binding detail');}}, 'binding', 503],
  [{jurisdiction(){return {idFromName(){return 'id';},get(){return {fetch(){throw Error('private-key relay detail');}};}};}}, 'relay', 502],
 ]) {
  await assert.rejects(async()=>createRegionalAiFetch(namespace)(url,options),error=>error.stage===stage && error.status===status && !error.message.includes('private-key'));
 }
});

test('relay transport and timeout failures remain distinct across the actor response boundary', async () => {
 for (const [name, status, code] of [['TypeError',502,'AI_RELAY_UNREACHABLE'],['TimeoutError',504,'AI_RELAY_TIMEOUT']]) {
  let calls=0;
  const fetcher=async()=>{calls++;throw Object.assign(Error('private-key'),{name});};
  const response=await forwardGeminiRequest(new Request(url,options),fetcher);
  assert.equal(response.status,status);
  assert.equal(response.headers.get('x-socialchoice-ai-failure'),code);
  assert.ok(!(await response.clone().text()).includes('private-key'));
  const namespace={jurisdiction(){return {idFromName(){return 'id';},get(){return {fetch:async()=>response};}};}};
  await assert.rejects(createRegionalAiFetch(namespace)(url,options),{stage:'relay',code,status});
  assert.equal(calls,1);
 }
});

test('unmarked actor HTTP errors are relay failures, not provider rejections', async () => {
 for (const status of [400,502,504]) {
  const namespace={jurisdiction(){return {idFromName(){return 'id';},get(){return {fetch:async()=>new Response('private platform detail',{status})};}};}};
  await assert.rejects(createRegionalAiFetch(namespace)(url,options),{stage:'relay',status:status===504?504:502,code:status===504?'AI_RELAY_TIMEOUT':'AI_RELAY_UNREACHABLE'});
 }
 const response=await forwardGeminiRequest(new Request(url,options),async()=>Response.json({error:{}},{status:503}));
 assert.equal(response.status,503);assert.equal(response.headers.get('x-socialchoice-ai-response'),'provider');
});
