import BulkScheduleDialog from '@/components/posts/BulkScheduleDialog';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { NotePencil, Plus, Trash, Prohibit, ArrowDown } from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import PostFilters from '@/components/posts/PostFilters';
import PostTable from '@/components/posts/PostTable';
import PostDetailSheet from '@/components/posts/PostDetailSheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { POST_STATUS_LABEL } from '@/lib/constants';

const PAGE_SIZE = 20;

export default function AllPosts() {
    const { t } = useTranslation();
    const { scope, brands, timezone } = useWorkspace();
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const openPostId = searchParams.get('post');

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [posts, setPosts] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [selected, setSelected] = useState([]);
    const [openPost, setOpenPost] = useState(null);
    const [scheduleOpen,setScheduleOpen]=useState(false);
    const [bulkAction, setBulkAction] = useState(null);
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        search: '',
        status: searchParams.get('status') || 'all',
        pillar_id: 'all',
        angle_id: 'all',
        account_id: 'all',
        platform: 'all',
    });

    useEffect(() => {
        const timer = setTimeout(() => setFilters((prev) => ({ ...prev, search })), 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        (async () => {
            const [pillarPage, anglePage, accountPage] = await Promise.all([
                appClient.entities.ContentPillar.filter({ is_demo: scope.is_demo }, { sort: 'name', limit: 300 }),
                appClient.entities.ContentAngle.filter({ is_demo: scope.is_demo }, { sort: 'name', limit: 500 }),
                appClient.entities.SocialAccount.filter({ is_demo: scope.is_demo }, { sort: 'name', limit: 300 }),
            ]);
            setPillars(pillarPage.items);
            setAngles(anglePage.items);
            setAccounts(accountPage.items);
        })();
    }, [scope.is_demo]);

    const platformAccountIds = useMemo(
        () => accounts.filter((account) => account.platform === filters.platform).map((account) => account.id),
        [accounts, filters.platform],
    );

    const buildQuery = useCallback(() => {
        const query = { ...scope };
        if (filters.status !== 'all') query.status = filters.status;
        if (filters.pillar_id !== 'all') query.pillar_id = filters.pillar_id;
        if (filters.angle_id !== 'all') query.angle_id = filters.angle_id;
        if (filters.account_id !== 'all') {
            query.account_ids = filters.account_id;
        } else if (filters.platform !== 'all') {
            query.account_ids = { $in: platformAccountIds };
        }
        if (filters.search.trim()) {
            const pattern = filters.search.trim();
            query.$or = [{ title: { $regex: pattern, $options: 'i' } }, { caption: { $regex: pattern, $options: 'i' } }];
        }
        return query;
    }, [scope, filters, platformAccountIds]);

    const load = useCallback(async () => {
        setLoading(true);
        const page = await appClient.entities.Post.filter(buildQuery(), { sort: '-scheduled_at', limit: PAGE_SIZE });
        setPosts(page.items);
        setCursor(page.next_cursor);
        setHasMore(!!page.has_more);
        setSelected([]);
        setLoading(false);
    }, [buildQuery]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!openPostId) {
            setOpenPost(null);
            return;
        }
        if (openPost?.id === openPostId) return;
        appClient.entities.Post.get(openPostId)
            .then(setOpenPost)
            .catch(() => setOpenPost(null));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openPostId]);

    const loadMore = async () => {
        setLoadingMore(true);
        const page = await appClient.entities.Post.filter(buildQuery(), {
            sort: '-scheduled_at',
            limit: PAGE_SIZE,
            cursor,
        });
        setPosts((prev) => [...prev, ...page.items]);
        setCursor(page.next_cursor);
        setHasMore(!!page.has_more);
        setLoadingMore(false);
    };

    const closeDetail = () => {
        const next = new URLSearchParams(searchParams);
        next.delete('post');
        setSearchParams(next);
        setOpenPost(null);
        load();
    };

    const eligible = (statuses) => posts.filter((post) => selected.includes(post.id) && statuses.includes(post.status));

    const runBulk = async (action) => {
        if (action === 'delete') {
            const targets = eligible(['draft']);
            if (!targets.length) {
                toast({ variant: 'destructive', title: t("Only drafts can be deleted in bulk") });
                return;
            }
            await appClient.entities.Post.deleteMany({ id: { $in: targets.map((post) => post.id) } });
            toast({ title: t('{count} drafts deleted', {count: targets.length}) });
        }
        if (action === 'cancel') {
            const targets = eligible(['scheduled']);
            if (!targets.length) {
                toast({ variant: 'destructive', title: t("Only scheduled posts can be cancelled") });
                return;
            }
            for (const post of targets) {
                let automatic = false;
                try { automatic = (await appClient.publishing.status(post.id)).status === 'queued'; } catch (error) { if (error.status !== 404) throw error; }
                if (automatic) await appClient.publishing.cancelSchedule(post.id);
                else {
                    await appClient.entities.PublishJob.updateMany({ post_id: post.id, status:'pending' },{ $set:{status:'cancelled',error_message:'Cancelled in bulk.'} });
                    await appClient.entities.Post.update(post.id,{status:'cancelled'});
                }
            }
            toast({ title: t('{count} posts cancelled', {count: targets.length}) });
        }
        setBulkAction(null);
        load();
    };

    return (
        <>
            <PageHeader
                title={t("All Posts")}
                description={t("Every draft, scheduled and published post with its pillar, angle, destinations and status.")}
                actions={
                    <Link to="/create" className="btn-skew">
                        <Plus size={16} weight="duotone" /> {t("Create Post")} </Link>
                }
            />

            <PostFilters
                filters={filters}
                setFilters={setFilters}
                pillars={pillars}
                angles={angles}
                accounts={accounts}
            />

            {selected.length ? (
                <div className="panel mb-4 flex flex-wrap items-center gap-2 px-4 py-3">
                    <span className="text-[12px]">{selected.length} {t("selected")}</span>
                    <Button variant="outline" size="sm" disabled={scope.is_demo || selected.length>50 || eligible(['draft']).length!==selected.length} title={t("Select between 1 and 50 different live drafts")} onClick={()=>setScheduleOpen(true)}>{t("Schedule selected drafts")}</Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-md text-[12px]"
                        onClick={() => setBulkAction('cancel')}
                    >
                        <Prohibit size={13} className="mr-1.5" /> {t("Cancel scheduled")} </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-md text-[12px] text-dangerFg hover:text-dangerFg"
                        onClick={() => setBulkAction('delete')}
                    >
                        <Trash size={13} className="mr-1.5" /> {t("Delete drafts")} </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-7 rounded-md text-[12px]"
                        onClick={() => setSelected([])}
                    > {t("Clear selection")} </Button>
                </div>
            ) : null}

            {loading ? (
                <Skeleton className="h-[420px] rounded-2xl" />
            ) : !posts.length ? (
                <EmptyState
                    icon={NotePencil}
                    title={t("No posts match this view")}
                    description={t("Change the filters above, or start a new post to fill the calendar. Drafts, scheduled and published posts all live here.")}
                >
                    <Button asChild variant="outline"><Link to="/create">
                        <Plus size={15} weight="bold" /> {t("Create Post")} </Link></Button>
                </EmptyState>
            ) : (
                <>
                    <PostTable
                        posts={posts}
                        brands={brands}
                        pillars={pillars}
                        angles={angles}
                        accounts={accounts}
                        timezone={timezone}
                        selected={selected}
                        onSelect={setSelected}
                        onOpen={(post) => {
                            setOpenPost(post);
                            const next = new URLSearchParams(searchParams);
                            next.set('post', post.id);
                            setSearchParams(next);
                        }}
                    />
                    <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="label-xs"> {t("Showing")} {posts.length} {t("post")}{posts.length === 1 ? '' : t("s")}
                            {filters.status !== 'all' ? ` · ${POST_STATUS_LABEL[filters.status]}` : ''}
                        </span>
                        {hasMore ? (
                            <Button variant="outline" className="rounded-lg" disabled={loadingMore} onClick={loadMore}>
                                <ArrowDown size={14} className="mr-1.5" />
                                {loadingMore ? t("Loading…") : t("Load more")}
                            </Button>
                        ) : null}
                    </div>
                </>
            )}

            {openPost ? <PostDetailSheet key={openPost.id} post={openPost} onClose={closeDetail} onChanged={load} /> : null}

            {scheduleOpen && <BulkScheduleDialog posts={eligible(['draft'])} timezone={timezone} onClose={()=>setScheduleOpen(false)} onScheduled={()=>{setScheduleOpen(false);toast({title:t('All automatic schedules confirmed')});load();}}/>}
            <ConfirmDialog
                open={!!bulkAction}
                onOpenChange={(value) => !value && setBulkAction(null)}
                title={bulkAction === 'delete' ? t("Delete selected drafts?") : t("Cancel selected posts?")}
                description={
                    bulkAction === 'delete'
                        ? t("Selected drafts are removed permanently. Posts already scheduled or published are left untouched.")
                        : t("Queued destination jobs are cancelled and the posts move to Cancelled. Published history is preserved.")
                }
                confirmLabel={bulkAction === 'delete' ? t("Delete drafts") : t("Cancel posts")}
                destructive={bulkAction === 'delete'}
                onConfirm={() => runBulk(bulkAction)}
            />
        </>
    );
}
