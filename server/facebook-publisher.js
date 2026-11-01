import { createPostizDelivery, postizDestination } from './postiz-delivery.js';
import { createLinkedinGraph, linkedinMemberId } from './linkedin-graph.js';
import { createLinkedinDelivery } from './linkedin-delivery.js';
import { createTiktokGraph } from './tiktok-graph.js';
import { createTiktokTokens } from './tiktok-tokens.js';
import { createTiktokDelivery } from './tiktok-delivery.js';
import { validateTiktokOptions } from './tiktok-options.js';
import { createThreadsGraph } from './threads-graph.js';
import { createThreadsDelivery } from './threads-delivery.js';
import { createInstagramGraph } from './instagram-graph.js';
import { createInstagramDelivery } from './instagram-delivery.js';
import { createInstagramMediaAccess } from './instagram-media-access.js';
import { createBulkScheduling } from './facebook-bulk-scheduling.js';
import { createScheduledDelivery } from './facebook-scheduled-delivery.js';
import { createCommentDelivery } from './comment-delivery.js';
import { randomUUID } from 'node:crypto';
import { createMetaGraph } from './meta-graph.js';
import { createMetaVault } from './meta-vault.js';
import { fail } from './validation.js';
import { createPhotoDelivery } from './facebook-photo-delivery.js';
import { createVideoDelivery } from './facebook-video-delivery.js';
import { createMultiPageDelivery } from './facebook-multi-page.js';
import { contentRevision, syncDeliveryState } from './publishing-state.js';
import { resolveCaption, resolveMediaIds, resolveComments, parseLinkedinMentions } from '../src/lib/publishing-content.js';
import { licensedGraph } from './licensed-graph.js';
import { hasVerifiedPagePublishGrant } from './meta-page-discovery.js';

const uncertainMessage = 'Facebook delivery is unconfirmed. Check the Page before creating another post; this attempt will not be resent.';

export function canFinishPublication(current, attempt, status, confirmed) {
    if (current.id !== attempt.id || current.startedAt !== attempt.startedAt) return false;
    if (status === 'published' && !confirmed) return false;
    // A valid late feed acknowledgement may resolve uncertainty; never downgrade it.
    return current.status === 'processing' || current.status === 'unknown' && status === 'published' && confirmed;
}

// Claim the immutable approval in a synchronous transaction before any network I/O.
export function createFacebookPublisher(store, config, options = {}) {
    const graph = licensedGraph(config.ready ? createMetaGraph(config) : null, options.authorize);
    const linkedinConfig = options.linkedinConfig || {};
    const linkedinVault = linkedinConfig.ready ? createMetaVault(store, linkedinConfig.key) : null;
    const linkedinGraph = licensedGraph(options.linkedinGraph || (linkedinConfig.ready ? createLinkedinGraph(linkedinConfig) : null), options.authorize);
    const threadsConfig = options.threadsConfig || {};
    const tiktokConfig = options.tiktokConfig || {}, creators = options.tiktokCreators || new Map();
    const tiktokGraph = licensedGraph(options.tiktokGraph || (tiktokConfig.ready ? createTiktokGraph(tiktokConfig) : null), options.authorize);
    const tiktokTokens = options.tiktokTokens || createTiktokTokens(store, tiktokConfig, tiktokGraph);
    const vault = config.ready || threadsConfig.ready ? createMetaVault(store, config.key || threadsConfig.key) : null;
    const threadsVault = threadsConfig.ready ? createMetaVault(store, threadsConfig.key) : null;
    const threadsGraph = licensedGraph(threadsConfig.ready ? createThreadsGraph(threadsConfig) : null, options.authorize);
    const instagramGraph = licensedGraph(config.ready ? createInstagramGraph(config) : null, options.authorize);
    const instagramMedia = createInstagramMediaAccess(store, config, threadsConfig, tiktokConfig);
    const summary = attempt => ({
        attemptId: attempt.id, postId: attempt.postId, accountId: attempt.accountId, platform: attempt.platform || 'facebook', multi: !!attempt.multi, immediate: !!attempt.immediate, pageName: attempt.pageName, pageId: attempt.pageId, caption: attempt.caption, tiktokOptions: attempt.tiktokOptions, tiktokCreator: attempt.tiktokCreator, status: attempt.status, scheduledFor: attempt.scheduledFor, timezone: attempt.timezone, expiresAt: attempt.expiresAt,
        media: (attempt.media || []).map(image => ({ id: image.id, name: image.name, file_url: image.file_url, file_type: image.file_type })),
        uploadedPhotos: attempt.photoIds?.length || 0, videoStage: attempt.videoStage, uploadedVideoBytes: attempt.videoStart || 0,
        ...(attempt.comments?.length ? {
            comments: attempt.comments.map(c => ({
                index: c.index,
                message: c.message,
                delay_minutes: c.delay_minutes || 0,
                media: (c.media || []).map(image => ({ id: image.id, name: image.name, file_url: image.file_url, file_type: image.file_type })),
                ...(c.actor_account_id ? { actor_account_id: c.actor_account_id } : {}),
            })),
            ...(attempt.commentStatus ? { commentStatus: attempt.commentStatus } : {}),
            ...(attempt.commentResults ? { commentResults: attempt.commentResults } : {}),
        } : {}),
        ...(attempt.url ? { publishedUrl: attempt.url, externalPostId: attempt.externalId } : {}),
        ...(attempt.platform === 'tiktok' && attempt.externalId ? { providerPublishId: attempt.externalId } : {}),
        ...(attempt.message ? { message: attempt.message } : {}),
    });

    function destination(post, scheduled = false, accountId, execution = false) {
        if (!options.postizConfig?.ready && !config.ready && !threadsConfig.ready && !tiktokConfig.ready && !linkedinConfig.ready) fail('Configure the destination integration before publishing', 409);

        if (post.is_demo || (!execution && post.status !== (scheduled ? 'scheduled' : 'draft'))) fail('Publish now requires a live draft', 409);
        const brand = store.get('Brand', post.brand_id);
        if (brand.is_demo || brand.status === 'archived') fail('Choose an active live brand', 409);
        if (!accountId && post.account_ids?.length !== 1) fail('Choose at least one publishing account', 409);
        if (accountId && !post.account_ids?.includes(accountId)) fail('Choose an account selected for this post', 409);
        const account = store.get('SocialAccount', accountId || post.account_ids[0]);
        const mediaIds = resolveMediaIds(post, account);
        if (mediaIds.length > 10 || new Set(mediaIds).size !== mediaIds.length) fail('Choose up to 10 different images');
        const media = mediaIds.map(id => {
            const image = store.get('MediaAsset', id);
            if (image.is_demo || image.brand_id !== post.brand_id || !['image', 'video'].includes(image.file_type) || !image.storage_id || !store.images.has(image.storage_id)) fail('Choose stored media from the same live brand', 409);
            return image;
        });
        if (media.some(asset => asset.file_type === 'video') && media.length !== 1) fail('Choose one video or up to 10 images, not both');
        const rawComments = resolveComments(post, account);
        if (!Array.isArray(rawComments) || rawComments.length > 10) fail('Choose up to 10 follow-up comments');
        if (rawComments.length && account.platform === 'tiktok') fail('TikTok does not support automatic comments', 409);
        const comments = rawComments.map((item, index) => {
            const message = typeof item?.message === 'string' ? item.message : '';
            const delayMinutes = item?.delay_minutes ?? 0;
            if (!Number.isInteger(delayMinutes) || delayMinutes < 0 || delayMinutes > 10080) fail('Comment delay must be between 0 and 10080 minutes');
            const itemMediaIds = item?.media_ids || [];
            if (!Array.isArray(itemMediaIds) || itemMediaIds.length > 1) fail('Each comment supports at most one image');
            if (!message.trim() && !itemMediaIds.length) fail('Each comment requires text or an image');
            const maxLen = { facebook: 63206, instagram: 2200, threads: 500, linkedin: 3000 }[account.platform] || 3000;
            const len = account.platform === 'linkedin'
                ? Array.from(parseLinkedinMentions(message).text).length
                : account.platform === 'threads'
                    ? Array.from(message).length
                    : message.length;
            if (message && len > maxLen) fail('Comment exceeds platform character limit');
            if (item?.actor_account_id && account.platform === 'linkedin') {
                const actorAccount = store.get('SocialAccount', item.actor_account_id);
                if (actorAccount.is_demo || actorAccount.brand_id !== post.brand_id || actorAccount.platform !== 'linkedin' || !['profile', 'page'].includes(actorAccount.account_type) || actorAccount.connection_status !== 'connected') {
                    fail('Connect the selected LinkedIn comment account before publishing', 409);
                }
            }
            if (itemMediaIds.length && ['instagram', 'linkedin'].includes(account.platform)) {
                fail(account.platform === 'instagram' ? 'Instagram comments do not support media attachments' : 'LinkedIn comments do not support media attachments', 409);
            }
            const commentMedia = itemMediaIds.map(id => {
                const image = store.get('MediaAsset', id);
                if (image.is_demo || image.brand_id !== post.brand_id || image.file_type !== 'image' || !image.storage_id || !store.images.has(image.storage_id)) {
                    fail('Choose stored media from the same live brand', 409);
                }
                if (account.platform === 'threads' && image.mime_type !== 'image/jpeg') fail('Threads comment images must be JPEG', 409);
                if (account.platform === 'threads') instagramMedia.url({ id: 'validation', credentialId: account.credential_id, platform: 'threads' }, image);
                return image;
            });
            return {
                index,
                message,
                delay_minutes: delayMinutes,
                media: commentMedia,
                ...(item?.actor_account_id ? { actor_account_id: item.actor_account_id } : {}),
            };
        });
        if (account.connection_provider === 'postiz') {
            const dest = postizDestination(store, options.postizConfig || {}, account, post, media);
            return { ...dest, comments };
        }
        if (account.is_demo || account.brand_id !== post.brand_id || !['facebook', 'instagram', 'threads', 'tiktok', 'linkedin'].includes(account.platform) || !(account.platform === 'linkedin' ? ['profile', 'page'].includes(account.account_type) : account.account_type === (account.platform !== 'facebook' ? 'profile' : 'page')) || account.connection_status !== 'connected' || !account.credential_id || !(account.platform === 'linkedin' ? linkedinMemberId(account.external_id) : (account.platform === 'tiktok' ? /^[\w.-]{1,256}$/ : /^\d+$/).test(account.external_id))) fail(account.platform === 'facebook' ? 'Connect a Facebook Page before publishing' : 'Connect the selected publishing accounts before publishing', 409);
        if (!(account.platform === 'linkedin' ? linkedinConfig.ready : account.platform === 'tiktok' ? tiktokConfig.ready : account.platform === 'threads' ? threadsConfig.ready : config.ready)) fail('Configure the destination integration before publishing', 409);
        const credential = account.platform === 'tiktok' ? tiktokTokens.peek(account) : (account.platform === 'linkedin' ? linkedinVault : account.platform === 'threads' ? threadsVault : vault).read(account.credential_id);
        if (account.platform === 'facebook' && (!account.scopes?.includes('pages_manage_posts') || !credential.scopes?.includes('pages_manage_posts'))) fail('Reconnect Facebook and grant pages_manage_posts before publishing', 409);
        if (!['threads', 'tiktok', 'linkedin'].includes(account.platform) && !credential.tasks?.some(task => ['CREATE_CONTENT', 'PROFILE_PLUS_CREATE_CONTENT'].includes(task)) && !hasVerifiedPagePublishGrant(credential, account, config)) fail('Reconnect a Page with permission to create content', 409);
        if (typeof credential.token !== 'string' || !credential.token) fail(account.platform === 'facebook' ? 'Reconnect Facebook before publishing' : 'Reconnect the selected account before publishing', 409);
        const caption = resolveCaption(post, account);
        if (account.platform === 'linkedin') {
            const expectedLinkedinId = account.account_type === 'page' ? (credential.organizationId || credential.profileId) : credential.profileId;
            if (credential.platform !== 'linkedin' || expectedLinkedinId !== account.external_id || !Number.isSafeInteger(credential.expiresAt) || credential.expiresAt <= Date.now() || !['openid', 'profile', 'w_member_social'].every(scope => account.scopes?.includes(scope) && credential.scopes?.includes(scope))) fail('Reconnect LinkedIn and grant publishing permissions', 409);
            const parsedCaption = parseLinkedinMentions(caption).text;
            if (typeof caption !== 'string' || !parsedCaption.trim() || Array.from(parsedCaption).length > 3000) fail('LinkedIn caption must contain between 1 and 3000 characters');
            if (media.some(asset => !['image/jpeg', 'image/png', 'video/mp4'].includes(asset.mime_type))) fail('LinkedIn supports stored JPEG/PNG images or one MP4 video', 409);
            if (media.some(asset => asset.file_type === 'video' && asset.size_bytes > 30 * 1024 * 1024)) fail('LinkedIn videos must be at most 30 MiB', 409);
        }
        if (account.platform === 'tiktok') {
            const info = creators.get(account.id);
            if (!execution && (!info || info.credentialId !== account.credential_id || info.expires <= Date.now())) fail('Refresh TikTok creator settings before reviewing publication', 409);
            const savedInfo = post.destination_settings?.[account.id]?.tiktok;
            validateTiktokOptions(savedInfo, execution ? { privacy: ['SELF_ONLY'], maxDuration: Infinity, commentDisabled: false, duetDisabled: false, stitchDisabled: false } : info, media);
            if (caption.length > 2200) fail('TikTok caption must contain at most 2200 characters');
            instagramMedia.url({ id: 'validation', credentialId: account.credential_id, platform: 'tiktok' }, media[0]);
        }
        if (account.platform === 'threads') {
            if (credential.platform !== 'threads' || credential.profileId !== account.external_id || !Number.isFinite(credential.expiresAt) || credential.expiresAt <= Date.now() || !['threads_basic', 'threads_content_publish'].every(scope => account.scopes?.includes(scope) && credential.scopes?.includes(scope))) fail('Reconnect Threads and grant publishing permissions', 409);
            if (media.length > 1 || media.length === 1 && !(media[0].mime_type === 'image/jpeg' || media[0].file_type === 'video' && media[0].mime_type === 'video/mp4')) fail('Threads requires text, one JPEG image or one MP4 video', 409);
            if (typeof caption !== 'string' || !caption.trim() || Array.from(caption).length > 500) fail('Threads caption must contain between 1 and 500 characters');
            if (media.length) instagramMedia.url({ id: 'validation', credentialId: account.credential_id, platform: 'threads' }, media[0]);
        }
        if (account.platform === 'instagram') {
            if (!['instagram_basic', 'instagram_content_publish'].every(scope => account.scopes?.includes(scope) && credential.scopes?.includes(scope)) || !/^\d+$/.test(credential.pageId || '')) fail('Reconnect Instagram and grant publishing permissions', 409);
            if (media.length !== 1 || !(media[0].mime_type === 'image/jpeg' || media[0].file_type === 'video' && media[0].mime_type === 'video/mp4')) fail('Instagram requires one JPEG image or one MP4 Reel', 409);
            if (media[0].file_type === 'image' && (media[0].width / media[0].height < 0.8 || media[0].width / media[0].height > 1.91)) fail('Instagram image aspect ratio must be between 4:5 and 1.91:1', 409);
            if (typeof caption !== 'string' || !caption.trim() || caption.length > 2200) fail('Instagram caption must contain between 1 and 2200 characters');
            instagramMedia.url({ id: 'validation', credentialId: account.credential_id }, media[0]);
        }
        if (typeof caption !== 'string' || !caption.trim() || caption.length > 63206) fail('Facebook caption must contain between 1 and 63206 characters');
        return { account, credential, caption, media, comments };
    }

    function finish(attempt, status, message, result) {
        return store.transaction(() => {
            const current = store.attempt(attempt.id);
            if (!canFinishPublication(current, attempt, status, !!result)) return summary(current);
            const now = new Date().toISOString();
            const hasComments = status === 'published' && result?.id && current.comments?.length > 0 && current.backend !== 'postiz';
            const firstDelayMs = hasComments ? (current.comments[0]?.delay_minutes || 0) * 60000 : 0;
            const commentFields = hasComments ? {
                commentStatus: firstDelayMs > 0 ? 'queued' : 'processing',
                commentIndex: 0,
                commentNextAt: Date.now() + firstDelayMs,
                commentBusy: false,
                commentResults: current.comments.map((c, idx) => ({
                    index: idx,
                    message: c.message,
                    delay_minutes: c.delay_minutes || 0,
                    status: 'queued',
                })),
            } : {};
            const next = { ...current, status, message, finishedAt: Date.now(), ...(result ? { externalId: result.id, url: result.url } : {}), ...commentFields };
            store.saveAttempt(next);
            store.publishingWrite('PublishJob', { status, error_message: message || '', ...(result ? { external_post_id: result.id, published_url: result.url } : {}) }, current.jobId);
            store.publishingWrite('PostVariant', { status }, current.variantId);
            if (current.multi) syncDeliveryState(store, current.postId);
            else store.publishingWrite('Post', { status, ...(result ? { published_at: now } : {}) }, current.postId);
            store.publishingWrite('PublishingLog', { post_id: current.postId, publish_job_id: current.jobId, account_name: current.pageName, platform: current.platform || 'facebook', level: status === 'published' ? 'success' : status === 'failed' ? 'error' : 'warning', message: message || (current.platform === 'linkedin' ? 'LinkedIn confirmed the publication ID.' : current.platform === 'tiktok' ? 'TikTok confirmed private publication completion. The reference is a publish ID, not a public post link.' : current.platform === 'threads' ? 'Threads confirmed the media ID and profile.' : current.platform === 'instagram' ? 'Instagram confirmed the media ID and profile.' : 'Facebook confirmed the post ID.'), occurred_at: now, is_demo: false });
            return summary(next);
        });
    }

    let timer, timerAt, wakeChain = Promise.resolve();
    const wake = options.wake ? time => { const next = wakeChain.catch(() => { }).then(() => options.wake(time)); wakeChain = next; return next; } : (async time => {
        if (timer && timerAt <= time) return;
        clearTimeout(timer); timerAt = time;
        timer = setTimeout(() => { timer = null; timerAt = null; void runMedia().catch(() => { }); }, Math.min(2147483647, Math.max(0, time - Date.now())));
        timer.unref?.();
    });
    const runPostiz = createPostizDelivery(store, options.postizConfig || {}, licensedGraph(options.postizClient, options.authorize), finish, wake);
    const runPhotos = createPhotoDelivery(store, vault, graph, finish, wake);
    const runVideos = createVideoDelivery(store, vault, graph, finish, wake);
    const runInstagram = createInstagramDelivery(store, vault, instagramGraph, instagramMedia, finish, wake);
    const runLinkedin = createLinkedinDelivery(store, linkedinVault, linkedinGraph, finish, wake);
    const runThreads = createThreadsDelivery(store, threadsVault, threadsGraph, instagramMedia, finish, wake);
    const runTiktok = createTiktokDelivery(store, tiktokTokens, tiktokGraph, instagramMedia, finish, wake);
    const runComments = createCommentDelivery(
        store,
        { metaVault: vault, threadsVault, linkedinVault },
        { metaGraph: graph, instagramGraph, threadsGraph, linkedinGraph },
        instagramMedia,
        wake
    );
    async function runMedia() {
        try { for (const attempt of store.pendingAttempts().filter(value => value.backend !== 'postiz' && (value.platform || 'facebook') === 'facebook' && !value.media?.length && Date.now() - value.startedAt > 60000)) finish(attempt, 'unknown', uncertainMessage); await scheduling.runDue(); await runPostiz(); await runPhotos(); await runVideos(); await runInstagram(); await runThreads(); await runTiktok(); await runLinkedin(); await runComments(); }
        finally { await resume(); }
    }
    async function resume() {
        const times = [
            ...store.queuedAttempts().map(attempt => attempt.scheduledFor),
            ...store.pendingAttempts().map(attempt => attempt.backend === 'postiz' ? (attempt.busy ? (attempt.postizBusyAt || attempt.startedAt) + 61000 : attempt.postizNextCheck || Date.now() + 100) : (attempt.platform || 'facebook') === 'facebook' && !attempt.media?.length || attempt.busy ? attempt.startedAt + 61000 : attempt.nextVideoCheck || Date.now() + 100),
            ...store.commentAttempts().map(attempt => attempt.commentBusy ? (attempt.commentStartedAt || Date.now()) + 61000 : (attempt.commentNextAt || Date.now() + 100)),
        ];
        if (times.length) await wake(Math.max(Date.now() + 100, Math.min(...times)));
    }
    const api = {
        runPhotos: runMedia,
        resumePhotos: resume,
        close: () => clearTimeout(timer),
        prepare(postId, calendarReview = false, accountId, retry = false) {
            if (typeof postId !== 'string') fail('Post ID required');
            if (!accountId && store.get('Post', postId).account_ids?.length > 1) return multi.preparePages(postId);
            return store.transaction(() => {
                const previous = store.currentAttempts(postId).find(value => !accountId || value.accountId === accountId);
                if (previous && !['prepared', 'cancelled'].includes(previous.status) && (!retry || previous.status !== 'failed')) fail('This post already has a publishing attempt. Check its history.', 409);
                const post = store.get('Post', postId);
                const { account, caption, media, comments } = destination(post, calendarReview && post.status === 'scheduled', accountId, retry);
                const attempt = { id: randomUUID(), postId, accountId: account.id, credentialId: account.credential_id, backend: account.connection_provider === 'postiz' ? 'postiz' : undefined, platform: account.platform, facebookPageId: account.platform === 'instagram' ? vault.read(account.credential_id).pageId : undefined, pageId: account.external_id, pageName: account.name, caption, media, ...(comments?.length ? { comments } : {}), tiktokOptions: post.destination_settings?.[account.id]?.tiktok, tiktokCreator: creators.get(account.id)?.nickname, timezone: post.timezone, revision: JSON.stringify(post), status: 'prepared', expiresAt: Date.now() + 10 * 60 * 1000 };
                store.removePrepared(postId, account.id); store.saveAttempt(attempt);
                return summary(attempt);
            });
        },
        status(attemptId) {
            const reviewed = multi.reviewStatus(attemptId); if (reviewed) return reviewed;
            if (store.currentAttempts(attemptId).some(value => value.multi)) return multi.postStatus(attemptId);
            const byPost = store.attemptForPost(attemptId);
            if ((!byPost || byPost.status === 'prepared') && store.all('Post').some(post => post.id === attemptId && post.status === 'scheduled')) return { postId: attemptId, status: 'calendar_plan' };
            const attempt = byPost || store.attempt(attemptId);
            if (attempt.backend !== 'postiz' && attempt.status === 'processing' && Date.now() - attempt.startedAt > 60000 && (attempt.busy || !attempt.media?.length) && attempt.videoStage !== 'processing' && !['processing', 'verify'].includes(attempt.instagramStage) && !['threads', 'tiktok', 'linkedin'].includes(attempt.platform)) return finish(attempt, 'unknown', attempt.platform === 'instagram' ? 'Instagram delivery is unconfirmed. Check the profile before creating another post; this attempt will not be resent.' : uncertainMessage);
            return summary(attempt);
        },
        async publish(attemptId) {
            if (typeof attemptId !== 'string') fail('Publishing confirmation ID required');
            if (store.publishingReview(attemptId)) return multi.publishPages(attemptId);
            let credential;
            const attempt = store.transaction(() => {
                const value = store.attempt(attemptId);
                const scheduled = value.status === 'queued';
                if (value.multi && value.status === 'prepared') fail('Confirm every Page together before publishing', 409);
                if (!scheduled && value.status !== 'prepared') return value;
                if (!scheduled && value.scheduledFor) fail('Confirm the automatic schedule instead', 409);
                if (scheduled && value.scheduledFor > Date.now()) fail('Scheduled publishing time has not arrived', 409);
                if (scheduled && Date.now() - value.scheduledFor > 15 * 60000) fail('Scheduled publishing was missed by more than 15 minutes. Duplicate as a draft and schedule again.', 409);
                if (!scheduled && value.expiresAt <= Date.now()) fail('Publishing confirmation expired. Review the post again.', 409);
                const post = store.get('Post', value.postId);
                const checked = destination(post, scheduled, value.multi ? value.accountId : undefined, scheduled || !!value.multi);
                if ((value.multi ? contentRevision(post) : JSON.stringify(post)) !== value.revision || checked.account.credential_id !== value.credentialId || checked.account.external_id !== value.pageId || checked.account.name !== value.pageName || checked.caption !== value.caption) fail('Post or Page changed. Review the post again.', 409);
                credential = checked.credential;
                const now = new Date().toISOString();
                const job = store.publishingWrite('PublishJob', { post_id: post.id, brand_id: post.brand_id, social_account_id: value.accountId, account_name: value.pageName, platform: value.platform || 'facebook', status: 'processing', attempts: 1, max_attempts: 1, last_attempt_at: now, is_demo: false }, scheduled ? value.jobId : undefined);
                if (JSON.stringify(checked.media) !== JSON.stringify(value.media || []) || JSON.stringify(checked.comments || []) !== JSON.stringify(value.comments || [])) fail('Post or Page changed. Review the post again.', 409);
                const variant = store.publishingWrite('PostVariant', { post_id: post.id, social_account_id: value.accountId, platform: value.platform || 'facebook', caption: value.caption, media_ids: (value.media || []).map(asset => asset.id), status: 'processing', is_demo: false });
                const claimed = { ...value, status: 'processing', startedAt: Date.now(), jobId: job.id, variantId: variant.id };
                store.saveAttempt(claimed);
                if (value.multi) syncDeliveryState(store, post.id);
                else store.publishingWrite('Post', { status: 'processing' }, post.id);
                return claimed;
            });
            if (!credential) return this.status(attempt.id);
            if (attempt.backend === 'postiz' || attempt.media?.length || ['threads', 'tiktok', 'linkedin'].includes(attempt.platform)) { await wake(Date.now() + 100); return summary(attempt); }
            await wake(attempt.startedAt + 61000);
            let result;
            try { result = await graph.publishText(attempt.pageId, attempt.caption, credential.token); }
            catch (error) {
                const denied = [190, 10, 200].includes(error.metaCode) && error.metaHttpStatus >= 400 && error.metaHttpStatus < 500;
                return finish(attempt, denied ? 'failed' : 'unknown', denied ? 'Facebook denied publishing. Reconnect and check Page/app publishing permissions.' : uncertainMessage);
            }
            // If persistence fails after Meta accepted the post, never send it again.
            const finished = finish(attempt, 'published', '', result);
            if (attempt.comments?.length) await resume();
            return finished;
        },
    };
    const scheduling = createScheduledDelivery(store, id => api.prepare(id, true), summary, wake, id => api.publish(id));
    const multi = createMultiPageDelivery(store, { prepare: (...args) => api.prepare(...args), destination, summary, wake, status: id => api.status(id) });
    const combined = {
        ...scheduling,
        prepareSchedule(postId, time, timezone) { const post = store.get('Post', postId); return post.account_ids?.length > 1 ? multi.preparePages(postId, time, timezone) : scheduling.prepareSchedule(postId, post.destination_settings?.[post.account_ids?.[0]]?.scheduled_at || time, timezone); },
        schedule: id => { if (store.publishingReview(id)) return multi.schedulePages(id); if (store.attempt(id).multi) fail('Confirm every Page together before publishing', 409); return scheduling.schedule(id); },
        cancelSchedule: id => store.currentAttempts(id).some(value => value.multi) ? multi.cancelAll(id) : scheduling.cancelSchedule(id),
        enqueue: id => { if (store.publishingReview(id) || store.attempt(id).multi) fail('Bulk schedules currently require one Page per post', 409); return scheduling.enqueue(id); },
        prepareRetry: multi.prepareRetry, cancelPage: multi.cancelPage,
    };
    return Object.assign(api, combined, createBulkScheduling(store, combined, wake));
}
