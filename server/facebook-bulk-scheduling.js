import { randomUUID } from 'node:crypto';
import { fail } from './validation.js';

export function createBulkScheduling(store,scheduling,wake) {
    const summary = batch => ({batchId:batch.id,status:batch.status,expiresAt:batch.expiresAt,items:batch.items});
    return {
        prepareBatch(entries) {
            if(!Array.isArray(entries)||!entries.length||entries.length>50||entries.some(entry=>!entry||typeof entry.postId!=='string'||typeof entry.time!=='string'||typeof entry.timezone!=='string')||new Set(entries.map(entry=>entry.postId)).size!==entries.length) fail('Select between 1 and 50 different live drafts');
            return store.transaction(()=>{
                const items=entries.map(entry=>{
                    const post=store.get('Post',entry.postId);
                    if(post.is_demo||post.status!=='draft')fail('Bulk scheduling requires only live drafts',409);
                    if(post.account_ids?.length!==1)fail('Bulk schedules currently require one Page per post',409);
                    return {...scheduling.prepareSchedule(entry.postId,entry.time,entry.timezone),title:post.title};
                });
                const batch={id:randomUUID(),status:'prepared',expiresAt:Math.min(...items.map(item=>item.expiresAt)),items};
                store.saveScheduleBatch(batch);return summary(batch);
            });
        },
        async confirmBatch(batchId) {
            if(typeof batchId!=='string')fail('Batch review ID required');
            const result=store.transaction(()=>{
                const batch=store.scheduleBatch(batchId);
                if(batch.status==='confirmed')return summary(batch);
                if(batch.status!=='prepared'||batch.expiresAt<=Date.now())fail('Batch confirmation expired. Review all posts again.',409);
                // All claims commit together. A changed item rolls back the entire batch.
                const items=batch.items.map(item=>({...scheduling.enqueue(item.attemptId),title:item.title}));
                const queued={...batch,status:'confirmed',items};store.saveScheduleBatch(queued);return summary(queued);
            });
            await wake(Date.now()+100);return result;
        },
        batchStatus: id => summary(store.scheduleBatch(id)),
    };
}
