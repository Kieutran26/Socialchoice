import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowSquareOut,
    Check,
    CheckCircle,
    CloudArrowUp,
    Copy,
    DownloadSimple,
    Eye,
    FileImage,
    FilmStrip,
    FolderOpen,
    ListBullets,
    MagnifyingGlass,
    Sparkle,
    SquaresFour,
    Trash,
    X,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useWorkspace } from '@/lib/workspace-context';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Image } from '@/components/ui/image';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import StatusBadge from '@/components/common/StatusBadge';
import LoadError from '@/components/common/load-error';
import MediaUploader from '@/components/composer/MediaUploader';
import AutopilotLibrary from '@/components/media/AutopilotLibrary';
import { referencedMediaIds } from '@/lib/publishing-content';
import { formatBytes, formatDay, formatNumber } from '@/lib/format';

export default function MediaLibraryNew() {
    const { t } = useTranslation();
    const { scope, brands, selectedBrandId, demoMode } = useWorkspace();
    const { toast } = useToast();

    const [uploadBrand, setUploadBrand] = useState(
        selectedBrandId === 'all' ? brands[0]?.id || '' : selectedBrandId
    );
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState([]);
    const [search, setSearch] = useState('');
    const [type, setType] = useState('all'); // 'all' | 'image' | 'video'
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'autopilot'
    const [showQuickDrop, setShowQuickDrop] = useState(false);

    const [preview, setPreview] = useState(null);
    const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const version = useRef(0);

    const activeBrands = useMemo(
        () => brands.filter((b) => b.status !== 'archived'),
        [brands]
    );

    const brandMap = useMemo(() => {
        const m = {};
        brands.forEach((b) => {
            m[b.id] = b;
        });
        return m;
    }, [brands]);

    useEffect(() => {
        if (selectedBrandId && selectedBrandId !== 'all') {
            setUploadBrand(selectedBrandId);
        } else if (!uploadBrand && activeBrands[0]?.id) {
            setUploadBrand(activeBrands[0].id);
        }
    }, [selectedBrandId, activeBrands, uploadBrand]);

    const handleCopyUrl = (url, id = 'preview') => {
        if (!url) return;
        navigator.clipboard?.writeText(url);
        setCopiedId(id);
        toast({ title: t('Đã sao chép liên kết tệp!') });
        setTimeout(() => setCopiedId(null), 1800);
    };

    const load = useCallback(async () => {
        const request = ++version.current;
        setLoading(true);
        setError('');
        try {
            const query = { ...scope };
            if (type !== 'all') query.file_type = type;
            if (search.trim()) query.name = { $regex: search.trim(), $options: 'i' };
            const page = await appClient.entities.MediaAsset.filter(query, {
                sort: '-created_date',
                limit: 100,
            });
            if (request === version.current) setAssets(page.items || []);
        } catch (err) {
            if (request === version.current) setError(err.message);
        } finally {
            if (request === version.current) setLoading(false);
        }
    }, [scope, type, search]);

    useEffect(() => {
        const timer = setTimeout(load, search ? 280 : 0);
        return () => {
            clearTimeout(timer);
            version.current++;
        };
    }, [load, search]);

    const remove = async () => {
        if (!deleteTarget) return;
        const references = { Post: 0, PostTemplate: 0 };
        for (const entity of ['Post', 'PostTemplate']) {
            let cursor;
            do {
                const page = await appClient.entities[entity].filter(
                    { brand_id: deleteTarget.brand_id, is_demo: !!deleteTarget.is_demo },
                    { limit: 250, cursor, fields: ['media_ids', 'platform_media_ids'] }
                );
                references[entity] += page.items.filter((record) =>
                    referencedMediaIds(record).includes(deleteTarget.id)
                ).length;
                cursor = page.has_more ? page.next_cursor : null;
            } while (cursor);
        }
        if (references.Post || references.PostTemplate) {
            toast({
                variant: 'destructive',
                title: t('This file is still in use'),
                description: t(
                    '{posts} posts and {templates} templates reference it. Detach it first.',
                    { posts: references.Post, templates: references.PostTemplate }
                ),
            });
            setDeleteTarget(null);
            return;
        }
        await appClient.entities.MediaAsset.delete(deleteTarget.id);
        toast({ title: t('Media deleted') });
        if (preview?.id === deleteTarget.id) setPreview(null);
        setDeleteTarget(null);
        load();
    };

    const metrics = useMemo(() => {
        const total = assets.length;
        const images = assets.filter((a) => a.file_type === 'image').length;
        const videos = assets.filter((a) => a.file_type === 'video').length;
        const bytes = assets.reduce((acc, a) => acc + (a.size_bytes || 0), 0);
        return { total, images, videos, bytes };
    }, [assets]);

    const showAutopilot = !isDesktop() && !demoMode;
    const hasFilters = search.trim() !== '' || type !== 'all';

    return (
        <div className="space-y-5 pb-14 max-w-[1440px] mx-auto">
            {/* Compact Editorial Header with Inline Storage Metrics */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-zinc-200/80">
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="font-heading text-[26px] font-medium tracking-tight text-zinc-900">
                            {t('Media Library')}
                        </h1>
                        {!loading ? (
                            <div className="flex flex-wrap items-center gap-2 text-[12px] text-zinc-500">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white border border-zinc-200/90 text-zinc-800 font-medium tabular-nums">
                                    {formatNumber(metrics.total)} {t('tệp')}
                                </span>
                                <span className="text-zinc-300">·</span>
                                <span className="tabular-nums">
                                    {formatNumber(metrics.images)} {t('ảnh')}
                                </span>
                                <span className="text-zinc-300">·</span>
                                <span className="tabular-nums">
                                    {formatNumber(metrics.videos)} {t('video')}
                                </span>
                                <span className="text-zinc-300">·</span>
                                <span className="font-mono text-[11.5px] text-zinc-600 tabular-nums">
                                    {formatBytes(metrics.bytes)}
                                </span>
                            </div>
                        ) : null}
                    </div>
                    <p className="text-[13.5px] text-zinc-500 max-w-2xl leading-relaxed">
                        {t(
                            isDesktop()
                                ? 'Kho hình ảnh và video MP4 được lưu trực tiếp trong không gian máy tính này.'
                                : 'Kho hình ảnh và video MP4 riêng tư của không gian làm việc, sẵn sàng đính kèm vào bài viết.'
                        )}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {activeTab === 'all' ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowQuickDrop((v) => !v)}
                            className={`h-9 rounded-lg border-zinc-200 bg-white text-zinc-700 ${
                                showQuickDrop ? 'border-[#d8b216] bg-[#ffd631]/15 text-[#2b2100]' : ''
                            }`}
                        >
                            <CloudArrowUp size={15} weight="duotone" className="mr-1.5" />
                            {showQuickDrop ? t('Ẩn vùng kéo thả') : t('Kéo thả nhanh')}
                        </Button>
                    ) : null}

                    <button
                        type="button"
                        onClick={() => setUploadDrawerOpen(true)}
                        className="btn-skew"
                    >
                        <CloudArrowUp size={16} weight="duotone" />
                        <span>{t('Upload new media')}</span>
                    </button>
                </div>
            </header>

            {/* Optional Source Tabs (Library vs Autopilot Drive) */}
            {showAutopilot ? (
                <div className="flex items-center gap-2">
                    <div className="inline-flex items-center p-1 rounded-xl bg-white border border-zinc-200/80">
                        <button
                            type="button"
                            onClick={() => setActiveTab('all')}
                            className={`h-8 px-3.5 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-2 transition-colors cursor-pointer ${
                                activeTab === 'all'
                                    ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                    : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                        >
                            <SquaresFour size={15} weight={activeTab === 'all' ? 'duotone' : 'regular'} />
                            <span>{t('Thư viện tệp')}</span>
                            <span className="font-mono text-[11px] opacity-75 tabular-nums">
                                {metrics.total}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('autopilot')}
                            className={`h-8 px-3.5 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-2 transition-colors cursor-pointer ${
                                activeTab === 'autopilot'
                                    ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                    : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                        >
                            <Sparkle size={15} weight={activeTab === 'autopilot' ? 'duotone' : 'regular'} />
                            <span>{t('Autopilot Drive')}</span>
                        </button>
                    </div>
                </div>
            ) : null}

            {/* Autopilot Tab */}
            {showAutopilot && activeTab === 'autopilot' ? (
                <AutopilotLibrary
                    brandId={uploadBrand || brands?.[0]?.id || ''}
                    onBrandChange={setUploadBrand}
                />
            ) : (
                <>
                    {/* Collapsible Inline Quick-Drop Zone (hidden by default so gallery is immediately above the fold) */}
                    {showQuickDrop ? (
                        <section className="bg-white border border-[#d8b216]/70 rounded-2xl p-4 sm:p-5 space-y-3.5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="font-heading text-[14.5px] font-medium text-zinc-900">
                                        {t('Tải tệp nhanh vào thư viện')}
                                    </h2>
                                    <p className="text-[12px] text-zinc-500">
                                        {t('Chọn thương hiệu đích rồi kéo thả ảnh JPG, PNG, WebP hoặc video MP4.')}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label htmlFor="quick-upload-brand" className="text-[12px] text-zinc-500">
                                        {t('Thương hiệu:')}
                                    </label>
                                    <select
                                        id="quick-upload-brand"
                                        value={uploadBrand}
                                        onChange={(e) => setUploadBrand(e.target.value)}
                                        disabled={demoMode || busy}
                                        className="h-8 px-2.5 rounded-lg border border-zinc-200 bg-white text-[12.5px] font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631]"
                                    >
                                        <option value="">{t('Chọn thương hiệu')}</option>
                                        {activeBrands.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <MediaUploader
                                allowLibrary={false}
                                onBusyChange={setBusy}
                                assets={[]}
                                onChange={() => {
                                    load();
                                    toast({ title: t('Tải tệp lên thành công!') });
                                }}
                                brandId={uploadBrand}
                                demoMode={demoMode}
                            />
                        </section>
                    ) : null}

                    {/* Single-Row Gallery Command Bar */}
                    <section className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <MagnifyingGlass
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                            />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('Tìm tệp theo tên...')}
                                aria-label={t('Tìm tệp theo tên...')}
                                className="w-full h-9 pl-9 pr-8 rounded-lg border border-zinc-200 bg-zinc-50/60 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216] transition"
                            />
                            {search ? (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    aria-label={t('Xóa tìm kiếm')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                                >
                                    <X size={14} />
                                </button>
                            ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Type Segmented Filter */}
                            <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/70">
                                {[
                                    { id: 'all', label: t('Tất cả'), icon: null },
                                    { id: 'image', label: t('Ảnh'), icon: FileImage },
                                    { id: 'video', label: t('Video'), icon: FilmStrip },
                                ].map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setType(tab.id)}
                                            className={`h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                                type === tab.id
                                                    ? 'bg-white text-zinc-900 shadow-2xs'
                                                    : 'text-zinc-500 hover:text-zinc-900'
                                            }`}
                                        >
                                            {Icon ? <Icon size={13} /> : null}
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {hasFilters ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        setType('all');
                                    }}
                                    className="h-8 px-2.5 rounded-lg text-[12px] text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                                >
                                    {t('Đặt lại')}
                                </button>
                            ) : null}

                            {/* View Switcher */}
                            <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/70">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                        viewMode === 'grid'
                                            ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                            : 'text-zinc-500 hover:text-zinc-900'
                                    }`}
                                >
                                    <SquaresFour size={14} weight={viewMode === 'grid' ? 'duotone' : 'regular'} />
                                    <span>{t('Lưới')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                        viewMode === 'list'
                                            ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                            : 'text-zinc-500 hover:text-zinc-900'
                                    }`}
                                >
                                    <ListBullets size={14} weight={viewMode === 'list' ? 'duotone' : 'regular'} />
                                    <span>{t('Danh sách')}</span>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Gallery / List Content */}
                    {error ? (
                        <LoadError message={error} onRetry={load} />
                    ) : loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[0, 1, 2, 3, 4, 5, 6, 7].map((key) => (
                                <Skeleton key={key} className="h-[220px] rounded-2xl" />
                            ))}
                        </div>
                    ) : !assets.length ? (
                        <EmptyState
                            icon={FolderOpen}
                            title={hasFilters ? t('Không tìm thấy tệp nào phù hợp') : t('Chưa có tệp nào trong thư viện')}
                            description={
                                hasFilters
                                    ? t('Thử đổi từ khóa tìm kiếm hoặc chọn loại tệp khác.')
                                    : t(
                                          isDesktop()
                                              ? 'Tải ảnh hoặc video MP4 từ máy tính để dùng lại khi lên lịch bài viết.'
                                              : 'Tải lên hình ảnh và video của thương hiệu. Tệp sẽ được lưu riêng tư trong không gian làm việc.'
                                      )
                            }
                        >
                            {hasFilters ? (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSearch('');
                                        setType('all');
                                    }}
                                >
                                    {t('Xóa bộ lọc')}
                                </Button>
                            ) : (
                                <Button variant="outline" onClick={() => setUploadDrawerOpen(true)}>
                                    <CloudArrowUp size={15} weight="duotone" className="mr-1.5" />
                                    {t('Upload new media')}
                                </Button>
                            )}
                        </EmptyState>
                    ) : viewMode === 'grid' ? (
                        /* ================================================================= */
                        /* VISUAL-FIRST GALLERY GRID (Clean 4-col cards, instant hover tools)*/
                        /* ================================================================= */
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {assets.map((asset) => {
                                const brand = brandMap[asset.brand_id];
                                const isVideo = asset.file_type === 'video';

                                return (
                                    <article
                                        key={asset.id}
                                        onClick={() => setPreview(asset)}
                                        className="group bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-2xl overflow-hidden flex flex-col justify-between transition-colors cursor-pointer"
                                    >
                                        {/* Thumbnail Stage */}
                                        <div className="relative aspect-[4/3] w-full bg-zinc-100 overflow-hidden">
                                            {isVideo ? (
                                                <video
                                                    src={asset.file_url}
                                                    className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                                                    muted
                                                />
                                            ) : (
                                                <Image
                                                    src={asset.file_url}
                                                    alt={asset.name}
                                                    className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                                                    fittingType="fill"
                                                />
                                            )}

                                            {/* Top-Left Type Pill */}
                                            <div className="absolute left-2.5 top-2.5 pointer-events-none">
                                                <span className="inline-flex items-center gap-1 rounded-md bg-white/90 border border-black/10 px-2 py-0.5 text-[10.5px] font-medium text-zinc-800">
                                                    {isVideo ? (
                                                        <>
                                                            <FilmStrip size={11} weight="duotone" />
                                                            <span>Video</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FileImage size={11} weight="duotone" />
                                                            <span>Ảnh</span>
                                                        </>
                                                    )}
                                                </span>
                                            </div>

                                            {/* Top-Right Hover Quick Actions */}
                                            <div
                                                className="absolute right-2.5 top-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyUrl(asset.file_url, asset.id)}
                                                    title={t('Sao chép link')}
                                                    aria-label={t('Sao chép link')}
                                                    className="h-7 w-7 rounded-lg bg-white/95 border border-black/10 text-zinc-700 hover:text-zinc-950 inline-flex items-center justify-center cursor-pointer"
                                                >
                                                    {copiedId === asset.id ? (
                                                        <Check size={13} className="text-emerald-600" />
                                                    ) : (
                                                        <Copy size={13} />
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(asset)}
                                                    title={t('Delete')}
                                                    aria-label={t('Delete')}
                                                    className="h-7 w-7 rounded-lg bg-white/95 border border-black/10 text-zinc-600 hover:text-dangerFg inline-flex items-center justify-center cursor-pointer"
                                                >
                                                    <Trash size={13} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Compact Metadata Footer */}
                                        <div className="p-3.5 space-y-1.5">
                                            <p
                                                className="text-[13px] font-medium text-zinc-900 truncate"
                                                title={asset.name}
                                            >
                                                {asset.name}
                                            </p>
                                            <div className="flex items-center justify-between gap-2 text-[11.5px] text-zinc-400">
                                                <span className="font-mono tabular-nums truncate">
                                                    {formatBytes(asset.size_bytes)} · {formatDay(asset.created_date)}
                                                </span>
                                                {brand ? (
                                                    <span
                                                        className="inline-flex items-center gap-1 text-zinc-600 shrink-0 max-w-[90px]"
                                                        title={brand.name}
                                                    >
                                                        <span
                                                            className="h-1.5 w-1.5 rounded-full shrink-0"
                                                            style={{ backgroundColor: brand.color || '#a1a1aa' }}
                                                        />
                                                        <span className="truncate text-[11px]">{brand.name}</span>
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        /* ================================================================= */
                        /* COMPACT FILE TABLE VIEW                                           */
                        /* ================================================================= */
                        <section className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[11.5px] font-medium text-zinc-500">
                                            <th className="py-3 pl-5 pr-3">{t('Tên tệp')}</th>
                                            <th className="py-3 px-3 w-28">{t('Loại')}</th>
                                            <th className="py-3 px-3 w-40">{t('Thương hiệu')}</th>
                                            <th className="py-3 px-3 w-40">{t('Dung lượng & Ngày')}</th>
                                            <th className="py-3 pl-3 pr-5 w-36 text-right">{t('Thao tác')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 text-[13px]">
                                        {assets.map((asset) => {
                                            const brand = brandMap[asset.brand_id];
                                            const isVideo = asset.file_type === 'video';
                                            return (
                                                <tr
                                                    key={asset.id}
                                                    onClick={() => setPreview(asset)}
                                                    className="hover:bg-zinc-50/70 transition-colors cursor-pointer"
                                                >
                                                    <td className="py-3 pl-5 pr-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="h-10 w-14 rounded-lg bg-zinc-100 border border-zinc-200/70 overflow-hidden shrink-0">
                                                                {isVideo ? (
                                                                    <video
                                                                        src={asset.file_url}
                                                                        className="h-full w-full object-cover"
                                                                        muted
                                                                    />
                                                                ) : (
                                                                    <Image
                                                                        src={asset.file_url}
                                                                        alt={asset.name}
                                                                        className="h-full w-full object-cover"
                                                                        fittingType="fill"
                                                                    />
                                                                )}
                                                            </div>
                                                            <span className="font-medium text-zinc-900 truncate max-w-[320px]">
                                                                {asset.name}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-3">
                                                        <span className="inline-flex items-center gap-1 text-[12px] text-zinc-600">
                                                            {isVideo ? (
                                                                <FilmStrip size={14} className="text-zinc-400" />
                                                            ) : (
                                                                <FileImage size={14} className="text-zinc-400" />
                                                            )}
                                                            <span>{isVideo ? t('Video') : t('Ảnh')}</span>
                                                        </span>
                                                    </td>

                                                    <td className="py-3 px-3">
                                                        {brand ? (
                                                            <span className="inline-flex items-center gap-1.5 text-[12px] text-zinc-700">
                                                                <span
                                                                    className="h-2 w-2 rounded-full shrink-0"
                                                                    style={{ backgroundColor: brand.color || '#a1a1aa' }}
                                                                />
                                                                <span className="truncate max-w-[120px]">{brand.name}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-zinc-400">—</span>
                                                        )}
                                                    </td>

                                                    <td className="py-3 px-3 font-mono text-[12px] text-zinc-500 tabular-nums whitespace-nowrap">
                                                        {formatBytes(asset.size_bytes)} · {formatDay(asset.created_date)}
                                                    </td>

                                                    <td
                                                        className="py-3 pl-3 pr-5 text-right"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="inline-flex items-center justify-end gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => setPreview(asset)}
                                                                aria-label={t('Quick preview')}
                                                                className="h-7 w-7 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-flex items-center justify-center cursor-pointer"
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopyUrl(asset.file_url, asset.id)}
                                                                aria-label={t('Sao chép link')}
                                                                className="h-7 w-7 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-flex items-center justify-center cursor-pointer"
                                                            >
                                                                {copiedId === asset.id ? (
                                                                    <Check size={14} className="text-emerald-600" />
                                                                ) : (
                                                                    <Copy size={14} />
                                                                )}
                                                            </button>
                                                            <a
                                                                href={asset.file_url}
                                                                download={asset.name || 'media'}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                aria-label={t('Tải về máy')}
                                                                className="h-7 w-7 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-flex items-center justify-center"
                                                            >
                                                                <DownloadSimple size={14} />
                                                            </a>
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeleteTarget(asset)}
                                                                aria-label={t('Delete')}
                                                                className="h-7 w-7 rounded-md text-zinc-400 hover:text-dangerFg hover:bg-dangerBg/60 inline-flex items-center justify-center cursor-pointer"
                                                            >
                                                                <Trash size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </>
            )}

            {/* Right-Side Slide-Over Upload Drawer (Step 1: Brand -> Step 2: Uploader) */}
            <Sheet open={uploadDrawerOpen} onOpenChange={setUploadDrawerOpen}>
                <SheetContent side="right" className="w-full sm:max-w-[500px] p-0 flex flex-col bg-white">
                    <div className="px-6 py-5 border-b border-zinc-200/80">
                        <h2 className="font-heading text-[18px] font-medium text-zinc-900">
                            {t('Tải tệp mới lên thư viện')}
                        </h2>
                        <p className="text-[12.5px] text-zinc-500 mt-0.5">
                            {t('Chọn thương hiệu phụ trách trước, sau đó kéo thả ảnh JPG, PNG, WebP hoặc video MP4.')}
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-clean">
                        {/* Step 1: Brand Selection */}
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ffd631] border border-[#d8b216] text-[11px] font-semibold text-[#2b2100]">
                                    1
                                </span>
                                <span className="font-heading text-[13.5px] font-medium text-zinc-900">
                                    {t('Chọn thương hiệu')}
                                </span>
                            </div>

                            {activeBrands.length <= 4 ? (
                                <div className={`grid grid-cols-1 ${activeBrands.length > 1 ? 'sm:grid-cols-2' : ''} gap-2`}>
                                    {activeBrands.map((b) => {
                                        const chosen = uploadBrand === b.id;
                                        return (
                                            <button
                                                key={b.id}
                                                type="button"
                                                disabled={demoMode || busy}
                                                onClick={() => setUploadBrand(b.id)}
                                                className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-colors cursor-pointer disabled:opacity-50 ${
                                                    chosen
                                                        ? 'border-[#d8b216] bg-[#ffd631]/15'
                                                        : 'border-zinc-200/90 bg-white hover:border-zinc-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: b.color || '#ffd631' }}
                                                    />
                                                    <span className="text-[13px] font-medium text-zinc-900 truncate">
                                                        {b.name}
                                                    </span>
                                                </div>
                                                {chosen ? (
                                                    <CheckCircle size={15} weight="fill" className="text-[#2b2100] shrink-0" />
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <select
                                    aria-label={t('Brand for uploaded images')}
                                    value={uploadBrand}
                                    onChange={(e) => setUploadBrand(e.target.value)}
                                    disabled={demoMode || busy}
                                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631]"
                                >
                                    <option value="">{t('Chọn thương hiệu')}</option>
                                    {activeBrands.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Step 2: Uploader */}
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ffd631] border border-[#d8b216] text-[11px] font-semibold text-[#2b2100]">
                                    2
                                </span>
                                <span className="font-heading text-[13.5px] font-medium text-zinc-900">
                                    {t('Chọn hoặc kéo thả tệp')}
                                </span>
                            </div>

                            <MediaUploader
                                allowLibrary={false}
                                onBusyChange={setBusy}
                                assets={[]}
                                onChange={() => {
                                    load();
                                    setUploadDrawerOpen(false);
                                    toast({ title: t('Tải tệp lên thành công!') });
                                }}
                                brandId={uploadBrand}
                                demoMode={demoMode}
                            />
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-zinc-200/80 bg-zinc-50/70 flex justify-end">
                        <Button variant="outline" onClick={() => setUploadDrawerOpen(false)} disabled={busy}>
                            {t('Đóng')}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Right-Side Slide-Over Asset Inspector Drawer */}
            <Sheet open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
                <SheetContent side="right" className="w-full sm:max-w-[540px] p-0 flex flex-col bg-white">
                    {preview ? (
                        <>
                            <div className="px-6 py-4 border-b border-zinc-200/80 flex items-start gap-3 pr-14">
                                <span className="h-10 w-10 rounded-xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-zinc-700 shrink-0">
                                    {preview.file_type === 'video' ? (
                                        <FilmStrip size={19} weight="duotone" />
                                    ) : (
                                        <FileImage size={19} weight="duotone" />
                                    )}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <h2
                                        className="font-heading text-[15.5px] font-medium text-zinc-900 truncate"
                                        title={preview.name}
                                    >
                                        {preview.name}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[12px] text-zinc-500 font-mono">
                                        <span>{formatBytes(preview.size_bytes)}</span>
                                        <span>·</span>
                                        <span className="uppercase">{preview.file_type || 'MEDIA'}</span>
                                        <span>·</span>
                                        <span>{formatDay(preview.created_date)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-clean">
                                {/* Media Preview Stage */}
                                <div className="relative rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4 flex items-center justify-center min-h-[280px] max-h-[52vh] overflow-hidden">
                                    <div
                                        className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:14px_14px]"
                                        aria-hidden="true"
                                    />
                                    {preview.file_type === 'video' ? (
                                        <video
                                            src={preview.file_url}
                                            controls
                                            autoPlay
                                            className="max-h-[46vh] max-w-full rounded-xl object-contain relative z-10"
                                        />
                                    ) : (
                                        <img
                                            src={preview.file_url}
                                            alt={preview.name}
                                            className="max-h-[46vh] max-w-full rounded-xl object-contain select-none relative z-10"
                                        />
                                    )}
                                </div>

                                {/* Quick Link Actions */}
                                <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => handleCopyUrl(preview.file_url, 'preview')}
                                        className="h-9 px-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-[12.5px] font-medium text-zinc-800 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        {copiedId === 'preview' ? (
                                            <>
                                                <Check size={14} className="text-emerald-600" />
                                                <span className="text-emerald-700">{t('Đã sao chép')}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={14} className="text-zinc-500" />
                                                <span>{t('Sao chép link')}</span>
                                            </>
                                        )}
                                    </button>
                                    <a
                                        href={preview.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-9 px-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-[12.5px] font-medium text-zinc-800 inline-flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <ArrowSquareOut size={14} className="text-zinc-500" />
                                        <span>{t('Mở tệp gốc')}</span>
                                    </a>
                                </div>

                                {/* Metadata Table */}
                                <div className="rounded-xl border border-zinc-200/80 divide-y divide-zinc-100 text-[13px]">
                                    <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                                        <span className="text-zinc-500">{t('Thương hiệu')}</span>
                                        {brandMap[preview.brand_id] ? (
                                            <span className="inline-flex items-center gap-1.5 font-medium text-zinc-900">
                                                <span
                                                    className="h-2 w-2 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            brandMap[preview.brand_id]?.color || '#a1a1aa',
                                                    }}
                                                />
                                                {brandMap[preview.brand_id]?.name}
                                            </span>
                                        ) : (
                                            <span className="text-zinc-400">—</span>
                                        )}
                                    </div>
                                    <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                                        <span className="text-zinc-500">{t('Dung lượng')}</span>
                                        <span className="font-mono text-zinc-900">
                                            {formatBytes(preview.size_bytes)}
                                        </span>
                                    </div>
                                    <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                                        <span className="text-zinc-500">{t('Ngày tải lên')}</span>
                                        <span className="text-zinc-900">{formatDay(preview.created_date)}</span>
                                    </div>
                                    {preview.is_demo ? (
                                        <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                                            <span className="text-zinc-500">{t('Nguồn')}</span>
                                            <StatusBadge tone="info">{t('Demo')}</StatusBadge>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-zinc-200/80 bg-zinc-50/70 flex items-center justify-between gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-dangerFg hover:text-dangerFg hover:bg-dangerBg/60"
                                    onClick={() => setDeleteTarget(preview)}
                                >
                                    <Trash size={14} className="mr-1.5" />
                                    {t('Delete')}
                                </Button>

                                <a
                                    href={preview.file_url}
                                    download={preview.name || 'media'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-skew"
                                >
                                    <DownloadSimple size={15} weight="duotone" />
                                    <span>{t('Tải về máy')}</span>
                                </a>
                            </div>
                        </>
                    ) : null}
                </SheetContent>
            </Sheet>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(value) => !value && setDeleteTarget(null)}
                title={t('Delete this file?')}
                description={t(
                    isDesktop()
                        ? 'This removes the library entry. Referenced files cannot be removed. Stored bytes are retained locally for recovery.'
                        : 'It is removed from the library. Posts that reference it are checked before this happens.'
                )}
                confirmLabel={t('Delete file')}
                destructive
                onConfirm={remove}
            />
        </div>
    );
}
