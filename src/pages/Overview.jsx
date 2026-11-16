import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    PlugsConnected,
    CalendarDots,
    CalendarBlank,
    CheckCircle,
    PaperPlaneTilt,
    SquaresFour,
    Plus,
    CursorClick,
    Sparkle,
    ArrowUpRight,
    ShareNetwork,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useWorkspace } from '@/lib/workspace-context';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import EmptyState from '@/components/common/EmptyState';
import UpcomingSchedule from '@/components/overview/UpcomingSchedule';
import RecentActivity from '@/components/overview/RecentActivity';
import DistributionPanel from '@/components/overview/DistributionPanel';
import TrafficOverview from '@/components/overview/TrafficOverview';
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import { Skeleton } from '@/components/ui/skeleton';

const KPI_ICON = { iconBg: 'bg-brand/20 border-brand-dark/40', iconColor: 'text-brand-ink' };

export default function Overview() {
    const { t } = useTranslation();
    const { scope, brands, switchMode, seeding, timezone } = useWorkspace();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [trafficRefreshing, setTrafficRefreshing] = useState(false);
    const [lastTrafficUpdatedAt, setLastTrafficUpdatedAt] = useState(null);
    const trafficInFlightRef = useRef(false);

    const fetchTraffic = useCallback(async ({ silent = false } = {}) => {
        const deduped = new Map();
        try {
            const listArg = scope.brand_id
                ? { brand_id: scope.brand_id }
                : { brand_id: 'all', is_demo: scope.is_demo };
            const res = await appClient.links.list(listArg, { silent });
            (res?.links || []).forEach((link) => {
                if (link?.id) deduped.set(link.id, link);
            });
        } catch (err) {
            if (!scope.brand_id && brands.length > 0) {
                const results = await Promise.all(
                    brands.map((b) => appClient.links.list({ brand_id: b.id }, { silent: true }).catch(() => ({ links: [] })))
                );
                results.forEach((res) => {
                    (res?.links || []).forEach((link) => {
                        if (link?.id) deduped.set(link.id, link);
                    });
                });
            } else {
                throw err;
            }
        }
        const trackingLinks = Array.from(deduped.values());
        const totalClicks = trackingLinks.reduce((sum, link) => sum + (link.clicks || 0), 0);
        return { trackingLinks, totalClicks };
    }, [scope, brands]);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [statusAgg, pillarAgg, angleAgg, accounts, upcoming, logs, pillars, angles, traffic] = await Promise.all([
                appClient.entities.Post.aggregate({ query: scope, groupBy: 'status' }),
                appClient.entities.Post.aggregate({ query: scope, groupBy: 'pillar_id' }),
                appClient.entities.Post.aggregate({ query: scope, groupBy: 'angle_id' }),
                appClient.entities.SocialAccount.filter(scope, { limit: 200 }),
                appClient.entities.Post.filter(
                    { ...scope, status: { $in: ['scheduled', 'processing'] } },
                    { sort: 'scheduled_at', limit: 10 }
                ),
                appClient.entities.PublishingLog.filter(scope, { sort: '-occurred_at', limit: 6 }),
                appClient.entities.ContentPillar.filter(scope, { limit: 300 }),
                appClient.entities.ContentAngle.filter(scope, { limit: 500 }),
                fetchTraffic({ silent: true }).catch((linkErr) => {
                    console.warn('Traffic links load warning:', linkErr);
                    return { trackingLinks: [], totalClicks: 0 };
                }),
            ]);

            const byStatus = {};
            statusAgg.rows.forEach((row) => {
                byStatus[row.status] = row.count;
            });
            const total = Object.values(byStatus).reduce((sum, value) => sum + value, 0);

            setData({
                byStatus,
                total,
                accounts: accounts.items,
                upcoming: upcoming.items,
                logs: logs.items,
                pillarRows: pillarAgg.rows,
                angleRows: angleAgg.rows,
                pillarMap: Object.fromEntries(pillars.items.map((p) => [p.id, p])),
                angleMap: Object.fromEntries(angles.items.map((a) => [a.id, a])),
                trackingLinks: traffic.trackingLinks,
                totalClicks: traffic.totalClicks,
            });
            setLastTrafficUpdatedAt(Date.now());
        } catch (error) {
            setLoadError(error.message);
        } finally {
            setLoading(false);
        }
    }, [scope, fetchTraffic]);

    const refreshTraffic = useCallback(async ({ silent = true } = {}) => {
        if (trafficInFlightRef.current) return;
        trafficInFlightRef.current = true;
        if (!silent) setTrafficRefreshing(true);
        try {
            const traffic = await fetchTraffic({ silent });
            setData((prev) => (prev ? { ...prev, trackingLinks: traffic.trackingLinks, totalClicks: traffic.totalClicks } : prev));
            setLastTrafficUpdatedAt(Date.now());
        } catch (linkErr) {
            if (!silent) console.warn('Traffic refresh warning:', linkErr);
        } finally {
            trafficInFlightRef.current = false;
            if (!silent) setTrafficRefreshing(false);
        }
    }, [fetchTraffic]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        // Optimized: Only refresh traffic periodically every 5 minutes (300,000ms) to conserve Cloudflare requests
        const POLL_INTERVAL_MS = 300000;
        let lastRefreshTime = Date.now();

        const intervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                refreshTraffic({ silent: true });
                lastRefreshTime = Date.now();
            }
        }, POLL_INTERVAL_MS);

        const handleVisibilityChange = () => {
            // Only refresh on tab switch if at least 5 minutes have elapsed since last check
            if (document.visibilityState === 'visible' && Date.now() - lastRefreshTime > POLL_INTERVAL_MS) {
                refreshTraffic({ silent: true });
                lastRefreshTime = Date.now();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [refreshTraffic]);

    if (loadError) {
        return (
            <div role="alert" className="panel p-5">
                <p className="mb-3 text-sm text-foreground">{t(loadError)}</p>
                <button type="button" className="btn-skew" onClick={load}>
                    {t('Thử lại')}
                </button>
            </div>
        );
    }

    const connected = data?.accounts.filter((a) => a.connection_status === 'connected').length || 0;
    const demoAccounts = data?.accounts.filter((a) => a.connection_status === 'demo').length || 0;
    const hasContent = (data?.total || 0) > 0 || (data?.accounts.length || 0) > 0;
    const publishedCount = data?.byStatus.published || 0;
    const scheduledCount = data?.byStatus.scheduled || 0;
    const draftCount = data?.byStatus.draft || 0;

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("Tổng quan")}
                description={
                    loading
                        ? t("Đang nạp dữ liệu không gian làm việc...")
                        : t("{scheduled} bài trong lịch phát sóng · {clicks} lượt nhấp UTM · {connected} kênh sẵn sàng", {
                            scheduled: scheduledCount,
                            clicks: data?.totalClicks || 0,
                            connected: connected + demoAccounts,
                        })
                }
                actions={
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <Link to="/create" className="btn-skew">
                            <Plus size={16} weight="bold" /> {t("Tạo bài viết")}
                        </Link>
                        <Link
                            to="/agent"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:border-brand-dark hover:bg-brand/10 transition-colors text-foreground"
                        >
                            <Sparkle size={15} weight="bold" className="text-brand-dark" />
                            <span>{t("AI Lên lịch nhanh")}</span>
                        </Link>
                        <Link
                            to="/calendar"
                            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <CalendarDots size={15} weight="duotone" />
                            <span>{t("Lịch tháng")}</span>
                        </Link>
                    </div>
                }
            />

            {loading ? (
                <div className="grid gap-5 xl:grid-cols-4">
                    <Skeleton className="h-44 rounded-2xl xl:col-span-2" />
                    <div className="grid grid-cols-2 gap-3 xl:col-span-2">
                        {[0, 1, 2, 3].map((key) => (
                            <Skeleton key={key} className="h-[104px] rounded-2xl" />
                        ))}
                    </div>
                    <Skeleton className="h-96 rounded-2xl xl:col-span-2" />
                    <Skeleton className="h-96 rounded-2xl xl:col-span-2" />
                    <Skeleton className="h-64 rounded-2xl" />
                    <Skeleton className="h-64 rounded-2xl" />
                    <Skeleton className="h-64 rounded-2xl xl:col-span-2" />
                </div>
            ) : !hasContent ? (
                <EmptyState
                    icon={SquaresFour}
                    title={t("Không gian làm việc chưa có dữ liệu")}
                    description={t("Tạo thương hiệu và bắt đầu lên lịch bài viết hoặc trải nghiệm ngay với AI Agent để quản lý nội dung đa kênh.")}
                >
                    <Link to="/agent" className="btn-skew">
                        <Sparkle size={16} weight="bold" />
                        {t("Bắt đầu với AI Agent")}
                    </Link>
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-[13px] hover:bg-surface cursor-pointer"
                        onClick={() => switchMode(true)}
                        disabled={seeding || isDesktop()}
                    >
                        <SquaresFour size={16} weight="duotone" />
                        {seeding ? t("Đang chuẩn bị...") : t("Tải dữ liệu mẫu")}
                    </button>
                    <Link
                        to="/accounts"
                        className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-[13px] hover:bg-surface"
                    >
                        {t("Kết nối kênh mạng xã hội")}
                    </Link>
                </EmptyState>
            ) : (
                <>
                    {draftCount > 0 && (
                        <div className="panel flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 border-brand-dark/50 bg-brand/15">
                            <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-ink border border-brand-dark mt-0.5 sm:mt-0">
                                    <PaperPlaneTilt size={20} weight="duotone" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-heading text-sm font-semibold text-foreground truncate">
                                        {draftCount} {t("bản nháp đang chờ xử lý")}
                                    </p>
                                    <p className="label-xs text-muted-foreground break-words sm:truncate">
                                        {t("Các bài viết nháp cần hoàn thiện hoặc phê duyệt trước khi đưa vào lịch phát sóng.")}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                <Link
                                    to="/posts?status=draft"
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-brand-dark bg-card px-3 py-1.5 text-xs font-semibold text-brand-ink hover:bg-brand/20 transition-colors"
                                >
                                    <PaperPlaneTilt size={14} weight="bold" />
                                    <span>{t("Xem bản nháp")}</span>
                                </Link>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="min-w-0">
                            <section className="panel p-4 sm:p-5" aria-label={t("Quy trình nội dung")}>
                                <div>
                                    <div className="flex items-center justify-between gap-3 mb-1">
                                        <h2 className="font-heading text-[15px] font-semibold text-foreground">{t("Quy trình nội dung")}</h2>
                                        <span className="label-xs">{data.total} {t("bài viết")}</span>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={t("Quy trình nội dung")}>
                                        {[['draft', 'bg-brand-neutral'], ['scheduled', 'bg-brand-dark'], ['published', 'bg-brand']].map(([k, cls]) => (
                                            <div key={k} className={cls} style={{ width: `${data.total ? ((data.byStatus[k] || 0) / data.total) * 100 : 0}%` }} />
                                        ))}
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
                                        {[['draft', 'Bản nháp', 'bg-brand-neutral'], ['scheduled', 'Đã lên lịch', 'bg-brand-dark'], ['published', 'Đã xuất bản', 'bg-brand']].map(([k, label, cls]) => (
                                            <span key={k} className="inline-flex items-center gap-1.5">
                                                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${cls}`} />
                                                {t(label)}: <strong className="font-semibold text-foreground">{data.byStatus[k] || 0}</strong>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <StatCard
                                label={t("Lưu lượng traffic")}
                                value={data.totalClicks || 0}
                                hint={t("{n} link chuyển đổi UTM đang hoạt động", { n: (data.trackingLinks || []).length })}
                                icon={CursorClick}
                                {...KPI_ICON}
                                badge={t("Thời gian thực")}
                            />
                            <StatCard
                                label={t("Lịch bài sắp tới")}
                                value={scheduledCount}
                                hint={t("{n} bài đang chuẩn bị xuất bản", { n: data.byStatus.processing || 0 })}
                                icon={CalendarBlank}
                                {...KPI_ICON}
                                badge={t("24h tới")}
                            />
                            <StatCard
                                label={t("Bài đã xuất bản")}
                                value={publishedCount}
                                hint={t("Phân phối đa kênh thành công")}
                                icon={CheckCircle}
                                {...KPI_ICON}
                                badge={t("Hoàn tất")}
                            />
                            <StatCard
                                label={t("Kênh kết nối")}
                                value={connected + demoAccounts}
                                hint={demoAccounts ? t("{n} kênh ở chế độ mô phỏng", { n: demoAccounts }) : t("Đồng bộ các mạng xã hội")}
                                icon={PlugsConnected}
                                {...KPI_ICON}
                                badge={connected > 0 ? t("Sẵn sàng") : t("Chưa nối")}
                            />
                        </div>
                    <div className="grid gap-6 xl:grid-cols-3">
                    <div className="space-y-6 xl:col-span-2">
                        <div className="min-w-0 xl:col-span-2 [&>*]:h-full">
                            <UpcomingSchedule
                                posts={data.upcoming}
                                brands={brands}
                                accounts={data.accounts}
                                timezone={timezone}
                            />
                        </div>

                        <div className="min-w-0 xl:col-span-2 [&>*]:h-full">
                            <TrafficOverview
                                trackingLinks={data.trackingLinks}
                                totalClicks={data.totalClicks}
                                timezone={timezone}
                                onRefresh={() => refreshTraffic({ silent: false })}
                                refreshing={trafficRefreshing}
                                lastUpdatedAt={lastTrafficUpdatedAt}
                            />
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="min-w-0 [&>*]:h-full">
                            <section className="panel p-4 sm:p-5 space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-border/80 min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-dark/40 bg-brand/20 text-brand-ink shrink-0">
                                            <ShareNetwork size={18} weight="duotone" />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="font-heading text-[15px] font-semibold text-foreground truncate">
                                                {t("Kênh xuất bản")}
                                            </h2>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {t("Trạng thái kết nối tài khoản")}
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        to="/accounts"
                                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors shrink-0"
                                    >
                                        <span>{t("Quản lý")}</span>
                                        <ArrowUpRight size={13} />
                                    </Link>
                                </div>

                                {!data.accounts?.length ? (
                                    <div className="py-5 text-center">
                                        <p className="text-xs text-muted-foreground">
                                            {t("Chưa có kênh mạng xã hội nào được kết nối.")}
                                        </p>
                                        <Link
                                            to="/accounts"
                                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted text-foreground"
                                        >
                                            <Plus size={13} weight="bold" /> {t("Kết nối kênh ngay")}
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {data.accounts.slice(0, 5).map((acc) => {
                                            const conf = PLATFORM_CONFIG[acc.platform];
                                            const IconComp = conf?.icon;
                                            const isConn = acc.connection_status === 'connected';
                                            const isDemo = acc.connection_status === 'demo';

                                            return (
                                                <div
                                                    key={acc.id}
                                                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/60 bg-surface/50 hover:bg-muted/30 transition-colors min-w-0"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                        <div
                                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${conf?.bg || 'bg-muted'
                                                                } ${conf?.border || 'border-border'} ${conf?.color || 'text-foreground'
                                                                }`}
                                                        >
                                                            {IconComp ? <IconComp size={16} weight="bold" /> : <ShareNetwork size={16} />}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-semibold text-foreground truncate">
                                                                {acc.name}
                                                            </p>
                                                            <p className="label-xs text-muted-foreground truncate">
                                                                {acc.handle || conf?.label || acc.platform}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <span
                                                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${isConn
                                                                ? 'bg-successBg text-successFg border-transparent'
                                                                : isDemo
                                                                    ? 'bg-warnBg text-warnFg border-transparent'
                                                                    : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                                                            }`}
                                                    >
                                                        {isConn
                                                            ? t("Hoạt động")
                                                            : isDemo
                                                                ? t("Mô phỏng")
                                                                : t("Cần xác thực")}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        </div>

                        <div className="min-w-0 [&>*]:h-full">
                            <RecentActivity logs={data.logs} />
                        </div>
                    </div>
                    </div>
                        <div className="min-w-0 xl:col-span-2 [&>*]:h-full">
                            <DistributionPanel
                                pillarRows={data.pillarRows}
                                angleRows={data.angleRows}
                                pillarMap={data.pillarMap}
                                angleMap={data.angleMap}
                                total={data.total}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
