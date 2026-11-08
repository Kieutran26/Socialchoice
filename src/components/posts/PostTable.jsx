import { Button } from '@/components/ui/button';
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
    NotePencil,
    Images,
    Globe,
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
                                        className="h-4 w-4 rounded-sm border-border bg-white text-primary shadow-xs cursor-pointer accent-foreground"
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
                                                className="h-4 w-4 rounded-sm border-border bg-white text-primary shadow-xs cursor-pointer accent-foreground"
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

                                    {/* Destinations - Stacked Avatars with +N overflow */}
                                    <td className="py-3 px-4 align-middle">
                                        {postAccounts.length > 0 ? (
                                            <HoverCard.Root openDelay={80} closeDelay={150}>
                                                <HoverCard.Trigger asChild>
                                                    <div className="inline-flex items-center -space-x-2 cursor-pointer py-1">
                                                        {postAccounts.slice(0, 3).map((acc) => {
                                                            const cfg = PLATFORM_CONFIG[acc.platform] || { icon: Globe, color: 'text-zinc-600', bg: 'bg-zinc-100', border: 'border-zinc-200' };
                                                            const Icon = cfg.icon;
                                                            const avatarUrl = getAccountAvatarUrl(acc);

                                                            return (
                                                                <div
                                                                    key={acc.id}
                                                                    className="relative h-7 w-7 rounded-full ring-2 ring-white shadow-2xs shrink-0 transition-transform hover:-translate-y-0.5 hover:scale-110 hover:z-20 bg-zinc-100"
                                                                >
                                                                    <div className="h-full w-full rounded-full overflow-hidden flex items-center justify-center">
                                                                        {avatarUrl ? (
                                                                            <img
                                                                                src={avatarUrl}
                                                                                alt={acc.name}
                                                                                className="h-full w-full object-cover block"
                                                                                onError={(e) => {
                                                                                    e.currentTarget.style.display = 'none';
                                                                                }}
                                                                            />
                                                                        ) : null}
                                                                        <span
                                                                            className={`h-full w-full flex items-center justify-center font-bold text-[10px] text-zinc-700 ${cfg.bg}`}
                                                                            style={{ display: avatarUrl ? 'none' : 'flex' }}
                                                                        >
                                                                            {acc.name ? acc.name.slice(0, 2).toUpperCase() : <Icon size={12} weight="fill" className={cfg.color} />}
                                                                        </span>
                                                                    </div>
                                                                    {/* Platform corner badge */}
                                                                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-2xs flex items-center justify-center ring-1 ring-white">
                                                                        <Icon size={9} weight="fill" className={cfg.color} />
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}

                                                        {postAccounts.length > 3 && (
                                                            <div
                                                                className="relative h-7 w-7 rounded-full ring-2 ring-white bg-zinc-100 text-zinc-700 font-bold text-[10px] flex items-center justify-center shadow-2xs shrink-0 hover:bg-zinc-200 transition-colors"
                                                            >
                                                                +{postAccounts.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                </HoverCard.Trigger>

                                                {/* Hover Tooltip Portal — Renders above everything, immune to table overflow/clipping */}
                                                <HoverCard.Portal>
                                                    <HoverCard.Content
                                                        side="top"
                                                        align="center"
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
                                                                const cfg = PLATFORM_CONFIG[acc.platform] || { icon: Globe, color: 'text-zinc-600', bg: 'bg-zinc-100' };
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
                                                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                                />
                                                                            ) : null}
                                                                            <Icon size={12} weight="fill" className={cfg.color} />
                                                                        </div>
                                                                        <span className="font-semibold text-zinc-800 truncate flex-1">{acc.name}</span>
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
