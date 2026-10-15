import { validateTiktokOptions } from './tiktok-options.js';

const uncertain = 'TikTok delivery is unconfirmed. Check the profile before creating another post; this attempt will not be resent.';
export function createTiktokDelivery(store, tokens, graph, mediaAccess, finish, wake) {
    return async function runTiktok() {
        for (const candidate of store.pendingAttempts().filter(a => a.platform === 'tiktok')) {
            if (candidate.nextVideoCheck > Date.now()) continue;
            if (candidate.busy) {
                if (Date.now() - candidate.startedAt > 60000) {
                    if (['status','preflight'].includes(candidate.tiktokStage)) store.transaction(() => { const c = store.attempt(candidate.id); if (c.status === 'processing' && c.startedAt === candidate.startedAt) store.saveAttempt({ ...c, busy: false, nextVideoCheck: Date.now() + 100 }); });
                    else finish(candidate, 'unknown', uncertain);
                }
                continue;
            }
            const attempt = store.transaction(() => { const c = store.attempt(candidate.id); if (c.status !== 'processing' || c.busy) return null; const a = { ...c, busy: true, startedAt: Date.now(), tiktokStage: c.tiktokStage || 'preflight', tiktokSince: c.tiktokSince || Date.now() }; store.saveAttempt(a); return a; });
            if (!attempt) continue;
            await wake(Date.now() + 61000);
            let patch;
            try {
                if (Date.now() - attempt.tiktokSince > 30 * 60000) { finish(attempt, 'unknown', uncertain); continue; }
                const account = store.get('SocialAccount', attempt.accountId);
                if (account.credential_id !== attempt.credentialId || account.external_id !== attempt.pageId) throw Object.assign(new Error('Connection changed'), { status: 409 });
                const credential = await tokens.get(account);
                if (attempt.tiktokStage === 'preflight') {
                    const profile = await graph.profile(credential.token);
                    if (profile.id !== attempt.pageId) throw Object.assign(new Error('Identity changed'), { status: 409 });
                    const creator = await graph.creator(credential.token);
                    validateTiktokOptions(attempt.tiktokOptions, creator, attempt.media);
                    // Read-only preflight completes before a separate durable write claim.
                    patch = { tiktokStage: 'create', nextVideoCheck: Date.now() + 100 };
                } else if (attempt.tiktokStage === 'create') {
                    const id = await graph.create(credential.token, attempt.caption, attempt.tiktokOptions, mediaAccess.url(attempt, attempt.media[0]));
                    patch = { tiktokStage: 'status', tiktokPublishId: id, nextVideoCheck: Date.now() + 10000 };
                } else if (attempt.tiktokStage === 'status') {
                    const state = await graph.status(credential.token, attempt.tiktokPublishId);
                    // Private posts have no public post ID or permalink. Preserve the provider reference.
                    if (state === 'PUBLISH_COMPLETE') { finish(attempt, 'published', '', { id: attempt.tiktokPublishId }); continue; }
                    if (state === 'FAILED') { finish(attempt, 'failed', 'TikTok confirmed video processing failed. Check the format and private account eligibility.'); continue; }
                    if (state === 'SEND_TO_USER_INBOX') { finish(attempt, 'unknown', uncertain); continue; }
                    patch = { nextVideoCheck: Date.now() + 15000 };
                } else { finish(attempt, 'unknown', uncertain); continue; }
            } catch (error) {
                const denied = error.status === 409 || ['access_token_invalid','scope_not_authorized','invalid_param','invalid_params','url_ownership_unverified','privacy_level_option_mismatch','unaudited_client_can_only_post_to_private_accounts','spam_risk_too_many_posts','spam_risk_user_banned_from_posting','reached_active_user_cap'].includes(error.tiktokCode);
                if (attempt.tiktokStage === 'status' && !denied) patch = { nextVideoCheck: Date.now() + 15000 };
                else finish(attempt, attempt.tiktokStage !== 'status' && denied ? 'failed' : 'unknown', attempt.tiktokStage !== 'status' && denied ? 'TikTok access or creator settings changed. Reconnect and review again.' : uncertain);
            }
            if (patch) store.transaction(() => { const c = store.attempt(attempt.id); if (c.status === 'processing' && c.startedAt === attempt.startedAt) store.saveAttempt({ ...c, ...patch, busy: false }); });
            break;
        }
    };
}
