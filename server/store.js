import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { matches, paginate, aggregate } from './query.js';
import { fail, validateRecord } from './validation.js';

const schemas = JSON.parse(readFileSync(new URL('./entity-schemas.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const links = { Brand: 'brand_id', ContentPillar: 'pillar_id', ContentAngle: 'angle_id', SocialAccount: 'social_account_id', Post: 'post_id', MediaAsset: 'media_ids' };

export function createStore(path) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    const db = new DatabaseSync(path);
    const verified = Symbol('verified platform metadata');
    let transactionDepth = 0;
    db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records (entity TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(entity,id));');
    db.exec('CREATE TABLE IF NOT EXISTS meta_credentials (id TEXT PRIMARY KEY, encrypted TEXT NOT NULL);');
    const store = {
        close: () => db.close(),
        saveCredential: (id, encrypted) => db.prepare('INSERT INTO meta_credentials VALUES (?,?) ON CONFLICT(id) DO UPDATE SET encrypted=excluded.encrypted').run(id, encrypted),
        readCredential: (id) => db.prepare('SELECT encrypted FROM meta_credentials WHERE id=?').get(id)?.encrypted,
        deleteCredential: (id) => db.prepare('DELETE FROM meta_credentials WHERE id=?').run(id),
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
            validateRecord(entity, record, previous, schemas[entity], store, capability === verified);
            db.prepare('INSERT INTO records VALUES (?,?,?) ON CONFLICT(entity,id) DO UPDATE SET data=excluded.data').run(entity, record.id, JSON.stringify(record));
            return record;
        },
        remove(entity, id) {
            const record = store.get(entity, id);
            if (entity === 'SocialAccount' && record.credential_id) fail('Disconnect Facebook before removing this Page', 409);
            if (entity === 'Post' && record.status === 'draft') {
                const jobs = store.all('PublishJob').filter((job) => job.post_id === id);
                if (jobs.some((job) => !['pending', 'blocked', 'cancelled'].includes(job.status))) fail('Post has publishing attempts; preserve its history', 409);
                return store.transaction(() => {
                    db.prepare("DELETE FROM records WHERE entity IN ('PublishJob','PostVariant','PublishingLog') AND json_extract(data,'$.post_id')=?").run(id);
                    db.prepare('DELETE FROM records WHERE entity=? AND id=?').run(entity, id);
                    return { deleted: 1 };
                });
            }
            if (store.references(entity, id)) fail('Record has history or children. Archive/disconnect instead.', 409);
            if (entity === 'Post' && record.status !== 'draft') fail('Only drafts can be deleted; cancel scheduled posts instead', 409);
            db.prepare('DELETE FROM records WHERE entity=? AND id=?').run(entity, id);
            return { deleted: 1 };
        },
        transaction(work) {
            if (transactionDepth) return work();
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
    return store;
}
