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
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200 space-y-1">
            <p className="font-semibold">{t('💡 Hướng dẫn kết nối TikTok chế độ Thử nghiệm (Sandbox):')}</p>
            <p>{t('Nếu gặp lỗi')} <strong className="font-mono text-red-600 dark:text-red-400">non_sandbox_target</strong>: {t('Tài khoản TikTok của bạn chưa được cấp quyền test ứng dụng này. Hãy truy cập')} <a href="https://developers.tiktok.com/" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-amber-950">{t('TikTok for Developers')}</a> {t('→ Manage Apps → chọn App của bạn → Sandbox → mục Target Accounts (hoặc Add Test Accounts) → thêm @username TikTok của bạn vào.')}</p>
        </div>
        {error&&<p role="alert" className="text-dangerFg text-sm">{t(error)}</p>}
        <label className="block text-sm">{t('Brand')}<select className="border rounded-lg p-2 ml-3" aria-label={t('TikTok brand')} value={brandId} onChange={e=>setBrandId(e.target.value)} disabled={busy||demoMode}><option value="">{t('Choose brand')}</option>{brands.filter(b=>!b.is_demo&&b.status==='active').map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        {profile ? <Button variant="outline" type="button" disabled={!ready||!brandId||busy||demoMode} onClick={connect}>{t('Connect / reconnect TikTok')}</Button> : <button className="btn-skew" type="button" disabled={!ready||!brandId||busy||demoMode} onClick={connect}>{t('Connect / reconnect TikTok')}</button>}
        {profile&&<div className="border-t pt-3 space-y-3"><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={selected} onChange={e=>setSelected(e.target.checked)} disabled={busy||demoMode}/>{profile.profile.name} · @{profile.profile.username}</label><button className="btn-skew" type="button" disabled={!selected||busy||demoMode} onClick={choose}>{t('Connect selected TikTok account')}</button></div>}
    </section>;
}
