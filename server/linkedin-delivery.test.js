import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createStore} from './store.js';
import {createMetaVault} from './meta-vault.js';
import {createFacebookPublisher} from './facebook-publisher.js';
import {createLinkedinDelivery} from './linkedin-delivery.js';
import {createInstagramMediaAccess} from './instagram-media-access.js';
import {Buffer} from 'node:buffer';
function fixture() {
 const store=createStore(':memory:'),config={ready:true,key:randomBytes(32).toString('hex'),mediaOrigin:'https://backend.example',appSecret:'test'};
 const brand=store.write('Brand',{name:'Linkedin delivery'}),scopes=['openid','profile','w_member_social'];
 const vault=createMetaVault(store,config.key);vault.save('linkedin-test',{platform:'linkedin',profileId:'123',token:'test',scopes,expiresAt:Date.now()+3600000});
 const account=store.verifiedAccount({name:'Exact profile',platform:'linkedin',account_type:'profile',external_id:'123',brand_id:brand.id,credential_id:'linkedin-test',connection_status:'connected',scopes});
 const post=store.write('Post',{title:'Linkedin',caption:'Reviewed text',brand_id:brand.id,account_ids:[account.id]});
 const publisher=createFacebookPublisher(store,{ready:false},{linkedinConfig:config,wake:async()=>{}});
 return {store,config,vault,account,post,publisher};
}
test('Linkedin only configuration reviews and schedules exact identity and content',async()=>{
 const f=fixture();try {
 const review=f.publisher.prepare(f.post.id);assert.equal(review.platform,'linkedin');assert.equal(review.caption,'Reviewed text');
 f.store.write('Post',{caption:'Changed text'},f.post.id);await assert.rejects(()=>f.publisher.publish(review.attemptId),/changed/);
 const schedule=f.publisher.prepareSchedule(f.post.id,new Date(Date.now()+120000).toISOString(),'Asia/Ho_Chi_Minh');await f.publisher.schedule(schedule.attemptId);
 assert.equal(f.store.all('PublishJob')[0].platform,'linkedin');assert.equal(f.store.attempt(schedule.attemptId).caption,'Changed text');
 }finally{f.publisher.close();f.store.close();}
});
test('Linkedin text claims durably without Facebook direct text network',async()=>{
 const f=fixture();try{const review=f.publisher.prepare(f.post.id);const result=await f.publisher.publish(review.attemptId);assert.equal(result.status,'processing');assert.equal(f.store.pendingAttempts().length,1);}finally{f.publisher.close();f.store.close();}
});

test('LinkedIn text publication requires acknowledged ID, and interrupted writes never resend',async()=>{
 const f=fixture();try{
 let writes=0;const graph={profile:async()=>({id:'123'}),permissions:async()=>({}),publish:async()=>{writes++;return {id:'urn:li:ugcPost:12345',url:'https://www.linkedin.com/feed/update/urn:li:ugcPost:12345/'};}};
 const runner=createLinkedinDelivery(f.store,f.vault,graph,(a,status,message,result)=>{f.store.saveAttempt({...a,status,message,result});},async()=>{});
 const review=f.publisher.prepare(f.post.id);await f.publisher.publish(review.attemptId);await runner();assert.equal(f.store.attempt(review.attemptId).status,'published');assert.equal(writes,1);await runner();assert.equal(writes,1);
 }finally{f.publisher.close();f.store.close();}
});
test('LinkedIn lost publish response and stale busy claim stay unknown without replay',async()=>{
 for(const crash of [false,true]) {const f=fixture();try{
 let writes=0;const graph={profile:async()=>({id:'123'}),permissions:async()=>({}),publish:async()=>{writes++;throw Error('lost');}};
 const runner=createLinkedinDelivery(f.store,f.vault,graph,(a,status)=>f.store.saveAttempt({...a,status}),async()=>{});
 const r=f.publisher.prepare(f.post.id);await f.publisher.publish(r.attemptId);if(crash)f.store.saveAttempt({...f.store.attempt(r.attemptId),busy:true,startedAt:Date.now()-61000,linkedinStage:'publish'});
 await runner();await runner();assert.equal(f.store.attempt(r.attemptId).status,'unknown');assert.equal(writes,crash?0:1);
 }finally{f.publisher.close();f.store.close();}}
});
test('LinkedIn photo checkpoints register, upload, read processing and publish once',async()=>{
 const f=fixture();try{
 const r=f.publisher.prepare(f.post.id);await f.publisher.publish(r.attemptId);f.store.saveAttempt({...f.store.attempt(r.attemptId),media:[{storage_id:'test',file_type:'image'}]});
 f.store.images.read=()=>Buffer.from('synthetic');const calls=[];const graph={profile:async()=>({id:'123'}),permissions:async()=>({}),register:async()=>{calls.push('register');return {asset:'urn:li:digitalmediaAsset:abc',uploadUrl:'https://api.linkedin.com/mediaUpload/test'};},upload:async()=>{calls.push('upload');},assetStatus:async()=>{calls.push('status');return 'ready';},publish:async()=>{calls.push('publish');return {id:'urn:li:ugcPost:123'};}};
 const runner=createLinkedinDelivery(f.store,f.vault,graph,(a,status)=>f.store.saveAttempt({...a,status}),async()=>{});
 for(let n=0;n<4;n++){await runner();const a=f.store.attempt(r.attemptId);f.store.saveAttempt({...a,nextVideoCheck:0});}
 assert.deepEqual(calls,['register','upload','status','publish']);assert.equal(f.store.attempt(r.attemptId).status,'published');
 }finally{f.publisher.close();f.store.close();}
});
test('LinkedIn revoked grant or disconnect during preflight never reaches publication',async()=>{
 for(const disconnect of [false,true]){const f=fixture();try{
 let writes=0;const graph={profile:async()=>({id:'123'}),permissions:async()=>{if(disconnect)f.store.verifiedAccount({credential_id:null,connection_status:'disconnected'},f.account.id);else throw Object.assign(new Error('revoked'),{status:409});},publish:async()=>{writes++;}};
 const r=f.publisher.prepare(f.post.id);await f.publisher.publish(r.attemptId);
 const run=createLinkedinDelivery(f.store,f.vault,graph,(a,status)=>f.store.saveAttempt({...a,status}),async()=>{});await run();assert.equal(writes,0);assert.equal(f.store.attempt(r.attemptId).status,'failed');
 }finally{f.publisher.close();f.store.close();}}
});
test('confirmed revoked LinkedIn grant expires only the matching connection',async()=>{
 for(const reconnect of [false,true]){const f=fixture();try{
 const graph={profile:async()=>({id:'123'}),permissions:async()=>{if(reconnect)f.store.verifiedAccount({credential_id:'new-credential'},f.account.id);throw Object.assign(new Error('revoked'),{status:409,linkedinGrantInvalid:true});}};
 const r=f.publisher.prepare(f.post.id);await f.publisher.publish(r.attemptId);
 const run=createLinkedinDelivery(f.store,f.vault,graph,(a,status)=>f.store.saveAttempt({...a,status}),async()=>{});await run();assert.equal(f.store.get('SocialAccount',f.account.id).connection_status,reconnect?'connected':'expired');assert.equal(f.store.attempt(r.attemptId).status,'failed');
 }finally{f.publisher.close();f.store.close();}}
});
