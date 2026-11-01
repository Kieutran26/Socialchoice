import test from 'node:test';
import assert from 'node:assert/strict';
import { forwardGeminiRequest, createRegionalAiFetch } from './ai-regional-fetch.js';
import { readProviderJson } from './ai-provider-response.js';
import { fetchAiProvider } from './ai-provider-fetch.js';
const url='https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent';
const options={method:'POST',headers:{'x-goog-api-key':'fixture-key'},body:'{}'};

test('direct provider fetch and JSON body reads honor the same abort deadline', {timeout:800}, async()=>{
    let calls=0;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(new DOMException('Deadline expired','TimeoutError')),30);
    const direct=fetchAiProvider(async()=>{calls++;return new Promise(()=>{});},'https://openrouter.ai/api/v1/chat/completions',{signal:controller.signal},async()=>{});
    let cancelled=false;
    const body=new ReadableStream({pull(){return new Promise(()=>{});},cancel(){cancelled=true;}});
    const json=readProviderJson(new Response(body),controller.signal);
    try{await Promise.all([assert.rejects(direct,{name:'TimeoutError'}),assert.rejects(json,{name:'TimeoutError'})]);}
    finally{clearTimeout(timer);}
    assert.equal(calls,1);assert.equal(cancelled,true);
});

test('relay times out a silent response body even when transport ignores abort', {timeout:800}, async()=>{
    let cancelled=false;
    const body=new ReadableStream({pull(){return new Promise(()=>{});},cancel(){cancelled=true;}});
    const response=await forwardGeminiRequest(new Request(url,{...options,headers:{...options.headers,'x-socialchoice-ai-deadline':String(Date.now()+40)}}),async()=>new Response(body));
    assert.equal(response.status,504);assert.equal(response.headers.get('x-socialchoice-ai-failure'),'AI_RELAY_TIMEOUT');
    assert.equal(response.headers.get('x-socialchoice-ai-io-step'),'provider_body');
    await Promise.resolve();assert.equal(cancelled,true);
});

test('caller deadline bounds an unresponsive actor without replay or direct fallback', {timeout:800}, async()=>{
    let calls=0,direct=0;
    const namespace={jurisdiction(){return {idFromName(){return 'id';},get(){return {fetch(){calls++;return new Promise(()=>{});}};}};}};
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(new DOMException('Deadline expired','TimeoutError')),30);
    try{await assert.rejects(createRegionalAiFetch(namespace,async()=>{direct++;return new Response('unexpected');})(url,{...options,signal:controller.signal}),{code:'AI_RELAY_TIMEOUT',ioStep:'actor_request'});}
    finally{clearTimeout(timer);}
    assert.equal(calls,1);assert.equal(direct,0);
});
