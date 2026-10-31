import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { randomBytes, scryptSync, createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';

// This command builds only. It never provisions, uploads, or deploys a Worker.
const root = resolve('.'), directory = join(root, '.test-tools/autopilot-staging');
mkdirSync(directory, { recursive: true });
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
const assets = {};
function walk(dir, base = join(root, 'dist'), prefix = '') {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path, base, prefix);
        else {
            const extension = '.' + entry.name.split('.').at(-1);
            if (!mime[extension]) continue;
            assets['/' + prefix + relative(base, path).replaceAll('\\', '/')] = { type: mime[extension], ...(extension === '.png' ? { base64: readFileSync(path).toString('base64') } : { text: readFileSync(path, 'utf8') }) };
        }
    }
}
walk(join(root, 'dist'));
try { walk(join(directory, 'preview-dist'), join(directory, 'preview-dist'), '__preview/'); } catch { /* The visual fixture is optional. */ }
if (!assets['/index.html']) throw Error('Run npm run build before this command');
writeFileSync(join(directory, 'assets.json'), JSON.stringify(assets));
writeFileSync(join(directory, 'worker.mjs'), `import api from '../../server/cloudflare-worker.js';
export * from '../../server/cloudflare-worker.js';
import assets from './assets.json' with {type:'json'};
export default {
    queue: api.queue,
    async fetch(request, env) {
        const path = new URL(request.url).pathname;
        if(path.startsWith('/api/')) return api.fetch(request, env);
        if(!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405});
        const file=assets[path] || (['/__preview','/__preview/'].includes(path) ? assets['/__preview/index.html'] : null) || (request.headers.get('accept')?.includes('text/html') ? assets['/index.html'] : null);
        if(!file)return new Response(null,{status:404});
        const bytes=file.text ?? Uint8Array.from(atob(file.base64),c=>c.charCodeAt(0));
        return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':file.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','X-Socialchoice-Environment':'staging'}});
    }
};
`);
const config = { name: 'socialchoice-autopilot-staging', main: 'worker.mjs', compatibility_date: '2026-10-06', compatibility_flags: ['nodejs_compat'], durable_objects: { bindings: [{ name: 'WORKSPACE', class_name: 'SocialchoiceWorkspace' }, { name: 'AI_EGRESS', class_name: 'SocialchoiceAiEgress' }] }, migrations: [{ tag: 'autopilot-staging-v1', new_sqlite_classes: ['SocialchoiceWorkspace', 'SocialchoiceAiEgress'] }] };
writeFileSync(join(directory, 'wrangler.json'), JSON.stringify(config, null, 2));
const build = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--dry-run', '--config', join(directory, 'wrangler.json'), '--outdir', join(directory, 'bundle')], { cwd: root, encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
if (build.status) throw Error(build.stderr);
const script = readFileSync(join(directory, 'bundle/worker.js'));
writeFileSync(join(directory, 'worker.gz.b64'), gzipSync(script).toString('base64'));
const secretsFile = join(directory, 'secrets.json');
let secrets;
try { secrets=JSON.parse(readFileSync(secretsFile)); }
catch {
    const password=randomBytes(24).toString('base64url'), salt=randomBytes(16).toString('hex');
    secrets={ password, passwordHash:salt+':'+scryptSync(password,salt,64).toString('hex'), storageKey:randomBytes(32).toString('hex') };
    writeFileSync(secretsFile,JSON.stringify(secrets),{mode:0o600});
}
console.log(JSON.stringify({scriptBytes:script.length,gzipBase64Bytes:readFileSync(join(directory,'worker.gz.b64')).length,sha256:createHash('sha256').update(script).digest('hex'),output:directory}));
