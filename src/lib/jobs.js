import { appClient } from '@/api/app-client';

const ACTIVE_JOB_STATES = ['pending', 'processing', 'published'];

/**
 * Keeps the per-destination publishing jobs in step with a post's selected accounts.
 * One job per destination: removed destinations get cancelled, new ones get queued.
 */
export const syncJobsForPost = async (post, accounts) => {
    const page = await appClient.entities.PublishJob.filter({ post_id: post.id }, { limit: 200 });
    const byAccount = {};
    page.items.forEach((job) => {
        byAccount[job.social_account_id] = [...(byAccount[job.social_account_id] || []), job];
    });

    const wanted = new Map(accounts.map((a) => [a.id, a]));
    const creates = [];
    const updates = [];

    wanted.forEach((account, accountId) => {
        const jobs = byAccount[accountId] || [];
        const active = jobs.find((job) => ACTIVE_JOB_STATES.includes(job.status));
        if (active) {
            if (active.status === 'pending') {
                updates.push({ id: active.id, scheduled_for: post.scheduled_at, account_name: account.name });
            }
            return;
        }
        const cancelled = jobs.find((job) => job.status === 'cancelled');
        if (cancelled) {
            updates.push({
                id: cancelled.id,
                status: 'pending',
                scheduled_for: post.scheduled_at,
                account_name: account.name,
                error_message: '',
            });
            return;
        }
        creates.push({
            post_id: post.id,
            brand_id: post.brand_id,
            social_account_id: accountId,
            account_name: account.name,
            platform: account.platform,
            status: 'pending',
            scheduled_for: post.scheduled_at,
            attempts: 0,
            max_attempts: 3,
            is_demo: !!post.is_demo,
        });
    });

    Object.entries(byAccount).forEach(([accountId, jobs]) => {
        if (wanted.has(accountId)) return;
        const pending = jobs.filter((job) => ['pending', 'blocked', 'failed'].includes(job.status));
        if (pending.length) {
            updates.push({ id: pending[0].id, status: 'cancelled', error_message: 'Destination removed from this post.' });
        }
    });

    if (creates.length) await appClient.entities.PublishJob.bulkCreate(creates);
    if (updates.length) await appClient.entities.PublishJob.bulkUpdate(updates);

    // One variant per destination keeps each destination's caption with the post it belongs to.
    if (accounts.length) {
        await appClient.entities.PostVariant.upsert(
            accounts.map((account) => ({
                post_id: post.id,
                social_account_id: account.id,
                platform: account.platform,
                caption: (post.platform_captions || {})[account.platform] || post.caption || '',
                is_demo: !!post.is_demo,
            })),
            { key: ['post_id', 'social_account_id'] },
        );
    }
};

export const cancelPostJobs = async (postId) => {
    const page = await appClient.entities.PublishJob.filter({ post_id: postId }, { limit: 200 });
    const cancellable = page.items.filter((job) => ['pending', 'blocked', 'failed'].includes(job.status));
    if (cancellable.length) {
        await appClient.entities.PublishJob.bulkUpdate(
            cancellable.map((job) => ({ id: job.id, status: 'cancelled', error_message: 'Cancelled by user.' })),
        );
    }
    await appClient.entities.Post.update(postId, { status: 'cancelled' });
};

export const retryPostJobs = async (postId) => {
    const page = await appClient.entities.PublishJob.filter({ post_id: postId }, { limit: 200 });
    const retryable = page.items.filter((job) => ['failed', 'blocked', 'cancelled'].includes(job.status));
    if (retryable.length) {
        await appClient.entities.PublishJob.bulkUpdate(
            retryable.map((job) => ({ id: job.id, status: 'pending', attempts: 0, error_message: '' })),
        );
        await appClient.entities.Post.update(postId, { status: 'processing' });
    }
    return retryable.length;
};

/** Reschedules every still-open destination of a post. */
export const reschedulePostJobs = async (postId, scheduledAt) => {
    const page = await appClient.entities.PublishJob.filter({ post_id: postId }, { limit: 200 });
    const open = page.items.filter((job) => ['pending', 'blocked'].includes(job.status));
    if (open.length) {
        await appClient.entities.PublishJob.bulkUpdate(
            open.map((job) => ({ id: job.id, status: 'pending', scheduled_for: scheduledAt, error_message: '' })),
        );
    }
    return open.length;
};