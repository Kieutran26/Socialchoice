import { createMetaVault } from './meta-vault.js';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Readable } from 'node:stream';
import { Buffer } from 'node:buffer';
import { fail } from './validation.js';

export const INSTAGRAM_MEDIA_TTL = 60 * 60 * 1000;
export function instagramRange(range, size) {
    if (!range) return { start: 0, end: size, status: 200 };
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || !match[1] && !match[2]) fail('Invalid media byte range',416);
    const start = match[1] ? Number(match[1]) : Math.max(0,size-Number(match[2]));
    const end = match[1] && match[2] ? Math.min(size,Number(match[2])+1) : size;
    if (!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=end||start>=size) fail('Invalid media byte range',416);
    return { start,end,status:206 };
}
export function createInstagramMediaAccess(store,config,threadsConfig={},tiktokConfig={}) {
    function origin(platform) {
        let value;try {value=new URL((platform==='tiktok'?tiktokConfig:platform==='threads'?threadsConfig:config).mediaOrigin);} catch {fail('Configure a public HTTPS backend origin for Instagram media',409);}
        if(value.protocol!=='https:'||value.username||value.password||value.pathname!=='/'||value.search||value.hash) fail('Configure a public HTTPS backend origin for Instagram media',409);
        return value.origin;
    }
    const sign=(attempt,asset,expires)=>createHmac('sha256',Buffer.from((attempt.platform==='tiktok'?tiktokConfig:attempt.platform==='threads'?threadsConfig:config).key,'hex')).update(JSON.stringify([attempt.platform==='tiktok'?'tiktok-media-v1':attempt.platform==='threads'?'threads-media-v1':'instagram-media-v1',attempt.id,attempt.credentialId,asset.id,asset.storage_id,asset.sha256,expires])).digest('hex');
    return {
        url(attempt,asset) {
            const expires=Date.now()+INSTAGRAM_MEDIA_TTL;
            const prefix = (attempt.platform === 'tiktok' ? tiktokConfig : attempt.platform === 'threads' ? threadsConfig : config).mediaPathPrefix || '';
            if (prefix && !/^\/api\/workspaces\/[a-f0-9-]{36}$/.test(prefix)) fail('Invalid media workspace path', 409);
            return `${origin(attempt.platform)}${prefix}/api/instagram-media/${attempt.id}/${asset.id}?expires=${expires}&signature=${sign(attempt,asset,expires)}`;
        },
        serve(req,res) {
            const url=new URL(req.url,'https://local.invalid');
            const match=/^\/api\/instagram-media\/([a-f0-9-]{36})\/([a-f0-9-]{36})$/.exec(url.pathname);
            if(!match) return false;
            if(!['GET','HEAD'].includes(req.method)) fail('Media fetch requires GET or HEAD',405);
            const expires=Number(url.searchParams.get('expires')),signature=url.searchParams.get('signature');
            if(!Number.isSafeInteger(expires)||expires<=Date.now()||expires>Date.now()+INSTAGRAM_MEDIA_TTL||! /^[a-f0-9]{64}$/.test(signature||'')) fail('Media capability expired or invalid',403);
            const attempt=store.attempt(match[1]);
            if(!(attempt.platform==='tiktok'?tiktokConfig.ready:attempt.platform==='threads'?threadsConfig.ready:config.ready)||!['instagram','threads','tiktok'].includes(attempt.platform)||attempt.status!=='processing') fail('Media capability is no longer active',403);
            const asset=attempt.media?.find(value=>value.id===match[2]);
            if(!asset||!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(sign(attempt,asset,expires),'hex'))) fail('Media capability invalid',403);
            const account=store.get('SocialAccount',attempt.accountId),current=store.get('MediaAsset',asset.id);
            if(account.platform!==attempt.platform||account.external_id!==attempt.pageId||account.credential_id!==attempt.credentialId||account.connection_status!=='connected'||!store.readCredential(attempt.credentialId)||JSON.stringify(current)!==JSON.stringify(asset)) fail('Media authorization changed',403);
            if(attempt.platform==='tiktok') {
                const credential=createMetaVault(store,tiktokConfig.key).read(attempt.credentialId);
                if(credential.platform!=='tiktok'||credential.profileId!==attempt.pageId||credential.refreshing||credential.expiresAt<=Date.now()||!['user.info.basic','video.publish'].every(s=>credential.scopes?.includes(s)&&account.scopes?.includes(s)))fail('Media authorization changed',403);
            }
            if(attempt.platform==='threads') {
                const credential=createMetaVault(store,threadsConfig.key).read(attempt.credentialId);
                if(credential.platform!=='threads'||credential.profileId!==attempt.pageId||!Number.isFinite(credential.expiresAt)||credential.expiresAt<=Date.now()||!['threads_basic','threads_content_publish'].every(scope=>account.scopes?.includes(scope)&&credential.scopes?.includes(scope)))fail('Media authorization changed',403);
            }
            const {start,end,status}=instagramRange(req.headers.range,asset.size_bytes);
            res.writeHead(status,{'Content-Type':asset.mime_type,'Content-Length':String(end-start),'Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",...(status===206?{'Content-Range':`bytes ${start}-${end-1}/${asset.size_bytes}`}:{})});
            if(req.method==='HEAD') {res.end();return true;}
            // Bound each storage read, while preserving the requested HTTP range exactly.
            function* chunks() {for(let offset=start;offset<end;offset+=1024*1024) yield store.images.readSlice(asset.storage_id,offset,Math.min(end,offset+1024*1024));}
            if(res.stream) res.stream(chunks());
            else Readable.from(chunks()).on('error',error=>res.destroy(error)).pipe(res);
            return true;
        },
    };
}
