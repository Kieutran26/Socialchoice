import LoadError from '@/components/common/load-error';
import { requireNoTemplateReferences } from '@/lib/post-templates';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Plus,
    Compass,
    PencilSimple,
    Archive,
    ArrowCounterClockwise,
    Trash,
    Columns,
    Kanban,
    MagnifyingGlass,
    Folder,
    PlusCircle,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import AngleForm from '@/components/strategy/AngleForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

const PASTEL_PALETTE = [
    { color: '#93C5FD', label: 'Pastel Blue', border: 'border-blue-200/80', bg: 'bg-blue-50/70', text: 'text-blue-700', activeBg: 'bg-blue-50/90' },
    { color: '#C4B5FD', label: 'Pastel Lavender', border: 'border-purple-200/80', bg: 'bg-purple-50/70', text: 'text-purple-700', activeBg: 'bg-purple-50/90' },
    { color: '#FED7AA', label: 'Pastel Peach', border: 'border-amber-200/80', bg: 'bg-amber-50/70', text: 'text-amber-700', activeBg: 'bg-amber-50/90' },
    { color: '#A7F3D0', label: 'Pastel Mint', border: 'border-emerald-200/80', bg: 'bg-emerald-50/70', text: 'text-emerald-700', activeBg: 'bg-emerald-50/90' },
    { color: '#FBCFE8', label: 'Pastel Rose', border: 'border-rose-200/80', bg: 'bg-rose-50/70', text: 'text-rose-700', activeBg: 'bg-rose-50/90' },
    { color: '#FEF08A', label: 'Pastel Butter', border: 'border-yellow-200/80', bg: 'bg-yellow-50/70', text: 'text-yellow-800', activeBg: 'bg-yellow-50/90' },
    { color: '#99F6E4', label: 'Pastel Seafoam', border: 'border-teal-200/80', bg: 'bg-teal-50/70', text: 'text-teal-700', activeBg: 'bg-teal-50/90' },
];

const getPastelForPillar = (pillar, index = 0) => {
    const name = (pillar?.name || '').toLowerCase();
    if (name.includes('awareness') || name.includes('nhận diện') || name.includes('thương hiệu')) {
        return PASTEL_PALETTE[0];
    }
    if (name.includes('community') || name.includes('cộng đồng') || name.includes('engagement')) {
        return PASTEL_PALETTE[1];
    }
    if (name.includes('customer') || name.includes('khách hàng') || name.includes('stories') || name.includes('câu chuyện')) {
        return PASTEL_PALETTE[2];
    }
    if (name.includes('education') || name.includes('kiến thức') || name.includes('sản phẩm') || name.includes('product')) {
        return PASTEL_PALETTE[3];
    }
    if (name.includes('promotion') || name.includes('quảng bá') || name.includes('bán hàng') || name.includes('culture')) {
        return PASTEL_PALETTE[4];
    }
    return PASTEL_PALETTE[index % PASTEL_PALETTE.length];
};

export default function ContentAngles() {
    const { t } = useTranslation();
    const { scope, brands, selectedBrandId, demoMode } = useWorkspace();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [counts, setCounts] = useState({});

    // View Options: 'explorer' (Option B - Hai cột) | 'kanban' (Option C - Ma trận 5 Cột)
    const [viewMode, setViewMode] = useState('explorer');
    const [selectedPillarId, setSelectedPillarId] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Dialog state
    const [formOpen, setFormOpen] = useState(false);
    const [formPillarId, setFormPillarId] = useState('');
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [pillarPage, anglePage, agg] = await Promise.all([
                appClient.entities.ContentPillar.filter(scope, { sort: 'name', limit: 300 }),
                appClient.entities.ContentAngle.filter(scope, { sort: 'name', limit: 500 }),
                appClient.entities.Post.aggregate({ query: scope, groupBy: 'angle_id' }),
            ]);
            setPillars(pillarPage.items);
            setAngles(anglePage.items);
            setCounts(Object.fromEntries(agg.rows.map((row) => [row.angle_id, row.count])));
        } catch (error) {
            setLoadError(error.message);
        } finally {
            setLoading(false);
        }
    }, [scope]);

    useEffect(() => {
        load();
    }, [load]);

    const save = async (values) => {
        if (editing) {
            await appClient.entities.ContentAngle.update(editing.id, values);
        } else {
            await appClient.entities.ContentAngle.create({ ...values, is_demo: demoMode });
        }
        toast({ title: editing ? t("Angle updated") : t("Angle created") });
        setFormOpen(false);
        setEditing(null);
        setFormPillarId('');
        load();
    };

    const toggleStatus = async (angle) => {
        try {
            const status = angle.status === 'archived' ? 'active' : 'archived';
            await appClient.entities.ContentAngle.update(angle.id, { status });
            toast({ title: status === 'archived' ? t("Angle archived") : t("Angle restored") });
            load();
        } catch (error) {
            toast({ variant: 'destructive', title: t('Unable to update strategy'), description: t(error.message) });
        }
    };

    const remove = async () => {
        await requireNoTemplateReferences(appClient.entities.PostTemplate, 'angle_id', deleteTarget, t);
        await appClient.entities.ContentAngle.delete(deleteTarget.id);
        toast({ title: t("Angle deleted") });
        setDeleteTarget(null);
        load();
    };

    // Calculate posts count per pillar
    const pillarMetrics = useMemo(() => {
        const metrics = {};
        pillars.forEach((p) => {
            const pAngles = angles.filter((a) => a.pillar_id === p.id);
            const totalPosts = pAngles.reduce((sum, a) => sum + (counts[a.id] || 0), 0);
            metrics[p.id] = {
                anglesCount: pAngles.length,
                postsCount: totalPosts,
            };
        });
        return metrics;
    }, [pillars, angles, counts]);

    // Active pillar for Explorer view
    const activePillar = useMemo(() => {
        if (selectedPillarId === 'all') return null;
        return pillars.find((p) => p.id === selectedPillarId) || null;
    }, [selectedPillarId, pillars]);

    // Filtered angles according to filters
    const filteredAngles = useMemo(() => {
        return angles.filter((angle) => {
            if (selectedPillarId !== 'all' && angle.pillar_id !== selectedPillarId) {
                return false;
            }
            if (statusFilter !== 'all' && (angle.status || 'active') !== statusFilter) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = angle.name?.toLowerCase().includes(q);
                const matchDesc = angle.description?.toLowerCase().includes(q);
                return matchName || matchDesc;
            }
            return true;
        });
    }, [angles, selectedPillarId, statusFilter, searchQuery]);

    const handleCreateAngle = (preselectedPillarId = '') => {
        setEditing(null);
        setFormPillarId(preselectedPillarId || (selectedPillarId !== 'all' ? selectedPillarId : ''));
        setFormOpen(true);
    };

    const handleEditAngle = (angle) => {
        setEditing(angle);
        setFormPillarId(angle.pillar_id);
        setFormOpen(true);
    };

    if (loadError) return <LoadError message={loadError} onRetry={load} />;

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            {/* Page Header with View Switcher & Action */}
            <PageHeader
                title={t("Content Angles")}
                description={t("Each angle sits under a pillar and describes how that theme gets written — the composer only offers angles that belong to the selected pillar.")}
                actions={
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* View Switcher: Option B (Hai cột) & Option C (Ma trận Kanban) */}
                        <div className="inline-flex items-center p-1 bg-neutral-100 rounded-xl border border-neutral-200/80 shadow-2xs">
                            <button
                                type="button"
                                onClick={() => setViewMode('explorer')}
                                className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                                    viewMode === 'explorer'
                                        ? 'bg-foreground text-background shadow-xs'
                                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                                }`}
                                title="Chế độ Hai cột Master / Detail"
                            >
                                <Columns size={15} weight={viewMode === 'explorer' ? 'fill' : 'regular'} />
                                <span>{t("Two-Column Explorer")}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setViewMode('kanban')}
                                className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                                    viewMode === 'kanban'
                                        ? 'bg-foreground text-background shadow-xs'
                                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                                }`}
                                title="Chế độ Ma trận Kanban 5 Cột"
                            >
                                <Kanban size={15} weight={viewMode === 'kanban' ? 'fill' : 'regular'} />
                                <span>{t("Kanban Matrix")}</span>
                            </button>
                        </div>

                        {/* Primary Action Button */}
                        <button
                            type="button"
                            onClick={() => handleCreateAngle()}
                            className="btn-skew"
                        >
                            <Plus size={16} weight="bold" />
                            <span>{t("New angle")}</span>
                        </button>
                    </div>
                }
            />

            {/* Quick Filter & Search Bar */}
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2.5 max-w-md">
                    <div className="relative w-full">
                        <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t("Search angles by name or description...")}
                            className="pl-9 h-9 text-xs rounded-xl border-neutral-200 bg-neutral-50/50 focus:bg-white focus:border-neutral-900 transition"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 justify-end">
                    {/* Status Filter Tabs */}
                    <div className="inline-flex items-center p-0.5 bg-neutral-100 rounded-lg border border-neutral-200/70 text-xs">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium transition cursor-pointer ${
                                statusFilter === 'all' ? 'bg-white text-neutral-900 shadow-2xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
                            }`}
                        >
                            {t("All")}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('active')}
                            className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium transition cursor-pointer ${
                                statusFilter === 'active' ? 'bg-white text-neutral-900 shadow-2xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
                            }`}
                        >
                            {t("Active")}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('archived')}
                            className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium transition cursor-pointer ${
                                statusFilter === 'archived' ? 'bg-white text-neutral-900 shadow-2xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
                            }`}
                        >
                            {t("Archived")}
                        </button>
                    </div>

                    <span className="text-xs text-neutral-500 font-mono hidden md:inline">
                        {angles.length} {t("angles")} · {pillars.length} {t("pillars")}
                    </span>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-4 space-y-3">
                        <Skeleton className="h-16 rounded-2xl" />
                        <Skeleton className="h-20 rounded-2xl" />
                        <Skeleton className="h-20 rounded-2xl" />
                    </div>
                    <div className="lg:col-span-8">
                        <Skeleton className="h-[380px] rounded-2xl" />
                    </div>
                </div>
            ) : !angles.length ? (
                <EmptyState
                    icon={Compass}
                    title={t("No angles defined yet")}
                    description={t("Add angles to a pillar so writers know exactly how to approach the theme — How-to, Common Mistakes or Myth vs Fact are good starting points.")}
                >
                    <button
                        type="button"
                        onClick={() => handleCreateAngle()}
                        className="btn-skew"
                    >
                        <Plus size={16} weight="bold" />
                        <span>{t("Create an angle")}</span>
                    </button>
                </EmptyState>
            ) : viewMode === 'explorer' ? (
                /* ========================================================================= */
                /* OPTION B: TWO-COLUMN EXPLORER (MASTER 30% / DETAIL 70%)                   */
                /* ========================================================================= */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Pillar Navigator (Master) */}
                    <div className="lg:col-span-4 bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                                {t("Content Pillars")}
                            </h3>
                            <span className="text-[11px] font-mono text-neutral-500">
                                {pillars.length} {t("pillars")}
                            </span>
                        </div>

                        {/* All Pillars Selection Card */}
                        <div
                            onClick={() => setSelectedPillarId('all')}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                selectedPillarId === 'all'
                                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                                    : 'bg-neutral-50/70 border-neutral-200/70 hover:bg-neutral-100 hover:border-neutral-300'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold flex items-center gap-2">
                                    <Folder size={15} weight={selectedPillarId === 'all' ? 'fill' : 'regular'} />
                                    <span>{t("All pillars")}</span>
                                </span>
                                <span
                                    className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md ${
                                        selectedPillarId === 'all' ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-200/80 text-neutral-700'
                                    }`}
                                >
                                    {angles.length} {t("angles")}
                                </span>
                            </div>
                            <p className={`text-[11px] mt-1 ${selectedPillarId === 'all' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                                {t("Displaying all strategy angles across the entire brand")}
                            </p>
                        </div>

                        {/* Pillar List Items */}
                        <div className="space-y-2 pt-1">
                            {pillars.map((pillar, idx) => {
                                const pastel = getPastelForPillar(pillar, idx);
                                const isSelected = selectedPillarId === pillar.id;
                                const metric = pillarMetrics[pillar.id] || { anglesCount: 0, postsCount: 0 };

                                return (
                                    <div
                                        key={pillar.id}
                                        onClick={() => setSelectedPillarId(pillar.id)}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1 ${
                                            isSelected
                                                ? `${pastel.activeBg} ${pastel.border} shadow-2xs`
                                                : 'bg-white hover:bg-neutral-50/80 border-neutral-200/70 hover:border-neutral-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-neutral-900 flex items-center gap-2">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                                                    style={{ backgroundColor: pillar.color || pastel.color }}
                                                />
                                                <span className="truncate">{pillar.name}</span>
                                            </span>
                                            <span
                                                className={`text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-md border ${pastel.bg} ${pastel.text} ${pastel.border}`}
                                            >
                                                {metric.anglesCount} {t("angles")}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5">
                                            <span>
                                                {t("Target")} {pillar.target_percentage || 0}%
                                            </span>
                                            <span className="font-mono text-neutral-400">
                                                {metric.postsCount} {t("posts")}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Column: Angles Detail Workbench (Detail) */}
                    <div className="lg:col-span-8 bg-white border border-neutral-200/80 rounded-2xl shadow-2xs overflow-hidden">
                        {/* Workbench Header */}
                        <div className="p-4 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/60">
                            <div className="flex items-center gap-2.5 min-w-0">
                                {activePillar ? (
                                    <>
                                        <span
                                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                                            style={{ backgroundColor: activePillar.color || getPastelForPillar(activePillar).color }}
                                        />
                                        <div>
                                            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                                                <span>{activePillar.name}</span>
                                                <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-neutral-200/80 text-neutral-800 font-bold">
                                                    {filteredAngles.length} {t("angles")}
                                                </span>
                                            </h3>
                                            <p className="text-[11px] text-neutral-500 mt-0.5">
                                                {t("Target")} {activePillar.target_percentage || 0}% · {pillarMetrics[activePillar.id]?.postsCount || 0} {t("posts written")}
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                                            <span>{t("All Content Angles")}</span>
                                            <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-neutral-200/80 text-neutral-800 font-bold">
                                                {filteredAngles.length} {t("angles")}
                                            </span>
                                        </h3>
                                        <p className="text-[11px] text-neutral-500 mt-0.5">
                                            {t("Select a pillar on the left to focus or manage angles directly")}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => handleCreateAngle(activePillar?.id)}
                                className="h-8 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                            >
                                <Plus size={14} weight="bold" />
                                <span>{activePillar ? t("Add angle to this pillar") : t("New angle")}</span>
                            </button>
                        </div>

                        {/* Angles Table */}
                        {!filteredAngles.length ? (
                            <div className="p-12 text-center space-y-3">
                                <Compass size={36} className="mx-auto text-neutral-300" />
                                <p className="text-xs font-semibold text-neutral-700">
                                    {t("No angles found matching your criteria")}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => handleCreateAngle(activePillar?.id)}
                                    className="h-8 px-3.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Plus size={14} weight="bold" />
                                    <span>{t("Create first angle")}</span>
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-neutral-100 bg-neutral-50/80 text-neutral-500 font-semibold text-[11px]">
                                            <th className="p-3.5 pl-5">{t("Angle Name")}</th>
                                            {selectedPillarId === 'all' ? <th className="p-3.5">{t("Pillar")}</th> : null}
                                            <th className="p-3.5">{t("Implementation Description")}</th>
                                            <th className="p-3.5 w-28 text-center">{t("Posts")}</th>
                                            <th className="p-3.5 pr-5 w-36 text-right">{t("Actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {filteredAngles.map((angle) => {
                                            const count = counts[angle.id] || 0;
                                            const parentPillar = pillars.find((p) => p.id === angle.pillar_id);
                                            const pastel = getPastelForPillar(parentPillar);

                                            return (
                                                <tr key={angle.id} className="hover:bg-neutral-50/60 transition-colors group">
                                                    <td className="p-3.5 pl-5 align-top">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-neutral-900">{angle.name}</span>
                                                            {angle.status === 'archived' ? (
                                                                <StatusBadge tone="neutral">{t("Archived")}</StatusBadge>
                                                            ) : null}
                                                        </div>
                                                    </td>

                                                    {selectedPillarId === 'all' ? (
                                                        <td className="p-3.5 align-top">
                                                            {parentPillar ? (
                                                                <span
                                                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-semibold border ${pastel.bg} ${pastel.text} ${pastel.border}`}
                                                                >
                                                                    <span
                                                                        className="w-1.5 h-1.5 rounded-full"
                                                                        style={{ backgroundColor: parentPillar.color || pastel.color }}
                                                                    />
                                                                    <span className="truncate max-w-[130px]">{parentPillar.name}</span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-neutral-400 text-[11px]">—</span>
                                                            )}
                                                        </td>
                                                    ) : null}

                                                    <td className="p-3.5 align-top text-neutral-500 text-[11.5px] max-w-xs">
                                                        {angle.description ? (
                                                            <p className="line-clamp-2 leading-relaxed">{angle.description}</p>
                                                        ) : (
                                                            <span className="italic text-neutral-400">{t("No description provided")}</span>
                                                        )}
                                                    </td>

                                                    <td className="p-3.5 align-top text-center">
                                                        <span
                                                            className={`inline-block px-2.5 py-0.5 rounded-md font-mono text-[11px] font-bold border ${
                                                                count > 0 ? `${pastel.bg} ${pastel.text} ${pastel.border}` : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                                                            }`}
                                                        >
                                                            {count} {t("posts")}
                                                        </span>
                                                    </td>

                                                    <td className="p-3.5 pr-5 align-top text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2 rounded-lg text-[11.5px] text-neutral-700 hover:text-neutral-900"
                                                                onClick={() => handleEditAngle(angle)}
                                                                title={t("Edit")}
                                                            >
                                                                <PencilSimple size={13} className="mr-1" />
                                                                <span>{t("Edit")}</span>
                                                            </Button>

                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2 rounded-lg text-[11.5px] text-neutral-600 hover:text-neutral-900"
                                                                onClick={() => toggleStatus(angle)}
                                                                title={angle.status === 'archived' ? t("Restore") : t("Archive")}
                                                            >
                                                                {angle.status === 'archived' ? (
                                                                    <>
                                                                        <ArrowCounterClockwise size={13} className="mr-1" />
                                                                        <span>{t("Restore")}</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Archive size={13} className="mr-1" />
                                                                        <span>{t("Archive")}</span>
                                                                    </>
                                                                )}
                                                            </Button>

                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 w-7 p-0 rounded-lg text-dangerFg hover:text-dangerFg disabled:opacity-30"
                                                                disabled={count > 0}
                                                                title={count > 0 ? t("Posts reference this angle — archive it instead.") : t("Delete angle")}
                                                                onClick={() => setDeleteTarget(angle)}
                                                            >
                                                                <Trash size={13} />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* ========================================================================= */
                /* OPTION C: KANBAN STRATEGY MATRIX (5 CỘT DÀN NGANG)                        */
                /* ========================================================================= */
                <div className="space-y-4">
                    <div className="p-3 bg-neutral-100/80 border border-neutral-200/80 rounded-xl text-xs text-neutral-600 flex flex-wrap items-center justify-between gap-2">
                        <span>
                            <strong>{t("Kanban Strategy Matrix:")}</strong>{' '}
                            {t("Full-view overview of all content angles distributed across your pillars. Easily spot content gaps and balance angles.")}
                        </span>
                        <span className="font-mono text-neutral-500 text-[11px]">
                            {filteredAngles.length} {t("angles displayed")}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
                        {pillars.map((pillar, idx) => {
                            const pastel = getPastelForPillar(pillar, idx);
                            const items = filteredAngles.filter((a) => a.pillar_id === pillar.id);
                            const totalPosts = items.reduce((sum, a) => sum + (counts[a.id] || 0), 0);

                            return (
                                <div
                                    key={pillar.id}
                                    className="p-3.5 bg-white border border-neutral-200/80 rounded-2xl shadow-2xs space-y-3 flex flex-col justify-between min-h-[320px]"
                                >
                                    <div>
                                        {/* Column Header */}
                                        <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                                                    style={{ backgroundColor: pillar.color || pastel.color }}
                                                />
                                                <h4 className="text-xs font-bold text-neutral-900 truncate" title={pillar.name}>
                                                    {pillar.name}
                                                </h4>
                                            </div>
                                            <span
                                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${pastel.bg} ${pastel.text} ${pastel.border}`}
                                            >
                                                {items.length}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-[10.5px] text-neutral-500 py-1.5">
                                            <span>{t("Target")} {pillar.target_percentage || 0}%</span>
                                            <span className="font-mono text-neutral-400">{totalPosts} {t("posts")}</span>
                                        </div>

                                        {/* Angle Cards Stack */}
                                        <div className="space-y-2 mt-2">
                                            {!items.length ? (
                                                <div className="p-4 rounded-xl border border-dashed border-neutral-200 text-center text-[11px] text-neutral-400 italic">
                                                    {t("No angles in this pillar")}
                                                </div>
                                            ) : (
                                                items.map((angle) => {
                                                    const count = counts[angle.id] || 0;
                                                    return (
                                                        <div
                                                            key={angle.id}
                                                            className="p-3 rounded-xl border border-neutral-200/80 bg-neutral-50/50 hover:bg-white hover:border-neutral-300 hover:shadow-2xs transition-all space-y-2 group"
                                                        >
                                                            <div className="flex items-start justify-between gap-1.5">
                                                                <h5 className="font-bold text-neutral-900 text-[11.5px] leading-snug">
                                                                    {angle.name}
                                                                </h5>
                                                                <span
                                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 border ${
                                                                        count > 0 ? `${pastel.bg} ${pastel.text} ${pastel.border}` : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                                                                    }`}
                                                                >
                                                                    {count}
                                                                </span>
                                                            </div>

                                                            {angle.description ? (
                                                                <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                                                                    {angle.description}
                                                                </p>
                                                            ) : null}

                                                            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[11px]">
                                                                <div>
                                                                    {angle.status === 'archived' ? (
                                                                        <span className="text-[9.5px] uppercase font-bold text-neutral-400">
                                                                            {t("Archived")}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] font-mono text-neutral-400">
                                                                            active
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleEditAngle(angle)}
                                                                        className="text-neutral-700 hover:text-neutral-900 text-[11px] font-medium hover:underline cursor-pointer"
                                                                    >
                                                                        {t("Edit")}
                                                                    </button>
                                                                    <span className="text-neutral-300">·</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleStatus(angle)}
                                                                        className="text-neutral-500 hover:text-neutral-900 text-[11px] cursor-pointer"
                                                                    >
                                                                        {angle.status === 'archived' ? t("Restore") : t("Archive")}
                                                                    </button>
                                                                    {count === 0 ? (
                                                                        <>
                                                                            <span className="text-neutral-300">·</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setDeleteTarget(angle)}
                                                                                className="text-dangerFg hover:opacity-80 text-[11px] cursor-pointer"
                                                                            >
                                                                                <Trash size={12} />
                                                                            </button>
                                                                        </>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* Column Bottom Add Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleCreateAngle(pillar.id)}
                                        className="w-full py-2 rounded-xl border border-dashed border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer mt-3"
                                    >
                                        <PlusCircle size={14} weight="duotone" />
                                        <span>{t("Add angle")}</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Dialog Form for Create / Edit Angle */}
            <AngleForm
                open={formOpen}
                onOpenChange={setFormOpen}
                brands={brands}
                pillars={pillars}
                initial={editing}
                defaultBrandId={selectedBrandId === 'all' ? '' : selectedBrandId}
                defaultPillarId={formPillarId || (selectedPillarId === 'all' ? '' : selectedPillarId)}
                onSubmit={save}
            />

            {/* Confirmation Dialog for Delete */}
            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(value) => !value && setDeleteTarget(null)}
                title={t("Delete “{value1}”?", { value1: deleteTarget?.name })}
                description={t("The angle will no longer be offered when composing posts.")}
                confirmLabel={t("Delete angle")}
                destructive
                onConfirm={remove}
            />
        </div>
    );
}
