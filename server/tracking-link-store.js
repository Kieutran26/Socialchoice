import { randomUUID } from 'node:crypto';

export function createTrackingLinkStore(db) {
    db.exec('CREATE TABLE IF NOT EXISTS tracking_links (id TEXT PRIMARY KEY, dedupe TEXT UNIQUE NOT NULL, data TEXT NOT NULL, clicks INTEGER NOT NULL DEFAULT 0, last_click TEXT);');
    db.exec('CREATE TABLE IF NOT EXISTS tracking_link_days (link_id TEXT NOT NULL, day TEXT NOT NULL, clicks INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(link_id,day));');
    const unpack = row => row ? { ...JSON.parse(row.data), id: row.id, clicks: row.clicks, last_click: row.last_click } : null;
    return {
        get: id => unpack(db.prepare('SELECT * FROM tracking_links WHERE id=?').get(id)),
        create(key, data) {
            const existing = db.prepare('SELECT * FROM tracking_links WHERE dedupe=?').get(key);
            if (existing) return unpack(existing);
            const id = randomUUID();
            db.prepare('INSERT INTO tracking_links(id,dedupe,data) VALUES (?,?,?)').run(id, key, JSON.stringify({ ...data, active: true, created_at: new Date().toISOString() }));
            return this.get(id);
        },
        list(brandId) { return db.prepare("SELECT * FROM tracking_links WHERE json_extract(data,'$.brand_id')=? ORDER BY rowid DESC LIMIT 100").all(brandId).map(unpack).map(link => ({ ...link, days: db.prepare('SELECT day,clicks FROM tracking_link_days WHERE link_id=? ORDER BY day DESC LIMIT 30').all(link.id) })); },
        hit(id) {
            const now = new Date().toISOString();
            db.prepare('UPDATE tracking_links SET clicks=clicks+1,last_click=? WHERE id=?').run(now, id);
            db.prepare('INSERT INTO tracking_link_days VALUES (?,?,1) ON CONFLICT(link_id,day) DO UPDATE SET clicks=clicks+1').run(id, now.slice(0, 10));
        },
        disable(id) { const row = db.prepare('SELECT data FROM tracking_links WHERE id=?').get(id); if (row) db.prepare('UPDATE tracking_links SET data=? WHERE id=?').run(JSON.stringify({ ...JSON.parse(row.data), active: false }), id); },
    };
}
