import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    CursorClick,
    TrendUp,
    LinkSimple,
    ArrowUpRight,
    Globe,
    Sparkle,
    Plus,
    ChartLineUp,
} from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import { formatNumber } from '@/lib/format';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';

export default function TrafficOverview({ trackingLinks = [], totalClicks = 0, timezone }) {
    const { t } = useTranslation();

    // Calculate aggregated daily clicks for the last 7 days
    const chartData = useMemo(() => {
        const daysMap = {};
        const today = new Date();

        // Initialize 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
            daysMap[dateStr] = { date: dateStr, day: dayLabel, clicks: 0 };
        }

        // Aggregate clicks from all links
        trackingLinks.forEach((link) => {
            (link.days || []).forEach((item) => {
                if (daysMap[item.day]) {
                    daysMap[item.day].clicks += item.clicks || 0;
                }
            });
        });

        return Object.values(daysMap);
    }, [trackingLinks]);

    // Top 4 links by clicks
    const topLinks = useMemo(() => {
        return [...trackingLinks]
            .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
            .slice(0, 4);
    }, [trackingLinks]);

    const activeLinksCount = trackingLinks.filter((l) => l.active !== false).length;

    return (
        <section className="panel p-5 space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/80">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffd631]/20 text-[#2b2100]">
                        <CursorClick size={18} weight="bold" />
                    </div>
                    <div>
                        <h2 className="font-heading text-[15px] font-semibold text-foreground">
                            {t("Lưu lượng truy cập & Clicks")}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {t("Theo dõi lượng chuyển đổi và click qua các link UTM gắn trong bài viết")}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border/70 bg-surface/50 p-3">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                        {t("Tổng lượt nhấp")}
                    </span>
                    <span className="mt-1 font-heading text-xl font-bold text-foreground block">
                        {formatNumber(totalClicks)}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block flex items-center gap-1">
                        <TrendUp size={12} className="text-emerald-500" /> Tất cả các link
                    </span>
                </div>

                <div className="rounded-xl border border-border/70 bg-surface/50 p-3">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                        {t("Link theo dõi")}
                    </span>
                    <span className="mt-1 font-heading text-xl font-bold text-foreground block">
                        {formatNumber(activeLinksCount)}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">
                        Đang hoạt động
                    </span>
                </div>

                <div className="rounded-xl border border-border/70 bg-surface/50 p-3">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                        {t("TB lượt nhấp/link")}
                    </span>
                    <span className="mt-1 font-heading text-xl font-bold text-foreground block">
                        {activeLinksCount > 0 ? (totalClicks / activeLinksCount).toFixed(1) : '0'}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">
                        Lượt truy cập trung bình
                    </span>
                </div>

                <div className="rounded-xl border border-border/70 bg-surface/50 p-3">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                        {t("Chiến dịch hàng đầu")}
                    </span>
                    <span className="mt-1 font-heading text-sm font-bold text-foreground truncate block">
                        {topLinks[0]?.campaign || 'Mạng xã hội'}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block truncate">
                        {topLinks[0] ? `${topLinks[0].clicks || 0} lượt nhấp` : 'Chưa có dữ liệu'}
                    </span>
                </div>
            </div>

            {/* Chart & Top Links Grid */}
            <div className="grid gap-5 lg:grid-cols-12 pt-1">
                {/* 7-day Click Trend Chart */}
                <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-border/70 p-4 bg-card">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <ChartLineUp size={15} className="text-[#ffd631]" weight="bold" />
                            {t("Xu hướng lượt nhấp 7 ngày gần nhất")}
                        </span>
                        <span className="text-[11px] text-muted-foreground">Theo ngày</span>
                    </div>

                    <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255, 214, 49, 0.15)' }}
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        borderRadius: '10px',
                                        border: '1px solid #e5e7eb',
                                        fontSize: '12px',
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                                    }}
                                    formatter={(value) => [`${value} lượt nhấp`, 'Traffic']}
                                />
                                <Bar dataKey="clicks" fill="#ffd631" radius={[6, 6, 0, 0]} maxBarSize={36} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Traffic Links */}
                <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-border/70 p-4 bg-card">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <LinkSimple size={15} className="text-[#ffd631]" weight="bold" />
                                {t("Top Link hút Traffic")}
                            </span>
                            <span className="text-[11px] text-muted-foreground">Clicks</span>
                        </div>

                        {!topLinks.length ? (
                            <div className="py-6 text-center text-muted-foreground space-y-2">
                                <p className="text-xs">
                                    {t("Chưa có link theo dõi nào được tạo.")}
                                </p>
                                <p className="text-[11px] text-muted-foreground/80 max-w-xs mx-auto">
                                    {t("Gắn link vào bài viết trong bộ soạn thảo để tự động đo lường traffic đổ về website.")}
                                </p>
                                <Link to="/create" className="btn-skew inline-flex text-xs py-1.5 px-3 mt-2">
                                    <Plus size={13} weight="bold" /> {t("Tạo bài viết có UTM")}
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
                                    const maxClicks = Math.max(...topLinks.map((l) => l.clicks || 1), 1);
                                    const pct = Math.min(Math.round(((link.clicks || 0) / maxClicks) * 100), 100);

                                    return (
                                        <div
                                            key={link.id}
                                            className="group flex flex-col rounded-lg border border-border/60 p-2 hover:bg-muted/30 transition-all text-xs"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <Icon size={14} className={platformCfg.color} />
                                                    <span className="font-semibold text-foreground truncate">
                                                        {link.campaign || 'Chiến dịch'}
                                                    </span>
                                                </div>
                                                <span className="font-mono font-bold text-foreground shrink-0">
                                                    {link.clicks || 0}
                                                </span>
                                            </div>

                                            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                                                <span className="truncate max-w-[200px]" title={link.target}>
                                                    {link.target ? link.target.replace(/^https?:\/\//, '') : link.url}
                                                </span>
                                                <a
                                                    href={link.target || link.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
                                                >
                                                    <ArrowUpRight size={12} />
                                                </a>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-[#ffd631]"
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
