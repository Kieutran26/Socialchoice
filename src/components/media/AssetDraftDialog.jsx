import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function AssetDraftDialog({ asset, onClose }) {
    const { t } = useTranslation(), navigate = useNavigate();
    const [goal, setGoal] = useState(''), [tone, setTone] = useState(''), [brief, setBrief] = useState(''), [cta, setCta] = useState('');
    const [language, setLanguage] = useState('vi'), [consent, setConsent] = useState(false);
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState(null);
    const [title, setTitle] = useState(asset.name.slice(0, 200)), [caption, setCaption] = useState('');
    const generate = async event => {
        event.preventDefault();
        if (busy || !consent) return;
        setBusy(true); setError('');
        try {
            const value = await appClient.autopilot.call('generateDraft', { id: asset.id, request_id: crypto.randomUUID(), goal, tone, brief, cta, language, confirmed: true });
            setResult(value); setCaption(value.text);
        } catch (e) { setError(e.message); }
        finally { setBusy(false); setConsent(false); }
    };
    const save = async () => {
        if (busy) return;
        setBusy(true); setError('');
        try {
            const value = await appClient.autopilot.call('saveAssetDraft', { id: result.id, title, caption });
            navigate('/create?edit=' + encodeURIComponent(value.post_id)); onClose();
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    };
    return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
        <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{t('Create Facebook draft from image')}</DialogTitle></DialogHeader>
            <p className="text-sm break-words mb-4">{asset.name}</p>
            <p className="label-xs mb-4">{t('Only the approved analysis and your brief are sent to AI. Review the caption before saving. Saving copies the image into private media and opens the existing editor; it does not schedule or publish.')}</p>
            {error && <p role="alert" className="text-sm text-dangerFg break-words mb-4">{t(error)}</p>}
            {busy && <p role="status" className="label-xs mb-4">{t(result ? 'Saving draft and importing image…' : 'Generating draft…')}</p>}
            {!result ? <form onSubmit={generate} className="space-y-4">
                <div><Label htmlFor="asset-draft-goal">{t('Post goal')}</Label><Input id="asset-draft-goal" required maxLength={150} disabled={busy} value={goal} onChange={e => setGoal(e.target.value)} /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label htmlFor="asset-draft-tone">{t('Writing tone')}</Label><Input id="asset-draft-tone" maxLength={100} disabled={busy} value={tone} onChange={e => setTone(e.target.value)} /></div>
                    <div><Label htmlFor="asset-draft-language">{t('Output language')}</Label><select id="asset-draft-language" className="border border-input rounded-lg p-2 w-full text-sm bg-background" disabled={busy} value={language} onChange={e => setLanguage(e.target.value)}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></div>
                </div>
                <div><Label htmlFor="asset-draft-brief">{t('Verified facts and instructions')}</Label><Textarea id="asset-draft-brief" rows={3} maxLength={800} disabled={busy} value={brief} onChange={e => setBrief(e.target.value)} /><p className="label-xs mt-1">{t('Add only facts you can verify. Include the offer terms if this is a real promotion.')}</p></div>
                <div><Label htmlFor="asset-draft-cta">{t('Call to action (optional)')}</Label><Input id="asset-draft-cta" maxLength={200} disabled={busy} value={cta} onChange={e => setCta(e.target.value)} /></div>
                <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" disabled={busy} checked={consent} onChange={e => setConsent(e.target.checked)} /><span>{t('I confirm sending the approved analysis and brief to my configured AI provider. Charges may apply. A failed or uncertain request is never retried automatically.')}</span></label>
                <div className="flex flex-wrap justify-end gap-3"><Button variant="outline" disabled={busy} onClick={onClose}>{t('Cancel')}</Button><button type="submit" className="btn-skew" disabled={busy || !consent || !goal.trim()}>{t(busy ? 'Generating draft…' : 'Generate Facebook draft')}</button></div>
            </form> : <div className="space-y-4">
                <div><Label htmlFor="asset-draft-title">{t('Post title (internal)')}</Label><Input id="asset-draft-title" maxLength={200} disabled={busy} value={title} onChange={e => setTitle(e.target.value)} /></div>
                <div><Label htmlFor="asset-draft-caption">{t('Review and edit the Facebook caption')}</Label><Textarea id="asset-draft-caption" rows={9} maxLength={20000} disabled={busy} value={caption} onChange={e => setCaption(e.target.value)} /></div>
                <p className="label-xs break-words">{result.provider} · {result.model}</p>
                <p className="text-sm text-warnFg">{t('Check all facts, offer terms and hashtags. In the editor, select a Facebook Page and review the publishing time before confirming a schedule.')}</p>
                <div className="flex flex-wrap justify-end gap-3"><Button variant="outline" disabled={busy} onClick={() => { setResult(null); setError(''); }}>{t('Change brief')}</Button><button type="button" className="btn-skew" disabled={busy || !title.trim() || !caption.trim()} onClick={save}>{t(busy ? 'Saving…' : 'Save draft and open editor')}</button></div>
            </div>}
        </DialogContent>
    </Dialog>;
}
