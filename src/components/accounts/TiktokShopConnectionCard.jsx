import { useState, useEffect } from 'react';
import { appClient } from '@/api/app-client';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { tiktokShopService } from '@/lib/tiktok-shop-service';
import {
    Storefront,
    CheckCircle,
    ShieldCheck,
    Lightning,
    Key,
    Info,
    ArrowSquareOut,
    Buildings,
    ShoppingBag,
    Globe,
    Tag,
} from '@phosphor-icons/react';

export default function TiktokShopConnectionCard({
    brands = [],
    demoMode = false,
    onChanged = () => {},
    defaultBrandId = '',
    embedded = false,
    onBusyChange = (_value) => {},
}) {
    const { t } = useTranslation();
    const [brandId, setBrandId] = useState(defaultBrandId || brands[0]?.id || '');
    const [tab, setTab] = useState('demo'); // 'demo' | 'official'
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Form inputs for official mode
    const [shopName, setShopName] = useState('');
    const [shopCode, setShopCode] = useState('');
    const [region, setRegion] = useState('VN');
    const [appKey, setAppKey] = useState('');
    const [appSecret, setAppSecret] = useState('');

    useEffect(() => {
        onBusyChange(busy);
        return () => onBusyChange(false);
    }, [busy, onBusyChange]);

    useEffect(() => {
        if (defaultBrandId && !brandId) {
            setBrandId(defaultBrandId);
        }
    }, [defaultBrandId, brandId]);

    const activeBrands = brands.filter((b) => !b.is_demo && b.status === 'active');
    const selectedBrand = brands.find((b) => b.id === brandId);

    // Fast 1-click connect with preset demo/sandbox TikTok shops
    const handleQuickConnect = async (presetName, presetRegion = 'VN') => {
        if (!brandId) {
            setError('Vui lòng chọn Thương hiệu quản lý gian hàng TikTok Shop');
            return;
        }

        setBusy(true);
        setError('');
        try {
            // 1. Register in TikTok Shop Service
            const shop = tiktokShopService.connectShop({
                brand_id: brandId,
                shop_name: presetName,
                region: presetRegion,
            });

            // 2. Also register SocialAccount reference so it surfaces in connected channels
            await appClient.entities.SocialAccount.create({
                brand_id: brandId,
                platform: 'tiktok',
                account_type: 'page',
                name: `${presetName} (TikTok Shop)`,
                username: `shop_${shop.id.slice(-6)}`,
                external_id: shop.id,
                followers: 48500,
                connection_status: 'connected',
                is_demo: false,
            });

            setSuccessMsg(`Đã kết nối thành công Gian hàng TikTok Shop: ${presetName}!`);
            setTimeout(() => {
                onChanged();
            }, 650);
        } catch (err) {
            setError(err.message || 'Không thể tạo kết nối TikTok Shop');
        } finally {
            setBusy(false);
        }
    };

    // Official developer / Seller API connection
    const handleOfficialConnect = async (e) => {
        e.preventDefault();
        if (!brandId) {
            setError('Vui lòng chọn Thương hiệu quản lý trước khi tiếp tục');
            return;
        }
        if (!shopName.trim()) {
            setError('Vui lòng nhập Tên Gian hàng TikTok Shop');
            return;
        }

        setBusy(true);
        setError('');
        try {
            const shop = tiktokShopService.connectShop({
                brand_id: brandId,
                shop_name: shopName.trim(),
                shop_code: shopCode.trim() || undefined,
                region,
            });

            await appClient.entities.SocialAccount.create({
                brand_id: brandId,
                platform: 'tiktok',
                account_type: 'page',
                name: `${shopName.trim()} (TikTok Shop)`,
                username: `shop_${shop.id.slice(-6)}`,
                external_id: shop.id,
                connection_status: 'connected',
                is_demo: false,
            });

            setSuccessMsg(`Đã lưu & đồng bộ TikTok Shop: ${shopName}!`);
            setTimeout(() => {
                onChanged();
            }, 650);
        } catch (err) {
            setError(err.message || 'Lỗi liên kết TikTok Shop');
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className={embedded ? 'space-y-4' : 'panel p-5 mb-5 space-y-4'}>
            {/* Header with TikTok Shop Brand Style */}
            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-black text-white flex items-center justify-center relative shadow-xs shrink-0 border border-border">
                        <Storefront size={22} weight="fill" className="text-[#FE2C55]" />
                        <span className="absolute -top-1 -right-1 size-3 bg-[#25F4EE] rounded-full border-2 border-black" />
                    </div>
                    <div>
                        <h2 className="text-base font-heading font-bold text-foreground flex items-center gap-2">
                            <span>{t('Kết nối TikTok Shop (Seller Center)')}</span>
                            <span className="rounded-full bg-[#FE2C55]/10 text-[#FE2C55] text-[10px] font-semibold px-2 py-0.5 border border-[#FE2C55]/20">
                                E-Commerce
                            </span>
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {t('Đồng bộ danh mục sản phẩm, quản lý tồn kho và tự động gắn Giỏ hàng vàng vào video đăng tải trên Socialchoice.')}
                        </p>
                    </div>
                </div>

                <a
                    href="https://seller-vn.tiktok.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-[#FE2C55] hover:underline"
                >
                    <span>TikTok Seller Center</span>
                    <ArrowSquareOut size={13} />
                </a>
            </div>

            {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle size={16} weight="fill" />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Target Brand Selection */}
            <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 font-heading">
                        <Buildings size={14} className="text-muted-foreground" />
                        <span>{t('Thương hiệu sở hữu TikTok Shop này')}</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground">Bắt buộc</span>
                </div>

                <select
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    disabled={busy || demoMode}
                >
                    <option value="">-- {t('Chọn thương hiệu')} --</option>
                    {(activeBrands.length ? activeBrands : brands).map((b) => (
                        <option key={b.id} value={b.id}>
                            {b.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-muted/60 p-1 text-xs font-medium border border-border/60">
                <button
                    type="button"
                    onClick={() => setTab('demo')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                        tab === 'demo'
                            ? 'bg-card text-foreground font-semibold shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Lightning size={14} weight="bold" className="text-[#FE2C55]" />
                    <span>{t('Nạp nhanh Gian hàng mẫu (1-Click)')}</span>
                </button>
                <button
                    type="button"
                    onClick={() => setTab('official')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                        tab === 'official'
                            ? 'bg-card text-foreground font-semibold shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Key size={14} weight="bold" />
                    <span>{t('TikTok Seller API / Partner Key')}</span>
                </button>
            </div>

            {tab === 'demo' ? (
                <div className="space-y-3 pt-1">
                    <p className="text-xs text-muted-foreground">
                        {t('Chọn một TikTok Shop đã được kích hoạt danh mục mẫu để bắt đầu gắn link giỏ hàng vàng vào video ngay:')}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div
                            onClick={() =>
                                !busy &&
                                handleQuickConnect(
                                    selectedBrand?.name ? `${selectedBrand.name} - TikTok Shop` : 'An Nhiên Coffee - TikTok Shop Mall',
                                    'VN'
                                )
                            }
                            className="p-3 rounded-xl border border-border hover:border-[#FE2C55] bg-card hover:bg-[#FE2C55]/5 cursor-pointer transition-all space-y-1.5 group"
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-heading text-xs font-bold text-foreground group-hover:text-[#FE2C55]">
                                    {selectedBrand?.name ? `${selectedBrand.name} - Shop` : 'An Nhiên Coffee Mall'}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                    Mall VN
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>Thị trường: Việt Nam (VN)</span>
                                <span className="text-emerald-600 font-medium">842 đơn tháng này</span>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                disabled={busy || !brandId}
                                className="w-full mt-2 h-7 text-xs bg-[#FE2C55] hover:bg-[#e02449] text-white"
                            >
                                Kết nối Shop này
                            </Button>
                        </div>

                        <div
                            onClick={() =>
                                !busy &&
                                handleQuickConnect(
                                    'Lumina Skincare - Official Store',
                                    'VN'
                                )
                            }
                            className="p-3 rounded-xl border border-border hover:border-[#FE2C55] bg-card hover:bg-[#FE2C55]/5 cursor-pointer transition-all space-y-1.5 group"
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-heading text-xs font-bold text-foreground group-hover:text-[#FE2C55]">
                                    Lumina Skincare Official
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    Official
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>Thị trường: Việt Nam (VN)</span>
                                <span className="text-emerald-600 font-medium">1,120 đơn tháng này</span>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                disabled={busy || !brandId}
                                className="w-full mt-2 h-7 text-xs bg-[#FE2C55] hover:bg-[#e02449] text-white"
                            >
                                Kết nối Shop này
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
                        <Info size={16} className="text-[#FE2C55] shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-foreground">Gắn sản phẩm trực tiếp khi tạo bài đăng</p>
                            <p className="mt-0.5 text-[11px]">
                                Khi soạn bài viết hoặc video cho TikTok, bạn có thể chọn bất kỳ sản phẩm nào từ Shop để hiển thị Giỏ hàng vàng (Product Anchor) trên video.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleOfficialConnect} className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground">
                                {t('Tên gian hàng (Shop Name)')} <span className="text-destructive">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={shopName}
                                onChange={(e) => setShopName(e.target.value)}
                                placeholder="VD: An Nhiên Coffee Official"
                                className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground">
                                {t('Mã Shop Code / ID')}
                            </label>
                            <input
                                type="text"
                                value={shopCode}
                                onChange={(e) => setShopCode(e.target.value)}
                                placeholder="Lấy từ Seller Center (VD: VN_SHOP_84920)"
                                className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground">
                                {t('Khu vực thị trường (Region)')}
                            </label>
                            <select
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                                className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                            >
                                <option value="VN">Việt Nam (TikTok Shop VN - ₫)</option>
                                <option value="US">Hoa Kỳ (TikTok Shop US - $)</option>
                                <option value="UK">Vương quốc Anh (TikTok Shop UK - £)</option>
                                <option value="TH">Thái Lan (TikTok Shop TH - ฿)</option>
                                <option value="ID">Indonesia (TikTok Shop ID - Rp)</option>
                                <option value="MY">Malaysia (TikTok Shop MY - RM)</option>
                                <option value="PH">Philippines (TikTok Shop PH - ₱)</option>
                                <option value="SG">Singapore (TikTok Shop SG - S$)</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground">
                                {t('Partner App Key (Tùy chọn)')}
                            </label>
                            <input
                                type="text"
                                value={appKey}
                                onChange={(e) => setAppKey(e.target.value)}
                                placeholder="Lấy từ TikTok Shop Partner Center"
                                className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                            <label className="text-xs font-semibold text-foreground">
                                {t('App Secret / Access Token')}
                            </label>
                            <input
                                type="password"
                                value={appSecret}
                                onChange={(e) => setAppSecret(e.target.value)}
                                placeholder="••••••••••••••••••••••••••••"
                                className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                        </div>
                    </div>

                    <div className="rounded-xl bg-[#FE2C55]/5 border border-[#FE2C55]/20 p-3 flex items-start gap-2 text-xs text-muted-foreground">
                        <ShieldCheck size={16} className="text-[#FE2C55] shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-relaxed">
                            Khóa kết nối Seller API được bảo mật cấp cao, giúp Socialchoice đồng bộ danh mục sản phẩm và trạng thái đơn hàng tự động mỗi giờ.
                        </span>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button
                            type="submit"
                            disabled={busy || !brandId || !shopName.trim()}
                            className="bg-[#FE2C55] hover:bg-[#e02449] text-white font-medium text-xs rounded-xl px-5 py-2 inline-flex items-center gap-2"
                        >
                            <span>Lưu & Đồng bộ TikTok Shop</span>
                        </Button>
                    </div>
                </form>
            )}
        </section>
    );
}
