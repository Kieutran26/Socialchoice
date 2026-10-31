import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { POST_STATUS_LABEL } from '@/lib/constants';
import PlatformBadge from '../common/PlatformBadge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
    CalendarBlank,
    Eye,
    PencilSimple,
    CopySimple,
    Play,
    NotePencil,
    Images,
} from '@phosphor-icons/react';

const STATUS_CONFIG = {
    published: {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dot: 'bg-emerald-500',
    },
    scheduled: {
        bg: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dot: 'bg-amber-500 animate-pulse',
    },
    draft: {
        bg: 'bg-zinc-100 text-zinc-700 border-zinc-200/80',
        dot: 'bg-zinc-400',
    },
    processing: {
        bg: 'bg-sky-50 text-sky-700 border-sky-200/80',
        dot: 'bg-sky-500 animate-spin',
    },
    failed: {
        bg: 'bg-rose-50 text-rose-700 border-rose-200/80',
        dot: 'bg-rose-500',
    },
    cancelled: {
        bg: 'bg-zinc-100 text-zinc-600 border-zinc-200/80',
        dot: 'bg-zinc-400',
    },
};

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

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

                const statusStyle = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;

                return (
                    <article
                        key={post.id}
                        className={`group relative flex flex-col justify-between rounded-2xl border bg-card shadow-2xs hover:shadow-md transition-all overflow-hidden ${
                            isSelected ? 'border-brand-dark ring-2 ring-primary/20' : 'border-border'
                        }`}
                    >
                        {/* Top Media / Header */}
                        <div className="relative">
                            {firstMedia ? (
                                <div
                                    className="relative h-44 w-full bg-muted/60 overflow-hidden cursor-pointer"
                                    onClick={() => onOpen(post)}
                                >
                                    {isVideo ? (
                                        <div className="relative w-full h-full">
                                            <video
                                                src={firstMedia.file_url}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                preload="metadata"
                                            />
                                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-xs shadow-md group-hover:scale-110 transition-transform">
                                                    <Play size={18} weight="fill" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <img
                                            src={firstMedia.file_url}
                                            alt={post.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    )}

                                    {/* Multiple media indicator */}
                                    {mediaCount > 1 && (
                                        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs">
                                            <Images size={13} weight="bold" />
                                            <span>{mediaCount}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    className="relative h-28 w-full bg-linear-to-br from-muted/60 to-muted/20 p-4 border-b border-border/50 cursor-pointer flex flex-col justify-between"
                                    onClick={() => onOpen(post)}
                                >
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                                        <NotePencil size={15} weight="duotone" />
                                        <span>{t('Text post')}</span>
                                    </div>
                                    <p className="line-clamp-2 text-xs italic text-muted-foreground/80">
                                        "{post.caption || t('No caption')}"
                                    </p>
                                </div>
                            )}

                            {/* Floating Selection Checkbox */}
                            {onSelect && (
                                <div className="absolute top-2.5 left-2.5 z-10">
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
                                        className="h-4 w-4 rounded-sm border-border bg-white text-primary shadow-xs cursor-pointer accent-[#ffd631]"
                                    />
                                </div>
                            )}

                            {/* Floating Status Badge */}
                            <div className="absolute top-2.5 right-2.5 z-10">
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border shadow-2xs backdrop-blur-md ${statusStyle.bg}`}
                                >
                                    <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                                    {POST_STATUS_LABEL[post.status] || post.status}
                                </span>
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 flex-1 flex flex-col">
                            {/* Destinations */}
                            {postAccounts.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {postAccounts.map((acc) => (
                                        <PlatformBadge
                                            key={acc.id}
                                            platform={acc.platform}
                                            name={acc.name}
                                            size="sm"
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Title */}
                            <button
                                type="button"
                                onClick={() => onOpen(post)}
                                className="font-heading font-semibold text-[14px] text-foreground hover:text-brand-dark transition-colors line-clamp-1 text-left cursor-pointer"
                            >
                                {post.title || t('Untitled')}
                            </button>

                            {/* Caption Snippet */}
                            <p className="text-[12px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                                {post.caption || t('No caption')}
                            </p>

                            {/* Brand & Strategy Meta */}
                            <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    {brand && (
                                        <span
                                            className="h-2 w-2 rounded-full shrink-0"
                                            style={{ backgroundColor: brand.color || '#9ca3af' }}
                                        />
                                    )}
                                    <span className="truncate font-medium text-foreground">
                                        {brand?.name || '—'}
                                    </span>
                                </div>

                                {pillar && (
                                    <span className="truncate rounded-md bg-muted/60 px-1.5 py-0.5 font-medium">
                                        {pillar.name}
                                        {angle?.name ? ` · ${angle.name}` : ''}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Card Footer */}
                        <div className="px-4 py-2.5 bg-muted/30 border-t border-border/50 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                                <CalendarBlank size={14} className="shrink-0" />
                                <span>
                                    {post.scheduled_at
                                        ? formatDateTime(
                                              post.scheduled_at,
                                              displayTimezone || post.timezone || timezone
                                          )
                                        : '—'}
                                </span>
                            </div>

                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                                    onClick={() => onOpen(post)}
                                    title={t('View details')}
                                >
                                    <Eye size={15} />
                                </Button>
                                <Button
                                    asChild
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                                    title={t('Edit post')}
                                >
                                    <Link to={`/create?edit=${post.id}`}>
                                        <PencilSimple size={15} />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                                    title={t('Duplicate as draft')}
                                >
                                    <Link to={`/create?duplicate=${post.id}`}>
                                        <CopySimple size={15} />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
