import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CopySimple, CalendarDots, CaretDown, ChartBar, Compass, GearSix, Image, Key, NotePencil, PlugsConnected, SquaresFour, Stack, Target } from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';

const contentLinks = [
    ['/create', 'Create Post', NotePencil],
    ['/posts', 'All Posts', Stack],
    ['/templates', 'Post templates', CopySimple],
    ['/calendar', 'Content Calendar', CalendarDots],
    ['/strategy', 'Content Strategy', Target],
    ['/strategy/pillars', 'Content Pillars', Stack],
    ['/strategy/angles', 'Content Angles', Compass],
    ['/media', 'Media Library', Image],
    ['/interactive-images', 'Interactive images', Image],
];
const otherLinks = [
    ['/accounts', 'Social Accounts', PlugsConnected],
    ['/analytics', 'Analytics', ChartBar],
    ['/settings', 'Settings', GearSix],
];

function NavigationLink({ to, label, icon: Icon, nested = false, onNavigate }) {
    const { t } = useTranslation();
    return (
        <NavLink
            to={to}
            end
            onClick={onNavigate}
            className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg py-2.5 text-xs transition-colors ${
                    nested ? 'pl-5 pr-3' : 'px-3'
                } ${
                    isActive
                        ? 'bg-[#ffd631]/25 font-semibold text-[#2b2100]'
                        : 'hover:bg-muted text-foreground'
                }`
            }
        >
            <Icon size={18} className="shrink-0" />
            {t(label)}
        </NavLink>
    );
}

export default function SidebarNavigation({ onNavigate }) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { pathname } = useLocation();
    const contentActive = contentLinks.some(([to]) => pathname === to || pathname.startsWith(`${to}/`));
    const [expanded, setExpanded] = useState(true);
    useEffect(() => { if (contentActive) setExpanded(true); }, [pathname, contentActive]);
    return <nav aria-label={t('Main navigation')} className="min-h-0 flex-1 overflow-y-auto space-y-1">
        <NavigationLink to="/" label="Overview" icon={SquaresFour} onNavigate={onNavigate} />
        <div>
            <Button variant="ghost" type="button" aria-expanded={expanded} aria-controls="content-navigation" onClick={() => setExpanded(value => !value)} className={`h-auto flex w-full justify-start items-center gap-3 rounded-lg px-3 py-2.5 text-xs ${contentActive && !expanded ? 'bg-[#ffd631]/25 font-semibold text-[#2b2100]' : 'hover:bg-muted text-foreground'}`}>
                <Stack size={18} className="shrink-0" /><span>{t('Content')}</span><CaretDown size={13} className={`ml-auto shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </Button>
            <div id="content-navigation" hidden={!expanded} className="ml-3 mt-1 space-y-1 border-l border-border pl-1">
                {contentLinks.map(([to, label, Icon]) => <NavigationLink key={String(to)} to={to} label={label} icon={Icon} nested onNavigate={onNavigate} />)}
            </div>
        </div>
        {otherLinks.map(([to, label, Icon]) => <NavigationLink key={String(to)} to={to} label={label} icon={Icon} onNavigate={onNavigate} />)}
        {user?.role === 'admin' && user?.mode === 'admin-session' && <NavigationLink to="/admin/licenses" label="License management" icon={Key} onNavigate={onNavigate} />}
    </nav>;
}
