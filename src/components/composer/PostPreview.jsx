import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
    DotsThree,
    Globe,
    ThumbsUp,
    ChatCircle,
    ShareFat,
    Heart,
    BookmarkSimple,
    PaperPlaneTilt,
    ImageSquare,
    Clock,
} from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { useTranslation } from '@/lib/i18n';
import { resolveCaption, resolveMedia, resolveComments } from '@/lib/publishing-content';
import PlatformLogo from './PlatformLogo';

function PhotoGrid({ media }) {
    const { t } = useTranslation();
    const [opened, setOpened] = useState(null);
    const images = media.slice(0, 5);
    const portrait = media[0]?.height > media[0]?.width;
    let grid = 'grid-cols-2';
    if (images.length === 1) grid = 'grid-cols-1';
    if (images.length === 2 && !portrait) grid = 'grid-cols-1';
    if (images.length === 3) grid = portrait ? 'grid-cols-[2fr_1fr] grid-rows-2 aspect-square' : 'grid-cols-2 grid-rows-[2fr_1fr] aspect-square';
    if (images.length === 4) grid = portrait ? 'grid-cols-[2fr_1fr] grid-rows-3 aspect-square' : 'grid-cols-3 grid-rows-[2fr_1fr] aspect-square';
    if (images.length === 5) grid = 'grid-cols-6 grid-rows-2 aspect-square';

    return (
        <>
            <div className={`grid gap-0.5 overflow-hidden ${grid}`} aria-label={t('Facebook photo layout preview')}>
                {images.map((image, index) => {
                    let span = '';
                    if (index === 0 && images.length === 3) span = portrait ? 'row-span-2' : 'col-span-2';
                    if (index === 0 && images.length === 4) span = portrait ? 'row-span-3' : 'col-span-3';
                    if (images.length === 5) span = index < 2 ? 'col-span-3' : 'col-span-2';
                    return (
                        <Button
                            variant="ghost"
                            type="button"
                            key={image.id}
                            className={`h-auto p-0 rounded-none relative min-h-0 min-w-0 bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${span}`}
                            onClick={() => setOpened(image)}
                            aria-label={t('View image {number}', { number: index + 1 })}
                        >
                            <img
                                src={image.file_url}
                                alt={image.name || image.filename || t('Post image')}
                                className={images.length === 1 ? 'w-full max-h-[500px] object-contain' : `w-full h-full object-cover ${images.length === 2 ? (portrait ? 'aspect-[3/4]' : 'aspect-video') : ''}`}
                            />
                            {index === 4 && media.length > 5 && (
                                <span className="absolute inset-0 bg-foreground/60 text-background flex items-center justify-center text-2xl font-bold">
                                    +{media.length - 5}
                                </span>
                            )}
                        </Button>
                    );
                })}
            </div>
            <Dialog open={!!opened} onOpenChange={(open) => !open && setOpened(null)}>
                <DialogContent className="max-w-4xl">
                    <DialogTitle>{opened?.name || t('Image preview')}</DialogTitle>
                    {opened && <img src={opened.file_url} alt={opened.name || opened.filename} className="max-h-[75vh] w-full object-contain" />}
                </DialogContent>
            </Dialog>
        </>
    );
}

export default function PostPreview({
    caption: mainCaption,
    media: sharedMedia,
    comments: sharedComments = [],
    accounts,
    pageSettings = {},
    platformCaptions = {},
    platformMedia = {},
    planning = false,
}) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const [selectedPage, setSelectedPage] = useState('');
    const pages = accounts.filter((account) => ['facebook', 'instagram', 'threads', 'tiktok', 'linkedin'].includes(account.platform));
    const page = pages.find((account) => account.id === selectedPage) || pages[0];
    const postContext = {
        caption: mainCaption,
        platform_captions: platformCaptions,
        destination_settings: pageSettings,
        comments: sharedComments,
    };
    const caption = resolveCaption(postContext, page || {});
    const media = resolveMedia(postContext, page || {}, sharedMedia, platformMedia);
    const comments = resolveComments(postContext, page || {});
    const pageName = planning ? t('Local content plan') : page?.name || t('Choose a publishing account');
    const longCaption = caption.length > 350 || caption.split('\n').length > 6;
    const visibleCaption = longCaption && !expanded ? caption.slice(0, 350).split('\n').slice(0, 6).join('\n') : caption;

    const currentPlatform = page?.platform || 'instagram';

    return (
        <section className="panel p-5 sm:p-6 bg-card border border-border rounded-3xl shadow-2xs min-w-0" aria-label={t('Content preview')}>
            {/* Header: Left "Xem trước", Right "Mô phỏng" */}
            <div className="flex items-center justify-between pb-3.5">
                <h2 className="text-sm sm:text-[15px] font-bold text-foreground">{t('Preview')}</h2>
                <span className="text-sm font-normal text-muted-foreground/80">{t('Simulation')}</span>
            </div>

            {/* Platform Switcher Pills */}
            {pages.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {pages.map((account) => {
                        const isCurrent = (page?.id || '') === account.id;
                        return (
                            <button
                                key={account.id}
                                type="button"
                                onClick={() => {
                                    setSelectedPage(account.id);
                                    setExpanded(false);
                                }}
                                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs transition-all ${isCurrent
                                        ? 'bg-[#18181b] text-white font-semibold shadow-2xs'
                                        : 'bg-muted/70 hover:bg-muted text-foreground/80 font-medium'
                                    }`}
                            >
                                <PlatformLogo platform={account.platform} size={16} />
                                <span className="truncate max-w-[140px]">{account.name}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Mockup Frame Canvas */}
            <div className="rounded-2xl bg-[#f4f4f6]/60 p-3 sm:p-4 border border-border/40">
                <article
                    className="mx-auto max-w-[480px] overflow-hidden rounded-2xl border border-border/80 bg-white shadow-2xs"
                    aria-label={t(
                        planning
                            ? 'Local content plan'
                            : currentPlatform === 'linkedin'
                                ? 'LinkedIn post preview'
                                : currentPlatform === 'tiktok'
                                    ? 'TikTok post preview'
                                    : currentPlatform === 'threads'
                                        ? 'Threads post preview'
                                        : currentPlatform === 'instagram'
                                            ? 'Instagram post preview'
                                            : 'Facebook post preview'
                    )}
                >
                    {/* Mockup Header */}
                    <header className="flex items-center gap-3 p-3.5 sm:p-4">
                        <div className="relative shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f2f4] text-sm font-bold text-[#18181b]">
                                {pageName.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full ring-2 ring-white shadow-2xs">
                                <PlatformLogo platform={currentPlatform} size={15} />
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[#09090b] truncate">{page?.username || pageName}</p>
                            <p className="flex items-center gap-1 text-[11px] text-[#71717a] mt-0.5">
                                <span>{t('Just now')}</span>
                                <span>·</span>
                                {planning ? (
                                    t('Local only')
                                ) : currentPlatform === 'tiktok' ? (
                                    t('Only me (sandbox)')
                                ) : (
                                    <Globe size={11} aria-label={t('Public')} />
                                )}
                            </p>
                        </div>
                        <DotsThree size={22} weight="bold" className="text-[#71717a] shrink-0" aria-hidden="true" />
                    </header>

                    {/* INSTAGRAM MOCKUP BODY */}
                    {currentPlatform === 'instagram' ? (
                        <>
                            {caption ? (
                                <div className="px-4 pb-3.5 pt-0.5 text-xs text-[#09090b] leading-relaxed break-words whitespace-pre-wrap">
                                    <span className="font-bold mr-1.5">{page?.username || pageName}</span>
                                    <span>{caption}</span>
                                </div>
                            ) : (
                                <div className="px-4 pb-3.5 pt-0.5 space-y-2" aria-hidden="true">
                                    <div className="h-2 rounded-full bg-[#ebecef] w-[80%]" />
                                    <div className="h-2 rounded-full bg-[#ebecef] w-[65%]" />
                                    <div className="h-2 rounded-full bg-[#ebecef] w-[45%]" />
                                </div>
                            )}

                            {/* 1:1 Aspect Ratio Media Container */}
                            <div className="aspect-square w-full bg-[#faf7ee] flex items-center justify-center relative overflow-hidden border-y border-border/20">
                                {media.length > 0 ? (
                                    media[0]?.file_type === 'video' ? (
                                        <video
                                            src={media[0].file_url}
                                            controls
                                            preload="metadata"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <img
                                            src={media[0].file_url}
                                            alt={media[0].name || t('Post image')}
                                            className="w-full h-full object-cover"
                                        />
                                    )
                                ) : (
                                    <div className="flex items-center justify-center text-slate-300">
                                        <ImageSquare size={44} weight="regular" className="text-slate-300/90" />
                                    </div>
                                )}
                            </div>

                            {/* Instagram Action Footer Bar */}
                            <footer className="px-4 py-3 flex items-center justify-between bg-white text-[#18181b]">
                                <div className="flex items-center gap-4">
                                    <Heart size={22} weight="regular" className="cursor-pointer hover:text-red-500 transition-colors" />
                                    <ChatCircle size={22} weight="regular" className="cursor-pointer hover:text-slate-600 transition-colors" />
                                    <PaperPlaneTilt size={22} weight="regular" className="-rotate-12 cursor-pointer hover:text-slate-600 transition-colors" />
                                </div>
                                <BookmarkSimple size={22} weight="regular" className="cursor-pointer hover:text-slate-600 transition-colors" />
                            </footer>
                        </>
                    ) : (
                        /* OTHER PLATFORMS (Facebook, LinkedIn, TikTok, Threads) */
                        <>
                            <div className="px-4 py-3">
                                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                                    {visibleCaption || (
                                        <span className="text-muted-foreground/60 italic">
                                            {t('Your caption will appear here.')}
                                        </span>
                                    )}
                                    {longCaption && !expanded ? '…' : ''}
                                </p>
                                {longCaption && (
                                    <Button
                                        variant="ghost"
                                        type="button"
                                        className="h-auto p-0 mt-1 min-h-8 text-xs font-semibold text-foreground hover:underline"
                                        onClick={() => setExpanded(!expanded)}
                                    >
                                        {t(expanded ? 'See less' : 'See more')}
                                    </Button>
                                )}
                            </div>

                            {media[0]?.file_type === 'video' ? (
                                <video src={media[0].file_url} controls preload="metadata" className="w-full max-h-[460px] bg-muted object-contain" />
                            ) : (
                                media.length > 0 && <PhotoGrid media={media} />
                            )}

                            {!planning && (!page || currentPlatform === 'facebook') && (
                                <footer className="grid grid-cols-3 border-t border-border/50 py-2.5 text-muted-foreground bg-muted/20" aria-label={t('Preview only')}>
                                    {[
                                        ['Like', ThumbsUp],
                                        ['Comment', ChatCircle],
                                        ['Share this post', ShareFat],
                                    ].map(([label, Icon]) => (
                                        <button
                                            type="button"
                                            key={String(label)}
                                            className="flex justify-center items-center gap-1.5 text-xs font-medium hover:text-foreground transition-colors py-1 cursor-default"
                                        >
                                            <Icon size={16} />
                                            <span>{t(String(label))}</span>
                                        </button>
                                    ))}
                                </footer>
                            )}
                        </>
                    )}

                    {/* Follow-up Comment Chain Preview */}
                    {comments.length > 0 && (
                        <div className="border-t border-border/60 bg-muted/15 px-4 py-3 space-y-2.5" aria-label={t('Follow-up comments preview')}>
                            <p className="text-[11px] font-semibold text-muted-foreground">
                                {t('Follow-up comments')} ({comments.length})
                            </p>
                            {comments.map((comment, idx) => (
                                <div key={idx} className="rounded-xl bg-white border border-border/60 p-2.5 text-xs space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-bold text-[#09090b] truncate">
                                            {page?.username || pageName} · #{idx + 1}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full shrink-0">
                                            <Clock size={11} />
                                            {(comment.delay_minutes || 0) === 0
                                                ? t('Immediate')
                                                : `+${comment.delay_minutes}m`}
                                        </span>
                                    </div>
                                    {comment.message && (
                                        <p className="whitespace-pre-wrap break-words text-xs text-foreground leading-relaxed">
                                            {comment.message}
                                        </p>
                                    )}
                                    {(comment.media || []).length > 0 && comment.media[0]?.file_url && (
                                        <img
                                            src={comment.media[0].file_url}
                                            alt={comment.media[0].name || t('Comment image')}
                                            className="max-h-36 rounded-lg border border-border/50 object-contain"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </article>
            </div>
        </section>
    );
}
