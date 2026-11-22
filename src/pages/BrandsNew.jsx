import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Archive,
    ArrowCounterClockwise,
    ArrowRight,
    Article,
    Check,
    Compass,
    FloppyDisk,
    Globe,
    MagnifyingGlass,
    Megaphone,
    PencilSimple,
    Plus,
    Rows,
    ShareNetwork,
    SquaresFour,
    Stack,
    Tag,
    Trash,
    X,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import LoadError from '@/components/common/load-error';
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import { requireNoTemplateReferences } from '@/lib/post-templates';
import { DEFAULT_TIMEZONE, TIMEZONES } from '@/lib/constants';
import { formatNumber } from '@/lib/format';

const BRAND_SWATCHES = [
    '#ffd631',
    '#2563EB',
    '#0F766E',
    '#16A34A',
    '#EA580C',
    '#E11D48',
    '#7C3AED',
    '#0284C7',
    '#4F46E5',
    '#3F3F46',
];

function getInitials(name) {
    const clean = (name || '').trim();
    if (!clean) return 'BR';
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
}

function getContrastInk(hex) {
    if (!hex || !hex.startsWith('#') || hex.length < 7) return '#ffffff';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.65 ? '#2b2100' : '#ffffff';
}

export default function BrandsNew() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { demoMode, reload, selectedBrandId, setSelectedBrandId } = useWorkspace();
    const { toast } = useToast();

    const [brands, setBrands] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [counts, setCounts] = useState({ posts: {}, accounts: {}, pillars: {}, campaigns: {} });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    // Filters & view
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'archived'
    const [viewMode, setViewMode] = useState('rows'); // 'rows' | 'grid'

    // Drawer & delete dialog
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [form, setForm] = useState({
        name: '',
        description: '',
        color: '#ffd631',
        timezone: DEFAULT_TIMEZONE,
        status: 'active',
    });

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [postAgg, accountAgg, brandPage, accountsPage, pillarPage, campaignPage] =
                await Promise.all([
                    appClient.entities.Post.aggregate({
                        query: { is_demo: demoMode },
                        groupBy: 'brand_id',
                    }),
                    appClient.entities.SocialAccount.aggregate({
                        query: { is_demo: demoMode },
                        groupBy: 'brand_id',
                    }),
                    appClient.entities.Brand.filter({ is_demo: demoMode }, { sort: 'name', limit: 1000 }),
                    appClient.entities.SocialAccount.filter({ is_demo: demoMode }, { limit: 500 }),
                    appClient.entities.ContentPillar.filter(
                        { is_demo: demoMode },
                        { limit: 500, fields: ['id', 'brand_id', 'status'] }
                    ).catch(() => ({ items: [] })),
                    appClient.entities.Campaign.filter(
                        { is_demo: demoMode },
                        { limit: 500, fields: ['id', 'brand_id', 'status'] }
                    ).catch(() => ({ items: [] })),
                ]);

            const pillarCounts = {};
            (pillarPage.items || []).forEach((p) => {
                if (p.brand_id && p.status !== 'archived') {
                    pillarCounts[p.brand_id] = (pillarCounts[p.brand_id] || 0) + 1;
                }
            });

            const campaignCounts = {};
            (campaignPage.items || []).forEach((c) => {
                if (c.brand_id && c.status !== 'archived') {
                    campaignCounts[c.brand_id] = (campaignCounts[c.brand_id] || 0) + 1;
                }
            });

            setCounts({
                posts: Object.fromEntries((postAgg.rows || []).map((r) => [r.brand_id, r.count])),
                accounts: Object.fromEntries((accountAgg.rows || []).map((r) => [r.brand_id, r.count])),
                pillars: pillarCounts,
                campaigns: campaignCounts,
            });
            setBrands(brandPage.items || []);
            setAccounts(accountsPage.items || []);
        } catch (error) {
            setLoadError(error.message);
        } finally {
            setLoading(false);
        }
    }, [demoMode]);

    useEffect(() => {
        load();
    }, [load]);

    const accountsByBrand = useMemo(() => {
        const map = {};
        accounts.forEach((acc) => {
            if (!acc.brand_id) return;
            if (!map[acc.brand_id]) map[acc.brand_id] = [];
            map[acc.brand_id].push(acc);
        });
        return map;
    }, [accounts]);

    const summary = useMemo(() => {
        const active = brands.filter((b) => b.status !== 'archived').length;
        const archived = brands.filter((b) => b.status === 'archived').length;
        const totalPosts = Object.values(counts.posts).reduce((sum, v) => sum + v, 0);
        return {
            total: brands.length,
            active,
            archived,
            totalAccounts: accounts.length,
            totalPosts,
        };
    }, [brands, accounts, counts.posts]);

    const filteredBrands = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return brands.filter((b) => {
            if (statusFilter === 'active' && b.status === 'archived') return false;
            if (statusFilter === 'archived' && b.status !== 'archived') return false;
            if (q) {
                const hay = `${b.name || ''} ${b.description || ''} ${b.timezone || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [brands, statusFilter, searchQuery]);

    const openCreateDrawer = () => {
        setEditing(null);
        setForm({
            name: '',
            description: '',
            color: BRAND_SWATCHES[brands.length % BRAND_SWATCHES.length],
            timezone: DEFAULT_TIMEZONE,
            status: 'active',
        });
        setDrawerOpen(true);
    };

    const openEditDrawer = (brand) => {
        setEditing(brand);
        setForm({
            name: brand.name || '',
            description: brand.description || '',
            color: brand.color || '#ffd631',
            timezone: brand.timezone || DEFAULT_TIMEZONE,
            status: brand.status || 'active',
        });
        setDrawerOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                description: form.description.trim(),
                color: form.color || '#ffd631',
                timezone: form.timezone || DEFAULT_TIMEZONE,
                status: form.status || 'active',
            };
            if (editing) {
                await appClient.entities.Brand.update(editing.id, payload);
                toast({ title: t('Brand updated') });
            } else {
                await appClient.entities.Brand.create({ ...payload, is_demo: demoMode });
                toast({ title: t('Brand created') });
            }
            setDrawerOpen(false);
            setEditing(null);
            await reload();
            await load();
        } catch (error) {
            toast({
                title: t('Unable to update brand'),
                description: t(error.message),
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const toggleBrandStatus = async (brand) => {
        try {
            const nextStatus = brand.status === 'archived' ? 'active' : 'archived';
            await appClient.entities.Brand.update(brand.id, { status: nextStatus });
            toast({
                title: nextStatus === 'archived' ? t('Brand archived') : t('Brand restored'),
            });
            if (editing?.id === brand.id) {
                setEditing({ ...brand, status: nextStatus });
                setForm((prev) => ({ ...prev, status: nextStatus }));
            }
            await reload();
            await load();
        } catch (error) {
            toast({
                title: t('Unable to update brand'),
                description: t(error.message),
                variant: 'destructive',
            });
        }
    };

    const removeBrand = async () => {
        if (!deleteTarget) return;
        try {
            await requireNoTemplateReferences(
                appClient.entities.PostTemplate,
                'brand_id',
                deleteTarget,
                t
            );
            await appClient.entities.Brand.delete(deleteTarget.id);
            toast({ title: t('Brand deleted') });
            if (selectedBrandId === deleteTarget.id) {
                setSelectedBrandId('all');
            }
            if (editing?.id === deleteTarget.id) {
                setDrawerOpen(false);
                setEditing(null);
            }
            setDeleteTarget(null);
            await reload();
            await load();
        } catch (error) {
            toast({
                title: t('Unable to update brand'),
                description: t(error.message),
                variant: 'destructive',
            });
        }
    };

    const jumpToBrandRoute = (brandId, path) => {
        setSelectedBrandId(brandId);
        navigate(path);
    };

    const hasFilters = searchQuery.trim() !== '' || statusFilter !== 'all';

    if (loadError) return <LoadError message={loadError} onRetry={load} />;

    return (
        <div className="space-y-6 pb-14 max-w-[1440px] mx-auto">
            {/* Compact Editorial Header with Inline Metrics */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-zinc-200/80">
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="font-heading text-[26px] font-medium tracking-tight text-zinc-900">
                            {t('Quản lý thương hiệu')}
                        </h1>
                        {!loading ? (
                            <div className="flex flex-wrap items-center gap-2 text-[12px] text-zinc-500">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white border border-zinc-200/90 text-zinc-700 font-medium tabular-nums">
                                    {formatNumber(summary.active)} {t('đang hoạt động')}
                                </span>
                                <span className="text-zinc-300">·</span>
                                <span className="tabular-nums">
                                    {formatNumber(summary.totalAccounts)} {t('kênh MXH')}
                                </span>
                                <span className="text-zinc-300">·</span>
                                <span className="tabular-nums">
                                    {formatNumber(summary.totalPosts)} {t('bài viết')}
                                </span>
                                <span className="text-zinc-300">·</span>
                                <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[11px] font-medium">
                                    {demoMode ? t('Demo') : t('Live')}
                                </span>
                            </div>
                        ) : null}
                    </div>
                    <p className="text-[13.5px] text-zinc-500 max-w-2xl leading-relaxed">
                        {t(
                            'Quản lý nhận diện, múi giờ, kênh mạng xã hội và không gian làm việc riêng cho từng thương hiệu.'
                        )}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-lg border-zinc-200 bg-white text-zinc-700"
                        asChild
                    >
                        <Link to="/accounts">
                            <ShareNetwork size={15} weight="duotone" className="mr-1.5 text-zinc-500" />
                            {t('Kênh kết nối')}
                        </Link>
                    </Button>

                    <button type="button" onClick={openCreateDrawer} className="btn-skew">
                        <Plus size={16} weight="duotone" />
                        <span>{t('New brand')}</span>
                    </button>
                </div>
            </header>

            {/* Single-Row Command Bar */}
            <section className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlass
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                    />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('Tìm thương hiệu theo tên, mô tả hoặc múi giờ...')}
                        aria-label={t('Tìm thương hiệu theo tên, mô tả hoặc múi giờ...')}
                        className="w-full h-9 pl-9 pr-8 rounded-lg border border-zinc-200 bg-zinc-50/60 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216] transition"
                    />
                    {searchQuery ? (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            aria-label={t('Xóa tìm kiếm')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {selectedBrandId && selectedBrandId !== 'all' ? (
                        <button
                            type="button"
                            onClick={() => setSelectedBrandId('all')}
                            className="h-8 px-2.5 rounded-lg border border-[#d8b216] bg-[#ffd631]/20 text-[#2b2100] text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-[#ffd631]/30 transition-colors cursor-pointer"
                        >
                            <span>{t('Đang lọc 1 thương hiệu')}</span>
                            <X size={12} weight="bold" />
                        </button>
                    ) : null}

                    {/* Status filter */}
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/70">
                        {[
                            { id: 'all', label: t('Tất cả'), count: summary.total },
                            { id: 'active', label: t('Hoạt động'), count: summary.active },
                            { id: 'archived', label: t('Lưu trữ'), count: summary.archived },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setStatusFilter(tab.id)}
                                className={`h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                    statusFilter === tab.id
                                        ? 'bg-white text-zinc-900 shadow-2xs'
                                        : 'text-zinc-500 hover:text-zinc-900'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* View mode switcher */}
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/70">
                        <button
                            type="button"
                            onClick={() => setViewMode('rows')}
                            className={`h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                viewMode === 'rows'
                                    ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                    : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                        >
                            <Rows size={14} weight={viewMode === 'rows' ? 'duotone' : 'regular'} />
                            <span>{t('Hồ sơ')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                viewMode === 'grid'
                                    ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                    : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                        >
                            <SquaresFour size={14} weight={viewMode === 'grid' ? 'duotone' : 'regular'} />
                            <span>{t('Lưới')}</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* Main Brand Portfolio */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-[112px] rounded-2xl" />
                    ))}
                </div>
            ) : filteredBrands.length === 0 ? (
                <EmptyState
                    icon={Tag}
                    title={
                        hasFilters
                            ? t('Không tìm thấy thương hiệu phù hợp')
                            : t('Chưa có thương hiệu nào')
                    }
                    description={
                        hasFilters
                            ? t('Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc trạng thái.')
                            : t(
                                  'Tạo thương hiệu đầu tiên để bắt đầu kết nối tài khoản mạng xã hội và xây dựng chiến lược nội dung.'
                              )
                    }
                >
                    {hasFilters ? (
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('all');
                            }}
                        >
                            {t('Xóa bộ lọc')}
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={openCreateDrawer}>
                            <Plus size={15} weight="duotone" className="mr-1.5" />
                            {t('New brand')}
                        </Button>
                    )}
                </EmptyState>
            ) : viewMode === 'rows' ? (
                /* ================================================================= */
                /* PORTFOLIO ROWS (Default — spacious, structured, zero nested boxes)*/
                /* ================================================================= */
                <div className="space-y-3">
                    {filteredBrands.map((brand) => {
                        const isSelected = selectedBrandId === brand.id;
                        const brandAccounts = accountsByBrand[brand.id] || [];
                        const postCount = counts.posts[brand.id] || 0;
                        const accountCount = counts.accounts[brand.id] || 0;
                        const pillarCount = counts.pillars[brand.id] || 0;
                        const campaignCount = counts.campaigns[brand.id] || 0;
                        const isArchived = brand.status === 'archived';
                        const isBlocking = postCount > 0 || accountCount > 0;
                        const brandColor = brand.color || '#ffd631';
                        const inkColor = getContrastInk(brandColor);

                        return (
                            <article
                                key={brand.id}
                                onClick={() => openEditDrawer(brand)}
                                className={`group bg-white rounded-2xl border transition-colors cursor-pointer overflow-hidden ${
                                    isSelected
                                        ? 'border-[#d8b216] bg-[#ffd631]/[0.04]'
                                        : 'border-zinc-200/80 hover:border-zinc-300'
                                } ${isArchived ? 'opacity-70' : ''}`}
                            >
                                <div className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                                    {/* Left: Identity Block */}
                                    <div className="flex items-start gap-4 min-w-0 xl:w-[38%]">
                                        <div
                                            className="h-12 w-12 rounded-xl shrink-0 flex items-center justify-center font-heading text-[15px] font-semibold border border-black/10"
                                            style={{ backgroundColor: brandColor, color: inkColor }}
                                        >
                                            {getInitials(brand.name)}
                                        </div>

                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="font-heading text-[16px] font-medium text-zinc-900 truncate">
                                                    {brand.name}
                                                </h2>
                                                {isSelected ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ffd631]/35 border border-[#d8b216] text-[#2b2100] text-[11px] font-semibold">
                                                        <Check size={11} weight="bold" />
                                                        <span>{t('Đang chọn')}</span>
                                                    </span>
                                                ) : null}
                                                {isArchived ? (
                                                    <span className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-500 text-[11px] font-medium">
                                                        {t('Lưu trữ')}
                                                    </span>
                                                ) : null}
                                            </div>

                                            <p className="text-[12.5px] text-zinc-500 line-clamp-1 break-words">
                                                {brand.description || t('Chưa có mô tả thương hiệu')}
                                            </p>

                                            <div className="flex items-center gap-1.5 text-[11.5px] text-zinc-400">
                                                <Globe size={13} className="shrink-0" />
                                                <span className="truncate">
                                                    {brand.timezone || DEFAULT_TIMEZONE}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle: Connected Channels + Readiness Metrics */}
                                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-5 xl:flex-1 xl:justify-center">
                                        {/* Channels */}
                                        <div className="min-w-[160px] space-y-1.5">
                                            <span className="text-[11px] font-medium text-zinc-400 block">
                                                {t('Kênh kết nối')} ({accountCount})
                                            </span>
                                            {brandAccounts.length > 0 ? (
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {brandAccounts.slice(0, 5).map((acc) => {
                                                        const conf = PLATFORM_CONFIG[acc.platform];
                                                        const IconComp = conf?.icon;
                                                        return (
                                                            <span
                                                                key={acc.id}
                                                                title={`${acc.name} (${acc.platform})`}
                                                                className={`inline-flex items-center justify-center h-7 w-7 rounded-lg border text-[11px] ${
                                                                    conf?.bg || 'bg-zinc-50'
                                                                } ${conf?.border || 'border-zinc-200'} ${
                                                                    conf?.color || 'text-zinc-700'
                                                                }`}
                                                            >
                                                                {IconComp ? (
                                                                    <IconComp size={14} weight="bold" />
                                                                ) : (
                                                                    acc.platform.slice(0, 2)
                                                                )}
                                                            </span>
                                                        );
                                                    })}
                                                    {brandAccounts.length > 5 ? (
                                                        <span className="text-[11px] font-mono text-zinc-500 pl-0.5">
                                                            +{brandAccounts.length - 5}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        jumpToBrandRoute(brand.id, '/accounts');
                                                    }}
                                                    className="text-[12px] text-amber-700 hover:text-amber-900 font-medium inline-flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Plus size={12} weight="bold" />
                                                    <span>{t('Kết nối kênh')}</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Compact Metric Triad */}
                                        <div className="flex items-center gap-6 pl-0 sm:pl-5 sm:border-l border-zinc-100 shrink-0">
                                            <div className="space-y-0.5 whitespace-nowrap">
                                                <span className="text-[11px] text-zinc-400 block">
                                                    {t('Bài viết')}
                                                </span>
                                                <span className="text-[15px] font-medium text-zinc-900 tabular-nums">
                                                    {formatNumber(postCount)}
                                                </span>
                                            </div>
                                            <div className="space-y-0.5 whitespace-nowrap">
                                                <span className="text-[11px] text-zinc-400 block">
                                                    {t('Trụ cột')}
                                                </span>
                                                <span className="text-[15px] font-medium text-zinc-900 tabular-nums">
                                                    {formatNumber(pillarCount)}
                                                </span>
                                            </div>
                                            <div className="space-y-0.5 whitespace-nowrap">
                                                <span className="text-[11px] text-zinc-400 block">
                                                    {t('Chiến dịch')}
                                                </span>
                                                <span className="text-[15px] font-medium text-zinc-900 tabular-nums">
                                                    {formatNumber(campaignCount)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Workspace Action + Quick Controls */}
                                    <div
                                        className="flex flex-wrap items-center justify-between xl:justify-end gap-2 pt-3 xl:pt-0 border-t xl:border-t-0 border-zinc-100 shrink-0"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center gap-2">
                                            {!isSelected && !isArchived ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedBrandId(brand.id)}
                                                    className="h-8 px-3 rounded-lg border border-zinc-200 bg-white hover:border-[#d8b216] hover:bg-[#ffd631]/20 text-[12px] font-medium text-zinc-800 hover:text-[#2b2100] transition-colors cursor-pointer"
                                                >
                                                    {t('Chọn không gian')}
                                                </button>
                                            ) : null}

                                            {!isArchived ? (
                                                <button
                                                    type="button"
                                                    onClick={() => jumpToBrandRoute(brand.id, '/strategy')}
                                                    className="h-8 px-3 rounded-lg border border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100 text-[12px] font-medium text-zinc-700 inline-flex items-center gap-1 transition-colors cursor-pointer"
                                                >
                                                    <span>{t('Chiến lược')}</span>
                                                    <ArrowRight size={12} />
                                                </button>
                                            ) : null}
                                        </div>

                                        <div className="flex items-center gap-0.5">
                                            <button
                                                type="button"
                                                onClick={() => openEditDrawer(brand)}
                                                title={t('Edit brand')}
                                                aria-label={t('Edit brand')}
                                                className="h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-flex items-center justify-center transition-colors cursor-pointer"
                                            >
                                                <PencilSimple size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toggleBrandStatus(brand)}
                                                title={isArchived ? t('Restore') : t('Archive')}
                                                aria-label={isArchived ? t('Restore') : t('Archive')}
                                                className="h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-flex items-center justify-center transition-colors cursor-pointer"
                                            >
                                                {isArchived ? (
                                                    <ArrowCounterClockwise size={15} />
                                                ) : (
                                                    <Archive size={15} />
                                                )}
                                            </button>
                                            {!isBlocking ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(brand)}
                                                    title={t('Delete brand')}
                                                    aria-label={t('Delete brand')}
                                                    className="h-8 w-8 rounded-lg text-zinc-400 hover:text-dangerFg hover:bg-dangerBg/60 inline-flex items-center justify-center transition-colors cursor-pointer"
                                                >
                                                    <Trash size={15} />
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                /* ================================================================= */
                /* SHOWCASE GRID (2-3 columns with top brand accent line)            */
                /* ================================================================= */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredBrands.map((brand) => {
                        const isSelected = selectedBrandId === brand.id;
                        const brandAccounts = accountsByBrand[brand.id] || [];
                        const postCount = counts.posts[brand.id] || 0;
                        const accountCount = counts.accounts[brand.id] || 0;
                        const pillarCount = counts.pillars[brand.id] || 0;
                        const isArchived = brand.status === 'archived';
                        const brandColor = brand.color || '#ffd631';
                        const inkColor = getContrastInk(brandColor);

                        return (
                            <article
                                key={brand.id}
                                onClick={() => openEditDrawer(brand)}
                                className={`bg-white rounded-2xl border overflow-hidden flex flex-col justify-between transition-colors cursor-pointer ${
                                    isSelected
                                        ? 'border-[#d8b216]'
                                        : 'border-zinc-200/80 hover:border-zinc-300'
                                } ${isArchived ? 'opacity-70' : ''}`}
                            >
                                <div className="h-1.5 w-full" style={{ backgroundColor: brandColor }} />

                                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className="h-10 w-10 rounded-xl shrink-0 flex items-center justify-center font-heading text-[13.5px] font-semibold border border-black/10"
                                                    style={{ backgroundColor: brandColor, color: inkColor }}
                                                >
                                                    {getInitials(brand.name)}
                                                </div>
                                                <div className="min-w-0">
                                                    <h2 className="font-heading text-[15px] font-medium text-zinc-900 truncate">
                                                        {brand.name}
                                                    </h2>
                                                    <div className="flex items-center gap-1 text-[11.5px] text-zinc-400">
                                                        <Globe size={12} className="shrink-0" />
                                                        <span className="truncate">
                                                            {brand.timezone || DEFAULT_TIMEZONE}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {isSelected ? (
                                                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ffd631]/35 border border-[#d8b216] text-[#2b2100] text-[10.5px] font-semibold">
                                                    <Check size={10} weight="bold" />
                                                    {t('Đang chọn')}
                                                </span>
                                            ) : isArchived ? (
                                                <span className="shrink-0 px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-500 text-[10.5px] font-medium">
                                                    {t('Lưu trữ')}
                                                </span>
                                            ) : null}
                                        </div>

                                        <p className="text-[12.5px] text-zinc-500 line-clamp-2 min-h-[38px] leading-relaxed">
                                            {brand.description || t('Chưa có mô tả thương hiệu')}
                                        </p>

                                        {/* Compact horizontal stats strip */}
                                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-100 text-center">
                                            <div>
                                                <div className="text-[15px] font-medium text-zinc-900 tabular-nums">
                                                    {formatNumber(accountCount)}
                                                </div>
                                                <div className="text-[11px] text-zinc-400">{t('Kênh')}</div>
                                            </div>
                                            <div className="border-x border-zinc-100">
                                                <div className="text-[15px] font-medium text-zinc-900 tabular-nums">
                                                    {formatNumber(postCount)}
                                                </div>
                                                <div className="text-[11px] text-zinc-400">{t('Bài viết')}</div>
                                            </div>
                                            <div>
                                                <div className="text-[15px] font-medium text-zinc-900 tabular-nums">
                                                    {formatNumber(pillarCount)}
                                                </div>
                                                <div className="text-[11px] text-zinc-400">{t('Trụ cột')}</div>
                                            </div>
                                        </div>

                                        {brandAccounts.length > 0 ? (
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {brandAccounts.slice(0, 6).map((acc) => {
                                                    const conf = PLATFORM_CONFIG[acc.platform];
                                                    const IconComp = conf?.icon;
                                                    return (
                                                        <span
                                                            key={acc.id}
                                                            title={`${acc.name} (${acc.platform})`}
                                                            className={`inline-flex items-center justify-center h-6 w-6 rounded-md border text-[10px] ${
                                                                conf?.bg || 'bg-zinc-50'
                                                            } ${conf?.border || 'border-zinc-200'} ${
                                                                conf?.color || 'text-zinc-700'
                                                            }`}
                                                        >
                                                            {IconComp ? <IconComp size={12} weight="bold" /> : acc.platform}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div
                                        className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {!isSelected && !isArchived ? (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedBrandId(brand.id)}
                                                className="h-8 px-3 rounded-lg border border-zinc-200 bg-white hover:border-[#d8b216] hover:bg-[#ffd631]/20 text-[12px] font-medium text-zinc-800 cursor-pointer transition-colors"
                                            >
                                                {t('Chọn không gian')}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => jumpToBrandRoute(brand.id, '/strategy')}
                                                className="text-[12px] font-medium text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1 cursor-pointer"
                                            >
                                                <span>{t('Mở chiến lược')}</span>
                                                <ArrowRight size={12} />
                                            </button>
                                        )}

                                        <div className="flex items-center gap-0.5">
                                            <button
                                                type="button"
                                                onClick={() => openEditDrawer(brand)}
                                                aria-label={t('Edit brand')}
                                                className="h-7 w-7 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-flex items-center justify-center cursor-pointer"
                                            >
                                                <PencilSimple size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toggleBrandStatus(brand)}
                                                aria-label={isArchived ? t('Restore') : t('Archive')}
                                                className="h-7 w-7 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-flex items-center justify-center cursor-pointer"
                                            >
                                                {isArchived ? (
                                                    <ArrowCounterClockwise size={14} />
                                                ) : (
                                                    <Archive size={14} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Right-Side Slide-Over Drawer for Create / Edit Brand */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent side="right" className="w-full sm:max-w-[500px] p-0 flex flex-col bg-white">
                    <div className="px-6 py-5 border-b border-zinc-200/80">
                        <h2 className="font-heading text-[18px] font-medium text-zinc-900">
                            {editing ? t('Chỉnh sửa thương hiệu') : t('Tạo thương hiệu mới')}
                        </h2>
                        <p className="text-[12.5px] text-zinc-500 mt-0.5">
                            {editing
                                ? t('Cập nhật nhận diện, mô tả và múi giờ xuất bản của thương hiệu.')
                                : t('Thiết lập không gian riêng để tách biệt kênh MXH, trụ cột và bài viết.')}
                        </p>
                    </div>

                    <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-clean">
                            {/* Live Brand Identity Preview */}
                            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 flex items-center gap-3.5">
                                <div
                                    className="h-12 w-12 rounded-xl shrink-0 flex items-center justify-center font-heading text-[15px] font-semibold border border-black/10 transition-colors"
                                    style={{
                                        backgroundColor: form.color || '#ffd631',
                                        color: getContrastInk(form.color || '#ffd631'),
                                    }}
                                >
                                    {getInitials(form.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-heading text-[15px] font-medium text-zinc-900 truncate">
                                        {form.name.trim() || t('Tên thương hiệu của bạn')}
                                    </div>
                                    <div className="text-[12px] text-zinc-500 truncate mt-0.5">
                                        {form.description.trim() || t('Mô tả ngắn gọn về định vị thương hiệu')}
                                    </div>
                                    <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-1">
                                        <Globe size={11} />
                                        <span>{form.timezone || DEFAULT_TIMEZONE}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick resources when editing */}
                            {editing ? (
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => jumpToBrandRoute(editing.id, '/accounts')}
                                        className="p-2.5 rounded-xl border border-zinc-200/80 bg-white hover:border-zinc-300 text-left transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between text-zinc-400">
                                            <ShareNetwork size={14} />
                                            <ArrowRight size={11} />
                                        </div>
                                        <div className="text-[15px] font-medium text-zinc-900 mt-1 tabular-nums">
                                            {formatNumber(counts.accounts[editing.id] || 0)}
                                        </div>
                                        <div className="text-[11px] text-zinc-500">{t('Kênh MXH')}</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => jumpToBrandRoute(editing.id, '/strategy/pillars')}
                                        className="p-2.5 rounded-xl border border-zinc-200/80 bg-white hover:border-zinc-300 text-left transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between text-zinc-400">
                                            <Stack size={14} />
                                            <ArrowRight size={11} />
                                        </div>
                                        <div className="text-[15px] font-medium text-zinc-900 mt-1 tabular-nums">
                                            {formatNumber(counts.pillars[editing.id] || 0)}
                                        </div>
                                        <div className="text-[11px] text-zinc-500">{t('Trụ cột')}</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => jumpToBrandRoute(editing.id, '/posts')}
                                        className="p-2.5 rounded-xl border border-zinc-200/80 bg-white hover:border-zinc-300 text-left transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between text-zinc-400">
                                            <Article size={14} />
                                            <ArrowRight size={11} />
                                        </div>
                                        <div className="text-[15px] font-medium text-zinc-900 mt-1 tabular-nums">
                                            {formatNumber(counts.posts[editing.id] || 0)}
                                        </div>
                                        <div className="text-[11px] text-zinc-500">{t('Bài viết')}</div>
                                    </button>
                                </div>
                            ) : null}

                            {/* Brand Name */}
                            <div className="space-y-1.5">
                                <label htmlFor="brand-name" className="label-xs block text-zinc-600 font-medium">
                                    {t('Tên thương hiệu')} <span className="text-dangerFg">*</span>
                                </label>
                                <input
                                    id="brand-name"
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder={t('Ví dụ: Socialchoice Studio, Acme Coffee...')}
                                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216]"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label htmlFor="brand-desc" className="label-xs block text-zinc-600 font-medium">
                                    {t('Mô tả thương hiệu')}
                                </label>
                                <textarea
                                    id="brand-desc"
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder={t('Lĩnh vực hoạt động, đối tượng khách hàng hoặc ghi chú ngắn...')}
                                    className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-[13.5px] text-zinc-900 placeholder:text-zinc-400 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216] resize-y"
                                />
                            </div>

                            {/* Brand Color Swatches */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="brand-color" className="label-xs text-zinc-600 font-medium">
                                        {t('Màu nhận diện')}
                                    </label>
                                    <span className="text-[11.5px] font-mono text-zinc-400 uppercase">
                                        {form.color}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {BRAND_SWATCHES.map((swatch) => {
                                        const active = form.color?.toLowerCase() === swatch.toLowerCase();
                                        return (
                                            <button
                                                key={swatch}
                                                type="button"
                                                onClick={() => setForm((prev) => ({ ...prev, color: swatch }))}
                                                aria-label={swatch}
                                                className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-transform cursor-pointer ${
                                                    active
                                                        ? 'scale-110 ring-2 ring-zinc-900/20 border-zinc-900/40'
                                                        : 'border-black/10 hover:scale-105'
                                                }`}
                                                style={{ backgroundColor: swatch }}
                                            >
                                                {active ? (
                                                    <Check
                                                        size={13}
                                                        weight="bold"
                                                        style={{ color: getContrastInk(swatch) }}
                                                    />
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                    <label
                                        htmlFor="brand-color"
                                        title={t('Chọn màu tùy chỉnh')}
                                        className="h-7 px-2 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-[11px] font-medium text-zinc-600 inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <input
                                            id="brand-color"
                                            type="color"
                                            value={form.color || '#ffd631'}
                                            onChange={(e) =>
                                                setForm((prev) => ({ ...prev, color: e.target.value }))
                                            }
                                            className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer"
                                        />
                                        <span>{t('Tùy chỉnh')}</span>
                                    </label>
                                </div>
                            </div>

                            {/* Timezone */}
                            <div className="space-y-1.5">
                                <label htmlFor="brand-tz" className="label-xs block text-zinc-600 font-medium">
                                    {t('Múi giờ xuất bản')} <span className="text-dangerFg">*</span>
                                </label>
                                <select
                                    id="brand-tz"
                                    value={form.timezone}
                                    onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                                    required
                                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13.5px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216]"
                                >
                                    {TIMEZONES.map((tz) => (
                                        <option key={tz} value={tz}>
                                            {tz}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Status when editing */}
                            {editing ? (
                                <div className="space-y-1.5">
                                    <span className="label-xs block text-zinc-600 font-medium">
                                        {t('Trạng thái')}
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { value: 'active', label: t('Hoạt động') },
                                            { value: 'archived', label: t('Lưu trữ') },
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setForm((prev) => ({ ...prev, status: opt.value }))}
                                                className={`h-9 rounded-lg border text-[13px] font-medium transition-colors cursor-pointer ${
                                                    form.status === opt.value
                                                        ? 'bg-[#ffd631]/25 border-[#d8b216] text-[#2b2100]'
                                                        : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Sticky Footer */}
                        <div className="px-6 py-4 border-t border-zinc-200/80 bg-zinc-50/70 flex items-center justify-between gap-3">
                            <div>
                                {editing &&
                                (counts.posts[editing.id] || 0) === 0 &&
                                (counts.accounts[editing.id] || 0) === 0 ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-dangerFg hover:text-dangerFg hover:bg-dangerBg/60"
                                        onClick={() => setDeleteTarget(editing)}
                                    >
                                        <Trash size={14} className="mr-1" />
                                        {t('Xóa')}
                                    </Button>
                                ) : null}
                            </div>

                            <div className="flex items-center gap-2.5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDrawerOpen(false)}
                                    disabled={saving}
                                >
                                    {t('Hủy')}
                                </Button>
                                <button type="submit" disabled={saving} className="btn-skew">
                                    <FloppyDisk size={15} weight="duotone" />
                                    <span>
                                        {saving
                                            ? t('Đang lưu...')
                                            : editing
                                            ? t('Lưu thay đổi')
                                            : t('Tạo thương hiệu')}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title={t('Delete brand')}
                description={t(
                    'Chỉ có thể xóa thương hiệu chưa có tài khoản hoặc bài viết liên kết. Dữ liệu sau khi xóa sẽ không thể khôi phục.'
                )}
                confirmLabel={t('Delete brand')}
                destructive
                onConfirm={removeBrand}
            />
        </div>
    );
}
