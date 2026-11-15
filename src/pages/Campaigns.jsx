import LoadError from '@/components/common/load-error';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Plus,
    Target,
    PencilSimple,
    Archive,
    ArrowCounterClockwise,
    Trash,
    CalendarBlank,
    Tag,
    PencilLine,
    Stack,
    Article,
    CheckCircle,
    Copy,
    Check,
    CursorClick,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import CampaignForm from '@/components/strategy/CampaignForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

const STATUS_COLORS = {
    active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    draft: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    completed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    archived: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',
};

export default function Campaigns() {
    const { t } = useTranslation();
    const { scope, brands, selectedBrandId, demoMode } = useWorkspace();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [campaigns, setCampaigns] = useState([]);
    const [pillars, setPillars] = useState([]);
    const [posts, setPosts] = useState([]);
    const [shortlinks, setShortlinks] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [copiedUtm, setCopiedUtm] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [campaignPage, pillarPage, postPage, linksRes] = await Promise.all([
                appClient.entities.Campaign.filter(scope, { sort: '-created_at', limit: 200 }).catch((err) => {
                    console.warn('Could not load campaigns:', err);
                    return { items: [] };
                }),
                appClient.entities.ContentPillar.filter(scope, { limit: 300 }).catch(() => ({ items: [] })),
                appClient.entities.Post.filter(scope, { limit: 500, fields: ['id', 'campaign_id', 'status'] }).catch(() => ({ items: [] })),
                appClient.links?.list
                    ? appClient.links.list(selectedBrandId && selectedBrandId !== 'all' ? { brand_id: selectedBrandId } : {}).catch(() => ({ links: [] }))
                    : Promise.resolve({ links: [] }),
            ]);
            setCampaigns(campaignPage.items || []);
            setPillars(pillarPage.items || []);
            setPosts(postPage.items || []);
            setShortlinks(linksRes?.links || []);
        } catch (error) {
            setLoadError(error.message);
        } finally {
            setLoading(false);
        }
    }, [scope, selectedBrandId]);

    useEffect(() => {
        load();
    }, [load]);

    const handleSave = async (values) => {
        try {
            if (editing) {
                await appClient.entities.Campaign.update(editing.id, values);
                toast({ title: t('Đã cập nhật chiến dịch') });
            } else {
                await appClient.entities.Campaign.create({ ...values, is_demo: demoMode });
                toast({ title: t('Đã tạo chiến dịch mới') });
            }
            setFormOpen(false);
            setEditing(null);
            load();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('Không thể lưu chiến dịch'),
                description: t(error.message),
            });
        }
    };

    const toggleStatus = async (campaign) => {
        try {
            const newStatus = campaign.status === 'archived' ? 'active' : 'archived';
            await appClient.entities.Campaign.update(campaign.id, { status: newStatus });
            toast({
                title: newStatus === 'archived' ? t('Đã lưu trữ chiến dịch') : t('Đã kích hoạt lại chiến dịch'),
            });
            load();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('Thao tác thất bại'),
                description: t(error.message),
            });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await appClient.entities.Campaign.delete(deleteTarget.id);
            toast({ title: t('Đã xoá chiến dịch') });
            setDeleteTarget(null);
            load();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('Không thể xoá chiến dịch'),
                description: t(error.message),
            });
        }
    };

    const copyUtm = (utm) => {
        if (!utm) return;
        navigator.clipboard.writeText(utm);
        setCopiedUtm(utm);
        toast({ title: t('Đã sao chép mã UTM') });
        setTimeout(() => setCopiedUtm(null), 2000);
    };

    // Filtered campaigns
    const filteredCampaigns = useMemo(() => {
        return campaigns.filter((c) => {
            if (statusFilter !== 'all' && c.status !== statusFilter) return false;
            if (search.trim()) {
                const query = search.toLowerCase();
                const matchName = c.name?.toLowerCase().includes(query);
                const matchUtm = c.utm_campaign?.toLowerCase().includes(query);
                const matchDesc = c.description?.toLowerCase().includes(query);
                if (!matchName && !matchUtm && !matchDesc) return false;
            }
            return true;
        });
    }, [campaigns, statusFilter, search]);

    // Active counts
    const activeCount = campaigns.filter((c) => c.status === 'active').length;
    const completedCount = campaigns.filter((c) => c.status === 'completed').length;
    const draftCount = campaigns.filter((c) => c.status === 'draft').length;
    const archivedCount = campaigns.filter((c) => c.status === 'archived').length;

    // Posts & Pillars & Shortlink Clicks mapping
    const campaignStats = useMemo(() => {
        const stats = {};
        for (const c of campaigns) {
            const relatedPosts = posts.filter((p) => p.campaign_id === c.id);
            const relatedPillars = pillars.filter((p) => p.campaign_id === c.id);
            const utm = (c.utm_campaign || '').toLowerCase();
            const relatedLinks = shortlinks.filter((l) => {
                const linkCamp = (l.campaign || '').toLowerCase();
                return linkCamp && (linkCamp === utm || linkCamp === c.name.toLowerCase());
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

    const totalCampaignClicks = useMemo(() => {
        return Object.values(campaignStats).reduce((sum, s) => sum + (s.clickCount || 0), 0);
    }, [campaignStats]);

    if (loadError) return <LoadError message={loadError} onRetry={load} />;

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('Chiến dịch nội dung')}
                description={t('Quản lý chiến dịch tiếp thị đa kênh, gắn kết mục tiêu doanh số với trụ cột nội dung và mã UTM tracking.')}
                actions={
                    <button
                        type="button"
                        className="btn-skew flex items-center gap-2"
                        onClick={() => {
                            setEditing(null);
                            setFormOpen(true);
                        }}
                    >
                        <Plus size={16} weight="bold" />
                        <span>{t('Tạo chiến dịch mới')}</span>
                    </button>
                }
            />

            {/* Overview Bento Strip */}
            <div className="p-4 sm:p-5 bg-card border border-border rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/20 text-brand-ink border border-brand-dark/30 shrink-0">
                            <Target size={20} weight="duotone" />
                        </span>
                        <div>
                            <h3 className="text-sm font-bold text-foreground">
                                {t('Tổng quan chiến dịch & Mục tiêu')}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {activeCount} {t('chiến dịch đang chạy')} · {posts.filter((p) => p.campaign_id).length} {t('bài viết đã gắn chiến dịch')}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-mono text-xs font-semibold">
                            {activeCount} {t('Đang chạy')}
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 font-mono text-xs font-semibold">
                            {draftCount} {t('Dự thảo')}
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 font-mono text-xs font-semibold">
                            {completedCount} {t('Hoàn thành')}
                        </span>
                        <Link
                            to="/shortlinks"
                            className="px-3 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-600 font-mono text-xs font-semibold hover:bg-sky-500/15 transition flex items-center gap-1.5"
                            title={t('Xem chi tiết tại trang Rút gọn liên kết')}
                        >
                            <CursorClick size={13} weight="bold" />
                            <span>{totalCampaignClicks} {t('Clicks UTM')}</span>
                        </Link>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { key: 'all', label: t('Tất cả'), count: campaigns.length },
                            { key: 'active', label: t('Đang chạy'), count: activeCount },
                            { key: 'draft', label: t('Dự thảo'), count: draftCount },
                            { key: 'completed', label: t('Hoàn thành'), count: completedCount },
                            { key: 'archived', label: t('Lưu trữ'), count: archivedCount },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setStatusFilter(tab.key)}
                                className={`h-8 px-3 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                                    statusFilter === tab.key
                                        ? 'bg-brand text-brand-ink font-semibold border border-brand-dark'
                                        : 'bg-surface/60 text-muted-foreground border border-border hover:text-foreground hover:bg-surface'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className="text-[10px] opacity-75">({tab.count})</span>
                            </button>
                        ))}
                    </div>

                    <div className="w-full sm:w-64">
                        <Input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('Tìm chiến dịch hoặc mã UTM…')}
                            className="h-8 text-xs bg-surface/40"
                        />
                    </div>
                </div>
            </div>

            {/* Campaign Grid / Empty State */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Skeleton className="h-[220px] rounded-2xl" />
                    <Skeleton className="h-[220px] rounded-2xl" />
                    <Skeleton className="h-[220px] rounded-2xl" />
                </div>
            ) : filteredCampaigns.length === 0 ? (
                <EmptyState
                    icon={Target}
                    title={campaigns.length === 0 ? t('Chưa có chiến dịch nào') : t('Không tìm thấy chiến dịch phù hợp')}
                    description={
                        campaigns.length === 0
                            ? t('Tạo chiến dịch tiếp thị để phân bổ bài viết theo từng đợt khuyến mãi, sự kiện ra mắt hoặc mục tiêu kinh doanh cụ thể.')
                            : t('Thử thay đổi bộ lọc trạng thái hoặc từ khoá tìm kiếm.')
                    }
                >
                    {campaigns.length === 0 && (
                        <button
                            type="button"
                            className="btn-skew inline-flex items-center gap-2"
                            onClick={() => {
                                setEditing(null);
                                setFormOpen(true);
                            }}
                        >
                            <Plus size={16} weight="bold" />
                            <span>{t('Tạo chiến dịch đầu tiên')}</span>
                        </button>
                    )}
                </EmptyState>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCampaigns.map((campaign) => {
                        const stats = campaignStats[campaign.id] || { postCount: 0, pillarCount: 0 };
                        const brand = brands.find((b) => b.id === campaign.brand_id);
                        const isArchived = campaign.status === 'archived';

                        return (
                            <div
                                key={campaign.id}
                                className={`group flex flex-col justify-between rounded-2xl border p-5 transition bg-card hover:border-brand-dark/50 hover:shadow-xs ${
                                    isArchived ? 'opacity-65 border-border/60 bg-surface/30' : 'border-border'
                                }`}
                            >
                                <div className="space-y-3.5">
                                    {/* Card Header: Color Tag + Name + Status */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span
                                                className="size-3.5 rounded-full shrink-0 border border-black/20"
                                                style={{ backgroundColor: campaign.color || '#ffd631' }}
                                                title={t('Màu nhận diện')}
                                            />
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-bold text-foreground truncate group-hover:text-brand-ink transition">
                                                    {campaign.name}
                                                </h4>
                                                {brand && (
                                                    <span className="text-[11px] text-muted-foreground truncate block">
                                                        {brand.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border shrink-0 ${
                                                STATUS_COLORS[campaign.status] || STATUS_COLORS.active
                                            }`}
                                        >
                                            {t(campaign.status)}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    {campaign.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                            {campaign.description}
                                        </p>
                                    )}

                                    {/* Metadata Strip: Date & UTM */}
                                    <div className="space-y-1.5 pt-1">
                                        {/* Date range */}
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <CalendarBlank size={14} className="shrink-0 text-muted-foreground" />
                                            <span>
                                                {campaign.start_date || campaign.end_date
                                                    ? `${campaign.start_date || '...'} → ${campaign.end_date || '...'}`
                                                    : t('Không giới hạn thời gian')}
                                            </span>
                                        </div>

                                        {/* UTM Code */}
                                        {campaign.utm_campaign && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="inline-flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11px] font-mono text-foreground">
                                                    <Tag size={12} className="text-brand-dark" />
                                                    <span>utm: {campaign.utm_campaign}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyUtm(campaign.utm_campaign)}
                                                        className="ml-1 text-muted-foreground hover:text-foreground cursor-pointer"
                                                        title={t('Sao chép mã UTM')}
                                                    >
                                                        {copiedUtm === campaign.utm_campaign ? (
                                                            <Check size={12} className="text-emerald-600" />
                                                        ) : (
                                                            <Copy size={12} />
                                                        )}
                                                    </button>
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats Badge Strip */}
                                    <div className="flex items-center gap-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Article size={14} className="text-brand-dark" />
                                            <span className="font-semibold text-foreground">{stats.postCount}</span>
                                            <span>{t('bài viết')}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Stack size={14} className="text-brand-dark" />
                                            <span className="font-semibold text-foreground">{stats.pillarCount}</span>
                                            <span>{t('trụ cột')}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <CursorClick size={14} className="text-brand-dark" />
                                            <span className="font-semibold text-foreground">{stats.clickCount}</span>
                                            <span>{t('clicks')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Actions */}
                                <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-border/60">
                                    <Link
                                        to={`/create?campaign_id=${campaign.id}&brand_id=${campaign.brand_id}`}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-ink hover:underline cursor-pointer"
                                    >
                                        <PencilLine size={14} weight="bold" />
                                        <span>{t('Soạn bài viết')}</span>
                                    </Link>

                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditing(campaign);
                                                setFormOpen(true);
                                            }}
                                            className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground cursor-pointer"
                                            title={t('Chỉnh sửa')}
                                        >
                                            <PencilSimple size={14} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => toggleStatus(campaign)}
                                            className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground cursor-pointer"
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
                                            className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-dangerFg/10 hover:text-dangerFg cursor-pointer"
                                            title={t('Xoá')}
                                        >
                                            <Trash size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Campaign Form Dialog */}
            <CampaignForm
                open={formOpen}
                onOpenChange={setFormOpen}
                initial={editing}
                brands={brands}
                defaultBrandId={selectedBrandId === 'all' ? brands[0]?.id : selectedBrandId}
                onSubmit={handleSave}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title={t('Xoá chiến dịch?')}
                description={t(
                    'Bạn có chắc chắn muốn xoá chiến dịch này? Lưu ý: Nếu chiến dịch đã có bài viết hoặc trụ cột liên kết, hệ thống sẽ yêu cầu gỡ bỏ hoặc lưu trữ thay vì xoá vĩnh viễn.'
                )}
                confirmLabel={t('Xác nhận xoá')}
                onConfirm={handleDelete}
            />
        </div>
    );
}
