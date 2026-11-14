import { formatNumber } from '@/lib/format';

export default function StatCard({
    label,
    value,
    hint = '',
    icon: Icon = null,
    iconBg = '',
    iconColor = '',
    badge = null,
    badgeClass = '',
}) {
    return (
        <div className="panel p-4 sm:p-5 transition-all hover:border-border/80 hover:shadow-xs group min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="label-xs font-semibold text-muted-foreground uppercase tracking-wider text-[10px] sm:text-[11px] truncate min-w-0 flex-1">
                    {label}
                </span>
                {Icon && (
                    <div
                        className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border ${iconBg || 'bg-muted/60 border-border/50'
                            } ${iconColor || 'text-foreground'} transition-transform group-hover:scale-105`}
                    >
                        <Icon size={18} weight="duotone" />
                    </div>
                )}
            </div>
            <div className="mt-2 sm:mt-2.5 flex items-baseline justify-between gap-2 min-w-0">
                <p className="metric font-heading text-xl sm:text-2xl font-semibold text-foreground truncate min-w-0">
                    {typeof value === 'number' ? formatNumber(value) : value}
                </p>
                {badge && (
                    <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide shrink-0 ${badgeClass || 'border border-border/60 bg-muted/60 text-muted-foreground'
                            }`}
                    >
                        {badge}
                    </span>
                )}
            </div>
            {hint && <p className="label-xs mt-1.5 text-muted-foreground truncate min-w-0">{hint}</p>}
        </div>
    );
}
