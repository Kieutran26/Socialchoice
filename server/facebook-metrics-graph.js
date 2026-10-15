import { fail } from './validation.js';

export const METRIC_FIELDS={reactions:'reactions.limit(0).summary(total_count)',comments:'comments.limit(0).summary(total_count)',shares:'shares'};
export function parseFacebookMetric(data,pageId,externalId,metric) {
    if(!data || data.id!==externalId || (externalId.includes('_') ? !externalId.startsWith(pageId+'_') : data.from?.id!==pageId)) fail('Facebook metrics identity mismatch',502);
    const count=metric==='shares'?data.shares?.count:data[metric]?.summary?.total_count;
    if(count===undefined||count===null)return null;
    if(!Number.isSafeInteger(count)||count<0)fail('Facebook returned an invalid metric count',502);
    return count;
}

export function createMetricsGraph(read) {
    return async (pageId,externalId,token)=>{
        if(!/^\d+$/.test(pageId)||!new RegExp(`^(?:${pageId}_[0-9]+|[0-9]+)$`).test(externalId))fail('Confirmed Facebook post identity required',409);
        const entries=await Promise.all(Object.entries(METRIC_FIELDS).map(async([metric,field])=>{
            try {const data=await read(externalId,{fields:`id,from,${field}`},token);return [metric,{value:parseFacebookMetric(data,pageId,externalId,metric)}];}
            catch(error){return [metric,{value:null,error:error.metaReason==='user_content_permission_required'?'user_content_permission_required':[190,10,200].includes(error.metaCode)?'permission_required':error.metaCode===100?'metric_unavailable':'read_failed'}];}
        }));
        return Object.fromEntries(entries);
    };
}
