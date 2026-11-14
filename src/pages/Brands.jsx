import { requireNoTemplateReferences } from '@/lib/post-templates';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Plus,
    PencilSimple,
    Archive,
    ArrowCounterClockwise,
    Trash,
    Tag,
    Globe,
    Check,
    MagnifyingGlass,
    ShareNetwork,
    Article,
    Sparkle,
    Radio,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import BrandForm from '@/components/settings/BrandForm';
import StatCard from '@/components/common/StatCard';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';

export default function Brands() {
    const { t } = useTranslation();
    const { demoMode, reload, selectedBrandId, setSelectedBrandId } = useWorkspace();
    const { toast } = useToast();

    const [brands, setBrands] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [counts, setCounts] = useState({ posts: {}, accounts: {} });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'archived'

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [postAgg, accountAgg, brandPage, accountsPage] = await Promise.all([
                appClient.entities.Post.aggregate({
                    query: { is_demo: demoMode },
                    groupBy: 'brand_id',
                }),
                appClient.entities.SocialAccount.aggregate({
                    query: { is_demo: demoMode },
                    groupBy: 'brand_id',
                }),
                appClient.entities.Brand.filter(
                    { is_demo: demoMode },
                    { sort: 'name', limit: 1000 }
                ),
                appClient.entities.SocialAccount.filter(
                    { is_demo: demoMode },
                    { limit: 500 }
                ),
            ]);

            setCounts({
                posts: Object.fromEntries(postAgg.rows.map((row) => [row.brand_id, row.count])),
                accounts: Object.fromEntries(
                    accountAgg.rows.map((row) => [row.brand_id, row.count])
                ),
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

    const saveBrand = async (values) => {
        try {
            if (editing) {
                await appClient.entities.Brand.update(editing.id, values);
                toast({ title: t('Brand updated') });
            } else {
                await appClient.entities.Brand.create({ ...values, is_demo: demoMode });
                toast({ title: t('Brand created') });
            }
            setFormOpen(false);
            setEditing(null);
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

    const toggleBrand = async (brand) => {
        try {
            const nextStatus = brand.status === 'archived' ? 'active' : 'archived';
            await appClient.entities.Brand.update(brand.id, { status: nextStatus });
            toast({
                title: brand.status === 'archived' ? t('Brand restored') : t('Brand archived'),
            });
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

    // Calculate aggregated metrics
    const activeBrandsCount = useMemo(
        () => brands.filter((b) => b.status !== 'archived').length,
        [brands]
    );
    const totalPostsCount = useMemo(
        () => Object.values(counts.posts).reduce((sum, v) => sum + v, 0),
        [counts.posts]
    );
    const totalAccountsCount = useMemo(
        () => accounts.length,
        [accounts]
    );

    // Group accounts by brand
    const accountsByBrand = useMemo(() => {
        const map = {};
        accounts.forEach((acc) => {
            if (!acc.brand_id) return;
            if (!map[acc.brand_id]) map[acc.brand_id] = [];
            map[acc.brand_id].push(acc);
        });
        return map;
    }, [accounts]);

    // Filter brands
    const filteredBrands = useMemo(() => {
        return brands.filter((b) => {
            if (statusFilter === 'active' && b.status === 'archived') return false;
            if (statusFilter === 'archived' && b.status !== 'archived') return false;
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchName = (b.name || '').toLowerCase().includes(query);
                const matchDesc = (b.description || '').toLowerCase().includes(query);
                return matchName || matchDesc;
            }
            return true;
        });
    }, [brands, statusFilter, searchQuery]);

    if (loadError) {
        return (
            <div role="alert" className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs">
                <p className="mb-3 text-xs text-dangerFg font-medium">{t(loadError)}</p>
                <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3.5 py-2 text-xs font-medium text-background hover:bg-foreground/90 transition-colors shadow-xs"
                    onClick={load}
                >
                    {t('Retry')}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header with Primary Action */}
            <PageHeader
                title={t('Quản lý thương hiệu')}
                description={t(
                    'Tạo, định cấu hình danh tính và quản lý tài nguyên các thương hiệu trong không gian làm việc.'
                )}
                actions={
                    <button
                        type="button"
                        onClick={() => {
                            setEditing(null);
                            setFormOpen(true);
                        }}
                        className="btn-skew shadow-2xs"
                    >
                        <Plus size={16} weight="bold" />
                        <span>{t('New brand')}</span>
                    </button>
                }
            />

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label={t('Tổng thương hiệu')}
                    value={loading ? '—' : brands.length}
                    hint={t('Thương hiệu được phân quyền')}
                    icon={Tag}
                    badge={demoMode ? t('Demo') : t('Live')}
                />
                <StatCard
                    label={t('Thương hiệu hoạt động')}
                    value={loading ? '—' : activeBrandsCount}
                    hint={t('Đang phát sóng & lên lịch')}
                    icon={Sparkle}
                    badge={brands.length ? `${Math.round((activeBrandsCount / brands.length) * 100)}%` : '100%'}
                />
                <StatCard
                    label={t('Kênh mạng xã hội')}
                    value={loading ? '—' : totalAccountsCount}
                    hint={t('Đã kết nối qua các thương hiệu')}
                    icon={ShareNetwork}
                    badge={t('Đa kênh')}
                />
                <StatCard
                    label={t('Tổng bài viết')}
                    value={loading ? '—' : totalPostsCount}
                    hint={t('Toàn bộ nội dung trong không gian')}
                    icon={Article}
                    badge={t('Nội dung')}
                />
            </div>

            {/* Filter and Search Bar */}
            <div className="panel p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-border/80">
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlass
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                    <input
                        type="text"
                        placeholder={t('Tìm kiếm thương hiệu theo tên, mô tả...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 text-xs bg-card border border-border/80 rounded-xl focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground"
                    />
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
                    {[
                        { id: 'all', label: t('Tất cả') },
                        { id: 'active', label: t('Hoạt động') },
                        { id: 'archived', label: t('Đã lưu trữ') },
                    ].map((tab) => {
                        const isCurrent = statusFilter === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setStatusFilter(tab.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                                    isCurrent
                                        ? 'bg-foreground text-background font-semibold shadow-2xs'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Brands Content Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-64 rounded-2xl" />
                    ))}
                </div>
            ) : filteredBrands.length === 0 ? (
                <EmptyState
                    icon={Tag}
                    title={
                        searchQuery || statusFilter !== 'all'
                            ? t('Không tìm thấy thương hiệu phù hợp')
                            : t('Chưa có thương hiệu nào')
                    }
                    description={
                        searchQuery || statusFilter !== 'all'
                            ? t('Thử thay đổi từ khóa tìm kiếm hoặc bỏ bộ lọc trạng thái.')
                            : t('Tạo thương hiệu đầu tiên để bắt đầu kết nối tài khoản mạng xã hội và lên kế hoạch nội dung.')
                    }
                >
                    <button
                        type="button"
                        onClick={() => {
                            if (searchQuery || statusFilter !== 'all') {
                                setSearchQuery('');
                                setStatusFilter('all');
                            } else {
                                setEditing(null);
                                setFormOpen(true);
                            }
                        }}
                        className="btn-skew"
                    >
                        {searchQuery || statusFilter !== 'all' ? (
                            <span>{t('Xóa bộ lọc')}</span>
                        ) : (
                            <>
                                <Plus size={16} weight="bold" />
                                <span>{t('New brand')}</span>
                            </>
                        )}
                    </button>
                </EmptyState>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                    {filteredBrands.map((brand) => {
                        const isSelected = selectedBrandId === brand.id;
                        const brandAccounts = accountsByBrand[brand.id] || [];
                        const postCount = counts.posts[brand.id] || 0;
                        const accountCount = counts.accounts[brand.id] || 0;
                        const isArchived = brand.status === 'archived';
                        const isBlocking = postCount > 0 || accountCount > 0;

                        return (
                            <section
                                key={brand.id}
                                className={`panel p-5 flex flex-col justify-between transition-all rounded-2xl shadow-2xs border ${
                                    isSelected
                                        ? 'border-brand-dark/80 ring-2 ring-primary/20 bg-card'
                                        : 'border-border/80 hover:border-border'
                                }`}
                            >
                                {/* Top Details */}
                                <div>
                                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-heading font-bold text-sm text-white shadow-2xs border border-black/10"
                                                style={{ backgroundColor: brand.color || '#18181b' }}
                                            >
                                                {brand.name ? brand.name.slice(0, 2).toUpperCase() : 'BR'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-heading text-sm font-semibold text-foreground truncate">
                                                        {brand.name}
                                                    </h3>
                                                    {isSelected && (
                                                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-brand/20 border border-brand-dark/40 px-2 py-0.5 text-[10px] font-bold text-brand-ink">
                                                            <Check size={11} weight="bold" />
                                                            <span>{t('Đang chọn')}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate">
                                                    <Globe size={13} className="shrink-0" />
                                                    <span className="truncate">{brand.timezone || 'Asia/Ho_Chi_Minh'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <StatusBadge tone={isArchived ? 'neutral' : 'success'}>
                                            {isArchived ? t('Brand archived') : t('Active brands')}
                                        </StatusBadge>
                                    </div>

                                    {/* Description */}
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-3 min-h-[32px]">
                                        {brand.description || t('No description')}
                                    </p>

                                    {/* Stats & Connected Channels Box */}
                                    <div className="mt-4 p-3 rounded-xl bg-surface/60 border border-border/60 space-y-2.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                <ShareNetwork size={14} className="shrink-0" />
                                                <span>{t('Kênh kết nối')}:</span>
                                            </span>
                                            <span className="font-mono font-semibold text-foreground">
                                                {accountCount}
                                            </span>
                                        </div>

                                        {/* Channel icons */}
                                        {brandAccounts.length > 0 ? (
                                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                                {brandAccounts.map((acc) => {
                                                    const conf = PLATFORM_CONFIG[acc.platform];
                                                    const IconComp = conf?.icon;
                                                    return (
                                                        <span
                                                            key={acc.id}
                                                            title={`${acc.name} (${acc.platform})`}
                                                            className={`inline-flex items-center justify-center rounded-lg p-1 border text-[11px] ${
                                                                conf?.bg || 'bg-muted'
                                                            } ${conf?.border || 'border-border'} ${
                                                                conf?.color || 'text-foreground'
                                                            }`}
                                                        >
                                                            {IconComp ? (
                                                                <IconComp size={13} weight="bold" />
                                                            ) : (
                                                                acc.platform
                                                            )}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-[11px] text-muted-foreground">
                                                <Link
                                                    to="/accounts"
                                                    className="inline-flex items-center gap-1 hover:underline text-foreground/80"
                                                >
                                                    <Plus size={11} weight="bold" />
                                                    <span>{t('Nối tài khoản mạng xã hội')}</span>
                                                </Link>
                                            </div>
                                        )}

                                        <div className="border-t border-border/50 pt-2 flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                <Article size={14} className="shrink-0" />
                                                <span>{t('Bài viết liên kết')}:</span>
                                            </span>
                                            <span className="font-mono font-semibold text-foreground">
                                                {postCount}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                                    <div>
                                        {isSelected ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                                                <Radio size={14} weight="fill" className="text-emerald-600" />
                                                <span>{t('Không gian hiện tại')}</span>
                                            </span>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedBrandId(brand.id)}
                                                className="h-8 rounded-lg text-xs font-medium hover:bg-muted/70"
                                            >
                                                {t('Chọn thương hiệu')}
                                            </Button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setEditing(brand);
                                                setFormOpen(true);
                                            }}
                                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                            title={t('Edit brand')}
                                            aria-label={t('Edit brand')}
                                        >
                                            <PencilSimple size={15} />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleBrand(brand)}
                                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                            title={isArchived ? t('Restore') : t('Archive')}
                                            aria-label={isArchived ? t('Restore') : t('Archive')}
                                        >
                                            {isArchived ? (
                                                <ArrowCounterClockwise size={15} />
                                            ) : (
                                                <Archive size={15} />
                                            )}
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDeleteTarget(brand)}
                                            disabled={isBlocking}
                                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-dangerFg hover:bg-rose-50 disabled:opacity-40"
                                            title={
                                                isBlocking
                                                    ? t('Brands with accounts or posts cannot be deleted — archive instead.')
                                                    : t('Delete brand')
                                            }
                                            aria-label={t('Delete brand')}
                                        >
                                            <Trash size={15} />
                                        </Button>
                                    </div>
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}

            {/* Create / Edit Brand Modal Dialog */}
            <BrandForm
                open={formOpen}
                onOpenChange={setFormOpen}
                initial={editing}
                onSubmit={saveBrand}
            />

            {/* Delete Brand Confirmation Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title={t('Delete brand')}
                description={t(
                    'Chỉ có thể xóa thương hiệu chưa có tài khoản hoặc bài viết liên kết. Dữ liệu sau khi xóa sẽ không thể khôi phục.'
                )}
                confirmLabel={t('Delete brand')}
                onConfirm={removeBrand}
            />
        </div>
    );
}
