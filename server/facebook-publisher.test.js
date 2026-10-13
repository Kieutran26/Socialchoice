import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from './store.js';
import { createMetaVault } from './meta-vault.js';
import { createFacebookPublisher } from './facebook-publisher.js';
import { savePostPlan } from './post-plans.js';

// Isolated store fixtures only. No simulated Graph success or Facebook request.
function fixture(store) {
    const config = { ready: true, key: randomBytes(32).toString('hex'), appSecret: 'unit-test-only', version: 'v26.0' };
    const brand = store.write('Brand', { name: 'Test fixture' });
    const scopes = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'];
    createMetaVault(store, config.key).save('test-credential', { token: 'test-only-not-a-Meta-token', scopes, tasks: ['CREATE_CONTENT'] });
    const account = store.verifiedAccount({ name: 'Fixture Page', external_id: '123456', platform: 'facebook', account_type: 'page', brand_id: brand.id, scopes, credential_id: 'test-credential', connection_status: 'connected' });
    const post = store.write('Post', { title: 'Fixture draft', caption: 'Nội dung nguyên bản', platform_captions: { facebook: 'Nội dung được xác nhận\nDòng thứ hai' }, brand_id: brand.id, account_ids: [account.id] });
    return { config, account, post, publisher: createFacebookPublisher(store, config) };
}

test('review uses exact Facebook caption and never returns credentials or creates a published record', () => {
    const store = createStore(':memory:');
    try {
        const { publisher, post } = fixture(store);
        const review = publisher.prepare(post.id);
        assert.equal(review.caption, post.platform_captions.facebook);
        assert.equal(review.pageId, '123456');
        assert.equal(review.status, 'prepared');
        assert.equal(JSON.stringify(review).includes('test-credential'), false);
        assert.equal(JSON.stringify(review).includes('Meta-token'), false);
        assert.equal(store.all('PublishJob').length, 0);
        assert.equal(store.get('Post', post.id).status, 'draft');
        assert.throws(() => store.execute('PublishAttempt', 'list', []), /server-only/);
        const replacement = publisher.prepare(post.id);
        assert.notEqual(replacement.attemptId, review.attemptId);
        assert.throws(() => publisher.status(review.attemptId), /not found/);
        store.remove('Post', post.id);
        assert.throws(() => publisher.status(replacement.attemptId), /not found/);
    } finally { store.close(); }
});

test('changed caption, expiry, revoked credential and missing publish permission fail before network I/O', async () => {
    const store = createStore(':memory:');
    try {
        const { publisher, post, account } = fixture(store);
        let review = publisher.prepare(post.id);
        store.write('Post', { caption: 'Changed after review' }, post.id);
        await assert.rejects(() => publisher.publish(review.attemptId), /changed/);
        review = publisher.prepare(post.id);
        store.saveAttempt({ ...store.attempt(review.attemptId), expiresAt: 0 });
        await assert.rejects(() => publisher.publish(review.attemptId), /expired/);
        review = publisher.prepare(post.id);
        store.deleteCredential(account.credential_id);
        await assert.rejects(() => publisher.publish(review.attemptId), /credential unavailable/);
        store.verifiedAccount({ scopes: ['pages_show_list'] }, account.id);
        assert.throws(() => publisher.prepare(post.id));
        assert.equal(store.all('PublishJob').length, 0);
    } finally { store.close(); }
});

test('duplicate Pages are rejected and a real connected destination is required', () => {
    const store = createStore(':memory:');
    try {
        const { publisher, post, account } = fixture(store);
        store.write('Post', { account_ids: [account.id, account.id] }, post.id);
        assert.throws(() => publisher.prepare(post.id), /different Facebook Pages/);
        store.write('Post', { account_ids: [account.id] }, post.id);
        store.verifiedAccount({ connection_status: 'expired' }, account.id);
        assert.throws(() => publisher.prepare(post.id), /Connect a Facebook/);
        assert.equal(store.get('Post', post.id).status, 'draft');
    } finally { store.close(); }
});

test('interrupted durable attempt survives restart, cannot resend or lose execution history', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'socialchoice-publish-'));
    const path = join(directory, 'test.sqlite');
    let store = createStore(path);
    try {
        const { config, publisher, post, account } = fixture(store);
        const review = publisher.prepare(post.id);
        // Model an interrupted persisted claim, without contacting or pretending to be Meta.
        store.transaction(() => {
            const job = store.publishingWrite('PublishJob', { post_id: post.id, social_account_id: account.id, brand_id: post.brand_id, status: 'processing', attempts: 1 });
            const variant = store.publishingWrite('PostVariant', { post_id: post.id, caption: review.caption, status: 'processing' });
            store.saveAttempt({ ...store.attempt(review.attemptId), status: 'processing', startedAt: 0, jobId: job.id, variantId: variant.id });
            store.publishingWrite('Post', { status: 'processing' }, post.id);
        });
        store.close(); store = createStore(path);
        const reopened = createFacebookPublisher(store, config);
        const results = await Promise.all([reopened.publish(review.attemptId), reopened.publish(review.attemptId)]);
        assert.ok(results.every(result => result.status === 'unknown'));
        assert.equal(reopened.status(post.id).status, 'unknown');
        assert.equal(store.get('Post', post.id).status, 'unknown');
        assert.equal(store.all('PublishJob').length, 1);
        assert.equal(store.all('PublishingLog').length, 1);
        assert.equal(store.all('PublishJob')[0].external_post_id, undefined);
        assert.throws(() => store.write('Post', { status: 'draft' }, post.id), /history/);
        assert.throws(() => savePostPlan(store, { id: post.id, data: { status: 'draft' } }), /history/);
        assert.throws(() => store.remove('PublishJob', store.all('PublishJob')[0].id), /history/);
        assert.throws(() => store.write('PostVariant', { caption: 'tampered' }, store.all('PostVariant')[0].id), /history/);
        assert.throws(() => reopened.prepare(post.id), /already has/);
    } finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});
