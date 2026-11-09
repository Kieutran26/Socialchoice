import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    PlugsConnected,
    CalendarDots,
    CalendarBlank,
    CheckCircle,
    WarningCircle,
    PaperPlaneTilt,
    SquaresFour,
    Plus,
    CursorClick,
    Sparkle,
    TrendUp,
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

export default function Overview() {
    const { t } = useTranslation();
    const { scope, brands, switchMode, seeding, timezone } = useWorkspace();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [statusAgg, pillarAgg, angleAgg, accounts, upcoming, logs, pillars, angles] = await Promise.all([
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
            ]);

            const byStatus = {};
            statusAgg.rows.forEach((row) => {
                byStatus[row.status] = row.count;
            });
            const total = Object.values(byStatus).reduce((sum, value) => sum + value, 0);

            // Fetch tracking links & clicks traffic
            const trackingLinks = [];
            let totalClicks = 0;
            try {
                const targetBrandIds = scope.brand_id ? [scope.brand_id] : brands.map((b) => b.id);
                const linkRequests = targetBrandIds.map((bId) =>
                    appClient.links.list({ brand_id: bId }).catch(() => ({ links: [] }))
                );
                const results = await Promise.all(linkRequests);
                results.forEach((res) => {
                    (res?.links || []).forEach((link) => {
                        trackingLinks.push(link);
                        totalClicks += link.clicks || 0;
                    });
                });
            } catch (linkErr) {
                console.warn('Traffic links load warning:', linkErr);
            }

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
                trackingLinks,
                totalClicks,
            });
        } catch (error) {
            setLoadError(error.message);
        } finally {
            setLoading(false);
        }
    }, [scope, brands]);

    useEffect(() => {
        load();
    }, [load]);

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
            {/* Header with live operational status summary and clear action hierarchy */}
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
                    <div className="flex flex-wrap items-center gap-2">
                        <Link to="/create" className="btn-skew shadow-2xs">
                            <Plus size={16} weight="bold" /> {t("Tạo bài viết")}
                        </Link>
                        <Link
                            to="/agent"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted transition-colors text-foreground"
                        >
                            <Sparkle size={15} weight="bold" className="text-amber-500" />
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
                <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {[0, 1, 2, 3].map((key) => (
                            <Skeleton key={key} className="h-[104px] rounded-2xl" />
                        ))}
                    </div>
                    <div className="grid gap-6 xl:grid-cols-3">
                        <div className="xl:col-span-2 space-y-6">
                            <Skeleton className="h-96 rounded-2xl" />
                            <Skeleton className="h-80 rounded-2xl" />
                        </div>
                        <div className="xl:col-span-1 space-y-6">
                            <Skeleton className="h-64 rounded-2xl" />
                            <Skeleton className="h-64 rounded-2xl" />
                        </div>
                    </div>
                    <Skeleton className="h-72 rounded-2xl" />
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
                    {/* Drafts Alert Callout (if drafts exist) */}
                    {draftCount > 0 && (
                        <div className="panel flex flex-wrap items-center justify-between gap-4 p-4 border-amber-300/60 bg-amber-50/40 shadow-2xs">
                            <div className="flex items-center gap-3.5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
                                    <PaperPlaneTilt size={20} weight="duotone" />
                                </div>
                                <div>
                                    <p className="font-heading text-sm font-semibold text-foreground">
                                        {draftCount} {t("bản nháp đang chờ xử lý")}
                                    </p>
                                    <p className="label-xs text-muted-foreground">
                                        {t("Các bài viết nháp cần hoàn thiện hoặc phê duyệt trước khi đưa vào lịch phát sóng.")}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    to="/posts?status=draft"
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50 transition-colors shadow-2xs"
                                >
                                    <PaperPlaneTilt size={14} weight="bold" />
                                    <span>{t("Xem bản nháp")}</span>
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Unified StatCards KPI Row (Strictly 1 cohesive color family per UI/UX guidelines) */}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label={t("Lưu lượng traffic")}
                            value={data.totalClicks || 0}
                            hint={t("{n} link chuyển đổi UTM đang hoạt động", { n: (data.trackingLinks || []).length })}
                            icon={CursorClick}
                            badge={t("Thời gian thực")}
                        />
                        <StatCard
                            label={t("Lịch bài sắp tới")}
                            value={scheduledCount}
                            hint={t("{n} bài đang chuẩn bị xuất bản", { n: data.byStatus.processing || 0 })}
                            icon={CalendarBlank}
                            badge={t("24h tới")}
                        />
                        <StatCard
                            label={t("Bài đã xuất bản")}
                            value={publishedCount}
                            hint={t("Phân phối đa kênh thành công")}
                            icon={CheckCircle}
                            badge={t("Hoàn tất")}
                        />
                        <StatCard
                            label={t("Kênh kết nối")}
                            value={connected + demoAccounts}
                            hint={demoAccounts ? t("{n} kênh ở chế độ mô phỏng", { n: demoAccounts }) : t("Đồng bộ các mạng xã hội")}
                            icon={PlugsConnected}
                            badge={connected > 0 ? t("Sẵn sàng") : t("Chưa nối")}
                        />
                    </div>

                    {/* Asymmetric Workspace Grid: 2-Cols Left (Queue + Traffic), 1-Col Right (Activity + Distribution + Accounts) */}
                    <div className="grid gap-6 xl:grid-cols-3">
                        {/* Main Left Column (col-span-2) */}
                        <div className="space-y-6 xl:col-span-2">
                            {/* Primary Task 1: Upcoming Schedule Queue */}
                            <UpcomingSchedule
                                posts={data.upcoming}
                                brands={brands}
                                accounts={data.accounts}
                                timezone={timezone}
                            />

                            {/* Primary Task 2: Traffic & Conversion Link Performance */}
                            <TrafficOverview
                                trackingLinks={data.trackingLinks}
                                totalClicks={data.totalClicks}
                                timezone={timezone}
                            />
                        </div>

                        {/* Side Right Column (col-span-1) */}
                        <div className="space-y-6 xl:col-span-1">
                            {/* Connected Social Channels Card */}
                            <section className="panel p-5 space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-border/80">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
                                            <ShareNetwork size={18} weight="duotone" />
                                        </div>
                                        <div>
                                            <h2 className="font-heading text-[15px] font-semibold text-foreground">
                                                {t("Kênh xuất bản")}
                                            </h2>
                                            <p className="text-xs text-muted-foreground">
                                                {t("Trạng thái kết nối tài khoản")}
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        to="/accounts"
                                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
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
                                                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/60 bg-surface/50 hover:bg-muted/30 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div
                                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${conf?.bg || 'bg-muted'
                                                                } ${conf?.border || 'border-border'} ${conf?.color || 'text-foreground'
                                                                }`}
                                                        >
                                                            {IconComp ? <IconComp size={16} weight="bold" /> : <ShareNetwork size={16} />}
                                                        </div>
                                                        <div className="min-w-0">
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
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : isDemo
                                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
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

                            {/* Recent Activity Feed */}
                            <RecentActivity logs={data.logs} />
                        </div>
                    </div>

                    {/* Content Strategy Distribution Panel - Full Width */}
                    <DistributionPanel
                        pillarRows={data.pillarRows}
                        angleRows={data.angleRows}
                        pillarMap={data.pillarMap}
                        angleMap={data.angleMap}
                        total={data.total}
                    />
                </>
            )}
        </div>
    );
}
