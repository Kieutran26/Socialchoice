import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import {
    ArrowsClockwise,
    CalendarCheck,
    Sparkle,
    ShieldCheck,
    Check,
    CaretRight,
    Info,
} from '@phosphor-icons/react';
import { generateRecurringTimeline } from '@/lib/recurring-dates';

const FREQUENCY_OPTIONS = [
    {
        id: 'weekly',
        label: 'Hàng tuần',
        desc: 'Mỗi 7 ngày vào cùng thứ',
        icon: '📅',
    },
    {
        id: 'biweekly',
        label: 'Mỗi 2 tuần',
        desc: 'Cách 14 ngày đăng 1 lần',
        icon: '📆',
    },
    {
        id: 'monthly',
        label: 'Hàng tháng',
        desc: 'Cùng ngày mỗi tháng',
        icon: '🗓️',
    },
];

const COUNT_PRESETS = [
    { count: 2, label: '2 kỳ' },
    { count: 4, label: '4 kỳ (~1 tháng)' },
    { count: 8, label: '8 kỳ (~2 tháng)' },
    { count: 12, label: '12 kỳ (~3 tháng)' },
];

export default function RecurringSchedulePanel({
    config = { enabled: false, frequency: 'weekly', count: 4, autoRecycle: true },
    onChange,
    startDate,
    startTime,
    timezone,
    disabled = false,
}) {
    const { t } = useTranslation();

    const timeline = useMemo(() => {
        if (!config.enabled || !startDate || !startTime) return [];
        return generateRecurringTimeline(
            startDate,
            startTime,
            timezone,
            config.frequency,
            config.count
        );
    }, [config.enabled, config.frequency, config.count, startDate, startTime, timezone]);

    return (
        <div className="rounded-2xl border border-border bg-card p-4 transition-all">
            {/* Header with Clickable Area & Switch */}
            <div
                className="flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                onClick={() => {
                    if (!disabled) {
                        onChange({ ...config, enabled: !config.enabled });
                    }
                }}
            >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`size-8 rounded-xl grid place-items-center transition-colors shrink-0 ${
                        config.enabled
                            ? 'bg-brand border border-brand-dark text-brand-ink'
                            : 'bg-muted text-muted-foreground'
                    }`}>
                        <ArrowsClockwise size={18} weight={config.enabled ? 'bold' : 'regular'} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xs font-bold text-foreground">
                                {t('Tự động đăng lặp lại (Smart Recurring & Auto-Recycle)')}
                            </h3>
                            <span className="rounded-full bg-brand/25 border border-brand-dark/30 px-1.5 py-0.2 text-[9px] font-extrabold text-brand-ink uppercase">
                                {t('Evergreen')}
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {t('Tự động đăng bài định kỳ (bán hàng, tips, tuyển dụng) & xoay vòng biến thể chống spam trùng lặp')}
                        </p>
                    </div>
                </div>

                {/* Switch Button */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-bold ${config.enabled ? 'text-brand-ink' : 'text-muted-foreground'}`}>
                        {config.enabled ? t('BẬT') : t('TẮT')}
                    </span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={config.enabled}
                        disabled={disabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange({ ...config, enabled: !config.enabled });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none ${
                            config.enabled ? 'bg-brand border-brand-dark' : 'bg-muted border-border'
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block size-5 transform rounded-full shadow-xs transition duration-200 ease-in-out ${
                                config.enabled ? 'translate-x-5 bg-brand-ink' : 'translate-x-0.5 bg-card border border-border'
                            }`}
                        />
                    </button>
                </div>
            </div>

            {/* Expanded Config */}
            {config.enabled && (
                <div className="mt-4 pt-4 border-t border-border/70 space-y-4">
                    {/* Frequency selector */}
                    <div>
                        <label className="text-[11px] font-bold text-foreground block mb-1.5">
                            {t('1. Tần suất lặp lại')}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {FREQUENCY_OPTIONS.map((f) => {
                                const isSelected = config.frequency === f.id;
                                return (
                                    <button
                                        key={f.id}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => onChange({ ...config, frequency: f.id })}
                                        className={`flex flex-col text-left p-2.5 rounded-xl border transition cursor-pointer ${
                                            isSelected
                                                ? 'border-brand-dark bg-brand/20 ring-1 ring-brand-dark'
                                                : 'border-border bg-surface/50 hover:border-brand-dark/40 hover:bg-card'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <span>{f.icon}</span>
                                                <span>{t(f.label)}</span>
                                            </span>
                                            {isSelected && (
                                                <div className="size-4 rounded-full bg-brand border border-brand-dark text-brand-ink grid place-items-center">
                                                    <Check size={11} weight="bold" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground mt-1">
                                            {t(f.desc)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Count Preset Selector */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-bold text-foreground">
                                {t('2. Số kỳ đăng lặp lại')}
                            </label>
                            <span className="text-[11px] text-muted-foreground">
                                {t('Tổng cộng: {count} bài viết', { count: config.count })}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {COUNT_PRESETS.map((p) => (
                                <button
                                    key={p.count}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onChange({ ...config, count: p.count })}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                                        config.count === p.count
                                            ? 'border-brand-dark bg-brand text-brand-ink font-bold'
                                            : 'border-border bg-card text-foreground hover:border-brand-dark/40'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Smart Auto-Recycle Anti-Spam Checkbox */}
                    <div className="rounded-xl border border-brand-dark/30 bg-brand/10 p-3 flex items-start gap-2.5">
                        <input
                            type="checkbox"
                            id="auto-recycle-check"
                            checked={config.autoRecycle}
                            disabled={disabled}
                            onChange={(e) => onChange({ ...config, autoRecycle: e.target.checked })}
                            className="mt-0.5 h-4 w-4 rounded border-brand-dark text-brand-dark focus:ring-brand-dark cursor-pointer"
                        />
                        <div className="text-xs">
                            <label htmlFor="auto-recycle-check" className="font-bold text-brand-ink flex items-center gap-1.5 cursor-pointer">
                                <span>{t('Kích hoạt xoay vòng biến thể nội dung (Chống phạt spam trùng lặp)')}</span>
                                <span className="rounded-md bg-brand/30 border border-brand-dark/40 px-1.5 py-0.2 text-[9px] font-bold text-brand-ink">
                                    {t('Khuyên dùng')}
                                </span>
                            </label>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                {t('Hệ thống tự động đánh dấu số kỳ (#Kỳ n/tổng) và làm mới câu kết nối để tránh việc Facebook / Threads / TikTok chặn hiển thị do trùng lặp 100% nội dung.')}
                            </p>
                        </div>
                    </div>

                    {/* Visual Roadmap Preview */}
                    {timeline.length > 0 && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="font-bold text-foreground">
                                    {t('3. Lộ trình phát hành dự kiến ({count} ngày):', { count: timeline.length })}
                                </span>
                                <span className="font-mono text-[10px]">
                                    {timeline[0]?.date} ➔ {timeline[timeline.length - 1]?.date}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                                {timeline.map((item, idx) => (
                                    <div
                                        key={item.index}
                                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] shrink-0 font-medium ${
                                            item.isFirst
                                                ? 'border-brand-dark bg-brand text-brand-ink font-bold'
                                                : 'border-border bg-surface/70 text-foreground'
                                        }`}
                                    >
                                        <span>
                                            {item.isFirst ? t('Kỳ 1 (Gốc)') : t('Kỳ {index}', { index: item.index })}:
                                        </span>
                                        <span className="font-mono">{item.displayDate} ({item.time})</span>
                                        {idx < timeline.length - 1 && (
                                            <CaretRight size={10} className="text-muted-foreground ml-0.5" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
