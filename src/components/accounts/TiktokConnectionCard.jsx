import { useEffect, useState } from 'react';
import { appClient } from '@/api/app-client';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

export default function TiktokConnectionCard({ brands, demoMode, onChanged, defaultBrandId = '', embedded = false, onBusyChange = (_value) => {} }) {
    const { t } = useTranslation();
    const [ready,setReady]=useState(false),[brandId,setBrandId]=useState(defaultBrandId),[profile,setProfile]=useState(null),[selected,setSelected]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
    useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
    useEffect(()=>{let active=true;Promise.all([appClient.tiktok.status(),appClient.tiktok.profile()]).then(([status,pending])=>{if(!active)return;setReady(status.ready);if(pending.pending){setProfile(pending);setBrandId(pending.brandId);}if(pending.failure||new URLSearchParams(location.search).get('tiktok')==='failed')setError('TikTok connection failed. Check sandbox access and reconnect.');}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
    async function connect(){setBusy(true);setError('');try{const result=await appClient.tiktok.start(brandId);window.location.assign(result.url);}catch(e){setError(e.message);setBusy(false);}}
    async function choose(){setBusy(true);try{await appClient.tiktok.importProfile(profile.profile.id);setProfile(null);setSelected(false);onChanged();}catch(e){setError(e.message);}finally{setBusy(false);}}
    return <section className={embedded ? 'space-y-5' : 'panel p-5 mb-5 space-y-3'}>{!embedded && <h2>{t('Connect TikTok sandbox')}</h2>}<p className="label-xs">{t('TikTok sandbox supports private video posts only. Your TikTok account must be eligible for private testing.')}</p>
        {!ready&&<p className="text-sm">{t('Configure TikTok credentials on the server before connecting.')}</p>}
        {error&&<p role="alert" className="text-dangerFg text-sm">{t(error)}</p>}
        <label className="block text-sm">{t('Brand')}<select className="border rounded-lg p-2 ml-3" aria-label={t('TikTok brand')} value={brandId} onChange={e=>setBrandId(e.target.value)} disabled={busy||demoMode}><option value="">{t('Choose brand')}</option>{brands.filter(b=>!b.is_demo&&b.status==='active').map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        {profile ? <Button variant="outline" type="button" disabled={!ready||!brandId||busy||demoMode} onClick={connect}>{t('Connect / reconnect TikTok')}</Button> : <button className="btn-skew" type="button" disabled={!ready||!brandId||busy||demoMode} onClick={connect}>{t('Connect / reconnect TikTok')}</button>}
        {profile&&<div className="border-t pt-3 space-y-3"><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={selected} onChange={e=>setSelected(e.target.checked)} disabled={busy||demoMode}/>{profile.profile.name} · @{profile.profile.username}</label><button className="btn-skew" type="button" disabled={!selected||busy||demoMode} onClick={choose}>{t('Connect selected TikTok account')}</button></div>}
    </section>;
}
