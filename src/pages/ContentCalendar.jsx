import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowCounterClockwise,
    CalendarBlank,
    CalendarDots,
    CaretLeft,
    CaretRight,
    FacebookLogo,
    GitCommit,
    Globe,
    InstagramLogo,
    LinkedinLogo,
    ListDashes,
    Plus,
    RedditLogo,
    ThreadsLogo,
    TiktokLogo,
    XLogo,
    YoutubeLogo,
} from '@phosphor-icons/react';
import ZaloIcon from '@/components/common/ZaloIcon';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/workspace-context';
import { useTranslation } from '@/lib/i18n';
import { getLocale } from '@/lib/i18n-core';
import { isDesktop } from '@/api/desktop/runtime';
import { useToast } from '@/components/ui/use-toast';
import { formatCalendarDate, dateKey, formatTime } from '@/lib/format';
import { addDays, shiftMonths, startOfMonth, toUtcIso, todayInZone, toZonedParts, weekdayIndex } from '@/lib/tz';
import EmptyState from '@/components/common/EmptyState';
import LoadError from '@/components/common/load-error';
import ChannelTimelineView from '@/components/calendar/ChannelTimelineView';
import WeekView from '@/components/calendar/WeekView';
import ListView from '@/components/calendar/ListView';
import PostDetailSheet from '@/components/posts/PostDetailSheet';
import { Skeleton } from '@/components/ui/skeleton';

const PLATFORM_BADGE = {
    facebook: { icon: FacebookLogo, bg: 'bg-[#1565D8]', header: 'bg-[#1565D8] text-white', border: 'border-[#1565D8]/35' },
    instagram: { icon: InstagramLogo, bg: 'bg-[#C82353]', header: 'bg-[#C82353] text-white', border: 'border-[#C82353]/35' },
    threads: { icon: ThreadsLogo, bg: 'bg-zinc-900', header: 'bg-zinc-900 text-white', border: 'border-zinc-300' },
    tiktok: { icon: TiktokLogo, bg: 'bg-zinc-900', header: 'bg-zinc-900 text-white', border: 'border-zinc-300' },
    linkedin: { icon: LinkedinLogo, bg: 'bg-[#0A66C2]', header: 'bg-[#0A66C2] text-white', border: 'border-[#0A66C2]/35' },
    youtube: { icon: YoutubeLogo, bg: 'bg-[#FF0000]', header: 'bg-[#FF0000] text-white', border: 'border-[#FF0000]/35' },
    x: { icon: XLogo, bg: 'bg-zinc-900', header: 'bg-zinc-900 text-white', border: 'border-zinc-300' },
    reddit: { icon: RedditLogo, bg: 'bg-[#FF4500]', header: 'bg-[#FF4500] text-white', border: 'border-[#FF4500]/35' },
    zalo: { icon: ZaloIcon, bg: 'bg-[#0068FF]', header: 'bg-[#0068FF] text-white', border: 'border-[#0068FF]/35' },
};

const CARD_STATUS_STYLE = {
    scheduled: {
        wrapExtra: 'ring-1 ring-brand-dark/50 bg-white',
        dot: 'bg-[#ffd631]',
        label: 'Đã lên lịch',
    },
    published: {
        wrapExtra: 'bg-white',
        dot: 'bg-emerald-400',
        label: 'Đã đăng',
    },
    draft: {
        wrapExtra: 'border-dashed bg-zinc-50/70',
        dot: 'bg-zinc-300',
        label: 'Nháp',
    },
    failed: {
        wrapExtra: 'bg-rose-50/40',
        dot: 'bg-rose-300',
        label: 'Lỗi',
    },
    cancelled: {
        wrapExtra: 'bg-rose-50/40',
        dot: 'bg-rose-300',
        label: 'Đã hủy',
    },
};

function CleanDayPostCard({ post, accounts = [], mediaMap = {}, timezone = '', onSelect }) {
    const { t } = useTranslation();
    const [dragging, setDragging] = useState(false);
    const status = post.status || 'draft';
    const style = CARD_STATUS_STYLE[status] || CARD_STATUS_STYLE.draft;
    const canDrag = status !== 'published';

    const primaryAccountId = post.account_ids?.[0];
    const account = accounts.find((a) => a.id === primaryAccountId);
    const platform = (account?.platform || 'facebook').toLowerCase();
    const platformMeta = PLATFORM_BADGE[platform] || {
        icon: Globe,
        bg: 'bg-zinc-800',
        header: 'bg-zinc-800 text-white',
        border: 'border-zinc-300',
    };
    const PlatformIcon = platformMeta.icon;

    const firstMediaId = post.media_ids?.[0];
    const media = firstMediaId ? mediaMap[firstMediaId] : null;
    const thumbUrl = media?.file_url;
    const timeDisplay = post.scheduled_at ? formatTime(post.scheduled_at, timezone) : '';

    return (
        <div
            role="button"
            tabIndex={0}
            draggable={canDrag}
            onClick={(e) => {
                e.stopPropagation();
                onSelect?.(post);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect?.(post);
                }
            }}
            onDragStart={(e) => {
                if (!canDrag) {
                    e.preventDefault();
                    return;
                }
                setDragging(true);
                e.dataTransfer.setData('application/x-socialchoice-post', post.id);
                e.dataTransfer.setData('text/plain', post.id);
                e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => setDragging(false)}
            title={`${post.title || post.caption || t('Bài viết')} · ${t(style.label)}`}
            className={`group/card w-full overflow-hidden rounded-xl border text-left transition-colors hover:border-zinc-500 ${platformMeta.border} ${style.wrapExtra} ${
                canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
            } ${dragging ? 'opacity-45' : ''}`}
        >
            {/* Dải header màu tương ứng với từng nền tảng MXH */}
            <div className={`flex items-center justify-between gap-1.5 px-2 py-1 ${platformMeta.header}`}>
                <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ring-1 ring-white/40 ${style.dot}`} />
                    <span className="text-[11px] font-bold tabular-nums leading-none">
                        {timeDisplay || '--:--'}
                    </span>
                </div>
                <PlatformIcon size={13} weight="fill" className="shrink-0" />
            </div>

            {/* Thân thẻ trắng sạch: Ảnh (nếu có) + 2 dòng tiêu đề */}
            <div className="flex items-start gap-1.5 p-2">
                {thumbUrl && media?.file_type !== 'video' && (
                    <img
                        src={thumbUrl}
                        alt=""
                        className="h-7 w-7 shrink-0 rounded-md border border-border object-cover"
                    />
                )}
                <p className="line-clamp-2 min-w-0 flex-1 break-words text-xs font-medium leading-snug text-foreground">
                    {post.title || post.caption || t('Bài viết chưa đặt tiêu đề')}
                </p>
            </div>
        </div>
    );
}

function CleanMonthView({ days, postsByDay, onSelect, onMove, timezone, accounts = [], mediaMap = {} }) {
    const { t } = useTranslation();
    const today = todayInZone(timezone);
    const [dragOverDate, setDragOverDate] = useState(null);

    const weekDayHeaders = [
        { key: 'Mon', label: 'Thứ 2' },
        { key: 'Tue', label: 'Thứ 3' },
        { key: 'Wed', label: 'Thứ 4' },
        { key: 'Thu', label: 'Thứ 5' },
        { key: 'Fri', label: 'Thứ 6' },
        { key: 'Sat', label: 'Thứ 7' },
        { key: 'Sun', label: 'Chủ nhật', isSunday: true },
    ];

    return (
        <div className="panel overflow-hidden rounded-2xl border border-border bg-card">
            <div className="overflow-x-auto">
                <div className="min-w-[840px]">
                    <div className="grid grid-cols-7 border-b border-border bg-zinc-50/80 text-xs font-semibold text-foreground">
                        {weekDayHeaders.map((item) => (
                            <div
                                key={item.key}
                                className={`border-r border-border/60 p-3 text-center last:border-r-0 ${
                                    item.isSunday ? 'text-rose-700' : ''
                                }`}
                            >
                                {t(item.label)}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 divide-x divide-y divide-border">
                        {days.map((day) => {
                            const date = typeof day === 'string' ? day : day.date;
                            const inMonth = typeof day === 'string' ? true : day.inMonth !== false;
                            const isToday = date === today;
                            const dayNumber = Number(date.slice(-2));
                            const dayPosts = postsByDay[date] || [];
                            const isDragOver = dragOverDate === date;

                            return (
                                <div
                                    key={date}
                                    role="group"
                                    aria-label={t('Calendar day {date}', { date })}
                                    data-calendar-date={date}
                                    onDragOver={(event) => {
                                        if (
                                            onMove &&
                                            (event.dataTransfer.types.includes('application/x-socialchoice-post') ||
                                                event.dataTransfer.types.includes('text/plain'))
                                        ) {
                                            event.preventDefault();
                                            event.dataTransfer.dropEffect = 'move';
                                            if (dragOverDate !== date) setDragOverDate(date);
                                        }
                                    }}
                                    onDragLeave={(event) => {
                                        if (!event.currentTarget.contains(event.relatedTarget)) {
                                            if (dragOverDate === date) setDragOverDate(null);
                                        }
                                    }}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        setDragOverDate(null);
                                        const postId =
                                            event.dataTransfer.getData('application/x-socialchoice-post') ||
                                            event.dataTransfer.getData('text/plain');
                                        if (postId && onMove) onMove(postId, date);
                                    }}
                                    className={`group/cell flex min-h-[148px] flex-col gap-1.5 p-2 transition-colors ${
                                        isDragOver
                                            ? 'bg-brand-100/70 ring-2 ring-inset ring-brand-dark'
                                            : isToday
                                            ? 'bg-brand-50/45'
                                            : inMonth
                                            ? 'bg-card'
                                            : 'bg-zinc-50/50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between px-0.5">
                                        <span
                                            className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums ${
                                                isToday
                                                    ? 'bg-brand text-brand-ink'
                                                    : inMonth
                                                    ? 'text-foreground'
                                                    : 'text-zinc-500'
                                            }`}
                                        >
                                            {dayNumber}
                                        </span>

                                        <Link
                                            to={`/create?date=${date}`}
                                            title={t('Tạo bài cho ngày {date}', { date })}
                                            className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-zinc-100 hover:text-foreground group-hover/cell:opacity-100"
                                        >
                                            <Plus size={13} weight="bold" />
                                        </Link>
                                    </div>

                                    <div className="flex flex-1 flex-col gap-1.5">
                                        {dayPosts.map((post) => (
                                            <CleanDayPostCard
                                                key={post.id}
                                                post={post}
                                                accounts={accounts}
                                                mediaMap={mediaMap}
                                                timezone={timezone}
                                                onSelect={onSelect}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

const VIEW_OPTIONS = [
    { id: 'month', label: 'Tháng', icon: CalendarBlank },
    { id: 'channel', label: 'Theo kênh', icon: GitCommit },
    { id: 'week', label: 'Tuần', icon: CalendarDots },
    { id: 'list', label: 'Danh sách', icon: ListDashes },
];

export default function ContentCalendar() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const { scope, brands, selectedBrandId, timezone } = useWorkspace();
    const desktop = isDesktop();

    const [view, setView] = useState('month');
    const [anchor, setAnchor] = useState(() => todayInZone(timezone));
    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState([]);
    const [mediaMap, setMediaMap] = useState({});
    const [accounts, setAccounts] = useState([]);
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [openPost, setOpenPost] = useState(null);
    const [filters, setFilters] = useState({ account_id: 'all', pillar_id: 'all', angle_id: 'all' });
    const [error, setError] = useState('');
    const [moving, setMoving] = useState(false);
    const requestVersion = useRef(0);
    const reloadCurrent = useRef(async () => {});

    const range = useMemo(() => {
        if (view === 'month') {
            const first = startOfMonth(anchor);
            const start = addDays(first, -weekdayIndex(first));
            return { start, end: addDays(start, 42) };
        }
        if (view === 'week' || view === 'channel') {
            const start = addDays(anchor, -weekdayIndex(anchor));
            return { start, end: addDays(start, 7) };
        }
        return { start: anchor, end: addDays(anchor, 60) };
    }, [view, anchor]);

    const dayList = useMemo(() => {
        if (view === 'month') {
            return Array.from({ length: 42 }, (_, index) => {
                const date = addDays(range.start, index);
                return { date, inMonth: date.slice(0, 7) === anchor.slice(0, 7) };
            });
        }
        if (view === 'week' || view === 'channel') {
            return Array.from({ length: 7 }, (_, index) => addDays(range.start, index));
        }
        return Array.from({ length: 60 }, (_, index) => addDays(range.start, index));
    }, [view, range, anchor]);

    const load = useCallback(async () => {
        const version = ++requestVersion.current;
        setLoading(true);
        setError('');
        try {
            const [pillarPage, anglePage, accountPage] = await Promise.all([
                base44.entities.ContentPillar.filter({ is_demo: scope.is_demo }, { sort: 'name', limit: 300 }),
                base44.entities.ContentAngle.filter({ is_demo: scope.is_demo }, { sort: 'name', limit: 500 }),
                base44.entities.SocialAccount.filter({ is_demo: scope.is_demo }, { sort: 'name', limit: 300 }),
            ]);
            const query = {
                ...scope,
                scheduled_at: {
                    $gte: toUtcIso(range.start, '00:00', timezone),
                    $lt: toUtcIso(desktop ? range.end : addDays(range.end, 1), '00:00', timezone),
                },
            };
            if (filters.pillar_id !== 'all') query.pillar_id = filters.pillar_id;
            if (filters.angle_id !== 'all') query.angle_id = filters.angle_id;
            if (filters.account_id !== 'all') query.account_ids = filters.account_id;
            const page = await base44.entities.Post.filter(query, {
                sort: 'scheduled_at',
                limit: view === 'list' ? 200 : 300,
            });
            if (version !== requestVersion.current) return;
            setPillars(pillarPage.items || []);
            setAngles(anglePage.items || []);
            setAccounts(accountPage.items || []);
            setPosts(page.items || []);
        } catch (failure) {
            if (version === requestVersion.current) setError(failure.message);
        } finally {
            if (version === requestVersion.current) setLoading(false);
        }
    }, [scope, range, filters, view, timezone, desktop]);
    reloadCurrent.current = load;

    useEffect(() => {
        load();
        return () => {
            requestVersion.current++;
        };
    }, [load]);

    useEffect(() => {
        const ids = [...new Set(posts.flatMap((p) => p.media_ids || []))];
        if (!ids.length) {
            setMediaMap({});
            return;
        }
        let active = true;
        base44.entities.MediaAsset.filter({ id: { $in: ids } }, { limit: 100 })
            .then((page) => {
                if (!active) return;
                const map = {};
                page.items?.forEach((item) => {
                    map[item.id] = item;
                });
                setMediaMap(map);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [posts]);

    const postsByDay = useMemo(() => {
        const map = {};
        posts.forEach((post) => {
            if (!post.scheduled_at) return;
            const key = dateKey(post.scheduled_at, desktop ? timezone : post.timezone || timezone);
            map[key] = [...(map[key] || []), post];
        });
        return map;
    }, [posts, timezone, desktop]);

    const label =
        view === 'month'
            ? new Intl.DateTimeFormat(getLocale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
                  new Date(`${anchor.slice(0, 7)}-01T00:00:00Z`)
              )
            : view === 'week' || view === 'channel'
            ? `${formatCalendarDate(range.start)} → ${formatCalendarDate(addDays(range.end, -1))}`
            : t('60 ngày từ {date}', { date: formatCalendarDate(anchor) });

    const shift = (direction) => {
        if (view === 'month') setAnchor(shiftMonths(anchor, direction));
        else setAnchor(addDays(anchor, direction * (view === 'week' || view === 'channel' ? 7 : 30)));
    };

    const movePlan = async (id, date, targetAccountId) => {
        const post = posts.find((item) => item.id === id);
        if (moving || !post) return;

        if (post.status === 'published') {
            toast({
                variant: 'destructive',
                title: t('Không thể di chuyển bài viết'),
                description: t('Bài viết đã xuất bản không thể thay đổi ngày lên lịch.'),
            });
            return;
        }

        const currentParts = toZonedParts(post.scheduled_at, timezone);
        const time = currentParts.time || '09:00';
        const instant = toUtcIso(date, time, timezone);

        if (!instant) {
            toast({
                variant: 'destructive',
                title: t('Ngày không hợp lệ'),
            });
            return;
        }

        const isSameDate = currentParts.date === date;
        const isSameAccount =
            !targetAccountId || (post.account_ids && post.account_ids.includes(targetAccountId));
        if (isSameDate && isSameAccount) {
            return;
        }

        const newStatus = post.status === 'draft' ? 'draft' : 'scheduled';
        const newAccountIds =
            targetAccountId && (!post.account_ids || !post.account_ids.includes(targetAccountId))
                ? [targetAccountId]
                : post.account_ids;

        const previousPosts = posts;
        setMoving(true);
        setError('');

        setPosts((prev) =>
            prev.map((p) => {
                if (p.id !== id) return p;
                return {
                    ...p,
                    scheduled_at: instant,
                    status: newStatus,
                    account_ids: newAccountIds,
                };
            })
        );

        try {
            await base44.posts.save({
                id,
                data: {
                    status: newStatus,
                    scheduled_at: instant,
                    timezone: post.timezone || timezone,
                    ...(targetAccountId ? { account_ids: newAccountIds } : {}),
                },
            });
            toast({
                title: t('Đã dời lịch bài viết'),
                description: t('Bài viết đã được chuyển sang ngày {date}.', {
                    date: formatCalendarDate(date),
                }),
            });
            await reloadCurrent.current();
        } catch (failure) {
            setPosts(previousPosts);
            setError(failure.message);
            toast({
                variant: 'destructive',
                title: t('Không thể dời lịch bài viết'),
                description: failure.message,
            });
        } finally {
            setMoving(false);
        }
    };

    const filteredAngles = useMemo(
        () => angles.filter((a) => filters.pillar_id === 'all' || a.pillar_id === filters.pillar_id),
        [angles, filters.pillar_id]
    );

    const hasActiveFilters =
        filters.account_id !== 'all' || filters.pillar_id !== 'all' || filters.angle_id !== 'all';

    return (
        <div className="w-full space-y-5">
            {/* Đầu trang Clean Studio */}
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-dark bg-brand text-brand-ink">
                        <CalendarDots size={20} weight="duotone" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="truncate font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                {t('Lịch nội dung')}
                            </h1>
                            <span className="inline-flex shrink-0 items-center rounded-full border border-brand-dark/30 bg-brand-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand-ink">
                                {posts.length} {t('bài trong kỳ')}
                            </span>
                            <span className="hidden rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-muted-foreground sm:inline-flex">
                                {timezone}
                            </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {t('Theo dõi lịch xuất bản đa kênh, kéo thả trực tiếp vào ngày mới để đổi lịch.')}
                        </p>
                    </div>
                </div>

                <Link
                    to="/create"
                    className="btn-skew min-h-9 shrink-0 self-start whitespace-nowrap sm:self-center"
                >
                    <Plus size={15} weight="bold" />
                    <span>{t('Tạo bài viết')}</span>
                </Link>
            </header>

            {/* Thanh điều khiển Lịch & Bộ lọc hợp nhất */}
            <section className="panel space-y-3 p-3.5 sm:p-4">
                {/* Hàng 1: Điều hướng thời gian + Chuyển chế độ xem */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center rounded-xl border border-border bg-zinc-50 p-0.5">
                            <button
                                type="button"
                                aria-label={t('Kỳ trước')}
                                onClick={() => shift(-1)}
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-foreground hover:bg-card"
                            >
                                <CaretLeft size={14} weight="bold" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setAnchor(todayInZone(timezone))}
                                className="min-h-8 cursor-pointer rounded-lg px-3 text-xs font-semibold text-foreground hover:bg-card"
                            >
                                {t('Hôm nay')}
                            </button>
                            <button
                                type="button"
                                aria-label={t('Kỳ sau')}
                                onClick={() => shift(1)}
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-foreground hover:bg-card"
                            >
                                <CaretRight size={14} weight="bold" />
                            </button>
                        </div>

                        <h2 className="font-heading text-base font-semibold capitalize text-foreground">
                            {label}
                        </h2>
                    </div>

                    {/* View Switcher (Brand Yellow Active) */}
                    <div className="grid grid-cols-2 gap-1 self-stretch rounded-xl border border-border bg-zinc-100 p-0.5 sm:flex sm:items-center sm:self-auto">
                        {VIEW_OPTIONS.map((v) => {
                            const Icon = v.icon;
                            const isActive = view === v.id;
                            return (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => setView(v.id)}
                                    className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition-colors ${
                                        isActive
                                            ? 'bg-brand font-semibold text-brand-ink'
                                            : 'text-zinc-600 hover:text-foreground'
                                    }`}
                                >
                                    <Icon size={14} weight={isActive ? 'bold' : 'regular'} />
                                    <span>{t(v.label)}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Hàng 2: Bộ lọc nhanh + Chú thích trạng thái */}
                <div className="flex flex-col gap-3 border-t border-border pt-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3 lg:max-w-2xl">
                        <select
                            aria-label={t('Lọc theo kênh')}
                            value={filters.account_id}
                            onChange={(e) => setFilters((prev) => ({ ...prev, account_id: e.target.value }))}
                            className="h-9 w-full cursor-pointer rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:border-brand-dark focus:outline-none"
                        >
                            <option value="all">{t('Tất cả kênh')}</option>
                            {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name}
                                </option>
                            ))}
                        </select>

                        <select
                            aria-label={t('Lọc theo trụ cột')}
                            value={filters.pillar_id}
                            onChange={(e) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    pillar_id: e.target.value,
                                    angle_id: 'all',
                                }))
                            }
                            className="h-9 w-full cursor-pointer rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:border-brand-dark focus:outline-none"
                        >
                            <option value="all">{t('Tất cả trụ cột')}</option>
                            {pillars.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>

                        <select
                            aria-label={t('Lọc theo góc khai thác')}
                            value={filters.angle_id}
                            onChange={(e) => setFilters((prev) => ({ ...prev, angle_id: e.target.value }))}
                            className="h-9 w-full cursor-pointer rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:border-brand-dark focus:outline-none"
                        >
                            <option value="all">{t('Tất cả góc nội dung')}</option>
                            {filteredAngles.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={() => setFilters({ account_id: 'all', pillar_id: 'all', angle_id: 'all' })}
                                className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground hover:bg-zinc-100"
                            >
                                <ArrowCounterClockwise size={13} />
                                <span>{t('Đặt lại')}</span>
                            </button>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span>{t('Đã đăng')}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-brand-dark" />
                            <span>{t('Đã lên lịch')}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-zinc-400" />
                            <span>{t('Bản nháp')}</span>
                        </span>
                    </div>
                </div>
            </section>

            {/* Khu vực Lịch chính */}
            {error ? (
                <LoadError message={error} onRetry={load} />
            ) : loading ? (
                <Skeleton className="h-[520px] rounded-2xl" />
            ) : !posts.length ? (
                <EmptyState
                    icon={CalendarDots}
                    title={t('Chưa có bài viết nào trong khoảng thời gian này')}
                    description={t('Chuyển sang tháng/tuần khác, xóa bộ lọc hoặc tạo bài viết mới để lên lịch.')}
                >
                    <Link to="/create" className="btn-skew min-h-9 whitespace-nowrap">
                        <Plus size={15} weight="bold" />
                        <span>{t('Tạo bài viết')}</span>
                    </Link>
                </EmptyState>
            ) : view === 'month' ? (
                <CleanMonthView
                    onMove={movePlan}
                    days={dayList}
                    postsByDay={postsByDay}
                    accounts={accounts}
                    mediaMap={mediaMap}
                    timezone={timezone}
                    onSelect={setOpenPost}
                />
            ) : view === 'channel' ? (
                <ChannelTimelineView
                    days={dayList}
                    postsByDay={postsByDay}
                    accounts={accounts}
                    mediaMap={mediaMap}
                    timezone={timezone}
                    onSelect={setOpenPost}
                    onMove={movePlan}
                />
            ) : view === 'week' ? (
                <WeekView
                    onMove={movePlan}
                    days={dayList}
                    postsByDay={postsByDay}
                    brands={brands}
                    pillars={pillars}
                    accounts={accounts}
                    mediaMap={mediaMap}
                    timezone={timezone}
                    onSelect={setOpenPost}
                />
            ) : (
                <ListView
                    displayTimezone={desktop ? timezone : undefined}
                    posts={posts}
                    brands={brands}
                    pillars={pillars}
                    angles={angles}
                    accounts={accounts}
                    mediaMap={mediaMap}
                    timezone={timezone}
                    onSelect={setOpenPost}
                />
            )}

            {/* Thanh trạng thái đáy */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                    {t(selectedBrandId === 'all' ? 'Hiển thị tất cả thương hiệu' : 'Đang lọc theo thương hiệu')} ·{' '}
                    <strong className="text-foreground">{posts.length}</strong> {t('bài viết')}
                </span>
                <span role="status">
                    {moving
                        ? t('Đang lưu thay đổi ngày bài viết…')
                        : t('Mẹo: Kéo thả thẻ bài viết sang ô ngày khác để dời lịch nhanh.')}
                </span>
            </div>

            {openPost && (
                <PostDetailSheet key={openPost.id} post={openPost} onClose={() => setOpenPost(null)} onChanged={load} />
            )}
        </div>
    );
}
