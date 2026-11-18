import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Plus,
    CalendarBlank,
    CheckCircle,
    CursorClick,
    PlugsConnected,
    PaperPlaneTilt,
    Sparkle,
    ArrowUpRight,
    Clock,
    ShareNetwork,
    ChartLineUp,
    Pulse,
    ArrowsClockwise,
    SunHorizon,
    Moon,
    CloudSun,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useWorkspace } from '@/lib/workspace-context';
import { formatNumber, formatDateTime, relativeTime } from '@/lib/format';
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';

/* ─── Helpers ──────────────────────────────────────────── */

function getEventDot(text = '') {
    const lower = text.toLowerCase();
    if (lower.includes('lỗi') || lower.includes('failed') || lower.includes('error') || lower.includes('bị chặn') || lower.includes('cancelled'))
        return 'bg-dangerFg';
    if (lower.includes('xác nhận') || lower.includes('published') || lower.includes('success') || lower.includes('thành công'))
        return 'bg-successFg';
    if (lower.includes('chờ') || lower.includes('đang') || lower.includes('pending') || lower.includes('duyệt') || lower.includes('processing'))
        return 'bg-infoFg';
    return 'bg-muted-foreground';
}

function tzDateKey(d, tz) {
    try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    } catch { return d.toISOString().slice(0, 10); }
}

function getGreeting(t) {
    const h = new Date().getHours();
    if (h < 12) return { text: t('Chào buổi sáng'), icon: SunHorizon };
    if (h < 18) return { text: t('Chào buổi chiều'), icon: CloudSun };
    return { text: t('Chào buổi tối'), icon: Moon };
}

/* ─── Main Component ───────────────────────────────────── */

export default function DashboardV2() {
    const { t } = useTranslation();
    const { scope, brands, switchMode, seeding, timezone } = useWorkspace();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [trafficRefreshing, setTrafficRefreshing] = useState(false);
    const trafficInFlightRef = useRef(false);
    const activeTimezone = timezone || DEFAULT_TIMEZONE;

    /* ── Data fetching ── */
    const fetchTraffic = useCallback(async ({ silent = false } = {}) => {
        const deduped = new Map();
        try {
            const listArg = scope.brand_id ? { brand_id: scope.brand_id } : { brand_id: 'all', is_demo: scope.is_demo };
            const res = await appClient.links.list(listArg, { silent });
            (res?.links || []).forEach((link) => { if (link?.id) deduped.set(link.id, link); });
        } catch (err) {
            if (!scope.brand_id && brands.length > 0) {
                const results = await Promise.all(brands.map((b) => appClient.links.list({ brand_id: b.id }, { silent: true }).catch(() => ({ links: [] }))));
                results.forEach((res) => { (res?.links || []).forEach((link) => { if (link?.id) deduped.set(link.id, link); }); });
            } else { throw err; }
        }
        const trackingLinks = Array.from(deduped.values());
        return { trackingLinks, totalClicks: trackingLinks.reduce((s, l) => s + (l.clicks || 0), 0) };
    }, [scope, brands]);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [statusAgg, accounts, upcoming, logs, traffic] = await Promise.all([
                appClient.entities.Post.aggregate({ query: scope, groupBy: 'status' }),
                appClient.entities.SocialAccount.filter(scope, { limit: 200 }),
                appClient.entities.Post.filter({ ...scope, status: { $in: ['scheduled', 'processing'] } }, { sort: 'scheduled_at', limit: 6 }),
                appClient.entities.PublishingLog.filter(scope, { sort: '-occurred_at', limit: 5 }),
                fetchTraffic({ silent: true }).catch(() => ({ trackingLinks: [], totalClicks: 0 })),
            ]);
            const byStatus = {};
            statusAgg.rows.forEach((r) => { byStatus[r.status] = r.count; });
            const total = Object.values(byStatus).reduce((s, v) => s + v, 0);
            setData({ byStatus, total, accounts: accounts.items, upcoming: upcoming.items, logs: logs.items, trackingLinks: traffic.trackingLinks, totalClicks: traffic.totalClicks });
        } catch (error) { setLoadError(error.message); }
        finally { setLoading(false); }
    }, [scope, fetchTraffic]);

    const refreshTraffic = useCallback(async ({ silent = true } = {}) => {
        if (trafficInFlightRef.current) return;
        trafficInFlightRef.current = true;
        if (!silent) setTrafficRefreshing(true);
        try {
            const traffic = await fetchTraffic({ silent });
            setData((prev) => (prev ? { ...prev, trackingLinks: traffic.trackingLinks, totalClicks: traffic.totalClicks } : prev));
        } catch { /* silent */ }
        finally { trafficInFlightRef.current = false; if (!silent) setTrafficRefreshing(false); }
    }, [fetchTraffic]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        const POLL_MS = 300000;
        let lastRefresh = Date.now();
        const id = window.setInterval(() => { if (document.visibilityState === 'visible') { refreshTraffic({ silent: true }); lastRefresh = Date.now(); } }, POLL_MS);
        const onVis = () => { if (document.visibilityState === 'visible' && Date.now() - lastRefresh > POLL_MS) { refreshTraffic({ silent: true }); lastRefresh = Date.now(); } };
        document.addEventListener('visibilitychange', onVis);
        return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
    }, [refreshTraffic]);

    /* ── Derived ── */
    const connected = data?.accounts.filter((a) => a.connection_status === 'connected').length || 0;
    const demoAccounts = data?.accounts.filter((a) => a.connection_status === 'demo').length || 0;
    const hasContent = (data?.total || 0) > 0 || (data?.accounts.length || 0) > 0;
    const publishedCount = data?.byStatus.published || 0;
    const scheduledCount = data?.byStatus.scheduled || 0;
    const draftCount = data?.byStatus.draft || 0;

    /* Chart data */
    const chartData = (() => {
        if (!data) return [];
        const daysMap = {};
        const todayStr = tzDateKey(new Date(), activeTimezone);
        const [year, month, day] = todayStr.split('-').map(Number);
        for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.UTC(year, month - 1, day - i));
            const ds = d.toISOString().slice(0, 10);
            const [, m, dd] = ds.split('-');
            daysMap[ds] = { date: ds, day: `${Number(dd)}/${Number(m)}`, clicks: 0 };
        }
        (data.trackingLinks || []).forEach((link) => {
            (link.days || []).forEach((item) => {
                const key = typeof item?.day === 'string' ? item.day.slice(0, 10) : '';
                if (key && daysMap[key]) daysMap[key].clicks += item.clicks || 0;
            });
        });
        return Object.values(daysMap);
    })();

    const greeting = getGreeting(t);
    const GreetIcon = greeting.icon;

    /* ── Error ── */
    if (loadError) {
        return (
            <div role="alert" className="panel p-5">
                <p className="mb-3 text-sm text-foreground">{t(loadError)}</p>
                <button type="button" className="btn-skew" onClick={load}>{t('Thử lại')}</button>
            </div>
        );
    }

    /* ── Loading ── */
    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-20 rounded-2xl" />
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4"><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /></div>
                <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
                <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-56 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /></div>
            </div>
        );
    }

    /* ── Empty ── */
    if (!hasContent) {
        return (
            <div className="space-y-5">
                <GreetingBar t={t} greeting={greeting} GreetIcon={GreetIcon} />
                <div className="panel p-10 text-center space-y-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mx-auto"><Pulse size={28} weight="duotone" /></div>
                    <p className="text-base font-medium text-foreground">{t("Không gian làm việc trống")}</p>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">{t("Tạo thương hiệu và bắt đầu lên lịch bài viết hoặc trải nghiệm ngay với AI Agent.")}</p>
                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                        <Link to="/agent" className="btn-skew"><Sparkle size={16} weight="bold" /> {t("Bắt đầu với AI Agent")}</Link>
                        <button type="button" className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-[13px] hover:bg-surface cursor-pointer" onClick={() => switchMode(true)} disabled={seeding || isDesktop()}>{seeding ? t("Đang chuẩn bị...") : t("Tải dữ liệu mẫu")}</button>
                    </div>
                </div>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════
       BENTO GRID LAYOUT
       ═══════════════════════════════════════════════════════ */
    return (
        <div className="space-y-4">
            {/* ── Row 0: Greeting + actions ── */}
            <GreetingBar t={t} greeting={greeting} GreetIcon={GreetIcon} />

            {/* ── Row 1: Hero stat + 3 KPIs ── */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {/* Hero: total posts with pipeline */}
                <div className="panel p-5 col-span-2 lg:col-span-1 flex flex-col justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t("Tổng bài viết")}</span>
                    <p className="font-heading text-4xl font-semibold text-foreground mt-1">{formatNumber(data.total)}</p>
                    {data.total > 0 && (
                        <div className="mt-3 space-y-1.5">
                            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                {[['draft', 'bg-brand-neutral'], ['scheduled', 'bg-brand-dark'], ['published', 'bg-brand']].map(([k, cls]) => (
                                    <div key={k} className={cls} style={{ width: `${((data.byStatus[k] || 0) / data.total) * 100}%` }} />
                                ))}
                            </div>
                            <div className="flex gap-3 text-[10px] text-muted-foreground">
                                <span><span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-neutral mr-1" />{draftCount}</span>
                                <span><span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-dark mr-1" />{scheduledCount}</span>
                                <span><span className="inline-block h-1.5 w-1.5 rounded-full bg-brand mr-1" />{publishedCount}</span>
                            </div>
                        </div>
                    )}
                </div>

                <Kpi label={t("Lượt nhấp UTM")} value={data.totalClicks || 0} icon={CursorClick} />
                <Kpi label={t("Kênh sẵn sàng")} value={connected + demoAccounts} icon={PlugsConnected} />
                <Kpi label={t("Đã xuất bản")} value={publishedCount} icon={CheckCircle} />
            </div>

            {/* ── Row 2: Bento — Schedule (tall left) | Channels + Drafts (stacked right) ── */}
            <div className="grid gap-4 lg:grid-cols-5">
                {/* Schedule — spans 3 cols */}
                <section className="panel p-4 lg:col-span-3 space-y-2">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <CalendarBlank size={15} weight="bold" className="text-muted-foreground" />
                            {t("Sắp tới")}
                            {data.upcoming.length > 0 && <span className="text-[10px] bg-infoBg text-infoFg px-1.5 py-0.5 rounded-md font-bold">{data.upcoming.length}</span>}
                        </h2>
                        <Link to="/calendar" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("Xem lịch")} <ArrowUpRight size={11} className="inline" /></Link>
                    </div>

                    {data.upcoming.length === 0 ? (
                        <div className="py-8 text-center border border-dashed border-border/60 rounded-xl">
                            <p className="text-xs text-muted-foreground mb-3">{t("Chưa có bài nào trong lịch.")}</p>
                            <div className="flex justify-center gap-2">
                                <Link to="/agent" className="btn-skew"><Sparkle size={14} weight="bold" /> {t("AI lên lịch")}</Link>
                                <Link to="/create" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"><Plus size={13} weight="bold" /> {t("Tạo bài")}</Link>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/40">
                            {data.upcoming.map((p) => {
                                const brand = brands.find((b) => b.id === p.brand_id);
                                const accs = (p.account_ids || []).map((id) => data.accounts.find((a) => a.id === id)).filter(Boolean);
                                const img = p.media_urls?.[0] || (Array.isArray(p.media) ? p.media[0]?.url : null);
                                return (
                                    <Link key={p.id} to={`/posts?post=${p.id}`} className="group flex items-center gap-3 py-2.5 hover:bg-muted/20 rounded-lg px-1 -mx-1 transition-colors min-w-0">
                                        {img
                                            ? <img src={img} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover border border-border/50" />
                                            : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface border border-border/50 text-muted-foreground"><Clock size={15} weight="duotone" /></div>}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] font-medium text-foreground truncate">{p.title || t("Untitled")}</p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span className="text-[10px] text-muted-foreground font-mono">{formatDateTime(p.scheduled_at, p.timezone || activeTimezone)}</span>
                                                {brand && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: brand.color || '#ffd631' }} />{brand.name}</span>}
                                                {accs.slice(0, 3).map((a) => { const c = PLATFORM_CONFIG[a.platform]; const I = c?.icon; return I ? <I key={a.id} size={10} weight="bold" className={`${c?.color || 'text-muted-foreground'} shrink-0`} /> : null; })}
                                            </div>
                                        </div>
                                        <ArrowUpRight size={12} className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Right stack: Channels + Drafts — spans 2 cols */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    {/* Channels */}
                    <section className="panel p-4 flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <ShareNetwork size={15} weight="bold" className="text-muted-foreground" />
                                {t("Kênh")}
                            </h2>
                            <Link to="/accounts" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("Quản lý")} <ArrowUpRight size={11} className="inline" /></Link>
                        </div>
                        {!data.accounts?.length ? (
                            <div className="py-4 text-center">
                                <p className="text-xs text-muted-foreground mb-2">{t("Chưa có kênh nào.")}</p>
                                <Link to="/accounts" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"><Plus size={12} weight="bold" /> {t("Kết nối")}</Link>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {data.accounts.slice(0, 5).map((acc) => {
                                    const conf = PLATFORM_CONFIG[acc.platform];
                                    const Ic = conf?.icon;
                                    const isConn = acc.connection_status === 'connected';
                                    const isDemo = acc.connection_status === 'demo';
                                    return (
                                        <div key={acc.id} className="flex items-center gap-2.5 py-1.5 px-1.5 rounded-lg hover:bg-muted/20 transition-colors min-w-0">
                                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${conf?.bg || 'bg-muted'} ${conf?.border || 'border-border'} ${conf?.color || 'text-foreground'}`}>
                                                {Ic ? <Ic size={12} weight="bold" /> : <ShareNetwork size={12} />}
                                            </div>
                                            <span className="text-xs font-medium text-foreground truncate flex-1 min-w-0">{acc.name}</span>
                                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isConn ? 'bg-successFg' : isDemo ? 'bg-warnFg' : 'bg-muted-foreground/40'}`} title={isConn ? t("Hoạt động") : isDemo ? t("Mô phỏng") : t("Ngắt")} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Draft alert */}
                    {draftCount > 0 && (
                        <Link to="/posts?status=draft" className="panel p-3 flex items-center gap-3 border-brand-dark/40 bg-brand/8 hover:bg-brand/12 transition-colors group">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-ink">
                                <PaperPlaneTilt size={16} weight="duotone" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-foreground">{draftCount} {t("bản nháp")}</p>
                                <p className="text-[10px] text-muted-foreground">{t("Chờ hoàn thiện")}</p>
                            </div>
                            <ArrowUpRight size={13} className="text-muted-foreground shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </Link>
                    )}
                </div>
            </div>

            {/* ── Row 3: Bento — Traffic chart (wide) | Activity feed ── */}
            <div className="grid gap-4 lg:grid-cols-5">
                {/* Traffic — spans 3 */}
                <section className="panel p-4 lg:col-span-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <ChartLineUp size={15} weight="bold" className="text-muted-foreground" />
                            {t("Traffic 7 ngày")}
                            <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground font-normal">
                                <span className="h-1.5 w-1.5 rounded-full bg-successFg motion-safe:animate-pulse" /> live
                            </span>
                        </h2>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => refreshTraffic({ silent: false })} disabled={trafficRefreshing} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50" aria-label={t("Làm mới")}>
                                <ArrowsClockwise size={13} className={trafficRefreshing ? 'motion-safe:animate-spin' : ''} />
                            </button>
                            <Link to="/analytics" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("Chi tiết")} <ArrowUpRight size={11} className="inline" /></Link>
                        </div>
                    </div>

                    {/* Inline metrics */}
                    <div className="flex gap-5 text-xs">
                        <div>
                            <span className="text-muted-foreground">{t("Tổng clicks")}</span>
                            <span className="ml-1.5 font-heading font-semibold text-foreground">{formatNumber(data.totalClicks || 0)}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">{t("Link hoạt động")}</span>
                            <span className="ml-1.5 font-heading font-semibold text-foreground">{(data.trackingLinks || []).filter((l) => l.active !== false).length}</span>
                        </div>
                    </div>

                    <div className="h-44 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(var(--border))" />
                                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'oklch(var(--muted) / 0.4)' }} contentStyle={{ backgroundColor: 'oklch(var(--popover))', borderRadius: '8px', border: '1px solid oklch(var(--border))', fontSize: '11px' }} formatter={(v) => [`${v} ${t('clicks')}`, '']} />
                                <Bar dataKey="clicks" fill="oklch(var(--foreground))" radius={[4, 4, 0, 0]} maxBarSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* Activity — spans 2 */}
                <section className="panel p-4 lg:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Pulse size={15} weight="bold" className="text-muted-foreground" />
                            {t("Hoạt động")}
                        </h2>
                        <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-successFg animate-pulse" /> live
                        </span>
                    </div>

                    {!data.logs.length ? (
                        <p className="text-xs text-muted-foreground py-6 text-center">{t("Chưa có hoạt động nào.")}</p>
                    ) : (
                        <div className="space-y-0.5">
                            {data.logs.map((l) => {
                                const msg = t(l.message || l.error_message || l.event || l.status);
                                return (
                                    <div key={l.id} className="flex items-start gap-2.5 py-2 px-1 rounded-lg hover:bg-muted/15 transition-colors min-w-0">
                                        <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${getEventDot(msg)}`} />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[12px] text-foreground leading-snug break-words">{msg}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{relativeTime(l.occurred_at || l.created_date)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

/* ─── Sub-components ───────────────────────────────────── */

function GreetingBar({ t, greeting, GreetIcon }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
                <GreetIcon size={20} weight="duotone" className="text-brand-dark" />
                <h1 className="text-xl font-heading font-semibold text-foreground">{greeting.text}</h1>
            </div>
            <div className="flex items-center gap-2">
                <Link to="/create" className="btn-skew">
                    <Plus size={15} weight="bold" /> {t("Tạo bài")}
                </Link>
                <Link to="/agent" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-brand-dark hover:bg-brand/10 transition-colors text-foreground">
                    <Sparkle size={13} weight="bold" className="text-brand-dark" /> {t("AI")}
                </Link>
            </div>
        </div>
    );
}

function Kpi({ label, value, icon: Icon }) {
    return (
        <div className="panel p-4 flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{label}</span>
                <Icon size={16} weight="duotone" className="text-muted-foreground/50 shrink-0" />
            </div>
            <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{typeof value === 'number' ? formatNumber(value) : value}</p>
        </div>
    );
}
