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
                appClient.entities.PublishingLog.filter(scope, { sort: '-occurred_at', limit: 8 }),
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
                <p className="mb-3">{t(loadError)}</p>
                <button type="button" className="btn-skew" onClick={load}>
                    {t('Retry')}
                </button>
            </div>
        );
    }

    const connected = data?.accounts.filter((a) => a.connection_status === 'connected').length || 0;
    const demoAccounts = data?.accounts.filter((a) => a.connection_status === 'demo').length || 0;
    const hasContent = (data?.total || 0) > 0 || (data?.accounts.length || 0) > 0;
    const publishedCount = data?.byStatus.published || 0;
    const scheduledCount = data?.byStatus.scheduled || 0;

    return (
        <>
            <PageHeader
                title={t("Tổng quan")}
                description={t("Theo dõi lưu lượng truy cập (traffic), lịch phát sóng bài đăng và hiệu quả nội dung đa kênh.")}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <Link to="/agent" className="btn-skew shadow-2xs">
                            <Sparkle size={16} weight="bold" /> {t("AI Lên lịch nhanh")}
                        </Link>
                        <Link
                            to="/create"
                            className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted transition-colors flex items-center gap-1.5"
                        >
                            <Plus size={15} weight="bold" /> {t("Tạo bài viết")}
                        </Link>
                    </div>
                }
            />

            {loading ? (
                <div className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[0, 1, 2, 3].map((key) => (
                            <Skeleton key={key} className="h-[104px] rounded-2xl" />
                        ))}
                    </div>
                    <Skeleton className="h-64 rounded-2xl" />
                    <div className="grid gap-5 xl:grid-cols-2">
                        <Skeleton className="h-80 rounded-2xl" />
                        <Skeleton className="h-80 rounded-2xl" />
                    </div>
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
                    <button type="button" className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-[13px] hover:bg-surface cursor-pointer" onClick={() => switchMode(true)} disabled={seeding || isDesktop()}>
                        <SquaresFour size={16} weight="duotone" />
                        {seeding ? t("Đang chuẩn bị...") : t("Tải dữ liệu mẫu")}
                    </button>
                    <Link to="/accounts" className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-[13px] hover:bg-surface">
                        {t("Kết nối kênh mạng xã hội")}
                    </Link>
                </EmptyState>
            ) : (
                <div className="space-y-6">
                    {/* StatCards KPI Grid */}
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label={t("Lượt click / Traffic")}
                            value={data.totalClicks || 0}
                            hint={t("{n} link chuyển đổi UTM đang hoạt động", { n: (data.trackingLinks || []).length })}
                            icon={CursorClick}
                            iconBg="bg-[#ffd631]/20 border-[#ffd631]/40"
                            iconColor="text-[#806400]"
                        />
                        <StatCard
                            label={t("Lịch bài đăng sắp tới")}
                            value={scheduledCount}
                            hint={t("{value1} bài đang chuẩn bị xuất bản", { value1: data.byStatus.processing || 0 })}
                            icon={CalendarBlank}
                            iconBg="bg-blue-50 border-blue-200"
                            iconColor="text-blue-600"
                        />
                        <StatCard
                            label={t("Bài đã xuất bản")}
                            value={publishedCount}
                            hint={t("Đã phân phối tới các kênh mạng xã hội")}
                            icon={CheckCircle}
                            iconBg="bg-emerald-50 border-emerald-200"
                            iconColor="text-emerald-600"
                        />
                        <StatCard
                            label={t("Kênh kết nối")}
                            value={connected}
                            hint={demoAccounts ? t("{value1} kênh ở chế độ mô phỏng", { value1: demoAccounts }) : t("Threads, LinkedIn, Facebook, Instagram...")}
                            icon={PlugsConnected}
                            iconBg="bg-purple-50 border-purple-200"
                            iconColor="text-purple-600"
                        />
                    </div>

                    {/* Section 1: Traffic & Link Performance */}
                    <TrafficOverview
                        trackingLinks={data.trackingLinks}
                        totalClicks={data.totalClicks}
                        timezone={timezone}
                    />

                    {/* Section 2: Post Schedule & Recent Activity Grid */}
                    <div className="grid gap-5 xl:grid-cols-2">
                        <UpcomingSchedule
                            posts={data.upcoming}
                            brands={brands}
                            timezone={timezone}
                        />
                        <RecentActivity logs={data.logs} />
                    </div>

                    {/* Section 3: Content Distribution */}
                    <DistributionPanel
                        pillarRows={data.pillarRows}
                        angleRows={data.angleRows}
                        pillarMap={data.pillarMap}
                        angleMap={data.angleMap}
                        total={data.total}
                    />

                    {/* Drafts Banner Callout */}
                    {data.byStatus.draft ? (
                        <div className="panel flex flex-wrap items-center justify-between gap-4 p-5 border-brand/40 bg-brand/5 shadow-2xs">
                            <div className="flex items-center gap-3.5">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/20 text-brand-ink border border-brand/40 shadow-2xs">
                                    <PaperPlaneTilt size={22} weight="duotone" />
                                </div>
                                <div>
                                    <p className="font-heading text-sm font-semibold text-foreground">
                                        {data.byStatus.draft} {t("bản nháp đang chờ xử lý")}
                                    </p>
                                    <p className="label-xs mt-0.5 text-muted-foreground">
                                        {t("Hoàn thiện hoặc nhờ AI Agent hỗ trợ lên lịch cho các tuần tới.")}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link to="/posts?status=draft" className="btn-skew">
                                    <PaperPlaneTilt size={15} weight="bold" />
                                    {t("Xem bản nháp")}
                                </Link>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </>
    );
}
