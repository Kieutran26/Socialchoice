import { randomUUID, createHash } from 'node:crypto';
import { CHUNK_BYTES, MAX_STORAGE_BYTES } from './image-storage.js';
import { inspectMp4 } from './mp4-validation.js';
import { fail } from './validation.js';

export const MAX_VIDEO_BYTES=100*1000*1000;
export const VIDEO_UPLOAD_CHUNK=1024*1024;
const encoded = size => Math.ceil(size/3)*4 + Math.ceil(size/CHUNK_BYTES)*4;

export function createVideoStorage(db,store) {
    db.exec('CREATE TABLE IF NOT EXISTS video_uploads (id TEXT PRIMARY KEY,data TEXT NOT NULL);');
    const save = value => db.prepare('INSERT INTO video_uploads VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(value.id,JSON.stringify(value));
    function cleanup() {
        for(const row of db.prepare('SELECT id,data FROM video_uploads').all()) {
            const value=JSON.parse(row.data);
            if(value.expiresAt<Date.now()) store.transaction(()=>{ if(!value.assetId) store.images.remove(value.id); db.prepare('DELETE FROM video_uploads WHERE id=?').run(value.id); });
        }
    }
    function get(id) { cleanup(); const row=db.prepare('SELECT data FROM video_uploads WHERE id=?').get(id); if(!row) fail('Video upload expired or not found',404); return JSON.parse(row.data); }
    const summary = value => ({uploadId:value.id,received:value.received,size:value.size,...(value.assetId?{asset:store.get('MediaAsset',value.assetId)}:{})});
    const storage = {
        reservedBytes() { cleanup(); return db.prepare('SELECT data FROM video_uploads').all().map(row=>JSON.parse(row.data)).filter(value=>!value.assetId).reduce((total,value)=>total+Math.max(0,encoded(value.size)-encoded(value.received)),0); },
        start(input) {
            if(!input || typeof input!=='object' || Array.isArray(input)) fail('Invalid video upload request');
            const {brandId,name,size,type}=input;
            const brand=store.get('Brand',brandId);
            if(brand.is_demo||brand.status!=='active') fail('Choose an active live brand',409);
            if(type!=='video/mp4'||typeof name!=='string'||!name.trim()||name.length>200||/[\x00-\x1f]/.test(name)||!Number.isSafeInteger(size)||size<32||size>MAX_VIDEO_BYTES) fail('Choose an MP4 video up to 100 MB');
            return store.transaction(()=>{
                const reserved=storage.reservedBytes();
                const used=db.prepare('SELECT COALESCE(SUM(length(data)),0) AS used FROM image_chunks').get().used;
                if(used+reserved+encoded(size)>MAX_STORAGE_BYTES) fail('Media storage is full. Remove unused media before uploading.',409);
                const value={id:randomUUID(),brandId,name,size,received:0,expiresAt:Date.now()+3600000};save(value);return summary(value);
            });
        },
        status: id => summary(get(id)),
        append(id,offset,bytes) {
            return store.transaction(()=>{
                const value=get(id);
                if(!Number.isSafeInteger(offset)||offset<0||offset%VIDEO_UPLOAD_CHUNK!==0||bytes.length!==Math.min(VIDEO_UPLOAD_CHUNK,value.size-offset)||!bytes.length) fail('Invalid video upload chunk');
                if(offset<value.received) {
                    if(!store.images.readSlice(id,offset,offset+bytes.length).equals(bytes)) fail('Video upload chunk differs from stored bytes',409);
                    return summary(value);
                }
                if(value.assetId||offset!==value.received) fail('Video upload offset mismatch',409);
                for(let position=0;position<bytes.length;position+=CHUNK_BYTES) db.prepare('INSERT INTO image_chunks VALUES (?,?,?)').run(id,(offset+position)/CHUNK_BYTES,bytes.subarray(position,position+CHUNK_BYTES).toString('base64'));
                value.received+=bytes.length; value.expiresAt=Date.now()+3600000;save(value);return summary(value);
            });
        },
        complete(id) {
            return store.transaction(()=>{
                const value=get(id);if(value.assetId) return summary(value).asset;
                if(value.received!==value.size) fail('Video upload is incomplete',409);
                const read=(start,end)=>store.images.readSlice(id,start,end);
                const metadata=inspectMp4(read,value.size);
                const hash=createHash('sha256');for(let start=0;start<value.size;start+=VIDEO_UPLOAD_CHUNK) hash.update(read(start,Math.min(value.size,start+VIDEO_UPLOAD_CHUNK)));
                const brand=store.get('Brand',value.brandId);if(brand.is_demo||brand.status!=='active') fail('Choose an active live brand',409);
                const asset=store.imageWrite({brand_id:value.brandId,name:value.name,filename:value.name,file_type:'video',mime_type:'video/mp4',size_bytes:value.size,storage_id:id,sha256:hash.digest('hex'),file_url:`/api/media/files/${id}`,is_demo:false,...metadata});
                value.assetId=asset.id;save(value);return asset;
            });
        },
        cancel(id) { const value=get(id); if(value.assetId) fail('Completed media must be removed from the library',409); return store.transaction(()=>{store.images.remove(id);db.prepare('DELETE FROM video_uploads WHERE id=?').run(id);return {cancelled:true};}); },
    };
    return storage;
}
