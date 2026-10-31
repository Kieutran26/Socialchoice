import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { hashPassword } from './admin-auth.js';
const require = createRequire(import.meta.url);
const { Miniflare, convertV4MiniflareOptions } = createRequire(require.resolve('wrangler/package.json'))('miniflare');

test('actual Worker, R2, Queue and private Durable Object RPC ingest metadata in isolation', async () => {
    const build = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--dry-run', '--outdir', 'worker-dist/autopilot'], { encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
    assert.equal(build.status, 0, build.stderr);
    const directory = mkdtempSync(join(tmpdir(), 'autopilot-worker-')), origin = 'https://autopilot.test', password = randomBytes(20).toString('hex');
    const options = convertV4MiniflareOptions({ modules: true, scriptPath: 'worker-dist/autopilot/cloudflare-worker.js', compatibilityDate: '2026-10-06', compatibilityFlags: ['nodejs_compat'],
        durableObjects: { WORKSPACE: { className: 'SocialchoiceWorkspace', useSQLite: true } },
        r2Buckets: ['AUTOPILOT_ASSETS'], queueProducers: { AUTOPILOT_QUEUE: { queueName: 'autopilot-test' } }, queueConsumers: { 'autopilot-test': { maxBatchSize: 1, maxBatchTimeout: 0, maxRetries: 2 } },
        bindings: { SOCIALCHOICE_PUBLIC_ORIGIN: origin, SOCIALCHOICE_BACKEND_ORIGIN: origin, SOCIALCHOICE_ADMIN_PASSWORD_HASH: hashPassword(password), SOCIALCHOICE_STORAGE_KEY: randomBytes(32).toString('hex'), SOCIALCHOICE_AUTOPILOT_ENABLED: 'true' },
    });
    options.resourcePersistencePath = directory;
    const runtime = new Miniflare(options);
    const request = (operation, input, cookie) => runtime.dispatchFetch(origin + '/api/' + operation, { method: 'POST', headers: { 'x-socialchoice-client': 'local-ui', 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify({ args: [input] }) });
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
        // RPC has no publicly routable HTTP counterpart.
        assert.equal((await runtime.dispatchFetch(origin + '/runAutopilot')).status, 404);
        assert.equal((await request('autopilot/runAutopilot', {}, cookie)).status, 404);
    } finally { await runtime.dispose(); rmSync(directory, { recursive: true, force: true }); }
});
