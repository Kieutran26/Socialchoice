import { useTranslation } from '@/lib/i18n';
import { Plus, Globe } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import CalendarPostChip from './CalendarPostChip';
import { todayInZone } from '@/lib/tz';
import { getAccountAvatarUrl } from '@/lib/account-avatar';
import { PLATFORM_CONFIG } from '../common/PlatformBadge';

/**
 * Option C: Multi-Channel Timeline View (Dòng thời gian phân luồng theo từng Kênh mạng xã hội)
 * 
 * @param {{
 *   days: (string | {date: string, inMonth?: boolean})[],
 *   postsByDay: Record<string, import('../component-types').EntityRecord[]>,
 *   accounts?: import('../component-types').EntityRecord[],
 *   mediaMap?: Record<string, any>,
 *   timezone?: string,
 *   onSelect: (post: import('../component-types').EntityRecord) => void,
 *   onMove?: (id: string, date: string) => void,
 * }} props
 */
export default function ChannelTimelineView({
    days,
    postsByDay,
    accounts = [],
    mediaMap = {},
    timezone,
    onSelect,
    onMove,
}) {
    const { t } = useTranslation();
    const today = todayInZone(timezone);

    // Filter to 7 days if given more
    const timelineDays = days.slice(0, 7).map((d) => (typeof d === 'string' ? d : d.date));

    // Helper to format short day header: "T2 (04/11)"
    const formatDayHeader = (dateStr) => {
        try {
            const d = new Date(dateStr + 'T00:00:00Z');
            const dayOfWeek = (d.getUTCDay() + 6) % 7; // 0 = Mon
            const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
            const [, month, day] = dateStr.split('-');
            return {
                label: labels[dayOfWeek] || '',
                dateDisplay: `${day}/${month}`,
                isSunday: dayOfWeek === 6,
                isWeekend: dayOfWeek === 5,
            };
        } catch {
            return { label: '', dateDisplay: dateStr };
        }
    };

    // Find posts without an account or with orphaned account IDs
    const unassignedPosts = Object.values(postsByDay).flat().filter(
        (post) => !post.account_ids || !post.account_ids.some((id) => accounts.some((a) => a.id === id))
    );

    return (
        <div className="panel overflow-hidden border border-border shadow-2xs rounded-2xl bg-card">
            <div className="overflow-x-auto">
                <div className="min-w-[960px]">
                    {/* Timeline Header */}
                    <div className="grid grid-cols-8 border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground">
                        {/* Channel Column Header */}
                        <div className="p-3 border-r border-border font-semibold uppercase tracking-wider text-[11px] text-muted-foreground/80 flex items-center">
                            {t('Channel / Destination')}
                        </div>

                        {/* Days Columns */}
                        {timelineDays.map((date) => {
                            const header = formatDayHeader(date);
                            const isToday = date === today;
                            return (
                                <div
                                    key={date}
                                    className={`p-3 text-center border-r border-border/50 last:border-r-0 ${
                                        isToday ? 'bg-brand/10 text-foreground font-black' : ''
                                    }`}
                                >
                                    <span className="block">{header.label}</span>
                                    <span className="text-[10px] font-normal font-mono opacity-80 block">
                                        {header.dateDisplay}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Timeline Rows: 1 Row per Connected Social Account */}
                    {accounts.length > 0 ? (
                        accounts.map((account) => {
                            const platform = (account.platform || 'facebook').toLowerCase();
                            const platformCfg = PLATFORM_CONFIG[platform] || {
                                icon: Globe,
                                color: 'text-foreground',
                                bg: 'bg-muted',
                                label: platform,
                            };
                            const PlatformIcon = platformCfg.icon;
                            const avatarUrl = getAccountAvatarUrl(account);

                            return (
                                <div
                                    key={account.id}
                                    className="grid grid-cols-8 border-b border-border last:border-b-0 items-stretch min-h-[96px] group/row hover:bg-muted/10 transition-colors"
                                >
                                    {/* Account info cell */}
                                    <div className="p-3 border-r border-border flex items-center gap-2.5 bg-card shrink-0">
                                        <div className="relative shrink-0">
                                            {avatarUrl ? (
                                                <img
                                                    src={avatarUrl}
                                                    alt={account.name}
                                                    className="size-8 rounded-full object-cover border border-border shadow-2xs"
                                                    style={{ width: '32px', height: '32px' }}
                                                />
                                            ) : (
                                                <div
                                                    className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground border border-border"
                                                    style={{ width: '32px', height: '32px' }}
                                                >
                                                    {account.name?.[0]?.toUpperCase() || 'A'}
                                                </div>
                                            )}
                                            <span
                                                className={`absolute -bottom-1 -right-1 size-4 rounded-full ${platformCfg.bg} text-white flex items-center justify-center text-[9px] shadow-xs`}
                                                style={{ width: '16px', height: '16px' }}
                                            >
                                                <PlatformIcon size={10} weight="fill" className={platformCfg.color} />
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-foreground truncate" title={account.name}>
                                                {account.name}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground capitalize truncate">
                                                {platformCfg.label}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Days columns for this account */}
                                    {timelineDays.map((date) => {
                                        const isToday = date === today;
                                        const dayPosts = (postsByDay[date] || []).filter(
                                            (post) => post.account_ids && post.account_ids.includes(account.id)
                                        );

                                        return (
                                            <div
                                                key={date}
                                                role="group"
                                                data-calendar-date={date}
                                                onDragOver={(event) => {
                                                    if (onMove && event.dataTransfer.types.includes('application/x-socialchoice-post')) {
                                                        event.preventDefault();
                                                    }
                                                }}
                                                onDrop={(event) => {
                                                    if (!onMove) return;
                                                    event.preventDefault();
                                                    const id = event.dataTransfer.getData('application/x-socialchoice-post');
                                                    if (id) onMove(id, date);
                                                }}
                                                className={`group/cell relative p-1.5 border-r border-border/50 last:border-r-0 flex flex-col justify-start transition-colors ${
                                                    isToday ? 'bg-brand/5' : ''
                                                } hover:bg-muted/20`}
                                            >
                                                {dayPosts.length > 0 ? (
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
                                                                        event.dataTransfer.effectAllowed = 'move';
                                                                    }
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="h-full min-h-[50px] flex items-center justify-center text-[10px] text-muted-foreground/30 group-hover/cell:text-transparent relative">
                                                        <span>—</span>
                                                        <Link
                                                            to={`/create?date=${date}&account_id=${account.id}`}
                                                            className="absolute inset-0 m-auto size-6 rounded-md bg-muted hover:bg-foreground hover:text-background text-muted-foreground flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity cursor-pointer shadow-2xs"
                                                            title={t('Schedule post for {name}', { name: account.name })}
                                                        >
                                                            <Plus size={11} weight="bold" />
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center space-y-2">
                            <p className="text-sm font-semibold text-muted-foreground">
                                {t('No social accounts connected')}
                            </p>
                            <Link to="/social-accounts" className="text-xs text-primary font-bold hover:underline">
                                {t('Connect accounts in Social Accounts')} →
                            </Link>
                        </div>
                    )}

                    {/* Additional Row for Unassigned Posts (if any) */}
                    {unassignedPosts.length > 0 && (
                        <div className="grid grid-cols-8 border-b border-border items-stretch min-h-[80px] bg-muted/20">
                            <div className="p-3 border-r border-border flex items-center gap-2.5">
                                <span className="size-8 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center text-xs">
                                    <Globe size={16} />
                                </span>
                                <div>
                                    <div className="text-xs font-bold text-foreground">{t('Other / Unassigned')}</div>
                                    <div className="text-[10px] text-muted-foreground">{t('General posts')}</div>
                                </div>
                            </div>
                            {timelineDays.map((date) => {
                                const dayPosts = (postsByDay[date] || []).filter(
                                    (post) => !post.account_ids || !post.account_ids.some((id) => accounts.some((a) => a.id === id))
                                );
                                return (
                                    <div key={date} className="p-1.5 border-r border-border/50 last:border-r-0">
                                        {dayPosts.map((post) => (
                                            <CalendarPostChip
                                                key={post.id}
                                                post={post}
                                                accounts={accounts}
                                                mediaMap={mediaMap}
                                                timezone={timezone}
                                                onSelect={onSelect}
                                            />
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
