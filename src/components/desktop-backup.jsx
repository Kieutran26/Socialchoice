import { useState } from 'react';
import { invokeNative } from '@/api/desktop/runtime';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatBytes } from '@/lib/format';

export default function DesktopBackup() {
    const { t }=useTranslation();
    const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
    const [review,setReview]=useState(null),[confirmation,setConfirmation]=useState(''),[restored,setRestored]=useState(false);
    async function run(action) {
        setBusy(true);setError('');setMessage('');
        try {
            const result=await invokeNative('workspace_files',{action,input:action==='restore'?{token:review.token}:{}});
            if(result.cancelled)return;
            if(action==='export')setMessage(t('Backup saved: {path}',{path:result.path}));
            if(action==='inspect'){setReview(result);setConfirmation('');}
            if(action==='restore'){setReview(null);setRestored(true);setMessage(t('Workspace restored. Recovery backup: {path}',{path:result.recovery_path}));}
        } catch(error) {setError(error.message || String(error));}
        finally {setBusy(false);}
    }
    async function closeReview() {
        if(busy)return;setReview(null);setConfirmation('');
        try {await invokeNative('workspace_files',{action:'discard',input:{}});}catch(error){setError(String(error));}
    }
    return <section className="panel p-5">
        <h2 className="text-[15px] mb-2">{t('Backup and restore')}</h2>
        <p className="label-xs mb-4">{t('A backup contains all brands, drafts, calendar plans and library media. Save it on another drive. Backups are not encrypted.')}</p>
        <div className="flex flex-wrap gap-3">
            <Button variant="outline" disabled={busy || restored} onClick={()=>run('export')}>{t('Export workspace backup')}</Button>
            <Button variant="outline" disabled={busy || restored} onClick={()=>run('inspect')}>{t('Choose backup to restore')}</Button>
            {restored && <Button onClick={()=>window.location.reload()}>{t('Open restored workspace')}</Button>}
        </div>
        {busy && <p role="status" className="label-xs mt-3">{t('Working with local files…')}</p>}
        {message && <p role="status" className="mt-3 text-sm break-all">{message}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-dangerFg">{t(error)}</p>}
        <Dialog open={restored}><DialogContent onEscapeKeyDown={event=>event.preventDefault()} onPointerDownOutside={event=>event.preventDefault()}><DialogHeader><DialogTitle>{t('Open restored workspace')}</DialogTitle></DialogHeader><p className="text-sm break-all">{message}</p><Button onClick={()=>window.location.reload()}>{t('Open restored workspace')}</Button></DialogContent></Dialog>
        <Dialog open={!!review} onOpenChange={open=>!open&&closeReview()}><DialogContent><DialogHeader><DialogTitle>{t('Replace this workspace?')}</DialogTitle></DialogHeader>
            <p className="text-sm">{t('Restore replaces every brand, draft, calendar plan and library entry. A recovery backup of the current workspace is created first.')}</p>
            {review && <div className="text-sm space-y-1">{Object.entries(review.counts).map(([key,count])=><p key={key}>{t(key)}: {String(count)}</p>)}<p>{t('Media')}: {formatBytes(review.media_bytes)}</p></div>}
            <label htmlFor="restore-confirmation" className="text-sm">{t('Type RESTORE to confirm replacement')}</label>
            <Input id="restore-confirmation" value={confirmation} disabled={busy} onChange={event=>setConfirmation(event.target.value)} autoComplete="off" />
            {error && <p role="alert" className="text-sm text-dangerFg">{t(error)}</p>}
            <div className="flex gap-3"><Button variant="outline" disabled={busy} onClick={closeReview}>{t('Cancel')}</Button><Button variant="destructive" disabled={busy || confirmation!=='RESTORE'} onClick={()=>run('restore')}>{t('Restore workspace')}</Button></div>
        </DialogContent></Dialog>
    </section>;
}
