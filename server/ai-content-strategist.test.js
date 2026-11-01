import test from 'node:test';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {rmSync} from 'node:fs';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createStore } from './store.js';
import { createAutopilot } from './autopilot.js';
import { createMetaVault } from './meta-vault.js';
import { generateStrategyPlan, editPlanItem } from '../src/lib/strategy-plan.js';
import { seedBrandSampleAssets } from '../src/lib/ai-content-strategist.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=','base64');
async function fixture(t,options={}) {
    const store=createStore(options.dbPath||':memory:'); let closed=false; const close=()=>{if(!closed){closed=true;store.close();}}; t.after(close);
    const key=randomBytes(32).toString('hex');
    const brand=store.write('Brand',{name:'QA Software',products:'Content calendar',target_audience:'Marketers',tone_of_voice:'Clear',goals:'Product education',timezone:'Asia/Ho_Chi_Minh'});
    let calls=0,reads=0;
    const bucket={get:async()=>{reads++;await options.onRead?.();return {body:new Response(png).body,size:png.length};}};
    const aiFetch=async(url,input)=>{
        calls++; assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');
        const request=JSON.parse(input.body), prompt=request.messages[0].content;
        assert.match(prompt,/Do not invent facts/);
        const context=JSON.parse(prompt.slice(prompt.indexOf('\n')+1)), brief=JSON.parse(context.brief);
        assert.equal(brief.brand.products,'Content calendar');
        assert.ok(!prompt.includes('private-fixture-key'));assert.ok(!prompt.includes('data:image'));
        await options.onAi?.();
        const copy=brief.slots.map((slot,i)=>({id:slot.id,asset_id:slot.asset_id,title:`Review topic ${i}`,caption:`Useful content for ${slot.id}. Question ${i}?`,reason:`The approved asset relates to ${slot.pillar}.`}));
        return Response.json({choices:[{finish_reason:'stop',message:{content:options.badJson?'invalid JSON':JSON.stringify(copy)}}]});
    };
    const service=createAutopilot({store,auth:{enabled:true},key,bucket,aiFetch,env:{SOCIALCHOICE_AUTOPILOT_ENABLED:'true'}});
    const call=(operation,input={})=>service.execute(operation,input);
    createMetaVault(store,key).save('ai:writing',{provider:'openrouter',model:'google/fixture',key:'private-fixture-key'});
    const source=await call('createSource',{brand_id:brand.id,kind:'r2',folder:'assets/',name:'QA'});
    const assets=Array.from({length:20},(_,i)=>{
        const asset=store.autopilot().upsertAsset(source,{id:`owner/assets/image-${i}.png`,name:`image-${i}.png`,version:'v1',mime:'image/png',size:png.length});
        return store.autopilot().saveAsset({...asset,analysis_status:'analyzed',review:'approved',analysis_key:'v1',analysis:{summary:`Content calendar screenshot ${i}`,tags:['product','education'],ocr:'',warnings:[]}});
    });
    const input=()=>({brand_id:brand.id,request_id:randomUUID(),confirmed:true,language:'vi',options:{days:30,frequency:'1_per_day',platforms:['facebook','instagram'],startDate:'2026-11-02'}});
    return {store,brand,source,assets,call,input,key,bucket,aiFetch,close,counts:()=>({calls,reads})};
}

test('Phase 2 uses a real provider adapter and approved server facts, then imports catalog bytes and saves only drafts',async t=>{
    const f=await fixture(t), input=f.input(), plan=await f.call('strategyGenerate',input);
    assert.equal(plan.posts.length,30);assert.equal(new Set(plan.posts.map(p=>p.caption)).size,30);
    assert.equal((await f.call('strategyGenerate',input)).id,plan.id);assert.equal(f.counts().calls,1);
    assert.equal(f.store.all('Post').length,0);
    const posts=await f.call('strategyApply',{brand_id:f.brand.id,plan});
    assert.equal(posts.length,30);assert.equal(f.store.all('MediaAsset').length,20);
    for(const post of posts){assert.equal(post.status,'draft');assert.ok(post.scheduled_at);assert.equal(post.media_ids.length,1);assert.deepEqual(post.account_ids,[]);assert.deepEqual(f.store.images.read(f.store.get('MediaAsset',post.media_ids[0]).storage_id),png);}
    assert.equal(f.store.all('PublishJob').length,0);assert.equal(f.store.queuedAttempts().length,0);
    assert.equal(f.store.all('ContentPillar').reduce((n,p)=>n+p.target_percentage,0),100);
    const again=await f.call('strategyApply',{brand_id:f.brand.id,plan});assert.deepEqual(again.map(p=>p.id),posts.map(p=>p.id));assert.equal(f.store.all('Post').length,30);
});

test('URL-only records never count toward the 20-image gate or cause a paid request',async t=>{
    const f=await fixture(t);
    for(const a of f.assets)f.store.autopilot().saveAsset({...a,review:'pending'});
    for(let i=0;i<20;i++)f.store.write('MediaAsset',{brand_id:f.brand.id,name:`missing-${i}.jpg`,file_type:'image',file_url:`https://example.invalid/missing-${i}.jpg`,is_demo:false});
    await assert.rejects(f.call('strategyGenerate',f.input()),/20 stored images/);
    assert.deepEqual(f.counts(),{calls:0,reads:0});assert.equal(f.store.all('Post').length,0);
    // Nineteen genuine private images plus URL-only metadata still do not meet the gate.
    for(let i=0;i<19;i++)f.store.images.upload(f.brand.id,`stored-${i}.png`,'image/png',png);
    await assert.rejects(f.call('strategyGenerate',f.input()),/20 stored images/);
    assert.equal(f.counts().calls,0);
    f.store.images.upload(f.brand.id,'stored-20.png','image/png',png);
    const plan=await f.call('strategyGenerate',f.input());
    assert.equal(plan.posts.length,30);assert.equal(f.counts().calls,1);
    assert.ok(plan.posts.every(p=>p.asset.storage_id&&!p.asset.file_url.includes('example.invalid')));
});

test('simultaneous applies cannot duplicate posts and failed batch transactions roll back images, strategy and posts',async t=>{
    const f=await fixture(t),plan=await f.call('strategyGenerate',f.input());
    const write=f.store.write;let n=0;
    f.store.write=(entity,...args)=>{if(entity==='Post'&&++n===3)throw Error('Injected write failure');return write(entity,...args);};
    await assert.rejects(f.call('strategyApply',{brand_id:f.brand.id,plan}),/Injected/);
    for(const entity of ['Post','MediaAsset','ContentPillar','ContentAngle','PublishJob'])assert.equal(f.store.all(entity).length,0,entity);
    f.store.write=write;
    const [one,two]=await Promise.all([f.call('strategyApply',{brand_id:f.brand.id,plan}),f.call('strategyApply',{brand_id:f.brand.id,plan})]);
    assert.deepEqual(one.map(p=>p.id),two.map(p=>p.id));assert.equal(f.store.all('Post').length,30);
});

test('consent, eligibility and replay checks prevent unintended provider calls',async t=>{
    const f=await fixture(t),input=f.input();
    await assert.rejects(f.call('strategyGenerate',{...input,confirmed:false}));assert.equal(f.counts().calls,0);
    f.store.autopilot().saveAsset({...f.assets[0],review:'pending'});
    await assert.rejects(f.call('strategyGenerate',input),/20/);assert.equal(f.counts().calls,0);
    f.store.autopilot().saveAsset(f.assets[0]);
    await f.call('strategyGenerate',input);
    await assert.rejects(f.call('strategyGenerate',{...input,language:'en'}),/Request changed/);assert.equal(f.counts().calls,1);
    await assert.rejects(seedBrandSampleAssets({brandId:f.brand.id,isDemo:false,appClient:{}}),/demo mode/);
});

test('malformed AI output fails closed and does not retry the paid request',async t=>{
    const f=await fixture(t,{badJson:true}),input=f.input();
    await assert.rejects(f.call('strategyGenerate',input),/invalid plan/);
    await assert.rejects(f.call('strategyGenerate',input),/already submitted/);
    assert.equal(f.counts().calls,1);assert.equal(f.store.all('Post').length,0);
});

test('asset or brand changes during generation and import discard stale work',async t=>{
    let f;f=await fixture(t,{onAi:()=>f.store.autopilot().saveAsset({...f.assets[0],analysis_revision:2})});
    await assert.rejects(f.call('strategyGenerate',f.input()),/changed/);assert.equal(f.store.all('Post').length,0);
    let g;g=await fixture(t,{onRead:()=>g.store.autopilot().saveSource({...g.source,generation:2})});
    const plan=await g.call('strategyGenerate',g.input());
    await assert.rejects(g.call('strategyApply',{brand_id:g.brand.id,plan}),/changed/);assert.equal(g.store.all('Post').length,0);assert.equal(g.store.all('MediaAsset').length,0);
});

test('cross-brand references and invalid pillar-angle pairs are rejected before writes',async t=>{
    const f=await fixture(t),plan=await f.call('strategyGenerate',f.input());
    const other=f.store.write('Brand',{name:'Other'}),foreign=f.store.write('ContentPillar',{brand_id:other.id,name:'Foreign'});
    await assert.rejects(f.call('strategyApply',{brand_id:other.id,plan}),/brand/);
    const altered=structuredClone(plan);altered.posts[0].pillar=foreign;
    await assert.rejects(f.call('strategyApply',{brand_id:f.brand.id,plan:altered}),/pillar/);
    assert.equal(f.store.all('Post').length,0);assert.equal(f.counts().reads,0);
});

test('edited times are stored in UTC, removing an asset works, and unchanged virtual angles remain valid',async t=>{
    const f=await fixture(t),plan=await f.call('strategyGenerate',f.input()),item=plan.posts[0];
    const form={title:item.title,caption:item.caption,reason:item.reason,pillar_id:item.pillar.id,angle_id:item.angle.id,asset_id:'',platform:'facebook',time:'21:15'};
    const edited=editPlanItem(item,form,{brand:f.brand,pillars:[],angles:[],assets:[]});
    assert.equal(edited.asset,null);assert.equal(edited.scheduled_at,'2026-11-02T14:15:00.000Z');
    // Server recomputes UTC, ignoring a forged or stale client timestamp.
    const posts=await f.call('strategyApply',{brand_id:f.brand.id,plan:{...plan,posts:[{...edited,scheduled_at:item.scheduled_at}]}});
    assert.equal(posts[0].scheduled_at,edited.scheduled_at);assert.deepEqual(posts[0].media_ids,[]);
});

test('frequency slots and pillar mix honor explicit zero weights and exclude foreign data',()=>{
    const brand={id:'brand',name:'QA',timezone:'Asia/Ho_Chi_Minh'},assets=[{id:'a',brand_id:'brand',name:'Education product'}];
    for(const [frequency,count]of [['1_per_day',7],['2_per_day',14],['3_per_week',3],['5_per_week',5]]){
        const plan=generateStrategyPlan({brand,assets,pillars:[{id:'p',brand_id:'brand',name:'Education',target_percentage:100},{id:'zero',brand_id:'brand',name:'Promo',target_percentage:0},{id:'foreign',brand_id:'other',name:'Wrong',target_percentage:100}],options:{days:7,frequency,startDate:'2026-11-02'}});
        assert.equal(plan.posts.length,count);assert.ok(plan.posts.every(p=>p.pillar.id==='p'));assert.ok(plan.posts.every(p=>p.caption===''));
    }
});

test('regeneration calls AI, rotates assets and retains the selected date and time',async t=>{
    const f=await fixture(t),plan=await f.call('strategyGenerate',f.input()),item=plan.posts[0];
    const result=await f.call('strategyRegenerate',{brand_id:f.brand.id,plan_id:plan.id,item_id:item.id,request_id:randomUUID(),confirmed:true,language:'vi'});
    assert.equal(result.posts.length,1);assert.equal(result.posts[0].date,item.date);assert.equal(result.posts[0].time,item.time);assert.notEqual(result.posts[0].asset.id,item.asset.id);assert.equal(f.counts().calls,2);
});

test('apply receipts remain idempotent after closing and reopening SQLite',async t=>{
    const path=join(tmpdir(),'socialchoice-phase2-'+randomUUID()+'.sqlite');
    const f=await fixture(t,{dbPath:path}),plan=await f.call('strategyGenerate',f.input());
    const first=await f.call('strategyApply',{brand_id:f.brand.id,plan});f.close();
    const reopened=createStore(path);t.after(()=>{reopened.close();for(const suffix of ['', '-wal', '-shm'])rmSync(path+suffix,{force:true});});
    const service=createAutopilot({store:reopened,auth:{enabled:true},key:f.key,bucket:f.bucket,aiFetch:f.aiFetch,env:{SOCIALCHOICE_AUTOPILOT_ENABLED:'true'}});
    const again=await service.execute('strategyApply',{brand_id:f.brand.id,plan});
    assert.deepEqual(again.map(p=>p.id),first.map(p=>p.id));assert.equal(reopened.all('Post').length,30);assert.equal(f.counts().calls,1);
});
