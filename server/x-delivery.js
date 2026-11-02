const uncertain = 'X delivery is unconfirmed. Check your X profile before creating another post; this attempt will not be resent.';

export function createXDelivery(store, vault, graph, finish) {
    return async function runX() {
        for (const candidate of store.pendingAttempts().filter(val => val.platform === 'x')) {
            if (candidate.nextVideoCheck > Date.now()) continue;
            if (candidate.busy) {
                if (Date.now() - candidate.startedAt > 60000) {
                    finish(candidate, 'unknown', uncertain);
                }
                continue;
            }
            const attempt = store.transaction(() => {
                const current = store.attempt(candidate.id);
                if (current.status !== 'processing' || current.busy) return null;
                const next = { ...current, busy: true, startedAt: Date.now() };
                store.saveAttempt(next);
                return next;
            });
            if (!attempt) continue;

            try {
                const account = store.get('SocialAccount', attempt.accountId);
                const credential = vault.read(attempt.credentialId);
                if (account.platform !== 'x' || account.connection_status !== 'connected' || credential.platform !== 'x' || !credential.token) {
                    finish(attempt, 'failed', 'X authorization changed. Reconnect X and review again.');
                    continue;
                }
                const result = await graph.createTweet(credential.token, attempt.caption);
                const username = account.username || 'i';
                const postUrl = `https://x.com/${username}/status/${result.id}`;
                finish(attempt, 'published', '', { id: result.id, url: postUrl });
            } catch (error) {
                const isDenied = error?.status === 401 || error?.status === 403 || error?.status === 400;
                finish(attempt, isDenied ? 'failed' : 'unknown', isDenied ? (error.message || 'X denied publishing.') : uncertain);
            }
            break;
        }
    };
}

