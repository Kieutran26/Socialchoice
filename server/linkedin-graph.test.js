import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinkedinGraph, linkedinProfile, linkedinTokenDetails, linkedinPublishedId } from './linkedin-graph.js';

test('LinkedIn rejects wrong app, missing scopes, expired token and malformed identities', () => {
    const data = { active: true, client_id: 'abc123', auth_type: '3L', scope: 'openid,profile,w_member_social', expires_at: Math.floor(Date.now()/1000)+3600 };
    assert.equal(linkedinTokenDetails(data,'abc123').scopes.length,3);
    assert.equal(linkedinTokenDetails({ ...data, auth_type: 'AUTHORIZED_USER' }, 'abc123').scopes.length, 3);
    for (const patch of [{active:false},{client_id:'other'},{scope:'openid profile'},{expires_at:1},{auth_type:'2L'}]) assert.throws(()=>linkedinTokenDetails({...data,...patch},'abc123'));
    assert.equal(linkedinProfile({sub:'member_123',name:'Test Member'}).id,'member_123');
    assert.equal(linkedinProfile({sub:'member_123',given_name:'Test',family_name:'Member'}).username,'Test Member');
    assert.throws(()=>linkedinProfile({sub:'../person',name:'Test'}));
    assert.throws(()=>linkedinPublishedId('123'));
    assert.equal(linkedinPublishedId('urn:li:ugcPost:123').id,'urn:li:ugcPost:123');
});
test('LinkedIn Graph pins credential recipients, checks upload host, status path and publication acknowledgement', async () => {
    const original=globalThis.fetch, calls=[];
    const graph=createLinkedinGraph({appId:'abc123',appSecret:'synthetic-private',redirectUri:'https://app.example/api/linkedin/callback'});
    try {
        globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options});return new Response('',{status:201,headers:{'x-restli-id':'urn:li:ugcPost:789'}});};
        const result=await graph.publish('member_id','Exact caption',[],false,'synthetic-token');
        assert.equal(result.id,'urn:li:ugcPost:789');
        const body=JSON.parse(calls[0].options.body);assert.equal(body.author,'urn:li:person:member_id');assert.equal(body.visibility['com.linkedin.ugc.MemberNetworkVisibility'],'PUBLIC');
        await assert.rejects(()=>graph.upload('https://evil.example/mediaUpload/test',Buffer.from('test'),'synthetic-token'));
        assert.equal(calls.length,1);
        globalThis.fetch=async(url)=>{assert.equal(String(url),'https://api.linkedin.com/v2/assets/asset_123');return Response.json({id:'asset_123',status:'ALLOWED',recipes:[{status:'AVAILABLE'}]});};
        assert.equal(await graph.assetStatus('urn:li:digitalmediaAsset:asset_123','token'),'ready');
        globalThis.fetch=async()=>new Response('',{status:201});await assert.rejects(()=>graph.publish('member_id','text',[],false,'token'));
        globalThis.fetch=async()=>Response.json({value:{asset:'urn:li:digitalmediaAsset:test',uploadMechanism:{'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest':{uploadUrl:'https://evil.example/mediaUpload/test'}}}});
        await assert.rejects(()=>graph.register('member_id',false,'token'));
    } finally {globalThis.fetch=original;}
});

test('LinkedIn Graph formats organization/member mentions into shareCommentary and socialActions comment attributes and supports Company Page author', async () => {
    const original = globalThis.fetch;
    const calls = [];
    const graph = createLinkedinGraph({ appId: 'abc123', appSecret: 'synthetic-private', redirectUri: 'https://app.example/api/linkedin/callback' });
    try {
        globalThis.fetch = async (url, options) => {
            calls.push({ url: String(url), options });
            return new Response('', { status: 201, headers: { 'x-restli-id': 'urn:li:ugcPost:999001' } });
        };
        const result = await graph.publish(
            '888999',
            'Big update with @[Acme Corp](urn:li:organization:12345) and @[Jane Doe](urn:li:person:member_42)!',
            [],
            false,
            'synthetic-token',
            'page'
        );
        assert.equal(result.id, 'urn:li:ugcPost:999001');
        const postBody = JSON.parse(calls[0].options.body);
        assert.equal(postBody.author, 'urn:li:organization:888999');
        const commentary = postBody.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary;
        assert.equal(commentary.text, 'Big update with Acme Corp and Jane Doe!');
        assert.deepEqual(commentary.attributes, [
            {
                start: 16,
                length: 9,
                value: { 'com.linkedin.common.CompanyAttributedEntity': { company: 'urn:li:organization:12345' } },
            },
            {
                start: 30,
                length: 8,
                value: { 'com.linkedin.common.MemberAttributedEntity': { member: 'urn:li:person:member_42' } },
            },
        ]);

        const commentRes = await graph.publishComment(
            'urn:li:organization:888999',
            'urn:li:ugcPost:999001',
            'Replying from @[Acme Corp](urn:li:organization:888999)',
            'synthetic-token'
        );
        assert.equal(commentRes.id, 'urn:li:ugcPost:999001');
        const commentBody = JSON.parse(calls[1].options.body);
        assert.equal(commentBody.actor, 'urn:li:organization:888999');
        assert.equal(commentBody.message.text, 'Replying from Acme Corp');
        assert.deepEqual(commentBody.message.attributes, [
            {
                start: 14,
                length: 9,
                value: { 'com.linkedin.common.CompanyAttributedEntity': { company: 'urn:li:organization:888999' } },
            },
        ]);
    } finally {
        globalThis.fetch = original;
    }
});
