import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowSquareOut,
    Check,
    Coins,
    Copy,
    CursorClick,
    Fire,
    FloppyDisk,
    Gear,
    LinkSimple,
    ListBullets,
    MagnifyingGlass,
    NotePencil,
    PencilSimple,
    Percent,
    Plus,
    ShoppingBag,
    ShoppingBagOpen,
    Sparkle,
    SquaresFour,
    Star,
    Tag,
    Trash,
    X,
} from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import { shopeeAffiliateService } from '@/lib/shopee-affiliate-service';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { formatNumber } from '@/lib/format';

const FALLBACK_PRODUCT_IMG =
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80';

export default function ShopeeAffiliateNew() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { brands, selectedBrandId } = useWorkspace();

    const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'catalog' | 'settings'
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');
    const [sortBy, setSortBy] = useState('commission_desc');
    const [products, setProducts] = useState([]);
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalClicks: 0,
        totalConversions: 0,
        estimatedCommission: 0,
        avgCommissionRate: 0,
        hotDealsCount: 0,
    });

    // Drawers & Delete Confirm
    const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [productForm, setProductForm] = useState({
        name: '',
        sku: '',
        category: 'Thực phẩm & Đồ uống',
        brand_id: 'all',
        shop_name: 'Shopee Official Mall',
        shop_type: 'shopee_mall',
        image_url: '',
        original_price: '',
        sale_price: '',
        commission_rate: '15',
        voucher_text: 'Freeship Xtra + Giảm 20K',
        original_url: '',
        affiliate_url: '',
        highlights_text: '',
        is_hot_deal: true,
    });

    // Script Drawer
    const [selectedScriptProduct, setSelectedScriptProduct] = useState(null);
    const [scriptPlatform, setScriptPlatform] = useState('first_comment');
    const [copiedScript, setCopiedScript] = useState(false);
    const [copiedLinkId, setCopiedLinkId] = useState(null);

    // Deep Link Generator
    const [genOriginalUrl, setGenOriginalUrl] = useState('');
    const [genSub1, setGenSub1] = useState('facebook');
    const [genSub2, setGenSub2] = useState('campaign_nov');
    const [genResultUrl, setGenResultUrl] = useState('');
    const [copiedGen, setCopiedGen] = useState(false);

    // Settings
    const [settings, setSettings] = useState(() => shopeeAffiliateService.getSettings());

    const loadData = useCallback(() => {
        const list = shopeeAffiliateService.getProducts(selectedBrandId, selectedCategory);
        setProducts(list);
        setStats(shopeeAffiliateService.getStats(selectedBrandId));
        setSettings(shopeeAffiliateService.getSettings());
    }, [selectedBrandId, selectedCategory]);

    useEffect(() => {
        loadData();
        window.addEventListener('socialchoice:shopee_affiliate_updated', loadData);
        return () => window.removeEventListener('socialchoice:shopee_affiliate_updated', loadData);
    }, [loadData]);

    const categories = useMemo(() => shopeeAffiliateService.getCategories(), []);

    const sortedProducts = useMemo(() => {
        let result = [...products];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (p) =>
                    p.name.toLowerCase().includes(q) ||
                    (p.sku && p.sku.toLowerCase().includes(q)) ||
                    (p.shop_name && p.shop_name.toLowerCase().includes(q))
            );
        }

        result.sort((a, b) => {
            if (sortBy === 'commission_desc') return (b.commission_amount || 0) - (a.commission_amount || 0);
            if (sortBy === 'commission_rate_desc') return (b.commission_rate || 0) - (a.commission_rate || 0);
            if (sortBy === 'price_asc') return (a.sale_price || 0) - (b.sale_price || 0);
            if (sortBy === 'price_desc') return (b.sale_price || 0) - (a.sale_price || 0);
            if (sortBy === 'sold_desc') return (b.sold_count || 0) - (a.sold_count || 0);
            return 0;
        });

        return result;
    }, [products, searchQuery, sortBy]);

    const handleCopyLink = (product) => {
        if (!product?.affiliate_url) return;
        navigator.clipboard?.writeText(product.affiliate_url);
        shopeeAffiliateService.recordClick(product.id);
        setCopiedLinkId(product.id);
        setTimeout(() => setCopiedLinkId(null), 1800);
        toast({
            title: t('Đã sao chép Link Shopee Affiliate!'),
            description: product.affiliate_url,
        });
    };

    const handleOpenAddDrawer = () => {
        setEditingProduct(null);
        setProductForm({
            name: '',
            sku: `SHP-${Date.now().toString().slice(-4)}`,
            category: selectedCategory !== 'Tất cả' ? selectedCategory : 'Thực phẩm & Đồ uống',
            brand_id: selectedBrandId !== 'all' ? selectedBrandId : brands[0]?.id || 'all',
            shop_name: 'Shopee Official Store',
            shop_type: 'shopee_mall',
            image_url: FALLBACK_PRODUCT_IMG,
            original_price: '190000',
            sale_price: '149000',
            commission_rate: '15',
            voucher_text: 'Freeship Xtra + Giảm 25K',
            original_url: '',
            affiliate_url: '',
            highlights_text:
                'Chính hãng 100% đổi trả miễn phí\nGiao hàng hỏa tốc trong 2H\nBảo hành uy tín',
            is_hot_deal: true,
        });
        setIsProductDrawerOpen(true);
    };

    const handleOpenEditDrawer = (product) => {
        setEditingProduct(product);
        setProductForm({
            name: product.name,
            sku: product.sku || '',
            category: product.category || 'Thực phẩm & Đồ uống',
            brand_id: product.brand_id || 'all',
            shop_name: product.shop_name || 'Shopee Store',
            shop_type: product.shop_type || 'shopee_mall',
            image_url: product.image_url || '',
            original_price: String(product.original_price || ''),
            sale_price: String(product.sale_price || ''),
            commission_rate: String(product.commission_rate || '15'),
            voucher_text: product.voucher_text || '',
            original_url: product.original_url || '',
            affiliate_url: product.affiliate_url || '',
            highlights_text: (product.highlights || []).join('\n'),
            is_hot_deal: Boolean(product.is_hot_deal),
        });
        setIsProductDrawerOpen(true);
    };

    const handleSaveProduct = (e) => {
        e.preventDefault();
        if (!productForm.name.trim()) {
            toast({ variant: 'destructive', title: t('Vui lòng nhập tên sản phẩm') });
            return;
        }

        const payload = {
            ...productForm,
            highlights: productForm.highlights_text.split('\n').filter(Boolean),
        };

        if (editingProduct) {
            shopeeAffiliateService.updateProduct(editingProduct.id, payload);
            toast({ title: t('Đã cập nhật sản phẩm thành công!') });
        } else {
            shopeeAffiliateService.addProduct(payload);
            toast({ title: t('Đã thêm sản phẩm mới vào kho Shopee Affiliate!') });
        }
        setIsProductDrawerOpen(false);
    };

    const confirmDeleteProduct = async () => {
        if (!deleteTarget) return;
        shopeeAffiliateService.deleteProduct(deleteTarget.id);
        toast({ title: t('Đã xóa sản phẩm khỏi kho.') });
        setDeleteTarget(null);
    };

    const handleGenerateDeepLink = (e) => {
        e.preventDefault();
        if (!genOriginalUrl.trim()) {
            toast({ variant: 'destructive', title: t('Vui lòng dán link gốc Shopee') });
            return;
        }
        const link = shopeeAffiliateService.generateAffiliateLink(genOriginalUrl, {
            sub1: genSub1,
            sub2: genSub2,
        });
        setGenResultUrl(link);
        toast({ title: t('Đã tạo link Shopee Affiliate có gắn SubID thành công!') });
    };

    const handleSaveSettings = (e) => {
        e.preventDefault();
        shopeeAffiliateService.updateSettings(settings);
        toast({ title: t('Đã lưu cấu hình tài khoản Shopee Affiliate!') });
    };

    const handleComposeWithProduct = (product) => {
        navigate(`/create?shopee_product_id=${product.id}`);
    };

    const currentScript = useMemo(() => {
        if (!selectedScriptProduct) return '';
        return shopeeAffiliateService.generateSalesCopy(selectedScriptProduct, scriptPlatform);
    }, [selectedScriptProduct, scriptPlatform]);

    const previewCommission = useMemo(() => {
        const price = Number(productForm.sale_price) || 0;
        const rate = Number(productForm.commission_rate) || 0;
        return Math.round((price * rate) / 100);
    }, [productForm.sale_price, productForm.commission_rate]);

    return (
        <div className="space-y-6 pb-14 max-w-[1440px] mx-auto">
            {/* Compact Editorial Header */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-zinc-200/80">
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="font-heading text-[26px] font-medium tracking-tight text-zinc-900">
                            {t('Shopee Affiliate')}
                        </h1>
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white border border-zinc-200/90 text-[12px]">
                            <span className="h-5 w-5 rounded-md bg-orange-50 border border-orange-200/80 text-orange-600 inline-flex items-center justify-center shrink-0">
                                <ShoppingBagOpen size={12} weight="fill" />
                            </span>
                            <span className="font-medium text-zinc-800">
                                {settings.partner_name || 'Affiliate Hub'}
                            </span>
                            <span className="text-zinc-300">·</span>
                            <span className="font-mono text-[11px] text-zinc-500">
                                {settings.tracking_domain || 's.shopee.vn'}
                            </span>
                        </span>
                    </div>
                    <p className="text-[13.5px] text-zinc-500 max-w-2xl leading-relaxed">
                        {t(
                            'Quản lý kho sản phẩm tiếp thị liên kết Shopee, theo dõi hoa hồng dự kiến, tạo link SubID và kịch bản chốt đơn đa kênh.'
                        )}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab(activeTab === 'catalog' ? 'generator' : 'catalog')}
                        className="h-9 rounded-lg border-zinc-200 bg-white text-zinc-700"
                    >
                        {activeTab === 'catalog' ? (
                            <>
                                <LinkSimple size={15} className="mr-1.5 text-zinc-500" />
                                <span>{t('Tạo Link SubID')}</span>
                            </>
                        ) : (
                            <>
                                <ShoppingBag size={15} className="mr-1.5 text-zinc-500" />
                                <span>{t('Kho sản phẩm')}</span>
                            </>
                        )}
                    </Button>

                    <button type="button" onClick={handleOpenAddDrawer} className="btn-skew">
                        <Plus size={16} weight="duotone" />
                        <span>{t('Thêm sản phẩm')}</span>
                    </button>
                </div>
            </header>

            {/* 4-KPI Affiliate Strip (Clean white cards) */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-zinc-500">
                            {t('Sản phẩm tiếp thị')}
                        </span>
                        <Tag size={16} weight="duotone" className="text-zinc-400 shrink-0" />
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-1.5">
                        <span className="metric text-zinc-900 tabular-nums">
                            {formatNumber(stats.totalProducts)}
                        </span>
                        <span className="text-[12px] text-zinc-400">{t('sản phẩm')}</span>
                    </div>
                    <p className="text-[11.5px] text-zinc-500 mt-1 tabular-nums">
                        {stats.hotDealsCount > 0
                            ? `${stats.hotDealsCount} ${t('Deal Hot nổi bật')}`
                            : t('Đang trong danh mục')}
                    </p>
                </div>

                <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-zinc-500">
                            {t('Hoa hồng trung bình')}
                        </span>
                        <Percent size={16} weight="duotone" className="text-zinc-400 shrink-0" />
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-1.5">
                        <span className="metric text-zinc-900 tabular-nums">
                            {stats.avgCommissionRate}%
                        </span>
                    </div>
                    <p className="text-[11.5px] text-zinc-500 mt-1">
                        {t('Mức chiết khấu bình quân / đơn')}
                    </p>
                </div>

                <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-zinc-500">
                            {t('Tổng lượt click')}
                        </span>
                        <CursorClick size={16} weight="duotone" className="text-zinc-400 shrink-0" />
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-1.5">
                        <span className="metric text-zinc-900 tabular-nums">
                            {formatNumber(stats.totalClicks)}
                        </span>
                        <span className="text-[12px] text-zinc-400">{t('clicks')}</span>
                    </div>
                    <p className="text-[11.5px] text-zinc-500 mt-1 tabular-nums">
                        {formatNumber(stats.totalConversions)} {t('chuyển đổi ước tính')}
                    </p>
                </div>

                <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-zinc-500">
                            {t('Hoa hồng ước tính')}
                        </span>
                        <Coins size={16} weight="duotone" className="text-zinc-400 shrink-0" />
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-1.5">
                        <span className="metric text-zinc-900 tabular-nums">
                            ₫{Number(stats.estimatedCommission || 0).toLocaleString('vi-VN')}
                        </span>
                    </div>
                    <p className="text-[11.5px] text-emerald-700 font-medium mt-1">
                        {stats.estimatedCommission > 0
                            ? t('Tính từ lượt click & tỷ lệ chuyển đổi')
                            : t('Chưa phát sinh hoa hồng')}
                    </p>
                </div>
            </section>

            {/* Main Tabs Navigation (Tạo Link SubID first as default, then Kho sản phẩm, then Cấu hình) */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center p-1 rounded-xl bg-white border border-zinc-200/80">
                    <button
                        type="button"
                        onClick={() => setActiveTab('generator')}
                        className={`h-8 px-3.5 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-2 transition-colors cursor-pointer ${
                            activeTab === 'generator'
                                ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                : 'text-zinc-500 hover:text-zinc-900'
                        }`}
                    >
                        <LinkSimple size={15} weight={activeTab === 'generator' ? 'bold' : 'regular'} />
                        <span>{t('Tạo Link SubID')}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('catalog')}
                        className={`h-8 px-3.5 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-2 transition-colors cursor-pointer ${
                            activeTab === 'catalog'
                                ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                : 'text-zinc-500 hover:text-zinc-900'
                        }`}
                    >
                        <ShoppingBag size={15} weight={activeTab === 'catalog' ? 'duotone' : 'regular'} />
                        <span>{t('Kho sản phẩm')}</span>
                        <span className="font-mono text-[11px] opacity-75 tabular-nums">
                            {products.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('settings')}
                        className={`h-8 px-3.5 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-2 transition-colors cursor-pointer ${
                            activeTab === 'settings'
                                ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                : 'text-zinc-500 hover:text-zinc-900'
                        }`}
                    >
                        <Gear size={15} weight={activeTab === 'settings' ? 'duotone' : 'regular'} />
                        <span>{t('Cấu hình Affiliate')}</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: PRODUCT CATALOG */}
            {activeTab === 'catalog' ? (
                <div className="space-y-4">
                    {/* Single-Row Command Bar */}
                    <section className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 sm:px-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <MagnifyingGlass
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('Tìm theo tên sản phẩm, SKU hoặc shop...')}
                                aria-label={t('Tìm theo tên sản phẩm, SKU hoặc shop...')}
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

                        <div className="flex flex-wrap items-center gap-2.5">
                            <select
                                aria-label={t('Ngành hàng')}
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[12.5px] font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#ffd631] cursor-pointer"
                            >
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>

                            <select
                                aria-label={t('Sắp xếp')}
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[12.5px] font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#ffd631] cursor-pointer"
                            >
                                <option value="commission_desc">{t('Hoa hồng (₫) cao nhất')}</option>
                                <option value="commission_rate_desc">{t('Tỷ lệ hoa hồng (%) cao nhất')}</option>
                                <option value="sold_desc">{t('Lượt bán nhiều nhất')}</option>
                                <option value="price_asc">{t('Giá tăng dần')}</option>
                                <option value="price_desc">{t('Giá giảm dần')}</option>
                            </select>

                            <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/70">
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
                                <button
                                    type="button"
                                    onClick={() => setViewMode('table')}
                                    className={`h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                        viewMode === 'table'
                                            ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                            : 'text-zinc-500 hover:text-zinc-900'
                                    }`}
                                >
                                    <ListBullets size={14} weight={viewMode === 'table' ? 'duotone' : 'regular'} />
                                    <span>{t('Bảng')}</span>
                                </button>
                            </div>
                        </div>
                    </section>

                    {sortedProducts.length === 0 ? (
                        <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center space-y-3">
                            <ShoppingBagOpen size={32} weight="duotone" className="mx-auto text-zinc-300" />
                            <p className="text-[14px] font-medium text-zinc-800">
                                {t('Chưa có sản phẩm nào trong kho')}
                            </p>
                            <p className="text-[12.5px] text-zinc-500 max-w-md mx-auto">
                                {searchQuery
                                    ? t('Không tìm thấy sản phẩm phù hợp với từ khóa tìm kiếm.')
                                    : t(
                                          'Thêm sản phẩm Shopee có hoa hồng tốt để tạo kịch bản bán hàng và gắn link tiếp thị nhanh.'
                                      )}
                            </p>
                            <Button variant="outline" size="sm" onClick={handleOpenAddDrawer}>
                                <Plus size={14} className="mr-1.5" />
                                {t('Thêm sản phẩm đầu tiên')}
                            </Button>
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* Clean 3-Col Affiliate Product Cards */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sortedProducts.map((p) => (
                                <article
                                    key={p.id}
                                    className="bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-2xl overflow-hidden flex flex-col justify-between transition-colors group"
                                >
                                    <div>
                                        {/* Clean Thumbnail */}
                                        <div className="relative aspect-[16/10] w-full bg-zinc-100 overflow-hidden">
                                            <img
                                                src={p.image_url}
                                                alt={p.name}
                                                className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                                                onError={(e) => {
                                                    e.target.src = FALLBACK_PRODUCT_IMG;
                                                }}
                                            />
                                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                                                {p.shop_type === 'shopee_mall' ? (
                                                    <span className="rounded-md bg-white/95 border border-black/10 text-rose-700 text-[10.5px] font-semibold px-2 py-0.5">
                                                        Mall
                                                    </span>
                                                ) : null}
                                                {p.is_hot_deal ? (
                                                    <span className="rounded-md bg-[#ffd631] border border-[#d8b216] text-[#2b2100] text-[10.5px] font-semibold px-2 py-0.5 inline-flex items-center gap-1">
                                                        <Fire size={11} weight="fill" />
                                                        <span>Deal Hot</span>
                                                    </span>
                                                ) : null}
                                            </div>

                                            <div className="absolute top-2.5 right-2.5">
                                                <span className="rounded-md bg-white/95 border border-emerald-200 text-emerald-700 text-[11px] font-mono font-semibold px-2 py-0.5">
                                                    +{p.commission_rate}% · ₫{Number(p.commission_amount).toLocaleString('vi-VN')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-4 space-y-2">
                                            <div className="flex items-center justify-between gap-2 text-[11.5px] text-zinc-400">
                                                <span className="truncate">{p.shop_name}</span>
                                                <span className="inline-flex items-center gap-1 shrink-0 tabular-nums">
                                                    <Star size={11} weight="fill" className="text-amber-500" />
                                                    <span className="text-zinc-600 font-medium">{p.rating}</span>
                                                    <span>· {formatNumber(p.sold_count || 0)} bán</span>
                                                </span>
                                            </div>

                                            <h3 className="font-heading text-[14.5px] font-medium text-zinc-900 line-clamp-2 leading-snug">
                                                {p.name}
                                            </h3>

                                            <div className="flex items-baseline gap-2 pt-0.5">
                                                <span className="text-[16px] font-semibold text-zinc-900 tabular-nums">
                                                    ₫{Number(p.sale_price).toLocaleString('vi-VN')}
                                                </span>
                                                {p.original_price > p.sale_price ? (
                                                    <span className="text-[12px] line-through text-zinc-400 tabular-nums">
                                                        ₫{Number(p.original_price).toLocaleString('vi-VN')}
                                                    </span>
                                                ) : null}
                                                {p.discount_percent > 0 ? (
                                                    <span className="text-[10.5px] font-medium text-rose-700 bg-rose-50 border border-rose-200/70 px-1.5 py-0.2 rounded">
                                                        -{p.discount_percent}%
                                                    </span>
                                                ) : null}
                                            </div>

                                            {p.voucher_text ? (
                                                <p className="text-[11.5px] text-emerald-700 flex items-center gap-1.5 pt-0.5 truncate">
                                                    <Tag size={12} weight="duotone" className="shrink-0" />
                                                    <span className="truncate">{p.voucher_text}</span>
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="px-4 pb-4 space-y-2">
                                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-100">
                                            <button
                                                type="button"
                                                onClick={() => handleCopyLink(p)}
                                                className="h-8 px-2.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-[12px] font-medium text-zinc-700 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                                {copiedLinkId === p.id ? (
                                                    <>
                                                        <Check size={13} className="text-emerald-600" />
                                                        <span className="text-emerald-700">{t('Đã chép')}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={13} className="text-zinc-500" />
                                                        <span>{t('Copy Link')}</span>
                                                    </>
                                                )}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedScriptProduct(p);
                                                    setCopiedScript(false);
                                                }}
                                                className="h-8 px-2.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-[12px] font-medium text-zinc-800 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                                <Sparkle size={13} weight="duotone" className="text-amber-600" />
                                                <span>{t('Kịch bản')}</span>
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleComposeWithProduct(p)}
                                                className="flex-1 h-8 px-3 rounded-lg border border-zinc-200 bg-white hover:border-[#d8b216] hover:bg-[#ffd631]/25 text-[12px] font-medium text-zinc-800 hover:text-[#2b2100] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                                <NotePencil size={13} weight="duotone" />
                                                <span>{t('Soạn bài đăng')}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditDrawer(p)}
                                                aria-label={t('Sửa')}
                                                className="h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-flex items-center justify-center cursor-pointer"
                                            >
                                                <PencilSimple size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeleteTarget(p)}
                                                aria-label={t('Xóa')}
                                                className="h-8 w-8 rounded-lg text-zinc-400 hover:text-dangerFg hover:bg-dangerBg/60 inline-flex items-center justify-center cursor-pointer"
                                            >
                                                <Trash size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        /* Compact Affiliate Table */
                        <section className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[11.5px] font-medium text-zinc-500">
                                            <th className="py-3 pl-5 pr-3">{t('Sản phẩm')}</th>
                                            <th className="py-3 px-3 w-36">{t('Ngành hàng')}</th>
                                            <th className="py-3 px-3 w-32">{t('Giá bán')}</th>
                                            <th className="py-3 px-3 w-44">{t('Hoa hồng')}</th>
                                            <th className="py-3 px-3 w-24 text-center">{t('Clicks')}</th>
                                            <th className="py-3 pl-3 pr-5 w-52 text-right">{t('Thao tác')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 text-[13px]">
                                        {sortedProducts.map((p) => (
                                            <tr key={p.id} className="hover:bg-zinc-50/70 transition-colors">
                                                <td className="py-3 pl-5 pr-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <img
                                                            src={p.image_url}
                                                            alt={p.name}
                                                            className="h-10 w-10 rounded-lg object-cover border border-zinc-200/70 shrink-0"
                                                            onError={(e) => {
                                                                e.target.src = FALLBACK_PRODUCT_IMG;
                                                            }}
                                                        />
                                                        <div className="min-w-0 max-w-xs">
                                                            <div className="font-medium text-zinc-900 truncate">
                                                                {p.name}
                                                            </div>
                                                            <div className="text-[11.5px] text-zinc-400 font-mono truncate">
                                                                {p.sku} · {p.shop_name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-[12.5px] text-zinc-600">{p.category}</td>
                                                <td className="py-3 px-3 font-mono tabular-nums">
                                                    <div className="font-medium text-zinc-900">
                                                        ₫{Number(p.sale_price).toLocaleString('vi-VN')}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 font-mono tabular-nums">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[12px] font-medium">
                                                        +{p.commission_rate}% (₫{Number(p.commission_amount).toLocaleString('vi-VN')})
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-center font-mono text-zinc-700 tabular-nums">
                                                    {formatNumber(p.clicks_count || 0)}
                                                </td>
                                                <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyLink(p)}
                                                            className="h-7 px-2 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-[11.5px] font-medium text-zinc-700 inline-flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <Copy size={12} />
                                                            <span>Link</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleComposeWithProduct(p)}
                                                            className="h-7 px-2 rounded-md border border-zinc-200 bg-white hover:border-[#d8b216] hover:bg-[#ffd631]/20 text-[11.5px] font-medium text-zinc-800 cursor-pointer"
                                                        >
                                                            {t('Soạn')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditDrawer(p)}
                                                            aria-label={t('Sửa')}
                                                            className="h-7 w-7 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-flex items-center justify-center cursor-pointer"
                                                        >
                                                            <PencilSimple size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleteTarget(p)}
                                                            aria-label={t('Xóa')}
                                                            className="h-7 w-7 rounded-md text-zinc-400 hover:text-dangerFg hover:bg-dangerBg/60 inline-flex items-center justify-center cursor-pointer"
                                                        >
                                                            <Trash size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </div>
            ) : activeTab === 'generator' ? (
                /* TAB 2: DEEP LINK GENERATOR (Balanced 2-col Studio) */
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    <div className="lg:col-span-7 bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-5">
                        <div>
                            <h2 className="font-heading text-[16px] font-medium text-zinc-900">
                                {t('Trình tạo Link Shopee Affiliate có SubID')}
                            </h2>
                            <p className="text-[12.5px] text-zinc-500 mt-0.5">
                                {t(
                                    'Chuyển đổi URL sản phẩm hoặc gian hàng Shopee thành link rút gọn gắn SubID để đo lường doanh số theo từng kênh.'
                                )}
                            </p>
                        </div>

                        <form onSubmit={handleGenerateDeepLink} className="space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="gen-url" className="label-xs block text-zinc-600 font-medium">
                                    {t('Đường link sản phẩm Shopee gốc')} <span className="text-dangerFg">*</span>
                                </label>
                                <input
                                    id="gen-url"
                                    type="url"
                                    required
                                    value={genOriginalUrl}
                                    onChange={(e) => setGenOriginalUrl(e.target.value)}
                                    placeholder="https://shopee.vn/product/84920491/17294819203..."
                                    className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-[13px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216]"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label htmlFor="gen-sub1" className="label-xs block text-zinc-600 font-medium">
                                        {t('SubID 1 (Kênh xuất bản)')}
                                    </label>
                                    <select
                                        id="gen-sub1"
                                        value={genSub1}
                                        onChange={(e) => setGenSub1(e.target.value)}
                                        className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-[13px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631]"
                                    >
                                        <option value="facebook">Facebook Post / Reel</option>
                                        <option value="first_comment">First Comment (Bình luận đầu)</option>
                                        <option value="threads">Threads</option>
                                        <option value="tiktok_bio">TikTok Bio Link</option>
                                        <option value="zalo">Zalo OA / Nhóm</option>
                                        <option value="custom">Tùy biến...</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="gen-sub2" className="label-xs block text-zinc-600 font-medium">
                                        {t('SubID 2 (Chiến dịch / Đợt sale)')}
                                    </label>
                                    <input
                                        id="gen-sub2"
                                        type="text"
                                        value={genSub2}
                                        onChange={(e) => setGenSub2(e.target.value)}
                                        placeholder="vd: sale_11_11, review_sp..."
                                        className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-[13px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631]"
                                    />
                                </div>
                            </div>

                            <button type="submit" className="btn-skew">
                                <Sparkle size={15} weight="duotone" />
                                <span>{t('Tạo Link Affiliate Rút Gọn')}</span>
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-5 bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-4">
                        <h3 className="font-heading text-[15px] font-medium text-zinc-900">
                            {t('Kết quả & Quy ước SubID')}
                        </h3>

                        {genResultUrl ? (
                            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
                                <span className="text-[11.5px] font-medium text-emerald-800 block">
                                    {t('Link Shopee Affiliate sẵn sàng chia sẻ:')}
                                </span>
                                <div className="p-2.5 rounded-lg bg-white border border-emerald-200 font-mono text-[12px] text-zinc-900 break-all select-all">
                                    {genResultUrl}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard?.writeText(genResultUrl);
                                            setCopiedGen(true);
                                            setTimeout(() => setCopiedGen(false), 2000);
                                            toast({ title: t('Đã sao chép link vào bộ nhớ tạm!') });
                                        }}
                                        className="h-8 px-3 rounded-lg bg-[#ffd631] hover:bg-[#ffe059] border border-[#d8b216] text-[#2b2100] text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                        {copiedGen ? <Check size={13} /> : <Copy size={13} />}
                                        <span>{copiedGen ? t('Đã chép') : t('Sao chép link')}</span>
                                    </button>
                                    <a
                                        href={genResultUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="h-8 px-2.5 rounded-lg border border-zinc-200 bg-white text-[12px] text-zinc-700 inline-flex items-center gap-1 hover:bg-zinc-50"
                                    >
                                        <span>{t('Mở thử')}</span>
                                        <ArrowSquareOut size={12} />
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="p-5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 text-center space-y-1.5">
                                <LinkSimple size={24} className="mx-auto text-zinc-300" />
                                <p className="text-[12.5px] text-zinc-500">
                                    {t('Dán link Shopee bên trái để sinh đường dẫn có gắn tracking SubID.')}
                                </p>
                            </div>
                        )}

                        <div className="pt-3 border-t border-zinc-100 space-y-2 text-[12px] text-zinc-500 leading-relaxed">
                            <p>
                                <strong className="text-zinc-800">SubID 1:</strong> Phân biệt nguồn đăng (Facebook, Bình luận đầu, Threads, Bio TikTok).
                            </p>
                            <p>
                                <strong className="text-zinc-800">SubID 2:</strong> Gắn tên chiến dịch hoặc mã đợt sale để đối chiếu báo cáo Shopee Affiliate.
                            </p>
                        </div>
                    </div>
                </section>
            ) : (
                /* TAB 3: AFFILIATE SETTINGS */
                <section className="max-w-2xl bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-5">
                    <div>
                        <h2 className="font-heading text-[16px] font-medium text-zinc-900">
                            {t('Cấu hình Shopee Affiliate Program')}
                        </h2>
                        <p className="text-[12.5px] text-zinc-500 mt-0.5">
                            {t('Thiết lập App ID, tên hiển thị đối tác và tên miền rút gọn Universal Link.')}
                        </p>
                    </div>

                    <form onSubmit={handleSaveSettings} className="space-y-4">
                        <div className="space-y-1.5">
                            <label htmlFor="shp-appid" className="label-xs block text-zinc-600 font-medium">
                                {t('Shopee Affiliate App ID / Partner ID')}
                            </label>
                            <input
                                id="shp-appid"
                                type="text"
                                value={settings.app_id || ''}
                                onChange={(e) => setSettings({ ...settings, app_id: e.target.value })}
                                placeholder="20019284"
                                className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13px] font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="shp-partner" className="label-xs block text-zinc-600 font-medium">
                                {t('Tên hiển thị đối tác (Partner Name)')}
                            </label>
                            <input
                                id="shp-partner"
                                type="text"
                                value={settings.partner_name || ''}
                                onChange={(e) => setSettings({ ...settings, partner_name: e.target.value })}
                                placeholder="SocialChoice Affiliate Hub"
                                className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="shp-domain" className="label-xs block text-zinc-600 font-medium">
                                {t('Tên miền rút gọn Shopee (Tracking Domain)')}
                            </label>
                            <select
                                id="shp-domain"
                                value={settings.tracking_domain || 's.shopee.vn'}
                                onChange={(e) => setSettings({ ...settings, tracking_domain: e.target.value })}
                                className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631]"
                            >
                                <option value="s.shopee.vn">
                                    s.shopee.vn (Khuyên dùng — Universal Link mở thẳng app Shopee)
                                </option>
                                <option value="shope.ee">shope.ee (Định dạng cổ điển)</option>
                            </select>
                        </div>

                        <div className="pt-3 border-t border-zinc-100 flex justify-end">
                            <button type="submit" className="btn-skew">
                                <FloppyDisk size={15} weight="duotone" />
                                <span>{t('Lưu cấu hình')}</span>
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {/* Right-Side Slide-Over Drawer: Add / Edit Product */}
            <Sheet open={isProductDrawerOpen} onOpenChange={setIsProductDrawerOpen}>
                <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 flex flex-col bg-white">
                    <div className="px-6 py-5 border-b border-zinc-200/80">
                        <h2 className="font-heading text-[18px] font-medium text-zinc-900">
                            {editingProduct ? t('Chỉnh sửa sản phẩm Shopee') : t('Thêm sản phẩm Shopee mới')}
                        </h2>
                        <p className="text-[12.5px] text-zinc-500 mt-0.5">
                            {t('Nhập thông tin giá, hoa hồng và USP để tự động sinh kịch bản chốt đơn.')}
                        </p>
                    </div>

                    <form onSubmit={handleSaveProduct} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 scrollbar-clean">
                            {/* Live Commission Preview */}
                            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 flex items-center justify-between gap-3">
                                <span className="text-[12px] text-zinc-500">
                                    {t('Hoa hồng dự kiến / đơn hàng:')}
                                </span>
                                <span className="font-mono text-[15px] font-semibold text-emerald-700 tabular-nums">
                                    ₫{previewCommission.toLocaleString('vi-VN')} ({productForm.commission_rate || 0}%)
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="sp-name" className="label-xs block text-zinc-600 font-medium">
                                    {t('Tên sản phẩm')} <span className="text-dangerFg">*</span>
                                </label>
                                <input
                                    id="sp-name"
                                    required
                                    value={productForm.name}
                                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                                    placeholder="Cà phê rang mộc..."
                                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13.5px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label htmlFor="sp-sku" className="label-xs block text-zinc-600 font-medium">
                                        {t('Mã SKU')}
                                    </label>
                                    <input
                                        id="sp-sku"
                                        value={productForm.sku}
                                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                                        placeholder="SHP-01"
                                        className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13px] font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="sp-cat" className="label-xs block text-zinc-600 font-medium">
                                        {t('Ngành hàng')}
                                    </label>
                                    <select
                                        id="sp-cat"
                                        value={productForm.category}
                                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                                        className="w-full h-9 px-2.5 rounded-lg border border-zinc-200 bg-white text-[13px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631]"
                                    >
                                        {categories
                                            .filter((c) => c !== 'Tất cả')
                                            .map((c) => (
                                                <option key={c} value={c}>
                                                    {c}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label htmlFor="sp-orig" className="label-xs block text-zinc-600 font-medium">
                                        {t('Giá gốc (₫)')}
                                    </label>
                                    <input
                                        id="sp-orig"
                                        type="number"
                                        value={productForm.original_price}
                                        onChange={(e) =>
                                            setProductForm({ ...productForm, original_price: e.target.value })
                                        }
                                        className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13px] font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="sp-sale" className="label-xs block text-zinc-600 font-medium">
                                        {t('Giá khuyến mãi (₫)')} <span className="text-dangerFg">*</span>
                                    </label>
                                    <input
                                        id="sp-sale"
                                        type="number"
                                        required
                                        value={productForm.sale_price}
                                        onChange={(e) =>
                                            setProductForm({ ...productForm, sale_price: e.target.value })
                                        }
                                        className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13px] font-mono font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label htmlFor="sp-rate" className="label-xs block text-zinc-600 font-medium">
                                        {t('Tỷ lệ hoa hồng (%)')}
                                    </label>
                                    <input
                                        id="sp-rate"
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={productForm.commission_rate}
                                        onChange={(e) =>
                                            setProductForm({ ...productForm, commission_rate: e.target.value })
                                        }
                                        className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13px] font-mono text-emerald-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#ffd631]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="sp-voucher" className="label-xs block text-zinc-600 font-medium">
                                        {t('Mã voucher / ưu đãi')}
                                    </label>
                                    <input
                                        id="sp-voucher"
                                        value={productForm.voucher_text}
                                        onChange={(e) =>
                                            setProductForm({ ...productForm, voucher_text: e.target.value })
                                        }
                                        placeholder="Freeship Xtra + Giảm 20K"
                                        className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="sp-aff" className="label-xs block text-zinc-600 font-medium">
                                    {t('Link Shopee Affiliate')}
                                </label>
                                <input
                                    id="sp-aff"
                                    value={productForm.affiliate_url}
                                    onChange={(e) =>
                                        setProductForm({ ...productForm, affiliate_url: e.target.value })
                                    }
                                    placeholder="https://s.shopee.vn/..."
                                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13px] font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="sp-img" className="label-xs block text-zinc-600 font-medium">
                                    {t('URL ảnh sản phẩm')}
                                </label>
                                <input
                                    id="sp-img"
                                    type="url"
                                    value={productForm.image_url}
                                    onChange={(e) =>
                                        setProductForm({ ...productForm, image_url: e.target.value })
                                    }
                                    placeholder="https://images.unsplash.com/..."
                                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="sp-usp" className="label-xs block text-zinc-600 font-medium">
                                    {t('Điểm nổi bật USP (mỗi dòng 1 ý)')}
                                </label>
                                <textarea
                                    id="sp-usp"
                                    rows={3}
                                    value={productForm.highlights_text}
                                    onChange={(e) =>
                                        setProductForm({ ...productForm, highlights_text: e.target.value })
                                    }
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-[13px] text-zinc-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#ffd631] resize-y"
                                />
                            </div>

                            <label className="flex items-center gap-2 text-[13px] text-zinc-700 cursor-pointer pt-1">
                                <input
                                    type="checkbox"
                                    checked={productForm.is_hot_deal}
                                    onChange={(e) =>
                                        setProductForm({ ...productForm, is_hot_deal: e.target.checked })
                                    }
                                    className="rounded border-zinc-300"
                                />
                                <span>{t('Đánh dấu là Deal Hot / Sản phẩm đẩy doanh số')}</span>
                            </label>
                        </div>

                        <div className="px-6 py-4 border-t border-zinc-200/80 bg-zinc-50/70 flex items-center justify-end gap-2.5">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsProductDrawerOpen(false)}
                            >
                                {t('Hủy')}
                            </Button>
                            <button type="submit" className="btn-skew">
                                <FloppyDisk size={15} weight="duotone" />
                                <span>{editingProduct ? t('Lưu thay đổi') : t('Thêm sản phẩm')}</span>
                            </button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>

            {/* Right-Side Slide-Over Drawer: Sales Script Preview */}
            <Sheet
                open={!!selectedScriptProduct}
                onOpenChange={(open) => !open && setSelectedScriptProduct(null)}
            >
                <SheetContent side="right" className="w-full sm:max-w-[500px] p-0 flex flex-col bg-white">
                    {selectedScriptProduct ? (
                        <>
                            <div className="px-6 py-5 border-b border-zinc-200/80">
                                <h2 className="font-heading text-[18px] font-medium text-zinc-900">
                                    {t('Kịch bản bán hàng Shopee')}
                                </h2>
                                <p className="text-[12.5px] text-zinc-500 mt-0.5 truncate">
                                    {selectedScriptProduct.name}
                                </p>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 scrollbar-clean">
                                <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-zinc-100 border border-zinc-200/70">
                                    {[
                                        { id: 'first_comment', label: t('Bình luận đầu') },
                                        { id: 'facebook', label: 'Facebook Post' },
                                        { id: 'threads', label: 'Threads' },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setScriptPlatform(tab.id)}
                                            className={`h-8 px-3 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                                                scriptPlatform === tab.id
                                                    ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                                    : 'text-zinc-600 hover:text-zinc-900'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 font-mono text-[12.5px] text-zinc-800 whitespace-pre-wrap leading-relaxed select-all">
                                    {currentScript}
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-zinc-200/80 bg-zinc-50/70 flex items-center justify-between gap-2.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        navigator.clipboard?.writeText(currentScript);
                                        setCopiedScript(true);
                                        setTimeout(() => setCopiedScript(false), 2000);
                                        toast({ title: t('Đã chép kịch bản bán hàng vào bộ nhớ tạm!') });
                                    }}
                                >
                                    {copiedScript ? (
                                        <Check size={14} className="mr-1.5 text-emerald-600" />
                                    ) : (
                                        <Copy size={14} className="mr-1.5" />
                                    )}
                                    <span>{copiedScript ? t('Đã chép') : t('Sao chép')}</span>
                                </Button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            `/create?shopee_product_id=${selectedScriptProduct.id}&auto_script=${scriptPlatform}`
                                        )
                                    }
                                    className="btn-skew"
                                >
                                    <NotePencil size={15} weight="duotone" />
                                    <span>{t('Dùng kịch bản soạn bài')}</span>
                                </button>
                            </div>
                        </>
                    ) : null}
                </SheetContent>
            </Sheet>

            {/* Delete Product Confirmation */}
            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title={t('Xóa “{value1}”?', { value1: deleteTarget?.name })}
                description={t('Sản phẩm sẽ bị xóa khỏi kho tiếp thị liên kết Shopee.')}
                confirmLabel={t('Xóa sản phẩm')}
                destructive
                onConfirm={confirmDeleteProduct}
            />
        </div>
    );
}
