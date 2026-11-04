import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, ArrowClockwise } from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { buildUtmCaptions, linkFormSnapshot } from '@/lib/utm-links';
import { formatNumber, formatDateTime, formatCalendarDate } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function UtmLinkBuilder({ form, accounts, setForm, disabled = false }) {
    const { t } = useTranslation();
    const [options, setOptions] = useState({ source: '', medium: 'social', campaign: '', content: '', term: '', tracking: false, replace: false });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [links, setLinks] = useState([]);
    const [statsBusy, setStatsBusy] = useState(false);
    const [statsLoaded, setStatsLoaded] = useState(false);
    const latest = useRef(form);
    latest.current = form;
    const brandId = form.brand_id;
    const preview = useMemo(() => {
        try { return { result: buildUtmCaptions(form, accounts, options, undefined, window.location.origin) }; }
        catch (cause) { return { error: cause.message }; }
    }, [form, accounts, options]);
    useEffect(() => { setLinks([]); setStatsLoaded(false); setError(''); setNotice(''); }, [brandId]);
    const refresh = async () => {
        const brand = brandId;
        setStatsBusy(true); setError('');
        try {
            const result = await appClient.links.list({ brand_id: brand });
            if (latest.current.brand_id === brand) { setLinks(result.links); setStatsLoaded(true); }
        } catch { if (latest.current.brand_id === brand) setError(t('Could not load link statistics. Try again.')); }
        finally { setStatsBusy(false); }
    };
    const apply = async () => {
        const snapshot = linkFormSnapshot(form);
        setBusy(true); setError(''); setNotice('');
        try {
            const result = await appClient.links.build({ brand_id: brandId, form, options });
            if (linkFormSnapshot(latest.current) !== snapshot) {
                setError(t('The caption or destinations changed. Review the preview and apply again.'));
                return;
            }
            setForm(current => {
                if (linkFormSnapshot(current) !== snapshot) return current;
                const destination_settings = { ...current.destination_settings };
                for (const [id, caption] of Object.entries(result.destination_captions || {})) {
                    destination_settings[id] = { ...destination_settings[id], caption };
                }
                return { ...current, caption: result.caption, platform_captions: result.platform_captions, destination_settings };
            });
            setNotice(t('Links applied to this draft. No post was published.'));
        } catch { setError(t('Could not build links. Check the UTM values and try again.')); }
        finally { setBusy(false); }
    };
    const disable = async id => {
        const brand = brandId;
        setStatsBusy(true); setError('');
        try {
            await appClient.links.disable({ brand_id: brand, id });
            if (latest.current.brand_id === brand) setLinks(current => current.map(link => link.id === id ? { ...link, active: false } : link));
        } catch { if (latest.current.brand_id === brand) setError(t('Could not disable this link. Try again.')); }
        finally { setStatsBusy(false); }
    };
    return <section className="panel p-5 space-y-4 min-w-0">
        <h2 className="text-[15px] flex items-center gap-2"><Link size={18} />{t('UTM builder and link tracking')}</h2>
        <p className="label-xs">{t('Tag links in captions before applying. A blank source uses each destination platform. Existing UTM values are kept by default.')}</p>
        <fieldset disabled={disabled || busy} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries({ source: 'Source (optional)', medium: 'Medium', campaign: 'Campaign', content: 'Content tag (optional)', term: 'Term (optional)' }).map(([key, label]) => <div key={key}>
                    <Label htmlFor={`utm-${key}`} className="label-xs mb-1.5 block">{t(label)}</Label>
                    <Input id={`utm-${key}`} maxLength={200} value={options[key]} onChange={event => setOptions(current => ({ ...current, [key]: event.target.value }))} />
                </div>)}
            </div>
            <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={options.tracking} onChange={event => setOptions(current => ({ ...current, tracking: event.target.checked }))} /><span>{t('Use tracked redirect links')}</span></label>
            <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={options.replace} onChange={event => setOptions(current => ({ ...current, replace: event.target.checked }))} /><span>{t('Replace existing UTM values')}</span></label>
        </fieldset>
        <div className="space-y-2 text-xs" aria-live="polite">
            <h3 className="text-sm">{t('Link preview')}</h3>
            {preview.error ? <p className="label-xs">{t(preview.error)}</p> : !preview.result.links.length ? <p className="label-xs">{t('Add a public HTTP or HTTPS link to a caption to preview it.')}</p> : preview.result.links.map((link, index) => <div key={index} className="border rounded-lg p-3 space-y-1 break-words min-w-0">
                <p>{accounts.find(account => account.id === link.accountId)?.name || link.platform}</p>
                <p className="text-muted-foreground">{link.original}</p><p>{link.tagged}</p>
            </div>)}
            {options.tracking && <p className="label-xs">{t('Tracked redirect URLs are created when you apply. The preview shows their destinations.')}</p>}
        </div>
        <Button type="button" variant="outline" disabled={disabled || busy || !brandId || !!preview.error || !preview.result?.links.length} onClick={apply}>{t(busy ? 'Applying links…' : 'Apply links to draft')}</Button>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        {notice && <p role="status" className="label-xs">{notice}</p>}
        <div className="border-t pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm">{t('Tracked links for this brand')}</h3><Button type="button" variant="ghost" size="sm" onClick={refresh} disabled={!brandId || statsBusy}><ArrowClockwise size={16} className="mr-2" />{t(statsBusy ? 'Loading…' : 'Refresh statistics')}</Button></div>
            <p className="label-xs">{t('Counts are redirect requests, not unique people. Known bots and prefetch requests are excluded heuristically; counts can still include automated traffic.')}</p>
            {!links.length && <p className="label-xs">{t(statsLoaded ? 'No tracked links for this brand yet.' : 'Refresh to load tracked links for this brand.')}</p>}
            {links.map(link => <div key={link.id} className="border rounded-lg p-3 space-y-2 min-w-0 text-xs">
                <p className="break-words">{link.url}</p><p className="break-words text-muted-foreground">{link.target}</p>
                <p>{link.campaign} · {link.platform} · {t('Requests')}: {formatNumber(link.clicks)} · {t('Last request')}: {formatDateTime(link.last_click)}</p>
                {!!link.days?.length && <details><summary className="cursor-pointer">{t('Daily requests (UTC)')}</summary><ul className="space-y-1 mt-2">{link.days.map(day => <li key={day.day}>{formatCalendarDate(day.day)}: {formatNumber(day.clicks)}</li>)}</ul></details>}
                <Button type="button" variant="outline" size="sm" onClick={() => disable(link.id)} disabled={statsBusy || !link.active}>{t(link.active ? 'Disable tracking link' : 'Link disabled')}</Button>
            </div>)}
        </div>
    </section>;
}



