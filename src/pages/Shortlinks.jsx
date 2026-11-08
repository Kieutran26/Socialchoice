import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    LinkSimple,
    Copy,
    Check,
    ArrowSquareOut,
    ArrowsClockwise,
    Plus,
    CursorClick,
    Globe,
    MagnifyingGlass,
    SlidersHorizontal,
    TrendUp,
    CheckCircle,
    CaretDown,
    Sparkle,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from '@/lib/i18n';
import PageHeader from '@/components/common/PageHeader';
import ShortlinkSettingsCard, {
    getShortlinkPreference,
    setShortlinkPreference,
} from '@/components/settings/ShortlinkSettingsCard';
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import { formatNumber } from '@/lib/format';

export default function Shortlinks() {
    const { t } = useTranslation();
    const { brands, selectedBrandId, setSelectedBrandId } = useWorkspace();
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
    const [platformFilter, setPlatformFilter] = useState('all');
    const [showFullSettings, setShowFullSettings] = useState(false);

    // Shortlink preference state
    const [preference, setPreference] = useState(getShortlinkPreference);

    useEffect(() => {
        const handleSync = () => setPreference(getShortlinkPreference());
        window.addEventListener('storage', handleSync);
        return () => window.removeEventListener('storage', handleSync);
    }, []);

    const handlePreferenceChange = (newVal) => {
        setPreference(newVal);
        setShortlinkPreference(newVal);
        toast({
            title: t('Cài đặt Shortlink đã được lưu'),
            description: t(
                newVal === 'always'
                    ? 'Tự động rút gọn các liên kết trong bài viết để đo lường click.'
                    : newVal === 'never'
                    ? 'Giữ nguyên liên kết gốc khi đăng bài.'
                    : 'Hệ thống sẽ hỏi bạn mỗi khi phát hiện liên kết trong bài viết.'
            ),
        });
    };

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
        return links.filter((l) => {
            if (platformFilter !== 'all' && l.platform !== platformFilter) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchUrl = l.url?.toLowerCase().includes(q);
                const matchTarget = l.target?.toLowerCase().includes(q);
                const matchCampaign = l.campaign?.toLowerCase().includes(q);
                return matchUrl || matchTarget || matchCampaign;
            }
            return true;
        });
    }, [links, platformFilter, searchQuery]);

    const totalClicks = useMemo(() => {
        return links.reduce((sum, l) => sum + (l.clicks || 0), 0);
    }, [links]);

    const activeLinksCount = useMemo(() => {
        return links.filter((l) => l.active !== false).length;
    }, [links]);

    // Calculate top channel conversion
    const topChannelInfo = useMemo(() => {
        if (!links.length) return { name: 'Chưa có dữ liệu', clicks: 0, percentage: 0 };
        const channelMap = {};
        links.forEach((l) => {
            const p = l.platform || 'direct';
            channelMap[p] = (channelMap[p] || 0) + (l.clicks || 0);
        });

        const sorted = Object.entries(channelMap).sort((a, b) => b[1] - a[1]);
        if (!sorted.length || sorted[0][1] === 0) {
            return { name: 'Threads & LinkedIn', clicks: totalClicks, percentage: 100 };
        }

        const top = sorted[0];
        const label = PLATFORM_CONFIG[top[0]]?.label || top[0];
        const pct = totalClicks > 0 ? Math.round((top[1] / totalClicks) * 100) : 0;
        return { name: label, clicks: top[1], percentage: pct };
    }, [links, totalClicks]);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            {/* Page Header */}
            <PageHeader
                title={t('Shortlinks')}
                description={t(
                    'Rút gọn liên kết, quản lý các đường link chuyển đổi và đo lường chi tiết số lượt click từ mạng xã hội.'
                )}
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        {brands.length > 0 && (
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-neutral-500 font-medium">{t('Thương hiệu:')}</span>
                                <div className="relative">
                                    <select
                                        value={currentBrand?.id || ''}
                                        onChange={(e) => setSelectedBrandId(e.target.value)}
                                        className="h-9 rounded-xl border border-neutral-200 bg-white px-3 pr-8 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900 appearance-none cursor-pointer shadow-2xs"
                                    >
                                        {brands.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                    <CaretDown
                                        size={13}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400"
                                    />
                                </div>
                            </div>
                        )}

                        <Link
                            to="/create"
                            className="btn-skew"
                        >
                            <Plus size={16} weight="bold" />
                            <span>{t('Tạo bài viết')}</span>
                        </Link>
                    </div>
                }
            />

            {/* Optional Full Settings Card */}
            {showFullSettings && (
                <div className="transition-all">
                    <ShortlinkSettingsCard />
                </div>
            )}

            {/* OPTION A: CONVERSION STUDIO (BENTO GRID 8 COLS + 4 COLS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Left (8 cols): Quick Shortener Studio Card */}
                <div className="lg:col-span-8 bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                    <div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-2xs shrink-0">
                                    <LinkSimple size={16} weight="bold" />
                                </span>
                                <div>
                                    <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                                        {t('Tạo Shortlink mới')}
                                    </h2>
                                    <p className="text-[11px] text-neutral-500">
                                        {t('Dán liên kết dài bất kỳ để tạo đường link ngắn có gắn tracking.')}
                                    </p>
                                </div>
                            </div>

                            {/* Preference Pill Selector */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-100/80 border border-neutral-200/70 text-[11.5px] text-neutral-600">
                                    <SlidersHorizontal size={13} className="text-neutral-500 shrink-0" />
                                    <span>{t('Tự động:')}</span>
                                    <select
                                        value={preference}
                                        onChange={(e) => handlePreferenceChange(e.target.value)}
                                        className="bg-transparent font-semibold text-neutral-900 focus:outline-none cursor-pointer"
                                    >
                                        <option value="ask">{t('Hỏi mỗi lần đăng')}</option>
                                        <option value="always">{t('Luôn rút gọn')}</option>
                                        <option value="never">{t('Không bao giờ')}</option>
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowFullSettings((v) => !v)}
                                    className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg text-xs"
                                    title={t('Mở rộng toàn bộ cài đặt')}
                                >
                                    <SlidersHorizontal size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Creator Form */}
                        <form onSubmit={handleCreateShortlink} className="space-y-3 pt-3">
                            <div>
                                <div className="relative">
                                    <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        required
                                        value={destinationUrl}
                                        onChange={(e) => setDestinationUrl(e.target.value)}
                                        placeholder={t('Dán URL đích (VD: https://example.com/san-pham-moi)...')}
                                        className="w-full h-10 pl-9 pr-3 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-900 transition"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                <div className="sm:col-span-5">
                                    <input
                                        type="text"
                                        value={campaignName}
                                        onChange={(e) => setCampaignName(e.target.value)}
                                        placeholder={t('Tên chiến dịch (VD: PromoThang11)...')}
                                        className="w-full h-9 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition"
                                    />
                                </div>

                                <div className="sm:col-span-4">
                                    <select
                                        value={platform}
                                        onChange={(e) => setPlatform(e.target.value)}
                                        className="w-full h-9 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-medium text-neutral-900 focus:outline-none focus:border-neutral-900 cursor-pointer transition"
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

                                <div className="sm:col-span-3">
                                    <button
                                        type="submit"
                                        disabled={creating || !destinationUrl.trim()}
                                        className="w-full btn-skew justify-center"
                                    >
                                        {creating ? (
                                            <>
                                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                <span>{t('Đang tạo...')}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkle size={14} weight="bold" />
                                                <span>{t('Rút gọn ngay')}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Result Callout when generated */}
                    {createdResult && (
                        <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/60 p-3.5 space-y-2 transition-all mt-3">
                            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle size={15} weight="fill" className="text-emerald-600" />
                                <span>{t('Shortlink của bạn đã sẵn sàng:')}</span>
                            </span>

                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    readOnly
                                    value={createdResult.url}
                                    className="flex-1 min-w-[200px] h-8 rounded-lg border border-emerald-200 bg-white px-2.5 font-mono text-xs font-semibold text-neutral-900 select-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleCopy(createdResult.url, 'created')}
                                    className="h-8 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap shrink-0"
                                >
                                    {copiedId === 'created' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                    <span>{copiedId === 'created' ? t('Đã sao chép') : t('Sao chép')}</span>
                                </button>
                                <a
                                    href={createdResult.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:text-neutral-900"
                                    title={t('Mở trong tab mới')}
                                >
                                    <ArrowSquareOut size={14} />
                                </a>
                            </div>

                            <p className="text-[11px] text-neutral-500 truncate">
                                {t('Trỏ tới:')} <span className="font-mono text-neutral-600">{createdResult.target}</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Right (4 cols): 3 Light Gray (Nền xám) Metric Cards */}
                <div className="lg:col-span-4 flex flex-col justify-between gap-3">
                    {/* Card 1: Total Clicks (Light Gray Card) */}
                    <div className="p-4 rounded-2xl border border-neutral-200/80 bg-neutral-100/75 shadow-2xs flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-[10.5px] font-bold text-neutral-500 uppercase tracking-wider block">
                                {t('Tổng Lượt Nhấp (Clicks)')}
                            </span>
                            <span className="text-2xl font-bold font-mono text-neutral-900 block">
                                {formatNumber(totalClicks)}
                            </span>
                            <span className="text-[11px] text-neutral-500 block">
                                {links.length} {t('shortlinks được theo dõi')}
                            </span>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <span className="w-9 h-9 rounded-xl bg-white border border-neutral-200/80 text-neutral-800 flex items-center justify-center shadow-2xs shrink-0">
                                <CursorClick size={18} weight="bold" />
                            </span>
                            <button
                                type="button"
                                onClick={loadLinks}
                                disabled={statsBusy}
                                className="text-[11px] text-neutral-400 hover:text-neutral-800 flex items-center gap-1 cursor-pointer transition"
                                title={t('Làm mới số liệu')}
                            >
                                <ArrowsClockwise size={12} className={statsBusy ? 'animate-spin' : ''} />
                                <span>{t('Làm mới')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Card 2: Active Links (Light Gray Card) */}
                    <div className="p-4 rounded-2xl border border-neutral-200/80 bg-neutral-100/75 shadow-2xs flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-[10.5px] font-bold text-neutral-500 uppercase tracking-wider block">
                                {t('Shortlink Đang Hoạt Động')}
                            </span>
                            <span className="text-2xl font-bold font-mono text-neutral-900 block">
                                {activeLinksCount}{' '}
                                <span className="text-xs text-neutral-400 font-normal">/ {links.length} {t('tổng số')}</span>
                            </span>
                            <span className="text-[11px] text-neutral-500 block">
                                {links.length > 0
                                    ? `${Math.round((activeLinksCount / links.length) * 100)}% ${t('tỷ lệ hoạt động')}`
                                    : t('Chưa có link')}
                            </span>
                        </div>

                        <span className="w-9 h-9 rounded-xl bg-white border border-neutral-200/80 text-neutral-800 flex items-center justify-center shadow-2xs shrink-0">
                            <CheckCircle size={18} weight="bold" />
                        </span>
                    </div>

                    {/* Card 3: Top Converting Channel (Light Gray Card) */}
                    <div className="p-4 rounded-2xl border border-neutral-200/80 bg-neutral-100/75 shadow-2xs flex items-center justify-between">
                        <div className="space-y-0.5 min-w-0">
                            <span className="text-[10.5px] font-bold text-neutral-500 uppercase tracking-wider block">
                                {t('Kênh Chuyển Đổi Hàng Đầu')}
                            </span>
                            <span className="text-base font-bold text-neutral-900 truncate block">
                                {topChannelInfo.name}
                            </span>
                            <span className="text-[11px] text-neutral-500 block">
                                {topChannelInfo.clicks} {t('clicks')} ({topChannelInfo.percentage}%)
                            </span>
                        </div>

                        <span className="w-9 h-9 rounded-xl bg-white border border-neutral-200/80 text-neutral-800 flex items-center justify-center shadow-2xs shrink-0">
                            <TrendUp size={18} weight="bold" />
                        </span>
                    </div>
                </div>
            </div>

            {/* LINKS MANAGEMENT TABLE */}
            <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/60">
                    <div>
                        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                            <span>{t('Danh sách Shortlink của thương hiệu')}</span>
                            <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-neutral-200/80 text-neutral-800 font-bold">
                                {filteredLinks.length} {t('links')}
                            </span>
                        </h3>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                            {t('Theo dõi số lượt nhấp và quản lý từng đường link theo chiến dịch.')}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Platform Filter Pills */}
                        <div className="hidden sm:inline-flex items-center p-0.5 bg-neutral-100 rounded-lg border border-neutral-200/70 text-xs">
                            <button
                                type="button"
                                onClick={() => setPlatformFilter('all')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                                    platformFilter === 'all'
                                        ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                                        : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                            >
                                {t('Tất cả')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setPlatformFilter('facebook')}
                                className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                                    platformFilter === 'facebook'
                                        ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                                        : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                            >
                                Facebook
                            </button>
                            <button
                                type="button"
                                onClick={() => setPlatformFilter('threads')}
                                className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                                    platformFilter === 'threads'
                                        ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                                        : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                            >
                                Threads
                            </button>
                            <button
                                type="button"
                                onClick={() => setPlatformFilter('linkedin')}
                                className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                                    platformFilter === 'linkedin'
                                        ? 'bg-white text-sky-700 shadow-2xs font-semibold'
                                        : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                            >
                                LinkedIn
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <MagnifyingGlass
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('Tìm shortlink, URL, chiến dịch...')}
                                className="h-8 pl-8 pr-3 text-xs rounded-xl border border-neutral-200 bg-white w-48 sm:w-56 focus:outline-none focus:border-neutral-900 transition"
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <p className="text-xs text-neutral-500 py-12 text-center">{t('Đang tải danh sách...')}</p>
                ) : !filteredLinks.length ? (
                    <div className="py-12 text-center space-y-2">
                        <LinkSimple size={32} className="mx-auto text-neutral-300" />
                        <p className="text-xs font-semibold text-neutral-800">{t('Chưa có shortlink nào.')}</p>
                        <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                            {t('Hãy tạo shortlink đầu tiên ở khung phía trên để bắt đầu theo dõi lượt nhấp bài đăng.')}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-100 bg-neutral-50/80 text-[11px] uppercase tracking-wider text-neutral-500 font-bold">
                                    <th className="py-3 px-4 pl-5">Shortlink</th>
                                    <th className="py-3 px-3">URL Đích</th>
                                    <th className="py-3 px-3">Chiến dịch</th>
                                    <th className="py-3 px-3">Kênh mạng xã hội</th>
                                    <th className="py-3 px-3 text-center w-28">{t('Lượt click')}</th>
                                    <th className="py-3 px-4 pr-5 text-right w-44 whitespace-nowrap">{t('Thao tác')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {filteredLinks.map((link) => {
                                    const platformCfg = PLATFORM_CONFIG[link.platform] || {
                                        icon: Globe,
                                        label: link.platform || 'General',
                                        color: 'text-neutral-700',
                                        bg: 'bg-neutral-100',
                                        border: 'border-neutral-200',
                                    };
                                    const Icon = platformCfg.icon;

                                    return (
                                        <tr key={link.id} className="hover:bg-neutral-50/60 transition-colors">
                                            {/* Shortlink */}
                                            <td className="py-3 px-4 pl-5 font-mono font-bold text-neutral-900 align-middle">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                                            link.active !== false ? 'bg-emerald-500' : 'bg-neutral-300'
                                                        }`}
                                                        title={link.active !== false ? 'Đang hoạt động' : 'Đã tắt'}
                                                    />
                                                    <span className="truncate max-w-[210px]">{link.url}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(link.url, link.id)}
                                                        className="text-neutral-400 hover:text-neutral-900 cursor-pointer p-0.5 rounded transition"
                                                        title={t('Sao chép')}
                                                    >
                                                        {copiedId === link.id ? (
                                                            <Check size={13} className="text-emerald-500 font-bold" />
                                                        ) : (
                                                            <Copy size={13} />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Destination URL */}
                                            <td className="py-3 px-3 text-neutral-500 align-middle">
                                                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                                    <span className="truncate max-w-[240px]" title={link.target}>
                                                        {link.target}
                                                    </span>
                                                    <a
                                                        href={link.target}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-neutral-400 hover:text-neutral-900 shrink-0"
                                                        title={t('Mở URL')}
                                                    >
                                                        <ArrowSquareOut size={12} />
                                                    </a>
                                                </div>
                                            </td>

                                            {/* Campaign */}
                                            <td className="py-3 px-3 align-middle">
                                                <span className="rounded-md bg-neutral-100/90 px-2.5 py-0.5 border border-neutral-200/80 text-[11px] font-medium text-neutral-800">
                                                    {link.campaign || 'shortlink'}
                                                </span>
                                            </td>

                                            {/* Platform */}
                                            <td className="py-3 px-3 align-middle">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-semibold border ${platformCfg.bg} ${platformCfg.color} ${platformCfg.border}`}
                                                >
                                                    <Icon size={12} />
                                                    <span>{platformCfg.label}</span>
                                                </span>
                                            </td>

                                            {/* Clicks */}
                                            <td className="py-3 px-3 text-center align-middle">
                                                <span className="inline-block px-2.5 py-0.5 rounded-md font-mono text-[11px] font-bold border bg-neutral-100 text-neutral-800 border-neutral-200">
                                                    {formatNumber(link.clicks || 0)}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-4 pr-5 text-right align-middle whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(link.url, link.id)}
                                                        className="h-7 px-3 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-[11px] font-semibold cursor-pointer transition shadow-2xs whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-1"
                                                    >
                                                        {copiedId === link.id ? (
                                                            <>
                                                                <Check size={12} className="text-emerald-600 font-bold" />
                                                                <span>{t('Đã chép')}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy size={12} />
                                                                <span>{t('Sao chép')}</span>
                                                            </>
                                                        )}
                                                    </button>
                                                    {link.active !== false && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDisable(link.id)}
                                                            className="h-7 px-2.5 rounded-lg text-neutral-400 hover:text-dangerFg hover:bg-neutral-100 text-[11px] font-medium cursor-pointer transition whitespace-nowrap shrink-0"
                                                        >
                                                            {t('Tắt')}
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
