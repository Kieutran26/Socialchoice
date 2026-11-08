import LoadError from '@/components/common/load-error';
import { requireNoTemplateReferences } from '@/lib/post-templates';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Plus,
    Stack,
    PencilSimple,
    Archive,
    ArrowCounterClockwise,
    Trash,
    TreeStructure,
    FileText,
    Check,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import PillarForm from '@/components/strategy/PillarForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { percent } from '@/lib/format';

const PASTEL_PALETTE = [
    { color: '#93C5FD', label: 'Pastel Blue', border: 'border-blue-200/80', bg: 'bg-blue-50/70', text: 'text-blue-700' },
    { color: '#C4B5FD', label: 'Pastel Lavender', border: 'border-purple-200/80', bg: 'bg-purple-50/70', text: 'text-purple-700' },
    { color: '#FED7AA', label: 'Pastel Peach', border: 'border-amber-200/80', bg: 'bg-amber-50/70', text: 'text-amber-700' },
    { color: '#A7F3D0', label: 'Pastel Mint', border: 'border-emerald-200/80', bg: 'bg-emerald-50/70', text: 'text-emerald-700' },
    { color: '#FBCFE8', label: 'Pastel Rose', border: 'border-rose-200/80', bg: 'bg-rose-50/70', text: 'text-rose-700' },
    { color: '#FEF08A', label: 'Pastel Butter', border: 'border-yellow-200/80', bg: 'bg-yellow-50/70', text: 'text-yellow-800' },
    { color: '#99F6E4', label: 'Pastel Seafoam', border: 'border-teal-200/80', bg: 'bg-teal-50/70', text: 'text-teal-700' },
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

export default function ContentPillars() {
    const { t } = useTranslation();
    const { scope, brands, selectedBrandId, demoMode } = useWorkspace();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [counts, setCounts] = useState({});
    const [total, setTotal] = useState(0);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [pillarPage, anglePage, agg, totalCount] = await Promise.all([
                appClient.entities.ContentPillar.filter(scope, { sort: 'name', limit: 300 }),
                appClient.entities.ContentAngle.filter(scope, { limit: 500, fields: ['id', 'pillar_id'] }),
                appClient.entities.Post.aggregate({ query: scope, groupBy: 'pillar_id' }),
                appClient.entities.Post.count(scope),
            ]);
            setPillars(pillarPage.items);
            setAngles(anglePage.items);
            setCounts(Object.fromEntries(agg.rows.map((row) => [row.pillar_id, row.count])));
            setTotal(totalCount);
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
            await appClient.entities.ContentPillar.update(editing.id, values);
        } else {
            await appClient.entities.ContentPillar.create({ ...values, is_demo: demoMode });
        }
        toast({ title: editing ? t('Pillar updated') : t('Pillar created') });
        setFormOpen(false);
        setEditing(null);
        load();
    };

    const toggleStatus = async (pillar) => {
        try {
            const status = pillar.status === 'archived' ? 'active' : 'archived';
            await appClient.entities.ContentPillar.update(pillar.id, { status });
            toast({ title: status === 'archived' ? t('Pillar archived') : t('Pillar restored') });
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
        await requireNoTemplateReferences(appClient.entities.PostTemplate, 'pillar_id', deleteTarget, t);
        await appClient.entities.ContentPillar.delete(deleteTarget.id);
        toast({ title: t('Pillar deleted') });
        setDeleteTarget(null);
        load();
    };

    const groups =
        selectedBrandId === 'all'
            ? brands
                .map((brand) => ({ brand, items: pillars.filter((pillar) => pillar.brand_id === brand.id) }))
                .filter((group) => group.items.length)
            : [{ brand: brands.find((b) => b.id === selectedBrandId), items: pillars }];

    const activePillars = pillars.filter((pillar) => pillar.status === 'active');
    const targetTotal = activePillars.reduce((sum, pillar) => sum + (pillar.target_percentage || 0), 0);

    if (loadError) return <LoadError message={loadError} onRetry={load} />;

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('Content Pillars')}
                description={t('Define the themes each brand publishes around, then set the share of content each theme should receive.')}
                actions={
                    <button
                        type="button"
                        className="btn-skew"
                        onClick={() => {
                            setEditing(null);
                            setFormOpen(true);
                        }}
                    >
                        <Plus size={16} weight="bold" />
                        <span>{t('New pillar')}</span>
                    </button>
                }
            />

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-[180px] rounded-2xl" />
                    <Skeleton className="h-[180px] rounded-2xl" />
                    <Skeleton className="h-[180px] rounded-2xl" />
                    <Skeleton className="h-[180px] rounded-2xl" />
                </div>
            ) : !pillars.length ? (
                <EmptyState
                    icon={Stack}
                    title={t('No pillars yet')}
                    description={t('Start with three to five themes — for example Product Education, Customer Stories and Community Engagement — and set a target share for each.')}
                >
                    <Button variant="outline" type="button" className="rounded-xl" onClick={() => setFormOpen(true)}>
                        <Plus size={15} weight="bold" />
                        <span>{t('Create the first pillar')}</span>
                    </Button>
                </EmptyState>
            ) : (
                <div className="space-y-6">
                    {/* OPTION A: TOP STRATEGY HUD BAR (BENTO OVERVIEW) */}
                    <div className="p-5 bg-white border border-neutral-200 rounded-2xl shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 border border-neutral-200 shrink-0">
                                    <Stack size={18} weight="bold" />
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-neutral-900">
                                        {t('Phân bổ tổng thể 100% mục tiêu chiến lược')}
                                    </h3>
                                    <p className="text-xs text-neutral-500 mt-0.5">
                                        {activePillars.length} {t('trụ cột đang hoạt động')} ·{' '}
                                        {targetTotal === 100
                                            ? t('Phân bổ cân bằng hoàn hảo 100%')
                                            : t('Mục tiêu hiện tại: {total}% (hướng tới 100%)', { total: targetTotal })
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <span className="px-3 py-1 rounded-lg bg-neutral-900 text-white font-mono text-xs font-semibold shadow-2xs">
                                    {targetTotal}% {t('Mục tiêu')}
                                </span>
                                <span className="px-3 py-1 rounded-lg bg-neutral-100 text-neutral-800 font-mono text-xs font-semibold border border-neutral-200">
                                    {total} {t('bài viết')}
                                </span>
                            </div>
                        </div>

                        {/* Full-Width Stacked 100% Bar (Pastel Palette) */}
                        <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden flex border border-neutral-200 shadow-2xs">
                            {activePillars.map((pillar, idx) => {
                                const pastel = getPastelForPillar(pillar, idx);
                                return (
                                    <div
                                        key={pillar.id}
                                        style={{
                                            width: `${pillar.target_percentage || 0}%`,
                                            backgroundColor: pastel.color,
                                        }}
                                        className="h-full transition-all duration-500"
                                        title={`${pillar.name}: ${pillar.target_percentage}%`}
                                    />
                                );
                            })}
                        </div>

                        {/* Legend Chips (Pastel Dots) */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-neutral-600 pt-1">
                            {activePillars.map((pillar, idx) => {
                                const pastel = getPastelForPillar(pillar, idx);
                                return (
                                    <span key={pillar.id} className="flex items-center gap-1.5">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                                            style={{ backgroundColor: pastel.color }}
                                        />
                                        <span className="font-semibold text-neutral-800">{pillar.name}</span>
                                        <span className="font-mono text-neutral-500">({pillar.target_percentage || 0}%)</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* OPTION A: BENTO GRID PER BRAND */}
                    {groups.map((group) => (
                        <section key={group.brand?.id || 'all'} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="h-3 w-3 rounded-full shrink-0 shadow-2xs"
                                        style={{ backgroundColor: group.brand?.color || '#93C5FD' }}
                                    />
                                    <h2 className="text-sm font-bold text-neutral-900 font-heading">
                                        {group.brand?.name || t('All brands')}
                                    </h2>
                                    <span className="text-xs text-neutral-500">
                                        ({group.items.length} {t('trụ cột')})
                                    </span>
                                </div>

                                <Link
                                    to="/strategy/angles"
                                    className="text-xs text-neutral-600 hover:text-neutral-900 font-medium underline"
                                >
                                    {t('Xem góc tiếp cận')} →
                                </Link>
                            </div>

                            {/* 2-Column Bento Strategy Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {group.items.map((pillar, idx) => {
                                    const count = counts[pillar.id] || 0;
                                    const angleCount = angles.filter((angle) => angle.pillar_id === pillar.id).length;
                                    const blocking = count > 0 || angleCount > 0;
                                    const target = pillar.target_percentage || 0;
                                    const actual = percent(count, total);
                                    const diff = actual - target;
                                    const isBalanced = Math.abs(diff) <= 2;
                                    const isOver = diff > 2;
                                    const isUnder = diff < -2;
                                    const pastel = getPastelForPillar(pillar, idx);

                                    return (
                                        <div
                                            key={pillar.id}
                                            className="p-5 bg-white border border-neutral-200 rounded-2xl shadow-2xs hover:border-neutral-300 transition-all flex flex-col justify-between space-y-4"
                                        >
                                            {/* Card Header: Brand pastel dot, Name, Description, Pastel Status Badge */}
                                            <div className="space-y-2">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <span
                                                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs ring-2 ring-white"
                                                            style={{ backgroundColor: pastel.color }}
                                                        />
                                                        <div className="min-w-0">
                                                            <h4 className="text-sm font-bold text-neutral-900 truncate" title={pillar.name}>
                                                                {pillar.name}
                                                            </h4>
                                                        </div>
                                                    </div>

                                                    {/* Badge Status in Harmonious Pastel Shades */}
                                                    <div className="shrink-0">
                                                        {pillar.status === 'archived' ? (
                                                            <StatusBadge tone="neutral">{t('Archived')}</StatusBadge>
                                                        ) : isBalanced ? (
                                                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/90 text-emerald-700 font-semibold text-[10.5px] shadow-2xs flex items-center gap-1">
                                                                <Check size={11} weight="bold" />
                                                                <span>{t('Cân bằng')}</span>
                                                            </span>
                                                        ) : isOver ? (
                                                            <span className="px-2.5 py-0.5 rounded-md bg-sky-50 border border-sky-200/90 text-sky-700 font-semibold text-[10.5px]">
                                                                +{Math.round(diff)}% {t('Vượt')}
                                                            </span>
                                                        ) : isUnder ? (
                                                            <span className="px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200/90 text-rose-700 font-semibold text-[10.5px]">
                                                                {Math.round(diff)}% {t('Thiếu')}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                {pillar.description && (
                                                    <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                                                        {pillar.description}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Card Middle: Comparison Progress Bar in Pastel */}
                                            <div className="space-y-1.5 pt-1">
                                                <div className="flex items-baseline justify-between text-xs">
                                                    <span className="text-neutral-500 text-[11px]">
                                                        {t('Thực tế')}:{' '}
                                                        <strong className="text-neutral-900 font-bold font-mono">
                                                            {actual}%
                                                        </strong>{' '}
                                                        ({count} {t('bài')})
                                                    </span>
                                                    <span className="text-neutral-500 text-[11px]">
                                                        {t('Mục tiêu')}:{' '}
                                                        <strong className="text-neutral-900 font-mono">
                                                            {target}%
                                                        </strong>
                                                    </span>
                                                </div>

                                                <div className="relative h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden border border-neutral-200">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${Math.min(100, Math.max(0, actual))}%`,
                                                            backgroundColor: pastel.color,
                                                        }}
                                                    />
                                                    {target > 0 && (
                                                        <span
                                                            className="absolute top-0 bottom-0 w-1 bg-neutral-950 z-10 shadow-xs"
                                                            style={{ left: `calc(${Math.min(100, target)}% - 2px)` }}
                                                            title={`Mục tiêu: ${target}%`}
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Card Footer: Metrics Link & Action Buttons */}
                                            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs">
                                                <div className="flex items-center gap-3 text-neutral-600 text-[11px]">
                                                    <span className="flex items-center gap-1 font-medium">
                                                        <TreeStructure size={13} weight="bold" className="text-neutral-500" />
                                                        <span>{angleCount} {t('góc')}</span>
                                                    </span>
                                                    <span className="flex items-center gap-1 font-medium">
                                                        <FileText size={13} weight="bold" className="text-neutral-500" />
                                                        <span>{count} {t('bài viết')}</span>
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditing(pillar);
                                                            setFormOpen(true);
                                                        }}
                                                        className="h-7 px-2.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                                                    >
                                                        <PencilSimple size={12} weight="bold" />
                                                        <span>{t('Sửa')}</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => toggleStatus(pillar)}
                                                        className="h-7 px-2.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                                                    >
                                                        {pillar.status === 'archived' ? (
                                                            <>
                                                                <ArrowCounterClockwise size={12} weight="bold" />
                                                                <span>{t('Khôi phục')}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Archive size={12} weight="bold" />
                                                                <span>{t('Lưu trữ')}</span>
                                                            </>
                                                        )}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={blocking}
                                                        onClick={() => setDeleteTarget(pillar)}
                                                        title={
                                                            blocking
                                                                ? t('Trụ cột đang có bài viết hoặc góc khai thác liên kết. Hãy lưu trữ thay vì xóa.')
                                                                : t('Xóa trụ cột')
                                                        }
                                                        className="h-7 w-7 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                                    >
                                                        <Trash size={13} />
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

            <PillarForm
                open={formOpen}
                onOpenChange={setFormOpen}
                brands={brands}
                initial={editing}
                defaultBrandId={selectedBrandId === 'all' ? '' : selectedBrandId}
                onSubmit={save}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(value) => !value && setDeleteTarget(null)}
                title={t('Delete “{value1}”?', { value1: deleteTarget?.name })}
                description={t('This removes the pillar from your strategy. Posts that reference it keep their history until they are reassigned.')}
                confirmLabel={t('Delete pillar')}
                destructive
                onConfirm={remove}
            />
        </div>
    );
}
