import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { UploadSimple, ImageSquare, ArrowUp, ArrowDown, DotsSixVertical } from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { isDesktop } from '@/api/desktop/runtime';

const ignoreBusy = (_busy) => {};

export default function MediaUploader({ assets, onChange, brandId, demoMode, onBusyChange = ignoreBusy, allowLibrary = true }) {
    const { t } = useTranslation();
    const input = useRef(null);
    const root = useRef(null);
    const libraryRequest = useRef(0);
    const dragging = useRef(null);
    const [draggedId, setDraggedId] = useState(null);
    const [targetId, setTargetId] = useState(null);
    const [library, setLibrary] = useState([]), [showLibrary, setShowLibrary] = useState(false);
    const [loadingLibrary, setLoadingLibrary] = useState(false);
    const [busy, setBusy] = useState(false), [progress, setProgress] = useState(0), [error, setError] = useState('');
    async function importLocal() {
        const version=libraryRequest.current;
        setBusy(true);onBusyChange(true);setError('');
        try {
            const result=await appClient.media.importLocal(brandId);
            if(version!==libraryRequest.current)return;
            if(result.errors.length)setError(result.errors.join('\n'));
            if(result.cancelled)return;
            const added=[...assets,...result.items];
            if(allowLibrary && (added.length>10 || added.some(asset=>asset.file_type==='video') && added.length!==1)) {
                setError('Files were saved to the library. Choose one video or up to 10 images for this post.');return;
            }
            onChange(allowLibrary?added:[]);
        } catch(error) {if(version===libraryRequest.current)setError(error.message);}
        finally {if(version===libraryRequest.current){setBusy(false);onBusyChange(false);}}
    }
    useEffect(() => {
        libraryRequest.current++;
        setShowLibrary(false); setLibrary([]); setBusy(false); setLoadingLibrary(false); onBusyChange(false);
        return () => { libraryRequest.current++; };
    }, [brandId, onBusyChange]);
    async function upload(event) {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        if (!brandId || demoMode || !files.length) return;
        if (assets.length + files.length > 10) { setError('Choose up to 10 different images'); return; }
        setBusy(true); onBusyChange(true); setError('');
        const added = [...assets];
        const video = files.some(file => file.type === 'video/mp4' || /\.mp4$/i.test(file.name));
        if ((video && (files.length !== 1 || assets.length)) || (!video && assets.some(asset => asset.file_type === 'video'))) { setError('Choose one video or up to 10 images, not both'); setBusy(false); onBusyChange(false); return; }
        try {
            for (const file of files) {
                if (file.type === 'video/mp4' || /\.mp4$/i.test(file.name)) {
                    if (file.size > 100*1000*1000) throw new Error('Choose an MP4 video up to 100 MB');
                    setProgress(0); added.push(await appClient.media.uploadVideo(file,brandId,setProgress)); onChange([...added]); continue;
                }
                if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) throw new Error('Choose JPEG, PNG or WebP images up to 3 MiB each');
                const bitmap = await createImageBitmap(file).catch(() => { throw new Error('Choose a valid image'); });
                const pixels = bitmap.width * bitmap.height; bitmap.close();
                if (pixels > 40000000) throw new Error('Choose a valid JPEG, PNG or still WebP image under 40 megapixels');
                setProgress(0);
                added.push(await appClient.media.upload(file, brandId, setProgress));
                onChange([...added]);
            }
        } catch (e) { setError(e.message); }
        finally { setBusy(false); onBusyChange(false); }
    }
    async function chooseLibrary() {
        if (showLibrary) { setShowLibrary(false); return; }
        const request = ++libraryRequest.current;
        setError(''); setBusy(true); setLoadingLibrary(true); onBusyChange(true);
        try {
            const page = await appClient.entities.MediaAsset.filter({ brand_id: brandId, is_demo: false }, { sort: '-created_date', limit: 100 });
            if (request !== libraryRequest.current) return;
            setLibrary(page.items.filter(image => image.storage_id && image.brand_id === brandId)); setShowLibrary(true);
        } catch (e) { if (request === libraryRequest.current) setError(e.message); }
        finally { if (request === libraryRequest.current) { setBusy(false); setLoadingLibrary(false); onBusyChange(false); } }
    }
    function reorder(sourceId, destinationId) {
        if (busy || !sourceId || sourceId === destinationId) return;
        const from = assets.findIndex(asset => asset.id === sourceId), to = assets.findIndex(asset => asset.id === destinationId);
        if (from < 0 || to < 0) return;
        const next = [...assets]; const [asset] = next.splice(from, 1); next.splice(to, 0, asset); onChange(next);
    }
    function finishDrag() { dragging.current = null; setDraggedId(null); setTargetId(null); }
    function pointerTarget(event) { const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-sortable-media]'); return target && root.current?.contains(target) ? target.getAttribute('data-sortable-media') : null; }
    function move(index, offset) { const next = [...assets]; [next[index], next[index+offset]] = [next[index+offset], next[index]]; onChange(next); }
    return <div ref={root}>
        <p className="label-xs mb-3">{t('Images: up to 10, 3 MiB each. Video: one MP4/H.264, up to 100 MB.')}</p>
        <input ref={input} aria-label={t('Upload media')} type="file" accept="image/jpeg,image/png,image/webp,video/mp4" multiple className="hidden" disabled={busy || !brandId || demoMode} onChange={upload} />
        <div className="flex flex-wrap gap-3">{allowLibrary ? <Button variant="outline" type="button" disabled={busy || !brandId || demoMode} onClick={() => isDesktop() ? importLocal() : input.current.click()}><UploadSimple size={16} weight="duotone" />{t(isDesktop() ? 'Import media' : 'Upload media')}</Button> : <button type="button" className="btn-skew" disabled={busy || !brandId || demoMode} onClick={() => isDesktop() ? importLocal() : input.current.click()}><UploadSimple size={16} weight="duotone" />{t(isDesktop() ? 'Import media' : 'Upload media')}</button>}{allowLibrary && <Button variant="ghost" type="button" className="h-auto border rounded-lg px-3 text-xs" disabled={busy || !brandId || demoMode} onClick={chooseLibrary}><ImageSquare className="inline mr-1" size={15} />{t('Choose from library')}</Button>}</div>
        {busy && <p role="status" className="label-xs mt-3">{t(loadingLibrary ? 'Loading…' : isDesktop() ? 'Importing media…' : 'Uploading media')}{!loadingLibrary && !isDesktop() && <> · {progress}%</>}</p>}
        {error && <p role="alert" className="text-dangerFg text-sm mt-3">{t(error)}</p>}
        {showLibrary && <div className="grid grid-cols-3 gap-2 mt-3">{library.length ? library.map(image => <Button variant="ghost" type="button" key={image.id} disabled={assets.some(asset => asset.id === image.id) || assets.length >= 10 || busy || (image.file_type === 'video' ? assets.length > 0 : assets.some(asset => asset.file_type === 'video'))} className="h-auto block whitespace-normal border rounded-lg p-1" onClick={() => onChange([...assets, image])}>{image.file_type === 'video' ? <video src={image.file_url} className="h-20 w-full object-contain" preload="metadata" muted /> : <img src={image.file_url} alt={image.name} className="h-20 w-full object-contain" />}<span className="label-xs block truncate">{image.name}</span></Button>) : <p className="label-xs">{t('No stored media for this brand.')}</p>}</div>}
        {assets.length > 1 && <p className="label-xs mt-3">{t("Drag images to change their order.")}</p>}
        <div className="grid gap-3 sm:grid-cols-2 mt-3">{assets.map((asset,index) => <div key={asset.id} data-sortable-media={asset.id} draggable={!busy && asset.file_type !== 'video' && assets.length > 1}
            onDragStart={event => { dragging.current = asset.id; setDraggedId(asset.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', asset.id); }}
            onDragOver={event => { if (!busy && dragging.current) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setTargetId(asset.id); } }}
            onDrop={event => { event.preventDefault(); reorder(dragging.current, asset.id); finishDrag(); }} onDragEnd={finishDrag}
            className={'border rounded-lg p-2 ' + (draggedId === asset.id ? 'opacity-50 ' : '') + (targetId === asset.id && draggedId !== asset.id ? 'ring-2 ring-ring ' : '') + (assets.length > 1 && asset.file_type !== 'video' ? 'cursor-grab active:cursor-grabbing' : '')}>{asset.file_type === 'video' ? <video src={asset.file_url} controls className="max-h-64 w-full" preload="metadata" /> : <img draggable={false} src={asset.file_url} alt={asset.name} className="h-28 w-full object-contain" />}<p className="label-xs truncate mt-1">{index+1}. {asset.name}</p><div className="flex flex-wrap items-center gap-2 mt-2">{assets.length > 1 && asset.file_type !== 'video' && <Button size="icon" variant="ghost" type="button" disabled={busy} aria-label={t('Drag image to reorder')} title={t('Drag image to reorder')} className="h-auto touch-none min-h-11 min-w-11 flex items-center justify-center cursor-grab active:cursor-grabbing rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onPointerDown={event => { if (busy || event.button !== 0) return; event.preventDefault(); dragging.current = asset.id; setDraggedId(asset.id); event.currentTarget.setPointerCapture(event.pointerId); }}
            onPointerMove={event => { if (dragging.current) setTargetId(pointerTarget(event)); }}
            onPointerUp={event => { reorder(dragging.current, pointerTarget(event)); finishDrag(); }} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag} onDragStart={event => event.preventDefault()}><DotsSixVertical size={18} /></Button>}<Button size="icon" variant="ghost" type="button" aria-label={t('Move image earlier')} disabled={busy || index === 0} onClick={() => move(index,-1)}><ArrowUp size={14} /></Button><Button size="icon" variant="ghost" type="button" aria-label={t('Move image later')} disabled={busy || index === assets.length-1} onClick={() => move(index,1)}><ArrowDown size={14} /></Button><Button variant="ghost" type="button" disabled={busy} onClick={() => onChange(assets.filter(image => image.id !== asset.id))} className="h-auto p-0 text-dangerFg text-xs ml-auto whitespace-nowrap">{t('Remove')}</Button></div></div>)}</div>
    </div>;
}
