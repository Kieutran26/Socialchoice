import LoadError from '@/components/common/load-error';
import BulkScheduleDialog from '@/components/posts/BulkScheduleDialog';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    NotePencil,
    Plus,
    Trash,
    Prohibit,
    ArrowDown,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import PostFilters from '@/components/posts/PostFilters';
import PostTable from '@/components/posts/PostTable';
import PostGrid from '@/components/posts/PostGrid';
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
    const [loadError, setLoadError] = useState('');
    const [loadingMore, setLoadingMore] = useState(false);
    const [posts, setPosts] = useState([]);
    const [mediaMap, setMediaMap] = useState({});
    const [cursor, setCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [selected, setSelected] = useState([]);
    const [openPost, setOpenPost] = useState(null);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [bulkAction, setBulkAction] = useState(null);
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('table');
    const [statusCounts, setStatusCounts] = useState({
        all: 0,
        draft: 0,
        scheduled: 0,
        published: 0,
        failed: 0,
    });

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

    const loadStatusCounts = useCallback(async () => {
        try {
            const agg = await appClient.entities.Post.aggregate({ query: scope, groupBy: 'status' });
            const counts = { all: 0, draft: 0, scheduled: 0, published: 0, failed: 0 };
            let total = 0;
            agg.rows?.forEach((row) => {
                const count = Number(row.count) || 0;
                total += count;
                if (row.status === 'failed' || row.status === 'cancelled') {
                    counts.failed = (counts.failed || 0) + count;
                } else if (counts[row.status] !== undefined) {
                    counts[row.status] = count;
                }
            });
            counts.all = total;
            setStatusCounts(counts);
        } catch {
            // fallback gracefully
        }
    }, [scope]);

    useEffect(() => {
        loadStatusCounts();
    }, [loadStatusCounts]);

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
        })().catch((error) => setLoadError(error.message));
    }, [scope.is_demo]);

    const platformAccountIds = useMemo(
        () => accounts.filter((account) => account.platform === filters.platform).map((account) => account.id),
        [accounts, filters.platform]
    );

    const buildQuery = useCallback(() => {
        const query = { ...scope };
        if (filters.status !== 'all') {
            if (filters.status === 'failed') {
                query.status = { $in: ['failed', 'cancelled'] };
            } else {
                query.status = filters.status;
            }
        }
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
        setLoadError('');
        try {
            const page = await appClient.entities.Post.filter(buildQuery(), { sort: '-scheduled_at', limit: PAGE_SIZE });
            setPosts(page.items);
            setCursor(page.next_cursor);
            setHasMore(!!page.has_more);
            setSelected([]);
        } catch (error) {
            setLoadError(error.message);
        } finally {
            setLoading(false);
        }
    }, [buildQuery]);

    useEffect(() => {
        load();
    }, [load]);

    // Fetch media for loaded posts to display thumbnails
    useEffect(() => {
        const ids = [...new Set(posts.flatMap((p) => p.media_ids || []))];
        if (!ids.length) {
            setMediaMap({});
            return;
        }
        let active = true;
        appClient.entities.MediaAsset.filter({ id: { $in: ids } }, { limit: 100 })
            .then((page) => {
                if (!active) return;
                const map = {};
                page.items?.forEach((item) => {
                    map[item.id] = item;
                });
                setMediaMap(map);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [posts]);

    useEffect(() => {
        if (!openPostId) {
            setOpenPost(null);
            return;
        }
        if (openPost?.id === openPostId) return;
        appClient.entities.Post.get(openPostId)
            .then(setOpenPost)
            .catch(() => setOpenPost(null));
         
    }, [openPostId]);

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const page = await appClient.entities.Post.filter(buildQuery(), {
                sort: '-scheduled_at',
                limit: PAGE_SIZE,
                cursor,
            });
            setPosts((prev) => [...prev, ...page.items]);
            setCursor(page.next_cursor);
            setHasMore(!!page.has_more);
        } catch (error) {
            setLoadError(error.message);
        } finally {
            setLoadingMore(false);
        }
    };

    const closeDetail = () => {
        const next = new URLSearchParams(searchParams);
        next.delete('post');
        setSearchParams(next);
        setOpenPost(null);
        load();
        loadStatusCounts();
    };

    const eligible = (statuses) => posts.filter((post) => selected.includes(post.id) && statuses.includes(post.status));

    const runBulk = async (action) => {
        if (action === 'delete') {
            const targets = eligible(['draft']);
            if (!targets.length) {
                toast({ variant: 'destructive', title: t('Only drafts can be deleted in bulk') });
                return;
            }
            await appClient.entities.Post.deleteMany({ id: { $in: targets.map((post) => post.id) } });
            toast({ title: t('{count} drafts deleted', { count: targets.length }) });
        }
        if (action === 'cancel') {
            const targets = eligible(['scheduled']);
            if (!targets.length) {
                toast({ variant: 'destructive', title: t('Only scheduled posts can be cancelled') });
                return;
            }
            if (isDesktop()) {
                await appClient.posts.cancelPlans(targets.map((post) => post.id));
            } else {
                for (const post of targets) {
                    let automatic = false;
                    try {
                        automatic = (await appClient.publishing.status(post.id)).status === 'queued';
                    } catch (error) {
                        if (error.status !== 404) throw error;
                    }
                    if (automatic) await appClient.publishing.cancelSchedule(post.id);
                    else {
                        await appClient.entities.PublishJob.updateMany(
                            { post_id: post.id, status: 'pending' },
                            { $set: { status: 'cancelled', error_message: 'Cancelled in bulk.' } }
                        );
                        await appClient.entities.Post.update(post.id, { status: 'cancelled' });
                    }
                }
            }
            toast({ title: t('{count} posts cancelled', { count: targets.length }) });
        }
        setBulkAction(null);
        load();
        loadStatusCounts();
    };

    const handleTabChange = (statusKey) => {
        setFilters((prev) => ({ ...prev, status: statusKey }));
        const next = new URLSearchParams(searchParams);
        if (statusKey === 'all') next.delete('status');
        else next.set('status', statusKey);
        setSearchParams(next);
    };

    if (loadError) return <LoadError message={loadError} onRetry={() => window.location.reload()} />;

    const tabs = [
        { key: 'all', label: t('All Posts'), count: statusCounts.all, dot: null },
        { key: 'draft', label: t('Draft'), count: statusCounts.draft, dot: 'bg-zinc-400' },
        { key: 'scheduled', label: t('Scheduled'), count: statusCounts.scheduled, dot: 'bg-amber-500' },
        { key: 'published', label: t('Published'), count: statusCounts.published, dot: 'bg-emerald-500' },
        ...(statusCounts.failed > 0 || filters.status === 'failed'
            ? [{ key: 'failed', label: t('Failed / Cancelled'), count: statusCounts.failed, dot: 'bg-rose-500' }]
            : []),
    ];

    return (
        <>
            <PageHeader
                title={t('All Posts')}
                description={t(
                    isDesktop()
                        ? 'Drafts and local calendar plans with their strategy and status.'
                        : 'Every draft, scheduled and published post with its pillar, angle, destinations and status.'
                )}
                actions={
                    <Link to="/create" className="btn-skew">
                        <Plus size={16} weight="bold" /> {t('Create Post')}
                    </Link>
                }
            />

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-4 scroll-slim">
                {tabs.map((tab) => {
                    const isActive = filters.status === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => handleTabChange(tab.key)}
                            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                                isActive
                                    ? 'bg-card text-foreground border border-border shadow-2xs font-semibold'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                            }`}
                        >
                            {tab.dot && <span className={`h-2 w-2 rounded-full ${tab.dot}`} />}
                            <span>{tab.label}</span>
                            <span
                                className={`rounded-md px-1.5 py-0.2 text-[10px] font-semibold ${
                                    isActive
                                        ? 'bg-brand/20 text-brand-ink'
                                        : 'bg-muted text-muted-foreground'
                                }`}
                            >
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filter toolbar */}
            <PostFilters
                filters={filters}
                setFilters={setFilters}
                pillars={pillars}
                angles={angles}
                accounts={accounts}
                viewMode={viewMode}
                setViewMode={setViewMode}
            />

            {/* Bulk Selection Bar */}
            {selected.length ? (
                <div className="panel mb-4 flex flex-wrap items-center gap-2 px-4 py-3 bg-muted/40 border border-border rounded-xl">
                    <span className="text-[12px] font-medium text-foreground">
                        {selected.length} {t('selected')}
                    </span>
                    {!isDesktop() && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg text-xs h-8"
                            disabled={
                                scope.is_demo ||
                                selected.length > 50 ||
                                eligible(['draft']).length !== selected.length
                            }
                            title={t('Select between 1 and 50 different live drafts')}
                            onClick={() => setScheduleOpen(true)}
                        >
                            {t('Schedule selected drafts')}
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-xs"
                        onClick={() => setBulkAction('cancel')}
                    >
                        <Prohibit size={13} className="mr-1.5" /> {t('Cancel scheduled')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-xs text-dangerFg hover:text-dangerFg border-dangerBg"
                        onClick={() => setBulkAction('delete')}
                    >
                        <Trash size={13} className="mr-1.5" /> {t('Delete drafts')}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-8 rounded-lg text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setSelected([])}
                    >
                        {t('Clear selection')}
                    </Button>
                </div>
            ) : null}

            {loading ? (
                <Skeleton className="h-[420px] rounded-2xl" />
            ) : !posts.length ? (
                <EmptyState
                    icon={NotePencil}
                    title={t('No posts match this view')}
                    description={t(
                        isDesktop()
                            ? 'Change the filters or start a draft. Calendar plans are saved locally without automatic publishing.'
                            : 'Change the filters above, or start a new post to fill the calendar. Drafts, scheduled and published posts all live here.'
                    )}
                >
                    <Button asChild variant="outline">
                        <Link to="/create">
                            <Plus size={15} weight="bold" /> {t('Create Post')}
                        </Link>
                    </Button>
                </EmptyState>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <PostGrid
                            posts={posts}
                            brands={brands}
                            pillars={pillars}
                            angles={angles}
                            accounts={accounts}
                            timezone={timezone}
                            selected={selected}
                            onSelect={setSelected}
                            mediaMap={mediaMap}
                            onOpen={(post) => {
                                setOpenPost(post);
                                const next = new URLSearchParams(searchParams);
                                next.set('post', post.id);
                                setSearchParams(next);
                            }}
                        />
                    ) : (
                        <PostTable
                            posts={posts}
                            brands={brands}
                            pillars={pillars}
                            angles={angles}
                            accounts={accounts}
                            timezone={timezone}
                            selected={selected}
                            onSelect={setSelected}
                            mediaMap={mediaMap}
                            onOpen={(post) => {
                                setOpenPost(post);
                                const next = new URLSearchParams(searchParams);
                                next.set('post', post.id);
                                setSearchParams(next);
                            }}
                        />
                    )}

                    <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="label-xs">
                            {t('Showing')} {posts.length} {t('post')}
                            {posts.length === 1 ? '' : t('s')}
                            {filters.status !== 'all' ? ` · ${POST_STATUS_LABEL[filters.status] || filters.status}` : ''}
                        </span>
                        {hasMore ? (
                            <Button
                                variant="outline"
                                className="rounded-lg text-xs"
                                disabled={loadingMore}
                                onClick={loadMore}
                            >
                                <ArrowDown size={14} className="mr-1.5" />
                                {loadingMore ? t('Loading…') : t('Load more')}
                            </Button>
                        ) : null}
                    </div>
                </>
            )}

            {openPost ? (
                <PostDetailSheet
                    key={openPost.id}
                    post={openPost}
                    onClose={closeDetail}
                    onChanged={() => {
                        load();
                        loadStatusCounts();
                    }}
                />
            ) : null}

            {scheduleOpen && (
                <BulkScheduleDialog
                    posts={eligible(['draft'])}
                    timezone={timezone}
                    onClose={() => setScheduleOpen(false)}
                    onScheduled={() => {
                        setScheduleOpen(false);
                        toast({ title: t('All automatic schedules confirmed') });
                        load();
                        loadStatusCounts();
                    }}
                />
            )}

            <ConfirmDialog
                open={!!bulkAction}
                onOpenChange={(value) => !value && setBulkAction(null)}
                title={bulkAction === 'delete' ? t('Delete selected drafts?') : t('Cancel selected posts?')}
                description={
                    bulkAction === 'delete'
                        ? t(
                              'Selected drafts are removed permanently. Posts already scheduled or published are left untouched.'
                          )
                        : t(
                              isDesktop()
                                  ? 'Selected calendar plans are cancelled. Drafts and other posts are preserved.'
                                  : 'Queued destination jobs are cancelled and the posts move to Cancelled. Published history is preserved.'
                          )
                }
                confirmLabel={bulkAction === 'delete' ? t('Delete drafts') : t('Cancel posts')}
                destructive={bulkAction === 'delete'}
                onConfirm={() => runBulk(bulkAction)}
            />
        </>
    );
}
