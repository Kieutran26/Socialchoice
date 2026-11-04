import { randomUUID, createHash } from 'node:crypto';
import { fail } from './validation.js';
import { contentRevision, syncDeliveryState } from './publishing-state.js';
import { referencedMediaIds, resolveComments } from '../src/lib/publishing-content.js';
import { recurringTime, validateRecurringPolicy, withinRecurringEnd } from '../src/lib/recurring-dates.js';

const fields = ['title', 'brand_id', 'caption', 'platform_captions', 'media_ids', 'platform_media_ids', 'pillar_id', 'angle_id', 'account_ids', 'comments', 'notes'];
export function createRecurringPosts(store, publishing, wake) {
    const records = store.recurringPosts;
    const successful = series => (series.occurrences || []).filter(item => {
        const attempts = store.currentAttempts(item.post_id);
        return attempts.length && attempts.every(attempt => attempt.status === 'published');
    }).length;
    function source(id) {
        const post = store.get('Post', id), brand = store.get('Brand', post.brand_id);
        if (post.is_demo || brand.is_demo || brand.status === 'archived' || !post.account_ids?.length) fail('Choose a live post with connected accounts and an active brand.', 409);
        return post;
    }
    function fingerprint(post) {
        const accounts = post.account_ids.map(id => store.get('SocialAccount', id));
        const actors = [...new Set(accounts.flatMap(account => resolveComments(post, account).map(item => item.actor_account_id).filter(Boolean)))];
        const binding = account => { const { updated_date, created_date, last_synced_at, ...value } = account; void updated_date; void created_date; void last_synced_at; return value; };
        return createHash('sha256').update(JSON.stringify([contentRevision(post), accounts.map(binding), actors.map(id => binding(store.get('SocialAccount', id))), referencedMediaIds(post).map(id => store.get('MediaAsset', id))])).digest('hex');
    }
    function check(series) {
        if (fingerprint(source(series.source_id)) !== series.fingerprint) fail('Source content, media or account access changed. Review recurrence again.', 409);
    }
    function clone(series, index) {
        const post = source(series.source_id);
        const destination_settings = Object.fromEntries(Object.entries(post.destination_settings || {}).map(([id, value]) => {
            const { scheduled_at, ...settings } = value; void scheduled_at; return [id, settings];
        }));
        return store.write('Post', { ...Object.fromEntries(fields.filter(key => Object.hasOwn(post, key)).map(key => [key, post[key]])), destination_settings, timezone: series.policy.timezone, status: 'draft', is_demo: false, notes: `${post.notes || ''}\nRecurring ${series.id} · ${index + 1}`.trim() });
    }
    function enqueue(series, index) {
        // Existing TikTok consent stays frozen; its delivery adapter fetches fresh creator limits before sending.
        return publishing.withApproval(index > 0, () => {
        check(series);
        const post = clone(series, index), time = recurringTime(series.policy, index);
        const review = publishing.prepareSchedule(post.id, time, series.policy.timezone);
        publishing.enqueueSchedule(review.attemptId);
        const occurrences = [...(series.occurrences || []), { post_id: post.id, index, scheduled_at: time }];
        return { ...series, index, current_post_id: post.id, next_at: time, occurrences };
        });
    }
    function cancelQueued(series) {
        if (!series.current_post_id) return;
        const queued = store.currentAttempts(series.current_post_id).filter(item => item.status === 'queued');
        for (const value of queued) {
            store.saveAttempt({ ...value, status: 'cancelled', cancelledAt: Date.now() });
            store.publishingWrite('PublishJob', { status: 'cancelled', error_message: 'Recurring publication paused or stopped.' }, value.jobId);
        }
        if (queued.length) syncDeliveryState(store, series.current_post_id);
    }
    function halt(series, status, message = '') {
        cancelQueued(series);
        const next = { ...series, completed: successful(series), status, message, next_at: null, updated_at: new Date().toISOString() };
        records.save(next); return next;
    }
    function publicSeries(series) {
        if (!series) return null;
        const { fingerprint: hidden, ...value } = series; void hidden;
        return { ...value, completed: successful(series), occurrences: (series.occurrences || []).map(item => ({ ...item, status: store.all('Post').find(post => post.id === item.post_id)?.status || 'deleted' })) };
    }
    return {
        async execute(operation, input) {
            if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Recurring request required');
            if (operation === 'list') { const post = store.get('Post', input.post_id); return { series: records.list(post.id).map(publicSeries) }; }
            if (operation === 'prepare') {
                const post = source(input.post_id);
                if (!['draft', 'published'].includes(post.status)) fail('Choose a draft or a successfully published post.', 409);
                if (records.active().some(item => item.source_id === post.id)) fail('Pause the active recurrence before reviewing another.', 409);
                let policy; try { policy = validateRecurringPolicy(input.policy); } catch (error) { fail(error.message); }
                const series = { id: randomUUID(), source_id: post.id, brand_id: post.brand_id, fingerprint: fingerprint(post), policy, status: 'prepared', completed: 0, skipped: 0, occurrences: [], created_at: new Date().toISOString(), expires_at: Date.now() + 600000 };
                let preview;
                const rollback = new Error('Preview only');
                try { store.transaction(() => { const draft = clone(series, 0); preview = publishing.prepareSchedule(draft.id, policy.first_at, policy.timezone); throw rollback; }); }
                catch (error) { if (error !== rollback) throw error; }
                const items = (preview.items || [preview]).map(item => ({ ...item, attemptId: undefined, postId: undefined }));
                records.save({ ...series, preview: items });
                return { ...publicSeries(series), preview: items, dates: [0, 1, 2].filter(index => withinRecurringEnd(policy, index)).map(index => recurringTime(policy, index)) };
            }
            const series = typeof input.id === 'string' && records.get(input.id);
            if (!series) fail('Recurring series not found', 404);
            let result;
            if (operation === 'confirm') result = store.transaction(() => {
                const current = records.get(series.id);
                if (current.status === 'active') return current;
                if (current.status !== 'prepared' || current.expires_at <= Date.now()) fail('Recurring confirmation expired. Review again.', 409);
                if (records.active().some(item => item.source_id === current.source_id)) fail('This post already has an active recurrence.', 409);
                const next = enqueue({ ...current, status: 'active', approved_at: new Date().toISOString() }, 0);
                records.save(next); return next;
            });
            else if (operation === 'pause' || operation === 'stop') result = store.transaction(() => {
                const current = records.get(series.id);
                if (['completed', 'stopped'].includes(current.status)) return current;
                return halt(current, operation === 'pause' ? 'paused' : 'stopped');
            });
            else fail('Unknown recurring operation', 404);
            await wake(Date.now() + 100);
            return publicSeries(result);
        },
        run() {
            for (const candidate of records.active()) {
                try { store.transaction(() => {
                    let series = records.get(candidate.id);
                    if (series.status !== 'active') return;
                    check(series);
                    const attempts = store.currentAttempts(series.current_post_id);
                    if (!attempts.length || attempts.some(item => ['failed', 'unknown', 'cancelled', 'prepared'].includes(item.status))) { halt(series, 'paused', 'Recurring delivery needs attention. Check its history before reviewing again.'); return; }
                    if (!attempts.every(item => item.status === 'published')) return;
                    // Commit progress and the next immutable occurrence in the same transaction.
                    series = { ...series, completed: successful(series) };
                    if (series.policy.limit && series.completed >= series.policy.limit) { records.save({ ...series, status: 'completed', next_at: null }); return; }
                    let index = series.index + 1;
                    const calendarEnd = { ...series.policy, limit: 0 };
                    while (withinRecurringEnd(calendarEnd, index) && Date.parse(recurringTime(series.policy, index)) < Date.now() + 60000) { index++; series.skipped++; if (index > 12000) fail('Review a new recurrence after extended downtime.'); }
                    if (!withinRecurringEnd(calendarEnd, index)) { records.save({ ...series, status: 'completed', next_at: null }); return; }
                    records.save(enqueue(series, index));
                }); } catch { store.transaction(() => halt(records.get(candidate.id), 'paused', 'Source, permissions, media or delivery changed. Review recurrence again.')); }
            }
        },
        nextWake() {
            return records.active().some(series => {
                const attempts = store.currentAttempts(series.current_post_id);
                return !attempts.length || attempts.every(item => !['queued', 'processing'].includes(item.status));
            }) ? Date.now() + 100 : null;
        },
    };
}
