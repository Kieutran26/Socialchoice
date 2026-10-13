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

export default function PostDetailSheet({ post, onClose, onChanged }) { const { t } = useTranslation();
    const [automatic, setAutomatic] = useState(false), [review,setReview] = useState(null);
    const [deliveryStatus, setDeliveryStatus] = useState(post.status), [caption, setCaption] = useState(post.caption);
    const [images, setImages] = useState([]), [uploadedPhotos, setUploadedPhotos] = useState(0), [videoStage, setVideoStage] = useState('');
    const [jobs, setJobs] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const [value, setValue] = useState(() => ({ ...toZonedParts(post.scheduled_at, post.timezone || DEFAULT_TIMEZONE), timezone: post.timezone || DEFAULT_TIMEZONE }));
    useEffect(() => {
        let active = true;
        Promise.all([appClient.entities.PublishJob.filter({ post_id: post.id }, { limit: 200 }), appClient.entities.PostVariant.filter({ post_id: post.id }, { limit: 200 })]).then(([page, variants]) => { if (active) { setJobs(page.items); const snapshot = variants.items.find(v => ['processing', 'published', 'failed', 'unknown'].includes(v.status)); if (snapshot) setCaption(snapshot.caption); } }).catch(e => { if (active) setError(e.message); });
        return () => { active = false; };
    }, [post.id]);
    useEffect(() => {
        if (!['processing','scheduled'].includes(deliveryStatus)) return;
        let active = true, timer;
        const refresh = async () => { try { const result = await appClient.publishing.status(post.id); if(result.status === 'calendar_plan'){clearInterval(timer);return;} if (active) { setAutomatic(result.status === 'queued'); setCaption(result.caption); setDeliveryStatus(result.status === 'queued' ? 'scheduled' : result.status); setUploadedPhotos(result.uploadedPhotos || 0); setVideoStage(result.videoStage || 'start'); } if (active && result.status !== 'queued' && result.status !== 'processing') { clearInterval(timer); const page = await appClient.entities.PublishJob.filter({ post_id: post.id }, { limit: 200 }); if (active) { setJobs(page.items); setCaption(result.caption); setDeliveryStatus(result.status); await onChanged?.(); } } } catch (e) { if (active) { clearInterval(timer); if(e.status !== 404) setError(e.message); } } };
        refresh();
        timer = setInterval(refresh, 5000);
        return () => { active = false; clearInterval(timer); };
    }, [post.id, deliveryStatus, onChanged]);
    useEffect(() => {
        let active = true;
        if (post.media_ids?.length) appClient.entities.MediaAsset.filter({ id: { $in: post.media_ids } }, { limit: 10 }).then(page => { if (active) setImages(post.media_ids.map(id => page.items.find(image => image.id === id)).filter(Boolean)); }).catch(e => { if (active) setError(e.message); });
        return () => { active = false; };
    }, [post.id, post.media_ids]);
    async function reschedule() { setBusy(true); setError(''); try { const time=toUtcIso(value.date,value.time,value.timezone); if(post.is_demo){const {id,created_date,updated_date,...data}=post;await appClient.posts.save({id,data:{...data,scheduled_at:time,timezone:value.timezone,status:'scheduled'}});await onChanged?.();onClose();}else setReview(await appClient.publishing.prepareSchedule(post.id,time,value.timezone)); } catch(e){setError(e.message);}finally{setBusy(false);} }

    return <Dialog open onOpenChange={open => !open && onClose()}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{post.title || t("Untitled post")}</DialogTitle></DialogHeader><StatusBadge tone={POST_STATUS_TONE[deliveryStatus]}>{POST_STATUS_LABEL[deliveryStatus]}</StatusBadge><p className="whitespace-pre-wrap my-5 text-sm">{caption}</p>{images.length > 0 && <div className={`grid ${images[0]?.file_type === 'video' ? 'grid-cols-1' : 'grid-cols-3'} gap-2 mb-4`}>{images.map(image => image.file_type === 'video' ? <video key={image.id} src={image.file_url} controls preload="metadata" className="max-h-64 w-full rounded-lg" /> : <img key={image.id} src={image.file_url} alt={image.name} className="h-28 w-full object-contain rounded-lg border" />)}</div>}{deliveryStatus === 'processing' && images.length > 0 && <p role="status" className="label-xs mb-3">{images[0]?.file_type === 'video' ? t(videoStage === 'processing' ? 'Facebook is processing the video. Publication is not confirmed yet.' : 'Uploading video to Facebook') : <>{t("Uploading photos to Facebook")} · {uploadedPhotos}/{images.length}</>}</p>}<p className="label-xs">{formatDateTime(post.scheduled_at, post.timezone)}</p><div className="flex flex-wrap gap-3 my-5">{!automatic && ['draft', 'scheduled'].includes(deliveryStatus) && <Link to={`/create?edit=${post.id}`} className="border rounded-lg px-3 py-2 text-xs" onClick={onClose}>{t("Edit post")}</Link>}<Link to={`/create?duplicate=${post.id}`} className="border rounded-lg px-3 py-2 text-xs" onClick={onClose}>{t("Duplicate as draft")}</Link></div>{!automatic && ['draft', 'scheduled', 'cancelled'].includes(deliveryStatus) && !jobs.some(job => job.attempts > 0) && <section className="border-t pt-4"><h3 className="mb-3">{t("Plan / reschedule")}</h3><ScheduleFields value={value} onChange={p => setValue({ ...value, ...p })} /><p className="label-xs my-3">{t("Review the Page, content and time before enabling automatic publishing.")}</p><Button disabled={busy} onClick={reschedule}>{busy ? t("Saving…") : t("Review automatic schedule")}</Button></section>}{automatic && <section className="border-t mt-5 pt-4"><p className="label-xs mb-3">{t('Automatic publishing is enabled. Cancel this schedule before editing or choosing a new time.')}</p><Button disabled={busy} onClick={async()=>{setBusy(true);try{await appClient.publishing.cancelSchedule(post.id);await onChanged?.();onClose();}catch(e){setError(e.message);}finally{setBusy(false);}}}>{t('Cancel automatic schedule')}</Button></section>}<section className="border-t mt-5 pt-4"><h3>{t("Publishing history")}</h3>{jobs.length ? jobs.map(j => <div className="border-b py-3 text-xs" key={j.id}><p>{j.account_name} · {JOB_STATUS_LABEL[j.status] || j.status}</p>{j.error_message && <p className="text-dangerFg mt-1">{t(j.error_message)}</p>}{j.published_url && <a href={j.published_url} target="_blank" rel="noreferrer" className="underline">{t("View published post")}</a>}</div>) : <p className="label-xs mt-2">{t("No publishing attempts recorded.")}</p>}</section>{review && <PublishConfirmation review={review} onClose={()=>setReview(null)} onResult={async()=>{setReview(null);await onChanged?.();onClose();}} />}{error && <p role="alert" className="mt-4 text-sm text-dangerFg">{t(error)}</p>}</DialogContent></Dialog>;
}
