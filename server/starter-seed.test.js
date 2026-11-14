import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from './store.js';
import { savePostPlan } from './post-plans.js';
import { buildStarterDataset } from '../src/lib/starter-seed.js';

function stripMeta(record) {
    const copy = { ...record };
    delete copy.key;
    delete copy.brandKey;
    delete copy.pillarKey;
    delete copy.angleKey;
    delete copy.accountKeys;
    delete copy.mediaKeys;
    return copy;
}

test('starter dataset passes strict server validation and savePostPlan for every record', () => {
    const store = createStore(':memory:');
    try {
        const data = buildStarterDataset();

        assert.equal(data.brands.length, 3, 'Expected 3 starter brands');
        assert.equal(data.accounts.length, 6, 'Expected 6 starter social accounts');
        assert.equal(data.pillars.length, 12, 'Expected 12 starter content pillars');
        assert.equal(data.angles.length, 36, 'Expected 36 starter content angles');
        assert.ok(data.media.length >= 6, 'Expected at least 6 starter media assets');
        assert.equal(data.templates.length, 6, 'Expected 6 starter post templates');
        assert.ok(data.signatures.length >= 3, 'Expected at least 3 starter post signatures');
        assert.ok(data.posts.length >= 15, 'Expected at least 15 starter posts');

        const brandId = {};
        for (const brand of data.brands) {
            const created = store.write('Brand', stripMeta(brand));
            assert.equal(created.is_demo, false);
            assert.equal(created.status, 'active');
            brandId[brand.key] = created.id;
        }

        const accountId = {};
        for (const account of data.accounts) {
            const created = store.write('SocialAccount', {
                ...stripMeta(account),
                brand_id: brandId[account.brandKey],
            });
            assert.equal(created.is_demo, false);
            assert.equal(created.connection_status, 'configuration_required');
            accountId[account.key] = created.id;
        }

        const pillarId = {};
        const percentageByBrand = {};
        for (const pillar of data.pillars) {
            const created = store.write('ContentPillar', {
                ...stripMeta(pillar),
                brand_id: brandId[pillar.brandKey],
            });
            assert.equal(created.is_demo, false);
            pillarId[pillar.key] = created.id;
            percentageByBrand[pillar.brandKey] = (percentageByBrand[pillar.brandKey] || 0) + created.target_percentage;
        }
        for (const brand of data.brands) {
            assert.equal(percentageByBrand[brand.key], 100, `Pillars for ${brand.name} must sum to 100%`);
        }

        const angleId = {};
        for (const angle of data.angles) {
            const created = store.write('ContentAngle', {
                ...stripMeta(angle),
                brand_id: brandId[angle.brandKey],
                pillar_id: pillarId[angle.pillarKey],
            });
            assert.equal(created.is_demo, false);
            angleId[angle.key] = created.id;
        }

        const mediaId = {};
        for (const asset of data.media) {
            const created = store.write('MediaAsset', {
                ...stripMeta(asset),
                brand_id: brandId[asset.brandKey],
            });
            assert.equal(created.is_demo, false);
            mediaId[asset.key] = created.id;
        }

        for (const template of data.templates) {
            const created = store.write('PostTemplate', {
                ...stripMeta(template),
                brand_id: brandId[template.brandKey],
                pillar_id: pillarId[template.pillarKey],
                angle_id: angleId[template.angleKey],
                account_ids: (template.accountKeys || []).map((k) => accountId[k]),
                media_ids: (template.mediaKeys || []).map((k) => mediaId[k]),
            });
            assert.equal(created.is_demo, false);
        }

        for (const signature of data.signatures) {
            const created = store.write('PostSignature', {
                ...stripMeta(signature),
                brand_id: brandId[signature.brandKey],
            });
            assert.equal(created.is_demo, false);
        }

        let draftCount = 0;
        let scheduledCount = 0;
        for (const post of data.posts) {
            const payload = {
                ...stripMeta(post),
                brand_id: brandId[post.brandKey],
                pillar_id: pillarId[post.pillarKey],
                angle_id: angleId[post.angleKey],
                account_ids: (post.accountKeys || []).map((k) => accountId[k]),
                media_ids: (post.mediaKeys || []).map((k) => mediaId[k]),
            };
            const created = savePostPlan(store, { data: payload });
            assert.equal(created.is_demo, false);
            assert.equal(created.account_ids.length, (post.accountKeys || []).length);
            assert.equal(created.media_ids.length, (post.mediaKeys || []).length);

            if (created.status === 'draft') draftCount += 1;
            if (created.status === 'scheduled') {
                scheduledCount += 1;
                const jobs = store.all('PublishJob').filter((j) => j.post_id === created.id);
                assert.equal(jobs.length, new Set(created.account_ids).size);
            }
        }

        assert.ok(draftCount >= 6, `Expected at least 6 draft posts, got ${draftCount}`);
        assert.ok(scheduledCount >= 9, `Expected at least 9 scheduled posts, got ${scheduledCount}`);
    } finally {
        store.close();
    }
});
