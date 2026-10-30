import { useTranslation } from '@/lib/i18n';
import DistributionBar from '../strategy/DistributionBar';
import { percent, formatNumber } from '@/lib/format';
import { ChartDonut } from '@phosphor-icons/react';

export default function DistributionPanel({ pillarRows, angleRows, pillarMap, angleMap, total }) {
    const { t } = useTranslation();
    const resolve = (map, id) => (typeof map[id] === 'string' ? { name: map[id] } : map[id] || {});

    const hasData = pillarRows.length > 0 || angleRows.length > 0;

    return (
        <section className="panel p-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/80 mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-heading text-[15px] font-medium text-foreground">
                            {t("Content distribution")}
                        </h2>
                        {total > 0 && (
                            <span className="label-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground font-medium">
                                {total} {t("posts")}
                            </span>
                        )}
                    </div>
                    <p className="label-xs mt-1 text-muted-foreground">
                        {t('Unique posts · {total} total · all statuses in this workspace view', { total })}
                    </p>
                </div>
            </div>

            {!hasData ? (
                <div className="py-8 px-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground mx-auto mb-3">
                        <ChartDonut size={24} weight="duotone" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{t("No distribution data yet")}</p>
                    <p className="label-xs mt-1 text-muted-foreground">
                        {t("Assign pillars and angles when creating posts to balance your content strategy.")}
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Content Pillars */}
                    <div className="space-y-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t("Content Pillars")}
                        </p>
                        <div className="space-y-4">
                            {pillarRows.map((r) => {
                                const p = resolve(pillarMap, r.pillar_id);
                                return (
                                    <DistributionBar
                                        key={r.pillar_id || 'none'}
                                        label={p.name || t("Unassigned pillar")}
                                        color={p.color}
                                        target={p.target_percentage}
                                        actual={percent(r.count, total)}
                                        count={r.count}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* Content Angles */}
                    <div className="space-y-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t("Content Angles")}
                        </p>
                        <div className="space-y-2">
                            {angleRows.map((r) => (
                                <div
                                    key={r.angle_id || 'none'}
                                    className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-surface border border-border/50 hover:border-border transition-colors"
                                >
                                    <span className="font-medium text-foreground">
                                        {resolve(angleMap, r.angle_id).name || t("Unassigned angle")}
                                    </span>
                                    <span className="font-mono text-muted-foreground font-medium">
                                        {formatNumber(r.count)} · {percent(r.count, total)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
