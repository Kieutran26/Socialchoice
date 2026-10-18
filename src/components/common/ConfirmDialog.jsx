import { useTranslation } from '@/lib/i18n';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
export default function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirm', onConfirm, destructive }) { const { t } = useTranslation();
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    async function confirm() { setBusy(true); setError(''); try { await onConfirm(); onOpenChange(false); } catch (e) { setError(e.message); } finally { setBusy(false); } }
    return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader><p className="text-sm">{description}</p>{error && <p role="alert" className="text-dangerFg mt-3">{t(error)}</p>}<div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => onOpenChange(false)}>{t("Cancel")}</Button>{destructive ? <Button variant="destructive" disabled={busy} onClick={confirm}>{busy ? t("Saving…") : t(confirmLabel)}</Button> : <button type="button" disabled={busy} onClick={confirm} className="btn-skew">{busy ? t("Saving…") : t(confirmLabel)}</button>}</div></DialogContent></Dialog>;
}
