import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { randomBytes } from 'node:crypto';
import { createStore } from './store.js';
import { createApi } from './index.js';
import { hashPassword } from './admin-auth.js';
import { createMetaVault } from './meta-vault.js';
import { createFacebookPublisher, canFinishPublication } from './facebook-publisher.js';
import { validateImage, MAX_IMAGE_BYTES } from './image-storage.js';

export const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=', 'base64');

test('late results cannot downgrade terminal status or settle another operation', () => {
    const operation = {id:'attempt',startedAt:123};
    assert.equal(canFinishPublication({...operation,status:'published'},operation,'failed',false),false);
    assert.equal(canFinishPublication({...operation,status:'processing'},operation,'published',false),false);
    assert.equal(canFinishPublication({...operation,status:'unknown'},operation,'published',true),true);
    assert.equal(canFinishPublication({...operation,status:'unknown'},operation,'failed',false),false);
    assert.equal(canFinishPublication({...operation,status:'processing'},{...operation,startedAt:122},'published',true),false);
});

test('image signatures, bounds and private chunks are validated; referenced immutable files cannot be altered or deleted', () => {
    const store = createStore(':memory:');
    try {
        const brand = store.write('Brand', { name: 'Image fixture' });
        assert.deepEqual(validateImage(png,'image/png'), { width:1, height:1 });
        assert.throws(() => validateImage(png,'image/jpeg'), /valid JPEG/);
        assert.throws(() => validateImage(Buffer.alloc(MAX_IMAGE_BYTES+1),'image/png'), /3 MiB/);
        assert.throws(() => validateImage(Buffer.from('<svg></svg>'),'image/svg+xml'), /valid JPEG/);
        const image = store.images.upload(brand.id,'ảnh.png','image/png',png);
        assert.deepEqual(store.images.read(image.storage_id),png);
        assert.equal(image.sha256.length,64);
        assert.throws(() => store.execute('ImageChunk','list',[]), /server-only/);
        assert.throws(() => store.write('MediaAsset',{file_url:'https://evil.invalid/replace'},image.id), /server-owned/);
        assert.throws(() => store.write('MediaAsset',{name:'forged',file_url:'/api/media/files/anything',storage_id:'forged'}), /server-owned/);
        const post = store.write('Post',{title:'Stored image draft',brand_id:brand.id,media_ids:[image.id]});
        assert.throws(() => store.remove('MediaAsset',image.id), /history/);
        store.remove('Post',post.id);
        store.remove('MediaAsset',image.id);
        assert.throws(() => store.images.read(image.storage_id), /not found/);
    } finally { store.close(); }
});

test('raw image upload and preview require authenticated same-origin requests', async () => {
    const password = 'image-test-admin-passphrase';
    const {server,store} = createApi({dbPath:':memory:',passwordHash:hashPassword(password)});
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    const brand = store.write('Brand',{name:'HTTP image fixture'});
    try {
        const login = await fetch(url+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-Socialchoice-Client':'local-ui'},body:JSON.stringify({args:[password]})});
        const cookie = login.headers.get('set-cookie').split(';')[0];
        const headers = {'Content-Type':'image/png','X-Socialchoice-Client':'local-ui','X-Image-Brand':brand.id,'X-Image-Name':encodeURIComponent('ảnh.png')};
        assert.equal((await fetch(url+'/api/media/upload',{method:'POST',headers,body:png})).status,401);
        const uploaded = await fetch(url+'/api/media/upload',{method:'POST',headers:{...headers,cookie},body:png});
        assert.equal(uploaded.status,200,await uploaded.clone().text());
        const asset = await uploaded.json();
        assert.equal((await fetch(url+asset.file_url)).status,401);
        const image = await fetch(url+asset.file_url,{headers:{cookie}});
        assert.equal(image.headers.get('content-type'),'image/png');
        assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
        assert.equal((await fetch(url+asset.file_url,{headers:{cookie,'Sec-Fetch-Site':'cross-site'}})).status,403);
        const forged = await fetch(url+'/api/media/upload',{method:'POST',headers:{...headers,cookie},body:Buffer.from('not an image')});
        assert.equal(forged.status,400);
    } finally { await new Promise(resolve => server.close(resolve)); }
});

test('photo review freezes selected image order and a claimed uncertain upload is never repeated', async () => {
    const store = createStore(':memory:');
    try {
        const brand = store.write('Brand',{name:'Photo fixture'});
        const scopes = ['pages_manage_posts'];
        const config = {ready:true,key:randomBytes(32).toString('hex'),version:'v26.0',appSecret:'test-only'};
        createMetaVault(store,config.key).save('unit-photo-token',{token:'not-a-live-token',scopes,tasks:['CREATE_CONTENT']});
        const account = store.verifiedAccount({name:'Fixture',brand_id:brand.id,external_id:'123456',platform:'facebook',account_type:'page',connection_status:'connected',credential_id:'unit-photo-token',scopes});
        const images = ['a.png','b.png'].map(name => store.images.upload(brand.id,name,'image/png',png));
        const post = store.write('Post',{title:'Photo fixture',caption:'Exact caption',brand_id:brand.id,account_ids:[account.id],media_ids:images.map(image=>image.id)});
        const publisher = createFacebookPublisher(store,config,{wake:async()=>{}});
        const review = publisher.prepare(post.id);
        assert.deepEqual(review.media.map(image=>image.name),['a.png','b.png']);
        store.write('Post',{media_ids:images.map(image=>image.id).reverse()},post.id);
        await assert.rejects(()=>publisher.publish(review.attemptId), /changed/);
        const next = publisher.prepare(post.id);
        // Claim the actual local workflow, but do not run the alarm or call Meta.
        assert.equal((await publisher.publish(next.attemptId)).status,'processing');
        store.saveAttempt({...store.attempt(next.attemptId),busy:true,startedAt:0});
        await publisher.runPhotos();
        assert.equal(publisher.status(next.attemptId).status,'unknown');
        await publisher.runPhotos();
        assert.equal((await publisher.publish(next.attemptId)).status,'unknown');
        assert.equal(store.all('PublishJob').length,1);
        assert.equal(store.all('PublishingLog').length,1);
        assert.equal(store.all('PublishJob')[0].external_post_id,undefined);
    } finally { store.close(); }
});
