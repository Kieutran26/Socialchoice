import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from './store.js';
import { createAutopilot } from './autopilot.js';
import { createMetaVault } from './meta-vault.js';
import { createR2Provider, createDriveProvider, DRIVE_SCOPE, boundedBytes } from './autopilot-providers.js';
import { validateAnalysis } from './autopilot-intelligence.js';
import { createApi } from './index.js';
import { hashPassword } from './admin-auth.js';
import { forwardGeminiRequest } from './ai-regional-fetch.js';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=', 'base64');
const analysis = { summary: 'Một ảnh thử nghiệm', tags: ['test'], ocr: '', suggested_uses: ['Bài giới thiệu'], warnings: ['Cần duyệt'] };
const ok = data => Response.json(data);
function fixture(t, options = {}) {
    const store = options.store || createStore(':memory:'); t.after(() => store.close());
    const brand = store.write('Brand', { name: 'Autopilot fixture' }), key = randomBytes(32).toString('hex');
    const env = { SOCIALCHOICE_AUTOPILOT_ENABLED: 'true', GOOGLE_DRIVE_CLIENT_ID: 'test-client', GOOGLE_DRIVE_CLIENT_SECRET: 'secret', ...options.env };
    const auth = { enabled: true, sessionKey: () => 'test-session', sessionActive: session => session === 'test-session' };
    const service = createAutopilot({ store, auth, key, env, ...options });
    return { store, brand, key, env, auth, service, call: (operation, input) => service.execute(operation, input) };
}
const object = (key, etag = 'v1') => ({ key, etag, size: png.length, httpMetadata: { contentType: 'image/png' } });

test('Autopilot is off by default and private entities cannot be forged', async t => {
    const { store, auth, key, brand } = fixture(t);
    const off = createAutopilot({ store, auth, key });
    assert.equal((await off.execute('status')).enabled, false);
    await assert.rejects(off.execute('createSource', { brand_id: brand.id }), { status: 409 });
    for (const entity of ['AutopilotAsset', 'AutopilotSource', 'AutopilotJob']) assert.throws(() => store.execute(entity, 'create', [{}]), /server-only/);
    assert.equal(store.autopilot().assets().length, 0);
});

test('source metadata validates live brand, prefix, and source limits', async t => {
    const { store, brand, call } = fixture(t, { bucket: {} });
    const demo = store.write('Brand', { name: 'Demo', is_demo: true });
    for (const input of [{ brand_id: demo.id, kind: 'drive', folder: 'abc' }, { brand_id: brand.id, kind: 'r2', folder: '../outside/' }, { brand_id: brand.id, kind: 'drive', folder: "x' or true" }]) await assert.rejects(call('createSource', { name: 'Source', ...input }));
    const source = await call('createSource', { brand_id: brand.id, name: 'Drive', kind: 'drive', folder: 'folder_1' });
    assert.equal(source.status, 'disconnected');
    await assert.rejects(call('sync', { id: source.id }), { status: 409 });
});

test('paginated R2 ingestion deduplicates, checkpoints, marks missing only at full scan and preserves file bytes outside SQLite', async t => {
    let round = 1, calls = [];
    const bucket = { list: async input => { calls.push(input); return input.cursor ? { objects: [object('owner/assets/b.png')], truncated: false } : { objects: round === 1 ? [object('owner/assets/a.png')] : [], truncated: round === 1, cursor: round === 1 ? 'page2' : undefined }; } };
    const { store, brand, call } = fixture(t, { bucket });
    const source = await call('createSource', { brand_id: brand.id, kind: 'r2', name: 'Storage', folder: 'assets/' });
    const first = await call('sync', { id: source.id }); assert.equal((await call('sync', { id: source.id })).id, first.id);
    assert.equal((await call('run')).status, 'done');
    assert.equal(store.autopilot().assets().length, 1);
    assert.equal(store.autopilot().source(source.id).cursor, 'page2');
    assert.equal((await call('run')).status, 'done');
    assert.equal(store.autopilot().assets().length, 2);
    assert.equal(calls[0].prefix, 'owner/assets/');
    assert.equal(calls[1].cursor, 'page2');
    assert.equal(store.all('MediaAsset').length, 0);
    round = 2; await call('sync', { id: source.id }); await call('run');
    assert.ok(store.autopilot().assets().every(asset => asset.availability === 'missing'));
});

test('partial failed scans preserve availability and provider secrets never enter public errors', async t => {
    let fail = false;
    const bucket = { list: async () => { if (fail) throw new Error('secret-token-provider-body'); return { objects: [object('owner/assets/a.png')], truncated: false }; } };
    const { store, brand, call } = fixture(t, { bucket });
    const source = await call('createSource', { brand_id: brand.id, name: 'R2', kind: 'r2', folder: 'assets/' });
    await call('sync', { id: source.id }); await call('run'); fail = true;
    await call('sync', { id: source.id }); const result = await call('run');
    assert.equal(result.status, 'failed'); assert.ok(!JSON.stringify(result).includes('secret'));
    assert.equal(store.autopilot().assets()[0].availability, 'available');
});

test('analysis requires consent, validates bytes, caches by version/model, and invalidates review after changes', async t => {
    let version = 'v1', aiCalls = 0;
    const bucket = { list: async () => ({ objects: [object('owner/assets/a.png', version)], truncated: false }), get: async (_key, options) => { assert.equal(options.onlyIf.etagMatches, version); return { body: new Response(png).body, size: png.length }; } };
    const { store, brand, call, key } = fixture(t, { bucket, aiFetch: async (url, options) => { aiCalls++; assert.equal(url, 'https://api.openai.com/v1/chat/completions'); const input = JSON.parse(options.body); assert.equal(input.store, false); assert.match(input.messages[0].content[1].image_url.url, /^data:image\/png;base64,/); return ok({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(analysis) } }] }); } });
    createMetaVault(store, key).save('ai:writing', { provider: 'openai', model: 'vision-fixture', key: 'private-key' });
    const source = await call('createSource', { brand_id: brand.id, name: 'R2', kind: 'r2', folder: 'assets/' });
    await call('sync', { id: source.id }); await call('run');
    const asset = store.autopilot().assets()[0];
    await assert.rejects(call('analyze', { id: asset.id }), { status: 409 });
    await call('analyze', { id: asset.id, confirmed: true }); assert.equal((await call('run')).status, 'done');
    assert.equal(aiCalls, 1); assert.equal(store.autopilot().asset(asset.id).review, 'pending');
    await call('review', { id: asset.id, review: 'approved' });
    assert.equal((await call('analyze', { id: asset.id, confirmed: true })).cached, true); assert.equal(aiCalls, 1);
    version = 'v2'; await call('sync', { id: source.id }); await call('run');
    const changed = store.autopilot().asset(asset.id); assert.equal(changed.analysis, null); assert.equal(changed.review, 'pending');
    await call('disconnect', { id: source.id });
    await assert.rejects(call('analyze', { id: asset.id, confirmed: true }), { status: 409 });
    await call('connect', { id: source.id });
    assert.equal(store.autopilot().source(source.id).status, 'connected');
    assert.equal(store.all('Post').length, 0); assert.equal(store.queuedAttempts().length, 0);
});

test('disconnection during source I/O fences stale jobs and cannot revive assets', async t => {
    let unblock; const wait = new Promise(resolve => { unblock = resolve; });
    const { store, brand, call } = fixture(t, { bucket: { list: async () => { await wait; return { objects: [object('owner/assets/a.png')], truncated: false }; } } });
    const source = await call('createSource', { brand_id: brand.id, name: 'R2', kind: 'r2', folder: 'assets/' });
    await call('sync', { id: source.id }); const pending = call('run');
    await new Promise(resolve => setImmediate(resolve)); await call('disconnect', { id: source.id }); unblock();
    assert.equal((await pending).status, 'failed'); assert.equal(store.autopilot().assets().length, 0);
});

test('durable leases fence late workers and expired AI calls require explicit retry consent', async t => {
    const { store } = fixture(t); const db = store.autopilot();
    const job = db.enqueue('sync', 'source', 'version'); const claimed = db.claim();
    assert.equal(job.id, claimed.id); assert.equal(db.claim(), null);
    const next = db.claim(Date.now() + 120001); assert.notEqual(next.lease, claimed.lease);
    db.finish(claimed); assert.equal(db.jobs()[0].status, 'running'); db.finish(next);
    const ai = db.enqueue('analyze', 'asset', 'version'); db.claim();
    db.claim(Date.now() + 120001); assert.equal(db.jobs().find(job => job.id === ai.id).status, 'failed');
    assert.throws(() => db.retry(ai.id), { status: 409 }); assert.equal(db.retry(ai.id, true).status, 'queued');
});

test('source/job checkpoint survives restart and workspaces cannot read each other', t => {
    const dir = mkdtempSync(join(tmpdir(), 'autopilot-'));
    let store = createStore(join(dir, 'workspace.sqlite'));
    const brand = store.write('Brand', { name: 'Persistent' });
    const source = store.autopilot().createSource({ brand_id: brand.id, kind: 'r2', name: 'source', folder: 'assets/' });
    store.autopilot().enqueue('sync', source.id, 'v1'); store.close();
    store = createStore(join(dir, 'workspace.sqlite')); t.after(() => store.close());
    assert.equal(store.autopilot().sources()[0].id, source.id); assert.equal(store.autopilot().claim().target, source.id);
    const other = createStore(':memory:'); t.after(() => other.close()); assert.throws(() => other.autopilot().source(source.id), { status: 404 });
    t.after(() => rmSync(dir, { recursive: true, force: true }));
});

test('Drive OAuth enforces nonce, single use, session, encrypted offline grant and private folder verification', async t => {
    let providerCalls = 0;
    const { store, brand, service, call, key } = fixture(t, { fetcher: async url => { providerCalls++; return url.includes('/token') ? ok({ access_token: 'private-access', refresh_token: 'private-refresh', expires_in: 3600, scope: DRIVE_SCOPE }) : ok({ id: 'folder_1', mimeType: 'application/vnd.google-apps.folder', trashed: false }); } });
    const source = await call('createSource', { brand_id: brand.id, name: 'Drive', kind: 'drive', folder: 'folder_1' });
    let cookie; const res = { setHeader: (_name, value) => { cookie = value; }, writeHead() {}, end() {} };
    const start = await service.execute('connect', { id: source.id }, {}, res);
    const url = new URL(start.url); assert.equal(url.searchParams.get('scope'), DRIVE_SCOPE); assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    const state = url.searchParams.get('state'), nonceCookie = cookie.split(';')[0];
    assert.ok(!store.readCredential(`autopilot:oauth:${state}`).includes('verifier'));
    await assert.rejects(service.callback({ url: `/api/drive/callback?state=${state}&code=test`, headers: { cookie: 'socialchoice_drive_oauth=' + 'a'.repeat(64) } }, res));
    assert.equal(providerCalls, 0);
    await service.callback({ url: `/api/drive/callback?state=${state}&code=test`, headers: { cookie: nonceCookie } }, res);
    assert.equal(store.autopilot().source(source.id).status, 'connected');
    assert.ok(!store.readCredential(`autopilot:drive:${source.id}:1`).includes('private-access'));
    assert.equal(createMetaVault(store, key).read(`autopilot:drive:${source.id}:1`).refresh_token, 'private-refresh');
    await assert.rejects(service.callback({ url: `/api/drive/callback?state=${state}&code=test`, headers: { cookie: nonceCookie } }, res));
    assert.equal(providerCalls, 2);
});

test('Drive refresh uses fixed endpoints and denies changed folder membership before download', async t => {
    const { store, key } = fixture(t); const vault = createMetaVault(store, key), source = { id: 'source', folder: 'folder_1' }; let calls = [];
    vault.save('autopilot:drive:source:0', { access_token: 'expired', refresh_token: 'refresh-secret', expires: 0 });
    const drive = createDriveProvider({ clientId: 'id', clientSecret: 'secret' }, vault, async (url, options) => { calls.push([url, options]); return url.includes('/token') ? ok({ access_token: 'fresh', expires_in: 3600 }) : url.includes('files?') ? ok({ files: [{ id: 'f', name: 'a.png', mimeType: 'image/png', size: '2', version: '1', modifiedTime: 'time' }] }) : ok({ parents: ['other'], md5Checksum: 'v1' }); });
    assert.equal((await drive.list(source)).files[0].id, 'f');
    assert.equal(calls[0][0], 'https://oauth2.googleapis.com/token'); assert.equal(calls[1][1].headers.Authorization, 'Bearer fresh');
    await assert.rejects(drive.image(source, { external_id: 'f', version: 'v1' }), { status: 409 });
    assert.equal(calls.length, 3);
});

test('bounded reads, R2 prefix isolation and structured analysis validation reject unsafe content', async () => {
    await assert.rejects(boundedBytes(new Response(new Uint8Array(100)), 10), { status: 413 });
    await assert.rejects(createR2Provider({ get() { throw Error('must not call'); } }, 'customer-a/').image({ folder: 'assets/' }, { external_id: 'customer-b/file', version: 'v1' }), { status: 403 });
    assert.throws(() => validateAnalysis({ ...analysis, summary: 'x'.repeat(2001) }));
    assert.throws(() => validateAnalysis({ ...analysis, tags: [123] }));
    assert.throws(() => validateAnalysis({ ...analysis, instructions: 'publish now' }));
});

test('private Gemini relay supports bounded image requests without changing writing limits', async () => {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/fixture:generateContent';
    const req = (purpose, size) => new Request(url, { method: 'POST', headers: { 'x-goog-api-key': 'private', ...(purpose ? { 'x-socialchoice-ai-purpose': purpose } : {}) }, body: 'x'.repeat(size) });
    let calls = 0; const fetcher = async (_url, options) => { calls++; assert.ok(!options.headers['x-socialchoice-ai-purpose']); return ok({}); };
    assert.equal((await forwardGeminiRequest(req(null, 100001), fetcher)).status, 413);
    assert.equal((await forwardGeminiRequest(req('asset-analysis', 120000), fetcher)).status, 200);
    assert.equal((await forwardGeminiRequest(req('asset-analysis', 4300001), fetcher)).status, 413); assert.equal(calls, 1);
});

test('Autopilot HTTP endpoints enforce authentication, browser origin, header and disabled gate', async t => {
    const { server } = createApi({ dbPath: ':memory:', passwordHash: hashPassword('autopilot-test-password') });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}`, headers = { 'Content-Type': 'application/json', 'X-Socialchoice-Client': 'local-ui' }, body = JSON.stringify({ args: [{}] });
    assert.equal((await fetch(url + '/api/autopilot/status', { method: 'POST', headers, body })).status, 401);
    const login = await fetch(url + '/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ args: ['autopilot-test-password'] }) });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.equal((await fetch(url + '/api/autopilot/status', { method: 'POST', headers: { ...headers, cookie, origin: 'https://evil.invalid' }, body })).status, 403);
    assert.equal((await fetch(url + '/api/autopilot/status', { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body })).status, 403);
    const result = await fetch(url + '/api/autopilot/status', { method: 'POST', headers: { ...headers, cookie }, body });
    assert.equal(result.status, 200); assert.equal((await result.json()).enabled, false);
});

test('queue delivery contains only workspace routing and failed dispatch preserves recoverable jobs', async t => {
    let wakes = 0;
    const { store, brand, call } = fixture(t, { bucket: {}, wake: async () => { wakes++; throw Error('private backend detail'); } });
    const source = await call('createSource', { brand_id: brand.id, name: 'R2', kind: 'r2', folder: 'assets/' });
    const result = await call('sync', { id: source.id });
    assert.equal(result.backgroundQueued, false); assert.equal(wakes, 1);
    assert.equal(store.autopilot().jobs()[0].status, 'queued'); assert.ok(!JSON.stringify(result).includes('private backend detail'));
});

test('queue consumer validates workspace routing and acknowledges or delays each message independently', async () => {
    const { consumeAutopilotBatch } = await import('./autopilot-queue.js');
    let calls = 0, ack = 0, retry = 0;
    const namespace = { idFromName: name => name, get: name => ({ runAutopilot: async () => { calls++; assert.equal(name, 'single-admin-workspace'); return { pendingAt: calls === 1 ? Date.now() + 5000 : null }; } }) };
    const message = body => ({ body, ack: () => { ack++; }, retry: options => { retry++; assert.ok(options.delaySeconds >= 1); } });
    await consumeAutopilotBatch({ messages: [message({ v: 1, workspace: '../evil' }), message({ v: 1, workspace: 'owner' }), message({ v: 1, workspace: 'owner' })] }, { SOCIALCHOICE_AUTOPILOT_ENABLED: 'true', WORKSPACE: namespace });
    assert.equal(calls, 2); assert.equal(ack, 2); assert.equal(retry, 1);
});

test('Drive refresh completing after disconnection cannot resurrect removed credentials', async t => {
    const { store, key } = fixture(t); const vault = createMetaVault(store, key), source = { id: 'late-refresh', generation: 1 };
    vault.save('autopilot:drive:late-refresh:1', { access_token: 'expired', refresh_token: 'refresh', expires: 0 });
    let current = true;
    const provider = createDriveProvider({ clientId: 'id', clientSecret: 'secret' }, vault, async () => { current = false; vault.remove('autopilot:drive:late-refresh:1'); return ok({ access_token: 'late-token', expires_in: 3600 }); }, () => current);
    await assert.rejects(provider.list(source), { status: 409 });
    assert.equal(store.readCredential('autopilot:drive:late-refresh:1'), undefined);
});


test('successful sync pages dispatch a new message instead of consuming the delivery retry budget', async () => {
    const { consumeAutopilotBatch } = await import('./autopilot-queue.js');
    let sent = 0, acknowledged = 0;
    const body = { v: 1, workspace: 'owner' };
    await consumeAutopilotBatch({ messages: [{ body, ack: () => { acknowledged++; }, retry: () => assert.fail('completed pages must not retry their message') }] }, {
        SOCIALCHOICE_AUTOPILOT_ENABLED: 'true',
        WORKSPACE: { idFromName: id => id, get: () => ({ runAutopilot: async () => ({ result: { status: 'done' }, pendingAt: Date.now() }) }) },
        AUTOPILOT_QUEUE: { send: async (next, options) => { assert.deepEqual(next, body); assert.equal(options.delaySeconds, 1); sent++; } },
    });
    assert.equal(sent, 1); assert.equal(acknowledged, 1);
});

test('public Drive links validate host/path and preserve resource keys without OAuth', async t => {
    const { parsePublicDriveFolder } = await import('./autopilot-providers.js');
    assert.deepEqual(parsePublicDriveFolder('https://drive.google.com/drive/u/1/folders/public_1?resourcekey=0-key'), { folder:'public_1', resource_key:'0-key', access:'public' });
    for (const link of ['http://drive.google.com/drive/folders/x', 'https://drive.google.com.evil.test/drive/folders/x', 'https://user@drive.google.com/drive/folders/x', 'https://drive.google.com/file/d/x/view', 'https://127.0.0.1/drive/folders/x', 'https://drive.google.com/drive/folders/x?resourcekey=bad%0D%0Akey']) assert.throws(() => parsePublicDriveFolder(link));
    let unavailable = false, calls = [];
    const { call, brand, store } = fixture(t, { env: { SOCIALCHOICE_AUTOPILOT_ENABLED:'true', GOOGLE_DRIVE_PUBLIC_API_KEY:'server-only-key' }, fetcher: async (url, init) => {
        calls.push({url, init}); assert.equal(init.headers.Authorization, undefined); assert.equal(init.headers['X-Goog-Api-Key'], 'server-only-key'); assert.equal(init.redirect, 'error'); assert.equal(new URL(url).hostname, 'www.googleapis.com');
        if (unavailable) return new Response('',{status:404});
        if (new URL(url).pathname.endsWith('/files/public_1')) return ok({id:'public_1',mimeType:'application/vnd.google-apps.folder'});
        return ok({files:[{id:'public-file',name:'test.png',mimeType:'image/png',size:png.length,md5Checksum:'version1',resourceKey:'file-key'}]});
    } });
    const source = await call('createSource',{brand_id:brand.id,kind:'drive_public',name:'Public',folder:'https://drive.google.com/drive/folders/public_1?resourcekey=0-key'});
    assert.equal(source.access,'public');
    assert.equal((await call('connect',{id:source.id})).url,undefined);
    for (let i=0;i<2;i++) { await call('sync',{id:source.id}); assert.equal((await call('run')).status,'done'); }
    assert.equal(store.autopilot().assets().length,1);
    assert.equal(store.autopilot().assets()[0].resource_key,'file-key');
    assert.ok(calls.every(c=>!c.url.includes('server-only-key')));
    assert.ok(calls.some(c=>c.init.headers['X-Goog-Drive-Resource-Keys']==='public_1/0-key'));
    unavailable=true;
    await call('sync',{id:source.id}); assert.equal((await call('run')).status,'failed');
    assert.equal(store.autopilot().assets()[0].availability,'available');
});
test('public Drive image rechecks membership before reading and rejects redirects', async () => {
    const provider=createDriveProvider({apiKey:'key'},null,async (url,init)=>{
        assert.equal(init.headers.Authorization,undefined);
        assert.ok(init.headers['X-Goog-Drive-Resource-Keys'].includes('file1/file-key'));
        return ok({id:'file1',parents:['different-folder'],md5Checksum:'v1'});
    });
    await assert.rejects(provider.image({folder:'public_1',access:'public'}, {external_id:'file1',resource_key:'file-key',version:'v1'}),/Source changed/);
    const redirected=createDriveProvider({apiKey:'key'},null,async()=>new Response(null,{status:302,headers:{Location:'http://127.0.0.1'}}));
    await assert.rejects(redirected.verify({folder:'public_1',access:'public'}),/Public Drive request failed/);
});
