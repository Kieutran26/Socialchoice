import { Buffer } from 'node:buffer';
import { fail } from './validation.js';
import { VIDEO_UPLOAD_CHUNK } from './video-storage.js';

export async function videoUploadRequest(req,store,send) {
    const route=req.url.match(/^\/api\/media\/videos\/(start|[a-f0-9-]{36}\/(?:chunk|status|complete|cancel))$/);
    if(!route) return false;
    if(req.method!=='POST') fail('Video upload requires POST',405);
    const chunks=[];let size=0;
    const binary=route[1].endsWith('/chunk');
    if(!req.headers['content-type']?.startsWith(binary?'application/octet-stream':'application/json')) fail('Invalid video upload content type',415);
    for await(const value of req) { const bytes=Buffer.from(value);size+=bytes.length;if(size>(binary?VIDEO_UPLOAD_CHUNK:4096)) fail('Video upload request too large',413);chunks.push(bytes); }
    const [id,operation]=route[1].split('/');
    if(binary) {const raw=req.headers['x-upload-offset'];if(!/^\d+$/.test(raw||'')) fail('Invalid video upload offset');send(200,store.videos.append(id,Number(raw),Buffer.concat(chunks)));}
    else {
        let body;try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{fail('Invalid JSON');}
        if(id==='start') send(200,store.videos.start(body?.args?.[0]));
        else send(200,store.videos[operation](id));
    }
    return true;
}

export function serveMedia(req,res,store,asset) {
    const range=req.headers.range;
    let start=0,end=asset.size_bytes,status=200;
    if(range||asset.file_type==='video') {
        const match=range?.match(/^bytes=(\d*)-(\d*)$/);
        if(!match||!match[1]&&!match[2]) fail('A valid media byte range is required',416);
        start=match[1]?Number(match[1]):Math.max(0,asset.size_bytes-Number(match[2]));
        end=match[1]&&match[2]?Math.min(asset.size_bytes,Number(match[2])+1):asset.size_bytes;
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=end||start>=asset.size_bytes) fail('Invalid media byte range',416);
        end=Math.min(end,start+VIDEO_UPLOAD_CHUNK);status=206;
    }
    const bytes=store.images.readSlice(asset.storage_id,start,end);
    res.writeHead(status,{'Content-Type':asset.mime_type,'Content-Length':String(bytes.length),'Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",...(status===206?{'Content-Range':`bytes ${start}-${end-1}/${asset.size_bytes}`}:{})});
    res.end(bytes);
}
