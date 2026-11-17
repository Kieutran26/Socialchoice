/**
 * Shopee Affiliate Integration & Product Catalog Service for Socialchoice
 * Manages Shopee Affiliate tracking, Product Catalog with Commission Rates,
 * Deep Link generation with SubIDs, and Sales Copy generation for multi-channel posts.
 */

const STORAGE_KEY = 'socialchoice:shopee_affiliate_data';

const DEFAULT_SHOPEE_DATA = {
    settings: {
        app_id: '20019284',
        partner_name: 'SocialChoice Affiliate Hub',
        default_sub_id: 'socialchoice',
        tracking_domain: 's.shopee.vn',
        custom_subids: {
            facebook: 'fb_post',
            tiktok: 'tt_bio',
            threads: 'th_link',
            zalo: 'zalo_oa',
            linkedin: 'li_share',
            first_comment: 'cmt_pin',
        },
    },
    products: [
        {
            id: 'shopee_prod_01',
            brand_id: 'b_coffee',
            name: 'Cà phê Rang Mộc Arabica Cầu Đất Thượng Hạng 250g',
            sku: 'SHP-ARA-250',
            category: 'Thực phẩm & Đồ uống',
            shop_name: 'An Nhiên Coffee Mall',
            shop_type: 'shopee_mall', // 'shopee_mall' | 'yeu_thich_plus' | 'yeu_thich'
            image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80',
            original_price: 155000,
            sale_price: 129000,
            discount_percent: 17,
            commission_rate: 14, // 14%
            commission_amount: 18060, // 18.060₫ mỗi đơn
            rating: 4.9,
            sold_count: 5420,
            original_url: 'https://shopee.vn/product/84920491/17294819203',
            affiliate_url: 'https://s.shopee.vn/60AB8cDef1',
            voucher_text: 'Voucher giảm 25K + Freeship Xtra',
            is_hot_deal: true,
            highlights: ['100% Arabica Cầu Đất Đà Lạt', 'Rang mộc mẻ nhỏ không tẩm hương liệu', 'Vị chua thanh hoa quả hậu ngọt dài'],
            created_at: '2026-10-20T08:00:00Z',
            clicks_count: 842,
            conversions_count: 67,
        },
        {
            id: 'shopee_prod_02',
            brand_id: 'b_coffee',
            name: 'Hộp 10 Túi Cà Phê Ủ Lạnh Cold Brew Vị Mộc Mạc Tiện Lợi',
            sku: 'SHP-CB-10P',
            category: 'Thực phẩm & Đồ uống',
            shop_name: 'An Nhiên Coffee Mall',
            shop_type: 'shopee_mall',
            image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80',
            original_price: 165000,
            sale_price: 139000,
            discount_percent: 16,
            commission_rate: 15, // 15%
            commission_amount: 20850,
            rating: 5.0,
            sold_count: 3290,
            original_url: 'https://shopee.vn/product/84920491/17294819204',
            affiliate_url: 'https://s.shopee.vn/71BC9dEfg2',
            voucher_text: 'Mua 2 tặng 1 ly thủy tinh',
            is_hot_deal: true,
            highlights: ['Túi lọc tiện dụng ngâm 18 tiếng trong tủ lạnh', 'Vị thanh ngọt tự nhiên, êm dịu cho dạ dày', 'Tiết kiệm 80% so với uống quán'],
            created_at: '2026-10-22T09:30:00Z',
            clicks_count: 610,
            conversions_count: 54,
        },
        {
            id: 'shopee_prod_03',
            brand_id: 'b_coffee',
            name: 'Bình Pha Cà Phê French Press Thủy Tinh Chịu Nhiệt 600ml',
            sku: 'SHP-FP-600',
            category: 'Đồ gia dụng & Bếp',
            shop_name: 'Gia Dụng Bếp Việt',
            shop_type: 'yeu_thich_plus',
            image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
            original_price: 185000,
            sale_price: 125000,
            discount_percent: 32,
            commission_rate: 18, // 18%
            commission_amount: 22500,
            rating: 4.8,
            sold_count: 8120,
            original_url: 'https://shopee.vn/product/12948210/982140281',
            affiliate_url: 'https://s.shopee.vn/82CD0eFgh3',
            voucher_text: 'Flash Sale giảm 32% chỉ hôm nay',
            is_hot_deal: false,
            highlights: ['Thủy tinh Borosilicate chịu nhiệt cao', 'Lưới lọc inox 304 3 lớp cực mịn', 'Pha trà, cà phê trong 3 phút'],
            created_at: '2026-10-25T14:15:00Z',
            clicks_count: 435,
            conversions_count: 38,
        },
        {
            id: 'shopee_prod_04',
            brand_id: 'b_skincare',
            name: 'Serum Dưỡng Ẩm Phục Hồi Dịu Da Chuyên Sâu B5 + HA 30ml',
            sku: 'SHP-SERUM-B5',
            category: 'Sắc đẹp & Chăm sóc da',
            shop_name: 'Lumina Skincare Official',
            shop_type: 'shopee_mall',
            image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80',
            original_price: 320000,
            sale_price: 249000,
            discount_percent: 22,
            commission_rate: 20, // 20%
            commission_amount: 49800,
            rating: 4.9,
            sold_count: 14200,
            original_url: 'https://shopee.vn/product/92048102/384910284',
            affiliate_url: 'https://s.shopee.vn/93DE1fGhi4',
            voucher_text: 'Voucher shop 30K + Tặng 1 mặt nạ dừa',
            is_hot_deal: true,
            highlights: ['Vitamin B5 5% phục hồi màng bảo vệ da cấp tốc', 'Hyaluronic Acid đa tầng cấp nước sâu', 'Không cồn, không hương liệu nhân tạo'],
            created_at: '2026-10-26T10:00:00Z',
            clicks_count: 1420,
            conversions_count: 185,
        },
        {
            id: 'shopee_prod_05',
            brand_id: 'b_skincare',
            name: 'Kem Chống Nắng Phổ Rộng Kiềm Dầu Mỏng Nhẹ Lumina SPF 50+',
            sku: 'SHP-SUN-50',
            category: 'Sắc đẹp & Chăm sóc da',
            shop_name: 'Lumina Skincare Official',
            shop_type: 'shopee_mall',
            image_url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=80',
            original_price: 290000,
            sale_price: 225000,
            discount_percent: 22,
            commission_rate: 18, // 18%
            commission_amount: 40500,
            rating: 4.9,
            sold_count: 9840,
            original_url: 'https://shopee.vn/product/92048102/384910285',
            affiliate_url: 'https://s.shopee.vn/04EF2gHij5',
            voucher_text: 'Freeship Xtra + Giảm 15%',
            is_hot_deal: true,
            highlights: ['Màng lọc chống nắng tiên tiến bảo vệ toàn diện', 'Lớp finish mỏng mịn nâng tone tự nhiên', 'Kiềm dầu khô thoáng suốt 8 giờ'],
            created_at: '2026-10-28T11:20:00Z',
            clicks_count: 980,
            conversions_count: 112,
        },
        {
            id: 'shopee_prod_06',
            brand_id: 'b_fashion',
            name: 'Áo Thun Nam Nữ Cotton 100% 250GSM Form Rộng Minimalist',
            sku: 'SHP-TEE-250',
            category: 'Thời trang & Phụ kiện',
            shop_name: 'Basic Wear Vietnam',
            shop_type: 'yeu_thich_plus',
            image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
            original_price: 180000,
            sale_price: 139000,
            discount_percent: 23,
            commission_rate: 16, // 16%
            commission_amount: 22240,
            rating: 4.8,
            sold_count: 18900,
            original_url: 'https://shopee.vn/product/48201948/81920481',
            affiliate_url: 'https://s.shopee.vn/15FG3hIjk6',
            voucher_text: 'Combo 2 áo giảm thêm 15.000₫',
            is_hot_deal: false,
            highlights: ['Vải cotton compact 2 chiều dày dặn không xù', 'Bo cổ dệt dày dặn giặt máy không bai dão', 'Form unisex rộng rãi thoải mái'],
            created_at: '2026-10-30T16:00:00Z',
            clicks_count: 750,
            conversions_count: 88,
        },
    ],
    categories: [
        'Tất cả',
        'Thực phẩm & Đồ uống',
        'Sắc đẹp & Chăm sóc da',
        'Đồ gia dụng & Bếp',
        'Thời trang & Phụ kiện',
        'Công nghệ & Phụ kiện',
        'Mẹ & Bé',
        'Sức khỏe & Đời sống',
    ],
};

function readStore() {
    if (typeof window === 'undefined') return DEFAULT_SHOPEE_DATA;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SHOPEE_DATA));
            return DEFAULT_SHOPEE_DATA;
        }
        return JSON.parse(raw);
    } catch {
        return DEFAULT_SHOPEE_DATA;
    }
}

function writeStore(data) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        window.dispatchEvent(new CustomEvent('socialchoice:shopee_affiliate_updated', { detail: data }));
    } catch {
        // silent fail
    }
}

export const shopeeAffiliateService = {
    /**
     * Lấy cài đặt tài khoản Shopee Affiliate
     */
    getSettings() {
        const store = readStore();
        return store.settings || DEFAULT_SHOPEE_DATA.settings;
    },

    /**
     * Cập nhật cấu hình Shopee Affiliate
     */
    updateSettings(newSettings) {
        const store = readStore();
        store.settings = { ...store.settings, ...newSettings };
        writeStore(store);
        return store.settings;
    },

    /**
     * Lấy danh sách sản phẩm trong kho Shopee Affiliate
     */
    getProducts(brandId = null, category = null) {
        const store = readStore();
        let items = store.products || [];

        if (brandId && brandId !== 'all') {
            items = items.filter((p) => !p.brand_id || p.brand_id === brandId);
        }

        if (category && category !== 'Tất cả') {
            items = items.filter((p) => p.category === category);
        }

        return items;
    },

    /**
     * Lấy thông tin chi tiết một sản phẩm theo ID
     */
    getProductById(id) {
        const store = readStore();
        return (store.products || []).find((p) => p.id === id) || null;
    },

    /**
     * Thêm sản phẩm mới vào kho Shopee Affiliate
     */
    addProduct(productData) {
        const store = readStore();
        const salePrice = Number(productData.sale_price || productData.original_price || 0);
        const originalPrice = Number(productData.original_price || salePrice);
        const discountPercent = originalPrice > salePrice ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0;
        const commissionRate = Number(productData.commission_rate || 10);
        const commissionAmount = Math.round((salePrice * commissionRate) / 100);

        const newId = `shopee_prod_${Date.now()}`;
        const cleanAffiliateUrl = productData.affiliate_url?.trim() ||
            this.generateAffiliateLink(productData.original_url || '', { sub1: 'custom_add' });

        const newProduct = {
            id: newId,
            brand_id: productData.brand_id || 'all',
            name: productData.name?.trim() || 'Sản phẩm Shopee mới',
            sku: productData.sku?.trim() || `SHP-${Date.now().toString().slice(-4)}`,
            category: productData.category || 'Thực phẩm & Đồ uống',
            shop_name: productData.shop_name?.trim() || 'Shopee Store',
            shop_type: productData.shop_type || 'shopee_mall',
            image_url: productData.image_url?.trim() || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
            original_price: originalPrice,
            sale_price: salePrice,
            discount_percent: discountPercent,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
            rating: Number(productData.rating || 5.0),
            sold_count: Number(productData.sold_count || 0),
            original_url: productData.original_url?.trim() || '',
            affiliate_url: cleanAffiliateUrl,
            voucher_text: productData.voucher_text?.trim() || 'Freeship Xtra',
            is_hot_deal: Boolean(productData.is_hot_deal),
            highlights: Array.isArray(productData.highlights) ? productData.highlights : (productData.highlights_text || '').split('\n').filter(Boolean),
            created_at: new Date().toISOString(),
            clicks_count: 0,
            conversions_count: 0,
        };

        store.products = [newProduct, ...(store.products || [])];
        writeStore(store);
        return newProduct;
    },

    /**
     * Cập nhật thông tin sản phẩm
     */
    updateProduct(id, updates) {
        const store = readStore();
        const index = (store.products || []).findIndex((p) => p.id === id);
        if (index === -1) return null;

        const current = store.products[index];
        const salePrice = Number(updates.sale_price !== undefined ? updates.sale_price : current.sale_price);
        const originalPrice = Number(updates.original_price !== undefined ? updates.original_price : current.original_price);
        const commissionRate = Number(updates.commission_rate !== undefined ? updates.commission_rate : current.commission_rate);

        const updated = {
            ...current,
            ...updates,
            sale_price: salePrice,
            original_price: originalPrice,
            discount_percent: originalPrice > salePrice ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0,
            commission_rate: commissionRate,
            commission_amount: Math.round((salePrice * commissionRate) / 100),
            updated_at: new Date().toISOString(),
        };

        store.products[index] = updated;
        writeStore(store);
        return updated;
    },

    /**
     * Xóa sản phẩm khỏi kho
     */
    deleteProduct(id) {
        const store = readStore();
        store.products = (store.products || []).filter((p) => p.id !== id);
        writeStore(store);
        return true;
    },

    /**
     * Tạo Deep Link Shopee Affiliate chuẩn kèm SubID tracking
     */
    generateAffiliateLink(originalUrl = '', { sub1 = 'socialchoice', sub2 = 'post', sub3 = '', sub4 = '' } = {}) {
        if (!originalUrl || !originalUrl.trim()) {
            return 'https://s.shopee.vn/affiliate_demo';
        }

        try {
            const urlObj = new URL(originalUrl.trim());
            // Shopee Affiliate parameters
            if (sub1) urlObj.searchParams.set('sub_id1', sub1);
            if (sub2) urlObj.searchParams.set('sub_id2', sub2);
            if (sub3) urlObj.searchParams.set('sub_id3', sub3);
            if (sub4) urlObj.searchParams.set('sub_id4', sub4);

            // Giả lập rút gọn thành link s.shopee.vn
            const hash = Math.random().toString(36).substring(2, 9);
            return `https://s.shopee.vn/${hash}`;
        } catch {
            return `https://s.shopee.vn/${Math.random().toString(36).substring(2, 9)}`;
        }
    },

    /**
     * Tạo kịch bản bán hàng (Sales Copy / Call-To-Action) cho các nền tảng
     */
    generateSalesCopy(product, platform = 'general') {
        if (!product) return '';
        const priceFormatted = Number(product.sale_price || product.original_price).toLocaleString('vi-VN');
        const originalPriceFormatted = Number(product.original_price).toLocaleString('vi-VN');
        const usp = product.highlights && product.highlights.length > 0
            ? product.highlights.slice(0, 3).map((h) => `✔ ${h}`).join('\n')
            : '✔ Chất lượng chuẩn hãng, bảo hành đổi trả uy tín\n✔ Giao hàng nhanh hỏa tốc';

        if (platform === 'first_comment') {
            return [
                `🛒 LINK MUA CHÍNH HÃNG SHOPEE ƯU ĐÃI HÔM NAY:`,
                `👉 ${product.affiliate_url}`,
                `🔥 Giá ưu đãi: ${priceFormatted}₫ (Giá gốc: ${originalPriceFormatted}₫)`,
                product.voucher_text ? `🎁 Nhớ áp thêm mã: ${product.voucher_text}` : '',
                `⚡ Số lượng voucher có hạn, bấm link để săn deal ngay kẻo hết nhé cả nhà!`,
            ].filter(Boolean).join('\n');
        }

        if (platform === 'threads' || platform === 'x') {
            return [
                `Mê cái này thực sự mn ơi! ${product.name} đang sale chỉ ${priceFormatted}₫ trên Shopee nè 🔥`,
                '',
                usp,
                '',
                `👉 Link săn sale chính hãng: ${product.affiliate_url}`,
                `#ShopeeAffiliate #GiaTot #DealShopee #${product.sku || 'Socialchoice'}`
            ].join('\n');
        }

        if (platform === 'facebook' || platform === 'zalo') {
            return [
                `💥 DEAL HỜI SHOPEE HÔM NAY — ${product.name.toUpperCase()} 💥`,
                '',
                `Ưu đãi độc quyền giảm còn ${priceFormatted}₫ (Giá gốc ${originalPriceFormatted}₫)!`,
                product.voucher_text ? `🎁 Đặc quyền: ${product.voucher_text}` : '',
                '',
                `ĐIỂM NỔI BẬT:`,
                usp,
                '',
                `🛒 Đặt mua chính hãng qua Shopee tại link bên dưới:`,
                `👉 ${product.affiliate_url}`,
                '',
                `#ShopeeChoice #ReviewHangTot #MuaSamThongMinh`
            ].filter(Boolean).join('\n');
        }

        // General / Video CTA
        return [
            `🛍️ [SHOPEE AFFILIATE DEAL HOT]`,
            `📌 Sản phẩm: ${product.name}`,
            `💰 Giá sale chỉ: ${priceFormatted}₫ (Giảm ${product.discount_percent || 0}%)`,
            `🎁 Voucher: ${product.voucher_text || 'Freeship Xtra'}`,
            '',
            `ƯU ĐIỂM VƯỢT TRỘI:`,
            usp,
            '',
            `👉 Bấm link Shopee chính hãng nhận ngay ưu đãi: ${product.affiliate_url}`
        ].join('\n');
    },

    /**
     * Ghi nhận lượt click giả lập khi người dùng bấm copy link hoặc test
     */
    recordClick(id) {
        const store = readStore();
        const item = (store.products || []).find((p) => p.id === id);
        if (item) {
            item.clicks_count = (item.clicks_count || 0) + 1;
            writeStore(store);
        }
    },

    /**
     * Thống kê tổng quan Affiliate
     */
    getStats(brandId = null) {
        const products = this.getProducts(brandId);
        const totalProducts = products.length;
        const totalClicks = products.reduce((acc, p) => acc + (p.clicks_count || 0), 0);
        const totalConversions = products.reduce((acc, p) => acc + (p.conversions_count || 0), 0);
        const estimatedCommission = products.reduce(
            (acc, p) => acc + (p.commission_amount || 0) * (p.conversions_count || 0),
            0
        );
        const avgCommissionRate = totalProducts > 0
            ? Math.round(products.reduce((acc, p) => acc + (p.commission_rate || 0), 0) / totalProducts)
            : 0;

        return {
            totalProducts,
            totalClicks,
            totalConversions,
            estimatedCommission,
            avgCommissionRate,
            hotDealsCount: products.filter((p) => p.is_hot_deal).length,
        };
    },

    /**
     * Lấy danh mục ngành hàng
     */
    getCategories() {
        const store = readStore();
        return store.categories || DEFAULT_SHOPEE_DATA.categories;
    },
};
