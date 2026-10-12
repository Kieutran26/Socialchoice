import { useCallback, useEffect, useMemo, useState } from 'react';
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

export default function ContentCalendar() {
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
        setLoading(true);
        const [pillarPage, anglePage, accountPage] = await Promise.all([
            base44.entities.ContentPillar.filter({ is_demo: scope.is_demo }, { sort: 'name', limit: 300 }),
            base44.entities.ContentAngle.filter({ is_demo: scope.is_demo }, { sort: 'name', limit: 500 }),
            base44.entities.SocialAccount.filter({ is_demo: scope.is_demo }, { sort: 'name', limit: 300 }),
        ]);
        setPillars(pillarPage.items);
        setAngles(anglePage.items);
        setAccounts(accountPage.items);

        const query = {
            ...scope,
            scheduled_at: {
                $gte: toUtcIso(range.start, '00:00', timezone),
                $lt: toUtcIso(addDays(range.end, 1), '00:00', timezone),
            },
        };
        if (filters.pillar_id !== 'all') query.pillar_id = filters.pillar_id;
        if (filters.angle_id !== 'all') query.angle_id = filters.angle_id;
        if (filters.account_id !== 'all') query.account_ids = filters.account_id;
        const page = await base44.entities.Post.filter(query, { sort: 'scheduled_at', limit: view === 'list' ? 200 : 300 });
        setPosts(page.items);
        setLoading(false);
    }, [scope, range, filters, view, timezone]);

    useEffect(() => {
        load();
    }, [load]);

    const postsByDay = useMemo(() => {
        const map = {};
        posts.forEach((post) => {
            if (!post.scheduled_at) return;
            const key = dateKey(post.scheduled_at, post.timezone || timezone);
            map[key] = [...(map[key] || []), post];
        });
        return map;
    }, [posts, timezone]);

    const label =
        view === 'month'
            ? new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
                new Date(`${anchor.slice(0, 7)}-01T00:00:00Z`),
            )
            : view === 'week'
                ? `${range.start} → ${addDays(range.end, -1)}`
                : `Next 60 days from ${anchor}`;

    const shift = (direction) => {
        if (view === 'month') setAnchor(shiftMonths(anchor, direction));
        else setAnchor(addDays(anchor, direction * (view === 'week' ? 7 : 30)));
    };

    return (
        <>
            <PageHeader
                title="Content Calendar"
                description={`All scheduled and published content, shown in ${timezone}. Click any item to open it, reschedule it or edit it.`}
                actions={
                    <Link to="/create" className="btn-skew">
                        <Plus size={15} weight="bold" />
                        Create Post
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

            {loading ? (
                <Skeleton className="h-[520px] rounded-2xl" />
            ) : !posts.length ? (
                <EmptyState
                    icon={CalendarDots}
                    title="Nothing scheduled in this range"
                    description="Move to another period, clear the filters, or schedule a post to see it appear here."
                >
                    <Link to="/create" className="btn-skew">
                        <Plus size={15} weight="bold" /> Create Post
                    </Link>
                </EmptyState>
            ) : view === 'month' ? (
                <MonthView
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
                {selectedBrandId === 'all' ? 'Showing every brand' : 'Filtered to the selected brand'} · {posts.length} item
                {posts.length === 1 ? '' : 's'} in view
            </p>

            {openPost ? <PostDetailSheet post={openPost} onClose={() => setOpenPost(null)} onChanged={load} /> : null}
        </>
    );
} ContentPillars.jsx