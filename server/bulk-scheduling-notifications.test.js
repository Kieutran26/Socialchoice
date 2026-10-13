import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from './store.js';
import { createMetaVault } from './meta-vault.js';
import { createFacebookPublisher } from './facebook-publisher.js';
import { createPublishingNotifications } from './publishing-notifications.js';

function fixture(path=':memory:') {
 const store=createStore(path),config={ready:true,key:randomBytes(32).toString('hex'),appSecret:'test-only',version:'v26.0'};
 const brand=store.write('Brand',{name:'Batch fixture'}),scopes=['pages_manage_posts'];
 createMetaVault(store,config.key).save('batch-fixture',{token:'not-a-Meta-token',scopes,tasks:['CREATE_CONTENT']});
 const account=store.verifiedAccount({name:'Fixture Page',external_id:'123456',platform:'facebook',account_type:'page',brand_id:brand.id,scopes,credential_id:'batch-fixture',connection_status:'connected'});
 const posts=[1,2].map(index=>store.write('Post',{title:'Draft '+index,caption:'Nội dung '+index,brand_id:brand.id,account_ids:[account.id],timezone:'Asia/Ho_Chi_Minh'}));
 const publisher=createFacebookPublisher(store,config,{wake:async()=>{}}),entries=posts.map((post,index)=>({postId:post.id,time:new Date(Date.now()+(index+1)*3600000).toISOString(),timezone:'Asia/Ho_Chi_Minh'}));
 return {store,publisher,posts,entries,account};
}

test('batch review is nonpublishing, bounded and rolls back every prepared item on invalid input',()=>{
 const {store,publisher,posts,entries}=fixture();try{
 assert.throws(()=>publisher.prepareBatch([entries[0],{...entries[1],time:'invalid'}]),/future/);assert.equal(store.attemptForPost(posts[0].id),null);
 assert.throws(()=>publisher.prepareBatch([entries[0],entries[0]]),/different/);
 assert.throws(()=>publisher.prepareBatch(Array(51).fill(entries[0])),/different/);
 const review=publisher.prepareBatch(entries);assert.equal(review.items.length,2);assert.equal(store.queuedAttempts().length,0);assert.equal(store.all('PublishJob').length,0);
 assert.deepEqual(review.items.map(item=>item.caption),posts.map(post=>post.caption));assert.equal(JSON.stringify(review).includes('not-a-Meta-token'),false);
 }finally{publisher.close();store.close();}
});

test('changed second item rolls back first queue claim; confirmation expiry never enqueues',async()=>{
 const {store,publisher,posts,entries}=fixture();try{
 const review=publisher.prepareBatch(entries);store.write('Post',{caption:'Changed after review'},posts[1].id);
 await assert.rejects(()=>publisher.confirmBatch(review.batchId),/changed/);assert.equal(store.queuedAttempts().length,0);assert.equal(store.all('PublishJob').length,0);assert.equal(store.get('Post',posts[0].id).status,'draft');
 const replacement=publisher.prepareBatch(entries);store.saveScheduleBatch({...store.scheduleBatch(replacement.batchId),expiresAt:0});
 await assert.rejects(()=>publisher.confirmBatch(replacement.batchId),/expired/);assert.equal(store.queuedAttempts().length,0);
 }finally{publisher.close();store.close();}
});

test('confirmed batch replay cannot duplicate claims or revive a subsequently cancelled schedule',async()=>{
 const {store,publisher,posts,entries}=fixture();try{
 const review=publisher.prepareBatch(entries);assert.equal((await publisher.confirmBatch(review.batchId)).status,'confirmed');
 await publisher.confirmBatch(review.batchId);assert.equal(store.queuedAttempts().length,2);assert.equal(store.all('PublishJob').length,2);
 assert.throws(()=>publisher.prepareBatch(entries),/live drafts/);
 await publisher.cancelSchedule(posts[0].id);await publisher.confirmBatch(review.batchId);assert.equal(store.queuedAttempts().length,1);assert.equal(store.get('Post',posts[0].id).status,'draft');
 }finally{publisher.close();store.close();}
});

test('actual preflight failure emits one durable notification and ack survives restart',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'notification-persist-')),path=join(folder,'data.sqlite');let store,publisher;
 try{const setup=fixture(path);store=setup.store;publisher=setup.publisher;const review=publisher.prepareBatch(setup.entries);await publisher.confirmBatch(review.batchId);
 const first=store.attempt(review.items[0].attemptId);store.saveAttempt({...first,scheduledFor:Date.now()-100});store.verifiedAccount({connection_status:'disconnected'},setup.account.id);await publisher.runDue();await publisher.runDue();
 let notices=createPublishingNotifications(store);const list=notices.list();assert.equal(list.items.length,1);assert.equal(list.unread,1);assert.equal(list.items[0].status,'failed');assert.equal(list.items[0].postId,setup.posts[0].id);assert.equal(JSON.stringify(list).includes('not-a-Meta-token'),false);
 assert.throws(()=>notices.read(['forged-id']),/not found/);notices.read([list.items[0].id]);assert.equal(notices.list().unread,0);
 publisher.close();store.close();store=createStore(path);notices=createPublishingNotifications(store);assert.equal(notices.list().items.length,1);assert.equal(notices.list().unread,0);assert.equal(notices.readAll().unread,0);
 }finally{publisher?.close();store?.close();rmSync(folder,{recursive:true,force:true});}
});

test('notifications derive only from private failed attempts, not editable log entries',()=>{
 const {store,publisher,posts}=fixture();try{
 store.write('PublishingLog',{post_id:posts[0].id,level:'error',message:'User entered log',occurred_at:new Date().toISOString()});
 assert.equal(createPublishingNotifications(store).list().items.length,0);assert.throws(()=>store.execute('ScheduleBatch','list',[]),/server-only/);assert.throws(()=>store.execute('NotificationRead','list',[]),/server-only/);
 }finally{publisher.close();store.close();}
});

test('interrupted text claim produces an unconfirmed warning, never a success or resend',async()=>{
 const {store,publisher,posts,entries}=fixture();try{
 const review=publisher.prepareBatch(entries);await publisher.confirmBatch(review.batchId);const queued=store.attempt(review.items[0].attemptId);
 // Persist the checkpoint an interrupted worker would leave, without any Meta response.
 const variant=store.publishingWrite('PostVariant',{post_id:posts[0].id,social_account_id:queued.accountId,platform:'facebook',caption:queued.caption,status:'processing',is_demo:false});
 store.publishingWrite('Post',{status:'processing'},posts[0].id);store.publishingWrite('PublishJob',{status:'processing',attempts:1},queued.jobId);
 store.saveAttempt({...queued,status:'processing',startedAt:Date.now()-61001,variantId:variant.id});await publisher.runPhotos();
 const list=createPublishingNotifications(store).list();assert.equal(list.items.length,1);assert.equal(list.items[0].status,'unknown');assert.equal(list.unread,1);assert.equal(store.get('Post',posts[0].id).status,'unknown');assert.equal(store.all('PublishJob')[0].external_post_id,undefined);
 }finally{publisher.close();store.close();}
});

test('notification poll returns at most 100 recent problems while read-all acknowledges older unread history',async()=>{
 const {store,publisher,posts,account}=fixture();try{
 const all=[...posts,...Array.from({length:99},(_,index)=>store.write('Post',{title:'History '+index,caption:'Technical notification test',brand_id:posts[0].brand_id,account_ids:[account.id],timezone:'Asia/Ho_Chi_Minh'}))];
 for(let index=0;index<all.length;index+=50){const review=publisher.prepareBatch(all.slice(index,index+50).map(post=>({postId:post.id,time:new Date(Date.now()+3600000).toISOString(),timezone:'Asia/Ho_Chi_Minh'})));await publisher.confirmBatch(review.batchId);}
 for(const attempt of store.queuedAttempts())store.saveAttempt({...attempt,scheduledFor:Date.now()-100});store.verifiedAccount({connection_status:'disconnected'},account.id);await publisher.runDue();
 const notices=createPublishingNotifications(store);assert.equal(notices.list().items.length,100);assert.equal(notices.list().unread,101);assert.equal(notices.readAll().unread,0);assert.ok(notices.list().items.every(item=>item.read));
 }finally{publisher.close();store.close();}
});
