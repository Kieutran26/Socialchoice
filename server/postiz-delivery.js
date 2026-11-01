import { createMetaVault } from './meta-vault.js';
import { randomUUID } from 'node:crypto';
import { fail } from './validation.js';
import { resolveCaption } from '../src/lib/publishing-content.js';

const uncertain = 'Postiz delivery is unconfirmed. Check Postiz and the Page before creating another post; this attempt will not be resent.';

export function postizDestination(store, config, account, post, media) {
    if (!config.ready) fail('Postiz is not configured', 409);
    if (account.platform !== 'facebook' || account.account_type !== 'page' || account.is_demo || account.brand_id !== post.brand_id || account.connection_status !== 'connected' || !account.credential_id) fail('Connect the selected Postiz Page before publishing', 409);
    const credential = createMetaVault(store, config.encryptionKey).read(account.credential_id);
    if (credential.backend !== 'postiz' || credential.integrationId !== account.external_id) fail('Postiz connection changed. Import the channel again.', 409);
    const caption = resolveCaption(post, account);
    if (typeof caption !== 'string' || !caption.trim() || caption.length > 63206) fail('Facebook caption must contain between 1 and 63206 characters');
    return { account, credential, caption, media };
}

export function createPostizDelivery(store, config, client, finish, wake) {
    return async () => {
        for (const candidate of store.pendingAttempts().filter(row => row.backend === 'postiz')) {
            if (candidate.postizNextCheck > Date.now()) continue;
            if (candidate.busy) {
                if (Date.now() - (candidate.postizBusyAt || candidate.startedAt) > 60000) {
                    if (candidate.postizId) store.saveAttempt({ ...candidate, busy: false, postizNextCheck: 0 });
                    else finish(candidate, candidate.postizSubmitted ? 'unknown' : 'failed', candidate.postizSubmitted ? uncertain : 'Postiz preparation was interrupted before submission. Review and retry.');
                }
                continue;
            }
            const attempt = store.transaction(() => {
                const current = store.attempt(candidate.id);
                if (current.status !== 'processing' || current.busy) return null;
                const next = { ...current, busy: true, postizBusyAt: Date.now(), postizClaim: randomUUID() };
                store.saveAttempt(next);
                return next;
            });
            if (!attempt) continue;
            const owned = () => {
                const current = store.attempt(attempt.id);
                if (current.status !== 'processing' || current.postizClaim !== attempt.postizClaim) throw new Error('Postiz claim changed');
                const account = store.get('SocialAccount', attempt.accountId);
                if (account.connection_provider !== 'postiz' || account.external_id !== attempt.pageId || account.credential_id !== attempt.credentialId || account.connection_status !== 'connected') throw new Error('Postiz authorization changed');
                store.saveAttempt({ ...current, postizBusyAt: Date.now() });
            };
            await wake(Date.now() + 61000);
            try {
                const account = store.get('SocialAccount', attempt.accountId);
                if (account.credential_id !== attempt.credentialId || account.connection_status !== 'connected') {
                    finish(attempt, attempt.postizId ? 'unknown' : 'failed', 'Postiz authorization changed. Check Postiz before retrying.');
                    continue;
                }
                let postizId = attempt.postizId;
                if (!postizId) {
                    if (attempt.postizSubmitted) { finish(attempt, 'unknown', uncertain); continue; }
                    const available = (await client.channels()).find(row => row.id === attempt.pageId && !row.disabled);
                    if (!available) { finish(attempt, 'failed', 'Postiz channel is disconnected. Import or reconnect the channel.'); continue; }
                    const images = [];
                    for (const asset of attempt.media || []) { owned(); images.push(await client.upload(asset, store.images.read(asset.storage_id))); }
                    owned();
                    // Persist the claim before the non-idempotent call. Never resend after a crash or timeout.
                    store.saveAttempt({ ...store.attempt(attempt.id), postizSubmitted: true });
                    const result = await client.create({ type: 'now', date: new Date().toISOString(), shortLink: false, tags: [], posts: [{ integration: { id: attempt.pageId }, value: [{ content: attempt.caption, image: images }], settings: { __type: 'facebook', url: '' } }] });
                    owned();
                    if (!Array.isArray(result) || result.length !== 1 || typeof result[0].postId !== 'string' || result[0].integration !== attempt.pageId) throw new Error('Invalid Postiz acceptance');
                    postizId = result[0].postId;
                    store.saveAttempt({ ...store.attempt(attempt.id), postizId });
                }
                const remote = (await client.posts(attempt.startedAt)).find(row => row.id === postizId && row.integration?.id === attempt.pageId);
                owned();
                if (remote?.state === 'PUBLISHED') {
                    const url = new URL(remote.releaseURL);
                    if (url.protocol !== 'https:' || !/(^|\.)facebook\.com$/.test(url.hostname) || typeof remote.releaseId !== 'string' || !remote.releaseId) throw new Error('Invalid publication proof');
                    finish(attempt, 'published', '', { id: remote.releaseId, url: url.href });
                } else if (remote?.state === 'ERROR') finish(attempt, 'failed', 'Postiz reported a publishing error. Check the channel in Postiz.');
                else if (Date.now() - attempt.startedAt > 30 * 60000) finish(attempt, 'unknown', uncertain);
                else {
                    const next = Date.now() + 10000;
                    store.saveAttempt({ ...store.attempt(attempt.id), busy: false, postizNextCheck: next });
                    await wake(next);
                }
            } catch {
                const current = store.attempt(attempt.id);
                if (current.status !== 'processing' || current.postizClaim !== attempt.postizClaim) continue;
                if (store.attempt(attempt.id).postizId && Date.now() - attempt.startedAt < 30 * 60000) {
                    store.saveAttempt({ ...store.attempt(attempt.id), busy: false, postizNextCheck: Date.now() + 10000 });
                    await wake(Date.now() + 10000);
                } else {
                    const submitted = store.attempt(attempt.id).postizSubmitted;
                    finish(attempt, submitted ? 'unknown' : 'failed', submitted ? uncertain : 'Postiz preparation failed before submission. Check the connection and retry.');
                }
            }
        }
    };
}
