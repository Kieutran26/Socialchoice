import { Button } from '@/components/ui/button';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDots, Plus } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/workspace-context';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import CalendarToolbar from '@/components/calendar/CalendarToolbar';
import MonthView from '@/components/calendar/MonthView';
import WeekView from '@/components/calendar/WeekView';
import ListView from '@/components/calendar/ListView';
import PostDetailSheet from '@/components/posts/PostDetailSheet';
import { Skeleton } from '@/components/ui/skeleton';
import { addDays, shiftMonths, startOfMonth, toUtcIso, todayInZone, weekdayIndex } from '@/lib/tz';
import { dateKey } from '@/lib/format';
import { formatCalendarDate } from '@/lib/format';
import { useTranslation } from '@/lib/i18n';
import { getLocale } from '@/lib/i18n-core';
import { isDesktop } from '@/api/desktop/runtime';
import { toZonedParts } from '@/lib/tz';
import LoadError from '@/components/common/load-error';

export default function ContentCalendar() {
    const { t } = useTranslation();
    const { scope, brands, selectedBrandId, timezone } = useWorkspace();
    const [view, setView] = useState('month');
    const [anchor, setAnchor] = useState(() => todayInZone(timezone));
    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [openPost, setOpenPost] = useState(null);
    const [filters, setFilters] = useState({ account_id: 'all', pillar_id: 'all', angle_id: 'all' });
    const [error, setError] = useState('');
    const [moving, setMoving] = useState(false);
    const requestVersion = useRef(0);
    const reloadCurrent = useRef(async () => {});

    const range = useMemo(() => {
        if (view === 'month') {
            const first = startOfMonth(anchor);
            const start = addDays(first, -weekdayIndex(first));
            return { start, end: addDays(start, 42) };
        }
        if (view === 'week') {
            const start = addDays(anchor, -weekdayIndex(anchor));
            return { start, end: addDays(start, 7) };
        }
        return { start: anchor, end: addDays(anchor, 60) };
    }, [view, anchor]);

    const dayList = useMemo(() => {
        if (view === 'month') {
            return Array.from({ length: 42 }, (_, index) => {
                const date = addDays(range.start, index);
                return { date, inMonth: date.slice(0, 7) === anchor.slice(0, 7) };
            });
        }
        if (view === 'week') {
            return Array.from({ length: 7 }, (_, index) => addDays(range.start, index));
        }
        return Array.from({ length: 60 }, (_, index) => addDays(range.start, index));
    }, [view, range, anchor]);

    const load = useCallback(async () => {
        const version = ++requestVersion.current;
        setLoading(true);
        setError('');
        try {
        const [pillarPage, anglePage, accountPage] = await Promise.all([
            base44.entities.ContentPillar.filter({ is_demo: scope.is_demo }, { sort: 'name', limit: 300 }),
            base44.entities.ContentAngle.filter({ is_demo: scope.is_demo }, { sort: 'name', limit: 500 }),
            base44.entities.SocialAccount.filter({ is_demo: scope.is_demo }, { sort: 'name', limit: 300 }),
        ]);
        const query = {
            ...scope,
            scheduled_at: {
                $gte: toUtcIso(range.start, '00:00', timezone),
                $lt: toUtcIso(isDesktop() ? range.end : addDays(range.end, 1), '00:00', timezone),
            },
        };
        if (filters.pillar_id !== 'all') query.pillar_id = filters.pillar_id;
        if (filters.angle_id !== 'all') query.angle_id = filters.angle_id;
        if (filters.account_id !== 'all') query.account_ids = filters.account_id;
        const page = await base44.entities.Post.filter(query, { sort: 'scheduled_at', limit: view === 'list' ? 200 : 300 });
        if (version !== requestVersion.current) return;
        setPillars(pillarPage.items);
        setAngles(anglePage.items);
        setAccounts(accountPage.items);
        setPosts(page.items);
        } catch (failure) { if (version === requestVersion.current) setError(failure.message); }
        finally { if (version === requestVersion.current) setLoading(false); }
    }, [scope, range, filters, view, timezone]);
    reloadCurrent.current = load;

    useEffect(() => {
        load();
        return () => { requestVersion.current++; };
    }, [load]);

    const postsByDay = useMemo(() => {
        /** @type {Record<string, import('@/components/component-types').EntityRecord[]>} */
        const map = {};
        posts.forEach((post) => {
            if (!post.scheduled_at) return;
            const key = dateKey(post.scheduled_at, isDesktop() ? timezone : post.timezone || timezone);
            map[key] = [...(map[key] || []), post];
        });
        return map;
    }, [posts, timezone]);

    const label =
        view === 'month'
            ? new Intl.DateTimeFormat(getLocale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
                new Date(`${anchor.slice(0, 7)}-01T00:00:00Z`),
            )
            : view === 'week'
                ? `${formatCalendarDate(range.start)} → ${formatCalendarDate(addDays(range.end, -1))}`
                : t('Next 60 days from {date}', { date: formatCalendarDate(anchor) });

    const shift = (direction) => {
        if (view === 'month') setAnchor(shiftMonths(anchor, direction));
        else setAnchor(addDays(anchor, direction * (view === 'week' ? 7 : 30)));
    };

    const movePlan = async (id, date) => {
        const post = posts.find(item => item.id === id);
        if (moving || !post || post.status !== 'scheduled') return;
        setMoving(true); setError('');
        try {
            const recordTimezone = post.timezone || timezone;
            const local = toZonedParts(post.scheduled_at, recordTimezone);
            const displayed = toZonedParts(post.scheduled_at, timezone);
            const delta = Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(displayed.date + 'T00:00:00Z')) / 86400000);
            const localDate = addDays(local.date, delta);
            const instant = toUtcIso(localDate, local.time, recordTimezone);
            const roundTrip = toZonedParts(instant, recordTimezone);
            if (roundTrip.date !== localDate || roundTrip.time !== local.time) throw new Error('Choose a valid local time in this timezone.');
            if (dateKey(instant, timezone) !== date) throw new Error('This move crosses a timezone boundary. Open the plan to choose its date and time.');
            await base44.posts.save({ id, data: { status: 'scheduled', scheduled_at: instant } });
            await reloadCurrent.current();
        } catch (failure) { setError(failure.message); }
        finally { setMoving(false); }
    };

    return (
        <>
            <PageHeader
                title={t('Content Calendar')}
                description={t(isDesktop() ? 'Local calendar plans shown in {timezone}. Open a plan to edit its date and time.' : 'All scheduled and published content, shown in {timezone}. Click any item to open it, reschedule it or edit it.', { timezone })}
                actions={
                    <Link to="/create" className="btn-skew">
                        <Plus size={16} weight="duotone" />
                        {t('Create Post')}
                    </Link>
                }
            />

            <CalendarToolbar
                view={view}
                setView={setView}
                label={label}
                onPrev={() => shift(-1)}
                onNext={() => shift(1)}
                onToday={() => setAnchor(todayInZone(timezone))}
                filters={filters}
                setFilters={setFilters}
                pillars={pillars}
                angles={angles}
                accounts={accounts}
            />

            {error ? <LoadError message={error} onRetry={load} /> : loading ? (
                <Skeleton className="h-[520px] rounded-2xl" />
            ) : !posts.length ? (
                <EmptyState
                    icon={CalendarDots}
                    title={t('Nothing scheduled in this range')}
                    description={t('Move to another period, clear the filters, or schedule a post to see it appear here.')}
                >
                    <Button asChild variant="outline"><Link to="/create">
                        <Plus size={15} weight="bold" /> {t('Create Post')}
                    </Link></Button>
                </EmptyState>
            ) : view === 'month' ? (
                <MonthView
                    onMove={isDesktop() ? movePlan : undefined}
                    days={dayList}
                    postsByDay={postsByDay}
                    brands={brands}
                    pillars={pillars}
                    accounts={accounts}
                    timezone={timezone}
                    onSelect={setOpenPost}
                />
            ) : view === 'week' ? (
                <WeekView
                    onMove={isDesktop() ? movePlan : undefined}
                    days={dayList}
                    postsByDay={postsByDay}
                    brands={brands}
                    pillars={pillars}
                    accounts={accounts}
                    timezone={timezone}
                    onSelect={setOpenPost}
                />
            ) : (
                <ListView
                    displayTimezone={isDesktop() ? timezone : undefined}
                    posts={posts}
                    brands={brands}
                    pillars={pillars}
                    angles={angles}
                    accounts={accounts}
                    timezone={timezone}
                    onSelect={setOpenPost}
                />
            )}

            <p className="label-xs mt-3">
                {t(selectedBrandId === 'all' ? 'Showing every brand' : 'Filtered to the selected brand')} · {t('{count} items in view', { count: posts.length })}
            </p>
            {isDesktop() && <p className="label-xs mt-2" role="status">{t(moving ? 'Saving…' : 'Drag plans to another day, or open a plan to change its date and time.')}</p>}

            {openPost ? <PostDetailSheet key={openPost.id} post={openPost} onClose={() => setOpenPost(null)} onChanged={load} /> : null}
        </>
    );
}
