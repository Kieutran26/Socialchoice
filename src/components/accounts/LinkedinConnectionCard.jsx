import { useEffect, useState } from 'react';
import { appClient } from '@/api/app-client';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

export default function LinkedinConnectionCard({ brands, demoMode, onChanged, defaultBrandId = '', embedded = false, onBusyChange = (_value) => { } }) {
    const { t } = useTranslation();
    const [ready, setReady] = useState(false), [brandId, setBrandId] = useState(defaultBrandId), [profile, setProfile] = useState(null), [selected, setSelected] = useState(false), [selectedOrgs, setSelectedOrgs] = useState([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
    useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
    useEffect(() => { let active = true; Promise.all([appClient.linkedin.status(), appClient.linkedin.profile()]).then(([status, pending]) => { if (!active) return; setReady(status.ready); if (pending.pending) { setProfile(pending); setBrandId(pending.brandId); } if (pending.failure || new URLSearchParams(location.search).get('linkedin') === 'failed') setError('LinkedIn connection failed. Check personal profile access and reconnect.'); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
    async function connect() { setBusy(true); setError(''); try { const result = await appClient.linkedin.start(brandId); window.location.assign(result.url); } catch (e) { setError(e.message); setBusy(false); } }
    async function choose() {
        setBusy(true);
        try {
            const ids = [...(selected ? [profile.profile.id] : []), ...selectedOrgs];
            await appClient.linkedin.importProfile(ids.length === 1 ? ids[0] : ids);
            setProfile(null); setSelected(false); setSelectedOrgs([]); onChanged();
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    const toggleOrg = id => setSelectedOrgs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    return <section className={embedded ? 'space-y-5' : 'panel p-5 mb-5 space-y-3'}>{!embedded && <h2>{t('Connect LinkedIn personal profile')}</h2>}<p className="label-xs">{t('Connect your personal LinkedIn profile to publish text, JPEG/PNG images or one MP4 video. Posts are public.')}</p>
        {!ready && <p className="text-sm">{t('Configure LinkedIn credentials on the server before connecting.')}</p>}
        {error && <p role="alert" className="text-dangerFg text-sm">{t(error)}</p>}
        <label className="block text-sm">{t('Brand')}<select className="border rounded-lg p-2 ml-3" aria-label={t('LinkedIn brand')} value={brandId} onChange={e => setBrandId(e.target.value)} disabled={busy || demoMode}><option value="">{t('Choose brand')}</option>{brands.filter(b => !b.is_demo && b.status === 'active').map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        {profile ? <Button variant="outline" type="button" disabled={!ready || !brandId || busy || demoMode} onClick={connect}>{t('Connect / reconnect LinkedIn')}</Button> : <button className="btn-skew" type="button" disabled={!ready || !brandId || busy || demoMode} onClick={connect}>{t('Connect / reconnect LinkedIn')}</button>}
        {profile && <div className="border-t pt-3 space-y-3">
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={selected} onChange={e => setSelected(e.target.checked)} disabled={busy || demoMode} /><span>{profile.profile.username}</span><span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{t('Personal Profile')}</span></label>
            {Array.isArray(profile.organizations) && profile.organizations.map(org => (
                <label key={org.id} className="flex items-center gap-3 text-sm">
                    <input type="checkbox" checked={selectedOrgs.includes(org.id)} onChange={() => toggleOrg(org.id)} disabled={busy || demoMode} />
                    <span>{org.name}</span>
                    <span className="rounded bg-[#0a66c2]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#0a66c2]">{t('Company Page')}</span>
                </label>
            ))}
            <button className="btn-skew" type="button" disabled={(!selected && !selectedOrgs.length) || busy || demoMode} onClick={choose}>{t('Connect selected LinkedIn account')}</button>
        </div>}
    </section>;
}
