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
} from '@phosphor-icons/react';

export const PLATFORM_CONFIG = {
    facebook: {
        icon: FacebookLogo,
        color: 'text-[#1877F2]',
        bg: 'bg-[#1877F2]/10',
        border: 'border-[#1877F2]/20',
        label: 'Facebook',
    },
    instagram: {
        icon: InstagramLogo,
        color: 'text-[#E4405F]',
        bg: 'bg-[#E4405F]/10',
        border: 'border-[#E4405F]/20',
        label: 'Instagram',
    },
    threads: {
        icon: ThreadsLogo,
        color: 'text-foreground',
        bg: 'bg-muted',
        border: 'border-border',
        label: 'Threads',
    },
    tiktok: {
        icon: TiktokLogo,
        color: 'text-foreground',
        bg: 'bg-muted',
        border: 'border-border',
        label: 'TikTok',
    },
    linkedin: {
        icon: LinkedinLogo,
        color: 'text-[#0A66C2]',
        bg: 'bg-[#0A66C2]/10',
        border: 'border-[#0A66C2]/20',
        label: 'LinkedIn',
    },
    youtube: {
        icon: YoutubeLogo,
        color: 'text-[#FF0000]',
        bg: 'bg-[#FF0000]/10',
        border: 'border-[#FF0000]/20',
        label: 'YouTube',
    },
    x: {
        icon: XLogo,
        color: 'text-foreground',
        bg: 'bg-muted',
        border: 'border-border',
        label: 'X',
    },
    reddit: {
        icon: RedditLogo,
        color: 'text-[#FF4500]',
        bg: 'bg-[#FF4500]/10',
        border: 'border-[#FF4500]/20',
        label: 'Reddit',
    },
};

export default function PlatformBadge({ platform, name = '', showName = true, className = '', size = 'sm' }) {
    const config = PLATFORM_CONFIG[platform] || {
        icon: Globe,
        color: 'text-muted-foreground',
        bg: 'bg-muted',
        border: 'border-border',
        label: platform || 'Web',
    };
    const Icon = config.icon;
    const isSmall = size === 'sm';

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-lg border font-medium ${config.bg} ${config.border} ${
                isSmall ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'
            } ${className}`}
            title={name || config.label}
        >
            <Icon size={isSmall ? 13 : 15} weight="fill" className={`shrink-0 ${config.color}`} />
            {showName && (
                <span className="truncate max-w-[120px] text-foreground font-medium">
                    {name || config.label}
                </span>
            )}
        </span>
    );
}

