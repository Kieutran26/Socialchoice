import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createStore } from './store.js';
import { createAdminAuth, hashPassword } from './admin-auth.js';
import { createMetaVault } from './meta-vault.js';
import { tiktokConfig } from './tiktok-config.js';
import { createTiktokConnection } from './tiktok-connection.js';
import { createTiktokTokens } from './tiktok-tokens.js';
import { createTiktokGraph, tiktokToken, tiktokCreator } from './tiktok-graph.js';
import { createFacebookPublisher } from './facebook-publisher.js';
import { createInstagramMediaAccess } from './instagram-media-access.js';
import { createTiktokDelivery } from './tiktok-delivery.js';
import { validateTiktokOptions } from './tiktok-options.js';
import { createApi } from './index.js';

const scopes=['user.info.basic','video.publish'];
const settings={privacy:'SELF_ONLY',allowComment:false,allowDuet:false,allowStitch:false,commercial:false,ownBrand:false,brandedContent:false,aiGenerated:false,musicConsent:true};
const info={username:'synthetic_creator',nickname:'Synthetic creator',privacy:['SELF_ONLY'],commentDisabled:false,duetDisabled:false,stitchDisabled:false,maxDuration:600};
const config=()=>tiktokConfig({TIKTOK_CLIENT_KEY:'synthetic_key',TIKTOK_CLIENT_SECRET:'synthetic_secret',TIKTOK_REDIRECT_URI:'https://app.example/api/tiktok/callback',META_TOKEN_ENCRYPTION_KEY:randomBytes(32).toString('hex')});
const token=()=>({platform:'tiktok',profileId:'opaque-test-id',token:'synthetic-access',refreshToken:'synthetic-refresh',scopes,expiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+86400000});
function fixture(graph={}) {
    const store=createStore(':memory:'),cfg=config(),vault=createMetaVault(store,cfg.key),brand=store.write('Brand',{name:'Synthetic TikTok test'});
    vault.save('tt-test',token());
    const account=store.verifiedAccount({name:'Synthetic creator',username:'synthetic_creator',platform:'tiktok',account_type:'profile',external_id:'opaque-test-id',brand_id:brand.id,credential_id:'tt-test',connection_status:'connected',scopes});
    const bytes=readFileSync(new URL('./fixtures/socialchoice-test-video.mp4',import.meta.url));
    const upload=store.videos.start({brandId:brand.id,name:'fixture.mp4',type:'video/mp4',size:bytes.length});
    for(let offset=0;offset<bytes.length;offset+=1024*1024)store.videos.append(upload.uploadId,offset,bytes.subarray(offset,offset+1024*1024));
    const media=store.videos.complete(upload.uploadId),creators=new Map([[account.id,{...info,credentialId:'tt-test',expires:Date.now()+300000}]]);
    const post=store.write('Post',{title:'Synthetic video',caption:'Reviewed caption',brand_id:brand.id,account_ids:[account.id],media_ids:[media.id],destination_settings:{[account.id]:{tiktok:{...settings}}}});
    const tokens=createTiktokTokens(store,cfg,graph),publisher=createFacebookPublisher(store,{ready:false},{tiktokConfig:cfg,tiktokTokens:tokens,tiktokGraph:graph,tiktokCreators:creators,wake:async()=>{}});
    return {store,cfg,vault,brand,account,media,post,tokens,publisher,creators,close(){publisher.close();store.close();}};
}
test('TikTok independent HTTPS config and strict scope/lifetime/creator validation',()=>{
    assert.equal(tiktokConfig({META_APP_ID:'123',META_APP_SECRET:'secret'}).ready,false);
    assert.equal(config().ready,true);
    assert.equal(tiktokConfig({TIKTOK_CLIENT_KEY:'synthetic_key',TIKTOK_CLIENT_SECRET:'synthetic_secret',TIKTOK_REDIRECT_URI:'http://app.example/api/tiktok/callback',META_TOKEN_ENCRYPTION_KEY:'a'.repeat(64)}).ready,false);
    const raw={open_id:'opaque-test-id',access_token:'synthetic',refresh_token:'synthetic-refresh',token_type:'Bearer',expires_in:86400,refresh_expires_in:31536000,scope:scopes.join(',')};
    assert.equal(tiktokToken(raw).profileId,'opaque-test-id');assert.throws(()=>tiktokToken({...raw,scope:'user.info.basic'}),/permissions/);assert.throws(()=>tiktokToken({...raw,expires_in:0}),/expiry/);
    assert.throws(()=>tiktokCreator({creator_username:'test'}),/settings/);
});
test('TikTok review enforces explicit visibility, music consent, creator limits and private disclosure',()=>{
    const media=[{file_type:'video',mime_type:'video/mp4',duration_seconds:6}];
    assert.equal(validateTiktokOptions(settings,info,media).privacy,'SELF_ONLY');
    for(const patch of [{privacy:''},{privacy:'PUBLIC_TO_EVERYONE'},{musicConsent:false},{brandedContent:true},{commercial:true},{allowComment:true}])assert.throws(()=>validateTiktokOptions({...settings,...patch},{...info,commentDisabled:true},media));
    assert.throws(()=>validateTiktokOptions(settings,{...info,maxDuration:3},media),/duration/);
});
test('TikTok encrypted OAuth binds nonce/session, requires profile selection and consumes replay',async()=>{
    const store=createStore(':memory:'),cfg=config(),sessions=new Map(),states=new Map(),pending=new Map(),auth=createAdminAuth(hashPassword('synthetic tiktok test password'),true,{sessions});
    let cookie,flow;const req={headers:{}};auth.login(req,{setHeader(_k,v){cookie=v.split(';')[0];}},'synthetic tiktok test password');req.headers.cookie=cookie;
    const res={setHeader(_k,v){flow=v.split(';')[0];},writeHead(){},end(){}},brand=store.write('Brand',{name:'OAuth test'});
    const graph={exchange:async()=>token(),profile:async()=>({id:'opaque-test-id',name:'Synthetic'}),creator:async()=>info};
    const connection=createTiktokConnection(store,auth,cfg,{states,pending,graph});
    try{const start=await connection.execute('start',req,res,[brand.id]),url=new URL(start.url);assert.equal(url.origin,'https://www.tiktok.com');assert.equal(url.searchParams.has('client_secret'),false);
        const callback={url:'/api/tiktok/callback?state='+url.searchParams.get('state')+'&code=synthetic',headers:{cookie:flow}};
        await assert.rejects(()=>connection.callback({...callback,headers:{}},res),{status:400});await connection.callback(callback,res);
        await assert.rejects(()=>connection.callback(callback,res),{status:400});const selected=await connection.execute('profile',req,res);assert.equal(selected.pending,true);assert.equal(JSON.stringify(selected).includes('synthetic-access'),false);
        await assert.rejects(()=>connection.execute('import',req,res,['wrong']),{status:400});await connection.execute('import',req,res,['opaque-test-id']);const account=store.all('SocialAccount')[0];assert.equal(account.platform,'tiktok');assert.equal(store.readCredential(account.credential_id).includes('synthetic-access'),false);
        await connection.execute('disconnect',req,res,[account.id]);assert.equal(store.get('SocialAccount',account.id).connection_status,'disconnected');
    }finally{store.close();}
});
test('TikTok refresh serializes concurrent callers and durably guards lost rotating responses',async()=>{
    let calls=0,resolve;const f=fixture({refresh:()=>{calls++;return new Promise(r=>{resolve=r;});}});
    try{f.vault.save('tt-test',{...token(),expiresAt:Date.now()-1});const a=f.tokens.get(f.account),b=f.tokens.get(f.account);assert.equal(calls,1);assert.equal(f.vault.read('tt-test').refreshing,true);resolve(token());await Promise.all([a,b]);assert.equal(f.vault.read('tt-test').refreshing,undefined);
        const lost=createTiktokTokens(f.store,f.cfg,{refresh:async()=>{throw Error('lost');}});f.vault.save('tt-test',{...token(),expiresAt:Date.now()-1});await assert.rejects(()=>lost.get(f.account));await assert.rejects(()=>lost.get(f.account),/unconfirmed/);
    }finally{f.close();}
});
test('TikTok reviewed video schedules independently and expires stale creator review',async()=>{
    const f=fixture();try{const review=f.publisher.prepare(f.post.id);assert.equal(review.platform,'tiktok');assert.equal(review.tiktokOptions.privacy,'SELF_ONLY');assert.equal(review.media.length,1);assert.equal(JSON.stringify(review).includes('synthetic-access'),false);
        const schedule=f.publisher.prepareSchedule(f.post.id,new Date(Date.now()+120000).toISOString());await f.publisher.schedule(schedule.attemptId);assert.equal(f.store.queuedAttempts()[0].platform,'tiktok');
        await f.publisher.cancelSchedule(f.post.id);f.creators.clear();assert.throws(()=>f.publisher.prepare(f.post.id,true),/Refresh TikTok/);
    }finally{f.close();}
});
test('TikTok claims init once and records private completion without inventing a permalink',async()=>{
    let calls=0;const graph={profile:async()=>({id:'opaque-test-id'}),creator:async()=>info,create:async()=>{calls++;return 'v_pub:synthetic';},status:async()=> 'PUBLISH_COMPLETE'},f=fixture(graph);
    try{const review=f.publisher.prepare(f.post.id);await f.publisher.publish(review.attemptId);for(let i=0;i<3;i++){const a=f.store.attempt(review.attemptId);f.store.saveAttempt({...a,nextVideoCheck:0});await f.publisher.runPhotos();}const result=f.publisher.status(review.attemptId);assert.equal(calls,1);assert.equal(result.status,'published');assert.equal(result.publishedUrl,undefined);assert.equal(result.providerPublishId,'v_pub:synthetic');await f.publisher.runPhotos();assert.equal(calls,1);}finally{f.close();}
});
test('TikTok transport uncertainty and interrupted init never resend',async()=>{
    let calls=0;const f=fixture({profile:async()=>({id:'opaque-test-id'}),creator:async()=>info,create:async()=>{calls++;throw Error('lost acknowledgement');}});
    try{const review=f.publisher.prepare(f.post.id);await f.publisher.publish(review.attemptId);await f.publisher.runPhotos();f.store.saveAttempt({...f.store.attempt(review.attemptId),nextVideoCheck:0});await f.publisher.runPhotos();await f.publisher.runPhotos();assert.equal(calls,1);assert.equal(f.publisher.status(review.attemptId).status,'unknown');
        const a={...f.store.attempt(review.attemptId),status:'processing',tiktokStage:'create',busy:true,startedAt:Date.now()-70000};f.store.saveAttempt(a);await f.publisher.runPhotos();assert.equal(f.store.attempt(a.id).status,'unknown');assert.equal(calls,1);
    }finally{f.close();}
});
test('TikTok signed media supports byte ranges only for active approved credential and asset',async()=>{
    const f=fixture();try{const review=f.publisher.prepare(f.post.id);await f.publisher.publish(review.attemptId);const attempt=f.store.attempt(review.attemptId),access=createInstagramMediaAccess(f.store,{ready:false},{},f.cfg),url=new URL(access.url(attempt,f.media));assert.equal(url.origin,'https://app.example');
        let status,headers;const req={method:'HEAD',url:url.pathname+url.search,headers:{range:'bytes=0-9'}},res={writeHead(s,h){status=s;headers=h;},end(){}};assert.equal(access.serve(req,res),true);assert.equal(status,206);assert.equal(headers['Content-Length'],'10');
        const other=new URL(createInstagramMediaAccess(f.store,{ready:true,key:f.cfg.key,mediaOrigin:'https://app.example'}).url({...attempt,platform:'instagram'},f.media));assert.throws(()=>access.serve({...req,url:other.pathname+other.search},res),/invalid/);
        f.store.verifiedAccount({credential_id:null,connection_status:'disconnected'},f.account.id);assert.throws(()=>access.serve(req,res),/authorization changed/);
    }finally{f.close();}
});
test('TikTok Graph sends scopes/tokens only to pinned provider and rejects malformed status',async()=>{
    const original=globalThis.fetch,calls=[];globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options});return Response.json({data:{status:'unexpected'},error:{code:'ok'}});};
    try{const graph=createTiktokGraph(config());await assert.rejects(()=>graph.status('synthetic-token','synthetic-publish'),/invalid publication/);assert.equal(new URL(calls[0].url).origin,'https://open.tiktokapis.com');assert.equal(calls[0].options.redirect,'manual');assert.equal(calls[0].url.includes('synthetic-token'),false);}finally{globalThis.fetch=original;}
});

test('TikTok documented tilde publishing reference is preserved without another init',async()=>{
    const original=globalThis.fetch;
    globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);assert.equal(body.post_info.privacy_level,'SELF_ONLY');assert.equal(body.source_info.source,'PULL_FROM_URL');return Response.json({data:{publish_id:'v_pub_file~v2-1.123456789'},error:{code:'ok'}});};
    try{assert.equal(await createTiktokGraph(config()).create('synthetic-token','Reviewed',settings,'https://app.example/api/instagram-media/synthetic'),'v_pub_file~v2-1.123456789');}finally{globalThis.fetch=original;}
});

test('TikTok approved schedule starts after creator cache expiry and checks live limits before init',async()=>{
    let creates=0;const f=fixture({profile:async()=>({id:'opaque-test-id'}),creator:async()=>({...info,maxDuration:1}),create:async()=>{creates++;return 'not-allowed';}});
    try{const schedule=f.publisher.prepareSchedule(f.post.id,new Date(Date.now()+120000).toISOString());await f.publisher.schedule(schedule.attemptId);const queued=f.store.attempt(schedule.attemptId);f.store.saveAttempt({...queued,scheduledFor:Date.now()-1000});f.creators.clear();await f.publisher.runPhotos();assert.equal(f.publisher.status(schedule.attemptId).status,'failed');assert.equal(creates,0);}finally{f.close();}
});

test('TikTok acknowledged init resumes status reads but revoked access stays unconfirmed',async()=>{
    let reads=0,creates=0;const f=fixture({profile:async()=>({id:'opaque-test-id'}),creator:async()=>info,create:async()=>{creates++;return 'v_pub:read-test';},status:async()=>{reads++;throw Object.assign(new Error('revoked'),{tiktokCode:'access_token_invalid'});}});
    try{const review=f.publisher.prepare(f.post.id);await f.publisher.publish(review.attemptId);for(let i=0;i<3;i++){f.store.saveAttempt({...f.store.attempt(review.attemptId),nextVideoCheck:0});await f.publisher.runPhotos();}assert.equal(creates,1);assert.equal(reads,1);assert.equal(f.publisher.status(review.attemptId).status,'unknown');assert.equal((await f.publisher.publish(review.attemptId)).status,'unknown');assert.equal(creates,1);}finally{f.close();}
});

test('TikTok HTTP routes require admin authentication and reject browser origin forgery',async()=>{
    const names=['TIKTOK_CLIENT_KEY','TIKTOK_CLIENT_SECRET','TIKTOK_REDIRECT_URI','META_TOKEN_ENCRYPTION_KEY'];
    const old=Object.fromEntries(names.map(k=>[k,process.env[k]]));
    Object.assign(process.env,{TIKTOK_CLIENT_KEY:'synthetic_key',TIKTOK_CLIENT_SECRET:'synthetic_secret',TIKTOK_REDIRECT_URI:'https://app.example/api/tiktok/callback',META_TOKEN_ENCRYPTION_KEY:'a'.repeat(64)});
    const {server,store}=createApi({dbPath:':memory:',passwordHash:hashPassword('synthetic tiktok http password'),publicOrigin:'https://app.example',backendOrigin:'https://api.example'});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base='http://127.0.0.1:'+server.address().port,headers={'x-socialchoice-client':'local-ui','content-type':'application/json'};
    try{let r=await fetch(base+'/api/tiktok/status',{headers});assert.equal(r.status,401);r=await fetch(base+'/api/auth/login',{method:'POST',headers,body:JSON.stringify({args:['synthetic tiktok http password']})});assert.equal(r.status,200);const cookie=r.headers.get('set-cookie').split(';')[0];
        r=await fetch(base+'/api/tiktok/status',{headers:{...headers,cookie}});const status=await r.json();assert.equal(status.ready,true);assert.equal(status.mode,'sandbox');assert.equal(JSON.stringify(status).includes('synthetic_secret'),false);
        const brand=store.write('Brand',{name:'HTTP synthetic brand'});
        r=await fetch(base+'/api/tiktok/start',{method:'POST',headers:{...headers,cookie,origin:'https://forged.example'},body:JSON.stringify({args:[brand.id]})});assert.equal(r.status,403);
        r=await fetch(base+'/api/tiktok/start',{method:'POST',headers:{...headers,cookie,origin:'https://app.example'},body:JSON.stringify({args:[brand.id]})});assert.equal(r.status,200);assert.equal(new URL((await r.json()).url).hostname,'www.tiktok.com');
        r=await fetch(base+'/api/tiktok/callback?state=invalid&code=synthetic',{redirect:'manual'});assert.equal(r.status,400);
    }finally{await new Promise(resolve=>server.close(resolve));for(const k of names){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
});
