import { addDays, toUtcIso, todayInZone } from './tz.js';
import { DEFAULT_TIMEZONE } from './constants.js';

export const HOURS = { facebook: ['09:00', '19:30'], instagram: ['11:30', '19:00'], linkedin: ['08:00', '17:30'], tiktok: ['12:00', '20:00'], threads: ['09:30', '18:00'] };
const defaults = [['Product Education',35], ['Brand Awareness',25], ['Customer Stories',20], ['Community Engagement',12], ['Promotional Content',8]];

// Scheduling only: copy comes exclusively from the authenticated server AI request.
/** @param {{brand:any,pillars?:any[],angles?:any[],assets?:any[],options?:Record<string,any>}} input */
export function generateStrategyPlan({ brand, pillars = [], angles = [], assets = [], options = {} }) {
    if (!brand?.id || !brand.name) throw new Error('Choose a brand first');
    const days = Number(options.days ?? 30), frequency = options.frequency || '1_per_day';
    if (![7,14,30].includes(days) || !['1_per_day','2_per_day','3_per_week','5_per_week'].includes(frequency)) throw new Error('Invalid plan duration or frequency');
    const platforms = options.platforms || ['facebook'];
    if (!Array.isArray(platforms) || !platforms.length || platforms.some(p=>!HOURS[p])) throw new Error('Choose supported platforms');
    const active = pillars.filter(p=>p.brand_id===brand.id && p.status!=='archived');
    const usable = active.length ? active : defaults.map(([name,target_percentage],i)=>({id:`virtual_${i}`,name,target_percentage,brand_id:brand.id,is_virtual:true,color:'#79D94B'}));
    const pool = assets.filter(a=>a.brand_id===brand.id);
    if (!pool.length) throw new Error('Add eligible assets first');
    const start = options.startDate || addDays(todayInZone(brand.timezone||DEFAULT_TIMEZONE),1);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || addDays(start,0)!==start) throw new Error('Invalid start date');
    const posts = [], counts = usable.map(()=>0), uses = new Map();
    const weights = usable.map(p=>Math.max(0,Number(p.target_percentage)||0));
    if (!weights.some(Boolean)) weights.fill(1);
    const total = weights.reduce((a,b)=>a+b,0);
    for (let offset=0;offset<days;offset++) {
        const date=addDays(start,offset), weekday=new Date(date+'T00:00:00Z').getUTCDay();
        const n=frequency==='2_per_day'?2:frequency==='3_per_week'?([1,3,5].includes(weekday)?1:0):frequency==='5_per_week'?(weekday>0&&weekday<6?1:0):1;
        for (let slot=0;slot<n;slot++) {
            const index=posts.length;
            let chosen=0;
            weights.forEach((w,i)=>{if(w*(index+1)/total-counts[i]>weights[chosen]*(index+1)/total-counts[chosen])chosen=i;});
            const pillar=usable[chosen]; counts[chosen]++;
            const anglePool=angles.filter(a=>a.brand_id===brand.id&&a.pillar_id===pillar.id&&a.status!=='archived');
            const angle=anglePool[index%anglePool.length] || {id:`virtual_angle_${pillar.id}`,name:'Explore the topic',pillar_id:pillar.id,is_virtual:true};
            const terms=(pillar.name+' '+(pillar.description||'')+' '+angle.name).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>2);
            const score=a=>terms.reduce((n,w)=>n+((a.notes||a.name||'').toLowerCase().includes(w)?1:0),0)-(uses.get(a.id)||0)*3;
            const asset=pool.reduce((best,a)=>score(a)>score(best)?a:best,pool[0]);
            uses.set(asset.id,(uses.get(asset.id)||0)+1);
            const platform=platforms[index%platforms.length],time=HOURS[platform][slot];
            posts.push({id:`slot_${index+1}`,dayIndex:offset+1,date,time,scheduled_at:toUtcIso(date,time,brand.timezone||DEFAULT_TIMEZONE),platform,pillar:{...pillar},angle:{...angle},asset:{...asset},title:'',caption:'',reason:'',status:'draft'});
        }
    }
    return summarizePlan({id:`plan_${Date.now()}`,brandId:brand.id,brandName:brand.name,days,frequency,posts});
}

export function summarizePlan(plan) {
    const pillarCounts={},platformCounts={};
    for(const p of plan.posts){pillarCounts[p.pillar.name]=(pillarCounts[p.pillar.name]||0)+1;platformCounts[p.platform]=(platformCounts[p.platform]||0)+1;}
    return {...plan,totalPosts:plan.posts.length,summary:{totalDays:plan.days,totalPosts:plan.posts.length,matchedAssetsCount:new Set(plan.posts.map(p=>p.asset?.id).filter(Boolean)).size,pillarCounts,platformCounts}};
}

export function editPlanItem(item, form, {brand,pillars,angles,assets}) {
    const pillar=pillars.find(p=>p.id===form.pillar_id)||(item.pillar.id===form.pillar_id?item.pillar:null);
    const angle=angles.find(a=>a.id===form.angle_id&&a.pillar_id===pillar?.id)||(item.angle.id===form.angle_id&&item.pillar.id===pillar?.id?item.angle:null);
    const asset=form.asset_id?assets.find(a=>a.id===form.asset_id):null;
    if(!pillar||!angle||(form.asset_id&&!asset))throw new Error('Choose a valid pillar, angle and asset');
    if(!form.title.trim()||!form.caption.trim()||!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time))throw new Error('Add a title, caption and valid time');
    return {...item,title:form.title,caption:form.caption,reason:form.reason,platform:form.platform,time:form.time,pillar,angle,asset,scheduled_at:toUtcIso(item.date,form.time,brand.timezone||DEFAULT_TIMEZONE)};
}
