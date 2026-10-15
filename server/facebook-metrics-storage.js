// Private metrics and synchronization leases are never writable through entity APIs.
export function createMetricsStorage(db) {
    db.exec('CREATE TABLE IF NOT EXISTS facebook_metrics (attempt_id TEXT PRIMARY KEY, data TEXT NOT NULL);');
    db.exec("CREATE INDEX IF NOT EXISTS confirmed_publications_recent ON publish_attempts(COALESCE(json_extract(data,'$.finishedAt'),0) DESC) WHERE json_extract(data,'$.status')='published';");
    return {
        read(id) {const row=db.prepare('SELECT data FROM facebook_metrics WHERE attempt_id=?').get(id);return row?JSON.parse(row.data):null;},
        save(id,value) {db.prepare('INSERT INTO facebook_metrics VALUES (?,?) ON CONFLICT(attempt_id) DO UPDATE SET data=excluded.data').run(id,JSON.stringify(value));},
        candidates({brandId,accountId,pillarId,start,end}) {
            // Older confirmed single-Page deliveries kept their acknowledgement time on Post.
            // Use it for reads only; preserve the original private attempt/history unchanged.
            const publishedTime="COALESCE(json_extract(attempt.data,'$.finishedAt'),CAST(ROUND((julianday(json_extract(post.data,'$.published_at'))-2440587.5)*86400000) AS INTEGER))";
            const rows=db.prepare(`SELECT attempt.data AS attempt,post.data AS post,account.data AS account,pillar.data AS pillar,metric.data AS metric,${publishedTime} AS publishedAt
                FROM publish_attempts attempt
                JOIN records post ON post.entity='Post' AND post.id=attempt.post_id
                JOIN records account ON account.entity='SocialAccount' AND account.id=json_extract(attempt.data,'$.accountId')
                LEFT JOIN records pillar ON pillar.entity='ContentPillar' AND pillar.id=json_extract(post.data,'$.pillar_id')
                LEFT JOIN facebook_metrics metric ON metric.attempt_id=attempt.id
                WHERE json_extract(attempt.data,'$.status')='published' AND json_extract(post.data,'$.is_demo')=0 AND json_extract(account.data,'$.is_demo')=0
                AND ${publishedTime}>=? AND ${publishedTime}<?
                AND (?='' OR json_extract(post.data,'$.brand_id')=?) AND (?='' OR account.id=?) AND (?='' OR COALESCE(json_extract(post.data,'$.pillar_id'),'')=?)
                ORDER BY ${publishedTime} DESC,attempt.id DESC LIMIT 1001`).all(start,end,brandId,brandId,accountId,accountId,pillarId,pillarId);
            const unique=new Set();
            return {limited:rows.length>1000,items:rows.slice(0,1000).map(({publishedAt,...row})=>({...Object.fromEntries(Object.entries(row).map(([key,value])=>[key,value?JSON.parse(value):null])),publishedAt})).filter(row=>{
                const {attempt,post,account}=row;
                const valid=attempt.externalId && account.platform==='facebook' && account.account_type==='page' && account.brand_id===post.brand_id && attempt.pageId===account.external_id;
                const key=attempt.pageId+':'+attempt.externalId;if(!valid||unique.has(key))return false;unique.add(key);return true;
            })};
        },
    };
}
