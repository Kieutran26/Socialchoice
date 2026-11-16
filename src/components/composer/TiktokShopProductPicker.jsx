import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { tiktokShopService } from '@/lib/tiktok-shop-service';
import {
    ShoppingBag,
    Storefront,
    Check,
    X,
    Sparkle,
    MagnifyingGlass,
    ArrowRight,
    Tag,
    Lightning,
    CaretDown,
    CaretUp,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function TiktokShopProductPicker({
    brandId = '',
    selectedProduct = null,
    onSelectProduct = () => {},
    onInsertScript = () => {},
}) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(Boolean(selectedProduct));
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const load = () => {
            const list = tiktokShopService.getProducts(null, brandId);
            setProducts(list);
        };
        load();

        window.addEventListener('socialchoice:tiktok_shop_updated', load);
        return () => window.removeEventListener('socialchoice:tiktok_shop_updated', load);
    }, [brandId]);

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

    const handleGenerateSalesScript = (product) => {
        if (!product) return;
        const priceFormatted = Number(product.sale_price || product.original_price).toLocaleString('vi-VN');
        const usp = product.highlights && product.highlights.length > 0 ? product.highlights.slice(0, 2).join(', ') : 'Chất lượng cao cấp, giao nhanh toàn quốc';

        const script = [
            `🎬 [KỊCH BẢN TIKTOK SHOP GẮN GIỎ HÀNG VÀNG]`,
            `⚡ [0-3s HOOK]: "Ai đang tìm ${product.name} chuẩn chỉnh thì dừng lại xem ngay deal hời này!"`,
            `💡 [3-15s REVIEW]: Điểm mình ưng nhất là ${usp}. Dùng cực kỳ tiện và đáng tiền!`,
            `🔥 [15-25s FLASH SALE]: Hôm nay đang có giá ưu đãi chỉ ${priceFormatted}₫ tại TikTok Shop, số lượng voucher giảm giá có hạn.`,
            `👉 [25-30s CTA]: Bấm ngay vào GIỎ HÀNG MÀU VÀNG góc trái màn hình bên dưới để đặt ngay hôm nay nhé!`,
            '',
            `#TikTokShop #ReviewSanPham #GiaTot #DealHot #${product.sku || 'Socialchoice'}`
        ].join('\n');

        onInsertScript(script);
    };

    return (
        <section className="rounded-2xl border border-amber-300/80 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/10 p-4 transition-all">
            {/* Header Accordion */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between cursor-pointer select-none"
            >
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-amber-400 text-zinc-950 shadow-2xs font-bold shrink-0">
                        <ShoppingBag size={18} weight="fill" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-heading font-bold text-foreground">
                                {t('TikTok Shop — Gắn Giỏ Hàng Vàng (Product Anchor)')}
                            </h3>
                            <span className="rounded-full bg-amber-400/20 border border-amber-500/40 text-amber-900 dark:text-amber-300 text-[10px] font-bold px-2 py-0.2">
                                TIKTOK SHOP
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {selectedProduct
                                ? `Đã gắn: ${selectedProduct.name} (₫${Number(selectedProduct.sale_price).toLocaleString('vi-VN')})`
                                : t('Ghim link sản phẩm trực tiếp lên video TikTok để người xem mua ngay tại giỏ hàng vàng.')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {selectedProduct && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectProduct(null);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-zinc-200/80 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-2 py-1 text-[11px] font-medium text-foreground transition-colors"
                        >
                            <X size={12} weight="bold" />
                            <span>Gỡ giỏ hàng</span>
                        </button>
                    )}
                    <button
                        type="button"
                        className="flex size-7 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                    >
                        {isOpen ? <CaretUp size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
                    </button>
                </div>
            </div>

            {/* Collapsible Body */}
            {isOpen && (
                <div className="mt-4 pt-3 border-t border-amber-200/60 dark:border-amber-900/30 space-y-3">
                    {/* Active Selected Product Banner */}
                    {selectedProduct && (
                        <div className="rounded-xl border border-amber-400 bg-amber-400/15 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <img
                                    src={selectedProduct.image_url}
                                    alt={selectedProduct.name}
                                    className="size-12 rounded-lg object-cover border border-amber-300/80 shrink-0"
                                />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="truncate text-xs font-bold text-foreground">
                                            {selectedProduct.name}
                                        </span>
                                        {selectedProduct.is_flash_sale && (
                                            <span className="shrink-0 rounded bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2">
                                                Flash Sale
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs mt-0.5">
                                        <span className="font-bold text-red-600 dark:text-red-400">
                                            ₫{Number(selectedProduct.sale_price).toLocaleString('vi-VN')}
                                        </span>
                                        {selectedProduct.original_price > selectedProduct.sale_price && (
                                            <span className="line-through text-muted-foreground text-[11px]">
                                                ₫{Number(selectedProduct.original_price).toLocaleString('vi-VN')}
                                            </span>
                                        )}
                                        <span className="text-[11px] text-muted-foreground">· Kho: {selectedProduct.stock}</span>
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="button"
                                size="sm"
                                onClick={() => handleGenerateSalesScript(selectedProduct)}
                                className="h-8 text-xs bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold rounded-xl shrink-0 inline-flex items-center gap-1.5 shadow-2xs"
                            >
                                <Sparkle size={13} weight="fill" />
                                <span>Tạo kịch bản bán hàng</span>
                            </Button>
                        </div>
                    )}

                    {/* Search & Product Picker Grid */}
                    <div className="space-y-2">
                        <div className="relative">
                            <MagnifyingGlass size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm sản phẩm theo tên, mã SKU hoặc danh mục..."
                                className="w-full h-8 pl-8 pr-3 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                        </div>

                        {filteredProducts.length === 0 ? (
                            <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                                Không tìm thấy sản phẩm nào trong kho TikTok Shop
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                                {filteredProducts.map((p) => {
                                    const isChosen = selectedProduct?.id === p.id;
                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => onSelectProduct(isChosen ? null : p)}
                                            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2.5 ${
                                                isChosen
                                                    ? 'border-amber-400 bg-amber-400/10 ring-1 ring-amber-400'
                                                    : 'border-border bg-card hover:border-amber-400/60 hover:bg-muted/30'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <img
                                                    src={p.image_url}
                                                    alt={p.name}
                                                    className="size-10 rounded-lg object-cover border border-border shrink-0"
                                                />
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-semibold text-foreground">
                                                        {p.name}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 text-[11px]">
                                                        <span className="font-bold text-foreground">
                                                            ₫{Number(p.sale_price).toLocaleString('vi-VN')}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                            Kho: {p.stock}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="shrink-0">
                                                {isChosen ? (
                                                    <div className="size-5 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center">
                                                        <Check size={12} weight="bold" />
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] font-medium text-muted-foreground hover:text-foreground">
                                                        Gắn
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
