import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { randomBytes,randomUUID } from 'node:crypto';
import { createStore } from './store.js';
import { createMetaVault } from './meta-vault.js';
import { createFacebookPublisher } from './facebook-publisher.js';
import { createInstagramMediaAccess,instagramRange } from './instagram-media-access.js';
import { instagramContainerState,instagramPublishedMedia } from './instagram-graph.js';
import { createInstagramDelivery,instagramReadStage } from './instagram-delivery.js';

function fixture() {
    const store=createStore(':memory:');
    const config={ready:true,key:randomBytes(32).toString('hex'),appSecret:'test-only',version:'v26.0',mediaOrigin:'https://backend.example'};
    const brand=store.write('Brand',{name:'Instagram test'}),scopes=['instagram_basic','instagram_content_publish'];
    createMetaVault(store,config.key).save('ig-test',{token:'test-only',scopes,tasks:['CREATE_CONTENT'],pageId:'456'});
    const account=store.verifiedAccount({name:'Test IG',platform:'instagram',account_type:'profile',external_id:'123',brand_id:brand.id,credential_id:'ig-test',connection_status:'connected',scopes});
    // Signature/dimension fixture only; not a real decodable image or remote publication.
    const jpeg=Buffer.from('ffd8ffc0000b080001000101011100ffd9','hex');
    const media=store.images.upload(brand.id,'test.jpg','image/jpeg',jpeg);
    const post=store.write('Post',{title:'IG test',caption:'Exact reviewed content',platform_captions:{instagram:'Instagram caption'},brand_id:brand.id,account_ids:[account.id],media_ids:[media.id]});
    return {store,config,account,post,media,jpeg,publisher:createFacebookPublisher(store,config,{wake:async()=>{}})};
}

test('Instagram review and durable schedule preserve platform and exact content without network',async()=>{
    const f=fixture();try {
        const review=f.publisher.prepare(f.post.id);assert.equal(review.platform,'instagram');assert.equal(review.caption,'Instagram caption');assert.equal(review.media.length,1);
        assert.equal(JSON.stringify(review).includes('ig-test'),false);
        f.store.write('Post',{caption:'changed'},f.post.id);
        await assert.rejects(()=>f.publisher.publish(review.attemptId),/changed/);
        const schedule=f.publisher.prepareSchedule(f.post.id,new Date(Date.now()+120000).toISOString());
        await f.publisher.schedule(schedule.attemptId);
        assert.equal(f.store.attempt(schedule.attemptId).status,'queued');assert.equal(f.store.all('PublishJob')[0].platform,'instagram');
    } finally {f.publisher.close();f.store.close();}
});
test('Instagram rejects text-only, non-JPEG and multiple media before claims',()=>{
    const f=fixture();try {
        f.store.write('Post',{media_ids:[]},f.post.id);assert.throws(()=>f.publisher.prepare(f.post.id),/one JPEG/);
        const another=f.store.images.upload(f.media.brand_id,'other.jpg','image/jpeg',f.jpeg);
        f.store.write('Post',{media_ids:[f.media.id,another.id]},f.post.id);assert.throws(()=>f.publisher.prepare(f.post.id),/one JPEG/);
        const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=','base64');
        const image=f.store.images.upload(f.media.brand_id,'test.png','image/png',png);
        f.store.write('Post',{media_ids:[image.id]},f.post.id);assert.throws(()=>f.publisher.prepare(f.post.id),/one JPEG/);
        f.store.write('Post',{media_ids:[f.media.id]},f.post.id);
        f.store.verifiedAccount({scopes:['instagram_basic']},f.account.id);assert.throws(()=>f.publisher.prepare(f.post.id),/permissions/);
        assert.equal(f.store.all('PublishJob').length,0);
    }finally{f.store.close();}
});
test('signed media capability rejects tampering, terminal attempt and revoked credential',()=>{
    const f=fixture();try {
        const review=f.publisher.prepare(f.post.id),attempt={...f.store.attempt(review.attemptId),status:'processing',startedAt:Date.now()};f.store.saveAttempt(attempt);
        const access=createInstagramMediaAccess(f.store,f.config),url=new URL(access.url(attempt,f.media));
        const req={url:url.pathname+url.search,method:'HEAD',headers:{}};
        let headers;const res={writeHead:(status,value)=>{assert.equal(status,200);headers=value;},end:()=>{}};
        assert.equal(access.serve(req,res),true);assert.equal(headers['Content-Length'],String(f.jpeg.length));
        assert.throws(()=>access.serve({...req,url:req.url.replace(/signature=(.)/,(_match,character)=>'signature='+(character==='0'?'1':'0'))},res),/invalid/);
        f.store.saveAttempt({...attempt,status:'published'});assert.throws(()=>access.serve(req,res),/no longer active/);
        f.store.saveAttempt(attempt);f.store.verifiedAccount({credential_id:'replacement'},f.account.id);assert.throws(()=>access.serve(req,res),/authorization changed/);
    }finally{f.store.close();}
});
test('real byte range semantics preserve full ranges and reject malformed bounds',()=>{
    assert.deepEqual(instagramRange(undefined,100),{start:0,end:100,status:200});
    assert.deepEqual(instagramRange('bytes=10-89',100),{start:10,end:90,status:206});
    assert.deepEqual(instagramRange('bytes=-5',100),{start:95,end:100,status:206});
    for(const range of ['bytes=100-','bytes=10-2','bytes=-0','bytes=0-1,3-4'])assert.throws(()=>instagramRange(range,100));
});
test('Instagram status/identity parsers fail closed without owner or valid permalink',()=>{
    assert.equal(instagramContainerState({id:'123',status_code:'FINISHED'},'123'),'FINISHED');
    assert.throws(()=>instagramContainerState({id:'123',status_code:'made-up'},'123'));
    const value={id:'456',owner:{id:'123'},permalink:'https://www.instagram.com/p/verified/'};
    assert.equal(instagramPublishedMedia(value,'456','123').id,'456');
    for(const invalid of [{...value,owner:undefined},{...value,owner:{id:'789'}},{...value,permalink:'https://instagram.com.evil.test/p/fake/'}])assert.throws(()=>instagramPublishedMedia(invalid,'456','123'));
    assert.equal(instagramReadStage('verify'),true);assert.equal(instagramReadStage('publish'),false);
});
test('interrupted Instagram writes never resend and cannot enter Facebook photo runner',async()=>{
    const f=fixture();try {
        const review=f.publisher.prepare(f.post.id),attempt={...f.store.attempt(review.attemptId),status:'processing',busy:true,startedAt:Date.now()-70000,instagramStage:'publish',id:randomUUID()};f.store.saveAttempt(attempt);
        let status;const run=createInstagramDelivery(f.store,null,null,null,(_attempt,value)=>{status=value;},async()=>{});
        await run();assert.equal(status,'unknown');
    }finally{f.store.close();}
});

test('revoked authorization after media_publish stays unconfirmed and cannot become retryable failure',async()=>{
    const f=fixture();try {
        const review=f.publisher.prepare(f.post.id),attempt={...f.store.attempt(review.attemptId),status:'processing',busy:false,startedAt:Date.now(),instagramStage:'verify',instagramMediaId:'987',instagramVerificationSince:Date.now()};f.store.saveAttempt(attempt);
        f.store.verifiedAccount({connection_status:'expired'},f.account.id);
        let result;
        const run=createInstagramDelivery(f.store,createMetaVault(f.store,f.config.key),null,null,(_attempt,status)=>{result=status;},async()=>{});
        await run();assert.equal(result,'unknown');
    }finally{f.store.close();}
});
