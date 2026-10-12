import { useState } from 'react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';

export default function PublishConfirmation({ review, onClose, onResult }) {
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function confirm() {
        setBusy(true); setError('');
        try { onResult(await appClient.publishing.publish(review.attemptId)); }
        catch (failure) {
            // Recover the durable claim; a repeated confirmation never resends it.
            try {
                const result = await appClient.publishing.status(review.attemptId);
                if (result.status !== 'prepared') { onResult(result); return; }
            } catch { /* Preserve the review when the API itself is unreachable. */ }
            setError(failure.message);
        } finally { setBusy(false); }
    }
    return <Dialog open onOpenChange={open => !open && !busy && onClose()}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{t('Confirm Facebook post')}</DialogTitle></DialogHeader>
        <p className="text-sm">{t('This will publish immediately on the selected Facebook Page.')}</p>
        <p className="font-medium">{review.pageName} <span className="label-xs">· {review.pageId}</span></p>
        <div className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border p-4 text-sm">{review.caption}</div>
        {!!review.media?.length && <div className="grid grid-cols-3 gap-2 max-h-56 overflow-auto">{review.media.map((image,index) => <div key={image.id}><img src={image.file_url} alt={image.name} className="h-28 w-full object-contain rounded-lg border" /><p className="label-xs truncate">{index+1}. {image.name}</p></div>)}</div>}
        {error && <p role="alert" className="text-sm text-dangerFg">{t(error)}</p>}
        <div className="mt-4 flex justify-end gap-3"><Button variant="outline" disabled={busy} onClick={onClose}>{t('Cancel')}</Button><button className="btn-skew" disabled={busy} onClick={confirm}>{t(busy ? 'Publishing…' : 'Confirm and publish')}</button></div>
    </DialogContent></Dialog>;
}
