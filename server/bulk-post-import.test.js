import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from './store.js';
import { createApi } from './index.js';
import { importPostDrafts } from './bulk-post-import.js';
import { normalizeBulkRow, guessBulkMapping } from '../src/lib/bulk-post-rows.js';
import { readBulkFile, mapBulkEntries, checkWorkbookSize } from '../src/lib/bulk-post-file.js';
import { readSheet } from 'read-excel-file/node';
import { bulkWorkbook } from './bulk-post-fixture.js';

function fixture(path = ':memory:') {
    const store = createStore(path);
    const brand = store.write('Brand', { name: 'Import', timezone: 'Asia/Ho_Chi_Minh' });
    const account = store.write('SocialAccount', { brand_id: brand.id, name: 'Destination', platform: 'facebook' });
    const input = { request_id: randomUUID(), brand_id: brand.id, timezone: brand.timezone, account_ids: [account.id], rows: [
        { rowNumber: 2, values: { title: 'First', caption: 'Nội dung, có dấu\nDòng hai', date: '2030-02-01', time: '09:30' } },
        { rowNumber: 3, values: { title: 'Second', caption: 'Second caption' } },
    ] };
    return { store, brand, account, input };
}
test('imports atomically as drafts with local-time intent, never schedules or publishes', () => {
    const { store, input } = fixture();
    try {
        const result = importPostDrafts(store, input);
        assert.equal(result.count, 2);
        const posts = store.all('Post');
        assert.equal(posts[0].status, 'draft');
        assert.ok(posts.every(p => p.status === 'draft'));
        assert.ok(posts.some(p => p.scheduled_at === '2030-02-01T02:30:00.000Z'));
        assert.equal(store.all('PublishJob').length, 0);
        assert.equal(store.queuedAttempts().length, 0);
        assert.deepEqual(importPostDrafts(store, input), result);
        assert.equal(store.all('Post').length, 2);
        assert.throws(() => importPostDrafts(store, { ...input, rows: input.rows.slice(1) }), /changed/);
    } finally { store.close(); }
});
test('replay receipt persists across a backend restart', () => {
    const directory = mkdtempSync(join(tmpdir(), 'bulk-post-'));
    let store;
    try {
        const f = fixture(join(directory, 'test.sqlite')); store = f.store;
        const result = importPostDrafts(store, f.input); store.close();
        store = createStore(join(directory, 'test.sqlite'));
        assert.deepEqual(importPostDrafts(store, f.input), result);
        assert.equal(store.all('Post').length, 2);
    } finally { store?.close(); rmSync(directory, { recursive: true, force: true }); }
});
test('invalid later rows, duplicate rows and cross-brand/demo references leave no partial records', () => {
    const { store, input } = fixture();
    try {
        const otherBrand = store.write('Brand', { name: 'Other' });
        const otherAccount = store.write('SocialAccount', { brand_id: otherBrand.id, name: 'Other', platform: 'facebook' });
        const demoBrand = store.write('Brand', { name: 'Demo', is_demo: true });
        const demoAccount = store.write('SocialAccount', { brand_id: demoBrand.id, name: 'Demo', platform: 'facebook', is_demo: true });
        for (const values of [{ title: '', caption: 'Invalid' }, { title: 'Cross', caption: 'Cross', account_ids: otherAccount.id }, { title: 'Demo', caption: 'Demo', account_ids: demoAccount.id }, input.rows[0].values]) {
            assert.throws(() => importPostDrafts(store, { ...input, rows: [input.rows[0], { rowNumber: 3, values }] }));
            assert.equal(store.all('Post').length, 0);
            assert.equal(store.bulkImport(input.request_id), null);
        }
        assert.throws(() => importPostDrafts(store, { ...input, rows: Array(201).fill(input.rows[0]) }), /200/);
    } finally { store.close(); }
});
test('stored media and strategy references are scoped; deleted media and archived brands reject import', () => {
    const { store, brand, input } = fixture();
    try {
        const media = store.write('MediaAsset', { brand_id: brand.id, name: 'Image', file_type: 'image', file_url: 'https://example.invalid/image.jpg' });
        const pillar = store.write('ContentPillar', { name: 'Pillar', brand_id: brand.id });
        const angle = store.write('ContentAngle', { name: 'Angle', brand_id: brand.id, pillar_id: pillar.id });
        input.rows[0].values = { ...input.rows[0].values, media_ids: media.id, pillar_id: pillar.id, angle_id: angle.id };
        store.remove('MediaAsset', media.id);
        assert.throws(() => importPostDrafts(store, input), /Row 2/);
        assert.equal(store.all('Post').length, 0);
        store.write('Brand', { status: 'archived' }, brand.id);
        assert.throws(() => importPostDrafts(store, input), /active brand/);
    } finally { store.close(); }
});
test('strict date validation rejects impossible dates and DST gaps; identity/status fields cannot be imported', () => {
    const options = { brand_id: 'b', is_demo: false, timezone: 'Europe/London' };
    const row = { title: 'Test', caption: 'Caption', date: '2030-02-30', time: '12:00' };
    assert.throws(() => normalizeBulkRow(row, options), /Invalid date/);
    assert.throws(() => normalizeBulkRow({ ...row, date: '2030-03-31', time: '01:30' }, options), /Invalid date/);
    const data = normalizeBulkRow({ title: 'Test', caption: 'Caption', id: 'injected', status: 'published', brand_id: 'other', is_demo: true }, options);
    assert.equal(data.status, 'draft'); assert.equal(data.brand_id, 'b'); assert.equal(data.is_demo, false); assert.equal(data.id, undefined);
});
test('CSV preserves quoted multiline Vietnamese, supports semicolons/BOM and column mapping', async () => {
    const csv = '\uFEFFTiêu đề;Nội dung;Ngày;Giờ\r\nBài thử;"Một; hai\nBa";2030-02-01;09:30\r\n';
    const file = new File([csv], 'posts.csv');
    const parsed = await readBulkFile(file), mapping = guessBulkMapping(parsed.headers);
    const rows = mapBulkEntries(parsed.entries, mapping);
    assert.equal(rows[0].rowNumber, 2); assert.equal(rows[0].values.caption, 'Một; hai\nBa');
    assert.equal(rows[0].values.date, '2030-02-01');
    assert.equal(guessBulkMapping(['title', 'caption']).title, 0);
    await assert.rejects(readBulkFile(new File(['title,caption\n"broken'], 'bad.csv')), /CSV/);
    await assert.rejects(readBulkFile(new File(['x'], 'bad.xls')), /xlsx/);
});
test('real XLSX dates and times map to local intent; malformed/oversized archives are rejected', async () => {
    const bytes = bulkWorkbook();
    await checkWorkbookSize(new File([bytes], 'posts.xlsx'));
    const table = await readSheet(bytes, 1);
    const rows = mapBulkEntries(table.slice(1).map((cells, i) => ({ rowNumber: i + 2, cells })), guessBulkMapping(table[0]));
    assert.equal(rows[0].values.date, '2024-01-01'); assert.equal(rows[0].values.time, '09:30');
    assert.equal(rows[0].values.caption, 'Nội dung tiếng Việt\nDòng hai');
    await assert.rejects(checkWorkbookSize(new File(['bad'], 'bad.xlsx')), /Invalid Excel/);
    const corrupt = Buffer.from(bytes), offset = corrupt.readUInt32LE(corrupt.length - 6);
    corrupt.writeUInt32LE(30 * 1024 * 1024, offset + 24);
    await assert.rejects(checkWorkbookSize(new File([corrupt], 'large.xlsx')), /too large/);
});
test('HTTP import follows existing write origin/content-type boundary and requires one argument', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'bulk-http-'));
    const api = createApi({ dbPath: join(directory, 'test.sqlite'), frontendPort: 5173 });
    await new Promise(resolve => api.server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${api.server.address().port}`;
    try {
        const brand = api.store.write('Brand', { name: 'HTTP' });
        const input = { request_id: randomUUID(), brand_id: brand.id, rows: [{ rowNumber: 2, values: { title: 'Title', caption: 'Caption' } }] };
        const request = headers => fetch(`${origin}/api/posts/import`, { method: 'POST', headers, body: JSON.stringify({ args: [input] }) });
        assert.equal((await request({ 'Content-Type': 'application/json', Origin: 'https://evil.invalid' })).status, 403);
        const response = await request({ 'Content-Type': 'application/json', 'X-Socialchoice-Client': 'local-ui', Origin: origin });
        assert.equal(response.status, 200); assert.equal((await response.json()).count, 1);
    } finally { await new Promise(resolve => api.server.close(resolve)); rmSync(directory, { recursive: true, force: true }); }
});
