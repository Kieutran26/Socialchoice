const uncertain = 'Facebook delivery is unconfirmed. Check the Page before creating another post; this attempt will not be resent.';

// Alarms may run more than once. Persist an operation claim before calling Meta.
export function createPhotoDelivery(store, vault, graph, finish, wake) {
    return async function run() {
        const pending = store.pendingAttempts().filter(attempt => attempt.media?.length);
        for (const candidate of pending) {
            if (candidate.busy) {
                if (Date.now() - candidate.startedAt > 60000) finish(candidate, 'unknown', uncertain);
                continue;
            }
            const attempt = store.transaction(() => {
                const current = store.attempt(candidate.id);
                if (current.status !== 'processing' || current.busy) return null;
                const claimed = { ...current, busy: true, startedAt: Date.now() };
                store.saveAttempt(claimed);
                return claimed;
            });
            if (!attempt) continue;
            // The watchdog runs after a crash, never repeats an uncertain operation.
            await wake(Date.now() + 61000);
            let token;
            try {
                const account = store.get('SocialAccount', attempt.accountId);
                if (account.credential_id !== attempt.credentialId || account.connection_status !== 'connected') throw new Error('Changed authorization');
                token = vault.read(attempt.credentialId).token;
            } catch {
                finish(attempt, 'failed', 'Facebook authorization changed during publishing. Reconnect and review a new post.');
                continue;
            }
            let result, photoId;
            try {
                const ids = attempt.photoIds || [];
                if (ids.length < attempt.media.length) {
                    const image = attempt.media[ids.length];
                    photoId = await graph.uploadPhoto(attempt.pageId, { name: image.name, type: image.mime_type, bytes: store.images.read(image.storage_id) }, token);
                } else result = await graph.publishText(attempt.pageId, attempt.caption, token, ids);
            } catch (error) {
                const denied = [190,10,200].includes(error.metaCode) && error.metaHttpStatus >= 400 && error.metaHttpStatus < 500;
                finish(attempt, denied ? 'failed' : 'unknown', denied ? 'Facebook denied publishing. Reconnect and check Page/app publishing permissions.' : uncertain);
                continue;
            }
            // A persistence error leaves busy=true; replay never repeats the HTTP operation.
            if (result) finish(attempt, 'published', '', result);
            else store.transaction(() => {
                const current = store.attempt(attempt.id);
                if (current.status !== 'processing') return;
                store.saveAttempt({ ...current, busy: false, photoIds: [...(current.photoIds || []), photoId], startedAt: Date.now() });
            });
            break;
        }
        const remaining = store.pendingAttempts().filter(attempt => attempt.media?.length);
        if (remaining.length) await wake(Math.min(...remaining.map(attempt => attempt.busy ? attempt.startedAt + 61000 : Date.now() + 100)));
    };
}
