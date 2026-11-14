import { useTranslation } from '@/lib/i18n';

export default function DistributionBar({
    label,
    color = '#181818',
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
        <div className={`space-y-2 py-2.5 sm:py-3.5 ${className}`}>
            <div className="flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                    <span
                        className="h-3 w-3 rounded-full shrink-0 ring-1 ring-neutral-300"
                        style={{ backgroundColor: color || '#181818' }}
                    />
                    <span className="font-semibold text-neutral-900 truncate max-w-[130px] sm:max-w-none">{label}</span>
                    {target > 0 && (
                        <>
                            {isOver && (
                                <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-900 border border-neutral-300 shrink-0">
                                    +{diff}% {t('over target')}
                                </span>
                            )}
                            {isUnder && (
                                <span className="inline-flex items-center rounded-md bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600 border border-neutral-200 shrink-0">
                                    {diff}% {t('under target')}
                                </span>
                            )}
                            {isBalanced && (
                                <span className="inline-flex items-center rounded-md bg-neutral-900 px-2 py-0.5 text-[11px] font-medium text-white shadow-2xs shrink-0">
                                    ✓ {t('Balanced')}
                                </span>
                            )}
                        </>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-neutral-500 font-mono sm:ml-auto">
                    <span className="shrink-0">
                        {t('Actual')}: <strong className="text-neutral-900 font-semibold">{actual}%</strong>
                    </span>
                    {target > 0 && (
                        <span className="shrink-0">
                            ({t('Target')}: <strong className="text-neutral-900 font-semibold">{target}%</strong>)
                        </span>
                    )}
                    <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-800 border border-neutral-200 shrink-0">
                        {count} {t('posts')}
                    </span>
                </div>
            </div>

            <div
                className="relative h-2.5 w-full rounded-full bg-neutral-100 border border-neutral-200/60 overflow-hidden"
                role="img"
                aria-label={t('{label}: actual {actual} percent, target {target} percent', { label, actual, target })}
            >
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(0, Math.min(100, actual))}%`, backgroundColor: color || '#181818' }}
                />
                {target > 0 && (
                    <span
                        className="absolute top-0 bottom-0 w-1 rounded-full bg-neutral-900 shadow-xs z-10"
                        title={t('Target: {target}%', { target })}
                        style={{ left: `calc(${Math.max(0, Math.min(100, target))}% - 2px)` }}
                    />
                )}
            </div>
        </div>
    );
}
