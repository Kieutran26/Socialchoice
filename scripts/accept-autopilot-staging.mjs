import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const origin = 'https://socialchoice-autopilot-staging.nguyenngockieutran.workers.dev';
const { password } = JSON.parse(readFileSync('.test-tools/autopilot-staging/secrets.json'));
let cookie = '';
const evidence = { origin, checks: [], time: new Date().toISOString() };
const check = (name, condition, detail = {}) => { evidence.checks.push({ name, pass: !!condition, ...detail }); assert.ok(condition, name); };
async function call(path, input, headers = {}) {
    const response = await fetch(origin + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Socialchoice-Client': 'local-ui', ...(cookie ? { cookie } : {}), ...headers }, body: JSON.stringify({ args: [input] }), signal: AbortSignal.timeout(20000) });
    const text = await response.text(); let data; try { data = JSON.parse(text); } catch { throw Error(`Staging returned non-JSON (${response.status})`); }
    return { response, status: response.status, data };
}
try {
    check('anonymous rejected', (await call('/api/autopilot/list', {})).status === 401);
    const login = await call('/api/auth/login', password); assert.equal(login.status, 200);
    cookie = login.response.headers.get('set-cookie').split(';')[0];
    const status = (await call('/api/autopilot/status', {})).data;
    check('R2 and Queue bindings ready', status.ready && status.storageReady && status.backgroundReady, { readiness: status });
    const brands = (await call('/api/entities/Brand/list', {})).data.items;
    let brand = brands.find(b => b.name === 'Autopilot Acceptance');
    if (!brand) brand = (await call('/api/entities/Brand/create', { name: 'Autopilot Acceptance' })).data;
    let listing = (await call('/api/autopilot/list', { brand_id: brand.id })).data;
    let source = listing.sources.find(s => s.name === 'R2 Acceptance');
    if (!source) source = (await call('/api/autopilot/createSource', { brand_id: brand.id, name: 'R2 Acceptance', kind: 'r2', folder: 'acceptance/' })).data;
    const job = (await call('/api/autopilot/sync', { id: source.id })).data;
    check('real Queue dispatch', job.backgroundQueued === true);
    for (let i = 0; i < 20; i++) {
        listing = (await call('/api/autopilot/list', { brand_id: brand.id })).data;
        if (listing.jobs.some(j => j.id === job.id && j.status === 'done')) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    check('background R2 ingestion and workspace prefix isolation', listing.assets.length === 1 && listing.assets[0].name === 'kiem-tra-anh.png' && listing.jobs.some(j => j.id === job.id && j.status === 'done'), { assets: listing.assets.map(a => ({ name: a.name, size: a.size, mime: a.mime })), jobStatus: listing.jobs.find(j => j.id === job.id)?.status });
    const second = (await call('/api/autopilot/sync', { id: source.id })).data;
    for (let i = 0; i < 20; i++) {
        listing = (await call('/api/autopilot/list', { brand_id: brand.id })).data;
        if (listing.jobs.some(j => j.id === second.id && j.status === 'done')) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    check('repeat sync has no duplicate assets', listing.assets.length === 1 && listing.jobs.some(j => j.id === second.id && j.status === 'done'));
    check('private entity forgery rejected', (await call('/api/entities/AutopilotAsset/create', { brand_id: brand.id })).status === 404);
    check('cross-origin rejected', (await call('/api/autopilot/list', {}, { origin: 'https://invalid.example' })).status === 403);
    check('AI requires confirmation', (await call('/api/autopilot/analyze', { id: listing.assets[0].id })).status === 409);
    check('AI fails closed without provider', (await call('/api/autopilot/analyze', { id: listing.assets[0].id, confirmed: true })).status === 409);
    let drive = listing.sources.find(s => s.name === 'Drive readiness acceptance');
    if (!drive) drive = (await call('/api/autopilot/createSource', { brand_id: brand.id, name: 'Drive readiness acceptance', kind: 'drive', folder: 'fixture-folder' })).data;
    check('Drive fails closed without OAuth credentials', (await call('/api/autopilot/connect', { id: drive.id })).status === 409);
    check('no post created', (await call('/api/entities/Post/list', {})).data.items.length === 0);
    await call('/api/auth/logout', {});
} catch (error) {
    evidence.error = error.message; process.exitCode = 1;
} finally {
    evidence.passed = evidence.checks.filter(c => c.pass).length; evidence.total = evidence.checks.length;
    writeFileSync('plans/261031-autopilot-phase-1/staging-api-evidence.json', JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
}
