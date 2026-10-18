import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createStore } from './store.js';
import { createMetaVault } from './meta-vault.js';
import { createFacebookPublisher } from './facebook-publisher.js';
import { savePostPlan } from './post-plans.js';

// Isolated approval/queue fixtures: never contact providers or claim live publication.
const future = () => new Date(Date.now() + 600000).toISOString();
function fixture() {
    const store = createStore(':memory:');
    const config = { ready: true, key: randomBytes(32).toString('hex'), appSecret: 'fixture', mediaOrigin: 'https://backend.example' };
    const brand = store.write('Brand', { name: 'Mixed channels fixture' });
    const vault = createMetaVault(store, config.key);
    const permissions = { facebook: ['pages_manage_posts'], instagram: ['instagram_basic', 'instagram_content_publish'],
        threads: ['threads_basic', 'threads_content_publish'], tiktok: ['user.info.basic', 'video.publish'], linkedin: ['openid', 'profile', 'w_member_social'] };
    const accounts = Object.entries(permissions).map(([platform, scopes]) => {
        const credential_id = `fixture-${platform}`;
        // Same external ID across providers must be allowed.
        vault.save(credential_id, { platform, profileId: '123', pageId: '456', token: 'not-live', refreshToken: 'not-live',
            scopes, tasks: ['CREATE_CONTENT'], expiresAt: Date.now() + 3600000, refreshExpiresAt: Date.now() + 86400000 });
        return store.verifiedAccount({ name: platform, platform, scopes, account_type: platform === 'facebook' ? 'page' : 'profile',
            external_id: '123', credential_id, brand_id: brand.id, connection_status: 'connected' });
    });
    const bytes = readFileSync(new URL('./fixtures/socialchoice-test-video.mp4', import.meta.url));
    const upload = store.videos.start({ brandId: brand.id, name: 'fixture.mp4', type: 'video/mp4', size: bytes.length });
    store.videos.append(upload.uploadId, 0, bytes);
    const media = store.videos.complete(upload.uploadId);
    const options = { privacy: 'SELF_ONLY', allowComment: false, allowDuet: false, allowStitch: false, commercial: false,
        ownBrand: false, brandedContent: false, aiGenerated: false, musicConsent: true };
    const tiktok = accounts.find(a => a.platform === 'tiktok');
    const creators = new Map([[tiktok.id, { privacy: ['SELF_ONLY'], maxDuration: 600, credentialId: tiktok.credential_id, expires: Date.now() + 300000 }]]);
    const post = savePostPlan(store, { data: { title: 'Five channels', caption: 'Shared content', brand_id: brand.id, status: 'draft',
        account_ids: accounts.map(a => a.id), media_ids: [media.id], platform_captions: { threads: 'Threads short', linkedin: 'LinkedIn content' },
        destination_settings: { [accounts[4].id]: { caption: 'Exact account override', scheduled_at: future() }, [tiktok.id]: { tiktok: options } } } });
    const publisher = createFacebookPublisher(store, config, { threadsConfig: config, linkedinConfig: config, tiktokConfig: config, tiktokCreators: creators, wake: async () => {} });
    return { store, config, accounts, post, publisher, close() { publisher.close(); store.close(); } };
}

test('five platforms share one immutable schedule, exact captions/media and repeat-safe approval', async () => {
    const f = fixture();
    try {
        const post = f.store.get('Post', f.post.id);
        assert.equal(post.platform_captions.threads, 'Threads short');
        const review = f.publisher.prepareSchedule(post.id, future(), 'Asia/Ho_Chi_Minh');
        assert.deepEqual(review.items.map(item => item.platform), ['facebook', 'instagram', 'threads', 'tiktok', 'linkedin']);
        assert.deepEqual(review.items.map(item => item.caption), ['Shared content', 'Shared content', 'Threads short', 'Shared content', 'Exact account override']);
        for (const item of review.items) assert.deepEqual(item.media.map(asset => asset.id), post.media_ids);
        assert.equal(JSON.stringify(review).includes('not-live'), false);
        assert.equal(f.store.queuedAttempts().length, 0);
        await f.publisher.schedule(review.attemptId);
        await f.publisher.schedule(review.attemptId);
        assert.equal(f.store.all('PublishJob').length, 5);
        assert.equal(f.publisher.status(post.id).items.length, 5);
        assert.equal(f.store.all('PublishingLog').every(log => !log.message.includes('Facebook Page')), true);
        await f.publisher.cancelPage(review.items[2].attemptId);
        assert.equal(f.store.queuedAttempts().length, 4);
        assert.equal(f.publisher.status(post.id).items[2].status, 'cancelled');
        await f.publisher.cancelSchedule(post.id);
        assert.equal(f.store.get('Post', post.id).status, 'draft');
        const { id, created_date, updated_date, ...data } = post;
        const duplicate = savePostPlan(f.store, { data: { ...data, title: 'Copy' } });
        assert.deepEqual(duplicate.platform_captions, post.platform_captions);
        assert.deepEqual(duplicate.destination_settings, post.destination_settings);
    } finally { f.close(); }
});

test('one incompatible channel rolls back the whole mixed review; changed captions invalidate approval', async () => {
    const f = fixture();
    try {
        f.store.write('Post', { platform_captions: { threads: 'x'.repeat(501) } }, f.post.id);
        assert.throws(() => f.publisher.prepare(f.post.id), /500/);
        assert.equal(f.store.attemptsForPost(f.post.id).length, 0);
        assert.equal(f.store.all('PublishJob').length, 0);
        f.store.write('Post', { platform_captions: { threads: 'Valid' } }, f.post.id);
        const review = f.publisher.prepare(f.post.id);
        f.store.write('Post', { platform_captions: { threads: 'Changed' } }, f.post.id);
        await assert.rejects(() => f.publisher.publish(review.attemptId), /changed/);
        assert.equal(f.store.queuedAttempts().length, 0);
    } finally { f.close(); }
});

test('immediate mixed publication queues once and a revoked channel cannot start siblings early', async () => {
    const f = fixture();
    try {
        const review = f.publisher.prepare(f.post.id);
        await f.publisher.publish(review.attemptId);
        await f.publisher.publish(review.attemptId);
        assert.equal(f.store.all('PublishJob').length, 5);
        assert.equal(f.store.queuedAttempts().length, 5);
        // Hold siblings in the future, fail one due preflight without provider traffic.
        for (const item of review.items.slice(1)) f.store.saveAttempt({ ...f.store.attempt(item.attemptId), scheduledFor: Date.now() + 600000 });
        f.store.verifiedAccount({ connection_status: 'disconnected' }, f.accounts[0].id);
        await f.publisher.runDue();
        await f.publisher.runDue();
        assert.equal(f.publisher.status(f.post.id).items[0].status, 'failed');
        assert.equal(f.store.queuedAttempts().length, 4);
        assert.equal(f.store.all('PublishJob').length, 5);
        assert.equal(f.store.all('PublishJob').every(job => job.attempts === 0), true);
    } finally { f.close(); }
});

test('duplicate identities within one platform are rejected; malformed platform captions cannot persist', () => {
    const f = fixture();
    try {
        const original = f.accounts[0];
        const { id, created_date, updated_date, ...data } = original;
        const duplicate = f.store.verifiedAccount({ ...data, name: 'Duplicate Page' });
        f.store.write('Post', { account_ids: [original.id, duplicate.id], destination_settings: {} }, f.post.id);
        assert.throws(() => f.publisher.prepare(f.post.id), /different publishing accounts/);
        assert.throws(() => f.store.write('Post', { platform_captions: { threads: { caption: 'invalid' } } }, f.post.id), /Invalid platform captions/);
    } finally { f.close(); }
});

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=', 'base64');

test('platform media persists, inherits, allows text-only and protects override references', () => {
    const f = fixture();
    try {
        const image = f.store.images.upload(f.post.brand_id, 'image.png', 'image/png', png);
        const overrides = { facebook: [image.id], threads: [], linkedin: [] };
        const post = savePostPlan(f.store, { id: f.post.id, data: { status: 'draft', platform_media_ids: overrides } });
        const review = f.publisher.prepare(post.id);
        assert.deepEqual(review.items.map(item => item.media.map(asset => asset.id)), [[image.id], post.media_ids, [], post.media_ids, []]);
        assert.throws(() => f.store.remove('MediaAsset', image.id), /history/);
        const { id, created_date, updated_date, ...data } = post;
        const duplicate = savePostPlan(f.store, { data });
        assert.deepEqual(duplicate.platform_media_ids, overrides);
        assert.deepEqual(f.store.get('Post', duplicate.id).platform_media_ids, overrides);
        for (const invalid of [null, [], { youtube: [] }, { facebook: 'bad' }, { facebook: [3] }, { facebook: [''] }, { facebook: [image.id, image.id] }, { facebook: Array(11).fill(image.id) }]) {
            assert.throws(() => f.store.write('Post', { platform_media_ids: invalid }, post.id), /Invalid platform[ _]media/);
        }
        const other = f.store.write('Brand', { name: 'Other brand' });
        const foreign = f.store.images.upload(other.id, 'foreign.png', 'image/png', png);
        assert.throws(() => f.store.write('Post', { platform_media_ids: { facebook: [foreign.id] } }, post.id), /Cross-brand/);
        assert.throws(() => f.store.write('Post', { platform_media_ids: { instagram: ['missing'] } }, post.id), /not found/);
        const demo = f.store.write('MediaAsset', { name: 'demo', file_url: 'https://example.invalid/demo.png', file_type: 'image', is_demo: true });
        assert.throws(() => f.store.write('Post', { platform_media_ids: { facebook: [demo.id] } }, post.id), /Cross-brand or demo/);
        f.store.write('Post', { platform_media_ids: { instagram: [] } }, post.id);
        assert.throws(() => f.publisher.prepare(post.id), /Instagram requires/);
    } finally { f.close(); }
});

test('mixed image/video schedule keeps immutable destination snapshots and effective variants', async () => {
    const f = fixture();
    try {
        const image = f.store.images.upload(f.post.brand_id, 'image.png', 'image/png', png);
        f.store.write('Post', { platform_media_ids: { facebook: [image.id], threads: [], linkedin: [] } }, f.post.id);
        const stale = f.publisher.prepareSchedule(f.post.id, future());
        f.store.write('Post', { platform_media_ids: { facebook: [], threads: [], linkedin: [] } }, f.post.id);
        await assert.rejects(() => f.publisher.schedule(stale.attemptId), /changed/);
        assert.equal(f.store.queuedAttempts().length, 0);
        f.store.write('Post', { platform_media_ids: { facebook: [image.id], threads: [], linkedin: [] } }, f.post.id);
        const review = f.publisher.prepareSchedule(f.post.id, future());
        await f.publisher.schedule(review.attemptId);
        await f.publisher.schedule(review.attemptId);
        assert.equal(f.store.all('PublishJob').length, 5);
        assert.throws(() => f.store.write('Post', { platform_media_ids: {} }, f.post.id), /schedule|locked/);
        assert.throws(() => f.store.remove('MediaAsset', image.id), /history/);
        const instagram = review.items.find(item => item.platform === 'instagram');
        const value = f.store.attempt(instagram.attemptId);
        assert.deepEqual(value.media.map(asset => asset.id), f.post.media_ids);
        // Claim media delivery only: the wake callback is inert and no provider request runs.
        f.store.saveAttempt({ ...value, scheduledFor: Date.now() - 1 });
        await f.publisher.publish(value.id);
        await f.publisher.publish(value.id);
        assert.deepEqual(f.store.all('PostVariant').map(variant => variant.media_ids), [f.post.media_ids]);
        assert.equal(f.store.all('PublishJob').length, 5);
        assert.deepEqual(f.store.attempt(review.items[0].attemptId).media.map(asset => asset.id), [image.id]);
    } finally { f.close(); }
});


test('reviewed retry retains the failed destination platform media without resending siblings', async () => {
    const f = fixture();
    try {
        const image = f.store.images.upload(f.post.brand_id, 'image.png', 'image/png', png);
        f.store.write('Post', { platform_media_ids: { facebook: [image.id], threads: [], linkedin: [] } }, f.post.id);
        const review = f.publisher.prepare(f.post.id);
        await f.publisher.publish(review.attemptId);
        for (const item of review.items) f.store.saveAttempt({ ...f.store.attempt(item.attemptId), scheduledFor: Date.now() + 600000 });
        const facebook = review.items[0];
        f.store.saveAttempt({ ...f.store.attempt(facebook.attemptId), scheduledFor: Date.now() - 1 });
        f.store.verifiedAccount({ connection_status: 'disconnected' }, f.accounts[0].id);
        await f.publisher.runDue();
        assert.equal(f.store.attempt(facebook.attemptId).status, 'failed');
        f.store.verifiedAccount({ connection_status: 'connected' }, f.accounts[0].id);
        const retry = f.publisher.prepareRetry(f.post.id, f.accounts[0].id);
        assert.deepEqual(retry.items[0].media.map(asset => asset.id), [image.id]);
        await f.publisher.publish(retry.attemptId);
        await f.publisher.publish(retry.attemptId);
        assert.equal(f.store.all('PublishJob').length, 6);
        assert.equal(f.store.queuedAttempts().length, 5);
        assert.equal(f.store.attempt(facebook.attemptId).status, 'failed');
    } finally { f.close(); }
});
