import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import { ChartBar } from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import DistributionBar from '@/components/strategy/DistributionBar';
import StrategyFilters from '@/components/strategy/StrategyFilters';
import DistributionOverTime from '@/components/strategy/DistributionOverTime';
import { Skeleton } from '@/components/ui/skeleton';
import { percent } from '@/lib/format';

const RANGE_DAYS = { past30: -30, past90: -90, next30: 30 };

const buildQuery = (scope, filters) => {
    const query = { ...scope };
    if (filters.status !== 'all') query.status = filters.status;
    if (filters.pillar_id !== 'all') query.pillar_id = filters.pillar_id;
    if (filters.angle_id !== 'all') query.angle_id = filters.angle_id;
    if (filters.range !== 'all') {
        const days = RANGE_DAYS[filters.range];
        const bound = new Date(Date.now() + days * 86400000).toISOString();
        const now = new Date().toISOString();
        query.scheduled_at = days < 0 ? { $gte: bound, $lte: now } : { $gte: now, $lte: bound };
    }
    return query;
};

export default function ContentStrategy() {
    const { t } = useTranslation();
    const { scope } = useWorkspace();
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        range: 'all',
        platform: 'all',
        status: 'all',
        pillar_id: 'all',
        angle_id: 'all',
    });
    const [unit, setUnit] = useState('posts');
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [rows, setRows] = useState({ pillar: [], angle: [], total: 0 });

    const load = useCallback(async () => {
        setLoading(true);
        const query = buildQuery(scope, filters);

        const [pillarList, angleList] = await Promise.all([
            appClient.entities.ContentPillar.filter(scope, { limit: 300 }),
            appClient.entities.ContentAngle.filter(scope, { limit: 500 }),
        ]);
        setPillars(pillarList.items);
        setAngles(angleList.items);

        let platformAccounts = null;
        if (filters.platform !== 'all') {
            const accounts = await appClient.entities.SocialAccount.filter(
                { ...scope, platform: filters.platform },
                { limit: 300, fields: ['id'] },
            );
            platformAccounts = accounts.items.map((a) => a.id);
            if (!platformAccounts.length) {
                setRows({ pillar: [], angle: [], total: 0 });
                setLoading(false);
                return;
            }
        }

        let pillarRows;
        let angleRows;
        let total;

        if (unit === 'posts') {
            const postQuery = platformAccounts ? { ...query, account_ids: { $in: platformAccounts } } : query;
            const [pillarAgg, angleAgg, totalCount] = await Promise.all([
                appClient.entities.Post.aggregate({ query: postQuery, groupBy: 'pillar_id' }),
                appClient.entities.Post.aggregate({ query: postQuery, groupBy: 'angle_id' }),
                appClient.entities.Post.count(postQuery),
            ]);
            pillarRows = pillarAgg.rows;
            angleRows = angleAgg.rows;
            total = totalCount;
        } else {
            const jobQuery = { ...scope };
            if (query.scheduled_at) jobQuery.scheduled_for = query.scheduled_at;
            const JOB_STATUS_FOR_POST = {
                scheduled: 'pending',
                processing: 'processing',
                published: 'published',
                failed: 'failed',
                partially_published: 'blocked',
                cancelled: 'cancelled',
            };
            if (filters.status !== 'all') {
                const mapped = JOB_STATUS_FOR_POST[filters.status];
                if (!mapped) {
                    setRows({ pillar: [], angle: [], total: 0 });
                    setLoading(false);
                    return;
                }
                jobQuery.status = mapped;
            }
            if (filters.platform !== 'all') jobQuery.platform = filters.platform;
            const jobAgg = await appClient.entities.PublishJob.aggregate({ query: jobQuery, groupBy: 'post_id' });
            const postIds = jobAgg.rows.map((row) => row.post_id);
            if (!postIds.length) {
                setRows({ pillar: [], angle: [], total: 0 });
                setLoading(false);
                return;
            }
            const posts = await appClient.entities.Post.filter(
                { ...scope, id: { $in: postIds }, ...(filters.pillar_id === 'all' ? {} : { pillar_id: filters.pillar_id }), ...(filters.angle_id === 'all' ? {} : { angle_id: filters.angle_id }) },
                { limit: 500, fields: ['pillar_id', 'angle_id'] },
            );
            const byId = Object.fromEntries(posts.items.map((p) => [p.id, p]));
            const pillarTally = {};
            const angleTally = {};
            let sum = 0;
            jobAgg.rows.forEach((row) => {
                const post = byId[row.post_id];
                if (!post) return;
                sum += row.count;
                pillarTally[post.pillar_id] = (pillarTally[post.pillar_id] || 0) + row.count;
                angleTally[post.angle_id] = (angleTally[post.angle_id] || 0) + row.count;
            });
            pillarRows = Object.entries(pillarTally).map(([key, count]) => ({ pillar_id: key, count }));
            angleRows = Object.entries(angleTally).map(([key, count]) => ({ angle_id: key, count }));
            total = sum;
        }

        setRows({ pillar: pillarRows, angle: angleRows, total });
        setLoading(false);
    }, [scope, filters, unit]);

    useEffect(() => {
        load();
    }, [load]);

    const pillarStats = pillars.map((pillar) => {
        const count = rows.pillar.find((row) => row.pillar_id === pillar.id)?.count || 0;
        return { ...pillar, count, actual: percent(count, rows.total) };
    });
    const overrepresented = pillarStats.filter((p) => p.actual - p.target_percentage > 5);
    const underrepresented = pillarStats.filter((p) => p.target_percentage - p.actual > 5);
    const angleName = (id) => angles.find((a) => a.id === id)?.name || t("Unassigned angle");

    return (
        <>
            <PageHeader
                title={t("Content Strategy")}
                description={t("How your content is actually distributed against the targets you set for each pillar.")}
                actions={
                    <span className="label-xs">
                        {filters.platform === 'all' ? t("All platforms") : t("{value1} only", {value1: filters.platform})} · {rows.total} {t("total")} </span>
                }
            />

            <StrategyFilters
                filters={filters}
                setFilters={setFilters}
                pillars={pillars}
                angles={angles}
                unit={unit}
                setUnit={setUnit}
            />

            {loading ? (
                <div className="grid gap-5 xl:grid-cols-2">
                    <Skeleton className="h-[360px] rounded-2xl" />
                    <Skeleton className="h-[360px] rounded-2xl" />
                </div>
            ) : rows.total === 0 ? (
                <EmptyState
                    icon={ChartBar}
                    title={t("No content matches these filters")}
                    description={t("Adjust the filters above, or create posts with a pillar and angle assigned to see distribution here.")}
                />
            ) : (
                <div className="space-y-5">
                    <div className="panel p-5">
                        <h2 className="text-[15px]">{t("Pillar targets vs actual mix")}</h2>
                        <p className="label-xs mt-1"> {t("The marker on each bar is the target share you defined for that pillar.")} </p>
                        <div className="mt-2 divide-y divide-border">
                            {pillarStats.map((pillar) => (
                                <DistributionBar
                                    key={pillar.id}
                                    label={pillar.name}
                                    color={pillar.color}
                                    target={pillar.target_percentage || 0}
                                    actual={pillar.actual}
                                    count={pillar.count}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-3">
                        <DistributionOverTime scope={scope} filters={filters} />
                        <div className="panel p-5">
                            <h2 className="text-[15px]">{t("Overrepresented pillars")}</h2>
                            {overrepresented.length ? (
                                <ul className="mt-3 space-y-2">
                                    {overrepresented.map((pillar) => (
                                        <li key={pillar.id} className="flex items-center justify-between gap-3 text-[13px]">
                                            <span className="truncate">{pillar.name}</span>
                                            <span className="text-warnFg">+{pillar.actual - pillar.target_percentage} {t("pts")}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="label-xs mt-3">{t("Every pillar is within 5 points of its target.")}</p>
                            )}
                        </div>
                        <div className="panel p-5">
                            <h2 className="text-[15px]">{t("Underrepresented pillars")}</h2>
                            {underrepresented.length ? (
                                <ul className="mt-3 space-y-2">
                                    {underrepresented.map((pillar) => (
                                        <li key={pillar.id} className="flex items-center justify-between gap-3 text-[13px]">
                                            <span className="truncate">{pillar.name}</span>
                                            <span className="text-dangerFg">−{pillar.target_percentage - pillar.actual} {t("pts")}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="label-xs mt-3">{t("Every pillar is within 5 points of its target.")}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-2">
                        <div className="panel p-5">
                            <h2 className="text-[15px]">{t("Posts per pillar")}</h2>
                            <table className="mt-3 w-full text-[13px]">
                                <thead>
                                    <tr className="label-xs border-b border-border text-left">
                                        <th className="pb-2 font-normal">{t("Pillar")}</th>
                                        <th className="pb-2 text-right font-normal">{t("Posts")}</th>
                                        <th className="pb-2 text-right font-normal">{t("Share")}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {pillarStats.map((pillar) => (
                                        <tr key={pillar.id}>
                                            <td className="py-2">{pillar.name}</td>
                                            <td className="py-2 text-right">{pillar.count}</td>
                                            <td className="py-2 text-right">{pillar.actual}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="panel p-5">
                            <h2 className="text-[15px]">{t("Posts per angle")}</h2>
                            <table className="mt-3 w-full text-[13px]">
                                <thead>
                                    <tr className="label-xs border-b border-border text-left">
                                        <th className="pb-2 font-normal">{t("Angle")}</th>
                                        <th className="pb-2 text-right font-normal">{t("Posts")}</th>
                                        <th className="pb-2 text-right font-normal">{t("Share")}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {[...rows.angle]
                                        .sort((a, b) => b.count - a.count)
                                        .slice(0, 12)
                                        .map((row) => (
                                            <tr key={row.angle_id || 'unassigned'}>
                                                <td className="py-2">{angleName(row.angle_id)}</td>
                                                <td className="py-2 text-right">{row.count}</td>
                                                <td className="py-2 text-right">{percent(row.count, rows.total)}%</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
