import MediaAttachments from './media-attachments';
import { formatDateTime } from '@/lib/format';
import { useState } from 'react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';

export default function PublishConfirmation({ review, onClose, onResult }) {
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    const items=review.items || [review];
    async function confirm() {
        setBusy(true); setError('');
        try { onResult(await (review.scheduledFor ? appClient.publishing.schedule(review.attemptId) : appClient.publishing.publish(review.attemptId))); }
        catch (failure) {
            try {
                const result = await appClient.publishing.status(review.attemptId);
                if (result.status !== 'prepared') { onResult(result); return; }
            } catch { /* Preserve the review when the API itself is unreachable. */ }
            setError(failure.message);
        } finally { setBusy(false); }
    }
    return <Dialog open onOpenChange={open => !open && !busy && onClose()}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{t('Confirm publication')}</DialogTitle></DialogHeader>
        <p className="text-sm mb-4">{t(review.scheduledFor ? 'Review every account, caption, media and publishing time before confirming.' : 'This will publish the reviewed content to every account below.')}</p>
        <div className="space-y-4">{items.map(item=><section key={item.attemptId} className="rounded-lg border p-4 min-w-0">
            <p className="font-medium break-words">{item.pageName} <span className="label-xs">· {item.platform==='linkedin'?'LinkedIn':item.platform==='tiktok'?'TikTok':item.platform==='threads'?'Threads':item.platform === 'instagram' ? 'Instagram' : 'Facebook'} · {item.pageId}</span></p>
            {review.scheduledFor && <p className="text-sm my-2">{formatDateTime(new Date(item.scheduledFor).toISOString(),item.timezone || 'Asia/Ho_Chi_Minh')} · {item.timezone || 'Asia/Ho_Chi_Minh'}</p>}
            <p className="max-h-60 overflow-auto whitespace-pre-wrap break-words text-sm my-3">{item.caption}</p>
            {item.platform==='linkedin'&&<p className="text-sm">{t('Visibility: Public')}</p>}
            {item.platform==='tiktok'&&<p className="text-sm">TikTok · {item.tiktokCreator} · {t('Only me (sandbox)')} · {t('Comments')}: {item.tiktokOptions?.allowComment?t('Yes'):t('No')} · Duet: {item.tiktokOptions?.allowDuet?t('Yes'):t('No')} · Stitch: {item.tiktokOptions?.allowStitch?t('Yes'):t('No')} · {t('Disclose promotional content')}: {item.tiktokOptions?.commercial?t('Yes'):t('No')} · {t('Your own brand')}: {item.tiktokOptions?.ownBrand?t('Yes'):t('No')} · AI: {item.tiktokOptions?.aiGenerated?t('Yes'):t('No')} · {t('Music consent confirmed')}: {item.tiktokOptions?.musicConsent?t('Yes'):t('No')} · <a className="underline" href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">Music Usage Confirmation</a></p>}
            <MediaAttachments media={item.media || []} />
        </section>)}</div>
        {error && <p role="alert" className="mt-3 text-sm text-dangerFg">{t(error)}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-3"><Button variant="outline" disabled={busy} onClick={onClose}>{t('Cancel')}</Button><button className="btn-skew" disabled={busy} onClick={confirm}>{t(busy ? 'Saving…' : review.scheduledFor ? 'Confirm automatic schedule' : 'Confirm and publish')}</button></div>
    </DialogContent></Dialog>;
}
