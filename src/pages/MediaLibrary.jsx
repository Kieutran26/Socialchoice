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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'uploads' | 'autopilot'
    const version = useRef(0);

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
        <div className="space-y-6">
            <PageHeader
                title={t('Media Library')}
                description={t(
                    isDesktop()
                        ? 'Images and MP4 videos copied into this computer’s workspace.'
                        : 'Private images and MP4 videos stored in this workspace.'
                )}
            />

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <StatCard
                    label={t('All media')}
                    value={totalFiles}
                    hint={t('In this workspace')}
                    icon={FolderOpen}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                />
                <StatCard
                    label={t('Images only')}
                    value={imageCount}
                    hint={t('{count} images', { count: imageCount })}
                    icon={FileImage}
                    iconBg="bg-amber-50"
                    iconColor="text-amber-600"
                />
                <StatCard
                    label={t('Video only')}
                    value={videoCount}
                    hint={t('{count} videos', { count: videoCount })}
                    icon={FilmStrip}
                    iconBg="bg-purple-50"
                    iconColor="text-purple-600"
                />
                <StatCard
                    label={t('Total storage')}
                    value={formatBytes(totalBytes)}
                    hint={totalFiles > 0 ? `${totalFiles} ${t('files')}` : '0 B'}
                    icon={HardDrives}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                />
            </div>

            {/* View Filter Tabs */}
            {showAutopilot && (
                <div className="flex items-center gap-2 border-b border-border/80 pb-3">
                    <button
                        type="button"
                        onClick={() => setActiveTab('all')}
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                            activeTab === 'all'
                                ? 'bg-foreground text-background shadow-xs'
                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                        }`}
                    >
                        <SquaresFour size={16} weight={activeTab === 'all' ? 'bold' : 'regular'} />
                        <span>{t('All library')}</span>
                        <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono ${
                                activeTab === 'all'
                                    ? 'bg-background/20 text-background'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            {totalFiles}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('uploads')}
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                            activeTab === 'uploads'
                                ? 'bg-foreground text-background shadow-xs'
                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                        }`}
                    >
                        <CloudArrowUp size={16} weight={activeTab === 'uploads' ? 'bold' : 'regular'} />
                        <span>{t('Uploaded media')}</span>
                        <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono ${
                                activeTab === 'uploads'
                                    ? 'bg-background/20 text-background'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            {totalFiles}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('autopilot')}
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                            activeTab === 'autopilot'
                                ? 'bg-foreground text-background shadow-xs'
                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                        }`}
                    >
                        <Sparkle size={16} weight={activeTab === 'autopilot' ? 'bold' : 'regular'} />
                        <span>{t('Autopilot assets')}</span>
                        <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono ${
                                activeTab === 'autopilot'
                                    ? 'bg-background/20 text-background'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            Drive
                        </span>
                    </button>
                </div>
            )}

            {/* Section: Autopilot Library */}
            {showAutopilot && (activeTab === 'all' || activeTab === 'autopilot') && (
                <AutopilotLibrary brandId={uploadBrand} />
            )}

            {/* Section: Upload Media */}
            {(activeTab === 'all' || activeTab === 'uploads') && (
                <div className="space-y-6">
                    <div className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <CloudArrowUp size={17} weight="bold" />
                                </span>
                                <div>
                                    <h3 className="text-[15px] font-semibold text-foreground">
                                        {t('Upload new media')}
                                    </h3>
                                    <p className="label-xs text-muted-foreground mt-0.5">
                                        {t('Drag and drop or select JPG, PNG, WebP or MP4 files')}
                                    </p>
                                </div>
                            </div>

                            {/* Brand Selector */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                    <Tag size={14} />
                                    <span>{t('Brand')}:</span>
                                </span>
                                <div className="relative">
                                    <select
                                        aria-label={t('Brand for uploaded images')}
                                        value={uploadBrand}
                                        onChange={(event) => setUploadBrand(event.target.value)}
                                        disabled={demoMode || busy}
                                        className="h-9 rounded-xl border border-border/80 bg-background pl-3 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
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
                                        size={14}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"
                                    />
                                </div>
                            </div>
                        </div>

                        <MediaUploader
                            allowLibrary={false}
                            onBusyChange={setBusy}
                            assets={[]}
                            onChange={() => load()}
                            brandId={uploadBrand}
                            demoMode={demoMode}
                        />
                    </div>

                    {/* Filter Bar for Uploaded Assets */}
                    <div className="panel p-4 bg-card border border-border/80 rounded-2xl shadow-2xs">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="min-w-[220px] flex-1">
                                <Label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                                    {t('Search by file name')}
                                </Label>
                                <div className="relative">
                                    <MagnifyingGlass
                                        size={15}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                    />
                                    <Input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder={t('Search media')}
                                        className="h-10 rounded-xl border-border/80 bg-background pl-9 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="min-w-[170px]">
                                <Label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                                    {t('Type')}
                                </Label>
                                <div className="relative">
                                    <select
                                        aria-label={t('Type')}
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                                    >
                                        <option value="all">{t('Images and video')}</option>
                                        <option value="image">{t('Images only')}</option>
                                        <option value="video">{t('Video only')}</option>
                                    </select>
                                    <CaretDown
                                        size={14}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"
                                    />
                                </div>
                            </div>

                            <span className="rounded-xl bg-muted/60 border border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                                <strong className="text-foreground">{assets.length}</strong> {t('files')}
                            </span>
                        </div>
                    </div>

                    {/* Media Assets Grid */}
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
                        />
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {assets.map((asset) => (
                                <div
                                    key={asset.id}
                                    className="panel overflow-hidden border border-border/80 bg-card rounded-2xl shadow-2xs hover:border-border hover:shadow-xs transition-all group flex flex-col justify-between"
                                >
                                    {/* Thumbnail Preview with Quick Action Button */}
                                    <div className="relative aspect-video w-full overflow-hidden bg-muted/40 flex items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => setPreview(asset)}
                                            className="h-full w-full block focus:outline-none"
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
                                            <span className="inline-flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold uppercase text-white shadow-xs">
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
                                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm">
                                                <Eye size={18} />
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Metadata & Delete Action */}
                                    <div className="p-3.5 space-y-2">
                                        <p
                                            className="truncate text-xs font-semibold text-foreground"
                                            title={asset.name}
                                        >
                                            {asset.name}
                                        </p>
                                        <p className="label-xs text-muted-foreground">
                                            {formatBytes(asset.size_bytes)} · {formatDay(asset.created_date)}
                                        </p>

                                        <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                                            {asset.is_demo ? (
                                                <StatusBadge tone="info">{t('Demo')}</StatusBadge>
                                            ) : (
                                                <span />
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 rounded-lg text-xs text-dangerFg hover:text-dangerFg hover:bg-rose-50 gap-1 ml-auto"
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

            {/* Media Preview Dialog */}
            <Dialog open={!!preview} onOpenChange={(value) => !value && setPreview(null)}>
                <DialogContent className="rounded-2xl sm:max-w-[680px] p-6 space-y-4">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-foreground truncate">
                            {preview?.name}
                        </DialogTitle>
                    </DialogHeader>
                    {preview?.file_type === 'video' ? (
                        <video
                            src={preview.file_url}
                            controls
                            className="max-h-[440px] w-full rounded-xl bg-black/90 object-contain"
                        />
                    ) : (
                        <Image
                            src={preview?.file_url}
                            alt={preview?.name}
                            className="max-h-[440px] w-full rounded-xl bg-muted/20 object-contain"
                            fittingType="fit"
                        />
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-3">
                        <span>
                            {formatBytes(preview?.size_bytes)} {t('· uploaded')}{' '}
                            {formatDay(preview?.created_date)}
                        </span>
                        {preview?.file_type && (
                            <span className="uppercase font-semibold text-[11px] bg-muted px-2 py-0.5 rounded-md text-foreground">
                                {preview.file_type}
                            </span>
                        )}
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
