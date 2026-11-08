import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { PLATFORM_CONFIG } from '../common/PlatformBadge';
import StatusBadge from '../common/StatusBadge';
import { getAccountAvatarUrl } from '@/lib/account-avatar';
import * as HoverCard from '@radix-ui/react-hover-card';
import { Link } from 'react-router-dom';
import {
    CalendarBlank,
    Eye,
    PencilSimple,
    CopySimple,
    Play,
    Images,
    Globe,
    FileText,
    Quotes,
} from '@phosphor-icons/react';

// Format compact schedule date (e.g. "05/11 · 09:00") to avoid text truncation in 4-column cards
function formatCardSchedule(dateStr, timeZone) {
    if (!dateStr) return null;
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        const formatter = new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: timeZone || undefined,
        });
        const parts = formatter.formatToParts(d);
        const map = {};
        for (const p of parts) map[p.type] = p.value;
        return `${map.day}/${map.month} · ${map.hour}:${map.minute}`;
    } catch {
        return null;
    }
}

export default function PostGrid({
    posts,
    brands = [],
    pillars = [],
    angles = [],
    accounts = [],
    timezone = '',
    displayTimezone = '',
    selected = [],
    onSelect = null,
    onOpen,
    mediaMap = {},
}) {
    const { t } = useTranslation();

    const getBrand = (brandId) => brands.find((b) => b.id === brandId);
    const getPillar = (pillarId) => pillars.find((p) => p.id === pillarId);
    const getAngle = (angleId) => angles.find((a) => a.id === angleId);
    const getAccount = (accountId) => accounts.find((a) => a.id === accountId);

    const tz = displayTimezone || timezone;

    return (
        <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {posts.map((post) => {
                const brand = getBrand(post.brand_id);
                const pillar = getPillar(post.pillar_id);
                const angle = getAngle(post.angle_id);
                const postAccounts = (post.account_ids || []).map(getAccount).filter(Boolean);
                const isSelected = selected.includes(post.id);

                // Media resolution
                const firstMediaId = post.media_ids?.[0];
                const firstMedia = firstMediaId ? mediaMap[firstMediaId] : null;
                const mediaCount = (post.media_ids || []).length;
                const isVideo = firstMedia?.file_type === 'video';

                const compactSchedule = formatCardSchedule(post.scheduled_at, post.timezone || tz);
                const fullSchedule = post.scheduled_at ? formatDateTime(post.scheduled_at, post.timezone || tz) : null;

                return (
                    <article
                        key={post.id}
                        className={`group relative min-w-0 flex flex-col justify-between rounded-2xl border bg-card transition-colors duration-200 overflow-hidden h-full ${
                            isSelected
                                ? 'border-primary ring-2 ring-primary/20 bg-brand/5'
                                : 'border-border hover:border-border/80'
                        }`}
                    >
                        <div className="flex flex-col">
                            {/* 1. TOP 16:9 BANNER */}
                            <div className="relative w-full aspect-[16/9] bg-muted/40 overflow-hidden border-b border-border/50 shrink-0">
                                {firstMedia ? (
                                    isVideo ? (
                                        <div
                                            className="relative w-full h-full cursor-pointer bg-zinc-900"
                                            onClick={() => onOpen(post)}
                                        >
                                            <video
                                                src={firstMedia.file_url}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                preload="metadata"
                                            />
                                            <div className="absolute inset-0 bg-black/25 flex items-center justify-center text-white">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 backdrop-blur-xs shadow-md group-hover:scale-110 transition-transform">
                                                    <Play size={16} weight="fill" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="w-full h-full cursor-pointer bg-zinc-100"
                                            onClick={() => onOpen(post)}
                                        >
                                            <img
                                                src={firstMedia.file_url}
                                                alt={post.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>
                                    )
                                ) : (
                                    /* Typographic Text Canvas for text-only posts (no duplication in body) */
                                    <div
                                        className="relative w-full h-full p-4 pt-10 pb-3 bg-muted/40 border-border/40 flex flex-col justify-center cursor-pointer select-none"
                                        onClick={() => onOpen(post)}
                                    >
                                        <Quotes
                                            size={28}
                                            weight="duotone"
                                            className="absolute top-8 left-3.5 text-zinc-300 pointer-events-none opacity-40"
                                        />
                                        <p className="relative text-xs text-zinc-700 line-clamp-3 leading-relaxed font-body pl-3 border-l-2 border-brand/70">
                                            {post.caption || post.title || t('Chưa có nội dung văn bản...')}
                                        </p>
                                    </div>
                                )}

                                {/* Top Bar Overlay: Checkbox + Badges (Aligned across all cards) */}
                                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-10 pointer-events-none">
                                    <div className="flex items-center gap-1.5 pointer-events-auto">
                                        {onSelect && (
                                            <label
                                                className="h-6 w-6 rounded-lg bg-white/95 shadow-sm border border-zinc-200/80 flex items-center justify-center cursor-pointer hover:bg-white transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <input
                                                    type="checkbox"
                                                    aria-label={t('Select {title}', { title: post.title })}
                                                    checked={isSelected}
                                                    onChange={(e) =>
                                                        onSelect(
                                                            e.target.checked
                                                                ? [...selected, post.id]
                                                                : selected.filter((id) => id !== post.id)
                                                        )
                                                    }
                                                    className="h-3.5 w-3.5 rounded-sm border-border bg-white text-primary shadow-xs cursor-pointer accent-foreground"
                                                />
                                            </label>
                                        )}

                                        {firstMedia ? (
                                            isVideo ? (
                                                <span className="px-1.5 py-0.5 rounded-md bg-black/65 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                                                    <Play size={10} weight="fill" />
                                                    <span>Video</span>
                                                </span>
                                            ) : mediaCount > 1 ? (
                                                <span className="px-1.5 py-0.5 rounded-md bg-black/65 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                                                    <Images size={10} weight="bold" />
                                                    <span>{mediaCount}</span>
                                                </span>
                                            ) : null
                                        ) : (
                                            <span className="px-1.5 py-0.5 rounded-md bg-white/95 backdrop-blur-md text-zinc-600 text-[10px] font-semibold border border-zinc-200/80 shadow-2xs flex items-center gap-1">
                                                <FileText size={11} weight="bold" />
                                                <span>{t('Văn bản')}</span>
                                            </span>
                                        )}
                                    </div>

                                    <div className="pointer-events-auto shadow-sm rounded-full overflow-hidden shrink-0">
                                        <StatusBadge status={post.status} />
                                    </div>
                                </div>

                                {/* Hover Quick Actions Bar */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-3 gap-1.5 pointer-events-none group-hover:pointer-events-auto">
                                    <button
                                        type="button"
                                        onClick={() => onOpen(post)}
                                        className="h-7 px-2.5 rounded-lg bg-white/95 backdrop-blur-md text-zinc-900 text-[11px] font-bold hover:bg-white shadow-md flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                                    >
                                        <Eye size={13} weight="bold" />
                                        <span>{t('Xem')}</span>
                                    </button>
                                    <Link
                                        to={`/create?edit=${post.id}`}
                                        className="h-7 px-2.5 rounded-lg bg-white/95 backdrop-blur-md text-zinc-900 text-[11px] font-bold hover:bg-white shadow-md flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                                    >
                                        <PencilSimple size={13} weight="bold" />
                                        <span>{t('Sửa')}</span>
                                    </Link>
                                    <Link
                                        to={`/create?duplicate=${post.id}`}
                                        className="h-7 w-7 rounded-lg bg-white/95 backdrop-blur-md text-zinc-900 hover:bg-white shadow-md flex items-center justify-center cursor-pointer transition-transform active:scale-95"
                                        title={t('Nhân bản')}
                                    >
                                        <CopySimple size={13} weight="bold" />
                                    </Link>
                                </div>
                            </div>

                            {/* 2. BODY INFO */}
                            <div className="p-3.5 space-y-2">
                                {/* Brand & Content Pillar Tag */}
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                                    {brand && (
                                        <span
                                            className="h-2 w-2 rounded-full shrink-0"
                                            style={{ backgroundColor: brand.color || '#9ca3af' }}
                                        />
                                    )}
                                    <span className="font-semibold text-foreground truncate max-w-[100px]">
                                        {brand?.name || '—'}
                                    </span>
                                    {pillar && (
                                        <>
                                            <span className="text-muted-foreground/50">·</span>
                                            <span className="px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-medium truncate max-w-[120px]">
                                                {pillar.name}
                                                {angle?.name ? ` / ${angle.name}` : ''}
                                            </span>
                                        </>
                                    )}
                                </div>

                                {/* Post Title */}
                                <h3
                                    onClick={() => onOpen(post)}
                                    className="font-heading font-bold text-[13px] text-foreground hover:text-brand-dark transition-colors break-words line-clamp-2 cursor-pointer leading-snug"
                                    title={post.title || t('Untitled')}
                                >
                                    {post.title || t('Untitled')}
                                </h3>

                                {/* Post Caption (ONLY rendered here if the card has media; for text posts, caption is already in the canvas above!) */}
                                {firstMedia ? (
                                    <p
                                        onClick={() => onOpen(post)}
                                        className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed cursor-pointer"
                                    >
                                        {post.caption || (
                                            <span className="italic text-muted-foreground/50">{t('Chưa có nội dung văn bản')}</span>
                                        )}
                                    </p>
                                ) : (
                                    /* Clean subtle subtitle or angle label for text post, avoiding duplicate caption text */
                                    <p className="text-[11px] text-muted-foreground/70 line-clamp-1">
                                        {angle?.name ? `Góc khai thác: ${angle.name}` : brand?.name ? `Kênh thuộc ${brand.name}` : t('Bài viết văn bản')}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 3. CARD FOOTER: Stacked Avatars + Compact Schedule Date */}
                        <div className="px-3.5 py-2.5 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-2 mt-auto">
                            {/* Stacked Avatars with Radix White Tooltip */}
                            {postAccounts.length > 0 ? (
                                <HoverCard.Root openDelay={80} closeDelay={150}>
                                    <HoverCard.Trigger asChild>
                                        <div className="inline-flex items-center -space-x-2 cursor-pointer py-0.5 shrink-0">
                                            {postAccounts.slice(0, 2).map((acc) => {
                                                const cfg = PLATFORM_CONFIG[acc.platform] || {
                                                    icon: Globe,
                                                    color: 'text-zinc-600',
                                                    bg: 'bg-zinc-100',
                                                    border: 'border-zinc-200',
                                                };
                                                const Icon = cfg.icon;
                                                const avatarUrl = getAccountAvatarUrl(acc);

                                                return (
                                                    <div
                                                        key={acc.id}
                                                        className="relative h-7 w-7 rounded-full ring-2 ring-white shadow-2xs shrink-0 transition-transform hover:-translate-y-0.5 hover:scale-110 hover:z-20 bg-zinc-100"
                                                        style={{ width: '28px', height: '28px' }}
                                                    >
                                                        <div className="h-full w-full rounded-full overflow-hidden flex items-center justify-center">
                                                            {avatarUrl ? (
                                                                <img
                                                                    src={avatarUrl}
                                                                    alt={acc.name}
                                                                    className="h-full w-full object-cover block rounded-full"
                                                                    style={{ width: '100%', height: '100%' }}
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <span
                                                                className={`h-full w-full flex items-center justify-center font-bold text-[10px] text-zinc-700 ${cfg.bg}`}
                                                                style={{ display: avatarUrl ? 'none' : 'flex' }}
                                                            >
                                                                {acc.name
                                                                    ? acc.name.slice(0, 2).toUpperCase()
                                                                    : <Icon size={12} weight="fill" className={cfg.color} />}
                                                            </span>
                                                        </div>
                                                        {/* Platform corner badge */}
                                                        <span
                                                            className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-2xs flex items-center justify-center ring-1 ring-white"
                                                            style={{ width: '14px', height: '14px' }}
                                                        >
                                                            <Icon size={9} weight="fill" className={cfg.color} />
                                                        </span>
                                                    </div>
                                                );
                                            })}

                                            {postAccounts.length > 2 && (
                                                <div
                                                    className="relative h-7 w-7 rounded-full ring-2 ring-white bg-zinc-100 text-zinc-700 font-bold text-[10px] flex items-center justify-center shadow-2xs shrink-0 hover:bg-zinc-200 transition-colors"
                                                    style={{ width: '28px', height: '28px' }}
                                                >
                                                    +{postAccounts.length - 2}
                                                </div>
                                            )}
                                        </div>
                                    </HoverCard.Trigger>

                                    {/* White Tooltip Portal */}
                                    <HoverCard.Portal>
                                        <HoverCard.Content
                                            side="top"
                                            align="start"
                                            sideOffset={8}
                                            className="z-50 flex flex-col gap-1.5 rounded-xl bg-white text-zinc-900 p-3 text-[11px] shadow-xl border border-zinc-200/80 min-w-[210px] max-w-[280px]"
                                        >
                                            <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
                                                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                                    {t('Kênh nhận bài')}
                                                </span>
                                                <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded-full">
                                                    {postAccounts.length}
                                                </span>
                                            </div>
                                            <div className="divide-y divide-zinc-100 max-h-56 overflow-y-auto scroll-slim">
                                                {postAccounts.map((acc) => {
                                                    const cfg = PLATFORM_CONFIG[acc.platform] || {
                                                        icon: Globe,
                                                        color: 'text-zinc-600',
                                                        bg: 'bg-zinc-100',
                                                    };
                                                    const Icon = cfg.icon;
                                                    const avUrl = getAccountAvatarUrl(acc);
                                                    return (
                                                        <div key={acc.id} className="py-1.5 flex items-center gap-2 truncate">
                                                            <div className="relative h-6 w-6 rounded-full overflow-hidden shrink-0 bg-zinc-100 ring-1 ring-zinc-200/80 flex items-center justify-center text-[10px] font-bold text-zinc-700">
                                                                {avUrl ? (
                                                                    <img
                                                                        src={avUrl}
                                                                        alt=""
                                                                        className="h-full w-full object-cover block"
                                                                        onError={(e) => {
                                                                            e.currentTarget.style.display = 'none';
                                                                        }}
                                                                    />
                                                                ) : null}
                                                                <Icon size={12} weight="fill" className={cfg.color} />
                                                            </div>
                                                            <span className="font-semibold text-zinc-800 truncate flex-1">
                                                                {acc.name}
                                                            </span>
                                                            <span className="text-[10px] text-zinc-400 font-medium shrink-0 flex items-center gap-1">
                                                                <Icon size={11} weight="fill" className={cfg.color} />
                                                                {cfg.label || acc.platform}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <HoverCard.Arrow className="fill-white" />
                                        </HoverCard.Content>
                                    </HoverCard.Portal>
                                </HoverCard.Root>
                            ) : (
                                <span className="text-muted-foreground text-[11px]">—</span>
                            )}

                            {/* Schedule Time (Compact, never truncated) */}
                            <div
                                className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium shrink-0 ml-auto"
                                title={fullSchedule || ''}
                            >
                                <CalendarBlank size={13} className="shrink-0 text-muted-foreground/70" />
                                <span>
                                    {compactSchedule ||
                                        (post.status === 'draft'
                                            ? t('Bản nháp')
                                            : post.status === 'published'
                                            ? t('Đã đăng')
                                            : '—')}
                                </span>
                            </div>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}