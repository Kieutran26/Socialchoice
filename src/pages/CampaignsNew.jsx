import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Archive,
    ArrowCounterClockwise,
    ArrowSquareOut,
    Article,
    CalendarBlank,
    Check,
    Copy,
    CursorClick,
    FloppyDisk,
    ListBullets,
    MagnifyingGlass,
    PencilLine,
    PencilSimple,
    Plus,
    SquaresFour,
    Stack,
    Tag,
    Target,
    Trash,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import LoadError from '@/components/common/load-error';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';

const LOCAL_CAMPAIGNS_KEY = 'socialchoice.campaigns';

const STATUS_META = {
    active: {
        label: 'Đang chạy',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
    },
    draft: {
        label: 'Dự thảo',
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
    },
    completed: {
        label: 'Hoàn thành',
        badge: 'bg-sky-50 text-sky-700 border-sky-200',
        dot: 'bg-sky-500',
    },
    archived: {
        label: 'Lưu trữ',
        badge: 'bg-zinc-100 text-zinc-600 border-zinc-200',
        dot: 'bg-zinc-400',
    },
};

const COLOR_SWATCHES = ['#ffd631', '#2563eb', '#059669', '#e11d48', '#7c3aed', '#d97706', '#0ea5e9', '#18181b'];

function getLocalCampaigns() {
    try {
        const raw = window.localStorage.getItem(LOCAL_CAMPAIGNS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveLocalCampaigns(list) {
    try {
        window.localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(list));
    } catch {
        // ignore storage errors
    }
}

function computeTimelineProgress(startDate, endDate) {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
}

function slugifyUtm(name) {
    return String(name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40);
}

export default function CampaignsNew() {
    const { t } = useTranslation();
    const { scope, brands, selectedBrandId, demoMode } = useWorkspace();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [campaigns, setCampaigns] = useState([]);
    const [pillars, setPillars] = useState([]);
    const [posts, setPosts] = useState([]);
    const [shortlinks, setShortlinks] = useState([]);

    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [copiedUtm, setCopiedUtm] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Drawer form state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        brand_id: '',
        name: '',
        utm_campaign: '',
        start_date: '',
        end_date: '',
        color: '#ffd631',
        status: 'active',
        description: '',
    });

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [campaignPage, pillarPage, postPage, linksRes] = await Promise.all([
                appClient.entities.Campaign.filter(scope, { sort: '-created_at', limit: 200 }).catch(() => ({
                    items: [],
                })),
                appClient.entities.ContentPillar.filter(scope, { limit: 300 }).catch(() => ({ items: [] })),
                appClient.entities.Post.filter(scope, { limit: 500 }).catch(() => ({ items: [] })),
                appClient.links?.list
                    ? appClient.links
                          .list(
                              selectedBrandId && selectedBrandId !== 'all' ? { brand_id: selectedBrandId } : {},
                              { silent: true }
                          )
                          .catch(() => ({ links: [] }))
                    : Promise.resolve({ links: [] }),
            ]);
            let items = campaignPage.items || [];
            if (!items.length) {
                const local = getLocalCampaigns().filter((c) => !scope.brand_id || c.brand_id === scope.brand_id);
                if (local.length) items = local;
            }
            setCampaigns(items);
            setPillars(pillarPage.items || []);
            setPosts(postPage.items || []);
            setShortlinks(linksRes?.links || []);
        } catch (error) {
            const local = getLocalCampaigns().filter((c) => !scope.brand_id || c.brand_id === scope.brand_id);
            setCampaigns(local);
            setLoadError('');
            void error;
        } finally {
            setLoading(false);
        }
    }, [scope, selectedBrandId]);

    useEffect(() => {
        load();
    }, [load]);

    const openCreateDrawer = () => {
        setEditing(null);
        setForm({
            brand_id: selectedBrandId && selectedBrandId !== 'all' ? selectedBrandId : brands[0]?.id || '',
            name: '',
            utm_campaign: '',
            start_date: '',
            end_date: '',
            color: '#ffd631',
            status: 'active',
            description: '',
        });
        setDrawerOpen(true);
    };

    const openEditDrawer = (campaign) => {
        setEditing(campaign);
        setForm({
            brand_id: campaign.brand_id || brands[0]?.id || '',
            name: campaign.name || '',
            utm_campaign: campaign.utm_campaign || '',
            start_date: campaign.start_date ? String(campaign.start_date).slice(0, 10) : '',
            end_date: campaign.end_date ? String(campaign.end_date).slice(0, 10) : '',
            color: campaign.color || '#ffd631',
            status: campaign.status || 'active',
            description: campaign.description || '',
        });
        setDrawerOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const payload = {
                ...form,
                name: form.name.trim(),
                utm_campaign: form.utm_campaign.trim(),
                description: form.description.trim(),
            };
            try {
                if (editing) {
                    await appClient.entities.Campaign.update(editing.id, payload);
                } else {
                    await appClient.entities.Campaign.create({ ...payload, is_demo: demoMode });
                }
            } catch {
                const local = getLocalCampaigns();
                if (editing) {
                    const updated = { ...editing, ...payload, updated_at: new Date().toISOString() };
                    const idx = local.findIndex((c) => c.id === editing.id);
                    if (idx >= 0) local[idx] = updated;
                    else local.unshift(updated);
                } else {
                    local.unshift({
                        id: `camp_${Date.now()}`,
                        ...payload,
                        is_demo: demoMode,
                        created_at: new Date().toISOString(),
                    });
                }
                saveLocalCampaigns(local);
            }
            toast({ title: editing ? t('Đã cập nhật chiến dịch') : t('Đã tạo chiến dịch mới') });
            setDrawerOpen(false);
            setEditing(null);
            await load();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('Không thể lưu chiến dịch'),
                description: t(error.message),
            });
        } finally {
            setSaving(false);
        }
    };

    const toggleArchive = async (campaign) => {
        try {
            const newStatus = campaign.status === 'archived' ? 'active' : 'archived';
            try {
                await appClient.entities.Campaign.update(campaign.id, { status: newStatus });
            } catch {
                const local = getLocalCampaigns();
                const found = local.find((c) => c.id === campaign.id);
                if (found) found.status = newStatus;
                saveLocalCampaigns(local);
            }
            toast({
                title: newStatus === 'archived' ? t('Đã lưu trữ chiến dịch') : t('Đã kích hoạt lại chiến dịch'),
            });
            load();
        } catch (error) {
            toast({ variant: 'destructive', title: t('Thao tác thất bại'), description: t(error.message) });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            try {
                await appClient.entities.Campaign.delete(deleteTarget.id);
            } catch {
                saveLocalCampaigns(getLocalCampaigns().filter((c) => c.id !== deleteTarget.id));
            }
            toast({ title: t('Đã xoá chiến dịch') });
            setDeleteTarget(null);
            load();
        } catch (error) {
            toast({ variant: 'destructive', title: t('Không thể xoá chiến dịch'), description: t(error.message) });
        }
    };

    const copyUtm = (utm) => {
        if (!utm) return;
        navigator.clipboard?.writeText(utm);
        setCopiedUtm(utm);
        toast({ title: t('Đã sao chép mã UTM') });
        setTimeout(() => setCopiedUtm(null), 1800);
    };

    const campaignStats = useMemo(() => {
        const stats = {};
        for (const c of campaigns) {
            const relatedPosts = posts.filter((p) => p.campaign_id === c.id);
            const relatedPillars = pillars.filter((p) => p.campaign_id === c.id);
            const utm = (c.utm_campaign || '').toLowerCase();
            const relatedLinks = shortlinks.filter((l) => {
                const linkCamp = (l.campaign || '').toLowerCase();
                return linkCamp && (linkCamp === utm || linkCamp === (c.name || '').toLowerCase());
            });
            const clicks = relatedLinks.reduce((sum, l) => sum + (l.clicks || 0), 0);
            stats[c.id] = {
                postCount: relatedPosts.length,
                pillarCount: relatedPillars.length,
                clickCount: clicks,
                linkCount: relatedLinks.length,
            };
        }
        return stats;
    }, [campaigns, posts, pillars, shortlinks]);

    const filteredCampaigns = useMemo(() => {
        const q = search.trim().toLowerCase();
        return campaigns.filter((c) => {
            if (statusFilter !== 'all' && c.status !== statusFilter) return false;
            if (q) {
                const hit =
                    c.name?.toLowerCase().includes(q) ||
                    c.utm_campaign?.toLowerCase().includes(q) ||
                    c.description?.toLowerCase().includes(q);
                if (!hit) return false;
            }
            return true;
        });
    }, [campaigns, statusFilter, search]);

    const activeCount = campaigns.filter((c) => c.status === 'active').length;
    const draftCount = campaigns.filter((c) => c.status === 'draft').length;
    const completedCount = campaigns.filter((c) => c.status === 'completed').length;
    const archivedCount = campaigns.filter((c) => c.status === 'archived').length;
    const assignedPostsCount = posts.filter((p) => p.campaign_id).length;
    const totalCampaignClicks = Object.values(campaignStats).reduce((s, item) => s + (item.clickCount || 0), 0);

    if (loadError) return <LoadError message={loadError} onRetry={load} />;

    return (
        <div className="space-y-6">
            {/* 1. CLEAN STUDIO HEADER */}
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-dark bg-brand text-brand-ink">
                        <Target size={22} weight="duotone" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                {t('Chiến dịch nội dung')}
                            </h1>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-xs font-medium text-muted-foreground tabular-nums">
                                <strong className="font-semibold text-foreground">{campaigns.length}</strong>{' '}
                                {t('chiến dịch')}
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                            {t('Tổ chức đợt ra mắt, khuyến mãi theo từng chiến dịch và theo dõi chuyển đổi qua mã UTM.')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        to="/shortlinks"
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-zinc-50"
                    >
                        <CursorClick size={15} weight="bold" className="text-brand-dark" />
                        <span>{t('Rút gọn link UTM')}</span>
                        <ArrowSquareOut size={13} className="text-muted-foreground" />
                    </Link>
                    <button
                        type="button"
                        onClick={openCreateDrawer}
                        className="btn-skew min-h-10 cursor-pointer whitespace-nowrap"
                    >
                        <Plus size={15} weight="bold" />
                        <span>{t('Tạo chiến dịch mới')}</span>
                    </button>
                </div>
            </header>

            {/* 2. UNIFIED 4-KPI EXECUTIVE STRIP */}
            <section className="panel overflow-hidden bg-card">
                <div className="grid grid-cols-2 divide-y divide-border lg:grid-cols-4 lg:divide-x lg:divide-y-0">
                    <div className="p-4 sm:p-5">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span>{t('Đang chạy')}</span>
                        </div>
                        <div className="mt-1 font-heading text-2xl font-bold tabular-nums text-foreground">
                            {activeCount}
                        </div>
                    </div>

                    <div className="p-4 sm:p-5">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            <span>{t('Dự thảo')}</span>
                        </div>
                        <div className="mt-1 font-heading text-2xl font-bold tabular-nums text-foreground">
                            {draftCount}
                        </div>
                    </div>

                    <div className="p-4 sm:p-5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('Bài viết gắn chiến dịch')}
                        </span>
                        <div className="mt-1 font-heading text-2xl font-bold tabular-nums text-foreground">
                            {assignedPostsCount}{' '}
                            <span className="text-sm font-medium text-muted-foreground">{t('bài')}</span>
                        </div>
                    </div>

                    <Link
                        to="/shortlinks"
                        className="block p-4 transition-colors hover:bg-zinc-50/80 sm:p-5"
                    >
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('Tổng Clicks UTM')}
                        </span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="font-heading text-2xl font-bold tabular-nums text-foreground">
                                {totalCampaignClicks}
                            </span>
                            <span className="text-xs font-semibold text-brand-dark">{t('Chi tiết →')}</span>
                        </div>
                    </Link>
                </div>
            </section>

            {/* 3. FILTER, SEARCH & VIEW BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                    {[
                        { key: 'all', label: t('Tất cả'), count: campaigns.length },
                        { key: 'active', label: t('Đang chạy'), count: activeCount },
                        { key: 'draft', label: t('Dự thảo'), count: draftCount },
                        { key: 'completed', label: t('Hoàn thành'), count: completedCount },
                        { key: 'archived', label: t('Lưu trữ'), count: archivedCount },
                    ].map((tab) => {
                        const active = statusFilter === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setStatusFilter(tab.key)}
                                className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors ${
                                    active
                                        ? 'border-brand-dark bg-brand/30 font-semibold text-brand-ink'
                                        : 'border-border bg-card text-muted-foreground hover:bg-zinc-50 hover:text-foreground'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className="font-mono text-[11px] tabular-nums opacity-75">
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-1 items-center justify-end gap-2 sm:flex-initial">
                    <div className="relative w-full sm:w-60">
                        <MagnifyingGlass
                            size={14}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('Tìm chiến dịch, mã UTM…')}
                            className="h-9 w-full rounded-xl border border-border bg-card pl-8 pr-3 text-xs text-foreground focus:border-brand-dark focus:outline-none"
                        />
                    </div>

                    <div className="inline-flex shrink-0 rounded-xl border border-border bg-zinc-50 p-0.5">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-xs font-medium ${
                                viewMode === 'grid'
                                    ? 'bg-card font-semibold text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title={t('Dạng lưới')}
                        >
                            <SquaresFour size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className={`inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-xs font-medium ${
                                viewMode === 'list'
                                    ? 'bg-card font-semibold text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title={t('Dạng danh sách')}
                        >
                            <ListBullets size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 4. CAMPAIGN CONTENT: LOADING / EMPTY / GRID / LIST */}
            {loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-56 rounded-2xl" />
                    <Skeleton className="h-56 rounded-2xl" />
                    <Skeleton className="h-56 rounded-2xl" />
                </div>
            ) : filteredCampaigns.length === 0 ? (
                <EmptyState
                    icon={Target}
                    title={
                        campaigns.length === 0
                            ? t('Chưa có chiến dịch nào')
                            : t('Không tìm thấy chiến dịch phù hợp')
                    }
                    description={
                        campaigns.length === 0
                            ? t('Tạo chiến dịch tiếp thị đầu tiên để gom bài viết theo đợt ra mắt, khuyến mãi và theo dõi mã UTM.')
                            : t('Thử đổi bộ lọc trạng thái hoặc từ khoá tìm kiếm.')
                    }
                >
                    {campaigns.length === 0 && (
                        <button
                            type="button"
                            onClick={openCreateDrawer}
                            className="btn-skew inline-flex cursor-pointer items-center gap-2"
                        >
                            <Plus size={15} weight="bold" />
                            <span>{t('Tạo chiến dịch đầu tiên')}</span>
                        </button>
                    )}
                </EmptyState>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredCampaigns.map((campaign) => {
                        const stats = campaignStats[campaign.id] || {
                            postCount: 0,
                            pillarCount: 0,
                            clickCount: 0,
                        };
                        const brand = brands.find((b) => b.id === campaign.brand_id);
                        const statusInfo = STATUS_META[campaign.status] || STATUS_META.active;
                        const isArchived = campaign.status === 'archived';
                        const progress = computeTimelineProgress(campaign.start_date, campaign.end_date);

                        return (
                            <article
                                key={campaign.id}
                                className={`panel group relative flex flex-col justify-between overflow-hidden bg-card transition-colors hover:border-brand-dark/60 ${
                                    isArchived ? 'opacity-65' : ''
                                }`}
                            >
                                {/* Subtle Top Color Accent Strip */}
                                <div
                                    className="h-1 w-full"
                                    style={{ backgroundColor: campaign.color || '#ffd631' }}
                                />

                                <div className="space-y-4 p-5">
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="truncate font-heading text-base font-bold text-foreground">
                                                {campaign.name}
                                            </h3>
                                            {brand && (
                                                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                                    {brand.name}
                                                </span>
                                            )}
                                        </div>
                                        <span
                                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusInfo.badge}`}
                                        >
                                            <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                                            {t(statusInfo.label)}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    {campaign.description && (
                                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                            {campaign.description}
                                        </p>
                                    )}

                                    {/* Timeline & UTM */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="inline-flex items-center gap-1.5">
                                                <CalendarBlank size={14} />
                                                <span>
                                                    {campaign.start_date || campaign.end_date
                                                        ? `${campaign.start_date || '…'} → ${campaign.end_date || '…'}`
                                                        : t('Không giới hạn ngày')}
                                                </span>
                                            </span>
                                            {progress !== null && (
                                                <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
                                                    {progress}%
                                                </span>
                                            )}
                                        </div>

                                        {progress !== null && (
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                                                <div
                                                    className="h-full rounded-full transition-all duration-300"
                                                    style={{
                                                        width: `${progress}%`,
                                                        backgroundColor: campaign.color || '#ffd631',
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {campaign.utm_campaign && (
                                            <button
                                                type="button"
                                                onClick={() => copyUtm(campaign.utm_campaign)}
                                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-zinc-50 px-2.5 py-1 font-mono text-[11px] text-foreground transition-colors hover:border-brand-dark"
                                                title={t('Bấm để sao chép mã UTM')}
                                            >
                                                <Tag size={12} className="text-brand-dark" />
                                                <span>{campaign.utm_campaign}</span>
                                                {copiedUtm === campaign.utm_campaign ? (
                                                    <Check size={12} className="text-emerald-600" />
                                                ) : (
                                                    <Copy size={12} className="text-muted-foreground" />
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {/* 3-Metric Mini Strip */}
                                    <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-zinc-50/50 py-2 text-center">
                                        <div>
                                            <div className="font-heading text-sm font-bold tabular-nums text-foreground">
                                                {stats.postCount}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">{t('Bài viết')}</div>
                                        </div>
                                        <div>
                                            <div className="font-heading text-sm font-bold tabular-nums text-foreground">
                                                {stats.pillarCount}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">{t('Trụ cột')}</div>
                                        </div>
                                        <div>
                                            <div className="font-heading text-sm font-bold tabular-nums text-foreground">
                                                {stats.clickCount}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">{t('Clicks')}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="flex items-center justify-between border-t border-border bg-zinc-50/40 px-5 py-3">
                                    <Link
                                        to={`/create?campaign_id=${campaign.id}&brand_id=${campaign.brand_id || ''}`}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-ink hover:underline"
                                    >
                                        <PencilLine size={14} weight="bold" />
                                        <span>{t('Soạn bài viết')}</span>
                                    </Link>

                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => openEditDrawer(campaign)}
                                            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-foreground"
                                            title={t('Chỉnh sửa')}
                                        >
                                            <PencilSimple size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => toggleArchive(campaign)}
                                            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-foreground"
                                            title={isArchived ? t('Kích hoạt lại') : t('Lưu trữ')}
                                        >
                                            {isArchived ? (
                                                <ArrowCounterClockwise size={14} />
                                            ) : (
                                                <Archive size={14} />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeleteTarget(campaign)}
                                            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600"
                                            title={t('Xoá')}
                                        >
                                            <Trash size={14} />
                                        </button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                /* EDITORIAL LIST VIEW */
                <div className="panel divide-y divide-border overflow-hidden bg-card">
                    {filteredCampaigns.map((campaign) => {
                        const stats = campaignStats[campaign.id] || {
                            postCount: 0,
                            pillarCount: 0,
                            clickCount: 0,
                        };
                        const statusInfo = STATUS_META[campaign.status] || STATUS_META.active;
                        const isArchived = campaign.status === 'archived';
                        return (
                            <div
                                key={campaign.id}
                                className={`flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-zinc-50/70 ${
                                    isArchived ? 'opacity-65' : ''
                                }`}
                            >
                                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                                    <span
                                        className="h-9 w-1.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: campaign.color || '#ffd631' }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="truncate font-heading text-sm font-bold text-foreground">
                                                {campaign.name}
                                            </h3>
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusInfo.badge}`}
                                            >
                                                {t(statusInfo.label)}
                                            </span>
                                            {campaign.utm_campaign && (
                                                <button
                                                    type="button"
                                                    onClick={() => copyUtm(campaign.utm_campaign)}
                                                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-zinc-50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                                                >
                                                    <span>utm:{campaign.utm_campaign}</span>
                                                    <Copy size={10} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                            <span>
                                                {campaign.start_date || campaign.end_date
                                                    ? `${campaign.start_date || '…'} → ${campaign.end_date || '…'}`
                                                    : t('Không giới hạn ngày')}
                                            </span>
                                            <span>·</span>
                                            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                                                <Article size={12} /> {stats.postCount} {t('bài')}
                                            </span>
                                            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                                                <Stack size={12} /> {stats.pillarCount} {t('trụ cột')}
                                            </span>
                                            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                                                <CursorClick size={12} /> {stats.clickCount} {t('clicks')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-1.5">
                                    <Link
                                        to={`/create?campaign_id=${campaign.id}&brand_id=${campaign.brand_id || ''}`}
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-brand-dark bg-brand/25 px-3 text-xs font-semibold text-brand-ink hover:bg-brand/40"
                                    >
                                        <PencilLine size={13} weight="bold" />
                                        <span>{t('Soạn bài')}</span>
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => openEditDrawer(campaign)}
                                        className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
                                        title={t('Chỉnh sửa')}
                                    >
                                        <PencilSimple size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleArchive(campaign)}
                                        className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
                                        title={isArchived ? t('Kích hoạt lại') : t('Lưu trữ')}
                                    >
                                        {isArchived ? <ArrowCounterClockwise size={14} /> : <Archive size={14} />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeleteTarget(campaign)}
                                        className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                                        title={t('Xoá')}
                                    >
                                        <Trash size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 5. RIGHT-SIDE SLIDE-OVER DRAWER FOR CREATE / EDIT CAMPAIGN */}
            <Sheet open={drawerOpen} onOpenChange={(open) => !saving && setDrawerOpen(open)}>
                <SheetContent className="max-w-lg">
                    <form onSubmit={handleSave} className="flex h-full flex-col">
                        <div className="shrink-0 border-b border-border bg-zinc-50/80 px-5 py-4 pr-12">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-brand-dark bg-brand text-brand-ink">
                                    <Target size={16} weight="bold" />
                                </span>
                                <div>
                                    <h2 className="font-heading text-sm font-bold text-foreground">
                                        {editing ? t('Chỉnh sửa chiến dịch') : t('Tạo chiến dịch mới')}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        {t('Thiết lập thời gian, mã UTM tracking và màu nhận diện.')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <label className="space-y-1.5">
                                    <span className="font-semibold text-foreground">{t('Thương hiệu')}</span>
                                    <select
                                        required
                                        value={form.brand_id}
                                        onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
                                        className="h-10 w-full cursor-pointer rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-brand-dark focus:outline-none"
                                    >
                                        {brands.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="space-y-1.5">
                                    <span className="font-semibold text-foreground">{t('Trạng thái')}</span>
                                    <select
                                        value={form.status}
                                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                                        className="h-10 w-full cursor-pointer rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-brand-dark focus:outline-none"
                                    >
                                        <option value="active">{t('Đang chạy')}</option>
                                        <option value="draft">{t('Dự thảo')}</option>
                                        <option value="completed">{t('Hoàn thành')}</option>
                                        <option value="archived">{t('Lưu trữ')}</option>
                                    </select>
                                </label>
                            </div>

                            <label className="block space-y-1.5">
                                <span className="font-semibold text-foreground">{t('Tên chiến dịch')} *</span>
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder={t('VD: Ra mắt bộ tính năng Quý 4 / Khuyến mãi Tết 2027')}
                                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-brand-dark focus:outline-none"
                                />
                            </label>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-foreground">{t('Mã UTM Campaign')}</span>
                                    {form.name && !form.utm_campaign && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setForm({ ...form, utm_campaign: slugifyUtm(form.name) })
                                            }
                                            className="cursor-pointer text-[11px] font-semibold text-brand-dark hover:underline"
                                        >
                                            {t('Tạo tự động từ tên')}
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={form.utm_campaign}
                                    onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })}
                                    placeholder={t('VD: tet_2027, black_friday')}
                                    className="h-10 w-full rounded-xl border border-border bg-card px-3 font-mono text-xs text-foreground focus:border-brand-dark focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <label className="space-y-1.5">
                                    <span className="font-semibold text-foreground">{t('Ngày bắt đầu')}</span>
                                    <input
                                        type="date"
                                        value={form.start_date}
                                        onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                                        className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-brand-dark focus:outline-none"
                                    />
                                </label>
                                <label className="space-y-1.5">
                                    <span className="font-semibold text-foreground">{t('Ngày kết thúc')}</span>
                                    <input
                                        type="date"
                                        value={form.end_date}
                                        onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                                        className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-brand-dark focus:outline-none"
                                    />
                                </label>
                            </div>

                            <div className="space-y-2">
                                <span className="font-semibold text-foreground">{t('Màu nhận diện')}</span>
                                <div className="flex flex-wrap items-center gap-2">
                                    {COLOR_SWATCHES.map((hex) => {
                                        const selected = form.color?.toLowerCase() === hex.toLowerCase();
                                        return (
                                            <button
                                                key={hex}
                                                type="button"
                                                onClick={() => setForm({ ...form, color: hex })}
                                                className={`h-7 w-7 cursor-pointer rounded-lg border transition-transform ${
                                                    selected
                                                        ? 'scale-110 ring-2 ring-brand-dark ring-offset-2'
                                                        : 'border-black/15 hover:scale-105'
                                                }`}
                                                style={{ backgroundColor: hex }}
                                                aria-label={hex}
                                            />
                                        );
                                    })}
                                    <input
                                        type="color"
                                        value={form.color || '#ffd631'}
                                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                                        className="h-7 w-9 cursor-pointer rounded-lg border border-border bg-card p-0.5"
                                        title={t('Chọn màu tuỳ chỉnh')}
                                    />
                                </div>
                            </div>

                            <label className="block space-y-1.5">
                                <span className="font-semibold text-foreground">{t('Mục tiêu & Ghi chú')}</span>
                                <textarea
                                    rows={4}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder={t('Mục tiêu doanh số, thông điệp chủ đạo, góc khai thác ưu tiên…')}
                                    className="w-full rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-foreground focus:border-brand-dark focus:outline-none"
                                />
                            </label>
                        </div>

                        <div className="flex shrink-0 items-center justify-between border-t border-border bg-zinc-50/80 px-5 py-3.5">
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => setDrawerOpen(false)}
                                className="inline-flex min-h-9 cursor-pointer items-center rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground hover:bg-zinc-100"
                            >
                                {t('Hủy')}
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-skew min-h-9 cursor-pointer disabled:opacity-60"
                            >
                                <FloppyDisk size={14} weight="bold" />
                                <span>
                                    {saving
                                        ? t('Đang lưu…')
                                        : editing
                                          ? t('Lưu thay đổi')
                                          : t('Tạo chiến dịch')}
                                </span>
                            </button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title={t('Xoá chiến dịch?')}
                description={t(
                    'Các bài viết đã gắn với chiến dịch này sẽ không bị xoá, chỉ gỡ liên kết chiến dịch.'
                )}
                confirmLabel={t('Xoá chiến dịch')}
                onConfirm={handleDelete}
            />
        </div>
    );
}
