import PostizConnectionCard from '@/components/accounts/postiz-connection-card';
import { requireNoTemplateReferences } from '@/lib/post-templates';
import AddChannelDialog, { hasConnectionReturn } from '@/components/accounts/add-channel-dialog';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    FacebookLogo,
    InstagramLogo,
    LinkedinLogo,
    RedditLogo,
    ThreadsLogo,
    TiktokLogo,
    XLogo,
    YoutubeLogo,
    Plus,
    Trash,
    Plugs,
    PlugsConnected,
    WarningCircle,
    CheckCircle,
    ShieldCheck,
    ArrowsClockwise,
    Users,
    IdentificationBadge,
    Globe,
    ShareNetwork,
    MagnifyingGlass,
    X,
    SquaresFour,
    ListBullets,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import AddAccountDialog from '@/components/accounts/AddAccountDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONNECTION_LABEL, CONNECTION_TONE, PLATFORM_LABEL } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import { isDesktop } from '@/api/desktop/runtime';

const PLATFORM_CONFIG = {
    facebook: {
        label: 'Facebook',
        icon: FacebookLogo,
        weight: 'fill',
        border: 'border-[#1877f2]/20',
        bg: 'bg-[#1877f2]/10',
        text: 'text-[#1877f2]',
    },
    instagram: {
        label: 'Instagram',
        icon: InstagramLogo,
        weight: 'regular',
        border: 'border-[#e4405f]/25',
        bg: 'bg-[#e4405f]/10',
        text: 'text-[#e4405f]',
    },
    threads: {
        label: 'Threads',
        icon: ThreadsLogo,
        weight: 'regular',
        border: 'border-foreground/20',
        bg: 'bg-foreground/5',
        text: 'text-foreground',
    },
    tiktok: {
        label: 'TikTok',
        icon: TiktokLogo,
        weight: 'fill',
        border: 'border-foreground/20',
        bg: 'bg-foreground/5',
        text: 'text-foreground',
    },
    linkedin: {
        label: 'LinkedIn',
        icon: LinkedinLogo,
        weight: 'fill',
        border: 'border-[#0a66c2]/25',
        bg: 'bg-[#0a66c2]/10',
        text: 'text-[#0a66c2]',
    },
    youtube: {
        label: 'YouTube',
        icon: YoutubeLogo,
        weight: 'fill',
        border: 'border-[#ff0033]/25',
        bg: 'bg-[#ff0033]/10',
        text: 'text-[#ff0033]',
    },
    x: {
        label: 'X',
        icon: XLogo,
        weight: 'regular',
        border: 'border-foreground/20',
        bg: 'bg-foreground/5',
        text: 'text-foreground',
    },
    reddit: {
        label: 'Reddit',
        icon: RedditLogo,
        weight: 'fill',
        border: 'border-[#ff4500]/25',
        bg: 'bg-[#ff4500]/10',
        text: 'text-[#ff4500]',
    },
};

const DEFAULT_PLATFORM_CONFIG = {
    label: 'Social',
    icon: PlugsConnected,
    weight: 'duotone',
    border: 'border-border',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
};

export default function SocialAccounts() {
    const { t } = useTranslation();
    const { scope, brands, selectedBrandId, demoMode } = useWorkspace();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState([]);
    const [addOpen, setAddOpen] = useState(false);
    const [channelOpen, setChannelOpen] = useState(hasConnectionReturn);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [fixTarget, setFixTarget] = useState(null);
    const [reconnect, setReconnect] = useState(null);
    const [checkingId, setCheckingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [platformFilter, setPlatformFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid');

    const load = useCallback(async () => {
        setLoading(true);
        const page = await appClient.entities.SocialAccount.filter(scope, { sort: 'name', limit: 300 });
        setAccounts(page.items);
        setLoading(false);
    }, [scope]);

    useEffect(() => {
        load();
    }, [load]);

    const add = async (values) => {
        await appClient.entities.SocialAccount.create({ ...values, is_demo: demoMode });
        toast({ title: t("Destination reference added"), description: t("Planning only. OAuth and publishing are not configured.") });
        setAddOpen(false);
        load();
    };

    const setBrand = async (account, brand_id) => {
        await appClient.entities.SocialAccount.update(account.id, { brand_id });
        toast({ title: t("Brand updated") });
        load();
    };

    const disconnect = async (account) => {
        if (account.credential_id) {
            await (account.connection_provider === 'postiz' ? appClient.postiz : account.platform === 'linkedin'
                ? appClient.linkedin
                : account.platform === 'tiktok'
                ? appClient.tiktok
                : account.platform === 'threads'
                ? appClient.threads
                : appClient.meta
            ).disconnect(account.id);
        } else {
            await appClient.entities.SocialAccount.update(account.id, { connection_status: 'disconnected' });
        }
        toast({
            title: t("{value1} disconnected", { value1: account.name }),
            description: t("No new jobs will start for this account. An already started request may still complete."),
        });
        load();
    };

    const remove = async () => {
        await requireNoTemplateReferences(appClient.entities.PostTemplate, 'account_ids', deleteTarget, t);
        const jobs = await appClient.entities.PublishJob.count({ social_account_id: deleteTarget.id });
        if (jobs > 0) {
            toast({
                variant: 'destructive',
                title: t("This destination has publishing history"),
                description: t("Disconnect it instead — published records stay intact."),
            });
            setDeleteTarget(null);
            return;
        }
        await appClient.entities.SocialAccount.delete(deleteTarget.id);
        toast({ title: t("Destination removed") });
        setDeleteTarget(null);
        load();
    };

    const handleCheckAccess = async (account) => {
        setCheckingId(account.id);
        try {
            const result = await (account.connection_provider === 'postiz' ? appClient.postiz : account.platform === 'linkedin'
                ? appClient.linkedin
                : account.platform === 'tiktok'
                ? appClient.tiktok
                : account.platform === 'threads'
                ? appClient.threads
                : appClient.meta
            ).check(account.id);
            if (result.connected === false) throw new Error('Postiz channel is disconnected');
            toast({
                title: t(
                    account.platform === 'linkedin'
                        ? 'LinkedIn access verified'
                        : account.platform === 'tiktok'
                        ? 'TikTok access verified'
                        : account.platform === 'threads'
                        ? 'Threads access verified'
                        : account.platform === 'instagram'
                        ? 'Instagram access verified'
                        : 'Facebook Page access verified'
                ),
            });
        } catch (e) {
            toast({ variant: 'destructive', title: t(e.message) });
        } finally {
            setCheckingId(null);
            load();
        }
    };

    const handleFixConnection = (account) => {
        if (account.connection_provider === 'postiz') { handleCheckAccess(account); return; }
        if (isDesktop() && ['facebook', 'instagram', 'threads', 'linkedin', 'tiktok'].includes(account.platform)) {
            setReconnect({ platform: account.platform, brandId: account.brand_id });
            setChannelOpen(true);
            return;
        }
        if (!account.credential_id) return setFixTarget(account);
        (account.platform === 'linkedin'
            ? appClient.linkedin.start(account.brand_id)
            : account.platform === 'tiktok'
            ? appClient.tiktok.start(account.brand_id)
            : account.platform === 'threads'
            ? appClient.threads.start(account.brand_id)
            : appClient.meta.start(account.brand_id, account.platform)
        )
            .then((result) => window.location.assign(result.url))
            .catch((e) => toast({ variant: 'destructive', title: t(e.message) }));
    };

    const connectedCount = useMemo(() => {
        return accounts.filter((a) => a.connection_status === 'connected').length;
    }, [accounts]);

    const activeBrandsCount = useMemo(() => {
        return new Set(accounts.map((a) => a.brand_id).filter(Boolean)).size;
    }, [accounts]);

    const uniquePlatforms = useMemo(() => {
        return Array.from(new Set(accounts.map((a) => a.platform)));
    }, [accounts]);

    const filteredAccounts = useMemo(() => {
        return accounts.filter((account) => {
            if (platformFilter !== 'all' && account.platform !== platformFilter) return false;
            if (!searchQuery.trim()) return true;
            const q = searchQuery.trim().toLowerCase();
            return (
                account.name?.toLowerCase().includes(q) ||
                account.username?.toLowerCase().includes(q) ||
                account.external_id?.toLowerCase().includes(q)
            );
        });
    }, [accounts, platformFilter, searchQuery]);

    const byBrand = useMemo(() => {
        return brands.map((brand) => ({
            brand,
            items: filteredAccounts.filter((account) => account.brand_id === brand.id),
        }));
    }, [brands, filteredAccounts]);

    const ungrouped = useMemo(() => {
        return filteredAccounts.filter(
            (account) => !brands.some((brand) => brand.id === account.brand_id)
        );
    }, [brands, filteredAccounts]);

    const displayedGroups = useMemo(() => {
        return [...byBrand, { brand: null, items: ungrouped }].filter((group) => group.items.length > 0);
    }, [byBrand, ungrouped]);

    return (
        <>
            <PageHeader
                title={t("Social Accounts")}
                description={t('Manage connected Facebook, Instagram, Threads, TikTok and LinkedIn accounts by brand.')}
                actions={
                    <button type="button" className="btn-skew" onClick={() => setChannelOpen(true)}>
                        <Plus size={16} weight="duotone" /> {t("Add channel")}
                    </button>
                }
            />

            <PostizConnectionCard brands={brands} defaultBrandId={selectedBrandId} demoMode={demoMode} onChanged={load} />
            <div className="space-y-6">
                {/* Metric Summary Bar */}
                {!loading && accounts.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label={t("Total destinations")}
                            value={accounts.length}
                            hint={t("Across all brands")}
                            icon={ShareNetwork}
                        />
                        <StatCard
                            label={t("Connected")}
                            value={connectedCount}
                            hint={t("{value1} active destinations", { value1: connectedCount })}
                            icon={CheckCircle}
                        />
                        <StatCard
                            label={t("Brands")}
                            value={activeBrandsCount}
                            hint={t("Assigned brands")}
                            icon={IdentificationBadge}
                        />
                        <StatCard
                            label={t("Platforms active")}
                            value={uniquePlatforms.length}
                            hint={t("Unique social networks")}
                            icon={Globe}
                        />
                    </div>
                )}

                {/* Filter, Search Bar and View Mode Switcher */}
                {!loading && accounts.length > 0 && (
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                            <div className="relative flex-1 min-w-[200px] max-w-sm">
                                <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder={t("Search destinations…")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>

                            {uniquePlatforms.length > 1 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setPlatformFilter('all')}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                                            platformFilter === 'all'
                                                ? 'bg-brand/15 text-brand-ink font-semibold'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                    >
                                        {t("All platforms")}
                                    </button>
                                    {uniquePlatforms.map((platform) => {
                                        const cfg = PLATFORM_CONFIG[platform] || DEFAULT_PLATFORM_CONFIG;
                                        const Icon = cfg.icon;
                                        const isSelected = platformFilter === platform;
                                        return (
                                            <button
                                                key={platform}
                                                type="button"
                                                onClick={() => setPlatformFilter(isSelected ? 'all' : platform)}
                                                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                                                    isSelected
                                                        ? 'bg-brand/15 text-brand-ink font-semibold'
                                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                }`}
                                            >
                                                <Icon size={14} weight={cfg.weight} className={cfg.text} />
                                                <span>{PLATFORM_LABEL[platform] || platform}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* View Mode Switcher: Grid (Ô) / List (Danh sách) */}
                        <div className="flex items-center self-end md:self-auto rounded-lg border border-border bg-card p-0.5 shrink-0 shadow-2xs">
                            <button
                                type="button"
                                title={t("Grid view")}
                                aria-label={t("Grid view")}
                                onClick={() => setViewMode('grid')}
                                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    viewMode === 'grid'
                                        ? 'bg-brand/15 text-brand-ink font-semibold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <SquaresFour size={15} weight={viewMode === 'grid' ? 'bold' : 'regular'} />
                                <span>{t("Grid view")}</span>
                            </button>
                            <button
                                type="button"
                                title={t("List view")}
                                aria-label={t("List view")}
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    viewMode === 'list'
                                        ? 'bg-brand/15 text-brand-ink font-semibold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <ListBullets size={15} weight={viewMode === 'list' ? 'bold' : 'regular'} />
                                <span>{t("List view")}</span>
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-[120px] rounded-2xl" />
                        <Skeleton className="h-[220px] rounded-2xl" />
                    </div>
                ) : !accounts.length ? (
                    <EmptyState
                        icon={PlugsConnected}
                        title={t("No destinations yet")}
                        description={t("Connect your social accounts and group them by brand. Accounts appear here after you approve the connection.")}
                    >
                        <Button variant="outline" type="button" onClick={() => setChannelOpen(true)}>
                            <Plus size={15} weight="bold" /> {t("Add channel")}
                        </Button>
                    </EmptyState>
                ) : displayedGroups.length === 0 ? (
                    <div className="panel p-8 text-center">
                        <p className="text-sm font-medium text-foreground">{t("No destinations match filter")}</p>
                        <p className="label-xs mt-1 text-muted-foreground">
                            {t("Try clearing the search or filter to see all destinations.")}
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 text-xs"
                            onClick={() => {
                                setSearchQuery('');
                                setPlatformFilter('all');
                            }}
                        >
                            {t("Clear filters")}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {displayedGroups.map((group) => {
                            const allConnected = group.items.every(
                                (item) => item.connection_status === 'connected'
                            );
                            return (
                                <section key={group.brand?.id || 'ungrouped'} className="panel p-5">
                                    {/* Brand Panel Header */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/80">
                                        <div className="flex items-center gap-2.5">
                                            <span
                                                className="h-3 w-3 rounded-full shrink-0 ring-2 ring-background"
                                                style={{ backgroundColor: group.brand?.color || '#9ca3af' }}
                                            />
                                            <h2 className="font-heading text-[15px] font-medium text-foreground">
                                                {group.brand?.name || t("No brand assigned")}
                                            </h2>
                                            <span className="label-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground font-medium">
                                                {group.items.length} {t("destination")}{group.items.length === 1 ? '' : t("s")}
                                            </span>
                                        </div>

                                        {allConnected && group.items.length > 0 && (
                                            <span className="inline-flex items-center gap-1.5 label-xs text-successFg font-medium">
                                                <CheckCircle size={13} weight="fill" />
                                                {t("All connected")}
                                            </span>
                                        )}
                                    </div>

                                    {/* Content: Grid Mode (Các ô) or List Mode */}
                                    {viewMode === 'grid' ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-4">
                                            {group.items.map((account) => {
                                                const config = PLATFORM_CONFIG[account.platform] || DEFAULT_PLATFORM_CONFIG;
                                                const PlatformIcon = config.icon;

                                                return (
                                                    <div
                                                        key={account.id}
                                                        className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-background/50 p-4 transition-all hover:border-border hover:bg-card hover:shadow-xs"
                                                    >
                                                        {/* Top: Avatar, Name, Status, Delete */}
                                                        <div>
                                                            <div className="flex items-start justify-between gap-2.5 mb-3">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div
                                                                        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${config.border} ${config.bg} transition-transform group-hover:scale-105`}
                                                                    >
                                                                        <PlatformIcon size={24} weight={config.weight} className={config.text} />
                                                                        {account.connection_status === 'connected' ? (
                                                                            <span
                                                                                className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-card bg-successFg"
                                                                                title={t("Connected")}
                                                                            />
                                                                        ) : account.connection_status === 'expired' || account.connection_status === 'configuration_required' ? (
                                                                            <span
                                                                                className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-card bg-warnFg"
                                                                                title={CONNECTION_LABEL[account.connection_status]}
                                                                            />
                                                                        ) : null}
                                                                    </div>

                                                                    <div className="min-w-0 flex-1">
                                                                        <h3 className="font-heading text-[14.5px] font-medium text-foreground truncate" title={account.name}>
                                                                            {account.name}
                                                                        </h3>
                                                                        <p className="label-xs text-muted-foreground truncate">
                                                                            {PLATFORM_LABEL[account.platform] || account.platform}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-dangerFg hover:bg-dangerBg/40 shrink-0"
                                                                    title={t("Remove destination")}
                                                                    aria-label={t("Remove destination")}
                                                                    onClick={() => setDeleteTarget(account)}
                                                                >
                                                                    <Trash size={13} />
                                                                </Button>
                                                            </div>

                                                            {/* Status badge and metadata */}
                                                            <div className="space-y-2 pb-3 pt-0.5 border-b border-border/60">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <StatusBadge tone={CONNECTION_TONE[account.connection_status]}>
                                                                        {CONNECTION_LABEL[account.connection_status]}
                                                                    </StatusBadge>
                                                                    {account.connection_status !== 'connected' && (
                                                                        <span className="inline-flex items-center gap-1 rounded-md bg-warnBg px-1.5 py-0.5 text-[11px] font-medium text-warnFg">
                                                                            <WarningCircle size={12} weight="bold" />
                                                                            {t("not delivering")}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
                                                                    {account.username ? (
                                                                        <span className="font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded text-[11px]">
                                                                            @{account.username}
                                                                        </span>
                                                                    ) : null}
                                                                    {account.followers ? (
                                                                        <span className="inline-flex items-center gap-1 text-[11px]">
                                                                            <Users size={12} weight="bold" />
                                                                            {formatNumber(account.followers)} {t("followers")}
                                                                        </span>
                                                                    ) : null}
                                                                    {account.external_id ? (
                                                                        <span className="font-mono text-[10.5px] text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">
                                                                            ID: {account.external_id}
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Bottom: Brand selector and action buttons */}
                                                        <div className="mt-3 space-y-2">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="label-xs text-muted-foreground shrink-0">{t("Brand")}:</span>
                                                                <Select
                                                                    value={account.brand_id}
                                                                    disabled={isDesktop() && !!account.credential_id}
                                                                    onValueChange={(value) => setBrand(account, value)}
                                                                >
                                                                    <SelectTrigger className="h-7 w-full max-w-[150px] rounded-lg text-[11.5px] bg-background border-border shadow-2xs font-medium">
                                                                        <SelectValue placeholder={t("Assign brand")} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {brands.map((brand) => (
                                                                            <SelectItem key={brand.id} value={brand.id}>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span
                                                                                        className="h-2 w-2 rounded-full shrink-0"
                                                                                        style={{ backgroundColor: brand.color }}
                                                                                    />
                                                                                    <span className="truncate">{brand.name}</span>
                                                                                </div>
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            {account.connection_status !== 'demo' ? (
                                                                <div className="space-y-1.5 pt-1">
                                                                    {account.credential_id && (
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            disabled={checkingId === account.id}
                                                                            className="w-full h-7 rounded-lg text-[11.5px] gap-1.5 font-medium hover:border-brand-dark"
                                                                            onClick={() => handleCheckAccess(account)}
                                                                        >
                                                                            {checkingId === account.id ? (
                                                                                <ArrowsClockwise size={12} className="animate-spin text-muted-foreground" />
                                                                            ) : (
                                                                                <ShieldCheck size={13} className="text-muted-foreground" />
                                                                            )}
                                                                            <span className="truncate">
                                                                                {t(
                                                                                    account.platform === 'linkedin'
                                                                                        ? 'Check LinkedIn access'
                                                                                        : account.platform === 'tiktok'
                                                                                        ? 'Check TikTok access'
                                                                                        : account.platform === 'threads'
                                                                                        ? 'Check Threads access'
                                                                                        : account.platform === 'instagram'
                                                                                        ? 'Check Instagram access'
                                                                                        : 'Check Facebook access'
                                                                                )}
                                                                            </span>
                                                                        </Button>
                                                                    )}

                                                                    <div className="grid grid-cols-2 gap-1.5">
                                                                        <Button
                                                                            variant={account.connection_status === 'connected' ? 'ghost' : 'outline'}
                                                                            size="sm"
                                                                            className={`h-7 rounded-lg text-[11px] gap-1 px-1.5 ${
                                                                                account.connection_status === 'connected'
                                                                                    ? 'text-muted-foreground hover:text-foreground'
                                                                                    : 'border-warnFg/30 text-warnFg hover:bg-warnBg/50 font-medium'
                                                                            }`}
                                                                            onClick={() => handleFixConnection(account)}
                                                                        >
                                                                            <ArrowsClockwise size={12} />
                                                                            <span className="truncate">{t("Fix connection")}</span>
                                                                        </Button>

                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-7 rounded-lg text-[11px] text-muted-foreground hover:text-foreground gap-1 px-1.5"
                                                                            disabled={account.connection_status === 'disconnected'}
                                                                            onClick={() => disconnect(account)}
                                                                        >
                                                                            <Plugs size={12} />
                                                                            <span className="truncate">{t("Disconnect")}</span>
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="pt-1 text-center">
                                                                    <span className="label-xs text-muted-foreground">{t("Sample destination")}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        /* List Mode */
                                        <div className="divide-y divide-border/60">
                                            {group.items.map((account) => {
                                                const config = PLATFORM_CONFIG[account.platform] || DEFAULT_PLATFORM_CONFIG;
                                                const PlatformIcon = config.icon;

                                                return (
                                                    <div
                                                        key={account.id}
                                                        className="group flex flex-wrap items-center justify-between gap-4 py-3.5 transition-colors hover:bg-muted/30 px-2 rounded-xl -mx-2"
                                                    >
                                                        {/* Account Identity and Details */}
                                                        <div className="flex items-center gap-3.5 min-w-[240px] flex-1">
                                                            <div
                                                                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${config.border} ${config.bg} transition-transform group-hover:scale-[1.03]`}
                                                            >
                                                                <PlatformIcon size={24} weight={config.weight} className={config.text} />
                                                                {account.connection_status === 'connected' ? (
                                                                    <span
                                                                        className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-card bg-successFg"
                                                                        title={t("Connected")}
                                                                    />
                                                                ) : account.connection_status === 'expired' || account.connection_status === 'configuration_required' ? (
                                                                    <span
                                                                        className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-card bg-warnFg"
                                                                        title={CONNECTION_LABEL[account.connection_status]}
                                                                    />
                                                                ) : null}
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <p className="font-heading text-[14px] font-medium text-foreground tracking-tight">
                                                                        {account.name}
                                                                    </p>
                                                                    <StatusBadge tone={CONNECTION_TONE[account.connection_status]}>
                                                                        {CONNECTION_LABEL[account.connection_status]}
                                                                    </StatusBadge>
                                                                    {account.connection_status !== 'connected' && (
                                                                        <span className="inline-flex items-center gap-1 rounded-md bg-warnBg px-1.5 py-0.5 text-[11px] font-medium text-warnFg">
                                                                            <WarningCircle size={12} weight="bold" />
                                                                            {t("not delivering")}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                                                    <span className="font-medium text-foreground/75">
                                                                        {PLATFORM_LABEL[account.platform] || account.platform}
                                                                    </span>
                                                                    {account.username ? (
                                                                        <>
                                                                            <span className="text-muted-foreground/40">·</span>
                                                                            <span className="font-mono text-muted-foreground">@{account.username}</span>
                                                                        </>
                                                                    ) : null}
                                                                    {account.followers ? (
                                                                        <>
                                                                            <span className="text-muted-foreground/40">·</span>
                                                                            <span className="inline-flex items-center gap-1">
                                                                                <Users size={12} weight="bold" />
                                                                                {formatNumber(account.followers)} {t("followers")}
                                                                            </span>
                                                                        </>
                                                                    ) : null}
                                                                    {account.external_id ? (
                                                                        <>
                                                                            <span className="text-muted-foreground/40">·</span>
                                                                            <span className="rounded bg-muted/60 px-1.5 py-0.2 font-mono text-[10.5px] text-muted-foreground border border-border/50">
                                                                                ID {account.external_id}
                                                                            </span>
                                                                        </>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Actions Group */}
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Select
                                                                value={account.brand_id}
                                                                disabled={isDesktop() && !!account.credential_id}
                                                                onValueChange={(value) => setBrand(account, value)}
                                                            >
                                                                <SelectTrigger className="h-8 w-[145px] rounded-lg text-[12px] bg-background border-border shadow-2xs font-medium">
                                                                    <SelectValue placeholder={t("Assign brand")} />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {brands.map((brand) => (
                                                                        <SelectItem key={brand.id} value={brand.id}>
                                                                            <div className="flex items-center gap-2">
                                                                                <span
                                                                                    className="h-2 w-2 rounded-full shrink-0"
                                                                                    style={{ backgroundColor: brand.color }}
                                                                                />
                                                                                <span className="truncate">{brand.name}</span>
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>

                                                            {account.connection_status !== 'demo' ? (
                                                                <>
                                                                    {account.credential_id && (
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            disabled={checkingId === account.id}
                                                                            className="h-8 rounded-lg text-[12px] gap-1.5 font-medium hover:border-brand-dark"
                                                                            onClick={() => handleCheckAccess(account)}
                                                                        >
                                                                            {checkingId === account.id ? (
                                                                                <ArrowsClockwise size={13} className="animate-spin text-muted-foreground" />
                                                                            ) : (
                                                                                <ShieldCheck size={14} className="text-muted-foreground" />
                                                                            )}
                                                                            <span>
                                                                                {t(
                                                                                    account.platform === 'linkedin'
                                                                                        ? 'Check LinkedIn access'
                                                                                        : account.platform === 'tiktok'
                                                                                        ? 'Check TikTok access'
                                                                                        : account.platform === 'threads'
                                                                                        ? 'Check Threads access'
                                                                                        : account.platform === 'instagram'
                                                                                        ? 'Check Instagram access'
                                                                                        : 'Check Facebook access'
                                                                                )}
                                                                            </span>
                                                                        </Button>
                                                                    )}

                                                                    <Button
                                                                        variant={account.connection_status === 'connected' ? 'ghost' : 'outline'}
                                                                        size="sm"
                                                                        className={`h-8 rounded-lg text-[12px] gap-1.5 ${
                                                                            account.connection_status === 'connected'
                                                                                ? 'text-muted-foreground hover:text-foreground'
                                                                                : 'border-warnFg/30 text-warnFg hover:bg-warnBg/50 font-medium'
                                                                        }`}
                                                                        onClick={() => handleFixConnection(account)}
                                                                    >
                                                                        <ArrowsClockwise size={13} />
                                                                        <span>{t("Fix connection")}</span>
                                                                    </Button>

                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 rounded-lg text-[12px] text-muted-foreground hover:text-foreground gap-1.5"
                                                                        disabled={account.connection_status === 'disconnected'}
                                                                        onClick={() => disconnect(account)}
                                                                    >
                                                                        <Plugs size={13} />
                                                                        <span>{t("Disconnect")}</span>
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <span className="label-xs">{t("Sample destination")}</span>
                                                            )}

                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-dangerFg hover:bg-dangerBg/50 transition-colors"
                                                                title={t("Remove destination")}
                                                                aria-label={t("Remove destination")}
                                                                onClick={() => setDeleteTarget(account)}
                                                            >
                                                                <Trash size={14} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>
                            );
                        })}
                    </div>
                )}
            </div>

            <AddChannelDialog
                open={channelOpen}
                onOpenChange={(value) => {
                    setChannelOpen(value);
                    if (!value) setReconnect(null);
                }}
                initialPlatform={reconnect?.platform || ''}
                brands={brands}
                defaultBrandId={reconnect?.brandId || (selectedBrandId === 'all' ? '' : selectedBrandId)}
                demoMode={demoMode}
                onChanged={load}
                onAddManually={() => {
                    setChannelOpen(false);
                    setReconnect(null);
                    setAddOpen(true);
                }}
            />

            <AddAccountDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                brands={brands}
                defaultBrandId={selectedBrandId === 'all' ? '' : selectedBrandId}
                onSubmit={add}
            />

            <AddAccountDialog
                open={!!fixTarget}
                onOpenChange={(value) => !value && setFixTarget(null)}
                brands={brands}
                defaultBrandId={fixTarget?.brand_id}
                initial={fixTarget}
                title={t("Reconnect this destination")}
                description={t("Confirm the Page details and mark it for reconnection. No fake reconnect happens: it stays in configuration required until the Meta connection is enabled for this workspace.")}
                submitLabel={t('Mark for reconnection')}
                onSubmit={async (values) => {
                    await appClient.entities.SocialAccount.update(fixTarget.id, {
                        connection_status: 'configuration_required',
                        name: values.name,
                        username: values.username,
                        external_id: values.external_id,
                        brand_id: values.brand_id,
                        followers: values.followers,
                    });
                    toast({
                        title: t("Destination marked for reconnection"),
                        description: t("It stays in configuration required until the Meta connection is enabled for this workspace."),
                    });
                    setFixTarget(null);
                    load();
                }}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(value) => !value && setDeleteTarget(null)}
                title={t("Remove {value1}?", { value1: deleteTarget?.name })}
                description={t("Only destinations without publishing history can be removed. Otherwise disconnect instead.")}
                confirmLabel={t("Remove destination")}
                destructive
                onConfirm={remove}
            />
        </>
    );
}
