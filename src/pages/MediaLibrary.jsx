import AutopilotLibrary from '@/components/media/AutopilotLibrary';
import { useTranslation } from '@/lib/i18n';
import { useRef, useState, useCallback, useEffect } from 'react';
import {
    FolderOpen,
    Trash,
    MagnifyingGlass,
    FileImage,
    FilmStrip,
    HardDrives,
    CloudArrowUp,
    Sparkle,
    SquaresFour,
    CaretDown,
    Eye,
    Tag,
    DownloadSimple,
    Copy,
    Check,
    ArrowSquareOut,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import StatusBadge from '@/components/common/StatusBadge';
import StatCard from '@/components/common/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Image } from '@/components/ui/image';
import MediaUploader from '@/components/composer/MediaUploader';
import { referencedMediaIds } from '@/lib/publishing-content';
import { formatBytes, formatDay } from '@/lib/format';
import LoadError from '@/components/common/load-error';
import { isDesktop } from '@/api/desktop/runtime';

export default function MediaLibrary() {
    const { t } = useTranslation();
    const { scope, brands, selectedBrandId, demoMode } = useWorkspace();
    const { toast } = useToast();
    const [uploadBrand, setUploadBrand] = useState(
        selectedBrandId === 'all' ? '' : selectedBrandId
    );
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState([]);
    const [search, setSearch] = useState('');
    const [type, setType] = useState('all');
    const [preview, setPreview] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'autopilot'
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const version = useRef(0);

    const handleCopyUrl = (url) => {
        if (!url) return;
        navigator.clipboard?.writeText(url);
        setCopiedUrl(true);
        toast({ title: t('Đã sao chép liên kết tệp!') });
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    useEffect(() => {
        setUploadBrand(selectedBrandId === 'all' ? '' : selectedBrandId);
    }, [selectedBrandId]);

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
            if (request === version.current) setAssets(page.items);
        } catch (err) {
            if (request === version.current) setError(err.message);
        } finally {
            if (request === version.current) setLoading(false);
        }
    }, [scope, type, search]);

    useEffect(() => {
        const timer = setTimeout(load, search ? 300 : 0);
        return () => {
            clearTimeout(timer);
            version.current++;
        };
    }, [load, search]);

    const remove = async () => {
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
        setDeleteTarget(null);
        load();
    };

    // Calculate metrics
    const totalFiles = assets.length;
    const imageCount = assets.filter((a) => a.file_type === 'image').length;
    const videoCount = assets.filter((a) => a.file_type === 'video').length;
    const totalBytes = assets.reduce((acc, a) => acc + (a.size_bytes || 0), 0);

    const showAutopilot = !isDesktop() && !demoMode;

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            <PageHeader
                title={t('Media Library')}
                description={t(
                    isDesktop()
                        ? 'Images and MP4 videos copied into this computer’s workspace.'
                        : 'Private images and MP4 videos stored in this workspace.'
                )}
                actions={
                    <button
                        type="button"
                        onClick={() => setUploadModalOpen(true)}
                        className="btn-skew"
                    >
                        <CloudArrowUp size={16} weight="bold" />
                        <span>{t('Upload new media')}</span>
                    </button>
                }
            />

            {/* KPI Stat Cards matching Image 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <StatCard
                    label={t('All media')}
                    value={totalFiles}
                    hint={t('In this workspace')}
                    icon={FolderOpen}
                    iconBg="bg-white border-neutral-300"
                    iconColor="text-neutral-900"
                    badge={totalFiles > 0 ? `${totalFiles} TỆP` : null}
                    badgeClass="bg-blue-500/10 text-blue-800 border-blue-500/30 font-semibold"
                />
                <StatCard
                    label={t('Images only')}
                    value={imageCount}
                    hint={t('{count} images', { count: imageCount })}
                    icon={FileImage}
                    iconBg="bg-white border-neutral-300"
                    iconColor="text-neutral-900"
                    badge={imageCount > 0 ? `${imageCount} ẢNH` : null}
                    badgeClass="bg-amber-500/10 text-amber-900 border-amber-500/30 font-semibold"
                />
                <StatCard
                    label={t('Video only')}
                    value={videoCount}
                    hint={t('{count} videos', { count: videoCount })}
                    icon={FilmStrip}
                    iconBg="bg-white border-neutral-300"
                    iconColor="text-neutral-900"
                    badge={videoCount > 0 ? `${videoCount} VIDEO` : null}
                    badgeClass="bg-purple-500/10 text-purple-800 border-purple-500/30 font-semibold"
                />
                <StatCard
                    label={t('Total storage')}
                    value={formatBytes(totalBytes)}
                    hint={totalFiles > 0 ? `${totalFiles} ${t('files')}` : '0 B'}
                    icon={HardDrives}
                    iconBg="bg-white border-neutral-300"
                    iconColor="text-neutral-900"
                    badge={totalFiles > 0 ? 'LƯU TRỮ' : null}
                    badgeClass="bg-emerald-500/10 text-emerald-800 border-emerald-500/30 font-semibold"
                />
            </div>

            {/* View Filter Tabs */}
            {showAutopilot && (
                <div className="flex items-center gap-2 border-b border-neutral-200/80 pb-3">
                    <button
                        type="button"
                        onClick={() => setActiveTab('all')}
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all cursor-pointer ${
                            activeTab === 'all'
                                ? 'bg-foreground text-background shadow-xs'
                                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                        }`}
                    >
                        <SquaresFour size={16} weight={activeTab === 'all' ? 'bold' : 'regular'} />
                        <span>{t('All library')}</span>
                        <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono ${
                                activeTab === 'all'
                                    ? 'bg-neutral-800 text-white'
                                    : 'bg-neutral-200/80 text-neutral-700'
                            }`}
                        >
                            {totalFiles}
                        </span>
                    </button>


                    <button
                        type="button"
                        onClick={() => setActiveTab('autopilot')}
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all cursor-pointer ${
                            activeTab === 'autopilot'
                                ? 'bg-foreground text-background shadow-xs'
                                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                        }`}
                    >
                        <Sparkle size={16} weight={activeTab === 'autopilot' ? 'bold' : 'regular'} />
                        <span>{t('Autopilot assets')}</span>
                        <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono ${
                                activeTab === 'autopilot'
                                    ? 'bg-neutral-800 text-white'
                                    : 'bg-neutral-200/80 text-neutral-700'
                            }`}
                        >
                            Drive
                        </span>
                    </button>
                </div>
            )}

            {/* Drag & Drop File Upload Box (Thay thế vị trí Autopilot theo yêu cầu) */}
            {activeTab === 'all' && (
                <div className="p-5 bg-white border border-neutral-200/80 rounded-2xl shadow-2xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-2xs shrink-0">
                                <CloudArrowUp size={17} weight="bold" />
                            </span>
                            <div>
                                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                                    {t('Tải lên tệp mới')}
                                </h3>
                                <p className="text-[11px] text-neutral-500">
                                    {t('Kéo thả hoặc chọn tệp ảnh JPG, PNG, WebP hoặc video MP4')}
                                </p>
                            </div>
                        </div>

                        {/* Brand Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-neutral-500 flex items-center gap-1.5">
                                <Tag size={14} className="text-neutral-400" />
                                <span>{t('Thương hiệu:')}</span>
                            </span>
                            <div className="relative">
                                <select
                                    aria-label={t('Brand for uploaded images')}
                                    value={uploadBrand}
                                    onChange={(event) => setUploadBrand(event.target.value)}
                                    disabled={demoMode || busy}
                                    className="h-8 rounded-xl border border-neutral-200 bg-white pl-2.5 pr-8 text-xs font-semibold text-neutral-900 transition-all hover:bg-neutral-50 focus:outline-none focus:border-neutral-900 appearance-none cursor-pointer shadow-2xs"
                                >
                                    <option value="">{t('Chọn thương hiệu')}</option>
                                    {brands
                                        .filter((brand) => brand.status !== 'archived')
                                        .map((brand) => (
                                            <option key={brand.id} value={brand.id}>
                                                {brand.name}
                                            </option>
                                        ))}
                                </select>
                                <CaretDown
                                    size={13}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400"
                                />
                            </div>
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
                </div>
            )}

            {/* Section: Autopilot Library (Chỉ hiện khi chọn tab Autopilot) */}
            {showAutopilot && activeTab === 'autopilot' && (
                <AutopilotLibrary
                    brandId={uploadBrand || brands?.[0]?.id || ''}
                    onBrandChange={setUploadBrand}
                />
            )}

            {/* Section: Uploaded Media Gallery */}
            {activeTab === 'all' && (
                <div className="space-y-5">
                    {/* Filter & Action Bar for Uploaded Assets */}
                    <div className="p-4 bg-white border border-neutral-200/80 rounded-2xl shadow-2xs">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div className="flex flex-wrap items-end gap-3 flex-1 min-w-[280px]">
                                <div className="min-w-[220px] flex-1 max-w-md">
                                    <Label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                                        {t('Search by file name')}
                                    </Label>
                                    <div className="relative">
                                        <MagnifyingGlass
                                            size={15}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                                        />
                                        <Input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder={t('Search media by name...')}
                                            className="h-9 rounded-xl border-neutral-200 bg-neutral-50/50 pl-9 text-xs focus:bg-white focus:border-neutral-900 transition"
                                        />
                                    </div>
                                </div>

                                <div className="min-w-[160px]">
                                    <Label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                                        {t('Type')}
                                    </Label>
                                    <div className="relative">
                                        <select
                                            aria-label={t('Type')}
                                            value={type}
                                            onChange={(e) => setType(e.target.value)}
                                            className="h-9 w-full rounded-xl border border-neutral-200 bg-white px-3 pr-8 text-xs font-semibold text-neutral-900 transition-all hover:bg-neutral-50 focus:outline-none focus:border-neutral-900 appearance-none cursor-pointer"
                                        >
                                            <option value="all">{t('Images and video')}</option>
                                            <option value="image">{t('Images only')}</option>
                                            <option value="video">{t('Video only')}</option>
                                        </select>
                                        <CaretDown
                                            size={13}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400"
                                        />
                                    </div>
                                </div>

                                <span className="rounded-xl bg-neutral-100 border border-neutral-200/80 px-3 py-2 text-xs font-medium text-neutral-600">
                                    <strong className="text-neutral-900 font-mono">{assets.length}</strong> {t('files')}
                                </span>
                            </div>

                            {/* Quick Add Button in Filter Bar */}
                            <button
                                type="button"
                                onClick={() => setUploadModalOpen(true)}
                                className="btn-skew"
                            >
                                <CloudArrowUp size={16} weight="bold" />
                                <span>{t('Upload new media')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Media Assets Grid (Visual-First, Directly Visible) */}
                    {error ? (
                        <LoadError message={error} onRetry={load} />
                    ) : loading ? (
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {[0, 1, 2, 3].map((key) => (
                                <Skeleton key={key} className="h-[220px] rounded-2xl" />
                            ))}
                        </div>
                    ) : !assets.length ? (
                        <EmptyState
                            icon={FolderOpen}
                            title={t('No media yet')}
                            description={t(
                                isDesktop()
                                    ? 'Choose a brand above and import media from this computer.'
                                    : 'Choose a brand above and upload images. They remain private until you approve a Facebook post.'
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => setUploadModalOpen(true)}
                                className="btn-skew"
                            >
                                <CloudArrowUp size={16} weight="bold" />
                                <span>{t('Upload new media')}</span>
                            </button>
                        </EmptyState>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {assets.map((asset) => (
                                <div
                                    key={asset.id}
                                    className="overflow-hidden border border-neutral-200/80 bg-white rounded-2xl shadow-2xs hover:border-neutral-300 hover:shadow-xs transition-all group flex flex-col justify-between"
                                >
                                    {/* Thumbnail Preview with Quick Action Button */}
                                    <div className="relative aspect-video w-full overflow-hidden bg-neutral-100 flex items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => setPreview(asset)}
                                            className="h-full w-full block focus:outline-none cursor-pointer"
                                            title={t('Quick preview')}
                                        >
                                            {asset.file_type === 'video' ? (
                                                <video
                                                    src={asset.file_url}
                                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    muted
                                                />
                                            ) : (
                                                <Image
                                                    src={asset.file_url}
                                                    alt={asset.name}
                                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    fittingType="fill"
                                                />
                                            )}
                                        </button>

                                        {/* Type badge on top left */}
                                        <div className="absolute left-2.5 top-2.5 pointer-events-none">
                                            <span className="inline-flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold uppercase text-white shadow-xs font-mono">
                                                {asset.file_type === 'video' ? (
                                                    <>
                                                        <FilmStrip size={11} />
                                                        <span>VIDEO</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FileImage size={11} />
                                                        <span>IMAGE</span>
                                                    </>
                                                )}
                                            </span>
                                        </div>

                                        {/* Hover Overlay with Preview Icon */}
                                        <div
                                            onClick={() => setPreview(asset)}
                                            className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer pointer-events-none"
                                        >
                                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-sm">
                                                <Eye size={18} />
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Metadata & Delete Action */}
                                    <div className="p-3.5 space-y-2">
                                        <p
                                            className="truncate text-xs font-bold text-neutral-900"
                                            title={asset.name}
                                        >
                                            {asset.name}
                                        </p>
                                        <p className="text-[11px] text-neutral-500 font-mono">
                                            {formatBytes(asset.size_bytes)} · {formatDay(asset.created_date)}
                                        </p>

                                        <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
                                            {asset.is_demo ? (
                                                <StatusBadge tone="info">{t('Demo')}</StatusBadge>
                                            ) : (
                                                <span />
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2.5 rounded-lg text-xs text-dangerFg hover:text-dangerFg hover:bg-rose-50 gap-1 ml-auto cursor-pointer"
                                                onClick={() => setDeleteTarget(asset)}
                                            >
                                                <Trash size={13} />
                                                <span>{t('Delete')}</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Upload Modal Popup (Popup Tải ảnh lên theo yêu cầu) */}
            <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
                <DialogContent className="max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200">
                    <DialogHeader className="mb-4">
                        <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs shrink-0">
                                <CloudArrowUp size={17} weight="bold" />
                            </span>
                            <div>
                                <DialogTitle className="text-sm font-bold text-neutral-900">
                                    {t('Upload new media')}
                                </DialogTitle>
                                <DialogDescription className="text-[11px] text-neutral-500 mt-0.5">
                                    {t('Drag and drop or select JPG, PNG, WebP or MP4 files')}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Brand Selector inside Modal */}
                    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 mb-4">
                        <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                            <Tag size={14} className="text-neutral-500" />
                            <span>{t('Brand')}:</span>
                        </span>
                        <div className="relative">
                            <select
                                aria-label={t('Brand for uploaded images')}
                                value={uploadBrand}
                                onChange={(event) => setUploadBrand(event.target.value)}
                                disabled={demoMode || busy}
                                className="h-8 rounded-lg border border-neutral-200 bg-white pl-2.5 pr-8 text-xs font-semibold text-neutral-900 transition-all hover:bg-neutral-50 focus:outline-none focus:border-neutral-900 appearance-none cursor-pointer"
                            >
                                <option value="">{t('Choose brand')}</option>
                                {brands
                                    .filter((brand) => brand.status !== 'archived')
                                    .map((brand) => (
                                        <option key={brand.id} value={brand.id}>
                                            {brand.name}
                                        </option>
                                    ))}
                            </select>
                            <CaretDown
                                size={13}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400"
                            />
                        </div>
                    </div>

                    {/* MediaUploader */}
                    <MediaUploader
                        allowLibrary={false}
                        onBusyChange={setBusy}
                        assets={[]}
                        onChange={() => {
                            load();
                            setUploadModalOpen(false);
                            toast({ title: t('Tải tệp lên thành công!') });
                        }}
                        brandId={uploadBrand}
                        demoMode={demoMode}
                    />
                </DialogContent>
            </Dialog>

            {/* Media Preview Dialog (Studio Inspector Layout) */}
            <Dialog open={!!preview} onOpenChange={(value) => !value && setPreview(null)}>
                <DialogContent className="max-w-4xl sm:max-w-4xl w-[94vw] !p-0 overflow-hidden rounded-3xl bg-white border border-neutral-200/90 shadow-2xl space-y-0">
                    {/* Header Bar */}
                    <div className="pl-5 sm:pl-6 pr-16 sm:pr-16 py-4 border-b border-neutral-100 flex items-center justify-between gap-3 bg-white shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200/80 flex items-center justify-center text-neutral-800 shrink-0 shadow-2xs">
                                {preview?.file_type === 'video' ? (
                                    <FilmStrip size={18} weight="duotone" />
                                ) : (
                                    <FileImage size={18} weight="duotone" />
                                )}
                            </span>
                            <div className="min-w-0">
                                <DialogTitle className="text-sm font-bold text-neutral-900 truncate" title={preview?.name}>
                                    {preview?.name}
                                </DialogTitle>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-500 font-mono">
                                    <span>{formatBytes(preview?.size_bytes)}</span>
                                    <span>•</span>
                                    <span className="uppercase font-semibold text-neutral-700">
                                        {preview?.file_type || 'MEDIA'}
                                    </span>
                                    {brands.find((b) => b.id === preview?.brand_id) && (
                                        <>
                                            <span>•</span>
                                            <span className="inline-flex items-center gap-1 font-sans text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded-md font-medium text-[10px]">
                                                <Tag size={10} className="text-neutral-400" />
                                                {brands.find((b) => b.id === preview?.brand_id)?.name}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top Quick Actions (cách xa nút đóng X) */}
                        <div className="flex items-center gap-2 shrink-0 mr-2">
                            <a
                                href={preview?.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-8 px-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                title={t('Open original file in new tab')}
                            >
                                <ArrowSquareOut size={13} weight="bold" />
                                <span className="hidden sm:inline">{t('Mở tệp gốc')}</span>
                            </a>
                            <button
                                type="button"
                                onClick={() => handleCopyUrl(preview?.file_url)}
                                className="h-8 px-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                title={t('Copy link')}
                            >
                                {copiedUrl ? (
                                    <>
                                        <Check size={13} weight="bold" className="text-emerald-600" />
                                        <span className="text-emerald-600 hidden sm:inline">{t('Đã chép')}</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={13} weight="bold" />
                                        <span className="hidden sm:inline">{t('Sao chép link')}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Media Viewer Stage - hiển thị đủ size ảnh không bị cắt */}
                    <div className="relative flex-1 min-h-[380px] max-h-[66vh] bg-neutral-950/[0.03] dark:bg-neutral-900/40 p-4 sm:p-6 flex items-center justify-center overflow-auto">
                        {/* Checkerboard pattern for transparent PNG / Alpha channel */}
                        <div
                            className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"
                            aria-hidden="true"
                        />
                        {preview?.file_type === 'video' ? (
                            <video
                                src={preview.file_url}
                                controls
                                autoPlay
                                className="max-h-[60vh] max-w-full w-auto h-auto rounded-2xl shadow-xs object-contain"
                            />
                        ) : (
                            <img
                                src={preview?.file_url}
                                alt={preview?.name}
                                className="max-h-[60vh] max-w-full w-auto h-auto rounded-2xl shadow-xs object-contain select-none"
                            />
                        )}
                    </div>

                    {/* Bottom Toolbar & Actions */}
                    <div className="px-5 sm:px-6 py-3.5 border-t border-neutral-100 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-3 text-xs text-neutral-500">
                            <span className="font-mono">
                                {t('Tải lên')}: <strong className="text-neutral-800 font-medium">{formatDay(preview?.created_date)}</strong>
                            </span>
                            {preview?.is_demo && (
                                <StatusBadge tone="info">{t('Demo')}</StatusBadge>
                            )}
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 px-3 rounded-xl text-xs text-dangerFg hover:text-dangerFg hover:bg-rose-50 gap-1.5 cursor-pointer font-semibold"
                                onClick={() => {
                                    const target = preview;
                                    setPreview(null);
                                    setDeleteTarget(target);
                                }}
                            >
                                <Trash size={14} />
                                <span>{t('Delete')}</span>
                            </Button>

                            <a
                                href={preview?.file_url}
                                download={preview?.name || 'media'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-skew"
                            >
                                <DownloadSimple size={16} weight="bold" />
                                <span>{t('Tải về máy')}</span>
                            </a>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Confirm Delete Dialog */}
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
