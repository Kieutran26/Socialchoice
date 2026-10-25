import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyGrant } from './verify-grant.mjs';
import { checkGrant } from './check-grant.mjs';

const now = 1800000000000;
const config = { id: '12345', secret: 'fixture-secret', version: 'v24.0' };
const expires = now / 1000 + 3600;
const scopes = ['pages_show_list', 'pages_manage_posts', 'pages_read_engagement', 'instagram_basic', 'instagram_content_publish'];
function fixture(provider, changes = {}) {
  return async (input, options) => {
    const url = new URL(input);
    assert.equal(options.redirect, 'error');
    assert.ok(['graph.facebook.com','graph.threads.net','www.linkedin.com','api.linkedin.com','open.tiktokapis.com'].includes(url.hostname));
    const route = url.pathname.split('/').at(-1);
    if (route === 'debug_token') return Response.json({ data: { is_valid: true, app_id: config.id, user_id: '123', scopes: provider === 'threads' ? ['threads_basic','threads_content_publish'] : scopes, expires_at: expires, ...changes } });
    if (route === 'me') return Response.json({ id: '123', name: 'Fixture User', username: 'fixture_user' });
    if (route === 'accounts') return Response.json({ data: [{ id: '555', name: 'Fixture Page', access_token: 'fixture-page-token', tasks: ['CREATE_CONTENT'], instagram_business_account: { id: '777', username: 'fixture_ig' } }], ...changes });
    if (route === 'introspectToken') return Response.json({ active: true, auth_type: '3L', client_id: config.id, scope: 'openid profile w_member_social', expires_at: expires, ...changes });
    if (route === 'userinfo') return Response.json({ sub: '123', name: 'Fixture Member' });
    if (url.pathname.includes('/user/info/')) return Response.json({ error: { code: 'ok' }, data: { user: { open_id: '123', display_name: 'Fixture Creator', ...changes } } });
    if (route === '555') return Response.json({ id: '555', instagram_business_account: { id: '777' } });
    throw new Error(`Unexpected fixture endpoint: ${url.pathname}`);
  };
}

test('Facebook and Instagram discovery verifies identity, scopes, tasks, linked account and per-Page proof', async () => {
  for (const provider of ['facebook','instagram']) {
    const value = await verifyGrant(provider, config, { access_token: 'fixture-user-token' }, fixture(provider), now);
    assert.equal(value.profileName, 'Fixture User');
    assert.equal(value.destinations[0].id, provider === 'instagram' ? '777' : '555');
    assert.equal(value.destinations[0].token, 'fixture-page-token');
    assert.equal(value.destinations[0].appsecretProof, createHmac('sha256',config.secret).update('fixture-page-token').digest('hex'));
    for (const changes of [{ app_id: 'other' }, { user_id: 'other' }, { scopes: [] }, { is_valid: false }, { expires_at: now/1000 }]) await assert.rejects(verifyGrant(provider, config, { access_token: 'fixture' }, fixture(provider,changes), now));
  }
  await assert.rejects(verifyGrant('facebook',config,{access_token:'fixture'},fixture('facebook',{paging:{next:'https://evil.example',cursors:{}}}),now));
});

test('Threads and LinkedIn require matching active app, profile identity, permissions and expiry', async () => {
  for (const provider of ['threads','linkedin']) {
    const value = await verifyGrant(provider,config,{access_token:'fixture',user_id:'123'},fixture(provider),now);
    assert.equal(value.destinations[0].id,'123');
    for (const changes of provider === 'threads' ? [{app_id:'other'},{user_id:'other'},{scopes:[]},{expires_at:0}] : [{client_id:'other'},{active:false},{scope:'openid profile'},{auth_type:'2L'},{expires_at:0}]) await assert.rejects(verifyGrant(provider,config,{access_token:'fixture',user_id:'123'},fixture(provider,changes),now));
  }
});

test('TikTok confirms open ID and required grant scopes, never assumes the username', async () => {
  const grant={access_token:'fixture',open_id:'123',scope:'user.info.basic,video.publish',expires_in:3600};
  const value=await verifyGrant('tiktok',config,grant,fixture('tiktok'),now);
  assert.equal(value.destinations[0].name,'Fixture Creator');assert.equal(value.destinations[0].username,undefined);
  await assert.rejects(verifyGrant('tiktok',config,{...grant,scope:'user.info.basic'},fixture('tiktok'),now));
  await assert.rejects(verifyGrant('tiktok',config,grant,fixture('tiktok',{open_id:'other'}),now));
});

test('checking a saved Meta credential confirms current app/scopes and destination linkage', async () => {
  const input={provider:'instagram',id:'777',pageId:'555',token:'fixture-page-token',appsecretProof:'a'.repeat(64)};
  assert.deepEqual(await checkGrant('instagram',config,input,fixture('instagram')),{checked:true,id:'777'});
  await assert.rejects(checkGrant('instagram',config,{...input,id:'999'},fixture('instagram')));
  await assert.rejects(checkGrant('instagram',config,input,fixture('instagram',{scopes:[]})));
  await assert.rejects(checkGrant('instagram',config,input,fixture('instagram',{scopes:scopes.filter(scope=>scope!=='pages_show_list')})),{invalidGrant:true});
  await assert.rejects(checkGrant('instagram',config,input,fixture('instagram',{scopes:scopes.join(' ')})));
  await assert.rejects(checkGrant('instagram',config,input,fixture('instagram',{expires_at:undefined})));
  await assert.rejects(checkGrant('instagram',config,{...input,arbitraryUrl:'https://evil.example'},fixture('instagram')));
});

test('TikTok access check requires current video.publish access, not just profile access', async () => {
  const input={provider:'tiktok',id:'123',token:'fixture'};
  const provider=async (url,options)=>{
    if(!url.includes('/creator_info/'))return fixture('tiktok')(url,options);
    assert.equal(options.method,'POST');assert.equal(options.headers['Content-Type'],'application/json; charset=utf-8');assert.equal(options.body,'{}');
    return Response.json({error:{code:'ok'},data:{creator_nickname:'Fixture',privacy_level_options:['SELF_ONLY']}});
  };
  assert.deepEqual(await checkGrant('tiktok',config,input,provider),{checked:true,id:'123'});
  await assert.rejects(checkGrant('tiktok',config,input,async (url,options)=>url.includes('/creator_info/')?Response.json({error:{code:'scope_not_authorized'}},{status:403}):fixture('tiktok')(url,options)),{invalidGrant:true});
});
