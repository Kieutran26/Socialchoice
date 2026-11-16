import { useMemo } from 'react';
import {
    Heart,
    ChatCircle,
    PaperPlaneTilt,
    BookmarkSimple,
    ShareFat,
    ThumbsUp,
    Repeat,
    ShareNetwork,
    MusicNotes,
    Globe,
    DotsThree,
    ImageSquare,
    SealCheck,
    ChatDots,
    UserPlus,
    ShoppingBag,
} from '@phosphor-icons/react';
import PlatformLogo from './PlatformLogo';
import { useTranslation } from '@/lib/i18n';
import { getAccountAvatarUrl } from '@/lib/account-avatar';

export default function SocialMockupPreview({
    account,
    text = '',
    media = [],
    when = 'Vừa xong',
    tiktokProduct = null,
}) {
    const { t } = useTranslation();

    const platform = account?.platform || 'facebook';
    const handle = account?.handle || account?.name || 'Socialchoice';
    const firstMedia = media[0];
    const mediaCount = media.length;

    const renderMedia = (ratio = 'aspect-[16/10]') => (
        <div className={`relative ${ratio} overflow-hidden bg-muted/40 border-y border-border/40`}>
            {firstMedia ? (
                <img
                    src={firstMedia.file_url || firstMedia.url || firstMedia.src}
                    alt={firstMedia.name || 'Post attachment'}
                    className="size-full object-cover"
                />
            ) : (
                <div className="grid size-full place-items-center text-muted-foreground/40">
                    <ImageSquare size={36} weight="duotone" />
                </div>
            )}
            {mediaCount > 1 && (
                <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                    1/{mediaCount}
                </span>
            )}
        </div>
    );

    const renderText = (clamp = '') =>
        text.trim() ? (
            <p className={`whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground ${clamp}`}>
                {text}
            </p>
        ) : (
            <div className="space-y-1.5 py-1">
                <div className="h-2 w-11/12 rounded-full bg-muted/70" />
                <div className="h-2 w-4/5 rounded-full bg-muted/70" />
                <div className="h-2 w-3/5 rounded-full bg-muted/70" />
            </div>
        );

    // Empty state when nothing is written and no media
    if (!text.trim() && !mediaCount) {
        return (
            <div className="grid min-h-[340px] place-items-center text-center p-6 rounded-2xl border border-dashed border-border/80 bg-muted/10">
                <div>
                    <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted/70 text-muted-foreground mb-3">
                        <ImageSquare size={24} weight="duotone" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                        {t('Bắt đầu viết để xem trước')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {t('Mô phỏng giao diện chân thực từng nền tảng')}
                    </p>
                </div>
            </div>
        );
    }

    // TikTok Mockup (Vertical 9:16)
    if (platform === 'tiktok') {
        return (
            <div className="relative mx-auto aspect-[9/16] max-h-[460px] w-full max-w-[280px] overflow-hidden rounded-2xl bg-zinc-950 text-white shadow-lg ring-1 ring-zinc-800">
                {firstMedia ? (
                    <img
                        src={firstMedia.file_url || firstMedia.url || firstMedia.src}
                        alt=""
                        className="absolute inset-0 size-full object-cover opacity-90"
                    />
                ) : (
                    <div className="absolute inset-0 grid place-items-center bg-zinc-900 text-zinc-600">
                        <ImageSquare size={40} />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                {/* Right Floating Actions */}
                <div className="absolute bottom-16 right-2 flex flex-col items-center gap-4 text-white z-10">
                    <div className="flex flex-col items-center gap-1">
                        <div className="grid size-9 place-items-center rounded-full bg-white/15 backdrop-blur-xs">
                            <Heart size={20} weight="fill" className="text-rose-500" />
                        </div>
                        <span className="text-[10px] font-medium">12.4K</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <div className="grid size-9 place-items-center rounded-full bg-white/15 backdrop-blur-xs">
                            <ChatCircle size={20} weight="fill" />
                        </div>
                        <span className="text-[10px] font-medium">348</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <div className="grid size-9 place-items-center rounded-full bg-white/15 backdrop-blur-xs">
                            <BookmarkSimple size={20} weight="fill" />
                        </div>
                        <span className="text-[10px] font-medium">512</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <div className="grid size-9 place-items-center rounded-full bg-white/15 backdrop-blur-xs">
                            <ShareFat size={20} weight="fill" />
                        </div>
                        <span className="text-[10px] font-medium">Share</span>
                    </div>
                </div>

                {/* Bottom Caption, TikTok Shop Yellow Cart & Audio */}
                <div className="absolute inset-x-0 bottom-0 p-3.5 pr-14 text-white z-10">
                    {/* TikTok Shop Product Anchor (Giỏ hàng vàng) */}
                    {tiktokProduct && (
                        <div className="mb-2 flex items-center gap-2 rounded-xl bg-amber-400 text-zinc-950 px-2.5 py-1.5 shadow-md border border-amber-300">
                            <div className="flex size-5 items-center justify-center rounded-md bg-amber-500 text-zinc-950 shrink-0">
                                <ShoppingBag size={13} weight="fill" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-[11px] font-bold leading-tight flex items-center gap-1">
                                    <span className="truncate">{tiktokProduct.name}</span>
                                </div>
                                <div className="text-[10px] font-semibold text-zinc-800 flex items-center gap-1">
                                    <span>₫{Number(tiktokProduct.sale_price || tiktokProduct.original_price).toLocaleString('vi-VN')}</span>
                                    {tiktokProduct.is_flash_sale && (
                                        <span className="text-[8.5px] bg-red-600 text-white px-1 py-0.2 rounded font-bold">
                                            Flash Sale
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span className="shrink-0 rounded-full bg-zinc-950 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                                Mua ngay
                            </span>
                        </div>
                    )}

                    <div className="text-[13px] font-bold">@{handle}</div>
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[12px] leading-snug text-white/90">
                        {text || t('Chú thích video sẽ hiển thị tại đây.')}
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-white/80">
                        <MusicNotes size={13} className="shrink-0 animate-spin" />
                        <span className="truncate">Âm thanh gốc · {handle}</span>
                    </div>
                </div>
            </div>
        );
    }

    // Threads or X (Twitter) Mockup
    if (platform === 'threads' || platform === 'x') {
        const isX = platform === 'x';
        const avatarUrl = getAccountAvatarUrl(account);
        return (
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
                <div className="flex gap-3">
                    <div className="size-9 shrink-0 rounded-full overflow-hidden border border-border/60 bg-muted">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={handle}
                                className="size-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        ) : (
                            <div className="grid size-full place-items-center font-heading text-xs font-bold text-foreground">
                                {handle[0]?.toUpperCase() || 'S'}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 text-[13px]">
                            <span className="truncate font-semibold text-foreground">{handle}</span>
                            {isX && <span className="truncate text-muted-foreground text-xs">@{handle.toLowerCase()}</span>}
                            <span className="text-muted-foreground text-xs">· {when === 'Vừa xong' ? '1 phút' : when}</span>
                        </div>
                        <div className="mt-1">{renderText()}</div>
                        {mediaCount > 0 && <div className="mt-2.5 overflow-hidden rounded-xl">{renderMedia('aspect-[16/10]')}</div>}
                        <div className="mt-3.5 flex items-center justify-between text-muted-foreground max-w-[280px]">
                            {isX ? (
                                <>
                                    <ChatCircle size={16} className="hover:text-foreground cursor-pointer transition-colors" />
                                    <Repeat size={16} className="hover:text-foreground cursor-pointer transition-colors" />
                                    <Heart size={16} className="hover:text-rose-500 cursor-pointer transition-colors" />
                                    <ShareNetwork size={16} className="hover:text-foreground cursor-pointer transition-colors" />
                                </>
                            ) : (
                                <>
                                    <Heart size={16} className="hover:text-rose-500 cursor-pointer transition-colors" />
                                    <ChatCircle size={16} className="hover:text-foreground cursor-pointer transition-colors" />
                                    <Repeat size={16} className="hover:text-foreground cursor-pointer transition-colors" />
                                    <PaperPlaneTilt size={16} className="hover:text-foreground cursor-pointer transition-colors" />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Instagram Mockup
    if (platform === 'instagram') {
        const avatarUrl = getAccountAvatarUrl(account);
        return (
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
                {/* Header */}
                <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px]">
                            <div className="size-full rounded-full overflow-hidden bg-card">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={handle}
                                        className="size-full object-cover"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="grid size-full place-items-center text-[11px] font-bold text-foreground">
                                        {handle[0]?.toUpperCase() || 'S'}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="font-semibold text-xs text-foreground truncate max-w-[180px]">{handle}</div>
                    </div>
                    <DotsThree size={20} className="text-muted-foreground cursor-pointer" />
                </div>

                {/* Photo Aspect Square */}
                {renderMedia('aspect-square')}

                {/* Actions Bar */}
                <div className="flex items-center gap-3.5 px-3 py-2.5 text-foreground">
                    <Heart size={20} className="hover:text-rose-500 cursor-pointer transition-colors" />
                    <ChatCircle size={20} className="hover:text-foreground cursor-pointer transition-colors" />
                    <PaperPlaneTilt size={20} className="hover:text-foreground cursor-pointer transition-colors" />
                    <BookmarkSimple size={20} className="ml-auto hover:text-foreground cursor-pointer transition-colors" />
                </div>

                {/* Caption */}
                <div className="px-3 pb-3">
                    {text.trim() ? (
                        <p className="line-clamp-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground">
                            <span className="font-semibold mr-1.5">{handle}</span>
                            {text}
                        </p>
                    ) : (
                        renderText()
                    )}
                </div>
            </div>
        );
    }

    // Zalo Official Account (Zalo OA) Mockup
    if (platform === 'zalo') {
        const avatarUrl = getAccountAvatarUrl(account);
        return (
            <div className="overflow-hidden rounded-2xl border border-[#0068FF]/30 bg-card shadow-sm">
                {/* Zalo Top App Header */}
                <div className="bg-[#0068FF] px-3.5 py-2 text-white flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-heading text-xs font-bold tracking-tight">
                        <span className="bg-white text-[#0068FF] font-black px-1.5 py-0.5 rounded text-[10px]">OA</span>
                        <span>ZALO OFFICIAL ACCOUNT</span>
                    </div>
                    <span className="text-[10px] text-white/80 font-medium">Nhật ký & Broadcast</span>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between p-3.5 bg-muted/10 border-b border-border/40">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative">
                            <div className="size-10 rounded-full overflow-hidden border-2 border-[#0068FF]/30 bg-muted">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={handle}
                                        className="size-full object-cover"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="grid size-full place-items-center font-heading text-xs font-bold text-foreground bg-[#0068FF]/10 text-[#0068FF]">
                                        {handle[0]?.toUpperCase() || 'Z'}
                                    </div>
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1">
                                <PlatformLogo platform="zalo" size={16} />
                            </div>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                                <span className="truncate text-xs font-bold text-foreground">{handle}</span>
                                <SealCheck size={14} weight="fill" className="text-[#0068FF] shrink-0" title="Tài khoản Doanh nghiệp Xác thực" />
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span className="text-[10px] font-semibold text-[#0068FF] bg-[#0068FF]/10 px-1 rounded">Doanh nghiệp</span>
                                <span>·</span>
                                <span>{when}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full bg-[#0068FF] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#0058db] transition-colors shadow-2xs"
                    >
                        <UserPlus size={12} weight="bold" />
                        <span>Quan tâm</span>
                    </button>
                </div>

                {/* Caption */}
                <div className="px-3.5 py-3">{renderText('line-clamp-6')}</div>

                {/* Media */}
                {mediaCount > 0 && renderMedia('aspect-[16/10]')}

                {/* Direct CTA Chat with OA */}
                <div className="mx-3.5 my-2.5 p-2 rounded-xl bg-[#0068FF]/5 border border-[#0068FF]/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="grid size-7 place-items-center rounded-lg bg-[#0068FF] text-white">
                            <ChatDots size={16} weight="fill" />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-foreground">Gửi tin nhắn tư vấn cho OA</p>
                            <p className="text-[10px] text-muted-foreground">Phản hồi tự động qua Zalo 24/7</p>
                        </div>
                    </div>
                    <span className="text-[11px] font-semibold text-[#0068FF] hover:underline cursor-pointer">
                        Nhắn tin →
                    </span>
                </div>

                {/* Actions Bar */}
                <div className="grid grid-cols-3 border-t border-border/60 text-[11.5px] text-muted-foreground">
                    <div className="flex items-center justify-center gap-1.5 py-2 hover:bg-muted/40 cursor-pointer transition-colors font-medium select-none">
                        <ThumbsUp size={15} />
                        <span>Thích</span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 py-2 hover:bg-muted/40 cursor-pointer transition-colors font-medium select-none">
                        <ChatCircle size={15} />
                        <span>Bình luận</span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 py-2 hover:bg-muted/40 cursor-pointer transition-colors font-medium select-none">
                        <ShareFat size={15} />
                        <span>Chia sẻ</span>
                    </div>
                </div>
            </div>
        );
    }

    // LinkedIn or Facebook Mockup
    const isLinkedIn = platform === 'linkedin';
    const actions = isLinkedIn
        ? [
              [ThumbsUp, t('Thích')],
              [ChatCircle, t('Bình luận')],
              [Repeat, t('Đăng lại')],
              [PaperPlaneTilt, t('Gửi')],
          ]
        : [
              [ThumbsUp, t('Thích')],
              [ChatCircle, t('Bình luận')],
              [ShareFat, t('Chia sẻ')],
          ];

    const avatarUrl = getAccountAvatarUrl(account);

    return (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
            {/* Header */}
            <div className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                        <div className="size-9 rounded-full overflow-hidden border border-border/60 bg-muted">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={handle}
                                    className="size-full object-cover"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            ) : (
                                <div className="grid size-full place-items-center font-heading text-xs font-bold text-foreground">
                                    {handle[0]?.toUpperCase() || 'S'}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5">
                            <PlatformLogo platform={platform} size={14} />
                        </div>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-foreground">{handle}</div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <span>{when}</span>
                            <span>·</span>
                            <Globe size={11} />
                        </div>
                    </div>
                </div>
                <DotsThree size={20} className="text-muted-foreground cursor-pointer" />
            </div>

            {/* Caption */}
            <div className="px-3.5 pb-3">{renderText('line-clamp-6')}</div>

            {/* Media */}
            {mediaCount > 0 && renderMedia('aspect-[16/10]')}

            {/* Actions Bar */}
            <div className={`grid border-t border-border/60 text-[11.5px] text-muted-foreground ${actions.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                {actions.map(([Icon, label], idx) => (
                    <div
                        key={idx}
                        className="flex items-center justify-center gap-1.5 py-2 hover:bg-muted/40 cursor-pointer transition-colors font-medium select-none"
                    >
                        <Icon size={15} />
                        <span>{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

