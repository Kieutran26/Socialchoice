import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { shopeeAffiliateService } from '@/lib/shopee-affiliate-service';
import {
    ShoppingBagOpen,
    Check,
    X,
    Sparkle,
    MagnifyingGlass,
    ArrowRight,
    Tag,
    Coins,
    Percent,
    Copy,
    ChatCircleDots,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function ShopeeProductPicker({
    brandId = '',
    selectedProduct = null,
    onSelectProduct = () => {},
    onInsertLink = () => {},
    onInsertFirstComment = () => {},
}) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(Boolean(selectedProduct));
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const load = () => {
            const list = shopeeAffiliateService.getProducts(brandId);
            setProducts(list);
        };
        load();

        window.addEventListener('socialchoice:shopee_affiliate_updated', load);
        return () => window.removeEventListener('socialchoice:shopee_affiliate_updated', load);
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

    const handleInsertToCaption = (product) => {
        if (!product) return;
        const script = shopeeAffiliateService.generateSalesCopy(product, 'facebook');
        onInsertLink(script);
    };

    const handleInsertToFirstComment = (product) => {
        if (!product) return;
        const comment = shopeeAffiliateService.generateSalesCopy(product, 'first_comment');
        onInsertFirstComment(comment);
    };

    return (
        <section className="rounded-2xl border border-orange-300/80 bg-orange-50/20 dark:border-orange-900/40 dark:bg-orange-950/10 p-4 transition-all">
            {/* Header Accordion */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between cursor-pointer select-none"
            >
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-2xs font-bold shrink-0">
                        <ShoppingBagOpen size={18} weight="fill" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-heading font-bold text-foreground">
                                {t('Shopee Affiliate — Tiếp thị liên kết')}
                            </h3>
                            <span className="rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-900 dark:text-orange-300 text-[10px] font-bold px-2 py-0.2">
                                SHOPEE
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {selectedProduct
                                ? `Đã chọn: ${selectedProduct.name} (${selectedProduct.commission_rate}% hoa hồng)`
                                : t('Chèn link sản phẩm Shopee có gắn mã SubID để nhận hoa hồng khi người xem đặt hàng.')}
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
                            className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
                            title={t('Bỏ chọn sản phẩm')}
                        >
                            <X size={14} />
                        </button>
                    )}
                    <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                        {isOpen ? t('Thu gọn') : t('Chọn sản phẩm')}
                    </span>
                </div>
            </div>

            {/* Expanded Product Selector */}
            {isOpen && (
                <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-900/40 space-y-3">
                    {/* Search & Active Product Preview */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('Tìm sản phẩm Shopee trong kho…')}
                                className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-xs focus-visible:outline-2 focus-visible:outline-ring"
                            />
                        </div>
                    </div>

                    {/* Products List Scroll */}
                    <div className="max-h-56 overflow-y-auto overscroll-contain space-y-2 pr-1">
                        {filteredProducts.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">
                                {t('Chưa có sản phẩm nào. Hãy vào trang "Shopee Affiliate" để thêm sản phẩm.')}
                            </p>
                        ) : (
                            filteredProducts.map((p) => {
                                const isSelected = selectedProduct?.id === p.id;
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => onSelectProduct(p)}
                                        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                            isSelected
                                                ? 'bg-orange-500/10 border-orange-500 shadow-2xs'
                                                : 'bg-background border-border hover:border-orange-400/60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <img
                                                src={p.image_url}
                                                alt={p.name}
                                                className="size-10 rounded-lg object-cover border border-border shrink-0"
                                                onError={(e) => {
                                                    e.target.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80';
                                                }}
                                            />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-xs text-foreground truncate max-w-[220px]">
                                                        {p.name}
                                                    </span>
                                                    {p.shop_type === 'shopee_mall' && (
                                                        <span className="rounded bg-red-600 text-white text-[8px] font-black px-1 uppercase shrink-0">
                                                            Mall
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] mt-0.5">
                                                    <span className="font-bold text-orange-600 dark:text-orange-400 font-mono">
                                                        ₫{Number(p.sale_price).toLocaleString('vi-VN')}
                                                    </span>
                                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold font-mono">
                                                        +{p.commission_rate}% (~₫{Number(p.commission_amount).toLocaleString('vi-VN')})
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {isSelected ? (
                                                <div className="size-6 rounded-full bg-orange-500 text-white flex items-center justify-center">
                                                    <Check size={12} weight="bold" />
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    type="button"
                                                    className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                                                >
                                                    {t('Chọn')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Quick Insert Actions */}
                    {selectedProduct && (
                        <div className="pt-2 border-t border-orange-200 dark:border-orange-900/40 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-foreground">
                                {t('Thao tác nhanh cho sản phẩm đã chọn:')}
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleInsertToFirstComment(selectedProduct)}
                                    className="h-7 text-xs gap-1 border-orange-300 dark:border-orange-900/60 hover:bg-orange-50"
                                >
                                    <ChatCircleDots size={13} className="text-orange-600" />
                                    <span>{t('Chèn vào Bình luận đầu')}</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleInsertToCaption(selectedProduct)}
                                    className="h-7 text-xs gap-1 bg-orange-500 text-white hover:bg-orange-600 font-bold"
                                >
                                    <Sparkle size={13} weight="fill" />
                                    <span>{t('Chèn kịch bản vào bài viết')}</span>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
