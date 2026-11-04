import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    LinkSimple,
    Copy,
    Check,
    ArrowUpRight,
    ArrowsClockwise,
    Plus,
    CursorClick,
    Globe,
    Trash,
    Sparkle,
    CaretDown,
    MagnifyingGlass,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from '@/lib/i18n';
import PageHeader from '@/components/common/PageHeader';
import ShortlinkSettingsCard from '@/components/settings/ShortlinkSettingsCard';
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import { formatNumber, formatDateTime } from '@/lib/format';

export default function Shortlinks() {
    const { t } = useTranslation();
    const { brands, selectedBrandId, setSelectedBrandId, demoMode } = useWorkspace();
    const { toast } = useToast();

    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statsBusy, setStatsBusy] = useState(false);
    const [copiedId, setCopiedId] = useState(null);

    // Form state for creating a shortlink
    const [destinationUrl, setDestinationUrl] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [platform, setPlatform] = useState('all');
    const [creating, setCreating] = useState(false);
    const [createdResult, setCreatedResult] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const currentBrand = useMemo(() => {
        if (!brands.length) return null;
        if (selectedBrandId && selectedBrandId !== 'all') {
            return brands.find((b) => b.id === selectedBrandId) || brands[0];
        }
        return brands[0];
    }, [brands, selectedBrandId]);

    const loadLinks = useCallback(async () => {
        if (!currentBrand?.id) {
            setLinks([]);
            setLoading(false);
            return;
        }
        setStatsBusy(true);
        try {
            const res = await appClient.links.list({ brand_id: currentBrand.id });
            setLinks(res.links || []);
        } catch (err) {
            console.error('Failed to load links:', err);
        } finally {
            setStatsBusy(false);
            setLoading(false);
        }
    }, [currentBrand]);

    useEffect(() => {
        loadLinks();
    }, [loadLinks]);

    // Handle Create Shortlink
    const handleCreateShortlink = async (e) => {
        e.preventDefault();
        const rawUrl = destinationUrl.trim();
        if (!rawUrl) {
            toast({ variant: 'destructive', title: t('Vui lòng nhập đường link URL hợp lệ.') });
            return;
        }
        if (!currentBrand?.id) {
            toast({ variant: 'destructive', title: t('Vui lòng chọn Thương hiệu trước khi tạo Shortlink.') });
            return;
        }

        // Validate url protocol
        let validUrl = rawUrl;
        if (!/^https?:\/\//i.test(validUrl)) {
            validUrl = `https://${validUrl}`;
        }

        setCreating(true);
        try {
            const res = await appClient.links.create({
                brand_id: currentBrand.id,
                url: validUrl,
                campaign: campaignName.trim() || 'shortlink',
                platform: platform === 'all' ? 'direct' : platform,
            });

            setCreatedResult(res);
            setDestinationUrl('');
            setCampaignName('');
            toast({
                title: t('Tạo Shortlink thành công!'),
                description: t('Đã tạo liên kết rút gọn kèm mã theo dõi lượt nhấp.'),
            });
            loadLinks();
        } catch (err) {
            toast({
                variant: 'destructive',
                title: t('Không thể tạo Shortlink'),
                description: err.message,
            });
        } finally {
            setCreating(false);
        }
    };

    // Copy link helper
    const handleCopy = (url, id) => {
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        toast({ title: t('Đã sao chép liên kết vào clipboard!') });
        setTimeout(() => setCopiedId(null), 2500);
    };

    // Disable link
    const handleDisable = async (id) => {
        if (!currentBrand?.id) return;
        try {
            await appClient.links.disable({ brand_id: currentBrand.id, id });
            setLinks((prev) =>
                prev.map((l) => (l.id === id ? { ...l, active: false } : l))
            );
            toast({ title: t('Đã vô hiệu hóa Shortlink thành công') });
        } catch (err) {
            toast({ variant: 'destructive', title: t('Lỗi khi vô hiệu hóa link'), description: err.message });
        }
    };

    // Filtered links
    const filteredLinks = useMemo(() => {
        if (!searchQuery.trim()) return links;
        const q = searchQuery.toLowerCase();
        return links.filter(
            (l) =>
                l.url?.toLowerCase().includes(q) ||
                l.target?.toLowerCase().includes(q) ||
                l.campaign?.toLowerCase().includes(q)
        );
    }, [links, searchQuery]);

    const totalClicks = useMemo(() => {
        return links.reduce((sum, l) => sum + (l.clicks || 0), 0);
    }, [links]);

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('Shortlinks')}
                description={t(
                    'Rút gọn liên kết, quản lý các đường link chuyển đổi và đo lường chi tiết số lượt click từ mạng xã hội.'
                )}
                actions={
                    <div className="flex items-center gap-3">
                        {brands.length > 0 && (
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground font-medium">Thương hiệu:</span>
                                <div className="relative">
                                    <select
                                        value={currentBrand?.id || ''}
                                        onChange={(e) => setSelectedBrandId(e.target.value)}
                                        className="h-8 rounded-lg border border-border bg-background px-2.5 pr-8 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#ffd631] appearance-none cursor-pointer"
                                    >
                                        {brands.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                    <CaretDown
                                        size={12}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"
                                    />
                                </div>
                            </div>
                        )}
                        <Link to="/create" className="btn-skew">
                            <Plus size={15} weight="bold" /> {t('Tạo bài viết')}
                        </Link>
                    </div>
                }
            />

            {/* Exact Shortlink Settings Card from user screenshot */}
            <ShortlinkSettingsCard />

            {/* Quick Shortlink Creator & Stats Row */}
            <div className="grid gap-6 lg:grid-cols-12">
                {/* Creator Form */}
                <div className="lg:col-span-7 panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ffd631] text-[#2b2100]">
                            <Plus size={16} weight="bold" />
                        </span>
                        <div>
                            <h2 className="text-[15px] font-semibold text-foreground">
                                {t('Tạo Shortlink mới')}
                            </h2>
                            <p className="label-xs text-muted-foreground">
                                {t('Dán liên kết dài bất kỳ để tạo đường link ngắn có gắn tracking.')}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleCreateShortlink} className="space-y-3.5">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                {t('URL Đích (Destination URL)')} *
                            </label>
                            <input
                                type="text"
                                required
                                value={destinationUrl}
                                onChange={(e) => setDestinationUrl(e.target.value)}
                                placeholder="https://example.com/bai-viet-hay-san-pham"
                                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#ffd631]"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    {t('Tên chiến dịch (Campaign)')}
                                </label>
                                <input
                                    type="text"
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    placeholder="VD: PromoThang11, RaMatSP..."
                                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#ffd631]"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    {t('Kênh mạng xã hội')}
                                </label>
                                <select
                                    value={platform}
                                    onChange={(e) => setPlatform(e.target.value)}
                                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#ffd631] cursor-pointer"
                                >
                                    <option value="all">{t('Tất cả kênh (General)')}</option>
                                    <option value="threads">Threads</option>
                                    <option value="linkedin">LinkedIn</option>
                                    <option value="facebook">Facebook</option>
                                    <option value="instagram">Instagram</option>
                                    <option value="tiktok">TikTok</option>
                                    <option value="x">X (Twitter)</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-1 flex items-center justify-between">
                            <button
                                type="submit"
                                disabled={creating || !destinationUrl.trim()}
                                className="btn-skew cursor-pointer shadow-sm"
                            >
                                {creating ? (
                                    <>
                                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#2b2100] border-t-transparent"></span>
                                        Đang tạo...
                                    </>
                                ) : (
                                    <>
                                        <LinkSimple size={16} weight="bold" />
                                        {t('Rút gọn liên kết ngay')}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Result Callout */}
                    {createdResult && (
                        <div className="rounded-xl border border-[#ffd631]/80 bg-[#ffd631]/10 p-4 space-y-2.5 transition-all">
                            <span className="text-xs font-bold text-[#806400] flex items-center gap-1.5">
                                <Check size={14} weight="bold" /> Shortlink của bạn đã sẵn sàng:
                            </span>

                            <div className="flex items-center gap-2">
                                <input
                                    readOnly
                                    value={createdResult.url}
                                    className="flex-1 h-9 rounded-lg border border-border bg-background px-2.5 font-mono text-xs font-semibold text-foreground select-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleCopy(createdResult.url, 'created')}
                                    className="h-9 px-3 rounded-lg bg-foreground text-background font-semibold text-xs flex items-center gap-1 cursor-pointer hover:bg-foreground/90"
                                >
                                    {copiedId === 'created' ? <Check size={14} /> : <Copy size={14} />}
                                    <span>{copiedId === 'created' ? 'Đã sao chép' : 'Sao chép'}</span>
                                </button>
                                <a
                                    href={createdResult.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted"
                                >
                                    <ArrowUpRight size={15} />
                                </a>
                            </div>

                            <p className="text-[11px] text-muted-foreground truncate">
                                Trỏ tới: {createdResult.target}
                            </p>
                        </div>
                    )}
                </div>

                {/* KPI Summary for Shortlinks */}
                <div className="lg:col-span-5 panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <CursorClick size={18} weight="bold" />
                            </span>
                            <h2 className="text-[15px] font-semibold text-foreground">
                                {t('Hiệu quả chuyển đổi')}
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={loadLinks}
                            disabled={statsBusy}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                        >
                            <ArrowsClockwise size={13} className={statsBusy ? 'animate-spin' : ''} />
                            <span>Làm mới</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-border/70 bg-surface/50 p-3">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                                Tổng lượt nhấp
                            </span>
                            <span className="mt-1 font-heading text-2xl font-bold text-foreground block">
                                {formatNumber(totalClicks)}
                            </span>
                            <span className="text-[11px] text-muted-foreground mt-0.5 block">
                                Tất cả shortlink
                            </span>
                        </div>

                        <div className="rounded-xl border border-border/70 bg-surface/50 p-3">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                                Link đang chạy
                            </span>
                            <span className="mt-1 font-heading text-2xl font-bold text-foreground block">
                                {links.filter((l) => l.active !== false).length}
                            </span>
                            <span className="text-[11px] text-muted-foreground mt-0.5 block">
                                /{links.length} tổng số
                            </span>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
                        💡 <strong>Mẹo chuyên gia:</strong> Gắn Shortlink vào bài đăng trên <strong>Threads & LinkedIn</strong> giúp theo dõi chính xác nội dung nào mang lại chuyển đổi cao nhất.
                    </div>
                </div>
            </div>

            {/* Table of Created Shortlinks */}
            <div className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
                    <div>
                        <h2 className="text-[15px] font-semibold text-foreground">
                            {t('Danh sách Shortlink của thương hiệu')}
                        </h2>
                        <p className="label-xs text-muted-foreground mt-0.5">
                            {t('Theo dõi số lượt nhấp và quản lý từng đường link theo chiến dịch.')}
                        </p>
                    </div>

                    <div className="relative min-w-[220px]">
                        <MagnifyingGlass
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('Tìm kiếm shortlink, URL...')}
                            className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#ffd631]"
                        />
                    </div>
                </div>

                {loading ? (
                    <p className="text-xs text-muted-foreground py-6 text-center">{t('Đang tải danh sách...')}</p>
                ) : !filteredLinks.length ? (
                    <div className="py-10 text-center space-y-2">
                        <LinkSimple size={28} className="mx-auto text-muted-foreground/60" />
                        <p className="text-xs font-medium text-foreground">{t('Chưa có shortlink nào.')}</p>
                        <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                            {t('Hãy tạo shortlink đầu tiên ở khung phía trên để bắt đầu theo dõi lượt nhấp bài đăng.')}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-border/70 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                                    <th className="py-2.5 px-3">Shortlink</th>
                                    <th className="py-2.5 px-3">URL Đích</th>
                                    <th className="py-2.5 px-3">Chiến dịch</th>
                                    <th className="py-2.5 px-3">Kênh</th>
                                    <th className="py-2.5 px-3 text-right">Lượt click</th>
                                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {filteredLinks.map((link) => {
                                    const platformCfg = PLATFORM_CONFIG[link.platform] || {
                                        icon: Globe,
                                        label: link.platform || 'General',
                                        color: 'text-foreground',
                                    };
                                    const Icon = platformCfg.icon;

                                    return (
                                        <tr key={link.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 px-3 font-mono font-semibold text-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="truncate max-w-[220px]">{link.url}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(link.url, link.id)}
                                                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                                                        title="Sao chép"
                                                    >
                                                        {copiedId === link.id ? (
                                                            <Check size={13} className="text-emerald-500 font-bold" />
                                                        ) : (
                                                            <Copy size={13} />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>

                                            <td className="py-3 px-3 text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <span className="truncate max-w-[240px]" title={link.target}>
                                                        {link.target}
                                                    </span>
                                                    <a
                                                        href={link.target}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-muted-foreground hover:text-foreground"
                                                    >
                                                        <ArrowUpRight size={12} />
                                                    </a>
                                                </div>
                                            </td>

                                            <td className="py-3 px-3 font-medium text-foreground">
                                                <span className="rounded-md bg-surface px-2 py-0.5 border border-border/70 text-[11px]">
                                                    {link.campaign || 'shortlink'}
                                                </span>
                                            </td>

                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-1 text-[11px] font-medium">
                                                    <Icon size={14} className={platformCfg.color} />
                                                    <span>{platformCfg.label}</span>
                                                </div>
                                            </td>

                                            <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                                                {formatNumber(link.clicks || 0)}
                                            </td>

                                            <td className="py-3 px-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(link.url, link.id)}
                                                        className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-muted cursor-pointer"
                                                    >
                                                        {copiedId === link.id ? 'Đã chép' : 'Sao chép'}
                                                    </button>
                                                    {link.active !== false && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDisable(link.id)}
                                                            className="rounded-lg border border-border text-muted-foreground hover:text-dangerFg hover:border-dangerFg/40 px-2.5 py-1 text-[11px] font-medium cursor-pointer"
                                                        >
                                                            Tắt
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

