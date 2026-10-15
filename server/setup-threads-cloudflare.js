import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

// Upload only the Threads product secret to the existing Worker through stdin.
try {
    const local=parseEnv(readFileSync('.env.threads','utf8'));
    const cloud=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
    if(cloud.name!=='socialchoice-api'||local.THREADS_APP_ID!==cloud.vars.THREADS_APP_ID||local.THREADS_REDIRECT_URI!==cloud.vars.THREADS_REDIRECT_URI||!local.THREADS_APP_SECRET||/[\s\r\n"'#]/.test(local.THREADS_APP_SECRET))throw new Error('Configuration mismatch');
    const result=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'secret','bulk'],{input:JSON.stringify({THREADS_APP_SECRET:local.THREADS_APP_SECRET}),stdio:['pipe','inherit','inherit'],env:{...process.env,XDG_CONFIG_HOME:resolve('.wrangler/config'),WRANGLER_SEND_METRICS:'false'}});
    if(result.error||result.status!==0)throw new Error('Upload failed');
    console.log('Threads product secret saved privately to the existing Worker. No other secrets or keys changed.');
} catch {console.error('Private Threads cloud setup did not complete. Check the local configuration and authorized Wrangler login. No secret values are displayed.');process.exitCode=1;}
