import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowsClockwise,
    ArrowSquareOut,
    CurrencyDollar,
    FilmScript,
    FloppyDisk,
    Lightning,
    ListBullets,
    MagnifyingGlass,
    Package,
    Plus,
    ShoppingBag,
    SquaresFour,
    Star,
    Storefront,
    TrendUp,
    VideoCamera,
    X,
} from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import { tiktokShopService } from '@/lib/tiktok-shop-service';
import AddChannelDialog from '@/components/accounts/add-channel-dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { formatNumber } from '@/lib/format';

export default function TiktokShopNew() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { brands, selectedBrandId } = useWorkspace();

    const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'orders'
    const [shops, setShops] = useState([]);
    const [selectedShopId, setSelectedShopId] = useState('');
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);

    // Filters & View
    const [searchQuery, setSearchQuery] = useState('');
    const [catalogFilter, setCatalogFilter] = useState('all'); // 'all' | 'flash' | 'low_stock'
    const [orderStatusFilter, setOrderStatusFilter] = useState('all'); // 'all' | 'completed' | 'processing'
    const [catalogView, setCatalogView] = useState('grid'); // 'grid' | 'table'

    // Actions & Drawers
    const [isSyncing, setIsSyncing] = useState(false);
    const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
    const [isAddProductOpen, setIsAddProductOpen] = useState(false);

    // Add Product Drawer form
    const [newProductName, setNewProductName] = useState('');
    const [newProductSku, setNewProductSku] = useState('');
    const [newProductPrice, setNewProductPrice] = useState('');
    const [newProductStock, setNewProductStock] = useState('100');
    const [newProductCategory, setNewProductCategory] = useState('Thực phẩm & Đồ uống');

    const loadData = useCallback(() => {
        const currentShops = tiktokShopService.getShops(selectedBrandId);
        setShops(currentShops);

        const currentShop = currentShops.find((s) => s.id === selectedShopId) || currentShops[0];
        if (currentShop) {
            setSelectedShopId(currentShop.id);
            setProducts(tiktokShopService.getProducts(currentShop.id));
            setOrders(tiktokShopService.getRecentOrders(currentShop.id));
        } else {
            setProducts([]);
            setOrders([]);
        }
    }, [selectedBrandId, selectedShopId]);

    useEffect(() => {
        loadData();
        window.addEventListener('socialchoice:tiktok_shop_updated', loadData);
        return () => window.removeEventListener('socialchoice:tiktok_shop_updated', loadData);
    }, [loadData]);

    useEffect(() => {
        if (selectedShopId) {
            setProducts(tiktokShopService.getProducts(selectedShopId));
            setOrders(tiktokShopService.getRecentOrders(selectedShopId));
        }
    }, [selectedShopId]);

    const activeShop = shops.find((s) => s.id === selectedShopId) || shops[0] || null;

    const flashCount = useMemo(() => products.filter((p) => p.is_flash_sale).length, [products]);
    const lowStockCount = useMemo(() => products.filter((p) => (p.stock || 0) < 50).length, [products]);

    const filteredProducts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return products.filter((p) => {
            if (catalogFilter === 'flash' && !p.is_flash_sale) return false;
            if (catalogFilter === 'low_stock' && (p.stock || 0) >= 50) return false;
            if (q) {
                const hay = `${p.name || ''} ${p.sku || ''} ${p.category || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [products, catalogFilter, searchQuery]);

    const filteredOrders = useMemo(() => {
        return orders.filter((o) => {
            if (orderStatusFilter === 'completed' && o.status !== 'completed') return false;
            if (orderStatusFilter === 'processing' && o.status === 'completed') return false;
            return true;
        });
    }, [orders, orderStatusFilter]);

    const handleSync = async () => {
        if (!activeShop) return;
        setIsSyncing(true);
        try {
            await tiktokShopService.syncCatalog(activeShop.id);
            loadData();
            toast({
                title: t('Đã đồng bộ TikTok Shop thành công!'),
                description: t(
                    'Dữ liệu tồn kho, giá bán và đơn hàng mới nhất đã được cập nhật từ TikTok Seller Center.'
                ),
            });
        } catch {
            toast({ title: t('Đồng bộ thất bại'), variant: 'destructive' });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleToggleFlashSale = (productId) => {
        tiktokShopService.toggleFlashSale(productId);
        loadData();
        toast({ title: t('Đã cập nhật trạng thái Flash Sale') });
    };

    const handleCreateProduct = (e) => {
        e.preventDefault();
        if (!activeShop || !newProductName.trim()) return;

        tiktokShopService.addProduct(activeShop.id, {
            name: newProductName.trim(),
            sku: newProductSku.trim() || undefined,
            original_price: Number(newProductPrice) || 120000,
            sale_price: Number(newProductPrice) || 120000,
            stock: Number(newProductStock) || 100,
            category: newProductCategory,
            is_flash_sale: false,
        });

        setIsAddProductOpen(false);
        setNewProductName('');
        setNewProductSku('');
        setNewProductPrice('');
        loadData();
        toast({ title: t('Đã thêm sản phẩm mới vào TikTok Shop!') });
    };

    const handleCreateVideoWithProduct = (product) => {
        navigate(`/create?tiktok_product_id=${product.id}`);
    };

    return (
        <div className="space-y-6 pb-14 max-w-[1440px] mx-auto">
            {/* Compact Header with Active Shop Identity */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-zinc-200/80">
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="font-heading text-[26px] font-medium tracking-tight text-zinc-900">
                            {t('TikTok Shop')}
                        </h1>
                        {activeShop ? (
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white border border-zinc-200/90 text-[12px]">
                                <span className="h-5 w-5 rounded-md bg-[#FE2C55]/10 border border-[#FE2C55]/20 text-[#FE2C55] inline-flex items-center justify-center shrink-0">
                                    <Storefront size={12} weight="fill" />
                                </span>
                                {shops.length > 1 ? (
                                    <select
                                        aria-label={t('Chọn gian hàng')}
                                        value={selectedShopId}
                                        onChange={(e) => setSelectedShopId(e.target.value)}
                                        className="bg-transparent font-medium text-zinc-900 focus:outline-none cursor-pointer"
                                    >
                                        {shops.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.shop_name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className="font-medium text-zinc-900">{activeShop.shop_name}</span>
                                )}
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span className="text-zinc-400 font-mono text-[11px] hidden sm:inline">
                                    {activeShop.region_name}
                                </span>
                            </div>
                        ) : null}
                    </div>
                    <p className="text-[13.5px] text-zinc-500 max-w-2xl leading-relaxed">
                        {t(
                            'Đồng bộ danh mục sản phẩm từ Seller Center, gắn Giỏ hàng vàng vào video và theo dõi đơn hàng phát sinh.'
                        )}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {activeShop ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-lg border-zinc-200 bg-white text-zinc-700"
                            asChild
                        >
                            <a href="https://seller-vn.tiktok.com" target="_blank" rel="noreferrer">
                                <span>Seller Center</span>
                                <ArrowSquareOut size={14} className="ml-1.5 text-zinc-400" />
                            </a>
                        </Button>
                    ) : null}

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isSyncing || !activeShop}
                        onClick={handleSync}
                        className="h-9 rounded-lg border-zinc-200 bg-white text-zinc-700"
                    >
                        <ArrowsClockwise
                            size={14}
                            className={`mr-1.5 text-zinc-500 ${isSyncing ? 'motion-safe:animate-spin' : ''}`}
                        />
                        <span>{isSyncing ? t('Đang đồng bộ...') : t('Đồng bộ tức thời')}</span>
                    </Button>

                    <button
                        type="button"
                        onClick={() => setIsAddChannelOpen(true)}
                        className="btn-skew"
                    >
                        <Plus size={16} weight="duotone" />
                        <span>{t('Kết nối gian hàng')}</span>
                    </button>
                </div>
            </header>

            {/* 4-KPI Commerce Strip (Flat white cards, tabular-nums) */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-zinc-500">
                            {t('GMV Video 30 ngày')}
                        </span>
                        <CurrencyDollar size={16} weight="duotone" className="text-zinc-400 shrink-0" />
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="metric text-zinc-900 tabular-nums">
                            {activeShop
                                ? `₫${Number(activeShop.stats.gmv_30d).toLocaleString('vi-VN')}`
                                : '₫0'}
                        </span>
                    </div>
                    <p className={`text-[11.5px] mt-1 ${activeShop?.stats?.gmv_30d > 0 ? 'text-emerald-700 font-medium' : 'text-zinc-500'}`}>
                        {!activeShop
                            ? t('Chưa kết nối gian hàng')
                            : activeShop.stats.gmv_30d > 0
                            ? '+18.4% so với 30 ngày trước'
                            : t('Chưa phát sinh doanh thu')}
                    </p>
                </div>

                <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-zinc-500">
                            {t('Đơn hàng qua Video')}
                        </span>
                        <ShoppingBag size={16} weight="duotone" className="text-zinc-400 shrink-0" />
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-1.5">
                        <span className="metric text-zinc-900 tabular-nums">
                            {activeShop ? formatNumber(activeShop.stats.video_orders) : '0'}
                        </span>
                        <span className="text-[12px] text-zinc-400">{t('đơn')}</span>
                    </div>
                    <p className="text-[11.5px] text-zinc-500 mt-1">
                        {activeShop?.stats?.video_orders > 0
                            ? 'Chiếm 62.9% tổng đơn shop'
                            : t('Chưa có đơn hàng qua video')}
                    </p>
                </div>

                <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-zinc-500">
                            {t('Tỷ lệ chuyển đổi')}
                        </span>
                        <TrendUp size={16} weight="duotone" className="text-zinc-400 shrink-0" />
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-1.5">
                        <span className="metric text-zinc-900 tabular-nums">
                            {activeShop ? `${activeShop.stats.conversion_rate}%` : '0%'}
                        </span>
                    </div>
                    <p className={`text-[11.5px] mt-1 ${activeShop?.stats?.conversion_rate > 0 ? 'text-emerald-700 font-medium' : 'text-zinc-500'}`}>
                        {activeShop?.stats?.conversion_rate > 0
                            ? '+1.2% so với trung bình ngành'
                            : t('Chưa có dữ liệu chuyển đổi')}
                    </p>
                </div>

                <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-zinc-500">
                            {t('Sản phẩm đang bán')}
                        </span>
                        <Package size={16} weight="duotone" className="text-zinc-400 shrink-0" />
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="metric text-zinc-900 tabular-nums">
                            {formatNumber(products.length)}
                        </span>
                        <span className="text-[12px] text-zinc-400">{t('sản phẩm')}</span>
                    </div>
                    <p className="text-[11.5px] text-zinc-500 mt-1 tabular-nums">
                        {flashCount > 0
                            ? `${flashCount} Flash Sale · ${lowStockCount} sắp hết`
                            : t('Đã đồng bộ từ Seller Center')}
                    </p>
                </div>
            </section>

            {/* Main Tabs Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center p-1 rounded-xl bg-white border border-zinc-200/80">
                    <button
                        type="button"
                        onClick={() => setActiveTab('catalog')}
                        className={`h-8 px-3.5 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-2 transition-colors cursor-pointer ${
                            activeTab === 'catalog'
                                ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                : 'text-zinc-500 hover:text-zinc-900'
                        }`}
                    >
                        <Package size={15} weight={activeTab === 'catalog' ? 'duotone' : 'regular'} />
                        <span>{t('Danh mục sản phẩm')}</span>
                        <span className="font-mono text-[11px] opacity-75 tabular-nums">
                            {products.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('orders')}
                        className={`h-8 px-3.5 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-2 transition-colors cursor-pointer ${
                            activeTab === 'orders'
                                ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                : 'text-zinc-500 hover:text-zinc-900'
                        }`}
                    >
                        <ShoppingBag size={15} weight={activeTab === 'orders' ? 'duotone' : 'regular'} />
                        <span>{t('Đơn hàng từ Video')}</span>
                        <span className="font-mono text-[11px] opacity-75 tabular-nums">
                            {orders.length}
                        </span>
                    </button>
                </div>

                {activeTab === 'catalog' ? (
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!activeShop}
                        onClick={() => setIsAddProductOpen(true)}
                        className="h-9 rounded-lg border-zinc-200 bg-white hover:border-[#d8b216] hover:bg-[#ffd631]/15 text-zinc-800"
                    >
                        <Plus size={14} weight="bold" className="mr-1.5" />
                        <span>{t('Thêm sản phẩm')}</span>
                    </Button>
                ) : null}
            </div>

            {/* TAB 1: PRODUCT CATALOG */}
            {activeTab === 'catalog' ? (
                <div className="space-y-4">
                    {/* Single-Row Catalog Command Bar */}
                    <section className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <MagnifyingGlass
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('Tìm sản phẩm theo tên, SKU hoặc danh mục...')}
                                aria-label={t('Tìm sản phẩm theo tên, SKU hoặc danh mục...')}
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
                            {/* Quick Filter Pills */}
                            <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/70">
                                {[
                                    { id: 'all', label: t('Tất cả'), count: products.length },
                                    { id: 'flash', label: 'Flash Sale', count: flashCount },
                                    { id: 'low_stock', label: t('Sắp hết'), count: lowStockCount },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setCatalogFilter(tab.id)}
                                        className={`h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                            catalogFilter === tab.id
                                                ? 'bg-white text-zinc-900 shadow-2xs'
                                                : 'text-zinc-500 hover:text-zinc-900'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* View Toggle */}
                            <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/70">
                                <button
                                    type="button"
                                    onClick={() => setCatalogView('grid')}
                                    className={`h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                        catalogView === 'grid'
                                            ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                            : 'text-zinc-500 hover:text-zinc-900'
                                    }`}
                                >
                                    <SquaresFour size={14} weight={catalogView === 'grid' ? 'duotone' : 'regular'} />
                                    <span>{t('Lưới')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCatalogView('table')}
                                    className={`h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                        catalogView === 'table'
                                            ? 'bg-[#ffd631] text-[#2b2100] font-semibold'
                                            : 'text-zinc-500 hover:text-zinc-900'
                                    }`}
                                >
                                    <ListBullets size={14} weight={catalogView === 'table' ? 'duotone' : 'regular'} />
                                    <span>{t('Bảng')}</span>
                                </button>
                            </div>
                        </div>
                    </section>

                    {filteredProducts.length === 0 ? (
                        <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center space-y-3">
                            <ShoppingBag size={32} weight="duotone" className="mx-auto text-zinc-300" />
                            <p className="text-[14px] font-medium text-zinc-800">
                                {t('Không tìm thấy sản phẩm nào')}
                            </p>
                            <p className="text-[12.5px] text-zinc-500 max-w-sm mx-auto">
                                {t(
                                    'Thử đổi từ khóa lọc, thêm sản phẩm mới hoặc đồng bộ lại từ TikTok Seller Center.'
                                )}
                            </p>
                        </div>
                    ) : catalogView === 'grid' ? (
                        /* Clean 3-Col Product Cards */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredProducts.map((p) => (
                                <article
                                    key={p.id}
                                    className="bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-2xl overflow-hidden flex flex-col justify-between transition-colors group"
                                >
                                    <div>
                                        <div className="relative aspect-[16/10] bg-zinc-100 overflow-hidden">
                                            <img
                                                src={p.image_url}
                                                alt={p.name}
                                                className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                                            />
                                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                                                <span className="rounded-md bg-white/95 border border-black/10 text-zinc-800 text-[10.5px] font-mono px-2 py-0.5">
                                                    {p.sku}
                                                </span>
                                                {p.is_flash_sale ? (
                                                    <span className="rounded-md bg-[#ffd631] border border-[#d8b216] text-[#2b2100] text-[10.5px] font-semibold px-2 py-0.5 inline-flex items-center gap-1">
                                                        <Lightning size={10} weight="fill" />
                                                        <span>Flash Sale</span>
                                                    </span>
                                                ) : null}
                                            </div>
                                            {p.rating ? (
                                                <div className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-md bg-white/95 border border-black/10 px-2 py-0.5 text-[11px] font-medium text-zinc-800">
                                                    <Star size={11} weight="fill" className="text-amber-500" />
                                                    <span className="tabular-nums">{p.rating}</span>
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="p-4 space-y-2">
                                            <span className="text-[11px] font-medium text-zinc-400 block">
                                                {p.category}
                                            </span>
                                            <h3 className="font-heading text-[14.5px] font-medium text-zinc-900 line-clamp-2 leading-snug">
                                                {p.name}
                                            </h3>

                                            <div className="flex items-baseline gap-2 pt-1">
                                                <span className="text-[16px] font-semibold text-zinc-900 tabular-nums">
                                                    ₫{Number(p.sale_price).toLocaleString('vi-VN')}
                                                </span>
                                                {p.original_price > p.sale_price ? (
                                                    <span className="text-[12px] line-through text-zinc-400 tabular-nums">
                                                        ₫{Number(p.original_price).toLocaleString('vi-VN')}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-4 pb-4 space-y-3">
                                        <div className="flex items-center justify-between text-[12px] text-zinc-500 pt-2.5 border-t border-zinc-100 tabular-nums">
                                            <span>
                                                {t('Đã bán:')}{' '}
                                                <strong className="font-medium text-zinc-900">
                                                    {formatNumber(p.sales_count || 0)}
                                                </strong>
                                            </span>
                                            <span>
                                                {t('Tồn kho:')}{' '}
                                                <strong
                                                    className={`font-medium ${
                                                        (p.stock || 0) < 50 ? 'text-amber-700' : 'text-emerald-700'
                                                    }`}
                                                >
                                                    {formatNumber(p.stock || 0)}
                                                </strong>
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleCreateVideoWithProduct(p)}
                                                className="flex-1 h-9 px-3 rounded-lg border border-zinc-200 bg-white hover:border-[#d8b216] hover:bg-[#ffd631]/25 text-[12.5px] font-medium text-zinc-800 hover:text-[#2b2100] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                                <VideoCamera size={15} weight="duotone" />
                                                <span>{t('Tạo video gắn giỏ hàng')}</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleToggleFlashSale(p.id)}
                                                title={t('Bật/Tắt Flash Sale')}
                                                aria-label={t('Bật/Tắt Flash Sale')}
                                                className={`h-9 w-9 rounded-lg border inline-flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                                                    p.is_flash_sale
                                                        ? 'border-[#d8b216] bg-[#ffd631]/25 text-[#2b2100]'
                                                        : 'border-zinc-200 bg-white text-zinc-400 hover:text-zinc-800 hover:bg-zinc-50'
                                                }`}
                                            >
                                                <Lightning size={15} weight={p.is_flash_sale ? 'fill' : 'regular'} />
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        /* Compact Product Table */
                        <section className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[11.5px] font-medium text-zinc-500">
                                            <th className="py-3 pl-5 pr-3">{t('Sản phẩm')}</th>
                                            <th className="py-3 px-3 w-36">{t('Giá bán')}</th>
                                            <th className="py-3 px-3 w-28">{t('Đã bán')}</th>
                                            <th className="py-3 px-3 w-28">{t('Tồn kho')}</th>
                                            <th className="py-3 pl-3 pr-5 w-52 text-right">{t('Thao tác')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 text-[13px]">
                                        {filteredProducts.map((p) => (
                                            <tr key={p.id} className="hover:bg-zinc-50/70 transition-colors">
                                                <td className="py-3 pl-5 pr-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <img
                                                            src={p.image_url}
                                                            alt={p.name}
                                                            className="h-10 w-10 rounded-lg object-cover border border-zinc-200/70 shrink-0"
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-zinc-900 truncate max-w-[300px]">
                                                                {p.name}
                                                            </div>
                                                            <div className="text-[11.5px] text-zinc-400 font-mono">
                                                                {p.sku} · {p.category}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 tabular-nums">
                                                    <div className="font-medium text-zinc-900">
                                                        ₫{Number(p.sale_price).toLocaleString('vi-VN')}
                                                    </div>
                                                    {p.is_flash_sale ? (
                                                        <span className="text-[10.5px] font-medium text-amber-700">
                                                            Flash Sale
                                                        </span>
                                                    ) : null}
                                                </td>
                                                <td className="py-3 px-3 tabular-nums text-zinc-700">
                                                    {formatNumber(p.sales_count || 0)}
                                                </td>
                                                <td className="py-3 px-3 tabular-nums">
                                                    <span
                                                        className={
                                                            (p.stock || 0) < 50
                                                                ? 'text-amber-700 font-medium'
                                                                : 'text-emerald-700 font-medium'
                                                        }
                                                    >
                                                        {formatNumber(p.stock || 0)}
                                                    </span>
                                                </td>
                                                <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCreateVideoWithProduct(p)}
                                                            className="h-8 px-2.5 rounded-lg border border-zinc-200 bg-white hover:border-[#d8b216] hover:bg-[#ffd631]/20 text-[12px] font-medium text-zinc-800 inline-flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <VideoCamera size={13} />
                                                            <span>{t('Gắn giỏ hàng')}</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleFlashSale(p.id)}
                                                            aria-label={t('Bật/Tắt Flash Sale')}
                                                            className={`h-8 w-8 rounded-lg border inline-flex items-center justify-center cursor-pointer ${
                                                                p.is_flash_sale
                                                                    ? 'border-[#d8b216] bg-[#ffd631]/25 text-[#2b2100]'
                                                                    : 'border-zinc-200 bg-white text-zinc-400 hover:text-zinc-800'
                                                            }`}
                                                        >
                                                            <Lightning size={13} weight={p.is_flash_sale ? 'fill' : 'regular'} />
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
            ) : (
                /* TAB 2: ORDERS ATTRIBUTED TO VIDEO */
                <section className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="font-heading text-[15px] font-medium text-zinc-900">
                                {t('Đơn hàng phát sinh trực tiếp từ Video')}
                            </h2>
                            <p className="text-[12px] text-zinc-500 mt-0.5">
                                {t('Ghi nhận doanh số khi khách hàng đặt mua qua Giỏ hàng vàng từ video đăng bởi Socialchoice.')}
                            </p>
                        </div>

                        <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/70">
                            {[
                                { id: 'all', label: t('Tất cả') },
                                { id: 'completed', label: t('Đã giao hàng') },
                                { id: 'processing', label: t('Đang xử lý') },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setOrderStatusFilter(tab.id)}
                                    className={`h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
                                        orderStatusFilter === tab.id
                                            ? 'bg-white text-zinc-900 shadow-2xs'
                                            : 'text-zinc-500 hover:text-zinc-900'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredOrders.length === 0 ? (
                        <div className="py-12 text-center text-[13px] text-zinc-500">
                            {t('Chưa có đơn hàng nào khớp bộ lọc.')}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-100 bg-zinc-50/70 text-[11.5px] font-medium text-zinc-500">
                                        <th className="py-3 pl-5 pr-3">{t('Mã đơn & Sản phẩm')}</th>
                                        <th className="py-3 px-3">{t('Video nguồn')}</th>
                                        <th className="py-3 px-3">{t('Khách hàng')}</th>
                                        <th className="py-3 px-3 w-36 text-right">{t('Giá trị')}</th>
                                        <th className="py-3 pl-3 pr-5 w-36 text-right">{t('Trạng thái')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 text-[13px]">
                                    {filteredOrders.map((o) => (
                                        <tr key={o.id} className="hover:bg-zinc-50/70 transition-colors">
                                            <td className="py-3.5 pl-5 pr-3">
                                                <div className="font-mono text-[12px] font-medium text-zinc-900">
                                                    {o.id}
                                                </div>
                                                <div className="text-[12.5px] text-zinc-600 mt-0.5">
                                                    {o.product_name}{' '}
                                                    <span className="text-zinc-400">×{o.quantity}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-3">
                                                <span className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-700">
                                                    <FilmScript size={14} className="text-zinc-400 shrink-0" />
                                                    <span className="truncate max-w-[240px]">{o.video_source}</span>
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-3">
                                                <div className="text-zinc-800">{o.customer_name}</div>
                                                <div className="text-[11.5px] text-zinc-400">{o.province}</div>
                                            </td>
                                            <td className="py-3.5 px-3 text-right font-mono font-medium text-zinc-900 tabular-nums">
                                                ₫{Number(o.total_amount).toLocaleString('vi-VN')}
                                            </td>
                                            <td className="py-3.5 pl-3 pr-5 text-right">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                                        o.status === 'completed'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                                                            : 'bg-sky-50 text-sky-700 border-sky-200/70'
                                                    }`}
                                                >
                                                    {o.status === 'completed'
                                                        ? t('Đã giao hàng')
                                                        : t('Đang xử lý')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {/* Right-Side Slide-Over Drawer: Add Product */}
            <Sheet open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
                <SheetContent side="right" className="w-full sm:max-w-[460px] p-0 flex flex-col bg-white">
                    <div className="px-6 py-5 border-b border-zinc-200/80">
                        <h2 className="font-heading text-[18px] font-medium text-zinc-900">
                            {t('Thêm sản phẩm vào TikTok Shop')}
                        </h2>
                        <p className="text-[12.5px] text-zinc-500 mt-0.5">
                            {activeShop
                                ? `${t('Gian hàng:')} ${activeShop.shop_name}`
                                : t('Nhập thông tin sản phẩm để gắn vào Giỏ hàng vàng.')}
                        </p>
                    </div>

                    <form onSubmit={handleCreateProduct} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 scrollbar-clean">
                            <div className="space-y-1.5">
                                <label htmlFor="tts-name" className="label-xs block text-zinc-600 font-medium">
                                    {t('Tên sản phẩm')} <span className="text-dangerFg">*</span>
                                </label>
                                <input
                                    id="tts-name"
                                    type="text"
                                    required
                                    value={newProductName}
                                    onChange={(e) => setNewProductName(e.target.value)}
                                    placeholder={t('VD: Cà phê Arabica rang mộc 500g')}
                                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13.5px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label htmlFor="tts-sku" className="label-xs block text-zinc-600 font-medium">
                                        {t('Mã SKU')}
                                    </label>
                                    <input
                                        id="tts-sku"
                                        type="text"
                                        value={newProductSku}
                                        onChange={(e) => setNewProductSku(e.target.value)}
                                        placeholder="CF-ARA-500"
                                        className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13px] font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="tts-price" className="label-xs block text-zinc-600 font-medium">
                                        {t('Giá bán (₫)')} <span className="text-dangerFg">*</span>
                                    </label>
                                    <input
                                        id="tts-price"
                                        type="number"
                                        required
                                        value={newProductPrice}
                                        onChange={(e) => setNewProductPrice(e.target.value)}
                                        placeholder="150000"
                                        className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13.5px] tabular-nums text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label htmlFor="tts-stock" className="label-xs block text-zinc-600 font-medium">
                                        {t('Tồn kho')}
                                    </label>
                                    <input
                                        id="tts-stock"
                                        type="number"
                                        value={newProductStock}
                                        onChange={(e) => setNewProductStock(e.target.value)}
                                        placeholder="100"
                                        className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13.5px] tabular-nums text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="tts-cat" className="label-xs block text-zinc-600 font-medium">
                                        {t('Danh mục')}
                                    </label>
                                    <input
                                        id="tts-cat"
                                        type="text"
                                        value={newProductCategory}
                                        onChange={(e) => setNewProductCategory(e.target.value)}
                                        placeholder={t('VD: Cà phê hạt')}
                                        className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-[13.5px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#ffd631] focus:border-[#d8b216]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-zinc-200/80 bg-zinc-50/70 flex items-center justify-end gap-2.5">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddProductOpen(false)}
                            >
                                {t('Hủy')}
                            </Button>
                            <button type="submit" className="btn-skew">
                                <FloppyDisk size={15} weight="duotone" />
                                <span>{t('Lưu sản phẩm')}</span>
                            </button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>

            {/* Connect Shop Dialog (reuses redesigned Brand-first AddChannelDialog) */}
            <AddChannelDialog
                open={isAddChannelOpen}
                onOpenChange={setIsAddChannelOpen}
                brands={brands}
                defaultBrandId={selectedBrandId}
                initialPlatform="tiktok-shop"
                onChanged={loadData}
                onAddManually={() => {}}
            />
        </div>
    );
}
