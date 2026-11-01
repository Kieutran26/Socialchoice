import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createStore } from './store.js';
import { createAutopilot } from './autopilot.js';
import { createMetaVault } from './meta-vault.js';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=', 'base64');
async function fixture(t, options = {}) {
    const store = createStore(':memory:'); t.after(() => store.close());
    const key = randomBytes(32).toString('hex'), brand = store.write('Brand', { name: 'Asset draft fixture' });
    let calls = 0, reads = 0, version = 'v1';
    const bucket = { list: async () => ({ objects: [{ key: 'owner/assets/test.png', etag: version, size: png.length, httpMetadata: { contentType: 'image/png' } }], truncated: false }), get: async (_key, input) => { reads++; assert.equal(input.onlyIf.etagMatches, version); await options.onRead?.(); return { body: new Response(png).body, size: png.length }; } };
    const fetcher = async (url, input) => { calls++; assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions'); const data = JSON.parse(input.body); assert.equal(data.provider.allow_fallbacks, false); assert.match(data.messages[0].content, /approved_image/); assert.ok(!input.body.includes('data:image')); await options.onAi?.(); return options.failure ? new Response('', { status: 402 }) : Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'Caption fixture #test' } }] }); };
    const service = createAutopilot({ store, auth: { enabled: true }, key, bucket, aiFetch: fetcher, env: { SOCIALCHOICE_AUTOPILOT_ENABLED: 'true' } });
    const call = (op, input) => service.execute(op, input);
    createMetaVault(store, key).save('ai:writing', { provider: 'openrouter', model: 'google/fixture', key: 'private-fixture-key' });
    const source = await call('createSource', { brand_id: brand.id, kind: 'r2', name: 'Fixture', folder: 'assets/' });
    await call('sync', { id: source.id }); await call('run');
    let asset = store.autopilot().assets()[0];
    asset = store.autopilot().saveAsset({ ...asset, analysis_status: 'analyzed', review: 'approved', analysis_key: 'fixture-v1', analysis: { summary: 'Synthetic test image', ocr: 'TEST', tags: ['fixture'], warnings: ['Not a real promotion'], suggested_uses: [] } });
    const input = () => ({ id: asset.id, request_id: randomUUID(), goal: 'Introduce a test design', tone: 'Friendly', brief: 'Not a real offer', cta: 'Leave feedback', language: 'vi', confirmed: true });
    return { store, source, asset, call, input, counts: () => ({ calls, reads }), change: value => { version = value; } };
}
test('asset drafts require consent and approved live analysis, use only server facts, and dedupe paid requests', async t => {
    const f = await fixture(t);
    await assert.rejects(f.call('generateDraft', { ...f.input(), confirmed: false }), { status: 409 });
    f.store.autopilot().saveAsset({ ...f.asset, review: 'pending' });
    await assert.rejects(f.call('generateDraft', f.input()), { status: 409 });
    assert.equal(f.counts().calls, 0);
    f.store.autopilot().saveAsset(f.asset);
    const input = f.input(), draft = await f.call('generateDraft', input);
    assert.equal(draft.status, 'ready'); assert.equal(draft.text, 'Caption fixture #test');
    assert.equal((await f.call('generateDraft', input)).id, draft.id);
    await assert.rejects(f.call('generateDraft', { ...input, goal: 'Different' }), { status: 409 });
    assert.deepEqual(f.counts(), { calls: 1, reads: 0 });
    assert.equal(f.store.all('Post').length, 0); assert.equal(f.store.all('MediaAsset').length, 0);
});
test('saving creates exactly one private image and editable unscheduled draft, with no delivery side effects', async t => {
    const f = await fixture(t), draft = await f.call('generateDraft', f.input());
    const input = { id: draft.id, title: 'Human title', caption: 'Human edited caption', status: 'published', scheduled_at: '2030-01-01T00:00:00Z' };
    const saved = await f.call('saveAssetDraft', input), again = await f.call('saveAssetDraft', input);
    assert.equal(saved.post_id, again.post_id);
    const post = f.store.get('Post', saved.post_id), media = f.store.get('MediaAsset', post.media_ids[0]);
    assert.equal(post.caption, input.caption); assert.equal(post.status, 'draft'); assert.equal(post.scheduled_at, null); assert.deepEqual(post.account_ids, []);
    assert.equal(media.brand_id, f.asset.brand_id); assert.match(media.file_url, /^\/api\/media\/files\//);
    assert.deepEqual(f.store.images.read(media.storage_id), png);
    assert.equal(f.store.all('Post').length, 1); assert.equal(f.store.all('MediaAsset').length, 1);
    assert.equal(f.store.all('PublishJob').length, 0); assert.equal(f.store.queuedAttempts().length, 0);
});
test('version/approval changes after generation block image import and saving', async t => {
    const f = await fixture(t), draft = await f.call('generateDraft', f.input());
    f.store.autopilot().saveAsset({ ...f.asset, analysis_revision: 2 });
    await assert.rejects(f.call('saveAssetDraft', { id: draft.id, title: 'Title', caption: 'Caption' }), { status: 409 });
    assert.equal(f.counts().reads, 0); assert.equal(f.store.all('Post').length, 0);
});
test('changes during AI generation discard its result and never retry automatically', async t => {
    let f;
    f = await fixture(t, { onAi: () => f.store.autopilot().saveAsset({ ...f.asset, review: 'rejected' }) });
    const input = f.input(); await assert.rejects(f.call('generateDraft', input), { status: 409 });
    assert.equal(f.store.autopilot().draft(input.request_id).status, 'failed');
    assert.equal(f.counts().calls, 1); assert.equal(f.store.all('Post').length, 0);
});
test('changes during image read fence the final transaction', async t => {
    let f;
    f = await fixture(t, { onRead: () => f.store.autopilot().saveSource({ ...f.source, generation: f.source.generation + 1 }) });
    const draft = await f.call('generateDraft', f.input());
    await assert.rejects(f.call('saveAssetDraft', { id: draft.id, title: 'Title', caption: 'Caption' }), { status: 409 });
    assert.equal(f.store.all('MediaAsset').length, 0); assert.equal(f.store.all('Post').length, 0);
});
test('provider failure is not resubmitted by the same request ID and no secret enters saved draft history', async t => {
    const f = await fixture(t, { failure: true }), input = f.input();
    await assert.rejects(f.call('generateDraft', input));
    await assert.rejects(f.call('generateDraft', input), { status: 409 });
    assert.equal(f.counts().calls, 1); assert.ok(!JSON.stringify(f.store.autopilot().drafts()).includes('private-fixture-key'));
});
test('foreign IDs and generic entity writes cannot access private asset drafts', async t => {
    const f = await fixture(t);
    await assert.rejects(f.call('generateDraft', { ...f.input(), id: randomUUID() }), { status: 404 });
    await assert.rejects(f.call('saveAssetDraft', { id: randomUUID(), title: 'X', caption: 'Y' }), { status: 404 });
    assert.throws(() => f.store.execute('AutopilotDraft', 'create', [{}]));
    assert.equal(f.counts().calls, 0);
});

test('two workspace stores cannot reuse another workspace asset or draft ticket', async t => {
 const a=await fixture(t), b=await fixture(t), draft=await a.call('generateDraft',a.input());
 await assert.rejects(b.call('generateDraft',{...b.input(),id:a.asset.id}),{status:404});
 await assert.rejects(b.call('saveAssetDraft',{id:draft.id,title:'Forged',caption:'Forged'}),{status:404});
 assert.equal(b.store.autopilot().drafts().length,0);assert.equal(b.store.all('Post').length,0);assert.equal(b.counts().calls,0);
});
