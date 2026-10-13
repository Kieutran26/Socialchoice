import { createScheduledDelivery } from './facebook-scheduled-delivery.js';
import { randomUUID } from 'node:crypto';
import { createMetaGraph } from './meta-graph.js';
import { createMetaVault } from './meta-vault.js';
import { fail } from './validation.js';
import { createPhotoDelivery } from './facebook-photo-delivery.js';
import { createVideoDelivery } from './facebook-video-delivery.js';

const uncertainMessage = 'Facebook delivery is unconfirmed. Check the Page before creating another post; this attempt will not be resent.';

export function canFinishPublication(current, attempt, status, confirmed) {
    if (current.id !== attempt.id || current.startedAt !== attempt.startedAt) return false;
    if (status === 'published' && !confirmed) return false;
    // A valid late feed acknowledgement may resolve uncertainty; never downgrade it.
    return current.status === 'processing' || current.status === 'unknown' && status === 'published' && confirmed;
}

// Claim the immutable approval in a synchronous transaction before any network I/O.
export function createFacebookPublisher(store, config, options = {}) {
    const graph = config.ready ? createMetaGraph(config) : null;
    const vault = config.ready ? createMetaVault(store, config.key) : null;
    const summary = attempt => ({ attemptId: attempt.id, postId: attempt.postId, pageName: attempt.pageName, pageId: attempt.pageId, caption: attempt.caption, status: attempt.status, scheduledFor: attempt.scheduledFor, timezone: attempt.timezone, expiresAt: attempt.expiresAt, media: (attempt.media || []).map(image => ({ id: image.id, name: image.name, file_url: image.file_url, file_type:image.file_type })), uploadedPhotos: attempt.photoIds?.length || 0,videoStage:attempt.videoStage,uploadedVideoBytes:attempt.videoStart||0, ...(attempt.url ? { publishedUrl: attempt.url, externalPostId: attempt.externalId } : {}), ...(attempt.message ? { message: attempt.message } : {}) });

    function destination(post, scheduled = false) {
        if (!config.ready) fail('Configure Meta before publishing', 409);
        if (post.is_demo || post.status !== (scheduled ? 'scheduled' : 'draft')) fail('Publish now requires a live draft', 409);
        const brand = store.get('Brand', post.brand_id);
        if (brand.is_demo || brand.status === 'archived') fail('Choose an active live brand', 409);
        if (post.account_ids?.length !== 1) fail('Publish now requires exactly one Facebook Page', 409);
        const mediaIds = post.media_ids || [];
        if (mediaIds.length > 10 || new Set(mediaIds).size !== mediaIds.length) fail('Choose up to 10 different images');
        const media = mediaIds.map(id => {
            const image = store.get('MediaAsset', id);
            if (image.is_demo || image.brand_id !== post.brand_id || !['image','video'].includes(image.file_type) || !image.storage_id || !store.images.has(image.storage_id)) fail('Choose stored media from the same live brand', 409);
            return image;
        });
        if(media.some(asset=>asset.file_type==='video')&&media.length!==1) fail('Choose one video or up to 10 images, not both');
        const account = store.get('SocialAccount', post.account_ids[0]);
        if (account.is_demo || account.brand_id !== post.brand_id || account.platform !== 'facebook' || account.account_type !== 'page' || account.connection_status !== 'connected' || !account.credential_id || !/^\d+$/.test(account.external_id)) fail('Connect a Facebook Page before publishing', 409);
        const credential = vault.read(account.credential_id);
        if (!account.scopes?.includes('pages_manage_posts') || !credential.scopes?.includes('pages_manage_posts')) fail('Reconnect Facebook and grant pages_manage_posts before publishing', 409);
        if (!credential.tasks?.some(task => ['CREATE_CONTENT', 'PROFILE_PLUS_CREATE_CONTENT'].includes(task))) fail('Reconnect a Page with permission to create content', 409);
        if (typeof credential.token !== 'string' || !credential.token) fail('Reconnect Facebook before publishing', 409);
        const caption = post.platform_captions?.facebook || post.caption;
        if (typeof caption !== 'string' || !caption.trim() || caption.length > 63206) fail('Facebook caption must contain between 1 and 63206 characters');
        return { account, credential, caption, media };
    }

    function finish(attempt, status, message, result) {
        return store.transaction(() => {
            const current = store.attempt(attempt.id);
            if (!canFinishPublication(current, attempt, status, !!result)) return summary(current);
            const now = new Date().toISOString();
            const next = { ...current, status, message, ...(result ? { externalId: result.id, url: result.url } : {}) };
            store.saveAttempt(next);
            store.publishingWrite('PublishJob', { status, error_message: message || '', ...(result ? { external_post_id: result.id, published_url: result.url } : {}) }, current.jobId);
            store.publishingWrite('PostVariant', { status }, current.variantId);
            store.publishingWrite('Post', { status, ...(result ? { published_at: now } : {}) }, current.postId);
            store.publishingWrite('PublishingLog', { post_id: current.postId, publish_job_id: current.jobId, account_name: current.pageName, platform: 'facebook', level: status === 'published' ? 'success' : status === 'failed' ? 'error' : 'warning', message: message || 'Facebook confirmed the post ID.', occurred_at: now, is_demo: false });
            return summary(next);
        });
    }

    let timer, timerAt, wakeChain = Promise.resolve();
    const wake = options.wake ? time => { const next = wakeChain.catch(()=>{}).then(()=>options.wake(time)); wakeChain = next; return next; } : (async time => {
        if (timer && timerAt <= time) return;
        clearTimeout(timer); timerAt = time;
        timer = setTimeout(() => { timer = null; timerAt = null; void runMedia().catch(() => {}); }, Math.min(2147483647, Math.max(0, time - Date.now())));
        timer.unref?.();
    });
    const runPhotos = createPhotoDelivery(store, vault, graph, finish, wake);
    const runVideos = createVideoDelivery(store,vault,graph,finish,wake);
    async function runMedia() {
        try { for(const attempt of store.pendingAttempts().filter(value=>!value.media?.length && Date.now()-value.startedAt>60000)) finish(attempt,'unknown',uncertainMessage); await scheduling.runDue();await runPhotos();await runVideos();}
        finally { await resume(); }
    }
    async function resume() {
        const times = [...store.queuedAttempts().map(attempt=>attempt.scheduledFor), ...store.pendingAttempts().map(attempt=>!attempt.media?.length || attempt.busy ? attempt.startedAt+61000 : attempt.nextVideoCheck||Date.now()+100)];
        if(times.length) await wake(Math.max(Date.now()+100,Math.min(...times)));
    }
    const api = {
        runPhotos:runMedia,
        resumePhotos: resume,
        close: () => clearTimeout(timer),
        prepare(postId, calendarReview = false) {
            if (typeof postId !== 'string') fail('Post ID required');
            return store.transaction(() => {
                const previous = store.attemptForPost(postId);
                if (previous && previous.status !== 'prepared') fail('This post already has a publishing attempt. Check its history.', 409);
                const post = store.get('Post', postId);
                const { account, caption, media } = destination(post, calendarReview && post.status === 'scheduled');
                const attempt = { id: randomUUID(), postId, accountId: account.id, credentialId: account.credential_id, pageId: account.external_id, pageName: account.name, caption, media, timezone: post.timezone, revision: JSON.stringify(post), status: 'prepared', expiresAt: Date.now() + 10 * 60 * 1000 };
                store.saveAttempt(attempt);
                return summary(attempt);
            });
        },
        status(attemptId) {
            const byPost = store.attemptForPost(attemptId);
            if ((!byPost || byPost.status === 'prepared') && store.all('Post').some(post=>post.id === attemptId && post.status === 'scheduled')) return { postId: attemptId, status: 'calendar_plan' };
            const attempt = byPost || store.attempt(attemptId);
            if (attempt.status === 'processing' && Date.now() - attempt.startedAt > 60000 && (attempt.busy || !attempt.media?.length) && attempt.videoStage!=='processing') return finish(attempt, 'unknown', uncertainMessage);
            return summary(attempt);
        },
        async publish(attemptId) {
            if (typeof attemptId !== 'string') fail('Publishing confirmation ID required');
            let credential;
            const attempt = store.transaction(() => {
                const value = store.attempt(attemptId);
                const scheduled = value.status === 'queued';
                if (!scheduled && value.status !== 'prepared') return value;
                if (!scheduled && value.scheduledFor) fail('Confirm the automatic schedule instead',409);
                if (scheduled && value.scheduledFor > Date.now()) fail('Scheduled publishing time has not arrived',409);
                if (scheduled && Date.now()-value.scheduledFor > 15*60000) fail('Scheduled publishing was missed by more than 15 minutes. Duplicate as a draft and schedule again.',409);
                if (!scheduled && value.expiresAt <= Date.now()) fail('Publishing confirmation expired. Review the post again.', 409);
                const post = store.get('Post', value.postId);
                const checked = destination(post, scheduled);
                if (JSON.stringify(post) !== value.revision || checked.account.credential_id !== value.credentialId || checked.account.external_id !== value.pageId || checked.account.name !== value.pageName || checked.caption !== value.caption) fail('Post or Page changed. Review the post again.', 409);
                credential = checked.credential;
                const now = new Date().toISOString();
                const job = store.publishingWrite('PublishJob', { post_id: post.id, brand_id: post.brand_id, social_account_id: value.accountId, account_name: value.pageName, platform: 'facebook', status: 'processing', attempts: 1, max_attempts: 1, last_attempt_at: now, is_demo: false }, scheduled ? value.jobId : undefined);
                if (JSON.stringify(checked.media) !== JSON.stringify(value.media || [])) fail('Post or Page changed. Review the post again.', 409);
                const variant = store.publishingWrite('PostVariant', { post_id: post.id, social_account_id: value.accountId, platform: 'facebook', caption: value.caption, media_ids: post.media_ids || [], status: 'processing', is_demo: false });
                const claimed = { ...value, status: 'processing', startedAt: Date.now(), jobId: job.id, variantId: variant.id };
                store.saveAttempt(claimed);
                store.publishingWrite('Post', { status: 'processing' }, post.id);
                return claimed;
            });
            if (!credential) return this.status(attempt.id);
            if (attempt.media?.length) { await wake(Date.now() + 100); return summary(attempt); }
            await wake(attempt.startedAt + 61000);
            let result;
            try { result = await graph.publishText(attempt.pageId, attempt.caption, credential.token); }
            catch (error) {
                const denied = [190, 10, 200].includes(error.metaCode) && error.metaHttpStatus >= 400 && error.metaHttpStatus < 500;
                return finish(attempt, denied ? 'failed' : 'unknown', denied ? 'Facebook denied publishing. Reconnect and check Page/app publishing permissions.' : uncertainMessage);
            }
            // If persistence fails after Meta accepted the post, never send it again.
            return finish(attempt, 'published', '', result);
        },
    };
    const scheduling = createScheduledDelivery(store, id => api.prepare(id,true), summary, wake, id => api.publish(id));
    return Object.assign(api,scheduling);
}
