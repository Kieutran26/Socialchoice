import { Button } from '@/components/ui/button';
import SidebarNavigation from './layout/sidebar-navigation';
import PublishingNotifications from './layout/PublishingNotifications';
import { useTranslation } from '@/lib/i18n';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { List, X } from '@phosphor-icons/react';
import { WorkspaceProvider, useWorkspace } from '@/lib/workspace-context';
import { useAuth } from '@/lib/AuthContext';
import { appClient } from '@/api/app-client';
function Shell() { const { t } = useTranslation();
    const { mode } = useAuth();
   
    const { brands, selectedBrandId, setSelectedBrandId, timezone, demoMode, loading } = useWorkspace(); const [open, setOpen] = useState(false);
    return <div className="min-h-screen bg-white">{open && <Button variant="ghost" aria-label={t("Close navigation")} className="fixed inset-0 z-30 h-full w-full rounded-none bg-black/20 p-0 hover:bg-black/20 lg:hidden" onClick={() => setOpen(false)} />}<aside className={`fixed inset-y-0 left-0 z-40 w-60 border-r bg-surface p-5 flex flex-col transition-transform lg:translate-x-0 ${open ? '' : '-translate-x-full'}`}><div className="flex items-center justify-between mb-8"><NavLink to="/" className="font-heading text-xl">socialchoice<span className="text-brand">.</span></NavLink><Button size="icon" variant="ghost" type="button" className="lg:hidden" onClick={() => setOpen(false)} aria-label={t("Close menu")}><X size={20} /></Button></div><p className="label-xs mb-2">{t("WORKSPACE")}</p><select aria-label={t("Select brand")} value={selectedBrandId} onChange={e => setSelectedBrandId(e.target.value)} className="w-full rounded-lg border bg-white p-2 mb-6"><option value="all">{t("All brands")}</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>{mode === 'admin-session' && <button type="button" className="btn-skew w-full mb-4" onClick={() => appClient.auth.logout().catch(e => window.alert(t(e.message)))}>{t('Sign out')}</button>}<SidebarNavigation onNavigate={() => setOpen(false)} /><p className="label-xs mt-5">{t('Local workspace · {timezone}', { timezone })}</p></aside><div className="lg:ml-60"><div className="h-14 border-b flex items-center gap-3 px-5"><Button size="icon" variant="ghost" type="button" className="lg:hidden" aria-label={t("Open menu")} onClick={() => setOpen(true)}><List size={22} /></Button><span className="label-xs">{t("Social Publishing Hub")}</span><span className="ml-auto label-xs">{t("Review before publishing")}</span><PublishingNotifications/></div><main className="mx-auto max-w-[1600px] p-5 lg:p-8"><>{demoMode && <div role="status" className="mb-5 rounded-lg border border-warnFg bg-warnBg p-3 text-sm text-warnFg">{t("Demo workspace — simulated accounts and publishing results only. Nothing is sent to social platforms.")}</div>}{loading ? <p role="status" className="text-sm text-muted-foreground">{t("Loading workspace…")}</p> : <Outlet />}</></main></div></div>;
}
export default function Layout() { return <WorkspaceProvider><Shell /></WorkspaceProvider>; }
