import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from './store.js';
import { createFacebookPublisher } from './facebook-publisher.js';
import { createMetaVault } from './meta-vault.js';
import { recurringTime } from '../src/lib/recurring-dates.js';
import { createServer } from 'node:http';
import { createHttpHandler } from './http-handler.js';

function fixture(path = ':memory:') {
    const store = createStore(path), config = { ready: true, key: randomBytes(32).toString('hex'), appSecret: 'fixture', version: 'v26.0' };
    const brand = store.write('Brand', { name: 'Recurring fixture' }), scopes = ['pages_manage_posts'];
    const accounts = ['123456', '234567'].map((external_id, index) => {
        const credential_id = 'recurring-fixture-' + index;
        createMetaVault(store, config.key).save(credential_id, { token: 'not-a-live-token', scopes, tasks: ['CREATE_CONTENT'] });
        return store.verifiedAccount({ name: 'Page ' + index, platform: 'facebook', account_type: 'page', brand_id: brand.id, external_id, credential_id, scopes, connection_status: 'connected' });
    });
    const post = store.write('Post', { title: 'Evergreen', caption: 'Service introduction', brand_id: brand.id, account_ids: accounts.map(a => a.id), destination_settings: { [accounts[1].id]: { caption: 'Second Page copy', scheduled_at: '2030-01-01T00:00:00.000Z' } } });
    const wakes = [], publisher = createFacebookPublisher(store, config, { wake: async time => { wakes.push(time); } });
    const first = new Date(Math.ceil((Date.now() + 3600000) / 60000) * 60000).toISOString();
    const policy = { first_at: first, frequency: 'biweekly', timezone: 'Asia/Ho_Chi_Minh', limit: 2 };
    return { store, config, post, accounts, publisher, policy, wakes };
}
function settle(store, id, status) {
    // Isolated state-machine fixture; never claims a real platform publication.
    for (const attempt of store.currentAttempts(id)) store.saveAttempt({ ...attempt, status });
    store.publishingWrite('Post', { status }, id);
}
test('calendar months preserve anchor day after February; local fortnight handles DST', () => {
    assert.equal(recurringTime({ first_at: '2026-11-01T06:30:00.000Z', timezone: 'America/New_York', frequency: 'biweekly' }, 0), '2026-11-01T06:30:00.000Z');
    const policy = { first_at: '2028-01-31T02:00:00.000Z', timezone: 'Asia/Ho_Chi_Minh', frequency: 'monthly' };
    assert.equal(recurringTime(policy, 1), '2028-02-29T02:00:00.000Z');
    assert.equal(recurringTime(policy, 2), '2028-03-31T02:00:00.000Z');
    assert.equal(recurringTime({ first_at: '2028-03-01T14:00:00.000Z', timezone: 'America/New_York', frequency: 'biweekly' }, 1), '2028-03-15T13:00:00.000Z');
});
test('missed periods skip forward without using the successful-publication limit', async t => {
    const { store, publisher, post, policy } = fixture();
    try {
        const review = await publisher.recurring.execute('prepare', { post_id: post.id, policy });
        const series = await publisher.recurring.execute('confirm', { id: review.id });
        settle(store, series.current_post_id, 'published');
        t.mock.method(Date, 'now', () => Date.parse(policy.first_at) + 50 * 86400000);
        publisher.recurring.run(); publisher.recurring.run();
        const next = store.recurringPosts.get(series.id);
        assert.equal(next.index, 4); assert.equal(next.completed, 1); assert.equal(next.skipped, 3); assert.equal(next.status, 'active');
        assert.equal(store.all('Post').length, 3);
    } finally { publisher.close(); store.close(); }
});
test('the actual due runner claims and completes each fixture destination once before creating the next occurrence', async t => {
    const { store, publisher, post, policy } = fixture(); let calls = 0;
    try {
        const review = await publisher.recurring.execute('prepare', { post_id: post.id, policy });
        const series = await publisher.recurring.execute('confirm', { id: review.id });
        t.mock.method(Date, 'now', () => Date.parse(policy.first_at) + 100);
        t.mock.method(globalThis, 'fetch', async (url, init) => {
            assert.equal(init.method, 'POST'); assert.equal(url.hostname, 'graph.facebook.com'); calls++;
            return Response.json({ id: `${url.pathname.split('/')[2]}_98765` });
        });
        await publisher.runPhotos(); await publisher.runPhotos();
        assert.equal(calls, 2); assert.equal(store.recurringPosts.get(series.id).completed, 1);
        assert.equal(store.get('Post', series.current_post_id).status, 'published');
        assert.equal(store.queuedAttempts().length, 2); assert.equal(store.all('Post').length, 3);
    } finally { publisher.close(); store.close(); }
});
test('review rolls back temporary drafts; consent atomically queues all accounts and replay is idempotent', async () => {
    const { store, publisher, post, policy, accounts } = fixture();
    try {
        const review = await publisher.recurring.execute('prepare', { post_id: post.id, policy });
        assert.equal(store.all('Post').length, 1); assert.equal(store.all('PublishJob').length, 0); assert.equal(store.queuedAttempts().length, 0);
        assert.equal(review.preview.length, 2); assert.equal(review.preview[1].caption, 'Second Page copy');
        const series = await publisher.recurring.execute('confirm', { id: review.id });
        assert.equal(store.all('Post').length, 2); assert.equal(store.queuedAttempts().length, 2);
        assert.ok(store.queuedAttempts().every(a => a.scheduledFor === Date.parse(policy.first_at)));
        assert.equal(store.get('Post', post.id).status, 'draft');
        assert.equal(store.get('Post', series.current_post_id).destination_settings[accounts[1].id].scheduled_at, undefined);
        await publisher.recurring.execute('confirm', { id: review.id }); assert.equal(store.all('Post').length, 2);
        settle(store, series.current_post_id, 'published'); publisher.recurring.run(); publisher.recurring.run();
        const next = store.recurringPosts.get(series.id);
        assert.equal(next.completed, 1); assert.equal(next.occurrences.length, 2); assert.equal(store.all('Post').length, 3);
        settle(store, next.current_post_id, 'published'); publisher.recurring.run();
        assert.equal(store.recurringPosts.get(series.id).status, 'completed'); assert.equal(store.recurringPosts.get(series.id).completed, 2);
    } finally { publisher.close(); store.close(); }
});
test('changed source rejects review; later edits, revoked access and uncertain deliveries pause without resend', async () => {
    for (const change of ['source', 'access', 'unknown']) {
        const { store, publisher, post, policy, accounts } = fixture();
        try {
            const review = await publisher.recurring.execute('prepare', { post_id: post.id, policy });
            store.write('Post', { caption: 'Changed' }, post.id);
            await assert.rejects(publisher.recurring.execute('confirm', { id: review.id }), /changed/);
            assert.equal(store.all('Post').length, 1);
            const fresh = await publisher.recurring.execute('prepare', { post_id: post.id, policy });
            const active = await publisher.recurring.execute('confirm', { id: fresh.id });
            if (change === 'source') store.write('Post', { caption: 'Changed again' }, post.id);
            if (change === 'access') store.verifiedAccount({ connection_status: 'disconnected' }, accounts[0].id);
            if (change === 'unknown') settle(store, active.current_post_id, 'unknown');
            publisher.recurring.run(); publisher.recurring.run();
            assert.equal(store.recurringPosts.get(active.id).status, 'paused'); assert.equal(store.queuedAttempts().length, 0); assert.equal(store.all('Post').length, 2);
        } finally { publisher.close(); store.close(); }
    }
});
test('pause cancels queued children; stopping cannot cancel an already claimed operation', async () => {
    const { store, publisher, post, policy } = fixture();
    try {
        const review = await publisher.recurring.execute('prepare', { post_id: post.id, policy });
        const series = await publisher.recurring.execute('confirm', { id: review.id });
        const [started] = store.currentAttempts(series.current_post_id); store.saveAttempt({ ...started, status: 'processing', startedAt: Date.now() });
        await publisher.recurring.execute('pause', { id: series.id });
        assert.equal(store.attempt(started.id).status, 'processing'); assert.equal(store.queuedAttempts().length, 0);
        await publisher.recurring.execute('stop', { id: series.id }); assert.equal(store.recurringPosts.get(series.id).status, 'stopped');
        publisher.recurring.run(); assert.equal(store.all('Post').length, 2);
    } finally { publisher.close(); store.close(); }
});
test('active sources cannot be deleted; unchanged account sync timestamps do not invalidate approval', async () => {
    const { store, publisher, post, policy, accounts } = fixture();
    try {
        const review = await publisher.recurring.execute('prepare', { post_id: post.id, policy });
        const series = await publisher.recurring.execute('confirm', { id: review.id });
        assert.throws(() => store.remove('Post', post.id), /Pause or stop/);
        store.verifiedAccount({ last_synced_at: new Date(Date.now() + 1000).toISOString() }, accounts[0].id);
        publisher.recurring.run(); assert.equal(store.recurringPosts.get(series.id).status, 'active');
        await publisher.recurring.execute('pause', { id: series.id });
        assert.equal(store.remove('Post', post.id).deleted, 1); assert.equal(store.queuedAttempts().length, 0);
    } finally { publisher.close(); store.close(); }
});
test('restart preserves series and its single pending occurrence; workspace IDs cannot be reused', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'recurring-posts-')), path = join(directory, 'test.sqlite');
    let f = fixture(path);
    try {
        const review = await f.publisher.recurring.execute('prepare', { post_id: f.post.id, policy: f.policy });
        const series = await f.publisher.recurring.execute('confirm', { id: review.id });
        f.publisher.close(); f.store.close();
        const store = createStore(path), wakes = [], publisher = createFacebookPublisher(store, f.config, { wake: async time => { wakes.push(time); } });
        f = { ...f, store, publisher };
        await publisher.resumePhotos(); publisher.recurring.run();
        assert.equal(store.all('Post').length, 2); assert.equal(store.recurringPosts.get(series.id).status, 'active'); assert.ok(wakes.length);
        const other = fixture();
        try { await assert.rejects(other.publisher.recurring.execute('confirm', { id: series.id }), /not found/); } finally { other.publisher.close(); other.store.close(); }
    } finally { f.publisher.close(); f.store.close(); rmSync(directory, { recursive: true, force: true }); }
});
test('recurring HTTP routes enforce application origin and expose review/confirm/pause without implicit publishing', async () => {
    const f = fixture();
    const handler = createHttpHandler({ store: f.store, publisher: f.publisher, auth: { require() {} }, metaSettings: f.config, frontendPort: 5173, allowedHosts: ['127.0.0.1'] });
    const server = createServer(handler); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = (operation, input, headers = {}) => fetch(base + '/api/recurring/' + operation, { method: 'POST', headers: { 'content-type': 'application/json', 'x-socialchoice-client': 'local-ui', ...headers }, body: JSON.stringify({ args: [input] }) });
    try {
        const input = { post_id: f.post.id, policy: f.policy };
        assert.equal((await request('prepare', input, { origin: 'https://evil.example' })).status, 403);
        const reviewResponse = await request('prepare', input); assert.equal(reviewResponse.status, 200);
        const review = await reviewResponse.json(); assert.equal(f.store.queuedAttempts().length, 0);
        assert.equal((await request('confirm', { id: review.id })).status, 200); assert.equal(f.store.queuedAttempts().length, 2);
        assert.equal((await request('pause', { id: review.id })).status, 200); assert.equal(f.store.queuedAttempts().length, 0);
        const list = await (await request('list', { post_id: f.post.id })).json(); assert.equal(list.series[0].status, 'paused');
    } finally { await new Promise(resolve => server.close(resolve)); f.publisher.close(); f.store.close(); }
});
