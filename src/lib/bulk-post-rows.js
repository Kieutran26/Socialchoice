import { toUtcIso, toZonedParts } from './tz.js';

export const BULK_LIMIT = 200;
export const BULK_FIELDS = ['title', 'caption', 'date', 'time', 'account_ids', 'media_ids', 'pillar_id', 'angle_id'];
const aliases = {
    title: ['title', 'tieu de'], caption: ['caption', 'content', 'noi dung'],
    date: ['date', 'ngay'], time: ['time', 'gio'], account_ids: ['account_ids', 'tai khoan'],
    media_ids: ['media_ids', 'ma anh'], pillar_id: ['pillar_id'], angle_id: ['angle_id'],
};
export const headerKey = value => String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
export function guessBulkMapping(headers) {
    return Object.fromEntries(BULK_FIELDS.map(field => [field, headers.findIndex(h => aliases[field].includes(headerKey(h)))]));
}
const text = value => value == null ? '' : String(value);
const ids = value => text(value).split(/[;,\n]/).map(v => v.trim()).filter(Boolean);
export function normalizeBulkRow(row, { brand_id, is_demo, timezone, account_ids = [] }) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Invalid import row');
    if (BULK_FIELDS.some(field => row[field] != null && typeof row[field] !== 'string')) throw new Error('Import fields must contain text');
    const title = text(row.title).trim(), caption = text(row.caption);
    if (!title || title.length > 200) throw new Error('Title is required (maximum 200 characters)');
    if (!caption.trim() || caption.length > 63206) throw new Error('Caption is required (maximum 63206 characters)');
    new Intl.DateTimeFormat('en', { timeZone: timezone });
    const data = { brand_id, is_demo, timezone, title, caption, status: 'draft',
        account_ids: row.account_ids ? ids(row.account_ids) : account_ids, media_ids: ids(row.media_ids) };
    for (const [key, max] of Object.entries({ account_ids: 30, media_ids: 10 })) {
        if (!Array.isArray(data[key]) || data[key].length > max || new Set(data[key]).size !== data[key].length) throw new Error('Invalid or duplicate account/media IDs');
    }
    for (const key of ['pillar_id', 'angle_id']) if (text(row[key]).trim()) data[key] = text(row[key]).trim();
    if (data.angle_id && !data.pillar_id) throw new Error('An angle requires a pillar');
    const date = text(row.date).trim(), time = text(row.time).trim();
    if (date || time) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Use date YYYY-MM-DD and time HH:mm together');
        const instant = toUtcIso(date, time, timezone), parts = toZonedParts(instant, timezone);
        if (parts.date !== date || parts.time !== time) throw new Error('Invalid date or local time');
        data.scheduled_at = instant;
    }
    return data;
}

export function reviewBulkRows(rows, options, references) {
    const seen = new Set();
    return rows.map(({ rowNumber, values }) => {
        try {
            const data = normalizeBulkRow(values, options);
            for (const [entity, keys] of Object.entries({ accounts: data.account_ids, media: data.media_ids, pillars: data.pillar_id ? [data.pillar_id] : [], angles: data.angle_id ? [data.angle_id] : [] })) {
                for (const id of keys) {
                    const ref = references[entity].find(item => item.id === id);
                    if (!ref || ref.brand_id !== data.brand_id || ref.is_demo !== data.is_demo || ref.status === 'archived') throw new Error('Reference not found in this brand');
                    if (entity === 'angles' && ref.pillar_id !== data.pillar_id) throw new Error('Angle must belong to the selected pillar');
                }
            }
            const fingerprint = JSON.stringify(data);
            if (seen.has(fingerprint)) throw new Error('Duplicate row in this file');
            seen.add(fingerprint);
            return { rowNumber, values, data, error: '' };
        } catch (error) { return { rowNumber, values, error: error.message }; }
    });
}
