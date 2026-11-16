import { isDesktop } from '@/api/desktop/runtime';
import DesktopPrototype from './desktop-prototype';
import { Button } from '@/components/ui/button';
import SidebarNavigation from './layout/sidebar-navigation';
import PublishingNotifications from './layout/PublishingNotifications';
import CommandSearchDialog from './layout/CommandSearchDialog';
import { useTranslation } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { List, X, SquaresFour, CaretUpDown, Check, SignOut, CaretRight, CaretUp, MagnifyingGlass, GearSix, IdentificationCard, Crown, BookOpen, ArrowUUpLeft, UserSwitch } from '@phosphor-icons/react';
import { WorkspaceProvider, useWorkspace } from '@/lib/workspace-context';
import { useAuth } from '@/lib/AuthContext';
import { appClient } from '@/api/app-client';
import { getActiveSubscription, clearActiveMember, getRoleMeta } from '@/lib/team-seats';

const ROUTE_LABELS = {
    '/': 'Overview',
    '/overview': 'Overview',
    '/app': 'Overview',
    '/dashboard': 'Overview',
    '/analytics': 'Analytics',
    '/agent': 'AI Agent Chat',
    '/create': 'Create Post',
    '/posts': 'All Posts',
    '/templates': 'Post templates',
    '/templates/create': 'Create Template',
    '/calendar': 'Content Calendar',
    '/strategy': 'Content Strategy',
    '/strategy/campaigns': 'Campaigns',
    '/campaigns': 'Campaigns',
    '/strategy/pillars': 'Content Pillars',
    '/strategy/angles': 'Content Angles',
    '/media': 'Media Library',
    '/interactive-images': 'Interactive Images',
    '/shortlinks': 'Shortlinks',
    '/docs': 'Tài liệu hướng dẫn',
    '/huong-dan': 'Tài liệu hướng dẫn',
    '/accounts': 'Social Accounts',
    '/brands': 'Brands',
    '/settings': 'Settings',
    '/admin/licenses': 'Admin Licenses',
};

function Shell() {
    const { t } = useTranslation();
    const { mode, user } = useAuth();
    const { brands, selectedBrandId, setSelectedBrandId, timezone, demoMode, loading, error, retry } = useWorkspace();
    const [open, setOpen] = useState(false);
    const [openBrandDropdown, setOpenBrandDropdown] = useState(false);
    const [openProfileMenu, setOpenProfileMenu] = useState(false);
    const [openCommandSearch, setOpenCommandSearch] = useState(false);
    const [subscription, setSubscription] = useState(getActiveSubscription);
    const brandDropdownRef = useRef(null);
    const profileMenuRef = useRef(null);
    const location = useLocation();

    useEffect(() => {
        const syncSub = () => setSubscription(getActiveSubscription());
        window.addEventListener('storage', syncSub);
        window.addEventListener('socialchoice:subscription', syncSub);
        return () => {
            window.removeEventListener('storage', syncSub);
            window.removeEventListener('socialchoice:subscription', syncSub);
        };
    }, []);

    const selectedBrand = brands.find((b) => b.id === selectedBrandId);
    const currentLabel = ROUTE_LABELS[location.pathname] || 'Overview';
    const currentPageTitle = t(currentLabel);
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

    useEffect(() => {
        function handleKeyDown(e) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpenCommandSearch((prev) => !prev);
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Handle Escape and outside clicks for brand selector
    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                setOpenBrandDropdown(false);
            }
        }
        function handleClickOutside(event) {
            if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target)) {
                setOpenBrandDropdown(false);
            }
        }
        if (openBrandDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [openBrandDropdown]);

    // Handle Escape and outside clicks for profile menu
    useEffect(() => {
        if (!openProfileMenu) return;
        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                setOpenProfileMenu(false);
            }
        }
        function handleClickOutside(event) {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setOpenProfileMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [openProfileMenu]);

    // Handle Escape and body scroll lock for mobile navigation drawer
    useEffect(() => {
        if (!open) return;
        function handleEscape(e) {
            if (e.key === 'Escape') {
                setOpen(false);
            }
        }
        window.addEventListener('keydown', handleEscape);
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = originalOverflow;
        };
    }, [open]);

    return (
        <div className="min-h-screen bg-surface">
            {open && (
                <button
                    type="button"
                    aria-label={t("Close navigation")}
                    className="fixed inset-0 z-30 h-full w-full bg-black/20 lg:hidden cursor-pointer"
                    onClick={() => setOpen(false)}
                />
            )}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-brand-dark/40 bg-surface p-5 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
                    }`}
            >
                <div className="flex items-center justify-between mb-5 shrink-0">
                    <NavLink to="/" className="flex items-center py-0.5" aria-label="Socialchoice">
                        <img
                            src="/socialchoice-logo.png"
                            alt="Socialchoice"
                            className="h-8 w-auto max-w-[170px] object-contain"
                        />
                    </NavLink>
                    <Button
                        size="icon"
                        variant="ghost"
                        type="button"
                        className="lg:hidden min-h-11 min-w-11 h-11 w-11 flex items-center justify-center cursor-pointer"
                        onClick={() => setOpen(false)}
                        aria-label={t("Close menu")}
                    >
                        <X size={20} />
                    </Button>
                </div>

                {/* Workspace / Brand Selector */}
                <div className="relative mb-4 shrink-0" ref={brandDropdownRef}>
                    <button
                        type="button"
                        aria-label={t("Select brand")}
                        aria-haspopup="listbox"
                        aria-expanded={openBrandDropdown}
                        onClick={() => setOpenBrandDropdown((prev) => !prev)}
                        className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-brand-dark hover:bg-brand/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer ${openBrandDropdown ? 'border-brand-dark bg-brand/10' : 'border-border'
                            }`}
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            {selectedBrand ? (
                                <span
                                    className="h-2 w-2 rounded-full shrink-0"
                                    style={{ backgroundColor: selectedBrand.color || '#9ca3af' }}
                                />
                            ) : (
                                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                                    <SquaresFour size={10} weight="duotone" />
                                </span>
                            )}
                            <span className="truncate">{selectedBrand ? selectedBrand.name : t("All brands")}</span>
                        </div>
                        <CaretUpDown size={13} className="shrink-0 text-muted-foreground ml-1" />
                    </button>

                    {openBrandDropdown && (
                        <div
                            role="listbox"
                            className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-xl border border-border bg-popover text-popover-foreground p-1.5 shadow-lg max-h-60 overflow-y-auto overscroll-contain animate-in fade-in-0 zoom-in-95 duration-100"
                        >
                            <button
                                type="button"
                                role="option"
                                aria-selected={selectedBrandId === 'all'}
                                onClick={() => {
                                    setSelectedBrandId('all');
                                    setOpenBrandDropdown(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition-colors cursor-pointer ${selectedBrandId === 'all'
                                    ? 'bg-brand/25 text-brand-ink font-semibold'
                                    : 'text-foreground hover:bg-muted/60'
                                    }`}
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                                        <SquaresFour size={11} weight="duotone" />
                                    </span>
                                    <span className="truncate">{t("All brands")}</span>
                                </div>
                                {selectedBrandId === 'all' && (
                                    <Check size={13} weight="bold" className="text-brand-ink shrink-0 ml-2" />
                                )}
                            </button>

                            {brands.length > 0 && <div className="my-1 border-t border-border/60" />}

                            {brands.map((b) => {
                                const isSelected = selectedBrandId === b.id;
                                return (
                                    <button
                                        key={b.id}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => {
                                            setSelectedBrandId(b.id);
                                            setOpenBrandDropdown(false);
                                        }}
                                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition-colors cursor-pointer ${isSelected
                                            ? 'bg-brand/25 text-brand-ink font-semibold'
                                            : 'text-foreground hover:bg-muted/60'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                                style={{ backgroundColor: b.color || '#9ca3af' }}
                                            />
                                            <span className="truncate">{b.name}</span>
                                        </div>
                                        {isSelected && (
                                            <Check size={13} weight="bold" className="text-brand-ink shrink-0 ml-2" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <SidebarNavigation onNavigate={() => setOpen(false)} />

                {/* Workspace Profile Card */}
                <div className="mt-auto pt-3 border-t border-border/60 shrink-0 relative" ref={profileMenuRef}>
                    {openProfileMenu && (
                        <div
                            role="menu"
                            aria-label={t('Account menu')}
                            className="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-2xl border border-border bg-popover p-1.5 shadow-lg space-y-0.5 animate-in fade-in-0 zoom-in-95 duration-100"
                        >
                            <NavLink
                                to="/settings"
                                end
                                role="menuitem"
                                onClick={() => {
                                    setOpenProfileMenu(false);
                                    setOpen(false);
                                }}
                                className={({ isActive }) =>
                                    `flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-xs min-h-9 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${isActive
                                        ? 'bg-brand border-brand-dark text-brand-ink font-semibold'
                                        : 'border-transparent text-foreground hover:text-brand-ink hover:bg-brand/20 font-medium'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <GearSix size={16} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                                        <span className="truncate">{t('Settings')}</span>
                                    </>
                                )}
                            </NavLink>

                            <NavLink
                                to="/docs"
                                role="menuitem"
                                onClick={() => {
                                    setOpenProfileMenu(false);
                                    setOpen(false);
                                }}
                                className={({ isActive }) =>
                                    `flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-xs min-h-9 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${isActive
                                        ? 'bg-brand border-brand-dark text-brand-ink font-semibold'
                                        : 'border-transparent text-foreground hover:text-brand-ink hover:bg-brand/20 font-medium'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <BookOpen size={16} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                                        <span className="truncate">{t('Tài liệu hướng dẫn')}</span>
                                    </>
                                )}
                            </NavLink>

                            {user?.role === 'admin' && user?.mode === 'admin-session' && (
                                <NavLink
                                    to="/admin/licenses"
                                    end
                                    role="menuitem"
                                    onClick={() => {
                                        setOpenProfileMenu(false);
                                        setOpen(false);
                                    }}
                                    className={({ isActive }) =>
                                        `flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-xs min-h-9 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${isActive
                                            ? 'bg-brand border-brand-dark text-brand-ink font-semibold'
                                            : 'border-transparent text-foreground hover:text-brand-ink hover:bg-brand/20 font-medium'
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <IdentificationCard size={16} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                                            <span className="truncate">{t('License management')}</span>
                                        </>
                                    )}
                                </NavLink>
                            )}

                            {user?.isTeamMember && (
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        setOpenProfileMenu(false);
                                        clearActiveMember();
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs min-h-9 font-semibold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                                >
                                    <UserSwitch size={16} weight="bold" className="shrink-0 text-amber-700" />
                                    <span className="truncate">{t('Quay lại quyền Owner')}</span>
                                </button>
                            )}

                            <div className="my-1 border-t border-border/60" />
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setOpenProfileMenu(false);
                                    appClient.auth.logout().catch((e) => window.alert(t(e.message)));
                                }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs min-h-9 font-medium text-dangerFg hover:bg-dangerBg transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            >
                                <SignOut size={16} className="shrink-0" />
                                <span className="truncate">{t('Sign out')}</span>
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={openProfileMenu}
                        aria-label={t('Account menu')}
                        onClick={() => setOpenProfileMenu((prev) => !prev)}
                        className={`w-full rounded-2xl border bg-card p-2.5 flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${openProfileMenu ? 'border-brand-dark bg-brand/10' : 'border-border/70 hover:border-brand-dark/60 hover:bg-brand/5'}`}
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-dark bg-brand font-heading text-xs font-bold text-brand-ink">
                                {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'MC'}
                            </div>
                            <div className="min-w-0">
                                <div className="font-heading font-semibold text-xs text-foreground truncate flex items-center gap-1.5">
                                    <span className="truncate">{user?.full_name || 'Mây Creative'}</span>
                                    {user?.isTeamMember && (
                                        <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold uppercase text-amber-900 shrink-0">
                                            {user.role}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="truncate">{timezone || 'Asia/Ho_Chi_Minh'}</span>
                                </div>
                            </div>
                        </div>
                        <span className="text-muted-foreground p-1.5 flex items-center justify-center shrink-0">
                            <CaretUp size={15} weight="bold" className={`transition-transform duration-150 ${openProfileMenu ? 'rotate-180 text-brand-ink' : ''}`} />
                        </span>
                    </button>
                </div>
            </aside>

            <div className="lg:ml-60">
                <header className="sticky top-0 z-20 h-14 border-b border-border bg-surface/90 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-3 px-3.5 sm:px-5 transition-colors">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <Button
                            size="icon"
                            variant="ghost"
                            type="button"
                            className="lg:hidden shrink-0 -ml-1.5 min-h-11 min-w-11 h-11 w-11 flex items-center justify-center cursor-pointer"
                            aria-label={t("Open menu")}
                            onClick={() => setOpen(true)}
                        >
                            <List size={22} />
                        </Button>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-sm select-none min-w-0">
                            <NavLink
                                to="/"
                                className="font-medium text-muted-foreground hover:text-foreground transition-colors truncate max-w-[70px] xs:max-w-[90px] sm:max-w-none shrink-0 sm:shrink"
                            >
                                Socialchoice
                            </NavLink>
                            <CaretRight size={12} weight="bold" className="text-muted-foreground/60 shrink-0" />
                            <span className="font-semibold text-foreground truncate min-w-0">
                                {currentPageTitle}
                            </span>
                        </div>
                    </div>

                    <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
                        <NavLink
                            to={subscription?.planKey === 'free' && !isDesktop() ? '/pricing' : '/settings?tab=license'}
                            title={
                                subscription?.planKey === 'free' && !isDesktop()
                                    ? t('Nâng cấp gói hoặc xem hạn mức')
                                    : t('Xem chi tiết gói & hạn mức')
                            }
                            className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs transition-colors ${
                                isDesktop() || (subscription?.planKey && subscription.planKey !== 'free')
                                    ? 'border-brand-dark bg-brand text-brand-ink font-bold hover:bg-[#ffe059]'
                                    : 'border-brand-dark bg-brand/25 text-brand-ink font-semibold hover:bg-brand/40'
                            }`}
                        >
                            <Crown
                                size={15}
                                weight="fill"
                                className="text-brand-ink shrink-0"
                            />
                            <span className="truncate max-w-[130px] sm:max-w-[180px]">
                                {isDesktop()
                                    ? 'Desktop (SC2)'
                                    : subscription?.planKey === 'free'
                                        ? 'Gói Free'
                                        : subscription?.planName || 'Gói Free'}
                            </span>
                            {!isDesktop() && subscription?.planKey === 'free' && (
                                <span className="hidden sm:inline-flex items-center rounded-md bg-brand-ink px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                                    Nâng cấp
                                </span>
                            )}
                        </NavLink>

                        <button
                            type="button"
                            onClick={() => setOpenCommandSearch(true)}
                            aria-label={t("Search")}
                            className="sm:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:border-brand-dark hover:text-brand-ink transition-colors cursor-pointer"
                        >
                            <MagnifyingGlass size={16} />
                        </button>
                        <button
                            type="button"
                            id="topbar-search"
                            aria-label={t("Search")}
                            onClick={() => setOpenCommandSearch(true)}
                            className="relative hidden sm:flex h-9 w-48 sm:w-56 md:w-64 lg:w-72 items-center justify-between rounded-xl border border-border bg-card pl-3 pr-2.5 text-xs text-muted-foreground hover:border-brand-dark/70 hover:bg-brand/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-all cursor-pointer"
                        >
                            <span className="flex items-center gap-2 truncate">
                                <MagnifyingGlass size={15} weight="regular" className="shrink-0" />
                                <span className="truncate">{t("Search...")}</span>
                            </span>
                            <kbd className="inline-flex h-5 shrink-0 items-center justify-center rounded border border-border/80 bg-muted/40 px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none">
                                {isMac ? '⌘K' : 'Ctrl K'}
                            </kbd>
                        </button>

                        {!isDesktop() && <PublishingNotifications />}
                    </div>
                </header>

                <CommandSearchDialog open={openCommandSearch} onOpenChange={setOpenCommandSearch} />

                <main className="mx-auto max-w-[1600px] p-4 sm:p-5 lg:p-8">
                    {demoMode && (
                        <div
                            role="status"
                            className="mb-5 rounded-lg border border-warnFg bg-warnBg p-3 text-sm text-warnFg"
                        >
                            {t(
                                "Demo workspace — simulated accounts and publishing results only. Nothing is sent to social platforms."
                            )}
                        </div>
                    )}
                    {loading ? (
                        <p role="status" className="text-sm text-muted-foreground">
                            {t("Loading workspace…")}
                        </p>
                    ) : error ? (
                        <div role="alert" className="panel p-5">
                            <p className="mb-3">{t(error)}</p>
                            <button type="button" className="btn-skew" onClick={retry}>
                                {t('Retry')}
                            </button>
                        </div>
                    ) : isDesktop() ? (
                        <DesktopPrototype>
                            <Outlet />
                        </DesktopPrototype>
                    ) : (
                        <Outlet />
                    )}
                </main>
            </div>
        </div>
    );
}

export default function Layout() {
    return (
        <WorkspaceProvider>
            <Shell />
        </WorkspaceProvider>
    );
}
