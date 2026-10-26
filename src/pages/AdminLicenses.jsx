import { useEffect, useState } from 'react';
import { DownloadSimple, Key } from '@phosphor-icons/react';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { appClient } from '@/api/app-client';
import PageHeader from '@/components/common/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import LicenseCustomerHistory from '@/components/licenses/license-customer-history';

function downloadLicense(item) {
    const url = URL.createObjectURL(new Blob([item.token + '\n'], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `socialchoice-${item.license_id}.scweblicense`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

function OwnerLicenseManager() {
    const { t } = useTranslation();
    const [email, setEmail] = useState(''), [name, setName] = useState(''), [edition, setEdition] = useState('starter');
    const [confirmed, setConfirmed] = useState(false), [requestId, setRequestId] = useState(() => crypto.randomUUID());
    const [ready, setReady] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
    const [items, setItems] = useState([]), [result, setResult] = useState(null), [error, setError] = useState('');
    const [revokeTarget, setRevokeTarget] = useState(null), [refreshing, setRefreshing] = useState(false);
    async function refresh() {
        setRefreshing(true); setError('');
        try { setItems((await appClient.licenses.list()).items); } catch (e) { setError(e.message); } finally { setRefreshing(false); }
    }
    useEffect(() => {
        let cancelled = false;
        Promise.all([appClient.licenses.status(), appClient.licenses.list()]).then(([status, history]) => {
            if (!cancelled) { setReady(status.ready); setItems(history.items); }
        }).catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);
    function change(setter, value) { setter(value); setConfirmed(false); setResult(null); setError(''); setRequestId(crypto.randomUUID()); }
    async function issue(event) {
        event.preventDefault(); if (busy || !confirmed || !ready) return;
        setBusy(true); setError('');
        try {
            const issued = await appClient.licenses.issue({ requestId, email, licensedTo: name, edition, purchaseConfirmed: confirmed });
            setResult(issued); setConfirmed(false);
            setItems((await appClient.licenses.list()).items);
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    async function redownload(item) {
        setBusy(true); setError('');
        try { downloadLicense(await appClient.licenses.download(item.request_id)); } catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    async function revoke() {
        setBusy(true);
        try {
            const revoked = await appClient.licenses.revoke({ requestId: revokeTarget.request_id, confirmed: true });
            setItems(previous => previous.map(item => item.request_id === revoked.request_id ? { ...item, ...revoked } : item));
            if (result?.request_id === revoked.request_id) setResult(null);
        } finally { setBusy(false); }
    }
    return <>
        <PageHeader title={t('License management')} description={t('Issue an account license after verifying the customer purchase. Each account can use multiple devices.')} />
        {error && <p role="alert" className="mb-5 text-sm text-destructive">{t(error)}</p>}
        {loading ? <p role="status" className="text-sm text-muted-foreground">{t('Loading…')}</p> : <div className="grid min-w-0 gap-5">
            <section className="panel min-w-0 p-5 space-y-4">
                <h2 className="text-[15px]">{t('Issue a web license')}</h2>
                {!ready && <p role="status" className="text-sm text-muted-foreground">{t('Web license signing is not configured')}</p>}
                <form className="space-y-4" onSubmit={issue}>
                    <div><label htmlFor="license-email" className="label-xs mb-1.5 block">{t('Customer email')}</label><Input id="license-email" type="email" maxLength={254} required value={email} disabled={busy || refreshing} onChange={e => change(setEmail, e.target.value)} /></div>
                    <div><label htmlFor="license-name" className="label-xs mb-1.5 block">{t('Customer name or order label')}</label><Input id="license-name" maxLength={160} required value={name} disabled={busy || refreshing} onChange={e => change(setName, e.target.value)} /></div>
                    <div><label htmlFor="license-edition" className="label-xs mb-1.5 block">{t('Edition')}</label><select id="license-edition" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={edition} disabled={busy || refreshing} onChange={e => change(setEdition, e.target.value)}>{['starter', 'professional', 'business'].map(value => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}</select></div>
                    <p className="text-xs text-muted-foreground">{t('All three editions currently have the same features. Prices and separate limits have not been configured.')}</p>
                    <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" required checked={confirmed} disabled={busy || refreshing || !ready} onChange={e => setConfirmed(e.target.checked)} /><span>{t('I have verified payment for this customer. This action does not collect payment.')}</span></label>
                    <button className="btn-skew" type="submit" disabled={busy || refreshing || !ready || !confirmed}><Key size={16} weight="duotone" />{t(busy ? 'Issuing…' : 'Create license')}</button>
                </form>
                {result && <div role="status" className="space-y-3 border-t pt-4 text-sm">
                    <p>{t('License created. Send only the downloaded license file to the customer.')}</p>
                    <p className="break-words">{result.email} · {result.edition}</p>
                    <Button variant="outline" disabled={busy || refreshing} onClick={() => redownload(result)}><DownloadSimple size={16} />{t('Download license')}</Button>
                    <p className="text-xs text-muted-foreground">{t('The customer activates with this email and chooses their own password. Ask them to save the recovery code.')}</p>
                </div>}
            </section>
            <LicenseCustomerHistory items={items} busy={busy || refreshing} refreshing={refreshing} onRefresh={refresh} onDownload={redownload} onRevoke={setRevokeTarget} />
        </div>}
        <ConfirmDialog key={revokeTarget?.request_id || 'none'} open={!!revokeTarget} onOpenChange={open => { if (!open) setRevokeTarget(null); }} title={t('Revoke license')} description={t('Revoke the license for {email}? Sign-in, activation and further publishing will be blocked. Customer data stays stored. Requests already sent to a platform may finish.', { email: revokeTarget?.email || '' })} confirmLabel="Revoke license" destructive onConfirm={revoke} />
    </>;
}

export default function AdminLicenses() {
    const { user } = useAuth(), { t } = useTranslation();
    if (user?.role !== 'admin' || user?.mode !== 'admin-session') return <p role="alert" className="text-sm">{t('Site owner access required')}</p>;
    return <OwnerLicenseManager />;
}
