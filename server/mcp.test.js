import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createApi } from './index.js';

function pkceChallenge(verifier) {
    return createHash('sha256').update(verifier).digest('base64url');
}

test('MCP OAuth 2.1 + Streamable HTTP tools end-to-end', async (t) => {
    const { server, store } = createApi({ dbPath: ':memory:' });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;
    t.after(() => server.close());

    // Seed a Brand, SocialAccount, ContentPillar, and ContentAngle
    const brand = store.write('Brand', {
        name: 'SocialChoice Coffee',
        description: 'Specialty coffee brand',
        timezone: 'Asia/Ho_Chi_Minh',
        tone_of_voice: 'Warm, inspiring',
    });
    const account = store.verifiedAccount({
        brand_id: brand.id,
        name: 'SocialChoice Coffee Fanpage',
        platform: 'facebook',
        account_type: 'page',
        external_id: 'fb_page_123',
        credential_id: 'cred_123',
        connection_status: 'connected',
    });
    const pillar = store.write('ContentPillar', {
        brand_id: brand.id,
        name: 'Brewing Guides',
        target_percentage: 50,
    });
    const angle = store.write('ContentAngle', {
        brand_id: brand.id,
        pillar_id: pillar.id,
        name: 'Morning V60 Routine',
    });

    // 1. Metadata discovery
    const resourceMetaRes = await fetch(`${base}/.well-known/oauth-protected-resource`);
    assert.equal(resourceMetaRes.status, 200);
    const resourceMeta = await resourceMetaRes.json();
    assert.equal(resourceMeta.resource, `${base}/mcp`);

    const oauthMetaRes = await fetch(`${base}/.well-known/oauth-authorization-server`);
    assert.equal(oauthMetaRes.status, 200);
    const oauthMeta = await oauthMetaRes.json();
    assert.equal(oauthMeta.registration_endpoint, `${base}/api/mcp/register`);
    assert.equal(oauthMeta.authorization_endpoint, `${base}/api/mcp/authorize`);
    assert.equal(oauthMeta.token_endpoint, `${base}/api/mcp/token`);

    // 2. Unauthenticated /mcp returns 401 + WWW-Authenticate
    const unauthRes = await fetch(`${base}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    });
    assert.equal(unauthRes.status, 401);
    assert.match(unauthRes.headers.get('www-authenticate') || '', /resource_metadata=/);

    // 3. Dynamic Client Registration
    const regRes = await fetch(`${base}/api/mcp/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_name: 'Claude Desktop',
            redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
        }),
    });
    assert.equal(regRes.status, 201);
    const client = await regRes.json();
    assert.ok(client.client_id.startsWith('mcp_client_'));

    // 4. Start Authorization Request with PKCE S256
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk_socialchoice_pkce_verifier';
    const challenge = pkceChallenge(verifier);
    const authUrl = new URL(`${base}/api/mcp/authorize`);
    authUrl.searchParams.set('client_id', client.client_id);
    authUrl.searchParams.set('redirect_uri', 'https://claude.ai/api/mcp/auth_callback');
    authUrl.searchParams.set('scope', 'posts:read posts:write');
    authUrl.searchParams.set('state', 'xyz123');
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    const authRedirect = await fetch(authUrl, { redirect: 'manual' });
    assert.equal(authRedirect.status, 302);
    const consentLocation = new URL(authRedirect.headers.get('location'));
    assert.equal(consentLocation.pathname, '/oauth/consent');
    const ctxHandle = consentLocation.searchParams.get('ctx');
    assert.ok(ctxHandle);

    // 5. Fetch Consent Info & Approve Grant (with posts:read + posts:write only)
    const infoRes = await fetch(`${base}/api/mcp/consent-info?handle=${encodeURIComponent(ctxHandle)}`);
    assert.equal(infoRes.status, 200);
    const info = await infoRes.json();
    assert.equal(info.client_name, 'Claude Desktop');

    const approveRes = await fetch(`${base}/api/mcp/authorize-grant`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-socialchoice-client': 'local-ui',
        },
        body: JSON.stringify({
            ctx: ctxHandle,
            action: 'approve',
            scopes: ['posts:read', 'posts:write'],
        }),
    });
    assert.equal(approveRes.status, 200);
    const approveData = await approveRes.json();
    const callbackUrl = new URL(approveData.redirect_url);
    assert.equal(callbackUrl.searchParams.get('state'), 'xyz123');
    const authCode = callbackUrl.searchParams.get('code');
    assert.ok(authCode);

    // 6. Exchange Authorization Code for Access Token
    const tokenRes = await fetch(`${base}/api/mcp/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: authCode,
            client_id: client.client_id,
            redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
            code_verifier: verifier,
        }),
    });
    assert.equal(tokenRes.status, 200);
    const tokenData = await tokenRes.json();
    assert.ok(tokenData.access_token);
    assert.ok(tokenData.refresh_token);

    const callMcp = async (method, params = {}, token = tokenData.access_token) => {
        const res = await fetch(`${base}/mcp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        });
        assert.equal(res.status, 200);
        return res.json();
    };

    // 7. Initialize & List Tools
    const initRpc = await callMcp('initialize', { protocolVersion: '2025-03-26' });
    assert.equal(initRpc.result.serverInfo.name, 'SocialChoice MCP Connector');

    const listToolsRpc = await callMcp('tools/list');
    // Since posts:publish was not granted, publish_now should not be in tools/list
    const toolNames = listToolsRpc.result.tools.map((t) => t.name);
    assert.ok(toolNames.includes('list_brands'));
    assert.ok(toolNames.includes('schedule_post'));
    assert.ok(!toolNames.includes('publish_now'));

    // 8. Call list_brands, list_accounts, list_content_pillars
    const brandsCall = await callMcp('tools/call', { name: 'list_brands', arguments: {} });
    assert.equal(brandsCall.result.isError, false);
    assert.equal(brandsCall.result.structuredContent.brands[0].id, brand.id);

    const accountsCall = await callMcp('tools/call', {
        name: 'list_accounts',
        arguments: { brand_id: brand.id },
    });
    assert.equal(accountsCall.result.structuredContent.accounts[0].id, account.id);

    const pillarsCall = await callMcp('tools/call', {
        name: 'list_content_pillars',
        arguments: { brand_id: brand.id },
    });
    assert.equal(pillarsCall.result.structuredContent.pillars[0].id, pillar.id);
    assert.equal(pillarsCall.result.structuredContent.pillars[0].angles[0].id, angle.id);

    // 9. Upload Media, List Media, Create Draft & Schedule Post with Images/Videos
    // 1x1 valid PNG in base64
    const tinyPngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
    const uploadImgCall = await callMcp('tools/call', {
        name: 'upload_media',
        arguments: {
            brand_id: brand.id,
            name: 'morning-coffee.png',
            base64_data: tinyPngBase64,
            mime_type: 'image/png',
            notes: 'Hero shot of V60 coffee',
        },
    });
    assert.equal(uploadImgCall.result.isError, false);
    const uploadedImageId = uploadImgCall.result.structuredContent.media.id;
    assert.equal(uploadImgCall.result.structuredContent.media.file_type, 'image');
    assert.equal(uploadImgCall.result.structuredContent.media.stored_binary, true);

    const listMediaCall = await callMcp('tools/call', {
        name: 'list_media',
        arguments: { brand_id: brand.id, file_type: 'image' },
    });
    assert.equal(listMediaCall.result.isError, false);
    assert.equal(listMediaCall.result.structuredContent.media.length, 1);
    assert.equal(listMediaCall.result.structuredContent.media[0].id, uploadedImageId);

    const draftCall = await callMcp('tools/call', {
        name: 'create_draft',
        arguments: {
            brand_id: brand.id,
            title: 'Bí quyết pha V60 buổi sáng',
            caption: '3 bước pha cà phê V60 chuẩn vị tại nhà.',
            account_ids: [account.id],
            media_ids: [uploadedImageId],
            media_urls: ['https://cdn.example.com/videos/v60-tutorial.mp4'],
            pillar_id: pillar.id,
            angle_id: angle.id,
        },
    });
    assert.equal(draftCall.result.isError, false);
    const createdPostId = draftCall.result.structuredContent.post.id;
    assert.equal(draftCall.result.structuredContent.post.status, 'draft');
    assert.equal(draftCall.result.structuredContent.post.media_ids.length, 2);
    assert.ok(draftCall.result.structuredContent.post.media_ids.includes(uploadedImageId));

    // Schedule the draft at local time in Asia/Ho_Chi_Minh (09:00 = 02:00 UTC)
    const scheduleCall = await callMcp('tools/call', {
        name: 'schedule_post',
        arguments: {
            post_id: createdPostId,
            scheduled_at: '2027-01-15T09:00:00',
            timezone: 'Asia/Ho_Chi_Minh',
            account_ids: [account.id],
        },
    });
    assert.equal(scheduleCall.result.isError, false);
    assert.equal(scheduleCall.result.structuredContent.post.status, 'scheduled');
    assert.equal(scheduleCall.result.structuredContent.post.scheduled_at, '2027-01-15T02:00:00.000Z');

    // 10. List Scheduled Posts, Update Post, Cancel Post
    const listScheduled = await callMcp('tools/call', {
        name: 'list_scheduled_posts',
        arguments: { brand_id: brand.id, status: 'scheduled' },
    });
    assert.equal(listScheduled.result.structuredContent.posts.length, 1);

    const updateCall = await callMcp('tools/call', {
        name: 'update_post',
        arguments: {
            post_id: createdPostId,
            caption: 'Nội dung đã cập nhật qua ChatGPT/Claude.',
        },
    });
    assert.equal(
        updateCall.result.structuredContent.post.caption,
        'Nội dung đã cập nhật qua ChatGPT/Claude.'
    );

    const cancelCall = await callMcp('tools/call', {
        name: 'cancel_post',
        arguments: {
            post_id: createdPostId,
            convert_to_draft: true,
        },
    });
    assert.equal(cancelCall.result.structuredContent.post.status, 'draft');

    // 11. Verify publish_now scope enforcement & confirmation gate
    const deniedPublish = await callMcp('tools/call', {
        name: 'publish_now',
        arguments: { post_id: createdPostId, confirm: true },
    });
    assert.equal(deniedPublish.result.isError, true);
    assert.match(
        JSON.parse(deniedPublish.result.content[0].text).message,
        /requires scope "posts:publish"/
    );

    // Issue a token WITH posts:publish scope and verify confirmation gate
    const tokenWithPublishRes = await fetch(`${base}/api/mcp/tokens`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-socialchoice-client': 'local-ui',
        },
        body: JSON.stringify({
            name: 'Full Access Token',
            scopes: ['posts:read', 'posts:write', 'posts:publish'],
        }),
    });
    assert.equal(tokenWithPublishRes.status, 201);
    const fullTokenData = await tokenWithPublishRes.json();

    const previewPublish = await callMcp(
        'tools/call',
        { name: 'publish_now', arguments: { post_id: createdPostId, confirm: false } },
        fullTokenData.access_token
    );
    assert.equal(previewPublish.result.isError, false);
    assert.equal(previewPublish.result.structuredContent.confirmation_required, true);
    assert.equal(previewPublish.result.structuredContent.preview.post_id, createdPostId);

    // 12. Revoke token and verify 401
    const revokeRes = await fetch(`${base}/api/mcp/revoke`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-socialchoice-client': 'local-ui',
        },
        body: JSON.stringify({ id: fullTokenData.grant.id }),
    });
    assert.equal(revokeRes.status, 200);

    const afterRevokeRes = await fetch(`${base}/mcp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${fullTokenData.access_token}`,
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    });
    assert.equal(afterRevokeRes.status, 401);
});
