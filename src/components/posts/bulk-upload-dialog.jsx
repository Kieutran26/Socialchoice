import { useMemo, useRef, useState } from 'react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { BULK_FIELDS, guessBulkMapping, reviewBulkRows } from '@/lib/bulk-post-rows';
import { downloadBulkTemplate, mapBulkEntries, readBulkFile } from '@/lib/bulk-post-file';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const labels = { title: 'Title', caption: 'Caption', date: 'Date', time: 'Time', account_ids: 'Account IDs', media_ids: 'Media IDs', pillar_id: 'Pillar ID', angle_id: 'Angle ID' };
async function loadReferences(entity, query) {
    const items = []; let cursor;
    do { const page = await appClient.entities[entity].filter(query, { limit: 1000, cursor }); items.push(...page.items); cursor = page.next_cursor; } while (cursor);
    return items;
}
export default function BulkUploadDialog({ brands, accounts, pillars, angles, scope, timezone, onClose, onImported }) {
    const { t } = useTranslation();
    const eligible = brands.filter(b => b.is_demo === scope.is_demo && b.status !== 'archived' && (!scope.brand_id || b.id === scope.brand_id));
    const [brandId, setBrandId] = useState(eligible.length === 1 ? eligible[0].id : '');
    const [zone, setZone] = useState(eligible.length === 1 ? eligible[0].timezone || timezone : timezone);
    const [defaults, setDefaults] = useState([]);
    const [file, setFile] = useState(null), [mapping, setMapping] = useState(() => guessBulkMapping([]));
    const [references, setReferences] = useState({ accounts, pillars, angles, media: [] }), [ready, setReady] = useState(false);
    const [review, setReview] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const [locked, setLocked] = useState(false);
    const requestId = useRef(''), reading = useRef(0);
    const brandAccounts = references.accounts.filter(a => a.brand_id === brandId && a.is_demo === scope.is_demo && a.status !== 'archived');
    const options = useMemo(() => ({ brand_id: brandId, is_demo: scope.is_demo, timezone: zone, account_ids: defaults }), [brandId, scope.is_demo, zone, defaults]);
    const rows = useMemo(() => file ? reviewBulkRows(mapBulkEntries(file.entries, mapping), options, references) : [], [file, mapping, options, references]);
    const invalid = rows.filter(row => row.error).length;
    async function chooseFile(selected) {
        const ticket = ++reading.current;
        setFile(null); setReady(false); setError(''); setReview(false);
        if (!selected) return;
        setBusy(true);
        try {
            const query = { brand_id: brandId, is_demo: scope.is_demo };
            const [parsed, accountRows, mediaRows, pillarRows, angleRows] = await Promise.all([readBulkFile(selected), ...['SocialAccount', 'MediaAsset', 'ContentPillar', 'ContentAngle'].map(entity => loadReferences(entity, query))]);
            if (ticket !== reading.current) return;
            setReferences({ accounts: accountRows, media: mediaRows, pillars: pillarRows, angles: angleRows }); setFile(parsed); setMapping(guessBulkMapping(parsed.headers)); setReady(true);
        } catch (e) { if (ticket === reading.current) setError(e.message); }
        finally { if (ticket === reading.current) setBusy(false); }
    }
    async function save() {
        setBusy(true); setError(''); setLocked(true);
        try {
            const result = await appClient.posts.importDrafts({ request_id: requestId.current, brand_id: brandId, timezone: zone, account_ids: defaults, rows: rows.map(({ rowNumber, values }) => ({ rowNumber, values })) });
            onImported(result.count);
        } catch (e) { if (e.status >= 400 && e.status < 500) setLocked(false); setError(e.message); }
        finally { setBusy(false); }
    }
    function startReview() {
        const payload = { brand_id: brandId, timezone: zone, account_ids: defaults, rows: rows.map(({ rowNumber, values }) => ({ rowNumber, values })) };
        if (new TextEncoder().encode(JSON.stringify(payload)).length > 850000) { setError('Import content is too large'); return; }
        requestId.current = crypto.randomUUID(); setReview(true); setError('');
    }
    return <Dialog open onOpenChange={open => !open && !busy && !locked && onClose()}><DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t('Import Excel / CSV')}</DialogTitle><DialogDescription>{t('Preview up to 200 rows. Import saves drafts only; it never publishes or starts automatic schedules.')}</DialogDescription></DialogHeader>
        {review && <p className="text-sm">{t('Brand')}: {eligible.find(b => b.id === brandId)?.name} · {t('Timezone')}: {zone} · {t('Draft')}</p>}
        {!review && <>
            <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={downloadBulkTemplate}>{t('Download CSV template')}</Button><p className="label-xs">{t('Excel .xlsx (first sheet) or UTF-8 CSV, up to 5 MB. Header row required.')}</p></div>
            <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm">{t('Brand')}<select className="mt-1 w-full border border-input rounded-lg p-2 bg-card" value={brandId} disabled={busy} onChange={e => { setBrandId(e.target.value); setDefaults([]); setFile(null); setReady(false); setReferences({ accounts, pillars, angles, media: [] }); const brand = eligible.find(b => b.id === e.target.value); setZone(brand?.timezone || timezone); }}><option value="">{t('Choose a brand')}</option>{eligible.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
                <label className="text-sm">{t('Timezone')}<Input value={zone} onChange={e => setZone(e.target.value)} /></label></div>
            <fieldset className="border rounded-lg p-3"><legend className="text-sm px-1">{t('Default destinations (optional)')}</legend><div className="flex flex-wrap gap-3">{brandAccounts.map(a => <label key={a.id} className="text-sm flex gap-2 items-center"><input type="checkbox" checked={defaults.includes(a.id)} onChange={e => setDefaults(ids => e.target.checked ? [...ids, a.id] : ids.filter(id => id !== a.id))} />{a.name} · {a.platform}</label>)}</div></fieldset>
            <label className="text-sm">{t('Spreadsheet file')}<Input type="file" accept=".csv,.xlsx" disabled={busy || !brandId} onChange={e => chooseFile(e.target.files?.[0])} /></label>
            {file && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{BULK_FIELDS.map(field => <label className="text-xs" key={field}>{t(labels[field])}<select className="mt-1 w-full border border-input rounded-lg p-2 bg-card" value={mapping[field] ?? -1} onChange={e => setMapping(value => ({ ...value, [field]: Number(e.target.value) }))}><option value={-1}>{t('Not mapped')}</option>{file.headers.map((header, i) => <option key={i} value={i}>{header}</option>)}</select></label>)}</div>}
            <p className="label-xs">{t('Dates: YYYY-MM-DD; times: HH:mm in the selected timezone. IDs are separated by semicolons. Media must already exist in your brand library.')}</p>
            {file && <details className="text-xs"><summary className="cursor-pointer">{t('Reference IDs for this brand')}</summary><div className="max-h-40 overflow-auto space-y-1 mt-2">{[...brandAccounts, ...references.media.filter(a => a.brand_id === brandId), ...references.pillars.filter(a => a.brand_id === brandId), ...references.angles.filter(a => a.brand_id === brandId)].map(item => <p key={item.id} className="break-all">{item.name} — {item.id}</p>)}</div></details>}
        </>}
        {!!rows.length && <><p className="text-sm" role="status">{t('Rows')}: {rows.length} · {t('Errors')}: {invalid}</p><div className="overflow-x-auto border rounded-lg max-h-80"><table className="w-full text-sm"><thead className="bg-muted"><tr>{['Row', 'Title', 'Caption', 'Destinations', 'Date', 'Status'].map(label => <th className="p-3 text-left" key={label}>{t(label)}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.rowNumber} className="border-t"><td className="p-3">{row.rowNumber}</td><td className="p-3 min-w-32 break-words">{row.values.title}</td><td className="p-3 min-w-48 max-w-80 whitespace-pre-wrap break-words">{row.values.caption}</td><td className="p-3">{row.data?.account_ids.map(id => references.accounts.find(a => a.id === id)?.name || id).join(', ') || '—'}</td><td className="p-3 whitespace-nowrap">{row.values.date} {row.values.time}</td><td className={`p-3 min-w-40 ${row.error ? 'text-dangerFg' : 'text-successFg'}`}>{row.error ? t(row.error) : t('Ready')}</td></tr>)}</tbody></table></div></>}
        {error && <p role="alert" className="text-sm text-dangerFg">{t(error)}</p>}
        {locked && error && <p className="label-xs">{t('Retry this same import to recover safely without duplicates. Keep this window open until confirmed.')}</p>}
        <div className="flex flex-wrap justify-end gap-3"><Button variant="outline" disabled={busy || locked} onClick={onClose}>{t('Cancel')}</Button>{review && <Button variant="outline" disabled={busy || locked} onClick={() => setReview(false)}>{t('Back')}</Button>}<button className="btn-skew" disabled={busy || !ready || !brandId || !rows.length || invalid > 0 || mapping.title < 0 || mapping.caption < 0} onClick={review ? save : startReview}>{t(busy ? 'Saving…' : review ? 'Confirm import as drafts' : 'Review import')}</button></div>
    </DialogContent></Dialog>;
}
