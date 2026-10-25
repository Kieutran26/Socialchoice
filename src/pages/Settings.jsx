import { requireNoTemplateReferences } from '@/lib/post-templates';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import { Plus, PencilSimple, Archive, ArrowCounterClockwise, Trash, Database, GearSix, SignOut, Broadcast, Play } from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import BrandForm from '@/components/settings/BrandForm';
import DemoModeSwitch from '@/components/layout/DemoModeSwitch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { clearDemoWorkspace, seedDemoWorkspace } from '@/lib/demo-seed';
import { runPublishingEngine } from '@/lib/engine';
import { formatDateTime } from '@/lib/format';
import DesktopBackup from '@/components/desktop-backup';
import DesktopAiSettings from '@/components/desktop-ai-settings';
import DesktopLicense from '@/components/desktop-license';

export default function Settings() {
    const { t, language, setLanguage } = useTranslation();
    const { demoMode, switchMode, reload, seeding } = useWorkspace();
    const [brands, setBrands] = useState([]);
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [counts, setCounts] = useState({ posts: {}, accounts: {} });
    const [engine, setEngine] = useState({ queued: 0, nextDue: null, connected: 0, available: false });
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [clearOpen, setClearOpen] = useState(false);
    const [running, setRunning] = useState(false);
    const [loadError, setLoadError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
        const [postAgg, accountAgg, queuedCount, nextDue, connectedCount, me, brandPage, scheduling] = await Promise.all([
            appClient.entities.Post.aggregate({ query: { is_demo: demoMode }, groupBy: 'brand_id' }),
            appClient.entities.SocialAccount.aggregate({ query: { is_demo: demoMode }, groupBy: 'brand_id' }),
            appClient.entities.PublishJob.count({ is_demo: demoMode, status: 'pending' }),
            appClient.entities.PublishJob.filter(
                { is_demo: demoMode, status: 'pending' },
                { sort: 'scheduled_for', limit: 1 },
            ),
            appClient.entities.SocialAccount.count({ is_demo: demoMode, connection_status: 'connected' }),
            appClient.auth.me().catch(() => null),
            appClient.entities.Brand.filter({ is_demo: demoMode }, { sort: 'name', limit: 1000 }),
            appClient.publishing.check(),
        ]);
        setCounts({
            posts: Object.fromEntries(postAgg.rows.map((row) => [row.brand_id, row.count])),
            accounts: Object.fromEntries(accountAgg.rows.map((row) => [row.brand_id, row.count])),
        });
        setEngine({ queued: demoMode ? queuedCount : scheduling.queued, nextDue: demoMode ? nextDue.items[0]?.scheduled_for || null : scheduling.nextDue, connected: connectedCount, available: !scheduling.unavailable && !demoMode });
        setUser(me);
        setBrands(brandPage.items);
        } catch (error) { setLoadError(error.message); }
        finally { setLoading(false); }
    }, [demoMode]);

    useEffect(() => {
        load();
    }, [load]);

    const saveBrand = async (values) => {
        if (editing) await appClient.entities.Brand.update(editing.id, values);
        else await appClient.entities.Brand.create({ ...values, is_demo: demoMode });
        toast({ title: editing ? t("Brand updated") : t("Brand created") });
        setFormOpen(false);
        setEditing(null);
        await reload();
        load();
    };

    const toggleBrand = async (brand) => {
        try {
        await appClient.entities.Brand.update(brand.id, { status: brand.status === 'archived' ? 'active' : 'archived' });
        toast({ title: brand.status === 'archived' ? t("Brand restored") : t("Brand archived") });
        await reload();
        await load();
        } catch (error) {
            toast({ title: t('Unable to update brand'), description: t(error.message), variant: 'destructive' });
        }
    };

    const removeBrand = async () => {
        await requireNoTemplateReferences(appClient.entities.PostTemplate, 'brand_id', deleteTarget, t);
        await appClient.entities.Brand.delete(deleteTarget.id);
        toast({ title: t("Brand deleted") });
        setDeleteTarget(null);
        await reload();
        load();
    };

    const reloadSample = async () => {
        await clearDemoWorkspace();
        await seedDemoWorkspace();
        await switchMode(true);
        toast({ title: t("Sample workspace rebuilt") });
        load();
    };

    const clearSample = async () => {
        await clearDemoWorkspace();
        setClearOpen(false);
        await switchMode(false);
        toast({ title: t("Sample data removed") });
        load();
    };

    const runEngine = async () => {
        setRunning(true);
        try {
            const result = await runPublishingEngine({ scope: { is_demo: demoMode } });
            toast({
                title: t(result.unavailable ? "Automatic publishing unavailable" : "Automatic publishing ready"),
                description: t(result.message),
            });
            load();
        } finally {
            setRunning(false);
        }
    };

    if (loadError) return <div role="alert" className="panel p-5"><p className="mb-3">{t(loadError)}</p><button type="button" className="btn-skew" onClick={load}>{t('Retry')}</button></div>;

    return (
        <>
            <PageHeader
                title={t("Settings")}
                description={t("Brands, workspace data and how publishing runs in this workspace.")}
            />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="space-y-5">
                    {isDesktop() && <DesktopBackup />}
                    {isDesktop() && <DesktopLicense />}
                    {isDesktop() && <DesktopAiSettings />}
                    <section className="panel p-5">
                        <label htmlFor="interface-language" className="mb-2 block text-[13px] font-medium">{t('Language')}</label>
                        <select id="interface-language" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary" value={language} onChange={(event) => setLanguage(event.target.value)}>
                            <option value="en">English</option>
                            <option value="vi">Tiếng Việt</option>
                        </select>
                    </section>
                    <section className="panel p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-[15px]">{t("Brands")}</h2>
                            <button
                                type="button"
                                className="btn-skew"
                                onClick={() => {
                                    setEditing(null);
                                    setFormOpen(true);
                                }}
                            >
                                <Plus size={16} weight="duotone" /> {t("New brand")} </button>
                        </div>

                        {loading ? (
                            <Skeleton className="h-[180px] rounded-xl" />
                        ) : (
                            <div className="divide-y divide-border">
                                {brands.map((brand) => {
                                    const postCount = counts.posts[brand.id] || 0;
                                    const accountCount = counts.accounts[brand.id] || 0;
                                    const blocking = postCount > 0 || accountCount > 0;
                                    return (
                                        <div key={brand.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: brand.color }} />
                                                    <p className="text-[13px] font-medium">{brand.name}</p>
                                                    {brand.is_demo ? <StatusBadge tone="info">{t("Demo")}</StatusBadge> : null}
                                                </div>
                                                <p className="label-xs mt-1">{brand.description || t("No description")}</p>
                                                <p className="label-xs mt-1">
                                                    {brand.timezone} · {accountCount} {t("destination")}{accountCount === 1 ? '' : t("s")} · {postCount} {t("post")}{postCount === 1 ? '' : t("s")}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 rounded-lg text-[12px]"
                                                    onClick={() => {
                                                        setEditing(brand);
                                                        setFormOpen(true);
                                                    }}
                                                >
                                                    <PencilSimple size={14} className="mr-1.5" /> {t("Edit")} </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 rounded-lg text-[12px]"
                                                    onClick={() => toggleBrand(brand)}
                                                >
                                                    {brand.status === 'archived' ? (
                                                        <>
                                                            <ArrowCounterClockwise size={14} className="mr-1.5" /> {t("Restore")} </>
                                                    ) : (
                                                        <>
                                                            <Archive size={14} className="mr-1.5" /> {t("Archive")} </>
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 rounded-lg text-[12px] text-dangerFg hover:text-dangerFg"
                                                    disabled={blocking}
                                                    title={
                                                        blocking
                                                            ? t("Brands with accounts or posts cannot be deleted — archive instead.")
                                                            : t("Delete brand")
                                                    }
                                                    onClick={() => setDeleteTarget(brand)}
                                                >
                                                    <Trash size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {!brands.length ? (
                                    <p className="label-xs py-4"> {t("No brands in this")} {demoMode ? t("demo") : t("live")} {t("workspace yet. Create one to start grouping accounts and pillars.")} </p>
                                ) : null}
                            </div>
                        )}
                    </section>

                    {!isDesktop() && <section className="panel p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <Database size={16} />
                            <h2 className="text-[15px]">{t("Workspace data")}</h2>
                        </div>
                        <div className="max-w-sm">
                            <DemoModeSwitch />
                        </div>
                        <p className="label-xs mt-4"> {t("Demo data is stored separately and labelled everywhere it appears. It is never sent to a platform and is never counted as live publishing history.")} </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Button variant="outline" className="rounded-lg" disabled={seeding} onClick={reloadSample}> {t("Rebuild sample workspace")} </Button>
                            <Button
                                variant="outline"
                                className="rounded-lg text-dangerFg hover:text-dangerFg"
                                disabled={seeding}
                                onClick={() => setClearOpen(true)}
                            > {t("Remove sample data")} </Button>
                        </div>
                    </section>}
                </div>

                <div className="space-y-5">
                    <section className="panel p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <Broadcast size={16} />
                            <h2 className="text-[15px]">{t("Publishing engine")}</h2>
                        </div>
                        <dl className="space-y-2 text-[12px]">
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted-foreground">{t("Queued destination jobs")}</dt>
                                <dd>{engine.queued}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted-foreground">{t("Next job due")}</dt>
                                <dd>{engine.nextDue ? formatDateTime(engine.nextDue) : '—'}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted-foreground">{t("Destinations with a live connection")}</dt>
                                <dd>{engine.connected}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted-foreground">{t("Automatic background runs")}</dt>
                                <dd>
                                    <StatusBadge tone={engine.available ? "success" : "warn"}>{t(engine.available ? "Available after schedule confirmation" : "Configuration required")}</StatusBadge>
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted-foreground">{t("Retry policy")}</dt>
                                <dd>{t("Uncertain deliveries are not resent")}</dd>
                            </div>
                        </dl>

                        <p className="label-xs mt-4"> {t(isDesktop() ? 'Publishing is not included in this desktop prototype. No posts are sent.' : 'Confirmed Facebook schedules start automatically, even with the browser closed. Old calendar plans require confirmation.')} </p>

                        <Button
                            variant="outline"
                            className="mt-4 w-full rounded-lg"
                            disabled={running}
                            onClick={runEngine}
                        >
                            <Play size={14} className="mr-1.5" />
                            {running ? t("Checking…") : t("Check publishing availability")}
                        </Button>
                    </section>

                    <section className="panel p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <GearSix size={16} />
                            <h2 className="text-[15px]">{t("Account")}</h2>
                        </div>
                        <p className="text-[13px]">{user?.id === 'local-owner' ? t('Local workspace owner') : user?.full_name || t("Signed in")}</p>
                        <p className="label-xs mt-1">{user?.email}</p>
                        <Button
                            variant="outline"
                            className="mt-4 rounded-lg"
                            disabled title={t("Local-only workspace has no hosted sign-in session")}
                        >
                            <SignOut size={14} className="mr-1.5" /> {t("Local workspace")} </Button>
                    </section>
                </div>
            </div>

            <BrandForm open={formOpen} onOpenChange={setFormOpen} initial={editing} onSubmit={saveBrand} />

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(value) => !value && setDeleteTarget(null)}
                title={t("Delete {value1}?", {value1: deleteTarget?.name})}
                description={t("Only brands without accounts or posts can be deleted.")}
                confirmLabel={t("Delete brand")}
                destructive
                onConfirm={removeBrand}
            />

            <ConfirmDialog
                open={clearOpen}
                onOpenChange={setClearOpen}
                title={t("Remove all sample data?")}
                description={t("Demo brands, pillars, angles, posts, jobs and demo media are deleted. Live workspace data is untouched.")}
                confirmLabel={t("Remove sample data")}
                destructive
                onConfirm={clearSample}
            />
        </>
    );
}

