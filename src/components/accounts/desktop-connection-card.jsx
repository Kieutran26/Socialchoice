import { useEffect, useState } from 'react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

export default function DesktopConnectionCard({ platform, brands, defaultBrandId = '', demoMode, onChanged, onBusyChange }) {
    const { t } = useTranslation();
    const [brandId, setBrandId] = useState(defaultBrandId);
    const [ready, setReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState(null);
    const [selected, setSelected] = useState([]);
    const [busy, setBusy] = useState(false);
    const [signingIn, setSigningIn] = useState(false);
    const [error, setError] = useState('');
    const service = ['facebook', 'instagram'].includes(platform) ? appClient.meta : appClient[platform];
    useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
    useEffect(() => {
        let active = true;
        if (!service) { setReady(false); setLoading(false); return () => { active = false; }; }
        setLoading(true); setError(''); setPending(null); setSelected([]);
        Promise.all([service.status(), platform === 'facebook' || platform === 'instagram' ? service.pages() : service.profile()])
            .then(([health, selection]) => {
                if (!active) return;
                setReady(Boolean(health.platforms ? health.platforms[platform] : health.ready));
                if (selection.pending && selection.platform === platform) { setPending(selection); setBrandId(selection.brandId); }
            }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [platform, service]);
    async function connect() {
        setBusy(true); setSigningIn(true); setError(''); setPending(null); setSelected([]);
        try {
            const result = await (platform === 'facebook' || platform === 'instagram' ? service.start(brandId, platform) : service.start(brandId));
            if (!result.native || !result.pending || result.platform !== platform) throw new Error('Invalid login service response');
            setPending(result); setBrandId(result.brandId);
        } catch (e) { setError(e.message); }
        finally { setBusy(false); setSigningIn(false); }
    }
    async function importAccounts() {
        setBusy(true); setError('');
        try {
            await (platform === 'facebook' || platform === 'instagram' ? service.importPages(selected) : service.importProfile(selected[0]));
            setPending(null); setSelected([]); onChanged();
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }
    return <section className="space-y-4">
        <p className="label-xs">{t('Sign in in your default browser. Tokens stay encrypted on this Windows account and are excluded from backups.')}</p>
        {platform === 'instagram' && <p className="label-xs">{t('Instagram requires a Business or Creator account linked to a Facebook Page.')}</p>}
        {platform === 'tiktok' && <p className="label-xs">{t('TikTok sandbox supports private video posts only. Your TikTok account must be eligible for private testing.')}</p>}
        {loading ? <p role="status" className="label-xs">{t('Checking…')}</p> : !ready && <p role="status" className="text-sm text-warnFg">{t('The desktop login service is not ready. The software owner must configure its address and platform app before connecting.')}</p>}
        {error && <p role="alert" className="text-sm text-dangerFg">{t(error)}</p>}
        <label className="block text-sm">{t('Brand')}
            <select aria-label={t('Channel brand')} value={brandId} onChange={e => { setBrandId(e.target.value); setPending(null); setSelected([]); }} disabled={busy || demoMode} className="border rounded-lg p-2 ml-3">
                <option value="">{t('Choose brand')}</option>
                {brands.filter(brand => !brand.is_demo && brand.status === 'active').map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
        </label>
        <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-skew" disabled={busy || loading || !ready || !brandId || demoMode} onClick={connect}>{t(signingIn ? 'Finish sign-in in your browser…' : 'Connect / reconnect')}</button>
            {signingIn && <Button variant="outline" type="button" onClick={() => appClient.social.cancel().catch(e => setError(e.message))}>{t('Cancel sign-in')}</Button>}
        </div>
        {pending && <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">{t('Choose verified accounts to connect')}</p>
            <p className="label-xs">{pending.profileName} · {brands.find(brand => brand.id === pending.brandId)?.name}</p>
            {!pending.pages.length && <p role="status" className="text-sm">{t('No eligible accounts were returned. Check your account access and granted permissions, then reconnect.')}</p>}
            {pending.pages.map(account => <label key={account.id} className="flex items-center gap-3 text-sm break-words">
                <input type="checkbox" disabled={busy} checked={selected.includes(account.id)} onChange={event => setSelected(ids => event.target.checked ? [...ids, account.id] : ids.filter(id => id !== account.id))} />
                <span>{account.name} · {account.id}{account.pageName && account.pageName !== account.name ? ` · ${account.pageName}` : ''}</span>
            </label>)}
            <Button variant="outline" type="button" disabled={busy || !selected.length || demoMode} onClick={importAccounts}>{t('Connect selected accounts')}</Button>
        </div>}
    </section>;
}
