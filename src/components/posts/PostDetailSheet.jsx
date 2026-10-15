import PublishConfirmation from './PublishConfirmation';
import { useTranslation } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { appClient } from '@/api/app-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import StatusBadge from '../common/StatusBadge';
import ScheduleFields from '../composer/ScheduleFields';
import { DEFAULT_TIMEZONE, POST_STATUS_LABEL, POST_STATUS_TONE, JOB_STATUS_LABEL } from '@/lib/constants';
import { toZonedParts, toUtcIso } from '@/lib/tz';
import { formatDateTime } from '@/lib/format';

export default function PostDetailSheet({ post, onClose, onChanged }) {
    const { t } = useTranslation();
    const [review,setReview]=useState(null),[delivery,setDelivery]=useState(null);
    const [images,setImages]=useState([]),[jobs,setJobs]=useState([]),[variants,setVariants]=useState([]);
    const [error,setError]=useState(''),[busy,setBusy]=useState(false),[refreshKey,setRefreshKey]=useState(0),[loaded,setLoaded]=useState(false);
    const [value,setValue]=useState(()=>({...toZonedParts(post.scheduled_at,post.timezone || DEFAULT_TIMEZONE),timezone:post.timezone || DEFAULT_TIMEZONE}));
    useEffect(()=>{
        let active=true,timer;
        async function refresh() {
            try {
                let result=null;
                if(!post.is_demo) try {result=await appClient.publishing.status(post.id);} catch(e) {if(e.status!==404)throw e;}
                const [page,versions]=await Promise.all([appClient.entities.PublishJob.filter({post_id:post.id},{limit:200}),appClient.entities.PostVariant.filter({post_id:post.id},{limit:200})]);
                if(!active)return;
                setLoaded(true);setJobs(page.items);setVariants(versions.items);setDelivery(result);
                const pending=result?.items ? result.items.some(item=>['queued','processing'].includes(item.status)) : ['queued','processing'].includes(result?.status);
                if(pending)timer=setTimeout(refresh,5000);
            } catch(e) {if(active)setError(e.message);}
        }
        refresh();return ()=>{active=false;clearTimeout(timer);};
    },[post.id,post.is_demo,refreshKey]);
    useEffect(()=>{
        let active=true;
        if(post.media_ids?.length) appClient.entities.MediaAsset.filter({id:{$in:post.media_ids}},{limit:10}).then(page=>{if(active)setImages(post.media_ids.map(id=>page.items.find(asset=>asset.id===id)).filter(Boolean));}).catch(e=>{if(active)setError(e.message);});
        return ()=>{active=false;};
    },[post.id,post.media_ids]);
    const items=delivery?.items || (delivery?.attemptId ? [delivery] : []);
    const queued=items.some(item=>item.status==='queued');
    const status=delivery && !['prepared','calendar_plan'].includes(delivery.status) ? delivery.status==='queued'?'scheduled':delivery.status : post.status;
    const locked=!loaded || queued || items.some(item=>!['prepared','cancelled'].includes(item.status));
    const caption=delivery?.caption || post.caption;
    async function refresh() {setRefreshKey(key=>key+1);await onChanged?.();}
    async function action(work) {setBusy(true);setError('');try{await work();await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}}
    async function reschedule() {
        setBusy(true);setError('');
        try {
            const time=toUtcIso(value.date,value.time,value.timezone);
            if(post.is_demo){const {id,created_date,updated_date,...data}=post;void created_date;void updated_date;await appClient.posts.save({id,data:{...data,scheduled_at:time,timezone:value.timezone,status:'scheduled'}});await onChanged?.();onClose();}
            else setReview(await appClient.publishing.prepareSchedule(post.id,time,value.timezone));
        }catch(e){setError(e.message);}finally{setBusy(false);}
    }
    return <Dialog open onOpenChange={open=>!open&&!busy&&onClose()}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{post.title || t('Untitled post')}</DialogTitle></DialogHeader>
        <StatusBadge tone={POST_STATUS_TONE[status]}>{POST_STATUS_LABEL[status] || status}</StatusBadge>
        <p className="whitespace-pre-wrap break-words my-5 text-sm">{caption}</p>
        {!!images.length && <div className={images[0]?.file_type==='video'?'grid grid-cols-1 gap-2 mb-4':'grid grid-cols-3 gap-2 mb-4'}>{images.map(asset=>asset.file_type==='video'?<video key={asset.id} src={asset.file_url} controls preload="metadata" className="max-h-64 w-full rounded-lg"/>:<img key={asset.id} src={asset.file_url} alt={asset.name} className="h-28 w-full object-contain rounded-lg border"/>)}</div>}
        <p className="label-xs">{formatDateTime(post.scheduled_at,post.timezone)}</p>
        <div className="flex flex-wrap gap-3 my-5">{!locked && ['draft','scheduled'].includes(status) && <Link to={'/create?edit='+post.id} className="border rounded-lg px-3 py-2 text-xs" onClick={onClose}>{t('Edit post')}</Link>}<Link to={'/create?duplicate='+post.id} className="border rounded-lg px-3 py-2 text-xs" onClick={onClose}>{t('Duplicate as draft')}</Link></div>
        {items.length>0 ? <section className="border-t pt-4 space-y-3"><h3>{t('Results by Page')}</h3>{items.map(item=><div key={item.attemptId} className="rounded-lg border p-3 text-sm space-y-2">
            <p className="font-medium break-words">{item.pageName} · {item.pageId}</p><StatusBadge tone={POST_STATUS_TONE[item.status==='queued'?'scheduled':item.status]}>{t(item.status==='queued'?'Scheduled':POST_STATUS_LABEL[item.status] || item.status)}</StatusBadge>
            <p className="whitespace-pre-wrap break-words text-xs">{item.caption}</p>
            {item.scheduledFor && <p className="label-xs">{formatDateTime(new Date(item.scheduledFor).toISOString(),item.timezone)}</p>}
            {item.status==='processing' && item.media?.length>0 && <p role="status" className="label-xs">{t(item.platform==='linkedin'?'LinkedIn is processing the media':item.platform==='tiktok'?'TikTok is processing the private video':item.platform==='threads'?'Threads is processing the media':item.platform==='instagram'?'Instagram is processing the media':item.media[0].file_type==='video'?'Uploading video to Facebook':'Uploading photos to Facebook')}</p>}
            {item.message && <p className="text-dangerFg text-xs">{t(item.message)}</p>}
            {item.platform==='tiktok'&&item.providerPublishId&&<p className="label-xs break-all">TikTok · {t('Private publication confirmed')} · {item.providerPublishId}</p>}
            {item.publishedUrl && <a href={item.publishedUrl} target="_blank" rel="noreferrer" className="underline text-xs">{t('View published post')}</a>}
            {item.status==='queued' && <Button variant="outline" disabled={busy} onClick={()=>action(()=>item.multi?appClient.publishing.cancelPage(item.attemptId):appClient.publishing.cancelSchedule(post.id))}>{t('Cancel this Page schedule')}</Button>}
            {item.status==='failed' && <Button variant="outline" disabled={busy} onClick={()=>action(async()=>setReview(await appClient.publishing.prepareRetry(post.id,item.accountId)))}>{t('Review retry for this Page')}</Button>}
        </div>)}</section> : null}
        {!locked && ['draft','scheduled','cancelled'].includes(status) && !jobs.some(job=>job.attempts>0) && <section className="border-t pt-4"><h3 className="mb-3">{t('Plan / reschedule')}</h3><ScheduleFields value={value} onChange={patch=>setValue({...value,...patch})}/><p className="label-xs my-3">{t('Review the Page, content and time before enabling automatic publishing.')}</p><Button disabled={busy} onClick={reschedule}>{t('Review automatic schedule')}</Button></section>}
        {queued && <section className="border-t mt-5 pt-4"><p className="label-xs mb-3">{t('Cancel queued Pages before editing. Started deliveries cannot be cancelled.')}</p><Button disabled={busy} onClick={()=>action(()=>appClient.publishing.cancelSchedule(post.id))}>{t('Cancel automatic schedule')}</Button></section>}
        <section className="border-t mt-5 pt-4"><h3>{t('Publishing history')}</h3>{jobs.length?jobs.map(job=><div className="border-b py-3 text-xs" key={job.id}><p>{job.account_name} · {JOB_STATUS_LABEL[job.status] || job.status}</p>{job.scheduled_for && <p className="label-xs mt-1">{formatDateTime(job.scheduled_for,post.timezone)}</p>}{variants.find(v=>v.social_account_id===job.social_account_id&&v.status===job.status)?.caption && <p className="whitespace-pre-wrap break-words mt-1">{variants.find(v=>v.social_account_id===job.social_account_id&&v.status===job.status).caption}</p>}{job.error_message && <p className="text-dangerFg mt-1">{t(job.error_message)}</p>}{job.published_url && <a href={job.published_url} target="_blank" rel="noreferrer" className="underline">{t('View published post')}</a>}</div>):<p className="label-xs mt-2">{t('No publishing attempts recorded.')}</p>}</section>
        {review && <PublishConfirmation review={review} onClose={()=>setReview(null)} onResult={async()=>{setReview(null);await refresh();}}/>}
        {error && <p role="alert" className="mt-4 text-sm text-dangerFg">{t(error)}</p>}
    </DialogContent></Dialog>;
}
