import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiWriting } from './ai-writing.js';
import { createStore } from './store.js';
import { applyAiPlatformSuggestion, aiDraftContext } from '../src/lib/ai-draft.js';
import { createServer } from 'node:http';
import { createHttpHandler } from './http-handler.js';

const key = 'ac'.repeat(32);
const settings = { provider: 'openai', model: 'test-model', key: 'private-test-secret' };
function fixture(t, fetcher) {
    const store = createStore(':memory:'); t.after(() => store.close());
    const brand = store.execute('Brand', 'create', [{ name: 'Brand A' }]);
    const ai = createAiWriting(store, key, fetcher);
    const input = { brand_id: brand.id, title: 'Title', caption: 'Original caption', brief: 'A truthful brief', action: 'draft', language: 'vi', confirmed: true };
    return { store, ai, input };
}
const ok = text => Response.json({ choices: [{ message: { content: text }, finish_reason: 'stop' }] });
test('keys are encrypted, never returned, isolated per workspace and removable', async t => {
    const { ai, store } = fixture(t);
    assert.deepEqual(await ai('save', settings), { configured: true, provider: 'openai', model: 'test-model' });
    assert.ok(!store.readCredential('ai:writing').includes(settings.key));
    assert.equal((await createAiWriting(store, key)('status')).configured, true);
    assert.equal((await fixture(t).ai('status')).configured, false);
    await ai('save', { ...settings, key: '', model: 'updated' });
    assert.equal((await ai('status')).model, 'updated');
    await assert.rejects(ai('save', { ...settings, provider: 'gemini', key: '' }));
    await ai('clear'); assert.equal((await ai('status')).configured, false);
});
test('validated context only is sent to fixed OpenAI endpoint without media or unrelated posts', async t => {
    let call;
    const { ai, input } = fixture(t, async (...args) => { call = args; return ok('Suggested caption'); });
    await ai('save', settings);
    assert.equal((await ai('generate', { ...input, media: ['private-file'], extra: 'private-other-post' })).text, 'Suggested caption');
    assert.equal(call[0], 'https://api.openai.com/v1/chat/completions');
    assert.equal(call[1].redirect, 'manual');
    const body = JSON.parse(call[1].body);
    assert.equal(body.store, false);
    assert.ok(body.messages[0].content.includes('Brand A'));
    assert.ok(!call[1].body.includes('private-file')); assert.ok(!call[1].body.includes('private-other-post'));
    for (const change of [{ confirmed: false }, { action: 'invent' }, { language: 'xx' }, { brief: 'x'.repeat(4001) }, { brand_id: 'missing' }, { action: 'adapt', platform: 'invalid' }]) await assert.rejects(ai('generate', { ...input, ...change }));
});
test('strategy from another brand is rejected before any provider call', async t => {
    let called = false;
    const { ai, store, input } = fixture(t, async () => { called = true; return ok('No'); });
    const brand = store.execute('Brand', 'create', [{ name: 'Other brand' }]);
    const pillar = store.execute('ContentPillar', 'create', [{ name: 'Other pillar', brand_id: brand.id }]);
    await ai('save', settings);
    await assert.rejects(ai('generate', { ...input, pillar_id: pillar.id })); assert.equal(called, false);
});
test('Gemini uses header credentials and supports platform adaptation', async t => {
    const { ai, input } = fixture(t, async (url, options) => {
        assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent');
        assert.equal(options.headers['x-goog-api-key'], settings.key);
        assert.ok(options.body.includes('linkedin'));
        return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'LinkedIn caption' }] } }] });
    });
    await ai('save', { ...settings, provider: 'gemini' });
    assert.equal((await ai('generate', { ...input, action: 'adapt', platform: 'linkedin' })).text, 'LinkedIn caption');
});
test('provider errors and incomplete output are safe and not automatically retried', async t => {
    for (const reply of [() => new Response(settings.key, { status: 401 }), () => Response.json({ choices: [{ message: { content: 'partial' }, finish_reason: 'length' }] }), () => { throw Error(settings.key); }]) {
        let calls = 0;
        const { ai, input } = fixture(t, async () => { calls++; return reply(); }); await ai('save', settings);
        await assert.rejects(ai('generate', input), error => error.status === 502 && !error.message.includes(settings.key));
        assert.equal(calls, 1);
    }
});
test('concurrent provider requests are blocked and clear works during a request', async t => {
    let finish;
    const { ai, input } = fixture(t, () => new Promise(resolve => { finish = resolve; }));
    await ai('save', settings);
    const pending = ai('generate', input);
    await assert.rejects(ai('generate', input), { status: 429 });
    await ai('clear'); finish(ok('Complete')); await pending;
    assert.equal((await ai('status')).configured, false);
});
test('platform apply preserves shared caption and prevents overwriting intervening edits', () => {
    const form = { brand_id: 'a', title: '', caption: 'Shared', platform_captions: { linkedin: 'Previous' }, media: ['media'] };
    const origin = aiDraftContext(form);
    const applied = applyAiPlatformSuggestion(form, origin, 'linkedin', 'Previous', 'Suggestion');
    assert.equal(applied.caption, 'Shared'); assert.equal(applied.platform_captions.linkedin, 'Suggestion'); assert.equal(applied.media, form.media);
    const changed = { ...form, platform_captions: { linkedin: 'Manual edit' } };
    assert.equal(applyAiPlatformSuggestion(changed, origin, 'linkedin', 'Previous', 'Suggestion'), changed);
});

test('AI HTTP routes enforce authentication, app header, origin, method and payload bounds', async t => {
    const store = createStore(':memory:');
    const auth = { require(req) { if (req.headers.authorization !== 'test-session') throw Object.assign(new Error('Sign in required'), { status: 401 }); } };
    const handler = createHttpHandler({ store, auth, metaSettings: {}, aiKey: key, allowedHosts: new Set(['127.0.0.1']), frontendPort: 5173 });
    const server = createServer(handler);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => { server.close(() => { store.close(); resolve(); }); server.closeAllConnections(); }));
    const url = `http://127.0.0.1:${server.address().port}/api/ai/`;
    const headers = { 'Content-Type': 'application/json', 'X-Socialchoice-Client': 'local-ui', Authorization: 'test-session' };
    const request = (operation, body = {}, extra = {}) => fetch(url + operation, { method: 'POST', body: JSON.stringify(body), headers, ...extra });
    assert.equal((await request('status', {}, { headers: { ...headers, Authorization: '' } })).status, 401);
    assert.equal((await request('status', {}, { headers: { ...headers, 'X-Socialchoice-Client': '' } })).status, 403);
    assert.equal((await request('status', {}, { headers: { ...headers, Origin: 'https://evil.example' } })).status, 403);
    assert.equal((await fetch(url + 'status', { headers })).status, 415);
    assert.equal((await request('save', settings)).status, 200);
    const status = await request('status'); assert.equal(status.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await status.json(), { configured: true, provider: 'openai', model: 'test-model' });
    assert.equal((await request('save', { ...settings, key: 'x'.repeat(100001) })).status, 413);
    assert.equal((await request('status', null)).status, 400);
    assert.equal((await request('clear')).status, 200);
});

test('provider redirects, timeouts and malformed JSON have safe distinct errors', async t => {
 for (const [reply, message, status] of [[() => new Response(null, {status:302,headers:{location:'https://example.com'}}), 'AI provider redirect was blocked.',502], [() => {throw new DOMException('private detail','TimeoutError');},'AI provider timed out. Check your provider before trying again.',504], [() => new Response('invalid-json'),'AI provider returned an invalid response.',502]]) {
 const {ai,input}=fixture(t,async()=>reply()); await ai('save',settings); await assert.rejects(ai('generate',input),{message,status});
 }
});

test('provider refusal classification separates credentials, model, permissions, billing and region without exposing secrets', async t => {
 const cases = [
 [400, {message:'API key not valid', details:[{reason:'API_KEY_INVALID'}]}, 'invalid or expired'],
 [401, {message:'private'}, 'invalid or expired'],
 [403, {message:'Your API key was reported as leaked'}, 'was blocked'],
 [400, {message:'User location is not supported for the API use'}, 'server region'],
 [429, {code:'insufficient_quota'}, 'billing or credits'],
 [402, {}, 'billing or credits'],
 [429, {}, 'quota or rate limit'],
 [404, {}, 'model was not found'],
 [403, {details:[{reason:'API_KEY_SERVICE_BLOCKED'}]}, 'access is denied'],
 [400, {message:'Unsupported parameter'}, 'request parameters'],
 [503, {}, 'temporarily unavailable'],
 ];
 for (const [status, error, expected] of cases) {
  let calls=0;
  const {ai}=fixture(t,async()=>{calls++; return Response.json({error:{...error,private:settings.key}},{status});});
  await ai('save',{...settings,provider:'gemini'});
  await assert.rejects(ai('test'),e=>e.status===502 && e.message.includes(expected) && !e.message.includes(settings.key));
  assert.equal(calls,1);
 }
});
test('non-JSON and oversized refusal bodies remain safe', async t => {
 for (const body of [settings.key, 'x'.repeat(262145)]) {
  const {ai}=fixture(t,async()=>new Response(body,{status:403}));
  await ai('save',settings);
  await assert.rejects(ai('test'),e=>e.status===502 && e.message.includes('access is denied') && !e.message.includes(settings.key));
 }
});

test('Gemini HTTP tests and generation retain binding, relay and provider diagnostics without secrets or retry', async t => {
 const {createRegionalAiFetch}=await import('./ai-regional-fetch.js');
 const store=createStore(':memory:');
 const brand=store.execute('Brand','create',[{name:'Diagnostic brand'}]);
 let mode='provider', calls=0;
 const namespace={jurisdiction(){
  if(mode==='binding')throw Error(settings.key);
  return {idFromName(){return 'id';},get(){return {async fetch(){calls++;
   if(mode==='relay')throw Error(settings.key);
   return Response.json({error:{message:'API key not valid',private:settings.key}},{status:400,headers:{'x-socialchoice-ai-response':'provider'}});
  }};}};
 }};
 const handler=createHttpHandler({store,auth:{require(){}},metaSettings:{},aiKey:key,aiFetch:createRegionalAiFetch(namespace),allowedHosts:new Set(['127.0.0.1'])});
 const server=createServer(handler);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>{server.close(()=>{store.close();resolve();});server.closeAllConnections();}));
 const request=(operation,input={})=>fetch(`http://127.0.0.1:${server.address().port}/api/ai/${operation}`,{method:'POST',headers:{'Content-Type':'application/json','X-Socialchoice-Client':'local-ui'},body:JSON.stringify(input)});
 assert.equal((await request('save',{...settings,provider:'gemini'})).status,200);
 for (const operation of ['test','generate'])for (const [stage,status,code] of [['binding',503,'AI_BINDING_UNAVAILABLE'],['relay',502,'AI_RELAY_UNREACHABLE'],['provider',502,'AI_PROVIDER_REJECTED']]) {
  mode=stage;const before=calls;
  const response=await request(operation,{brand_id:brand.id,title:'',caption:'',brief:'Test',action:'draft',language:'en',confirmed:true});
  assert.equal(response.status,status);
  assert.equal(response.headers.get('cache-control'),'no-store');
  const data=await response.json();
  assert.equal(data.stage,stage);assert.equal(data.code,code);
  assert.equal(data.providerStatus,stage==='provider'?400:undefined);
  assert.ok(!JSON.stringify(data).includes(settings.key));
  assert.equal(calls-before,stage==='binding'?0:1);
 }
});

test('provider-shaped exceptions cannot inject a status and leak private details', async t => {
 const {ai}=fixture(t,async()=>{throw Object.assign(Error(settings.key),{status:403});});
 await ai('save',settings);
 await assert.rejects(ai('test'),{status:502,stage:'provider',code:'AI_PROVIDER_UNREACHABLE',message:'Could not connect to the AI provider. Please try again later.'});
});

test('valid JSON with an invalid provider shape is reported as a response error', async t => {
 for (const data of [null, [], 'private response']) {
  const {ai}=fixture(t,async()=>Response.json(data));
  await ai('save',settings);
  await assert.rejects(ai('test'),{status:502,stage:'provider',code:'AI_PROVIDER_INVALID_RESPONSE',providerStatus:200});
 }
});
