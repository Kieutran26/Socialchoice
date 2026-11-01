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
    '/analytics': 'Analytics',
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
    '/accounts': 'Social Accounts',
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

    useEffect(() => {
        function handleClickOutside(event) {
            if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target)) {
                setOpenBrandDropdown(false);
            }
        }
        if (openBrandDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [openBrandDropdown]);

    return (
        <div className="min-h-screen bg-white">
            {open && (
                <Button
                    variant="ghost"
                    aria-label={t("Close navigation")}
                    className="fixed inset-0 z-30 h-full w-full rounded-none bg-black/20 p-0 hover:bg-black/20 lg:hidden"
                    onClick={() => setOpen(false)}
                />
            )}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-60 border-r bg-surface p-5 flex flex-col transition-transform lg:translate-x-0 ${open ? '' : '-translate-x-full'
                    }`}
            >
                <div className="flex items-center justify-between mb-5">
                    <NavLink to="/" className="flex items-center py-0.5">
                        <img
                            src="/postchoice-logo.png"
                            alt="PostChoice"
                            className="h-9 w-auto max-h-9 max-w-[185px] object-contain"
                        />
                    </NavLink>
                    <Button
                        size="icon"
                        variant="ghost"
                        type="button"
                        className="lg:hidden"
                        onClick={() => setOpen(false)}
                        aria-label={t("Close menu")}
                    >
                        <X size={20} />
                    </Button>
                </div>

                {/* Workspace / Brand Selector */}
                <div className="relative mb-4" ref={brandDropdownRef}>
                    <button
                        type="button"
                        aria-label={t("Select brand")}
                        aria-haspopup="listbox"
                        aria-expanded={openBrandDropdown}
                        onClick={() => setOpenBrandDropdown((prev) => !prev)}
                        className={`flex h-9 w-full items-center justify-between gap-1.5 rounded-xl border bg-card px-3 text-xs font-medium text-foreground shadow-2xs transition-all hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer ${openBrandDropdown ? 'border-brand-dark ring-2 ring-primary/20' : 'border-border'
                            }`}
                    >
                        <span className="truncate">{selectedBrand ? selectedBrand.name : t("All brands")}</span>
                        <CaretUpDown size={13} className="shrink-0 text-muted-foreground" />
                    </button>

                    {openBrandDropdown && (
                        <div
                            role="listbox"
                            className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[210px] rounded-xl border border-border/80 bg-white p-1.5 shadow-lg animate-in fade-in-0 zoom-in-95 duration-100"
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
                                    ? 'bg-brand/15 text-brand-ink font-semibold'
                                    : 'text-foreground hover:bg-muted/60'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                                        <SquaresFour size={11} weight="duotone" />
                                    </span>
                                    <span>{t("All brands")}</span>
                                </div>
                                {selectedBrandId === 'all' && (
                                    <Check size={13} weight="bold" className="text-brand-ink" />
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
                                            ? 'bg-brand/15 text-brand-ink font-semibold'
                                            : 'text-foreground hover:bg-muted/60'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
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
                <div className="mt-auto pt-3 border-t border-border/60">
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
                                onClick={() => appClient.auth.logout().catch((e) => window.alert(t(e.message)))}
                                className="text-muted-foreground hover:text-dangerFg text-xs p-1 cursor-pointer"
                            >
                                <SignOut size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            <div className="lg:ml-60">
                <header className="sticky top-0 z-30 h-14 border-b border-border bg-white/90 backdrop-blur-md flex items-center justify-between gap-3 px-5 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                        <Button
                            size="icon"
                            variant="ghost"
                            type="button"
                            className="lg:hidden shrink-0 -ml-2"
                            aria-label={t("Open menu")}
                            onClick={() => setOpen(true)}
                        >
                            <List size={20} />
                        </Button>
                        <div className="flex items-center gap-2 text-sm select-none min-w-0">
                            <NavLink
                                to="/"
                                className="font-medium text-muted-foreground hover:text-foreground transition-colors truncate"
                            >
                                PostChoice
                            </NavLink>
                            <CaretRight size={12} weight="bold" className="text-muted-foreground/60 shrink-0" />
                            <span className="font-semibold text-foreground truncate">
                                {currentPageTitle}
                            </span>
                        </div>
                    </div>

                    <div className="ml-auto flex items-center gap-3 shrink-0">
                        <div className="relative hidden sm:flex items-center">
                            <MagnifyingGlass size={15} weight="regular" className="absolute left-3 text-muted-foreground pointer-events-none" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t("Search...")}
                                className="h-9 w-52 sm:w-64 md:w-72 rounded-xl border border-border bg-card/50 pl-9 pr-11 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-border transition-all"
                            />
                            <div className="absolute right-2.5 flex items-center pointer-events-none">
                                <kbd className="inline-flex h-5 items-center justify-center rounded border border-border/80 bg-muted/40 px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none">
                                    ⌘K
                                </kbd>
                            </div>
                        </div>

                        {!isDesktop() && <PublishingNotifications />}
                    </div>
                </header>

                <main className="mx-auto max-w-[1600px] p-5 lg:p-8">
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
