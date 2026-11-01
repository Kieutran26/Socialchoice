import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createStore } from './store.js';
import { createPostizConnection } from './postiz-connection.js';
import { createPostizClient, postizConfig } from './postiz-client.js';
import { createFacebookPublisher } from './facebook-publisher.js';

// Isolated transport fixtures. Never send a real post or use a live API key.
async function fixture(t, overrides = {}) {
    const store = createStore(':memory:'); t.after(() => store.close());
    const config = { ready: true, base: 'http://localhost:4007/api/public/v1', key: 'test-only-key', encryptionKey: randomBytes(32).toString('hex') };
    const brand = store.write('Brand', { name: 'Postiz contract test' });
    const connection = createPostizConnection(store, config, async () => Response.json([{ id: 'postiz-channel', name: 'Test Page', identifier: 'facebook', disabled: false }]));
    await connection.execute('import', null, null, [brand.id, ['postiz-channel']]);
    const account = store.all('SocialAccount')[0];
    const post = store.write('Post', { title: 'Test draft', caption: 'Exact reviewed caption', brand_id: brand.id, account_ids: [account.id] });
    const client = { channels: async () => [{ id: 'postiz-channel', disabled: false }], create: async () => [{ postId: 'remote-job', integration: 'postiz-channel' }], posts: async () => [], ...overrides };
    const publisher = createFacebookPublisher(store, { ready: false }, { postizConfig: config, postizClient: client, wake: async () => {} });
    t.after(() => publisher.close());
    return { store, config, brand, account, post, connection, publisher, client };
}

test('Postiz import isolates brands, deduplicates channels and protects provider metadata', async t => {
    const { store, brand, account, connection } = await fixture(t);
    await connection.execute('import', null, null, [brand.id, ['postiz-channel']]);
    assert.equal(store.all('SocialAccount').length, 1);
    assert.equal(account.connection_provider, 'postiz');
    assert.throws(() => store.write('SocialAccount', { connection_provider: 'postiz', name: 'Forged' }), /server-owned/);
    await assert.rejects(connection.execute('import', null, null, [brand.id, ['unlisted']]), /returned by Postiz/);
    const demo = store.write('Brand', { name: 'Demo', is_demo: true });
    await assert.rejects(connection.execute('import', null, null, [demo.id, ['postiz-channel']]), /active live brand/);
    assert.equal(JSON.stringify(account).includes('test-only-key'), false);
});

test('Postiz acceptance remains processing until the matching remote publication is confirmed', async t => {
    let calls = 0, payload;
    const f = await fixture(t, { create: async body => { calls++; payload = body; return [{ postId: 'remote-job', integration: 'postiz-channel' }]; } });
    const review = f.publisher.prepare(f.post.id);
    assert.equal(review.caption, 'Exact reviewed caption');
    await f.publisher.publish(review.attemptId);
    await f.publisher.runPhotos();
    assert.equal(calls, 1);
    assert.equal(payload.posts[0].integration.id, 'postiz-channel');
    assert.equal(f.store.get('Post', f.post.id).status, 'processing');
    const attempt = f.store.attempt(review.attemptId);
    f.store.saveAttempt({ ...attempt, postizNextCheck: 0 });
    f.client.posts = async () => [{ id: 'remote-job', integration: { id: 'postiz-channel' }, state: 'PUBLISHED', releaseId: 'page_post', releaseURL: 'https://www.facebook.com/page/posts/post' }];
    await f.publisher.runPhotos();
    assert.equal(f.store.get('Post', f.post.id).status, 'published');
    assert.equal(calls, 1);
});

test('ambiguous Postiz writes are never resent and stale approvals fail before transport', async t => {
    let calls = 0;
    const f = await fixture(t, { create: async () => { calls++; throw new Error('timeout'); } });
    const stale = f.publisher.prepare(f.post.id);
    f.store.write('Post', { caption: 'Changed' }, f.post.id);
    await assert.rejects(f.publisher.publish(stale.attemptId), /changed/);
    assert.equal(calls, 0);
    const review = f.publisher.prepare(f.post.id);
    await f.publisher.publish(review.attemptId); await f.publisher.runPhotos(); await f.publisher.runPhotos();
    assert.equal(calls, 1);
    assert.equal(f.store.get('Post', f.post.id).status, 'unknown');
});

test('Postiz schedules preserve existing review and cancellation without remote writes', async t => {
    let calls = 0;
    const f = await fixture(t, { create: async () => { calls++; throw new Error('must not run'); } });
    const review = f.publisher.prepareSchedule(f.post.id, new Date(Date.now() + 3600000).toISOString(), 'Asia/Ho_Chi_Minh');
    await f.publisher.schedule(review.attemptId);
    assert.equal(f.store.get('Post', f.post.id).status, 'scheduled');
    await f.publisher.runPhotos();
    assert.equal(calls, 0);
    await f.publisher.cancelSchedule(f.post.id);
    assert.equal(f.store.get('Post', f.post.id).status, 'draft');
});

test('Postiz configuration is opt-in and credentials never follow redirects or appear in errors', async () => {
    assert.deepEqual(postizConfig({}), { ready: false });
    assert.throws(() => postizConfig({ SOCIALCHOICE_POSTIZ_ENABLED: 'true', SOCIALCHOICE_POSTIZ_URL: 'http://external.example/api' }), /HTTPS/);
    const client = createPostizClient({ ready: true, base: 'https://postiz.example/api', key: 'private-test-value' }, async (_url, options) => { assert.equal(options.redirect, 'error'); assert.equal(options.headers.Authorization, 'private-test-value'); return new Response('private-test-value', { status: 401 }); });
    await assert.rejects(client.channels(), error => !error.message.includes('private-test-value') && error.message.includes('rejected'));
});

test('pre-submission failures are retryable and authorization guards prevent provider calls', async t => {
    let creates = 0;
    const f = await fixture(t, { channels: async () => { throw new Error('offline'); }, create: async () => { creates++; } });
    const review = f.publisher.prepare(f.post.id);
    await f.publisher.publish(review.attemptId); await f.publisher.runPhotos();
    assert.equal(f.store.get('Post', f.post.id).status, 'failed');
    assert.equal(creates, 0);
    const guarded = createFacebookPublisher(f.store, { ready: false }, { postizConfig: f.config, postizClient: f.client, authorize: async () => { throw new Error('license denied'); }, wake: async () => {} });
    t.after(() => guarded.close());
    const retry = guarded.prepareRetry(f.post.id, f.account.id);
    await guarded.publish(retry.attemptId || retry.reviewId);
    await guarded.runPhotos();
    assert.equal(creates, 0);
});

test('concurrent polling uses an operation lease and cannot downgrade an active request', async t => {
    let release, entered;
    const polling = new Promise(resolve => { entered = resolve; });
    const f = await fixture(t, { posts: () => { entered(); return new Promise(resolve => { release = resolve; }); } });
    const review = f.publisher.prepare(f.post.id);
    await f.publisher.publish(review.attemptId);
    const saved = f.store.attempt(review.attemptId);
    f.store.saveAttempt({ ...saved, startedAt: Date.now() - 120000 });
    const first = f.publisher.runPhotos();
    await polling;
    await f.publisher.runPhotos();
    assert.equal(f.store.get('Post', f.post.id).status, 'processing');
    release([]); await first;
    assert.equal(f.store.get('Post', f.post.id).status, 'processing');
});

test('stored media bytes use Postiz uploads and never the native Facebook delivery path', async t => {
    let uploads = 0, sent;
    const f = await fixture(t, { upload: async (asset, bytes) => { uploads++; assert.equal(asset.mime_type, 'image/png'); assert.ok(bytes.length); return { id: 'uploaded', path: 'http://localhost:4007/uploads/image.png' }; }, create: async body => { sent = body; return [{ postId: 'remote-job', integration: 'postiz-channel' }]; } });
    const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=', 'base64');
    const asset = f.store.images.upload(f.brand.id, 'image.png', 'image/png', bytes);
    f.store.write('Post', { media_ids: [asset.id] }, f.post.id);
    const review = f.publisher.prepare(f.post.id);
    await f.publisher.publish(review.attemptId); await f.publisher.runPhotos();
    assert.equal(uploads, 1);
    assert.equal(sent.posts[0].value[0].image[0].id, 'uploaded');
    assert.equal(f.store.get('Post', f.post.id).status, 'processing');
});

test('restart recovery polls an accepted request and never recreates an ambiguous submission', async t => {
    let creates = 0;
    const f = await fixture(t, { create: async () => { creates++; return [{ postId: 'remote-job', integration: 'postiz-channel' }]; } });
    const review = f.publisher.prepare(f.post.id);
    await f.publisher.publish(review.attemptId); await f.publisher.runPhotos();
    const attempt = f.store.attempt(review.attemptId);
    f.store.saveAttempt({ ...attempt, busy: true, postizBusyAt: Date.now() - 61000, postizNextCheck: 0 });
    await f.publisher.runPhotos(); await f.publisher.runPhotos();
    assert.equal(creates, 1);
    assert.equal(f.store.get('Post', f.post.id).status, 'processing');
    f.store.saveAttempt({ ...f.store.attempt(review.attemptId), postizId: undefined, postizSubmitted: true, busy: false, postizNextCheck: 0 });
    await f.publisher.runPhotos();
    assert.equal(creates, 1);
    assert.equal(f.store.get('Post', f.post.id).status, 'unknown');
});

test('disconnect during a media upload prevents the subsequent remote create', async t => {
    let creates = 0;
    const f = await fixture(t, { create: async () => { creates++; }, upload: async () => { await f.connection.execute('disconnect', null, null, [f.account.id]); return { id: 'uploaded', path: 'http://localhost:4007/uploads/image.png' }; } });
    const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=', 'base64');
    const asset = f.store.images.upload(f.brand.id, 'image.png', 'image/png', bytes);
    f.store.write('Post', { media_ids: [asset.id] }, f.post.id);
    const review = f.publisher.prepare(f.post.id);
    await f.publisher.publish(review.attemptId); await f.publisher.runPhotos();
    assert.equal(creates, 0);
    assert.equal(f.store.get('Post', f.post.id).status, 'failed');
});
