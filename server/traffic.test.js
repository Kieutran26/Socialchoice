import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from './index.js';

async function startServer() {
    const api = createApi({ dbPath: ':memory:', frontendPort: 5173 });
    await new Promise(resolve => api.server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${api.server.address().port}`;
    const call = (op, input, extra = {}) =>
        fetch(`${origin}/api/links/${op}`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-socialchoice-client': 'local-ui',
                ...extra,
            },
            body: JSON.stringify({ args: [input] }),
        });
    const close = () => new Promise(resolve => api.server.close(resolve));
    return { api, origin, call, close };
}

test('shortlink creation via links/create and links/build', async () => {
    const { api, origin, call, close } = await startServer();
    try {
        const brand = api.store.write('Brand', { name: 'Alpha' });

        // links/create
        const createRes = await call('create', {
            brand_id: brand.id,
            url: 'https://example.com/landing?ref=1',
            campaign: 'Launch',
            platform: 'facebook',
        });
        assert.equal(createRes.status, 200);
        const created = await createRes.json();
        assert.ok(created.id);
        assert.match(created.code, /^[a-zA-Z0-9_-]{4,36}$/);
        assert.equal(created.url, `${origin}/s/${created.code}`);
        assert.equal(created.short_url, `${origin}/s/${created.code}`);
        assert.equal(created.target, 'https://example.com/landing?ref=1');
        assert.equal(created.clicks, 0);
        assert.equal(created.active, true);

        // links/build with short: true
        const buildRes = await call('build', {
            brand_id: brand.id,
            form: { caption: 'Visit https://example.com/offer today!', account_ids: [] },
            options: { medium: 'social', campaign: 'Autumn', tracking: true, short: true },
        });
        assert.equal(buildRes.status, 200);
        const built = await buildRes.json();
        assert.equal(built.links.length, 1);
        assert.match(built.links[0].final, new RegExp(`^${origin}/s/[a-zA-Z0-9_-]+$`));
        assert.match(built.caption, new RegExp(`${origin}/s/[a-zA-Z0-9_-]+`));
    } finally {
        await close();
    }
});

test('click tracking: GET /s/:code increments clicks and days, HEAD does not, disabled link returns 410 without incrementing', async () => {
    const { api, call, close } = await startServer();
    try {
        const brand = api.store.write('Brand', { name: 'Tracker' });
        const created = await (await call('create', {
            brand_id: brand.id,
            url: 'https://example.com/product',
        })).json();

        // HEAD /s/:code must redirect 302 but NOT increment clicks
        const headRes = await fetch(created.url, { method: 'HEAD', redirect: 'manual' });
        assert.equal(headRes.status, 302);
        assert.equal(headRes.headers.get('location'), 'https://example.com/product');

        let listed = await (await call('list', { brand_id: brand.id })).json();
        assert.equal(listed.links[0].clicks, 0);
        assert.equal(listed.links[0].days.length, 0);

        // GET /s/:code must redirect 302 and increment clicks & days
        const getRes1 = await fetch(created.url, { method: 'GET', redirect: 'manual' });
        assert.equal(getRes1.status, 302);
        assert.equal(getRes1.headers.get('location'), 'https://example.com/product');

        const getRes2 = await fetch(created.url, { method: 'GET', redirect: 'manual' });
        assert.equal(getRes2.status, 302);

        listed = await (await call('list', { brand_id: brand.id })).json();
        const todayIct = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date());
        assert.equal(listed.links[0].clicks, 2);
        assert.equal(listed.links[0].days.length, 1);
        assert.equal(listed.links[0].days[0].day, todayIct);
        assert.equal(listed.links[0].days[0].clicks, 2);
        assert.ok(listed.links[0].last_click);

        // Disable link: GET /s/:code returns 410 and does NOT redirect or increment
        const disableRes = await call('disable', { brand_id: brand.id, id: created.id });
        assert.equal(disableRes.status, 200);

        const disabledGet = await fetch(created.url, { method: 'GET', redirect: 'manual' });
        assert.equal(disabledGet.status, 410);
        assert.equal(disabledGet.headers.get('location'), null);

        listed = await (await call('list', { brand_id: brand.id })).json();
        assert.equal(listed.links[0].active, false);
        assert.equal(listed.links[0].clicks, 2);
        assert.equal(listed.links[0].days[0].clicks, 2);
    } finally {
        await close();
    }
});

test('links/list supports specific brand_id, all brands, is_demo filter, and sets Cache-Control: no-store', async () => {
    const { api, call, close } = await startServer();
    try {
        const brandA = api.store.write('Brand', { name: 'Brand A', is_demo: false });
        const brandB = api.store.write('Brand', { name: 'Brand B', is_demo: false });
        const demoBrand = api.store.write('Brand', { name: 'Demo Brand', is_demo: true });

        const linkA = await (await call('create', { brand_id: brandA.id, url: 'https://example.com/a' })).json();
        const linkB = await (await call('create', { brand_id: brandB.id, url: 'https://example.com/b' })).json();
        const linkDemo = await (await call('create', { brand_id: demoBrand.id, url: 'https://example.com/demo' })).json();

        // Specific brand_id + Cache-Control header check
        const resA = await call('list', { brand_id: brandA.id });
        assert.equal(resA.status, 200);
        assert.equal(resA.headers.get('cache-control'), 'no-store');
        const bodyA = await resA.json();
        assert.equal(bodyA.links.length, 1);
        assert.equal(bodyA.links[0].id, linkA.id);

        // 'all' brands + Cache-Control header check
        const resAll = await call('list', { brand_id: 'all' });
        assert.equal(resAll.status, 200);
        assert.equal(resAll.headers.get('cache-control'), 'no-store');
        const bodyAll = await resAll.json();
        assert.equal(bodyAll.links.length, 3);
        const allIds = new Set(bodyAll.links.map(l => l.id));
        assert.ok(allIds.has(linkA.id));
        assert.ok(allIds.has(linkB.id));
        assert.ok(allIds.has(linkDemo.id));

        // 'all' brands filtered by is_demo: false
        const resLive = await call('list', { brand_id: 'all', is_demo: false });
        assert.equal(resLive.status, 200);
        assert.equal(resLive.headers.get('cache-control'), 'no-store');
        const bodyLive = await resLive.json();
        assert.equal(bodyLive.links.length, 2);
        const liveIds = new Set(bodyLive.links.map(l => l.id));
        assert.ok(liveIds.has(linkA.id));
        assert.ok(liveIds.has(linkB.id));
        assert.ok(!liveIds.has(linkDemo.id));
    } finally {
        await close();
    }
});
