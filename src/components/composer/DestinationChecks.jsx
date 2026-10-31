import { useTranslation } from '@/lib/i18n';
import { CheckCircle, Circle, WarningCircle } from '@phosphor-icons/react';

/**
 * @param {{
 *   checks?: Array<{ account: any, issues: string[] }>,
 *   post?: {
 *     account_ids?: string[],
 *     caption?: string,
 *     pillar_id?: string,
 *     angle_id?: string,
 *     [key: string]: any,
 *   }
 * }} props
 */
export default function DestinationChecks({ checks = [], post = {} }) {
    const { t } = useTranslation();

    const hasDestinations = Boolean(post.account_ids && post.account_ids.length > 0);
    const hasCaption = Boolean(post.caption && post.caption.trim().length > 0);
    const hasStrategy = Boolean(post.pillar_id && post.angle_id);

    const items = [
        {
            key: 'destination',
            label: t('Select at least one destination'),
            completed: hasDestinations,
        },
        {
            key: 'caption',
            label: t('Write main content'),
            completed: hasCaption,
        },
        {
            key: 'strategy',
            label: t('Choose pillar and angle'),
            completed: hasStrategy,
        },
    ];

    const completedCount = items.filter((item) => item.completed).length;
    const progressPercent = Math.round((completedCount / items.length) * 100);

    // Collect genuine critical issues when caption is present
    const criticalIssues = hasCaption
        ? checks
              .flatMap((c) => c.issues)
              .filter((issue) => !issue.toLowerCase().includes('must contain between 1 and'))
        : [];

    return (
        <section
            className="panel p-5 bg-card border border-border rounded-2xl shadow-2xs space-y-3.5"
            aria-label={t('Before you publish')}
        >
            <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-sm text-foreground">
                    {t('Before you publish')}
                </h3>
                <span className="text-xs font-medium text-muted-foreground">
                    {completedCount}/{items.length}
                </span>
            </div>

            {/* Yellow Progress Bar */}
            <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                    className="h-full bg-[#ffd631] rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            {/* Checklist Items */}
            <div className="space-y-3 pt-0.5">
                {items.map((item) => (
                    <div key={item.key} className="flex items-center gap-3 text-xs sm:text-[13px] select-none">
                        {item.completed ? (
                            <CheckCircle size={18} weight="bold" className="text-emerald-500 shrink-0" />
                        ) : (
                            <Circle size={18} weight="regular" className="text-muted-foreground/40 shrink-0" />
                        )}
                        <span
                            className={`transition-all ${
                                item.completed
                                    ? 'line-through text-muted-foreground/75'
                                    : 'text-foreground/90 font-medium'
                            }`}
                        >
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>

            {criticalIssues.length > 0 && (
                <div className="mt-2.5 rounded-xl border border-rose-200/80 bg-rose-50/60 p-3 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-rose-800 text-[11px]">
                        <WarningCircle size={14} weight="fill" className="text-rose-600 shrink-0" />
                        <span>{t('Issues detected')}</span>
                    </div>
                    <ul className="space-y-1 pl-4 list-disc text-[11px] text-rose-700">
                        {[...new Set(criticalIssues)].map((issue, idx) => (
                            <li key={idx}>{t(issue)}</li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
