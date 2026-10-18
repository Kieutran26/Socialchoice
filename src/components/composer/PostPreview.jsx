import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { DotsThree, Globe, ThumbsUp, ChatCircle, ShareFat } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { resolveCaption, resolveMedia } from '@/lib/publishing-content';
import { PLATFORM_LABEL } from '@/lib/constants';
import { toUtcIso } from '@/lib/tz';

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
                return <Button variant="ghost" type="button" key={image.id} className={`h-auto p-0 rounded-none relative min-h-0 min-w-0 bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${span}`} onClick={() => setOpened(image)} aria-label={t('View image {number}', { number: index + 1 })}>
                    <img src={image.file_url} alt={image.name || image.filename || t('Post image')} className={images.length === 1 ? 'w-full max-h-[600px] object-contain' : `w-full h-full object-cover ${images.length === 2 ? portrait ? 'aspect-[3/4]' : 'aspect-video' : ''}`} />
                    {index === 4 && media.length > 5 && <span className="absolute inset-0 bg-foreground/60 text-background flex items-center justify-center text-3xl font-medium">+{media.length - 5}</span>}
                </Button>;
            })}
        </div>
        <Dialog open={!!opened} onOpenChange={open=>!open&&setOpened(null)}><DialogContent className="max-w-4xl"><DialogTitle>{opened?.name || t('Image preview')}</DialogTitle>{opened&&<img src={opened.file_url} alt={opened.name || opened.filename} className="max-h-[75vh] w-full object-contain" />}</DialogContent></Dialog>
    </>;
}

export default function PostPreview({ caption: mainCaption, media: sharedMedia, accounts, scheduledAt, timezone, pageSettings = {}, platformCaptions = {}, platformMedia = {} }) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const [selectedPage,setSelectedPage]=useState('');
    const pages=accounts.filter(account=>['facebook','instagram','threads','tiktok','linkedin'].includes(account.platform));
    const page = pages.find(account=>account.id===selectedPage) || pages[0];
    const caption=resolveCaption({caption:mainCaption,platform_captions:platformCaptions,destination_settings:pageSettings},page || {});
    const media = resolveMedia({}, page || {}, sharedMedia, platformMedia);
    const localTime=pageSettings[page?.id]?.localTime;
    const [date,time]=localTime?.split('T') || [];
    const previewTime=localTime ? toUtcIso(date,time,timezone) : scheduledAt;
    const pageName = page?.name || t('Choose a publishing account');
    const longCaption = caption.length > 350 || caption.split('\n').length > 6;
    const visibleCaption = longCaption && !expanded ? caption.slice(0, 350).split('\n').slice(0, 6).join('\n') : caption;
    return <section className="panel p-4 sm:p-5 min-w-0" aria-label={t('Content preview')}>
        <div className="flex items-center justify-between gap-3 mb-4"><h2 className="text-base">{t('Content preview')}</h2><span className="label-xs">{page?.platform==='linkedin'?'LinkedIn':page?.platform==='tiktok'?'TikTok':page?.platform==='threads'?'Threads':page?.platform==='instagram'?'Instagram':'Facebook'}</span></div>
        {pages.length>1 && <label className="block text-xs mb-4">{t('Preview account')}<select aria-label={t('Preview account')} className="w-full mt-2 border rounded-lg p-2 bg-background" value={page?.id || ''} onChange={event=>{setSelectedPage(event.target.value);setExpanded(false);}}>{pages.map(account=><option key={account.id} value={account.id}>{account.name} · {PLATFORM_LABEL[account.platform]}</option>)}</select></label>}
        <div className="rounded-xl border bg-muted p-3 sm:p-6">
            <article className="mx-auto max-w-[680px] overflow-hidden rounded-lg border bg-background" aria-label={t(page?.platform==='linkedin'?'LinkedIn post preview':page?.platform==='tiktok'?'TikTok post preview':page?.platform==='threads'?'Threads post preview':page?.platform==='instagram'?'Instagram post preview':'Facebook post preview')}>
                <header className="flex items-center gap-3 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-neutral text-lg font-medium" aria-hidden="true">{pageName.slice(0, 1).toUpperCase()}</div>
                    <div className="min-w-0 flex-1"><p className="text-sm font-semibold break-words">{pageName}</p><p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5"><span>{t('Preview')}</span><span>·</span>{page?.platform==='tiktok'?t('Only me (sandbox)'):<Globe size={13} aria-label={t('Public')} />}</p></div>
                    <DotsThree size={24} aria-hidden="true" />
                </header>
                {page?.platform!=='instagram' && <div className="px-4 pb-4"><p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{visibleCaption || t('Your caption will appear here.')}{longCaption && !expanded ? '…' : ''}</p>{longCaption && <Button variant="ghost" type="button" className="h-auto p-0 mt-1 min-h-11 text-sm font-semibold underline underline-offset-2" onClick={() => setExpanded(!expanded)}>{t(expanded ? 'See less' : 'See more')}</Button>}</div>}
                {media[0]?.file_type === 'video' ? <video src={media[0].file_url} controls preload="metadata" className="w-full max-h-[600px] bg-muted object-contain" /> : media.length > 0 && <PhotoGrid media={media} />}
                {page?.platform==='instagram' && <p className="px-4 py-4 whitespace-pre-wrap break-words text-sm"><strong>{page.username || pageName}</strong> {caption || t('Your caption will appear here.')}</p>}
                {(!page||page.platform==='facebook') && <footer className="grid grid-cols-3 border-t mx-4 py-3 text-muted-foreground" aria-label={t('Preview only')}>
                    {[['Like', ThumbsUp], ['Comment', ChatCircle], ['Share this post', ShareFat]].map(([label, Icon]) => <span key={String(label)} className="flex justify-center items-center gap-1.5 text-xs sm:text-sm"><Icon size={18} />{t(String(label))}</span>)}
                </footer>}
            </article>
        </div>
        <p className="label-xs mt-3">{t(page?.platform==='linkedin'?'Preview approximates LinkedIn. Final layout can vary by device.':page?.platform==='tiktok'?'Preview approximates TikTok. Final layout can vary by device.':page?.platform==='threads'?'Preview approximates Threads. Final layout can vary by device.':page?.platform==='instagram'?'Preview approximates Instagram. Final cropping and layout can vary by device.':'Preview approximates Facebook. Final cropping and layout can vary by device.')}</p>
        {previewTime && <p className="label-xs mt-2">{formatDateTime(previewTime, timezone)} · {timezone}</p>}
    </section>;
}
