import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Archive,
    ArrowCounterClockwise,
    ArrowSquareOut,
    Check,
    FileText,
    FloppyDisk,
    MagnifyingGlass,
    PencilSimple,
    Plus,
    Stack,
    Target,
    Trash,
    TreeStructure,
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
import { requireNoTemplateReferences } from '@/lib/post-templates';
import { percent } from '@/lib/format';

const COLOR_SWATCHES = [
    '#93C5FD',
    '#C4B5FD',
    '#FED7AA',
    '#A7F3D0',
    '#FBCFE8',
    '#FEF08A',
    '#99F6E4',
    '#ffd631',
];

function resolvePillarColor(pillar, index = 0) {
    if (pillar?.color) return pillar.color;
    return COLOR_SWATCHES[index % COLOR_SWATCHES.length];
}

export default function ContentPillarsNew() {
    const { t } = useTranslation();
    const { scope, brands, selectedBrandId, demoMode } = useWorkspace();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [pillars, setPillars] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [angles, setAngles] = useState([]);
    const [counts, setCounts] = useState({});
    const [total, setTotal] = useState(0);

    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'archived'
    const [search, setSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Drawer form state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        brand_id: '',
        campaign_id: '',
        name: '',
        description: '',
        color: '#93C5FD',
        target_percentage: 20,
        status: 'active',
    });

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [pillarPage, anglePage, agg, totalCount, campaignPage] = await Promise.all([
                appClient.entities.ContentPillar.filter(scope, { sort: 'name', limit: 300 }),
                appClient.entities.ContentAngle.filter(scope, { limit: 500, fields: ['id', 'pillar_id'] }),
                appClient.entities.Post.aggregate({ query: scope, groupBy: 'pillar_id' }),
                appClient.entities.Post.count(scope),
                appClient.entities.Campaign.filter(scope, { limit: 100 }).catch(() => ({ items: [] })),
            ]);
            setPillars(pillarPage.items || []);
            setAngles(anglePage.items || []);
            setCounts(Object.fromEntries((agg.rows || []).map((r) => [r.pillar_id, r.count])));
            setTotal(totalCount || 0);
            setCampaigns(campaignPage.items || []);
        } catch (error) {
            setLoadError(error.message);
        } finally {
            setLoading(false);
        }
    }, [scope]);

    useEffect(() => {
        load();
    }, [load]);

    const activePillars = useMemo(() => pillars.filter((p) => p.status !== 'archived'), [pillars]);
    const archivedPillars = useMemo(() => pillars.filter((p) => p.status === 'archived'), [pillars]);
    const targetTotal = useMemo(
        () => activePillars.reduce((sum, p) => sum + (Number(p.target_percentage) || 0), 0),
        [activePillars]
    );

    const balancedCount = useMemo(
        () =>
            activePillars.filter((p) => {
                const actual = percent(counts[p.id] || 0, total);
                return Math.abs(actual - (p.target_percentage || 0)) <= 5;
            }).length,
        [activePillars, counts, total]
    );

    const openCreateDrawer = () => {
        setEditing(null);
        const remaining = Math.max(0, 100 - targetTotal);
        setForm({
            brand_id: selectedBrandId && selectedBrandId !== 'all' ? selectedBrandId : brands[0]?.id || '',
            campaign_id: '',
            name: '',
            description: '',
            color: COLOR_SWATCHES[pillars.length % COLOR_SWATCHES.length],
            target_percentage: remaining > 0 ? Math.min(25, remaining) : 20,
            status: 'active',
        });
        setDrawerOpen(true);
    };

    const openEditDrawer = (pillar, idx = 0) => {
        setEditing(pillar);
        setForm({
            brand_id: pillar.brand_id || brands[0]?.id || '',
            campaign_id: pillar.campaign_id || '',
            name: pillar.name || '',
            description: pillar.description || '',
            color: resolvePillarColor(pillar, idx),
            target_percentage: Number(pillar.target_percentage) || 0,
            status: pillar.status || 'active',
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
                description: form.description.trim(),
                target_percentage: Math.max(0, Math.min(100, Number(form.target_percentage) || 0)),
            };
            if (editing) {
                await appClient.entities.ContentPillar.update(editing.id, payload);
            } else {
                await appClient.entities.ContentPillar.create({ ...payload, is_demo: demoMode });
            }
            toast({ title: editing ? t('Đã cập nhật trụ cột') : t('Đã tạo trụ cột mới') });
            setDrawerOpen(false);
            setEditing(null);
            await load();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('Không thể lưu trụ cột'),
                description: t(error.message),
            });
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (pillar) => {
        try {
            const status = pillar.status === 'archived' ? 'active' : 'archived';
            await appClient.entities.ContentPillar.update(pillar.id, { status });
            toast({ title: status === 'archived' ? t('Đã lưu trữ trụ cột') : t('Đã khôi phục trụ cột') });
            load();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('Không thể cập nhật trạng thái'),
                description: t(error.message),
            });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await requireNoTemplateReferences(appClient.entities.PostTemplate, 'pillar_id', deleteTarget, t);
            await appClient.entities.ContentPillar.delete(deleteTarget.id);
            toast({ title: t('Đã xoá trụ cột') });
            setDeleteTarget(null);
            load();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('Không thể xoá trụ cột'),
                description: t(error.message),
            });
        }
    };

    const filteredPillars = useMemo(() => {
        const q = search.trim().toLowerCase();
        return pillars.filter((p) => {
            if (statusFilter === 'active' && p.status === 'archived') return false;
            if (statusFilter === 'archived' && p.status !== 'archived') return false;
            if (q) {
                const hit =
                    p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
                if (!hit) return false;
            }
            return true;
        });
    }, [pillars, statusFilter, search]);

    const groups = useMemo(() => {
        if (selectedBrandId === 'all') {
            return brands
                .map((brand) => ({
                    brand,
                    items: filteredPillars.filter((p) => p.brand_id === brand.id),
                }))
                .filter((g) => g.items.length > 0);
        }
        return [
            {
                brand: brands.find((b) => b.id === selectedBrandId) || null,
                items: filteredPillars,
            },
        ].filter((g) => g.items.length > 0);
    }, [brands, filteredPillars, selectedBrandId]);

    if (loadError) return <LoadError message={loadError} onRetry={load} />;

    const brandCampaigns = campaigns.filter((c) => !form.brand_id || c.brand_id === form.brand_id);

    return (
        <div className="space-y-6">
            {/* 1. CLEAN STUDIO HEADER */}
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-dark bg-brand text-brand-ink">
                        <Stack size={22} weight="duotone" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                {t('Trụ cột nội dung')}
                            </h1>
                            <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums ${
                                    targetTotal === 100
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-amber-200 bg-amber-50 text-amber-800'
                                }`}
                            >
                                {targetTotal}% {t('mục tiêu')}
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                            {t('Định nghĩa các chủ đề cốt lõi cho từng thương hiệu và cân bằng tỷ trọng xuất bản 100%.')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        to="/strategy/angles"
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-zinc-50"
                    >
                        <TreeStructure size={15} weight="bold" className="text-brand-dark" />
                        <span>{t('Góc khai thác')}</span>
                        <ArrowSquareOut size={13} className="text-muted-foreground" />
                    </Link>
                    <button
                        type="button"
                        onClick={openCreateDrawer}
                        className="btn-skew min-h-10 cursor-pointer whitespace-nowrap"
                    >
                        <Plus size={15} weight="bold" />
                        <span>{t('Tạo trụ cột mới')}</span>
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-44 rounded-2xl" />
                    <Skeleton className="h-64 rounded-2xl" />
                </div>
            ) : pillars.length === 0 ? (
                <EmptyState
                    icon={Stack}
                    title={t('Chưa có trụ cột nội dung nào')}
                    description={t(
                        'Bắt đầu với 3–5 chủ đề chính (ví dụ: Kiến thức sản phẩm, Case Study, Hậu trường) và phân bổ tỷ trọng mục tiêu cho từng trụ cột.'
                    )}
                >
                    <button
                        type="button"
                        onClick={openCreateDrawer}
                        className="btn-skew inline-flex cursor-pointer items-center gap-2"
                    >
                        <Plus size={15} weight="bold" />
                        <span>{t('Tạo trụ cột đầu tiên')}</span>
                    </button>
                </EmptyState>
            ) : (
                <>
                    {/* 2. HERO ALLOCATION SPECTRUM CARD (DONUT + DUAL SPECTRUM) */}
                    <section className="panel overflow-hidden bg-card">
                        <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-12 lg:divide-x lg:divide-y-0">
                            {/* Left: Target Allocation Donut */}
                            <div className="flex items-center gap-5 p-5 lg:col-span-4">
                                {(() => {
                                    const r = 36;
                                    const circ = 2 * Math.PI * r;
                                    let offset = 0;
                                    const denom = Math.max(targetTotal, 100);
                                    return (
                                        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                                            <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
                                                <circle
                                                    cx="48"
                                                    cy="48"
                                                    r={r}
                                                    fill="none"
                                                    stroke="#f4f4f5"
                                                    strokeWidth="12"
                                                />
                                                {activePillars.map((p, idx) => {
                                                    const frac = (Number(p.target_percentage) || 0) / denom;
                                                    const dash = Math.max(0, frac * circ - 1.5);
                                                    const cur = offset;
                                                    offset += frac * circ;
                                                    return (
                                                        <circle
                                                            key={p.id}
                                                            cx="48"
                                                            cy="48"
                                                            r={r}
                                                            fill="none"
                                                            stroke={resolvePillarColor(p, idx)}
                                                            strokeWidth="12"
                                                            strokeDasharray={`${dash} ${circ}`}
                                                            strokeDashoffset={-cur}
                                                        />
                                                    );
                                                })}
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="font-heading text-lg font-bold tabular-nums text-foreground">
                                                    {targetTotal}%
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div className="min-w-0 space-y-1">
                                    <div className="text-xs font-bold text-foreground">
                                        {targetTotal === 100
                                            ? t('Phân bổ mục tiêu chuẩn 100%')
                                            : targetTotal < 100
                                              ? t('Còn dư {left}% chưa phân bổ', { left: 100 - targetTotal })
                                              : t('Vượt {over}% so với mức 100%', { over: targetTotal - 100 })}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {activePillars.length} {t('trụ cột hoạt động')} · {balancedCount}/
                                        {activePillars.length} {t('cân bằng')}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px] text-muted-foreground">
                                        <span>
                                            <strong className="text-foreground">{total}</strong> {t('bài viết')}
                                        </span>
                                        <span>·</span>
                                        <span>
                                            <strong className="text-foreground">{angles.length}</strong>{' '}
                                            {t('góc khai thác')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Dual Target vs Actual Stacked Bars */}
                            <div className="flex flex-col justify-center space-y-3 bg-zinc-50/40 p-5 lg:col-span-8">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                                            {t('Tỷ trọng mục tiêu')}
                                        </span>
                                        <span className="font-mono text-muted-foreground">{targetTotal}%</span>
                                    </div>
                                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-200/70">
                                        {activePillars.map((p, idx) => (
                                            <div
                                                key={`t-${p.id}`}
                                                style={{
                                                    width: `${p.target_percentage || 0}%`,
                                                    backgroundColor: resolvePillarColor(p, idx),
                                                }}
                                                className="h-full border-r border-white/60 last:border-r-0"
                                                title={`${p.name}: Mục tiêu ${p.target_percentage || 0}%`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="font-semibold uppercase tracking-wider text-foreground">
                                            {t('Thực tế xuất bản')}
                                        </span>
                                        <span className="font-mono font-semibold text-foreground">
                                            {total} {t('bài')}
                                        </span>
                                    </div>
                                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-200/70">
                                        {activePillars.map((p, idx) => {
                                            const actual = percent(counts[p.id] || 0, total);
                                            return (
                                                <div
                                                    key={`a-${p.id}`}
                                                    style={{
                                                        width: `${actual}%`,
                                                        backgroundColor: resolvePillarColor(p, idx),
                                                    }}
                                                    className="h-full border-r border-white/60 last:border-r-0"
                                                    title={`${p.name}: Thực tế ${actual}% (${counts[p.id] || 0} bài)`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-[11px] text-muted-foreground">
                                    {activePillars.map((p, idx) => (
                                        <span key={p.id} className="inline-flex items-center gap-1.5">
                                            <span
                                                className="h-2 w-2 shrink-0 rounded-full"
                                                style={{ backgroundColor: resolvePillarColor(p, idx) }}
                                            />
                                            <span className="font-medium text-foreground">{p.name}</span>
                                            <span className="font-mono tabular-nums">
                                                {p.target_percentage || 0}%
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 3. FILTER & SEARCH BAR */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {[
                                { key: 'all', label: t('Tất cả'), count: pillars.length },
                                { key: 'active', label: t('Đang hoạt động'), count: activePillars.length },
                                { key: 'archived', label: t('Lưu trữ'), count: archivedPillars.length },
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

                        <div className="relative w-full sm:w-64">
                            <MagnifyingGlass
                                size={14}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('Tìm tên trụ cột, mô tả…')}
                                className="h-9 w-full rounded-xl border border-border bg-card pl-8 pr-3 text-xs text-foreground focus:border-brand-dark focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* 4. ZERO-ORPHAN EDITORIAL PILLAR ROWS BY BRAND */}
                    {groups.length === 0 ? (
                        <EmptyState
                            icon={Stack}
                            title={t('Không tìm thấy trụ cột phù hợp')}
                            description={t('Thử đổi bộ lọc trạng thái hoặc từ khoá tìm kiếm.')}
                        />
                    ) : (
                        <div className="space-y-5">
                            {groups.map((group) => (
                                <section
                                    key={group.brand?.id || 'all'}
                                    className="panel overflow-hidden bg-card"
                                >
                                    <div className="flex items-center justify-between border-b border-border bg-zinc-50/60 px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full"
                                                style={{ backgroundColor: group.brand?.color || '#ffd631' }}
                                            />
                                            <h2 className="font-heading text-sm font-bold text-foreground">
                                                {group.brand?.name || t('Tất cả thương hiệu')}
                                            </h2>
                                            <span className="font-mono text-xs text-muted-foreground">
                                                ({group.items.length} {t('trụ cột')})
                                            </span>
                                        </div>
                                        <Link
                                            to="/strategy/angles"
                                            className="text-xs font-medium text-muted-foreground hover:text-foreground"
                                        >
                                            {t('Xem góc khai thác →')}
                                        </Link>
                                    </div>

                                    <div className="divide-y divide-border">
                                        {group.items.map((pillar, idx) => {
                                            const count = counts[pillar.id] || 0;
                                            const angleCount = angles.filter(
                                                (a) => a.pillar_id === pillar.id
                                            ).length;
                                            const blocking = count > 0 || angleCount > 0;
                                            const target = pillar.target_percentage || 0;
                                            const actual = percent(count, total);
                                            const diff = actual - target;
                                            const isBalanced = Math.abs(diff) <= 5;
                                            const isOver = diff > 5;
                                            const isUnder = diff < -5;
                                            const isArchived = pillar.status === 'archived';
                                            const color = resolvePillarColor(pillar, idx);
                                            const linkedCampaign = pillar.campaign_id
                                                ? campaigns.find((c) => c.id === pillar.campaign_id)
                                                : null;

                                            return (
                                                <div
                                                    key={pillar.id}
                                                    className={`flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-zinc-50/70 lg:flex-row lg:items-center lg:justify-between ${
                                                        isArchived ? 'opacity-65' : ''
                                                    }`}
                                                >
                                                    {/* Left: Color Strip + Name + Description */}
                                                    <div className="flex min-w-0 flex-1 items-start gap-3.5">
                                                        <span
                                                            className="mt-0.5 h-10 w-1.5 shrink-0 rounded-full"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h3 className="truncate font-heading text-sm font-bold text-foreground">
                                                                    {pillar.name}
                                                                </h3>
                                                                {linkedCampaign && (
                                                                    <span className="inline-flex items-center gap-1 rounded-md border border-brand-dark/30 bg-brand/20 px-2 py-0.5 text-[10px] font-semibold text-brand-ink">
                                                                        <Target size={10} weight="bold" />
                                                                        {linkedCampaign.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {pillar.description && (
                                                                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                                                    {pillar.description}
                                                                </p>
                                                            )}
                                                            <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                                                                <span className="inline-flex items-center gap-1 font-medium">
                                                                    <TreeStructure size={12} />
                                                                    <span>
                                                                        {angleCount} {t('góc')}
                                                                    </span>
                                                                </span>
                                                                <span className="inline-flex items-center gap-1 font-medium">
                                                                    <FileText size={12} />
                                                                    <span>
                                                                        {count} {t('bài viết')}
                                                                    </span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Center: Visual Progress Bar + Target vs Actual */}
                                                    <div className="w-full shrink-0 space-y-1.5 lg:w-64">
                                                        <div className="flex items-baseline justify-between font-mono text-xs tabular-nums">
                                                            <span className="text-muted-foreground">
                                                                {t('Thực tế')}{' '}
                                                                <strong className="text-foreground">
                                                                    {actual}%
                                                                </strong>
                                                            </span>
                                                            <span className="text-muted-foreground">
                                                                {t('Mục tiêu')}{' '}
                                                                <strong className="text-foreground">
                                                                    {target}%
                                                                </strong>
                                                            </span>
                                                        </div>
                                                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                                                            <div
                                                                className="h-full rounded-full transition-all duration-500"
                                                                style={{
                                                                    width: `${Math.min(100, actual)}%`,
                                                                    backgroundColor: color,
                                                                }}
                                                            />
                                                            {target > 0 && (
                                                                <span
                                                                    className="absolute bottom-0 top-0 w-0.5 bg-zinc-800"
                                                                    style={{
                                                                        left: `calc(${Math.min(100, target)}% - 1px)`,
                                                                    }}
                                                                    title={`Mục tiêu: ${target}%`}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Right: Status Badge + Actions */}
                                                    <div className="flex shrink-0 items-center justify-between gap-2 lg:justify-end">
                                                        <div className="w-24">
                                                            {isArchived ? (
                                                                <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600">
                                                                    {t('Lưu trữ')}
                                                                </span>
                                                            ) : isBalanced ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                                                    <Check size={11} weight="bold" />
                                                                    {t('Cân bằng')}
                                                                </span>
                                                            ) : isOver ? (
                                                                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                                                                    +{Math.round(diff)}% {t('Vượt')}
                                                                </span>
                                                            ) : isUnder ? (
                                                                <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                                                                    {Math.round(diff)}% {t('Thiếu')}
                                                                </span>
                                                            ) : null}
                                                        </div>

                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditDrawer(pillar, idx)}
                                                                className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-zinc-50"
                                                            >
                                                                <PencilSimple size={13} />
                                                                <span>{t('Sửa')}</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleStatus(pillar)}
                                                                className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-zinc-50 hover:text-foreground"
                                                                title={
                                                                    isArchived ? t('Khôi phục') : t('Lưu trữ')
                                                                }
                                                            >
                                                                {isArchived ? (
                                                                    <ArrowCounterClockwise size={14} />
                                                                ) : (
                                                                    <Archive size={14} />
                                                                )}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={blocking}
                                                                onClick={() => setDeleteTarget(pillar)}
                                                                title={
                                                                    blocking
                                                                        ? t(
                                                                              'Trụ cột đang có bài viết hoặc góc khai thác liên kết. Hãy lưu trữ thay vì xóa.'
                                                                          )
                                                                        : t('Xoá trụ cột')
                                                                }
                                                                className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-35"
                                                            >
                                                                <Trash size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* 5. RIGHT-SIDE SLIDE-OVER DRAWER FOR CREATE / EDIT PILLAR */}
            <Sheet open={drawerOpen} onOpenChange={(open) => !saving && setDrawerOpen(open)}>
                <SheetContent className="max-w-lg">
                    <form onSubmit={handleSave} className="flex h-full flex-col">
                        <div className="shrink-0 border-b border-border bg-zinc-50/80 px-5 py-4 pr-12">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-brand-dark bg-brand text-brand-ink">
                                    <Stack size={16} weight="bold" />
                                </span>
                                <div>
                                    <h2 className="font-heading text-sm font-bold text-foreground">
                                        {editing ? t('Chỉnh sửa trụ cột nội dung') : t('Tạo trụ cột nội dung mới')}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        {t('Cấu hình tên chủ đề, màu nhận diện và tỷ trọng mục tiêu (%).')}
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
                                        onChange={(e) =>
                                            setForm({ ...form, brand_id: e.target.value, campaign_id: '' })
                                        }
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
                                    <span className="font-semibold text-foreground">
                                        {t('Chiến dịch liên kết')}
                                    </span>
                                    <select
                                        value={form.campaign_id}
                                        onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}
                                        className="h-10 w-full cursor-pointer rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-brand-dark focus:outline-none"
                                    >
                                        <option value="">{t('Chung (toàn thương hiệu)')}</option>
                                        {brandCampaigns.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <label className="block space-y-1.5">
                                <span className="font-semibold text-foreground">{t('Tên trụ cột')} *</span>
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder={t('VD: Đào tạo & Kiến thức, Case Study & Kết quả…')}
                                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-brand-dark focus:outline-none"
                                />
                            </label>

                            <div className="space-y-2 rounded-xl border border-border bg-zinc-50/60 p-3.5">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-foreground">
                                        {t('Tỷ trọng mục tiêu (%)')}
                                    </span>
                                    <span className="font-mono text-sm font-bold tabular-nums text-brand-ink">
                                        {form.target_percentage}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    step={5}
                                    value={form.target_percentage}
                                    onChange={(e) =>
                                        setForm({ ...form, target_percentage: Number(e.target.value) })
                                    }
                                    className="w-full accent-[#d8b216]"
                                />
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>0%</span>
                                    <span>
                                        {t('Tổng hiện tại các trụ cột đang chạy')}:{' '}
                                        <strong className="text-foreground">{targetTotal}%</strong>
                                    </span>
                                    <span>100%</span>
                                </div>
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
                                        value={form.color || '#93C5FD'}
                                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                                        className="h-7 w-9 cursor-pointer rounded-lg border border-border bg-card p-0.5"
                                        title={t('Màu tuỳ chỉnh')}
                                    />
                                </div>
                            </div>

                            <label className="block space-y-1.5">
                                <span className="font-semibold text-foreground">{t('Mô tả định hướng')}</span>
                                <textarea
                                    rows={4}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder={t('Chủ đề chính, loại bài viết và thông điệp cần truyền tải…')}
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
                                          : t('Tạo trụ cột')}
                                </span>
                            </button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(val) => !val && setDeleteTarget(null)}
                title={t('Xoá trụ cột “{value1}”?', { value1: deleteTarget?.name })}
                description={t(
                    'Trụ cột sẽ bị xoá khỏi chiến lược. Các bài viết cũ vẫn giữ lịch sử cho đến khi được gán lại.'
                )}
                confirmLabel={t('Xoá trụ cột')}
                destructive
                onConfirm={handleDelete}
            />
        </div>
    );
}
