export function createRecurringPostStore(db) {
    db.exec('CREATE TABLE IF NOT EXISTS recurring_posts (id TEXT PRIMARY KEY, source_id TEXT NOT NULL, data TEXT NOT NULL); CREATE INDEX IF NOT EXISTS recurring_by_source ON recurring_posts(source_id);');
    const parse = row => row ? JSON.parse(row.data) : null;
    return {
        get: id => parse(db.prepare('SELECT data FROM recurring_posts WHERE id=?').get(id)),
        list: sourceId => db.prepare('SELECT data FROM recurring_posts WHERE source_id=? ORDER BY rowid DESC').all(sourceId).map(parse),
        active: () => db.prepare("SELECT data FROM recurring_posts WHERE json_extract(data,'$.status')='active'").all().map(parse),
        save: value => db.prepare('INSERT INTO recurring_posts VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(value.id, value.source_id, JSON.stringify(value)),
    };
}
