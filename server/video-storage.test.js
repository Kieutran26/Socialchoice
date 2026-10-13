import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { createApi } from './index.js';
import { hashPassword } from './admin-auth.js';
import { randomBytes } from 'node:crypto';
import { createStore } from './store.js';
import { createMetaVault } from './meta-vault.js';
import { createFacebookPublisher } from './facebook-publisher.js';
import { videoOffsets, definitiveVideoRejection } from './facebook-video-delivery.js';
import { serveMedia } from './media-http.js';

// Structural-only storage fixture. This is not a decoded video or Meta acknowledgement.
function atom(type,body) { const head=Buffer.alloc(8);head.writeUInt32BE(body.length+8);head.write(type,4);return Buffer.concat([head,body]); }
export function mp4Fixture() {
 const mvhd=Buffer.alloc(100);mvhd.writeUInt32BE(1000,12);mvhd.writeUInt32BE(3000,16);
 const avc=Buffer.alloc(78);avc.writeUInt16BE(640,24);avc.writeUInt16BE(360,26);
 const stsd=Buffer.alloc(8);stsd.writeUInt32BE(1,4);
 const sample=atom('stsd',Buffer.concat([stsd,atom('avc1',avc)]));
 const track=atom('trak',atom('mdia',atom('minf',atom('stbl',sample))));
 return Buffer.concat([atom('ftyp',Buffer.from('isom0000')),atom('mdat',Buffer.alloc(1024*1024+51)),atom('moov',Buffer.concat([atom('mvhd',mvhd),track]))]);
}
function storedVideo(store,brandId) {const bytes=mp4Fixture(),session=store.videos.start({brandId,name:'structure-only.mp4',type:'video/mp4',size:bytes.length});for(let offset=0;offset<bytes.length;offset+=1024*1024)store.videos.append(session.uploadId,offset,bytes.subarray(offset,offset+1024*1024));return {bytes,session,asset:store.videos.complete(session.uploadId)};}

test('private video chunks are ordered, replay-safe, validated and finalized once',()=>{
 const store=createStore(':memory:');try {
 const brand=store.write('Brand',{name:'Video storage fixture'}),bytes=mp4Fixture();
 assert.throws(()=>store.videos.start(),/Invalid video/);
 assert.throws(()=>store.videos.start({brandId:brand.id,name:'too-large.mp4',type:'video/mp4',size:100*1000*1000+1}),/100 MB/);
 const session=store.videos.start({brandId:brand.id,name:'structure-only.mp4',type:'video/mp4',size:bytes.length});
 assert.throws(()=>store.videos.complete(session.uploadId),/incomplete/);
 assert.throws(()=>store.videos.append(session.uploadId,1024*1024,bytes.subarray(1024*1024)),/offset mismatch/);
 store.videos.append(session.uploadId,0,bytes.subarray(0,1024*1024));
 assert.equal(store.videos.append(session.uploadId,0,bytes.subarray(0,1024*1024)).received,1024*1024);
 assert.throws(()=>store.videos.append(session.uploadId,0,Buffer.alloc(1024*1024)),/differs/);
 store.videos.append(session.uploadId,1024*1024,bytes.subarray(1024*1024));
 const asset=store.videos.complete(session.uploadId);assert.equal(asset.duration_seconds,3);assert.equal(asset.width,640);assert.equal(asset.file_type,'video');
 assert.equal(store.videos.complete(session.uploadId).id,asset.id);assert.equal(store.all('MediaAsset').length,1);
 assert.deepEqual(store.images.readSlice(asset.storage_id,250000,270000),bytes.subarray(250000,270000));
 const post=store.write('Post',{title:'Immutable media fixture',brand_id:brand.id,media_ids:[asset.id]});
 assert.throws(()=>store.remove('MediaAsset',asset.id),/history/);store.remove('Post',post.id);store.remove('MediaAsset',asset.id);assert.equal(store.images.has(asset.storage_id),false);
 }finally{store.close();}
});

test('video byte ranges are bounded and exact; malformed MP4 never becomes an asset',()=>{
 const store=createStore(':memory:');try{
 const brand=store.write('Brand',{name:'Range fixture'}),{asset,bytes}=storedVideo(store,brand.id);
 let code,headers,body;serveMedia({headers:{range:'bytes=260000-270000'}},{writeHead:(c,h)=>{code=c;headers=h;},end:b=>{body=b;}},store,asset);
 assert.equal(code,206);assert.equal(headers['Content-Range'],`bytes 260000-270000/${bytes.length}`);assert.deepEqual(body,bytes.subarray(260000,270001));
 assert.throws(()=>serveMedia({headers:{range:'bytes=99999999-'}},{},store,asset),/byte range/);
 const invalid=Buffer.alloc(32),session=store.videos.start({brandId:brand.id,name:'bad.mp4',type:'video/mp4',size:32});store.videos.append(session.uploadId,0,invalid);assert.throws(()=>store.videos.complete(session.uploadId),/MP4/);store.videos.cancel(session.uploadId);
 }finally{store.close();}
});

test('video review forbids mixed media and uncertain claimed writes are never resent',async()=>{
 const store=createStore(':memory:');try{
 const brand=store.write('Brand',{name:'Video approval fixture'}),{asset}=storedVideo(store,brand.id),scopes=['pages_manage_posts'];
 const config={ready:true,key:randomBytes(32).toString('hex'),version:'v26.0',appSecret:'test-only'};
 createMetaVault(store,config.key).save('unit-video-token',{token:'not-a-live-token',scopes,tasks:['CREATE_CONTENT']});
 const account=store.verifiedAccount({name:'Fixture',brand_id:brand.id,external_id:'123456',platform:'facebook',account_type:'page',connection_status:'connected',credential_id:'unit-video-token',scopes});
 const post=store.write('Post',{title:'Video fixture',caption:'Exact caption',brand_id:brand.id,account_ids:[account.id],media_ids:[asset.id]});
 const publisher=createFacebookPublisher(store,config,{wake:async()=>{}});
 const second=storedVideo(store,brand.id).asset;store.write('Post',{media_ids:[asset.id,second.id]},post.id);assert.throws(()=>publisher.prepare(post.id),/one video/);store.write('Post',{media_ids:[asset.id]},post.id);
 const review=publisher.prepare(post.id);assert.equal(review.media[0].file_type,'video');
 await publisher.publish(review.attemptId);store.saveAttempt({...store.attempt(review.attemptId),busy:true,videoStage:'transfer',startedAt:0});
 await publisher.runPhotos();assert.equal(publisher.status(review.attemptId).status,'unknown');await publisher.runPhotos();assert.equal(store.all('PublishJob').length,1);assert.equal(store.all('PublishJob')[0].external_post_id,undefined);
 assert.deepEqual(videoOffsets({start_offset:'100',end_offset:'200'},300,100),{start:100,end:200});assert.throws(()=>videoOffsets({start_offset:'0',end_offset:'201'},200,0),/offsets/);
 }finally{store.close();}
});


test('real H.264 MP4 upload and bounded preview require authenticated same-origin requests',async()=>{
 const {server,store}=createApi({dbPath:':memory:',passwordHash:hashPassword('video-test-admin-passphrase')});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}`,bytes=readFileSync(new URL('./fixtures/socialchoice-test-video.mp4',import.meta.url)),brand=store.write('Brand',{name:'Real video fixture'});
 try{
 const login=await fetch(url+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-Socialchoice-Client':'local-ui'},body:JSON.stringify({args:['video-test-admin-passphrase']})}),cookie=login.headers.get('set-cookie').split(';')[0];
 const headers={'Content-Type':'application/json','X-Socialchoice-Client':'local-ui',cookie};
 const start=await fetch(url+'/api/media/videos/start',{method:'POST',headers,body:JSON.stringify({args:[{brandId:brand.id,name:'real-test.mp4',type:'video/mp4',size:bytes.length}]})});assert.equal(start.status,200,await start.clone().text());const session=await start.json();
 const chunkHeaders={...headers,'Content-Type':'application/octet-stream','X-Upload-Offset':'0'};
 assert.equal((await fetch(url+'/api/media/videos/'+session.uploadId+'/chunk',{method:'POST',headers:{...chunkHeaders,'Sec-Fetch-Site':'cross-site'},body:bytes})).status,403);
 assert.equal((await fetch(url+'/api/media/videos/'+session.uploadId+'/chunk',{method:'POST',headers:chunkHeaders,body:bytes})).status,200);
 const complete=await fetch(url+'/api/media/videos/'+session.uploadId+'/complete',{method:'POST',headers,body:JSON.stringify({args:[]})});assert.equal(complete.status,200,await complete.clone().text());const asset=await complete.json();assert.equal(asset.duration_seconds,6);assert.equal(asset.height,360);
 assert.equal((await fetch(url+asset.file_url,{headers:{Range:'bytes=0-'}})).status,401);
 const preview=await fetch(url+asset.file_url,{headers:{cookie,Range:'bytes=0-'}});assert.equal(preview.status,206);assert.equal(preview.headers.get('content-type'),'video/mp4');assert.deepEqual(Buffer.from(await preview.arrayBuffer()),bytes);
 }finally{await new Promise(resolve=>server.close(resolve));}
});


test('upload reservations share the storage quota and cancellation releases it',()=>{
 const store=createStore(':memory:');try{const brand=store.write('Brand',{name:'Quota fixture'}),input={brandId:brand.id,name:'reserved.mp4',type:'video/mp4',size:64*1024*1024};
 const first=store.videos.start(input),second=store.videos.start(input);assert.throws(()=>store.videos.start(input),/storage is full/);store.videos.cancel(first.uploadId);assert.ok(store.videos.start(input).uploadId);store.videos.cancel(second.uploadId);
 }finally{store.close();}
});

test('only known explicit request or permission rejection is definitive',()=>{assert.equal(definitiveVideoRejection({metaCode:100,metaHttpStatus:400}),true);assert.equal(definitiveVideoRejection({metaCode:190,metaHttpStatus:401}),true);assert.equal(definitiveVideoRejection({metaCode:100,metaHttpStatus:500}),false);assert.equal(definitiveVideoRejection({metaHttpStatus:400}),false);});

test('video size limit accepts exactly 100 MB and rejects one byte more',()=>{
 const store=createStore(':memory:');try{const brand=store.write('Brand',{name:'Video boundary'}),input={brandId:brand.id,name:'boundary.mp4',type:'video/mp4',size:100*1000*1000};
 const upload=store.videos.start(input);assert.equal(upload.size,input.size);store.videos.cancel(upload.uploadId);assert.throws(()=>store.videos.start({...input,size:input.size+1}),/100 MB/);
 }finally{store.close();}
});
