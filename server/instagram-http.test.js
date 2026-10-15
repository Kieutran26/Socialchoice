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

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=', 'base64');

test('signed Instagram media streams anonymously through Web adapter with HEAD and bounded ranges; private media remains authenticated', async () => {
    const store = createStore(':memory:');
    try {
        const origin = 'https://backend.example';
        const settings = {ready:true,key:randomBytes(32).toString('hex'),mediaOrigin:origin};
        createMetaVault(store,settings.key).save('credential',{token:'http-test-only',pageId:'11',scopes:['instagram_basic','instagram_content_publish']});
        const brand = store.write('Brand',{name:'HTTP fixture'});
        const account = store.verifiedAccount({name:'IG',username:'verified',platform:'instagram',account_type:'profile',external_id:'22',brand_id:brand.id,credential_id:'credential',connection_status:'connected'});
        assert.throws(()=>store.execute('SocialAccount','update',[account.id,{username:'forged'}]),{status:409});
        const asset = store.images.upload(brand.id,'fixture.png','image/png',png);
        const post = store.write('Post',{title:'Draft',brand_id:brand.id,media_ids:[asset.id],account_ids:[account.id]});
        const attempt = {id:randomUUID(),postId:post.id,platform:'instagram',status:'processing',accountId:account.id,pageId:account.external_id,credentialId:account.credential_id,media:[asset]};
        store.saveAttempt(attempt);
        const auth = createAdminAuth(hashPassword('fixture admin password'),true);
        const handler = createHttpHandler({store,auth,meta:{},publisher:null,metaSettings:settings,publicOrigin:'https://app.example',allowedHosts:new Set(['backend.example'])});
        const url = createInstagramMediaAccess(store,settings).url(attempt,asset);
        const call = (target,options) => handleWebRequest(new Request(target,options),handler);
        const full = await call(url);
        assert.equal(full.status,200); assert.equal(full.headers.get('content-type'),'image/png');
        assert.deepEqual(Buffer.from(await full.arrayBuffer()),png);
        const head = await call(url,{method:'HEAD'});
        assert.equal(head.status,200); assert.equal(head.headers.get('content-length'),String(png.length)); assert.equal((await head.arrayBuffer()).byteLength,0);
        const ranged = await call(url,{headers:{Range:'bytes=3-9'}});
        assert.equal(ranged.status,206); assert.equal(ranged.headers.get('content-range'),`bytes 3-9/${png.length}`);
        assert.deepEqual(Buffer.from(await ranged.arrayBuffer()),png.subarray(3,10));
        const suffix = await call(url,{headers:{Range:'bytes=-5'}});
        assert.deepEqual(Buffer.from(await suffix.arrayBuffer()),png.subarray(png.length-5));
        assert.equal((await call(url,{headers:{Range:'bytes=9999-'}})).status,416);
        const forged = new URL(url); forged.searchParams.set('signature','0'.repeat(64));
        assert.equal((await call(forged)).status,403);
        const expired = new URL(url); expired.searchParams.set('expires','1');
        assert.equal((await call(expired)).status,403);
        assert.equal((await call(`${origin}/api/media/files/${asset.storage_id}`)).status,401);
        assert.equal((await call(url,{method:'POST'})).status,405);
        store.saveAttempt({...attempt,status:'published'});
        assert.equal((await call(url)).status,403);
    } finally {store.close();}
});
