import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import {
    UploadSimple,
    ImageSquare,
    ArrowUp,
    ArrowDown,
    DotsSixVertical,
    Check,
    CircleNotch,
    VideoCamera,
} from '@phosphor-icons/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { isDesktop } from '@/api/desktop/runtime';

const ignoreBusy = (_busy) => {};

export default function MediaUploader({
    assets,
    onChange,
    brandId,
    demoMode,
    onBusyChange = ignoreBusy,
    allowLibrary = true,
}) {
    const { t } = useTranslation();
    const input = useRef(null);
    const root = useRef(null);
    const libraryRequest = useRef(0);
    const dragging = useRef(null);
    const [draggedId, setDraggedId] = useState(null);
    const [targetId, setTargetId] = useState(null);
    const [library, setLibrary] = useState([]);
    const [mediaTab, setMediaTab] = useState('all');
    const [showLibrary, setShowLibrary] = useState(false);
    const [loadingLibrary, setLoadingLibrary] = useState(false);
    const [busy, setBusy] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');

    async function importLocal() {
        const version = libraryRequest.current;
        setBusy(true);
        onBusyChange(true);
        setError('');
        try {
            const result = await appClient.media.importLocal(brandId);
            if (version !== libraryRequest.current) return;
            if (result.errors.length) setError(result.errors.join('\n'));
            if (result.cancelled) return;
            const added = [...assets, ...result.items];
            if (
                allowLibrary &&
                (added.length > 10 ||
                    (added.some((asset) => asset.file_type === 'video') && added.length !== 1))
            ) {
                setError(
                    'Files were saved to the library. Choose one video or up to 10 images for this post.'
                );
                return;
            }
            onChange(allowLibrary ? added : []);
        } catch (err) {
            if (version === libraryRequest.current) setError(err.message);
        } finally {
            if (version === libraryRequest.current) {
                setBusy(false);
                onBusyChange(false);
            }
        }
    }

    useEffect(() => {
        libraryRequest.current++;
        setShowLibrary(false);
        setLibrary([]);
        setBusy(false);
        setLoadingLibrary(false);
        onBusyChange(false);
        return () => {
            libraryRequest.current++;
        };
    }, [brandId, onBusyChange]);

    async function handleFiles(files) {
        if (!brandId || demoMode || !files.length) return;
        if (assets.length + files.length > 10) {
            setError('Choose up to 10 different images');
            return;
        }
        setBusy(true);
        onBusyChange(true);
        setError('');
        const added = [...assets];
        const video = files.some((file) => file.type === 'video/mp4' || /\.mp4$/i.test(file.name));
        if (
            (video && (files.length !== 1 || assets.length)) ||
            (!video && assets.some((asset) => asset.file_type === 'video'))
        ) {
            setError('Choose one video or up to 10 images, not both');
            setBusy(false);
            onBusyChange(false);
            return;
        }
        try {
            for (const file of files) {
                if (file.type === 'video/mp4' || /\.mp4$/i.test(file.name)) {
                    if (file.size > 100 * 1000 * 1000)
                        throw new Error('Choose an MP4 video up to 100 MB');
                    setProgress(0);
                    added.push(await appClient.media.uploadVideo(file, brandId, setProgress));
                    onChange([...added]);
                    continue;
                }
                if (
                    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
                    file.size > 3 * 1024 * 1024
                )
                    throw new Error('Choose JPEG, PNG or WebP images up to 3 MiB each');
                const bitmap = await createImageBitmap(file).catch(() => {
                    throw new Error('Choose a valid image');
                });
                const pixels = bitmap.width * bitmap.height;
                bitmap.close();
                if (pixels > 40000000)
                    throw new Error(
                        'Choose a valid JPEG, PNG or still WebP image under 40 megapixels'
                    );
                setProgress(0);
                added.push(await appClient.media.upload(file, brandId, setProgress));
                onChange([...added]);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
            onBusyChange(false);
        }
    }

    async function upload(event) {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        await handleFiles(files);
    }

    async function chooseLibrary() {
        setShowLibrary(true);
        const request = ++libraryRequest.current;
        setError('');
        setBusy(true);
        setLoadingLibrary(true);
        onBusyChange(true);
        try {
            const page = await appClient.entities.MediaAsset.filter(
                { brand_id: brandId, is_demo: false },
                { sort: '-created_date', limit: 100 }
            );
            if (request !== libraryRequest.current) return;
            setLibrary(page.items.filter((image) => image.storage_id && image.brand_id === brandId));
        } catch (e) {
            if (request === libraryRequest.current) setError(e.message);
        } finally {
            if (request === libraryRequest.current) {
                setBusy(false);
                setLoadingLibrary(false);
                onBusyChange(false);
            }
        }
    }

    function reorder(sourceId, destinationId) {
        if (busy || !sourceId || sourceId === destinationId) return;
        const from = assets.findIndex((asset) => asset.id === sourceId);
        const to = assets.findIndex((asset) => asset.id === destinationId);
        if (from < 0 || to < 0) return;
        const next = [...assets];
        const [asset] = next.splice(from, 1);
        next.splice(to, 0, asset);
        onChange(next);
    }

    function finishDrag() {
        dragging.current = null;
        setDraggedId(null);
        setTargetId(null);
    }

    function pointerTarget(event) {
        const target = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest('[data-sortable-media]');
        return target && root.current?.contains(target)
            ? target.getAttribute('data-sortable-media')
            : null;
    }

    function move(index, offset) {
        const next = [...assets];
        [next[index], next[index + offset]] = [next[index + offset], next[index]];
        onChange(next);
    }

    return (
        <div ref={root} className="space-y-3">
            <input
                ref={input}
                aria-label={t('Upload media')}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4"
                multiple
                className="hidden"
                disabled={busy || !brandId || demoMode}
                onChange={upload}
            />

            {/* Centered Modern Dropzone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const files = Array.from(e.dataTransfer.files || []);
                    if (files.length) handleFiles(files);
                }}
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                    dragOver ? 'border-[#ffd631] bg-[#ffd631]/5' : 'border-border/80 bg-muted/20 hover:bg-muted/30'
                }`}
            >
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-2">
                    <ImageSquare size={22} weight="duotone" />
                </div>
                <div className="font-heading font-semibold text-xs text-foreground mb-1">
                    {t('Drag and drop files here')}
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">
                    {t('or click to upload · JPG, PNG, MP4 · up to 10 photos or 1 video')}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        className="rounded-xl h-8 px-3 text-xs font-medium cursor-pointer"
                        disabled={busy || !brandId || demoMode}
                        onClick={() => (isDesktop() ? importLocal() : input.current.click())}
                    >
                        <UploadSimple size={14} className="mr-1.5" />
                        {t(isDesktop() ? 'Import media' : 'Upload media')}
                    </Button>

                    {allowLibrary && (
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            className="rounded-xl h-8 px-3 text-xs font-medium cursor-pointer"
                            disabled={busy || !brandId || demoMode}
                            onClick={chooseLibrary}
                        >
                            <ImageSquare className="mr-1.5" size={14} />
                            {t('Choose from library')}
                        </Button>
                    )}
                </div>
            </div>

            {busy && !showLibrary && (
                <p role="status" className="label-xs flex items-center gap-2">
                    <CircleNotch size={14} className="animate-spin" />
                    <span>
                        {t(loadingLibrary ? 'Loading…' : isDesktop() ? 'Importing media…' : 'Uploading media')}
                        {!loadingLibrary && !isDesktop() && <> · {progress}%</>}
                    </span>
                </p>
            )}

            {error && !showLibrary && (
                <p role="alert" className="text-dangerFg text-xs">
                    {t(error)}
                </p>
            )}

            {/* Attached media list */}
            {assets.length > 0 && (
                <div className="pt-2">
                    {assets.length > 1 && (
                        <p className="label-xs mb-2 text-muted-foreground">
                            {t('Drag images to change their order.')}
                        </p>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                        {assets.map((asset, index) => (
                            <div
                                key={asset.id}
                                data-sortable-media={asset.id}
                                draggable={!busy && asset.file_type !== 'video' && assets.length > 1}
                                onDragStart={(event) => {
                                    dragging.current = asset.id;
                                    setDraggedId(asset.id);
                                    event.dataTransfer.effectAllowed = 'move';
                                    event.dataTransfer.setData('text/plain', asset.id);
                                }}
                                onDragOver={(event) => {
                                    if (!busy && dragging.current) {
                                        event.preventDefault();
                                        event.dataTransfer.dropEffect = 'move';
                                        setTargetId(asset.id);
                                    }
                                }}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    reorder(dragging.current, asset.id);
                                    finishDrag();
                                }}
                                onDragEnd={finishDrag}
                                className={
                                    'border border-border rounded-xl p-2.5 bg-card transition-all ' +
                                    (draggedId === asset.id ? 'opacity-50 ' : '') +
                                    (targetId === asset.id && draggedId !== asset.id
                                        ? 'ring-2 ring-primary '
                                        : '') +
                                    (assets.length > 1 && asset.file_type !== 'video'
                                        ? 'cursor-grab active:cursor-grabbing'
                                        : '')
                                }
                            >
                                {asset.file_type === 'video' ? (
                                    <video
                                        src={asset.file_url}
                                        controls
                                        className="max-h-56 w-full rounded-lg bg-muted object-contain"
                                        preload="metadata"
                                    />
                                ) : (
                                    <img
                                        draggable={false}
                                        src={asset.file_url}
                                        alt={asset.name}
                                        className="h-28 w-full rounded-lg bg-muted object-contain"
                                    />
                                )}
                                <p className="text-xs font-medium text-foreground truncate mt-2">
                                    {index + 1}. {asset.name}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-border/50">
                                    {assets.length > 1 && asset.file_type !== 'video' && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            type="button"
                                            disabled={busy}
                                            aria-label={t('Drag image to reorder')}
                                            title={t('Drag image to reorder')}
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground touch-none cursor-grab active:cursor-grabbing rounded-md"
                                            onPointerDown={(event) => {
                                                if (busy || event.button !== 0) return;
                                                event.preventDefault();
                                                dragging.current = asset.id;
                                                setDraggedId(asset.id);
                                                event.currentTarget.setPointerCapture(event.pointerId);
                                            }}
                                            onPointerMove={(event) => {
                                                if (dragging.current) setTargetId(pointerTarget(event));
                                            }}
                                            onPointerUp={(event) => {
                                                reorder(dragging.current, pointerTarget(event));
                                                finishDrag();
                                            }}
                                            onPointerCancel={finishDrag}
                                            onLostPointerCapture={finishDrag}
                                            onDragStart={(event) => event.preventDefault()}
                                        >
                                            <DotsSixVertical size={16} />
                                        </Button>
                                    )}
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        type="button"
                                        aria-label={t('Move image earlier')}
                                        disabled={busy || index === 0}
                                        onClick={() => move(index, -1)}
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-md"
                                    >
                                        <ArrowUp size={13} />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        type="button"
                                        aria-label={t('Move image later')}
                                        disabled={busy || index === assets.length - 1}
                                        onClick={() => move(index, 1)}
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-md"
                                    >
                                        <ArrowDown size={13} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        type="button"
                                        disabled={busy}
                                        onClick={() =>
                                            onChange(assets.filter((image) => image.id !== asset.id))
                                        }
                                        className="h-7 px-2 text-dangerFg text-xs ml-auto hover:bg-red-50 hover:text-red-700 rounded-md"
                                    >
                                        {t('Remove')}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Popup Dialog chọn từ thư viện */}
            <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
                <DialogContent className="max-w-[1100px] w-[95vw] max-h-[88vh] flex flex-col p-6 sm:p-7">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                            <ImageSquare size={22} className="text-foreground" />
                            {t('Choose from library')}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {t('Select stored media for this brand to add to your post.')}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Filter Tabs: Tất cả / Hình ảnh / Video */}
                    {library.length > 0 && (
                        <div className="flex items-center gap-2 mb-3 border-b border-border/60 pb-3">
                            <button
                                type="button"
                                onClick={() => setMediaTab('all')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                                    mediaTab === 'all'
                                        ? 'bg-foreground text-background shadow-xs'
                                        : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                            >
                                {t('All')} ({library.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setMediaTab('image')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                                    mediaTab === 'image'
                                        ? 'bg-foreground text-background shadow-xs'
                                        : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                            >
                                <ImageSquare size={15} />
                                <span>{t('Images')}</span>
                                <span className="opacity-70 font-mono">
                                    ({library.filter((i) => i.file_type !== 'video').length})
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMediaTab('video')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                                    mediaTab === 'video'
                                        ? 'bg-foreground text-background shadow-xs'
                                        : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                            >
                                <VideoCamera size={15} />
                                <span>{t('Videos')}</span>
                                <span className="opacity-70 font-mono">
                                    ({library.filter((i) => i.file_type === 'video').length})
                                </span>
                            </button>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[60vh] pr-1.5 scroll-slim">
                        {loadingLibrary ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                                <CircleNotch size={28} className="animate-spin text-foreground" />
                                <span className="text-xs font-medium">{t('Loading…')}</span>
                            </div>
                        ) : !library.length ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center border border-dashed border-border rounded-2xl p-8">
                                <ImageSquare size={44} className="text-muted-foreground/40 mb-3" />
                                <p className="text-base font-medium text-foreground">
                                    {t('No stored media for this brand.')}
                                </p>
                                <p className="label-xs text-muted-foreground mt-1">
                                    {t('Upload files from your computer to start building your library.')}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {library
                                    .filter((image) => {
                                        if (mediaTab === 'image') return image.file_type !== 'video';
                                        if (mediaTab === 'video') return image.file_type === 'video';
                                        return true;
                                    })
                                    .map((image) => {
                                    const isSelected = assets.some((asset) => asset.id === image.id);
                                    const isVideo = image.file_type === 'video';
                                    const hasVideo = assets.some((asset) => asset.file_type === 'video');
                                    const isDisabled =
                                        !isSelected &&
                                        (assets.length >= 10 ||
                                            busy ||
                                            (isVideo ? assets.length > 0 : hasVideo));

                                    return (
                                        <div
                                            key={image.id}
                                            onClick={() => {
                                                if (isDisabled) return;
                                                if (isSelected) {
                                                    onChange(assets.filter((a) => a.id !== image.id));
                                                } else {
                                                    onChange([...assets, image]);
                                                }
                                            }}
                                            className={`group relative rounded-xl border p-2.5 cursor-pointer transition-all select-none flex flex-col ${
                                                isSelected
                                                    ? 'border-brand bg-brand/10 ring-2 ring-brand shadow-sm'
                                                    : isDisabled
                                                    ? 'opacity-40 cursor-not-allowed border-border bg-muted/20'
                                                    : 'border-border hover:border-border-hover hover:bg-muted/40 bg-card shadow-2xs'
                                            }`}
                                        >
                                            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                                                {isVideo ? (
                                                    <>
                                                        <video
                                                            src={image.file_url}
                                                            className="h-full w-full object-cover"
                                                            preload="metadata"
                                                            muted
                                                        />
                                                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                                                            <div className="h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center">
                                                                <VideoCamera size={16} weight="fill" />
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <img
                                                        src={image.file_url}
                                                        alt={image.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                )}

                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 h-6 w-6 rounded-md bg-brand text-brand-ink border border-brand-dark flex items-center justify-center shadow-sm">
                                                        <Check size={14} weight="bold" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs font-semibold text-foreground truncate mt-2.5 px-0.5">
                                                {image.name}
                                            </p>
                                            <span className="label-xs text-muted-foreground px-0.5 mt-0.5">
                                                {isVideo ? 'Video MP4' : 'Image'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                        <span className="text-xs text-foreground font-medium bg-muted px-2.5 py-1 rounded-full">
                            {assets.length} / 10 {t('selected')}
                        </span>
                        <button
                            type="button"
                            className="btn-skew px-6 py-2.5"
                            onClick={() => setShowLibrary(false)}
                        >
                            {t('Done')}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
