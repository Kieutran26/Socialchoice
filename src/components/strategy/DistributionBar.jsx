import { useTranslation } from '@/lib/i18n';

export default function DistributionBar({
    label,
    color = '#ffd631',
    target = 0,
    actual = 0,
    count = 0,
    className = '',
}) {
    const { t } = useTranslation();
    const diff = actual - target;
    const isOver = diff > 5;
    const isUnder = -diff > 5;
    const isBalanced = target > 0 && !isOver && !isUnder;

    return (
        <div className={`space-y-2 py-3 ${className}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                    <span
                        className="h-3 w-3 rounded-full shrink-0 shadow-2xs ring-1 ring-border/50"
                        style={{ backgroundColor: color }}
                    />
                    <span className="font-semibold text-foreground truncate">{label}</span>
                    {target > 0 && (
                        <>
                            {isOver && (
                                <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200/60">
                                    +{diff}% {t('over target')}
                                </span>
                            )}
                            {isUnder && (
                                <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200/60">
                                    {diff}% {t('under target')}
                                </span>
                            )}
                            {isBalanced && (
                                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
                                    ✓ {t('Balanced')}
                                </span>
                            )}
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono ml-auto">
                    <span>
                        {t('Actual')}: <strong className="text-foreground">{actual}%</strong>
                    </span>
                    {target > 0 && (
                        <span>
                            ({t('Target')}: <strong className="text-foreground">{target}%</strong>)
                        </span>
                    )}
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                        {count} {t('posts')}
                    </span>
                </div>
            </div>

            <div
                className="relative h-2.5 w-full rounded-full bg-muted/70 overflow-hidden"
                role="img"
                aria-label={t('{label}: actual {actual} percent, target {target} percent', { label, actual, target })}
            >
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(0, Math.min(100, actual))}%`, backgroundColor: color }}
                />
                {target > 0 && (
                    <span
                        className="absolute top-0 bottom-0 w-1 rounded-full bg-foreground shadow-xs z-10"
                        title={t('Target: {target}%', { target })}
                        style={{ left: `calc(${Math.max(0, Math.min(100, target))}% - 2px)` }}
                    />
                )}
            </div>
        </div>
    );
}
