import { useRef, useState } from 'react';
import { DownloadSimple, UploadSimple, Trash } from '@phosphor-icons/react';
import PageHeader from '@/components/common/PageHeader';
import InteractiveImage from '@/components/common/InteractiveImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/lib/i18n';
import { exportInteractiveImage } from '@/lib/interactive-image-export.js';

export default function InteractiveImages() {
    const { t } = useTranslation();
    const [src, setSrc] = useState(''), [name, setName] = useState('');
    const [hotspots, setHotspots] = useState([]), [preview, setPreview] = useState(false), [error, setError] = useState('');
    const [drag, setDrag] = useState(null);
    const fileInput = useRef(null), uploadId = useRef(0);
    async function upload(event) {
        const file = event.target.files?.[0]; event.target.value = '';
        if (!file) return;
        const request = ++uploadId.current;
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError(t('Choose a PNG, JPEG or WebP image up to 5 MB.')); return; }
        try {
            const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
            await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => image.naturalWidth * image.naturalHeight <= 40000000 ? resolve(null) : reject(); image.onerror = reject; image.src = String(data); });
            if (request !== uploadId.current) return;
            setSrc(String(data)); setName(file.name); setHotspots([]); setPreview(false); setError(''); setDrag(null);
        } catch { if (request === uploadId.current) setError(t('Unable to open this image.')); }
    }
    function point(event) {
        const bounds = event.currentTarget.getBoundingClientRect();
        return { x: Math.max(0, Math.min(96, (event.clientX - bounds.left) / bounds.width * 100)), y: Math.max(0, Math.min(94, (event.clientY - bounds.top) / bounds.height * 100)) };
    }
    function finish(event) {
        if (!drag) return;
        const end = point(event), x = Math.min(drag.x, end.x), y = Math.min(drag.y, end.y);
        const width = Math.abs(end.x - drag.x), height = Math.abs(end.y - drag.y);
        if (width >= 2 && height >= 2) setHotspots(rows => [...rows, { id: crypto.randomUUID(), x, y, width, height, title: t('New annotation'), description: '' }]);
        setDrag(null);
    }
    function update(id, field, value) { setHotspots(rows => rows.map(row => row.id === id ? { ...row, [field]: value } : row)); }
    return <>
        <PageHeader title={t('Interactive images')} description={t('Add numbered annotations to screenshots. Hover to read, click to spotlight a region.')} actions={<button type="button" className="btn-skew" onClick={() => fileInput.current?.click()}><UploadSimple size={16} weight="duotone" />{t('Choose image')}</button>} />
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label={t('Choose image')} onChange={upload} />
        {error && <p role="alert" className="text-sm text-dangerFg mb-4">{error}</p>}
        <p className="label-xs mb-5">{t('Images stay in this tab. Download HTML before leaving to keep your work. Choosing another image clears annotations.')}</p>
        {!src ? <section className="panel p-5 text-sm text-muted-foreground">{t('Choose a screenshot, then drag over each region to add an annotation. PNG, JPEG or WebP, up to 5 MB.')}</section> : <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="panel p-5 min-w-0 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm break-all">{name}</p><Button variant="outline" aria-pressed={preview} onClick={() => { setPreview(value => !value); setDrag(null); }}>{t(preview ? 'Edit annotations' : 'Preview interactions')}</Button></div>
                {preview ? <InteractiveImage src={src} alt={name} hotspots={hotspots} clearLabel={t('Clear highlight')} /> : <>
                    <p className="label-xs">{t('Drag to draw a highlight region. Each region gets a numbered marker. Maximum 20 regions.')}</p>
                    <div className="relative overflow-hidden rounded-xl border select-none touch-none cursor-crosshair" onPointerDown={event => { if (event.button !== 0 || hotspots.length >= 20) return; event.currentTarget.setPointerCapture(event.pointerId); setDrag({ ...point(event), end: point(event) }); }} onPointerMove={event => { if (drag) setDrag({ ...drag, end: point(event) }); }} onPointerUp={finish} onPointerCancel={() => setDrag(null)}>
                        <img src={src} alt={name} className="block w-full h-auto pointer-events-none" draggable={false} />
                        {hotspots.map((item, index) => <div key={item.id} className="absolute border-2 border-brand bg-brand/10 pointer-events-none" style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, height: `${item.height}%` }}><span className="flex h-8 w-8 rounded-full items-center justify-center bg-brand text-brand-ink">{index + 1}</span></div>)}
                        {drag && <div className="absolute border-2 border-brand pointer-events-none" style={{ left: `${Math.min(drag.x, drag.end.x)}%`, top: `${Math.min(drag.y, drag.end.y)}%`, width: `${Math.abs(drag.end.x - drag.x)}%`, height: `${Math.abs(drag.end.y - drag.y)}%` }} />}
                    </div>
                </>}
            </section>
            <section className="panel p-5 min-w-0 space-y-4"><h2 className="text-[15px]">{t('Annotations')}</h2>
                {!hotspots.length && <p className="label-xs">{t('Draw a region on the image, or add one with the button below and adjust its coordinates.')}</p>}
                {hotspots.map((item, index) => <div key={item.id} className="border-b pb-4 space-y-3">
                    <div className="flex items-center justify-between"><span className="text-sm">{index + 1}</span><Button variant="ghost" size="icon" aria-label={t('Delete annotation {number}', { number: index + 1 })} onClick={() => setHotspots(rows => rows.filter(row => row.id !== item.id))}><Trash size={16} /></Button></div>
                    <label className="block text-xs">{t('Title')}<Input className="mt-1.5" value={item.title} maxLength={160} onChange={event => update(item.id, 'title', event.target.value)} /></label>
                    <label className="block text-xs">{t('Annotation text')}<Textarea className="mt-1.5" value={item.description} maxLength={2000} onChange={event => update(item.id, 'description', event.target.value)} /></label>
                    <div className="grid grid-cols-2 gap-2">{[['x', 'Left (%)'], ['y', 'Top (%)'], ['width', 'Width (%)'], ['height', 'Height (%)']].map(([field, label]) => <label key={field} className="block text-xs">{t(label)}<Input className="mt-1" type="number" min={field === 'width' || field === 'height' ? 2 : 0} max={field === 'x' ? 96 : field === 'y' ? 94 : 100 - item[field === 'width' ? 'x' : 'y']} step="0.1" value={Math.round(item[field] * 10) / 10} onChange={event => { const value = Number(event.target.value); const next = { ...item, [field]: Math.max(field === 'width' || field === 'height' ? 2 : 0, Math.min(field === 'x' ? 96 : field === 'y' ? 94 : 100, value)) }; next.width = Math.min(next.width, 100 - next.x); next.height = Math.min(next.height, 100 - next.y); setHotspots(rows => rows.map(row => row.id === item.id ? next : row)); }} /></label>)}</div>
                </div>)}
                <Button variant="outline" disabled={hotspots.length >= 20} onClick={() => { setPreview(false); setHotspots(rows => [...rows, { id: crypto.randomUUID(), x: 10, y: 10, width: 30, height: 20, title: t('New annotation'), description: '' }]); }}>{t('Add region')}</Button>
                <Button variant="outline" className="w-full" disabled={!hotspots.length} onClick={() => exportInteractiveImage(src, hotspots, name, t('Clear highlight'))}><DownloadSimple size={16} />{t('Download interactive HTML')}</Button>
            </section>
        </div>}
    </>;
}
