import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import PlatformBadge from '../common/PlatformBadge';
import StatusBadge from '../common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
    CalendarBlank,
    Eye,
    PencilSimple,
    CopySimple,
    Play,
    Images,
    Stack,
    FileText,
} from '@phosphor-icons/react';

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


                return (
                    <article
                        key={post.id}
                        className={`group relative flex flex-col justify-between rounded-2xl border bg-card shadow-2xs hover:shadow-md transition-all overflow-hidden p-4 ${isSelected
                                ? 'border-brand-dark ring-2 ring-primary/20 bg-brand/5'
                                : 'border-border hover:border-border/80'
                            }`}
                    >
                        {/* 1. Header: Platform Badge + Brand Dot + Status Pill + Checkbox */}
                        <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/50">
                            <div className="flex items-center gap-2 min-w-0">
                                {onSelect && (
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
                                        className="h-4 w-4 rounded-sm border-border bg-white text-primary shadow-xs cursor-pointer accent-[#ffd631] shrink-0"
                                    />
                                )}

                                {/* Destination badges or Brand */}
                                {postAccounts.length > 0 ? (
                                    <div className="flex items-center gap-1 min-w-0">
                                        <PlatformBadge
                                            platform={postAccounts[0].platform}
                                            name={postAccounts[0].name}
                                            size="sm"
                                        />
                                        {postAccounts.length > 1 && (
                                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded-md px-1 py-0.5 shrink-0">
                                                +{postAccounts.length - 1}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                                        <FileText size={14} className="shrink-0" />
                                        <span>{t('Post')}</span>
                                    </div>
                                )}

                                {brand && (
                                    <div
                                        className="flex items-center gap-1 text-[11px] text-muted-foreground truncate"
                                        title={brand.name}
                                    >
                                        <span
                                            className="h-1.5 w-1.5 rounded-full shrink-0"
                                            style={{ backgroundColor: brand.color || '#9ca3af' }}
                                        />
                                        <span className="truncate max-w-[80px] font-medium">{brand.name}</span>
                                    </div>
                                )}
                            </div>

                            {/* Status badge */}
                            <StatusBadge status={post.status} />
                        </div>

                        {/* 2. Main Content */}
                        <div className="py-3 flex-1 flex flex-col gap-2.5">
                            {/* Post Title */}
                            <button
                                type="button"
                                onClick={() => onOpen(post)}
                                className="font-heading font-semibold text-[14px] text-foreground hover:text-brand-dark transition-colors line-clamp-1 text-left cursor-pointer"
                            >
                                {post.title || t('Untitled')}
                            </button>

                            {/* Media Preview (if any) */}
                            {firstMedia && (
                                <div
                                    className="relative h-36 w-full rounded-xl overflow-hidden border border-border/80 bg-muted/60 cursor-pointer group-hover:border-border transition-colors shrink-0"
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
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 backdrop-blur-xs shadow-md group-hover:scale-110 transition-transform">
                                                    <Play size={16} weight="fill" />
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

                                    {mediaCount > 1 && (
                                        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                                            <Images size={12} weight="bold" />
                                            <span>{mediaCount}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Post Caption (Single, clean text box) */}
                            <div
                                onClick={() => onOpen(post)}
                                className="rounded-xl border border-border/50 bg-muted/30 p-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                            >
                                <p className="text-[12px] text-foreground/85 line-clamp-3 leading-relaxed">
                                    {post.caption || (
                                        <span className="italic text-muted-foreground/60">{t('No caption text')}</span>
                                    )}
                                </p>
                            </div>

                            {/* Pillar & Angle Strategy Tag (if assigned) */}
                            {pillar && (
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-auto">
                                    <Stack size={13} weight="duotone" className="shrink-0 text-muted-foreground" />
                                    <span className="truncate">
                                        {pillar.name}
                                        {angle?.name ? ` · ${angle.name}` : ''}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 3. Card Footer */}
                        <div className="pt-2.5 border-t border-border/50 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium truncate">
                                <CalendarBlank size={14} className="shrink-0" />
                                <span className="truncate">
                                    {post.scheduled_at
                                        ? formatDateTime(
                                            post.scheduled_at,
                                            displayTimezone || post.timezone || timezone
                                        )
                                        : post.status === 'draft'
                                            ? t('Draft')
                                            : '—'}
                                </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
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
