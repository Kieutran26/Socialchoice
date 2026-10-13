import { useState } from 'react';
import { DotsThree, Globe, ThumbsUp, ChatCircle, ShareFat } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';

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
    return <>
        <div className={`grid gap-0.5 overflow-hidden ${grid}`} aria-label={t('Facebook photo layout preview')}>
            {images.map((image, index) => {
                let span = '';
                if (index === 0 && images.length === 3) span = portrait ? 'row-span-2' : 'col-span-2';
                if (index === 0 && images.length === 4) span = portrait ? 'row-span-3' : 'col-span-3';
                if (images.length === 5) span = index < 2 ? 'col-span-3' : 'col-span-2';
                return <button type="button" key={image.id} className={`relative min-h-0 min-w-0 bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${span}`} onClick={() => setOpened(image)} aria-label={t('View image {number}', { number: index + 1 })}>
                    <img src={image.file_url} alt={image.name || image.filename || t('Post image')} className={images.length === 1 ? 'w-full max-h-[600px] object-contain' : `w-full h-full object-cover ${images.length === 2 ? portrait ? 'aspect-[3/4]' : 'aspect-video' : ''}`} />
                    {index === 4 && media.length > 5 && <span className="absolute inset-0 bg-foreground/60 text-background flex items-center justify-center text-3xl font-medium">+{media.length - 5}</span>}
                </button>;
            })}
        </div>
        <Dialog open={!!opened} onOpenChange={open=>!open&&setOpened(null)}><DialogContent className="max-w-4xl"><DialogTitle>{opened?.name || t('Image preview')}</DialogTitle>{opened&&<img src={opened.file_url} alt={opened.name || opened.filename} className="max-h-[75vh] w-full object-contain" />}</DialogContent></Dialog>
    </>;
}

export default function PostPreview({ caption, media, accounts, scheduledAt, timezone }) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const page = accounts.find(account => account.platform === 'facebook');
    const pageName = page?.name || t('Choose a Facebook Page');
    const longCaption = caption.length > 350 || caption.split('\n').length > 6;
    const visibleCaption = longCaption && !expanded ? caption.slice(0, 350).split('\n').slice(0, 6).join('\n') : caption;
    return <section className="panel p-4 sm:p-5 min-w-0" aria-label={t('Content preview')}>
        <div className="flex items-center justify-between gap-3 mb-4"><h2 className="text-base">{t('Content preview')}</h2><span className="label-xs">Facebook</span></div>
        <div className="rounded-xl border bg-muted p-3 sm:p-6">
            <article className="mx-auto max-w-[680px] overflow-hidden rounded-lg border bg-background" aria-label={t('Facebook post preview')}>
                <header className="flex items-center gap-3 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-neutral text-lg font-medium" aria-hidden="true">{pageName.slice(0, 1).toUpperCase()}</div>
                    <div className="min-w-0 flex-1"><p className="text-sm font-semibold break-words">{pageName}</p><p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5"><span>{t('Preview')}</span><span>·</span><Globe size={13} aria-label={t('Public')} /></p></div>
                    <DotsThree size={24} aria-hidden="true" />
                </header>
                <div className="px-4 pb-4"><p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{visibleCaption || t('Your caption will appear here.')}{longCaption && !expanded ? '…' : ''}</p>{longCaption && <button type="button" className="mt-1 min-h-11 text-sm font-semibold underline underline-offset-2" onClick={() => setExpanded(!expanded)}>{t(expanded ? 'See less' : 'See more')}</button>}</div>
                {media[0]?.file_type === 'video' ? <video src={media[0].file_url} controls preload="metadata" className="w-full max-h-[600px] bg-muted object-contain" /> : media.length > 0 && <PhotoGrid media={media} />}
                <footer className="grid grid-cols-3 border-t mx-4 py-3 text-muted-foreground" aria-label={t('Preview only')}>
                    {[['Like', ThumbsUp], ['Comment', ChatCircle], ['Share this post', ShareFat]].map(([label, Icon]) => <span key={String(label)} className="flex justify-center items-center gap-1.5 text-xs sm:text-sm"><Icon size={18} />{t(String(label))}</span>)}
                </footer>
            </article>
        </div>
        <p className="label-xs mt-3">{t('Preview approximates Facebook. Final cropping and layout can vary by device.')}</p>
        {scheduledAt && <p className="label-xs mt-2">{formatDateTime(scheduledAt, timezone)}</p>}
    </section>;
}
