import { formatNumber } from '@/lib/format';

export default function StatCard({ label, value, hint = '', icon: Icon = null, iconBg = '', iconColor = '' }) {
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
            <p className="metric mt-2.5 font-heading text-2xl font-semibold text-foreground">
                {typeof value === 'number' ? formatNumber(value) : value}
            </p>
            {hint && <p className="label-xs mt-1.5 text-muted-foreground truncate">{hint}</p>}
        </div>
    );
}
