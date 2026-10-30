import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
    DotsThree,
    Globe,
    ThumbsUp,
    ChatCircle,
    ShareFat,
    Eye,
    FacebookLogo,
    InstagramLogo,
    TiktokLogo,
    LinkedinLogo,
    ThreadsLogo,
} from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { resolveCaption, resolveMedia } from '@/lib/publishing-content';
import { PLATFORM_LABEL } from '@/lib/constants';
import { toUtcIso } from '@/lib/tz';

const PLATFORM_ICONS = {
    facebook: { icon: FacebookLogo, color: 'text-[#1877F2]' },
    instagram: { icon: InstagramLogo, color: 'text-[#E4405F]' },
    tiktok: { icon: TiktokLogo, color: 'text-foreground' },
    threads: { icon: ThreadsLogo, color: 'text-foreground' },
    linkedin: { icon: LinkedinLogo, color: 'text-[#0A66C2]' },
};

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
    accounts,
    scheduledAt,
    timezone,
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
    const caption = resolveCaption({ caption: mainCaption, platform_captions: platformCaptions, destination_settings: pageSettings }, page || {});
    const media = resolveMedia({}, page || {}, sharedMedia, platformMedia);
    const localTime = pageSettings[page?.id]?.localTime;
    const [date, time] = localTime?.split('T') || [];
    const previewTime = localTime ? toUtcIso(date, time, timezone) : scheduledAt;
    const pageName = planning ? t('Local content plan') : page?.name || t('Choose a publishing account');
    const longCaption = caption.length > 350 || caption.split('\n').length > 6;
    const visibleCaption = longCaption && !expanded ? caption.slice(0, 350).split('\n').slice(0, 6).join('\n') : caption;

    const currentPlatform = page?.platform || 'facebook';
    const PlatformIconData = PLATFORM_ICONS[currentPlatform] || { icon: Globe, color: 'text-foreground' };
    const CurrentPlatformIcon = PlatformIconData.icon;

    return (
        <section className="panel p-4 sm:p-5 min-w-0" aria-label={t('Content preview')}>
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Eye size={17} weight="bold" />
                    </div>
                    <h2 className="text-[14px] font-semibold text-foreground">{t('Content preview')}</h2>
                </div>
                <span className="inline-flex items-center gap-1.5 label-xs font-medium text-foreground bg-muted px-2.5 py-0.5 rounded-full">
                    <CurrentPlatformIcon size={13} weight={/** @type {const} */ ('fill')} className={PlatformIconData.color} />
                    {planning ? t('Preview') : PLATFORM_LABEL[currentPlatform] || currentPlatform}
                </span>
            </div>

            {pages.length > 1 && (
                <div className="mb-3.5">
                    <div className="flex flex-wrap gap-1.5">
                        {pages.map((account) => {
                            const isCurrent = (page?.id || '') === account.id;
                            const pIconData = PLATFORM_ICONS[account.platform];
                            const PIcon = pIconData?.icon || Globe;
                            return (
                                <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedPage(account.id);
                                        setExpanded(false);
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        isCurrent
                                            ? 'bg-foreground text-background shadow-xs'
                                            : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <PIcon size={13} weight={/** @type {const} */ ('fill')} className={isCurrent ? 'text-background' : pIconData?.color} />
                                    <span className="truncate max-w-[130px]">{account.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="rounded-xl border border-border bg-muted/40 p-3 sm:p-4">
                <article
                    className="mx-auto max-w-[560px] overflow-hidden rounded-xl border border-border bg-card shadow-xs"
                    aria-label={t(
                        planning
                            ? 'Local content plan'
                            : page?.platform === 'linkedin'
                            ? 'LinkedIn post preview'
                            : page?.platform === 'tiktok'
                            ? 'TikTok post preview'
                            : page?.platform === 'threads'
                            ? 'Threads post preview'
                            : page?.platform === 'instagram'
                            ? 'Instagram post preview'
                            : 'Facebook post preview'
                    )}
                >
                    <header className="flex items-center gap-3 p-3.5 border-b border-border/40">
                        <div className="relative">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold text-foreground">
                                {pageName.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-card ring-1 ring-border">
                                <CurrentPlatformIcon size={11} weight={/** @type {const} */ ('fill')} className={PlatformIconData.color} />
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">{pageName}</p>
                            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span>{t('Just now')}</span>
                                <span>•</span>
                                {planning ? (
                                    t('Local only')
                                ) : page?.platform === 'tiktok' ? (
                                    t('Only me (sandbox)')
                                ) : (
                                    <Globe size={11} aria-label={t('Public')} />
                                )}
                            </p>
                        </div>
                        <DotsThree size={22} className="text-muted-foreground" aria-hidden="true" />
                    </header>

                    {page?.platform !== 'instagram' && (
                        <div className="px-3.5 py-3">
                            <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-foreground">
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
                    )}

                    {media[0]?.file_type === 'video' ? (
                        <video src={media[0].file_url} controls preload="metadata" className="w-full max-h-[460px] bg-muted object-contain" />
                    ) : (
                        media.length > 0 && <PhotoGrid media={media} />
                    )}

                    {page?.platform === 'instagram' && (
                        <div className="px-3.5 py-3 text-xs leading-relaxed">
                            <span className="font-semibold text-foreground mr-1.5">{page.username || pageName}</span>
                            <span className="text-foreground">
                                {caption || <span className="text-muted-foreground/60 italic">{t('Your caption will appear here.')}</span>}
                            </span>
                        </div>
                    )}

                    {!planning && (!page || page.platform === 'facebook') && (
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
                </article>
            </div>

            <p className="label-xs mt-3 text-muted-foreground leading-relaxed">
                {t(
                    planning
                        ? 'This is a local plan only. No automatic publishing.'
                        : page?.platform === 'linkedin'
                        ? 'Preview approximates LinkedIn. Final layout can vary by device.'
                        : page?.platform === 'tiktok'
                        ? 'Preview approximates TikTok. Final layout can vary by device.'
                        : page?.platform === 'threads'
                        ? 'Preview approximates Threads. Final layout can vary by device.'
                        : page?.platform === 'instagram'
                        ? 'Preview approximates Instagram. Final cropping and layout can vary by device.'
                        : 'Preview approximates Facebook. Final cropping and layout can vary by device.'
                )}
            </p>
            {previewTime && (
                <p className="label-xs mt-1 text-muted-foreground font-mono">
                    {formatDateTime(previewTime, timezone)} · {timezone}
                </p>
            )}
        </section>
    );
}
