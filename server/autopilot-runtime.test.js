import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { hashPassword } from './admin-auth.js';
const require = createRequire(import.meta.url);
const { Miniflare, convertV4MiniflareOptions } = createRequire(require.resolve('wrangler/package.json'))('miniflare');

test('actual Worker, R2, Queue and private RPC ingest and analyze with isolated Drive/OpenRouter fixtures', async () => {
    const build = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--dry-run', '--outdir', 'worker-dist/autopilot'], { encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
    assert.equal(build.status, 0, build.stderr);
    const directory = mkdtempSync(join(tmpdir(), 'autopilot-worker-')), origin = 'https://autopilot.test', password = randomBytes(20).toString('hex');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=', 'base64');
    let aiCalls = 0, version = '1', rejectAi = false;
    const outboundService = async request => {
        const url = new URL(request.url);
        if (url.origin === 'https://www.googleapis.com') {
            assert.equal(request.headers.get('X-Goog-Api-Key'), 'fixture-source-key');
            assert.equal(request.headers.get('Authorization'), null);
            if (url.searchParams.get('alt') === 'media') return new Response(png);
            if (url.pathname.endsWith('/files/fixture_folder')) return Response.json({ id: 'fixture_folder', mimeType: 'application/vnd.google-apps.folder' });
            const file = { id: 'fixture_image', name: 'fixture.png', mimeType: 'image/png', size: String(png.length), version, modifiedTime: 'time' };
            if (url.pathname.endsWith('/files/fixture_image')) return Response.json(file); // Parents deliberately omitted.
            assert.equal(url.searchParams.get('q'), "'fixture_folder' in parents and trashed = false");
            return Response.json({ files: [file] });
        }
        assert.equal(request.url, 'https://openrouter.ai/api/v1/chat/completions');
        aiCalls++;
        assert.equal(request.headers.get('Authorization'), 'Bearer fixture-ai-key');
        const body = await request.json();
        assert.equal(body.model, 'google/fixture');
        if (typeof body.messages[0].content === 'string') {
            assert.match(body.messages[0].content, /approved_image/);
            return Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'Facebook runtime draft #test' } }] });
        }
        assert.equal(body.messages[0].content[1].image_url.url, 'data:image/png;base64,' + png.toString('base64'));
        if (rejectAi) return Response.json({ error: { message: 'private-provider-detail' } }, { status: 402 });
        return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ summary: 'Ảnh kiểm thử', tags: ['test'], ocr: 'TEST', suggested_uses: [], warnings: [] }) } }] });
    };
    const options = convertV4MiniflareOptions({ modules: true, scriptPath: 'worker-dist/autopilot/cloudflare-worker.js', compatibilityDate: '2026-10-06', compatibilityFlags: ['nodejs_compat'],
        durableObjects: { WORKSPACE: { className: 'SocialchoiceWorkspace', useSQLite: true } },
        r2Buckets: ['AUTOPILOT_ASSETS'], queueProducers: { AUTOPILOT_QUEUE: { queueName: 'autopilot-test' } }, queueConsumers: { 'autopilot-test': { maxBatchSize: 1, maxBatchTimeout: 0, maxRetries: 2 } },
        outboundService,
        bindings: { GOOGLE_DRIVE_PUBLIC_API_KEY: 'fixture-source-key', SOCIALCHOICE_PUBLIC_ORIGIN: origin, SOCIALCHOICE_BACKEND_ORIGIN: origin, SOCIALCHOICE_ADMIN_PASSWORD_HASH: hashPassword(password), SOCIALCHOICE_STORAGE_KEY: randomBytes(32).toString('hex'), SOCIALCHOICE_AUTOPILOT_ENABLED: 'true' },
    });
    options.resourcePersistencePath = directory;
    const runtime = new Miniflare(options);
    const request = (operation, input, cookie) => runtime.dispatchFetch(origin + '/api/' + operation, { method: 'POST', headers: { 'x-socialchoice-client': 'local-ui', 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(operation.startsWith('ai/') ? input : { args: [input] }) });
    try {
        assert.equal((await request('autopilot/list', {})).status, 401);
        const login = await request('auth/login', password); const cookie = login.headers.get('set-cookie').split(';')[0];
        const brand = await (await request('entities/Brand/create', { name: 'Autopilot Runtime' }, cookie)).json();
        const bucket = await runtime.getR2Bucket('AUTOPILOT_ASSETS');
        await bucket.put('owner/assets/image.png', new Uint8Array([1, 2, 3]), { httpMetadata: { contentType: 'image/png' } });
        await bucket.put('customers/other/assets/private.png', new Uint8Array([4, 5]), { httpMetadata: { contentType: 'image/png' } });
        const create = await request('autopilot/createSource', { name: 'R2 local', brand_id: brand.id, kind: 'r2', folder: 'assets/' }, cookie);
        assert.equal(create.status, 200, await create.clone().text()); const source = await create.json();
        const sync = await request('autopilot/sync', { id: source.id }, cookie); assert.equal(sync.status, 200, await sync.clone().text()); assert.equal((await sync.json()).backgroundQueued, true);
        let result;
        for (let i = 0; i < 50; i++) {
            result = await (await request('autopilot/list', { brand_id: brand.id }, cookie)).json();
            if (result.assets?.length) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert.equal(result.assets.length, 1, JSON.stringify(result));
        assert.equal(result.assets[0].name, 'image.png'); assert.equal(result.assets[0].size, 3);
        assert.equal(result.jobs[0].status, 'done');
        const generic = await request('entities/MediaAsset/list', {}, cookie); assert.equal((await generic.json()).items.length, 0);
        // This is real workerd/SQLite/Queue execution with outbound provider fixtures, not live AI acceptance.
        const driveSource = await (await request('autopilot/createSource', { name: 'Public fixture', brand_id: brand.id, kind: 'drive_public', folder: 'https://drive.google.com/drive/folders/fixture_folder' }, cookie)).json();
        assert.equal((await request('autopilot/connect', { id: driveSource.id }, cookie)).status, 200);
        const waitForJobs = async () => {
            let listed;
            for (let i = 0; i < 100; i++) {
                listed = await (await request('autopilot/list', { brand_id: brand.id }, cookie)).json();
                if (!listed.jobs.some(job => ['queued', 'running'].includes(job.status))) return listed;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            assert.fail('Queue did not finish');
        };
        await request('autopilot/sync', { id: driveSource.id }, cookie);
        let listed = await waitForJobs();
        const driveAsset = listed.assets.find(asset => asset.source_id === driveSource.id);
        assert.ok(driveAsset);
        assert.equal((await request('ai/save', { provider: 'openrouter', model: 'google/fixture', key: 'fixture-ai-key' }, cookie)).status, 200);
        assert.equal((await request('autopilot/analyze', { id: driveAsset.id }, cookie)).status, 409);
        assert.equal(aiCalls, 0);
        await request('autopilot/analyze', { id: driveAsset.id, confirmed: true }, cookie);
        listed = await waitForJobs();
        let analyzed = listed.assets.find(asset => asset.id === driveAsset.id);
        assert.equal(analyzed.analysis_status, 'analyzed', JSON.stringify(listed.jobs));
        assert.equal(analyzed.analysis.ocr, 'TEST'); assert.equal(analyzed.review, 'pending');
        await request('autopilot/review', { id: driveAsset.id, review: 'approved' }, cookie);
        assert.equal((await (await request('autopilot/analyze', { id: driveAsset.id, confirmed: true }, cookie)).json()).cached, true);
        assert.equal(aiCalls, 1);
        version = '2'; await request('autopilot/sync', { id: driveSource.id }, cookie);
        listed = await waitForJobs(); analyzed = listed.assets.find(asset => asset.id === driveAsset.id);
        assert.equal(analyzed.analysis, null); assert.equal(analyzed.review, 'pending');
        rejectAi = true;
        const failedJob = await (await request('autopilot/analyze', { id: driveAsset.id, confirmed: true }, cookie)).json();
        listed = await waitForJobs();
        const failed = listed.jobs.find(job => job.id === failedJob.id);
        assert.deepEqual(failed.diagnostic, { stage: 'ai_analysis', code: 'AI_BILLING_REQUIRED', providerStatus: 402 });
        assert.ok(!JSON.stringify(listed).includes('private-provider-detail')); assert.equal(aiCalls, 2);
        assert.equal((await request('autopilot/retry', { id: failedJob.id }, cookie)).status, 409);
        rejectAi = false;
        assert.equal((await request('autopilot/retry', { id: failedJob.id, confirmed: true }, cookie)).status, 200);
        listed = await waitForJobs(); assert.equal(listed.assets.find(asset => asset.id === driveAsset.id).analysis_status, 'analyzed');
        assert.equal(aiCalls, 3);
        const other = await (await request('entities/Brand/create', { name: 'Other brand' }, cookie)).json();
        const isolated = await (await request('autopilot/list', { brand_id: other.id }, cookie)).json();
        assert.equal(isolated.assets.length, 0); assert.equal(isolated.jobs.length, 0);
        const posts = await (await request('entities/Post/list', {}, cookie)).json(); assert.equal(posts.items.length, 0);
        await request('autopilot/review', { id: driveAsset.id, review: 'approved' }, cookie);
        const draftInput = { id: driveAsset.id, request_id: randomUUID(), goal: 'Test design', tone: 'Friendly', brief: 'Synthetic fixture only', cta: '', language: 'vi', confirmed: true };
        assert.equal((await request('autopilot/generateDraft', draftInput)).status, 401);
        const draftResponse = await request('autopilot/generateDraft', draftInput, cookie);
        assert.equal(draftResponse.status, 200, await draftResponse.clone().text()); const draft = await draftResponse.json();
        assert.equal(draft.text, 'Facebook runtime draft #test'); assert.equal(aiCalls, 4);
        assert.equal((await request('autopilot/generateDraft', draftInput, cookie)).status, 200); assert.equal(aiCalls, 4);
        const saveInput = { id: draft.id, title: 'Runtime human review', caption: 'Edited runtime caption' };
        const savedResponse = await request('autopilot/saveAssetDraft', saveInput, cookie);
        assert.equal(savedResponse.status, 200, await savedResponse.clone().text()); const saved = await savedResponse.json();
        assert.equal((await (await request('autopilot/saveAssetDraft', saveInput, cookie)).json()).post_id, saved.post_id);
        const savedPost = await (await request('entities/Post/get', saved.post_id, cookie)).json();
        assert.equal(savedPost.status, 'draft'); assert.equal(savedPost.caption, saveInput.caption); assert.equal(savedPost.media_ids.length, 1);
        const mediaPage = await (await request('entities/MediaAsset/list', {}, cookie)).json();
        assert.equal(mediaPage.items.length, 1); const media = mediaPage.items[0];
        assert.equal((await runtime.dispatchFetch(origin + media.file_url)).status, 401);
        const imageResponse = await runtime.dispatchFetch(origin + media.file_url, { headers: { cookie } });
        assert.equal(imageResponse.status, 200); assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()), png);
        const afterPosts = await (await request('entities/Post/list', {}, cookie)).json(); assert.equal(afterPosts.items.length, 1);
        const deliveries = await (await request('entities/PublishJob/list', {}, cookie)).json(); assert.equal(deliveries.items.length, 0);
        // RPC has no publicly routable HTTP counterpart.
        assert.equal((await runtime.dispatchFetch(origin + '/runAutopilot')).status, 404);
        assert.equal((await request('autopilot/runAutopilot', {}, cookie)).status, 404);
    } finally { await runtime.dispose(); rmSync(directory, { recursive: true, force: true }); }
});
