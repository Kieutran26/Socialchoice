import { useTranslation } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { formatCalendarDate, formatNumber } from '@/lib/format';
import { appClient } from '@/api/app-client';
import { CalendarBlank, ClockCountdown } from '@phosphor-icons/react';

export default function DistributionOverTime({ scope, filters }) {
    const { t } = useTranslation();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        async function load() {
            setLoading(true);
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
                const accounts = await appClient.entities.SocialAccount.filter(
                    { ...scope, platform: filters.platform },
                    { limit: 300 }
                );
                query.account_ids = { $in: accounts.items.map((a) => a.id) };
            }
            const result = await appClient.entities.Post.aggregate({
                query,
                dateBucket: { field: 'scheduled_at', unit: 'week' },
            });
            if (active) {
                // Exclude invalid dates (such as epoch 0 / 1969-12-29 from null/unset dates)
                const validRows = (result.rows || []).filter(
                    (row) => row.bucket && row.bucket >= '2020-01-01'
                );
                setRows(validRows);
                setError('');
                setLoading(false);
            }
        }
        load().catch((e) => {
            if (active) {
                setError(e.message);
                setLoading(false);
            }
        });
        return () => {
            active = false;
        };
    }, [scope, filters]);

    const max = Math.max(1, ...rows.map((r) => r.count));

    return (
        <section className="panel p-5 flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <CalendarBlank size={16} weight="duotone" />
                        </span>
                        <h2 className="text-[15px] font-semibold text-foreground">
                            {t('Scheduled content per week')}
                        </h2>
                    </div>
                    {rows.length > 0 && (
                        <span className="rounded-lg bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {rows.length} {t('weeks')}
                        </span>
                    )}
                </div>
                <p className="label-xs text-muted-foreground mt-1.5">
                    {t('Unique content posts with a calendar date.')}
                </p>

                {error && <p role="alert" className="mt-3 text-xs text-dangerFg">{t(error)}</p>}

                {!loading && !rows.length && (
                    <div className="py-8 text-center flex flex-col items-center justify-center">
                        <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-2">
                            <ClockCountdown size={20} weight="duotone" />
                        </div>
                        <p className="text-xs font-medium text-foreground">
                            {t('No scheduled content in this view.')}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {t('Posts with scheduled dates will appear here by week.')}
                        </p>
                    </div>
                )}

                {rows.length > 0 && (
                    <div className="space-y-3 mt-4">
                        {rows.map((r) => (
                            <div key={r.bucket} className="space-y-1.5 group">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium text-foreground flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-primary/80" />
                                        {formatCalendarDate(r.bucket)}
                                    </span>
                                    <span className="font-mono text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                                        {formatNumber(r.count)} {t('posts')}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-muted/70 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-brand rounded-full transition-all duration-300 group-hover:brightness-95"
                                        style={{ width: `${(r.count / max) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
