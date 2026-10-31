import { NavLink } from 'react-router-dom';
import {
    SquaresFour,
    ChartLineUp,
    PencilSimple,
    Article,
    CopySimple,
    CalendarBlank,
    Compass,
    Stack,
    TreeStructure,
    Images,
    Users,
    GearSix,
    IdentificationCard,
} from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';

const NAV_GROUPS = [
    {
        title: 'GENERAL',
        items: [
            { to: '/', label: 'Overview', icon: SquaresFour },
            { to: '/analytics', label: 'Analytics', icon: ChartLineUp },
        ],
    },
    {
        title: 'CONTENT',
        items: [
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
            { to: '/strategy/pillars', label: 'Content Pillars', icon: Stack },
            { to: '/strategy/angles', label: 'Content Angles', icon: TreeStructure },
        ],
    },
    {
        title: 'RESOURCES',
        items: [
            { to: '/media', label: 'Media Library', icon: Images },
            { to: '/accounts', label: 'Social Accounts', icon: Users },
        ],
    },
];

function NavItem({ to, label, icon: Icon, onNavigate }) {
    const { t } = useTranslation();
    return (
        <NavLink
            to={to}
            end
            onClick={onNavigate}
            className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 text-xs transition-all ${
                    isActive
                        ? 'bg-[#ffd631] text-[#2b2100] font-bold shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium'
                }`
            }
        >
            <Icon size={17} weight="bold" className="shrink-0" />
            <span className="truncate">{t(label)}</span>
        </NavLink>
    );
}

export default function SidebarNavigation({ onNavigate }) {
    const { t } = useTranslation();
    const { user } = useAuth();

    return (
        <nav aria-label={t('Main navigation')} className="min-h-0 flex-1 overflow-y-auto space-y-4 pr-1">
            {NAV_GROUPS.map((group) => (
                <div key={group.title} className="space-y-1">
                    <p className="px-3 text-[10px] font-bold tracking-wider text-muted-foreground/75 uppercase">
                        {t(group.title)}
                    </p>
                    <div className="space-y-0.5">
                        {group.items.map((item) => (
                            <NavItem
                                key={item.to}
                                to={item.to}
                                label={item.label}
                                icon={item.icon}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {/* Bottom Section: Settings & Admin */}
            <div className="pt-3 border-t border-border/60 space-y-0.5">
                <NavItem to="/settings" label="Settings" icon={GearSix} onNavigate={onNavigate} />
                {user?.role === 'admin' && user?.mode === 'admin-session' && (
                    <NavItem
                        to="/admin/licenses"
                        label="License management"
                        icon={IdentificationCard}
                        onNavigate={onNavigate}
                    />
                )}
            </div>
        </nav>
    );
}
