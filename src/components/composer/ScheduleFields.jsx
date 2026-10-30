import { useTranslation } from '@/lib/i18n';
import { Input } from '../ui/input';
import { TIMEZONES } from '@/lib/constants';
import { CalendarBlank, Clock, Globe } from '@phosphor-icons/react';

export default function ScheduleFields({ value, onChange }) {
    const { t } = useTranslation();

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div>
                <label htmlFor="schedule-date-input" className="label-xs mb-1.5 flex items-center gap-1.5 text-foreground">
                    <CalendarBlank size={14} className="text-muted-foreground" />
                    <span>{t("Date")}</span>
                </label>
                <Input
                    id="schedule-date-input"
                    type="date"
                    value={value.date}
                    onChange={(e) => onChange({ date: e.target.value })}
                    className="rounded-xl border border-border bg-background"
                />
            </div>

            <div>
                <label htmlFor="schedule-time-input" className="label-xs mb-1.5 flex items-center gap-1.5 text-foreground">
                    <Clock size={14} className="text-muted-foreground" />
                    <span>{t("Time")}</span>
                </label>
                <Input
                    id="schedule-time-input"
                    type="time"
                    value={value.time}
                    onChange={(e) => onChange({ time: e.target.value })}
                    className="rounded-xl border border-border bg-background"
                />
            </div>

            <div className="sm:col-span-2">
                <label htmlFor="schedule-timezone-select" className="label-xs mb-1.5 flex items-center gap-1.5 text-foreground">
                    <Globe size={14} className="text-muted-foreground" />
                    <span>{t("Timezone")}</span>
                </label>
                <select
                    id="schedule-timezone-select"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/80 focus:ring-1 focus:ring-foreground/20 outline-none transition-colors"
                    value={value.timezone}
                    onChange={(e) => onChange({ timezone: e.target.value })}
                >
                    {TIMEZONES.map((zone) => (
                        <option key={zone} value={zone}>
                            {zone}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
