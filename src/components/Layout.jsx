import { isDesktop } from '@/api/desktop/runtime';
import DesktopPrototype from './desktop-prototype';
import { Button } from '@/components/ui/button';
import SidebarNavigation from './layout/sidebar-navigation';
import PublishingNotifications from './layout/PublishingNotifications';
import { useTranslation } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { List, X, SquaresFour, CaretUpDown, Check, SignOut, CaretRight, MagnifyingGlass } from '@phosphor-icons/react';
import { WorkspaceProvider, useWorkspace } from '@/lib/workspace-context';
import { useAuth } from '@/lib/AuthContext';
import { appClient } from '@/api/app-client';

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
    '/strategy/pillars': 'Content Pillars',
    '/strategy/angles': 'Content Angles',
    '/media': 'Media Library',
    '/interactive-images': 'Interactive Images',
    '/shortlinks': 'Shortlinks',
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
    const brandDropdownRef = useRef(null);
    const searchInputRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const location = useLocation();

    const selectedBrand = brands.find((b) => b.id === selectedBrandId);
    const currentLabel = ROUTE_LABELS[location.pathname] || 'Overview';
    const currentPageTitle = t(currentLabel);
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

    useEffect(() => {
        function handleKeyDown(e) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
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
                className={`fixed inset-y-0 left-0 z-40 w-60 border-r bg-surface p-5 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
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
                        className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-card px-3 text-xs font-medium text-foreground shadow-2xs transition-all hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer ${openBrandDropdown ? 'border-foreground/30 ring-2 ring-primary/20' : 'border-border'
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
                                    ? 'bg-foreground/10 text-foreground font-semibold'
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
                                    <Check size={13} weight="bold" className="text-foreground shrink-0 ml-2" />
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
                                            ? 'bg-foreground/10 text-foreground font-semibold'
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
                                            <Check size={13} weight="bold" className="text-foreground shrink-0 ml-2" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <SidebarNavigation onNavigate={() => setOpen(false)} />

                {/* Workspace Profile Card */}
                <div className="mt-auto pt-3 border-t border-border/60 shrink-0">
                    <div className="rounded-2xl border border-border/70 bg-card p-2.5 flex items-center justify-between gap-2.5 shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted font-heading text-xs font-bold text-foreground">
                                {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'MC'}
                            </div>
                            <div className="min-w-0">
                                <div className="font-heading font-semibold text-xs text-foreground truncate">
                                    {user?.full_name || 'Mây Creative'}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="truncate">{timezone || 'Asia/Ho_Chi_Minh'}</span>
                                </div>
                            </div>
                        </div>
                        {['admin-session', 'web-customer'].includes(mode) && (
                            <button
                                type="button"
                                title={t('Sign out')}
                                aria-label={t('Sign out')}
                                onClick={() => appClient.auth.logout().catch((e) => window.alert(t(e.message)))}
                                className="text-muted-foreground hover:text-dangerFg text-xs p-2 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <SignOut size={16} />
                            </button>
                        )}
                    </div>
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
                        <div className="relative hidden sm:flex items-center">
                            <MagnifyingGlass size={15} weight="regular" className="absolute left-3 text-muted-foreground pointer-events-none" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                id="topbar-search"
                                aria-label={t("Search")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t("Search...")}
                                className="h-9 w-48 sm:w-56 md:w-64 lg:w-72 rounded-xl border border-border bg-card pl-9 pr-12 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-border transition-all"
                            />
                            <div className="absolute right-2.5 flex items-center pointer-events-none">
                                <kbd className="inline-flex h-5 items-center justify-center rounded border border-border/80 bg-muted/40 px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none">
                                    {isMac ? '⌘K' : 'Ctrl K'}
                                </kbd>
                            </div>
                        </div>

                        {!isDesktop() && <PublishingNotifications />}
                    </div>
                </header>

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
