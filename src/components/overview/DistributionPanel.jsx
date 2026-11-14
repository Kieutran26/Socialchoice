import { useTranslation } from '@/lib/i18n';
import { Link } from 'react-router-dom';
import DistributionBar from '../strategy/DistributionBar';
import { percent, formatNumber } from '@/lib/format';
import { ChartDonut, ArrowUpRight } from '@phosphor-icons/react';

export default function DistributionPanel({ pillarRows, angleRows, pillarMap, angleMap, total }) {
    const { t } = useTranslation();
    const resolve = (map, id) => (typeof map[id] === 'string' ? { name: map[id] } : map[id] || {});

    const hasData = pillarRows.length > 0 || angleRows.length > 0;

    return (
        <section className="panel p-4 sm:p-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/80 mb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                        <ChartDonut size={18} weight="duotone" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="font-heading text-[15px] font-semibold text-foreground truncate">
                                {t("Content distribution")}
                            </h2>
                            {total > 0 && (
                                <span className="label-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground font-medium shrink-0">
                                    {total} {t("posts")}
                                </span>
                            )}
                        </div>
                        <p className="label-xs mt-0.5 text-muted-foreground truncate">
                            {t('Unique posts · {total} total · all statuses in this workspace view', { total })}
                        </p>
                    </div>
                </div>

                <Link
                    to="/strategy"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors shrink-0"
                >
                    <span>{t("Xem chiến lược")}</span>
                    <ArrowUpRight size={13} />
                </Link>
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
                <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
                    {/* Content Pillars */}
                    <div className="space-y-4 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t("Content Pillars")}
                        </p>
                        <div className="space-y-3">
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
                    <div className="space-y-4 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t("Content Angles")}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {angleRows.map((r) => (
                                <div
                                    key={r.angle_id || 'none'}
                                    className="flex items-center justify-between text-xs py-2.5 px-3 rounded-xl bg-surface/50 border border-border/60 hover:bg-muted/30 transition-colors min-w-0 gap-2"
                                >
                                    <span className="font-medium text-foreground truncate min-w-0 flex-1">
                                        {resolve(angleMap, r.angle_id).name || t("Unassigned angle")}
                                    </span>
                                    <span className="font-mono text-muted-foreground font-medium shrink-0 text-[11px]">
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
