import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { createMetaVault } from './meta-vault.js';
import { createDriveProvider, createR2Provider, DRIVE_SCOPE, IMAGE_LIMIT } from './autopilot-providers.js';
import { createAssetIntelligence, ANALYSIS_VERSION } from './autopilot-intelligence.js';
import { fail } from './validation.js';

export function createAutopilot({ store, auth, env = {}, key, bucket, storageRoot = 'owner/', aiFetch, fetcher, authorize, wake }) {
    const enabled = env.SOCIALCHOICE_AUTOPILOT_ENABLED === 'true';
    const ready = enabled && /^[a-f0-9]{64}$/i.test(key || '');
    const vault = ready ? createMetaVault(store, key) : null;
    const db = () => store.autopilot(); // Lazy: disabled features do not migrate existing workspaces.
    const origin = env.SOCIALCHOICE_PUBLIC_ORIGIN || `http://127.0.0.1:${env.SOCIALCHOICE_FRONTEND_PORT || 5173}`;
    const config = { apiKey: env.GOOGLE_DRIVE_PUBLIC_API_KEY, clientId: env.GOOGLE_DRIVE_CLIENT_ID, clientSecret: env.GOOGLE_DRIVE_CLIENT_SECRET, redirectUri: origin + '/api/drive/callback' };
    const driveReady = !!(ready && auth.enabled && config.clientId && config.clientSecret);
    const drive = vault ? createDriveProvider(config, vault, fetcher, source => db().source(source.id).generation === source.generation) : null;
    const r2 = createR2Provider(bucket, storageRoot);
    const intelligence = ready ? createAssetIntelligence(store, key, aiFetch) : null;
    const cookie = (nonce, age) => `socialchoice_drive_oauth=${nonce}; Path=/api/drive/callback; HttpOnly; SameSite=Lax; Max-Age=${age}${origin.startsWith('https:') ? '; Secure' : ''}`;
    const sourceFor = id => {
        const source = db().source(id), brand = store.get('Brand', source.brand_id);
        if (brand.is_demo || brand.status === 'archived') fail('Choose an active live brand', 409); return source;
    };
    const requireReady = () => { if (!ready) fail('Autopilot is not enabled or encryption is not configured', 409); };
    const notify = async job => {
        if (!wake || job.status !== 'queued') return job;
        try { await wake(); return { ...job, backgroundQueued: true }; }
        catch { return { ...job, backgroundQueued: false }; }
    };
    let busy = false;
    return {
        pendingAt() {
            requireReady();
            const times = db().jobs().filter(job => ['queued', 'running'].includes(job.status)).map(job => job.status === 'running' ? job.lease_until : job.due);
            return times.length ? Math.min(...times) : null;
        },
        async callback(req, res) {
            requireReady(); if (!driveReady) fail('Drive OAuth is not configured', 409);
            const url = new URL(req.url, origin);
            const nonce = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('socialchoice_drive_oauth='))?.split('=')[1];
            const state = url.searchParams.get('state');
            if (!/^[a-f0-9]{64}$/.test(state || '') || !/^[a-f0-9]{64}$/.test(nonce || '')) fail('Invalid Drive authorization', 400);
            const ticket = db().oauthTake(state, nonce);
            res.setHeader('Set-Cookie', cookie('', 0));
            let outcome = 'failed';
            try {
                if (!auth.sessionActive(ticket.userSession)) fail('Sign in required', 401);
                const source = sourceFor(ticket.source_id);
                if (source.generation !== ticket.generation) fail('Drive connection changed', 409);
                const code = url.searchParams.get('code');
                if (url.searchParams.has('error') || !code || code.length > 4096) fail('Drive authorization was not completed', 400);
                const { verifier } = vault.read(`autopilot:oauth:${state}`);
                await authorize?.(); await drive.exchange(source, code, verifier);
                const current = sourceFor(source.id);
                if (!auth.sessionActive(ticket.userSession) || current.generation !== ticket.generation) { drive.disconnect(source); fail('Drive connection changed. Connect again.', 409); }
                db().saveSource({ ...current, status: 'connected', cursor: null }); outcome = 'connected';
            } catch {
                outcome = 'failed';
            } finally {
                vault.remove(`autopilot:oauth:${state}`);
                // Never include codes, provider errors or secrets in redirects.
                res.writeHead(303, { Location: origin + '/media?drive=' + outcome, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }); res.end();
            }
        },
        async execute(operation, input = {}, req, res) {
            if (operation === 'status') return { enabled, ready, driveReady, publicDriveReady: !!(ready && config.apiKey), storageReady: !!bucket && ready, backgroundReady: !!wake && ready, storagePrefix: ready && bucket ? storageRoot : null };
            requireReady(); await authorize?.();
            if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Autopilot input required');
            if (operation === 'list') {
                if (input.brand_id) store.get('Brand', input.brand_id);
                const filter = row => !input.brand_id || row.brand_id === input.brand_id;
                const search = typeof input.search === 'string' ? input.search.slice(0, 200).toLowerCase() : '';
                const assets = db().assets().filter(filter).filter(asset => !search || [asset.name, asset.analysis?.summary, ...(asset.analysis?.tags || [])].join(' ').toLowerCase().includes(search));
                const offset = Number.isInteger(input.offset) && input.offset >= 0 ? input.offset : 0;
                const sources = db().sources().filter(filter);
                const sourceIds = new Set(sources.map(source => source.id)), assetIds = new Set(db().assets().filter(filter).map(asset => asset.id));
                return { sources, assets: assets.slice(offset, offset + 100), total: assets.length, nextOffset: offset + 100 < assets.length ? offset + 100 : null, jobs: db().jobs().filter(job => sourceIds.has(job.target) || assetIds.has(job.target)).slice(-100).map(({ lease, ...job }) => job) };
            }
            if (operation === 'createSource') {
                if (input.kind === 'r2' && !bucket) fail('R2 binding required', 409);
                if (input.kind === 'drive_public' && !config.apiKey) fail('Public Drive requires a server API key', 409);
                return db().createSource(input);
            }
            if (operation === 'connect') {
                const source = sourceFor(input.id);
                if (source.kind === 'r2') {
                    if (!bucket) fail('R2 binding required', 409);
                    db().saveSource({ ...source, status: 'connected', generation: source.generation + 1, cursor: null });
                    return { connected: true };
                }
                if (source.access === 'public') {
                    await drive.verify(source);
                    const current = sourceFor(source.id);
                    if (current.generation !== source.generation) fail('Drive connection changed', 409);
                    db().saveSource({ ...current, status: 'connected', generation: current.generation + 1, cursor: null });
                    return { connected: true };
                }
                if (!driveReady) fail('Configure Google Drive OAuth and admin sign-in first', 409);
                // Serialize reconnect against scans and pending authorization callbacks.
                const pending = { ...source, generation: source.generation + 1, status: 'disconnected', cursor: null };
                drive.disconnect(source); db().saveSource(pending);
                const state = randomBytes(32).toString('hex'), nonce = randomBytes(32).toString('hex'), verifier = randomBytes(32).toString('base64url');
                db().oauthSave(state, { session: nonce, userSession: auth.sessionKey(req), source_id: source.id, generation: pending.generation, expires: Date.now() + 600000 });
                vault.save(`autopilot:oauth:${state}`, { verifier });
                res.setHeader('Set-Cookie', cookie(nonce, 600));
                const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
                url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'code', scope: DRIVE_SCOPE, access_type: 'offline', prompt: 'consent', state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString(); return { url: url.href };
            }
            if (operation === 'disconnect') {
                const source = sourceFor(input.id); if (source.kind === 'drive') drive.disconnect(source);
                db().saveSource({ ...source, status: 'disconnected', generation: source.generation + 1, cursor: null });
                for (const asset of db().assets().filter(asset => asset.source_id === source.id)) db().saveAsset({ ...asset, availability: 'disconnected' });
                return { disconnected: true };
            }
            if (operation === 'sync') {
                const source = sourceFor(input.id); if (source.status !== 'connected') fail('Connect this source first', 409);
                const job = store.transaction(() => {
                    const existing = db().jobs().find(job => job.kind === 'sync' && job.target === source.id && job.version?.generation === source.generation && ['queued', 'running'].includes(job.status)); if (existing) return existing;
                    const next = { ...source, scan: randomUUID(), scan_pages: 0, cursor: null }; db().saveSource(next);
                    return db().enqueue('sync', next.id, { scan: next.scan, generation: next.generation, cursor: null });
                });
                return notify(job);
            }
            if (operation === 'analyze') {
                const asset = db().asset(input.id), source = sourceFor(asset.source_id);
                if (input.confirmed !== true || asset.availability !== 'available' || source.status !== 'connected') fail('Confirm sending this image to your AI provider', 409);
                if (!['image/png', 'image/jpeg', 'image/webp'].includes(asset.mime) || asset.size > IMAGE_LIMIT || !asset.size) fail('Analysis supports JPEG, PNG and still WebP up to 3 MiB', 409);
                const config = intelligence.config();
                const version = { asset: asset.version, generation: source.generation, schema: ANALYSIS_VERSION, provider: config.provider, model: config.model };
                if (asset.analysis && asset.analysis_key === JSON.stringify(version)) return { cached: true, asset };
                const job = db().enqueue('analyze', asset.id, version);
                if (['queued', 'running'].includes(job.status)) db().saveAsset({ ...asset, analysis_status: 'queued' }); return notify(job);
            }
            if (operation === 'review') {
                const asset = db().asset(input.id); sourceFor(asset.source_id);
                if (asset.availability !== 'available' || !asset.analysis || !['approved', 'rejected'].includes(input.review)) fail('Choose an analyzed asset and review outcome');
                return db().saveAsset({ ...asset, review: input.review, reviewed_at: new Date().toISOString() });
            }
            if (operation === 'retry') return notify(db().retry(input.id, input.confirmed));
            if (operation !== 'run') fail('Unknown Autopilot operation', 404);
            if (busy) fail('Autopilot worker is busy', 429); busy = true;
            let job;
            try {
                job = db().claim(); if (!job) return { idle: true };
                const asset = job.kind === 'analyze' ? db().asset(job.target) : null;
                const source = sourceFor(asset ? asset.source_id : job.target);
                if (source.status !== 'connected' || source.generation !== job.version.generation) fail('Source changed. Queue a new request.', 409);
                if (job.kind === 'sync') {
                    if (source.scan !== job.version.scan || source.cursor !== job.version.cursor) fail('Sync cursor is stale. Start a new sync.', 409);
                    if ((source.scan_pages || 0) >= 100) fail('Sync page limit reached', 409);
                    const page = await (source.kind === 'drive' ? drive : r2).list(source);
                    await authorize?.();
                    store.transaction(() => {
                        const current = sourceFor(source.id);
                        if (!db().current(job) || current.generation !== source.generation || current.scan !== source.scan) fail('Source changed during sync', 409);
                        if (page.cursor && page.cursor === source.cursor) fail('Source cursor did not advance', 502);
                        for (const file of page.files) db().upsertAsset(source, file);
                        db().saveSource({ ...current, cursor: page.cursor, scan_pages: (current.scan_pages || 0) + 1, ...(page.cursor ? {} : { last_synced_at: new Date().toISOString() }) });
                        if (page.cursor) db().enqueue('sync', source.id, { scan: source.scan, generation: source.generation, cursor: page.cursor });
                        else for (const old of db().assets().filter(asset => asset.source_id === source.id && asset.seen_scan !== source.scan)) db().saveAsset({ ...old, availability: 'missing' });
                        db().finish(job);
                    });
                } else {
                    if (asset.version !== job.version.asset || asset.availability !== 'available') fail('Asset changed. Queue a new analysis.', 409);
                    const bytes = await (source.kind === 'drive' ? drive : r2).image(source, asset);
                    await authorize?.();
                    const latest = db().asset(asset.id);
                    if (!db().current(job) || sourceFor(source.id).generation !== source.generation || latest.version !== asset.version || latest.availability !== 'available') fail('Source changed before analysis', 409);
                    const analysis = await intelligence.analyze(asset, bytes, job.version);
                    await authorize?.();
                    store.transaction(() => {
                        const current = db().asset(asset.id);
                        if (!db().current(job) || sourceFor(source.id).generation !== source.generation || current.version !== asset.version || current.availability !== 'available') fail('Asset changed during analysis', 409);
                        db().saveAsset({ ...current, analysis, analysis_key: JSON.stringify(job.version), analysis_status: 'analyzed', review: 'pending' }); db().finish(job);
                    });
                }
                return { job: job.id, status: 'done' };
            } catch (error) {
                if (!job) throw error;
                // AI calls are never automatically retried: cost/uncertain outcomes need explicit action.
                const code = ['TimeoutError', 'AbortError'].includes(error.name) ? 'TIMEOUT' : error.status === 409 ? 'REVIEW_REQUIRED' : 'PROVIDER_OR_ASSET_ERROR';
                const ownsLease = db().current(job);
                db().finish(job, code, job.kind === 'sync' && (error.retryable || code === 'TIMEOUT'));
                if (ownsLease && job.kind === 'analyze' && db().asset(job.target).version === job.version.asset) { const asset = db().asset(job.target); db().saveAsset({ ...asset, analysis_status: 'failed' }); }
                return { job: job.id, status: 'failed', error: code };
            } finally { busy = false; }
        },
    };
}
