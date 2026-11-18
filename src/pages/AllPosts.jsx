import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    ArrowCounterClockwise,
    ArrowDown,
    Article,
    CalendarBlank,
    Clock,
    CopySimple,
    Eye,
    ListBullets,
    MagnifyingGlass,
    NotePencil,
    PencilSimple,
    Play,
    Plus,
    Prohibit,
    SquaresFour,
    Trash,
    UploadSimple,
    X,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from '@/lib/i18n';
import { PLATFORMS, POST_STATUS_LABEL } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { getAccountAvatarUrl } from '@/lib/account-avatar';
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import StatusBadge from '@/components/common/StatusBadge';
import LoadError from '@/components/common/load-error';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import BulkScheduleDialog from '@/components/posts/BulkScheduleDialog';
import BulkUploadDialog from '@/components/posts/bulk-upload-dialog';
import PostGrid from '@/components/posts/PostGrid';
import PostDetailSheet from '@/components/posts/PostDetailSheet';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 20;

export default function AllPosts() {
    const { t } = useTranslation();
    const { scope, brands, timezone } = useWorkspace();
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const openPostId = searchParams.get('post');
    const desktop = isDesktop();

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
    const [importOpen, setImportOpen] = useState(false);
    const [bulkAction, setBulkAction] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('list');
    const [statusCounts, setStatusCounts] = useState({
        all: 0,
        draft: 0,
        scheduled: 0,
        published: 0,
        failed: 0,
        needs_approval: 0,
    });

    const [filters, setFilters] = useState({
        search: '',
        status: searchParams.get('status') || 'all',
        campaign_id: searchParams.get('campaign_id') || 'all',
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
            const [agg, pendingApproval] = await Promise.all([
                appClient.entities.Post.aggregate({ query: scope, groupBy: 'status' }),
                appClient.entities.Post.filter(
                    { ...scope, needs_approval: true },
                    { limit: 100 }
                ).catch(() => ({ items: [] })),
            ]);
            const counts = {
                all: 0,
                draft: 0,
                scheduled: 0,
                published: 0,
                failed: 0,
                needs_approval: pendingApproval.items?.length || 0,
            };
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
            const [campaignPage, pillarPage, anglePage, accountPage] = await Promise.all([
                appClient.entities.Campaign.filter(
                    { is_demo: scope.is_demo },
                    { sort: 'name', limit: 200 }
                ).catch(() => ({ items: [] })),
                appClient.entities.ContentPillar.filter(
                    { is_demo: scope.is_demo },
                    { sort: 'name', limit: 300 }
                ),
                appClient.entities.ContentAngle.filter(
                    { is_demo: scope.is_demo },
                    { sort: 'name', limit: 500 }
                ),
                appClient.entities.SocialAccount.filter(
                    { is_demo: scope.is_demo },
                    { sort: 'name', limit: 300 }
                ),
            ]);
            setCampaigns(campaignPage.items || []);
            setPillars(pillarPage.items || []);
            setAngles(anglePage.items || []);
            setAccounts(accountPage.items || []);
        })().catch((error) => setLoadError(error.message));
    }, [scope.is_demo]);

    const platformAccountIds = useMemo(
        () =>
            accounts
                .filter((account) => account.platform === filters.platform)
                .map((account) => account.id),
        [accounts, filters.platform]
    );

    const buildQuery = useCallback(() => {
        const query = { ...scope };
        if (filters.status !== 'all') {
            if (filters.status === 'needs_approval') {
                query.needs_approval = true;
            } else if (filters.status === 'failed') {
                query.status = { $in: ['failed', 'cancelled'] };
            } else {
                query.status = filters.status;
            }
        }
        if (filters.campaign_id !== 'all') query.campaign_id = filters.campaign_id;
        if (filters.pillar_id !== 'all') query.pillar_id = filters.pillar_id;
        if (filters.angle_id !== 'all') query.angle_id = filters.angle_id;
        if (filters.account_id !== 'all') {
            query.account_ids = filters.account_id;
        } else if (filters.platform !== 'all') {
            query.account_ids = { $in: platformAccountIds };
        }
        if (filters.search.trim()) {
            const pattern = filters.search.trim();
            query.$or = [
                { title: { $regex: pattern, $options: 'i' } },
                { caption: { $regex: pattern, $options: 'i' } },
            ];
        }
        return query;
    }, [scope, filters, platformAccountIds]);

    const load = useCallback(
        async (keepSelection = false) => {
            setLoading(true);
            setLoadError('');
            try {
                const page = await appClient.entities.Post.filter(buildQuery(), {
                    sort: '-scheduled_at',
                    limit: PAGE_SIZE,
                });
                setPosts(page.items || []);
                setCursor(page.next_cursor);
                setHasMore(!!page.has_more);
                if (!keepSelection) {
                    setSelected([]);
                }
            } catch (error) {
                setLoadError(error.message);
            } finally {
                setLoading(false);
            }
        },
        [buildQuery]
    );

    useEffect(() => {
        load();
    }, [load]);

    // Fetch media thumbnails for loaded posts
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
    }, [openPostId, openPost?.id]);

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const page = await appClient.entities.Post.filter(buildQuery(), {
                sort: '-scheduled_at',
                limit: PAGE_SIZE,
                cursor,
            });
            setPosts((prev) => [...prev, ...(page.items || [])]);
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

    const eligible = (statuses) =>
        posts.filter((post) => selected.includes(post.id) && statuses.includes(post.status));

    const runBulk = async (action) => {
        if (action === 'delete') {
            const selectedPosts = posts.filter((post) => selected.includes(post.id));
            const deletableTargets = selectedPosts.filter((post) => post.status !== 'published');
            const publishedTargets = selectedPosts.filter((post) => post.status === 'published');

            if (!deletableTargets.length) {
                if (publishedTargets.length) {
                    toast({
                        variant: 'destructive',
                        title: t('Không thể xóa bài viết đã xuất bản'),
                        description: t(
                            'Bài viết đã xuất bản trên mạng xã hội được giữ lại để bảo toàn lịch sử và số liệu.'
                        ),
                    });
                }
                setBulkAction(null);
                return;
            }

            try {
                for (const post of deletableTargets) {
                    if (post.status === 'scheduled') {
                        if (desktop) {
                            try {
                                await appClient.posts.cancelPlans([post.id]);
                            } catch {}
                        } else {
                            try {
                                const st = await appClient.publishing.status(post.id);
                                if (st?.status === 'queued') {
                                    await appClient.publishing.cancelSchedule(post.id);
                                }
                            } catch (error) {
                                if (error.status !== 404) throw error;
                            }
                            await appClient.entities.PublishJob.updateMany(
                                { post_id: post.id, status: 'pending' },
                                { $set: { status: 'cancelled', error_message: 'Cancelled and deleted in bulk.' } }
                            );
                        }
                        await appClient.entities.Post.update(post.id, { status: 'draft' });
                    } else if (post.status !== 'draft') {
                        await appClient.entities.Post.update(post.id, { status: 'draft' });
                    }
                }

                await appClient.entities.Post.deleteMany({
                    id: { $in: deletableTargets.map((post) => post.id) },
                });

                const hasScheduledDeleted = deletableTargets.some((p) => p.status === 'scheduled');
                toast({
                    title: hasScheduledDeleted
                        ? t('Đã hủy lịch và xóa {count} bài viết', { count: deletableTargets.length })
                        : t('Đã xóa {count} bài viết', { count: deletableTargets.length }),
                    description: publishedTargets.length
                        ? t('{count} bài viết đã xuất bản được giữ lại lịch sử.', {
                              count: publishedTargets.length,
                          })
                        : undefined,
                });

                setSelected((prev) =>
                    prev.filter((id) => !deletableTargets.some((post) => post.id === id))
                );
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: t('Xóa bài viết thất bại'),
                    description: error.message,
                });
            }
        }
        if (action === 'cancel') {
            const targets = eligible(['scheduled']);
            if (!targets.length) {
                toast({ variant: 'destructive', title: t('Only scheduled posts can be cancelled') });
                return;
            }
            if (desktop) {
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
        await load(true);
        loadStatusCounts();
    };

    const handleTabChange = (statusKey) => {
        setFilters((prev) => ({ ...prev, status: statusKey }));
        const next = new URLSearchParams(searchParams);
        if (statusKey === 'all') next.delete('status');
        else next.set('status', statusKey);
        setSearchParams(next);
        setSelected([]);
    };

    const hasActiveFilters =
        Boolean(search.trim()) ||
        Boolean(filters.search?.trim()) ||
        (filters.status && filters.status !== 'all') ||
        (filters.platform && filters.platform !== 'all') ||
        (filters.account_id && filters.account_id !== 'all') ||
        (filters.campaign_id && filters.campaign_id !== 'all') ||
        (filters.pillar_id && filters.pillar_id !== 'all') ||
        (filters.angle_id && filters.angle_id !== 'all');

    const handleResetFilters = () => {
        setSearch('');
        setFilters({
            search: '',
            status: 'all',
            platform: 'all',
            account_id: 'all',
            campaign_id: 'all',
            pillar_id: 'all',
            angle_id: 'all',
        });
        const next = new URLSearchParams(searchParams);
        next.delete('status');
        next.delete('campaign_id');
        setSearchParams(next);
        setSelected([]);
    };

    const filteredAngles = useMemo(
        () => angles.filter((a) => filters.pillar_id === 'all' || a.pillar_id === filters.pillar_id),
        [angles, filters.pillar_id]
    );

    const brandsById = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);
    const pillarsById = useMemo(() => new Map(pillars.map((p) => [p.id, p])), [pillars]);
    const anglesById = useMemo(() => new Map(angles.map((a) => [a.id, a])), [angles]);
    const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

    const allVisibleSelected = posts.length > 0 && posts.every((p) => selected.includes(p.id));

    if (loadError) return <LoadError message={loadError} onRetry={() => window.location.reload()} />;

    const tabs = [
        { key: 'all', label: t('Tất cả'), count: statusCounts.all, dot: null, barColor: '' },
        ...(statusCounts.needs_approval > 0 || filters.status === 'needs_approval'
            ? [
                  {
                      key: 'needs_approval',
                      label: t('Chờ duyệt'),
                      count: statusCounts.needs_approval || 0,
                      dot: 'bg-amber-500',
                      barColor: 'bg-amber-400',
                  },
              ]
            : []),
        { key: 'published', label: t('Đã xuất bản'), count: statusCounts.published, dot: 'bg-emerald-500', barColor: 'bg-emerald-500' },
        { key: 'scheduled', label: t('Đã lên lịch'), count: statusCounts.scheduled, dot: 'bg-brand-dark', barColor: 'bg-brand' },
        { key: 'draft', label: t('Bản nháp'), count: statusCounts.draft, dot: 'bg-zinc-800', barColor: 'bg-zinc-800' },
        ...(statusCounts.failed > 0 || filters.status === 'failed'
            ? [
                  {
                      key: 'failed',
                      label: t('Lỗi / Đã hủy'),
                      count: statusCounts.failed,
                      dot: 'bg-rose-500',
                      barColor: 'bg-rose-400',
                  },
              ]
            : []),
    ];

    const pipelineTotal = Math.max(1, statusCounts.all);
    const pipelineSegments = [
        { key: 'published', label: t('Đã xuất bản'), count: statusCounts.published, color: 'bg-emerald-500' },
        { key: 'scheduled', label: t('Đã lên lịch'), count: statusCounts.scheduled, color: 'bg-brand' },
        { key: 'draft', label: t('Bản nháp'), count: statusCounts.draft, color: 'bg-zinc-800' },
        { key: 'failed', label: t('Lỗi / Đã hủy'), count: statusCounts.failed, color: 'bg-rose-400' },
    ].filter((s) => s.count > 0);

    return (
        <div className="w-full space-y-5">
            {/* Đầu trang Clean Studio */}
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-dark bg-brand text-brand-ink">
                        <Article size={20} weight="duotone" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="truncate font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                {t('Tất cả bài viết')}
                            </h1>
                            <span className="inline-flex shrink-0 items-center rounded-full border border-brand-dark/30 bg-brand-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand-ink">
                                {statusCounts.all} {t('bài')}
                            </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {t(
                                desktop
                                    ? 'Kho nội dung và lịch xuất bản cục bộ theo chiến lược.'
                                    : 'Điều phối toàn bộ kho nội dung đa kênh, theo dõi tiến độ xuất bản và lọc theo chiến lược.'
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {!desktop && (
                        <button
                            type="button"
                            onClick={() => setImportOpen(true)}
                            className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-zinc-100"
                        >
                            <UploadSimple size={15} weight="bold" />
                            <span>{t('Nhập Excel / CSV')}</span>
                        </button>
                    )}
                    <Link to="/create" className="btn-skew min-h-9 shrink-0 whitespace-nowrap">
                        <Plus size={15} weight="bold" />
                        <span>{t('Tạo bài viết')}</span>
                    </Link>
                </div>
            </header>

            {/* BỘ ĐIỀU KHIỂN KHO NỘI DUNG & PIPELINE BAR (Thay thế 4 card KPI trùng lặp) */}
            <section className="panel space-y-3.5 p-4 sm:p-5">
                {/* Pipeline Bar + Chế độ hiển thị */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-foreground">
                                {t('Cơ cấu kho nội dung')} ·{' '}
                                <span className="tabular-nums text-muted-foreground">
                                    {statusCounts.all} {t('bài viết')}
                                </span>
                            </span>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand-ink hover:underline"
                                >
                                    <ArrowCounterClockwise size={13} />
                                    <span>{t('Đặt lại bộ lọc')}</span>
                                </button>
                            )}
                        </div>

                        {/* Thanh tỉ lệ phân bổ trạng thái (Segmented Pipeline Bar) */}
                        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
                            {pipelineSegments.map((seg) => (
                                <div
                                    key={seg.key}
                                    title={`${seg.label}: ${seg.count}`}
                                    style={{ width: `${Math.max(4, (seg.count / pipelineTotal) * 100)}%` }}
                                    className={`h-full transition-opacity ${seg.color} ${
                                        filters.status !== 'all' && filters.status !== seg.key ? 'opacity-35' : ''
                                    }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Chuyển chế độ Danh sách / Thẻ lưới */}
                    <div className="flex shrink-0 items-center self-start rounded-xl border border-border bg-zinc-100 p-0.5 sm:self-center">
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            aria-label={t('Xem dạng danh sách')}
                            className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition-colors ${
                                viewMode === 'list'
                                    ? 'bg-brand font-semibold text-brand-ink'
                                    : 'text-zinc-600 hover:text-foreground'
                            }`}
                        >
                            <ListBullets size={15} weight="bold" />
                            <span>{t('Danh sách')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            aria-label={t('Xem dạng lưới')}
                            className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition-colors ${
                                viewMode === 'grid'
                                    ? 'bg-brand font-semibold text-brand-ink'
                                    : 'text-zinc-600 hover:text-foreground'
                            }`}
                        >
                            <SquaresFour size={15} weight="bold" />
                            <span>{t('Thẻ lưới')}</span>
                        </button>
                    </div>
                </div>

                {/* Chip lọc trạng thái + Ô tìm kiếm */}
                <div className="flex flex-col gap-3 border-t border-border pt-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {tabs.map((tab) => {
                            const isActive = filters.status === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => handleTabChange(tab.key)}
                                    className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors ${
                                        isActive
                                            ? 'border-brand-dark bg-brand font-semibold text-brand-ink'
                                            : 'border-border bg-card text-foreground hover:bg-zinc-100'
                                    }`}
                                >
                                    {tab.dot && (
                                        <span
                                            className={`h-2 w-2 rounded-full ${
                                                isActive ? 'bg-brand-ink' : tab.dot
                                            }`}
                                        />
                                    )}
                                    <span>{tab.label}</span>
                                    <span
                                        className={`tabular-nums text-xs ${
                                            isActive ? 'font-bold text-brand-ink' : 'text-muted-foreground'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative min-w-0 sm:w-72 xl:ml-auto">
                        <MagnifyingGlass
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="text"
                            aria-label={t('Tìm kiếm bài viết')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('Tìm tiêu đề, nội dung…')}
                            className="h-9 w-full rounded-xl border border-border bg-zinc-50/70 pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-brand-dark focus:bg-card focus:outline-none"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                aria-label={t('Xóa từ khóa')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Hàng lọc chi tiết */}
                <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 sm:grid-cols-3 lg:grid-cols-5">
                    <select
                        aria-label={t('Lọc theo nền tảng')}
                        value={filters.platform}
                        onChange={(e) => setFilters((prev) => ({ ...prev, platform: e.target.value }))}
                        className="h-9 w-full cursor-pointer rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:border-brand-dark focus:outline-none"
                    >
                        <option value="all">{t('Tất cả nền tảng')}</option>
                        {PLATFORMS.map((p) => (
                            <option key={p.value} value={p.value}>
                                {p.short || p.label || p.value}
                            </option>
                        ))}
                    </select>

                    <select
                        aria-label={t('Lọc theo kênh')}
                        value={filters.account_id}
                        onChange={(e) => setFilters((prev) => ({ ...prev, account_id: e.target.value }))}
                        className="h-9 w-full cursor-pointer rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:border-brand-dark focus:outline-none"
                    >
                        <option value="all">{t('Tất cả kênh')}</option>
                        {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                                {acc.name}
                            </option>
                        ))}
                    </select>

                    <select
                        aria-label={t('Lọc theo chiến dịch')}
                        value={filters.campaign_id}
                        onChange={(e) => setFilters((prev) => ({ ...prev, campaign_id: e.target.value }))}
                        className="h-9 w-full cursor-pointer rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:border-brand-dark focus:outline-none"
                    >
                        <option value="all">{t('Tất cả chiến dịch')}</option>
                        {campaigns.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    <select
                        aria-label={t('Lọc theo trụ cột')}
                        value={filters.pillar_id}
                        onChange={(e) =>
                            setFilters((prev) => ({
                                ...prev,
                                pillar_id: e.target.value,
                                angle_id: 'all',
                            }))
                        }
                        className="h-9 w-full cursor-pointer rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:border-brand-dark focus:outline-none"
                    >
                        <option value="all">{t('Tất cả trụ cột')}</option>
                        {pillars.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>

                    <select
                        aria-label={t('Lọc theo góc khai thác')}
                        value={filters.angle_id}
                        onChange={(e) => setFilters((prev) => ({ ...prev, angle_id: e.target.value }))}
                        className="col-span-2 h-9 w-full cursor-pointer rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:border-brand-dark focus:outline-none sm:col-span-1"
                    >
                        <option value="all">{t('Tất cả góc nội dung')}</option>
                        {filteredAngles.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name}
                            </option>
                        ))}
                    </select>
                </div>
            </section>

            {/* Thanh thao tác hàng loạt */}
            {selected.length > 0 && (
                <div className="panel flex flex-wrap items-center gap-2 border-brand-dark/50 bg-brand-50/70 px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-brand-ink">
                        <span>{selected.length}</span>
                        <span>{t('đã chọn')}</span>
                    </span>

                    {!desktop && (
                        <button
                            type="button"
                            disabled={
                                scope.is_demo ||
                                selected.length > 50 ||
                                eligible(['draft']).length !== selected.length
                            }
                            title={t('Chọn từ 1 đến 50 bản nháp')}
                            onClick={() => setScheduleOpen(true)}
                            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <CalendarBlank size={14} weight="bold" />
                            <span>{t('Lên lịch nháp đã chọn')}</span>
                        </button>
                    )}

                    <button
                        type="button"
                        disabled={!eligible(['scheduled']).length}
                        onClick={() => setBulkAction('cancel')}
                        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Prohibit size={14} weight="bold" />
                        <span>{t('Hủy lịch')}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setBulkAction('delete')}
                        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                    >
                        <Trash size={14} weight="bold" />
                        <span>{t('Xóa đã chọn')}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelected([])}
                        className="ml-auto inline-flex min-h-9 cursor-pointer items-center whitespace-nowrap rounded-xl px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                        {t('Bỏ chọn')}
                    </button>
                </div>
            )}

            {/* Nội dung chính: Loading / Empty / Editorial List or Grid */}
            {loading ? (
                <Skeleton className="h-[420px] rounded-2xl" />
            ) : !posts.length ? (
                <EmptyState
                    icon={NotePencil}
                    title={t('Không tìm thấy bài viết phù hợp')}
                    description={t(
                        desktop
                            ? 'Thử thay đổi bộ lọc hoặc tạo bản nháp mới trong lịch nội dung.'
                            : 'Thay đổi bộ lọc phía trên hoặc bắt đầu tạo bài viết mới.'
                    )}
                >
                    <Link to="/create" className="btn-skew min-h-9 whitespace-nowrap">
                        <Plus size={15} weight="bold" />
                        <span>{t('Tạo bài viết')}</span>
                    </Link>
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
                        /* DANH SÁCH EDITORIAL MỚI — Gọn, thoáng, đầy đủ thông tin mà không cuộn ngang */
                        <section className="panel overflow-hidden">
                            {/* Header chọn tất cả */}
                            <div className="flex items-center justify-between gap-3 border-b border-border bg-zinc-50/70 px-4 py-2.5">
                                <label className="inline-flex min-h-8 cursor-pointer items-center gap-2.5 text-xs font-semibold text-foreground select-none">
                                    <input
                                        aria-label={t('Chọn tất cả bài viết')}
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={(e) =>
                                            setSelected(e.target.checked ? posts.map((p) => p.id) : [])
                                        }
                                        className="h-4 w-4 cursor-pointer rounded border-border accent-zinc-900"
                                    />
                                    <span>
                                        {allVisibleSelected
                                            ? t('Bỏ chọn tất cả')
                                            : t('Chọn tất cả ({n})', { n: posts.length })}
                                    </span>
                                </label>
                                <span className="text-xs text-muted-foreground">
                                    {t('Sắp xếp: Mới nhất theo lịch đăng')}
                                </span>
                            </div>

                            {/* Danh sách từng bài viết */}
                            <div className="divide-y divide-border">
                                {posts.map((post) => {
                                    const brand = brandsById.get(post.brand_id);
                                    const pillar = pillarsById.get(post.pillar_id);
                                    const angle = anglesById.get(post.angle_id);
                                    const postAccounts = (post.account_ids || [])
                                        .map((id) => accountsById.get(id))
                                        .filter(Boolean);
                                    const isSelected = selected.includes(post.id);

                                    const firstMediaId = post.media_ids?.[0];
                                    const firstMedia = firstMediaId ? mediaMap[firstMediaId] : null;
                                    const isVideo = firstMedia?.file_type === 'video';
                                    const scheduleLabel = post.scheduled_at
                                        ? formatDateTime(post.scheduled_at, post.timezone || timezone)
                                        : t('Chưa đặt lịch');

                                    const openThisPost = () => {
                                        setOpenPost(post);
                                        const next = new URLSearchParams(searchParams);
                                        next.set('post', post.id);
                                        setSearchParams(next);
                                    };

                                    return (
                                        <article
                                            key={post.id}
                                            className={`flex flex-col gap-3 px-4 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                                                isSelected ? 'bg-brand-50/50' : 'hover:bg-zinc-50/80'
                                            }`}
                                        >
                                            {/* Trái: Checkbox + Thumbnail + Nội dung */}
                                            <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                                                <label className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-zinc-100">
                                                    <input
                                                        aria-label={t('Chọn {title}', { title: post.title })}
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) =>
                                                            setSelected(
                                                                e.target.checked
                                                                    ? [...selected, post.id]
                                                                    : selected.filter((id) => id !== post.id)
                                                            )
                                                        }
                                                        className="h-4 w-4 cursor-pointer rounded border-border accent-zinc-900"
                                                    />
                                                </label>

                                                <button
                                                    type="button"
                                                    onClick={openThisPost}
                                                    className="relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-border bg-zinc-100"
                                                >
                                                    {firstMedia ? (
                                                        isVideo ? (
                                                            <>
                                                                <video
                                                                    src={firstMedia.file_url}
                                                                    className="h-full w-full object-cover"
                                                                    preload="metadata"
                                                                />
                                                                <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                                                                    <Play size={16} weight="fill" />
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <img
                                                                src={firstMedia.file_url}
                                                                alt={post.title || 'media'}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        )
                                                    ) : (
                                                        <NotePencil
                                                            size={20}
                                                            weight="duotone"
                                                            className="text-muted-foreground"
                                                        />
                                                    )}
                                                </button>

                                                <div className="min-w-0 flex-1 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span
                                                            onClick={openThisPost}
                                                            className="min-w-0 cursor-pointer break-words font-heading text-sm font-semibold leading-snug text-foreground hover:underline"
                                                        >
                                                            {post.title || t('Bài viết chưa đặt tiêu đề')}
                                                        </span>
                                                        <StatusBadge status={post.status || 'draft'} />
                                                        {brand && (
                                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                                                <span
                                                                    className="h-2 w-2 rounded-full"
                                                                    style={{
                                                                        backgroundColor: brand.color || '#ffd631',
                                                                    }}
                                                                />
                                                                <span>{brand.name}</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    {post.caption && (
                                                        <p className="line-clamp-1 text-xs text-muted-foreground">
                                                            {post.caption}
                                                        </p>
                                                    )}

                                                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-muted-foreground">
                                                        <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                                            <Clock size={13} />
                                                            <span>{scheduleLabel}</span>
                                                        </span>

                                                        {(pillar || angle) && (
                                                            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                                                                {pillar?.name}
                                                                {pillar && angle ? ' · ' : ''}
                                                                {angle?.name}
                                                            </span>
                                                        )}

                                                        {postAccounts.length > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                {postAccounts.slice(0, 4).map((acc) => {
                                                                    const cfg = PLATFORM_CONFIG[acc.platform];
                                                                    const Icon = cfg?.icon;
                                                                    const avatar = getAccountAvatarUrl(acc);
                                                                    return (
                                                                        <span
                                                                            key={acc.id}
                                                                            title={`${acc.name} (${acc.platform})`}
                                                                            className="inline-flex h-6 items-center gap-1 rounded-full border border-border bg-card px-2 text-xs font-medium text-foreground"
                                                                        >
                                                                            {avatar ? (
                                                                                <img
                                                                                    src={avatar}
                                                                                    alt={acc.name}
                                                                                    className="h-4 w-4 rounded-full object-cover"
                                                                                />
                                                                            ) : Icon ? (
                                                                                <Icon
                                                                                    size={12}
                                                                                    className={cfg.color}
                                                                                />
                                                                            ) : null}
                                                                            <span className="max-w-[90px] truncate">
                                                                                {acc.name}
                                                                            </span>
                                                                        </span>
                                                                    );
                                                                })}
                                                                {postAccounts.length > 4 && (
                                                                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                                                                        +{postAccounts.length - 4}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Phải: Nút hành động nhanh */}
                                            <div className="flex shrink-0 items-center justify-end gap-1.5 pl-11 sm:pl-0">
                                                <button
                                                    type="button"
                                                    onClick={openThisPost}
                                                    title={t('Xem chi tiết')}
                                                    className="inline-flex min-h-8 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-zinc-100"
                                                >
                                                    <Eye size={14} weight="bold" />
                                                    <span>{t('Xem')}</span>
                                                </button>
                                                <Link
                                                    to={`/create?edit=${post.id}`}
                                                    title={t('Chỉnh sửa bài viết')}
                                                    className="inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-zinc-100"
                                                >
                                                    <PencilSimple size={14} weight="bold" />
                                                    <span>{t('Sửa')}</span>
                                                </Link>
                                                <Link
                                                    to={`/create?duplicate=${post.id}`}
                                                    title={t('Nhân bản bài viết')}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-foreground"
                                                >
                                                    <CopySimple size={14} weight="bold" />
                                                </Link>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Phân trang / Tải thêm */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="text-xs text-muted-foreground">
                            {t('Đang hiển thị')} <strong className="text-foreground">{posts.length}</strong>{' '}
                            {t('bài viết')}
                            {filters.status !== 'all'
                                ? ` · ${POST_STATUS_LABEL[filters.status] || filters.status}`
                                : ''}
                        </span>
                        {hasMore && (
                            <button
                                type="button"
                                disabled={loadingMore}
                                onClick={loadMore}
                                className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground transition-colors hover:bg-zinc-100 disabled:opacity-50"
                            >
                                <ArrowDown size={14} weight="bold" />
                                <span>{loadingMore ? t('Đang tải…') : t('Tải thêm bài viết')}</span>
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* Ngăn chi tiết bài viết */}
            {openPost && (
                <PostDetailSheet
                    key={openPost.id}
                    post={openPost}
                    onClose={closeDetail}
                    onChanged={() => {
                        load();
                        loadStatusCounts();
                    }}
                />
            )}

            {/* Hộp thoại Import Excel / CSV */}
            {importOpen && (
                <BulkUploadDialog
                    key={`${scope.is_demo}:${scope.brand_id || 'all'}`}
                    brands={brands}
                    accounts={accounts}
                    pillars={pillars}
                    angles={angles}
                    scope={scope}
                    timezone={timezone}
                    onClose={() => setImportOpen(false)}
                    onImported={(count) => {
                        setImportOpen(false);
                        setSearch('');
                        setFilters({
                            search: '',
                            status: 'draft',
                            campaign_id: 'all',
                            pillar_id: 'all',
                            angle_id: 'all',
                            account_id: 'all',
                            platform: 'all',
                        });
                        toast({ title: `${t('Đã nhập bản nháp')}: ${count}` });
                        loadStatusCounts();
                    }}
                />
            )}

            {/* Hộp thoại Lên lịch hàng loạt */}
            {scheduleOpen && (
                <BulkScheduleDialog
                    posts={eligible(['draft'])}
                    timezone={timezone}
                    onClose={() => setScheduleOpen(false)}
                    onScheduled={() => {
                        setScheduleOpen(false);
                        toast({ title: t('Đã xác nhận lên lịch tự động hàng loạt!') });
                        load();
                        loadStatusCounts();
                    }}
                />
            )}

            {/* Hộp thoại xác nhận Xóa / Hủy lịch hàng loạt */}
            {(() => {
                const hasScheduledInSelection = posts.some(
                    (p) => selected.includes(p.id) && p.status === 'scheduled'
                );
                return (
                    <ConfirmDialog
                        open={!!bulkAction}
                        onOpenChange={(value) => !value && setBulkAction(null)}
                        title={
                            bulkAction === 'delete'
                                ? hasScheduledInSelection
                                    ? t('Hủy lịch và xóa các bài viết đã chọn?')
                                    : t('Xóa các bài viết đã chọn?')
                                : t('Hủy lịch các bài viết đã chọn?')
                        }
                        description={
                            bulkAction === 'delete'
                                ? hasScheduledInSelection
                                    ? t(
                                          'Các bài viết đã lên lịch sẽ tự động được hủy lịch đăng và xóa vĩnh viễn cùng với các bài nháp đã chọn. Thao tác này không thể hoàn tác.'
                                      )
                                    : t(
                                          'Các bài viết đã chọn (nháp, đã lên lịch, đã hủy, lỗi) sẽ bị xóa vĩnh viễn. Bài viết đã xuất bản được giữ lại.'
                                      )
                                : t(
                                      desktop
                                          ? 'Các lịch đăng cục bộ đã chọn sẽ bị hủy. Bản nháp và các bài khác được giữ lại.'
                                          : 'Các tác vụ xuất bản đang chờ sẽ bị hủy và bài viết chuyển sang trạng thái Đã hủy. Lịch sử đã xuất bản được giữ lại.'
                                  )
                        }
                        confirmLabel={
                            bulkAction === 'delete'
                                ? hasScheduledInSelection
                                    ? t('Hủy lịch & Xóa')
                                    : t('Xóa bài viết')
                                : t('Hủy lịch')
                        }
                        destructive={bulkAction === 'delete'}
                        onConfirm={() => runBulk(bulkAction)}
                    />
                );
            })()}
        </div>
    );
}
