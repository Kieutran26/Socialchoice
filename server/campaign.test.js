import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from './store.js';

test('Campaign hierarchy integrity: Brand -> Campaign -> Pillar -> Angle -> Post', () => {
    const store = createStore(':memory:');
    try {
        const brandA = store.write('Brand', { name: 'Brand A' });
        const brandB = store.write('Brand', { name: 'Brand B' });

        // 1. Create Campaigns for Brand A
        const campaignA = store.write('Campaign', {
            name: 'Chiến dịch Tết 2027',
            brand_id: brandA.id,
            utm_campaign: 'tet_2027',
            status: 'active',
            color: '#ffd631'
        });
        assert.ok(campaignA.id);
        assert.equal(campaignA.name, 'Chiến dịch Tết 2027');
        assert.equal(campaignA.brand_id, brandA.id);

        // 2. Create Pillar associated with Campaign
        const pillar = store.write('ContentPillar', {
            name: 'Ưu đãi & Khuyến mãi Tết',
            brand_id: brandA.id,
            campaign_id: campaignA.id,
            target_percentage: 40
        });
        assert.equal(pillar.campaign_id, campaignA.id);

        // 3. Create Angle under Pillar
        const angle = store.write('ContentAngle', {
            name: 'Khai xuân đón lộc',
            brand_id: brandA.id,
            pillar_id: pillar.id
        });
        assert.equal(angle.pillar_id, pillar.id);

        // 4. Create Post with campaign_id, pillar_id, angle_id
        const post = store.write('Post', {
            title: 'Flash Sale Giao Thừa',
            caption: 'Nhanh tay nhận lì xì đầu năm',
            brand_id: brandA.id,
            campaign_id: campaignA.id,
            pillar_id: pillar.id,
            angle_id: angle.id
        });
        assert.equal(post.campaign_id, campaignA.id);

        // 5. Cross-brand protection: cannot attach Brand B post to Campaign A
        assert.throws(() => {
            store.write('Post', {
                title: 'Hacked post',
                brand_id: brandB.id,
                campaign_id: campaignA.id
            });
        }, /Cross-brand/);

        // 6. Cross-brand protection: cannot attach Brand B pillar to Campaign A
        assert.throws(() => {
            store.write('ContentPillar', {
                name: 'Pillar B',
                brand_id: brandB.id,
                campaign_id: campaignA.id
            });
        }, /Cross-brand/);

        // 7. Archiving Campaign prevents new posts from choosing it
        store.write('Campaign', { status: 'archived' }, campaignA.id);
        assert.throws(() => {
            store.write('Post', {
                title: 'New post on archived campaign',
                brand_id: brandA.id,
                campaign_id: campaignA.id
            });
        }, /Choose an active campaign/);

        // 8. References protect Campaign with posts/pillars from accidental hard removal
        assert.throws(() => {
            store.remove('Campaign', campaignA.id);
        }, /history/);
    } finally {
        store.close();
    }
});
