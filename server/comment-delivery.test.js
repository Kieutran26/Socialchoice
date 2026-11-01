import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createStore } from './store.js';
import { createMetaVault } from './meta-vault.js';
import { createFacebookPublisher } from './facebook-publisher.js';
import { saveTemplate, createTemplateDraft } from './post-templates.js';
import { templateDataFromForm } from '../src/lib/post-templates.js';
import { resolveMediaIds, resolveMedia, resolveComments, referencedMediaIds, destinationIssues } from '../src/lib/publishing-content.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=', 'base64');

test('per-account media and comment resolvers override platform and shared defaults cleanly', () => {
    const sharedImg = { id: 'shared', file_type: 'image', mime_type: 'image/jpeg', width: 800, height: 800 };
    const platformImg = { id: 'platform', file_type: 'image', mime_type: 'image/jpeg', width: 800, height: 800 };
    const accountImg = { id: 'account', file_type: 'image', mime_type: 'image/jpeg', width: 800, height: 800 };
    const commentImg = { id: 'comment-img', file_type: 'image', mime_type: 'image/jpeg', width: 800, height: 800 };

    const post = {
        caption: 'Shared caption',
        media_ids: ['shared'],
        media: [sharedImg],
        platform_media_ids: { facebook: ['platform'] },
        platform_media: { facebook: [platformImg] },
        comments: [{ message: 'Shared comment', media_ids: ['comment-img'], delay_minutes: 0 }],
        destination_settings: {
            acc1: {
                caption: 'Account 1 custom',
                media_ids: ['account'],
                media: [accountImg],
                comments: [{ message: 'Account 1 comment', delay_minutes: 5 }],
            },
            acc2: {
                media_ids: [],
                media: [],
            },
        },
    };

    assert.deepEqual(resolveMediaIds(post, { id: 'acc1', platform: 'facebook' }), ['account']);
    assert.deepEqual(resolveMedia(post, { id: 'acc1', platform: 'facebook' }), [accountImg]);
    assert.deepEqual(resolveComments(post, { id: 'acc1', platform: 'facebook' }), [{ message: 'Account 1 comment', delay_minutes: 5 }]);

    // Explicit empty array on acc2 means text-only override even though platform_media_ids.facebook is non-empty
    assert.deepEqual(resolveMediaIds(post, { id: 'acc2', platform: 'facebook' }), []);
    assert.deepEqual(resolveMedia(post, { id: 'acc2', platform: 'facebook' }), []);
    assert.deepEqual(resolveComments(post, { id: 'acc2', platform: 'facebook' }), post.comments);

    // Uncustomized account falls back to platform_media_ids -> media_ids
    assert.deepEqual(resolveMediaIds(post, { id: 'acc3', platform: 'facebook' }), ['platform']);
    assert.deepEqual(resolveMediaIds(post, { id: 'acc4', platform: 'linkedin' }), ['shared']);

    // referencedMediaIds collects shared, platform, per-account, and comment media IDs
    assert.deepEqual(referencedMediaIds(post), ['shared', 'platform', 'comment-img', 'account']);

    // destinationIssues validates comment media rules per platform
    const igAccount = { id: 'ig1', platform: 'instagram', connection_status: 'connected' };
    const igIssues = destinationIssues(post, igAccount, [sharedImg]);
    assert.ok(igIssues.some((msg) => msg.includes('Instagram comments do not support media attachments')));

    const fbAccount = { id: 'fb1', platform: 'facebook', account_type: 'page', connection_status: 'connected' };
    assert.deepEqual(destinationIssues(post, fbAccount, [sharedImg]), []);
});

test('per-account media_ids and comments persist in Post and PostTemplate and guard MediaAsset deletion', () => {
    const store = createStore(':memory:');
    try {
        const brand = store.write('Brand', { name: 'Phase 3A Brand' });
        const page1 = store.write('SocialAccount', { name: 'Page 1', brand_id: brand.id, platform: 'facebook' });
        const page2 = store.write('SocialAccount', { name: 'Page 2', brand_id: brand.id, platform: 'facebook' });
        const imgAccount = store.images.upload(brand.id, 'acc.png', 'image/png', png);
        const imgComment = store.images.upload(brand.id, 'cmt.png', 'image/png', png);

        const form = {
            brand_id: brand.id,
            title: 'Multi account post',
            caption: 'Main text',
            platform_captions: {},
            media: [],
            platform_media: {},
            account_ids: [page1.id, page2.id],
            comments: [{ message: 'Shared follow-up', media: [imgComment], delay_minutes: 10 }],
            destination_settings: {
                [page1.id]: {
                    caption: 'Page 1 text',
                    media: [imgAccount],
                    comments: [{ message: 'Page 1 custom comment', media: [], delay_minutes: 0 }],
                },
            },
        };

        const templateData = templateDataFromForm(form, false);
        const savedTemplate = saveTemplate(store, { name: '3A Template', data: templateData });
        assert.deepEqual(savedTemplate.destination_settings[page1.id].media_ids, [imgAccount.id]);
        assert.deepEqual(savedTemplate.comments[0].media_ids, [imgComment.id]);

        // Both images are guarded from deletion while referenced by template/post
        assert.throws(() => store.remove('MediaAsset', imgAccount.id), /history/);
        assert.throws(() => store.remove('MediaAsset', imgComment.id), /history/);

        const { post } = createTemplateDraft(store, savedTemplate.id);
        assert.deepEqual(post.destination_settings[page1.id].media_ids, [imgAccount.id]);
        assert.deepEqual(post.comments[0].media_ids, [imgComment.id]);
    } finally {
        store.close();
    }
});

test('Facebook publisher executes immediate and delayed follow-up comments with photo attachment after post publication', async () => {
    const store = createStore(':memory:');
    const config = { ready: true, key: randomBytes(32).toString('hex'), appSecret: 'test-secret', version: 'v26.0' };
    const brand = store.write('Brand', { name: 'FB Comment Brand' });
    const vault = createMetaVault(store, config.key);
    const scopes = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'];
    vault.save('cred-fb', { token: 'fb-token', scopes, tasks: ['CREATE_CONTENT'] });
    const account = store.verifiedAccount({
        name: 'FB Page',
        brand_id: brand.id,
        platform: 'facebook',
        account_type: 'page',
        external_id: '111222',
        credential_id: 'cred-fb',
        connection_status: 'connected',
        scopes,
    });
    const commentImage = store.images.upload(brand.id, 'comment-photo.png', 'image/png', png);

    const post = store.write('Post', {
        title: 'Post with comment chain',
        caption: 'Main post body',
        brand_id: brand.id,
        account_ids: [account.id],
        comments: [
            { message: 'First comment with image', media_ids: [commentImage.id], delay_minutes: 0 },
            { message: 'Second delayed comment', delay_minutes: 15 },
        ],
    });

    const calls = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
        const href = String(url);
        calls.push({ href, method: init?.method });
        if (href.includes('/111222/feed')) {
            return new Response(JSON.stringify({ id: '111222_999' }), { status: 200 });
        }
        if (href.includes('/111222/photos')) {
            return new Response(JSON.stringify({ id: '777888' }), { status: 200 });
        }
        if (href.includes('/111222_999/comments')) {
            const bodyText = init?.body?.toString() || '';
            calls.at(-1).body = bodyText;
            const cmtId = calls.filter((c) => c.href.includes('/comments')).length;
            return new Response(JSON.stringify({ id: `111222_999_cmt_${cmtId}` }), { status: 200 });
        }
        throw new Error('Unexpected fetch: ' + href);
    };

    const publisher = createFacebookPublisher(store, config, { wake: async () => {} });
    try {
        const review = publisher.prepare(post.id);
        assert.equal(review.comments.length, 2);
        assert.equal(review.comments[0].media.length, 1);

        const published = await publisher.publish(review.attemptId);
        assert.equal(published.status, 'published');
        assert.equal(published.commentStatus, 'processing');
        assert.equal(published.commentResults.length, 2);
        assert.equal(published.commentResults[0].status, 'queued');

        // Run comment worker for immediate comment #1 (0 min delay)
        await publisher.runPhotos();
        let statusAfterFirst = publisher.status(review.attemptId);
        assert.equal(statusAfterFirst.commentResults[0].status, 'published');
        assert.equal(statusAfterFirst.commentResults[0].externalId, '111222_999_cmt_1');
        assert.equal(statusAfterFirst.commentStatus, 'queued');
        assert.equal(statusAfterFirst.commentResults[1].status, 'queued');

        // Verify comment #1 uploaded the photo and passed attachment_id=777888
        const firstCommentCall = calls.find((c) => c.href.includes('/111222_999/comments'));
        assert.ok(firstCommentCall.body.includes('attachment_id=777888'));

        // Running before 15m delay expires does not publish comment #2 yet
        await publisher.runPhotos();
        assert.equal(publisher.status(review.attemptId).commentResults[1].status, 'queued');

        // Advance commentNextAt to now and run comment worker for comment #2
        const currentAttempt = store.attempt(review.attemptId);
        store.saveAttempt({ ...currentAttempt, commentNextAt: Date.now() - 10 });
        await publisher.runPhotos();

        const finalStatus = publisher.status(review.attemptId);
        assert.equal(finalStatus.commentStatus, 'published');
        assert.equal(finalStatus.commentResults[1].status, 'published');
        assert.equal(finalStatus.commentResults[1].externalId, '111222_999_cmt_2');
    } finally {
        globalThis.fetch = originalFetch;
        publisher.close();
        store.close();
    }
});

test('LinkedIn publisher supports mentions and dual-actor commenting (Personal Profile post + Company Page comment)', async () => {
    const store = createStore(':memory:');
    const key = randomBytes(32).toString('hex');
    const config = { ready: true, key, appSecret: 'test-secret', version: 'v26.0' };
    const linkedinConfig = { ready: true, key, appId: 'li-app', appSecret: 'li-secret', redirectUri: 'https://app.example/api/linkedin/callback' };
    const brand = store.write('Brand', { name: 'LinkedIn Dual Actor Brand' });
    const linkedinVault = createMetaVault(store, linkedinConfig.key);
    const scopes = ['openid', 'profile', 'w_member_social'];
    const expiresAt = Date.now() + 3600000;

    linkedinVault.save('cred-li-person', { platform: 'linkedin', token: 'li-person-token', profileId: 'member_1', scopes, expiresAt });
    linkedinVault.save('cred-li-company', { platform: 'linkedin', token: 'li-company-token', profileId: 'member_1', organizationId: 'org_555', scopes, expiresAt });

    const personalAccount = store.verifiedAccount({
        name: 'Jane Doe',
        username: 'janedoe',
        brand_id: brand.id,
        platform: 'linkedin',
        account_type: 'profile',
        external_id: 'member_1',
        credential_id: 'cred-li-person',
        connection_status: 'connected',
        scopes,
    });
    const companyAccount = store.verifiedAccount({
        name: 'Acme Corp',
        username: 'acmecorp',
        brand_id: brand.id,
        platform: 'linkedin',
        account_type: 'page',
        external_id: 'org_555',
        credential_id: 'cred-li-company',
        connection_status: 'connected',
        scopes,
    });

    const post = store.write('Post', {
        title: 'LinkedIn Launch',
        caption: 'Excited to launch with @[Acme Corp](urn:li:organization:org_555)!',
        brand_id: brand.id,
        account_ids: [personalAccount.id],
        comments: [
            { message: 'Personal profile follow-up link', delay_minutes: 0 },
            { message: 'Official response from @[Acme Corp](urn:li:organization:org_555)', delay_minutes: 0, actor_account_id: companyAccount.id },
        ],
    });

    const commentCalls = [];
    const linkedinGraph = {
        async profile() { return { id: 'member_1', username: 'Jane Doe' }; },
        async permissions() { return { scopes, expiresAt }; },
        async publish(profileId, caption) {
            assert.equal(profileId, 'member_1');
            assert.ok(caption.includes('@[Acme Corp](urn:li:organization:org_555)'));
            return { id: 'urn:li:ugcPost:424242', url: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:424242/' };
        },
        async publishComment(actorUrn, postUrn, text, token) {
            commentCalls.push({ actorUrn, postUrn, text, token });
            return { id: `urn:li:comment:${commentCalls.length}` };
        },
    };

    const publisher = createFacebookPublisher(store, config, { linkedinConfig, linkedinGraph, wake: async () => {} });
    try {
        const review = publisher.prepare(post.id);
        const started = await publisher.publish(review.attemptId);
        assert.equal(started.status, 'processing');

        // Run LinkedIn delivery + comment chain
        await publisher.runPhotos();
        await publisher.runPhotos();

        const finalStatus = publisher.status(review.attemptId);
        assert.equal(finalStatus.status, 'published');
        assert.equal(finalStatus.commentStatus, 'published');
        assert.equal(commentCalls.length, 2);

        // Comment #1 posted as Personal Profile (urn:li:person:member_1)
        assert.equal(commentCalls[0].actorUrn, 'urn:li:person:member_1');
        assert.equal(commentCalls[0].token, 'li-person-token');

        // Comment #2 posted as Company Page (urn:li:organization:org_555)
        assert.equal(commentCalls[1].actorUrn, 'urn:li:organization:org_555');
        assert.equal(commentCalls[1].token, 'li-company-token');
    } finally {
        publisher.close();
        store.close();
    }
});


