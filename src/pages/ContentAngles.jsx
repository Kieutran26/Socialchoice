import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Compass, PencilSimple, Archive, ArrowCounterClockwise, Trash } from '@phosphor-icons/react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function ContentAngles() {
    const { t } = useTranslation();
    const { scope, brands, selectedBrandId, demoMode } = useWorkspace();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [counts, setCounts] = useState({});
    const [pillarFilter, setPillarFilter] = useState('all');
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        const [pillarPage, anglePage, agg] = await Promise.all([
            appClient.entities.ContentPillar.filter(scope, { sort: 'name', limit: 300 }),
            appClient.entities.ContentAngle.filter(scope, { sort: 'name', limit: 500 }),
            appClient.entities.Post.aggregate({ query: scope, groupBy: 'angle_id' }),
        ]);
        setPillars(pillarPage.items);
        setAngles(anglePage.items);
        setCounts(Object.fromEntries(agg.rows.map((row) => [row.angle_id, row.count])));
        setLoading(false);
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
        load();
    };

    const toggleStatus = async (angle) => {
        const status = angle.status === 'archived' ? 'active' : 'archived';
        await appClient.entities.ContentAngle.update(angle.id, { status });
        toast({ title: status === 'archived' ? t("Angle archived") : t("Angle restored") });
        load();
    };

    const remove = async () => {
        await appClient.entities.ContentAngle.delete(deleteTarget.id);
        toast({ title: t("Angle deleted") });
        setDeleteTarget(null);
        load();
    };

    const visible = pillarFilter === 'all' ? pillars : pillars.filter((pillar) => pillar.id === pillarFilter);

    return (
        <>
            <PageHeader
                title={t("Content Angles")}
                description={t("Each angle sits under a pillar and describes how that theme gets written — the composer only offers angles that belong to the selected pillar.")}
                actions={
                    <button
                        type="button"
                        className="btn-skew"
                        onClick={() => {
                            setEditing(null);
                            setFormOpen(true);
                        }}
                    >
                        <Plus size={15} weight="bold" /> {t("New angle")} </button>
                }
            />

            <div className="panel mb-5 p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[220px] flex-1">
                        <Label className="label-xs mb-1.5 block">{t("Filter by pillar")}</Label>
                        <Select value={pillarFilter} onValueChange={setPillarFilter}>
                            <SelectTrigger className="rounded-lg">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("All pillars")}</SelectItem>
                                {pillars.map((pillar) => (
                                    <SelectItem key={pillar.id} value={pillar.id}>
                                        {pillar.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <span className="label-xs">
                        {angles.length} {t("angle")}{angles.length === 1 ? '' : t("s")} {t("across")} {pillars.length} {t("pillar")} {pillars.length === 1 ? '' : t("s")}
                    </span>
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    <Skeleton className="h-[140px] rounded-2xl" />
                    <Skeleton className="h-[140px] rounded-2xl" />
                </div>
            ) : !angles.length ? (
                <EmptyState
                    icon={Compass}
                    title={t("No angles defined yet")}
                    description={t("Add angles to a pillar so writers know exactly how to approach the theme — How-to, Common Mistakes or Myth vs Fact are good starting points.")}
                >
                    <button type="button" className="btn-skew" onClick={() => setFormOpen(true)}>
                        <Plus size={15} weight="bold" /> {t("Create an angle")} </button>
                </EmptyState>
            ) : (
                <div className="space-y-5">
                    {visible.map((pillar) => {
                        const items = angles.filter((angle) => angle.pillar_id === pillar.id);
                        if (!items.length) return null;
                        return (
                            <section key={pillar.id} className="panel p-5">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: pillar.color }} />
                                    <h2 className="text-[15px]">{pillar.name}</h2>
                                    <span className="label-xs"> {t("· target")} {pillar.target_percentage || 0}% · {items.length} {t("angle")}{items.length === 1 ? '' : t("s")}
                                    </span>
                                </div>
                                <div className="divide-y divide-border">
                                    {items.map((angle) => {
                                        const count = counts[angle.id] || 0;
                                        return (
                                            <div key={angle.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-[13px] font-medium">{angle.name}</p>
                                                        {angle.status === 'archived' ? <StatusBadge tone="neutral">{t("Archived")}</StatusBadge> : null}
                                                    </div>
                                                    {angle.description ? <p className="label-xs mt-1">{angle.description}</p> : null}
                                                    <p className="label-xs mt-1">
                                                        {count} {t("post")}{count === 1 ? '' : t("s")}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 rounded-lg text-[12px]"
                                                        onClick={() => {
                                                            setEditing(angle);
                                                            setFormOpen(true);
                                                        }}
                                                    >
                                                        <PencilSimple size={14} className="mr-1.5" /> {t("Edit")} </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 rounded-lg text-[12px]"
                                                        onClick={() => toggleStatus(angle)}
                                                    >
                                                        {angle.status === 'archived' ? (
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
                                                        disabled={count > 0}
                                                        title={count > 0 ? t("Posts reference this angle — archive it instead.") : t("Delete angle")}
                                                        onClick={() => setDeleteTarget(angle)}
                                                    >
                                                        <Trash size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}

            <AngleForm
                open={formOpen}
                onOpenChange={setFormOpen}
                brands={brands}
                pillars={pillars}
                initial={editing}
                defaultBrandId={selectedBrandId === 'all' ? '' : selectedBrandId}
                defaultPillarId={pillarFilter === 'all' ? '' : pillarFilter}
                onSubmit={save}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(value) => !value && setDeleteTarget(null)}
                title={t("Delete “{value1}”?", {value1: deleteTarget?.name})}
                description={t("The angle will no longer be offered when composing posts.")}
                confirmLabel={t("Delete angle")}
                destructive
                onConfirm={remove}
            />
        </>
    );
}