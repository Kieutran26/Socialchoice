import { fail } from './validation.js';

// Plans and their destination rows commit together; no platform operation occurs here.
export function savePostPlan(store, { id, data }) {
    if (!['draft', 'scheduled'].includes(data?.status)) fail('Only drafts and calendar plans can be saved here');
    return store.transaction(() => {
        const post = store.write('Post', data, id);
        const jobs = store.all('PublishJob').filter((job) => job.post_id === post.id);
        if (jobs.some((job) => ['published', 'processing'].includes(job.status))) fail('Publishing history is locked; duplicate instead', 409);
        for (const job of jobs) {
            if (post.status === 'draft' || !post.account_ids.includes(job.social_account_id)) {
                store.write('PublishJob', { status: 'cancelled', error_message: 'Calendar plan removed.' }, job.id);
            }
        }
        if (post.status === 'scheduled') {
            for (const accountId of new Set(post.account_ids)) {
                const account = store.get('SocialAccount', accountId);
                const existing = jobs.find((job) => job.social_account_id === accountId);
                store.write('PublishJob', {
                    post_id: post.id, brand_id: post.brand_id, social_account_id: account.id,
                    account_name: account.name, platform: account.platform, status: 'pending',
                    scheduled_for: post.scheduled_at, is_demo: post.is_demo,
                    error_message: 'Calendar plan only. OAuth and automatic publishing are not implemented in Phase A.',
                }, existing?.id);
            }
        }
        return post;
    });
}
