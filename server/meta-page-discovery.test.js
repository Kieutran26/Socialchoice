import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverGrantedPages, hasVerifiedPagePublishGrant } from './meta-page-discovery.js';
import { createMetaGraph } from './meta-graph.js';
import { createStore } from './store.js';
import { createMetaVault } from './meta-vault.js';
import { createFacebookPublisher } from './facebook-publisher.js';
import { randomBytes } from 'node:crypto';

function fixture() {
    const config = { appId: '123', appSecret: 'fixture-secret' }, profile = { id: '456', name: 'Fixture' };
    const scopes = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'];
    const grant = type => ({ is_valid: true, type, app_id: config.appId, user_id: profile.id, ...(type === 'PAGE' ? { profile_id: '789' } : {}), scopes, granular_scopes: scopes.map(scope => ({ scope, target_ids: ['789'] })), expires_at: Math.floor(Date.now() / 1000) + 3600 });
    const user = grant('USER'), page = grant('PAGE'), calls = [];
    const request = async (path, params, token) => {
        calls.push({ path, params, token });
        if (path === 'debug_token') return { data: params.input_token === 'fixture-user-token' ? user : page };
        assert.equal(path, '789'); assert.equal(token, 'fixture-user-token');
        return { id: '789', name: 'Fixture Page', access_token: 'fixture-page-token' };
    };
    return { config, profile, user, page, request, calls };
}

test('empty enumeration recovers only provider-granted Page IDs with independently verified tokens', async () => {
    const value = fixture();
    const pages = await discoverGrantedPages(value.request, value.config, 'fixture-user-token', value.profile, 'id,name,access_token');
    assert.equal(pages.length, 1); assert.deepEqual(pages[0].tasks, []);
    const credential = { token: pages[0].access_token, profileId: value.profile.id, pageGrant: pages[0].pageGrant }, account = { external_id: pages[0].id };
    assert.equal(hasVerifiedPagePublishGrant(credential, account, value.config), true);
    for (const changed of [{ ...credential, token: 'changed-token' }, { ...credential, profileId: 'other' }, { ...credential, pageGrant: { ...credential.pageGrant, expiresAt: Date.now() - 1 } }]) assert.equal(hasVerifiedPagePublishGrant(changed, account, value.config), false);
    assert.equal(hasVerifiedPagePublishGrant(credential, { external_id: 'other' }, value.config), false);
    assert.equal(hasVerifiedPagePublishGrant(credential, account, { appId: 'other' }), false);
    assert.equal(value.calls.length, 3);
});

test('missing scoped publishing consent never becomes an invented content task', async () => {
    const value = fixture(); value.user.granular_scopes = [{ scope: 'pages_show_list', target_ids: ['789'] }];
    const [page] = await discoverGrantedPages(value.request, value.config, 'fixture-user-token', value.profile, 'id,name,access_token');
    assert.equal(page.pageGrant.publishing, false); assert.deepEqual(page.tasks, []);
    assert.equal(hasVerifiedPagePublishGrant({ token: page.access_token, profileId: value.profile.id, pageGrant: page.pageGrant }, { external_id: page.id }, value.config), false);
    value.user.granular_scopes = [];
    assert.deepEqual(await discoverGrantedPages(value.request, value.config, 'fixture-user-token', value.profile, 'id,name,access_token'), []);
});

test('wrong app, identity, token type, expired tokens and invalid target IDs fail closed', async () => {
    for (const mutation of [value => { value.page.app_id = '999'; }, value => { value.page.profile_id = '999'; }, value => { value.page.user_id = '999'; }, value => { value.page.type = 'USER'; }, value => { value.page.is_valid = false; }, value => { value.page.expires_at = 1; }, value => { value.user.granular_scopes[0].target_ids = ['../invalid']; }]) {
        const value = fixture(); mutation(value);
        await assert.rejects(() => discoverGrantedPages(value.request, value.config, 'fixture-user-token', value.profile, 'id,name,access_token'));
    }
});

test('Graph discovery uses the verified fallback and publisher accepts only its token-bound grant', async t => {
    const value = fixture(), calls = [];
    const config = { ...value.config, ready: true, key: randomBytes(32).toString('hex'), version: 'v26.0' };
    t.mock.method(globalThis, 'fetch', async (input, options) => {
        const url = new URL(input); assert.equal(url.origin, 'https://graph.facebook.com'); calls.push(url.pathname);
        let result;
        if (url.pathname.endsWith('/me')) result = value.profile;
        else if (url.pathname.endsWith('/me/permissions')) result = { data: value.user.scopes.map(permission => ({ permission, status: 'granted' })) };
        else if (url.pathname.endsWith('/me/accounts')) result = { data: [] };
        else if (url.pathname.endsWith('/debug_token')) {
            assert.equal(options.headers.Authorization, 'Bearer 123|fixture-secret');
            result = { data: url.searchParams.get('input_token') === 'fixture-user-token' ? value.user : value.page };
        } else { assert.equal(url.pathname, '/v26.0/789'); result = { id: '789', name: 'Fixture Page', access_token: 'fixture-page-token' }; }
        return Response.json(result);
    });
    const discovered = await createMetaGraph(config).discover('fixture-user-token');
    assert.equal(discovered.pages.length, 1); assert.equal(calls.length, 6);
    const store = createStore(':memory:');
    try {
        const page = discovered.pages[0], brand = store.write('Brand', { name: 'Fixture' });
        const credential = { token: page.access_token, profileId: value.profile.id, scopes: value.user.scopes, tasks: page.tasks, pageGrant: page.pageGrant };
        const vault = createMetaVault(store, config.key); vault.save('fixture-credential', credential);
        const account = store.verifiedAccount({ name: page.name, external_id: page.id, platform: 'facebook', account_type: 'page', brand_id: brand.id, scopes: value.user.scopes, credential_id: 'fixture-credential', connection_status: 'connected' });
        const post = store.write('Post', { title: 'Fixture', caption: 'Fixture caption', brand_id: brand.id, account_ids: [account.id] });
        const publisher = createFacebookPublisher(store, config), prepared = publisher.prepare(post.id);
        assert.equal(prepared.status, 'prepared'); assert.doesNotMatch(JSON.stringify(prepared), /fixture-page-token|tokenDigest|pageGrant/);
        assert.equal(store.all('PublishJob').length, 0); assert.equal(store.get('Post', post.id).status, 'draft');
        vault.save('fixture-credential', { ...credential, token: 'different-token' });
        assert.throws(() => publisher.prepare(post.id), /permission to create content/);
    } finally { store.close(); }
});
