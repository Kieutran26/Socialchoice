import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const exec = promisify(execFile);
const exe = resolve('src-tauri/target/release/socialchoice-desktop.exe');
const output = resolve('plans/reports/desktop-social-login-smoke');
const configuredService = process.argv.includes('--configured-service');
const delay = ms => new Promise(done => setTimeout(done, ms));
const requests = new Map();
let processHandle, socket, sequence = 0, brandId, accountId;
async function rpc(method, params = {}) {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { requests.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
        requests.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject });
        socket.send(JSON.stringify({ id, method, params }));
    });
}
async function evaluate(expression) {
    const value = await rpc('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (value.exceptionDetails) throw new Error(value.exceptionDetails.exception?.description || value.exceptionDetails.text);
    return value.result.value;
}
async function until(expression) {
    for (let i = 0; i < 70; i++) { if (await evaluate(expression)) return; await delay(150); }
    throw new Error(`UI condition failed: ${expression}`);
}
async function click(text, selector = 'button') {
    await evaluate(`(()=>{const button=[...document.querySelectorAll(${JSON.stringify(selector)})].find(el=>el.textContent.trim()===${JSON.stringify(text)});if(!button)throw new Error('Button missing');button.click();})()`);
}
async function invoke(path, args = [], social = false) {
    return evaluate(`window.__TAURI__.core.invoke(${JSON.stringify(social ? 'workspace_social' : 'workspace_request')},${JSON.stringify({ path, args })})`);
}
async function screenshot(name) {
    const result = await rpc('Page.captureScreenshot', { format: 'png' });
    await writeFile(resolve(output, name), Buffer.from(result.data, 'base64'));
}
try {
    try { await fetch('http://127.0.0.1:1421/json/list', { signal: AbortSignal.timeout(500) }); throw new Error('Debug port 1421 is occupied; no duplicate process started'); }
    catch (error) { if (error.message.includes('occupied')) throw error; }
    await mkdir(output, { recursive: true });
    processHandle = spawn(exe, [], { windowsHide: true, stdio: 'ignore', env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=1421', WEBVIEW2_USER_DATA_FOLDER: resolve(output, 'webview-profile') } });
    processHandle.on('error', error => { console.error(error.message); });
    let target;
    for (let i = 0; i < 80; i++) {
        try { target = (await (await fetch('http://127.0.0.1:1421/json/list')).json()).find(item => item.type === 'page' && item.url.includes('tauri.localhost')); } catch { /* Wait for owned WebView. */ }
        if (target) break; await delay(200);
    }
    assert.ok(target, 'Smoke WebView did not appear');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    socket.addEventListener('message', event => { const value = JSON.parse(String(event.data)); if (requests.has(value.id)) { const request = requests.get(value.id); requests.delete(value.id); value.error ? request.reject(new Error(value.error.message)) : request.resolve(value.result); } });
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    await until("!!window.__TAURI__ && document.readyState==='complete'");
    const health = await invoke('meta/status', [], true);
    assert.equal(health.applicationId, 'com.socialchoice.desktop.smoke', 'Refuse to mutate a real application workspace');
    assert.equal(health.ready, configuredService, 'Build must match the requested setup/readiness smoke mode');
    const brand = await invoke('entities/Brand/create', [{ name: `Login smoke ${Date.now()}` }]); brandId = brand.id;
    await evaluate("localStorage.setItem('socialchoice.language','en');location.hash='/accounts';location.reload()");
    await until("document.body.innerText.includes('Add channel') && !document.body.innerText.includes('Opening workspace')");
    await click('Add channel');
    await until(`document.querySelector('[role=dialog]')?.innerText.includes('${configuredService ? 'Available to connect' : 'Setup required'}')`);
    const choices = await evaluate("[...document.querySelectorAll('[role=dialog] button[aria-label]')].map(button=>({label:button.getAttribute('aria-label'),disabled:button.disabled}))");
    assert.ok(choices.some(choice => choice.label === 'Connect YouTube' && choice.disabled));
    await until("!!document.querySelector('button[aria-label=\"Connect LinkedIn\"]') && !document.querySelector('button[aria-label=\"Connect LinkedIn\"]').disabled");
    await evaluate("document.querySelector('button[aria-label=\"Connect LinkedIn\"]').click()");
    await until("!![...document.querySelectorAll('[role=dialog] button')].find(button=>button.textContent==='Connect / reconnect')");
    if (configuredService) {
        await until("!document.querySelector('[role=dialog]')?.innerText.includes('Checking…')");
        await evaluate(`(()=>{const select=document.querySelector('[role=dialog] select');select.value=${JSON.stringify(brandId)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await until("![...document.querySelectorAll('[role=dialog] button')].find(button=>button.textContent==='Connect / reconnect').disabled");
    } else {
        await until("document.querySelector('[role=dialog]')?.innerText.includes('The desktop login service is not ready')");
        assert.equal(await evaluate("[...document.querySelectorAll('[role=dialog] button')].find(button=>button.textContent==='Connect / reconnect').disabled"), true);
    }
    await rpc('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await screenshot(configuredService ? 'desktop-login-service-ready-1440.png' : 'desktop-login-1440.png');
    await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    await screenshot(configuredService ? 'desktop-login-service-ready-390.png' : 'desktop-login-390.png');
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'Small viewport must not overflow horizontally');
    await rpc('Emulation.clearDeviceMetricsOverride');
    await evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}))");
    await until("!document.querySelector('[role=dialog]')");
    const reference = await invoke('entities/SocialAccount/create', [{ brand_id: brandId, name: 'YouTube planning smoke', platform: 'youtube' }]); accountId = reference.id;
    await evaluate('location.reload()');
    await until("document.body.innerText.includes('YouTube planning smoke')");
    await evaluate("(()=>{const row=[...document.querySelectorAll('section .divide-y > div')].find(row=>row.innerText.includes('YouTube planning smoke'));const button=[...row.querySelectorAll('button')].find(button=>button.textContent.trim()==='Fix connection');button.click();})()");
    await until("document.querySelector('[role=dialog]')?.innerText.includes('Reconnect this destination')");
    assert.ok(!(await evaluate("document.querySelector('[role=dialog]').innerText")).includes('Sign in in your default browser'));
    console.log(`PASS: packaged Social Accounts route, native ${configuredService ? 'deployed service readiness and enabled login' : 'setup state and disabled login'}, narrow/wide layout, unsupported-platform planning reference. No real OAuth grant was attempted.`);
} finally {
    if (socket?.readyState === WebSocket.OPEN) {
        if (accountId) await invoke('entities/SocialAccount/delete', [accountId]).catch(error => console.error(`Cleanup account: ${error.message}`));
        if (brandId) await invoke('entities/Brand/delete', [brandId]).catch(error => console.error(`Cleanup brand: ${error.message}`));
        socket.close();
    }
    if (processHandle?.pid && processHandle.exitCode === null) {
        await exec('taskkill', ['/PID', String(processHandle.pid), '/T']).catch(() => {});
        for (let i = 0; i < 30 && processHandle.exitCode === null; i++) await delay(100);
        if (processHandle.exitCode === null) await exec('taskkill', ['/PID', String(processHandle.pid), '/T', '/F']).catch(() => {});
    }
}
