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
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { toZonedParts, toUtcIso, addDays, todayInZone } from '@/lib/tz';
import EmptyState from '../common/EmptyState';
import { Input } from '../ui/input';
import PerformanceTables, { metricValue } from './PerformanceTables';

        function PerformanceStatCard({ label, value, hint, icon: Icon, iconBg, iconColor }) {
            return (
                <div className="panel p-4.5 flex flex-col justify-between rounded-2xl border border-border/80 bg-card hover:border-border transition-all shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                        {Icon && (
                            <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBg || 'bg-muted/60'} ${iconColor || 'text-foreground'}`}>
                                <Icon size={16} weight="duotone" />
                            </span>
                        )}
                    </div>
                    <div className="mt-3">
                        <div className="font-heading text-2xl font-bold tracking-tight text-foreground">{value}</div>
                        {hint && (
                            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                                {hint}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        export default function FacebookPerformance({ scope, timezone }) {
            const { t } = useTranslation();
            const [dates, setDates] = useState(() => ({
                from: toZonedParts(new Date(Date.now() - 29 * 86400000).toISOString(), timezone).date,
                to: todayInZone(timezone),
            }));
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
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2]">
                        <FacebookLogo size={20} weight="fill" />
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

    return (
        <section className="space-y-5 mb-8" aria-label={t('Facebook post performance')}>
            {/* Filter Card */}
            <div className="panel p-5 rounded-2xl border border-border/80 bg-card shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2]">
                            <FacebookLogo size={22} weight="fill" />
                        </div>
                        <div>
                            <h2 className="font-heading font-bold text-base text-foreground leading-tight">
                                {t('Facebook post performance')}
                            </h2>
                            <p className="label-xs text-muted-foreground mt-0.5">
                                {t('Publication dates filter your posts. Metrics are the latest available lifetime counts from Facebook.')}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn-skew cursor-pointer inline-flex items-center gap-2"
                        disabled={loading || refreshing || !report?.ready || !report?.total || report.pending === 0}
                        onClick={refresh}
                    >
                        <ArrowsClockwise weight="bold" size={15} className={refreshing ? 'animate-spin' : ''} />
                        <span>{t(refreshing ? 'Refreshing metrics…' : 'Refresh next 3 publications')}</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
                    <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                            {t('Published from')}
                        </label>
                        <div className="relative flex items-center">
                            <CalendarBlank size={15} className="absolute left-3 text-muted-foreground pointer-events-none" />
                            <Input
                                aria-label={t('Published from')}
                                type="date"
                                value={dates.from}
                                onChange={(e) => setDates({ ...dates, from: e.target.value })}
                                className="h-9.5 rounded-xl border-border/80 bg-background pl-9 pr-3 text-xs focus:ring-primary/20 font-medium"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                            {t('Published through')}
                        </label>
                        <div className="relative flex items-center">
                            <CalendarBlank size={15} className="absolute left-3 text-muted-foreground pointer-events-none" />
                            <Input
                                aria-label={t('Published through')}
                                type="date"
                                value={dates.to}
                                onChange={(e) => setDates({ ...dates, to: e.target.value })}
                                className="h-9.5 rounded-xl border-border/80 bg-background pl-9 pr-3 text-xs focus:ring-primary/20 font-medium"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                            {t('Page')}
                        </label>
                        <div className="relative flex items-center">
                            <select
                                aria-label={t('Page')}
                                className="h-9.5 w-full rounded-xl border border-border/80 bg-background px-3 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-border cursor-pointer appearance-none"
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                            >
                                <option value="">{t('All Pages')}</option>
                                {accounts.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}
                                    </option>
                                ))}
                            </select>
                            <CaretDown size={13} className="pointer-events-none absolute right-3 text-muted-foreground" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                            {t('Pillar')}
                        </label>
                        <div className="relative flex items-center">
                            <select
                                aria-label={t('Pillar')}
                                className="h-9.5 w-full rounded-xl border border-border/80 bg-background px-3 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-border cursor-pointer appearance-none"
                                value={pillarId}
                                onChange={(e) => setPillarId(e.target.value)}
                            >
                                <option value="">{t('All pillars')}</option>
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

                <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        <Clock size={12} />
                        {timezone}
                    </span>
                    <span className="text-[11px] text-muted-foreground/80">
                        · {t('Unavailable metrics stay blank. Reach, views and engagement rates are not collected.')}
                    </span>

                    {report?.pending > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60 px-2.5 py-1 text-[11px] font-medium ml-auto">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            {t('{count} publications ready to refresh', { count: report.pending })}
                        </span>
                    )}
                    {report?.pending === 0 && report.total > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground ml-auto">
                            {t('Refresh has a one-minute cooldown per publication. Availability updates automatically.')}
                        </span>
                    )}
                </div>

                {report && !report.ready && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50/70 border border-amber-200/60 p-2.5 text-xs text-amber-900">
                        <Info size={15} className="shrink-0 text-amber-600" />
                        <span>{t('Configure Meta before refreshing metrics')}</span>
                    </div>
                )}
                {report?.limited && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50/70 border border-amber-200/60 p-2.5 text-xs text-amber-900">
                        <WarningCircle size={15} className="shrink-0 text-amber-600" />
                        <span>{t('Showing at most 1000 confirmed publications. Narrow the date range for complete totals.')}</span>
                    </div>
                )}
                {report?.stale > 0 && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50/70 border border-amber-200/60 p-2.5 text-xs text-amber-900">
                        <Info size={15} className="shrink-0 text-amber-600" />
                        <span>{t('{count} publications include previous data. Check the metric timestamp and access status.', { count: report.stale })}</span>
                    </div>
                )}
                {error && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-dangerFg">
                        <WarningCircle size={15} className="shrink-0" />
                        <span>{t(error)}</span>
                    </div>
                )}
            </div>

            {loading && <p role="status" className="label-xs">{t('Loading the latest numbers…')}</p>}

            {report?.total === 0 && (
                <EmptyState
                    icon={ChartBar}
                    title={t('No confirmed Facebook publications in this range')}
                    description={t('Only posts published through Socialchoice with a confirmed Facebook ID appear here. One connected Page is enough.')}
                />
            )}

            {!!report?.total && (
                <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <PerformanceStatCard
                            label={t('Published deliveries')}
                            value={report.total}
                            hint={t('Confirmed by Facebook')}
                            icon={PaperPlaneTilt}
                            iconBg="bg-emerald-50"
                            iconColor="text-emerald-600"
                        />
                        <PerformanceStatCard
                            label={t('Reactions')}
                            value={metricValue(report.totals.reactions)}
                            hint={t('{measured} of {total} publications measured', {
                                measured: report.totals.reactions.measured,
                                total: report.total,
                            })}
                            icon={ThumbsUp}
                            iconBg="bg-blue-50"
                            iconColor="text-[#1877F2]"
                        />
                        <PerformanceStatCard
                            label={t('Comments')}
                            value={metricValue(report.totals.comments)}
                            hint={t('{measured} of {total} publications measured', {
                                measured: report.totals.comments.measured,
                                total: report.total,
                            })}
                            icon={ChatDots}
                            iconBg="bg-indigo-50"
                            iconColor="text-indigo-600"
                        />
                        <PerformanceStatCard
                            label={t('Shares')}
                            value={metricValue(report.totals.shares)}
                            hint={t('{measured} of {total} publications measured', {
                                measured: report.totals.shares.measured,
                                total: report.total,
                            })}
                            icon={ShareFat}
                            iconBg="bg-amber-50"
                            iconColor="text-amber-600"
                        />
                    </div>
                    <PerformanceTables report={report} timezone={timezone} />
                </>
            )}
        </section>
    );
}
