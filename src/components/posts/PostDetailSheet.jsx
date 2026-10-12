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
    const [jobs, setJobs] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const [value, setValue] = useState(() => ({ ...toZonedParts(post.scheduled_at, post.timezone || DEFAULT_TIMEZONE), timezone: post.timezone || DEFAULT_TIMEZONE }));
    useEffect(() => { appClient.entities.PublishJob.filter({ post_id: post.id }, { limit: 200 }).then(p => setJobs(p.items)).catch(e => setError(e.message)); }, [post.id]);
    async function reschedule() { setBusy(true); setError(''); try { if (!value.date || !value.time) throw new Error('Choose a date and time.'); const time = toUtcIso(value.date, value.time, value.timezone); if (new Date(time) <= new Date()) throw new Error('Choose a future time.'); const { id, created_date, updated_date, ...data } = post; await appClient.posts.save({ id, data: { ...data, scheduled_at: time, timezone: value.timezone, status: 'scheduled' } }); await onChanged?.(); onClose(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
    return <Dialog open onOpenChange={open => !open && onClose()}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{post.title || t("Untitled post")}</DialogTitle></DialogHeader><StatusBadge tone={POST_STATUS_TONE[post.status]}>{POST_STATUS_LABEL[post.status]}</StatusBadge><p className="whitespace-pre-wrap my-5 text-sm">{post.caption}</p><p className="label-xs">{formatDateTime(post.scheduled_at, post.timezone)}</p><div className="flex flex-wrap gap-3 my-5">{['draft', 'scheduled'].includes(post.status) && <Link to={`/create?edit=${post.id}`} className="border rounded-lg px-3 py-2 text-xs" onClick={onClose}>{t("Edit post")}</Link>}<Link to={`/create?duplicate=${post.id}`} className="border rounded-lg px-3 py-2 text-xs" onClick={onClose}>{t("Duplicate as draft")}</Link></div>{['draft', 'scheduled', 'cancelled', 'failed'].includes(post.status) && <section className="border-t pt-4"><h3 className="mb-3">{t("Plan / reschedule")}</h3><ScheduleFields value={value} onChange={p => setValue({ ...value, ...p })} /><p className="label-xs my-3">{t("Stored as a calendar plan. Automatic publishing requires the server integration.")}</p><Button disabled={busy} onClick={reschedule}>{busy ? t("Saving…") : t("Save calendar time")}</Button></section>}<section className="border-t mt-5 pt-4"><h3>{t("Publishing history")}</h3>{jobs.length ? jobs.map(j => <div className="border-b py-3 text-xs" key={j.id}><p>{j.account_name} · {JOB_STATUS_LABEL[j.status] || j.status}</p>{j.error_message && <p className="text-dangerFg mt-1">{t(j.error_message)}</p>}{j.published_url && <a href={j.published_url} target="_blank" rel="noreferrer" className="underline">{t("View published post")}</a>}</div>) : <p className="label-xs mt-2">{t("No publishing attempts recorded.")}</p>}</section>{error && <p role="alert" className="mt-4 text-sm text-dangerFg">{t(error)}</p>}</DialogContent></Dialog>;
}
