import { useEffect, useState } from 'react';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PostizConnectionCard({ brands, defaultBrandId, demoMode, onChanged }) {
    const { t } = useTranslation();
    const [ready, setReady] = useState(false), [channels, setChannels] = useState([]);
    const [selected, setSelected] = useState([]), [brandId, setBrandId] = useState(defaultBrandId || '');
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    useEffect(() => { setBrandId(defaultBrandId || ''); }, [defaultBrandId]);
    useEffect(() => {
        if (isDesktop() || demoMode) return;
        let active = true;
        appClient.postiz.status().then(status => { if (active) setReady(status.ready); }).catch(() => {});
        return () => { active = false; };
    }, [demoMode]);
    if (!ready || demoMode || isDesktop()) return null;
    async function load() {
        setBusy(true); setError('');
        try { const result = await appClient.postiz.channels(); setChannels(result.channels); setSelected([]); }
        catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }
    async function importChannels() {
        setBusy(true); setError('');
        try { await appClient.postiz.importChannels(brandId, selected); setSelected([]); await onChanged(); }
        catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }
    return <section className="panel p-5 space-y-4 mb-6" aria-label={t('Postiz channels')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-base">{t('Postiz channels')}</h2><p className="text-sm text-muted-foreground">{t('Import connected Facebook Pages from Postiz into a brand.')}</p></div>
            <Button variant="outline" disabled={busy} onClick={load}>{t(busy ? 'Loading…' : 'Load Postiz channels')}</Button>
        </div>
        {!!channels.length && <>
            <div className="max-w-sm"><Label className="label-xs mb-1.5 block">{t('Brand')}</Label><Select value={brandId} onValueChange={setBrandId} disabled={busy}><SelectTrigger aria-label={t('Brand')}><SelectValue placeholder={t('Select brand')} /></SelectTrigger><SelectContent>{brands.filter(brand => !brand.is_demo && brand.status === 'active').map(brand => <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-3">{channels.map(channel => <label key={channel.id} className="flex items-center gap-3 text-sm"><input type="checkbox" disabled={busy || channel.disabled} checked={selected.includes(channel.id)} onChange={event => setSelected(ids => event.target.checked ? [...ids, channel.id] : ids.filter(id => id !== channel.id))} />{channel.name}{channel.disabled && <span className="text-muted-foreground">{t('Disconnected')}</span>}</label>)}</div>
            <Button disabled={busy || !brandId || !selected.length} onClick={importChannels}>{t('Import selected channels')}</Button>
        </>}
        {error && <p role="alert" className="text-sm text-destructive">{t(error)}</p>}
    </section>;
}
