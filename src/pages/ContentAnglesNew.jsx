import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Archive,
    ArrowCounterClockwise,
    ArrowRight,
    ArrowSquareOut,
    Check,
    Compass,
    FloppyDisk,
    MagnifyingGlass,
    NotePencil,
    PencilSimple,
    Plus,
    Rows,
    Sparkle,
    SquaresFour,
    Stack,
    Trash,
    WarningCircle,
    X,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import LoadError from '@/components/common/load-error';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { requireNoTemplateReferences } from '@/lib/post-templates';
import { formatNumber, percent } from '@/lib/format';

const FALLBACK_COLORS = [
    '#93C5FD',
    '#C4B5FD',
    '#FED7AA',
    '#A7F3D0',
    '#FBCFE8',
    '#FEF08A',
    '#99F6E4',
    '#ffd631',
];

const QUICK_ANGLE_PRESETS = [
    {
        name: 'Hướng dẫn từng bước (How-to)',
        description: 'Chia nhỏ quy trình thành 3–5 bước dễ làm theo, kèm ví dụ thực tế và lỗi cần tránh.',
    },
    {
        name: 'Sai lầm thường gặp',
        description: 'Chỉ ra 3 sai lầm phổ biến mà khách hàng mục tiêu hay mắc phải và cách khắc phục nhanh.',
    },
    {
        name: 'So sánh Trước / Sau',
        description: 'Đặt cạnh trạng thái trước và sau khi áp dụng giải pháp để làm nổi bật kết quả đo được.',
    },
    {
        name: 'Câu chuyện & Case study',
        description: 'Kể lại tình huống thực tế của khách hàng hoặc đội ngũ: bối cảnh, hành động, kết quả cụ thể.',
    },
    {
        name: 'Lật ngược định kiến (Myth vs Fact)',
        description: 'Đưa ra một quan niệm phổ biến nhưng chưa chính xác, giải thích lại bằng góc nhìn chuyên môn.',
    },
];

function resolvePillarColor(pillar, index = 0) {
    if (pillar?.color) return pillar.color;
    return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export default function ContentAnglesNew() {
    const { t } = useTranslation();
    const { scope, brands, selectedBrandId, demoMode } = useWorkspace();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [counts, setCounts] = useState({});

    // Filters & View mode
    const [selectedPillarId, setSelectedPillarId] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'archived'
    const [onlyEmptyAngles, setOnlyEmptyAngles] = useState(false);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('bands'); // 'bands' | 'wall'

    // Inline quick-add per pillar
    const [quickAddPillarId, setQuickAddPillarId] = useState(null);
    const [quickAddName, setQuickAddName] = useState('');
    const [quickAddSaving, setQuickAddSaving] = useState(false);

    // Drawer form state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [form, setForm] = useState({
        brand_id: '',
        pillar_id: '',
        name: '',
        description: '',
        status: 'active',
    });

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [pillarPage, anglePage, agg] = await Promise.all([
                appClient.entities.ContentPillar.filter(scope, { sort: 'name', limit: 300 }),
                appClient.entities.ContentAngle.filter(scope, { sort: 'name', limit: 500 }),
                appClient.entities.Post.aggregate({ query: scope, groupBy: 'angle_id' }),
            ]);
            setPillars(pillarPage.items || []);
            setAngles(anglePage.items || []);
            setCounts(Object.fromEntries((agg.rows || []).map((row) => [row.angle_id, row.count])));
        } catch (error) {
            setLoadError(error.message);
        } finally {
            setLoading(false);
        }
    }, [scope]);

    useEffect(() => {
        load();
    }, [load]);

    const pillarMap = useMemo(() => {
        const map = {};
        pillars.forEach((p, idx) => {
            const pAngles = angles.filter((a) => a.pillar_id === p.id);
            const activeAngles = pAngles.filter((a) => (a.status || 'active') !== 'archived');
            const postsCount = pAngles.reduce((sum, a) => sum + (counts[a.id] || 0), 0);
            map[p.id] = {
                pillar: p,
                color: resolvePillarColor(p, idx),
                index: idx,
                anglesCount: pAngles.length,
                activeAnglesCount: activeAngles.length,
                postsCount,
            };
        });
        return map;
    }, [pillars, angles, counts]);

    const metrics = useMemo(() => {
        const activeAngles = angles.filter((a) => (a.status || 'active') !== 'archived');
        const activePillars = pillars.filter((p) => (p.status || 'active') !== 'archived');
        const coveredPillars = activePillars.filter((p) => (pillarMap[p.id]?.activeAnglesCount || 0) > 0).length;
        const totalPostsAssigned = angles.reduce((sum, a) => sum + (counts[a.id] || 0), 0);
        const zeroPostActiveAngles = activeAngles.filter((a) => (counts[a.id] || 0) === 0).length;
        const maxPostCount = Math.max(1, ...angles.map((a) => counts[a.id] || 0));

        return {
            totalAngles: angles.length,
            activeAnglesCount: activeAngles.length,
            activePillarsCount: activePillars.length,
            coveredPillars,
            totalPostsAssigned,
            zeroPostActiveAngles,
            maxPostCount,
        };
    }, [angles, pillars, pillarMap, counts]);

    const filteredAngles = useMemo(() => {
        const q = search.trim().toLowerCase();
        return angles.filter((angle) => {
            if (selectedPillarId !== 'all' && angle.pillar_id !== selectedPillarId) return false;
            const st = angle.status || 'active';
            if (statusFilter !== 'all' && st !== statusFilter) return false;
            if (onlyEmptyAngles && (counts[angle.id] || 0) > 0) return false;
            if (q) {
                const parentName = pillarMap[angle.pillar_id]?.pillar?.name || '';
                const haystack = `${angle.name || ''} ${angle.description || ''} ${parentName}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [angles, selectedPillarId, statusFilter, onlyEmptyAngles, search, counts, pillarMap]);

    const bands = useMemo(() => {
        const targetPillars =
            selectedPillarId === 'all'
                ? pillars
                : pillars.filter((p) => p.id === selectedPillarId);

        const list = targetPillars
            .map((pillar) => {
                const meta = pillarMap[pillar.id];
                const items = filteredAngles
                    .filter((a) => a.pillar_id === pillar.id)
                    .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
                return { pillar, meta, items };
            })
            .filter((b) => {
                if (selectedPillarId !== 'all') return true;
                if (search.trim() || onlyEmptyAngles || statusFilter === 'archived') {
                    return b.items.length > 0;
                }
                return b.items.length > 0 || (b.pillar.status || 'active') !== 'archived';
            });

        const knownIds = new Set(pillars.map((p) => p.id));
        const orphans =
            selectedPillarId === 'all'
                ? filteredAngles.filter((a) => !knownIds.has(a.pillar_id))
                : [];
        if (orphans.length > 0) {
            list.push({
                pillar: { id: '__unassigned', name: t('Chưa gán trụ cột'), target_percentage: 0, status: 'active' },
                meta: { color: '#d4d4d8', postsCount: orphans.reduce((s, a) => s + (counts[a.id] || 0), 0) },
                items: orphans,
                isUnassigned: true,
            });
        }
        return list;
    }, [pillars, selectedPillarId, pillarMap, filteredAngles, counts, search, onlyEmptyAngles, statusFilter, t]);

    const drawerPillars = useMemo(() => {
        return pillars.filter((p) => {
            if (form.brand_id && p.brand_id && p.brand_id !== form.brand_id) return false;
            return (p.status || 'active') === 'active' || p.id === editing?.pillar_id;
        });
    }, [pillars, form.brand_id, editing]);

    const openCreateDrawer = (preselectedPillarId = '') => {
        const targetPillarId =
            preselectedPillarId || (selectedPillarId !== 'all' ? selectedPillarId : '');
        const parentPillar = pillars.find((p) => p.id === targetPillarId);
        const defaultBrand =
            parentPillar?.brand_id ||
            (selectedBrandId && selectedBrandId !== 'all' ? selectedBrandId : brands[0]?.id || '');

        setEditing(null);
        setForm({
            brand_id: defaultBrand,
            pillar_id: targetPillarId || '',
            name: '',
            description: '',
            status: 'active',
        });
        setDrawerOpen(true);
    };

    const openEditDrawer = (angle) => {
        const parentPillar = pillars.find((p) => p.id === angle.pillar_id);
        setEditing(angle);
        setForm({
            brand_id: angle.brand_id || parentPillar?.brand_id || brands[0]?.id || '',
            pillar_id: angle.pillar_id || '',
            name: angle.name || '',
            description: angle.description || '',
            status: angle.status || 'active',
        });
        setDrawerOpen(true);
    };

    const handleQuickAdd = async (e, pillar) => {
        e.preventDefault();
        const name = quickAddName.trim();
        if (!name || quickAddSaving) return;
        setQuickAddSaving(true);
        try {
            const brandId =
                pillar.brand_id ||
                (selectedBrandId && selectedBrandId !== 'all' ? selectedBrandId : brands[0]?.id || '');
            await appClient.entities.ContentAngle.create({
                brand_id: brandId,
                pillar_id: pillar.id,
                name,
                description: '',
                status: 'active',
                is_demo: demoMode,
            });
            toast({ title: t('Angle created') });
            setQuickAddName('');
            setQuickAddPillarId(null);
            await load();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('Unable to update strategy'),
                description: t(error.message),
            });
        } finally {
            setQuickAddSaving(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.pillar_id) {
            toast({
                variant: 'destructive',
                title: t('Vui lòng chọn trụ cột và nhập tên góc khai thác'),
            });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                brand_id: form.brand_id,
                pillar_id: form.pillar_id,
                name: form.name.trim(),
                description: form.description.trim(),
                status: form.status || 'active',
            };
            if (editing) {
                await appClient.entities.ContentAngle.update(editing.id, payload);
                toast({ title: t('Angle updated') });
            } else {
                await appClient.entities.ContentAngle.create({ ...payload, is_demo: demoMode });
                toast({ title: t('Angle created') });
            }
            setDrawerOpen(false);
            setEditing(null);
            await load();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('Unable to update strategy'),
                description: t(error.message),
            });
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (angle) => {
        try {
            const nextStatus = angle.status === 'archived' ? 'active' : 'archived';
            await appClient.entities.ContentAngle.update(angle.id, { status: nextStatus });
            toast({
                title: nextStatus === 'archived' ? t('Angle archived') : t('Angle restored'),
            });
            if (editing?.id === angle.id) {
                setEditing({ ...angle, status: nextStatus });
                setForm((prev) => ({ ...prev, status: nextStatus }));
            }
            load();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('Unable to update strategy'),
                description: t(error.message),
            });
        }
    };

    const remove = async () => {
        if (!deleteTarget) return;
        await requireNoTemplateReferences(appClient.entities.PostTemplate, 'angle_id', deleteTarget, t);
        await appClient.entities.ContentAngle.delete(deleteTarget.id);
        toast({ title: t('Angle deleted') });
        if (editing?.id === deleteTarget.id) {
            setDrawerOpen(false);
            setEditing(null);
        }
        setDeleteTarget(null);
        load();
    };

    const hasActiveFilters =
        selectedPillarId !== 'all' || statusFilter !== 'all' || onlyEmptyAngles || search.trim() !== '';

    const resetFilters = () => {
        setSelectedPillarId('all');
        setStatusFilter('all');
        setOnlyEmptyAngles(false);
        setSearch('');
    };

    if (loadError) return <LoadError message={loadError} onRetry={load} />;

    return (
        <div className="space-y-6 pb-14 max-w-[1440px] mx-auto">
            {/* Compact Editorial Header with Inline Metrics */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-zinc-200/80">
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="font-heading text-[26px] font-medium tracking-tight text-zinc-900">
                            {t('Content Angles')}
                        </h1>
                        {!loading ? (
                            <div className="flex flex-wrap items-center gap-2 text-[12px] text-zinc-500">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white border border-zinc-200/90 text-zinc-700 font-medium tabular-nums">
                                    {formatNumber(metrics.activeAnglesCount)} {t('góc đang dùng')}
                                </span>
                                <span className="text-zinc-300">·</span>
                                <span className="tabular-nums">
                                    {metrics.coveredPillars}/{metrics.activePillarsCount} {t('trụ cột')}
                                </span>
                                <span className="text-zinc-300">·</span>
                                <span className="tabular-nums">
                                    {formatNumber(metrics.totalPostsAssigned)} {t('bài đã gán')}
                                </span>
                                {metrics.zeroPostActiveAngles > 0 ? (
                                    <>
                                        <span className="text-zinc-300">·</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOnlyEmptyAngles((v) => !v);
                                                if (!onlyEmptyAngles) setStatusFilter('active');
                                            }}
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11.5px] font-medium transition-colors cursor-pointer ${
                                                onlyEmptyAngles
                                                    ? 'bg-[#ffd631]/35 border-[#d8b216] text-[#2b2100]'
                                                    : 'bg-amber-50 border-amber-200/80 text-amber-800 hover:bg-amber-100/70'
                                            }`}
                                        >
                                            <WarningCircle size={13} weight="duotone" />
                                            <span className="tabular-nums">
                                                {metrics.zeroPostActiveAngles} {t('chưa có bài')}
                                            </span>
                                        </button>
                                    </>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                    <p className="text-[13.5px] text-zinc-500 max-w-2xl leading-relaxed">
                        {t(
                            'Thư viện công thức triển khai nội dung theo từng trụ cột. Bấm trực tiếp vào góc để chỉnh sửa hoặc tạo bài viết mới.'
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
                        <Link to="/strategy/pillars">
                            <Stack size={15} weight="duotone" className="mr-1.5 text-zinc-500" />
                            {t('Content Pillars')}
                        </Link>
                    </Button>

                    <button
                        type="button"
                        onClick={() => openCreateDrawer()}
                        className="btn-skew"
                    >
                        <Plus size={16} weight="duotone" />
                        <span>{t('New angle')}</span>
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-24 rounded-2xl" />
                    <Skeleton className="h-44 rounded-2xl" />
                    <Skeleton className="h-44 rounded-2xl" />
                </div>
            ) : !angles.length ? (
                <EmptyState
                    icon={Compass}
                    title={t('No angles defined yet')}
                    description={t(
                        'Add angles to a pillar so writers know exactly how to approach the theme — How-to, Common Mistakes or Myth vs Fact are good starting points.'
                    )}
                >
                    <Button variant="outline" onClick={() => openCreateDrawer()}>
                        <Plus size={15} weight="duotone" className="mr-1.5" />
                        {t('Create an angle')}
                    </Button>
                </EmptyState>
            ) : (
                <>
                    {/* Visual Coverage Spectrum + Command Bar (Single Clean Panel) */}
                    <section className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                        {/* Proportional Bar across Pillars */}
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-2 text-[12px]">
                                <span className="font-medium text-zinc-700">
                                    {t('Phân bổ góc khai thác theo trụ cột')}
                                </span>
                                <span className="text-zinc-400 tabular-nums">
                                    {selectedPillarId === 'all'
                                        ? `${filteredAngles.length} / ${angles.length} ${t('góc đang hiển thị')}`
                                        : `${pillarMap[selectedPillarId]?.pillar?.name || ''} · ${filteredAngles.length} ${t('góc')}`}
                                </span>
                            </div>

                            {/* Segmented proportional bar */}
                            <div className="h-2.5 w-full rounded-full bg-zinc-100 overflow-hidden flex gap-0.5">
                                {pillars.map((pillar) => {
                                    const meta = pillarMap[pillar.id];
                                    const widthPct =
                                        angles.length > 0
                                            ? Math.max(4, ((meta?.anglesCount || 0) / angles.length) * 100)
                                            : 0;
                                    const isSelected = selectedPillarId === pillar.id;
                                    const isDimmed = selectedPillarId !== 'all' && !isSelected;

                                    return (
                                        <button
                                            key={pillar.id}
                                            type="button"
                                            title={`${pillar.name}: ${meta?.anglesCount || 0} góc · ${meta?.postsCount || 0} bài`}
                                            onClick={() =>
                                                setSelectedPillarId(isSelected ? 'all' : pillar.id)
                                            }
                                            className="h-full transition-opacity cursor-pointer first:rounded-l-full last:rounded-r-full"
                                            style={{
                                                width: `${widthPct}%`,
                                                backgroundColor: meta?.color || '#93C5FD',
                                                opacity: isDimmed ? 0.25 : 1,
                                            }}
                                        />
                                    );
                                })}
                            </div>

                            {/* Legend / Quick Filter Chips (Wrapped cleanly, zero scrollbar) */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <button
                                    type="button"
                                    onClick={() => setSelectedPillarId('all')}
                                    className={`h-7 px-2.5 rounded-md text-[12px] font-medium border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                                        selectedPillarId === 'all'
                                            ? 'bg-[#ffd631]/30 border-[#d8b216] text-[#2b2100] font-semibold'
                                            : 'bg-zinc-50 border-zinc-200/80 text-zinc-600 hover:bg-zinc-100'
                                    }`}
                                >
                                    <span>{t('Tất cả')}</span>
                                    <span className="font-mono text-[11px] opacity-75">{angles.length}</span>
                                </button>

                                {pillars.map((pillar) => {
                                    const meta = pillarMap[pillar.id];
                                    const active = selectedPillarId === pillar.id;
                                    return (
                                        <button
                                            key={pillar.id}
                                            type="button"
                                            onClick={() => setSelectedPillarId(active ? 'all' : pillar.id)}
                                            className={`h-7 px-2.5 rounded-md text-[12px] font-medium border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                                                active
                                                    ? 'bg-[#ffd631]/30 border-[#d8b216] text-[#2b2100] font-semibold'
                                                    : 'bg-white border-zinc-200/80 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
                                            }`}
                                        >
                                            <span
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: meta?.color || '#93C5FD' }}
                                            />
                                            <span className="max-w-[190px] truncate">{pillar.name}</span>
                                            <span className="font-mono text-[11px] text-zinc-400">
                                                {meta?.anglesCount || 0}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Search & View Controls */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 border-t border-zinc-100">
                            <div className="relative flex-1 max-w-md">
                                <MagnifyingGlass
                                    size={15}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                                />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t('Tìm góc khai thác, mô tả hoặc trụ cột...')}
                                    aria-label={t('Tìm góc khai thác, mô tả hoặc trụ cột...')}
                                    className="w-full h-9 pl-9 pr-8 rounded-lg border border-zinc-200 bg-zinc-50/60 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216] transition"
                                />
                                {search ? (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        aria-label={t('Xóa tìm kiếm')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                                    >
                                        <X size={14} />
                                    </button>
                                ) : null}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/70">
                                    {[
                                        { id: 'all', label: t('Tất cả') },
                                        { id: 'active', label: t('Đang dùng') },
                                        { id: 'archived', label: t('Lưu trữ') },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setStatusFilter(tab.id)}
                                            className={`h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
                                                statusFilter === tab.id
                                                    ? 'bg-white text-zinc-900 shadow-2xs'
                                                    : 'text-zinc-500 hover:text-zinc-900'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {hasActiveFilters ? (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="h-8 px-2.5 rounded-lg text-[12px] text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                                    >
                                        {t('Đặt lại')}
                                    </button>
                                ) : null}

                                <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/70">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('bands')}
                                        className={`h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                            viewMode === 'bands'
                                                ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                                : 'text-zinc-500 hover:text-zinc-900'
                                        }`}
                                    >
                                        <Rows size={14} weight={viewMode === 'bands' ? 'duotone' : 'regular'} />
                                        <span>{t('Playbook')}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('wall')}
                                        className={`h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                            viewMode === 'wall'
                                                ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                                : 'text-zinc-500 hover:text-zinc-900'
                                        }`}
                                    >
                                        <SquaresFour size={14} weight={viewMode === 'wall' ? 'duotone' : 'regular'} />
                                        <span>{t('Lưới thẻ')}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Empty filtered state */}
                    {filteredAngles.length === 0 && (viewMode === 'wall' || bands.length === 0) ? (
                        <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center space-y-3">
                            <Compass size={32} weight="duotone" className="mx-auto text-zinc-300" />
                            <p className="text-[14px] font-medium text-zinc-800">
                                {t('Không tìm thấy góc khai thác nào phù hợp')}
                            </p>
                            <p className="text-[12.5px] text-zinc-500">
                                {t('Thử đổi từ khóa, bộ lọc trạng thái hoặc thêm góc mới.')}
                            </p>
                            <div className="flex items-center justify-center gap-2 pt-1">
                                {hasActiveFilters ? (
                                    <Button variant="outline" size="sm" onClick={resetFilters}>
                                        {t('Xóa bộ lọc')}
                                    </Button>
                                ) : null}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openCreateDrawer(selectedPillarId !== 'all' ? selectedPillarId : '')}
                                >
                                    <Plus size={14} className="mr-1" />
                                    {t('New angle')}
                                </Button>
                            </div>
                        </div>
                    ) : viewMode === 'bands' ? (
                        /* ================================================================= */
                        /* EDITORIAL PLAYBOOK BANDS: Per-pillar horizontal band (Zero-orphan)*/
                        /* ================================================================= */
                        <div className="space-y-4">
                            {bands.map(({ pillar, meta, items, isUnassigned }) => {
                                const pillarColor = meta?.color || '#93C5FD';
                                const pillarPosts = meta?.postsCount || 0;
                                const isQuickAdding = quickAddPillarId === pillar.id;

                                return (
                                    <section
                                        key={pillar.id}
                                        className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]"
                                    >
                                        {/* Left Pillar Anchor Rail (Scoped per pillar so height stays balanced) */}
                                        <div className="p-5 bg-zinc-50/70 border-b lg:border-b-0 lg:border-r border-zinc-200/70 flex flex-col justify-between gap-4">
                                            <div className="space-y-2.5 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: pillarColor }}
                                                    />
                                                    <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                                                        {!isUnassigned && pillar.target_percentage > 0
                                                            ? `${t('Mục tiêu')} ${pillar.target_percentage}%`
                                                            : t('Trụ cột')}
                                                    </span>
                                                </div>

                                                <h2 className="font-heading text-[16px] font-medium text-zinc-900 leading-snug break-words">
                                                    {pillar.name}
                                                </h2>

                                                {pillar.description ? (
                                                    <p className="text-[12px] text-zinc-500 leading-relaxed line-clamp-2">
                                                        {pillar.description}
                                                    </p>
                                                ) : null}
                                            </div>

                                            <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-200/60 text-[12px] text-zinc-500 tabular-nums">
                                                <span>
                                                    <strong className="font-medium text-zinc-800">{items.length}</strong>{' '}
                                                    {t('góc')}
                                                </span>
                                                <span>
                                                    <strong className="font-medium text-zinc-800">
                                                        {formatNumber(pillarPosts)}
                                                    </strong>{' '}
                                                    {t('bài viết')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Right Clean Angle Rows + Inline Quick-Add */}
                                        <div className="min-w-0 flex flex-col justify-between">
                                            {items.length === 0 ? (
                                                <div className="p-6 text-[13px] text-zinc-500 flex items-center justify-between gap-3">
                                                    <span>{t('Chưa có góc khai thác nào trong trụ cột này.')}</span>
                                                </div>
                                            ) : (
                                                <ul className="divide-y divide-zinc-100">
                                                    {items.map((angle) => {
                                                        const count = counts[angle.id] || 0;
                                                        const share = pillarPosts > 0 ? percent(count, pillarPosts) : 0;
                                                        const barPct = Math.round((count / metrics.maxPostCount) * 100);
                                                        const isArchived = angle.status === 'archived';

                                                        return (
                                                            <li
                                                                key={angle.id}
                                                                onClick={() => openEditDrawer(angle)}
                                                                className={`group px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-zinc-50/70 transition-colors cursor-pointer ${
                                                                    isArchived ? 'opacity-65' : ''
                                                                }`}
                                                            >
                                                                {/* Title + Description */}
                                                                <div className="min-w-0 flex-1 space-y-0.5">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <h3 className="font-heading text-[14px] font-medium text-zinc-900 break-words">
                                                                            {angle.name}
                                                                        </h3>
                                                                        {isArchived ? (
                                                                            <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200">
                                                                                {t('Lưu trữ')}
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                    {angle.description ? (
                                                                        <p className="text-[12.5px] text-zinc-500 leading-relaxed line-clamp-1 break-words">
                                                                            {angle.description}
                                                                        </p>
                                                                    ) : (
                                                                        <p className="text-[12px] text-zinc-400 italic">
                                                                            {t('Chưa có mô tả — bấm để bổ sung hướng triển khai')}
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                {/* Usage Bar + Actions */}
                                                                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                                                                    {/* Usage indicator */}
                                                                    <div className="w-[120px] shrink-0">
                                                                        {count > 0 ? (
                                                                            <div className="space-y-1">
                                                                                <div className="flex items-center justify-between text-[11.5px] tabular-nums">
                                                                                    <span className="font-medium text-zinc-800">
                                                                                        {formatNumber(count)} {t('bài')}
                                                                                    </span>
                                                                                    <span className="font-mono text-zinc-400">
                                                                                        {share}%
                                                                                    </span>
                                                                                </div>
                                                                                <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                                                                                    <div
                                                                                        className="h-full rounded-full"
                                                                                        style={{
                                                                                            width: `${Math.max(8, barPct)}%`,
                                                                                            backgroundColor: pillarColor,
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="inline-flex items-center text-[11.5px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/70">
                                                                                {t('Chưa viết')}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Action buttons */}
                                                                    <div
                                                                        className="flex items-center gap-1"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        {!isArchived ? (
                                                                            <Link
                                                                                to={`/create?pillar_id=${encodeURIComponent(
                                                                                    angle.pillar_id || ''
                                                                                )}&angle_id=${encodeURIComponent(angle.id)}`}
                                                                                className="h-7 px-2.5 rounded-md border border-zinc-200/90 bg-white hover:border-[#d8b216] hover:bg-[#ffd631]/25 text-[11.5px] font-medium text-zinc-700 hover:text-[#2b2100] inline-flex items-center gap-1 transition-colors"
                                                                            >
                                                                                <span>{t('Viết bài')}</span>
                                                                                <ArrowRight size={12} />
                                                                            </Link>
                                                                        ) : null}

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openEditDrawer(angle)}
                                                                            title={t('Edit')}
                                                                            aria-label={t('Edit')}
                                                                            className="h-7 w-7 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-flex items-center justify-center transition-colors cursor-pointer"
                                                                        >
                                                                            <PencilSimple size={14} />
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleStatus(angle)}
                                                                            title={isArchived ? t('Restore') : t('Archive')}
                                                                            aria-label={isArchived ? t('Restore') : t('Archive')}
                                                                            className="h-7 w-7 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-flex items-center justify-center transition-colors cursor-pointer"
                                                                        >
                                                                            {isArchived ? (
                                                                                <ArrowCounterClockwise size={14} />
                                                                            ) : (
                                                                                <Archive size={14} />
                                                                            )}
                                                                        </button>

                                                                        {count === 0 ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setDeleteTarget(angle)}
                                                                                title={t('Delete angle')}
                                                                                aria-label={t('Delete angle')}
                                                                                className="h-7 w-7 rounded-md text-zinc-400 hover:text-dangerFg hover:bg-dangerBg/60 inline-flex items-center justify-center transition-colors cursor-pointer"
                                                                            >
                                                                                <Trash size={14} />
                                                                            </button>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}

                                            {/* Inline Quick-Add Footer Bar */}
                                            {!isUnassigned ? (
                                                <div className="px-5 py-2.5 border-t border-zinc-100 bg-zinc-50/35">
                                                    {isQuickAdding ? (
                                                        <form
                                                            onSubmit={(e) => handleQuickAdd(e, pillar)}
                                                            className="flex flex-wrap items-center gap-2"
                                                        >
                                                            <input
                                                                type="text"
                                                                autoFocus
                                                                value={quickAddName}
                                                                onChange={(e) => setQuickAddName(e.target.value)}
                                                                placeholder={t('Nhập tên góc khai thác rồi nhấn Enter...')}
                                                                className="flex-1 min-w-[200px] h-8 px-3 rounded-lg border border-[#d8b216] bg-white text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#ffd631]"
                                                            />
                                                            <button
                                                                type="submit"
                                                                disabled={quickAddSaving || !quickAddName.trim()}
                                                                className="h-8 px-3 rounded-lg bg-[#ffd631] hover:bg-[#ffe059] border border-[#d8b216] text-[#2b2100] text-[12px] font-medium inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                                            >
                                                                <Check size={13} weight="bold" />
                                                                <span>{t('Lưu')}</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setQuickAddPillarId(null);
                                                                    setQuickAddName('');
                                                                }}
                                                                className="h-8 px-2.5 rounded-lg text-[12px] text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
                                                            >
                                                                {t('Hủy')}
                                                            </button>
                                                        </form>
                                                    ) : (
                                                        <div className="flex items-center justify-between gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setQuickAddPillarId(pillar.id);
                                                                    setQuickAddName('');
                                                                }}
                                                                className="text-[12px] font-medium text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1.5 py-0.5 transition-colors cursor-pointer"
                                                            >
                                                                <Plus size={13} weight="bold" />
                                                                <span>{t('Thêm nhanh góc vào trụ cột này')}</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openCreateDrawer(pillar.id)}
                                                                className="text-[11.5px] text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                                                            >
                                                                {t('Mở form đầy đủ')}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    ) : (
                        /* ================================================================= */
                        /* FLAT CARD WALL (3-col, color-accented top edge, sorted by usage)  */
                        /* ================================================================= */
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {[...filteredAngles]
                                .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
                                .map((angle) => {
                                    const count = counts[angle.id] || 0;
                                    const meta = pillarMap[angle.pillar_id];
                                    const pillarColor = meta?.color || '#93C5FD';
                                    const isArchived = angle.status === 'archived';

                                    return (
                                        <article
                                            key={angle.id}
                                            onClick={() => openEditDrawer(angle)}
                                            className={`bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-2xl overflow-hidden flex flex-col justify-between transition-colors cursor-pointer ${
                                                isArchived ? 'opacity-70' : ''
                                            }`}
                                        >
                                            {/* Subtle pillar color top accent strip */}
                                            <div className="h-1 w-full" style={{ backgroundColor: pillarColor }} />

                                            <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                                                <div className="space-y-2 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-zinc-500 truncate">
                                                            <span
                                                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                                                style={{ backgroundColor: pillarColor }}
                                                            />
                                                            <span className="truncate">
                                                                {meta?.pillar?.name || t('Chưa gán trụ cột')}
                                                            </span>
                                                        </span>
                                                        {isArchived ? (
                                                            <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200 shrink-0">
                                                                {t('Lưu trữ')}
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    <h3 className="font-heading text-[15px] font-medium text-zinc-900 leading-snug break-words">
                                                        {angle.name}
                                                    </h3>

                                                    {angle.description ? (
                                                        <p className="text-[12.5px] text-zinc-500 leading-relaxed line-clamp-2 break-words">
                                                            {angle.description}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[12px] text-zinc-400 italic">
                                                            {t('Chưa có mô tả hướng triển khai')}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                                                    <span
                                                        className={`text-[12px] font-medium tabular-nums ${
                                                            count > 0
                                                                ? 'text-zinc-800'
                                                                : 'px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/70 text-[11.5px]'
                                                        }`}
                                                    >
                                                        {count > 0 ? `${formatNumber(count)} ${t('bài viết')}` : t('Chưa viết')}
                                                    </span>

                                                    <div
                                                        className="flex items-center gap-1"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {!isArchived ? (
                                                            <Link
                                                                to={`/create?pillar_id=${encodeURIComponent(
                                                                    angle.pillar_id || ''
                                                                )}&angle_id=${encodeURIComponent(angle.id)}`}
                                                                className="h-7 px-2 rounded-md text-[11.5px] font-medium text-zinc-600 hover:text-[#2b2100] hover:bg-[#ffd631]/30 inline-flex items-center gap-1 transition-colors"
                                                            >
                                                                <NotePencil size={13} weight="duotone" />
                                                                <span>{t('Viết')}</span>
                                                            </Link>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditDrawer(angle)}
                                                            aria-label={t('Edit')}
                                                            className="h-7 w-7 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-flex items-center justify-center cursor-pointer"
                                                        >
                                                            <PencilSimple size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleStatus(angle)}
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
                </>
            )}

            {/* Right-Side Slide-Over Drawer for Create / Edit Angle */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent side="right" className="w-full sm:max-w-[500px] p-0 flex flex-col bg-white">
                    <div className="px-6 py-5 border-b border-zinc-200/80">
                        <h2 className="font-heading text-[18px] font-medium text-zinc-900">
                            {editing ? t('Chỉnh sửa góc khai thác') : t('Thêm góc khai thác mới')}
                        </h2>
                        <p className="text-[12.5px] text-zinc-500 mt-0.5">
                            {editing
                                ? t('Cập nhật tên, trụ cột hoặc mô tả hướng triển khai cho góc này.')
                                : t('Gắn góc khai thác vào một trụ cột để sử dụng khi lên lịch & viết bài.')}
                        </p>
                    </div>

                    <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-clean">
                            {editing ? (
                                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 flex flex-wrap items-center justify-between gap-3">
                                    <div className="space-y-0.5">
                                        <span className="text-[11px] uppercase tracking-wider font-medium text-zinc-400">
                                            {t('Hiệu suất sử dụng')}
                                        </span>
                                        <div className="text-[13.5px] font-medium text-zinc-900 tabular-nums">
                                            {formatNumber(counts[editing.id] || 0)} {t('bài viết đã gán góc này')}
                                        </div>
                                    </div>

                                    {editing.status !== 'archived' ? (
                                        <Link
                                            to={`/create?pillar_id=${encodeURIComponent(
                                                editing.pillar_id || ''
                                            )}&angle_id=${encodeURIComponent(editing.id)}`}
                                            className="h-8 px-3 rounded-lg border border-zinc-200 bg-white hover:border-[#d8b216] hover:bg-[#ffd631]/20 text-[12px] font-medium text-zinc-800 inline-flex items-center gap-1.5 transition-colors"
                                        >
                                            <span>{t('Soạn bài ngay')}</span>
                                            <ArrowSquareOut size={13} />
                                        </Link>
                                    ) : null}
                                </div>
                            ) : null}

                            {brands.length > 1 ? (
                                <div className="space-y-1.5">
                                    <label htmlFor="angle-brand" className="label-xs block text-zinc-600 font-medium">
                                        {t('Brand')} <span className="text-dangerFg">*</span>
                                    </label>
                                    <select
                                        id="angle-brand"
                                        value={form.brand_id}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                brand_id: e.target.value,
                                                pillar_id: '',
                                            }))
                                        }
                                        required
                                        className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13.5px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216]"
                                    >
                                        <option value="">{t('Chọn thương hiệu...')}</option>
                                        {brands.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : null}

                            <div className="space-y-2">
                                <label htmlFor="angle-pillar" className="label-xs block text-zinc-600 font-medium">
                                    {t('Trụ cột nội dung')} <span className="text-dangerFg">*</span>
                                </label>
                                <select
                                    id="angle-pillar"
                                    value={form.pillar_id}
                                    onChange={(e) => setForm((prev) => ({ ...prev, pillar_id: e.target.value }))}
                                    required
                                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13.5px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216]"
                                >
                                    <option value="">{t('Chọn trụ cột...')}</option>
                                    {drawerPillars.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.target_percentage || 0}%)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="angle-name" className="label-xs block text-zinc-600 font-medium">
                                    {t('Tên góc khai thác')} <span className="text-dangerFg">*</span>
                                </label>
                                <input
                                    id="angle-name"
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder={t('Ví dụ: Hướng dẫn từng bước, Sai lầm thường gặp...')}
                                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216]"
                                />
                            </div>

                            {!editing ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-zinc-500">
                                        <Sparkle size={13} weight="duotone" className="text-amber-600" />
                                        <span>{t('Gợi ý nhanh (bấm để điền)')}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {QUICK_ANGLE_PRESETS.map((preset) => (
                                            <button
                                                key={preset.name}
                                                type="button"
                                                onClick={() =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        name: preset.name,
                                                        description: preset.description,
                                                    }))
                                                }
                                                className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-[#ffd631]/20 hover:border-[#d8b216] text-[11.5px] text-zinc-700 hover:text-[#2b2100] transition-colors cursor-pointer"
                                            >
                                                {preset.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            <div className="space-y-1.5">
                                <label htmlFor="angle-desc" className="label-xs block text-zinc-600 font-medium">
                                    {t('Mô tả hướng triển khai')}
                                </label>
                                <textarea
                                    id="angle-desc"
                                    rows={4}
                                    value={form.description}
                                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder={t(
                                        'Mô tả ngắn cách mở bài, cấu trúc luận điểm hoặc giọng điệu mong muốn khi viết theo góc này...'
                                    )}
                                    className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-[13.5px] text-zinc-900 placeholder:text-zinc-400 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216] resize-y"
                                />
                            </div>

                            {editing ? (
                                <div className="space-y-1.5">
                                    <span className="label-xs block text-zinc-600 font-medium">
                                        {t('Trạng thái')}
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { value: 'active', label: t('Đang dùng') },
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

                        <div className="px-6 py-4 border-t border-zinc-200/80 bg-zinc-50/70 flex items-center justify-between gap-3">
                            <div>
                                {editing && (counts[editing.id] || 0) === 0 ? (
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
                                            : t('Tạo góc khai thác')}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(value) => !value && setDeleteTarget(null)}
                title={t('Delete “{value1}”?', { value1: deleteTarget?.name })}
                description={t('The angle will no longer be offered when composing posts.')}
                confirmLabel={t('Delete angle')}
                destructive
                onConfirm={remove}
            />
        </div>
    );
}
