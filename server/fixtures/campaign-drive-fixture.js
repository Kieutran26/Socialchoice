import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { createStore } from '../store.js';
import { createAutopilot } from '../autopilot.js';
import { createMetaVault } from '../meta-vault.js';
import { DRIVE_SCOPE } from '../autopilot-providers.js';

export const FIXTURE_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX6kAAAAASUVORK5CYII=',
    'base64'
);

export const FIXTURE_PNG_MD5 = createHash('md5').update(FIXTURE_PNG).digest('hex');

export const DEFAULT_DRIVE_FILES = [
    {
        id: 'drive-file-01',
        name: 'bamboo-toothbrush-lifestyle.png',
        mimeType: 'image/png',
        size: FIXTURE_PNG.length,
        version: FIXTURE_PNG_MD5,
        analysis: {
            summary: 'Bộ bàn chải tre tự nhiên đặt cạnh cốc thủy tinh tối giản, ánh sáng buổi sáng tự nhiên.',
            tags: ['eco-friendly', 'zero-waste', 'lifestyle', 'morning-routine'],
            ocr: '100% ORGANIC BAMBOO',
            suggested_uses: ['Bài giới thiệu sản phẩm', 'Mẹo sống xanh buổi sáng'],
            warnings: []
        }
    },
    {
        id: 'drive-file-02',
        name: 'reusable-tote-bag.png',
        mimeType: 'image/png',
        size: FIXTURE_PNG.length,
        version: FIXTURE_PNG_MD5,
        analysis: {
            summary: 'Túi vải tote dệt thô mộc phong cách tối giản trên nền gỗ thông sáng màu.',
            tags: ['tote-bag', 'organic-cotton', 'sustainable-fashion', 'shopping'],
            ocr: 'ECO LIVING EVERY DAY',
            suggested_uses: ['Khuyến mãi cuối tuần', 'Chia sẻ thói quen giảm rác'],
            warnings: []
        }
    },
    {
        id: 'drive-file-03',
        name: 'refill-station-event.png',
        mimeType: 'image/png',
        size: FIXTURE_PNG.length,
        version: FIXTURE_PNG_MD5,
        analysis: {
            summary: 'Quầy trạm làm đầy nước giặt hữu cơ tại sự kiện cộng đồng cuối tuần.',
            tags: ['refill-station', 'community', 'zero-plastic', 'workshop'],
            ocr: 'REFILL & REUSE',
            suggested_uses: ['Tin tức cộng đồng', 'Sự kiện trải nghiệm khách hàng'],
            warnings: []
        }
    }
];

export const EXTENDED_ECO_CATALOG = [
    { name: 'bamboo-toothbrush-lifestyle.png', summary: 'Bộ bàn chải tre tự nhiên cạnh cốc thủy tinh tối giản, ánh sáng buổi sáng tự nhiên.', tags: ['bamboo-toothbrush', 'eco-friendly', 'zero-waste', 'morning-routine'], ocr: '100% ORGANIC BAMBOO' },
    { name: 'reusable-tote-bag.png', summary: 'Túi vải tote dệt thô mộc phong cách tối giản trên nền gỗ thông sáng màu.', tags: ['tote-bag', 'organic-cotton', 'sustainable-fashion', 'shopping'], ocr: 'ECO LIVING EVERY DAY' },
    { name: 'refill-station-event.png', summary: 'Quầy trạm làm đầy nước giặt hữu cơ tại sự kiện cộng đồng cuối tuần.', tags: ['refill-station', 'community', 'zero-plastic', 'workshop'], ocr: 'REFILL & REUSE' },
    { name: 'stainless-steel-bottle.png', summary: 'Bình giữ nhiệt thép không gỉ màu pastel đặt trên bàn làm việc hiện đại.', tags: ['water-bottle', 'stainless-steel', 'hydration', 'plastic-free'], ocr: 'STAINLESS PURE 750ML' },
    { name: 'beeswax-food-wrap.png', summary: 'Màng bọc thực phẩm sáp ong họa tiết tổ ong bảo quản bánh mì và trái cây.', tags: ['beeswax-wrap', 'food-storage', 'kitchen', 'sustainable'], ocr: 'BEESWAX NATURAL WRAP' },
    { name: 'organic-laundry-soap.png', summary: 'Bánh xà phòng giặt hữu cơ thành phần dầu dừa và bồ hòn thơm nhẹ.', tags: ['organic-soap', 'zero-chemical', 'natural-care'], ocr: '100% PLANT BASED SOAP' },
    { name: 'bamboo-cutlery-set.png', summary: 'Bộ thìa dĩa đũa tre mang theo du lịch đựng trong túi vải lanh nhỏ gọn.', tags: ['cutlery-set', 'travel', 'dining', 'bamboo-tools'], ocr: 'TRAVEL BAMBOO PACK' },
    { name: 'zero-waste-sponge.png', summary: 'Miếng xơ mướp rửa bát tự nhiên không vi nhựa cạnh bồn rửa sạch sẽ.', tags: ['loofah-sponge', 'kitchen', 'biodegradable'], ocr: 'NATURAL LOOFAH' },
    { name: 'glass-food-container.png', summary: 'Hộp thủy tinh nắp gỗ tre kín hơi đựng ngũ cốc và hạt dinh dưỡng.', tags: ['glass-container', 'pantry-organization', 'kitchen'], ocr: 'BOROSILICATE GLASS & BAMBOO' },
    { name: 'compostable-cups.png', summary: 'Ly giấy phân hủy sinh học tráng men PLA tại quầy cà phê thân thiện.', tags: ['compostable', 'coffee-cups', 'cafe', 'takeaway'], ocr: '100% COMPOSTABLE' },
    { name: 'natural-bar-shampoo.png', summary: 'Bánh gội đầu thảo mộc tinh dầu bưởi bồ kết không chai nhựa.', tags: ['shampoo-bar', 'hair-care', 'zero-plastic-bathroom'], ocr: 'SOLID SHAMPOO BAR' },
    { name: 'mesh-produce-bags.png', summary: 'Túi lưới cotton đi chợ đựng rau củ quả tươi ngon không dùng túi nilon.', tags: ['mesh-bag', 'grocery-shopping', 'organic-cotton'], ocr: 'ORGANIC COTTON MESH' },
    { name: 'coconut-bowl-spoon.png', summary: 'Bát gáo dừa mộc mạc đựng sinh tố trái cây nhiệt đới thơm ngon.', tags: ['coconut-bowl', 'handmade', 'healthy-eating'], ocr: 'NATURAL COCONUT ART' },
    { name: 'cotton-dish-cloths.png', summary: 'Khăn lau bếp sợi bông hữu cơ mềm mại thấm hút tốt.', tags: ['dish-cloth', 'kitchen-textile', 'washable'], ocr: 'ECO TEXTILES' },
    { name: 'charcoal-air-purifier.png', summary: 'Túi than tre hoạt tính hút ẩm và khử mùi tự nhiên trong phòng khách.', tags: ['bamboo-charcoal', 'air-purifier', 'home-wellness'], ocr: 'ACTIVATED BAMBOO CHARCOAL' },
    { name: 'silicone-baking-mats.png', summary: 'Tấm lót nướng bánh silicon chịu nhiệt tái sử dụng thay giấy nến.', tags: ['baking-mat', 'silicone', 'zero-waste-baking'], ocr: 'PLATINUM SILICONE MAT' },
    { name: 'silk-dental-floss.png', summary: 'Chỉ nha khoa tơ tằm phủ sáp sáp ong trong lọ thủy tinh tái nạp.', tags: ['dental-floss', 'biodegradable', 'oral-care'], ocr: 'NATURAL SILK FLOSS' },
    { name: 'solid-dish-washing-block.png', summary: 'Khối xà phòng rửa bát đậm đặc chiết xuất chanh khử sạch dầu mỡ.', tags: ['dish-block', 'plastic-free-kitchen', 'cleaning'], ocr: 'SOLID DISH BLOCK' },
    { name: 'solar-power-bank.png', summary: 'Pin sạc dự phòng năng lượng mặt trời nhỏ gọn cho các chuyến dã ngoại.', tags: ['solar-energy', 'portable-power', 'outdoor'], ocr: 'SOLAR CHARGE 10000MAH' },
    { name: 'natural-bath-loofah.png', summary: 'Bông tắm xơ mướp tự nhiên tẩy tế bào chết nhẹ nhàng cho làn da.', tags: ['bath-sponge', 'body-care', 'natural-wellness'], ocr: 'ORGANIC LOOFAH BATH' },
    { name: 'metal-straw-pouch.png', summary: 'Bộ ống hút inox 304 kèm cọ rửa đựng trong túi vải canvas thời trang.', tags: ['metal-straw', 'stainless-steel', 'anti-plastic'], ocr: 'SUS304 ECO STRAWS' },
    { name: 'wheat-straw-lunch-box.png', summary: 'Hộp cơm rơm lúa mì hai tầng tiện lợi cho nhân viên văn phòng mang cơm trưa.', tags: ['lunch-box', 'wheat-straw', 'office-lifestyle'], ocr: 'WHEAT FIBER BENTO' },
    { name: 'recycled-notebook.png', summary: 'Sổ tay giấy tái chế bìa cứng kraft mộc mạc ghi chép ý tưởng xanh.', tags: ['recycled-paper', 'stationery', 'kraft-notebook'], ocr: '100% RECYCLED PAPER' },
    { name: 'plant-pot-terracotta.png', summary: 'Chậu đất nung trồng cây để bàn lọc không khí trong không gian làm việc.', tags: ['indoor-plants', 'clean-air', 'green-workspace'], ocr: 'TERRACOTTA GREEN POT' }
];

export function generateExtendedDriveFiles(count = 24) {
    return Array.from({ length: count }, (_, i) => {
        const item = EXTENDED_ECO_CATALOG[i % EXTENDED_ECO_CATALOG.length];
        const num = String(i + 1).padStart(2, '0');
        const fileId = `drive-file-${num}`;
        const name = i < EXTENDED_ECO_CATALOG.length ? item.name : `eco-asset-${num}.png`;
        return {
            id: fileId,
            name,
            mimeType: 'image/png',
            size: FIXTURE_PNG.length,
            version: FIXTURE_PNG_MD5,
            analysis: {
                summary: item.summary,
                tags: item.tags,
                ocr: item.ocr,
                suggested_uses: ['Chia sẻ mẹo sống xanh', 'Giới thiệu sản phẩm hữu cơ'],
                warnings: []
            }
        };
    });
}

export function createMockDriveFetcher({ folderId = 'fixture-drive-folder', files = DEFAULT_DRIVE_FILES } = {}) {
    let tokenCalls = 0;
    return async (url, options = {}) => {
        const u = new URL(url);

        // OAuth Token endpoint
        if (u.origin === 'https://oauth2.googleapis.com' && u.pathname === '/token') {
            tokenCalls++;
            return Response.json({
                access_token: 'fixture-access-token',
                refresh_token: 'fixture-refresh-token',
                expires_in: 3600,
                scope: DRIVE_SCOPE
            });
        }

        // Google Drive API v3
        if (u.origin === 'https://www.googleapis.com') {
            // Folder check / verify
            if (u.pathname.endsWith(`/files/${folderId}`)) {
                return Response.json({
                    id: folderId,
                    mimeType: 'application/vnd.google-apps.folder',
                    trashed: false
                });
            }

            // Image download (alt=media)
            if (u.searchParams.get('alt') === 'media') {
                return new Response(FIXTURE_PNG, {
                    headers: { 'Content-Type': 'image/png' }
                });
            }

            // Individual file metadata check
            for (const file of files) {
                if (u.pathname.endsWith(`/files/${encodeURIComponent(file.id)}`)) {
                    return Response.json({
                        id: file.id,
                        parents: [folderId],
                        trashed: false,
                        version: file.version,
                        md5Checksum: file.version
                    });
                }
            }

            // Files listing query
            if (u.pathname.endsWith('/files')) {
                return Response.json({
                    files: files.map(f => ({
                        id: f.id,
                        name: f.name,
                        mimeType: f.mimeType,
                        size: String(f.size),
                        version: f.version,
                        md5Checksum: f.version,
                        modifiedTime: '2026-11-13T10:00:00Z',
                        thumbnailLink: `https://drive.google.com/thumbnail?id=${f.id}&sz=s220`
                    }))
                });
            }
        }

        return new Response('Not found', { status: 404 });
    };
}

export function createMockAiFetch({ files = DEFAULT_DRIVE_FILES } = {}) {
    let callIndex = 0;

    return async (url, options = {}) => {
        const body = JSON.parse(options.body || '{}');
        const rawContent = body.messages?.[0]?.content;
        const promptText = typeof rawContent === 'string' ? rawContent : '';

        // Case 1: Strategy Plan Generation (ai:writing action === 'strategy')
        if (promptText.includes('Create a content strategy')) {
            const jsonPart = promptText.slice(promptText.indexOf('\n') + 1);
            const context = JSON.parse(jsonPart);
            const brief = JSON.parse(context.brief);
            const copy = brief.slots.map((slot, i) => ({
                id: slot.id,
                asset_id: slot.asset_id,
                title: `[EcoGreen] ${slot.angle}: Hành động xanh mỗi ngày #${i + 1}`,
                caption: `Khám phá ${slot.pillar} qua góc nhìn "${slot.angle}". Cùng EcoGreen xây dựng thói quen sống bền vững và giảm rác thải nhựa! #EcoLiving #ZeroWaste #${slot.platform} #${i + 1}`,
                reason: `Hình ảnh được duyệt thể hiện trực quan nội dung trụ cột ${slot.pillar} và góc tiếp cận ${slot.angle}.`
            }));
            return Response.json({
                choices: [{
                    finish_reason: 'stop',
                    message: { content: JSON.stringify(copy) }
                }]
            });
        }

        // Case 2: Asset Draft Generation (ai:writing action === 'draft')
        if (promptText.includes('Write a social caption')) {
            const jsonPart = promptText.slice(promptText.indexOf('\n') + 1);
            const context = JSON.parse(jsonPart);
            const brief = JSON.parse(context.brief);
            const caption = `🌿 ${context.brand?.name || 'EcoGreen Living'} - ${brief.goal || 'Sống xanh mỗi ngày'}\n\n${brief.approved_image?.summary || 'Sản phẩm thân thiện môi trường'}.\n\n👉 ${brief.cta || 'Trải nghiệm lối sống bền vững ngay hôm nay!'}\n\n#EcoGreen #SongXanh #ZeroWaste #BenVung`;
            return Response.json({
                choices: [{
                    finish_reason: 'stop',
                    message: { content: caption }
                }]
            });
        }

        // Case 3: Caption Adaptation (ai:writing action === 'adapt')
        if (promptText.includes('Adapt the caption')) {
            return Response.json({
                choices: [{
                    finish_reason: 'stop',
                    message: { content: 'Phiên bản thích ứng đa nền tảng tối ưu hoá từ khoá và hashtag sống xanh.' }
                }]
            });
        }

        // Case 4: Vision Analysis (image analysis)
        let matchedAnalysis = files[callIndex % files.length].analysis;
        callIndex++;

        return Response.json({
            choices: [
                {
                    finish_reason: 'stop',
                    message: {
                        content: JSON.stringify(matchedAnalysis)
                    }
                }
            ]
        });
    };
}

/**
 * Seeds a live Brand, Content Pillars, and Content Angles for testing.
 */
export function seedBrandCampaignContext(store, brandOverrides = {}) {
    const brand = store.write('Brand', {
        name: 'EcoGreen Living',
        description: 'Thương hiệu sản phẩm gia dụng và phong cách sống hữu cơ, bền vững.',
        products: 'Bàn chải tre, túi tote hữu cơ, xà phòng tự nhiên, trạm refill.',
        target_audience: 'Người tiêu dùng trẻ, các gia đình hiện đại quan tâm môi trường và lối sống xanh.',
        tone_of_voice: 'Ấm áp, truyền cảm hứng, tinh tế, tích cực.',
        goals: 'Nâng cao nhận thức thương hiệu, xây dựng cộng đồng lối sống bền vững.',
        timezone: 'Asia/Ho_Chi_Minh',
        status: 'active',
        is_demo: false,
        ...brandOverrides
    });

    const pillars = [
        store.write('ContentPillar', {
            brand_id: brand.id,
            name: 'Eco Living Tips',
            description: 'Mẹo và kiến thức thực tiễn xây dựng thói quen sống xanh mỗi ngày',
            target_percentage: 35,
            color: '#10B981',
            status: 'active',
            is_demo: false
        }),
        store.write('ContentPillar', {
            brand_id: brand.id,
            name: 'Product Highlights',
            description: 'Câu chuyện chất liệu, nguồn gốc và công năng của sản phẩm EcoGreen',
            target_percentage: 35,
            color: '#3B82F6',
            status: 'active',
            is_demo: false
        }),
        store.write('ContentPillar', {
            brand_id: brand.id,
            name: 'Community & Impact',
            description: 'Các sự kiện refill, hoạt động cộng đồng và báo cáo tác động môi trường',
            target_percentage: 30,
            color: '#F59E0B',
            status: 'active',
            is_demo: false
        })
    ];

    const angles = [
        store.write('ContentAngle', {
            brand_id: brand.id,
            pillar_id: pillars[0].id,
            name: 'Zero-waste Habits',
            description: 'Thay đổi nhỏ trong phòng tắm và căn bếp để loại bỏ đồ nhựa dùng 1 lần',
            status: 'active',
            is_demo: false
        }),
        store.write('ContentAngle', {
            brand_id: brand.id,
            pillar_id: pillars[0].id,
            name: 'Mindful Consumption',
            description: 'Tư duy tiêu dùng tỉnh thức: mua ít hơn, chọn chất lượng hơn',
            status: 'active',
            is_demo: false
        }),
        store.write('ContentAngle', {
            brand_id: brand.id,
            pillar_id: pillars[1].id,
            name: 'Natural Material Story',
            description: 'Hành trình từ rừng tre bền vững đến sản phẩm hoàn thiện không hóa chất',
            status: 'active',
            is_demo: false
        }),
        store.write('ContentAngle', {
            brand_id: brand.id,
            pillar_id: pillars[1].id,
            name: 'Real Customer Stories',
            description: 'Trải nghiệm thực tế của người dùng sau 30 ngày chuyển sang sản phẩm hữu cơ',
            status: 'active',
            is_demo: false
        }),
        store.write('ContentAngle', {
            brand_id: brand.id,
            pillar_id: pillars[2].id,
            name: 'Weekend Refill Workshop',
            description: 'Hình ảnh và lời mời tham gia sự kiện trạm refill cuối tuần tại TP.HCM',
            status: 'active',
            is_demo: false
        }),
        store.write('ContentAngle', {
            brand_id: brand.id,
            pillar_id: pillars[2].id,
            name: 'Green Impact Numbers',
            description: 'Thống kê lượng rác thải nhựa cộng đồng EcoGreen đã cùng nhau cắt giảm',
            status: 'active',
            is_demo: false
        })
    ];

    return { brand, pillars, angles };
}

/**
 * Creates a complete test harness for Google Drive asset synchronization,
 * metadata extraction and campaign context preparation.
 */
export function createCampaignDriveHarness(options = {}) {
    const store = options.store || createStore(':memory:');
    const key = options.key || randomBytes(32).toString('hex');
    const folderId = options.folderId || 'eco-drive-folder-001';
    const driveFiles = options.files || DEFAULT_DRIVE_FILES;

    const env = {
        SOCIALCHOICE_AUTOPILOT_ENABLED: 'true',
        GOOGLE_DRIVE_CLIENT_ID: 'test-google-client-id',
        GOOGLE_DRIVE_CLIENT_SECRET: 'test-google-client-secret',
        GOOGLE_DRIVE_PUBLIC_API_KEY: 'test-google-public-api-key',
        SOCIALCHOICE_PUBLIC_ORIGIN: 'http://127.0.0.1:5173',
        ...options.env
    };

    const auth = options.auth || {
        enabled: true,
        sessionKey: () => 'fixture-admin-session',
        sessionActive: session => session === 'fixture-admin-session'
    };

    const fetcher = options.fetcher || createMockDriveFetcher({ folderId, files: driveFiles });
    const aiFetch = options.aiFetch || createMockAiFetch({ files: driveFiles });

    // Configure AI provider credentials in MetaVault
    createMetaVault(store, key).save('ai:writing', {
        provider: 'openrouter',
        model: 'google/fixture',
        key: 'fixture-ai-test-key'
    });

    const service = createAutopilot({
        store,
        auth,
        key,
        env,
        fetcher,
        aiFetch,
        ...options
    });

    const { brand, pillars, angles } = seedBrandCampaignContext(store, options.brandOverrides);

    const call = (operation, input = {}) => service.execute(operation, input);

    const runUntilIdle = async (maxTurns = 100) => {
        for (let i = 0; i < maxTurns; i++) {
            const res = await call('run');
            if (res.idle) return;
        }
    };

    return {
        store,
        key,
        env,
        auth,
        brand,
        pillars,
        angles,
        folderId,
        driveFiles,
        service,
        call,
        runUntilIdle,
        close: () => store.close()
    };
}
