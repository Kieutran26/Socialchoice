import { useTranslation } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { appClient } from '@/api/app-client';
export default function DistributionOverTime({ scope, filters }) { const { t } = useTranslation();
    const [rows, setRows] = useState([]), [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        async function load() {
            const query = { ...scope };
            if (filters.status !== 'all') query.status = filters.status;
            if (filters.pillar_id !== 'all') query.pillar_id = filters.pillar_id;
            if (filters.angle_id !== 'all') query.angle_id = filters.angle_id;
            if (filters.range !== 'all') {
                const now = new Date().toISOString();
                const days = { past30: -30, past90: -90, next30: 30 }[filters.range];
                const bound = new Date(Date.now() + days * 86400000).toISOString();
                query.scheduled_at = days < 0 ? { $gte: bound, $lte: now } : { $gte: now, $lte: bound };
            }
            if (filters.platform !== 'all') {
                const accounts = await appClient.entities.SocialAccount.filter({ ...scope, platform: filters.platform }, { limit: 300 });
                query.account_ids = { $in: accounts.items.map(a => a.id) };
            }
            const result = await appClient.entities.Post.aggregate({ query, dateBucket: { field: 'scheduled_at', unit: 'week' } });
            if (active) { setRows(result.rows.filter(row => row.bucket)); setError(''); }
        }
        load().catch(e => { if (active) setError(e.message); });
        return () => { active = false; };
    }, [scope, filters]);
    const max = Math.max(1, ...rows.map(r => r.count));
    return <section className="panel p-5"><h2 className="text-[15px]">{t("Scheduled content per week")}</h2><p className="label-xs mt-1">{t("Unique content posts with a calendar date.")}</p>{error && <p role="alert">{t(error)}</p>}{!rows.length && <p className="label-xs mt-4">{t("No scheduled content in this view.")}</p>}<div className="space-y-3 mt-4">{rows.map(r => <div key={r.bucket} className="text-xs"><div className="flex justify-between"><span>{String(r.bucket).slice(0, 10)}</span><span>{r.count}</span></div><div className="h-2 bg-muted rounded mt-1"><div className="h-2 bg-brand rounded" style={{ width: `${r.count / max * 100}%` }} /></div></div>)}</div></section>;
}
