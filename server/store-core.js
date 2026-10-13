import { randomUUID } from 'node:crypto';
import schemas from './entity-schemas.json' with { type: 'json' };
import { matches, paginate, aggregate } from './query.js';
import { fail, validateRecord } from './validation.js';
import { createImageStorage } from './image-storage.js';
import { createVideoStorage } from './video-storage.js';


const links = { Brand: 'brand_id', ContentPillar: 'pillar_id', ContentAngle: 'angle_id', SocialAccount: 'social_account_id', Post: 'post_id', MediaAsset: 'media_ids' };

export function createStoreCore(db, transactionSync) {
    const verified = Symbol('verified platform metadata');
    const publisher = Symbol('confirmed publishing');
    const imageWriter = Symbol('stored image metadata');
    let transactionDepth = 0;
    db.exec('CREATE TABLE IF NOT EXISTS records (entity TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(entity,id));');
    db.exec('CREATE TABLE IF NOT EXISTS meta_credentials (id TEXT PRIMARY KEY, encrypted TEXT NOT NULL);');
    db.exec('CREATE TABLE IF NOT EXISTS publish_attempts (id TEXT PRIMARY KEY, post_id TEXT UNIQUE NOT NULL, data TEXT NOT NULL);');
    db.exec('CREATE TABLE IF NOT EXISTS collaboration_invites (id TEXT PRIMARY KEY, post_id TEXT NOT NULL, target_id TEXT NOT NULL, data TEXT NOT NULL, UNIQUE(post_id,target_id));');
    db.exec('CREATE TABLE IF NOT EXISTS schedule_batches (id TEXT PRIMARY KEY, data TEXT NOT NULL);');
    db.exec('CREATE TABLE IF NOT EXISTS notification_reads (id TEXT PRIMARY KEY, read_at INTEGER NOT NULL);');
    db.exec("CREATE INDEX IF NOT EXISTS publishing_problem_recent ON publish_attempts(COALESCE(json_extract(data,'$.finishedAt'),json_extract(data,'$.rejectedAt'),json_extract(data,'$.startedAt'),0) DESC) WHERE json_extract(data,'$.status') IN ('failed','unknown');");
    const store = {
        saveScheduleBatch: value => db.prepare('INSERT INTO schedule_batches VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(value.id,JSON.stringify(value)),
        scheduleBatch: id => { const row=db.prepare('SELECT data FROM schedule_batches WHERE id=?').get(id); if(!row) fail('Batch review not found',404); return JSON.parse(row.data); },
        notificationRows: () => db.prepare("WITH recent AS (SELECT id,data,COALESCE(json_extract(data,'$.finishedAt'),json_extract(data,'$.rejectedAt'),json_extract(data,'$.startedAt'),0) AS time FROM publish_attempts WHERE json_extract(data,'$.status') IN ('failed','unknown') ORDER BY time DESC LIMIT 100) SELECT recent.id||':'||json_extract(recent.data,'$.status') AS id,json_extract(recent.data,'$.postId') AS postId,json_extract(post.data,'$.title') AS title,json_extract(recent.data,'$.pageName') AS pageName,json_extract(recent.data,'$.status') AS status,json_extract(recent.data,'$.message') AS message,recent.time AS time,json_extract(post.data,'$.updated_date') AS updatedDate,read.read_at AS readAt FROM recent JOIN records post ON post.entity='Post' AND post.id=json_extract(recent.data,'$.postId') LEFT JOIN notification_reads read ON read.id=recent.id||':'||json_extract(recent.data,'$.status') ORDER BY (read.read_at IS NULL) DESC,recent.time DESC").all(),
        unreadNotificationCount: () => db.prepare("SELECT COUNT(*) AS count FROM publish_attempts p LEFT JOIN notification_reads r ON r.id=p.id||':'||json_extract(p.data,'$.status') WHERE json_extract(p.data,'$.status') IN ('failed','unknown') AND r.id IS NULL").get().count,
        hasNotification: id => { const [attemptId,status,...extra]=id.split(':'); if(extra.length||!['failed','unknown'].includes(status))return false; return !!db.prepare("SELECT id FROM publish_attempts WHERE id=? AND json_extract(data,'$.status')=?").get(attemptId,status); },
        readAllNotifications: () => db.prepare("INSERT OR IGNORE INTO notification_reads SELECT id||':'||json_extract(data,'$.status'),? FROM publish_attempts WHERE json_extract(data,'$.status') IN ('failed','unknown')").run(Date.now()),
        readNotification: id => db.prepare('INSERT INTO notification_reads VALUES (?,?) ON CONFLICT(id) DO NOTHING').run(id,Date.now()),
        saveCollaboration: value => db.prepare('INSERT INTO collaboration_invites VALUES (?,?,?,?) ON CONFLICT(post_id,target_id) DO UPDATE SET id=excluded.id,data=excluded.data').run(value.id,value.postId,value.targetId,JSON.stringify(value)),
        collaborations: id => db.prepare('SELECT data FROM collaboration_invites WHERE post_id=?').all(id).map(row=>JSON.parse(row.data)),
        collaboration: id => {const row=db.prepare('SELECT data FROM collaboration_invites WHERE id=?').get(id);if(!row)fail('Invitation not found',404);return JSON.parse(row.data);},
        attemptForPost: id => {
            if (typeof id !== 'string') return null;
            const row = db.prepare('SELECT data FROM publish_attempts WHERE post_id=?').get(id);
            return row ? JSON.parse(row.data) : null;
        },
        attempt: id => {
            const row = db.prepare('SELECT data FROM publish_attempts WHERE id=?').get(id);
            if (!row) fail('Publishing confirmation not found', 404);
            return JSON.parse(row.data);
        },
        saveAttempt: value => db.prepare('INSERT INTO publish_attempts VALUES (?,?,?) ON CONFLICT(post_id) DO UPDATE SET id=excluded.id,data=excluded.data').run(value.id, value.postId, JSON.stringify(value)),
        pendingAttempts: () => db.prepare("SELECT data FROM publish_attempts WHERE json_extract(data,'$.status')='processing'").all().map(row => JSON.parse(row.data)),
        queuedAttempts: () => db.prepare("SELECT data FROM publish_attempts WHERE json_extract(data,'$.status')='queued'").all().map(row => JSON.parse(row.data)),
        imageWrite: input => store.write('MediaAsset', input, undefined, imageWriter),
        publishingWrite: (entity, input, id) => {
            if (!['Post', 'PublishJob', 'PostVariant', 'PublishingLog'].includes(entity)) fail('Invalid publishing entity');
            return store.write(entity, input, id, publisher);
        },
        close: () => db.close(),
        saveCredential: (id, encrypted) => db.prepare('INSERT INTO meta_credentials VALUES (?,?) ON CONFLICT(id) DO UPDATE SET encrypted=excluded.encrypted').run(id, encrypted),
        readCredential: (id) => db.prepare('SELECT encrypted FROM meta_credentials WHERE id=?').get(id)?.encrypted,
        deleteCredential: (id) => db.prepare('DELETE FROM meta_credentials WHERE id=?').run(id),
        credentialIds: (prefix) => db.prepare('SELECT id FROM meta_credentials WHERE id LIKE ?').all(prefix + '%').map(row => row.id),
        verifiedAccount: (input, id) => store.write('SocialAccount', input, id, verified),
        all(entity) {
            if (!Object.hasOwn(schemas, entity)) fail('Unknown or server-only entity', 404);
            return db.prepare('SELECT data FROM records WHERE entity=? ORDER BY id').all(entity).map((r) => JSON.parse(r.data));
        },
        get(entity, id) {
            const record = store.all(entity).find((r) => r.id === id);
            if (!record) fail('Record not found', 404);
            return record;
        },
        references(entity, id) {
            const field = links[entity];
            if (!field) return false;
            return Object.keys(schemas).some((name) => store.all(name).some((r) => matches(r, { [field]: id }) || (entity === 'SocialAccount' && r.account_ids?.includes(id))));
        },
        write(entity, input, id, capability) {
            store.all(entity);
            const previous = id ? store.get(entity, id) : null;
            if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Record object required');
            if (Object.keys(input).some((key) => ['id', 'created_date', 'updated_date'].includes(key))) fail('Record identity and timestamps are server-owned');
            const defaults = Object.fromEntries(Object.entries(schemas[entity].properties).filter(([, r]) => r.default !== undefined).map(([k, r]) => [k, r.default]));
            const now = new Date().toISOString();
            const record = { is_demo: false, ...defaults, ...previous, ...input, id: id || randomUUID(), created_date: previous?.created_date || now, updated_date: now };
            if (entity === 'MediaAsset' && capability !== imageWriter && (previous?.storage_id || record.storage_id || record.sha256 || record.file_url?.startsWith('/api/media/files/'))) fail('Stored image metadata is server-owned', 409);
            if (capability !== publisher) {
                const attempt = store.attemptForPost(entity === 'Post' ? record.id : record.post_id);
                if (attempt?.status === 'queued') fail('Cancel the automatic schedule before editing this post',409);
                if (attempt && attempt.status !== 'prepared') fail('Publishing history is locked; duplicate this post instead', 409);
            }
            validateRecord(entity, record, previous, schemas[entity], store, capability === verified, capability === publisher);
            db.prepare('INSERT INTO records VALUES (?,?,?) ON CONFLICT(entity,id) DO UPDATE SET data=excluded.data').run(entity, record.id, JSON.stringify(record));
            return record;
        },
        remove(entity, id) {
            const record = store.get(entity, id);
            const attempt = store.attemptForPost(entity === 'Post' ? id : record.post_id);
            if (attempt && attempt.status !== 'prepared') fail('Publishing history is locked; duplicate this post instead', 409);
            if (entity === 'SocialAccount' && record.credential_id) fail('Disconnect Facebook before removing this Page', 409);
            if (entity === 'Post' && record.status === 'draft') {
                const jobs = store.all('PublishJob').filter((job) => job.post_id === id);
                if (jobs.some((job) => !['pending', 'blocked', 'cancelled'].includes(job.status))) fail('Post has publishing attempts; preserve its history', 409);
                return store.transaction(() => {
                    db.prepare('DELETE FROM publish_attempts WHERE post_id=?').run(id);
                    db.prepare("DELETE FROM records WHERE entity IN ('PublishJob','PostVariant','PublishingLog') AND json_extract(data,'$.post_id')=?").run(id);
                    db.prepare('DELETE FROM records WHERE entity=? AND id=?').run(entity, id);
                    return { deleted: 1 };
                });
            }
            if (store.references(entity, id)) fail('Record has history or children. Archive/disconnect instead.', 409);
            if (entity === 'Post' && record.status !== 'draft') fail('Only drafts can be deleted; cancel scheduled posts instead', 409);
            if (entity === 'MediaAsset' && record.storage_id) return store.transaction(() => {
                store.images.remove(record.storage_id);
                db.prepare('DELETE FROM records WHERE entity=? AND id=?').run(entity, id);
                return { deleted: 1 };
            });
            db.prepare('DELETE FROM records WHERE entity=? AND id=?').run(entity, id);
            return { deleted: 1 };
        },
        transaction(work) {
            if (transactionDepth) return work();
            if (transactionSync) {
                transactionDepth++;
                try { return transactionSync(work); } finally { transactionDepth--; }
            }
            db.exec('BEGIN IMMEDIATE');
            transactionDepth++;
            try { const result = work(); db.exec('COMMIT'); return result; }
            catch (error) { db.exec('ROLLBACK'); throw error; }
            finally { transactionDepth--; }
        },
        execute(entity, operation, args = []) {
            store.all(entity);
            const [first = {}, second = {}] = args;
            const filtered = () => store.all(entity).filter((r) => matches(r, first));
            switch (operation) {
                case 'get': return store.get(entity, first);
                case 'filter': return paginate(filtered(), second);
                case 'list': return paginate(store.all(entity), first);
                case 'count': return filtered().length;
                case 'aggregate': return aggregate(store.all(entity).filter((r) => matches(r, first.query || {})), first);
                case 'create': return store.write(entity, first);
                case 'update': return store.write(entity, second, first);
                case 'delete': return store.remove(entity, first);
                case 'bulkCreate': return store.transaction(() => first.map((r) => store.write(entity, r)));
                case 'bulkUpdate': return store.transaction(() => first.map(({ id, ...r }) => store.write(entity, r, id)));
                case 'updateMany': return store.transaction(() => filtered().map((r) => store.write(entity, second.$set || second, r.id)));
                case 'deleteMany': return store.transaction(() => filtered().map((r) => store.remove(entity, r.id)));
                case 'upsert': return store.transaction(() => first.map((r) => {
                    const existing = store.all(entity).find((row) => second.key.every((key) => row[key] === r[key]));
                    return store.write(entity, r, existing?.id);
                }));
                default: fail('Unsupported operation', 400);
            }
        },
    };
    store.images = createImageStorage(db, store);
    store.videos = createVideoStorage(db, store);
    return store;
}
