import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { formatTime } from '@/lib/format';

/** @param {{days: (string | {date: string, inMonth: boolean})[], postsByDay: Record<string, import('../component-types').EntityRecord[]>, onSelect: (post: import('../component-types').EntityRecord) => void, onMove?: (id: string, date: string) => void, timezone?: string, brands?: import('../component-types').EntityRecord[], pillars?: import('../component-types').EntityRecord[], accounts?: import('../component-types').EntityRecord[]}} props */
export default function MonthView({ days, postsByDay, onSelect, onMove, timezone }) {
    const { t } = useTranslation();
    return <div className="panel overflow-x-auto"><div className="grid grid-cols-7 min-w-[700px]">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <div key={day} className="p-3 text-xs bg-muted border-b">{t(day)}</div>)}
        {days.map(day => {
            const date = typeof day === 'string' ? day : day.date;
            return <div key={date} role="group" aria-label={t('Calendar day {date}', { date })} data-calendar-date={date}
                onDragOver={event => { if (onMove && event.dataTransfer.types.includes('application/x-socialchoice-post')) event.preventDefault(); }}
                onDrop={event => { if (!onMove) return; event.preventDefault(); const id = event.dataTransfer.getData('application/x-socialchoice-post'); if (id) onMove(id, date); }}
                className={`min-h-28 p-2 border-b border-r ${typeof day !== 'string' && day.inMonth === false ? 'bg-muted/40 text-muted-foreground' : ''}`}>
                <p className="text-xs mb-2">{Number(date.slice(-2))}</p>
                {(postsByDay[date] || []).map(post => <Button variant="ghost" type="button" key={post.id} onClick={() => onSelect(post)}
                    draggable={!!onMove} onDragStart={event => { if (onMove) { event.dataTransfer.setData('application/x-socialchoice-post', post.id); event.dataTransfer.effectAllowed = 'move'; } }}
                    className="h-auto block w-full text-left border-l-2 border-brand bg-muted rounded px-2 py-1 text-[11px] mb-1 truncate">
                    {formatTime(post.scheduled_at, timezone)} · {post.title}
                </Button>)}
            </div>;
        })}
    </div></div>;
}
