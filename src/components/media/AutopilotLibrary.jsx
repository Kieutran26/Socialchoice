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
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import {
    Sparkle,
    ArrowsClockwise,
    HardDrives,
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
    Tag,
    PencilSimple,
    Clock,
    WarningCircle,
    ArrowLeft,
} from '@phosphor-icons/react';

export default function AutopilotLibrary({ brandId: propBrandId, onBrandChange }) {
    const { t } = useTranslation();
    const { brands = [] } = useWorkspace?.() || {};
    const { toast } = useToast();
    const brandId = propBrandId || brands[0]?.id || '';
    const [addSourceModalOpen, setAddSourceModalOpen] = useState(false);
    const [autopilotSubTab, setAutopilotSubTab] = useState('assets'); // 'assets' | 'tasks'
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
                setAddSourceModalOpen(false);
                toast({ title: t('Thêm nguồn Drive thành công!') });
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
            {/* Unified Studio Card: Header + Controls + Source Pills (Layout 1) */}
            <div className="panel p-5 bg-card border border-border/80 rounded-3xl shadow-2xs space-y-4">
                {/* Top Row: Title, Brand & Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                            <Sparkle size={18} weight="duotone" />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold text-foreground">
                                    {t('Thư viện tài sản Autopilot')}
                                </h2>
                                {status?.ready && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        {t('connected')}
                                    </span>
                                )}
                            </div>
                            <p className="label-xs text-muted-foreground mt-0.5">
                                {t(
                                    'Tệp gốc giữ tại Google Drive hoặc Storage. Đồng bộ tự động & gợi ý bài viết AI khi bạn duyệt.'
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Brand Selector inside Autopilot Header */}
                        {brands.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/80 bg-muted/40">
                                <Tag size={13} className="text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">{t('Thương hiệu:')}</span>
                                <div className="relative">
                                    <select
                                        aria-label={t('Brand')}
                                        value={brandId}
                                        onChange={(e) => onBrandChange?.(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer pr-4 appearance-none"
                                    >
                                        {brands.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                    <CaretDown size={11} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                                </div>
                            </div>
                        )}

                        {/* Inline Queue Pill (Gọn gàng trong header, bấm để xem chi tiết task dưới dạng tab trang) */}
                        {data?.jobs?.length > 0 && (
                            <div
                                className={`flex items-center gap-1.5 p-1 rounded-xl border transition-all ${
                                    autopilotSubTab === 'tasks'
                                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                                        : 'bg-neutral-100 hover:bg-neutral-200/90 text-neutral-800 border-neutral-200/90 shadow-2xs'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => setAutopilotSubTab(autopilotSubTab === 'tasks' ? 'assets' : 'tasks')}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold cursor-pointer transition-colors no-underline ${
                                        autopilotSubTab === 'tasks'
                                            ? 'text-white'
                                            : 'text-neutral-800 hover:text-black'
                                    }`}
                                    title={autopilotSubTab === 'tasks' ? t('Đang xem danh sách tác vụ. Bấm để về kho tệp') : t('Bấm để xem danh sách tác vụ đang chạy')}
                                >
                                    <ListBullets size={14} className={autopilotSubTab === 'tasks' ? 'text-white' : 'text-neutral-600'} />
                                    <span>{data.jobs.length} {t('tác vụ')}</span>
                                    <span className={`text-[10px] font-sans font-normal ${autopilotSubTab === 'tasks' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                                        {autopilotSubTab === 'tasks' ? '· Đang xem' : '· Xem'}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        click('run');
                                    }}
                                    className={`text-[10px] font-bold px-2 py-1 rounded-md cursor-pointer transition shadow-2xs ${
                                        autopilotSubTab === 'tasks'
                                            ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                                            : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                                    }`}
                                    title={t('Xử lý tác vụ tiếp theo')}
                                >
                                    {busy ? '…' : t('Chạy')}
                                </button>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setAddSourceModalOpen(true)}
                            className="h-9 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition shrink-0"
                        >
                            <FolderPlus size={16} weight="bold" />
                            <span>{t('+ Thêm nguồn Drive')}</span>
                        </button>

                        <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={load}
                            className="h-9 w-9 p-0 rounded-xl flex items-center justify-center cursor-pointer shadow-2xs"
                            title={t('Refresh')}
                        >
                            <ArrowsClockwise size={14} className={busy ? 'animate-spin' : ''} />
                        </Button>
                    </div>
                </div>

                {/* Error Banner if any */}
                {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/60 text-xs text-dangerFg break-words flex items-center gap-2">
                        <Info size={15} className="shrink-0" />
                        <span>{t(error)}</span>
                    </div>
                )}

                {/* Sources Row inside Studio Card (Layout 1) */}
                {data && (
                    <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                                {t('Các thư mục Google Drive đang liên kết')} ({data.sources.length})
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                                {t('Quét tự động')}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {data.sources.map((source) => (
                                <div
                                    key={source.id}
                                    className="p-3 rounded-2xl border border-border/80 bg-muted/20 hover:bg-background hover:border-border transition-all flex items-center justify-between gap-3 shadow-2xs"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                            <HardDrives size={16} weight="duotone" />
                                        </span>
                                        <div className="min-w-0">
                                            <h4 className="text-xs font-bold text-foreground truncate" title={source.name}>
                                                {source.name}
                                            </h4>
                                            <p className="text-[10px] text-muted-foreground font-mono truncate">
                                                {source.last_synced_at ? formatDay(source.last_synced_at) : t('Chưa quét')} · {t(source.status)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={busy || source.status !== 'connected'}
                                            onClick={() => click('sync', { id: source.id })}
                                            className="h-7 px-2 rounded-lg bg-background border border-border hover:bg-muted/40 text-[11px] font-semibold gap-1 cursor-pointer shadow-2xs"
                                            title={t('Queue sync')}
                                        >
                                            <ArrowsClockwise size={11} className={busy ? 'animate-spin' : ''} />
                                            <span>{t('Quét')}</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={busy || source.status !== 'connected'}
                                            onClick={() => click('disconnect', { id: source.id })}
                                            className="h-7 w-7 p-0 rounded-lg hover:bg-rose-50 text-muted-foreground hover:text-dangerFg cursor-pointer"
                                            title={t('Disconnect')}
                                        >
                                            <X size={13} />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {/* Add Source Quick Card (Always fits seamlessly in 4th col!) */}
                            <div
                                onClick={() => setAddSourceModalOpen(true)}
                                className="p-3 rounded-2xl border border-dashed border-border hover:border-foreground bg-background hover:bg-muted/20 transition-all flex items-center justify-center gap-2 text-center cursor-pointer min-h-[58px]"
                            >
                                <Plus size={15} weight="bold" className="text-foreground" />
                                <span className="text-xs font-bold text-foreground">{t('+ Thêm thư mục mới')}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {!status?.ready ? (
                <div className="panel p-6 text-center text-sm text-muted-foreground rounded-2xl border border-border/80 bg-card">
                    <p>{t('Autopilot requires server encryption configuration.')}</p>
                </div>
            ) : !brandId ? (
                <div className="panel p-8 text-center text-xs text-muted-foreground rounded-2xl border border-border/80 bg-card space-y-3">
                    <p>{t('Chọn một thương hiệu ở góc trên để quản lý nguồn tài sản Google Drive.')}</p>
                </div>
            ) : (
                <>
                    {!data ? (
                        <Skeleton className="h-28 rounded-2xl" />
                    ) : (
                        <div className="space-y-4">
                            {/* Sub-Navigation Tabs: Kho tệp vs Tác vụ & Hàng đợi */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/80 pb-3">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setAutopilotSubTab('assets')}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer no-underline ${
                                            autopilotSubTab === 'assets'
                                                ? 'bg-neutral-900 text-white shadow-xs'
                                                : 'bg-neutral-100 hover:bg-neutral-200/90 text-neutral-600 hover:text-neutral-900'
                                        }`}
                                    >
                                        <FileImage size={15} weight={autopilotSubTab === 'assets' ? 'bold' : 'regular'} />
                                        <span>{t('Kho tệp đã đồng bộ')}</span>
                                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${autopilotSubTab === 'assets' ? 'bg-neutral-800 text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                                            {data.total || data.assets?.length || 0}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setAutopilotSubTab('tasks')}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer no-underline ${
                                            autopilotSubTab === 'tasks'
                                                ? 'bg-neutral-900 text-white shadow-xs'
                                                : 'bg-neutral-100 hover:bg-neutral-200/90 text-neutral-600 hover:text-neutral-900'
                                        }`}
                                    >
                                        <ListBullets size={15} weight={autopilotSubTab === 'tasks' ? 'bold' : 'regular'} />
                                        <span>{t('Tác vụ & Hàng đợi')}</span>
                                        {data?.jobs?.length > 0 && (
                                            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${autopilotSubTab === 'tasks' ? 'bg-neutral-800 text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                                                {data.jobs.length}
                                            </span>
                                        )}
                                    </button>
                                </div>

                                {autopilotSubTab === 'tasks' && (
                                    <button
                                        type="button"
                                        onClick={() => setAutopilotSubTab('assets')}
                                        className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-semibold cursor-pointer px-2.5 py-1 rounded-lg hover:bg-neutral-100 transition-colors"
                                    >
                                        <ArrowLeft size={14} />
                                        <span>{t('Quay lại kho tệp')}</span>
                                    </button>
                                )}
                            </div>

                            {/* View Content depending on active sub-tab */}
                            {autopilotSubTab === 'tasks' ? (
                                <div className="space-y-4">
                                    {/* Task Status Summary Banner */}
                                    <div className="p-4 bg-white border border-neutral-200/80 rounded-2xl shadow-2xs flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                                            <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60 font-semibold">
                                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                {data?.jobs?.filter((j) => j.status === 'running').length || 0} {t('đang chạy')}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-neutral-700 bg-neutral-100 px-2.5 py-1 rounded-lg border border-neutral-200 font-semibold">
                                                <Clock size={13} className="text-neutral-500" />
                                                {data?.jobs?.filter((j) => j.status === 'queued').length || 0} {t('chờ xử lý')}
                                            </span>
                                            {data?.jobs?.some((j) => j.status === 'failed') && (
                                                <span className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 font-semibold">
                                                    <WarningCircle size={13} className="text-rose-600" />
                                                    {data?.jobs?.filter((j) => j.status === 'failed').length} {t('thất bại')}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={busy}
                                                onClick={load}
                                                className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer bg-white shadow-2xs"
                                            >
                                                <ArrowsClockwise size={12} className={busy ? 'animate-spin' : ''} />
                                                <span>{t('Làm mới')}</span>
                                            </Button>
                                            <button
                                                type="button"
                                                disabled={busy || !data?.jobs?.length}
                                                onClick={() => click('run')}
                                                className="h-8 px-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
                                            >
                                                <ArrowsClockwise size={13} className={busy ? 'animate-spin' : ''} />
                                                <span>{t(busy ? 'Đang xử lý…' : 'Xử lý tác vụ tiếp theo')}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Task Jobs List */}
                                    <div className="space-y-3">
                                        {!data?.jobs?.length ? (
                                            <div className="p-12 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-3xl bg-white space-y-2">
                                                <ListBullets size={32} className="mx-auto text-neutral-300" />
                                                <p className="font-semibold text-neutral-600">{t('Không có tác vụ nào trong hàng đợi.')}</p>
                                                <p className="text-neutral-400">{t('Mọi tác vụ đồng bộ Google Drive và phân tích AI đã hoàn tất.')}</p>
                                            </div>
                                        ) : (
                                            data.jobs.map((job) => {
                                                const diagnostic = autopilotDiagnosticLabels(job.diagnostic);
                                                const isFailed = job.status === 'failed';
                                                const isRunning = job.status === 'running';

                                                return (
                                                    <div
                                                        key={job.id}
                                                        className={`p-4 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-4 text-xs bg-white ${
                                                            isFailed
                                                                ? 'border-rose-200/80 shadow-2xs'
                                                                : isRunning
                                                                ? 'border-blue-200/80 shadow-xs'
                                                                : 'border-neutral-200/80 shadow-2xs'
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                                            <span
                                                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                                    isFailed
                                                                        ? 'bg-rose-100 text-rose-600 border border-rose-200'
                                                                        : isRunning
                                                                        ? 'bg-blue-100 text-blue-600 border border-blue-200'
                                                                        : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                                                                }`}
                                                            >
                                                                {isFailed ? (
                                                                    <WarningCircle size={18} weight="bold" />
                                                                ) : isRunning ? (
                                                                    <ArrowsClockwise size={16} className="animate-spin" />
                                                                ) : (
                                                                    <Clock size={16} />
                                                                )}
                                                            </span>

                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-neutral-900 text-sm">
                                                                        {job.kind === 'sync'
                                                                            ? t('Đồng bộ Google Drive')
                                                                            : t('Phân tích hình ảnh AI')}
                                                                    </span>
                                                                    <span
                                                                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold uppercase ${
                                                                            isFailed
                                                                                ? 'bg-rose-100 text-rose-800'
                                                                                : isRunning
                                                                                ? 'bg-blue-100 text-blue-800'
                                                                                : 'bg-neutral-200/70 text-neutral-700'
                                                                        }`}
                                                                    >
                                                                        {t(job.status)}
                                                                    </span>
                                                                </div>

                                                                {job.error ? (
                                                                    <div className="mt-1 text-xs text-rose-700 font-medium">
                                                                        <span>{t(diagnostic.message || job.error)}</span>
                                                                        {diagnostic.stage && (
                                                                            <span className="text-neutral-500 font-mono ml-1.5">
                                                                                ({t('Bước')}: {t(diagnostic.stage)})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-neutral-500 font-mono mt-0.5 truncate">
                                                                        ID: #{job.id} · {isRunning ? t('Đang thực thi…') : t('Đang chờ đến lượt')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {isFailed && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={busy}
                                                                onClick={() =>
                                                                    job.kind === 'analyze'
                                                                        ? setConfirmation({ id: job.id, retry: true })
                                                                        : click('retry', { id: job.id })
                                                                }
                                                                className="h-8 px-3 rounded-xl text-xs font-semibold gap-1 text-rose-700 border-rose-200 bg-white hover:bg-rose-50 cursor-pointer shadow-2xs shrink-0"
                                                            >
                                                                <ArrowsClockwise size={12} />
                                                                <span>{t('Thử lại')}</span>
                                                            </Button>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Filter & Search Bar */}
                                    <div className="p-4 bg-white border border-neutral-200/80 rounded-2xl shadow-2xs flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                                            <div className="relative flex-1 max-w-sm">
                                                <MagnifyingGlass
                                                    size={15}
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                                                />
                                                <Input
                                                    id="autopilot-search"
                                                    value={search}
                                                    onChange={(event) => setSearch(event.target.value)}
                                                    placeholder={t('Tìm tệp theo tên, tóm tắt hoặc nhãn AI…')}
                                                    className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50/60 pl-9 pr-3 text-xs focus:bg-white focus:outline-none focus:border-neutral-900"
                                                />
                                            </div>
                                        </div>

                                        <div className="text-xs text-neutral-500 font-mono">
                                            {t('Tổng số tệp:')} <strong className="text-neutral-900 font-semibold">{data.total || data.assets?.length || 0}</strong> {t('tệp đồng bộ')}
                                        </div>
                                    </div>

                                    {/* Synced Assets Stream with AI Insight Cards (Option A) */}
                                    {!data.assets.length ? (
                                        <div className="p-8 text-center text-xs text-neutral-500 rounded-2xl border border-neutral-200/80 bg-white">
                                            <p>
                                                {t(
                                                    search.trim()
                                                        ? 'Không tìm thấy tệp phù hợp. Thử tìm kiếm khác.'
                                                        : 'Chưa có tệp nào được nhập. Nhấn "Quét lại" ở thẻ nguồn để đồng bộ tệp từ Google Drive.'
                                                )}
                                            </p>
                                        </div>
                                    ) : (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {data.assets.map((asset) => {
                                        const hasAnalysis = !!asset.analysis;
                                        return (
                                            <article
                                                key={asset.id}
                                                className="overflow-hidden border border-neutral-200/80 bg-white rounded-2xl shadow-2xs hover:border-neutral-300 hover:shadow-xs transition-all flex flex-col justify-between group"
                                            >
                                                {/* Thumbnail area */}
                                                <div className="relative aspect-video w-full bg-neutral-100 overflow-hidden flex items-center justify-center">
                                                    {asset.file_url ? (
                                                        <img
                                                            src={asset.file_url}
                                                            alt={asset.name}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center text-neutral-400 gap-1.5 p-4 text-center">
                                                            <FileImage size={28} weight="duotone" />
                                                            <span className="text-[10px] font-mono truncate max-w-[140px]">{asset.name}</span>
                                                        </div>
                                                    )}

                                                    {/* Top Badges */}
                                                    <div className="absolute left-2.5 top-2.5">
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold uppercase text-white shadow-xs font-mono">
                                                            {asset.mime?.includes('video') ? 'DRIVE · VIDEO' : 'DRIVE · ẢNH'}
                                                        </span>
                                                    </div>

                                                    <div className="absolute right-2.5 top-2.5">
                                                        {hasAnalysis ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 shadow-xs">
                                                                <Sparkle size={10} weight="fill" />
                                                                <span>AI Đã quét</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-600/90 text-white text-[9px] font-bold px-2 py-0.5 shadow-xs font-mono">
                                                                Mới đồng bộ
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Content & Metadata */}
                                                <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                                                    <div className="space-y-1.5">
                                                        <h4 className="text-xs font-bold text-neutral-900 truncate" title={asset.name}>
                                                            {asset.name}
                                                        </h4>
                                                        <p className="text-[10px] text-neutral-400 font-mono">
                                                            {formatBytes(asset.size)} {asset.source_name && `· ${asset.source_name}`}
                                                        </p>

                                                        {/* AI Hook / Summary Box */}
                                                        {hasAnalysis ? (
                                                            <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 text-[11px] text-neutral-700 space-y-1 mt-1">
                                                                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700">
                                                                    <Sparkle size={11} weight="fill" className="text-amber-500" />
                                                                    <span>GỢI Ý GÓC VIẾT:</span>
                                                                </div>
                                                                <p className="line-clamp-2 text-[11px] text-neutral-600 leading-relaxed">
                                                                    {asset.analysis.summary}
                                                                </p>
                                                                {asset.analysis.tags?.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1 pt-1">
                                                                        {asset.analysis.tags.slice(0, 3).map((tag, idx) => (
                                                                            <span key={idx} className="text-[9px] font-mono text-neutral-500 bg-neutral-200/60 px-1.5 py-0.2 rounded">
                                                                                #{tag}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="p-2.5 rounded-xl bg-neutral-50/70 border border-neutral-100 text-[11px] text-neutral-400 mt-1">
                                                                <p className="text-[10px]">Tệp vừa tải về từ Drive, chưa phân tích nội dung hình ảnh.</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Action Row */}
                                                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2 mt-auto">
                                                        {hasAnalysis ? (
                                                            <>
                                                                <div className="flex items-center gap-1">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        disabled={busy}
                                                                        onClick={() => click('review', { id: asset.id, review: 'approved' })}
                                                                        className="h-7 w-7 p-0 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                                                        title={t('Approve analysis')}
                                                                    >
                                                                        <Check size={13} weight="bold" />
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        disabled={busy}
                                                                        onClick={() => click('review', { id: asset.id, review: 'rejected' })}
                                                                        className="h-7 w-7 p-0 rounded-lg text-dangerFg hover:bg-rose-50 cursor-pointer"
                                                                        title={t('Reject analysis')}
                                                                    >
                                                                        <X size={13} />
                                                                    </Button>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    disabled={busy}
                                                                    onClick={() => setDraftAsset(asset)}
                                                                    className="h-7 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs ml-auto transition"
                                                                >
                                                                    <PencilSimple size={12} weight="bold" />
                                                                    <span>{t('Tạo bài viết')}</span>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                type="button"
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
                                                                className="w-full h-7 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs"
                                                            >
                                                                <Sparkle size={12} weight="fill" className="text-amber-600" />
                                                                <span>{t('Quét AI & Lên ý tưởng')}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Pagination */}
                            <div className="p-3 bg-white border border-neutral-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                                <span className="text-xs text-neutral-500 font-mono">
                                    {t('{count} ingested assets', { count: data.total || data.assets?.length || 0 })}
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={busy || offset === 0}
                                        onClick={() => setOffset(Math.max(0, offset - 100))}
                                        className="h-8 rounded-xl text-xs gap-1 cursor-pointer"
                                    >
                                        <CaretLeft size={13} />
                                        <span>{t('Previous')}</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={busy || data.nextOffset === null}
                                        onClick={() => setOffset(data.nextOffset)}
                                        className="h-8 rounded-xl text-xs gap-1 cursor-pointer"
                                    >
                                        <span>{t('Next')}</span>
                                        <CaretRight size={13} />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
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

            {/* Modal Popup: Thêm nguồn Google Drive / Cloud Storage */}
            <Dialog open={addSourceModalOpen} onOpenChange={setAddSourceModalOpen}>
                <DialogContent className="max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200">
                    <DialogHeader className="mb-4">
                        <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-xs shrink-0">
                                <FolderPlus size={20} weight="bold" />
                            </span>
                            <div>
                                <DialogTitle className="text-base font-bold text-neutral-900">
                                    {t('Thêm nguồn Google Drive / Storage')}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-neutral-500 mt-0.5">
                                    {t('Đồng bộ tệp ảnh & video từ thư mục công khai để AI tự động phân tích và tạo bài viết.')}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            click('createSource', { brand_id: brandId, kind, name, folder });
                        }}
                        className="space-y-4"
                    >
                        {/* Brand selection if multiple brands */}
                        {brands.length > 1 && (
                            <div>
                                <Label htmlFor="popup-brand" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                                    {t('Thương hiệu liên kết')}
                                </Label>
                                <div className="relative">
                                    <select
                                        id="popup-brand"
                                        value={brandId}
                                        onChange={(e) => onBrandChange?.(e.target.value)}
                                        className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 pr-8 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 focus:outline-none focus:border-neutral-900 appearance-none cursor-pointer"
                                    >
                                        {brands.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                    <CaretDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
                                </div>
                            </div>
                        )}

                        {/* Source Type */}
                        <div>
                            <Label htmlFor="popup-kind" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                                {t('Loại nguồn lưu trữ')}
                            </Label>
                            <div className="relative flex items-center">
                                <HardDrives size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                                <select
                                    id="popup-kind"
                                    disabled={busy}
                                    value={kind}
                                    onChange={(event) => setKind(event.target.value)}
                                    className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-8 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 focus:outline-none focus:border-neutral-900 appearance-none cursor-pointer"
                                >
                                    <option value="drive_public">{t('Thư mục Google Drive công khai (Public Folder)')}</option>
                                    <option value="r2" disabled={!status?.storageReady}>
                                        Cloud Storage (R2 / S3)
                                    </option>
                                </select>
                                <CaretDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
                            </div>
                        </div>

                        {/* Source Name */}
                        <div>
                            <Label htmlFor="popup-name" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                                {t('Tên nguồn tài sản')}
                            </Label>
                            <Input
                                id="popup-name"
                                required
                                maxLength={160}
                                value={name}
                                disabled={busy}
                                placeholder={t('VD: Ảnh Sản Phẩm Mùa Thu 2026')}
                                onChange={(event) => setName(event.target.value)}
                                className="h-10 rounded-xl border-neutral-200 text-xs font-medium"
                            />
                        </div>

                        {/* Folder Link */}
                        <div>
                            <Label htmlFor="popup-folder" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                                {t(
                                    kind === 'drive_public'
                                        ? 'Liên kết thư mục Google Drive (Link chia sẻ)'
                                        : 'Tiền tố thư mục Storage (kết thúc bằng /)'
                                )}
                            </Label>
                            <div className="relative flex items-center">
                                <LinkSimple size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                                <Input
                                    id="popup-folder"
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
                                    className="h-10 rounded-xl border-neutral-200 pl-9 text-xs font-mono"
                                />
                            </div>

                            {kind === 'drive_public' && (
                                <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 flex items-start gap-2">
                                    <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-[11px] leading-relaxed">
                                        {t('Hướng dẫn: Mở thư mục trên Google Drive > Chia sẻ > Đặt quyền "Bất kỳ ai có liên kết đều có thể xem". Không yêu cầu đăng nhập tài khoản Google.')}
                                    </p>
                                </div>
                            )}
                            {kind === 'r2' && (
                                <p className="text-[11px] text-neutral-500 mt-1.5 font-mono">
                                    {t('Thư mục gốc Storage')}: {status?.storagePrefix}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={() => setAddSourceModalOpen(false)}
                                className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer"
                            >
                                {t('Hủy')}
                            </Button>
                            <button
                                type="submit"
                                disabled={busy || !name.trim() || !folder.trim()}
                                className="h-9 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
                            >
                                <Plus size={14} weight="bold" />
                                <span>{t(busy ? 'Đang thêm…' : 'Xác nhận thêm nguồn')}</span>
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </section>
    );
}
