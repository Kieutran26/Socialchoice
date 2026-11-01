import { randomUUID, createHash } from 'node:crypto';
import { parsePublicDriveFolder } from './autopilot-providers.js';
import { fail } from './validation.js';

// Private tables: not registered with the generic entity write API. Each DB is one workspace.
export function createAutopilotStore(db, store) {
    db.exec(`CREATE TABLE IF NOT EXISTS autopilot_sources (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS autopilot_assets (id TEXT PRIMARY KEY, source_id TEXT NOT NULL, external_id TEXT NOT NULL, data TEXT NOT NULL, UNIQUE(source_id,external_id));
        CREATE TABLE IF NOT EXISTS autopilot_jobs (id TEXT PRIMARY KEY, dedupe TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS autopilot_drafts (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS autopilot_oauth (state TEXT PRIMARY KEY, data TEXT NOT NULL);`);
    const rows = table => db.prepare(`SELECT data FROM ${table} ORDER BY rowid`).all().map(row => JSON.parse(row.data));
    const get = (table, id) => { const row = db.prepare(`SELECT data FROM ${table} WHERE id=?`).get(id); if (!row) fail('Autopilot record not found', 404); return JSON.parse(row.data); };
    const save = (table, value) => { db.prepare(`UPDATE ${table} SET data=? WHERE id=?`).run(JSON.stringify(value), value.id); return value; };
    const api = {
        sources: () => rows('autopilot_sources'),
        source: id => get('autopilot_sources', id),
        saveSource: value => save('autopilot_sources', value),
        createSource(input) {
            if (input.kind === 'drive_public') input = { ...input, kind: 'drive', ...parsePublicDriveFolder(input.folder) };
            else if (input.access === 'public') fail('Use a public Drive folder link');
            const brand = store.get('Brand', input.brand_id);
            if (brand.is_demo || brand.status === 'archived') fail('Choose an active live brand', 409);
            if (!['drive', 'r2'].includes(input.kind) || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 160) fail('Valid source name and kind required');
            if (api.sources().length >= 30) fail('Source limit reached', 409);
            if (input.kind === 'drive' ? !/^[a-zA-Z0-9_-]{1,200}$/.test(input.folder || '') : !/^[a-zA-Z0-9/_-]{1,200}\/$/.test(input.folder || '') || input.folder.includes('..')) fail('Valid folder ID or storage prefix ending in / required');
            const source = { id: randomUUID(), brand_id: brand.id, kind: input.kind, name: input.name.trim(), folder: input.folder, status: input.kind === 'drive' ? 'disconnected' : 'connected', ...(input.access === 'public' ? { access: 'public', resource_key: input.resource_key } : {}), generation: 0, created_at: new Date().toISOString() };
            db.prepare('INSERT INTO autopilot_sources VALUES (?,?)').run(source.id, JSON.stringify(source)); return source;
        },
        assets: () => rows('autopilot_assets'),
        asset: id => get('autopilot_assets', id),
        saveAsset: value => save('autopilot_assets', value),
        upsertAsset(source, file) {
            if (typeof file.id !== 'string' || !file.id || file.id.length > 1024 || typeof file.name !== 'string' || file.name.length > 1024 || typeof file.version !== 'string' || !file.version || file.version.length > 500 || !Number.isSafeInteger(file.size) || file.size < 0 || typeof file.mime !== 'string' || file.mime.length > 200) fail('Invalid source metadata', 502);
            const row = db.prepare('SELECT data FROM autopilot_assets WHERE source_id=? AND external_id=?').get(source.id, file.id);
            const old = row ? JSON.parse(row.data) : null;
            if (!old && api.assets().length >= 10000) fail('Asset limit reached', 409);
            const changed = !old || old.version !== file.version;
            const asset = { ...old, id: old?.id || randomUUID(), source_id: source.id, brand_id: source.brand_id, external_id: file.id, name: file.name, mime: file.mime, resource_key: file.resource_key || null, size: file.size, version: file.version, analysis_revision: (old?.analysis_revision || 0) + (old && changed ? 1 : 0), availability: 'available', seen_scan: source.scan, updated_at: new Date().toISOString(), ...(changed ? { analysis: null, review: 'pending', analysis_status: 'not_analyzed' } : {}) };
            db.prepare('INSERT INTO autopilot_assets VALUES (?,?,?,?) ON CONFLICT(source_id,external_id) DO UPDATE SET data=excluded.data').run(asset.id, source.id, file.id, JSON.stringify(asset)); return asset;
        },
        drafts: () => rows('autopilot_drafts'),
        draft: id => get('autopilot_drafts', id),
        saveDraft: value => save('autopilot_drafts', value),
        createDraft(value) {
            if (api.drafts().length >= 1000) fail('Asset draft history is full', 409);
            db.prepare('INSERT INTO autopilot_drafts VALUES (?,?)').run(value.id, JSON.stringify(value));
            return value;
        },
        jobs: () => rows('autopilot_jobs'),
        enqueue(kind, target, version) {
            const dedupe = createHash('sha256').update(JSON.stringify([kind, target, version])).digest('hex');
            const existing = db.prepare('SELECT data FROM autopilot_jobs WHERE dedupe=?').get(dedupe);
            if (existing) return JSON.parse(existing.data);
            if (api.jobs().filter(job => ['queued', 'running'].includes(job.status)).length >= 200) fail('Autopilot queue is full', 429);
            const job = { id: randomUUID(), kind, target, version, status: 'queued', attempts: 0, due: Date.now() };
            db.prepare('INSERT INTO autopilot_jobs VALUES (?,?,?)').run(job.id, dedupe, JSON.stringify(job)); return job;
        },
        claim(now = Date.now()) {
            return store.transaction(() => {
                // Expired leases are recoverable; a random lease fences late workers.
                for (const expired of api.jobs().filter(job => job.kind === 'analyze' && job.status === 'running' && job.lease_until <= now)) {
                    save('autopilot_jobs', { ...expired, status: 'failed', error: 'INTERRUPTED_REVIEW_REQUIRED', lease: null, lease_until: 0 });
                    const asset = api.assets().find(asset => asset.id === expired.target && asset.version === expired.version.asset && (asset.analysis_revision || 0) === (expired.version.revision || 0));
                    if (asset) api.saveAsset({ ...asset, analysis_status: 'failed' });
                }
                const job = api.jobs().find(job => job.status === 'queued' && job.due <= now || job.kind === 'sync' && job.status === 'running' && job.lease_until <= now);
                if (!job) return null;
                return save('autopilot_jobs', { ...job, status: 'running', lease: randomUUID(), lease_until: now + 120000, attempts: job.attempts + 1 });
            });
        },
        current: job => { const latest = get('autopilot_jobs', job.id); return latest.status === 'running' && latest.lease === job.lease && latest.lease_until > Date.now(); },
        finish(job, error, retryable = false, diagnostic = null) {
            if (!api.current(job)) return;
            save('autopilot_jobs', { ...job, status: error ? retryable && job.attempts < 3 ? 'queued' : 'failed' : 'done', due: Date.now() + Math.min(60000, 1000 * 2 ** job.attempts), error: error || null, diagnostic: error ? diagnostic : null, lease: null, lease_until: 0 });
        },
        retry(id, confirmed) {
            const job = get('autopilot_jobs', id);
            if (job.kind === 'analyze' && confirmed !== true) fail('Confirm retrying the AI request', 409);
            if (job.status !== 'failed') fail('Only failed jobs can be retried', 409);
            return save('autopilot_jobs', { ...job, status: 'queued', due: Date.now(), attempts: 0, error: null, diagnostic: null });
        },
        oauthSave(state, value) {
            for (const row of db.prepare("SELECT state FROM autopilot_oauth WHERE json_extract(data,'$.expires')<?").all(Date.now())) store.deleteCredential(`autopilot:oauth:${row.state}`);
            db.prepare("DELETE FROM autopilot_oauth WHERE json_extract(data,'$.expires')<?").run(Date.now());
            if (db.prepare('SELECT COUNT(*) AS n FROM autopilot_oauth').get().n >= 30) fail('Too many connection attempts', 429);
            db.prepare('INSERT INTO autopilot_oauth VALUES (?,?)').run(state, JSON.stringify(value));
        },
        oauthTake(state, session) {
            return store.transaction(() => {
                const row = db.prepare('SELECT data FROM autopilot_oauth WHERE state=?').get(state || '');
                const value = row ? JSON.parse(row.data) : null;
                if (!value || value.session !== session || value.expires < Date.now()) fail('Drive authorization expired. Connect again.', 409);
                db.prepare('DELETE FROM autopilot_oauth WHERE state=?').run(state); return value;
            });
        },
    };
    return api;
}
