import Papa from 'papaparse';
import { BULK_FIELDS, BULK_LIMIT } from './bulk-post-rows.js';

// Bound expanded workbook data before the XLSX parser allocates XML strings.
export async function checkWorkbookSize(file) {
    const view = new DataView(await file.arrayBuffer());
    let end = -1;
    for (let i = view.byteLength - 22; i >= Math.max(0, view.byteLength - 65557); i--) {
        if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
    }
    if (end < 0) throw new Error('Invalid Excel workbook');
    const count = view.getUint16(end + 10, true);
    let offset = view.getUint32(end + 16, true), expanded = 0;
    if (count > 1000 || count === 0) throw new Error('Excel workbook is too large');
    for (let i = 0; i < count; i++) {
        if (offset + 46 > view.byteLength || view.getUint32(offset, true) !== 0x02014b50) throw new Error('Invalid Excel workbook');
        expanded += view.getUint32(offset + 24, true);
        if (expanded > 20 * 1024 * 1024) throw new Error('Excel workbook is too large');
        offset += 46 + view.getUint16(offset + 28, true) + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
    }
}
export async function readBulkFile(file) {
    if (!file || file.size > 5 * 1024 * 1024) throw new Error('Choose a file up to 5 MB');
    let rows;
    if (/\.csv$/i.test(file.name)) {
        const parsed = Papa.parse(await file.text(), { skipEmptyLines: false });
        if (parsed.errors.some(e => e.code !== 'UndetectableDelimiter')) throw new Error('Invalid CSV. Check quotes and delimiters.');
        rows = parsed.data;
    } else if (/\.xlsx$/i.test(file.name)) {
        await checkWorkbookSize(file);
        const { readSheet } = await import('read-excel-file/browser');
        rows = await readSheet(file, 1);
    } else throw new Error('Choose an .xlsx or .csv file');
    if (!rows.length || rows[0].length > 50 || rows.some(row => row.length > 50)) throw new Error('Use a header row and at most 50 columns');
    const headers = rows[0].map((cell, index) => String(cell ?? '').trim() || `Column ${index + 1}`);
    const entries = rows.slice(1).map((cells, i) => ({ rowNumber: i + 2, cells })).filter(row => row.cells.some(cell => cell != null && String(cell).trim()));
    if (!entries.length || entries.length > BULK_LIMIT) throw new Error('Import between 1 and 200 rows');
    return { headers, entries };
}

export function mapBulkEntries(entries, mapping) {
    return entries.map(({ rowNumber, cells }) => ({ rowNumber, values: Object.fromEntries(BULK_FIELDS.map(field => {
        let value = cells[mapping[field]] ?? '';
        if (value instanceof Date) value = field === 'time' ? value.toISOString().slice(11, 16) : value.toISOString().slice(0, 10);
        if (field === 'time' && typeof value === 'number' && value >= 0 && value < 1) {
            const minutes = Math.round(value * 1440);
            value = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
        }
        return [field, String(value)];
    })) }));
}
export function downloadBulkTemplate() {
    const csv = Papa.unparse([BULK_FIELDS, ['Sample title', 'Write your post here', '', '', '', '', '', '']], { escapeFormulae: true });
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'socialchoice-posts.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
