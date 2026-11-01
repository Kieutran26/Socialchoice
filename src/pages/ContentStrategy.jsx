import LoadError from '@/components/common/load-error';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ChartBar,
    Stack,
    TreeStructure,
    Target,
    TrendUp,
    TrendDown,
    CheckCircle,
    Article,
    Plus,
    SlidersHorizontal,
    ArrowSquareOut,
    Info,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatCard from '@/components/common/StatCard';
import DistributionBar from '@/components/strategy/DistributionBar';
import StrategyFilters from '@/components/strategy/StrategyFilters';
import DistributionOverTime from '@/components/strategy/DistributionOverTime';
import { Skeleton } from '@/components/ui/skeleton';
import { percent, formatNumber } from '@/lib/format';
import { PLATFORM_LABEL } from '@/lib/constants';

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
    const [loadError, setLoadError] = useState('');
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
        setLoadError('');
        try {
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
                    { limit: 300, fields: ['id'] }
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
                const postQuery = platformAccounts
                    ? { ...query, account_ids: { $in: platformAccounts } }
                    : query;
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
                const jobAgg = await appClient.entities.PublishJob.aggregate({
                    query: jobQuery,
                    groupBy: 'post_id',
                });
                const postIds = jobAgg.rows.map((row) => row.post_id);
                if (!postIds.length) {
                    setRows({ pillar: [], angle: [], total: 0 });
                    setLoading(false);
                    return;
                }
                const posts = await appClient.entities.Post.filter(
                    {
                        ...scope,
                        id: { $in: postIds },
                        ...(filters.pillar_id === 'all' ? {} : { pillar_id: filters.pillar_id }),
                        ...(filters.angle_id === 'all' ? {} : { angle_id: filters.angle_id }),
                    },
                    { limit: 500, fields: ['pillar_id', 'angle_id'] }
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
                pillarRows = Object.entries(pillarTally).map(([key, count]) => ({
                    pillar_id: key,
                    count,
                }));
                angleRows = Object.entries(angleTally).map(([key, count]) => ({
                    angle_id: key,
                    count,
                }));
                total = sum;
            }

            setRows({ pillar: pillarRows, angle: angleRows, total });
        } catch (error) {
            setLoadError(error.message);
        } finally {
            setLoading(false);
        }
    }, [scope, filters, unit]);

    useEffect(() => {
        load();
    }, [load]);

    const pillarStats = pillars.map((pillar) => {
        const count = rows.pillar.find((row) => row.pillar_id === pillar.id)?.count || 0;
        return { ...pillar, count, actual: percent(count, rows.total) };
    });

    const unassignedPillarRow = rows.pillar.find((row) => !row.pillar_id);
    const unassignedPillarCount = unassignedPillarRow?.count || 0;

    const overrepresented = pillarStats.filter(
        (p) => p.actual - (p.target_percentage || 0) > 5
    );
    const underrepresented = pillarStats.filter(
        (p) => (p.target_percentage || 0) - p.actual > 5
    );
    const balancedCount = pillarStats.filter(
        (p) => Math.abs(p.actual - (p.target_percentage || 0)) <= 5
    ).length;
    const balanceRate =
        pillars.length > 0 ? Math.round((balancedCount / pillars.length) * 100) : 100;

    const angleName = (id) => angles.find((a) => a.id === id)?.name || t('Unassigned angle');

    if (loadError) return <LoadError message={loadError} onRetry={load} />;

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('Content Strategy')}
                description={t(
                    'How your content is actually distributed against the targets you set for each pillar.'
                )}
                actions={
                    <span className="label-xs rounded-xl bg-muted/60 px-3 py-1.5 font-medium text-muted-foreground border border-border/60">
                        {filters.platform === 'all'
                            ? t('All platforms')
                            : t('{value1} only', {
                                  value1: PLATFORM_LABEL[filters.platform] || filters.platform,
                              })}{' '}
                        · <strong className="text-foreground">{formatNumber(rows.total)}</strong>{' '}
                        {t('total')}
                    </span>
                }
            />

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <StatCard
                    label={t('Total content')}
                    value={rows.total}
                    hint={
                        unit === 'posts'
                            ? t('Unique content posts')
                            : t('Publishing jobs')
                    }
                    icon={Article}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                />
                <StatCard
                    label={t('Content Pillars')}
                    value={pillars.length}
                    hint={
                        pillars.length
                            ? t('{count} configured', { count: pillars.length })
                            : t('Not set up')
                    }
                    icon={Stack}
                    iconBg="bg-amber-50"
                    iconColor="text-amber-600"
                />
                <StatCard
                    label={t('Content Angles')}
                    value={angles.length}
                    hint={
                        angles.length
                            ? t('{count} configured', { count: angles.length })
                            : t('Not set up')
                    }
                    icon={TreeStructure}
                    iconBg="bg-purple-50"
                    iconColor="text-purple-600"
                />
                <StatCard
                    label={t('Target alignment')}
                    value={pillars.length > 0 ? `${balanceRate}%` : '—'}
                    hint={
                        pillars.length > 0
                            ? overrepresented.length + underrepresented.length === 0
                                ? t('All pillars balanced')
                                : t('{count} pillars off target', {
                                      count: overrepresented.length + underrepresented.length,
                                  })
                            : t('Create pillars to set targets')
                    }
                    icon={Target}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                />
            </div>

            {/* Unified Filter Bar */}
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
                    title={t('No content matches these filters')}
                    description={t(
                        'Adjust the filters above, or create posts with a pillar and angle assigned to see distribution here.'
                    )}
                />
            ) : (
                <div className="space-y-6">
                    {/* Section 1: Pillar targets vs actual mix */}
                    <div className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                        <Target size={18} weight="duotone" />
                                    </span>
                                    <h2 className="text-[15px] font-semibold text-foreground">
                                        {t('Pillar targets vs actual mix')}
                                    </h2>
                                </div>
                                <p className="label-xs text-muted-foreground mt-1.5">
                                    {t(
                                        'The marker on each bar is the target share you defined for that pillar.'
                                    )}
                                </p>
                            </div>
                            <Link
                                to="/strategy/pillars"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-background hover:bg-muted/30 text-xs font-medium text-foreground transition-all"
                            >
                                <SlidersHorizontal size={14} />
                                <span>{t('Manage pillars')}</span>
                                <ArrowSquareOut size={13} className="text-muted-foreground" />
                            </Link>
                        </div>

                        {pillars.length === 0 ? (
                            <div className="py-10 text-center flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/10 p-6">
                                <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                                    <Stack size={24} weight="duotone" />
                                </div>
                                <h3 className="text-sm font-semibold text-foreground">
                                    {t('No pillars set up yet')}
                                </h3>
                                <p className="text-xs text-muted-foreground max-w-md mt-1 mb-4">
                                    {t(
                                        'Set up content pillars and target percentages to track your topic distribution effectively.'
                                    )}
                                </p>
                                <Link
                                    to="/strategy/pillars"
                                    className="btn-skew inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold"
                                >
                                    <Plus size={15} weight="bold" />
                                    <span>{t('Create first pillar')}</span>
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/60">
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
                        )}

                        {unassignedPillarCount > 0 && (
                            <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
                                <Info size={15} className="text-amber-500 shrink-0" />
                                <span>
                                    {unassignedPillarCount}{' '}
                                    {t('posts')} {t('Unassigned')} ({percent(unassignedPillarCount, rows.total)}%)
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Section 2: 3 Cards Grid */}
                    <div className="grid gap-5 xl:grid-cols-3">
                        <DistributionOverTime scope={scope} filters={filters} />

                        {/* Overrepresented pillars card */}
                        <div className="panel p-5 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                            <TrendUp size={16} weight="duotone" />
                                        </span>
                                        <h2 className="text-[15px] font-semibold text-foreground">
                                            {t('Overrepresented pillars')}
                                        </h2>
                                    </div>
                                    {overrepresented.length > 0 && (
                                        <span className="rounded-lg bg-amber-50 border border-amber-200/60 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                            {overrepresented.length}
                                        </span>
                                    )}
                                </div>
                                <p className="label-xs text-muted-foreground mt-1.5">
                                    {t('Pillars that exceed their target by more than 5%.')}
                                </p>

                                {overrepresented.length ? (
                                    <ul className="mt-4 space-y-2.5">
                                        {overrepresented.map((pillar) => (
                                            <li
                                                key={pillar.id}
                                                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/50 text-[13px]"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full shrink-0"
                                                        style={{
                                                            backgroundColor: pillar.color || '#ffd631',
                                                        }}
                                                    />
                                                    <span className="font-medium text-foreground truncate">
                                                        {pillar.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {pillar.actual}% / {pillar.target_percentage || 0}%
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/60 text-xs font-semibold text-amber-700 font-mono">
                                                        +{pillar.actual - pillar.target_percentage}{' '}
                                                        {t('pts')}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="py-8 text-center flex flex-col items-center justify-center">
                                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                                            <CheckCircle size={20} weight="duotone" />
                                        </div>
                                        <p className="text-xs font-medium text-foreground">
                                            {t('All balanced')}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            {t('Every pillar is within 5 points of its target.')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Underrepresented pillars card */}
                        <div className="panel p-5 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                                            <TrendDown size={16} weight="duotone" />
                                        </span>
                                        <h2 className="text-[15px] font-semibold text-foreground">
                                            {t('Underrepresented pillars')}
                                        </h2>
                                    </div>
                                    {underrepresented.length > 0 && (
                                        <span className="rounded-lg bg-rose-50 border border-rose-200/60 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                            {underrepresented.length}
                                        </span>
                                    )}
                                </div>
                                <p className="label-xs text-muted-foreground mt-1.5">
                                    {t('Pillars lagging behind their target by more than 5%.')}
                                </p>

                                {underrepresented.length ? (
                                    <ul className="mt-4 space-y-2.5">
                                        {underrepresented.map((pillar) => (
                                            <li
                                                key={pillar.id}
                                                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/50 text-[13px]"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full shrink-0"
                                                        style={{
                                                            backgroundColor: pillar.color || '#ffd631',
                                                        }}
                                                    />
                                                    <span className="font-medium text-foreground truncate">
                                                        {pillar.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {pillar.actual}% / {pillar.target_percentage || 0}%
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200/60 text-xs font-semibold text-rose-700 font-mono">
                                                        −{pillar.target_percentage - pillar.actual}{' '}
                                                        {t('pts')}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="py-8 text-center flex flex-col items-center justify-center">
                                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                                            <CheckCircle size={20} weight="duotone" />
                                        </div>
                                        <p className="text-xs font-medium text-foreground">
                                            {t('No underrepresented pillars.')}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            {t('Every pillar is within 5 points of its target.')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section 3: 2 Tables Grid */}
                    <div className="grid gap-5 xl:grid-cols-2">
                        {/* Posts per pillar table */}
                        <div className="panel p-5">
                            <div className="flex items-center justify-between gap-2 mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                        <Stack size={16} weight="duotone" />
                                    </span>
                                    <h2 className="text-[15px] font-semibold text-foreground">
                                        {t('Posts per pillar')}
                                    </h2>
                                </div>
                                <span className="rounded-lg bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                    {pillarStats.length} {t('pillars')}
                                </span>
                            </div>

                            {pillarStats.length === 0 && unassignedPillarCount === 0 ? (
                                <div className="py-8 text-center text-xs text-muted-foreground">
                                    <p>{t('No pillars set up yet')}</p>
                                    <Link
                                        to="/strategy/pillars"
                                        className="text-primary hover:underline font-medium mt-1 inline-block"
                                    >
                                        {t('Create first pillar')} →
                                    </Link>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[13px]">
                                        <thead>
                                            <tr className="bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                <th className="py-2.5 px-3 rounded-l-lg text-left">
                                                    {t('Pillar')}
                                                </th>
                                                <th className="py-2.5 px-3 text-right">
                                                    {t('Posts')}
                                                </th>
                                                <th className="py-2.5 px-3 rounded-r-lg text-right">
                                                    {t('Share')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {pillarStats.map((pillar) => (
                                                <tr
                                                    key={pillar.id}
                                                    className="hover:bg-muted/20 transition-colors"
                                                >
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                                                style={{
                                                                    backgroundColor:
                                                                        pillar.color || '#ffd631',
                                                                }}
                                                            />
                                                            <span className="font-medium text-foreground">
                                                                {pillar.name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-mono font-medium">
                                                        {formatNumber(pillar.count)}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right">
                                                        <div className="inline-flex items-center gap-2">
                                                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full"
                                                                    style={{
                                                                        width: `${Math.max(
                                                                            0,
                                                                            Math.min(100, pillar.actual)
                                                                        )}%`,
                                                                        backgroundColor:
                                                                            pillar.color || '#ffd631',
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="font-mono font-semibold text-xs min-w-[32px] text-right">
                                                                {pillar.actual}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {unassignedPillarCount > 0 && (
                                                <tr className="hover:bg-muted/20 transition-colors">
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-muted-foreground/30" />
                                                            <span className="font-medium text-muted-foreground italic">
                                                                {t('Unassigned')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-mono font-medium text-muted-foreground">
                                                        {formatNumber(unassignedPillarCount)}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right">
                                                        <div className="inline-flex items-center gap-2">
                                                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full bg-muted-foreground/40"
                                                                    style={{
                                                                        width: `${Math.max(
                                                                            0,
                                                                            Math.min(
                                                                                100,
                                                                                percent(
                                                                                    unassignedPillarCount,
                                                                                    rows.total
                                                                                )
                                                                            )
                                                                        )}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="font-mono font-semibold text-xs min-w-[32px] text-right text-muted-foreground">
                                                                {percent(
                                                                    unassignedPillarCount,
                                                                    rows.total
                                                                )}
                                                                %
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Posts per angle table */}
                        <div className="panel p-5">
                            <div className="flex items-center justify-between gap-2 mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                                        <TreeStructure size={16} weight="duotone" />
                                    </span>
                                    <h2 className="text-[15px] font-semibold text-foreground">
                                        {t('Posts per angle')}
                                    </h2>
                                </div>
                                <Link
                                    to="/strategy/angles"
                                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium"
                                >
                                    <span>{t('Manage angles')}</span>
                                    <ArrowSquareOut size={13} />
                                </Link>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-[13px]">
                                    <thead>
                                        <tr className="bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            <th className="py-2.5 px-3 rounded-l-lg text-left">
                                                {t('Angle')}
                                            </th>
                                            <th className="py-2.5 px-3 text-right">
                                                {t('Posts')}
                                            </th>
                                            <th className="py-2.5 px-3 rounded-r-lg text-right">
                                                {t('Share')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {[...rows.angle]
                                            .sort((a, b) => b.count - a.count)
                                            .slice(0, 12)
                                            .map((row) => {
                                                const share = percent(row.count, rows.total);
                                                const isUnassigned = !row.angle_id;
                                                return (
                                                    <tr
                                                        key={row.angle_id || 'unassigned'}
                                                        className="hover:bg-muted/20 transition-colors"
                                                    >
                                                        <td className="py-2.5 px-3">
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                                                                        isUnassigned
                                                                            ? 'bg-muted-foreground/40'
                                                                            : 'bg-purple-500'
                                                                    }`}
                                                                />
                                                                <span
                                                                    className={`font-medium ${
                                                                        isUnassigned
                                                                            ? 'text-muted-foreground italic'
                                                                            : 'text-foreground'
                                                                    }`}
                                                                >
                                                                    {angleName(row.angle_id)}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-medium">
                                                            {formatNumber(row.count)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right">
                                                            <div className="inline-flex items-center gap-2">
                                                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${
                                                                            isUnassigned
                                                                                ? 'bg-muted-foreground/40'
                                                                                : 'bg-purple-500'
                                                                        }`}
                                                                        style={{
                                                                            width: `${Math.max(
                                                                                0,
                                                                                Math.min(100, share)
                                                                            )}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                                <span className="font-mono font-semibold text-xs min-w-[32px] text-right">
                                                                    {share}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
