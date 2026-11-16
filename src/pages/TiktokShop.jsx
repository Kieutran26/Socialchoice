import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import { tiktokShopService } from '@/lib/tiktok-shop-service';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import AddChannelDialog from '@/components/accounts/add-channel-dialog';
import { Button } from '@/components/ui/button';
import {
    Storefront,
    ShoppingBag,
    ArrowsClockwise,
    Plus,
    MagnifyingGlass,
    Lightning,
    CheckCircle,
    Clock,
    TrendUp,
    FilmScript,
    VideoCamera,
    CurrencyDollar,
    Package,
    ArrowSquareOut,
    Tag,
    Star,
    CaretRight,
} from '@phosphor-icons/react';

export default function TiktokShop() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { brands, selectedBrandId } = useWorkspace();

    const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'orders' | 'settings'
    const [shops, setShops] = useState([]);
    const [selectedShopId, setSelectedShopId] = useState('');
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);

    // Modal thêm sản phẩm nhanh
    const [isAddProductOpen, setIsAddProductOpen] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [newProductSku, setNewProductSku] = useState('');
    const [newProductPrice, setNewProductPrice] = useState('');
    const [newProductStock, setNewProductStock] = useState('100');
    const [newProductCategory, setNewProductCategory] = useState('Thực phẩm & Đồ uống');

    const loadData = () => {
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
    };

    useEffect(() => {
        loadData();
        window.addEventListener('socialchoice:tiktok_shop_updated', loadData);
        return () => window.removeEventListener('socialchoice:tiktok_shop_updated', loadData);
    }, [selectedBrandId]);

    useEffect(() => {
        if (selectedShopId) {
            setProducts(tiktokShopService.getProducts(selectedShopId));
            setOrders(tiktokShopService.getRecentOrders(selectedShopId));
        }
    }, [selectedShopId]);

    const activeShop = shops.find((s) => s.id === selectedShopId) || shops[0];

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const q = searchQuery.toLowerCase();
        return products.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.sku && p.sku.toLowerCase().includes(q)) ||
                (p.category && p.category.toLowerCase().includes(q))
        );
    }, [products, searchQuery]);

    // Handle Sync with TikTok Seller Center
    const handleSync = async () => {
        if (!activeShop) return;
        setIsSyncing(true);
        try {
            await tiktokShopService.syncCatalog(activeShop.id);
            loadData();
            toast({
                title: t('Đã đồng bộ TikTok Shop thành công!'),
                description: t('Dữ liệu tồn kho, giá bán và đơn hàng mới nhất đã được cập nhật từ TikTok Seller Center.'),
            });
        } catch {
            toast({
                title: t('Đồng bộ thất bại'),
                variant: 'destructive',
            });
        } finally {
            setIsSyncing(false);
        }
    };

    // Toggle Flash Sale
    const handleToggleFlashSale = (productId) => {
        tiktokShopService.toggleFlashSale(productId);
        loadData();
        toast({ title: t('Đã cập nhật trạng thái Flash Sale') });
    };

    // Quick Add Product to Shop Catalog
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

    // Navigate to Create Post with selected product
    const handleCreateVideoWithProduct = (product) => {
        navigate(`/create?tiktok_product_id=${product.id}`);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('TikTok Shop Integration (Quản Lý Gian Hàng & Giỏ Hàng Vàng)')}
                description={t('Đồng bộ hóa danh mục sản phẩm từ TikTok Seller Center, quản lý đơn hàng phát sinh qua video và gắn Giỏ hàng vàng tự động vào bài đăng.')}
            >
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isSyncing || !activeShop}
                        onClick={handleSync}
                        className="inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold h-9"
                    >
                        <ArrowsClockwise size={14} className={isSyncing ? 'animate-spin' : ''} />
                        <span>{isSyncing ? t('Đang đồng bộ...') : t('Đồng bộ tức thời')}</span>
                    </Button>

                    <button
                        type="button"
                        onClick={() => setIsAddChannelOpen(true)}
                        className="btn-skew inline-flex items-center gap-1.5 !py-2 !px-3.5 text-xs font-bold"
                    >
                        <Plus size={14} weight="bold" />
                        <span>{t('Kết nối Gian hàng mới')}</span>
                    </button>
                </div>
            </PageHeader>

            {/* Shop Selector Bar & Active Shop Banner */}
            {shops.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-black text-white flex items-center justify-center relative shadow-xs shrink-0">
                            <Storefront size={22} weight="fill" className="text-[#FE2C55]" />
                            <span className="absolute -top-1 -right-1 size-2.5 bg-[#25F4EE] rounded-full" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-heading font-bold text-foreground">
                                    {activeShop?.shop_name}
                                </h3>
                                <span className="rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/20">
                                    Đang hoạt động
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Mã Shop: <span className="font-mono">{activeShop?.id}</span> · Thị trường: {activeShop?.region_name}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {shops.length > 1 && (
                            <select
                                value={selectedShopId}
                                onChange={(e) => setSelectedShopId(e.target.value)}
                                className="h-8 rounded-xl border border-border bg-muted/40 px-3 text-xs font-medium text-foreground focus:outline-none"
                            >
                                {shops.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.shop_name}
                                    </option>
                                ))}
                            </select>
                        )}
                        <a
                            href="https://seller-vn.tiktok.com"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#FE2C55] hover:underline px-2 py-1"
                        >
                            <span>Seller Center</span>
                            <ArrowSquareOut size={13} />
                        </a>
                    </div>
                </div>
            )}

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title={t('GMV Doanh thu Video 30 ngày')}
                    value={activeShop ? `₫${Number(activeShop.stats.gmv_30d).toLocaleString('vi-VN')}` : '0₫'}
                    change="+18.4%"
                    trend="up"
                    icon={CurrencyDollar}
                />
                <StatCard
                    title={t('Đơn hàng qua Video')}
                    value={activeShop ? `${activeShop.stats.video_orders} đơn` : '0 đơn'}
                    change="62.9% tổng shop"
                    trend="up"
                    icon={ShoppingBag}
                />
                <StatCard
                    title={t('Tỷ lệ chuyển đổi qua Video')}
                    value={activeShop ? `${activeShop.stats.conversion_rate}%` : '0%'}
                    change="+1.2% so với TB"
                    trend="up"
                    icon={TrendUp}
                />
                <StatCard
                    title={t('Sản phẩm đang bán')}
                    value={`${products.length} sản phẩm`}
                    change="Đồng bộ 100%"
                    trend="neutral"
                    icon={Package}
                />
            </div>

            {/* Main Tabs Navigation */}
            <div className="flex items-center gap-2 border-b border-border pb-1">
                <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border shrink-0 ${
                        activeTab === 'catalog'
                            ? 'bg-brand border-brand-dark text-brand-ink shadow-xs'
                            : 'bg-card border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                >
                    <Package size={16} weight={activeTab === 'catalog' ? 'fill' : 'bold'} />
                    <span>{t('Danh mục sản phẩm (Product Catalog)')}</span>
                    <span className="rounded-full bg-card/80 px-2 py-0.2 text-[10px] font-mono">
                        {products.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border shrink-0 ${
                        activeTab === 'orders'
                            ? 'bg-brand border-brand-dark text-brand-ink shadow-xs'
                            : 'bg-card border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                >
                    <ShoppingBag size={16} weight={activeTab === 'orders' ? 'fill' : 'bold'} />
                    <span>{t('Đơn hàng phát sinh qua Video (Attribution)')}</span>
                    <span className="rounded-full bg-card/80 px-2 py-0.2 text-[10px] font-mono">
                        {orders.length}
                    </span>
                </button>
            </div>

            {/* TAB 1: PRODUCT CATALOG */}
            {activeTab === 'catalog' && (
                <div className="space-y-4">
                    {/* Catalog Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <MagnifyingGlass size={15} className="absolute left-3 top-2.5 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm sản phẩm theo tên, SKU, danh mục..."
                                className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                onClick={() => setIsAddProductOpen(true)}
                                className="rounded-xl bg-[#FE2C55] hover:bg-[#e02449] text-white text-xs font-bold h-9 inline-flex items-center gap-1.5"
                            >
                                <Plus size={14} weight="bold" />
                                <span>Thêm sản phẩm</span>
                            </Button>
                        </div>
                    </div>

                    {/* Products Grid */}
                    {filteredProducts.length === 0 ? (
                        <div className="py-12 text-center border border-dashed border-border rounded-2xl bg-muted/10 p-6">
                            <ShoppingBag size={32} className="mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm font-semibold text-foreground">Không tìm thấy sản phẩm nào</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Hãy thêm sản phẩm mới hoặc bấm "Đồng bộ tức thời" để cập nhật từ TikTok Seller Center.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredProducts.map((p) => (
                                <div
                                    key={p.id}
                                    className="rounded-2xl border border-border bg-card overflow-hidden hover:border-amber-400/80 transition-all shadow-2xs flex flex-col group"
                                >
                                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                                        <img
                                            src={p.image_url}
                                            alt={p.name}
                                            className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                                            <span className="rounded-md bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5">
                                                {p.sku}
                                            </span>
                                            {p.is_flash_sale && (
                                                <span className="rounded-md bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 shadow-xs">
                                                    Flash Sale
                                                </span>
                                            )}
                                        </div>
                                        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-xs text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                            <Star size={11} weight="fill" />
                                            <span>{p.rating}</span>
                                        </div>
                                    </div>

                                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                        <div>
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                {p.category}
                                            </span>
                                            <h4 className="text-xs font-bold text-foreground line-clamp-2 mt-0.5 leading-snug">
                                                {p.name}
                                            </h4>

                                            <div className="mt-2.5 flex items-baseline gap-2">
                                                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                                                    ₫{Number(p.sale_price).toLocaleString('vi-VN')}
                                                </span>
                                                {p.original_price > p.sale_price && (
                                                    <span className="text-[11px] line-through text-muted-foreground">
                                                        ₫{Number(p.original_price).toLocaleString('vi-VN')}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-2">
                                                <span>Đã bán: <strong className="text-foreground">{p.sales_count}</strong></span>
                                                <span>Tồn kho: <strong className={p.stock < 50 ? 'text-red-600' : 'text-emerald-600'}>{p.stock}</strong></span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="pt-2 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleCreateVideoWithProduct(p)}
                                                className="btn-skew flex-1 flex items-center justify-center gap-1.5 !py-1.5 text-xs font-bold"
                                            >
                                                <VideoCamera size={14} weight="fill" />
                                                <span>Tạo video gắn giỏ hàng</span>
                                            </button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleToggleFlashSale(p.id)}
                                                title="Bật/Tắt Flash Sale"
                                                className={`h-8 px-2 text-xs rounded-xl ${
                                                    p.is_flash_sale ? 'bg-red-50 text-red-600 border-red-200' : ''
                                                }`}
                                            >
                                                <Lightning size={14} weight={p.is_flash_sale ? 'fill' : 'bold'} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: RECENT ATTRIBUTED ORDERS */}
            {activeTab === 'orders' && (
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-bold text-foreground">
                                Đơn hàng TikTok Shop phát sinh trực tiếp từ Video
                            </h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                Thuật toán tracking ghi nhận doanh số khi khách hàng bấm Giỏ hàng vàng từ video đăng bởi Socialchoice.
                            </p>
                        </div>
                        <span className="text-xs font-semibold text-emerald-600">
                            Attribution Rate: 62.9%
                        </span>
                    </div>

                    <div className="divide-y divide-border">
                        {orders.length === 0 ? (
                            <div className="py-8 text-center text-xs text-muted-foreground">
                                Chưa có đơn hàng nào được ghi nhận qua video
                            </div>
                        ) : (
                            orders.map((o) => (
                                <div key={o.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                                            <ShoppingBag size={16} weight="fill" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-foreground">{o.id}</span>
                                                <span className="text-xs font-semibold text-foreground">· {o.product_name} (x{o.quantity})</span>
                                                <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                                                    {o.province}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                                <FilmScript size={12} className="text-[#FE2C55]" />
                                                <span>{o.video_source}</span>
                                                <span>·</span>
                                                <span>{o.customer_name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="text-xs font-bold text-foreground">
                                            ₫{Number(o.total_amount).toLocaleString('vi-VN')}
                                        </div>
                                        <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full inline-block mt-0.5 ${
                                            o.status === 'completed'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {o.status === 'completed' ? 'Đã giao hàng' : 'Đang xử lý'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Modal Thêm sản phẩm nhanh */}
            {isAddProductOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
                    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                                <ShoppingBag size={18} weight="fill" className="text-[#FE2C55]" />
                                <span>Thêm sản phẩm vào TikTok Shop</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsAddProductOpen(false)}
                                className="text-muted-foreground hover:text-foreground text-xs"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateProduct} className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground">Tên sản phẩm *</label>
                                <input
                                    type="text"
                                    required
                                    value={newProductName}
                                    onChange={(e) => setNewProductName(e.target.value)}
                                    placeholder="VD: Cà phê Arabica rang mộc 500g"
                                    className="w-full h-8 rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-foreground">Mã SKU</label>
                                    <input
                                        type="text"
                                        value={newProductSku}
                                        onChange={(e) => setNewProductSku(e.target.value)}
                                        placeholder="VD: CF-ARA-500"
                                        className="w-full h-8 rounded-lg border border-border bg-card px-3 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-brand"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-foreground">Giá bán (₫) *</label>
                                    <input
                                        type="number"
                                        required
                                        value={newProductPrice}
                                        onChange={(e) => setNewProductPrice(e.target.value)}
                                        placeholder="150000"
                                        className="w-full h-8 rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-foreground">Số lượng tồn kho</label>
                                    <input
                                        type="number"
                                        value={newProductStock}
                                        onChange={(e) => setNewProductStock(e.target.value)}
                                        placeholder="100"
                                        className="w-full h-8 rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-foreground">Danh mục</label>
                                    <input
                                        type="text"
                                        value={newProductCategory}
                                        onChange={(e) => setNewProductCategory(e.target.value)}
                                        placeholder="VD: Cà phê hạt"
                                        className="w-full h-8 rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-border">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsAddProductOpen(false)}
                                    className="h-8 text-xs"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="h-8 text-xs bg-[#FE2C55] hover:bg-[#e02449] text-white font-bold"
                                >
                                    Lưu sản phẩm
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Kết nối Gian hàng */}
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
