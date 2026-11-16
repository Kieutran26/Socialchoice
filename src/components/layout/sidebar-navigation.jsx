import { NavLink } from 'react-router-dom';
import {
    SquaresFour,
    ChartLineUp,
    Sparkle,
    PencilSimple,
    Article,
    CopySimple,
    CalendarBlank,
    Compass,
    Target,
    Stack,
    TreeStructure,
    Images,
    Users,
    LinkSimple,
    Tag,
    Wrench,
    Storefront,
} from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';

const NAV_GROUPS = [
    {
        title: 'GENERAL',
        items: [
            { to: '/overview', label: 'Overview', icon: SquaresFour },
            { to: '/analytics', label: 'Analytics', icon: ChartLineUp },
        ],
    },
    {
        title: 'CONTENT',
        items: [
            { to: '/agent', label: 'AI Agent Chat', icon: Sparkle },
            { to: '/create', label: 'Create Post', icon: PencilSimple },
            { to: '/posts', label: 'All Posts', icon: Article },
            { to: '/templates', label: 'Post templates', icon: CopySimple },
            { to: '/calendar', label: 'Content Calendar', icon: CalendarBlank },
        ],
    },
    {
        title: 'STRATEGY',
        items: [
            { to: '/strategy', label: 'Content Strategy', icon: Compass },
            { to: '/strategy/campaigns', label: 'Campaigns', icon: Target },
            { to: '/strategy/pillars', label: 'Content Pillars', icon: Stack },
            { to: '/strategy/angles', label: 'Content Angles', icon: TreeStructure },
        ],
    },
    {
        title: 'RESOURCES',
        items: [
            { to: '/brands', label: 'Brands', icon: Tag },
            { to: '/accounts', label: 'Social Accounts', icon: Users },
            { to: '/media', label: 'Media Library', icon: Images },
            { to: '/shortlinks', label: 'Shortlinks', icon: LinkSimple },
            { to: '/tiktok-shop', label: 'TikTok Shop', icon: Storefront, badge: 'HOT' },
            { to: '/tools', label: 'Tiện ích & Công cụ', icon: Wrench },
        ],
    },
];

function NavItem({ to, label, icon: Icon, badge, onNavigate }) {
    const { t } = useTranslation();
    return (
        <NavLink
            to={to}
            end
            onClick={onNavigate}
            className={({ isActive }) =>
                `group relative flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 sm:py-2 text-[13px] min-h-[38px] sm:min-h-9 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${isActive
                    ? 'bg-brand border-brand-dark text-brand-ink font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-brand-ink hover:bg-brand/20 font-medium'
                }`
            }
        >
            {({ isActive }) => (
                <>
                    <div className="flex items-center gap-3 min-w-0">
                        <Icon size={18} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                        <span className="truncate">{t(label)}</span>
                    </div>
                    {badge && (
                        <span className="shrink-0 rounded bg-red-600 text-white font-black text-[9px] px-1.5 py-0.2 tracking-wider">
                            {badge}
                        </span>
                    )}
                </>
            )}
        </NavLink>
    );
}

export default function SidebarNavigation({ onNavigate }) {
    const { t } = useTranslation();

    return (
        <nav aria-label={t('Main navigation')} className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-4 pr-1">
            {NAV_GROUPS.map((group) => (
                <div key={group.title} className="space-y-1">
                    <p className="flex items-center gap-2 px-3 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                        {t(group.title)}
                    </p>
                    <div className="space-y-0.5">
                        {group.items.map((item) => (
                            <NavItem
                                key={item.to}
                                to={item.to}
                                label={item.label}
                                icon={item.icon}
                                badge={item.badge}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </nav>
    );
}
