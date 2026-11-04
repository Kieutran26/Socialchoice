import { useEffect, useState } from 'react';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime, formatNumber } from '@/lib/format';
import { toUtcIso, toZonedParts } from '@/lib/tz';
import { TIMEZONES } from '@/lib/constants';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import MediaAttachments from './media-attachments';

export default function RecurringPostSettings({ post, onChanged }) {
    const { t } = useTranslation();
    const [series, setSeries] = useState([]), [review, setReview] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [loaded, setLoaded] = useState(false), [consent, setConsent] = useState(false);
    const [policy, setPolicy] = useState(() => ({ ...toZonedParts(new Date(Date.now() + 14 * 86400000).toISOString(), post.timezone || 'Asia/Ho_Chi_Minh'), timezone: post.timezone || 'Asia/Ho_Chi_Minh', frequency: 'biweekly', limit: '0', end_date: '' }));
    useEffect(() => {
        let active = true, timer;
        async function load() {
            try {
                const result = await appClient.recurring.list({ post_id: post.id });
                if (!active) return;
                setSeries(result.series); setLoaded(true);
                if (result.series.some(item => item.status === 'active')) timer = setTimeout(load, 10000);
            } catch (cause) { if (active) setError(cause.message); }
        }
        load(); return () => { active = false; clearTimeout(timer); };
    }, [post.id, refreshKey]);
    const active = series.find(item => item.status === 'active');
    async function action(work) {
        setBusy(true); setError('');
        try {
            await work();
            const result = await appClient.recurring.list({ post_id: post.id }); setSeries(result.series); setLoaded(true);
            setRefreshKey(value => value + 1);
            await onChanged?.();
        } catch (cause) { setError(cause.message); }
        finally { setBusy(false); }
    }
    async function prepare() {
        setBusy(true); setError(''); setConsent(false);
        try {
            const first_at = toUtcIso(policy.date, policy.time, policy.timezone);
            if (toZonedParts(first_at, policy.timezone).date !== policy.date || toZonedParts(first_at, policy.timezone).time !== policy.time) throw new Error('Choose a valid local time in this timezone.');
            setReview(await appClient.recurring.prepare({ post_id: post.id, policy: { first_at, timezone: policy.timezone, frequency: policy.frequency, limit: Number(policy.limit), end_date: policy.end_date } }));
        } catch (cause) { setError(cause.message); }
        finally { setBusy(false); }
    }
    function patch(value) { setPolicy(current => ({ ...current, ...value })); setReview(null); setConsent(false); }
    const labels = { active: 'Recurring active', paused: 'Recurring paused', stopped: 'Recurring stopped', completed: 'Recurring completed', prepared: 'Awaiting recurring approval' };
    return <section className="border-t mt-5 pt-4 space-y-4">
        <h3 className="flex items-center gap-2 text-[15px]"><ArrowsClockwise size={18} />{t('Evergreen / recurring post')}</h3>
        <p className="label-xs">{t('Automatically republish the approved copy to the same accounts. Each occurrence has separate publishing history. Changes and uncertain deliveries pause the series.')}</p>
        {!loaded && !error && <p className="label-xs">{t('Loading…')}</p>}
        {series.filter(item => item.status !== 'prepared').slice(0, 5).map(item => <div key={item.id} className="rounded-lg border p-3 space-y-2 text-xs">
            <p className="font-medium">{t(labels[item.status] || item.status)} · {t(item.policy.frequency === 'monthly' ? 'Every month' : 'Every 2 weeks')}</p>
            <p>{t('Successful recurrences')}: {formatNumber(item.completed)} · {t('Skipped recurrences')}: {formatNumber(item.skipped)} · {item.policy.timezone}</p>
            <p>{t('Publication limit')}: {item.policy.limit || t('No limit')} · {t('End date')}: {item.policy.end_date || t('No end date')}</p>
            {item.next_at && <p>{t('Next publication')}: {formatDateTime(item.next_at, item.policy.timezone)}</p>}
            {item.message && <p className="text-dangerFg">{t(item.message)}</p>}
            <div className="flex flex-wrap gap-2">
                {item.status === 'active' && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => action(() => appClient.recurring.pause({ id: item.id }))}>{t('Pause recurrence')}</Button>}
                {['active', 'paused'].includes(item.status) && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => action(() => appClient.recurring.stop({ id: item.id }))}>{t('Stop recurrence')}</Button>}
            </div>
            {!!item.occurrences?.length && <details><summary className="cursor-pointer">{t('Recurrence history')}</summary><ul className="mt-2 space-y-2">{item.occurrences.map(occurrence => <li key={occurrence.post_id}><a className="underline" href={`/posts?post=${occurrence.post_id}`}>{formatDateTime(occurrence.scheduled_at, item.policy.timezone)}</a> · {t(({ draft: 'Draft', scheduled: 'Scheduled', published: 'Published', processing: 'Processing', failed: 'Failed', unknown: 'Unknown', partially_published: 'Partially published' })[occurrence.status] || occurrence.status)}</li>)}</ul></details>}
        </div>)}
        {!active && ['draft', 'published'].includes(post.status) && <>
            <fieldset disabled={busy || !loaded} className="grid gap-3 sm:grid-cols-2">
                <label className="label-xs space-y-1">{t('Repeat interval')}<select aria-label={t('Repeat interval')} className="w-full rounded-lg border bg-background p-2 text-sm" value={policy.frequency} onChange={e => patch({ frequency: e.target.value })}><option value="biweekly">{t('Every 2 weeks')}</option><option value="monthly">{t('Every month')}</option></select></label>
                <label className="label-xs space-y-1">{t('First recurrence date')}<Input aria-label={t('First recurrence date')} type="date" value={policy.date} onChange={e => patch({ date: e.target.value })} /></label>
                <label className="label-xs space-y-1">{t('Recurrence time')}<Input aria-label={t('Recurrence time')} type="time" value={policy.time} onChange={e => patch({ time: e.target.value })} /></label>
                <label className="label-xs space-y-1">{t('Timezone')}<select aria-label={t('Recurrence timezone')} className="w-full rounded-lg border bg-background p-2 text-sm" value={policy.timezone} onChange={e => patch({ timezone: e.target.value })}>{TIMEZONES.map(zone => <option key={zone}>{zone}</option>)}</select></label>
                <label className="label-xs space-y-1">{t('End date (optional)')}<Input aria-label={t('End date (optional)')} type="date" value={policy.end_date} onChange={e => patch({ end_date: e.target.value })} /></label>
                <label className="label-xs space-y-1">{t('Total publications (0 = no limit)')}<Input aria-label={t('Total publications (0 = no limit)')} type="number" min={0} max={365} step={1} value={policy.limit} onChange={e => patch({ limit: e.target.value })} /></label>
            </fieldset>
            <p className="label-xs">{t('Monthly repeats keep the original day, or the last day of a shorter month. Missed periods are skipped. Resume requires a fresh review and starts a new series.')}</p>
            <Button type="button" variant="outline" disabled={busy || !loaded} onClick={prepare}>{t('Review recurring publication')}</Button>
        </>}
        {review && !active && <div className="border rounded-lg p-4 space-y-3">
            <h4 className="text-sm">{t('Approve recurring publication')}</h4>
            <p className="label-xs">{t(review.policy.limit || review.policy.end_date ? 'Automatic publication stops at the selected count or end date.' : 'Without an end date, automatic publication continues until you pause or stop it.')}</p>
            <p className="text-xs">{t('Upcoming dates')}: {review.dates.map(date => formatDateTime(date, review.policy.timezone)).join(' · ')}</p>
            {review.preview.map((item, index) => <div key={index} className="border-t pt-2 text-xs space-y-2"><p className="font-medium">{item.pageName} · {item.platform} · {item.pageId}</p><p className="whitespace-pre-wrap break-words">{item.caption}</p><MediaAttachments media={item.media || []} />{item.comments?.map((comment, i) => <p key={i}>{t('Follow-up comments')} #{i + 1} (+{comment.delay_minutes || 0}m): {comment.message}</p>)}</div>)}
            <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} />{t('I approve automatic republication of this content to these accounts on this recurring schedule.')}</label>
            <div className="flex flex-wrap gap-2"><button type="button" className="btn-skew" disabled={busy || !consent} onClick={() => action(async () => { await appClient.recurring.confirm({ id: review.id }); setReview(null); })}>{t(busy ? 'Saving…' : 'Enable automatic recurrence')}</button><Button type="button" variant="outline" disabled={busy} onClick={() => setReview(null)}>{t('Cancel')}</Button></div>
        </div>}
        <p className="label-xs">{t('Pausing or stopping cancels queued recurrences. A delivery that has already started cannot be recalled. The publishing server must remain available.')}</p>
        {error && <p role="alert" className="text-xs text-dangerFg">{t(error)}</p>}
    </section>;
}
