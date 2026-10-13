import { fail } from './validation.js';

// Parse bounded MP4 atoms; file bytes remain in chunk storage, not one large buffer.
export function inspectMp4(read, size) {
    let offset=0, movie, hasData=false, hasFormat=false;
    while(offset<size) {
        if (offset+8>size) fail('Choose a complete MP4/H.264 video');
        const head=read(offset,Math.min(offset+16,size));
        let length=head.readUInt32BE(0), header=8;
        const type=head.toString('ascii',4,8);
        if(length===1) { if(head.length<16) fail('Invalid MP4 atom'); length=Number(head.readBigUInt64BE(8)); header=16; }
        if(length===0) length=size-offset;
        if(!Number.isSafeInteger(length)||length<header||offset+length>size) fail('Choose a complete MP4/H.264 video');
        if(type==='ftyp') { if(length<header+4) fail('Invalid MP4 format'); const brand=read(offset+header,offset+header+4).toString('ascii'); hasFormat=['isom','iso2','iso4','iso5','iso6','mp41','mp42','avc1','M4V '].includes(brand); }
        if(type==='mdat') hasData=length>header;
        if(type==='moov') { if(length>1024*1024) fail('Video metadata is too large'); movie=read(offset+header,offset+length); }
        offset+=length;
    }
    if(!hasFormat||!hasData||!movie) fail('Choose a complete MP4/H.264 video');
    let width, height, duration;
    function atoms(buffer,depth=0) {
        if(depth>8) fail('Invalid MP4 metadata');
        for(let position=0;position<buffer.length;) {
            if(position+8>buffer.length) fail('Invalid MP4 metadata');
            const length=buffer.readUInt32BE(position),type=buffer.toString('ascii',position+4,position+8);
            if(length<8||position+length>buffer.length) fail('Invalid MP4 metadata');
            const body=buffer.subarray(position+8,position+length);
            if(['trak','mdia','minf','stbl'].includes(type)) atoms(body,depth+1);
            if(type==='stsd') { if(body.length<8) fail('Invalid MP4 metadata'); atoms(body.subarray(8),depth+1); }
            if(['avc1','avc3'].includes(type)&&body.length>=78) { width=body.readUInt16BE(24); height=body.readUInt16BE(26); }
            if(type==='mvhd') {
                if(body[0]===0&&body.length>=20) { const scale=body.readUInt32BE(12); duration=scale ? body.readUInt32BE(16)/scale : undefined; }
                else if(body[0]===1&&body.length>=32) { const scale=body.readUInt32BE(20); duration=scale ? Number(body.readBigUInt64BE(24))/scale : undefined; }
            }
            position+=length;
        }
    }
    atoms(movie);
    if(!width||!height||!Number.isFinite(duration)||duration<=0) fail('Choose an MP4 video encoded with H.264');
    return {width,height,duration_seconds:duration};
}
