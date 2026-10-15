import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createStore} from './store.js';
import {createMetaVault} from './meta-vault.js';
import {createFacebookPublisher} from './facebook-publisher.js';
import {createThreadsDelivery} from './threads-delivery.js';
import {createInstagramMediaAccess} from './instagram-media-access.js';
import {Buffer} from 'node:buffer';
function fixture() {
 const store=createStore(':memory:'),config={ready:true,key:randomBytes(32).toString('hex'),mediaOrigin:'https://backend.example',appSecret:'test'};
 const brand=store.write('Brand',{name:'Threads delivery'}),scopes=['threads_basic','threads_content_publish'];
 const vault=createMetaVault(store,config.key);vault.save('threads-test',{platform:'threads',profileId:'123',token:'test',scopes,expiresAt:Date.now()+3600000});
 const account=store.verifiedAccount({name:'Exact profile',platform:'threads',account_type:'profile',external_id:'123',brand_id:brand.id,credential_id:'threads-test',connection_status:'connected',scopes});
 const post=store.write('Post',{title:'Threads',caption:'Reviewed text',brand_id:brand.id,account_ids:[account.id]});
 const publisher=createFacebookPublisher(store,{ready:false},{threadsConfig:config,wake:async()=>{}});
 return {store,config,vault,account,post,publisher};
}
test('Threads only configuration reviews and schedules exact identity and content',async()=>{
 const f=fixture();try {
 const review=f.publisher.prepare(f.post.id);assert.equal(review.platform,'threads');assert.equal(review.caption,'Reviewed text');
 f.store.write('Post',{caption:'Changed text'},f.post.id);await assert.rejects(()=>f.publisher.publish(review.attemptId),/changed/);
 const schedule=f.publisher.prepareSchedule(f.post.id,new Date(Date.now()+120000).toISOString(),'Asia/Ho_Chi_Minh');await f.publisher.schedule(schedule.attemptId);
 assert.equal(f.store.all('PublishJob')[0].platform,'threads');assert.equal(f.store.attempt(schedule.attemptId).caption,'Changed text');
 }finally{f.publisher.close();f.store.close();}
});
test('Threads text claims durably without Facebook direct text network',async()=>{
 const f=fixture();try{const review=f.publisher.prepare(f.post.id);const result=await f.publisher.publish(review.attemptId);assert.equal(result.status,'processing');assert.equal(f.store.pendingAttempts().length,1);}finally{f.publisher.close();f.store.close();}
});
test('Threads write uncertainty and interrupted publish never resend',async()=>{
 const f=fixture();try{
 const review=f.publisher.prepare(f.post.id);await f.publisher.publish(review.attemptId);let calls=0;
 const run=createThreadsDelivery(f.store,f.vault,{profile:async()=>({id:'123'}),create:async()=>{calls++;throw new Error('Transport lost');}},null,(attempt,status)=>f.store.saveAttempt({...attempt,status}),async()=>{});
 await run();await run();assert.equal(calls,1);assert.equal(f.store.attempt(review.attemptId).status,'unknown');
 f.store.saveAttempt({...f.store.attempt(review.attemptId),status:'processing',threadsStage:'publish',busy:true,startedAt:Date.now()-70000});await run();assert.equal(f.store.attempt(review.attemptId).status,'unknown');assert.equal(calls,1);
 }finally{f.publisher.close();f.store.close();}
});
test('Threads read claims resume but acknowledged publication cannot become retryable',async()=>{
 const f=fixture();try{
 const review=f.publisher.prepare(f.post.id);await f.publisher.publish(review.attemptId);
 const attempt={...f.store.attempt(review.attemptId),threadsStage:'verify',threadsMediaId:'456',threadsVerificationSince:Date.now(),busy:true,startedAt:Date.now()-70000};f.store.saveAttempt(attempt);
 let calls=0;const run=createThreadsDelivery(f.store,f.vault,{profile:async()=>({id:'123'}),verify:async()=>{calls++;throw Object.assign(new Error('Denied'),{metaCode:190,metaHttpStatus:400});}},null,(value,status)=>f.store.saveAttempt({...value,status}),async()=>{});
 await run();assert.equal(f.store.attempt(attempt.id).busy,false);f.store.saveAttempt({...f.store.attempt(attempt.id),nextVideoCheck:0});await run();assert.equal(calls,1);assert.equal(f.store.attempt(attempt.id).status,'unknown');
 }finally{f.publisher.close();f.store.close();}
});
test('Threads signed media is platform bound and expires with credentials',()=>{
 const f=fixture();try{
 const jpeg=Buffer.from('ffd8ffc0000b080001000101011100ffd9','hex'),asset=f.store.images.upload(f.post.brand_id,'test.jpg','image/jpeg',jpeg);
 f.store.write('Post',{media_ids:[asset.id]},f.post.id);const review=f.publisher.prepare(f.post.id),attempt={...f.store.attempt(review.attemptId),status:'processing'};f.store.saveAttempt(attempt);
 const access=createInstagramMediaAccess(f.store,{ready:false},f.config),url=new URL(access.url(attempt,asset)),request={url:url.pathname+url.search,method:'HEAD',headers:{}},response={writeHead:()=>{},end:()=>{}};
 assert.equal(access.serve(request,response),true);f.vault.save('threads-test',{platform:'threads',profileId:'123',token:'test',scopes:['threads_basic','threads_content_publish'],expiresAt:Date.now()-1});assert.throws(()=>access.serve(request,response),/authorization changed/);
 }finally{f.publisher.close();f.store.close();}
});
test('Threads checkpoints create process publish verify independently and require final verification',async()=>{
 const f=fixture();try{
 const review=f.publisher.prepare(f.post.id);await f.publisher.publish(review.attemptId);const calls=[];
 const graph={profile:async()=>({id:'123'}),create:async(_id,asset,url,text)=>{assert.equal(asset,null);assert.equal(url,null);assert.equal(text,'Reviewed text');assert.equal(f.store.attempt(review.attemptId).busy,true);calls.push('create');return '234';},status:async()=>{calls.push('status');return 'FINISHED';},publish:async()=>{calls.push('publish');return '345';},verify:async()=>{calls.push('verify');return {id:'345',url:'https://www.threads.com/@test/post/verified'};}};
 const run=createThreadsDelivery(f.store,f.vault,graph,null,(value,status,_message,result)=>f.store.saveAttempt({...value,status,...(result?{externalId:result.id,url:result.url}:{})}),async()=>{});
 for(const expected of ['processing','publish','verify']){await run();assert.equal(f.store.attempt(review.attemptId).threadsStage,expected);assert.equal(f.store.attempt(review.attemptId).status,'processing');f.store.saveAttempt({...f.store.attempt(review.attemptId),nextVideoCheck:0});}
 await run();assert.equal(f.store.attempt(review.attemptId).status,'published');assert.deepEqual(calls,['create','status','publish','verify']);await run();assert.equal(calls.length,4);
 }finally{f.publisher.close();f.store.close();}
});
test('Threads rejects expired token and overlong reviewed text before durable job',()=>{
 const f=fixture();try{f.store.write('Post',{caption:'x'.repeat(501)},f.post.id);assert.throws(()=>f.publisher.prepare(f.post.id),/500/);f.store.write('Post',{caption:'Valid'},f.post.id);f.vault.save('threads-test',{platform:'threads',profileId:'123',token:'test',scopes:['threads_basic','threads_content_publish'],expiresAt:Date.now()-1});assert.throws(()=>f.publisher.prepare(f.post.id),/permissions/);assert.equal(f.store.all('PublishJob').length,0);}finally{f.publisher.close();f.store.close();}
});
