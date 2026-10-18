import { useState } from 'react';
import { CopySimple } from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { templateDataFromForm } from '@/lib/post-templates';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function SaveTemplateDialog({ form, demoMode, disabled }) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [open, setOpen] = useState(false), [name, setName] = useState('');
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    async function save(event) {
        event.preventDefault(); setBusy(true); setError('');
        try {
            await appClient.templates.save({ name: name.trim(), data: templateDataFromForm(form, demoMode) });
            setOpen(false); toast({ title: t('Template saved'), description: t('Find it under Post templates. The current post is unchanged.') });
        } catch (failure) { setError(failure.message); }
        finally { setBusy(false); }
    }
    return <>
        <Button variant="outline" size="sm" disabled={disabled || !form.brand_id} onClick={() => { setName(form.title || ''); setError(''); setOpen(true); }}>
            <CopySimple size={16} weight="duotone" />{t('Save as template')}
        </Button>
        <Dialog open={open} onOpenChange={value => !busy && setOpen(value)}><DialogContent>
            <DialogHeader><DialogTitle>{t('Save as template')}</DialogTitle></DialogHeader>
            <p className="label-xs mb-4">{t('Save captions, shared and platform media, accounts and content strategy. Publishing times and TikTok choices are not saved.')}</p>
            <form onSubmit={save} className="space-y-4">
                <label className="block text-xs">{t('Template name')}<Input className="mt-2" required maxLength={160} value={name} onChange={event => setName(event.target.value)} disabled={busy} /></label>
                {error && <p role="alert" className="text-sm text-dangerFg">{t(error)}</p>}
                <div className="flex justify-end gap-3"><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>{t('Cancel')}</Button><button type="submit" className="btn-skew" disabled={busy || !name.trim()}>{t(busy ? 'Saving…' : 'Save template')}</button></div>
            </form>
        </DialogContent></Dialog>
    </>;
}
