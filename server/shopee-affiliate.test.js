import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Import service in Node environment (with mock localStorage)
const mockStorage = new Map();
globalThis.window = {
    localStorage: {
        getItem: (k) => mockStorage.get(k) || null,
        setItem: (k, v) => mockStorage.set(k, String(v)),
        removeItem: (k) => mockStorage.delete(k),
        clear: () => mockStorage.clear(),
    },
    dispatchEvent: () => true,
};
globalThis.CustomEvent = class CustomEvent {
    constructor(type, options) {
        this.type = type;
        this.detail = options?.detail;
    }
};

const { shopeeAffiliateService } = await import('../src/lib/shopee-affiliate-service.js');

describe('Shopee Affiliate Catalog Service', () => {
    beforeEach(() => {
        mockStorage.clear();
    });

    it('1. Retrieves seeded products with valid commission and pricing fields', () => {
        const products = shopeeAffiliateService.getProducts();
        assert.ok(products.length >= 5, 'Has seeded demo products');
        
        const first = products[0];
        assert.ok(first.name);
        assert.ok(first.affiliate_url);
        assert.ok(first.sale_price > 0);
        assert.ok(first.commission_rate > 0);
        assert.equal(
            first.commission_amount,
            Math.round((first.sale_price * first.commission_rate) / 100),
            'Calculates commission amount correctly'
        );
    });

    it('2. Filters products by Brand ID and Category', () => {
        const coffeeProducts = shopeeAffiliateService.getProducts('b_coffee');
        assert.ok(coffeeProducts.length > 0);
        for (const p of coffeeProducts) {
            assert.equal(p.brand_id, 'b_coffee');
        }

        const skincareProducts = shopeeAffiliateService.getProducts(null, 'Sắc đẹp & Chăm sóc da');
        assert.ok(skincareProducts.length > 0);
        for (const p of skincareProducts) {
            assert.equal(p.category, 'Sắc đẹp & Chăm sóc da');
        }
    });

    it('3. Adds a new product and calculates commission and discount accurately', () => {
        const newProduct = shopeeAffiliateService.addProduct({
            name: 'Cà phê Hạt Robusta Honey Đắk Lắk 500g',
            sku: 'ROB-HL-500',
            original_price: 200000,
            sale_price: 150000,
            commission_rate: 16,
            brand_id: 'b_coffee',
            category: 'Thực phẩm & Đồ uống',
            original_url: 'https://shopee.vn/product/123/456',
        });

        assert.ok(newProduct.id.startsWith('shopee_prod_'));
        assert.equal(newProduct.discount_percent, 25);
        assert.equal(newProduct.commission_amount, 24000); // 150000 * 16% = 24000
        assert.ok(newProduct.affiliate_url.includes('s.shopee.vn'));

        const fetched = shopeeAffiliateService.getProductById(newProduct.id);
        assert.equal(fetched.name, newProduct.name);
    });

    it('4. Updates an existing product and recalculates fields', () => {
        const products = shopeeAffiliateService.getProducts();
        const target = products[0];

        const updated = shopeeAffiliateService.updateProduct(target.id, {
            sale_price: 100000,
            commission_rate: 20,
        });

        assert.equal(updated.sale_price, 100000);
        assert.equal(updated.commission_rate, 20);
        assert.equal(updated.commission_amount, 20000);
    });

    it('5. Generates Shopee Affiliate Deep Links with custom SubIDs', () => {
        const link = shopeeAffiliateService.generateAffiliateLink('https://shopee.vn/product/123/456', {
            sub1: 'facebook_page',
            sub2: 'deal_11_11',
            sub3: 'creator_01',
        });

        assert.ok(link.startsWith('https://s.shopee.vn/'));
    });

    it('6. Generates sales copy tailored to specific platforms', () => {
        const products = shopeeAffiliateService.getProducts();
        const product = products[0];

        const firstComment = shopeeAffiliateService.generateSalesCopy(product, 'first_comment');
        assert.ok(firstComment.includes('LINK MUA CHÍNH HÃNG SHOPEE'));
        assert.ok(firstComment.includes(product.affiliate_url));

        const fbPost = shopeeAffiliateService.generateSalesCopy(product, 'facebook');
        assert.ok(fbPost.includes('DEAL HỜI SHOPEE HÔM NAY'));
        assert.ok(fbPost.includes(product.affiliate_url));
    });

    it('7. Calculates stats summary correctly', () => {
        const stats = shopeeAffiliateService.getStats();
        assert.ok(stats.totalProducts > 0);
        assert.ok(stats.avgCommissionRate > 0);
        assert.ok(stats.estimatedCommission >= 0);
    });
});
