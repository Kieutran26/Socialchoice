import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from './store.js';
import { createApi } from './index.js';
import { createTrackingLinks } from './tracking-links.js';
import { tagUrl, buildUtmCaptions, mapCaptionLinks } from '../src/lib/utm-links.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const options = { medium: 'social', campaign: 'Tháng 11', tracking: true };
test('tracking totals, activity days and disable state survive storage restart', () => {
    const directory = mkdtempSync(join(tmpdir(), 'tracking-restart-'));
    let store = createStore(join(directory, 'fixture.sqlite'));
    try {
        const link = store.trackingLinks.create('fixture', { brand_id: 'brand', target: 'https://example.com/' });
        store.transaction(() => store.trackingLinks.hit(link.id)); store.trackingLinks.disable(link.id); store.close();
        store = createStore(join(directory, 'fixture.sqlite'));
        assert.equal(store.trackingLinks.get(link.id).clicks, 1); assert.equal(store.trackingLinks.get(link.id).active, false);
        assert.equal(store.trackingLinks.list('brand')[0].days[0].clicks, 1);
    } finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});
function fixture() {
    const store = createStore(':memory:');
    const brand = store.write('Brand', { name: 'Tracking' });
    const account = store.write('SocialAccount', { name: 'Page', platform: 'facebook', brand_id: brand.id });
    return { store, brand, account, input: { brand_id: brand.id, options, form: { caption: 'Xem https://example.com/shop?q=1#offer.', account_ids: [account.id] } } };
}
test('UTM preserves queries, fragments, punctuation and existing attribution; replacement is explicit', () => {
    const external = buildUtmCaptions({ caption: 'https://other.example/api/links/go/item', account_ids: [] }, [], options, undefined, 'https://socialchoice.site');
    assert.equal(external.links.length, 1); assert.match(external.caption, /utm_campaign/);
    const url = new URL(tagUrl('https://example.com/?utm_source=old&q=1#top', options, 'facebook'));
    assert.equal(url.searchParams.get('utm_source'), 'old'); assert.equal(url.searchParams.get('utm_campaign'), 'Tháng 11'); assert.equal(url.hash, '#top');
    assert.equal(new URL(tagUrl(url.href, { ...options, replace: true }, 'linkedin')).searchParams.get('utm_source'), 'linkedin');
    const signed = 'https://example.com/?X-Amz-Signature=abc'; assert.equal(tagUrl(signed, options), signed);
    assert.equal(mapCaptionLinks('(https://example.com/a).', value => value + '?x=1'), '(https://example.com/a?x=1).');
    assert.equal(mapCaptionLinks('http://localhost/a', () => 'bad'), 'http://localhost/a');
    assert.throws(() => mapCaptionLinks('https://example.com/', () => { throw new Error('transaction failure'); }), /transaction failure/);
});
test('each destination uses effective captions and repeated builds reuse fixed links without publishing', () => {
    const { store, account, input } = fixture();
    try {
        const service = createTrackingLinks(store), result = service.execute('build', input, 'https://socialchoice.site');
        assert.match(result.destination_captions[account.id], /api\/links\/go\/owner/);
        assert.equal(result.caption, input.form.caption);
        assert.deepEqual(service.execute('build', input, 'https://socialchoice.site'), result);
        assert.equal(store.trackingLinks.list(input.brand_id).length, 1);
        assert.equal(store.all('Post').length, 0); assert.equal(store.queuedAttempts().length, 0);
        const repeated = buildUtmCaptions({ ...input.form, destination_settings: { [account.id]: { caption: result.destination_captions[account.id] } } }, [account], options, undefined, 'https://socialchoice.site');
        assert.equal(repeated.links.length, 0);
        const other = store.write('Brand', { name: 'Other' });
        assert.throws(() => service.execute('build', { ...input, brand_id: other.id }, 'https://socialchoice.site'), /Cross-brand/);
        assert.throws(() => service.execute('build', { ...input, form: { ...input.form, caption: Array(101).fill('https://example.com/').join(' ') } }, 'https://socialchoice.site'), /at most 100/);
        assert.equal(store.trackingLinks.list(input.brand_id).length, 1);
    } finally { store.close(); }
});
test('public redirect counts GET only, excludes previews, rejects wrong scope and can be disabled', async () => {
    const api = createApi({ dbPath: ':memory:', frontendPort: 5173 });
    await new Promise(resolve => api.server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${api.server.address().port}`;
    try {
        const brand = api.store.write('Brand', { name: 'HTTP' });
        const input = { brand_id: brand.id, form: { caption: 'https://example.com/', account_ids: [] }, options };
        const call = (op, input, extra = {}) => fetch(`${origin}/api/links/${op}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-socialchoice-client': 'local-ui', ...extra }, body: JSON.stringify({ args: [input] }) });
        assert.equal((await call('build', input, { origin: 'https://evil.example' })).status, 403);
        const response = await call('build', input); assert.equal(response.status, 200);
        const result = await response.json(), url = result.links[0].final;
        for (const headers of [{}, { 'user-agent': 'LinkedInBot' }, { purpose: 'prefetch' }]) {
            const redirect = await fetch(url, { redirect: 'manual', headers: { 'sec-fetch-site': 'cross-site', ...headers } });
            assert.equal(redirect.status, 302); assert.match(redirect.headers.get('location'), /utm_campaign/); assert.match(redirect.headers.get('cache-control'), /no-store/);
        }
        assert.equal((await fetch(url, { method: 'HEAD', redirect: 'manual' })).status, 302);
        const list = await (await call('list', { brand_id: brand.id })).json();
        assert.equal(list.links[0].clicks, 1); assert.equal(list.links[0].days[0].clicks, 1);
        assert.equal((await fetch(url.replace('/owner/', '/11111111-1111-1111-1111-111111111111/'), { redirect: 'manual' })).status, 404);
        await call('disable', { brand_id: brand.id, id: list.links[0].id });
        assert.equal((await fetch(url, { redirect: 'manual' })).status, 410);
    } finally { await new Promise(resolve => api.server.close(resolve)); }
});

