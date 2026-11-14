import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    CursorClick,
    TrendUp,
    LinkSimple,
    ArrowUpRight,
    ArrowsClockwise,
    Globe,
    Plus,
    ChartLineUp,
} from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import { dateKey, formatNumber, formatTime } from '@/lib/format';
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

export default function TrafficOverview({
    trackingLinks = [],
    totalClicks,
    timezone = DEFAULT_TIMEZONE,
    onRefresh,
    refreshing = false,
    lastUpdatedAt = null,
}) {
    const { t } = useTranslation();
    const [rangeDays, setRangeDays] = useState(7);
    const activeTimezone = timezone || DEFAULT_TIMEZONE;

    const resolvedTotalClicks = useMemo(() => {
        if (typeof totalClicks === 'number') return totalClicks;
        return trackingLinks.reduce((sum, link) => sum + (link.clicks || 0), 0);
    }, [totalClicks, trackingLinks]);

    // Calculate aggregated daily clicks for the selected range (7 or 30 days) in workspace timezone
    const chartData = useMemo(() => {
        const daysMap = {};
        const todayKey = dateKey(new Date(), activeTimezone);
        const [year, month, day] = todayKey.split('-').map(Number);

        for (let i = rangeDays - 1; i >= 0; i--) {
            const calendarDate = new Date(Date.UTC(year, month - 1, day - i));
            const dateStr = calendarDate.toISOString().slice(0, 10);
            const [, mStr, dStr] = dateStr.split('-');
            const dayLabel = `${Number(dStr)}/${Number(mStr)}`;
            daysMap[dateStr] = { date: dateStr, day: dayLabel, clicks: 0 };
        }

        // Aggregate clicks from all links
        trackingLinks.forEach((link) => {
            (link.days || []).forEach((item) => {
                const key = typeof item?.day === 'string' ? item.day.slice(0, 10) : '';
                if (key && daysMap[key]) {
                    daysMap[key].clicks += item.clicks || 0;
                }
            });
        });

        return Object.values(daysMap);
    }, [trackingLinks, rangeDays, activeTimezone]);

    const periodClicks = useMemo(
        () => chartData.reduce((sum, item) => sum + (item.clicks || 0), 0),
        [chartData]
    );

    // Top 4 links by clicks
    const topLinks = useMemo(() => {
        return [...trackingLinks]
            .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
            .slice(0, 4);
    }, [trackingLinks]);

    const maxTopClicks = useMemo(
        () => Math.max(...topLinks.map((l) => l.clicks || 0), 1),
        [topLinks]
    );

    const activeLinksCount = trackingLinks.filter((l) => l.active !== false).length;

    return (
        <section className="panel p-4 sm:p-5 space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/80">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                        <CursorClick size={18} weight="bold" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <h2 className="font-heading text-[15px] font-semibold text-foreground truncate">
                                {t("Lưu lượng truy cập & Clicks")}
                            </h2>
                            <span
                                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0"
                                title={lastUpdatedAt ? `${t('Cập nhật lúc')} ${formatTime(lastUpdatedAt, activeTimezone)}` : t('Tự động cập nhật')}
                            >
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" aria-hidden="true" />
                                <span>{t("Trực tiếp")}</span>
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                            {t("Theo dõi lượng chuyển đổi và click qua các link UTM gắn trong bài viết")}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {onRefresh && (
                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={refreshing}
                            aria-label={t("Làm mới số liệu traffic")}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <ArrowsClockwise size={13} className={refreshing ? 'motion-safe:animate-spin' : ''} />
                            <span className="hidden sm:inline">{t("Làm mới")}</span>
                        </button>
                    )}
                    <Link
                        to="/analytics"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                    >
                        <span>{t("Xem báo cáo chi tiết")}</span>
                        <ArrowUpRight size={13} />
                    </Link>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="rounded-xl border border-border/70 bg-surface/50 p-2.5 sm:p-3 min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider block truncate">
                        {t("Tổng lượt nhấp")}
                    </span>
                    <span className="mt-1 font-heading text-lg sm:text-xl font-bold text-foreground block truncate">
                        {formatNumber(resolvedTotalClicks)}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                        <TrendUp size={12} className="text-emerald-500 shrink-0" /> <span className="truncate">{t("Tất cả các link")}</span>
                    </span>
                </div>

                <div className="rounded-xl border border-border/70 bg-surface/50 p-2.5 sm:p-3 min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider block truncate">
                        {t("Link theo dõi")}
                    </span>
                    <span className="mt-1 font-heading text-lg sm:text-xl font-bold text-foreground block truncate">
                        {formatNumber(activeLinksCount)}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 block truncate">
                        {t("Đang hoạt động")}
                    </span>
                </div>

                <div className="rounded-xl border border-border/70 bg-surface/50 p-2.5 sm:p-3 min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider block truncate">
                        {t("TB lượt nhấp/link")}
                    </span>
                    <span className="mt-1 font-heading text-lg sm:text-xl font-bold text-foreground block truncate">
                        {activeLinksCount > 0 ? (resolvedTotalClicks / activeLinksCount).toFixed(1) : '0'}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 block truncate">
                        {t("Lượt truy cập trung bình")}
                    </span>
                </div>

                <div className="rounded-xl border border-border/70 bg-surface/50 p-2.5 sm:p-3 min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider block truncate">
                        {t("Chiến dịch hàng đầu")}
                    </span>
                    <span className="mt-1 font-heading text-xs sm:text-sm font-bold text-foreground truncate block">
                        {topLinks[0]?.campaign || t("Mạng xã hội")}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 block truncate">
                        {topLinks[0] ? t("{n} lượt nhấp", { n: topLinks[0].clicks || 0 }) : t("Chưa có dữ liệu")}
                    </span>
                </div>
            </div>

            {/* Chart & Top Links Grid */}
            <div className="grid gap-5 lg:grid-cols-12 pt-1">
                {/* Click Trend Chart */}
                <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-border/70 p-3.5 sm:p-4 bg-card min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 min-w-0">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5 min-w-0">
                            <ChartLineUp size={15} className="text-foreground shrink-0" weight="bold" />
                            <span className="truncate">
                                {rangeDays === 30
                                    ? t("Xu hướng lượt nhấp 30 ngày gần nhất")
                                    : t("Xu hướng lượt nhấp 7 ngày gần nhất")}
                            </span>
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-muted-foreground">
                                {formatNumber(periodClicks)} {t("lượt nhấp")}
                            </span>
                            <div className="inline-flex items-center rounded-lg border border-border bg-muted/60 p-0.5 text-[11px]">
                                <button
                                    type="button"
                                    onClick={() => setRangeDays(7)}
                                    className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                                        rangeDays === 7
                                            ? 'bg-card text-foreground shadow-2xs font-semibold'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {t("7 ngày")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRangeDays(30)}
                                    className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                                        rangeDays === 30
                                            ? 'bg-card text-foreground shadow-2xs font-semibold'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {t("30 ngày")}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="h-44 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(var(--border))" />
                                <XAxis
                                    dataKey="day"
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={rangeDays === 30 ? 4 : 0}
                                />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'oklch(var(--muted) / 0.5)' }}
                                    contentStyle={{
                                        backgroundColor: 'oklch(var(--popover))',
                                        borderRadius: '10px',
                                        border: '1px solid oklch(var(--border))',
                                        fontSize: '12px',
                                    }}
                                    formatter={(value) => [`${value} ${t('lượt nhấp')}`, t('Traffic')]}
                                />
                                <Bar dataKey="clicks" fill="oklch(var(--foreground))" radius={[6, 6, 0, 0]} maxBarSize={36} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Traffic Links */}
                <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-border/70 p-3.5 sm:p-4 bg-card min-w-0">
                    <div>
                        <div className="flex items-center justify-between mb-3 min-w-0">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5 min-w-0">
                                <LinkSimple size={15} className="text-foreground shrink-0" weight="bold" />
                                <span className="truncate">{t("Top Link hút Traffic")}</span>
                            </span>
                            <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{t("Clicks")}</span>
                        </div>

                        {!topLinks.length ? (
                            <div className="py-6 text-center text-muted-foreground space-y-2">
                                <p className="text-xs">
                                    {t("Chưa có link theo dõi nào được tạo.")}
                                </p>
                                <p className="text-[11px] text-muted-foreground/80 max-w-xs mx-auto">
                                    {t("Gắn link vào bài viết trong bộ soạn thảo để tự động đo lường traffic đổ về website.")}
                                </p>
                                <Link to="/create" className="btn-skew mt-2">
                                    <Plus size={15} weight="bold" /> {t("Tạo bài viết có UTM")}
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {topLinks.map((link) => {
                                    const platformCfg = PLATFORM_CONFIG[link.platform] || {
                                        icon: Globe,
                                        label: link.platform || 'Web',
                                        color: 'text-foreground',
                                    };
                                    const Icon = platformCfg.icon;
                                    const pct = Math.min(Math.round(((link.clicks || 0) / maxTopClicks) * 100), 100);

                                    return (
                                        <div
                                            key={link.id}
                                            className="group flex flex-col rounded-lg border border-border/60 p-2 hover:bg-muted/30 transition-all text-xs min-w-0"
                                        >
                                            <div className="flex items-center justify-between gap-2 min-w-0">
                                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                    <Icon size={14} className={`${platformCfg.color} shrink-0`} />
                                                    <span className="font-semibold text-foreground truncate">
                                                        {link.campaign || t('Chiến dịch')}
                                                    </span>
                                                </div>
                                                <span className="font-mono font-bold text-foreground shrink-0">
                                                    {formatNumber(link.clicks || 0)}
                                                </span>
                                            </div>

                                            <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground min-w-0">
                                                <span className="truncate min-w-0 flex-1" title={link.target || link.url}>
                                                    {link.target ? link.target.replace(/^https?:\/\//, '') : link.url}
                                                </span>
                                                <a
                                                    href={link.target || link.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
                                                >
                                                    <ArrowUpRight size={12} />
                                                </a>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-foreground"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

