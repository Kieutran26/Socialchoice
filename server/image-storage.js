import { randomUUID, createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { fail } from './validation.js';

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_STORAGE_BYTES = 200 * 1024 * 1024;
export const CHUNK_BYTES = 256 * 1024;

export function validateImage(bytes, type) {
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) fail('Images must be at most 3 MiB', 413);
    let width, height;
    if (type === 'image/png' && bytes.length >= 45 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.toString('ascii',12,16) === 'IHDR' && bytes.toString('ascii',bytes.length-8,bytes.length-4) === 'IEND') {
        width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20);
    } else if (type === 'image/jpeg' && bytes.length > 10 && bytes[0] === 255 && bytes[1] === 216 && bytes[bytes.length-2] === 255 && bytes[bytes.length-1] === 217) {
        let offset = 2;
        while (offset + 4 < bytes.length) {
            if (bytes[offset++] !== 255) break;
            while (bytes[offset] === 255) offset++;
            const marker = bytes[offset++];
            if (marker === 0xda || marker === 0xd9) break;
            if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) continue;
            if (offset + 2 > bytes.length) break;
            const length = bytes.readUInt16BE(offset);
            if (length < 2 || offset + length > bytes.length) break;
            if ([0xc0,0xc1,0xc2].includes(marker) && length >= 8) { height = bytes.readUInt16BE(offset+3); width = bytes.readUInt16BE(offset+5); break; }
            offset += length;
        }
    } else if (type === 'image/webp' && bytes.length >= 30 && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP' && bytes.readUInt32LE(4)+8 === bytes.length) {
        const format = bytes.toString('ascii',12,16);
        if (format === 'VP8X' && !(bytes[20] & 2)) { width = bytes.readUIntLE(24,3)+1; height = bytes.readUIntLE(27,3)+1; }
        else if (format === 'VP8 ' && bytes.subarray(23,26).equals(Buffer.from([157,1,42]))) { width = bytes.readUInt16LE(26)&16383; height = bytes.readUInt16LE(28)&16383; }
        else if (format === 'VP8L' && bytes[20] === 47) { const bits = bytes.readUInt32LE(21); width = (bits&16383)+1; height = ((bits>>>14)&16383)+1; }
    }
    if (!width || !height || width * height > 40000000) fail('Choose a valid JPEG, PNG or still WebP image under 40 megapixels');
    return { width, height };
}

export function createImageStorage(db, store) {
    db.exec('CREATE TABLE IF NOT EXISTS image_chunks (asset_id TEXT NOT NULL, part INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(asset_id,part));');
    return {
        has: id => !!db.prepare('SELECT part FROM image_chunks WHERE asset_id=? LIMIT 1').get(id),
        upload(brandId, name, type, bytes) {
            const brand = store.get('Brand', brandId);
            if (brand.is_demo || brand.status !== 'active') fail('Choose an active live brand', 409);
            if (typeof name !== 'string' || !name.trim() || name.length > 200 || /[\x00-\x1f]/.test(name)) fail('Valid image filename required');
            const dimensions = validateImage(bytes, type);
            return store.transaction(() => {
                const reserved = store.videos?.reservedBytes() || 0;
                const used = db.prepare('SELECT COALESCE(SUM(length(data)),0) AS used FROM image_chunks').get().used;
                if (used + reserved + Math.ceil(bytes.length/3)*4 > MAX_STORAGE_BYTES) fail('Image storage is full. Remove unused images before uploading.', 409);
                const storageId = randomUUID();
                const asset = store.imageWrite({ brand_id: brandId, name, filename: name, file_type: 'image', mime_type: type, size_bytes: bytes.length, width: dimensions.width, height: dimensions.height, storage_id: storageId, sha256: createHash('sha256').update(bytes).digest('hex'), file_url: `/api/media/files/${storageId}`, is_demo: false });
                for (let offset=0, part=0; offset<bytes.length; offset+=CHUNK_BYTES, part++) db.prepare('INSERT INTO image_chunks VALUES (?,?,?)').run(storageId, part, bytes.subarray(offset,offset+CHUNK_BYTES).toString('base64'));
                return asset;
            });
        },
        read(id) {
            const parts = db.prepare('SELECT data FROM image_chunks WHERE asset_id=? ORDER BY part').all(id);
            if (!parts.length) fail('Stored image not found', 404);
            return Buffer.concat(parts.map(part => Buffer.from(part.data,'base64')));
        },
        readSlice(id, start, end) {
            if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start || end-start > 8*1024*1024) fail('Invalid media byte range');
            const first = Math.floor(start/CHUNK_BYTES), last = Math.floor((end-1)/CHUNK_BYTES);
            const rows = db.prepare('SELECT part,data FROM image_chunks WHERE asset_id=? AND part>=? AND part<=? ORDER BY part').all(id,first,last);
            if (rows.length !== last-first+1) fail('Stored media chunk is missing',409);
            const bytes = Buffer.concat(rows.map(row => Buffer.from(row.data,'base64')));
            const result = bytes.subarray(start-first*CHUNK_BYTES, end-first*CHUNK_BYTES);
            if (result.length !== end-start) fail('Stored media chunk is incomplete',409);
            return result;
        },
        remove: id => db.prepare('DELETE FROM image_chunks WHERE asset_id=?').run(id),
    };
}
