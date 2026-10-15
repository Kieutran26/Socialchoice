import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { randomBytes, randomUUID } from 'node:crypto';
import { createStore } from './store.js';
import { createAdminAuth, hashPassword } from './admin-auth.js';
import { createHttpHandler } from './http-handler.js';
import { handleWebRequest } from './web-request-adapter.js';
import { createInstagramMediaAccess } from './instagram-media-access.js';
import { createMetaVault } from './meta-vault.js';
import { createThreadsConnection } from './threads-connection.js';

test('Threads HTTP routes require admin session and expose truthful unconfigured status', async () => {
    const store=createStore(':memory:'),auth=createAdminAuth(hashPassword('synthetic http admin password'),true);
    const config={ready:false,missing:['appId','appSecret','redirectUri','key']};
    const handler=createHttpHandler({store,auth,meta:{},threads:createThreadsConnection(store,auth,config),publisher:null,metaSettings:{ready:false},threadsSettings:config,publicOrigin:'https://app.example',allowedHosts:new Set(['backend.example'])});
    const call=(path,options={})=>handleWebRequest(new Request(`https://backend.example/api/threads/${path}`,options),handler);
    let cookie;auth.login({headers:{}},{setHeader(_,value){cookie=value.split(';')[0];}},'synthetic http admin password');
    const headers={'X-Socialchoice-Client':'local-ui',Cookie:cookie,'Content-Type':'application/json'};
    try {
        assert.equal((await call('status',{headers:{'X-Socialchoice-Client':'local-ui'}})).status,401);
        const status=await call('status',{headers});assert.equal(status.status,200);assert.equal((await status.json()).ready,false);
        const profile=await call('profile',{headers});assert.deepEqual(await profile.json(),{profile:null,pending:false});
        assert.equal((await call('start',{method:'POST',headers,body:JSON.stringify({args:['synthetic-brand']})})).status,409);
        assert.equal((await call('callback?state=invalid&code=synthetic',{headers:{'Sec-Fetch-Site':'cross-site'}})).status,409);
        assert.equal((await call('import',{method:'POST',headers,body:JSON.stringify({args:['789']})})).status,409);
    }finally{store.close();}
});

test('Threads signed media works with Facebook unconfigured and enforces expiry, identity, HEAD/ranges and private authentication',async()=>{
    const store=createStore(':memory:');
    try{
        const origin='https://backend.example',threads={ready:true,key:randomBytes(32).toString('hex'),mediaOrigin:origin},meta={ready:false};
        const brand=store.write('Brand',{name:'Synthetic HTTP brand'}),scopes=['threads_basic','threads_content_publish'];
        const account=store.verifiedAccount({name:'Synthetic Threads',username:'synthetic',platform:'threads',account_type:'profile',external_id:'789',brand_id:brand.id,credential_id:'threads-credential',scopes,connection_status:'connected'});
        assert.throws(()=>store.execute('SocialAccount','update',[account.id,{username:'forged'}]),{status:409});
        const vault=createMetaVault(store,threads.key),credential={platform:'threads',profileId:'789',token:'synthetic-only',scopes,expiresAt:Date.now()+60000};vault.save('threads-credential',credential);
        const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=','base64');
        const asset=store.images.upload(brand.id,'synthetic.png','image/png',png),post=store.write('Post',{title:'Synthetic',brand_id:brand.id,media_ids:[asset.id],account_ids:[account.id]});
        const attempt={id:randomUUID(),postId:post.id,platform:'threads',status:'processing',accountId:account.id,pageId:account.external_id,credentialId:account.credential_id,media:[asset]};store.saveAttempt(attempt);
        const auth=createAdminAuth(hashPassword('synthetic http admin password'),true);
        const handler=createHttpHandler({store,auth,meta:{},publisher:null,metaSettings:meta,threadsSettings:threads,publicOrigin:'https://app.example',allowedHosts:new Set(['backend.example'])});
        const url=createInstagramMediaAccess(store,meta,threads).url(attempt,asset),call=(target,options)=>handleWebRequest(new Request(target,options),handler);
        const full=await call(url);assert.equal(full.status,200);assert.deepEqual(Buffer.from(await full.arrayBuffer()),png);
        const head=await call(url,{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),String(png.length));assert.equal((await head.arrayBuffer()).byteLength,0);
        const range=await call(url,{headers:{Range:'bytes=2-8'}});assert.equal(range.status,206);assert.deepEqual(Buffer.from(await range.arrayBuffer()),png.subarray(2,9));
        assert.equal((await call(url,{headers:{Range:'bytes=900-'}})).status,416);
        assert.equal((await call(`${origin}/api/media/files/${asset.storage_id}`)).status,401);
        const forged=new URL(url);forged.searchParams.set('signature','0'.repeat(64));assert.equal((await call(forged)).status,403);
        vault.save('threads-credential',{...credential,expiresAt:Date.now()-1});assert.equal((await call(url)).status,403);
        vault.save('threads-credential',credential);store.saveAttempt({...attempt,status:'published'});assert.equal((await call(url)).status,403);
    }finally{store.close();}
});
