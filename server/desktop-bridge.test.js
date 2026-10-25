import test from 'node:test';
import assert from 'node:assert/strict';
import { desktopRequest } from '../src/api/desktop/request.ts';
import { isDesktop } from '../src/api/desktop/runtime.ts';
import { readFileSync } from 'node:fs';

const brands = [
    { id: 'b', name: 'Beta', is_demo: false, status: 'active', created_date: '2026-01-02' },
    { id: 'a', name: 'Alpha', is_demo: false, status: 'archived', created_date: '2026-01-01' },
];

test('desktop reads retain query/pagination/count/aggregate and missing-record contracts', async () => {
    const calls = [];
    const invoke = async (command, payload) => { calls.push({ command, ...payload }); return [...brands]; };
    const filtered = await desktopRequest('entities/Brand/filter', [{ status: 'active' }, { sort: 'name' }], invoke);
    assert.equal(filtered.total, 1);
    assert.equal(filtered.items[0].id, 'b');
    const page = await desktopRequest('entities/Brand/list', [{ sort: 'name', limit: 1 }], invoke);
    assert.equal(page.items[0].id, 'a');
    assert.equal(page.has_more, true);
    assert.equal(await desktopRequest('entities/Brand/count', [{ is_demo: false }], invoke), 2);
    assert.deepEqual(await desktopRequest('entities/Brand/get', ['a'], invoke), brands[1]);
    assert.equal((await desktopRequest('entities/Brand/aggregate', [{ groupBy: 'status' }], invoke)).rows.length, 2);
    await assert.rejects(desktopRequest('entities/Brand/get', ['missing'], invoke), /Record not found/);
    assert.ok(calls.every(call => call.command === 'workspace_request' && call.path === 'entities/Brand/all'));
});

test('writes reach native validation and native rejections become form errors, with no HTTP fallback', async () => {
    const input = { name: 'Brand' };
    await desktopRequest('entities/Brand/create', [input], async (command, payload) => {
        assert.equal(command, 'workspace_request');
        assert.deepEqual(payload, { path: 'entities/Brand/create', args: [input] });
        return { ...input, id: 'native-id' };
    });
    await assert.rejects(desktopRequest('publishing/publish', ['id'], async () => {
        throw 'Feature unavailable in this desktop prototype';
    }), /Feature unavailable/);
    assert.equal(isDesktop(), false);
});

test('packaged desktop cannot use cloud HTTP, broad filesystem or shell permissions', () => {
    const config = JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url)));
    const capability = JSON.parse(readFileSync(new URL('../src-tauri/capabilities/main.json', import.meta.url)));
    assert.equal(config.identifier, 'com.socialchoice.desktop.prototype');
    assert.equal(config.build.frontendDist, '../dist-desktop');
    assert.ok(!config.app.security.csp.includes('https:'));
    assert.ok(config.app.security.csp.includes('connect-src ipc: http://ipc.localhost;'));
    assert.deepEqual(capability.permissions, ['allow-workspace-request', 'allow-workspace-files', 'allow-workspace-ai', 'allow-workspace-license']);
    assert.equal(capability.remote, undefined);
    assert.deepEqual(config.app.security.assetProtocol.scope, ['$APPDATA/media/*']);
    assert.ok(config.app.security.csp.includes('http://asset.localhost'));
});
