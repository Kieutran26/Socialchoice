/**
 * TikTok Shop Integration Service for Socialchoice
 * Manages TikTok Seller Center connection, Product Catalog Sync,
 * Flash Sale pricing, and Product Anchor tagging for TikTok videos.
 */

const STORAGE_KEY = 'socialchoice:tiktok_shop_data';

// Default initial seeded shops & product catalogs for brands
const DEFAULT_SHOP_DATA = {
    shops: [
        {
            id: 'VN_SHOP_84920491',
            brand_id: 'b_coffee',
            shop_name: 'An Nhiên Coffee - TikTok Shop Mall',
            shop_code: 'ANN_COFFEE_VN',
            region: 'VN',
            region_name: 'Việt Nam (TikTok Shop VN)',
            currency: '₫',
            status: 'active',
            seller_type: 'cross_border_or_local',
            rating: 4.9,
            connected_at: '2026-10-15T08:30:00Z',
            last_synced_at: '2026-11-16T11:45:00Z',
            stats: {
                gmv_30d: 148500000,
                orders_30d: 842,
                conversion_rate: 3.8,
                video_orders: 530,
            },
        },
        {
            id: 'VN_SHOP_92048102',
            brand_id: 'b_skincare',
            shop_name: 'Lumina Skincare - Official Store',
            shop_code: 'LUMINA_VN',
            region: 'VN',
            region_name: 'Việt Nam (TikTok Shop VN)',
            currency: '₫',
            status: 'active',
            seller_type: 'brand_mall',
            rating: 5.0,
            connected_at: '2026-10-18T14:20:00Z',
            last_synced_at: '2026-11-16T10:15:00Z',
            stats: {
                gmv_30d: 215400000,
                orders_30d: 1120,
                conversion_rate: 4.5,
                video_orders: 780,
            },
        },
    ],
    products: [
        // An Nhiên Coffee Products
        {
            id: 'prod_cf_01',
            shop_id: 'VN_SHOP_84920491',
            brand_id: 'b_coffee',
            sku: 'CF-ARA-250',
            name: 'Cà phê Hạt Rang Mộc Arabica Cầu Đất 250g',
            image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80',
            original_price: 145000,
            sale_price: 129000,
            stock: 450,
            sales_count: 2430,
            rating: 4.9,
            category: 'Thực phẩm & Đồ uống',
            is_flash_sale: true,
            anchor_url: 'https://shop.tiktok.com/view/product/1729481920381029',
            highlights: ['Arabica 100% Cầu Đất Đà Lạt', 'Rang mộc chuẩn độ vừa Medium', 'Hương hoa quả tươi & caramel ngọt hậu'],
        },
        {
            id: 'prod_cf_02',
            shop_id: 'VN_SHOP_84920491',
            brand_id: 'b_coffee',
            sku: 'CF-CB-10P',
            name: 'Hộp 10 Túi Lọc Cold Brew Ủ Lạnh 18H Tiện Lợi',
            image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80',
            original_price: 160000,
            sale_price: 139000,
            stock: 210,
            sales_count: 1840,
            rating: 5.0,
            category: 'Thực phẩm & Đồ uống',
            is_flash_sale: true,
            anchor_url: 'https://shop.tiktok.com/view/product/1729481920381030',
            highlights: ['Túi lọc tiện lợi ủ trong tủ lạnh', 'Vị đượm thanh mượt, êm bụng', 'Không chất bảo quản'],
        },
        {
            id: 'prod_cf_03',
            shop_id: 'VN_SHOP_84920491',
            brand_id: 'b_coffee',
            sku: 'TOOL-PHIN-ANO',
            name: 'Phin Cà Phê Nhôm Mạ Anod Cao Cấp An Nhiên',
            image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
            original_price: 85000,
            sale_price: 69000,
            stock: 580,
            sales_count: 3120,
            rating: 4.8,
            category: 'Dụng cụ pha chế',
            is_flash_sale: false,
            anchor_url: 'https://shop.tiktok.com/view/product/1729481920381031',
            highlights: ['Lỗ phin siêu mịn đều', 'Nhôm anod hóa chống oxy hóa', 'Chuẩn pha giọt cà phê Việt'],
        },
        {
            id: 'prod_cf_04',
            shop_id: 'VN_SHOP_84920491',
            brand_id: 'b_coffee',
            sku: 'CF-COMBO-3R',
            name: 'Combo Trải Nghiệm 3 Vùng Cà Phê Đặc Sản Việt Nam (3x100g)',
            image_url: 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=600&auto=format&fit=crop&q=80',
            original_price: 320000,
            sale_price: 279000,
            stock: 120,
            sales_count: 950,
            rating: 4.9,
            category: 'Hộp quà & Combo',
            is_flash_sale: false,
            anchor_url: 'https://shop.tiktok.com/view/product/1729481920381032',
            highlights: ['Cầu Đất, Buôn Ma Thuột & Sơn La', 'Đóng hộp giấy kraft cao cấp', 'Kèm sổ hướng dẫn nếm vị'],
        },

        // Lumina Skincare Products
        {
            id: 'prod_skin_01',
            shop_id: 'VN_SHOP_92048102',
            brand_id: 'b_skincare',
            sku: 'SERUM-B5-30',
            name: 'Serum Phục Hồi Dịu Da Chuyên Sâu Vitamin B5 30ml',
            image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80',
            original_price: 280000,
            sale_price: 249000,
            stock: 340,
            sales_count: 5210,
            rating: 5.0,
            category: 'Chăm sóc da mặt',
            is_flash_sale: true,
            anchor_url: 'https://shop.tiktok.com/view/product/1729481920381040',
            highlights: ['5% D-Panthenol kết hợp Rau má', 'Cấp ẩm sâu, hạ nhiệt kích ứng', 'Không cồn, không hương liệu'],
        },
        {
            id: 'prod_skin_02',
            shop_id: 'VN_SHOP_92048102',
            brand_id: 'b_skincare',
            sku: 'SUN-SPF50-50',
            name: 'Kem Chống Nắng Kiềm Dầu Thoáng Mịn SPF50+ PA++++ (50g)',
            image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80',
            original_price: 310000,
            sale_price: 269000,
            stock: 620,
            sales_count: 8140,
            rating: 4.9,
            category: 'Chống nắng',
            is_flash_sale: true,
            anchor_url: 'https://shop.tiktok.com/view/product/1729481920381041',
            highlights: ['Kiềm dầu 8 tiếng không bóng nhờn', 'Không vệt trắng, nâng tone tự nhiên', 'Màng lọc quang phổ rộng Tinosorb'],
        },
    ],
    recent_orders: [
        {
            id: 'ORD_TTS_98124',
            shop_id: 'VN_SHOP_84920491',
            product_name: 'Cà phê Hạt Rang Mộc Arabica Cầu Đất 250g',
            quantity: 2,
            total_amount: 258000,
            customer_name: 'Nguyễn Thu T***',
            province: 'Hà Nội',
            status: 'completed',
            video_source: 'Video: Bí quyết pha Cold brew tại nhà',
            created_at: '2026-11-16T11:15:00Z',
        },
        {
            id: 'ORD_TTS_98125',
            shop_id: 'VN_SHOP_84920491',
            product_name: 'Hộp 10 Túi Lọc Cold Brew Ủ Lạnh 18H',
            quantity: 1,
            total_amount: 139000,
            customer_name: 'Trần Minh Đ***',
            province: 'TP. Hồ Chí Minh',
            status: 'processing',
            video_source: 'Video: Cà phê sáng chill cuối tuần',
            created_at: '2026-11-16T10:40:00Z',
        },
        {
            id: 'ORD_TTS_98126',
            shop_id: 'VN_SHOP_92048102',
            product_name: 'Serum Phục Hồi Dịu Da Chuyên Sâu B5',
            quantity: 1,
            total_amount: 249000,
            customer_name: 'Lê Bảo N***',
            province: 'Đà Nẵng',
            status: 'shipping',
            video_source: 'Video: Skincare routine tối giản 3 bước',
            created_at: '2026-11-16T09:20:00Z',
        },
    ],
};

function readStore() {
    if (typeof window === 'undefined') return DEFAULT_SHOP_DATA;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SHOP_DATA));
            return DEFAULT_SHOP_DATA;
        }
        return JSON.parse(raw);
    } catch {
        return DEFAULT_SHOP_DATA;
    }
}

function writeStore(data) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        window.dispatchEvent(new CustomEvent('socialchoice:tiktok_shop_updated', { detail: data }));
    } catch {
        // silent fail
    }
}

export const tiktokShopService = {
    /**
     * Lấy danh sách tất cả TikTok Shop đã liên kết
     */
    getShops(brandId = null) {
        const store = readStore();
        if (!brandId) return store.shops || [];
        return (store.shops || []).filter((s) => s.brand_id === brandId);
    },

    /**
     * Lấy thông tin 1 shop cụ thể
     */
    getShopById(shopId) {
        const store = readStore();
        return (store.shops || []).find((s) => s.id === shopId) || null;
    },

    /**
     * Kết nối một TikTok Shop mới
     */
    connectShop({ brand_id, shop_name, shop_code, region = 'VN' }) {
        const store = readStore();
        const newShopId = `VN_SHOP_${Math.floor(10000000 + Math.random() * 90000000)}`;
        const regionNames = {
            VN: 'Việt Nam (TikTok Shop VN)',
            US: 'Hoa Kỳ (TikTok Shop US)',
            UK: 'Vương quốc Anh (TikTok Shop UK)',
            TH: 'Thái Lan (TikTok Shop TH)',
            ID: 'Indonesia (TikTok Shop ID)',
            MY: 'Malaysia (TikTok Shop MY)',
            PH: 'Philippines (TikTok Shop PH)',
            SG: 'Singapore (TikTok Shop SG)',
        };

        const newShop = {
            id: newShopId,
            brand_id,
            shop_name: shop_name || 'TikTok Shop Mới',
            shop_code: shop_code || `SHOP_${newShopId.slice(-6)}`,
            region,
            region_name: regionNames[region] || region,
            currency: region === 'US' ? '$' : region === 'UK' ? '£' : '₫',
            status: 'active',
            seller_type: 'cross_border_or_local',
            rating: 5.0,
            connected_at: new Date().toISOString(),
            last_synced_at: new Date().toISOString(),
            stats: {
                gmv_30d: 0,
                orders_30d: 0,
                conversion_rate: 0,
                video_orders: 0,
            },
        };

        store.shops.unshift(newShop);
        writeStore(store);
        return newShop;
    },

    /**
     * Ngắt kết nối một TikTok Shop
     */
    disconnectShop(shopId) {
        const store = readStore();
        store.shops = (store.shops || []).filter((s) => s.id !== shopId);
        writeStore(store);
    },

    /**
     * Lấy danh sách sản phẩm theo Shop hoặc Brand
     */
    getProducts(shopId = null, brandId = null) {
        const store = readStore();
        let list = store.products || [];
        if (shopId) {
            list = list.filter((p) => p.shop_id === shopId);
        } else if (brandId) {
            list = list.filter((p) => p.brand_id === brandId);
        }
        return list;
    },

    /**
     * Lấy 1 sản phẩm theo ID
     */
    getProductById(productId) {
        const store = readStore();
        return (store.products || []).find((p) => p.id === productId) || null;
    },

    /**
     * Thêm sản phẩm mới vào danh mục TikTok Shop
     */
    addProduct(shopId, productData) {
        const store = readStore();
        const shop = store.shops.find((s) => s.id === shopId);
        const newProduct = {
            id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            shop_id: shopId,
            brand_id: shop?.brand_id || 'b_coffee',
            sku: productData.sku || `SKU-${Date.now().toString().slice(-6)}`,
            name: productData.name,
            image_url: productData.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
            original_price: Number(productData.original_price) || 100000,
            sale_price: Number(productData.sale_price) || Number(productData.original_price) || 100000,
            stock: Number(productData.stock) || 100,
            sales_count: 0,
            rating: 5.0,
            category: productData.category || 'Mặc định',
            is_flash_sale: Boolean(productData.is_flash_sale),
            anchor_url: `https://shop.tiktok.com/view/product/${Date.now()}`,
            highlights: productData.highlights || [],
        };

        store.products.unshift(newProduct);
        writeStore(store);
        return newProduct;
    },

    /**
     * Cập nhật số lượng tồn kho
     */
    updateProductStock(productId, newStock) {
        const store = readStore();
        const idx = store.products.findIndex((p) => p.id === productId);
        if (idx !== -1) {
            store.products[idx].stock = Math.max(0, Number(newStock));
            writeStore(store);
            return store.products[idx];
        }
        return null;
    },

    /**
     * Bật / Tắt Flash sale giá sốc
     */
    toggleFlashSale(productId) {
        const store = readStore();
        const idx = store.products.findIndex((p) => p.id === productId);
        if (idx !== -1) {
            store.products[idx].is_flash_sale = !store.products[idx].is_flash_sale;
            writeStore(store);
            return store.products[idx];
        }
        return null;
    },

    /**
     * Đồng bộ tức thời danh mục từ TikTok Seller Center (Mô phỏng đồng bộ thời gian thực)
     */
    async syncCatalog(shopId) {
        // Giả lập độ trễ mạng API Seller Center
        await new Promise((resolve) => setTimeout(resolve, 800));
        const store = readStore();
        const shop = store.shops.find((s) => s.id === shopId);
        if (shop) {
            shop.last_synced_at = new Date().toISOString();
            // cập nhật ngẫu nhiên số lượng bán tăng nhẹ để tạo cảm giác sống động
            store.products
                .filter((p) => p.shop_id === shopId)
                .forEach((p) => {
                    p.sales_count += Math.floor(Math.random() * 5);
                });
            writeStore(store);
        }
        return { success: true, timestamp: new Date().toISOString() };
    },

    /**
     * Lấy danh sách đơn hàng gần đây phát sinh từ video
     */
    getRecentOrders(shopId = null) {
        const store = readStore();
        if (!shopId) return store.recent_orders || [];
        return (store.recent_orders || []).filter((o) => o.shop_id === shopId);
    },
};
