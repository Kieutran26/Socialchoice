import { useState, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'react-router-dom';
import { formatDateTime } from '@/lib/format';
import {
    CalendarBlank,
    CalendarDots,
    ArrowUpRight,
    Plus,
    Clock,
    Sparkle,
} from '@phosphor-icons/react';
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import { todayInZone, toZonedParts } from '@/lib/tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

export default function UpcomingSchedule({ posts = [], brands = [], accounts = [], timezone = DEFAULT_TIMEZONE }) {
    const { t } = useTranslation();
    const [selectedDayFilter, setSelectedDayFilter] = useState('all');

    // Build 7 days of the current week (starting Monday)
    const weekDays = useMemo(() => {
        const todayStr = todayInZone(timezone);
        const todayDate = new Date(`${todayStr}T00:00:00Z`);
        const dayOfWeek = (todayDate.getUTCDay() + 6) % 7; // 0 = Mon, 6 = Sun
        
        const monday = new Date(todayDate);
        monday.setUTCDate(todayDate.getUTCDate() - dayOfWeek);

        const days = [];
        const dayNames = ['Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'CN'];

        for (let i = 0; i < 7; i++) {
            const current = new Date(monday);
            current.setUTCDate(monday.getUTCDate() + i);
            const dateIso = current.toISOString().slice(0, 10);
            const count = posts.filter((p) => {
                if (!p.scheduled_at) return false;
                const pDate = toZonedParts(p.scheduled_at, timezone).date;
                return pDate === dateIso;
            }).length;

            days.push({
                iso: dateIso,
                label: dayNames[i],
                dayMonth: `${current.getUTCDate()}/${current.getUTCMonth() + 1}`,
                isToday: dateIso === todayStr,
                count,
            });
        }
        return days;
    }, [posts, timezone]);

    // Filter posts
    const filteredPosts = useMemo(() => {
        if (selectedDayFilter === 'all') return posts;
        return posts.filter((p) => {
            if (!p.scheduled_at) return false;
            const pDate = toZonedParts(p.scheduled_at, timezone).date;
            return pDate === selectedDayFilter;
        });
    }, [posts, selectedDayFilter, timezone]);

    return (
        <section className="panel p-5 flex flex-col justify-between space-y-4">
            <div>
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/80">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
                            <CalendarBlank size={18} weight="bold" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-heading text-[15px] font-semibold text-foreground">
                                    {t("Lịch bài đăng sắp tới")}
                                </h2>
                                {posts.length > 0 && (
                                    <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[11px] font-bold">
                                        {posts.length} {t("bài")}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t("Lịch phát sóng nội dung tự động trên các kênh đã kết nối")}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            to="/agent"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
                        >
                            <Sparkle size={13} weight="bold" className="text-amber-500" />
                            <span>{t("AI lên lịch nhanh")}</span>
                        </Link>
                        <Link
                            to="/calendar"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                        >
                            <span>{t("Mở lịch tháng")}</span>
                            <ArrowUpRight size={13} />
                        </Link>
                    </div>
                </div>

                {/* Weekly Mini Calendar Bar */}
                <div className="pt-3 pb-1">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t("Lịch tuần này")}:
                        </span>
                        {selectedDayFilter !== 'all' && (
                            <button
                                type="button"
                                onClick={() => setSelectedDayFilter('all')}
                                className="text-[11px] font-medium text-foreground hover:underline cursor-pointer"
                            >
                                {t("Hiển thị tất cả bài")}
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                        {weekDays.map((d) => {
                            const isSelected = selectedDayFilter === d.iso;
                            return (
                                <button
                                    key={d.iso}
                                    type="button"
                                    onClick={() => setSelectedDayFilter(isSelected ? 'all' : d.iso)}
                                    className={`flex flex-col items-center justify-center rounded-xl p-2 transition-all cursor-pointer border text-center ${
                                        isSelected
                                            ? 'bg-foreground text-background border-foreground shadow-2xs'
                                            : d.isToday
                                            ? 'bg-muted/80 border-foreground/40 text-foreground font-semibold'
                                            : 'bg-surface/60 border-border/60 hover:border-border text-foreground'
                                    }`}
                                >
                                    <span className="text-[10px] font-bold uppercase opacity-75">
                                        {d.label}
                                    </span>
                                    <span className="text-xs font-heading font-semibold mt-0.5">
                                        {d.dayMonth}
                                    </span>
                                    {d.count > 0 ? (
                                        <span
                                            className={`mt-1 h-1.5 w-1.5 rounded-full ${
                                                isSelected ? 'bg-background' : 'bg-foreground'
                                            }`}
                                        />
                                    ) : (
                                        <span className="mt-1 h-1.5 w-1.5 opacity-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Posts List or Empty State */}
                <div className="pt-3">
                    {!filteredPosts.length ? (
                        <div className="py-8 px-4 text-center rounded-xl border border-dashed border-border/70 bg-surface/30">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground mx-auto mb-2.5">
                                <CalendarDots size={22} weight="duotone" />
                            </div>
                            <p className="text-xs font-semibold text-foreground">
                                {selectedDayFilter !== 'all'
                                    ? t("Không có bài đăng nào được lên lịch cho ngày này.")
                                    : t("Chưa có bài viết nào trong lịch sắp tới.")}
                            </p>
                            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto mt-1">
                                {t("Bạn có thể nhờ AI Agent tự động lên lịch hoặc tạo bài viết thủ công.")}
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3.5">
                                <Link to="/agent" className="btn-skew">
                                    <Sparkle size={15} weight="bold" /> {t("Nhờ AI lên lịch")}
                                </Link>
                                <Link
                                    to="/create"
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-2xs"
                                >
                                    <Plus size={15} weight="bold" /> {t("Tạo bài viết")}
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/60">
                            {filteredPosts.map((p) => {
                                const brand = brands.find((b) => b.id === p.brand_id);
                                const postAccounts = (p.account_ids || [])
                                    .map((id) => accounts.find((a) => a.id === id))
                                    .filter(Boolean);
                                const mediaUrl = p.media_urls?.[0] || (Array.isArray(p.media) ? p.media[0]?.url : null);

                                return (
                                    <Link
                                        key={p.id}
                                        to={`/posts?post=${p.id}`}
                                        className="group flex items-start gap-3.5 py-3 transition-colors hover:bg-muted/30 px-2 rounded-xl -mx-2"
                                    >
                                        {mediaUrl ? (
                                            <img
                                                src={mediaUrl}
                                                alt=""
                                                className="h-10 w-10 shrink-0 rounded-xl object-cover border border-border/70"
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-surface text-muted-foreground group-hover:border-border transition-colors">
                                                <Clock size={18} weight="duotone" />
                                            </div>
                                        )}

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-foreground truncate group-hover:text-foreground/80 transition-colors">
                                                    {p.title || t("Untitled")}
                                                </p>
                                                <span className="font-mono text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full shrink-0">
                                                    {formatDateTime(p.scheduled_at, p.timezone || timezone)}
                                                </span>
                                            </div>

                                            {p.caption && (
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                    {p.caption}
                                                </p>
                                            )}

                                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                {brand && (
                                                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80 text-[11px]">
                                                        <span
                                                            className="h-2 w-2 rounded-full shrink-0"
                                                            style={{ backgroundColor: brand.color || '#ffd631' }}
                                                        />
                                                        {brand.name}
                                                    </span>
                                                )}

                                                {postAccounts.length > 0 ? (
                                                    <div className="flex items-center gap-1">
                                                        {postAccounts.map((acc) => {
                                                            const conf = PLATFORM_CONFIG[acc.platform];
                                                            const IconComp = conf?.icon;
                                                            return (
                                                                <span
                                                                    key={acc.id}
                                                                    title={`${acc.name} (${acc.platform})`}
                                                                    className={`inline-flex items-center justify-center rounded-md p-1 border text-[11px] ${
                                                                        conf?.bg || 'bg-muted'
                                                                    } ${conf?.border || 'border-border'} ${conf?.color || 'text-foreground'}`}
                                                                >
                                                                    {IconComp ? <IconComp size={12} weight="bold" /> : acc.platform}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                ) : p.account_ids?.length > 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                                                        <span>{p.account_ids.length} kênh đăng</span>
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>

                                        <ArrowUpRight
                                            size={14}
                                            className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                                        />
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
