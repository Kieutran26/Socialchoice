import { useTranslation } from '@/lib/i18n';
import { relativeTime } from '@/lib/format';
import { CheckCircle, Clock, WarningCircle, Broadcast, Pulse } from '@phosphor-icons/react';

function getEventStyle(text = '') {
    const lower = text.toLowerCase();
    if (lower.includes('lỗi') || lower.includes('failed') || lower.includes('error') || lower.includes('bị chặn') || lower.includes('cancelled')) {
        return {
            icon: WarningCircle,
            weight: /** @type {const} */ ('fill'),
            bg: 'bg-rose-50 border-rose-200/80',
            text: 'text-rose-600',
        };
    }
    if (lower.includes('xác nhận') || lower.includes('published') || lower.includes('success') || lower.includes('thành công')) {
        return {
            icon: CheckCircle,
            weight: /** @type {const} */ ('fill'),
            bg: 'bg-emerald-50 border-emerald-200/80',
            text: 'text-emerald-600',
        };
    }
    if (lower.includes('chờ') || lower.includes('đang') || lower.includes('pending') || lower.includes('duyệt') || lower.includes('processing')) {
        return {
            icon: Clock,
            weight: /** @type {const} */ ('fill'),
            bg: 'bg-blue-50 border-blue-200/80',
            text: 'text-blue-600',
        };
    }
    return {
        icon: Broadcast,
        weight: /** @type {const} */ ('duotone'),
        bg: 'bg-muted border-border/80',
        text: 'text-foreground',
    };
}

export default function RecentActivity({ logs }) {
    const { t } = useTranslation();

    return (
        <section className="panel p-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/80 mb-3">
                <div className="flex items-center gap-2">
                    <h2 className="font-heading text-[15px] font-medium text-foreground">
                        {t("Recent activity")}
                    </h2>
                    {logs.length > 0 && (
                        <span className="label-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground font-medium">
                            {logs.length}
                        </span>
                    )}
                </div>
                <span className="inline-flex items-center gap-1.5 label-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{t("Live updates")}</span>
                </span>
            </div>

            {/* Empty State */}
            {!logs.length ? (
                <div className="py-8 px-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground mx-auto mb-3">
                        <Pulse size={24} weight="duotone" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{t("No publishing activity recorded.")}</p>
                    <p className="label-xs mt-1 text-muted-foreground">
                        {t("Activity logs appear here as posts are processed and published.")}
                    </p>
                </div>
            ) : (
                /* Activity Feed */
                <div className="divide-y divide-border/60">
                    {logs.map((l) => {
                        const message = t(l.message || l.error_message || l.event || l.status);
                        const style = getEventStyle(message);
                        const EventIcon = style.icon;

                        return (
                            <div
                                key={l.id}
                                className="group flex items-start gap-3 py-3 transition-colors hover:bg-muted/30 px-2 rounded-xl -mx-2"
                            >
                                <div
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${style.bg} ${style.text} mt-0.5 shadow-2xs`}
                                >
                                    <EventIcon size={16} weight={style.weight} />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-medium text-foreground leading-snug">
                                        {message}
                                    </p>
                                    <p className="label-xs mt-1 text-muted-foreground font-mono text-[11px]">
                                        {relativeTime(l.occurred_at || l.created_date)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
