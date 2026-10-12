import { useEffect, useRef, useState } from 'react';
import { UploadSimple, ImageSquare, ArrowUp, ArrowDown } from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';

export default function MediaUploader({ assets, onChange, brandId, demoMode, onBusyChange = (_busy) => {}, allowLibrary = true }) {
    const { t } = useTranslation();
    const input = useRef(null);
    const [library, setLibrary] = useState([]), [showLibrary, setShowLibrary] = useState(false);
    const [busy, setBusy] = useState(false), [progress, setProgress] = useState(0), [error, setError] = useState('');
    useEffect(() => { setShowLibrary(false); setLibrary([]); }, [brandId]);
    async function upload(event) {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        if (!brandId || demoMode || !files.length) return;
        if (assets.length + files.length > 10) { setError('Choose up to 10 different images'); return; }
        setBusy(true); onBusyChange(true); setError('');
        const added = [...assets];
        try {
            for (const file of files) {
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
        setError('');
        try { const page = await appClient.entities.MediaAsset.filter({ brand_id: brandId, is_demo: false, file_type: 'image' }, { sort: '-created_date', limit: 100 }); setLibrary(page.items.filter(image => image.storage_id)); setShowLibrary(!showLibrary); }
        catch (e) { setError(e.message); }
    }
    function move(index, offset) { const next = [...assets]; [next[index], next[index+offset]] = [next[index+offset], next[index]]; onChange(next); }
    return <div>
        <p className="label-xs mb-3">{t('JPEG, PNG or WebP · 3 MiB per image · up to 10 images. Video is not supported yet.')}</p>
        <input ref={input} aria-label={t('Upload images')} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={busy || !brandId || demoMode} onChange={upload} />
        <div className="flex flex-wrap gap-3"><button type="button" className="btn-skew" disabled={busy || !brandId || demoMode} onClick={() => input.current.click()}><UploadSimple size={15} />{t('Upload images')}</button>{allowLibrary && <button type="button" className="border rounded-lg px-3 text-xs" disabled={busy || !brandId || demoMode} onClick={chooseLibrary}><ImageSquare className="inline mr-1" size={15} />{t('Choose from library')}</button>}</div>
        {busy && <p role="status" className="label-xs mt-3">{t('Uploading image')} · {progress}%</p>}
        {error && <p role="alert" className="text-dangerFg text-sm mt-3">{t(error)}</p>}
        {showLibrary && <div className="grid grid-cols-3 gap-2 mt-3">{library.length ? library.map(image => <button type="button" key={image.id} disabled={assets.some(asset => asset.id === image.id) || assets.length >= 10 || busy} className="border rounded-lg p-1 disabled:opacity-40" onClick={() => onChange([...assets, image])}><img src={image.file_url} alt={image.name} className="h-20 w-full object-contain" /><span className="label-xs block truncate">{image.name}</span></button>) : <p className="label-xs">{t('No stored images for this brand.')}</p>}</div>}
        <div className="grid gap-3 sm:grid-cols-2 mt-3">{assets.map((asset,index) => <div key={asset.id} className="border rounded-lg p-2"><img src={asset.file_url} alt={asset.name} className="h-28 w-full object-contain" /><p className="label-xs truncate mt-1">{index+1}. {asset.name}</p><div className="flex gap-2 mt-2"><button type="button" aria-label={t('Move image earlier')} disabled={busy || index === 0} onClick={() => move(index,-1)}><ArrowUp size={14} /></button><button type="button" aria-label={t('Move image later')} disabled={busy || index === assets.length-1} onClick={() => move(index,1)}><ArrowDown size={14} /></button><button type="button" disabled={busy} onClick={() => onChange(assets.filter(image => image.id !== asset.id))} className="text-dangerFg text-xs ml-auto">{t('Remove')}</button></div></div>)}</div>
    </div>;
}
