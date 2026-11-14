import { randomBytes, randomUUID } from 'node:crypto';

const trackingDayFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

function generateShortCode() {
    const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
    const bytes = randomBytes(6);
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return code;
}

export function createTrackingLinkStore(db) {
    db.exec('CREATE TABLE IF NOT EXISTS tracking_links (id TEXT PRIMARY KEY, dedupe TEXT UNIQUE NOT NULL, data TEXT NOT NULL, clicks INTEGER NOT NULL DEFAULT 0, last_click TEXT);');
    try { db.exec('ALTER TABLE tracking_links ADD COLUMN code TEXT;'); } catch {}
    try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_tracking_links_code ON tracking_links(code) WHERE code IS NOT NULL;'); } catch {}
    db.exec('CREATE TABLE IF NOT EXISTS tracking_link_days (link_id TEXT NOT NULL, day TEXT NOT NULL, clicks INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(link_id,day));');
    const unpack = row => {
        if (!row) return null;
        const code = row.code || row.id.slice(0, 8);
        return { ...JSON.parse(row.data), id: row.id, code, clicks: row.clicks, last_click: row.last_click };
    };
    return {
        get: id => unpack(db.prepare('SELECT * FROM tracking_links WHERE id=? OR code=?').get(id, id)),
        getByCode(code) {
            if (!code || typeof code !== 'string') return null;
            return unpack(db.prepare('SELECT * FROM tracking_links WHERE code=? OR id=? OR (code IS NULL AND substr(id,1,8)=?)').get(code, code, code));
        },
        create(key, data) {
            const existing = db.prepare('SELECT * FROM tracking_links WHERE dedupe=?').get(key);
            if (existing) {
                if (!existing.code) {
                    const newCode = generateShortCode();
                    try {
                        db.prepare('UPDATE tracking_links SET code=? WHERE id=?').run(newCode, existing.id);
                        existing.code = newCode;
                    } catch {}
                }
                return unpack(existing);
            }
            const id = randomUUID();
            let code = generateShortCode();
            for (let attempts = 0; attempts < 5; attempts++) {
                const clash = db.prepare('SELECT id FROM tracking_links WHERE code=?').get(code);
                if (!clash) break;
                code = generateShortCode();
            }
            db.prepare('INSERT INTO tracking_links(id,dedupe,data,code) VALUES (?,?,?,?)').run(id, key, JSON.stringify({ ...data, active: true, created_at: new Date().toISOString() }), code);
            return this.get(id);
        },
        list(brandId, isDemo) {
            const conditions = [];
            const params = [];
            if (Array.isArray(brandId)) {
                if (brandId.length === 0) return [];
                conditions.push(`json_extract(data,'$.brand_id') IN (${brandId.map(() => '?').join(',')})`);
                params.push(...brandId);
            } else if (brandId && brandId !== 'all') {
                conditions.push("json_extract(data,'$.brand_id')=?");
                params.push(brandId);
            }
            if (isDemo === true) {
                conditions.push("json_extract(data,'$.is_demo')=1");
            } else if (isDemo === false) {
                conditions.push("(json_extract(data,'$.is_demo')=0 OR json_extract(data,'$.is_demo') IS NULL)");
            }
            const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
            const limit = (!brandId || brandId === 'all' || Array.isArray(brandId)) ? 500 : 200;
            const rows = db.prepare(`SELECT * FROM tracking_links ${where} ORDER BY rowid DESC LIMIT ?`).all(...params, limit);
            const dayStmt = db.prepare('SELECT day,clicks FROM tracking_link_days WHERE link_id=? ORDER BY day DESC LIMIT 30');
            return rows.map(unpack).map(link => ({ ...link, days: dayStmt.all(link.id) }));
        },
        hit(id) {
            const nowDate = new Date();
            const now = nowDate.toISOString();
            const day = trackingDayFormat.format(nowDate);
            db.prepare('UPDATE tracking_links SET clicks=clicks+1,last_click=? WHERE id=?').run(now, id);
            db.prepare('INSERT INTO tracking_link_days VALUES (?,?,1) ON CONFLICT(link_id,day) DO UPDATE SET clicks=clicks+1').run(id, day);
        },
        disable(id) { const row = db.prepare('SELECT data FROM tracking_links WHERE id=?').get(id); if (row) db.prepare('UPDATE tracking_links SET data=? WHERE id=?').run(JSON.stringify({ ...JSON.parse(row.data), active: false }), id); },
    };
}
