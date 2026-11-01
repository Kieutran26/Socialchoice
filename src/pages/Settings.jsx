import { requireNoTemplateReferences } from '@/lib/post-templates';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import {
    Plus,
    PencilSimple,
    Archive,
    ArrowCounterClockwise,
    Trash,
    Database,
    GearSix,
    SignOut,
    Broadcast,
    Play,
    Sparkle,
    Tag,
    ClockCountdown,
    SquaresFour,
    CaretDown,
    Translate,
    ShieldCheck,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import BrandForm from '@/components/settings/BrandForm';
import DemoModeSwitch from '@/components/layout/DemoModeSwitch';
import StatCard from '@/components/common/StatCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { clearDemoWorkspace, seedDemoWorkspace } from '@/lib/demo-seed';
import { runPublishingEngine } from '@/lib/engine';
import { formatDateTime } from '@/lib/format';
import DesktopBackup from '@/components/desktop-backup';
import DesktopAiSettings from '@/components/desktop-ai-settings';
import DesktopLicense from '@/components/desktop-license';
import CustomerLicense from '@/components/customer-license';

export default function Settings() {
    const { t, language, setLanguage } = useTranslation();
    const { demoMode, switchMode, reload, seeding } = useWorkspace();
    const [brands, setBrands] = useState([]);
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [counts, setCounts] = useState({ posts: {}, accounts: {} });
    const [engine, setEngine] = useState({
        queued: 0,
        nextDue: null,
        connected: 0,
        available: false,
    });
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [clearOpen, setClearOpen] = useState(false);
    const [running, setRunning] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'ai' | 'brands' | 'publishing' | 'workspace'

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [
                postAgg,
                accountAgg,
                queuedCount,
                nextDue,
                connectedCount,
                me,
                brandPage,
                scheduling,
            ] = await Promise.all([
                appClient.entities.Post.aggregate({
                    query: { is_demo: demoMode },
                    groupBy: 'brand_id',
                }),
                appClient.entities.SocialAccount.aggregate({
                    query: { is_demo: demoMode },
                    groupBy: 'brand_id',
                }),
                appClient.entities.PublishJob.count({ is_demo: demoMode, status: 'pending' }),
                appClient.entities.PublishJob.filter(
                    { is_demo: demoMode, status: 'pending' },
                    { sort: 'scheduled_for', limit: 1 }
                ),
                appClient.entities.SocialAccount.count({
                    is_demo: demoMode,
                    connection_status: 'connected',
                }),
                appClient.auth.me().catch(() => null),
                appClient.entities.Brand.filter(
                    { is_demo: demoMode },
                    { sort: 'name', limit: 1000 }
                ),
                appClient.publishing.check(),
            ]);
            setCounts({
                posts: Object.fromEntries(postAgg.rows.map((row) => [row.brand_id, row.count])),
                accounts: Object.fromEntries(
                    accountAgg.rows.map((row) => [row.brand_id, row.count])
                ),
            });
            setEngine({
                queued: demoMode ? queuedCount : scheduling.queued,
                nextDue: demoMode
                    ? nextDue.items[0]?.scheduled_for || null
                    : scheduling.nextDue,
                connected: connectedCount,
                available: !scheduling.unavailable && !demoMode,
            });
            setUser(me);
            setBrands(brandPage.items);
        } catch (error) {
            setLoadError(error.message);
        } finally {
            setLoading(false);
        }
    }, [demoMode]);

    useEffect(() => {
        load();
    }, [load]);

    const saveBrand = async (values) => {
        if (editing) await appClient.entities.Brand.update(editing.id, values);
        else await appClient.entities.Brand.create({ ...values, is_demo: demoMode });
        toast({ title: editing ? t('Brand updated') : t('Brand created') });
        setFormOpen(false);
        setEditing(null);
        await reload();
        load();
    };

    const toggleBrand = async (brand) => {
        try {
            await appClient.entities.Brand.update(brand.id, {
                status: brand.status === 'archived' ? 'active' : 'archived',
            });
            toast({
                title: brand.status === 'archived' ? t('Brand restored') : t('Brand archived'),
            });
            await reload();
            await load();
        } catch (error) {
            toast({
                title: t('Unable to update brand'),
                description: t(error.message),
                variant: 'destructive',
            });
        }
    };

    const removeBrand = async () => {
        await requireNoTemplateReferences(
            appClient.entities.PostTemplate,
            'brand_id',
            deleteTarget,
            t
        );
        await appClient.entities.Brand.delete(deleteTarget.id);
        toast({ title: t('Brand deleted') });
        setDeleteTarget(null);
        await reload();
        load();
    };

    const reloadSample = async () => {
        await clearDemoWorkspace();
        await seedDemoWorkspace();
        await switchMode(true);
        toast({ title: t('Sample workspace rebuilt') });
        load();
    };

    const clearSample = async () => {
        await clearDemoWorkspace();
        setClearOpen(false);
        await switchMode(false);
        toast({ title: t('Sample data removed') });
        load();
    };

    const runEngine = async () => {
        setRunning(true);
        try {
            const result = await runPublishingEngine({ scope: { is_demo: demoMode } });
            toast({
                title: t(
                    result.unavailable
                        ? 'Automatic publishing unavailable'
                        : 'Automatic publishing ready'
                ),
                description: t(result.message),
            });
            load();
        } finally {
            setRunning(false);
        }
    };

    if (loadError)
        return (
            <div role="alert" className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs">
                <p className="mb-3 text-xs text-dangerFg font-medium">{t(loadError)}</p>
                <button type="button" className="btn-skew text-xs" onClick={load}>
                    {t('Retry')}
                </button>
            </div>
        );

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('Settings')}
                description={t(
                    'Brands, workspace data and how publishing runs in this workspace.'
                )}
            />

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <StatCard
                    label={t('Active brands')}
                    value={brands.length}
                    hint={t('{count} configured', { count: brands.length })}
                    icon={Tag}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                />
                <StatCard
                    label={t('Connected destinations')}
                    value={engine.connected}
                    hint={t('Facebook Pages with a live connection')}
                    icon={Broadcast}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                />
                <StatCard
                    label={t('Queued publications')}
                    value={engine.queued}
                    hint={t('Pending delivery jobs')}
                    icon={ClockCountdown}
                    iconBg="bg-amber-50"
                    iconColor="text-amber-600"
                />
                <StatCard
                    label={t('AI engine')}
                    value={isDesktop() ? 'Local AI' : 'Active'}
                    hint={t('Encrypted API Key')}
                    icon={Sparkle}
                    iconBg="bg-purple-50"
                    iconColor="text-purple-600"
                />
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-border/80 pb-3 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                        activeTab === 'all'
                            ? 'bg-foreground text-background shadow-xs'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                >
                    <SquaresFour size={16} weight={activeTab === 'all' ? 'bold' : 'regular'} />
                    <span>{t('All settings')}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('ai')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                        activeTab === 'ai'
                            ? 'bg-foreground text-background shadow-xs'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                >
                    <Sparkle size={16} weight={activeTab === 'ai' ? 'bold' : 'regular'} />
                    <span>{t('AI & Assistant')}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('brands')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                        activeTab === 'brands'
                            ? 'bg-foreground text-background shadow-xs'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                >
                    <Tag size={16} weight={activeTab === 'brands' ? 'bold' : 'regular'} />
                    <span>{t('Brands')}</span>
                    <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono ${
                            activeTab === 'brands'
                                ? 'bg-background/20 text-background'
                                : 'bg-muted text-muted-foreground'
                        }`}
                    >
                        {brands.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('publishing')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                        activeTab === 'publishing'
                            ? 'bg-foreground text-background shadow-xs'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                >
                    <Broadcast size={16} weight={activeTab === 'publishing' ? 'bold' : 'regular'} />
                    <span>{t('Publishing Engine')}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('workspace')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                        activeTab === 'workspace'
                            ? 'bg-foreground text-background shadow-xs'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                >
                    <Database size={16} weight={activeTab === 'workspace' ? 'bold' : 'regular'} />
                    <span>{t('Account & Preferences')}</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                {/* Left Column */}
                <div className="space-y-6">
                    {/* Backup/License on Desktop */}
                    {isDesktop() && <DesktopBackup />}
                    {isDesktop() && <DesktopLicense />}

                    {/* AI Configuration */}
                    {(activeTab === 'all' || activeTab === 'ai') && <DesktopAiSettings />}

                    {/* Brands Management */}
                    {(activeTab === 'all' || activeTab === 'brands') && (
                        <section className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                        <Tag size={17} weight="duotone" />
                                    </span>
                                    <div>
                                        <h2 className="text-[15px] font-semibold text-foreground">
                                            {t('Brands')}
                                        </h2>
                                        <p className="label-xs text-muted-foreground mt-0.5">
                                            {t(
                                                'Group your destinations, content pillars and publishing assets.'
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn-skew inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2"
                                    onClick={() => {
                                        setEditing(null);
                                        setFormOpen(true);
                                    }}
                                >
                                    <Plus size={15} weight="bold" />
                                    <span>{t('New brand')}</span>
                                </button>
                            </div>

                            {loading ? (
                                <Skeleton className="h-[180px] rounded-xl" />
                            ) : (
                                <div className="space-y-2.5">
                                    {brands.map((brand) => {
                                        const postCount = counts.posts[brand.id] || 0;
                                        const accountCount = counts.accounts[brand.id] || 0;
                                        const blocking = postCount > 0 || accountCount > 0;
                                        return (
                                            <div
                                                key={brand.id}
                                                className="rounded-xl border border-border/80 bg-background p-4 flex flex-wrap items-start justify-between gap-3 hover:border-border transition-colors"
                                            >
                                                <div className="min-w-0 flex items-start gap-3">
                                                    <span
                                                        className="h-9 w-9 rounded-xl shrink-0 flex items-center justify-center font-bold text-xs text-white shadow-2xs ring-1 ring-border/50"
                                                        style={{
                                                            backgroundColor: brand.color || '#ffd631',
                                                        }}
                                                    >
                                                        {brand.name.slice(0, 1).toUpperCase()}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-xs font-semibold text-foreground">
                                                                {brand.name}
                                                            </p>
                                                            {brand.is_demo && (
                                                                <StatusBadge tone="info">
                                                                    {t('Demo')}
                                                                </StatusBadge>
                                                            )}
                                                            {brand.status === 'archived' && (
                                                                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                                    {t('Archived')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="label-xs text-muted-foreground mt-1">
                                                            {brand.description || t('No description')}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                                                            <span className="rounded-md bg-muted px-2 py-0.5 font-mono">
                                                                {brand.timezone}
                                                            </span>
                                                            <span>•</span>
                                                            <span>
                                                                {accountCount} {t('destination')}
                                                                {accountCount === 1 ? '' : t('s')}
                                                            </span>
                                                            <span>•</span>
                                                            <span>
                                                                {postCount} {t('post')}
                                                                {postCount === 1 ? '' : t('s')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 ml-auto">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 rounded-lg text-xs gap-1"
                                                        onClick={() => {
                                                            setEditing(brand);
                                                            setFormOpen(true);
                                                        }}
                                                    >
                                                        <PencilSimple size={13} />
                                                        <span>{t('Edit')}</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 rounded-lg text-xs gap-1"
                                                        onClick={() => toggleBrand(brand)}
                                                    >
                                                        {brand.status === 'archived' ? (
                                                            <>
                                                                <ArrowCounterClockwise size={13} />
                                                                <span>{t('Restore')}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Archive size={13} />
                                                                <span>{t('Archive')}</span>
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 rounded-lg text-xs text-dangerFg hover:text-dangerFg hover:bg-rose-50"
                                                        disabled={blocking}
                                                        title={
                                                            blocking
                                                                ? t(
                                                                      'Brands with accounts or posts cannot be deleted — archive instead.'
                                                                  )
                                                                : t('Delete brand')
                                                        }
                                                        onClick={() => setDeleteTarget(brand)}
                                                    >
                                                        <Trash size={13} />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {!brands.length && (
                                        <p className="label-xs text-muted-foreground py-6 text-center">
                                            {t('No brands in this')} {demoMode ? t('demo') : t('live')}{' '}
                                            {t(
                                                'workspace yet. Create one to start grouping accounts and pillars.'
                                            )}
                                        </p>
                                    )}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Workspace Demo Data */}
                    {!isDesktop() && (activeTab === 'all' || activeTab === 'workspace') && (
                        <section className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-4">
                            <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                                    <Database size={17} weight="duotone" />
                                </span>
                                <div>
                                    <h2 className="text-[15px] font-semibold text-foreground">
                                        {t('Workspace data')}
                                    </h2>
                                    <p className="label-xs text-muted-foreground mt-0.5">
                                        {t('Manage sample data and simulated testing environment.')}
                                    </p>
                                </div>
                            </div>

                            <div className="max-w-sm">
                                <DemoModeSwitch />
                            </div>

                            <p className="label-xs text-muted-foreground leading-relaxed">
                                {t(
                                    'Demo data is stored separately and labelled everywhere it appears. It is never sent to a platform and is never counted as live publishing history.'
                                )}
                            </p>

                            <div className="flex flex-wrap gap-2.5 pt-2 border-t border-border/60">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 rounded-xl text-xs font-medium gap-1.5"
                                    disabled={seeding}
                                    onClick={reloadSample}
                                >
                                    <ArrowCounterClockwise size={13} />
                                    <span>{t('Rebuild sample workspace')}</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 rounded-xl text-xs font-medium text-dangerFg hover:text-dangerFg hover:bg-rose-50 gap-1.5"
                                    disabled={seeding}
                                    onClick={() => setClearOpen(true)}
                                >
                                    <Trash size={13} />
                                    <span>{t('Remove sample data')}</span>
                                </Button>
                            </div>
                        </section>
                    )}
                </div>

                {/* Right Column / Secondary Column */}
                <div className="space-y-6">
                    {/* Publishing Engine Status */}
                    {(activeTab === 'all' || activeTab === 'publishing') && (
                        <section className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-4">
                            <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                    <Broadcast size={17} weight="duotone" />
                                </span>
                                <div>
                                    <h2 className="text-[15px] font-semibold text-foreground">
                                        {t('Publishing engine')}
                                    </h2>
                                    <p className="label-xs text-muted-foreground mt-0.5">
                                        {t('Status of automated publishing.')}
                                    </p>
                                </div>
                            </div>

                            <dl className="space-y-3 text-xs">
                                <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-background border border-border/60">
                                    <dt className="text-muted-foreground">
                                        {t('Queued destination jobs')}
                                    </dt>
                                    <dd className="font-mono font-semibold text-foreground">
                                        {engine.queued}
                                    </dd>
                                </div>

                                <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-background border border-border/60">
                                    <dt className="text-muted-foreground">{t('Next job due')}</dt>
                                    <dd className="font-mono text-xs font-medium text-foreground">
                                        {engine.nextDue ? formatDateTime(engine.nextDue) : '—'}
                                    </dd>
                                </div>

                                <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-background border border-border/60">
                                    <dt className="text-muted-foreground">
                                        {t('Destinations with a live connection')}
                                    </dt>
                                    <dd className="font-mono font-semibold text-foreground">
                                        {engine.connected}
                                    </dd>
                                </div>

                                <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-background border border-border/60">
                                    <dt className="text-muted-foreground">
                                        {t('Automatic background runs')}
                                    </dt>
                                    <dd>
                                        <StatusBadge tone={engine.available ? 'success' : 'warn'}>
                                            {t(
                                                engine.available
                                                    ? 'Available after schedule confirmation'
                                                    : 'Configuration required'
                                            )}
                                        </StatusBadge>
                                    </dd>
                                </div>

                                <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-background border border-border/60">
                                    <dt className="text-muted-foreground">{t('Retry policy')}</dt>
                                    <dd className="text-right text-muted-foreground text-[11px]">
                                        {t('Uncertain deliveries are not resent')}
                                    </dd>
                                </div>
                            </dl>

                            <p className="label-xs text-muted-foreground leading-relaxed pt-1">
                                {t(
                                    isDesktop()
                                        ? 'Publishing is not included in this desktop prototype. No posts are sent.'
                                        : 'Confirmed Facebook schedules start automatically, even with the browser closed. Old calendar plans require confirmation.'
                                )}
                            </p>

                            <Button
                                variant="outline"
                                className="w-full rounded-xl h-10 text-xs font-semibold gap-1.5"
                                disabled={running}
                                onClick={runEngine}
                            >
                                <Play size={14} className={running ? 'animate-spin' : ''} weight="fill" />
                                <span>{running ? t('Checking…') : t('Check publishing availability')}</span>
                            </Button>
                        </section>
                    )}

                    {/* Language & Account Preferences */}
                    {(activeTab === 'all' || activeTab === 'workspace') && (
                        <section className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-4">
                            <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-foreground">
                                    <GearSix size={17} weight="duotone" />
                                </span>
                                <div>
                                    <h2 className="text-[15px] font-semibold text-foreground">
                                        {t('General Preferences')}
                                    </h2>
                                    <p className="label-xs text-muted-foreground mt-0.5">
                                        {t('Interface language and account details.')}
                                    </p>
                                </div>
                            </div>

                            {/* Language Selector */}
                            <div>
                                <label
                                    htmlFor="interface-language"
                                    className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
                                >
                                    {t('Interface language')}
                                </label>
                                <div className="relative flex items-center">
                                    <Translate
                                        size={15}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                    />
                                    <select
                                        id="interface-language"
                                        aria-label={t('Interface language')}
                                        value={language}
                                        onChange={(event) => setLanguage(event.target.value)}
                                        className="h-10 w-full rounded-xl border border-border/80 bg-background pl-9 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                                    >
                                        <option value="vi">Tiếng Việt</option>
                                        <option value="en">English</option>
                                    </select>
                                    <CaretDown
                                        size={14}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                    />
                                </div>
                            </div>

                            {/* Account Details */}
                            <div className="pt-3 border-t border-border/60 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-primary/20 text-foreground font-bold text-sm flex items-center justify-center shrink-0">
                                        {user?.email
                                            ? user.email.slice(0, 2).toUpperCase()
                                            : 'WO'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-foreground truncate">
                                            {user?.id === 'local-owner'
                                                ? t('Local workspace owner')
                                                : user?.full_name || t('Signed in')}
                                        </p>
                                        <p className="label-xs text-muted-foreground truncate">
                                            {user?.email || 'Asia/Ho_Chi_Minh'}
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full h-9 rounded-xl text-xs font-medium gap-1.5 text-muted-foreground hover:text-foreground"
                                    disabled={
                                        !['admin-session', 'web-customer'].includes(user?.mode)
                                    }
                                    title={
                                        ['admin-session', 'web-customer'].includes(user?.mode)
                                            ? undefined
                                            : t('Local-only workspace has no hosted sign-in session')
                                    }
                                    onClick={() =>
                                        appClient.auth
                                            .logout()
                                            .catch((error) =>
                                                toast({
                                                    title: t(error.message),
                                                    variant: 'destructive',
                                                })
                                            )
                                    }
                                >
                                    <SignOut size={14} />
                                    <span>
                                        {t(
                                            ['admin-session', 'web-customer'].includes(user?.mode)
                                                ? 'Sign out'
                                                : 'Local workspace'
                                        )}
                                    </span>
                                </Button>
                            </div>
                        </section>
                    )}

                    {/* Customer License */}
                    {!isDesktop() && <CustomerLicense />}
                </div>
            </div>

            {/* Dialogs */}
            <BrandForm
                open={formOpen}
                onOpenChange={setFormOpen}
                initial={editing}
                onSubmit={saveBrand}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(value) => !value && setDeleteTarget(null)}
                title={t('Delete {value1}?', { value1: deleteTarget?.name })}
                description={t('Only brands without accounts or posts can be deleted.')}
                confirmLabel={t('Delete brand')}
                destructive
                onConfirm={removeBrand}
            />

            <ConfirmDialog
                open={clearOpen}
                onOpenChange={setClearOpen}
                title={t('Remove all sample data?')}
                description={t(
                    'Demo brands, pillars, angles, posts, jobs and demo media are deleted. Live workspace data is untouched.'
                )}
                confirmLabel={t('Remove sample data')}
                destructive
                onConfirm={clearSample}
            />
        </div>
    );
}
