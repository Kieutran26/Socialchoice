import {
    CheckCircle,
    Clock,
    NotePencil,
    WarningCircle,
    CircleNotch,
    Prohibit,
    Dot,
} from '@phosphor-icons/react';
import { POST_STATUS_LABEL } from '@/lib/constants';

const STATUS_STYLES = {
    published: {
        bg: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25',
        icon: CheckCircle,
        iconClass: 'text-emerald-600',
        weight: 'fill',
    },
    scheduled: {
        bg: 'bg-amber-500/10 text-amber-900 border-amber-500/25',
        icon: Clock,
        iconClass: 'text-amber-600',
        weight: 'fill',
    },
    draft: {
        bg: 'bg-zinc-100 text-zinc-700 border-zinc-200/90',
        icon: NotePencil,
        iconClass: 'text-zinc-500',
        weight: 'duotone',
    },
    processing: {
        bg: 'bg-sky-500/10 text-sky-800 border-sky-500/25',
        icon: CircleNotch,
        iconClass: 'text-sky-600 animate-spin',
        weight: 'regular',
    },
    failed: {
        bg: 'bg-rose-500/10 text-rose-800 border-rose-500/25',
        icon: WarningCircle,
        iconClass: 'text-rose-600',
        weight: 'fill',
    },
    cancelled: {
        bg: 'bg-zinc-100 text-zinc-600 border-zinc-200/90',
        icon: Prohibit,
        iconClass: 'text-zinc-400',
        weight: 'duotone',
    },
    partially_published: {
        bg: 'bg-amber-500/10 text-amber-900 border-amber-500/25',
        icon: WarningCircle,
        iconClass: 'text-amber-600',
        weight: 'fill',
    },
};

const TONE_STYLES = {
    success: {
        bg: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25',
        icon: CheckCircle,
        iconClass: 'text-emerald-600',
        weight: 'fill',
    },
    warn: {
        bg: 'bg-amber-500/10 text-amber-900 border-amber-500/25',
        icon: Clock,
        iconClass: 'text-amber-600',
        weight: 'fill',
    },
    info: {
        bg: 'bg-sky-500/10 text-sky-800 border-sky-500/25',
        icon: Clock,
        iconClass: 'text-sky-600',
        weight: 'fill',
    },
    danger: {
        bg: 'bg-rose-500/10 text-rose-800 border-rose-500/25',
        icon: WarningCircle,
        iconClass: 'text-rose-600',
        weight: 'fill',
    },
    neutral: {
        bg: 'bg-zinc-100 text-zinc-700 border-zinc-200/90',
        icon: NotePencil,
        iconClass: 'text-zinc-500',
        weight: 'duotone',
    },
};

export default function StatusBadge({
    status = '',
    tone = 'neutral',
    children = null,
    className = '',
    showIcon = true,
}) {
    const config = (status && STATUS_STYLES[status]) || TONE_STYLES[tone] || TONE_STYLES.neutral;
    const Icon = config.icon;
    const label = children || (status ? POST_STATUS_LABEL[status] || status : '');

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium border shadow-2xs tracking-tight ${config.bg} ${className}`}
        >
            {showIcon && Icon && (
                <Icon
                    size={12}
                    weight={config.weight || 'regular'}
                    className={`shrink-0 ${config.iconClass}`}
                />
            )}
            <span>{label}</span>
        </span>
    );
}
