import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createStore } from './store.js';
import { createStoreCore } from './store-core.js';
import { cloudflareSqlite } from './cloudflare-sqlite.js';
import { createMetaVault } from './meta-vault.js';
import { createFacebookPublisher } from './facebook-publisher.js';
import { deliveryState, contentRevision } from './publishing-state.js';

// Test private persistence/approval/preflight only. No requests or fabricated Meta success.
function fixture(path=':memory:') {
    const store=createStore(path),config={ready:true,key:randomBytes(32).toString('hex'),appSecret:'fixture-only',version:'v26.0'};
    const brand=store.write('Brand',{name:'Multi Page fixture'}),scopes=['pages_manage_posts'];
    const vault=createMetaVault(store,config.key);
    const accounts=['123456','234567'].map((external_id,index)=>{
        const credential_id='fixture-'+index;vault.save(credential_id,{token:'not-a-live-token',scopes,tasks:['CREATE_CONTENT']});
        return store.verifiedAccount({name:'Page '+index,brand_id:brand.id,external_id,platform:'facebook',account_type:'page',connection_status:'connected',credential_id,scopes});
    });
    const post=store.write('Post',{title:'Multi fixture',caption:'Shared caption',brand_id:brand.id,account_ids:accounts.map(account=>account.id),destination_settings:{[accounts[1].id]:{caption:'Page two caption',scheduled_at:new Date(Date.now()+1200000).toISOString()}}});
    const wakes=[],publisher=createFacebookPublisher(store,config,{wake:async time=>{wakes.push(time);}});
    return {store,config,accounts,post,publisher,wakes};
}
const future=()=>new Date(Date.now()+600000).toISOString();
function close({store,publisher}){publisher.close();store.close();}

test('each Page review freezes its caption/time and child confirmation cannot bypass group approval',async()=>{
    const f=fixture();try {
        const review=f.publisher.prepareSchedule(f.post.id,future(),'Asia/Ho_Chi_Minh');
        assert.equal(review.items.length,2);assert.equal(review.items[0].caption,'Shared caption');assert.equal(review.items[1].caption,'Page two caption');
        assert.equal(review.items[1].scheduledFor,Date.parse(f.post.destination_settings[f.accounts[1].id].scheduled_at));
        assert.equal(f.store.queuedAttempts().length,0);assert.equal(f.store.all('PublishJob').length,0);
        assert.equal(f.publisher.status(f.post.id).status,'prepared');
        assert.equal(JSON.stringify(review).includes('not-a-live-token'),false);
        await assert.rejects(()=>f.publisher.publish(review.items[0].attemptId),/Confirm every Page/);
        assert.throws(()=>f.publisher.schedule(review.items[0].attemptId),/Confirm every Page/);
        await assert.rejects(()=>f.publisher.publish(review.attemptId),/matching/);
        await f.publisher.schedule(review.attemptId);await f.publisher.schedule(review.attemptId);
        assert.equal(f.store.queuedAttempts().length,2);assert.equal(f.store.all('PublishJob').length,2);
        assert.throws(()=>f.store.write('Post',{caption:'Unapproved'},f.post.id),/automatic schedule/);
    }finally{close(f);}
});

test('changed/revoked/expired second Page rolls back the whole approval without remote writes',async()=>{
    for(const cause of ['changed','permission','expiry']){
        const f=fixture();try {
            const review=f.publisher.prepareSchedule(f.post.id,future());
            if(cause==='changed')f.store.write('Post',{caption:'Changed'},f.post.id);
            if(cause==='permission')f.store.verifiedAccount({connection_status:'disconnected'},f.accounts[1].id);
            if(cause==='expiry')f.store.saveAttempt({...f.store.attempt(review.items[1].attemptId),expiresAt:0});
            await assert.rejects(()=>f.publisher.schedule(review.attemptId));
            assert.equal(f.store.queuedAttempts().length,0);assert.equal(f.store.all('PublishJob').length,0);assert.equal(f.store.get('Post',f.post.id).status,'draft');
        }finally{close(f);}
    }
});

test('multi-Page immediate review requires a draft; calendar review preserves the scheduled plan',()=>{
    const f=fixture();try{
        f.store.write('Post',{status:'scheduled',scheduled_at:future()},f.post.id);
        assert.throws(()=>f.publisher.prepare(f.post.id),/live draft/);
        const review=f.publisher.prepareSchedule(f.post.id,future());
        assert.equal(review.items.length,2);assert.equal(f.publisher.status(f.post.id).status,'calendar_plan');assert.equal(f.store.queuedAttempts().length,0);
    }finally{close(f);}
});

test('cancelled removed Pages retain history but cannot corrupt later single-Page scheduling',async()=>{
    const f=fixture();try{
        const group=f.publisher.prepareSchedule(f.post.id,future());await f.publisher.schedule(group.attemptId);await f.publisher.cancelSchedule(f.post.id);
        f.store.write('Post',{account_ids:[f.accounts[0].id],destination_settings:{}},f.post.id);
        const review=f.publisher.prepareSchedule(f.post.id,future());await f.publisher.schedule(review.attemptId);
        assert.equal(f.publisher.status(f.post.id).status,'queued');assert.equal(f.publisher.status(f.post.id).multi,false);
        assert.equal(f.store.currentAttempts(f.post.id).length,1);assert.equal(f.store.attempt(group.items[1].attemptId).status,'cancelled');
        await f.publisher.cancelSchedule(f.post.id);assert.equal(f.store.queuedAttempts().length,0);assert.equal(f.store.get('Post',f.post.id).status,'draft');
    }finally{close(f);}
});

test('one Page cancellation and replay preserve sibling queue; cancelling all restores editing',async()=>{
    const f=fixture();try {
        const review=f.publisher.prepareSchedule(f.post.id,future());await f.publisher.schedule(review.attemptId);
        await f.publisher.cancelPage(review.items[0].attemptId);await f.publisher.schedule(review.attemptId);
        assert.equal(f.store.queuedAttempts().length,1);assert.equal(f.publisher.status(f.post.id).status,'queued');
        assert.throws(()=>f.store.write('Post',{caption:'No'},f.post.id),/automatic schedule/);
        await f.publisher.cancelSchedule(f.post.id);assert.equal(f.store.queuedAttempts().length,0);
        f.store.write('Post',{caption:'Editable'},f.post.id);assert.equal(f.store.get('Post',f.post.id).status,'draft');
        const next=f.publisher.prepareSchedule(f.post.id,future());assert.equal(next.items[0].caption,'Editable');
    }finally{close(f);}
});

test('due preflight failure isolates one Page and reviewed retry preserves failure history',async()=>{
    const f=fixture();try {
        const review=f.publisher.prepareSchedule(f.post.id,future());await f.publisher.schedule(review.attemptId);
        const first=f.store.attempt(review.items[0].attemptId);f.store.saveAttempt({...first,scheduledFor:Date.now()-100});
        f.store.verifiedAccount({connection_status:'disconnected'},f.accounts[0].id);await f.publisher.runDue();await f.publisher.runDue();
        assert.equal(f.publisher.status(first.id).status,'failed');assert.equal(f.store.queuedAttempts().length,1);assert.equal(f.store.all('PublishJob')[0].attempts,0);
        assert.equal(f.store.unreadNotificationCount(),1);assert.throws(()=>f.publisher.prepareRetry(f.post.id,f.accounts[1].id),/confirmed failed/);
        f.store.verifiedAccount({connection_status:'connected'},f.accounts[0].id);
        const retry=f.publisher.prepareRetry(f.post.id,f.accounts[0].id);assert.equal(f.store.attempt(first.id).status,'failed');
        await f.publisher.publish(retry.attemptId);await f.publisher.publish(retry.attemptId);
        assert.equal(f.store.queuedAttempts().length,2);assert.equal(f.store.all('PublishJob').length,3);assert.equal(f.store.attemptsForPost(f.post.id).length,3);
        assert.equal((await f.publisher.publish(first.id)).status,'failed');
        assert.equal(f.store.attempt(first.id).status,'failed');
    }finally{close(f);}
});

test('private photo/video approval shares exact ordered media and independent durable claims',async()=>{
    for(const video of [false,true]){
        const f=fixture();try {
            let media;
            if(video){const bytes=readFileSync(new URL('./fixtures/socialchoice-test-video.mp4',import.meta.url));const upload=f.store.videos.start({brandId:f.post.brand_id,name:'fixture.mp4',type:'video/mp4',size:bytes.length});f.store.videos.append(upload.uploadId,0,bytes);media=[f.store.videos.complete(upload.uploadId)];}
            else{const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=','base64');media=['second.png','first.png'].map(name=>f.store.images.upload(f.post.brand_id,name,'image/png',bytes));}
            f.store.write('Post',{media_ids:media.map(asset=>asset.id)},f.post.id);
            const review=f.publisher.prepare(f.post.id);await f.publisher.publish(review.attemptId);
            for(const item of review.items){assert.deepEqual(item.media.map(asset=>asset.id),media.map(asset=>asset.id));assert.equal((await f.publisher.publish(item.attemptId)).status,'processing');}
            assert.equal(f.store.pendingAttempts().length,2);assert.equal(f.store.all('PublishJob').length,2);
            for(const attempt of f.store.pendingAttempts())f.store.saveAttempt({...attempt,busy:true,startedAt:0,videoStage:video?'transfer':undefined});
            await f.publisher.runPhotos();assert.equal(f.publisher.status(f.post.id).status,'unknown');assert.equal(f.store.pendingAttempts().length,0);
            assert.throws(()=>f.publisher.prepareRetry(f.post.id,f.accounts[0].id),/confirmed failed/);
        }finally{close(f);}
    }
});

test('per-Page queues persist and restart arms earliest due time without browser',async()=>{
    const folder=mkdtempSync(join(tmpdir(),'multi-page-')),path=join(folder,'data.sqlite');let f;
    try {f=fixture(path);const review=f.publisher.prepareSchedule(f.post.id,future());await f.publisher.schedule(review.attemptId);const postId=f.post.id;close(f);
        const store=createStore(path),wakes=[],publisher=createFacebookPublisher(store,{ready:false},{wake:async time=>{wakes.push(time);}});f={store,publisher};await publisher.resumePhotos();
        assert.equal(store.queuedAttempts().length,2);assert.equal(publisher.status(postId).items.length,2);assert.equal(wakes[0],Math.min(...review.items.map(item=>item.scheduledFor)));
    }finally{if(f)close(f);rmSync(folder,{recursive:true,force:true});}
});

test('legacy one-attempt migration preserves IDs, notifications and queue with both SQLite adapters',()=>{
    for(const cloud of [false,true]){
        const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE publish_attempts (id TEXT PRIMARY KEY, post_id TEXT UNIQUE NOT NULL, data TEXT NOT NULL)');
        const legacy={id:'legacy',postId:'post',accountId:'page',status:'queued',scheduledFor:Date.now()+600000};db.prepare('INSERT INTO publish_attempts VALUES (?,?,?)').run(legacy.id,legacy.postId,JSON.stringify(legacy));
        const adapter=cloud?cloudflareSqlite({sql:{exec:(sql,...args)=>sql.trim().startsWith('SELECT')?db.prepare(sql).all(...args):args.length?db.prepare(sql).run(...args)&&[]:db.exec(sql)&&[]}}):db;
        const store=createStoreCore(adapter,cloud?work=>{db.exec('BEGIN');try{const result=work();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}:undefined);
        assert.deepEqual(store.attempt('legacy'),legacy);store.saveAttempt({...legacy,id:'sibling',accountId:'page-two'});assert.equal(store.currentAttempts('post').length,2);assert.equal(store.queuedAttempts().length,2);db.close();
    }
});

test('aggregate states never mark a partially delivered post fully published; runtime fields preserve content revision',()=>{
    assert.equal(deliveryState([]),'draft');
    for(const [states,expected] of [[['published','failed'],'partially_published'],[['published','unknown'],'partially_published'],[['published','queued'],'scheduled'],[['published','processing'],'processing'],[['published','published'],'published'],[['unknown','failed'],'unknown'],[['failed','cancelled'],'failed']]) assert.equal(deliveryState(states.map(status=>({status}))),expected);
    assert.equal(contentRevision({caption:'Exact',status:'draft',updated_date:'old'}),contentRevision({caption:'Exact',status:'processing',updated_date:'new',scheduled_at:'later'}));
    assert.notEqual(contentRevision({caption:'Exact'}),contentRevision({caption:'Changed'}));
});
