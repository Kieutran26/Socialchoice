import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDots, Plus } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { appClient } from '@/api/app-client';
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
import { dateKey, formatCalendarDate } from '@/lib/format';

export default function ContentCalendar() {
    const { t, language } = useTranslation();
    const { scope, brands, selectedBrandId, timezone } = useWorkspace();
    const [view, setView] = useState('month');
    const [anchor, setAnchor] = useState(() => todayInZone(timezone));
    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [openPost, setOpenPost] = useState(null);
    const [filters, setFilters] = useState({ account_id: 'all', pillar_id: 'all', angle_id: 'all', status: 'all' });

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
            appClient.entities.ContentPillar.filter(scope, { sort: 'name', limit: 300 }),
            appClient.entities.ContentAngle.filter(scope, { sort: 'name', limit: 500 }),
            appClient.entities.SocialAccount.filter(scope, { sort: 'name', limit: 300 }),
        ]);
        setPillars(pillarPage.items);
        setAngles(anglePage.items);
        setAccounts(accountPage.items);

        const query = {
            ...scope,
            scheduled_at: {
                $gte: toUtcIso(range.start, '00:00', timezone),
                $lt: toUtcIso(range.end, '00:00', timezone),
            },
        };
        if (filters.pillar_id !== 'all') query.pillar_id = filters.pillar_id;
        if (filters.angle_id !== 'all') query.angle_id = filters.angle_id;
        if (filters.account_id !== 'all') query.account_ids = filters.account_id;
        if (filters.status !== 'all') query.status = filters.status;
        const page = await appClient.entities.Post.filter(query, { sort: 'scheduled_at', limit: view === 'list' ? 200 : 300 });
        setPosts(page.items);
        setLoading(false);
    }, [scope, range, filters, view, timezone]);

    useEffect(() => {
        load();
    }, [load]);

    const postsByDay = useMemo(() => {
        /** @type {Record<string, any[]>} */
        const map = {};
        posts.forEach((post) => {
            if (!post.scheduled_at) return;
            const key = dateKey(post.scheduled_at, timezone);
            map[key] = [...(map[key] || []), post];
        });
        return map;
    }, [posts, timezone]);

    const label =
        view === 'month'
            ? new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
                new Date(`${anchor.slice(0, 7)}-01T00:00:00Z`),
            )
            : view === 'week'
                ? `${formatCalendarDate(range.start)} → ${formatCalendarDate(addDays(range.end, -1))}`
                : t("Next 60 days from {value1}", {value1: formatCalendarDate(anchor)});

    const shift = (direction) => {
        if (view === 'month') setAnchor(shiftMonths(anchor, direction));
        else setAnchor(addDays(anchor, direction * (view === 'week' ? 7 : 30)));
    };

    return (
        <>
            <PageHeader
                title={t("Content Calendar")}
                description={t("All scheduled and published content, shown in {value1}. Click any item to open it, reschedule it or edit it.", {value1: timezone})}
                actions={
                    <Link to="/create" className="btn-skew">
                        <Plus size={15} weight="bold" /> {t("Create Post")} </Link>
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
                    title={t("Nothing scheduled in this range")}
                    description={t("Move to another period, clear the filters, or schedule a post to see it appear here.")}
                >
                    <Link to="/create" className="btn-skew">
                        <Plus size={15} weight="bold" /> {t("Create Post")} </Link>
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
                {selectedBrandId === 'all' ? t("Showing every brand") : t("Filtered to the selected brand")} · {posts.length} {t("item")}{posts.length === 1 ? '' : t("s")} {t("in view")} </p>

            {openPost ? <PostDetailSheet post={openPost} onClose={() => setOpenPost(null)} onChanged={load} /> : null}
        </>
    );
}
