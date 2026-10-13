import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createStore } from './store.js';
import { createMetaVault } from './meta-vault.js';
import { createFacebookPublisher } from './facebook-publisher.js';
import { savePostPlan } from './post-plans.js';

function fixture(dbPath = ':memory:') {
 const store=createStore(dbPath),config={ready:true,key:randomBytes(32).toString('hex'),appSecret:'test-only',version:'v26.0'};
 const brand=store.write('Brand',{name:'Scheduling fixture'}),scopes=['pages_manage_posts'];
 createMetaVault(store,config.key).save('schedule-fixture',{token:'not-a-Meta-token',scopes,tasks:['CREATE_CONTENT']});
 const account=store.verifiedAccount({name:'Fixture Page',external_id:'123456',platform:'facebook',account_type:'page',brand_id:brand.id,scopes,credential_id:'schedule-fixture',connection_status:'connected'});
 const post=store.write('Post',{title:'Scheduled fixture',caption:'Nội dung lịch được duyệt',brand_id:brand.id,account_ids:[account.id],timezone:'Asia/Ho_Chi_Minh'}),wakes=[];
 const publisher=createFacebookPublisher(store,config,{wake:async time=>{wakes.push(time);}});
 return {store,post,account,publisher,wakes};
}

test('review alone does not enqueue; approval locks exact snapshot and early delivery cannot start',async()=>{
 const {store,post,publisher,wakes}=fixture();try{
 const time=new Date(Date.now()+600000).toISOString(),review=publisher.prepareSchedule(post.id,time);
 assert.equal(store.queuedAttempts().length,0);assert.equal(store.get('Post',post.id).status,'draft');
 await assert.rejects(()=>publisher.publish(review.attemptId),/automatic schedule/);
 const result=await publisher.schedule(review.attemptId);assert.equal(result.status,'queued');assert.equal(result.scheduledFor,Date.parse(time));
 assert.equal(store.get('Post',post.id).status,'scheduled');assert.equal(store.all('PublishJob')[0].attempts,0);
 assert.throws(()=>store.write('Post',{caption:'Unapproved change'},post.id),/automatic schedule/);
 await assert.rejects(()=>publisher.publish(result.attemptId),/has not arrived/);
 await publisher.runDue();assert.equal(store.pendingAttempts().length,0);assert.ok(wakes.length);
 assert.equal((await publisher.schedule(review.attemptId)).status,'queued');assert.equal(store.all('PublishJob').length,1);
 }finally{publisher.close();store.close();}
});

test('cancel before claim restores editable draft and repeated wake cannot execute cancelled content',async()=>{
 const {store,post,publisher}=fixture();try{
 const review=publisher.prepareSchedule(post.id,new Date(Date.now()+600000).toISOString());await publisher.schedule(review.attemptId);
 await publisher.cancelSchedule(post.id);assert.equal(store.get('Post',post.id).status,'draft');assert.equal(store.queuedAttempts().length,0);
 store.write('Post',{caption:'New caption'},post.id);await publisher.runDue();assert.equal(store.pendingAttempts().length,0);
 await assert.rejects(()=>publisher.cancelSchedule(post.id),/unstarted/);
 const next=publisher.prepareSchedule(post.id,new Date(Date.now()+700000).toISOString());assert.equal(next.caption,'New caption');
 }finally{publisher.close();store.close();}
});

test('legacy calendar plans never auto-enqueue and missed approvals fail without remote I/O',async()=>{
 const {store,post,publisher}=fixture();try{
 savePostPlan(store,{id:post.id,data:{status:'scheduled',scheduled_at:new Date(Date.now()+600000).toISOString()}});assert.equal(store.queuedAttempts().length,0);
 store.write('Post',{status:'draft'},post.id);const review=publisher.prepareSchedule(post.id,new Date(Date.now()+600000).toISOString());await publisher.schedule(review.attemptId);
 const queued=store.attempt(review.attemptId);store.saveAttempt({...queued,scheduledFor:Date.now()-16*60000});await publisher.runDue();
 assert.equal(publisher.status(post.id).status,'failed');assert.equal(store.all('PublishJob')[0].attempts,0);assert.equal(store.get('Post',post.id).status,'failed');
 }finally{publisher.close();store.close();}
});

test('permissions are revalidated at due time and repeated runs cannot send a rejected queue item',async()=>{
 const {store,post,account,publisher}=fixture();try{
 const review=publisher.prepareSchedule(post.id,new Date(Date.now()+600000).toISOString());await publisher.schedule(review.attemptId);
 const attempt=store.attempt(review.attemptId);store.saveAttempt({...attempt,scheduledFor:Date.now()-100});
 store.verifiedAccount({connection_status:'disconnected'},account.id);await publisher.runDue();await publisher.runDue();
 assert.equal(publisher.status(post.id).status,'failed');assert.equal(store.pendingAttempts().length,0);assert.equal(store.all('PublishJob')[0].attempts,0);
 }finally{publisher.close();store.close();}
});

test('approved queue persists across restart and startup arms delivery without any browser request',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'schedule-persist-')),path=join(folder,'data.sqlite');
 let store,publisher;try{const setup=fixture(path);store=setup.store;publisher=setup.publisher;
 const review=publisher.prepareSchedule(setup.post.id,new Date(Date.now()+600000).toISOString());await publisher.schedule(review.attemptId);publisher.close();store.close();
 store=createStore(path);const wakes=[];publisher=createFacebookPublisher(store,{ready:false},{wake:async time=>{wakes.push(time);}});
 await publisher.resumePhotos();assert.equal(store.queuedAttempts().length,1);assert.equal(wakes.length,1);assert.equal(publisher.status(setup.post.id).status,'queued');
 await publisher.runPhotos();assert.equal(store.queuedAttempts().length,1);assert.ok(wakes.some(time=>time===review.scheduledFor));
 }finally{publisher?.close();store?.close();rmSync(folder,{recursive:true,force:true});}
});

test('reviewing a legacy plan preserves its date and jobs until approval, including when review fails',async()=>{
 const {store,post,account,publisher}=fixture();try{
 const oldTime=new Date(Date.now()+600000).toISOString(),newTime=new Date(Date.now()+900000).toISOString();
 savePostPlan(store,{id:post.id,data:{status:'scheduled',scheduled_at:oldTime}});
 const before=store.get('Post',post.id),jobs=store.all('PublishJob');
 const review=publisher.prepareSchedule(post.id,newTime,'Asia/Tokyo');
 assert.deepEqual(store.get('Post',post.id),before);assert.deepEqual(store.all('PublishJob'),jobs);assert.equal(store.queuedAttempts().length,0);assert.equal(review.timezone,'Asia/Tokyo');
 assert.equal(publisher.status(post.id).status,'calendar_plan');assert.equal(publisher.status(review.attemptId).status,'prepared');
 store.verifiedAccount({connection_status:'disconnected'},account.id);assert.throws(()=>publisher.prepareSchedule(post.id,newTime),/Connect/);
 assert.deepEqual(store.get('Post',post.id),before);assert.deepEqual(store.all('PublishJob'),jobs);
 store.verifiedAccount({connection_status:'connected'},account.id);await publisher.schedule(review.attemptId);
 assert.equal(store.get('Post',post.id).scheduled_at,newTime);assert.equal(store.get('Post',post.id).timezone,'Asia/Tokyo');assert.equal(store.all('PublishJob').length,1);
 }finally{publisher.close();store.close();}
});

test('photo order and real stored MP4 are frozen in approved schedules without sending media',async()=>{
 for(const kind of ['photos','video']){const {store,post,publisher}=fixture();try{let media;
 if(kind==='photos'){const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=','base64');
 media=[store.images.upload(post.brand_id,'first.png','image/png',bytes),store.images.upload(post.brand_id,'second.png','image/png',bytes)].reverse();}
 else{const bytes=readFileSync(new URL('./fixtures/socialchoice-test-video.mp4',import.meta.url)),upload=store.videos.start({brandId:post.brand_id,name:'test-video.mp4',type:'video/mp4',size:bytes.length});
 for(let offset=0;offset<bytes.length;offset+=1024*1024)store.videos.append(upload.uploadId,offset,bytes.subarray(offset,offset+1024*1024));media=[store.videos.complete(upload.uploadId)];}
 store.write('Post',{media_ids:media.map(asset=>asset.id)},post.id);const review=publisher.prepareSchedule(post.id,new Date(Date.now()+600000).toISOString());
 assert.deepEqual(review.media.map(asset=>asset.id),media.map(asset=>asset.id));await publisher.schedule(review.attemptId);
 assert.deepEqual(store.attempt(review.attemptId).media.map(asset=>asset.id),media.map(asset=>asset.id));assert.equal(store.pendingAttempts().length,0);
 await publisher.cancelSchedule(post.id);assert.equal(store.pendingAttempts().length,0);
 }finally{publisher.close();store.close();}}
});
