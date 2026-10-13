import { randomUUID } from 'node:crypto';
import { fail } from './validation.js';
import { contentRevision, deliveryState, syncDeliveryState } from './publishing-state.js';

export function createMultiPageDelivery(store, { prepare, destination, summary, wake, status }) {
    const future = time => {
        const result = typeof time === 'string' ? Date.parse(time) : NaN;
        if (!Number.isFinite(result) || result < Date.now()+60000) fail('Choose a publishing time at least one minute in the future',409);
        return result;
    };
    function reviewSummary(review) {
        return { reviewId:review.id, attemptId:review.id, postId:review.postId, status:review.status,
            expiresAt:review.expiresAt, scheduledFor:review.scheduled ? Math.min(...review.items.map(item=>item.scheduledFor)) : undefined,
            items:review.items.map(item=>summary(store.attempt(item.attemptId))) };
    }
    function preparePages(postId, time, timezone, retryAccount) {
        if(timezone!==undefined) {try {new Intl.DateTimeFormat('en',{timeZone:timezone});} catch {fail('Valid timezone required');}}
        return store.transaction(()=>{
            const post=store.get('Post',postId);
            if(!time && !retryAccount && post.status!=='draft')fail('Publish now requires a live draft',409);
            const ids=retryAccount ? [retryAccount] : post.account_ids;
            if (!ids?.length || ids.length>30 || new Set(ids).size!==ids.length) fail('Choose between 1 and 30 different Facebook Pages');
            const accounts=ids.map(id=>store.get('SocialAccount',id));
            if(new Set(accounts.map(account=>account.external_id)).size!==ids.length) fail('Choose different Facebook Pages');
            const items=ids.map(accountId=>{
                const reviewed=prepare(postId,true,accountId,!!retryAccount);
                const value=store.attempt(reviewed.attemptId);
                const pageTime=post.destination_settings?.[accountId]?.scheduled_at || time;
                const attempt={...value,multi:true,revision:contentRevision(post),...(time?{scheduledFor:future(pageTime),timezone:timezone||post.timezone}:{}),retryOf:retryAccount?store.currentAttempts(postId).find(item=>item.accountId===accountId&&item.status==='failed')?.id:undefined};
                store.saveAttempt(attempt);
                return {attemptId:attempt.id,scheduledFor:attempt.scheduledFor};
            });
            const review={id:randomUUID(),postId,status:'prepared',scheduled:!!time,expiresAt:Math.min(...items.map(item=>store.attempt(item.attemptId).expiresAt)),items};
            store.savePublishingReview(review);return reviewSummary(review);
        });
    }
    function check(value) {
        const post=store.get('Post',value.postId);
        const prior=store.currentAttempts(value.postId).find(item=>item.accountId===value.accountId);
        if(value.retryOf && (prior?.id!==value.retryOf || prior.status!=='failed')) fail('Only a confirmed failed Page can be retried',409);
        if(!value.retryOf && prior && prior.id!==value.id && !['prepared','cancelled'].includes(prior.status)) fail('This Page already has a publishing attempt. Check its history.',409);
        const checked=destination(post,false,value.accountId,true);
        if(contentRevision(post)!==value.revision || checked.account.credential_id!==value.credentialId || checked.account.external_id!==value.pageId || checked.account.name!==value.pageName || checked.caption!==value.caption || JSON.stringify(checked.media)!==JSON.stringify(value.media)) fail('Post or Page changed. Review the post again.',409);
        return post;
    }
    async function confirm(id, scheduled) {
        const result=store.transaction(()=>{
            const review=store.publishingReview(id);
            if(!review) fail('Publishing confirmation not found',404);
            if(review.status!=='prepared') return reviewSummary(review);
            if(review.scheduled!==scheduled) fail('Use the matching publishing confirmation',409);
            if(review.expiresAt<=Date.now()) fail('Publishing confirmation expired. Review the post again.',409);
            const values=review.items.map(item=>store.attempt(item.attemptId));
            for(const value of values) {
                if(value.status!=='prepared'||value.expiresAt<=Date.now()) fail('Publishing confirmation expired. Review the post again.',409);
                check(value); if(scheduled) future(new Date(value.scheduledFor).toISOString());
            }
            for(const value of values) {
                const post=store.get('Post',value.postId);
                const job=store.publishingWrite('PublishJob',{post_id:post.id,brand_id:post.brand_id,social_account_id:value.accountId,account_name:value.pageName,platform:'facebook',status:'pending',scheduled_for:new Date(value.scheduledFor||Date.now()).toISOString(),attempts:0,max_attempts:1,is_demo:false});
                store.saveAttempt({...value,status:'queued',scheduledFor:value.scheduledFor||Date.now(),approvedAt:Date.now(),jobId:job.id,immediate:!scheduled});
                store.publishingWrite('PublishingLog',{post_id:post.id,publish_job_id:job.id,account_name:value.pageName,platform:'facebook',level:'info',message:'Facebook Page delivery confirmed.',occurred_at:new Date().toISOString(),is_demo:false});
            }
            syncDeliveryState(store,review.postId);
            const confirmed={...review,status:scheduled?'queued':'processing'};store.savePublishingReview(confirmed);return reviewSummary(confirmed);
        });
        await wake(Date.now()+100);return result;
    }
    function cancel(value) {
        if(!value.multi || value.status!=='queued') fail('Only an unstarted automatic schedule can be cancelled',409);
        store.saveAttempt({...value,status:'cancelled',cancelledAt:Date.now()});
        store.publishingWrite('PublishJob',{status:'cancelled',error_message:'Automatic schedule cancelled.'},value.jobId);
        store.publishingWrite('PublishingLog',{post_id:value.postId,publish_job_id:value.jobId,account_name:value.pageName,platform:'facebook',level:'info',message:'Automatic schedule cancelled.',occurred_at:new Date().toISOString(),is_demo:false});
    }
    return {
        preparePages,
        prepareRetry(postId,accountId) {
            const previous=store.currentAttempts(postId).find(value=>value.accountId===accountId);
            if(!previous || previous.status!=='failed') fail('Only a confirmed failed Page can be retried',409);
            return preparePages(postId,undefined,undefined,accountId);
        },
        publishPages:id=>confirm(id,false), schedulePages:id=>confirm(id,true),
        reviewStatus:id=>{const review=store.publishingReview(id);return review?reviewSummary(review):null;},
        postStatus(postId) {
            const attempts=store.currentAttempts(postId);
            const items=attempts.map(value=>status(value.id));
            if(items.every(item=>item.status==='prepared'))return {postId,status:store.get('Post',postId).status==='scheduled'?'calendar_plan':'prepared',items};
            const state=deliveryState(items.filter(item=>item.status!=='prepared'));
            return {postId,status:state==='scheduled'?'queued':state,items};
        },
        async cancelPage(attemptId) {
            const result=store.transaction(()=>{
                const value=store.attempt(attemptId);
                cancel(value);
                syncDeliveryState(store,value.postId);return summary(store.attempt(value.id));
            });await wake(Date.now()+100);return result;
        },
        async cancelAll(postId) {
            const result=store.transaction(()=>{
                const attempts=store.currentAttempts(postId),queued=attempts.filter(value=>value.status==='queued');
                if(!queued.length) fail('Only an unstarted automatic schedule can be cancelled',409);
                queued.forEach(cancel);return syncDeliveryState(store,postId);
            });await wake(Date.now()+100);return {postId,status:result.status};
        },
    };
}
