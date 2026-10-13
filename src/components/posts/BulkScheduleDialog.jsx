import { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown } from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { addDays, localInputDefault, toUtcIso, toZonedParts } from '@/lib/tz';
import { formatDateTime } from '@/lib/format';
import ScheduleFields from '../composer/ScheduleFields';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export default function BulkScheduleDialog({posts,timezone,onClose,onScheduled}) {
    const {t}=useTranslation();
    const [order,setOrder]=useState(()=>posts.map(post=>post.id));
    const [base,setBase]=useState(()=>({...localInputDefault(timezone),timezone}));
    const [interval,setInterval]=useState('1'),[unit,setUnit]=useState('days'),[overrides,setOverrides]=useState({});
    const [review,setReview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
    const entries=useMemo(()=>{
        try {
            if(!Number.isInteger(Number(interval))||Number(interval)<1||Number(interval)>365)return [];
            const start=toUtcIso(base.date,base.time,base.timezone);if(!start)return [];
            return order.map((postId,index)=>{
                const generated=unit==='days'?toUtcIso(addDays(base.date,index*Number(interval)),base.time,base.timezone):new Date(Date.parse(start)+index*Number(interval)*3600000).toISOString();
                const parts={...toZonedParts(generated,base.timezone),...overrides[postId]};
                return {postId,time:toUtcIso(parts.date,parts.time,base.timezone),timezone:base.timezone};
            });
        } catch {return [];}
    },[order,base,interval,unit,overrides]);
    const changePattern=patch=>{setBase(value=>({...value,...patch}));setOverrides({});};
    function move(index,offset){const next=[...order];[next[index],next[index+offset]]=[next[index+offset],next[index]];setOrder(next);}
    async function prepare(){setBusy(true);setError('');try{setReview(await appClient.publishing.prepareBatch(entries));}catch(e){setError(e.message);}finally{setBusy(false);}}
    async function confirm(){setBusy(true);setError('');try{await appClient.publishing.confirmBatch(review.batchId);onScheduled();}catch(e){try{const result=await appClient.publishing.batchStatus(review.batchId);if(result.status==='confirmed'){onScheduled();return;}}catch{/* Preserve review when recovery is unavailable. */}setError(e.message);}finally{setBusy(false);}}
    return <Dialog open onOpenChange={open=>!open&&!busy&&onClose()}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{t(review?'Review bulk schedule':'Schedule selected drafts')}</DialogTitle></DialogHeader>
        {!review ? <>
            <p className="label-xs">{t('Choose a start time and spacing. You can reorder posts or adjust each time before reviewing.')}</p>
            <ScheduleFields value={base} onChange={changePattern}/>
            <div className="grid grid-cols-2 gap-4"><label className="text-xs">{t('Spacing')}<Input className="mt-2" type="number" min="1" max="365" value={interval} onChange={e=>{setInterval(e.target.value);setOverrides({});}}/></label><label className="text-xs">{t('Interval unit')}<select className="border rounded-lg p-2 mt-2 w-full bg-white" value={unit} onChange={e=>{setUnit(e.target.value);setOverrides({});}}><option value="days">{t('Days')}</option><option value="hours">{t('Hours')}</option></select></label></div>
            <div className="space-y-3">{order.map((id,index)=>{const post=posts.find(post=>post.id===id),parts=entries[index]?.time?toZonedParts(entries[index].time,base.timezone):{date:'',time:''};return <section key={id} className="border rounded-lg p-3"><div className="flex items-center gap-2"><p className="text-sm font-medium min-w-0 flex-1 break-words">{index+1}. {post.title}</p><button type="button" disabled={index===0} aria-label={t('Move post earlier')} onClick={()=>move(index,-1)} className="min-h-11 min-w-11 flex items-center justify-center"><ArrowUp size={16}/></button><button type="button" disabled={index===order.length-1} aria-label={t('Move post later')} onClick={()=>move(index,1)} className="min-h-11 min-w-11 flex items-center justify-center"><ArrowDown size={16}/></button></div><div className="grid sm:grid-cols-2 gap-3"><label className="text-xs">{t('Date')}<Input type="date" value={parts.date} onChange={e=>setOverrides({...overrides,[id]:{...overrides[id],date:e.target.value}})}/></label><label className="text-xs">{t('Time')}<Input type="time" value={parts.time} onChange={e=>setOverrides({...overrides,[id]:{...overrides[id],time:e.target.value}})}/></label></div></section>;})}</div>
        </> : <>
            <p className="text-sm">{t('Confirm every Page, caption, media and time below. All schedules are saved together; nothing is published now.')}</p>
            {review.items.map((item,index)=><section className="border rounded-lg p-4" key={item.postId}><h3 className="text-sm font-medium">{index+1}. {item.title}</h3><p className="label-xs mt-1">{item.pageName} · {item.pageId}</p><p className="text-sm my-2">{formatDateTime(new Date(item.scheduledFor).toISOString(),item.timezone)} · {item.timezone}</p><p className="whitespace-pre-wrap break-words text-sm">{item.caption}</p>{!!item.media.length&&<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">{item.media.map((asset,index)=><div key={asset.id}>{asset.file_type==='video'?<video controls preload="metadata" src={asset.file_url} className="w-full max-h-40"/>:<img src={asset.file_url} alt={asset.name} className="h-24 w-full object-contain"/>}<p className="label-xs truncate">{index+1}. {asset.name}</p></div>)}</div>}</section>)}
        </>}
        {error&&<p role="alert" className="text-sm text-dangerFg">{t(error)}</p>}
        <div className="flex flex-wrap justify-end gap-3 mt-3"><Button disabled={busy} variant="outline" onClick={onClose}>{t('Cancel')}</Button>{review&&<Button disabled={busy} variant="outline" onClick={()=>setReview(null)}>{t('Back')}</Button>}<button type="button" className="btn-skew" disabled={busy||(!review&&(entries.length!==posts.length || entries.some(entry=>!entry.time)))} onClick={review?confirm:prepare}>{t(busy?'Saving…':review?'Confirm all schedules':'Review all schedules')}</button></div>
    </DialogContent></Dialog>;
}
