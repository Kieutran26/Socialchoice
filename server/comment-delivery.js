export function createCommentDelivery(store, vaults, graphs, mediaAccess, wake) {
    const { metaVault, threadsVault, linkedinVault } = vaults;
    const { metaGraph, instagramGraph, threadsGraph, linkedinGraph } = graphs;

    return async function runComments() {
        for (const candidate of store.commentAttempts()) {
            if (candidate.commentNextAt > Date.now()) continue;
            if (candidate.commentBusy) {
                if (Date.now() - (candidate.commentStartedAt || 0) > 60000) {
                    store.transaction(() => {
                        const current = store.attempt(candidate.id);
                        if (current.status !== 'published' || !current.commentBusy) return;
                        const idx = current.commentIndex || 0;
                        const results = [...(current.commentResults || [])];
                        if (results[idx]) results[idx] = { ...results[idx], status: 'unknown', message: 'Comment delivery timed out.' };
                        store.saveAttempt({ ...current, commentBusy: false, commentStatus: 'unknown', commentNextAt: undefined, commentResults: results });
                    });
                }
                continue;
            }

            const attempt = store.transaction(() => {
                const current = store.attempt(candidate.id);
                if (current.status !== 'published' || !['queued', 'processing'].includes(current.commentStatus) || current.commentBusy || current.commentNextAt > Date.now()) return null;
                const claimed = { ...current, commentBusy: true, commentStatus: 'processing', commentStartedAt: Date.now() };
                store.saveAttempt(claimed);
                return claimed;
            });
            if (!attempt) continue;

            await wake(Date.now() + 61000);
            const idx = attempt.commentIndex || 0;
            const comment = attempt.comments?.[idx];
            if (!comment) {
                store.transaction(() => {
                    const current = store.attempt(attempt.id);
                    store.saveAttempt({ ...current, commentBusy: false, commentStatus: 'published', commentNextAt: undefined });
                });
                continue;
            }

            const platform = attempt.platform || 'facebook';
            let publishedCommentId = null;
            let patch = null;

            try {
                const account = store.get('SocialAccount', attempt.accountId);
                if (account.credential_id !== attempt.credentialId || account.connection_status !== 'connected') {
                    throw new Error('Account authorization changed before comment delivery.');
                }

                if (platform === 'facebook') {
                    const credential = metaVault.read(attempt.credentialId);
                    let photoId;
                    if (comment.media?.length) {
                        const image = comment.media[0];
                        photoId = await metaGraph.uploadPhoto(
                            attempt.pageId,
                            { name: image.name, type: image.mime_type, bytes: store.images.read(image.storage_id) },
                            credential.token
                        );
                    }
                    const res = await metaGraph.publishComment(attempt.externalId, comment.message, credential.token, photoId);
                    publishedCommentId = res.id;
                } else if (platform === 'instagram') {
                    const credential = metaVault.read(attempt.credentialId);
                    const res = await instagramGraph.publishComment(attempt.externalId, comment.message, credential.token);
                    publishedCommentId = res.id;
                } else if (platform === 'threads') {
                    const credential = threadsVault.read(attempt.credentialId);
                    const parentId = idx > 0 ? (attempt.commentResults?.[idx - 1]?.externalId || attempt.externalId) : attempt.externalId;
                    const stage = attempt.commentThreadsStage || 'create';
                    if (stage === 'create') {
                        const asset = comment.media?.[0] || null;
                        const publicUrl = asset ? mediaAccess.url(attempt, asset) : null;
                        const containerId = await threadsGraph.create(attempt.pageId, asset, publicUrl, comment.message, credential.token, parentId);
                        patch = {
                            commentThreadsContainerId: containerId,
                            commentThreadsStage: 'processing',
                            commentThreadsSince: Date.now(),
                            commentNextAt: Date.now() + 1500,
                        };
                    } else if (stage === 'processing') {
                        const state = await threadsGraph.status(attempt.commentThreadsContainerId, credential.token);
                        if (['ERROR', 'EXPIRED'].includes(state)) throw new Error('Threads could not process the comment media.');
                        if (state === 'FINISHED') {
                            publishedCommentId = await threadsGraph.publish(attempt.pageId, attempt.commentThreadsContainerId, credential.token);
                        } else if (Date.now() - (attempt.commentThreadsSince || attempt.commentStartedAt) > 15 * 60000) {
                            throw new Error('Threads comment media processing timed out.');
                        } else {
                            patch = { commentNextAt: Date.now() + 5000 };
                        }
                    }
                } else if (platform === 'linkedin') {
                    let actorAccount = account;
                    let credential = linkedinVault.read(attempt.credentialId);
                    if (comment.actor_account_id && comment.actor_account_id !== attempt.accountId) {
                        const customActor = store.get('SocialAccount', comment.actor_account_id);
                        if (customActor.platform !== 'linkedin' || customActor.connection_status !== 'connected' || !customActor.credential_id) {
                            throw new Error('LinkedIn comment actor account is not connected.');
                        }
                        actorAccount = customActor;
                        credential = linkedinVault.read(customActor.credential_id);
                    }
                    const actorUrn = actorAccount.account_type === 'page'
                        ? `urn:li:organization:${actorAccount.external_id}`
                        : `urn:li:person:${actorAccount.external_id}`;
                    const res = await linkedinGraph.publishComment(actorUrn, attempt.externalId, comment.message, credential.token);
                    publishedCommentId = res.id;
                } else {
                    throw new Error('Platform does not support automatic comments.');
                }
            } catch (error) {
                store.transaction(() => {
                    const current = store.attempt(attempt.id);
                    const results = [...(current.commentResults || [])];
                    const errMsg = error?.message || 'Follow-up comment could not be published.';
                    if (results[idx]) results[idx] = { ...results[idx], status: 'failed', message: errMsg };
                    store.saveAttempt({
                        ...current,
                        commentBusy: false,
                        commentStatus: 'failed',
                        commentNextAt: undefined,
                        commentThreadsContainerId: undefined,
                        commentThreadsStage: undefined,
                        commentResults: results,
                    });
                    store.publishingWrite('PublishingLog', {
                        post_id: current.postId,
                        publish_job_id: current.jobId,
                        account_name: current.pageName,
                        platform,
                        level: 'warning',
                        message: `Comment #${idx + 1} failed: ${errMsg}`,
                        occurred_at: new Date().toISOString(),
                        is_demo: false,
                    });
                });
                continue;
            }

            if (patch) {
                store.transaction(() => {
                    const current = store.attempt(attempt.id);
                    store.saveAttempt({ ...current, ...patch, commentBusy: false });
                });
                break;
            }

            if (publishedCommentId) {
                store.transaction(() => {
                    const current = store.attempt(attempt.id);
                    const results = [...(current.commentResults || [])];
                    const now = new Date().toISOString();
                    if (results[idx]) {
                        results[idx] = { ...results[idx], status: 'published', externalId: publishedCommentId, publishedAt: now };
                    }
                    const nextIdx = idx + 1;
                    const hasMore = nextIdx < (current.comments?.length || 0);
                    const nextDelayMs = hasMore ? (current.comments[nextIdx]?.delay_minutes || 0) * 60000 : 0;
                    store.saveAttempt({
                        ...current,
                        commentBusy: false,
                        commentIndex: hasMore ? nextIdx : idx,
                        commentStatus: hasMore ? (nextDelayMs > 0 ? 'queued' : 'processing') : 'published',
                        commentNextAt: hasMore ? Date.now() + nextDelayMs : undefined,
                        commentThreadsContainerId: undefined,
                        commentThreadsStage: undefined,
                        commentThreadsSince: undefined,
                        commentResults: results,
                    });
                    store.publishingWrite('PublishingLog', {
                        post_id: current.postId,
                        publish_job_id: current.jobId,
                        account_name: current.pageName,
                        platform,
                        level: 'info',
                        message: `Follow-up comment #${idx + 1} published (${publishedCommentId}).`,
                        occurred_at: now,
                        is_demo: false,
                    });
                });
                break;
            }
        }
    };
}

