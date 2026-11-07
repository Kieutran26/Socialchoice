import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowsClockwise,
    ChartBar,
    FacebookLogo,
    CalendarBlank,
    CaretDown,
    PaperPlaneTilt,
    ThumbsUp,
    ChatDots,
    ShareFat,
    Clock,
    Info,
    WarningCircle,
    CheckCircle,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { toZonedParts, toUtcIso, addDays, todayInZone } from '@/lib/tz';
import EmptyState from '../common/EmptyState';
import StatCard from '../common/StatCard';
import { Input } from '../ui/input';
import PerformanceTables, { metricValue } from './PerformanceTables';
import { formatNumber } from '@/lib/format';

export default function FacebookPerformance({ scope, timezone }) {
    const { t } = useTranslation();
    const [dates, setDates] = useState(() => ({
        from: toZonedParts(new Date(Date.now() - 29 * 86400000).toISOString(), timezone).date,
        to: todayInZone(timezone),
    }));
    const [preset, setPreset] = useState('30d');
    const [accountId, setAccountId] = useState('');
    const [pillarId, setPillarId] = useState('');
    const [accounts, setAccounts] = useState([]);
    const [pillars, setPillars] = useState([]);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const generation = useRef(0);

    const handlePresetChange = (days, id) => {
        setPreset(id);
        const fromDate = toZonedParts(new Date(Date.now() - (days - 1) * 86400000).toISOString(), timezone).date;
        const toDate = todayInZone(timezone);
        setDates({ from: fromDate, to: toDate });
    };

    const options = useMemo(() => {
        try {
            return {
                brandId: scope.brand_id || '',
                accountId,
                pillarId,
                start: toUtcIso(dates.from, '00:00', timezone),
                end: toUtcIso(addDays(dates.to, 1), '00:00', timezone),
            };
        } catch {
            return null;
        }
    }, [scope.brand_id, accountId, pillarId, dates, timezone]);

    useEffect(() => {
        if (scope.is_demo) return;
        let active = true;
        Promise.all([
            appClient.entities.SocialAccount.filter({ ...scope, platform: 'facebook' }, { limit: 300, sort: 'name' }),
            appClient.entities.ContentPillar.filter(scope, { limit: 300, sort: 'name' }),
        ])
            .then(([a, p]) => {
                if (active) {
                    setAccounts(a.items);
                    setPillars(p.items);
                }
            })
            .catch((e) => {
                if (active) setError(e.message);
            });
        return () => {
            active = false;
        };
    }, [scope]);

    useEffect(() => {
        const current = ++generation.current;
        setRefreshing(false);
        setLoading(false);
        setReport(null);
        setError('');
        if (scope.is_demo) return;
        if (!options?.start || !options.end) {
            setError('Choose a valid metrics date range of up to one year');
            return;
        }
        setLoading(true);
        appClient.metrics
            .list(options)
            .then((result) => {
                if (current === generation.current) setReport(result);
            })
            .catch((e) => {
                if (current === generation.current) setError(e.message);
            })
            .finally(() => {
                if (current === generation.current) setLoading(false);
            });
        return () => {
            generation.current++;
        };
    }, [options, scope.is_demo, reloadKey]);

    useEffect(() => {
        if (!report?.ready || report.pending > 0 || !report.total) return;
        const timer = setTimeout(() => setReloadKey((key) => key + 1), 61000);
        return () => clearTimeout(timer);
    }, [report]);

    async function refresh() {
        const current = generation.current;
        setRefreshing(true);
        setError('');
        try {
            const result = await appClient.metrics.refresh(options);
            if (current === generation.current) setReport(result);
        } catch (e) {
            if (current === generation.current) setError(e.message);
        } finally {
            if (current === generation.current) setRefreshing(false);
        }
    }

    if (scope.is_demo) {
        return (
            <section className="panel p-5 mb-5 rounded-2xl border border-border/80 bg-card">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-xs">
                        <FacebookLogo size={22} weight="fill" />
                    </span>
                    <div>
                        <h2 className="font-heading font-semibold text-base text-foreground">
                            {t('Facebook post performance')}
                        </h2>
                        <p className="label-xs text-muted-foreground mt-0.5">
                            {t('Real Facebook metrics are available only in the live workspace. Sample data is not platform evidence.')}
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    const measuredReactions = report?.totals?.reactions?.measured || 0;
    const measuredComments = report?.totals?.comments?.measured || 0;
    const measuredShares = report?.totals?.shares?.measured || 0;

    const avgReactions = measuredReactions > 0 && report?.totals?.reactions?.value != null
        ? Math.round(report.totals.reactions.value / measuredReactions)
        : null;
    const avgComments = measuredComments > 0 && report?.totals?.comments?.value != null
        ? Math.round(report.totals.comments.value / measuredComments)
        : null;
    const avgShares = measuredShares > 0 && report?.totals?.shares?.value != null
        ? Math.round(report.totals.shares.value / measuredShares)
        : null;

    return (
        <section className="space-y-5" aria-label={t('Facebook post performance')}>
            {/* Header & Filter Control Panel (Monochrome Black & White Style) */}
            <div className="panel p-5 rounded-2xl border border-border/80 bg-card space-y-4">
                {/* Top row: Title + Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                        {/* Black & White Icon Box */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-xs">
                            <FacebookLogo size={22} weight="fill" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="font-heading font-semibold text-base text-foreground leading-tight">
                                    {t('Facebook post performance')}
                                </h2>
                            </div>
                            <p className="label-xs text-muted-foreground mt-0.5">
                                {t('Publication dates filter your posts. Metrics are the latest available lifetime counts from Facebook.')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
                        {report?.pending > 0 && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-900 border border-amber-500/30 px-3 py-1 text-[11px] font-semibold shadow-2xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                {t('{count} publications ready to refresh', { count: report.pending })}
                            </span>
                        )}
                        <button
                            type="button"
                            className="cursor-pointer inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors border border-neutral-900 shadow-2xs"
                            disabled={loading || refreshing || !report?.ready || !report?.total || report.pending === 0}
                            onClick={refresh}
                        >
                            <ArrowsClockwise weight="bold" size={14} className={refreshing ? 'animate-spin' : ''} />
                            <span>
                                {refreshing
                                    ? t('Refreshing metrics…')
                                    : t('Refresh next 3 publications')}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Filter Toolbar: Presets Row */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center p-0.5 rounded-lg border border-neutral-300 bg-white text-xs shadow-2xs">
                        <button
                            type="button"
                            onClick={() => handlePresetChange(7, '7d')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                preset === '7d'
                                    ? 'bg-neutral-900 text-white shadow-2xs font-semibold'
                                    : 'text-neutral-600 hover:text-neutral-900'
                            }`}
                        >
                            7 ngày qua
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePresetChange(30, '30d')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                preset === '30d'
                                    ? 'bg-neutral-900 text-white shadow-2xs font-semibold'
                                    : 'text-neutral-600 hover:text-neutral-900'
                            }`}
                        >
                            30 ngày qua
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePresetChange(90, '90d')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                preset === '90d'
                                    ? 'bg-neutral-900 text-white shadow-2xs font-semibold'
                                    : 'text-neutral-600 hover:text-neutral-900'
                            }`}
                        >
                            90 ngày qua
                        </button>
                    </div>

                    <div className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1.5 font-mono">
                        <Clock size={13} className="text-muted-foreground" />
                        <span>Múi giờ: {timezone}</span>
                    </div>
                </div>

                {/* 4 Clean Aligned Input Controls in Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                    {/* From Date */}
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            {t('Published from')}
                        </label>
                        <div className="relative flex items-center">
                            <CalendarBlank size={14} className="absolute left-3 text-muted-foreground pointer-events-none" />
                            <Input
                                aria-label={t('Published from')}
                                type="date"
                                value={dates.from}
                                onChange={(e) => {
                                    setPreset('custom');
                                    setDates({ ...dates, from: e.target.value });
                                }}
                                className="h-9 w-full rounded-lg border-border/80 bg-card pl-9 pr-3 text-xs focus:ring-neutral-400 font-medium"
                            />
                        </div>
                    </div>

                    {/* To Date */}
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            {t('Published through')}
                        </label>
                        <div className="relative flex items-center">
                            <CalendarBlank size={14} className="absolute left-3 text-muted-foreground pointer-events-none" />
                            <Input
                                aria-label={t('Published through')}
                                type="date"
                                value={dates.to}
                                onChange={(e) => {
                                    setPreset('custom');
                                    setDates({ ...dates, to: e.target.value });
                                }}
                                className="h-9 w-full rounded-lg border-border/80 bg-card pl-9 pr-3 text-xs focus:ring-neutral-400 font-medium"
                            />
                        </div>
                    </div>

                    {/* Page Selector */}
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            {t('Page')}
                        </label>
                        <div className="relative flex items-center">
                            <select
                                aria-label={t('Page')}
                                className="h-9 w-full rounded-lg border border-border/80 bg-card pl-3 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-border cursor-pointer appearance-none"
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                            >
                                <option value="">{t('All Pages')} ({accounts.length})</option>
                                {accounts.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}
                                    </option>
                                ))}
                            </select>
                            <CaretDown size={13} className="pointer-events-none absolute right-3 text-muted-foreground" />
                        </div>
                    </div>

                    {/* Pillar Selector */}
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            {t('Pillar')}
                        </label>
                        <div className="relative flex items-center">
                            <select
                                aria-label={t('Pillar')}
                                className="h-9 w-full rounded-lg border border-border/80 bg-card pl-3 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-border cursor-pointer appearance-none"
                                value={pillarId}
                                onChange={(e) => setPillarId(e.target.value)}
                            >
                                <option value="">{t('All pillars')} ({pillars.length})</option>
                                {pillars.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                            <CaretDown size={13} className="pointer-events-none absolute right-3 text-muted-foreground" />
                        </div>
                    </div>
                </div>

                {/* Subtext info line */}
                <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="text-[11px]">
                        {t('Unavailable metrics stay blank. Reach, views and engagement rates are not collected.')}
                    </span>

                    {report?.pending === 0 && report?.total > 0 && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <CheckCircle size={13} weight="fill" className="text-neutral-700" />
                            {t('Refresh has a one-minute cooldown per publication. Availability updates automatically.')}
                        </span>
                    )}
                </div>

                {/* Alerts if any */}
                {report && !report.ready && (
                    <div className="flex items-center gap-2 rounded-xl bg-white border border-neutral-300 p-2.5 text-xs text-neutral-900">
                        <Info size={15} className="shrink-0 text-neutral-700" />
                        <span>{t('Configure Meta before refreshing metrics')}</span>
                    </div>
                )}
                {report?.limited && (
                    <div className="flex items-center gap-2 rounded-xl bg-white border border-neutral-300 p-2.5 text-xs text-neutral-900">
                        <WarningCircle size={15} className="shrink-0 text-neutral-700" />
                        <span>{t('Showing at most 1000 confirmed publications. Narrow the date range for complete totals.')}</span>
                    </div>
                )}
                {report?.stale > 0 && (
                    <div className="flex items-center gap-2 rounded-xl bg-white border border-neutral-300 p-2.5 text-xs text-neutral-900">
                        <Info size={15} className="shrink-0 text-neutral-700" />
                        <span>{t('{count} publications include previous data. Check the metric timestamp and access status.', { count: report.stale })}</span>
                    </div>
                )}
                {error && (
                    <div role="alert" className="flex items-center gap-2 rounded-xl bg-white border border-neutral-900 p-2.5 text-xs text-neutral-900 font-medium">
                        <WarningCircle size={15} className="shrink-0 text-neutral-900" />
                        <span>{t(error)}</span>
                    </div>
                )}
            </div>

            {loading && (
                <div role="status" className="panel p-8 text-center rounded-2xl border border-border/80 bg-card">
                    <ArrowsClockwise size={22} className="animate-spin mx-auto text-muted-foreground mb-2" />
                    <p className="label-xs text-muted-foreground">{t('Loading the latest numbers…')}</p>
                </div>
            )}

            {!loading && report?.total === 0 && (
                <EmptyState
                    icon={ChartBar}
                    title={t('No confirmed Facebook publications in this range')}
                    description={t('Only posts published through Socialchoice with a confirmed Facebook ID appear here. One connected Page is enough.')}
                />
            )}

            {!loading && !!report?.total && (
                <>
                    {/* Pure Black & White 4 Metric Cards */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {/* Card 1: Deliveries */}
                        <StatCard
                            label={t('Published deliveries')}
                            value={report.total}
                            hint={t('Confirmed by the destination')}
                            icon={PaperPlaneTilt}
                            iconBg="bg-white border-neutral-300"
                            iconColor="text-neutral-900"
                            badge={report.pending > 0 ? `${report.pending} CHỜ CẬP NHẬT` : 'ĐÃ XÁC NHẬN'}
                            badgeClass={
                                report.pending > 0
                                    ? 'bg-amber-500/10 text-amber-900 border-amber-500/30 font-semibold'
                                    : 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30 font-semibold'
                            }
                        />

                        {/* Card 2: Reactions */}
                        <StatCard
                            label={t('Reactions')}
                            value={metricValue(report.totals.reactions)}
                            hint={
                                measuredReactions > 0
                                    ? t('{measured} of {total} publications measured', {
                                          measured: measuredReactions,
                                          total: report.total,
                                      })
                                    : t('{measured} of {total} publications measured', {
                                          measured: 0,
                                          total: report.total,
                                      })
                            }
                            icon={ThumbsUp}
                            iconBg="bg-white border-neutral-300"
                            iconColor="text-neutral-900"
                            badge={avgReactions !== null ? `~${formatNumber(avgReactions)} / BÀI` : null}
                            badgeClass="bg-blue-500/10 text-blue-800 border-blue-500/30 font-semibold"
                        />

                        {/* Card 3: Comments */}
                        <StatCard
                            label={t('Comments')}
                            value={metricValue(report.totals.comments)}
                            hint={
                                measuredComments > 0
                                    ? t('{measured} of {total} publications measured', {
                                          measured: measuredComments,
                                          total: report.total,
                                      })
                                    : t('{measured} of {total} publications measured', {
                                          measured: 0,
                                          total: report.total,
                                      })
                            }
                            icon={ChatDots}
                            iconBg="bg-white border-neutral-300"
                            iconColor="text-neutral-900"
                            badge={avgComments !== null ? `~${formatNumber(avgComments)} / BÀI` : null}
                            badgeClass="bg-indigo-500/10 text-indigo-800 border-indigo-500/30 font-semibold"
                        />

                        {/* Card 4: Shares */}
                        <StatCard
                            label={t('Shares')}
                            value={metricValue(report.totals.shares)}
                            hint={
                                measuredShares > 0
                                    ? t('{measured} of {total} publications measured', {
                                          measured: measuredShares,
                                          total: report.total,
                                      })
                                    : t('{measured} of {total} publications measured', {
                                          measured: 0,
                                          total: report.total,
                                      })
                            }
                            icon={ShareFat}
                            iconBg="bg-white border-neutral-300"
                            iconColor="text-neutral-900"
                            badge={avgShares !== null ? `~${formatNumber(avgShares)} / BÀI` : null}
                            badgeClass="bg-purple-500/10 text-purple-800 border-purple-500/30 font-semibold"
                        />
                    </div>

                    {/* Breakdown & Publications Section */}
                    <PerformanceTables report={report} timezone={timezone} />
                </>
            )}
        </section>
    );
}
