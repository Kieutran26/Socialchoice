import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowsClockwise,
    Check,
    CheckCircle,
    Copy,
    FacebookLogo,
    InstagramLogo,
    LinkedinLogo,
    ListBullets,
    MagnifyingGlass,
    Plugs,
    PlugsConnected,
    Plus,
    RedditLogo,
    ShieldCheck,
    SlidersHorizontal,
    SquaresFour,
    Tag,
    ThreadsLogo,
    TiktokLogo,
    Trash,
    Users,
    WarningCircle,
    X,
    XLogo,
    YoutubeLogo,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useWorkspace } from '@/lib/workspace-context';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import ZaloIcon from '@/components/common/ZaloIcon';
import PostizConnectionCard from '@/components/accounts/postiz-connection-card';
import AddChannelDialog, { hasConnectionReturn } from '@/components/accounts/add-channel-dialog';
import AddAccountDialog from '@/components/accounts/AddAccountDialog';
import { requireNoTemplateReferences } from '@/lib/post-templates';
import { CONNECTION_LABEL, CONNECTION_TONE, PLATFORM_LABEL } from '@/lib/constants';
import { formatNumber } from '@/lib/format';

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
        border: 'border-zinc-300',
        bg: 'bg-zinc-100',
        text: 'text-zinc-900',
    },
    tiktok: {
        label: 'TikTok',
        icon: TiktokLogo,
        weight: 'fill',
        border: 'border-zinc-300',
        bg: 'bg-zinc-100',
        text: 'text-zinc-900',
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
        border: 'border-zinc-300',
        bg: 'bg-zinc-100',
        text: 'text-zinc-900',
    },
    reddit: {
        label: 'Reddit',
        icon: RedditLogo,
        weight: 'fill',
        border: 'border-[#ff4500]/25',
        bg: 'bg-[#ff4500]/10',
        text: 'text-[#ff4500]',
    },
    zalo: {
        label: 'Zalo OA',
        icon: ZaloIcon,
        weight: 'fill',
        border: 'border-[#0068FF]/25',
        bg: 'bg-[#0068FF]/10',
        text: 'text-[#0068FF]',
    },
};

const DEFAULT_PLATFORM_CONFIG = {
    label: 'Social',
    icon: PlugsConnected,
    weight: 'duotone',
    border: 'border-zinc-200',
    bg: 'bg-zinc-100',
    text: 'text-zinc-600',
};

function formatHandle(username) {
    if (!username) return '';
    return username.startsWith('@') ? username : `@${username}`;
}

function getProviderClient(account) {
    if (account.connection_provider === 'postiz') return appClient.postiz;
    if (account.platform === 'linkedin') return appClient.linkedin;
    if (account.platform === 'tiktok') return appClient.tiktok;
    if (account.platform === 'threads') return appClient.threads;
    if (account.platform === 'x') return appClient.x;
    return appClient.meta;
}

export default function SocialAccountsNew() {
    const { t } = useTranslation();
    const { scope, brands, selectedBrandId, demoMode } = useWorkspace();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState([]);

    // Filters & View
    const [searchQuery, setSearchQuery] = useState('');
    const [platformFilter, setPlatformFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'connected' | 'attention'
    const [viewMode, setViewMode] = useState('rows'); // 'rows' | 'grid'

    // Dialogs & Drawer
    const [addOpen, setAddOpen] = useState(false);
    const [channelOpen, setChannelOpen] = useState(hasConnectionReturn);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [fixTarget, setFixTarget] = useState(null);
    const [reconnect, setReconnect] = useState(null);
    const [checkingId, setCheckingId] = useState(null);
    const [inspectingId, setInspectingId] = useState(null);
    const [copiedId, setCopiedId] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const page = await appClient.entities.SocialAccount.filter(scope, { sort: 'name', limit: 300 });
            setAccounts(page.items || []);
        } finally {
            setLoading(false);
        }
    }, [scope]);

    useEffect(() => {
        load();
    }, [load]);

    const inspectingAccount = useMemo(
        () => accounts.find((a) => a.id === inspectingId) || null,
        [accounts, inspectingId]
    );

    const add = async (values) => {
        await appClient.entities.SocialAccount.create({ ...values, is_demo: demoMode });
        toast({
            title: t('Destination reference added'),
            description: t('Planning only. OAuth and publishing are not configured.'),
        });
        setAddOpen(false);
        load();
    };

    const setBrand = async (account, brand_id) => {
        await appClient.entities.SocialAccount.update(account.id, { brand_id });
        toast({ title: t('Brand updated') });
        load();
    };

    const disconnect = async (account) => {
        if (account.credential_id) {
            await getProviderClient(account).disconnect(account.id);
        } else {
            await appClient.entities.SocialAccount.update(account.id, { connection_status: 'disconnected' });
        }
        toast({
            title: t('{value1} disconnected', { value1: account.name }),
            description: t(
                'No new jobs will start for this account. An already started request may still complete.'
            ),
        });
        load();
    };

    const remove = async () => {
        if (!deleteTarget) return;
        await requireNoTemplateReferences(appClient.entities.PostTemplate, 'account_ids', deleteTarget, t);
        const jobs = await appClient.entities.PublishJob.count({ social_account_id: deleteTarget.id });
        if (jobs > 0) {
            toast({
                variant: 'destructive',
                title: t('This destination has publishing history'),
                description: t('Disconnect it instead — published records stay intact.'),
            });
            setDeleteTarget(null);
            return;
        }
        await appClient.entities.SocialAccount.delete(deleteTarget.id);
        toast({ title: t('Destination removed') });
        if (inspectingId === deleteTarget.id) setInspectingId(null);
        setDeleteTarget(null);
        load();
    };

    const handleCheckAccess = async (account) => {
        setCheckingId(account.id);
        try {
            const result = await getProviderClient(account).check(account.id);
            if (result.connected === false) throw new Error('Postiz channel is disconnected');
            toast({
                title: t(
                    account.platform === 'x'
                        ? 'X access verified'
                        : account.platform === 'linkedin'
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

    const handleCheckAllInGroup = async (items) => {
        const eligible = items.filter((item) => item.credential_id && item.connection_status === 'connected');
        if (!eligible.length) {
            toast({ title: t('No active OAuth channels to verify in this group') });
            return;
        }
        for (const account of eligible) {
            await handleCheckAccess(account);
        }
    };

    const handleFixConnection = (account) => {
        if (account.connection_provider === 'postiz') {
            handleCheckAccess(account);
            return;
        }
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
            : account.platform === 'x'
            ? appClient.x.start(account.brand_id)
            : appClient.meta.start(account.brand_id, account.platform)
        )
            .then((result) => window.location.assign(result.url))
            .catch((e) => toast({ variant: 'destructive', title: t(e.message) }));
    };

    const handleCopyExternalId = (text) => {
        if (!text) return;
        navigator.clipboard?.writeText(text);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 1500);
    };

    const stats = useMemo(() => {
        const connected = accounts.filter((a) => a.connection_status === 'connected').length;
        const attention = accounts.filter(
            (a) => a.connection_status !== 'connected' && a.connection_status !== 'demo'
        ).length;
        const activeBrands = new Set(accounts.map((a) => a.brand_id).filter(Boolean)).size;
        const platforms = Array.from(new Set(accounts.map((a) => a.platform)));
        const platformCounts = {};
        accounts.forEach((a) => {
            platformCounts[a.platform] = (platformCounts[a.platform] || 0) + 1;
        });
        return {
            total: accounts.length,
            connected,
            attention,
            activeBrands,
            platforms,
            platformCounts,
        };
    }, [accounts]);

    const filteredAccounts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return accounts.filter((account) => {
            if (platformFilter !== 'all' && account.platform !== platformFilter) return false;
            if (statusFilter === 'connected' && account.connection_status !== 'connected') return false;
            if (
                statusFilter === 'attention' &&
                (account.connection_status === 'connected' || account.connection_status === 'demo')
            ) {
                return false;
            }
            if (q) {
                const hay = `${account.name || ''} ${account.username || ''} ${account.external_id || ''} ${
                    PLATFORM_LABEL[account.platform] || account.platform
                }`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [accounts, platformFilter, statusFilter, searchQuery]);

    const displayedGroups = useMemo(() => {
        const byBrand = brands.map((brand) => ({
            brand,
            items: filteredAccounts.filter((account) => account.brand_id === brand.id),
        }));
        const ungrouped = filteredAccounts.filter(
            (account) => !brands.some((brand) => brand.id === account.brand_id)
        );
        return [...byBrand, { brand: null, items: ungrouped }].filter((g) => g.items.length > 0);
    }, [brands, filteredAccounts]);

    const hasFilters = searchQuery.trim() !== '' || platformFilter !== 'all' || statusFilter !== 'all';

    const resetFilters = () => {
        setSearchQuery('');
        setPlatformFilter('all');
        setStatusFilter('all');
    };

    return (
        <div className="space-y-6 pb-14 max-w-[1440px] mx-auto">
            {/* Compact Editorial Header with Inline Health Metrics */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-zinc-200/80">
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="font-heading text-[26px] font-medium tracking-tight text-zinc-900">
                            {t('Social Accounts')}
                        </h1>
                        {!loading && accounts.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-2 text-[12px] text-zinc-500">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white border border-zinc-200/90 text-zinc-800 font-medium tabular-nums">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    {stats.connected}/{stats.total} {t('đang kết nối')}
                                </span>
                                <span className="text-zinc-300">·</span>
                                <span className="tabular-nums">
                                    {stats.platforms.length} {t('nền tảng')}
                                </span>
                                <span className="text-zinc-300">·</span>
                                <span className="tabular-nums">
                                    {stats.activeBrands} {t('thương hiệu')}
                                </span>
                                {stats.attention > 0 ? (
                                    <>
                                        <span className="text-zinc-300">·</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setStatusFilter((prev) =>
                                                    prev === 'attention' ? 'all' : 'attention'
                                                )
                                            }
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11.5px] font-medium transition-colors cursor-pointer ${
                                                statusFilter === 'attention'
                                                    ? 'bg-[#ffd631]/35 border-[#d8b216] text-[#2b2100]'
                                                    : 'bg-amber-50 border-amber-200/80 text-amber-800 hover:bg-amber-100/70'
                                            }`}
                                        >
                                            <WarningCircle size={13} weight="duotone" />
                                            <span className="tabular-nums">
                                                {stats.attention} {t('cần xử lý')}
                                            </span>
                                        </button>
                                    </>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                    <p className="text-[13.5px] text-zinc-500 max-w-2xl leading-relaxed">
                        {t(
                            'Quản lý các kênh Facebook, Instagram, Threads, TikTok và LinkedIn theo từng thương hiệu. Bấm vào kênh để xem chi tiết hoặc kiểm tra kết nối.'
                        )}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-lg border-zinc-200 bg-white text-zinc-700"
                        asChild
                    >
                        <Link to="/brands">
                            <Tag size={15} weight="duotone" className="mr-1.5 text-zinc-500" />
                            {t('Thương hiệu')}
                        </Link>
                    </Button>

                    <button
                        type="button"
                        onClick={() => setChannelOpen(true)}
                        className="btn-skew"
                    >
                        <Plus size={16} weight="duotone" />
                        <span>{t('Add channel')}</span>
                    </button>
                </div>
            </header>

            {/* Optional Postiz Integration Card */}
            <PostizConnectionCard
                brands={brands}
                defaultBrandId={selectedBrandId}
                demoMode={demoMode}
                onChanged={load}
            />

            {/* Unified Command & Platform Filter Bar */}
            {!loading && accounts.length > 0 ? (
                <section className="bg-white border border-zinc-200/80 rounded-2xl p-4 space-y-3.5">
                    {stats.platforms.length > 1 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setPlatformFilter('all')}
                                className={`h-8 px-3 rounded-lg text-[12px] font-medium border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                                    platformFilter === 'all'
                                        ? 'bg-[#ffd631]/30 border-[#d8b216] text-[#2b2100] font-semibold'
                                        : 'bg-zinc-50 border-zinc-200/80 text-zinc-600 hover:bg-zinc-100'
                                }`}
                            >
                                <span>{t('All platforms')}</span>
                                <span className="font-mono text-[11px] opacity-75">{stats.total}</span>
                            </button>

                            {stats.platforms.map((platform) => {
                                const cfg = PLATFORM_CONFIG[platform] || DEFAULT_PLATFORM_CONFIG;
                                const Icon = cfg.icon;
                                const active = platformFilter === platform;
                                return (
                                    <button
                                        key={platform}
                                        type="button"
                                        onClick={() => setPlatformFilter(active ? 'all' : platform)}
                                        className={`h-8 px-3 rounded-lg text-[12px] font-medium border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                                            active
                                                ? 'bg-[#ffd631]/30 border-[#d8b216] text-[#2b2100] font-semibold'
                                                : 'bg-white border-zinc-200/80 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
                                        }`}
                                    >
                                        <Icon
                                            size={14}
                                            weight={cfg.weight}
                                            className={active ? 'text-[#2b2100]' : cfg.text}
                                        />
                                        <span>{PLATFORM_LABEL[platform] || platform}</span>
                                        <span className="font-mono text-[11px] text-zinc-400">
                                            {stats.platformCounts[platform] || 0}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}

                    <div
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            stats.platforms.length > 1 ? 'pt-3 border-t border-zinc-100' : ''
                        }`}
                    >
                        <div className="relative flex-1 max-w-md">
                            <MagnifyingGlass
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('Tìm theo tên kênh, @username hoặc Channel ID...')}
                                aria-label={t('Tìm theo tên kênh, @username hoặc Channel ID...')}
                                className="w-full h-9 pl-9 pr-8 rounded-lg border border-zinc-200 bg-zinc-50/60 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216] transition"
                            />
                            {searchQuery ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    aria-label={t('Xóa tìm kiếm')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                                >
                                    <X size={14} />
                                </button>
                            ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/70">
                                {[
                                    { id: 'all', label: t('Tất cả') },
                                    { id: 'connected', label: t('Đã kết nối') },
                                    { id: 'attention', label: t('Cần xử lý') },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setStatusFilter(tab.id)}
                                        className={`h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
                                            statusFilter === tab.id
                                                ? 'bg-white text-zinc-900 shadow-2xs'
                                                : 'text-zinc-500 hover:text-zinc-900'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {hasFilters ? (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="h-8 px-2.5 rounded-lg text-[12px] text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                                >
                                    {t('Đặt lại')}
                                </button>
                            ) : null}

                            <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/70">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('rows')}
                                    className={`h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                        viewMode === 'rows'
                                            ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                            : 'text-zinc-500 hover:text-zinc-900'
                                    }`}
                                >
                                    <ListBullets size={14} weight={viewMode === 'rows' ? 'duotone' : 'regular'} />
                                    <span>{t('Danh sách')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                        viewMode === 'grid'
                                            ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                            : 'text-zinc-500 hover:text-zinc-900'
                                    }`}
                                >
                                    <SquaresFour size={14} weight={viewMode === 'grid' ? 'duotone' : 'regular'} />
                                    <span>{t('Lưới')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            ) : null}

            {/* Accounts Content */}
            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-[110px] rounded-2xl" />
                    <Skeleton className="h-[240px] rounded-2xl" />
                </div>
            ) : !accounts.length ? (
                <EmptyState
                    icon={PlugsConnected}
                    title={t('No destinations yet')}
                    description={t(
                        'Connect your social accounts and group them by brand. Accounts appear here after you approve the connection.'
                    )}
                >
                    <Button variant="outline" type="button" onClick={() => setChannelOpen(true)}>
                        <Plus size={15} weight="duotone" className="mr-1.5" />
                        {t('Add channel')}
                    </Button>
                </EmptyState>
            ) : displayedGroups.length === 0 ? (
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center space-y-3">
                    <PlugsConnected size={32} weight="duotone" className="mx-auto text-zinc-300" />
                    <p className="text-[14px] font-medium text-zinc-800">{t('No destinations match filter')}</p>
                    <p className="text-[12.5px] text-zinc-500">
                        {t('Try clearing the search or filter to see all destinations.')}
                    </p>
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                        {t('Clear filters')}
                    </Button>
                </div>
            ) : (
                <div className="space-y-5">
                    {displayedGroups.map((group) => {
                        const allConnected = group.items.every(
                            (item) => item.connection_status === 'connected'
                        );
                        const hasOauth = group.items.some((item) => item.credential_id);

                        return (
                            <section
                                key={group.brand?.id || 'ungrouped'}
                                className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden"
                            >
                                <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/60 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span
                                            className="h-3 w-3 rounded-full shrink-0 ring-2 ring-white"
                                            style={{ backgroundColor: group.brand?.color || '#a1a1aa' }}
                                        />
                                        <h2 className="font-heading text-[15px] font-medium text-zinc-900 truncate">
                                            {group.brand?.name || t('No brand assigned')}
                                        </h2>
                                        <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-zinc-600">
                                            {group.items.length} {t('kênh')}
                                        </span>
                                        {allConnected && group.items.length > 0 ? (
                                            <span className="hidden sm:inline-flex items-center gap-1 text-[11.5px] text-emerald-700 font-medium">
                                                <CheckCircle size={13} weight="fill" />
                                                {t('Tất cả ổn định')}
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {hasOauth ? (
                                            <button
                                                type="button"
                                                onClick={() => handleCheckAllInGroup(group.items)}
                                                className="h-7 px-2.5 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 text-[12px] font-medium text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                                <ArrowsClockwise
                                                    size={13}
                                                    className={checkingId ? 'animate-spin' : ''}
                                                />
                                                <span>{t('Kiểm tra nhóm')}</span>
                                            </button>
                                        ) : null}
                                    </div>
                                </div>

                                {viewMode === 'rows' ? (
                                    <ul className="divide-y divide-zinc-100">
                                        {group.items.map((account) => {
                                            const config = PLATFORM_CONFIG[account.platform] || DEFAULT_PLATFORM_CONFIG;
                                            const PlatformIcon = config.icon;
                                            const isChecking = checkingId === account.id;
                                            const isConnected = account.connection_status === 'connected';
                                            const isDemo = account.connection_status === 'demo';

                                            return (
                                                <li
                                                    key={account.id}
                                                    onClick={() => setInspectingId(account.id)}
                                                    className="px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 hover:bg-zinc-50/70 transition-colors cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                        <div
                                                            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${config.border} ${config.bg}`}
                                                        >
                                                            <PlatformIcon
                                                                size={20}
                                                                weight={config.weight}
                                                                className={config.text}
                                                            />
                                                            {isConnected ? (
                                                                <span
                                                                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
                                                                    title={t('Connected')}
                                                                />
                                                            ) : !isDemo ? (
                                                                <span
                                                                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-amber-500"
                                                                    title={CONNECTION_LABEL[account.connection_status]}
                                                                />
                                                            ) : null}
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h3 className="font-heading text-[14px] font-medium text-zinc-900 truncate">
                                                                    {account.name}
                                                                </h3>
                                                                <StatusBadge tone={CONNECTION_TONE[account.connection_status]}>
                                                                    {CONNECTION_LABEL[account.connection_status]}
                                                                </StatusBadge>
                                                                {!isConnected && !isDemo ? (
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded">
                                                                        <WarningCircle size={11} weight="bold" />
                                                                        {t('Tạm ngưng giao bài')}
                                                                    </span>
                                                                ) : null}
                                                            </div>

                                                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-zinc-500">
                                                                <span className="font-medium text-zinc-700">
                                                                    {PLATFORM_LABEL[account.platform] || account.platform}
                                                                </span>
                                                                {account.username ? (
                                                                    <>
                                                                        <span className="text-zinc-300">·</span>
                                                                        <span className="font-mono text-zinc-500">
                                                                            {formatHandle(account.username)}
                                                                        </span>
                                                                    </>
                                                                ) : null}
                                                                {account.followers ? (
                                                                    <>
                                                                        <span className="text-zinc-300">·</span>
                                                                        <span className="inline-flex items-center gap-1 tabular-nums">
                                                                            <Users size={12} />
                                                                            {formatNumber(account.followers)}
                                                                        </span>
                                                                    </>
                                                                ) : null}
                                                                {account.external_id ? (
                                                                    <>
                                                                        <span className="text-zinc-300">·</span>
                                                                        <span className="font-mono text-[11px] text-zinc-400 truncate max-w-[180px]">
                                                                            ID {account.external_id}
                                                                        </span>
                                                                    </>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div
                                                        className="flex flex-wrap items-center justify-end gap-2 shrink-0"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {!isDemo ? (
                                                            account.credential_id && isConnected ? (
                                                                <button
                                                                    type="button"
                                                                    disabled={isChecking}
                                                                    onClick={() => handleCheckAccess(account)}
                                                                    className="h-8 px-3 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 text-[12px] font-medium text-zinc-700 inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
                                                                >
                                                                    {isChecking ? (
                                                                        <ArrowsClockwise size={13} className="animate-spin" />
                                                                    ) : (
                                                                        <ShieldCheck size={14} className="text-zinc-500" />
                                                                    )}
                                                                    <span>{t('Kiểm tra')}</span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleFixConnection(account)}
                                                                    className={`h-8 px-3 rounded-lg border text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                                                        isConnected
                                                                            ? 'border-zinc-200 bg-white hover:border-zinc-300 text-zinc-700'
                                                                            : 'border-[#d8b216] bg-[#ffd631]/25 hover:bg-[#ffd631]/40 text-[#2b2100]'
                                                                    }`}
                                                                >
                                                                    <ArrowsClockwise size={13} />
                                                                    <span>{t('Kết nối lại')}</span>
                                                                </button>
                                                            )
                                                        ) : (
                                                            <span className="text-[11.5px] text-zinc-400 px-2">
                                                                {t('Kênh mẫu')}
                                                            </span>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => setInspectingId(account.id)}
                                                            className="h-8 px-2.5 rounded-lg text-[12px] font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-flex items-center gap-1 transition-colors cursor-pointer"
                                                        >
                                                            <SlidersHorizontal size={14} />
                                                            <span>{t('Chi tiết')}</span>
                                                        </button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                                        {group.items.map((account) => {
                                            const config = PLATFORM_CONFIG[account.platform] || DEFAULT_PLATFORM_CONFIG;
                                            const PlatformIcon = config.icon;
                                            const isChecking = checkingId === account.id;
                                            const isConnected = account.connection_status === 'connected';
                                            const isDemo = account.connection_status === 'demo';

                                            return (
                                                <article
                                                    key={account.id}
                                                    onClick={() => setInspectingId(account.id)}
                                                    className="rounded-xl border border-zinc-200/90 hover:border-zinc-300 bg-white p-4 flex flex-col justify-between gap-4 transition-colors cursor-pointer"
                                                >
                                                    <div className="space-y-3">
                                                        <div className="flex items-start justify-between gap-2.5">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div
                                                                    className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${config.border} ${config.bg}`}
                                                                >
                                                                    <PlatformIcon
                                                                        size={20}
                                                                        weight={config.weight}
                                                                        className={config.text}
                                                                    />
                                                                    {isConnected ? (
                                                                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                                                                    ) : !isDemo ? (
                                                                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-500" />
                                                                    ) : null}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h3
                                                                        className="font-heading text-[14px] font-medium text-zinc-900 truncate"
                                                                        title={account.name}
                                                                    >
                                                                        {account.name}
                                                                    </h3>
                                                                    <p className="text-[12px] text-zinc-500 truncate">
                                                                        {PLATFORM_LABEL[account.platform] || account.platform}
                                                                        {account.username ? ` · ${formatHandle(account.username)}` : ''}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <StatusBadge tone={CONNECTION_TONE[account.connection_status]}>
                                                                {CONNECTION_LABEL[account.connection_status]}
                                                            </StatusBadge>
                                                        </div>

                                                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-zinc-500 pt-2.5 border-t border-zinc-100">
                                                            {account.external_id ? (
                                                                <span className="font-mono text-zinc-400 truncate max-w-[190px]">
                                                                    ID {account.external_id}
                                                                </span>
                                                            ) : (
                                                                <span className="text-zinc-400">—</span>
                                                            )}
                                                            {account.followers ? (
                                                                <span className="font-medium text-zinc-700 tabular-nums">
                                                                    {formatNumber(account.followers)} {t('followers')}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    <div
                                                        className="flex items-center justify-between gap-2 pt-2.5 border-t border-zinc-100"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {!isDemo ? (
                                                            account.credential_id && isConnected ? (
                                                                <button
                                                                    type="button"
                                                                    disabled={isChecking}
                                                                    onClick={() => handleCheckAccess(account)}
                                                                    className="h-8 px-3 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 text-[12px] font-medium text-zinc-700 inline-flex items-center gap-1.5 cursor-pointer"
                                                                >
                                                                    {isChecking ? (
                                                                        <ArrowsClockwise size={13} className="animate-spin" />
                                                                    ) : (
                                                                        <ShieldCheck size={14} className="text-zinc-500" />
                                                                    )}
                                                                    <span>{t('Kiểm tra')}</span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleFixConnection(account)}
                                                                    className={`h-8 px-3 rounded-lg border text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                                                                        isConnected
                                                                            ? 'border-zinc-200 bg-white hover:border-zinc-300 text-zinc-700'
                                                                            : 'border-[#d8b216] bg-[#ffd631]/25 text-[#2b2100]'
                                                                    }`}
                                                                >
                                                                    <ArrowsClockwise size={13} />
                                                                    <span>{t('Kết nối lại')}</span>
                                                                </button>
                                                            )
                                                        ) : (
                                                            <span className="text-[11.5px] text-zinc-400">
                                                                {t('Sample destination')}
                                                            </span>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => setInspectingId(account.id)}
                                                            className="h-8 px-2.5 rounded-lg text-[12px] text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <SlidersHorizontal size={13} />
                                                            <span>{t('Chi tiết')}</span>
                                                        </button>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}

            {/* Right-Side Slide-Over Channel Inspector Drawer */}
            <Sheet open={!!inspectingAccount} onOpenChange={(open) => !open && setInspectingId(null)}>
                <SheetContent side="right" className="w-full sm:max-w-[460px] p-0 flex flex-col bg-white">
                    {inspectingAccount ? (
                        (() => {
                            const cfg =
                                PLATFORM_CONFIG[inspectingAccount.platform] || DEFAULT_PLATFORM_CONFIG;
                            const Icon = cfg.icon;
                            const isChecking = checkingId === inspectingAccount.id;
                            const isDemo = inspectingAccount.connection_status === 'demo';
                            const isConnected = inspectingAccount.connection_status === 'connected';

                            return (
                                <>
                                    <div className="px-6 py-5 border-b border-zinc-200/80 flex items-start gap-3.5">
                                        <div
                                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${cfg.border} ${cfg.bg}`}
                                        >
                                            <Icon size={22} weight={cfg.weight} className={cfg.text} />
                                        </div>
                                        <div className="min-w-0 flex-1 pr-6">
                                            <h2 className="font-heading text-[17px] font-medium text-zinc-900 truncate">
                                                {inspectingAccount.name}
                                            </h2>
                                            <p className="text-[12.5px] text-zinc-500 mt-0.5 truncate">
                                                {PLATFORM_LABEL[inspectingAccount.platform] ||
                                                    inspectingAccount.platform}
                                                {inspectingAccount.username
                                                    ? ` · ${formatHandle(inspectingAccount.username)}`
                                                    : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-clean">
                                        <div
                                            className={`rounded-xl border p-4 space-y-1.5 ${
                                                isConnected
                                                    ? 'bg-emerald-50/50 border-emerald-200/70'
                                                    : isDemo
                                                    ? 'bg-zinc-50 border-zinc-200/80'
                                                    : 'bg-amber-50/60 border-amber-200/80'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[12px] font-medium text-zinc-600">
                                                    {t('Trạng thái kết nối')}
                                                </span>
                                                <StatusBadge
                                                    tone={CONNECTION_TONE[inspectingAccount.connection_status]}
                                                >
                                                    {CONNECTION_LABEL[inspectingAccount.connection_status]}
                                                </StatusBadge>
                                            </div>
                                            <p className="text-[12px] text-zinc-600 leading-relaxed">
                                                {isConnected
                                                    ? t('Kênh đang sẵn sàng nhận và đăng bài theo lịch tự động.')
                                                    : isDemo
                                                    ? t('Đây là kênh mẫu dùng để trải nghiệm lập lịch.')
                                                    : t(
                                                          'Kênh hiện chưa thể đăng bài. Hãy kết nối lại hoặc kiểm tra quyền truy cập.'
                                                      )}
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-zinc-200/80 divide-y divide-zinc-100 text-[13px]">
                                            <div className="px-4 py-3 flex items-center justify-between gap-3">
                                                <span className="text-zinc-500">{t('Nền tảng')}</span>
                                                <span className="font-medium text-zinc-900">
                                                    {PLATFORM_LABEL[inspectingAccount.platform] ||
                                                        inspectingAccount.platform}
                                                </span>
                                            </div>

                                            {inspectingAccount.external_id ? (
                                                <div className="px-4 py-3 flex items-center justify-between gap-3">
                                                    <span className="text-zinc-500 shrink-0">{t('Channel ID')}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleCopyExternalId(inspectingAccount.external_id)
                                                        }
                                                        className="inline-flex items-center gap-1.5 font-mono text-[12px] text-zinc-800 hover:text-zinc-950 truncate cursor-pointer"
                                                        title={t('Sao chép Channel ID')}
                                                    >
                                                        <span className="truncate max-w-[200px]">
                                                            {inspectingAccount.external_id}
                                                        </span>
                                                        {copiedId ? (
                                                            <Check size={13} className="text-emerald-600 shrink-0" />
                                                        ) : (
                                                            <Copy size={13} className="text-zinc-400 shrink-0" />
                                                        )}
                                                    </button>
                                                </div>
                                            ) : null}

                                            {inspectingAccount.followers ? (
                                                <div className="px-4 py-3 flex items-center justify-between gap-3">
                                                    <span className="text-zinc-500">{t('Người theo dõi')}</span>
                                                    <span className="font-medium text-zinc-900 tabular-nums">
                                                        {formatNumber(inspectingAccount.followers)}
                                                    </span>
                                                </div>
                                            ) : null}

                                            <div className="px-4 py-3 flex items-center justify-between gap-3">
                                                <span className="text-zinc-500">{t('Cơ chế kết nối')}</span>
                                                <span className="text-zinc-800 font-medium">
                                                    {inspectingAccount.connection_provider === 'postiz'
                                                        ? 'Postiz'
                                                        : inspectingAccount.credential_id
                                                        ? t('OAuth trực tiếp')
                                                        : t('Thủ công / Chưa gắn OAuth')}
                                                </span>
                                            </div>
                                        </div>

                                        {brands.length > 0 ? (
                                            <div className="space-y-1.5">
                                                <label
                                                    htmlFor="inspect-brand"
                                                    className="label-xs block text-zinc-600 font-medium"
                                                >
                                                    {t('Thương hiệu phụ trách')}
                                                </label>
                                                <select
                                                    id="inspect-brand"
                                                    value={inspectingAccount.brand_id || ''}
                                                    disabled={isDesktop() && !!inspectingAccount.credential_id}
                                                    onChange={(e) =>
                                                        setBrand(inspectingAccount, e.target.value)
                                                    }
                                                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13.5px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216] disabled:opacity-50"
                                                >
                                                    <option value="">{t('Chưa gán thương hiệu')}</option>
                                                    {brands.map((b) => (
                                                        <option key={b.id} value={b.id}>
                                                            {b.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : null}

                                        {!isDemo ? (
                                            <div className="space-y-2 pt-2">
                                                <span className="label-xs block text-zinc-500 font-medium">
                                                    {t('Tác vụ kết nối')}
                                                </span>

                                                {inspectingAccount.credential_id ? (
                                                    <button
                                                        type="button"
                                                        disabled={isChecking}
                                                        onClick={() => handleCheckAccess(inspectingAccount)}
                                                        className="w-full h-9 px-3.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-[13px] font-medium text-zinc-800 inline-flex items-center justify-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
                                                    >
                                                        {isChecking ? (
                                                            <ArrowsClockwise size={15} className="animate-spin" />
                                                        ) : (
                                                            <ShieldCheck size={15} weight="duotone" />
                                                        )}
                                                        <span>{t('Kiểm tra quyền truy cập')}</span>
                                                    </button>
                                                ) : null}

                                                <button
                                                    type="button"
                                                    onClick={() => handleFixConnection(inspectingAccount)}
                                                    className="w-full h-9 px-3.5 rounded-lg border border-[#d8b216] bg-[#ffd631]/25 hover:bg-[#ffd631]/40 text-[13px] font-medium text-[#2b2100] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                                >
                                                    <ArrowsClockwise size={15} />
                                                    <span>{t('Kết nối lại / Làm mới OAuth')}</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={inspectingAccount.connection_status === 'disconnected'}
                                                    onClick={() => disconnect(inspectingAccount)}
                                                    className="w-full h-9 px-3.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-[13px] font-medium text-zinc-600 inline-flex items-center justify-center gap-2 disabled:opacity-40 transition-colors cursor-pointer"
                                                >
                                                    <Plugs size={15} />
                                                    <span>{t('Disconnect')}</span>
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="px-6 py-4 border-t border-zinc-200/80 bg-zinc-50/70 flex items-center justify-between gap-3">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-dangerFg hover:text-dangerFg hover:bg-dangerBg/60"
                                            onClick={() => setDeleteTarget(inspectingAccount)}
                                        >
                                            <Trash size={14} className="mr-1.5" />
                                            {t('Remove destination')}
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setInspectingId(null)}
                                        >
                                            {t('Đóng')}
                                        </Button>
                                    </div>
                                </>
                            );
                        })()
                    ) : null}
                </SheetContent>
            </Sheet>

            {/* Existing OAuth & Manual Channel Dialogs */}
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
                title={t('Reconnect this destination')}
                description={t(
                    'Confirm the Page details and mark it for reconnection. No fake reconnect happens: it stays in configuration required until the Meta connection is enabled for this workspace.'
                )}
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
                        title: t('Destination marked for reconnection'),
                        description: t(
                            'It stays in configuration required until the Meta connection is enabled for this workspace.'
                        ),
                    });
                    setFixTarget(null);
                    load();
                }}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(value) => !value && setDeleteTarget(null)}
                title={t('Remove {value1}?', { value1: deleteTarget?.name })}
                description={t(
                    'Only destinations without publishing history can be removed. Otherwise disconnect instead.'
                )}
                confirmLabel={t('Remove destination')}
                destructive
                onConfirm={remove}
            />
        </div>
    );
}
