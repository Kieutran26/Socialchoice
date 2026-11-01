import AssetDraftDialog from './AssetDraftDialog';
import { useCallback, useEffect, useRef, useState } from 'react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { autopilotDiagnosticLabels } from '@/lib/autopilot-diagnostics';
import { formatBytes, formatDay } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import {
    Sparkle,
    FacebookLogo,
    ArrowsClockwise,
    HardDrives,
    Play,
    MagnifyingGlass,
    Check,
    X,
    Info,
    Plus,
    LinkSimple,
    FolderPlus,
    ListBullets,
    FileImage,
    CaretDown,
    CaretLeft,
    CaretRight,
} from '@phosphor-icons/react';

export default function AutopilotLibrary({ brandId }) {
    const { t } = useTranslation();
    const [status, setStatus] = useState(null);
    const [data, setData] = useState(null);
    const [kind, setKind] = useState('drive_public');
    const [name, setName] = useState('');
    const [folder, setFolder] = useState('');
    const [search, setSearch] = useState('');
    const [offset, setOffset] = useState(0);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirmation, setConfirmation] = useState(null);
    const [draftAsset, setDraftAsset] = useState(null);

    useEffect(() => {
        setDraftAsset(null);
    }, [brandId]);

    const version = useRef(0);
    const load = useCallback(async () => {
        const current = ++version.current;
        try {
            const readiness = await appClient.autopilot.call('status');
            if (current !== version.current) return;
            setStatus(readiness);
            if (!readiness.ready || !brandId) {
                setData(null);
                return;
            }
            const result = await appClient.autopilot.call('list', {
                brand_id: brandId,
                search,
                offset,
            });
            if (current === version.current) setData(result);
        } catch (e) {
            if (current === version.current) setError(e.message);
        }
    }, [brandId, search, offset]);

    useEffect(() => {
        setData(null);
        setError('');
        const timer = setTimeout(load, 250);
        return () => {
            clearTimeout(timer);
            version.current++;
        };
    }, [load]);

    useEffect(() => {
        setOffset(0);
        setConfirmation(null);
    }, [brandId, search]);

    const action = async (operation, input = {}) => {
        setBusy(true);
        setError('');
        try {
            const result = await appClient.autopilot.call(operation, input);
            if (result.backgroundQueued === false) {
                setError(
                    'Background dispatch failed. The job is saved; process it manually or retry dispatch.'
                );
            }
            if (operation === 'connect' && result.url) {
                window.location.assign(result.url);
                return;
            }
            if (operation === 'createSource') {
                setName('');
                setFolder('');
            }
            await load();
        } catch (e) {
            setError(e.message);
            throw e;
        } finally {
            setBusy(false);
        }
    };

    const click = (operation, input = {}) => {
        action(operation, input).catch(() => {});
    };

    if (!status && !error) return <Skeleton className="h-16 mb-5 rounded-2xl" />;
    if (status && !status.enabled) return null;

    return (
        <section className="space-y-6" aria-label={t('Autopilot Asset Library')}>
            {/* Header Card */}
            <div className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <Sparkle size={18} weight="duotone" />
                        </span>
                        <div>
                            <h2 className="text-base font-heading font-semibold text-foreground">
                                {t('Autopilot Asset Library')}
                            </h2>
                            <p className="label-xs text-muted-foreground mt-0.5">
                                {t(
                                    'Original files stay in Drive or Storage. Sync imports metadata. AI analysis requires your confirmation and human review; it never publishes.'
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {status?.ready && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {t('connected')}
                            </span>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={load}
                            className="h-9 px-3 rounded-xl gap-1.5 text-xs font-medium"
                        >
                            <ArrowsClockwise size={14} className={busy ? 'animate-spin' : ''} />
                            <span>{t('Refresh')}</span>
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200/60 text-xs text-dangerFg break-words flex items-center gap-2">
                        <Info size={15} className="shrink-0" />
                        <span>{t(error)}</span>
                    </div>
                )}
            </div>

            {!status?.ready ? (
                <div className="panel p-6 text-center text-sm text-muted-foreground rounded-2xl border border-border/80 bg-card">
                    <p>{t('Autopilot requires server encryption configuration.')}</p>
                </div>
            ) : !brandId ? (
                <div className="panel p-6 text-center text-sm text-muted-foreground rounded-2xl border border-border/80 bg-card">
                    <p>{t('Choose a brand below to manage its sources.')}</p>
                </div>
            ) : (
                <>
                    {/* Add Source Form */}
                    <div className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <FolderPlus size={15} weight="bold" />
                            </span>
                            <h3 className="text-[15px] font-semibold text-foreground">
                                {t('Add source')}
                            </h3>
                        </div>

                        <form
                            className="grid gap-3.5 sm:grid-cols-2"
                            onSubmit={(event) => {
                                event.preventDefault();
                                click('createSource', { brand_id: brandId, kind, name, folder });
                            }}
                        >
                            <div>
                                <Label htmlFor="autopilot-kind" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                    {t('Source type')}
                                </Label>
                                <div className="relative flex items-center">
                                    <HardDrives
                                        size={15}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                    />
                                    <select
                                        id="autopilot-kind"
                                        disabled={busy}
                                        value={kind}
                                        onChange={(event) => setKind(event.target.value)}
                                        className="h-10 w-full rounded-xl border border-border/80 bg-background pl-9 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                                    >
                                        <option value="drive_public">{t('Public Google Drive folder')}</option>
                                        <option value="r2" disabled={!status.storageReady}>
                                            Storage (R2)
                                        </option>
                                    </select>
                                    <CaretDown
                                        size={14}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="autopilot-name" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                    {t('Source name')}
                                </Label>
                                <Input
                                    id="autopilot-name"
                                    required
                                    maxLength={160}
                                    value={name}
                                    disabled={busy}
                                    placeholder={t('e.g. Design Assets 2026')}
                                    onChange={(event) => setName(event.target.value)}
                                    className="h-10 rounded-xl border-border/80 bg-background text-xs"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <Label htmlFor="autopilot-folder" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                    {t(
                                        kind === 'drive_public'
                                            ? 'Public Google Drive folder link'
                                            : 'Storage prefix ending in /'
                                    )}
                                </Label>
                                <div className="relative flex items-center">
                                    <LinkSimple
                                        size={15}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                    />
                                    <Input
                                        id="autopilot-folder"
                                        required
                                        maxLength={1000}
                                        value={folder}
                                        disabled={busy}
                                        placeholder={
                                            kind === 'drive_public'
                                                ? 'https://drive.google.com/drive/folders/...'
                                                : 'folder/'
                                        }
                                        onChange={(event) => setFolder(event.target.value)}
                                        className="h-10 rounded-xl border-border/80 bg-background pl-9 text-xs"
                                    />
                                </div>
                                {kind === 'drive_public' && (
                                    <p className="label-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                                        <Info size={13} className="text-amber-500 shrink-0" />
                                        {t(
                                            'Set the folder to Anyone with the link, Viewer. Only direct files are imported. No Google sign-in is needed.'
                                        )}
                                    </p>
                                )}
                                {kind === 'r2' && (
                                    <p className="label-xs text-muted-foreground mt-1.5">
                                        {t('Workspace storage root')}: {status.storagePrefix}
                                    </p>
                                )}
                            </div>

                            <div className="sm:col-span-2 flex justify-end pt-1">
                                <button type="submit" className="btn-skew inline-flex items-center gap-1.5" disabled={busy}>
                                    <Plus size={15} weight="bold" />
                                    <span>{t('Add source')}</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    {!data ? (
                        <Skeleton className="h-28 rounded-2xl" />
                    ) : (
                        <>
                            {/* Connected Sources List */}
                            {data.sources.length > 0 && (
                                <div className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-3">
                                    <h3 className="text-[15px] font-semibold text-foreground">
                                        {t('Active sources')}
                                    </h3>
                                    <ul className="space-y-2.5">
                                        {data.sources.map((source) => (
                                            <li
                                                key={source.id}
                                                className="rounded-xl border border-border/80 bg-background p-3.5 flex flex-wrap items-center justify-between gap-3 hover:border-border transition-colors"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                                        <HardDrives size={18} weight="duotone" />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-foreground truncate">
                                                            {source.name}
                                                        </p>
                                                        <p className="label-xs text-muted-foreground mt-0.5 truncate">
                                                            {source.kind === 'drive'
                                                                ? t(
                                                                      source.access === 'public'
                                                                          ? 'Public Google Drive folder'
                                                                          : 'Legacy Google Drive OAuth source'
                                                                  )
                                                                : 'Storage'}{' '}
                                                            ·{' '}
                                                            <span className="text-foreground font-medium">
                                                                {t(source.status)}
                                                            </span>
                                                            {source.last_synced_at &&
                                                                ` · ${formatDay(source.last_synced_at)}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 ml-auto">
                                                    {(source.kind === 'drive' ||
                                                        source.status !== 'connected') && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={
                                                                busy ||
                                                                (source.kind === 'drive' &&
                                                                    !(source.access === 'public'
                                                                        ? status.publicDriveReady
                                                                        : status.driveReady))
                                                            }
                                                            onClick={() =>
                                                                click('connect', { id: source.id })
                                                            }
                                                            className="h-8 rounded-lg text-xs"
                                                        >
                                                            {t(
                                                                source.access === 'public'
                                                                    ? 'Check public access'
                                                                    : source.status === 'connected'
                                                                    ? 'Reconnect'
                                                                    : 'Connect'
                                                            )}
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={busy || source.status !== 'connected'}
                                                        onClick={() => click('sync', { id: source.id })}
                                                        className="h-8 rounded-lg text-xs gap-1.5"
                                                    >
                                                        <ArrowsClockwise size={13} />
                                                        <span>{t('Queue sync')}</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={busy || source.status !== 'connected'}
                                                        onClick={() =>
                                                            click('disconnect', { id: source.id })
                                                        }
                                                        className="h-8 rounded-lg text-xs text-dangerFg hover:text-dangerFg hover:bg-rose-50"
                                                    >
                                                        {t('Disconnect')}
                                                    </Button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Processing Queue */}
                            <div className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <ListBullets size={15} weight="bold" />
                                        </span>
                                        <div>
                                            <h3 className="text-[15px] font-semibold text-foreground">
                                                {t('Processing queue')}
                                            </h3>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={busy}
                                        onClick={() => click('run')}
                                        className="h-9 px-3 rounded-xl text-xs font-medium gap-1.5"
                                    >
                                        <Play size={13} weight="fill" />
                                        <span>{t(busy ? 'Processing…' : 'Process next job')}</span>
                                    </Button>
                                </div>

                                <p className="label-xs text-muted-foreground">
                                    {t(
                                        status.backgroundReady
                                            ? 'Background queue is configured. Manual processing remains available for recovery.'
                                            : 'This development version processes one queued job per click. Each sync page is a separate job. Background processing is not enabled.'
                                    )}
                                </p>

                                {data.jobs.length > 0 && (
                                    <ul className="space-y-2 max-h-48 overflow-y-auto divide-y divide-border/60 pt-1">
                                        {data.jobs.map((job) => {
                                            const diagnostic = autopilotDiagnosticLabels(job.diagnostic);
                                            return (
                                                <li
                                                    key={job.id}
                                                    className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-foreground truncate">
                                                            {job.kind === 'sync'
                                                                ? t('Sync')
                                                                : t('AI analysis')}{' '}
                                                            ·{' '}
                                                            <span className="text-muted-foreground">
                                                                {t(job.status)}
                                                            </span>
                                                            {job.error &&
                                                                ` · ${t(diagnostic.message || job.error)}`}
                                                        </p>
                                                        {diagnostic.stage && (
                                                            <p className="label-xs text-dangerFg mt-0.5">
                                                                {t('Failed step')}:{' '}
                                                                {t(diagnostic.stage)}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {job.status === 'failed' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={busy}
                                                            onClick={() =>
                                                                job.kind === 'analyze'
                                                                    ? setConfirmation({
                                                                          id: job.id,
                                                                          retry: true,
                                                                      })
                                                                    : click('retry', { id: job.id })
                                                            }
                                                            className="h-7 text-xs rounded-lg"
                                                        >
                                                            {t('Retry')}
                                                        </Button>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>

                            {/* Ingested Assets Search & Grid */}
                            <div className="space-y-4">
                                <div className="panel p-4 bg-card border border-border/80 rounded-2xl shadow-2xs">
                                    <div className="relative">
                                        <MagnifyingGlass
                                            size={15}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                        />
                                        <Input
                                            id="autopilot-search"
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder={t('Search assets by name, summary or tags')}
                                            className="h-10 rounded-xl border-border/80 bg-background pl-9 text-xs"
                                        />
                                    </div>
                                </div>

                                {!data.assets.length ? (
                                    <div className="panel p-8 text-center text-xs text-muted-foreground rounded-2xl border border-border/80 bg-card">
                                        <p>
                                            {t(
                                                search.trim()
                                                    ? 'No matching assets. Try another search.'
                                                    : 'No ingested assets. Queue a sync and process its jobs.'
                                            )}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                                        {data.assets.map((asset) => (
                                            <article
                                                key={asset.id}
                                                className="panel p-4 bg-card border border-border/80 rounded-2xl shadow-2xs hover:border-border transition-all flex flex-col justify-between space-y-3"
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                                                <FileImage size={15} weight="duotone" />
                                                            </span>
                                                            <p className="text-xs font-semibold text-foreground truncate" title={asset.name}>
                                                                {asset.name}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <p className="label-xs text-muted-foreground">
                                                        {asset.mime} · {formatBytes(asset.size)} ·{' '}
                                                        <span className="text-foreground font-medium">
                                                            {t(asset.availability)}
                                                        </span>
                                                    </p>

                                                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                        <StatusBadge
                                                            tone={
                                                                asset.review === 'approved'
                                                                    ? 'success'
                                                                    : 'neutral'
                                                            }
                                                        >
                                                            {t(asset.analysis_status)} · {t(asset.review)}
                                                        </StatusBadge>
                                                    </div>

                                                    {asset.analysis && (
                                                        <div className="text-xs space-y-2 pt-2 border-t border-border/60">
                                                            <p className="text-foreground/90 bg-muted/40 p-2.5 rounded-xl text-[12px] leading-relaxed">
                                                                {asset.analysis.summary}
                                                            </p>
                                                            {asset.analysis.tags?.length > 0 && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {asset.analysis.tags.map((tag, idx) => (
                                                                        <span
                                                                            key={idx}
                                                                            className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                                                                        >
                                                                            #{tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {asset.analysis.ocr && (
                                                                <details className="text-[11px] text-muted-foreground cursor-pointer">
                                                                    <summary className="font-medium hover:text-foreground">
                                                                        {t('Visible text')}
                                                                    </summary>
                                                                    <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/20 p-2 font-mono text-[11px]">
                                                                        {asset.analysis.ocr}
                                                                    </p>
                                                                </details>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={
                                                            busy ||
                                                            asset.availability !== 'available' ||
                                                            ![
                                                                'image/png',
                                                                'image/jpeg',
                                                                'image/webp',
                                                            ].includes(asset.mime) ||
                                                            asset.size > 3145728
                                                        }
                                                        onClick={() => setConfirmation(asset)}
                                                        className="h-8 rounded-lg text-xs gap-1.5"
                                                    >
                                                        <Sparkle size={13} weight="duotone" className="text-amber-500" />
                                                        <span>{t('Analyze image')}</span>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={
                                                            busy ||
                                                            asset.availability !== 'available' ||
                                                            asset.review !== 'approved' ||
                                                            asset.analysis_status !== 'analyzed'
                                                        }
                                                        onClick={() => setDraftAsset(asset)}
                                                        className="h-8 rounded-lg text-xs gap-1.5"
                                                    >
                                                        <FacebookLogo size={13} weight="fill" className="text-[#1877F2]" />
                                                        <span>{t('Create Facebook draft')}</span>
                                                    </Button>
                                                    {asset.analysis && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={busy}
                                                                onClick={() =>
                                                                    click('review', {
                                                                        id: asset.id,
                                                                        review: 'approved',
                                                                    })
                                                                }
                                                                className="h-8 rounded-lg text-xs gap-1 text-emerald-700 hover:bg-emerald-50"
                                                            >
                                                                <Check size={13} />
                                                                <span>{t('Approve analysis')}</span>
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                disabled={busy}
                                                                onClick={() =>
                                                                    click('review', {
                                                                        id: asset.id,
                                                                        review: 'rejected',
                                                                    })
                                                                }
                                                                className="h-8 rounded-lg text-xs gap-1 text-dangerFg hover:text-dangerFg hover:bg-rose-50"
                                                            >
                                                                <X size={13} />
                                                                <span>{t('Reject analysis')}</span>
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                )}

                                {/* Pagination */}
                                <div className="panel p-3 bg-card border border-border/80 rounded-2xl flex flex-wrap items-center justify-between gap-2">
                                    <span className="label-xs text-muted-foreground">
                                        {t('{count} ingested assets', { count: data.total })}
                                    </span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={busy || offset === 0}
                                            onClick={() => setOffset(Math.max(0, offset - 100))}
                                            className="h-8 rounded-lg text-xs gap-1"
                                        >
                                            <CaretLeft size={13} />
                                            <span>{t('Previous')}</span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={busy || data.nextOffset === null}
                                            onClick={() => setOffset(data.nextOffset)}
                                            className="h-8 rounded-lg text-xs gap-1"
                                        >
                                            <span>{t('Next')}</span>
                                            <CaretRight size={13} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {draftAsset && (
                <AssetDraftDialog
                    key={draftAsset.id}
                    asset={draftAsset}
                    onClose={() => setDraftAsset(null)}
                />
            )}

            <ConfirmDialog
                destructive={false}
                open={!!confirmation}
                onOpenChange={(open) => !open && setConfirmation(null)}
                title={t('Send image for AI analysis?')}
                description={t(
                    'The selected image will be sent to the AI provider configured in Settings. Provider charges may apply. Output remains unapproved until you review it.'
                )}
                confirmLabel="Queue AI analysis"
                onConfirm={() =>
                    action(confirmation.retry ? 'retry' : 'analyze', {
                        id: confirmation.id,
                        confirmed: true,
                    })
                }
            />
        </section>
    );
}
