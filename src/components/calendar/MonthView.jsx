import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Plus } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import CalendarPostChip from './CalendarPostChip';
import { todayInZone } from '@/lib/tz';

/** 
 * @param {{
 *   days: (string | {date: string, inMonth: boolean})[], 
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
export default function MonthView({
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

    const weekDayHeaders = [
        { key: 'Mon', label: 'Thứ 2' },
        { key: 'Tue', label: 'Thứ 3' },
        { key: 'Wed', label: 'Thứ 4' },
        { key: 'Thu', label: 'Thứ 5' },
        { key: 'Fri', label: 'Thứ 6' },
        { key: 'Sat', label: 'Thứ 7', isWeekend: true },
        { key: 'Sun', label: 'Chủ nhật', isSunday: true },
    ];

    return (
        <div className="panel overflow-hidden border border-border shadow-2xs rounded-2xl bg-card">
            <div className="overflow-x-auto">
                <div className="min-w-[840px]">
                    {/* Day of Week Headers */}
                    <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground">
                        {weekDayHeaders.map((item) => (
                            <div
                                key={item.key}
                                className={`p-3 text-center border-r border-border/50 last:border-r-0 ${
                                    item.isSunday ? 'text-rose-500' : item.isWeekend ? 'text-amber-600' : ''
                                }`}
                            >
                                {t(item.label)}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid: 7 columns */}
                    <div className="grid grid-cols-7 divide-x divide-border border-b border-border">
                        {days.map((day) => {
                            const date = typeof day === 'string' ? day : day.date;
                            const inMonth = typeof day === 'string' ? true : day.inMonth !== false;
                            const isToday = date === today;
                            const dayNumber = Number(date.slice(-2));
                            const dayPosts = postsByDay[date] || [];
                            const isDragOver = dragOverDate === date;

                            return (
                                <div
                                    key={date}
                                    role="group"
                                    aria-label={t('Calendar day {date}', { date })}
                                    data-calendar-date={date}
                                    onDragOver={(event) => {
                                        if (onMove && (event.dataTransfer.types.includes('application/x-socialchoice-post') || event.dataTransfer.types.includes('text/plain'))) {
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
                                        const id = event.dataTransfer.getData('application/x-socialchoice-post') || event.dataTransfer.getData('text/plain');
                                        if (id) onMove(id, date);
                                    }}
                                    className={`group relative min-h-[130px] p-2 border-b border-border transition-all duration-150 flex flex-col justify-between ${
                                        isDragOver
                                            ? 'ring-2 ring-brand ring-inset bg-brand/15 border-brand/60 shadow-sm z-10'
                                            : !inMonth
                                            ? 'bg-muted/30 text-muted-foreground/50'
                                            : isToday
                                            ? 'bg-brand/5'
                                            : 'hover:bg-muted/20'
                                    }`}
                                >
                                    {/* Top cell row: Day number + Quick add action */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span
                                                className={`text-xs font-bold ${
                                                    isToday
                                                        ? 'size-6 rounded-full bg-foreground text-background flex items-center justify-center font-mono font-bold shadow-2xs'
                                                        : inMonth
                                                        ? 'text-foreground'
                                                        : 'text-muted-foreground/60'
                                                }`}
                                            >
                                                {dayNumber}
                                            </span>

                                            {/* Quick Add Button on Hover */}
                                            <Link
                                                to={`/create?date=${date}`}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity size-5 rounded-md bg-muted hover:bg-foreground hover:text-background text-muted-foreground flex items-center justify-center cursor-pointer shadow-2xs"
                                                title={t('Create post on this day')}
                                            >
                                                <Plus size={11} weight="bold" />
                                            </Link>
                                        </div>

                                        {/* Drop placeholder indicator when dragging over */}
                                        {isDragOver && (
                                            <div className="mb-2 p-1.5 border border-dashed border-brand-dark bg-brand/25 rounded-lg text-center text-[10px] font-bold text-brand-ink flex items-center justify-center gap-1 animate-pulse shadow-2xs">
                                                <span>📥</span>
                                                <span>{t('Thả vào ngày này')}</span>
                                            </div>
                                        )}

                                        {/* Rich Post Chips List */}
                                        <div className="space-y-1">
                                            {dayPosts.map((post) => (
                                                <CalendarPostChip
                                                    key={post.id}
                                                    post={post}
                                                    accounts={accounts}
                                                    mediaMap={mediaMap}
                                                    timezone={timezone}
                                                    onSelect={onSelect}
                                                    draggable={!!onMove}
                                                    onDragStart={(event) => {
                                                        if (onMove) {
                                                            event.dataTransfer.setData(
                                                                'application/x-socialchoice-post',
                                                                post.id
                                                            );
                                                            event.dataTransfer.setData('text/plain', post.id);
                                                            event.dataTransfer.effectAllowed = 'move';
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Empty bottom space placeholder if no posts */}
                                    {dayPosts.length === 0 && !isDragOver && inMonth && (
                                        <div className="h-4" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
