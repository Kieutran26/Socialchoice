import { fail } from './validation.js';
import { syncDeliveryState } from './publishing-state.js';

export function createScheduledDelivery(store, prepare, summary, wake, publish) {
    const futureTime = input => {
        const time = typeof input === 'string' ? Date.parse(input) : NaN;
        if (!Number.isFinite(time) || time < Date.now() + 60000) fail('Choose a publishing time at least one minute in the future', 409);
        return time;
    };
    function reject(attempt, message) {
        store.transaction(() => {
            const current = store.attempt(attempt.id);
            if (!current || current.id !== attempt.id || current.status !== 'queued') return;
            store.saveAttempt({ ...current, status: 'failed', message, rejectedAt:Date.now() });
            store.publishingWrite('PublishJob', { status: 'failed', error_message: message }, current.jobId);
            if(current.multi) syncDeliveryState(store,current.postId);
            else store.publishingWrite('Post', { status: 'failed' }, current.postId);
        });
    }
    return {
        prepareSchedule(postId, time, timezone) {
            const scheduledFor = futureTime(time);
            if(timezone !== undefined) { try { new Intl.DateTimeFormat('en',{timeZone:timezone}); } catch { fail('Valid timezone required'); } }
            return store.transaction(() => {
                const reviewed = prepare(postId);
                const attempt = { ...store.attempt(reviewed.attemptId), scheduledFor, ...(timezone ? {timezone} : {}) };
                store.saveAttempt(attempt);
                return summary(attempt);
            });
        },
        enqueue(attemptId) {
            return store.transaction(() => {
                const value = store.attempt(attemptId);
                if (value.status === 'queued') return summary(value);
                if (value.status !== 'prepared' || !value.scheduledFor || value.expiresAt <= Date.now()) fail('Scheduling confirmation expired. Review again.', 409);
                futureTime(new Date(value.scheduledFor).toISOString());
                const post = store.get('Post', value.postId);
                if (JSON.stringify(post) !== value.revision) fail('Post or Page changed. Review the post again.', 409);
                // Recheck private permissions and Page identity without making a remote call.
                const checked = prepare(value.postId);
                if (checked.pageId !== value.pageId || checked.pageName !== value.pageName) fail('Post or Page changed. Review the post again.', 409);
                const current = store.attempt(checked.attemptId);
                if (current.credentialId !== value.credentialId || JSON.stringify(current.media) !== JSON.stringify(value.media)) fail('Post or Page changed. Review the post again.', 409);
                const scheduled = store.publishingWrite('Post', { status: 'scheduled', timezone:value.timezone, scheduled_at: new Date(value.scheduledFor).toISOString() }, post.id);
                const existing = store.all('PublishJob').find(job => job.post_id === post.id && job.social_account_id === value.accountId);
                const job = store.publishingWrite('PublishJob', { post_id: post.id, brand_id: post.brand_id, social_account_id: value.accountId, account_name: value.pageName, platform: value.platform||'facebook', status: 'pending', scheduled_for: scheduled.scheduled_at, attempts: 0, max_attempts: 1, error_message: '', is_demo: false }, existing?.id);
                const queued = { ...value, status: 'queued', approvedAt: Date.now(), revision: JSON.stringify(scheduled), jobId: job.id };
                store.saveAttempt(queued);
                store.publishingWrite('PublishingLog',{post_id:post.id,publish_job_id:job.id,account_name:value.pageName,platform:value.platform||'facebook',level:'info',message:value.platform==='instagram'?'Automatic Instagram publishing is confirmed.':'Automatic Facebook publishing is confirmed.',occurred_at:new Date().toISOString(),is_demo:false});
                return summary(queued);
            });
        },
        async schedule(attemptId) {
            const result = this.enqueue(attemptId);
            await wake(Date.now()+100);
            return result;
        },
        async cancelSchedule(postId) {
            const result = store.transaction(() => {
                const attempt = store.attemptForPost(postId);
                if (!attempt || attempt.status !== 'queued') fail('Only an unstarted automatic schedule can be cancelled', 409);
                store.publishingWrite('PublishJob', { status: 'cancelled', error_message: 'Automatic schedule cancelled.' }, attempt.jobId);
                const post = store.publishingWrite('Post', { status: 'draft', scheduled_at: null }, postId);
                store.saveAttempt({ ...attempt, status: 'prepared', expiresAt: 0, scheduledFor: undefined, cancelledAt: Date.now(), revision: JSON.stringify(post) });
                store.publishingWrite('PublishingLog',{post_id:postId,publish_job_id:attempt.jobId,account_name:attempt.pageName,platform:attempt.platform||'facebook',level:'info',message:'Automatic schedule cancelled.',occurred_at:new Date().toISOString(),is_demo:false});
                return { postId, status: 'draft' };
            });
            await wake(Date.now() + 100);
            return result;
        },
        async runDue() {
            for (const attempt of store.queuedAttempts().sort((a,b) => a.scheduledFor - b.scheduledFor)) {
                if (attempt.scheduledFor > Date.now()) continue;
                if (Date.now() - attempt.scheduledFor > 15 * 60000) { reject(attempt, 'Scheduled publishing was missed by more than 15 minutes. Duplicate as a draft and schedule again.'); continue; }
                try { await publish(attempt.id); }
                catch { reject(attempt, 'Scheduled publishing could not start. Check Facebook access, then duplicate as a draft to try again.'); }
            }
        },
    };
}
