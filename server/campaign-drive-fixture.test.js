import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createCampaignDriveHarness,
    DEFAULT_DRIVE_FILES,
    FIXTURE_PNG,
    FIXTURE_PNG_MD5
} from './fixtures/campaign-drive-fixture.js';
import { DRIVE_SCOPE } from './autopilot-providers.js';
import { createMetaVault } from './meta-vault.js';

test('Campaign Context: seeds live brand, content pillars, and content angles correctly', t => {
    const harness = createCampaignDriveHarness();
    t.after(() => harness.close());

    const { brand, pillars, angles, store } = harness;

    // 1. Verify Brand
    assert.ok(brand.id);
    assert.equal(brand.name, 'EcoGreen Living');
    assert.equal(brand.status, 'active');
    assert.equal(brand.is_demo, false);
    assert.equal(brand.timezone, 'Asia/Ho_Chi_Minh');
    assert.ok(brand.products.includes('Bàn chải tre'));
    assert.ok(brand.target_audience.length > 0);
    assert.ok(brand.tone_of_voice.length > 0);
    assert.ok(brand.goals.length > 0);

    // 2. Verify Content Pillars
    assert.equal(pillars.length, 3);
    const totalPercentage = pillars.reduce((sum, p) => sum + p.target_percentage, 0);
    assert.equal(totalPercentage, 100, 'Content pillars target percentage must sum to 100%');
    for (const pillar of pillars) {
        assert.equal(pillar.brand_id, brand.id);
        assert.equal(pillar.status, 'active');
        assert.equal(pillar.is_demo, false);
        assert.ok(pillar.name.length > 0);
    }

    // 3. Verify Content Angles
    assert.equal(angles.length, 6);
    const pillarIds = new Set(pillars.map(p => p.id));
    for (const angle of angles) {
        assert.equal(angle.brand_id, brand.id);
        assert.ok(pillarIds.has(angle.pillar_id), 'Content angle must belong to a valid pillar');
        assert.equal(angle.status, 'active');
        assert.equal(angle.is_demo, false);
        assert.ok(angle.name.length > 0);
    }

    // Verify stored entities directly in database
    assert.equal(store.all('Brand').length, 1);
    assert.equal(store.all('ContentPillar').length, 3);
    assert.equal(store.all('ContentAngle').length, 6);
});

test('Google Drive Public Ingestion: links source, synchronizes assets, and validates listing', async t => {
    const harness = createCampaignDriveHarness();
    t.after(() => harness.close());

    const { call, brand, folderId, runUntilIdle, store } = harness;

    // 1. Create Public Drive Source
    const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
    const source = await call('createSource', {
        brand_id: brand.id,
        kind: 'drive_public',
        name: 'Eco Public Drive Assets',
        folder: folderUrl
    });

    assert.ok(source.id);
    assert.equal(source.kind, 'drive');
    assert.equal(source.access, 'public');
    assert.equal(source.folder, folderId);
    assert.equal(source.status, 'disconnected');

    // 2. Connect source (verifies public folder access)
    const connectResult = await call('connect', { id: source.id });
    assert.equal(connectResult.connected, true);
    assert.equal(store.autopilot().source(source.id).status, 'connected');

    // 3. Synchronize assets
    const syncJob = await call('sync', { id: source.id });
    assert.equal(syncJob.status, 'queued');

    // Worker processes sync job
    await runUntilIdle();

    // 4. Validate asset listing
    const listResult = await call('list', { brand_id: brand.id });
    assert.equal(listResult.sources.length, 1);
    assert.equal(listResult.sources[0].id, source.id);
    assert.equal(listResult.assets.length, 3);

    for (const asset of listResult.assets) {
        assert.equal(asset.source_id, source.id);
        assert.equal(asset.brand_id, brand.id);
        assert.equal(asset.availability, 'available');
        assert.equal(asset.mime, 'image/png');
        assert.equal(asset.size, FIXTURE_PNG.length);
        assert.ok(asset.file_url.includes('drive.google.com/thumbnail'));
        assert.ok(asset.thumbnail_url.includes('drive.google.com/thumbnail'));
        assert.equal(asset.analysis_status, 'not_analyzed');
        assert.equal(asset.review, 'pending');
    }

    // 5. Validate search filter
    const searchMatch = await call('list', { brand_id: brand.id, search: 'toothbrush' });
    assert.equal(searchMatch.assets.length, 1);
    assert.equal(searchMatch.assets[0].name, 'bamboo-toothbrush-lifestyle.png');

    const noMatch = await call('list', { brand_id: brand.id, search: 'non-existent-query' });
    assert.equal(noMatch.assets.length, 0);
});

test('Google Drive OAuth: verifies OAuth flow, credential vault encryption, sync and asset listing', async t => {
    let driveVerifyCalls = 0;
    const folderId = 'oauth-private-drive-folder';

    const harness = createCampaignDriveHarness({
        folderId,
        fetcher: async (url, options = {}) => {
            const u = new URL(url);
            if (u.origin === 'https://oauth2.googleapis.com' && u.pathname === '/token') {
                return Response.json({
                    access_token: 'oauth-access-token-123',
                    refresh_token: 'oauth-refresh-token-456',
                    expires_in: 3600,
                    scope: DRIVE_SCOPE
                });
            }
            if (u.origin === 'https://www.googleapis.com') {
                if (u.pathname.endsWith(`/files/${folderId}`)) {
                    driveVerifyCalls++;
                    return Response.json({
                        id: folderId,
                        mimeType: 'application/vnd.google-apps.folder',
                        trashed: false
                    });
                }
                if (u.pathname.endsWith('/files')) {
                    return Response.json({
                        files: [
                            {
                                id: 'oauth-asset-1',
                                name: 'sustainable-packaging.png',
                                mimeType: 'image/png',
                                size: String(FIXTURE_PNG.length),
                                version: FIXTURE_PNG_MD5,
                                md5Checksum: FIXTURE_PNG_MD5,
                                thumbnailLink: 'https://drive.google.com/thumbnail?id=oauth-asset-1&sz=s220'
                            }
                        ]
                    });
                }
            }
            return new Response('Not found', { status: 404 });
        }
    });
    t.after(() => harness.close());

    const { call, service, brand, store, key, runUntilIdle } = harness;

    // 1. Create OAuth Drive Source
    const source = await call('createSource', {
        brand_id: brand.id,
        kind: 'drive',
        name: 'Corporate Private Drive',
        folder: folderId
    });

    assert.equal(source.kind, 'drive');
    assert.equal(source.status, 'disconnected');

    // 2. Initiate OAuth connection
    let oauthCookie = '';
    const res = {
        setHeader: (_name, value) => { oauthCookie = value; },
        writeHead: () => {},
        end: () => {}
    };

    const connectOutput = await service.execute('connect', { id: source.id }, {}, res);
    assert.ok(connectOutput.url);
    const oauthUrl = new URL(connectOutput.url);
    assert.equal(oauthUrl.origin, 'https://accounts.google.com');
    assert.equal(oauthUrl.searchParams.get('scope'), DRIVE_SCOPE);
    assert.equal(oauthUrl.searchParams.get('code_challenge_method'), 'S256');

    const state = oauthUrl.searchParams.get('state');
    const nonce = oauthCookie.split(';')[0];

    // 3. Perform OAuth callback with code exchange
    await service.callback(
        {
            url: `/api/drive/callback?state=${state}&code=test-auth-code`,
            headers: { cookie: nonce }
        },
        res
    );

    // 4. Verify source status & secure vault storage
    const updatedSource = store.autopilot().source(source.id);
    assert.equal(updatedSource.status, 'connected');
    assert.equal(driveVerifyCalls, 1);

    const vault = createMetaVault(store, key);
    const grant = vault.read(`autopilot:drive:${source.id}:${updatedSource.generation}`);
    assert.equal(grant.refresh_token, 'oauth-refresh-token-456');

    // 5. Synchronize and verify asset list
    await call('sync', { id: source.id });
    await runUntilIdle();

    const listResult = await call('list', { brand_id: brand.id });
    assert.equal(listResult.assets.length, 1);
    assert.equal(listResult.assets[0].name, 'sustainable-packaging.png');
    assert.equal(listResult.assets[0].version, FIXTURE_PNG_MD5);
});

test('Metadata Extraction & Review Lifecycle: extracts analysis, validates schema, and tests approval/rejection', async t => {
    let aiCallsCount = 0;

    const harness = createCampaignDriveHarness({
        aiFetch: async (url, options) => {
            aiCallsCount++;
            return Response.json({
                choices: [
                    {
                        finish_reason: 'stop',
                        message: {
                            content: JSON.stringify({
                                summary: 'Bàn chải tre hữu cơ với lông sợi tự nhiên, thiết kế thân thiện môi trường.',
                                tags: ['bamboo-toothbrush', 'plastic-free', 'eco-living', 'sustainable-bathroom'],
                                ocr: 'ORGANIC BAMBOO',
                                suggested_uses: ['Giới thiệu sản phẩm mới', 'Mẹo sống xanh phòng tắm'],
                                warnings: []
                            })
                        }
                    }
                ]
            });
        }
    });
    t.after(() => harness.close());

    const { call, brand, folderId, runUntilIdle, store } = harness;

    // Ingest public drive assets
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
    assert.equal(assets.length, 3);
    const targetAsset = assets[0];

    // 1. Consent check: unconfirmed analysis is rejected
    await assert.rejects(
        call('analyze', { id: targetAsset.id, confirmed: false }),
        { status: 409 }
    );
    assert.equal(aiCallsCount, 0);

    // 2. Queue AI analysis with explicit user confirmation
    const analyzeJob = await call('analyze', { id: targetAsset.id, confirmed: true });
    assert.equal(analyzeJob.status, 'queued');
    assert.equal(store.autopilot().asset(targetAsset.id).analysis_status, 'queued');

    // 3. Worker executes image download & AI vision analysis
    await runUntilIdle();
    assert.equal(aiCallsCount, 1);

    // 4. Validate metadata extraction
    const analyzedAsset = store.autopilot().asset(targetAsset.id);
    assert.equal(analyzedAsset.analysis_status, 'analyzed');
    assert.equal(analyzedAsset.review, 'pending', 'Newly analyzed asset must default to pending review');
    assert.ok(analyzedAsset.analysis);
    assert.equal(analyzedAsset.analysis.summary, 'Bàn chải tre hữu cơ với lông sợi tự nhiên, thiết kế thân thiện môi trường.');
    assert.deepEqual(analyzedAsset.analysis.tags, ['bamboo-toothbrush', 'plastic-free', 'eco-living', 'sustainable-bathroom']);
    assert.equal(analyzedAsset.analysis.ocr, 'ORGANIC BAMBOO');
    assert.equal(analyzedAsset.analysis.suggested_uses.length, 2);
    assert.deepEqual(analyzedAsset.analysis.warnings, []);
    assert.equal(analyzedAsset.analysis.provider, 'openrouter');
    assert.equal(analyzedAsset.analysis.model, 'google/fixture');

    // 5. Test caching: re-analyzing returns cached without extra AI request
    const cachedResult = await call('analyze', { id: targetAsset.id, confirmed: true });
    assert.equal(cachedResult.cached, true);
    assert.equal(aiCallsCount, 1);

    // 6. Test approval workflow: approve asset
    const approvedAsset = await call('review', { id: targetAsset.id, review: 'approved' });
    assert.equal(approvedAsset.review, 'approved');
    assert.ok(approvedAsset.reviewed_at);
    assert.equal(store.autopilot().asset(targetAsset.id).review, 'approved');

    // 7. Test rejection workflow on a second asset
    const secondAsset = assets[1];
    await call('analyze', { id: secondAsset.id, confirmed: true });
    await runUntilIdle();
    assert.equal(aiCallsCount, 2);

    const rejectedAsset = await call('review', { id: secondAsset.id, review: 'rejected' });
    assert.equal(rejectedAsset.review, 'rejected');
    assert.equal(store.autopilot().asset(secondAsset.id).review, 'rejected');

    // Validate listing reflects approved status
    const listResult = await call('list', { brand_id: brand.id });
    const approvedList = listResult.assets.filter(a => a.review === 'approved');
    assert.equal(approvedList.length, 1);
    assert.equal(approvedList[0].id, targetAsset.id);
    assert.equal(approvedList[0].analysis.summary, analyzedAsset.analysis.summary);
});

test('Integration & Downstream Readiness: prepares campaign & approved assets ready for remixing & scheduling', async t => {
    const harness = createCampaignDriveHarness();
    t.after(() => harness.close());

    const { call, brand, pillars, angles, folderId, runUntilIdle, store } = harness;

    // Set up source and sync
    const source = await call('createSource', {
        brand_id: brand.id,
        kind: 'drive_public',
        name: 'Eco Drive Campaign Source',
        folder: `https://drive.google.com/drive/folders/${folderId}`
    });
    await call('connect', { id: source.id });
    await call('sync', { id: source.id });
    await runUntilIdle();

    // Analyze and approve all assets
    const assets = store.autopilot().assets();
    for (const asset of assets) {
        await call('analyze', { id: asset.id, confirmed: true });
    }
    await runUntilIdle();

    for (const asset of assets) {
        await call('review', { id: asset.id, review: 'approved' });
    }

    // Export complete context for downstream consumption
    const allApproved = store.autopilot().assets().filter(a => a.review === 'approved');
    assert.equal(allApproved.length, 3);

    const payload = {
        brandId: brand.id,
        brandName: brand.name,
        targetAudience: brand.target_audience,
        toneOfVoice: brand.tone_of_voice,
        pillars: pillars.map(p => ({ id: p.id, name: p.name, target_percentage: p.target_percentage })),
        angles: angles.map(a => ({ id: a.id, pillar_id: a.pillar_id, name: a.name })),
        approvedAssets: allApproved.map(a => ({
            id: a.id,
            name: a.name,
            mime: a.mime,
            size: a.size,
            summary: a.analysis.summary,
            tags: a.analysis.tags,
            ocr: a.analysis.ocr,
            thumbnailUrl: a.file_url || a.thumbnail_url
        }))
    };

    assert.equal(payload.brandName, 'EcoGreen Living');
    assert.equal(payload.pillars.length, 3);
    assert.equal(payload.angles.length, 6);
    assert.equal(payload.approvedAssets.length, 3);
    assert.ok(payload.approvedAssets.every(a => a.summary && a.tags.length > 0));
});
