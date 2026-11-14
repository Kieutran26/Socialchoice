import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { formatTime } from '@/lib/format';
import {
    FacebookLogo,
    InstagramLogo,
    LinkedinLogo,
    RedditLogo,
    ThreadsLogo,
    TiktokLogo,
    XLogo,
    YoutubeLogo,
    Globe,
    DotsSixVertical,
} from '@phosphor-icons/react';

const PLATFORM_ICONS = {
    facebook: { icon: FacebookLogo, bg: 'bg-[#1877F2]' },
    instagram: { icon: InstagramLogo, bg: 'bg-[#E4405F]' },
    threads: { icon: ThreadsLogo, bg: 'bg-zinc-900' },
    tiktok: { icon: TiktokLogo, bg: 'bg-zinc-900' },
    linkedin: { icon: LinkedinLogo, bg: 'bg-[#0A66C2]' },
    youtube: { icon: YoutubeLogo, bg: 'bg-[#FF0000]' },
    x: { icon: XLogo, bg: 'bg-zinc-900' },
    reddit: { icon: RedditLogo, bg: 'bg-[#FF4500]' },
};

const STATUS_CONFIG = {
    scheduled: {
        border: 'border-l-blue-500',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
        label: 'Đã lên lịch',
    },
    published: {
        border: 'border-l-emerald-500',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        label: 'Đã đăng',
    },
    draft: {
        border: 'border-l-zinc-300',
        badgeBg: 'bg-zinc-100 text-zinc-600 border-zinc-200',
        dot: 'bg-zinc-400',
        label: 'Nháp',
    },
    failed: {
        border: 'border-l-rose-500',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        label: 'Lỗi',
    },
    cancelled: {
        border: 'border-l-rose-500',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        label: 'Đã hủy',
    },
};

export default function CalendarPostChip({
    post,
    accounts = [],
    mediaMap = {},
    timezone = '',
    onSelect,
    draggable = false,
    onDragStart,
    compact: _compact = false,
}) {
    const { t } = useTranslation();
    const [isDragging, setIsDragging] = useState(false);
    const status = post.status || 'draft';
    const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    const canDrag = draggable && status !== 'published';

    // Resolve primary account platform
    const primaryAccountId = post.account_ids?.[0];
    const account = accounts.find((a) => a.id === primaryAccountId);
    const platform = (account?.platform || 'facebook').toLowerCase();
    const platformInfo = PLATFORM_ICONS[platform] || { icon: Globe, bg: 'bg-zinc-800' };
    const PlatformIcon = platformInfo.icon;

    // Resolve media thumbnail
    const firstMediaId = post.media_ids?.[0];
    const media = firstMediaId ? mediaMap[firstMediaId] : null;
    const thumbUrl = media?.file_url;

    // Schedule time
    const timeDisplay = post.scheduled_at ? formatTime(post.scheduled_at, timezone) : '';

    const handleDragStart = (e) => {
        if (!canDrag) {
            e.preventDefault();
            return;
        }
        setIsDragging(true);
        e.dataTransfer.setData('application/x-socialchoice-post', post.id);
        e.dataTransfer.setData('text/plain', post.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(e);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    const tooltipTitle = canDrag
        ? `${post.title || post.caption || t('Untitled post')} (${t(statusCfg.label)}) - ${t('Nắm kéo để đổi ngày')}`
        : `${post.title || post.caption || t('Untitled post')} (${t(statusCfg.label)})`;

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
                e.stopPropagation();
                onSelect?.(post);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect?.(post);
                }
            }}
            draggable={canDrag}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={`group/chip relative w-full rounded-xl border bg-card p-1.5 text-left shadow-2xs transition-all duration-150 select-none border-l-[3.5px] ${
                canDrag ? 'cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-sm' : 'cursor-pointer'
            } ${statusCfg.border} border-border hover:border-border/80 mb-1.5 ${
                isDragging ? 'opacity-30 scale-95 ring-2 ring-brand ring-offset-1 shadow-none' : ''
            }`}
            title={tooltipTitle}
        >
            {/* Top row: Platform icon + Time + Status indicator */}
            <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span
                        className={`size-4.5 rounded-full text-white flex items-center justify-center text-[9px] shrink-0 ${platformInfo.bg}`}
                        style={{ width: '18px', height: '18px' }}
                    >
                        <PlatformIcon size={11} weight="fill" />
                    </span>
                    {timeDisplay && (
                        <span className="text-[10px] font-bold font-mono text-foreground tracking-tight">
                            {timeDisplay}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 ${statusCfg.badgeBg}`}
                    >
                        {t(statusCfg.label)}
                    </span>
                    {canDrag && (
                        <span
                            className="text-muted-foreground/40 group-hover/chip:text-muted-foreground transition-colors shrink-0"
                            title={t('Nắm kéo để đổi ngày')}
                        >
                            <DotsSixVertical size={13} weight="bold" />
                        </span>
                    )}
                </div>
            </div>

            {/* Bottom row: Thumbnail (if exists) + Title */}
            <div className="flex items-center gap-1.5 min-w-0">
                {thumbUrl ? (
                    <img
                        src={thumbUrl}
                        alt=""
                        className="size-5 rounded-md object-cover border border-border/60 shrink-0"
                        style={{ width: '20px', height: '20px' }}
                    />
                ) : null}
                <span className="text-[11px] font-bold text-foreground truncate leading-tight flex-1">
                    {post.title || post.caption || t('Untitled post')}
                </span>
            </div>
        </div>
    );
}
