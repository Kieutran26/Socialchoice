import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Plus, CalendarBlank } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import CalendarPostChip from './CalendarPostChip';
import { todayInZone } from '@/lib/tz';

/**
 * WeekView - Giao diện Lịch đăng bài theo Tuần (7 cột Thứ 2 -> Chủ nhật)
 * Hỗ trợ kéo - thả trực quan giữa các ngày và chuyển đổi nhanh.
 *
 * @param {{
 *   days: (string | {date: string, inMonth?: boolean})[],
 *   postsByDay: Record<string, import('../component-types').EntityRecord[]>,
 *   onSelect: (post: import('../component-types').EntityRecord) => void,
 *   onMove?: (id: string, date: string) => void,
 *   timezone?: string,
 *   brands?: import('../component-types').EntityRecord[],
 *   pillars?: import('../component-types').EntityRecord[],
 *   accounts?: import('../component-types').EntityRecord[],
 *   mediaMap?: Record<string, any>
 * }} props
 */
export default function WeekView({
    days,
    postsByDay,
    onSelect,
    onMove,
    timezone,
    accounts = [],
    mediaMap = {},
}) {
    const { t } = useTranslation();
    const today = todayInZone(timezone);
    const [dragOverDate, setDragOverDate] = useState(null);

    // Chuẩn hóa 7 ngày trong tuần
    const weekDays = days.slice(0, 7).map((d) => (typeof d === 'string' ? d : d.date));

    const getDayInfo = (dateStr) => {
        try {
            const d = new Date(dateStr + 'T00:00:00Z');
            const dayOfWeek = (d.getUTCDay() + 6) % 7; // 0 = Mon
            const labels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
            const [, month, day] = dateStr.split('-');
            return {
                label: labels[dayOfWeek] || '',
                dayNumber: day,
                dateDisplay: `${day}/${month}`,
                isSunday: dayOfWeek === 6,
                isWeekend: dayOfWeek === 5,
            };
        } catch {
            return { label: '', dayNumber: '', dateDisplay: dateStr };
        }
    };

    return (
        <div className="panel overflow-hidden border border-border rounded-2xl bg-card shadow-xs">
            <div className="overflow-x-auto">
                <div className="min-w-[980px]">
                    {/* 7 Columns Grid */}
                    <div className="grid grid-cols-7 divide-x divide-border">
                        {weekDays.map((date) => {
                            const { label, dayNumber, dateDisplay, isSunday, isWeekend } = getDayInfo(date);
                            const isToday = date === today;
                            const isDragOver = dragOverDate === date;
                            const dayPosts = [...(postsByDay[date] || [])].sort((a, b) => {
                                const tA = a.scheduled_at || '';
                                const tB = b.scheduled_at || '';
                                return tA.localeCompare(tB);
                            });

                            return (
                                <div
                                    key={date}
                                    data-calendar-date={date}
                                    onDragOver={(event) => {
                                        if (
                                            onMove &&
                                            (event.dataTransfer.types.includes('application/x-socialchoice-post') ||
                                                event.dataTransfer.types.includes('text/plain'))
                                        ) {
                                            event.preventDefault();
                                            event.dataTransfer.dropEffect = 'move';
                                            if (dragOverDate !== date) {
                                                setDragOverDate(date);
                                            }
                                        }
                                    }}
                                    onDragLeave={(event) => {
                                        if (!event.currentTarget.contains(event.relatedTarget)) {
                                            if (dragOverDate === date) setDragOverDate(null);
                                        }
                                    }}
                                    onDrop={(event) => {
                                        setDragOverDate(null);
                                        if (!onMove) return;
                                        event.preventDefault();
                                        const id =
                                            event.dataTransfer.getData('application/x-socialchoice-post') ||
                                            event.dataTransfer.getData('text/plain');
                                        if (id) onMove(id, date);
                                    }}
                                    className={`flex flex-col min-h-[520px] transition-colors duration-150 ${
                                        isDragOver
                                            ? 'bg-brand/15 ring-2 ring-brand ring-inset'
                                            : isToday
                                            ? 'bg-surface/50'
                                            : 'bg-card'
                                    }`}
                                >
                                    {/* Column Header */}
                                    <div
                                        className={`p-3 border-b border-border flex items-center justify-between sticky top-0 z-10 ${
                                            isToday
                                                ? 'bg-brand/20 border-b-brand-dark/40'
                                                : isWeekend
                                                ? 'bg-surface/80'
                                                : 'bg-surface/50'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className={`text-[11px] font-bold uppercase tracking-wider ${
                                                        isSunday
                                                            ? 'text-rose-500'
                                                            : isWeekend
                                                            ? 'text-foreground'
                                                            : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {t(label)}
                                                </span>
                                                {isToday && (
                                                    <span className="rounded-full bg-brand border border-brand-dark px-1.5 py-0.2 text-[9px] font-extrabold text-brand-ink">
                                                        {t('Hôm nay')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-baseline gap-1 mt-0.5">
                                                <span
                                                    className={`text-lg font-extrabold font-heading ${
                                                        isToday ? 'text-brand-ink' : 'text-foreground'
                                                    }`}
                                                >
                                                    {dayNumber}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    thg {dateDisplay.split('/')[1]}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {dayPosts.length > 0 && (
                                                <span className="size-5 rounded-full bg-card border border-border text-[10px] font-bold text-foreground grid place-items-center shadow-2xs">
                                                    {dayPosts.length}
                                                </span>
                                            )}
                                            <Link
                                                to={`/create?date=${date}`}
                                                title={t('Tạo bài viết cho {date}', { date: dateDisplay })}
                                                className="grid size-6 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:border-brand-dark hover:bg-brand hover:text-brand-ink transition cursor-pointer shadow-2xs"
                                            >
                                                <Plus size={13} weight="bold" />
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Column Body: Post List & Drop Target */}
                                    <div className="flex-1 p-2 space-y-2 flex flex-col justify-between">
                                        <div className="space-y-2">
                                            {/* Drop placeholder indicator when dragging over */}
                                            {isDragOver && (
                                                <div className="p-3 border-2 border-dashed border-brand-dark bg-brand/30 rounded-xl text-center text-xs font-bold text-brand-ink flex items-center justify-center gap-1.5 animate-pulse shadow-sm">
                                                    <span>📥</span>
                                                    <span>{t('Thả bài viết vào ngày {date}', { date: dateDisplay })}</span>
                                                </div>
                                            )}

                                            {/* Posts in this day */}
                                            {dayPosts.map((post) => (
                                                <CalendarPostChip
                                                    key={post.id}
                                                    post={post}
                                                    accounts={accounts}
                                                    mediaMap={mediaMap}
                                                    timezone={timezone}
                                                    onSelect={onSelect}
                                                    draggable={!!onMove}
                                                />
                                            ))}

                                            {/* Empty day prompt */}
                                            {dayPosts.length === 0 && !isDragOver && (
                                                <div className="py-12 px-2 text-center flex flex-col items-center justify-center">
                                                    <div className="size-8 rounded-full bg-muted/60 text-muted-foreground grid place-items-center mb-1.5 opacity-60">
                                                        <CalendarBlank size={16} />
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground mb-2">
                                                        {t('Trống lịch')}
                                                    </p>
                                                    <Link
                                                        to={`/create?date=${date}`}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:border-brand-dark hover:text-brand-ink hover:bg-brand/10 transition"
                                                    >
                                                        <Plus size={11} weight="bold" />
                                                        <span>{t('Lên lịch')}</span>
                                                    </Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Bottom date footer info */}
                                        <div className="pt-2 border-t border-border/40 text-[10px] text-muted-foreground/70 flex items-center justify-between px-1">
                                            <span>{dateDisplay}</span>
                                            <span>
                                                {dayPosts.length} {t('bài')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
