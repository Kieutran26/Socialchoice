import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createStore } from './store.js';
import { createMetaVault } from './meta-vault.js';
import { createFacebookCollaboration,collaboratorTarget } from './facebook-collaboration.js';

test('collaborator identifiers cannot change the Meta host or endpoint',()=>{
 assert.equal(collaboratorTarget('https://www.facebook.com/apple'),'apple');assert.equal(collaboratorTarget('https://facebook.com/profile.php?id=1234'),'1234');
 for(const value of ['https://evil.invalid/apple','../me/accounts','https://facebook.com/apple/videos','apple?fields=access_token','..','.',''])assert.throws(()=>collaboratorTarget(value),/Page ID/);
});
test('collaboration requires a real confirmed video; interrupted claims cannot resend or forge acceptance',async()=>{
 const store=createStore(':memory:');try{
 const config={ready:true,key:randomBytes(32).toString('hex'),appSecret:'test-only',version:'v26.0'},service=createFacebookCollaboration(store,config);
 const brand=store.write('Brand',{name:'Collaboration invariant fixture'}),account=store.verifiedAccount({name:'Fixture',brand_id:brand.id,external_id:'1234',platform:'facebook',account_type:'page',connection_status:'connected',credential_id:'test-vault'});
 createMetaVault(store,config.key).save('test-vault',{token:'not-a-live-token'});
 assert.throws(()=>service.list('absent'),/confirmed published/);
 // Private persisted state fixture only; no simulated successful Meta response.
 store.saveAttempt({id:'attempt',postId:'post',accountId:account.id,credentialId:'test-vault',status:'published',videoId:'4567',media:[{file_type:'video'}]});
 store.saveCollaboration({id:'invite',postId:'post',videoId:'4567',credentialId:'test-vault',targetId:'7890',targetName:'Target fixture',status:'sending'});
 assert.equal(service.list('post')[0].status,'unknown');assert.equal((await service.invite('invite')).status,'unknown');assert.equal(store.collaborations('post').length,1);
 store.saveCollaboration({id:'expired',postId:'post',videoId:'4567',credentialId:'test-vault',targetId:'7891',status:'prepared',expiresAt:0});await assert.rejects(()=>service.invite('expired'),/expired/);
 assert.throws(()=>store.execute('CollaborationInvite','list',[]),/server-only/);
 store.saveAttempt({...store.attempt('attempt'),media:[{file_type:'image'}]});assert.throws(()=>service.list('post'),/confirmed published/);
 }finally{store.close();}
});
