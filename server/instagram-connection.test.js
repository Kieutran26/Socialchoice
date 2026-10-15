import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createStore } from './store.js';
import { createMetaConnection } from './meta-connection.js';
import { createMetaGraph } from './meta-graph.js';
import { createMetaVault } from './meta-vault.js';

const config = () => ({ ready: true, missing: [], key: randomBytes(32).toString('hex'), appId: '123', appSecret: 'test', version: 'v25.0', origin: 'http://127.0.0.1:3001', redirectUri: 'http://127.0.0.1:3001/api/meta/callback' });
const auth = { enabled: true, sessionKey: () => 'session', sessionActive: () => true };
const res = { setHeader() {}, writeHead() {}, end() {} };

test('Instagram selection exposes safe identities and imports independent protected credentials', async () => {
    const store = createStore(':memory:'); const c = config(); const pending = new Map();
    try {
        const brand = store.write('Brand', { name: 'Live' });
        const fb = store.verifiedAccount({ name: 'Page', external_id: '11', platform: 'facebook', brand_id: brand.id, credential_id: 'fb-key', connection_status: 'connected' });
        const vault = createMetaVault(store, c.key); vault.save('fb-key', { token: 'fb-private' });
        pending.set('session', { platform: 'instagram', brandId: brand.id, profile: { id: '99', name: 'Owner' }, scopes: ['instagram_basic','instagram_content_publish'], pages: [{ id: '22', name: 'test_ig', username: 'test_ig', pageId: '11', pageName: 'Page', access_token: 'ig-private' }], expires: Date.now()+10000 });
        const connection = createMetaConnection(store, auth, c, { pending });
        const visible = await connection.execute('pages', { headers: {} }, res);
        assert.equal(visible.platform, 'instagram'); assert.equal(JSON.stringify(visible).includes('ig-private'), false);
        await assert.rejects(connection.execute('import', { headers: {} }, res, [['forged']]), { status: 400 });
        await connection.execute('import', { headers: {} }, res, [['22']]);
        const ig = store.all('SocialAccount').find(a => a.platform === 'instagram');
        assert.equal(ig.account_type, 'profile'); assert.notEqual(ig.credential_id, fb.credential_id);
        assert.equal(vault.read(ig.credential_id).pageId, '11');
        assert.throws(() => store.execute('SocialAccount', 'update', [ig.id, { external_id: '33' }]), { status: 409 });
        await connection.execute('disconnect', { headers: {} }, res, [ig.id]);
        assert.equal(vault.read(fb.credential_id).token, 'fb-private');
    } finally { store.close(); }
});

test('Instagram start opts into Facebook Login scopes; discovery only selects linked verified identities', async () => {
    const store = createStore(':memory:'); const original = globalThis.fetch;
    try {
        const c = config(); const brand = store.write('Brand', { name: 'Live' });
        const connection = createMetaConnection(store, auth, c);
        const started = await connection.execute('start', { headers: {} }, res, [brand.id, 'instagram']);
        const url = new URL(started.url); assert.equal(url.hostname, 'www.facebook.com');
        assert.ok(url.searchParams.get('scope').includes('instagram_content_publish'));
        let fields;
        globalThis.fetch = async url => {
            const u = new URL(url); let body;
            if (u.pathname.endsWith('/me')) body = { id: '99', name: 'Owner' };
            else if (u.pathname.endsWith('/me/permissions')) body = { data: ['pages_show_list','pages_read_engagement','instagram_basic','instagram_content_publish'].map(permission => ({ permission, status: 'granted' })) };
            else { fields = u.searchParams.get('fields'); body = { data: [{id:'11',name:'Page',access_token:'private',instagram_business_account:{id:'22',username:'linked'}},{id:'12',name:'Unlinked',access_token:'private'}] }; }
            return new Response(JSON.stringify(body));
        };
        const found = await createMetaGraph(c).discover('user-private', 'instagram');
        assert.ok(fields.includes('instagram_business_account')); assert.equal(found.pages.length, 1); assert.equal(found.pages[0].pageId, '11');
    } finally { globalThis.fetch = original; store.close(); }
});

test('permission denial and changed Page linkage do not falsely expire Instagram connection', async () => {
    const store = createStore(':memory:'); const original = globalThis.fetch;
    try {
        const c = config(); const brand = store.write('Brand', { name: 'Live' });
        const account = store.verifiedAccount({ name:'IG',platform:'instagram',account_type:'profile',external_id:'22',brand_id:brand.id,credential_id:'ig-key',connection_status:'connected' });
        createMetaVault(store,c.key).save('ig-key',{token:'private',pageId:'11'});
        const connection = createMetaConnection(store,auth,c);
        globalThis.fetch = async () => new Response(JSON.stringify({ error:{code:200} }),{status:403});
        await assert.rejects(connection.execute('check',{headers:{}},res,[account.id]),{status:409});
        assert.equal(store.get('SocialAccount',account.id).connection_status,'connected');
        globalThis.fetch = async () => new Response(JSON.stringify({id:'11',instagram_business_account:{id:'33',username:'other'}}));
        await assert.rejects(connection.execute('check',{headers:{}},res,[account.id]),{status:409});
        assert.equal(store.get('SocialAccount',account.id).connection_status,'connected');
        globalThis.fetch = async () => new Response(JSON.stringify({error:{code:190}}),{status:400});
        await assert.rejects(connection.execute('check',{headers:{}},res,[account.id]),{status:409});
        assert.equal(store.get('SocialAccount',account.id).connection_status,'expired');
    } finally { globalThis.fetch = original; store.close(); }
});

test('a stale Instagram access check cannot update or expire a reconnected credential', async () => {
    const store = createStore(':memory:'); const original = globalThis.fetch;
    try {
        const c = config(); const brand = store.write('Brand', { name:'Live' });
        const account = store.verifiedAccount({name:'IG',platform:'instagram',account_type:'profile',external_id:'22',brand_id:brand.id,credential_id:'old',connection_status:'connected'});
        const vault = createMetaVault(store,c.key); vault.save('old',{token:'old-private',pageId:'11'});
        let release;
        globalThis.fetch = () => new Promise(resolve => { release = resolve; });
        const check = createMetaConnection(store,auth,c).execute('check',{headers:{}},res,[account.id]);
        vault.save('new',{token:'new-private',pageId:'11'});
        store.verifiedAccount({credential_id:'new',connection_status:'connected'},account.id);
        release(new Response(JSON.stringify({error:{code:190}}),{status:400}));
        await assert.rejects(check,{status:409});
        assert.equal(store.get('SocialAccount',account.id).credential_id,'new');
        assert.equal(store.get('SocialAccount',account.id).connection_status,'connected');
    } finally {globalThis.fetch=original;store.close();}
});
