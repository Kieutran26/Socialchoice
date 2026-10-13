import { randomUUID } from 'node:crypto';
import { createMetaGraph } from './meta-graph.js';
import { createMetaVault } from './meta-vault.js';
import { fail } from './validation.js';

const metricNames=['reactions','comments','shares'];
const interval=60000;
export function metricOptions(input={}) {
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['brandId','accountId','pillarId','start','end'].includes(key)))fail('Invalid metrics filters');
    const options={brandId:'',accountId:'',pillarId:'',start:new Date(Date.now()-30*86400000).toISOString(),end:new Date().toISOString(),...input};
    if(['brandId','accountId','pillarId'].some(key=>typeof options[key]!=='string'||options[key].length>100))fail('Invalid metrics filters');
    const start=typeof options.start==='string'?Date.parse(options.start):NaN,end=typeof options.end==='string'?Date.parse(options.end):NaN;
    if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end||end-start>366*86400000)fail('Choose a valid metrics date range of up to one year');
    return {...options,start,end};
}
export function performanceReport(candidates,ready) {
    const rows=candidates.items.map(({attempt,post,account,pillar,metric})=>({
        attemptId:attempt.id,postId:post.id,title:post.title,pageName:account.name,accountId:account.id,pillarId:post.pillar_id||'',pillarName:pillar?.name||'',
        publishedAt:new Date(attempt.finishedAt).toISOString(),publishedUrl:attempt.url?.startsWith('https://www.facebook.com/')?attempt.url:null,
        checkedAt:metric?.lastAttemptAt||null,metrics:Object.fromEntries(metricNames.map(name=>{
            const saved=metric?.[name];return [name,{value:saved?.value??null,updatedAt:saved?.updatedAt||null,error:saved?.error||null,stale:!!saved?.updatedAt&&(!!saved.error||Date.now()-saved.updatedAt>86400000)}];
        })),
    }));
    const sum=items=>Object.fromEntries(metricNames.map(name=>{const measured=items.filter(row=>row.metrics[name].value!==null);return [name,{value:measured.length?measured.reduce((total,row)=>total+row.metrics[name].value,0):null,measured:measured.length}];}));
    function groups(field,label) {
        const groups=new Map();for(const row of rows){const id=row[field];if(!groups.has(id))groups.set(id,{id,name:row[label],items:[]});groups.get(id).items.push(row);}
        return [...groups.values()].map(group=>({id:group.id,name:group.name,publications:group.items.length,totals:sum(group.items)})).sort((a,b)=>(b.totals.reactions.value??-1)-(a.totals.reactions.value??-1));
    }
    const due=candidates.items.filter(row=>!row.metric?.refreshUntil||row.metric.refreshUntil<Date.now()).filter(row=>!row.metric?.lastAttemptAt||row.metric.lastAttemptAt<Date.now()-interval).length;
    return {ready,limited:candidates.limited,total:rows.length,pending:due,totals:sum(rows),accounts:groups('accountId','pageName'),pillars:groups('pillarId','pillarName'),
        rows:rows.sort((a,b)=>(b.metrics.reactions.value??-1)-(a.metrics.reactions.value??-1)).slice(0,50),stale:rows.filter(row=>metricNames.some(name=>row.metrics[name].stale)).length};
}
export function createFacebookMetrics(store,config,options={}) {
    const graph=config.ready?(options.graph||createMetaGraph(config)):null;
    const vault=config.ready?createMetaVault(store,config.key):null;
    const list=input=>performanceReport(store.metrics.candidates(metricOptions(input)),!!graph);
    return {
        list,
        async refresh(input) {
            const filter=metricOptions(input);
            if(!graph)fail('Configure Meta before refreshing metrics',409);
            const candidates=store.metrics.candidates(filter).items.sort((a,b)=>(a.metric?.lastAttemptAt||0)-(b.metric?.lastAttemptAt||0));
            let refreshed=0;
            for(const row of candidates) {
                if(refreshed>=3)break;
                const {attempt}=row;
                const claim=store.transaction(()=>{
                    const saved=store.metrics.read(attempt.id);
                    if(saved?.refreshUntil>Date.now()||saved?.lastAttemptAt>Date.now()-interval)return null;
                    const next={...saved,refreshId:randomUUID(),refreshUntil:Date.now()+30000,lastAttemptAt:Date.now()};store.metrics.save(attempt.id,next);return next;
                });
                if(!claim)continue;
                refreshed++;
                let results,credentialId;
                try {
                    const account=store.get('SocialAccount',attempt.accountId);credentialId=account.credential_id;
                    if(account.is_demo||account.platform!=='facebook'||account.connection_status!=='connected'||account.external_id!==attempt.pageId||!credentialId)fail('Facebook authorization changed',409);
                    const credential=vault.read(credentialId);
                    if(!account.scopes?.includes('pages_read_engagement')||!credential.scopes?.includes('pages_read_engagement'))fail('Reconnect Facebook for metrics access',409);
                    results=await graph.postMetrics(attempt.pageId,attempt.externalId,credential.token);
                    const current=store.get('SocialAccount',attempt.accountId);
                    if(current.credential_id!==credentialId||current.connection_status!=='connected'||current.external_id!==attempt.pageId)fail('Facebook authorization changed',409);
                } catch(error) {results=Object.fromEntries(metricNames.map(name=>[name,{value:null,error:error.status===409?'permission_required':'read_failed'}]));}
                store.transaction(()=>{
                    const current=store.metrics.read(attempt.id);if(current.refreshId!==claim.refreshId)return;
                    const next={...current,refreshUntil:0};
                    for(const name of metricNames){const result=results?.[name];const valid=Number.isSafeInteger(result?.value)&&result.value>=0;
                        next[name]=valid?{value:result.value,updatedAt:Date.now(),error:null}:{...current[name],value:current[name]?.value??null,error:result?.error||'metric_unavailable'};
                    }
                    store.metrics.save(attempt.id,next);
                });
            }
            return {...performanceReport(store.metrics.candidates(filter),true),refreshed};
        },
    };
}
