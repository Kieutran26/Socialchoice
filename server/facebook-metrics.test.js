import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createStore } from './store.js';
import { createMetaVault } from './meta-vault.js';
import { createFacebookMetrics,metricOptions } from './facebook-metrics.js';
import { createMetricsGraph,parseFacebookMetric } from './facebook-metrics-graph.js';

// Synthetic private publication rows exercise selection/storage contracts only.
// They are not Meta publication or live metrics evidence; no Facebook request occurs.
function fixture(path=':memory:',count=4) {
    const store=createStore(path),config={ready:true,key:randomBytes(32).toString('hex'),appSecret:'fixture-only',version:'v26.0'};
    const brand=store.write('Brand',{name:'Metrics test'}),other=store.write('Brand',{name:'Other brand'});
    const pillar=store.write('ContentPillar',{name:'Education',brand_id:brand.id});
    const scopes=['pages_read_engagement'];createMetaVault(store,config.key).save('fixture-credential',{token:'not-a-live-token',scopes});
    const account=store.verifiedAccount({name:'Fixture Page',brand_id:brand.id,platform:'facebook',account_type:'page',external_id:'123456',credential_id:'fixture-credential',scopes,connection_status:'connected'});
    const attempts=Array.from({length:count},(_,index)=>{
        const post=store.write('Post',{title:'Fixture '+index,caption:'Fixture caption',brand_id:brand.id,account_ids:[account.id],pillar_id:pillar.id});
        const attempt={id:'fixture-'+index,postId:post.id,accountId:account.id,pageId:account.external_id,pageName:account.name,status:'published',externalId:'123456_'+(1000+index),url:'https://www.facebook.com/123456_'+(1000+index),finishedAt:Date.now()-1000-index};store.saveAttempt(attempt);return attempt;
    });
    const filters={brandId:brand.id,start:new Date(Date.now()-86400000).toISOString(),end:new Date(Date.now()+1000).toISOString()};
    return {store,config,brand,other,pillar,account,attempts,filters};
}

test('parser distinguishes confirmed zero, missing count and malformed/wrong-Page responses',()=>{
    assert.equal(parseFacebookMetric({id:'123_1',reactions:{summary:{total_count:0}}},'123','123_1','reactions'),0);
    assert.equal(parseFacebookMetric({id:'123_1'},'123','123_1','shares'),null);
    assert.equal(parseFacebookMetric({id:'42',from:{id:'123'},comments:{summary:{total_count:2}}},'123','42','comments'),2);
    for(const value of [-1,1.5,'10',Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>parseFacebookMetric({id:'123_1',shares:{count:value}},'123','123_1','shares'),/invalid metric/);
    assert.throws(()=>parseFacebookMetric({id:'123_2'},'123','123_1','shares'),/identity/);
    assert.throws(()=>parseFacebookMetric({id:'42',from:{id:'999'}},'123','42','reactions'),/identity/);
});

test('metric reader uses bounded count-only queries and isolates unsupported/permission responses',async()=>{
    const calls=[];
    const read=createMetricsGraph(async(id,params,token)=>{
        calls.push({id,params,token});
        if(params.fields.includes('comments'))throw Object.assign(new Error('Denied fixture'),{metaCode:200});
        if(params.fields.includes('shares'))throw Object.assign(new Error('Unsupported fixture'),{metaCode:100});
        return {id,reactions:{summary:{total_count:0}}};
    });
    const result=await read('123','123_1','not-a-live-token');
    assert.deepEqual(result.reactions,{value:0});assert.equal(result.comments.error,'permission_required');assert.equal(result.shares.error,'metric_unavailable');
    assert.equal(calls.length,3);assert.ok(calls[0].params.fields.includes('limit(0)'));
    await assert.rejects(()=>read('123','https://evil.example/','token'),/identity/);assert.equal(calls.length,3);
});

test('eligible reports exclude drafts/demo/unknown/forged jobs, deduplicate IDs and isolate brand/Page/Pillar/date',()=>{
    const f=fixture();try{
        const service=createFacebookMetrics(f.store,{ready:false});const initial=service.list(f.filters);
        assert.equal(initial.total,4);assert.equal(initial.ready,false);assert.equal(initial.totals.reactions.value,null);assert.equal(initial.rows[0].metrics.reactions.value,null);
        f.store.saveAttempt({...f.attempts[0],id:'duplicate'});assert.equal(service.list(f.filters).total,4);
        f.store.saveAttempt({...f.attempts[1],status:'unknown'});assert.equal(service.list(f.filters).total,3);
        const demo=f.store.write('Brand',{name:'Demo fixture',is_demo:true});const demoAccount=f.store.write('SocialAccount',{name:'Demo Page',platform:'facebook',brand_id:demo.id,is_demo:true});const demoPost=f.store.write('Post',{title:'Demo',caption:'Demo',brand_id:demo.id,is_demo:true});f.store.saveAttempt({...f.attempts[0],id:'demo',postId:demoPost.id,accountId:demoAccount.id});
        assert.equal(service.list(f.filters).total,3);assert.equal(service.list({...f.filters,brandId:f.other.id}).total,0);assert.equal(service.list({...f.filters,accountId:'not-selected'}).total,0);assert.equal(service.list({...f.filters,pillarId:'other-pillar'}).total,0);
        assert.equal(service.list({...f.filters,pillarId:f.pillar.id}).total,3);
        const forged=f.store.publishingWrite('PublishJob',{post_id:f.attempts[1].postId,social_account_id:f.account.id,brand_id:f.brand.id,status:'published',external_post_id:'123456_9999'});assert.ok(forged.id);assert.equal(service.list(f.filters).total,3);
        assert.throws(()=>f.store.execute('FacebookMetrics','create',[{}]),/server-only/);
        assert.equal(JSON.stringify(initial).includes('not-a-live-token'),false);assert.equal(JSON.stringify(initial).includes('fixture-credential'),false);
    }finally{f.store.close();}
});

test('refresh is bounded/cooldown protected, totals measure only available values and failure retains timestamped data',async()=>{
    const f=fixture();try{
        let calls=0,denied=false;
        const graph={postMetrics:async()=>{calls++;if(denied)throw new Error('fixture read unavailable');return {reactions:{value:0},comments:{value:2},shares:{value:null,error:'metric_unavailable'}};}};
        const service=createFacebookMetrics(f.store,f.config,{graph});
        const first=await service.refresh(f.filters);assert.equal(first.refreshed,3);assert.equal(calls,3);assert.equal(first.pending,1);assert.deepEqual(first.totals.reactions,{value:0,measured:3});assert.equal(first.totals.comments.value,6);assert.equal(first.totals.shares.value,null);
        const second=await service.refresh(f.filters);assert.equal(second.refreshed,1);assert.equal(calls,4);assert.equal(second.pending,0);await service.refresh(f.filters);assert.equal(calls,4);
        const saved=f.store.metrics.read(f.attempts[0].id);f.store.metrics.save(f.attempts[0].id,{...saved,lastAttemptAt:0});denied=true;
        const failed=await service.refresh(f.filters);assert.equal(failed.totals.comments.value,8);const row=failed.rows.find(row=>row.attemptId===f.attempts[0].id);assert.equal(row.metrics.comments.value,2);assert.equal(row.metrics.comments.updatedAt,saved.comments.updatedAt);assert.equal(row.metrics.comments.stale,true);assert.ok(row.metrics.comments.error);
        assert.equal(f.store.all('PublishJob').length,0);assert.ok(failed.accounts[0].totals.comments.measured===4);assert.equal(failed.pillars[0].totals.comments.value,8);
    }finally{f.store.close();}
});

test('authorization is rechecked after asynchronous reads; concurrent refresh cannot duplicate a leased read',async()=>{
    const f=fixture(':memory:',1);try{
        let release,calls=0;const waited=new Promise(resolve=>{release=resolve;});
        const graph={postMetrics:async()=>{calls++;await waited;return {reactions:{value:10},comments:{value:5},shares:{value:1}};}};
        const service=createFacebookMetrics(f.store,f.config,{graph});const first=service.refresh(f.filters);
        const second=await service.refresh(f.filters);assert.equal(second.refreshed,0);assert.equal(calls,1);
        f.store.verifiedAccount({connection_status:'disconnected'},f.account.id);release();const result=await first;
        assert.equal(result.totals.reactions.value,null);assert.ok(result.rows[0].metrics.reactions.error);
    }finally{f.store.close();}
});

test('snapshots and cooldown survive restart; malformed filters and missing grants never contact Graph',async()=>{
    const folder=mkdtempSync(join(tmpdir(),'metrics-')),path=join(folder,'data.sqlite');let f;
    try{
        f=fixture(path,1);let calls=0;const graph={postMetrics:async()=>{calls++;return {reactions:{value:3},comments:{value:0},shares:{value:0}};}};
        const service=createFacebookMetrics(f.store,f.config,{graph});await service.refresh(f.filters);const filters=f.filters,config=f.config,accountId=f.account.id;f.store.close();
        f.store=createStore(path);const reopened=createFacebookMetrics(f.store,config,{graph});assert.equal(reopened.list(filters).totals.reactions.value,3);await reopened.refresh(filters);assert.equal(calls,1);
        const attempt=f.store.attempt('fixture-0');f.store.metrics.save(attempt.id,{...f.store.metrics.read(attempt.id),lastAttemptAt:0});f.store.verifiedAccount({scopes:[]},accountId);await reopened.refresh(filters);assert.equal(calls,1);
        for(const input of [null,[],{externalId:'evil'},{start:'bad',end:'bad'},{start:'2020-01-01',end:'2026-01-01'},{accountId:100}])assert.throws(()=>metricOptions(input),/filters|date range/);
    }finally{f?.store.close();rmSync(folder,{recursive:true,force:true});}
});
