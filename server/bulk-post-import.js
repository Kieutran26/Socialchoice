import { fail } from './validation.js';
import { savePostPlan } from './post-plans.js';
import { BULK_LIMIT, reviewBulkRows } from '../src/lib/bulk-post-rows.js';

export function importPostDrafts(store, input) {
    if (!input || !/^[a-f\d-]{36}$/i.test(input.request_id || '') || !Array.isArray(input.rows) || !input.rows.length || input.rows.length > BULK_LIMIT) fail('Import between 1 and 200 rows');
    if (JSON.stringify(input).length > 900000) fail('Import content is too large', 413);
    if (input.rows.some(row => !row || !Number.isInteger(row.rowNumber) || row.rowNumber < 2)) fail('Invalid import row number');
    const fingerprint = JSON.stringify([input.brand_id, input.timezone, input.account_ids, input.rows]);
    return store.transaction(() => {
        const receipt = store.bulkImport(input.request_id);
        if (receipt) {
            if (receipt.fingerprint !== fingerprint) fail('Import request changed. Review again.', 409);
            return receipt.result;
        }
        const brand = store.get('Brand', input.brand_id);
        if (brand.status === 'archived') fail('Choose an active brand', 409);
        const options = { brand_id: brand.id, is_demo: brand.is_demo, timezone: input.timezone || brand.timezone || 'Asia/Ho_Chi_Minh', account_ids: input.account_ids || [] };
        const references = Object.fromEntries([['accounts', 'SocialAccount'], ['media', 'MediaAsset'], ['pillars', 'ContentPillar'], ['angles', 'ContentAngle']].map(([key, entity]) => [key, store.all(entity)]));
        const rows = reviewBulkRows(input.rows, options, references);
        const invalid = rows.find(row => row.error);
        if (invalid) fail(`Row ${invalid.rowNumber}: ${invalid.error}`);
        const posts = rows.map(row => savePostPlan(store, { data: row.data }));
        const result = { count: posts.length, post_ids: posts.map(post => post.id) };
        store.saveBulkImport({ id: input.request_id, fingerprint, result });
        return result;
    });
}
