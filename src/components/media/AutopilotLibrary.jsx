import { useCallback, useEffect, useRef, useState } from 'react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { formatBytes, formatDay } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';

export default function AutopilotLibrary({ brandId }) {
    const { t } = useTranslation();
    const [status, setStatus] = useState(null), [data, setData] = useState(null);
    const [kind, setKind] = useState('drive'), [name, setName] = useState(''), [folder, setFolder] = useState('');
    const [search, setSearch] = useState(''), [offset, setOffset] = useState(0);
    const [error, setError] = useState(''), [busy, setBusy] = useState(false), [confirmation, setConfirmation] = useState(null);
    const version = useRef(0);
    const load = useCallback(async () => {
        const current = ++version.current;
        try {
            const readiness = await appClient.autopilot.call('status');
            if (current !== version.current) return;
            setStatus(readiness);
            if (!readiness.ready || !brandId) { setData(null); return; }
            const result = await appClient.autopilot.call('list', { brand_id: brandId, search, offset });
            if (current === version.current) setData(result);
        } catch (e) { if (current === version.current) setError(e.message); }
    }, [brandId, search, offset]);
    useEffect(() => { setData(null); setError(''); const timer = setTimeout(load, 250); return () => { clearTimeout(timer); version.current++; }; }, [load]);
    useEffect(() => { setOffset(0); setConfirmation(null); }, [brandId, search]);
    const action = async (operation, input = {}) => {
        setBusy(true); setError('');
        try {
            const result = await appClient.autopilot.call(operation, input);
            if (result.backgroundQueued === false) setError('Background dispatch failed. The job is saved; process it manually or retry dispatch.');
            if (operation === 'connect' && result.url) { window.location.assign(result.url); return; }
            if (operation === 'createSource') { setName(''); setFolder(''); }
            await load();
        } catch (e) { setError(e.message); throw e; }
        finally { setBusy(false); }
    };
    const click = (operation, input = {}) => { action(operation, input).catch(() => {}); };
    if (!status && !error) return <Skeleton className="h-12 mb-5 rounded-2xl" />;
    if (status && !status.enabled) return null;
    return <section className="panel p-4 mb-5 space-y-4" aria-label={t('Autopilot Asset Library')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-heading">{t('Autopilot Asset Library')}</h2>
            <Button variant="outline" disabled={busy} onClick={load}>{t('Refresh')}</Button>
        </div>
        <p className="label-xs">{t('Original files stay in Drive or Storage. Sync imports metadata. AI analysis requires your confirmation and human review; it never publishes.')}</p>
        {error && <p role="alert" className="text-sm text-dangerFg break-words">{t(error)}</p>}
        {!status?.ready ? <p className="text-sm">{t('Autopilot requires server encryption configuration.')}</p> : !brandId ? <p className="text-sm">{t('Choose a brand below to manage its sources.')}</p> : <>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); click('createSource', { brand_id: brandId, kind, name, folder }); }}>
                <div><Label htmlFor="autopilot-kind">{t('Source type')}</Label><select id="autopilot-kind" className="border rounded-lg p-2 w-full text-sm mt-1" disabled={busy} value={kind} onChange={event => setKind(event.target.value)}><option value="drive">Google Drive</option><option value="r2" disabled={!status.storageReady}>Storage (R2)</option></select></div>
                <div><Label htmlFor="autopilot-name">{t('Source name')}</Label><Input id="autopilot-name" className="mt-1" required maxLength={160} value={name} disabled={busy} onChange={event => setName(event.target.value)} /></div>
                <div className="sm:col-span-2"><Label htmlFor="autopilot-folder">{t(kind === 'drive' ? 'Google Drive folder ID' : 'Storage prefix ending in /')}</Label><Input id="autopilot-folder" className="mt-1" required maxLength={200} value={folder} disabled={busy} onChange={event => setFolder(event.target.value)} />{kind === 'r2' && <p className="label-xs mt-1">{t('Workspace storage root')}: {status.storagePrefix}</p>}</div>
                <div className="sm:col-span-2 flex justify-end"><button type="submit" className="btn-skew" disabled={busy}>{t('Add source')}</button></div>
            </form>
            {!data ? <Skeleton className="h-24 rounded-xl" /> : <>
                {!data.sources.length && <p className="text-sm text-muted-foreground">{t('No sources yet. Add a Drive folder or Storage prefix.')}</p>}
                <ul className="space-y-2">{data.sources.map(source => <li key={source.id} className="border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0"><p className="text-sm font-medium break-words">{source.name}</p><p className="label-xs break-all">{source.kind === 'drive' ? 'Google Drive' : 'Storage'} · {t(source.status)}{source.last_synced_at && ` · ${formatDay(source.last_synced_at)}`}</p></div>
                    <div className="flex flex-wrap gap-2">
                        {(source.kind === 'drive' || source.status !== 'connected') && <Button variant="outline" size="sm" disabled={busy || source.kind === 'drive' && !status.driveReady} onClick={() => click('connect', { id: source.id })}>{t(source.status === 'connected' ? 'Reconnect' : 'Connect')}</Button>}
                        <Button variant="outline" size="sm" disabled={busy || source.status !== 'connected'} onClick={() => click('sync', { id: source.id })}>{t('Queue sync')}</Button>
                        <Button variant="ghost" size="sm" disabled={busy || source.status !== 'connected'} onClick={() => click('disconnect', { id: source.id })}>{t('Disconnect')}</Button>
                    </div>
                </li>)}</ul>
                {!status.driveReady && <p className="label-xs">{t('Drive connection requires Google OAuth credentials and a signed-in session on the server.')}</p>}
                <div className="border-t pt-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-[15px]">{t('Processing queue')}</h3><Button variant="outline" disabled={busy} onClick={() => click('run')}>{t(busy ? 'Processing…' : 'Process next job')}</Button></div>
                    <p className="label-xs">{t(status.backgroundReady ? 'Background queue is configured. Manual processing remains available for recovery.' : 'This development version processes one queued job per click. Each sync page is a separate job. Background processing is not enabled.')}</p>
                    <ul className="space-y-2 max-h-48 overflow-y-auto">{data.jobs.map(job => <li key={job.id} className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="break-all">{job.kind === 'sync' ? t('Sync') : t('AI analysis')} · {t(job.status)}{job.error && ` · ${t(job.error)}`}</span>{job.status === 'failed' && <Button variant="outline" size="sm" disabled={busy} onClick={() => job.kind === 'analyze' ? setConfirmation({ id: job.id, retry: true }) : click('retry', { id: job.id })}>{t('Retry')}</Button>}</li>)}</ul>
                </div>
                <div className="border-t pt-4"><Label htmlFor="autopilot-search">{t('Search assets by name, summary or tags')}</Label><Input id="autopilot-search" className="mt-1" value={search} onChange={event => setSearch(event.target.value)} /></div>
                {!data.assets.length && <p className="text-sm text-muted-foreground">{t(search.trim() ? 'No matching assets. Try another search.' : 'No ingested assets. Queue a sync and process its jobs.')}</p>}
                <div className="grid gap-3 md:grid-cols-2">{data.assets.map(asset => <article key={asset.id} className="border rounded-xl p-3 min-w-0 space-y-2">
                    <p className="text-sm font-medium break-words">{asset.name}</p>
                    <p className="label-xs break-words">{asset.mime} · {formatBytes(asset.size)} · {t(asset.availability)}</p>
                    <StatusBadge tone={asset.review === 'approved' ? 'success' : 'neutral'}>{t(asset.analysis_status)} · {t(asset.review)}</StatusBadge>
                    {asset.analysis && <div className="text-sm space-y-2"><p className="break-words">{asset.analysis.summary}</p><p className="label-xs break-words">{asset.analysis.tags.join(' · ')}</p>{asset.analysis.ocr && <details><summary>{t('Visible text')}</summary><p className="whitespace-pre-wrap break-words">{asset.analysis.ocr}</p></details>}<ul className="list-disc pl-5 break-words">{asset.analysis.suggested_uses.map((value, index) => <li key={index}>{value}</li>)}</ul>{asset.analysis.warnings.map((value, index) => <p className="text-warnFg break-words" key={index}>{value}</p>)}<p className="label-xs">{asset.analysis.provider} · {asset.analysis.model} · {formatDay(asset.analysis.analyzed_at)}</p></div>}
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={busy || asset.availability !== 'available' || !['image/png', 'image/jpeg', 'image/webp'].includes(asset.mime) || asset.size > 3145728} onClick={() => setConfirmation(asset)}>{t('Analyze image')}</Button>
                        {asset.analysis && <><Button size="sm" variant="outline" disabled={busy} onClick={() => click('review', { id: asset.id, review: 'approved' })}>{t('Approve analysis')}</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => click('review', { id: asset.id, review: 'rejected' })}>{t('Reject analysis')}</Button></>}
                    </div>
                </article>)}</div>
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="label-xs">{t('{count} ingested assets', { count: data.total })}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={busy || offset === 0} onClick={() => setOffset(Math.max(0, offset - 100))}>{t('Previous')}</Button><Button variant="outline" size="sm" disabled={busy || data.nextOffset === null} onClick={() => setOffset(data.nextOffset)}>{t('Next')}</Button></div></div>
            </>}
        </>}
        <ConfirmDialog destructive={false} open={!!confirmation} onOpenChange={open => !open && setConfirmation(null)} title={t('Send image for AI analysis?')} description={t('The selected image will be sent to the AI provider configured in Settings. Provider charges may apply. Output remains unapproved until you review it.')} confirmLabel="Queue AI analysis" onConfirm={() => action(confirmation.retry ? 'retry' : 'analyze', { id: confirmation.id, confirmed: true })} />
    </section>;
}
