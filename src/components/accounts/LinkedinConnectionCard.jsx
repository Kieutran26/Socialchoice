import { useEffect, useState } from 'react';
import { appClient } from '@/api/app-client';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

export default function LinkedinConnectionCard({ brands, demoMode, onChanged, defaultBrandId = '', embedded = false, mode = 'all', onBusyChange = (_value) => { } }) {
    const { t } = useTranslation();
    const isPageMode = mode === 'page';
    const isProfileMode = mode === 'profile';
    const [ready, setReady] = useState(false), [brandId, setBrandId] = useState(defaultBrandId), [profile, setProfile] = useState(null), [selected, setSelected] = useState(!isPageMode), [selectedOrgs, setSelectedOrgs] = useState([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
    useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
    useEffect(() => { if (defaultBrandId && !brandId) setBrandId(defaultBrandId); }, [defaultBrandId, brandId]);
    useEffect(() => {
        let active = true;
        Promise.all([appClient.linkedin.status(), appClient.linkedin.profile()]).then(([status, pending]) => {
            if (!active) return;
            setReady(status.ready);
            if (pending.brandId) setBrandId(pending.brandId);
            if (pending.pending) {
                setProfile(pending);
                if (isPageMode) {
                    setSelected(false);
                    if (Array.isArray(pending.organizations) && pending.organizations.length > 0) {
                        setSelectedOrgs(pending.organizations.map(o => o.id));
                    }
                } else if (isProfileMode) {
                    setSelected(true);
                    setSelectedOrgs([]);
                } else {
                    setSelected(true);
                }
            }
            if (pending.failure || new URLSearchParams(location.search).get('linkedin') === 'failed') {
                setError('LinkedIn connection failed. Check account access and reconnect.');
            }
        }).catch(e => { if (active) setError(e.message); });
        return () => { active = false; };
    }, [isPageMode, isProfileMode]);
    async function connect() { setBusy(true); setError(''); try { const result = await appClient.linkedin.start(brandId); window.location.assign(result.url); } catch (e) { setError(e.message); setBusy(false); } }
    async function choose() {
        setBusy(true);
        try {
            const ids = [...(selected ? [profile.profile.id] : []), ...selectedOrgs];
            await appClient.linkedin.importProfile(ids.length === 1 ? ids[0] : ids);
            setProfile(null); setSelected(!isPageMode); setSelectedOrgs([]); onChanged();
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    const toggleOrg = id => setSelectedOrgs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    return <section className={embedded ? 'space-y-5' : 'panel p-5 mb-5 space-y-3'}>
        {!embedded && <h2>{isPageMode ? t('Connect LinkedIn Company Page') : t('Connect LinkedIn personal profile')}</h2>}
        <p className="label-xs">
            {isPageMode
                ? t('Connect your company LinkedIn page to publish updates, articles, and media on behalf of your organization. You must be a Super Admin or Content Admin of the page.')
                : t('Connect your personal LinkedIn profile to publish text, JPEG/PNG images or one MP4 video. Posts are public.')}
        </p>
        {!ready && <p className="text-sm">{t('Configure LinkedIn credentials on the server before connecting.')}</p>}
        {error && <p role="alert" className="text-dangerFg text-sm">{t(error)}</p>}
        <label className="block text-sm">{t('Brand')}<select className="border rounded-lg p-2 ml-3" aria-label={t('LinkedIn brand')} value={brandId} onChange={e => setBrandId(e.target.value)} disabled={busy || demoMode}><option value="">{t('Choose brand')}</option>{brands.filter(b => !b.is_demo && b.status === 'active').map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        {profile ? <Button variant="outline" type="button" disabled={!ready || !brandId || busy || demoMode} onClick={connect}>{t('Connect / reconnect LinkedIn')}</Button> : <button className="btn-skew" type="button" disabled={!ready || !brandId || busy || demoMode} onClick={connect}>{t('Connect / reconnect LinkedIn')}</button>}
        {profile && <div className="border-t pt-3 space-y-3">
            {(!isPageMode || (!Array.isArray(profile.organizations) || profile.organizations.length === 0)) && (
                <label className="flex items-center gap-3 text-sm">
                    <input type="checkbox" checked={selected} onChange={e => setSelected(e.target.checked)} disabled={busy || demoMode} />
                    <span>{profile.profile.username}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{t('Personal Profile')}</span>
                </label>
            )}
            {Array.isArray(profile.organizations) && profile.organizations.length > 0 ? (
                profile.organizations.map(org => (
                    <label key={org.id} className="flex items-center gap-3 text-sm">
                        <input type="checkbox" checked={selectedOrgs.includes(org.id)} onChange={() => toggleOrg(org.id)} disabled={busy || demoMode} />
                        <span className="font-medium">{org.name}</span>
                        <span className="rounded bg-[#0a66c2]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#0a66c2]">{t('Company Page')}</span>
                    </label>
                ))
            ) : isPageMode ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                    <p className="font-semibold">{t('Không tìm thấy Company Page được quản lý:')}</p>
                    <p>{t('Tài khoản LinkedIn cá nhân của bạn hiện chưa được phân quyền Quản trị viên (Admin) cho Trang công ty nào trên LinkedIn. Hãy đảm bảo bạn là Super Admin hoặc Content Admin của trang cần kết nối.')}</p>
                </div>
            ) : null}
            <button className="btn-skew" type="button" disabled={(!selected && !selectedOrgs.length) || busy || demoMode} onClick={choose}>{t('Connect selected LinkedIn account')}</button>
        </div>}
    </section>;
}
