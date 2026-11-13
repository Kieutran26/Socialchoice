import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import {
    createCampaignDriveHarness,
    generateExtendedDriveFiles,
    DEFAULT_DRIVE_FILES,
    FIXTURE_PNG,
    FIXTURE_PNG_MD5
} from './fixtures/campaign-drive-fixture.js';
import { savePostPlan } from './post-plans.js';
import { toUtcIso } from '../src/lib/tz.js';
import { HOURS } from '../src/lib/strategy-plan.js';

test('AI Content Remixing: Single Asset Draft (generateDraft & saveAssetDraft)', async t => {
    const harness = createCampaignDriveHarness();
    t.after(() => harness.close());

    const { call, brand, folderId, runUntilIdle, store } = harness;

    // 1. Ingest & approve a Drive asset
    const source = await call('createSource', {
        brand_id: brand.id,
        kind: 'drive_public',
        name: 'Public Ingestion Source',
        folder: `https://drive.google.com/drive/folders/${folderId}`
    });
    await call('connect', { id: source.id });
    await call('sync', { id: source.id });
    await runUntilIdle();

    const assets = store.autopilot().assets();
    const targetAsset = assets[0]; // bamboo-toothbrush-lifestyle.png

    await call('analyze', { id: targetAsset.id, confirmed: true });
    await runUntilIdle();
    await call('review', { id: targetAsset.id, review: 'approved' });

    // 2. Test generateDraft: remix raw image analysis + brand into catchy social copy
    const draftRequestId = randomUUID();
    const draftInput = {
        id: targetAsset.id,
        request_id: draftRequestId,
        goal: 'Giới thiệu bàn chải tre tự nhiên thay thế đồ nhựa dùng một lần',
        tone: 'Ấm áp, truyền cảm hứng',
        brief: 'Lối sống xanh bắt đầu từ phòng tắm của bạn',
        cta: 'Nhận tư vấn combo sống xanh',
        language: 'vi',
        confirmed: true
    };

    // Consent check
    await assert.rejects(
        call('generateDraft', { ...draftInput, confirmed: false }),
        { status: 409 }
    );

    // AI Generation
    const draft = await call('generateDraft', draftInput);
    assert.equal(draft.id, draftRequestId);
    assert.equal(draft.status, 'ready');
    assert.equal(draft.provider, 'openrouter');
    assert.equal(draft.model, 'google/fixture');
    assert.ok(draft.text.length > 20);
    assert.ok(draft.text.includes('EcoGreen Living') || draft.text.includes('EcoGreen'));
    assert.ok(draft.text.includes('#') || draft.text.includes('tre'));

    // Deduplication check: repeated call with same request_id returns existing ready draft
    const dedupDraft = await call('generateDraft', draftInput);
    assert.equal(dedupDraft.id, draft.id);
    assert.equal(dedupDraft.text, draft.text);

    // Mismatched fingerprint check
    await assert.rejects(
        call('generateDraft', { ...draftInput, goal: 'Mục tiêu hoàn toàn khác' }),
        { status: 409 }
    );

    // 3. Test saveAssetDraft: converts draft into Post, downloading image bytes to MediaAsset
    const saveResult = await call('saveAssetDraft', {
        id: draft.id,
        title: 'Bàn Chải Tre EcoGreen - Khởi Đầu Buổi Sáng Bền Vững',
        caption: draft.text
    });

    assert.ok(saveResult.post_id);
    const post = store.get('Post', saveResult.post_id);
    assert.equal(post.brand_id, brand.id);
    assert.equal(post.title, 'Bàn Chải Tre EcoGreen - Khởi Đầu Buổi Sáng Bền Vững');
    assert.equal(post.caption, draft.text);
    assert.equal(post.status, 'draft');
    assert.equal(post.scheduled_at, null);
    assert.equal(post.media_ids.length, 1);

    // Verify media asset was imported from Drive
    const media = store.get('MediaAsset', post.media_ids[0]);
    assert.equal(media.brand_id, brand.id);
    assert.ok(media.storage_id);
    assert.deepEqual(store.images.read(media.storage_id), FIXTURE_PNG);

    // Idempotency: re-saving returns same post_id
    const reSave = await call('saveAssetDraft', {
        id: draft.id,
        title: 'Bàn Chải Tre EcoGreen - Khởi Đầu Buổi Sáng Bền Vững',
        caption: draft.text
    });
    assert.equal(reSave.post_id, saveResult.post_id);
    assert.equal(store.all('Post').length, 1);
});

test('AI Content Remixing: Cross-Platform Content Strategy (strategyGenerate)', async t => {
    // 24 Drive files to satisfy the >= 20 images gate
    const extendedFiles = generateExtendedDriveFiles(24);
    const harness = createCampaignDriveHarness({ files: extendedFiles });
    t.after(() => harness.close());

    const { call, brand, pillars, angles, folderId, runUntilIdle, store } = harness;

    // 1. Ingest all 24 Drive assets
    const source = await call('createSource', {
        brand_id: brand.id,
        kind: 'drive_public',
        name: 'Eco Catalog Drive',
        folder: `https://drive.google.com/drive/folders/${folderId}`
    });
    await call('connect', { id: source.id });
    await call('sync', { id: source.id });
    await runUntilIdle();

    const assets = store.autopilot().assets();
    assert.equal(assets.length, 24);

    // Analyze and approve all 24 assets
    for (const asset of assets) {
        await call('analyze', { id: asset.id, confirmed: true });
    }
    await runUntilIdle();

    for (const asset of assets) {
        await call('review', { id: asset.id, review: 'approved' });
    }

    const approvedCount = store.autopilot().assets().filter(a => a.review === 'approved').length;
    assert.equal(approvedCount, 24);

    // 2. Generate multi-platform strategy plan
    const strategyRequestId = randomUUID();
    const strategyInput = {
        brand_id: brand.id,
        request_id: strategyRequestId,
        confirmed: true,
        language: 'vi',
        options: {
            days: 14,
            frequency: '1_per_day',
            platforms: ['facebook', 'instagram', 'linkedin'],
            startDate: '2026-11-20'
        }
    };

    const plan = await call('strategyGenerate', strategyInput);

    // 3. Verify remixing outputs
    assert.equal(plan.id, strategyRequestId);
    assert.equal(plan.brandId, brand.id);
    assert.equal(plan.days, 14);
    assert.equal(plan.posts.length, 14);

    // Verify all 14 captions are non-empty and distinct
    const captions = plan.posts.map(p => p.caption);
    assert.equal(new Set(captions).size, 14, 'Every remixed post caption must be unique');

    // Verify schema limits and content quality
    for (const post of plan.posts) {
        assert.ok(post.title.length > 0 && post.title.length <= 200, 'Title within limits');
        assert.ok(post.caption.length > 0 && post.caption.length <= 2000, 'Caption within limits');
        assert.ok(post.reason.length > 0 && post.reason.length <= 1000, 'Reason within limits');
        assert.ok(['facebook', 'instagram', 'linkedin'].includes(post.platform), 'Platform in requested set');
        assert.ok(HOURS[post.platform].includes(post.time), 'Time matches optimal platform hours');
        assert.ok(post.asset?.id, 'Asset assigned');
        assert.ok(post.pillar?.id, 'Pillar assigned');
        assert.ok(post.angle?.id, 'Angle assigned');
        assert.equal(post.status, 'draft');

        // Verify accurate UTC scheduled timestamp matching brand timezone (Asia/Ho_Chi_Minh: UTC+7)
        const expectedUtc = toUtcIso(post.date, post.time, 'Asia/Ho_Chi_Minh');
        assert.equal(post.scheduled_at, expectedUtc);
    }

    // Verify summary statistics
    assert.equal(plan.summary.totalPosts, 14);
    assert.equal(plan.summary.totalDays, 14);
    assert.ok(plan.summary.matchedAssetsCount > 0);

    // Verify deduplication / caching
    const dedupPlan = await call('strategyGenerate', strategyInput);
    assert.equal(dedupPlan.id, plan.id);
});

test('AI Content Remixing: Slot Regeneration (strategyRegenerate)', async t => {
    const extendedFiles = generateExtendedDriveFiles(24);
    const harness = createCampaignDriveHarness({ files: extendedFiles });
    t.after(() => harness.close());

    const { call, brand, folderId, runUntilIdle, store } = harness;

    // Setup source & approve assets
    const source = await call('createSource', {
        brand_id: brand.id,
        kind: 'drive_public',
        name: 'Eco Catalog Drive',
        folder: `https://drive.google.com/drive/folders/${folderId}`
    });
    await call('connect', { id: source.id });
    await call('sync', { id: source.id });
    await runUntilIdle();

    for (const asset of store.autopilot().assets()) {
        await call('analyze', { id: asset.id, confirmed: true });
    }
    await runUntilIdle();
    for (const asset of store.autopilot().assets()) {
        await call('review', { id: asset.id, review: 'approved' });
    }

    // Generate initial plan
    const plan = await call('strategyGenerate', {
        brand_id: brand.id,
        request_id: randomUUID(),
        confirmed: true,
        language: 'vi',
        options: { days: 7, frequency: '1_per_day', platforms: ['facebook', 'instagram'], startDate: '2026-11-20' }
    });

    const targetSlot = plan.posts[0];

    // Regenerate slot with asset rotation
    const regenResult = await call('strategyRegenerate', {
        brand_id: brand.id,
        plan_id: plan.id,
        item_id: targetSlot.id,
        request_id: randomUUID(),
        confirmed: true,
        language: 'vi'
    });

    assert.equal(regenResult.posts.length, 1);
    const regeneratedPost = regenResult.posts[0];

    // Retains date, time, platform
    assert.equal(regeneratedPost.date, targetSlot.date);
    assert.equal(regeneratedPost.time, targetSlot.time);
    assert.equal(regeneratedPost.platform, targetSlot.platform);
    assert.equal(regeneratedPost.scheduled_at, targetSlot.scheduled_at);

    // Rotates asset
    assert.notEqual(regeneratedPost.asset.id, targetSlot.asset.id);
    assert.ok(regeneratedPost.title.length > 0);
    assert.ok(regeneratedPost.caption.length > 0);
});

test('Automated Post Scheduling: strategyApply creates draft Posts with Drive media & UTC timestamps', async t => {
    const extendedFiles = generateExtendedDriveFiles(24);
    const harness = createCampaignDriveHarness({ files: extendedFiles });
    t.after(() => harness.close());

    const { call, brand, folderId, runUntilIdle, store } = harness;

    // Ingest & approve
    const source = await call('createSource', {
        brand_id: brand.id,
        kind: 'drive_public',
        name: 'Eco Catalog Drive',
        folder: `https://drive.google.com/drive/folders/${folderId}`
    });
    await call('connect', { id: source.id });
    await call('sync', { id: source.id });
    await runUntilIdle();

    for (const asset of store.autopilot().assets()) {
        await call('analyze', { id: asset.id, confirmed: true });
    }
    await runUntilIdle();
    for (const asset of store.autopilot().assets()) {
        await call('review', { id: asset.id, review: 'approved' });
    }

    // Generate 7-day plan
    const plan = await call('strategyGenerate', {
        brand_id: brand.id,
        request_id: randomUUID(),
        confirmed: true,
        language: 'vi',
        options: { days: 7, frequency: '1_per_day', platforms: ['facebook', 'instagram', 'linkedin'], startDate: '2026-11-20' }
    });

    assert.equal(store.all('Post').length, 0);

    // Apply strategy plan to database
    const savedPosts = await call('strategyApply', { brand_id: brand.id, plan });
    assert.equal(savedPosts.length, 7);
    assert.equal(store.all('Post').length, 7);

    for (let i = 0; i < savedPosts.length; i++) {
        const post = savedPosts[i];
        const slot = plan.posts[i];

        assert.equal(post.brand_id, brand.id);
        assert.equal(post.title, slot.title);
        assert.equal(post.caption, slot.caption);
        assert.equal(post.status, 'draft');
        assert.equal(post.timezone, 'Asia/Ho_Chi_Minh');
        assert.equal(post.pillar_id, slot.pillar.id);
        assert.equal(post.angle_id, slot.angle.id);
        assert.ok(post.scheduled_at);
        assert.equal(post.scheduled_at, slot.scheduled_at);
        assert.ok(post.notes.includes('[AI Content Strategist]'));

        // Verify platform caption variant
        assert.equal(post.platform_captions[slot.platform], slot.caption);

        // Verify media asset was imported and attached
        assert.equal(post.media_ids.length, 1);
        const media = store.get('MediaAsset', post.media_ids[0]);
        assert.equal(media.brand_id, brand.id);
        assert.deepEqual(store.images.read(media.storage_id), FIXTURE_PNG);
    }

    // Idempotency: re-applying plan returns identical posts without duplicate writes
    const reApplied = await call('strategyApply', { brand_id: brand.id, plan });
    assert.deepEqual(reApplied.map(p => p.id), savedPosts.map(p => p.id));
    assert.equal(store.all('Post').length, 7);
});

test('Calendar Scheduling & PublishJob Generation: savePostPlan generates pending PublishJobs with UTC timestamps', async t => {
    const harness = createCampaignDriveHarness();
    t.after(() => harness.close());

    const { store, brand } = harness;

    // 1. Create Social Accounts for multiple channels
    const fbAccount = store.write('SocialAccount', {
        brand_id: brand.id,
        name: 'EcoGreen Living Fanpage',
        platform: 'facebook'
    });
    const igAccount = store.write('SocialAccount', {
        brand_id: brand.id,
        name: 'EcoGreen Living Instagram',
        platform: 'instagram'
    });
    const liAccount = store.write('SocialAccount', {
        brand_id: brand.id,
        name: 'EcoGreen Living LinkedIn',
        platform: 'linkedin'
    });

    // 2. Schedule a post for Facebook
    const postScheduledAt = '2026-11-20T02:00:00.000Z'; // 09:00 AM UTC+7
    const postData = {
        brand_id: brand.id,
        title: 'Mẹo Sống Xanh Cuối Tuần',
        caption: 'Cùng EcoGreen lan toả thông điệp bền vững!',
        status: 'scheduled',
        account_ids: [fbAccount.id],
        scheduled_at: postScheduledAt,
        timezone: 'Asia/Ho_Chi_Minh',
        is_demo: false,
        media_ids: []
    };

    const scheduledPost = savePostPlan(store, { data: postData });
    assert.ok(scheduledPost.id);
    assert.equal(scheduledPost.status, 'scheduled');

    // 3. Verify PublishJob generation
    const jobs = store.all('PublishJob').filter(j => j.post_id === scheduledPost.id);
    assert.equal(jobs.length, 1);
    const fbJob = jobs[0];

    assert.equal(fbJob.status, 'pending');
    assert.equal(fbJob.brand_id, brand.id);
    assert.equal(fbJob.social_account_id, fbAccount.id);
    assert.equal(fbJob.account_name, 'EcoGreen Living Fanpage');
    assert.equal(fbJob.platform, 'facebook');
    assert.equal(fbJob.scheduled_for, postScheduledAt);
    assert.equal(fbJob.is_demo, false);

    // 4. Test Multi-Channel Scheduling: add Instagram and LinkedIn to the same post
    const multiScheduled = savePostPlan(store, {
        id: scheduledPost.id,
        data: {
            ...postData,
            account_ids: [fbAccount.id, igAccount.id, liAccount.id]
        }
    });

    const multiJobs = store.all('PublishJob').filter(j => j.post_id === multiScheduled.id);
    assert.equal(multiJobs.length, 3);
    const platforms = multiJobs.map(j => j.platform).sort();
    assert.deepEqual(platforms, ['facebook', 'instagram', 'linkedin']);

    for (const job of multiJobs) {
        assert.equal(job.status, 'pending');
        assert.equal(job.scheduled_for, postScheduledAt);
    }

    // 5. Test Rescheduling: update scheduled_at
    const rescheduledAt = '2026-11-21T12:30:00.000Z'; // 19:30 UTC+7 next day
    savePostPlan(store, {
        id: scheduledPost.id,
        data: {
            ...postData,
            account_ids: [fbAccount.id, igAccount.id, liAccount.id],
            scheduled_at: rescheduledAt
        }
    });

    const updatedJobs = store.all('PublishJob').filter(j => j.post_id === scheduledPost.id);
    assert.equal(updatedJobs.length, 3);
    for (const job of updatedJobs) {
        assert.equal(job.status, 'pending');
        assert.equal(job.scheduled_for, rescheduledAt);
    }

    // 6. Test Cancellation: un-scheduling back to draft cancels pending PublishJobs
    savePostPlan(store, {
        id: scheduledPost.id,
        data: {
            ...postData,
            account_ids: [],
            status: 'draft'
        }
    });

    const cancelledJobs = store.all('PublishJob').filter(j => j.post_id === scheduledPost.id);
    assert.equal(cancelledJobs.length, 3);
    for (const job of cancelledJobs) {
        assert.equal(job.status, 'cancelled');
    }
});

test('Edge Cases & Security: 20-image gate, concurrency fencing & transaction rollback', async t => {
    // Harness with only 3 files
    const harness = createCampaignDriveHarness();
    t.after(() => harness.close());

    const { call, brand, folderId, runUntilIdle, store } = harness;

    // Ingest & approve only 3 assets
    const source = await call('createSource', {
        brand_id: brand.id,
        kind: 'drive_public',
        name: 'Small Drive Source',
        folder: `https://drive.google.com/drive/folders/${folderId}`
    });
    await call('connect', { id: source.id });
    await call('sync', { id: source.id });
    await runUntilIdle();

    for (const asset of store.autopilot().assets()) {
        await call('analyze', { id: asset.id, confirmed: true });
    }
    await runUntilIdle();
    for (const asset of store.autopilot().assets()) {
        await call('review', { id: asset.id, review: 'approved' });
    }

    // 1. Gate check: < 20 approved images rejects strategyGenerate
    await assert.rejects(
        call('strategyGenerate', {
            brand_id: brand.id,
            request_id: randomUUID(),
            confirmed: true,
            language: 'vi',
            options: { days: 7, frequency: '1_per_day', platforms: ['facebook'] }
        }),
        { status: 409 }
    );

    // Now seed additional stored images up to 20
    for (let i = 0; i < 17; i++) {
        store.images.upload(brand.id, `eco-stored-${i}.png`, 'image/png', FIXTURE_PNG);
    }

    // Now pool has 3 Drive + 17 Stored = 20 images -> strategy succeeds
    const strategyReqId = randomUUID();
    const plan = await call('strategyGenerate', {
        brand_id: brand.id,
        request_id: strategyReqId,
        confirmed: true,
        language: 'vi',
        options: { days: 7, frequency: '1_per_day', platforms: ['facebook'], startDate: '2026-11-20' }
    });
    assert.equal(plan.posts.length, 7);

    // 2. Concurrency Fencing: modifying brand context invalidates strategyApply
    store.write('Brand', { description: 'Đã thay đổi mô tả thương hiệu hoàn toàn mới' }, brand.id);
    await assert.rejects(
        call('strategyApply', { brand_id: brand.id, plan }),
        { status: 409 }
    );

    // Restore brand
    store.write('Brand', { description: brand.description }, brand.id);

    // 3. Transaction Rollback: injected write failure rolls back completely
    const origWrite = store.write;
    let postWriteCount = 0;
    store.write = (entity, ...args) => {
        if (entity === 'Post' && ++postWriteCount === 3) {
            throw new Error('Injected atomic failure on 3rd Post');
        }
        return origWrite(entity, ...args);
    };

    await assert.rejects(
        call('strategyApply', { brand_id: brand.id, plan }),
        /Injected atomic failure/
    );

    // Verify 0 posts written due to rollback
    assert.equal(store.all('Post').length, 0);

    store.write = origWrite;
});

test('End-to-End Workflow: Campaign Setup -> Drive Ingestion -> AI Remixing -> Calendar Scheduling', async t => {
    // 1. Full integrated execution
    const extendedFiles = generateExtendedDriveFiles(24);
    const harness = createCampaignDriveHarness({ files: extendedFiles });
    t.after(() => harness.close());

    const { call, brand, pillars, angles, folderId, runUntilIdle, store } = harness;

    // Step 1: Verify Campaign / Brand Context
    assert.equal(brand.name, 'EcoGreen Living');
    assert.equal(pillars.length, 3);
    assert.equal(angles.length, 6);

    // Step 2: Google Drive Connection & Ingestion
    const source = await call('createSource', {
        brand_id: brand.id,
        kind: 'drive_public',
        name: 'EcoGreen Campaign Asset Library',
        folder: `https://drive.google.com/drive/folders/${folderId}`
    });
    await call('connect', { id: source.id });
    await call('sync', { id: source.id });
    await runUntilIdle();

    const ingestedAssets = store.autopilot().assets();
    assert.equal(ingestedAssets.length, 24);

    // Analyze all assets with AI vision
    for (const asset of ingestedAssets) {
        await call('analyze', { id: asset.id, confirmed: true });
    }
    await runUntilIdle();

    // Review & approve
    for (const asset of ingestedAssets) {
        await call('review', { id: asset.id, review: 'approved' });
    }

    // Step 3: AI Remixing - Generate multi-platform strategy plan
    const strategyReqId = randomUUID();
    const plan = await call('strategyGenerate', {
        brand_id: brand.id,
        request_id: strategyReqId,
        confirmed: true,
        language: 'vi',
        options: {
            days: 7,
            frequency: '1_per_day',
            platforms: ['facebook', 'instagram', 'linkedin'],
            startDate: '2026-11-20'
        }
    });

    assert.equal(plan.posts.length, 7);
    assert.ok(plan.posts.every(p => p.title && p.caption && p.reason && p.asset));

    // Step 4: Apply Strategy Plan (converts to Posts + imports Drive image bytes)
    const posts = await call('strategyApply', { brand_id: brand.id, plan });
    assert.equal(posts.length, 7);

    // Step 5: Connect Social Channels and Schedule Posts
    const fbAccount = store.write('SocialAccount', { brand_id: brand.id, name: 'EcoGreen Facebook', platform: 'facebook' });
    const igAccount = store.write('SocialAccount', { brand_id: brand.id, name: 'EcoGreen Instagram', platform: 'instagram' });
    const liAccount = store.write('SocialAccount', { brand_id: brand.id, name: 'EcoGreen LinkedIn', platform: 'linkedin' });

    const accountMap = { facebook: fbAccount, instagram: igAccount, linkedin: liAccount };

    // Schedule each post to its respective channel
    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const slot = plan.posts[i];
        const targetAccount = accountMap[slot.platform];
        const { id, created_date, updated_date, ...dataToUpdate } = post;

        savePostPlan(store, {
            id: post.id,
            data: {
                ...dataToUpdate,
                status: 'scheduled',
                account_ids: [targetAccount.id]
            }
        });
    }

    // Step 6: Validate final scheduling state
    const allScheduledPosts = store.all('Post');
    assert.equal(allScheduledPosts.length, 7);
    assert.ok(allScheduledPosts.every(p => p.status === 'scheduled'));

    const allPublishJobs = store.all('PublishJob');
    assert.equal(allPublishJobs.length, 7);
    assert.ok(allPublishJobs.every(j => j.status === 'pending'));

    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const slot = plan.posts[i];
        const job = allPublishJobs.find(j => j.post_id === post.id);
        assert.ok(job, `PublishJob must exist for post ${post.id}`);

        assert.equal(job.scheduled_for, slot.scheduled_at);
        assert.equal(job.platform, slot.platform);
        assert.equal(job.brand_id, brand.id);
        assert.equal(job.status, 'pending');
    }
});
