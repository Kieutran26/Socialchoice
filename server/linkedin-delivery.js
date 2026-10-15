const uncertain = 'LinkedIn delivery is unconfirmed. Check the profile before creating another post; this attempt will not be resent.';
export function createLinkedinDelivery(store, vault, graph, finish, wake) {
    return async function runLinkedin() {
        for (const candidate of store.pendingAttempts().filter(value => value.platform === 'linkedin')) {
            if (candidate.nextVideoCheck > Date.now()) continue;
            if (candidate.busy) {
                if (Date.now() - candidate.startedAt > 60000) {
                    if (candidate.linkedinStage === 'processing') store.transaction(() => { const current = store.attempt(candidate.id); if (current.status === 'processing' && current.startedAt === candidate.startedAt) store.saveAttempt({ ...current, busy: false }); });
                    else finish(candidate, 'unknown', uncertain);
                }
                continue;
            }
            const attempt = store.transaction(() => { const current = store.attempt(candidate.id); if (current.status !== 'processing' || current.busy) return null; const next = { ...current, busy: true, startedAt: Date.now(), linkedinStage: current.linkedinStage || (current.media.length ? 'register' : 'publish') }; store.saveAttempt(next); return next; });
            if (!attempt) continue;
            await wake(Date.now() + 61000);
            let patch;
            try {
                const account = store.get('SocialAccount', attempt.accountId), credential = vault.read(attempt.credentialId);
                if (account.platform !== 'linkedin' || account.external_id !== attempt.pageId || account.credential_id !== attempt.credentialId || account.connection_status !== 'connected' || credential.platform !== 'linkedin' || credential.profileId !== attempt.pageId || credential.expiresAt <= Date.now() || !['openid', 'profile', 'w_member_social'].every(scope => credential.scopes?.includes(scope) && account.scopes?.includes(scope))) throw Object.assign(new Error('LinkedIn authorization changed. Reconnect and review again.'), { status: 409 });
                const profile = await graph.profile(credential.token);
                if (profile.id !== attempt.pageId) throw Object.assign(new Error('LinkedIn member changed. Reconnect and review again.'), { status: 409 });
                await graph.permissions(credential.token);
                const currentAccount=store.get('SocialAccount',attempt.accountId);
                if(currentAccount.credential_id!==attempt.credentialId||currentAccount.external_id!==attempt.pageId||currentAccount.connection_status!=='connected')throw Object.assign(new Error('LinkedIn connection changed during preflight'),{status:409});
                const index = attempt.linkedinAssets?.length || 0;
                if (attempt.linkedinStage === 'register') {
                    const upload = await graph.register(attempt.pageId, attempt.media[0].file_type === 'video', credential.token);
                    patch = { linkedinUpload: upload, linkedinStage: 'upload' };
                } else if (attempt.linkedinStage === 'upload') {
                    await graph.upload(attempt.linkedinUpload.uploadUrl, store.images.read(attempt.media[index].storage_id), credential.token);
                    patch = { linkedinStage: 'processing', linkedinProcessingSince: Date.now(), nextVideoCheck: Date.now() + 3000 };
                } else if (attempt.linkedinStage === 'processing') {
                    const state = await graph.assetStatus(attempt.linkedinUpload.asset, credential.token);
                    if (state === 'failed') { finish(attempt, 'failed', 'LinkedIn could not process this media.'); continue; }
                    if (state === 'ready') {
                        const assets = [...(attempt.linkedinAssets || []), attempt.linkedinUpload.asset];
                        patch = { linkedinAssets: assets, linkedinUpload: null, linkedinStage: assets.length < attempt.media.length ? 'register' : 'publish', nextVideoCheck: Date.now() + 100 };
                    } else if (Date.now() - attempt.linkedinProcessingSince > 30 * 60000) { finish(attempt, 'unknown', uncertain); continue; }
                    else patch = { nextVideoCheck: Date.now() + 10000 };
                } else if (attempt.linkedinStage === 'publish') {
                    const result = await graph.publish(attempt.pageId, attempt.caption, attempt.linkedinAssets || [], attempt.media[0]?.file_type === 'video', credential.token);
                    finish(attempt, 'published', '', result); continue;
                } else { finish(attempt, 'unknown', uncertain); continue; }
            } catch (error) {
                if(error.linkedinGrantInvalid){const account=store.get('SocialAccount',attempt.accountId);if(account.credential_id===attempt.credentialId)store.verifiedAccount({connection_status:'expired'},account.id);}
                const denied = error.status === 409 || [400, 401, 403, 404, 422, 429].includes(error.linkedinStatus);
                if (attempt.linkedinStage === 'processing' && !denied && Date.now() - attempt.linkedinProcessingSince < 30 * 60000) patch = { nextVideoCheck: Date.now() + 15000 };
                else { finish(attempt, denied ? 'failed' : 'unknown', denied ? 'LinkedIn denied publishing or access changed. Reconnect and review again.' : uncertain); continue; }
            }
            store.transaction(() => { const current = store.attempt(attempt.id); if (current.status === 'processing' && current.startedAt === attempt.startedAt) store.saveAttempt({ ...current, ...patch, busy: false, startedAt: Date.now() }); });
            break;
        }
    };
}
