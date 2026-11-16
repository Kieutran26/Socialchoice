import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BROWSER_BIN = CHROME_PATH;
const PORT = 9223;
const TARGET_URL = 'http://127.0.0.1:5174/overview';
const TEST_DURATION_MS = 185000; // 3 minutes + 5s buffer

const tempDir = mkdtempSync(join(tmpdir(), 'sc-net-test-'));

console.log(`[VERIFY] Starting browser from ${BROWSER_BIN}...`);
console.log(`[VERIFY] Monitoring network calls to /api/session and /api/auth/login for 3 minutes...`);

const browserProc = spawn(BROWSER_BIN, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tempDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
], { stdio: 'ignore' });

function cleanup() {
    try { browserProc.kill(); } catch {}
    try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
}

process.on('SIGINT', cleanup);
process.on('exit', cleanup);

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getDebuggerUrl() {
    for (let i = 0; i < 30; i++) {
        try {
            const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
            const data = await res.json();
            if (data && data.length > 0 && data[0].webSocketDebuggerUrl) {
                return data[0].webSocketDebuggerUrl;
            }
        } catch {}
        await wait(200);
    }
    throw new Error('Failed to connect to browser CDP within 6 seconds');
}

async function run() {
    const wsUrl = await getDebuggerUrl();
    console.log(`[VERIFY] Connected to CDP at ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
    });

    let msgId = 1;
    function sendCommand(method, params = {}) {
        return new Promise((resolve) => {
            const id = msgId++;
            const handler = (event) => {
                const data = JSON.parse(event.data);
                if (data.id === id) {
                    ws.removeEventListener('message', handler);
                    resolve(data.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    const recordedRequests = [];
    const startTime = Date.now();

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.method === 'Network.requestWillBeSent') {
            const url = data.params?.request?.url || '';
            const method = data.params?.request?.method || '';
            if (url.includes('/api/session') || url.includes('/api/auth/login')) {
                const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
                const record = { elapsedSec: Number(elapsedSec), method, url };
                recordedRequests.push(record);
                console.log(`[NETWORK EVENT +${elapsedSec}s] ${method} ${url}`);
            }
        }
    };

    await sendCommand('Network.enable');
    await sendCommand('Page.enable');

    console.log(`[VERIFY] Navigating to ${TARGET_URL}...`);
    await sendCommand('Page.navigate', { url: TARGET_URL });

    // Progress heartbeats every 30 seconds
    const interval = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`[VERIFY] Progress: ${elapsed}s / 180s elapsed... Current count: ${recordedRequests.length} requests`);
    }, 30000);

    await wait(TEST_DURATION_MS);
    clearInterval(interval);

    console.log('\n================ VERIFICATION SUMMARY ================');
    console.log(`Duration: 3 minutes (${TEST_DURATION_MS / 1000}s)`);
    console.log(`Total calls to /api/session or /api/auth/login: ${recordedRequests.length}`);
    console.log('Recorded requests:');
    for (const r of recordedRequests) {
        console.log(`  +${r.elapsedSec}s: ${r.method} ${r.url}`);
    }

    ws.close();
    cleanup();

    if (recordedRequests.length <= 2) {
        console.log('\n[RESULT: PASS] No continuous calling loop! Requests only occurred during initial load.');
        process.exit(0);
    } else {
        console.error(`\n[RESULT: FAIL] Loop detected! Encountered ${recordedRequests.length} requests over 3 minutes.`);
        process.exit(1);
    }
}

run().catch((err) => {
    console.error('[ERROR]', err);
    cleanup();
    process.exit(1);
});
