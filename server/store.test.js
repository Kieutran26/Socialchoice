import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from './store.js';
import { createApi } from './index.js';
import { savePostPlan } from './post-plans.js';

function workspace(store) {
    const brand = store.write('Brand', { name: 'Test Brand' });
    const other = store.write('Brand', { name: 'Other Brand' });
    const pillar = store.write('ContentPillar', { name: 'Education', brand_id: brand.id, target_percentage: 50 });
    const second = store.write('ContentPillar', { name: 'Stories', brand_id: brand.id, target_percentage: 50 });
    const angle = store.write('ContentAngle', { name: 'How to', brand_id: brand.id, pillar_id: pillar.id });
    const account = store.write('SocialAccount', { name: 'Authorized Page pending OAuth', platform: 'facebook', brand_id: brand.id });
    const post = store.write('Post', { title: 'Draft', caption: 'Original content', brand_id: brand.id, pillar_id: pillar.id, angle_id: angle.id, account_ids: [account.id] });
    return { brand, other, pillar, second, angle, account, post };
}

test('data persists after closing and reopening the database', () => {
    const directory = mkdtempSync(join(tmpdir(), 'socialchoice-persistence-'));
    const file = join(directory, 'test.sqlite');
    try {
        let store = createStore(file);
        const { post } = workspace(store);
        store.close();
        store = createStore(file);
        assert.equal(store.get('Post', post.id).caption, 'Original content');
        store.close();
    } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('brand/pillar/angle integrity and archive safety are enforced', () => {
    const store = createStore(':memory:');
    try {
        const { post, brand, other, pillar, second, angle, account } = workspace(store);
        assert.throws(() => store.write('Post', { brand_id: other.id }, post.id), /Cross-brand/);
        assert.throws(() => store.write('Post', { pillar_id: second.id }, post.id), /Angle must belong/);
        assert.throws(() => store.remove('ContentAngle', angle.id), /history/);
        assert.throws(() => store.remove('ContentPillar', pillar.id), /history/);
        assert.throws(() => store.remove('Brand', brand.id), /history/);
        assert.throws(() => store.write('SocialAccount', { brand_id: other.id }, account.id), /cannot move/);
        store.write('ContentAngle', { status: 'archived' }, angle.id);
        assert.equal(store.get('Post', post.id).angle_id, angle.id);
        store.write('Post', { pillar_id: second.id, angle_id: '' }, post.id);
        assert.equal(store.get('Post', post.id).angle_id, '');
    } finally { store.close(); }
});

test('cannot manufacture real platform confirmations or access credentials', () => {
    const store = createStore(':memory:');
    try {
        const { account, post, brand } = workspace(store);
        assert.throws(() => store.write('SocialAccount', { connection_status: 'connected' }, account.id), /OAuth/);
        assert.throws(() => store.write('Post', { status: 'published' }, post.id), /confirmed platform/);
        assert.throws(() => store.write('Post', { published_at: '2026-10-12T00:00:00Z' }, post.id), /confirmation/);
        assert.throws(() => store.all('OAuthCredential'), /server-only/);
        assert.throws(() => store.write('Brand', { name: 'Secret', access_token: 'do-not-store' }), /Unsupported field/);
        assert.throws(() => store.write('ContentPillar', { brand_id: brand.id, name: 'Invalid', target_percentage: 101 }), /percentage/);
    } finally { store.close(); }
});

test('unique content mix, array filters, literal search and pagination', () => {
    const store = createStore(':memory:');
    try {
        const { post, brand, pillar, account } = workspace(store);
        const second = store.write('SocialAccount', { name: 'Second Page', platform: 'facebook', brand_id: brand.id });
        store.write('Post', { account_ids: [account.id, second.id] }, post.id);
        assert.equal(store.execute('Post', 'aggregate', [{ query: { brand_id: brand.id }, groupBy: 'pillar_id' }]).rows[0].count, 1);
        assert.equal(store.execute('Post', 'count', [{ account_ids: { $in: [second.id] } }]), 1);
        assert.equal(store.execute('Post', 'count', [{ title: { $regex: '.*', $options: 'i' } }]), 0);
        for (let i = 0; i < 3; i++) store.write('Post', { title: `Other ${i}`, brand_id: brand.id, pillar_id: pillar.id });
        const page = store.execute('Post', 'filter', [{ brand_id: brand.id }, { limit: 2, sort: 'title' }]);
        assert.equal(page.has_more, true);
        const next = store.execute('Post', 'filter', [{ brand_id: brand.id }, { limit: 2, sort: 'title', cursor: page.next_cursor }]);
        assert.equal(new Set([...page.items, ...next.items].map((r) => r.id)).size, 4);
    } finally { store.close(); }
});

test('bulk writes roll back and scheduled plans store UTC across restart', () => {
    const store = createStore(':memory:');
    try {
        const { post } = workspace(store);
        assert.throws(() => store.execute('Brand', 'bulkCreate', [[{ name: 'Good' }, { name: '' }]]));
        assert.equal(store.execute('Brand', 'count', [{ name: 'Good' }]), 0);
        store.write('Post', { status: 'scheduled', scheduled_at: '2026-10-20T09:00:00+07:00' }, post.id);
        assert.equal(store.get('Post', post.id).scheduled_at, '2026-10-20T02:00:00.000Z');
        store.write('Post', { scheduled_at: '2026-10-21T09:00:00+07:00' }, post.id);
        assert.equal(store.get('Post', post.id).scheduled_at, '2026-10-21T02:00:00.000Z');
        assert.throws(() => store.remove('Post', post.id), /Only drafts/);
    } finally { store.close(); }
});

test('HTTP API rejects external origins, missing headers, bad JSON, credential entities', async () => {
    const { server } = createApi({ dbPath: ':memory:' });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    try {
        assert.equal((await fetch(`${base}/session`)).status, 403);
        assert.equal((await fetch(`${base}/session`, { headers: { 'X-Socialchoice-Client': 'local-ui', Origin: 'https://untrusted.example' } })).status, 403);
        const response = await fetch(`${base}/session`, { headers: { 'X-Socialchoice-Client': 'local-ui' } });
        assert.equal((await response.json()).mode, 'local-only');
        const headers = { 'X-Socialchoice-Client': 'local-ui', 'Content-Type': 'application/json' };
        assert.equal((await fetch(`${base}/entities/Brand/create`, { method: 'POST', headers, body: '{' })).status, 400);
        assert.equal((await fetch(`${base}/entities/OAuthCredential/filter`, { method: 'POST', headers, body: JSON.stringify({ args: [{}] }) })).status, 404);
        const publishing = await fetch(`${base}/publishing/check`, { method: 'POST', headers });
        assert.equal((await publishing.json()).unavailable, true);
    } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('calendar plan save/reschedule/cancel and draft deletion keep destination rows consistent', () => {
    const store = createStore(':memory:');
    try {
        const { post, brand, account } = workspace(store);
        const second = store.write('SocialAccount', { name: 'Second reference', platform: 'facebook', brand_id: brand.id });
        savePostPlan(store, { id: post.id, data: { status: 'scheduled', scheduled_at: '2026-10-20T02:00:00Z', account_ids: [account.id, second.id] } });
        assert.equal(store.all('PublishJob').length, 2);
        savePostPlan(store, { id: post.id, data: { status: 'scheduled', scheduled_at: '2026-10-21T02:00:00Z', account_ids: [second.id] } });
        assert.equal(store.all('PublishJob').filter((r) => r.status === 'pending').length, 1);
        assert.equal(store.all('PublishJob').find((r) => r.social_account_id === second.id).scheduled_for, '2026-10-21T02:00:00.000Z');
        const before = store.get('Post', post.id);
        assert.throws(() => savePostPlan(store, { id: post.id, data: { status: 'scheduled', title: 'Should roll back', account_ids: ['invalid'] } }));
        assert.equal(store.get('Post', post.id).title, before.title);
        savePostPlan(store, { id: post.id, data: { status: 'draft' } });
        assert.equal(store.all('PublishJob').filter((r) => r.status === 'pending').length, 0);
        store.execute('Post', 'deleteMany', [{ id: { $in: [post.id] } }]);
        assert.equal(store.all('Post').length, 0);
        assert.equal(store.all('PublishJob').length, 0);
    } finally { store.close(); }
});
