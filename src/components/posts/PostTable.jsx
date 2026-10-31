import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import PlatformBadge from '../common/PlatformBadge';
import StatusBadge from '../common/StatusBadge';
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



export default function PostTable({
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

    const allSelected = posts.length > 0 && posts.every((p) => selected.includes(p.id));

    return (
        <div className="panel overflow-hidden border border-border rounded-2xl bg-card shadow-2xs">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        <tr>
                            {onSelect && (
                                <th className="py-3 px-4 w-10">
                                    <input
                                        aria-label={t('Select all posts')}
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={(e) =>
                                            onSelect(e.target.checked ? posts.map((p) => p.id) : [])
                                        }
                                        className="h-4 w-4 rounded-sm border-border bg-white text-primary shadow-xs cursor-pointer accent-[#ffd631]"
                                    />
                                </th>
                            )}
                            <th className="py-3 px-4 min-w-[280px]">{t('Post')}</th>
                            <th className="py-3 px-4 min-w-[140px]">{t('Brand')} &amp; {t('Strategy')}</th>
                            <th className="py-3 px-4 min-w-[180px]">{t('Destinations')}</th>
                            <th className="py-3 px-4 min-w-[140px]">{t('Schedule')}</th>
                            <th className="py-3 px-4 min-w-[110px]">{t('Status')}</th>
                            <th className="py-3 px-4 min-w-[100px] text-right">{t('Actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                        {posts.map((post) => {
                            const brand = getBrand(post.brand_id);
                            const pillar = getPillar(post.pillar_id);
                            const angle = getAngle(post.angle_id);
                            const postAccounts = (post.account_ids || []).map(getAccount).filter(Boolean);
                            const isSelected = selected.includes(post.id);

                            // Media preview
                            const firstMediaId = post.media_ids?.[0];
                            const firstMedia = firstMediaId ? mediaMap[firstMediaId] : null;
                            const mediaCount = (post.media_ids || []).length;
                            const isVideo = firstMedia?.file_type === 'video';


                            return (
                                <tr
                                    key={post.id}
                                    className={`hover:bg-muted/30 transition-colors group ${isSelected ? 'bg-brand/5' : ''
                                        }`}
                                >
                                    {/* Selection checkbox */}
                                    {onSelect && (
                                        <td className="py-3.5 px-4 w-10 align-middle">
                                            <input
                                                aria-label={t('Select {title}', { title: post.title })}
                                                type="checkbox"
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
                                        </td>
                                    )}

                                    {/* Post info: Thumbnail + Title + Caption */}
                                    <td className="py-3.5 px-4 align-middle">
                                        <div className="flex items-center gap-3">
                                            {/* Media Thumbnail */}
                                            <div
                                                className="relative h-12 w-12 rounded-xl border border-border/80 overflow-hidden bg-muted/60 shrink-0 flex items-center justify-center cursor-pointer group-hover:border-border transition-colors"
                                                onClick={() => onOpen(post)}
                                            >
                                                {firstMedia ? (
                                                    isVideo ? (
                                                        <div className="relative w-full h-full">
                                                            <video
                                                                src={firstMedia.file_url}
                                                                className="w-full h-full object-cover"
                                                                preload="metadata"
                                                            />
                                                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                                                                <Play size={14} weight="fill" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={firstMedia.file_url}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )
                                                ) : (
                                                    <NotePencil
                                                        size={18}
                                                        weight="duotone"
                                                        className="text-muted-foreground"
                                                    />
                                                )}

                                                {mediaCount > 1 && (
                                                    <span className="absolute bottom-0.5 right-0.5 flex items-center gap-0.5 rounded-xs bg-black/60 px-1 py-0.2 text-[9px] font-bold text-white">
                                                        <Images size={9} weight="bold" />
                                                        {mediaCount}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Title & Caption */}
                                            <div className="min-w-0 max-w-sm">
                                                <button
                                                    type="button"
                                                    onClick={() => onOpen(post)}
                                                    className="font-heading font-semibold text-[13px] text-foreground hover:text-brand-dark transition-colors line-clamp-1 text-left block cursor-pointer"
                                                >
                                                    {post.title || t('Untitled')}
                                                </button>
                                                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                                    {post.caption || t('No caption')}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Brand & Strategy */}
                                    <td className="py-3.5 px-4 align-middle">
                                        <div className="flex items-center gap-1.5">
                                            {brand && (
                                                <span
                                                    className="h-2 w-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: brand.color || '#9ca3af' }}
                                                />
                                            )}
                                            <span className="text-[12px] font-medium text-foreground truncate max-w-[120px]">
                                                {brand?.name || '—'}
                                            </span>
                                        </div>
                                        {pillar && (
                                            <p className="text-[11px] text-muted-foreground truncate max-w-[130px] mt-0.5">
                                                {pillar.name}
                                                {angle?.name ? ` · ${angle.name}` : ''}
                                            </p>
                                        )}
                                    </td>

                                    {/* Destinations */}
                                    <td className="py-3.5 px-4 align-middle">
                                        {postAccounts.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                                                {postAccounts.map((acc) => (
                                                    <PlatformBadge
                                                        key={acc.id}
                                                        platform={acc.platform}
                                                        name={acc.name}
                                                        size="sm"
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-[11px]">—</span>
                                        )}
                                    </td>

                                    {/* Schedule */}
                                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                                        {post.scheduled_at ? (
                                            <div className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                                                <CalendarBlank
                                                    size={14}
                                                    className="text-muted-foreground shrink-0"
                                                />
                                                <span>
                                                    {formatDateTime(
                                                        post.scheduled_at,
                                                        displayTimezone || post.timezone || timezone
                                                    )}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-[11px]">—</span>
                                        )}
                                    </td>

                                    {/* Status */}
                                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                                        <StatusBadge status={post.status} />
                                    </td>

                                    {/* Quick Actions */}
                                    <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                                        <div className="inline-flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
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
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
