import { formatNumber } from '@/lib/format';

export default function StatCard({
    label,
    value,
    hint = '',
    icon: Icon = null,
    iconBg = '',
    iconColor = '',
    badge = null,
}) {
    return (
        <div className="panel p-5 transition-all hover:border-border/80 hover:shadow-xs group">
            <div className="flex items-center justify-between gap-3">
                <span className="label-xs font-medium text-muted-foreground uppercase tracking-wider text-[11px] truncate">
                    {label}
                </span>
                {Icon && (
                    <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/50 ${
                            iconBg || 'bg-muted/60'
                        } ${iconColor || 'text-foreground'} transition-transform group-hover:scale-105`}
                    >
                        <Icon size={18} weight="duotone" />
                    </div>
                )}
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
                <p className="metric font-heading text-2xl font-semibold text-foreground">
                    {typeof value === 'number' ? formatNumber(value) : value}
                </p>
                {badge && (
                    <span className="rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
                        {badge}
                    </span>
                )}
            </div>
            {hint && <p className="label-xs mt-1.5 text-muted-foreground truncate">{hint}</p>}
        </div>
    );
}
