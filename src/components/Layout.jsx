import { isDesktop } from '@/api/desktop/runtime';
import DesktopPrototype from './desktop-prototype';
import { Button } from '@/components/ui/button';
import SidebarNavigation from './layout/sidebar-navigation';
import PublishingNotifications from './layout/PublishingNotifications';
import { useTranslation } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { List, X, SquaresFour, CaretDown, Check } from '@phosphor-icons/react';
import { WorkspaceProvider, useWorkspace } from '@/lib/workspace-context';
import { useAuth } from '@/lib/AuthContext';
import { appClient } from '@/api/app-client';

function Shell() {
    const { t } = useTranslation();
    const { mode, user } = useAuth();
    const { brands, selectedBrandId, setSelectedBrandId, timezone, demoMode, loading, error, retry } = useWorkspace();
    const [open, setOpen] = useState(false);
    const [openBrandDropdown, setOpenBrandDropdown] = useState(false);
    const brandDropdownRef = useRef(null);

    const selectedBrand = brands.find((b) => b.id === selectedBrandId);

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
                className={`fixed inset-y-0 left-0 z-40 w-60 border-r bg-surface p-5 flex flex-col transition-transform lg:translate-x-0 ${
                    open ? '' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between mb-7">
                    <NavLink to="/" className="flex items-center -ml-1.5">
                        <img
                            src="/postchoice-logo.png"
                            alt="PostChoice"
                            className="h-12 w-auto max-w-[195px] object-contain object-left"
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
                <div className="relative mb-6" ref={brandDropdownRef}>
                    <p className="label-xs mb-2 font-medium tracking-wider text-muted-foreground">
                        {t("WORKSPACE")}
                    </p>
                    <button
                        type="button"
                        aria-label={t("Select brand")}
                        aria-haspopup="listbox"
                        aria-expanded={openBrandDropdown}
                        onClick={() => setOpenBrandDropdown((prev) => !prev)}
                        className={`flex h-10 w-full items-center justify-between gap-1.5 rounded-xl border bg-card px-2.5 text-[12px] font-medium text-foreground shadow-2xs transition-all hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer ${
                            openBrandDropdown ? 'border-brand-dark ring-2 ring-primary/20' : 'border-border'
                        }`}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            {selectedBrand ? (
                                <>
                                    <span
                                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white shadow-2xs"
                                        style={{ backgroundColor: selectedBrand.color || '#9ca3af' }}
                                    >
                                        {selectedBrand.name.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="truncate">{selectedBrand.name}</span>
                                </>
                            ) : (
                                <>
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                        <SquaresFour size={12} weight="duotone" />
                                    </span>
                                    <span className="truncate">{t("All brands")}</span>
                                </>
                            )}
                        </div>
                        <CaretDown
                            size={13}
                            className={`shrink-0 text-muted-foreground transition-transform duration-200 ${
                                openBrandDropdown ? 'rotate-180 text-foreground' : ''
                            }`}
                        />
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
                                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition-colors cursor-pointer ${
                                    selectedBrandId === 'all'
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
                                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition-colors cursor-pointer ${
                                            isSelected
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

                {['admin-session', 'web-customer'].includes(mode) && (
                    <button
                        type="button"
                        className="btn-skew w-full mb-4"
                        onClick={() => appClient.auth.logout().catch((e) => window.alert(t(e.message)))}
                    >
                        {t('Sign out')}
                    </button>
                )}

                <SidebarNavigation onNavigate={() => setOpen(false)} />

                <p className="label-xs mt-auto pt-5">
                    {t(
                        mode === 'web-customer' || user?.storage === 'hosted'
                            ? 'Online workspace · {timezone}'
                            : 'Local workspace · {timezone}',
                        { timezone }
                    )}
                </p>
            </aside>

            <div className="lg:ml-60">
                <div className="h-14 border-b flex items-center gap-3 px-5">
                    <Button
                        size="icon"
                        variant="ghost"
                        type="button"
                        className="lg:hidden"
                        aria-label={t("Open menu")}
                        onClick={() => setOpen(true)}
                    >
                        <List size={22} />
                    </Button>
                    <span className="label-xs">{t("Social Publishing Hub")}</span>
                    <span className="ml-auto label-xs">{t("Review before publishing")}</span>
                    {!isDesktop() && <PublishingNotifications />}
                </div>

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
