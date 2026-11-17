import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import { shopeeAffiliateService } from '@/lib/shopee-affiliate-service';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ShoppingBagOpen,
    Tag,
    Percent,
    Coins,
    CursorClick,
    Plus,
    MagnifyingGlass,
    Copy,
    Check,
    ArrowSquareOut,
    PencilSimple,
    Trash,
    Sparkle,
    LinkSimple,
    SlidersHorizontal,
    Star,
    Fire,
    ArrowsClockwise,
    SquaresFour,
    Rows,
    ChatTeardropText,
    ShareNetwork,
    Gear,
    CaretRight,
    ShoppingBag,
} from '@phosphor-icons/react';

export default function ShopeeAffiliate() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { brands, selectedBrandId } = useWorkspace();

    const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'generator' | 'settings'
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');
    const [sortBy, setSortBy] = useState('commission_desc'); // 'commission_desc' | 'price_asc' | 'price_desc' | 'sold_desc'
    const [products, setProducts] = useState([]);
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalClicks: 0,
        totalConversions: 0,
        estimatedCommission: 0,
        avgCommissionRate: 0,
        hotDealsCount: 0,
    });

    // Modal Thêm / Sửa sản phẩm
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
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

    // Modal xem / tạo kịch bản bán hàng
    const [selectedScriptProduct, setSelectedScriptProduct] = useState(null);
    const [scriptPlatform, setScriptPlatform] = useState('first_comment'); // 'first_comment' | 'facebook' | 'threads' | 'general'
    const [copiedScript, setCopiedScript] = useState(false);

    // Deep Link Generator State
    const [genOriginalUrl, setGenOriginalUrl] = useState('');
    const [genSub1, setGenSub1] = useState('facebook');
    const [genSub2, setGenSub2] = useState('campaign_nov');
    const [genResultUrl, setGenResultUrl] = useState('');
    const [copiedGen, setCopiedGen] = useState(false);

    // Settings State
    const [settings, setSettings] = useState(() => shopeeAffiliateService.getSettings());

    const loadData = () => {
        const list = shopeeAffiliateService.getProducts(selectedBrandId, selectedCategory);
        setProducts(list);
        setStats(shopeeAffiliateService.getStats(selectedBrandId));
        setSettings(shopeeAffiliateService.getSettings());
    };

    useEffect(() => {
        loadData();
        window.addEventListener('socialchoice:shopee_affiliate_updated', loadData);
        return () => window.removeEventListener('socialchoice:shopee_affiliate_updated', loadData);
    }, [selectedBrandId, selectedCategory]);

    const categories = useMemo(() => shopeeAffiliateService.getCategories(), []);

    // Filtered & Sorted Products
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

    // Copy to clipboard helper
    const handleCopyLink = (product) => {
        if (!product?.affiliate_url) return;
        navigator.clipboard.writeText(product.affiliate_url);
        shopeeAffiliateService.recordClick(product.id);
        toast({
            title: t('Đã sao chép Link Shopee Affiliate!'),
            description: product.affiliate_url,
        });
    };

    // Open Add / Edit Modal
    const handleOpenAddModal = () => {
        setEditingProduct(null);
        setProductForm({
            name: '',
            sku: `SHP-${Date.now().toString().slice(-4)}`,
            category: selectedCategory !== 'Tất cả' ? selectedCategory : 'Thực phẩm & Đồ uống',
            brand_id: selectedBrandId !== 'all' ? selectedBrandId : (brands[0]?.id || 'all'),
            shop_name: 'Shopee Official Store',
            shop_type: 'shopee_mall',
            image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
            original_price: '190000',
            sale_price: '149000',
            commission_rate: '15',
            voucher_text: 'Freeship Xtra + Giảm 25K',
            original_url: '',
            affiliate_url: '',
            highlights_text: 'Chính hãng 100% đổi trả miễn phí\nGiao hàng hỏa tốc trong 2H\nBảo hành uy tín',
            is_hot_deal: true,
        });
        setIsProductModalOpen(true);
    };

    const handleOpenEditModal = (product) => {
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
        setIsProductModalOpen(true);
    };

    // Save Product
    const handleSaveProduct = (e) => {
        e.preventDefault();
        if (!productForm.name.trim()) {
            toast({ variant: 'destructive', title: t('Vui lòng nhập tên sản phẩm') });
            return;
        }

        if (editingProduct) {
            shopeeAffiliateService.updateProduct(editingProduct.id, {
                ...productForm,
                highlights: productForm.highlights_text.split('\n').filter(Boolean),
            });
            toast({ title: t('Đã cập nhật sản phẩm thành công!') });
        } else {
            shopeeAffiliateService.addProduct({
                ...productForm,
                highlights: productForm.highlights_text.split('\n').filter(Boolean),
            });
            toast({ title: t('Đã thêm sản phẩm mới vào kho Shopee Affiliate!') });
        }
        setIsProductModalOpen(false);
    };

    // Delete Product
    const handleDeleteProduct = (id) => {
        if (window.confirm(t('Bạn có chắc muốn xóa sản phẩm này khỏi kho tiếp thị liên kết?'))) {
            shopeeAffiliateService.deleteProduct(id);
            toast({ title: t('Đã xóa sản phẩm khỏi kho.') });
        }
    };

    // Generate Deep Link
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

    // Save Settings
    const handleSaveSettings = (e) => {
        e.preventDefault();
        shopeeAffiliateService.updateSettings(settings);
        toast({ title: t('Đã lưu cấu hình tài khoản Shopee Affiliate!') });
    };

    // Quick Compose with Product
    const handleComposeWithProduct = (product) => {
        navigate(`/create?shopee_product_id=${product.id}`);
    };

    const currentScript = useMemo(() => {
        if (!selectedScriptProduct) return '';
        return shopeeAffiliateService.generateSalesCopy(selectedScriptProduct, scriptPlatform);
    }, [selectedScriptProduct, scriptPlatform]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Page Header */}
            <PageHeader
                title={t('Shopee Affiliate Catalog')}
                subtitle={t('Quản lý danh mục sản phẩm tiếp thị liên kết Shopee, theo dõi hoa hồng và tự động tạo kịch bản chốt đơn đa kênh.')}
                icon={ShoppingBagOpen}
                actions={
                    <div className="flex items-center gap-2.5">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab('generator')}
                            className="gap-2 text-xs font-semibold"
                        >
                            <LinkSimple size={15} />
                            <span>{t('Tạo Link SubID')}</span>
                        </Button>
                        <button
                            type="button"
                            onClick={handleOpenAddModal}
                            className="btn-skew inline-flex items-center gap-2 text-xs font-bold px-4 py-2"
                        >
                            <Plus size={15} weight="bold" />
                            <span>{t('Thêm sản phẩm Shopee')}</span>
                        </button>
                    </div>
                }
            />

            {/* Stat Cards Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title={t('Sản phẩm tiếp thị')}
                    value={stats.totalProducts}
                    subtitle={t('Đang trong danh mục')}
                    icon={Tag}
                    color="text-orange-600 dark:text-orange-400"
                    bgColor="bg-orange-50 dark:bg-orange-950/20"
                />
                <StatCard
                    title={t('Hoa hồng trung bình')}
                    value={`${stats.avgCommissionRate}%`}
                    subtitle={t('Mức chiết khấu đơn hàng')}
                    icon={Percent}
                    color="text-emerald-600 dark:text-emerald-400"
                    bgColor="bg-emerald-50 dark:bg-emerald-950/20"
                />
                <StatCard
                    title={t('Tổng lượt click')}
                    value={stats.totalClicks.toLocaleString('vi-VN')}
                    subtitle={t(`${stats.totalConversions} chuyển đổi ước tính`)}
                    icon={CursorClick}
                    color="text-blue-600 dark:text-blue-400"
                    bgColor="bg-blue-50 dark:bg-blue-950/20"
                />
                <StatCard
                    title={t('Hoa hồng ước tính')}
                    value={`₫${stats.estimatedCommission.toLocaleString('vi-VN')}`}
                    subtitle={t(`${stats.hotDealsCount} sản phẩm Deal Hot`)}
                    icon={Coins}
                    color="text-amber-600 dark:text-amber-400"
                    bgColor="bg-amber-50 dark:bg-amber-950/20"
                />
            </div>

            {/* Main Tabs Navigation */}
            <div className="flex items-center justify-between border-b border-border/80 pb-3 gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60">
                    <button
                        type="button"
                        onClick={() => setActiveTab('catalog')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === 'catalog'
                                ? 'bg-background text-foreground shadow-2xs border border-border'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <ShoppingBag size={15} weight={activeTab === 'catalog' ? 'fill' : 'regular'} />
                        <span>{t('Kho sản phẩm')}</span>
                        <span className="ml-1 rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-400 px-1.5 py-0.2 text-[10px]">
                            {products.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('generator')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === 'generator'
                                ? 'bg-background text-foreground shadow-2xs border border-border'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <LinkSimple size={15} weight={activeTab === 'generator' ? 'bold' : 'regular'} />
                        <span>{t('Tạo Link SubID Nhanh')}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('settings')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === 'settings'
                                ? 'bg-background text-foreground shadow-2xs border border-border'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Gear size={15} weight={activeTab === 'settings' ? 'fill' : 'regular'} />
                        <span>{t('Cấu hình Affiliate')}</span>
                    </button>
                </div>

                {activeTab === 'catalog' && (
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-md transition-colors ${
                                    viewMode === 'grid' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title={t('Xem dạng lưới')}
                            >
                                <SquaresFour size={16} weight={viewMode === 'grid' ? 'fill' : 'regular'} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-md transition-colors ${
                                    viewMode === 'table' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title={t('Xem dạng danh sách')}
                            >
                                <Rows size={16} weight={viewMode === 'table' ? 'fill' : 'regular'} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* TAB 1: PRODUCT CATALOG */}
            {activeTab === 'catalog' && (
                <div className="space-y-4">
                    {/* Filter & Search Toolbar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
                        <div className="relative flex-1 max-w-md">
                            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('Tìm theo tên sản phẩm, SKU hoặc shop…')}
                                className="pl-9 h-9 text-xs"
                            />
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                            >
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                            >
                                <option value="commission_desc">{t('Hoa hồng (₫) cao nhất')}</option>
                                <option value="commission_rate_desc">{t('Tỷ lệ hoa hồng (%) cao nhất')}</option>
                                <option value="sold_desc">{t('Lượt bán nhiều nhất')}</option>
                                <option value="price_asc">{t('Giá tăng dần')}</option>
                                <option value="price_desc">{t('Giá giảm dần')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Empty State */}
                    {sortedProducts.length === 0 ? (
                        <div className="border rounded-2xl p-12 text-center bg-card">
                            <div className="size-12 rounded-2xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto mb-3">
                                <ShoppingBagOpen size={24} weight="duotone" />
                            </div>
                            <h3 className="text-base font-bold font-heading">{t('Chưa có sản phẩm nào trong kho')}</h3>
                            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                                {searchQuery
                                    ? t('Không tìm thấy sản phẩm phù hợp với từ khóa tìm kiếm. Thử tìm từ khóa khác.')
                                    : t('Bắt đầu thêm các sản phẩm Shopee có hoa hồng cao để dễ dàng tạo kịch bản bán hàng và gắn link tiếp thị.')}
                            </p>
                            <button
                                type="button"
                                onClick={handleOpenAddModal}
                                className="btn-skew inline-flex items-center gap-2 text-xs font-bold px-4 py-2"
                            >
                                <Plus size={15} weight="bold" />
                                <span>{t('Thêm sản phẩm đầu tiên')}</span>
                            </button>
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* GRID VIEW */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sortedProducts.map((p) => (
                                <div
                                    key={p.id}
                                    className="group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-orange-500/40 hover:shadow-md transition-all duration-200"
                                >
                                    {/* Image & Badges */}
                                    <div className="relative aspect-4/3 w-full bg-muted overflow-hidden">
                                        <img
                                            src={p.image_url}
                                            alt={p.name}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            onError={(e) => {
                                                e.target.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80';
                                            }}
                                        />
                                        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                                            {p.shop_type === 'shopee_mall' && (
                                                <span className="rounded bg-red-600 text-white text-[10px] font-black px-2 py-0.5 tracking-wider uppercase">
                                                    Shopee Mall
                                                </span>
                                            )}
                                            {p.is_hot_deal && (
                                                <span className="rounded bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 shadow-2xs">
                                                    <Fire size={12} weight="fill" />
                                                    Deal Hot
                                                </span>
                                            )}
                                        </div>

                                        <div className="absolute top-2.5 right-2.5">
                                            <span className="rounded-full bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 shadow-2xs">
                                                +{p.commission_rate}% ({Number(p.commission_amount).toLocaleString('vi-VN')}₫)
                                            </span>
                                        </div>

                                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white/95 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-lg">
                                            <span className="truncate max-w-[150px] font-medium">{p.shop_name}</span>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Star size={12} weight="fill" className="text-amber-400" />
                                                <span>{p.rating}</span>
                                                <span className="text-white/60">· {p.sold_count} đã bán</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                        <div>
                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                                                <span className="font-mono">{p.sku}</span>
                                                <span>{p.category}</span>
                                            </div>
                                            <h4 className="text-sm font-semibold font-heading text-foreground line-clamp-2 leading-snug">
                                                {p.name}
                                            </h4>

                                            {/* Price block */}
                                            <div className="mt-2.5 flex items-baseline gap-2">
                                                <span className="text-base font-bold font-mono text-orange-600 dark:text-orange-400">
                                                    ₫{Number(p.sale_price).toLocaleString('vi-VN')}
                                                </span>
                                                {p.original_price > p.sale_price && (
                                                    <span className="text-xs line-through text-muted-foreground font-mono">
                                                        ₫{Number(p.original_price).toLocaleString('vi-VN')}
                                                    </span>
                                                )}
                                                {p.discount_percent > 0 && (
                                                    <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.2 rounded">
                                                        -{p.discount_percent}%
                                                    </span>
                                                )}
                                            </div>

                                            {p.voucher_text && (
                                                <p className="mt-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                                                    <Tag size={12} weight="bold" />
                                                    <span>{p.voucher_text}</span>
                                                </p>
                                            )}
                                        </div>

                                        {/* Action buttons */}
                                        <div className="space-y-2 pt-2 border-t border-border/60">
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleCopyLink(p)}
                                                    className="w-full text-xs gap-1.5 h-8 font-medium"
                                                >
                                                    <Copy size={13} />
                                                    <span>{t('Copy Link')}</span>
                                                </Button>

                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedScriptProduct(p);
                                                        setCopiedScript(false);
                                                    }}
                                                    className="w-full text-xs gap-1.5 h-8 font-medium bg-orange-50 text-orange-800 hover:bg-orange-100 dark:bg-orange-950/30 dark:text-orange-300"
                                                >
                                                    <Sparkle size={13} weight="fill" />
                                                    <span>{t('Kịch bản')}</span>
                                                </Button>
                                            </div>

                                            <div className="flex items-center justify-between gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleComposeWithProduct(p)}
                                                    className="btn-skew flex-1 text-center py-1.5 text-xs font-bold"
                                                >
                                                    {t('Soạn bài đăng')}
                                                </button>

                                                <div className="flex items-center gap-0.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleOpenEditModal(p)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                        title={t('Sửa')}
                                                    >
                                                        <PencilSimple size={14} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteProduct(p.id)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                        title={t('Xóa')}
                                                    >
                                                        <Trash size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* TABLE VIEW */
                        <div className="rounded-2xl border border-border bg-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        <tr>
                                            <th className="py-3 px-4">{t('Sản phẩm')}</th>
                                            <th className="py-3 px-4">{t('Ngành hàng')}</th>
                                            <th className="py-3 px-4">{t('Giá bán')}</th>
                                            <th className="py-3 px-4">{t('Hoa hồng (Affiliate)')}</th>
                                            <th className="py-3 px-4 text-center">{t('Lượt click')}</th>
                                            <th className="py-3 px-4 text-right">{t('Thao tác')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {sortedProducts.map((p) => (
                                            <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={p.image_url}
                                                            alt={p.name}
                                                            className="size-11 rounded-xl object-cover border border-border shrink-0"
                                                            onError={(e) => {
                                                                e.target.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80';
                                                            }}
                                                        />
                                                        <div className="min-w-0 max-w-xs">
                                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                                {p.shop_type === 'shopee_mall' && (
                                                                    <span className="rounded bg-red-600 text-white text-[9px] font-black px-1.5 py-0.1 uppercase">
                                                                        Mall
                                                                    </span>
                                                                )}
                                                                <span className="text-[10px] text-muted-foreground truncate">{p.shop_name}</span>
                                                            </div>
                                                            <p className="font-semibold text-foreground truncate">{p.name}</p>
                                                            <p className="text-[11px] text-muted-foreground font-mono">{p.sku}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 font-medium text-muted-foreground">{p.category}</td>
                                                <td className="py-3 px-4 font-mono">
                                                    <span className="font-bold text-orange-600 dark:text-orange-400">
                                                        ₫{Number(p.sale_price).toLocaleString('vi-VN')}
                                                    </span>
                                                    {p.original_price > p.sale_price && (
                                                        <span className="block text-[10px] line-through text-muted-foreground">
                                                            ₫{Number(p.original_price).toLocaleString('vi-VN')}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md font-mono">
                                                        +{p.commission_rate}% (~₫{Number(p.commission_amount).toLocaleString('vi-VN')})
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center font-mono font-medium">
                                                    {p.clicks_count || 0}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleCopyLink(p)}
                                                            className="h-7 text-xs px-2 gap-1"
                                                        >
                                                            <Copy size={12} />
                                                            <span>Link</span>
                                                        </Button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleComposeWithProduct(p)}
                                                            className="btn-skew py-1 px-2.5 text-xs font-bold"
                                                        >
                                                            {t('Soạn')}
                                                        </button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleOpenEditModal(p)}
                                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                        >
                                                            <PencilSimple size={13} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteProduct(p.id)}
                                                            className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                                        >
                                                            <Trash size={13} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: DEEP LINK GENERATOR */}
            {activeTab === 'generator' && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                                <LinkSimple size={20} weight="bold" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold font-heading">{t('Trình tạo Link Shopee Affiliate có SubID')}</h3>
                                <p className="text-xs text-muted-foreground">
                                    {t('Chuyển đổi link sản phẩm hoặc link shop Shopee thành đường dẫn tiếp thị liên kết để theo dõi doanh số theo từng kênh.')}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleGenerateDeepLink} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold mb-1.5">
                                    {t('Đường link sản phẩm Shopee gốc')} <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="url"
                                    required
                                    value={genOriginalUrl}
                                    onChange={(e) => setGenOriginalUrl(e.target.value)}
                                    placeholder="https://shopee.vn/product/84920491/17294819203..."
                                    className="text-xs h-10"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5">
                                        {t('SubID 1 (Kênh xuất bản)')}
                                    </label>
                                    <select
                                        value={genSub1}
                                        onChange={(e) => setGenSub1(e.target.value)}
                                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium"
                                    >
                                        <option value="facebook">Facebook Post / Reel</option>
                                        <option value="first_comment">First Comment (Bình luận đầu)</option>
                                        <option value="threads">Threads</option>
                                        <option value="tiktok_bio">TikTok Bio Link</option>
                                        <option value="zalo">Zalo OA / Nhóm</option>
                                        <option value="custom">Tùy biến...</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold mb-1.5">
                                        {t('SubID 2 (Chiến dịch / Đợt sale)')}
                                    </label>
                                    <Input
                                        type="text"
                                        value={genSub2}
                                        onChange={(e) => setGenSub2(e.target.value)}
                                        placeholder="vd: sale_11_11, review_sp..."
                                        className="text-xs h-10"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn-skew w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2"
                            >
                                <Sparkle size={15} weight="fill" />
                                <span>{t('Tạo Link Affiliate Rút Gọn')}</span>
                            </button>
                        </form>

                        {genResultUrl && (
                            <div className="p-4 rounded-xl bg-muted/60 border border-border space-y-2 animate-in fade-in-50">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                                    {t('Link Shopee Affiliate đã tạo:')}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Input
                                        readOnly
                                        value={genResultUrl}
                                        className="text-xs font-mono font-bold bg-background text-orange-600 dark:text-orange-400 h-9 select-all"
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText(genResultUrl);
                                            setCopiedGen(true);
                                            setTimeout(() => setCopiedGen(false), 2000);
                                            toast({ title: t('Đã sao chép link vào bộ nhớ tạm!') });
                                        }}
                                        className="h-9 gap-1.5 text-xs shrink-0"
                                    >
                                        {copiedGen ? <Check size={14} weight="bold" /> : <Copy size={14} />}
                                        <span>{copiedGen ? t('Đã chép') : t('Sao chép')}</span>
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: SETTINGS */}
            {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <form onSubmit={handleSaveSettings} className="rounded-2xl border border-border bg-card p-6 space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                                <Gear size={20} weight="fill" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold font-heading">{t('Cấu hình Shopee Affiliate Program')}</h3>
                                <p className="text-xs text-muted-foreground">
                                    {t('Thiết lập App ID và thông số định danh đối tác tiếp thị Shopee.')}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold mb-1.5">
                                    {t('Shopee Affiliate App ID / Partner ID')}
                                </label>
                                <Input
                                    type="text"
                                    value={settings.app_id || ''}
                                    onChange={(e) => setSettings({ ...settings, app_id: e.target.value })}
                                    placeholder="20019284"
                                    className="text-xs h-10 font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold mb-1.5">
                                    {t('Tên hiển thị đối tác (Partner Name)')}
                                </label>
                                <Input
                                    type="text"
                                    value={settings.partner_name || ''}
                                    onChange={(e) => setSettings({ ...settings, partner_name: e.target.value })}
                                    placeholder="SocialChoice Affiliate Hub"
                                    className="text-xs h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold mb-1.5">
                                    {t('Tên miền rút gọn Shopee (Tracking Domain)')}
                                </label>
                                <select
                                    value={settings.tracking_domain || 's.shopee.vn'}
                                    onChange={(e) => setSettings({ ...settings, tracking_domain: e.target.value })}
                                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium"
                                >
                                    <option value="s.shopee.vn">s.shopee.vn (Khuyên dùng - Universal Link mở thẳng app Shopee)</option>
                                    <option value="shope.ee">shope.ee (Định dạng cổ điển)</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-border flex justify-end">
                            <button
                                type="submit"
                                className="btn-skew py-2 px-5 text-xs font-bold"
                            >
                                {t('Lưu cấu hình')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL: THÊM / CHỈNH SỬA SẢN PHẨM */}
            {isProductModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
                    <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-base font-bold font-heading">
                                {editingProduct ? t('Chỉnh sửa sản phẩm Shopee') : t('Thêm sản phẩm Shopee mới')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsProductModalOpen(false)}
                                className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold mb-1">
                                    {t('Tên sản phẩm')} <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    required
                                    value={productForm.name}
                                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                                    placeholder="Cà phê rang mộc..."
                                    className="text-xs h-9"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold mb-1">{t('Mã SKU')}</label>
                                    <Input
                                        value={productForm.sku}
                                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                                        placeholder="SHP-01"
                                        className="text-xs h-9 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold mb-1">{t('Ngành hàng')}</label>
                                    <select
                                        value={productForm.category}
                                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                                        className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-xs"
                                    >
                                        {categories.filter((c) => c !== 'Tất cả').map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold mb-1">{t('Giá gốc (₫)')}</label>
                                    <Input
                                        type="number"
                                        value={productForm.original_price}
                                        onChange={(e) => setProductForm({ ...productForm, original_price: e.target.value })}
                                        placeholder="190000"
                                        className="text-xs h-9 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold mb-1">
                                        {t('Giá khuyến mãi (₫)')} <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        type="number"
                                        required
                                        value={productForm.sale_price}
                                        onChange={(e) => setProductForm({ ...productForm, sale_price: e.target.value })}
                                        placeholder="149000"
                                        className="text-xs h-9 font-mono text-orange-600 font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold mb-1">{t('Tỷ lệ hoa hồng (%)')}</label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={productForm.commission_rate}
                                        onChange={(e) => setProductForm({ ...productForm, commission_rate: e.target.value })}
                                        placeholder="15"
                                        className="text-xs h-9 font-mono text-emerald-600 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold mb-1">{t('Mã voucher / ưu đãi')}</label>
                                    <Input
                                        value={productForm.voucher_text}
                                        onChange={(e) => setProductForm({ ...productForm, voucher_text: e.target.value })}
                                        placeholder="Freeship Xtra + Giảm 20K"
                                        className="text-xs h-9"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold mb-1">{t('Link Shopee Affiliate (Đã gắn tracking)')}</label>
                                <Input
                                    value={productForm.affiliate_url}
                                    onChange={(e) => setProductForm({ ...productForm, affiliate_url: e.target.value })}
                                    placeholder="https://s.shopee.vn/..."
                                    className="text-xs h-9 font-mono"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold mb-1">{t('URL ảnh sản phẩm')}</label>
                                <Input
                                    type="url"
                                    value={productForm.image_url}
                                    onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                                    placeholder="https://images.unsplash.com/..."
                                    className="text-xs h-9"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold mb-1">
                                    {t('3 Điểm nổi bật (USP làm kịch bản bán hàng - mỗi dòng 1 ý)')}
                                </label>
                                <textarea
                                    rows={3}
                                    value={productForm.highlights_text}
                                    onChange={(e) => setProductForm({ ...productForm, highlights_text: e.target.value })}
                                    placeholder="100% hạt rang mộc&#10;Hương hoa quả tươi ngọt hậu&#10;Giao hỏa tốc 2H"
                                    className="w-full p-2.5 rounded-lg border border-border bg-background text-xs resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="modal_is_hot_deal"
                                    checked={productForm.is_hot_deal}
                                    onChange={(e) => setProductForm({ ...productForm, is_hot_deal: e.target.checked })}
                                    className="rounded border-border"
                                />
                                <label htmlFor="modal_is_hot_deal" className="font-medium cursor-pointer">
                                    {t('Đánh dấu là Deal Hot / Sản phẩm đẩy doanh số')}
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsProductModalOpen(false)}
                                >
                                    {t('Hủy')}
                                </Button>
                                <button
                                    type="submit"
                                    className="btn-skew py-1.5 px-4 text-xs font-bold"
                                >
                                    {editingProduct ? t('Cập nhật') : t('Thêm sản phẩm')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: XEM KỊCH BẢN BÁN HÀNG */}
            {selectedScriptProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
                    <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Sparkle size={18} weight="fill" className="text-orange-600" />
                                <h3 className="text-base font-bold font-heading">{t('Kịch bản bán hàng Shopee')}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedScriptProduct(null)}
                                className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex items-center gap-1.5 border-b border-border pb-3">
                            <button
                                type="button"
                                onClick={() => setScriptPlatform('first_comment')}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                                    scriptPlatform === 'first_comment'
                                        ? 'bg-orange-500 text-white font-bold'
                                        : 'bg-muted text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Bình luận đầu (First Comment)
                            </button>
                            <button
                                type="button"
                                onClick={() => setScriptPlatform('facebook')}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                                    scriptPlatform === 'facebook'
                                        ? 'bg-orange-500 text-white font-bold'
                                        : 'bg-muted text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Facebook Post
                            </button>
                            <button
                                type="button"
                                onClick={() => setScriptPlatform('threads')}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                                    scriptPlatform === 'threads'
                                        ? 'bg-orange-500 text-white font-bold'
                                        : 'bg-muted text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Threads
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="p-3.5 rounded-xl bg-muted/60 border border-border font-mono text-xs whitespace-pre-wrap leading-relaxed select-all">
                                {currentScript}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(currentScript);
                                    setCopiedScript(true);
                                    setTimeout(() => setCopiedScript(false), 2000);
                                    toast({ title: t('Đã chép kịch bản bán hàng vào bộ nhớ tạm!') });
                                }}
                                className="gap-1.5 text-xs"
                            >
                                {copiedScript ? <Check size={14} weight="bold" /> : <Copy size={14} />}
                                <span>{copiedScript ? t('Đã chép') : t('Sao chép nội dung')}</span>
                            </Button>

                            <button
                                type="button"
                                onClick={() => {
                                    navigate(`/create?shopee_product_id=${selectedScriptProduct.id}&auto_script=${scriptPlatform}`);
                                }}
                                className="btn-skew py-1.5 px-4 text-xs font-bold"
                            >
                                {t('Dùng kịch bản này để soạn bài')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
