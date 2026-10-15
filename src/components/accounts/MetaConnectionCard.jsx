import { useEffect, useState } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';
import { appClient } from '@/api/app-client';
import { Button } from '@/components/ui/button';

const connectionSteps = { code_exchange: 'Confirming Facebook sign-in', token_exchange: 'Preparing Facebook access', profile: 'Reading Facebook profile', permissions: 'Checking Facebook permissions', pages: 'Loading Facebook Pages', connection: 'Completing Facebook connection' };
const connectionReasons = { timeout: 'Meta request timed out', network: 'Cannot reach Meta', response_format: 'Unexpected Meta response', redirect: 'Unexpected Meta response' };

export default function MetaConnectionCard({ onAddManually, brands = [], defaultBrandId = '', onChanged = () => {}, demoMode = false }) {
    const { t } = useTranslation();
    const [status, setStatus] = useState(null);
    const [threadsStatus,setThreadsStatus]=useState(null);
    const [selection, setSelection] = useState(null);
    const [brandId, setBrandId] = useState(defaultBrandId);
    const [selected, setSelected] = useState([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [platform, setPlatform] = useState('facebook');
    useEffect(() => { setBrandId(defaultBrandId); }, [defaultBrandId]);
    useEffect(() => {
        let active = true;
        Promise.all([appClient.meta.status(), appClient.meta.pages(),appClient.threads.status(),appClient.threads.profile()]).then(([health, pages,threadsHealth,profile]) => {
            if (active) {
                setStatus(health);setThreadsStatus(threadsHealth);
                const threadsFlow=new URLSearchParams(window.location.search).has('threads');
                setSelection(threadsFlow ? {...profile,pages:profile.profile?[{...profile.profile,name:profile.profile.username}]:[]} : pages);
                if(threadsFlow)setPlatform('threads');
            }
        }).catch(e => { if (active) setError(e.message); });
        const result = new URLSearchParams(window.location.search).get('meta');
        if (result === 'failed') setError('Facebook connection failed. Check Meta app configuration and permissions, then try again.');
        if (result === 'cancelled') setError('Facebook connection cancelled.');
        const threadsResult=new URLSearchParams(window.location.search).get('threads');
        if(threadsResult==='failed')setError('Threads connection failed. Check app configuration and permissions.');
        if(threadsResult==='cancelled')setError('Threads connection cancelled.');
        return () => { active = false; };
    }, []);
    async function connect() {
        setBusy(true); setError('');
        try { const result = await (platform==='threads'?appClient.threads.start(brandId):appClient.meta.start(brandId, platform)); window.location.assign(result.url); }
        catch (e) { setError(e.message); setBusy(false); }
    }
    async function importPages() {
        setBusy(true); setError('');
        try { await (selection.platform==='threads'?appClient.threads.importProfile(selected[0]):appClient.meta.importPages(selected)); setSelection(null); setSelected([]); onChanged(); }
        catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }
    return <section className="panel mb-5 p-5"><div className="flex gap-3"><WarningCircle size={22} className="text-warnFg shrink-0" /><div className="flex-1">
        <h2 className="text-base">{t('Connect Facebook, Instagram and Threads')}</h2>
        <p className="label-xs mt-2">{t('Choose a platform and authorize it on its official sign-in page. Instagram requires a professional account linked to a Facebook Page.')}</p>
        {!status?.ready && <p className="label-xs mt-2">{t('Configure the Meta App on the server first. Never enter a Facebook password here.')}</p>}
        {platform==='threads' && <p className="label-xs mt-2">{t(threadsStatus?.ready?'Threads uses its own sign-in and permission grant. Select only the profile you want to connect.':'Threads setup is required on the server before connecting. Its app credentials are separate from Facebook and Instagram.')}</p>}
        {error && <p role="alert" className="text-sm text-dangerFg mt-3">{t(error)}</p>}
        {selection?.failure && <p role="alert" className="text-sm text-dangerFg mt-2">{t('Connection diagnostic')}: {t(connectionSteps[selection.failure.step] || connectionSteps.connection)} · {selection.failure.code ?? '—'}{selection.failure.subcode !== undefined ? ` / ${selection.failure.subcode}` : ''}</p>}
        {selection?.failure?.reason && <p className="text-sm text-dangerFg mt-1">{t(connectionReasons[selection.failure.reason])} · HTTP {selection.failure.httpStatus ?? '—'}</p>}
        <div className="flex flex-wrap items-center gap-3 mt-4">
            <select aria-label={t('Connection platform')} value={platform} onChange={e => setPlatform(e.target.value)} className="border rounded-lg p-2 text-sm" disabled={busy || demoMode}>
                <option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="threads">Threads</option>
            </select>
            <select aria-label={t('Brand for Facebook Pages')} value={brandId} onChange={e => setBrandId(e.target.value)} className="border rounded-lg p-2 text-sm" disabled={busy || demoMode}>
                <option value="">{t('Choose brand')}</option>{brands.filter(b => !b.is_demo && b.status === 'active').map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <Button onClick={connect} disabled={busy || !(platform==='threads'?threadsStatus?.ready:status?.ready) || !brandId || demoMode}>{t(platform === 'threads'?'Connect / reconnect Threads':platform === 'instagram' ? 'Connect / reconnect Instagram' : 'Connect / reconnect Facebook')}</Button>
            <button onClick={onAddManually} className="border rounded-lg px-3 py-2 text-xs">{t('Add a destination reference')}</button>
        </div>
        {selection?.pending && <div className="border-t mt-5 pt-4">
            <h3 className="text-sm font-medium">{t(selection.platform==='threads'?'Choose the Threads profile to connect':selection.platform === 'instagram' ? 'Choose Instagram accounts to connect' : 'Choose Pages to connect')}</h3>
            <p className="label-xs mt-1">{selection.profileName} · {brands.find(b => b.id === selection.brandId)?.name}</p>
            {!selection.pages.length && <p className="text-sm mt-3">{t(selection.platform === 'instagram' ? 'No linked Instagram professional accounts were returned. Link a Business or Creator account to your Facebook Page and grant Instagram permissions.' : 'Facebook returned no accessible Pages. Check Page access and granted permissions.')}</p>}
            <div className="space-y-2 mt-3">{selection.pages.map(page => <label key={page.id} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={selected.includes(page.id)} onChange={e => setSelected(ids => e.target.checked ? [...ids, page.id] : ids.filter(id => id !== page.id))} />{page.name} · {page.username ? '@' + page.username : page.id}{page.pageName ? ' · ' + page.pageName : ''}</label>)}</div>
            <Button onClick={importPages} className="mt-4" disabled={busy || !selected.length || demoMode}>{t(selection.platform==='threads'?'Connect selected Threads profile':selection.platform === 'instagram' ? 'Connect selected Instagram accounts' : 'Connect selected Pages')}</Button>
        </div>}
    </div></div></section>;
}
