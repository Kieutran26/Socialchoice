import { isDesktop } from '@/api/desktop/runtime';
import DesktopPrototype from './desktop-prototype';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import SidebarNavigation from './layout/sidebar-navigation';
import PublishingNotifications from './layout/PublishingNotifications';
import { useTranslation } from '@/lib/i18n';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { List, X, SquaresFour } from '@phosphor-icons/react';
import { WorkspaceProvider, useWorkspace } from '@/lib/workspace-context';
import { useAuth } from '@/lib/AuthContext';
import { appClient } from '@/api/app-client';

function Shell() {
    const { t } = useTranslation();
    const { mode, user } = useAuth();
    const { brands, selectedBrandId, setSelectedBrandId, timezone, demoMode, loading, error, retry } = useWorkspace();
    const [open, setOpen] = useState(false);

    const selectedBrand = brands.find((b) => b.id === selectedBrandId);

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
                <div className="flex items-center justify-between mb-8">
                    <NavLink to="/" className="font-heading text-xl">
                        socialchoice<span className="text-brand">.</span>
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

                <div className="mb-6">
                    <p className="label-xs mb-2 font-medium tracking-wider text-muted-foreground">
                        {t("WORKSPACE")}
                    </p>
                    <Select value={selectedBrandId || 'all'} onValueChange={setSelectedBrandId}>
                        <SelectTrigger
                            aria-label={t("Select brand")}
                            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-[13px] font-medium text-foreground shadow-2xs hover:border-border/80 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        >
                            <div className="flex items-center gap-2 truncate">
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
                        </SelectTrigger>
                        <SelectContent className="w-[var(--radix-select-trigger-width)] rounded-xl border border-border/80 bg-white p-1.5 shadow-lg">
                            <SelectItem value="all">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                                        <SquaresFour size={11} weight="duotone" />
                                    </span>
                                    <span>{t("All brands")}</span>
                                </div>
                            </SelectItem>
                            {brands.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: b.color || '#9ca3af' }}
                                        />
                                        <span className="truncate">{b.name}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
