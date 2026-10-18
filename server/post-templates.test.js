import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from './store.js';
import { createApi } from './index.js';
import { hashPassword } from './admin-auth.js';
import { templateDataFromForm, requireNoTemplateReferences } from '../src/lib/post-templates.js';
import { saveTemplate, createTemplateDraft } from './post-templates.js';

function fixture(path = ':memory:') {
    const store = createStore(path);
    const brand = store.write('Brand', { name: 'Template brand', timezone: 'Europe/London' });
    const pillar = store.write('ContentPillar', { name: 'Pillar', brand_id: brand.id });
    const angle = store.write('ContentAngle', { name: 'Angle', brand_id: brand.id, pillar_id: pillar.id });
    const account = store.write('SocialAccount', { name: 'Account', brand_id: brand.id, platform: 'tiktok' });
    const image = store.write('MediaAsset', { name: 'Image', brand_id: brand.id, file_type: 'image', file_url: 'https://example.invalid/a.png' });
    const second = store.write('MediaAsset', { name: 'Second', brand_id: brand.id, file_type: 'image', file_url: 'https://example.invalid/b.png' });
    const data = { brand_id: brand.id, title: 'Unsaved composer', caption: ' Shared exact \n', pillar_id: pillar.id, angle_id: angle.id,
        media_ids: [second.id, image.id], platform_media_ids: { facebook: [image.id, second.id], threads: [] },
        platform_captions: { threads: 'Threads' }, account_ids: [account.id],
        destination_settings: { [account.id]: { caption: 'Account caption', scheduled_at: '2030-01-01T00:00:00Z', tiktok: { musicConsent: true } } },
        status: 'scheduled', timezone: 'Asia/Tokyo', scheduled_at: '2030-01-01T00:00:00Z', credential_id: 'never-save', external_post_id: 'never-save' };
    return { store, brand, pillar, angle, account, image, second, data };
}

test('templates capture unsaved content, reopen, and create independent drafts without schedule or consent', () => {
    const directory = mkdtempSync(join(tmpdir(), 'socialchoice-template-'));
    let f;
    try {
        f = fixture(join(directory, 'test.sqlite'));
        const template = saveTemplate(f.store, { name: '  Reusable  ', data: f.data });
        assert.equal(template.name, 'Reusable');
        assert.equal(f.store.all('Post').length, 0);
        assert.deepEqual(template.destination_settings, { [f.account.id]: { caption: 'Account caption' } });
        for (const key of ['status', 'timezone', 'scheduled_at', 'credential_id', 'external_post_id']) assert.equal(Object.hasOwn(template, key), false);
        f.store.close();
        f.store = createStore(join(directory, 'test.sqlite'));
        assert.deepEqual(f.store.get('PostTemplate', template.id), template);
        const first = createTemplateDraft(f.store, template.id), second = createTemplateDraft(f.store, template.id);
        assert.notEqual(first.post.id, second.post.id);
        assert.deepEqual(first.warnings, []);
        assert.equal(first.post.status, 'draft');
        assert.equal(first.post.timezone, 'Europe/London');
        assert.equal(first.post.scheduled_at, undefined);
        assert.deepEqual(first.post.destination_settings, template.destination_settings);
        assert.deepEqual(first.post.platform_media_ids, f.data.platform_media_ids);
        assert.deepEqual(first.post.media_ids, f.data.media_ids);
        assert.deepEqual(first.post.platform_captions, f.data.platform_captions);
        f.store.write('Post', { caption: 'Changed' }, first.post.id);
        assert.equal(f.store.get('Post', second.post.id).caption, f.data.caption);
        assert.equal(f.store.get('PostTemplate', template.id).caption, f.data.caption);
        assert.equal(f.store.all('PublishJob').length, 0);
        assert.equal(f.store.attemptsForPost(first.post.id).length, 0);
        const renamed = f.store.write('PostTemplate', { name: ' Renamed ' }, template.id);
        assert.equal(renamed.name, 'Renamed');
        f.store.remove('PostTemplate', template.id);
        assert.throws(() => f.store.get('PostTemplate', template.id), /not found/);
        assert.equal(f.store.all('Post').length, 2);
    } finally { f?.store.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('templates strictly validate generic writes and guard every referenced record', () => {
    const f = fixture();
    try {
        const template = saveTemplate(f.store, { name: 'Template', data: f.data });
        assert.equal(f.store.all('Post').length, 0);
        for (const [entity, id] of [['Brand', f.brand.id], ['ContentPillar', f.pillar.id], ['ContentAngle', f.angle.id], ['SocialAccount', f.account.id], ['MediaAsset', f.image.id], ['MediaAsset', f.second.id]]) assert.throws(() => f.store.remove(entity, id), /history|children/);
        for (const invalid of [ { name: ' ' }, { name: 'x'.repeat(161) }, { status: 'draft' }, { platform_captions: { youtube: 'bad' } }, { platform_captions: { facebook: 3 } }, { platform_media_ids: { youtube: [] } }, { platform_media_ids: { facebook: [f.image.id, f.image.id] } }, { media_ids: Array(11).fill(f.image.id) }, { destination_settings: { [f.account.id]: { scheduled_at: '2030-01-01T00:00:00Z' } } }, { destination_settings: { [f.account.id]: { tiktok: {} } } }, { platform_media_ids: null } ]) assert.throws(() => f.store.write('PostTemplate', invalid, template.id));
        const hidden = f.store.write('MediaAsset', { name: 'Override only', brand_id: f.brand.id, file_type: 'image', file_url: 'https://example.invalid/hidden.png' });
        f.store.write('PostTemplate', { platform_media_ids: { linkedin: [hidden.id] } }, template.id);
        assert.throws(() => f.store.remove('MediaAsset', hidden.id), /history/);
        const other = f.store.write('Brand', { name: 'Other' });
        const foreign = f.store.write('MediaAsset', { name: 'Foreign', brand_id: other.id, file_type: 'image', file_url: 'https://example.invalid/f.png' });
        assert.throws(() => f.store.write('PostTemplate', { platform_media_ids: { facebook: [foreign.id] } }, template.id), /Cross-brand/);
        assert.throws(() => f.store.write('PostTemplate', { is_demo: true }, template.id), /demo/);
        assert.throws(() => f.store.write('PostTemplate', { media_ids: ['missing'] }, template.id), /not found/);
        saveTemplate(f.store, { id: template.id, name: 'Replacement', data: { brand_id: f.brand.id, caption: 'Fresh' } });
        assert.equal(f.store.get('PostTemplate', template.id).platform_media_ids, undefined);
        assert.deepEqual(f.store.get('PostTemplate', template.id).destination_settings, {});
        f.store.remove('MediaAsset', f.image.id);
    } finally { f.store.close(); }
});

test('template use clears archived strategy with warnings and rejects archived brands', () => {
    const f = fixture();
    try {
        const template = saveTemplate(f.store, { name: 'Template', data: f.data });
        f.store.write('ContentAngle', { status: 'archived' }, f.angle.id);
        const angle = createTemplateDraft(f.store, template.id);
        assert.equal(angle.post.angle_id, undefined);
        assert.equal(angle.post.pillar_id, f.pillar.id);
        assert.equal(angle.warnings.length, 1);
        f.store.write('ContentPillar', { status: 'archived' }, f.pillar.id);
        const pillar = createTemplateDraft(f.store, template.id);
        assert.equal(pillar.post.pillar_id, undefined);
        assert.equal(pillar.post.angle_id, undefined);
        assert.equal(pillar.warnings.length, 1);
        assert.equal(f.store.get('PostTemplate', template.id).angle_id, f.angle.id);
        f.store.write('Brand', { status: 'archived' }, f.brand.id);
        assert.throws(() => createTemplateDraft(f.store, template.id), /active brand/);
        assert.throws(() => saveTemplate(f.store, { name: 'Archived', data: f.data }), /active brand/);
    } finally { f.store.close(); }
});

test('template endpoints require authentication and same-origin application requests', async () => {
    const password = 'template-admin-test-password';
    const { server, store } = createApi({ dbPath: ':memory:', passwordHash: hashPassword(password) });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = 'http://127.0.0.1:' + server.address().port;
    const brand = store.write('Brand', { name: 'API brand' });
    const headers = { 'Content-Type': 'application/json', 'X-Socialchoice-Client': 'local-ui' };
    const args = [{ name: 'HTTP template', data: { brand_id: brand.id, title: 'HTTP draft', caption: 'HTTP caption' } }];
    const request = (route, args, extra = {}) => fetch(url + route, { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify({ args }) });
    try {
        assert.equal((await request('/api/templates/save', args)).status, 401);
        const login = await request('/api/auth/login', [password]);
        const cookie = login.headers.get('set-cookie').split(';')[0];
        assert.equal((await request('/api/templates/save', args, { cookie, Origin: 'https://evil.invalid' })).status, 403);
        const saved = await request('/api/templates/save', args, { cookie });
        assert.equal(saved.status, 200);
        const template = await saved.json();
        assert.equal((await request('/api/templates/createDraft', [template.id])).status, 401);
        const created = await request('/api/templates/createDraft', [template.id], { cookie });
        assert.equal(created.status, 200);
        assert.equal((await created.json()).post.status, 'draft');
        assert.equal(store.all('PublishJob').length, 0);
        assert.equal((await request('/api/templates/createDraft', [], { cookie })).status, 400);
    } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});


test('composer template capture preserves unsaved ordered content and selected account captions only', () => {
    const form = {
        brand_id: 'brand', title: 'Unsaved edited title', caption: ' Unsaved main caption \n',
        platform_captions: { threads: 'Unsaved Threads caption', instagram: '' },
        media: [{ id: 'second' }, { id: 'first' }],
        platform_media: { facebook: [{ id: 'first' }, { id: 'second' }], threads: [] },
        pillar_id: 'pillar', angle_id: 'angle', account_ids: ['selected', 'blank', 'missing'],
        destination_settings: {
            selected: { caption: ' Exact account caption \n', scheduled_at: '2030-01-01T00:00:00Z', localTime: '2030-01-01T12:00', tiktok: { musicConsent: true } },
            blank: { caption: '  ', scheduled_at: '2030-01-02T00:00:00Z' },
            removed: { caption: 'Do not capture deselected account' },
        },
        status: 'published', scheduled_at: '2030-01-01T00:00:00Z', scheduled_local: '2030-01-01T12:00',
        localTime: '2030-01-01T12:00', timezone: 'Asia/Tokyo', tiktok: { musicConsent: true },
        published_at: '2026-10-01T00:00:00Z', external_post_id: 'history', credential_id: 'private', is_demo: false,
    };
    const data = templateDataFromForm(form, true);
    assert.deepEqual(data, {
        brand_id: 'brand', is_demo: true, title: 'Unsaved edited title', caption: ' Unsaved main caption \n',
        platform_captions: { threads: 'Unsaved Threads caption', instagram: '' },
        media_ids: ['second', 'first'], platform_media_ids: { facebook: ['first', 'second'], threads: [] },
        pillar_id: 'pillar', angle_id: 'angle', account_ids: ['selected', 'blank', 'missing'],
        destination_settings: { selected: { caption: ' Exact account caption \n' } },
    });
    form.account_ids.push('later');
    form.platform_captions.threads = 'Later edit';
    form.platform_media.facebook.reverse();
    assert.deepEqual(data.account_ids, ['selected', 'blank', 'missing']);
    assert.equal(data.platform_captions.threads, 'Unsaved Threads caption');
    assert.deepEqual(data.platform_media_ids.facebook, ['first', 'second']);
});


test('deletion checks count current template references with record identity and demo scope', async () => {
    const f = fixture();
    try {
        const first = saveTemplate(f.store, { name: 'First', data: f.data });
        const queries = [];
        const templates = { count: query => { queries.push(query); return f.store.execute('PostTemplate', 'count', [query]); } };
        const translations = [];
        const translate = (key, values) => { translations.push({ key, values }); return 'Translated reference count: ' + values.count; };
        for (const [field, record] of [['brand_id', f.brand], ['pillar_id', f.pillar], ['angle_id', f.angle], ['account_ids', f.account]]) {
            await assert.rejects(() => requireNoTemplateReferences(templates, field, record, translate), /Translated reference count: 1/);
            assert.deepEqual(queries.at(-1), { [field]: record.id, is_demo: false });
            assert.equal(translations.at(-1).key, '{count} templates reference this record. Remove those templates first, or archive/disconnect this record.');
            assert.deepEqual(translations.at(-1).values, { count: 1 });
            // Identical identity in another workspace must not block this record.
            await requireNoTemplateReferences(templates, field, { ...record, is_demo: true }, translate);
            assert.deepEqual(queries.at(-1), { [field]: record.id, is_demo: true });
            await requireNoTemplateReferences(templates, field, { ...record, id: 'unreferenced' }, translate);
        }
        const second = saveTemplate(f.store, { name: 'Second saved after initial checks', data: f.data });
        await assert.rejects(() => requireNoTemplateReferences(templates, 'brand_id', f.brand, translate), /Translated reference count: 2/);
        f.store.remove('PostTemplate', first.id);
        f.store.remove('PostTemplate', second.id);
        const callsBefore = translations.length;
        for (const [field, record] of [['brand_id', f.brand], ['pillar_id', f.pillar], ['angle_id', f.angle], ['account_ids', f.account]]) {
            await requireNoTemplateReferences(templates, field, record, translate);
        }
        assert.equal(translations.length, callsBefore);
    } finally { f.store.close(); }
});
