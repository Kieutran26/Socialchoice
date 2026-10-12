import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Stack, PencilSimple, Archive, ArrowCounterClockwise, Trash } from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import DistributionBar from '@/components/strategy/DistributionBar';
import PillarForm from '@/components/strategy/PillarForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { percent } from '@/lib/format';

export default function ContentPillars() {
    const { t } = useTranslation();
    const { scope, brands, selectedBrandId, demoMode } = useWorkspace();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [counts, setCounts] = useState({});
    const [total, setTotal] = useState(0);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
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
        setLoading(false);
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
        toast({ title: editing ? t("Pillar updated") : t("Pillar created") });
        setFormOpen(false);
        setEditing(null);
        load();
    };

    const toggleStatus = async (pillar) => {
        const status = pillar.status === 'archived' ? 'active' : 'archived';
        await appClient.entities.ContentPillar.update(pillar.id, { status });
        toast({ title: status === 'archived' ? t("Pillar archived") : t("Pillar restored") });
        load();
    };

    const remove = async () => {
        await appClient.entities.ContentPillar.delete(deleteTarget.id);
        toast({ title: t("Pillar deleted") });
        setDeleteTarget(null);
        load();
    };

    const groups =
        selectedBrandId === 'all'
            ? brands
                .map((brand) => ({ brand, items: pillars.filter((pillar) => pillar.brand_id === brand.id) }))
                .filter((group) => group.items.length)
            : [{ brand: brands.find((b) => b.id === selectedBrandId), items: pillars }];

    const targetTotal = pillars
        .filter((pillar) => pillar.status === 'active')
        .reduce((sum, pillar) => sum + (pillar.target_percentage || 0), 0);

    return (
        <>
            <PageHeader
                title={t("Content Pillars")}
                description={t("Define the themes each brand publishes around, then set the share of content each theme should receive.")}
                actions={
                    <button
                        type="button"
                        className="btn-skew"
                        onClick={() => {
                            setEditing(null);
                            setFormOpen(true);
                        }}
                    >
                        <Plus size={15} weight="bold" /> {t("New pillar")} </button>
                }
            />

            {loading ? (
                <div className="space-y-3">
                    <Skeleton className="h-[120px] rounded-2xl" />
                    <Skeleton className="h-[120px] rounded-2xl" />
                </div>
            ) : !pillars.length ? (
                <EmptyState
                    icon={Stack}
                    title={t("No pillars yet")}
                    description={t("Start with three to five themes — for example Product Education, Customer Stories and Community Engagement — and set a target share for each.")}
                >
                    <button type="button" className="btn-skew" onClick={() => setFormOpen(true)}>
                        <Plus size={15} weight="bold" /> {t("Create the first pillar")} </button>
                </EmptyState>
            ) : (
                <div className="space-y-5">
                    <div className="panel flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                        <span className="label-xs"> {t("Active targets add up to")} <span className="font-medium text-foreground">{targetTotal}%</span>
                            {targetTotal === 100 ? t(' — perfectly balanced.') : t(' — aim for 100% so the mix is intentional.')}
                        </span>
                        <span className="label-xs">
                            {pillars.length} {t("pillar")}{pillars.length === 1 ? '' : t("s")} {t("· counting")} {total} {t("posts")} </span>
                    </div>

                    {groups.map((group) => (
                        <section key={group.brand?.id || 'all'} className="panel p-5">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: group.brand?.color }} />
                                <h2 className="text-[15px]">{group.brand?.name || t("All brands")}</h2>
                            </div>
                            <div className="divide-y divide-border">
                                {group.items.map((pillar) => {
                                    const count = counts[pillar.id] || 0;
                                    const angleCount = angles.filter((angle) => angle.pillar_id === pillar.id).length;
                                    const blocking = count > 0 || angleCount > 0;
                                    return (
                                        <div key={pillar.id} className="py-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-[13px] font-medium">{pillar.name}</p>
                                                        {pillar.status === 'archived' ? (
                                                            <StatusBadge tone="neutral">{t("Archived")}</StatusBadge>
                                                        ) : null}
                                                    </div>
                                                    {pillar.description ? <p className="label-xs mt-1">{pillar.description}</p> : null}
                                                    <p className="label-xs mt-1">
                                                        {angleCount} {t("angle")}{angleCount === 1 ? '' : t("s")} · {count} {t("post")}{count === 1 ? '' : t("s")}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 rounded-lg text-[12px]"
                                                        onClick={() => {
                                                            setEditing(pillar);
                                                            setFormOpen(true);
                                                        }}
                                                    >
                                                        <PencilSimple size={14} className="mr-1.5" /> {t("Edit")} </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 rounded-lg text-[12px]"
                                                        onClick={() => toggleStatus(pillar)}
                                                    >
                                                        {pillar.status === 'archived' ? (
                                                            <>
                                                                <ArrowCounterClockwise size={14} className="mr-1.5" /> {t("Restore")} </>
                                                        ) : (
                                                            <>
                                                                <Archive size={14} className="mr-1.5" /> {t("Archive")} </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 rounded-lg text-[12px] text-dangerFg hover:text-dangerFg"
                                                        disabled={blocking}
                                                        title={
                                                            blocking
                                                                ? t("Archive it instead — published history stays attached to this pillar.")
                                                                : t("Delete pillar")
                                                        }
                                                        onClick={() => setDeleteTarget(pillar)}
                                                    >
                                                        <Trash size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                            <DistributionBar
                                                label={t("{value1} — target {value2}%, actual {value3}%", {value1: pillar.name, value2: pillar.target_percentage || 0, value3: percent(count, total)})}
                                                color={pillar.color}
                                                target={pillar.target_percentage || 0}
                                                actual={percent(count, total)}
                                                count={count}
                                                className="pt-3"
                                            />
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
                title={t("Delete “{value1}”?", {value1: deleteTarget?.name})}
                description={t("This removes the pillar from your strategy. Posts that reference it keep their history until they are reassigned.")}
                confirmLabel={t("Delete pillar")}
                destructive
                onConfirm={remove}
            />
        </>
    );
}