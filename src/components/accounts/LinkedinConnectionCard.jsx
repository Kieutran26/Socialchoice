import { useEffect, useState } from 'react';
import { appClient } from '@/api/app-client';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

export default function LinkedinConnectionCard({ brands, demoMode, onChanged }) {
    const { t } = useTranslation();
    const [ready,setReady]=useState(false),[brandId,setBrandId]=useState(''),[profile,setProfile]=useState(null),[selected,setSelected]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
    useEffect(()=>{let active=true;Promise.all([appClient.linkedin.status(),appClient.linkedin.profile()]).then(([status,pending])=>{if(!active)return;setReady(status.ready);if(pending.pending){setProfile(pending);setBrandId(pending.brandId);}if(pending.failure||new URLSearchParams(location.search).get('linkedin')==='failed')setError('LinkedIn connection failed. Check personal profile access and reconnect.');}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
    async function connect(){setBusy(true);setError('');try{const result=await appClient.linkedin.start(brandId);window.location.assign(result.url);}catch(e){setError(e.message);setBusy(false);}}
    async function choose(){setBusy(true);try{await appClient.linkedin.importProfile(profile.profile.id);setProfile(null);setSelected(false);onChanged();}catch(e){setError(e.message);}finally{setBusy(false);}}
    return <section className="panel p-5 mb-5 space-y-3"><h2>{t('Connect LinkedIn personal profile')}</h2><p className="label-xs">{t('Connect your personal LinkedIn profile to publish text, JPEG/PNG images or one MP4 video. Posts are public.')}</p>
        {!ready&&<p className="text-sm">{t('Configure LinkedIn credentials on the server before connecting.')}</p>}
        {error&&<p role="alert" className="text-dangerFg text-sm">{t(error)}</p>}
        <label className="block text-sm">{t('Brand')}<select className="border rounded-lg p-2 ml-3" aria-label={t('LinkedIn brand')} value={brandId} onChange={e=>setBrandId(e.target.value)} disabled={busy||demoMode}><option value="">{t('Choose brand')}</option>{brands.filter(b=>!b.is_demo&&b.status==='active').map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <Button disabled={!ready||!brandId||busy||demoMode} onClick={connect}>{t('Connect / reconnect LinkedIn')}</Button>
        {profile&&<div className="border-t pt-3 space-y-3"><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={selected} onChange={e=>setSelected(e.target.checked)} disabled={busy||demoMode}/>{profile.profile.username}</label><Button disabled={!selected||busy||demoMode} onClick={choose}>{t('Connect selected LinkedIn account')}</Button></div>}
    </section>;
}
