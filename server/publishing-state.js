// Runtime progress must not invalidate the content approved for sibling Pages.
export function contentRevision(post) {
    const { status, updated_date, scheduled_at, published_at, ...content } = post;
    void status; void updated_date; void scheduled_at; void published_at;
    return JSON.stringify(content);
}

export function deliveryState(attempts) {
    if(!attempts.length) return 'draft';
    const states = attempts.map(attempt => attempt.status);
    if (states.includes('processing') || attempts.some(attempt=>attempt.status==='queued'&&attempt.immediate)) return 'processing';
    if (states.includes('queued')) return 'scheduled';
    if (states.every(status => status === 'published')) return 'published';
    if (states.includes('published')) return 'partially_published';
    if (states.includes('unknown')) return 'unknown';
    if (states.includes('failed')) return 'failed';
    return 'draft';
}

export function syncDeliveryState(store, postId) {
    const attempts = store.currentAttempts(postId).filter(attempt => attempt.status !== 'prepared');
    const status = attempts.length ? deliveryState(attempts) : 'draft';
    const queued = attempts.filter(attempt => attempt.status === 'queued');
    return store.publishingWrite('Post', {
        status,
        scheduled_at: queued.length ? new Date(Math.min(...queued.map(attempt => attempt.scheduledFor))).toISOString() : null,
        ...(status === 'published' ? { published_at: new Date().toISOString() } : {}),
    }, postId);
}
