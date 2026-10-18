import test from 'node:test';
import assert from 'node:assert/strict';
import { captionLength, contentIssues, destinationIssues, resolveCaption, resolveMediaIds, referencedMediaIds, resolveMedia } from '../src/lib/publishing-content.js';

test('caption precedence preserves exact text and treats empty overrides as inheritance', () => {
    const account = { id: 'a', platform: 'threads' };
    const post = { caption: 'Main', platform_captions: { threads: 'Platform' }, destination_settings: { a: { caption: ' Account \n' } } };
    assert.equal(resolveCaption(post, account), ' Account \n');
    post.destination_settings.a.caption = '  ';
    assert.equal(resolveCaption(post, account), 'Platform');
    post.platform_captions.threads = '';
    assert.equal(resolveCaption(post, account), 'Main');
});

test('mixed channel content checks explain each incompatible format and caption limit', () => {
    const png = { file_type: 'image', mime_type: 'image/png', width: 800, height: 800 };
    const jpeg = { ...png, mime_type: 'image/jpeg' };
    assert.deepEqual(contentIssues('facebook', 'Text', [png]), []);
    assert.deepEqual(contentIssues('linkedin', 'Text', [png]), []);
    assert.ok(contentIssues('instagram', 'Text', [png]).some(error => error.includes('one JPEG')));
    assert.ok(contentIssues('threads', 'Text', [png]).some(error => error.includes('one JPEG')));
    assert.ok(contentIssues('instagram', 'Text', []).length);
    assert.ok(contentIssues('instagram', 'Text', [{ ...jpeg, width: 400, height: 1000 }]).some(error => error.includes('aspect ratio')));
    assert.deepEqual(contentIssues('instagram', 'Text', [jpeg]), []);
    assert.ok(contentIssues('threads', 'a'.repeat(501), []).some(error => error.includes('500')));
    assert.deepEqual(contentIssues('threads', '😀'.repeat(500), []), []);
    assert.equal(captionLength('😀', 'threads'), 1);
    assert.equal(captionLength('😀', 'instagram'), 2);
    const mp4 = { file_type: 'video', mime_type: 'video/mp4', size_bytes: 31 * 1024 * 1024 };
    assert.ok(contentIssues('linkedin', 'Text', [mp4]).some(error => error.includes('30 MiB')));
    assert.deepEqual(contentIssues('tiktok', 'Text', [mp4]), []);
    assert.ok(contentIssues('facebook', 'Text', [mp4, jpeg]).some(error => error.includes('not both')));
});

test('per-account checks use effective captions and require connection and TikTok choices', () => {
    const account = { id: 'a', platform: 'threads', connection_status: 'connected' };
    const post = { caption: 'Long'.repeat(200), platform_captions: { threads: 'Short' } };
    assert.deepEqual(destinationIssues(post, account, []), []);
    assert.ok(destinationIssues(post, { ...account, connection_status: 'disconnected' }, []).some(error => error.includes('Connect')));
    const video = { file_type: 'video', mime_type: 'video/mp4' };
    assert.ok(destinationIssues(post, { ...account, platform: 'tiktok' }, [video]).some(error => error.includes('music consent')));
});

test('TikTok channel checks enforce loaded creator permissions and exact video duration limit', () => {
    const account = { id: 'a', platform: 'tiktok', connection_status: 'connected' };
    const post = { caption: 'Caption', destination_settings: { a: { tiktok: { privacy: 'SELF_ONLY', musicConsent: true, commercial: false, ownBrand: false, allowComment: false } } } };
    const creator = { privacy: ['SELF_ONLY'], maxDuration: 600, commentDisabled: false };
    const video = { file_type: 'video', mime_type: 'video/mp4', duration_seconds: 600 };
    assert.deepEqual(destinationIssues(post, account, [video], false, creator), []);
    assert.ok(destinationIssues(post, account, [video]).some(issue => issue.includes('Refresh TikTok')));
    for (const duration_seconds of [601, 0, undefined, NaN]) assert.ok(destinationIssues(post, account, [{ ...video, duration_seconds }], false, creator).some(issue => issue.includes('duration limit')));
    post.destination_settings.a.tiktok.allowComment = true;
    assert.ok(destinationIssues(post, account, [video], false, { ...creator, commentDisabled: true }).some(issue => issue.includes('permissions changed')));
});


test('platform media resolvers preserve order, inherit absent keys and retain explicit text-only overrides', () => {
    const first = { id: 'first', file_type: 'image', mime_type: 'image/png' };
    const second = { id: 'second', file_type: 'image', mime_type: 'image/png' };
    const video = { id: 'video', file_type: 'video', mime_type: 'video/mp4' };
    const post = { media_ids: ['first', 'second'], media: [first, second],
        platform_media_ids: { facebook: ['second', 'first'], instagram: ['video'], threads: [] },
        platform_media: { facebook: [second, first], instagram: [video], threads: [] } };
    for (const [platform, ids, media] of [
        ['facebook', ['second', 'first'], [second, first]],
        ['instagram', ['video'], [video]],
        ['threads', [], []],
        ['linkedin', ['first', 'second'], [first, second]],
    ]) {
        const account = { platform };
        assert.deepEqual(resolveMediaIds(post, account), ids);
        assert.deepEqual(resolveMedia(post, account), media);
        assert.deepEqual(resolveMedia(post, account, post.media, post.platform_media), media);
    }
    assert.deepEqual(resolveMediaIds({}, { platform: 'facebook' }), []);
    assert.deepEqual(resolveMedia({}, { platform: 'facebook' }), []);
    assert.deepEqual(post.media_ids, ['first', 'second']);
    assert.deepEqual(post.media, [first, second]);
});

test('referenced media includes unique defaults and hidden overrides regardless of selected accounts', () => {
    const post = { account_ids: ['facebook-account'], media_ids: ['a', 'b', 'a'],
        platform_media_ids: { facebook: ['b', 'c'], instagram: ['hidden', 'a'], threads: [], tiktok: ['hidden', 'video'] } };
    assert.deepEqual(referencedMediaIds(post), ['a', 'b', 'c', 'hidden', 'video']);
    assert.deepEqual(referencedMediaIds({ platform_media_ids: { linkedin: ['hidden'] } }), ['hidden']);
    assert.deepEqual(referencedMediaIds({}), []);
});

test('destination checks use resolved platform formats and explicit text-only selections', () => {
    const png = { id: 'png', file_type: 'image', mime_type: 'image/png', width: 800, height: 800 };
    const video = { id: 'video', file_type: 'video', mime_type: 'video/mp4', size_bytes: 1000 };
    const post = { caption: 'Caption', media: [png], platform_media: { instagram: [video], threads: [] } };
    const facebook = { id: 'f', platform: 'facebook', account_type: 'page', connection_status: 'connected' };
    const instagram = { id: 'i', platform: 'instagram', connection_status: 'connected' };
    const threads = { id: 't', platform: 'threads', connection_status: 'connected' };
    const linkedin = { id: 'l', platform: 'linkedin', connection_status: 'connected' };
    for (const account of [facebook, instagram, threads, linkedin]) {
        assert.deepEqual(destinationIssues(post, account, resolveMedia(post, account)), []);
    }
    assert.ok(destinationIssues(post, instagram, post.media).some(issue => issue.includes('one JPEG')));
    post.platform_media.instagram = [];
    assert.ok(destinationIssues(post, instagram, resolveMedia(post, instagram)).some(issue => issue.includes('one JPEG')));
    assert.deepEqual(destinationIssues(post, facebook, resolveMedia(post, facebook)), []);
});
