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
    return <Dialog open onOpenChange={open => !open && !busy && onClose()}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{t('Confirm Facebook post')}</DialogTitle></DialogHeader>
        <p className="text-sm mb-4">{t(review.scheduledFor ? 'Review every Page, caption, media and publishing time before confirming.' : 'This will publish the reviewed content to every Page below.')}</p>
        <div className="space-y-4">{items.map(item=><section key={item.attemptId} className="rounded-lg border p-4 min-w-0">
            <p className="font-medium break-words">{item.pageName} <span className="label-xs">· {item.pageId}</span></p>
            {review.scheduledFor && <p className="text-sm my-2">{formatDateTime(new Date(item.scheduledFor).toISOString(),item.timezone || 'Asia/Ho_Chi_Minh')} · {item.timezone || 'Asia/Ho_Chi_Minh'}</p>}
            <p className="max-h-60 overflow-auto whitespace-pre-wrap break-words text-sm my-3">{item.caption}</p>
            {!!item.media?.length && <div className={item.media[0]?.file_type === 'video' ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 sm:grid-cols-3 gap-2'}>{item.media.map((asset,index)=><div key={asset.id}>{asset.file_type==='video'?<video src={asset.file_url} controls preload="metadata" className="max-h-64 w-full rounded-lg"/>:<img src={asset.file_url} alt={asset.name} className="h-28 w-full object-contain rounded-lg border"/>}<p className="label-xs truncate">{index+1}. {asset.name}</p></div>)}</div>}
        </section>)}</div>
        {error && <p role="alert" className="mt-3 text-sm text-dangerFg">{t(error)}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-3"><Button variant="outline" disabled={busy} onClick={onClose}>{t('Cancel')}</Button><button className="btn-skew" disabled={busy} onClick={confirm}>{t(busy ? 'Saving…' : review.scheduledFor ? 'Confirm automatic schedule' : 'Confirm and publish')}</button></div>
    </DialogContent></Dialog>;
}
