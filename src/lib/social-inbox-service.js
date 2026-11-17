// src/lib/social-inbox-service.js
// Centralized Social Inbox Service for Socialchoice
// Aggregates DMs and Comments across Facebook, Instagram, TikTok, Threads, and Zalo OA.
// Includes Anti-theft SĐT Shield, AI Copilot quick replies, and CRM tags.

const STORAGE_KEY = 'socialchoice:social_inbox_data';
const EVENT_NAME = 'socialchoice:social_inbox_updated';

// Regular expressions to detect Vietnamese mobile phone numbers
// Supports +84 or 0 prefix, valid VN carriers (3, 5, 7, 8, 9), and delimiters (spaces, dots, hyphens)
const VN_PHONE_REGEX = /(?:(?:\+84|0)(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])(?:[-.\s]?[0-9]{3})(?:[-.\s]?[0-9]{4}))\b/g;

/**
 * Detect all Vietnamese phone numbers from a text string
 * @param {string} text
 * @returns {string[]} Array of detected phone strings (normalized)
 */
export function detectPhoneNumbers(text) {
    if (!text || typeof text !== 'string') return [];
    const matches = text.match(VN_PHONE_REGEX);
    if (!matches) return [];
    // Deduplicate and normalize
    return Array.from(new Set(matches.map((m) => m.trim())));
}

/**
 * Mask a phone number for privacy / anti-theft preview
 * e.g., "0987654321" -> "098****321" or "098***456"
 * @param {string} phone
 * @returns {string}
 */
export function maskPhoneNumber(phone) {
    if (!phone) return '';
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 8) return phone;
    const prefix = digitsOnly.slice(0, 3);
    const suffix = digitsOnly.slice(-3);
    return `${prefix}****${suffix}`;
}

/**
 * Mask any phone numbers inside a comment/message text
 * @param {string} text
 * @returns {string}
 */
export function maskPhonesInText(text) {
    if (!text) return '';
    return text.replace(VN_PHONE_REGEX, (match) => maskPhoneNumber(match));
}

// Initial realistic seed data for brands
const INITIAL_CONVERSATIONS = [
    {
        id: 'conv_fb_001',
        brand_id: 'b_skincare',
        platform: 'facebook',
        type: 'comment',
        customer: {
            id: 'cust_fb_101',
            name: 'Nguyễn Thảo My',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
            phone: '0988123456',
        },
        post: {
            id: 'post_fb_901',
            title: 'Kem dưỡng ẩm phục hồi B5+ Rau má - Mua 1 tặng 1 duy nhất hôm nay!',
            url: 'https://facebook.com/lumenskin/posts/901',
            thumbnail: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=150&h=150&fit=crop',
        },
        status: 'unread',
        has_phone: true,
        phone_hidden: true, // Automatically hidden by SĐT Shield
        shield_reason: 'Phát hiện số điện thoại trong bình luận công khai - Đã tự động ẩn để tránh đối thủ cướp đơn',
        tags: ['hot_lead', 'order_pending'],
        internal_notes: 'Khách hỏi mua combo 2 hũ B5, cần gọi điện xác nhận địa chỉ trước 17h.',
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        updated_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        messages: [
            {
                id: 'msg_001',
                sender: 'customer',
                text: 'Shop ơi ship cho mình 2 hũ về 45 Lê Duẩn, Đà Nẵng nhé, sđt 0988 123 456. Có được freeship không ạ?',
                created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
                has_phone: true,
                detected_phones: ['0988 123 456'],
            },
        ],
    },
    {
        id: 'conv_tt_002',
        brand_id: 'b_fashion',
        platform: 'tiktok',
        type: 'comment',
        customer: {
            id: 'cust_tt_202',
            name: 'Hải Đăng Official',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
            phone: '0903345678',
        },
        post: {
            id: 'post_tt_802',
            title: 'Outfit dạo phố mùa thu tone Beige Oversize cực bắt mắt',
            url: 'https://tiktok.com/@urbantrend/video/802',
            thumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=150&h=150&fit=crop',
        },
        status: 'unread',
        has_phone: true,
        phone_hidden: true,
        shield_reason: 'Tự động ẩn bình luận chứa số điện thoại',
        tags: ['hot_lead'],
        internal_notes: 'Khách 1m75 nặng 68kg hỏi size L áo khoác bomber.',
        created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
        updated_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
        messages: [
            {
                id: 'msg_002',
                sender: 'customer',
                text: 'Áo khoác bomber còn size L ko shop, liên hệ chốt gấp cho mình: 0903345678',
                created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
                has_phone: true,
                detected_phones: ['0903345678'],
            },
        ],
    },
    {
        id: 'conv_ig_003',
        brand_id: 'b_coffee',
        platform: 'instagram',
        type: 'dm',
        customer: {
            id: 'cust_ig_303',
            name: 'minh.anh_coffee',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
            phone: null,
        },
        post: null,
        status: 'read',
        has_phone: false,
        phone_hidden: false,
        shield_reason: null,
        tags: ['consulting'],
        internal_notes: 'Khách muốn tìm hiểu hạt Cầu Đất rang mộc dành cho pha Pour Over.',
        created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        updated_at: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
        messages: [
            {
                id: 'msg_003_1',
                sender: 'customer',
                text: 'Chào The Coffee Lab, quán mình có bán dòng hạt Arabica Cầu Đất rang Light để pha V60 không ạ?',
                created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
                has_phone: false,
            },
            {
                id: 'msg_003_2',
                sender: 'brand',
                text: 'Dạ chào bạn Minh Anh! Quán hiện có mẻ Arabica Cầu Đất Specialty sơ chế Honey vừa rang hôm qua, note hương hoa cam và quả mọng rất hợp pha V60 bạn nhé!',
                created_at: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
                has_phone: false,
            },
        ],
    },
    {
        id: 'conv_zl_004',
        brand_id: 'b_skincare',
        platform: 'zalo',
        type: 'dm',
        customer: {
            id: 'cust_zl_404',
            name: 'Chị Mai Linh - Spa Q3',
            avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
            phone: '0912987654',
        },
        post: null,
        status: 'unread',
        has_phone: true,
        phone_hidden: false, // In DM, phone doesn't need public shield, but is captured for CRM
        shield_reason: null,
        tags: ['vip'],
        internal_notes: 'Khách sỉ spa lấy định kỳ 20 serum/tháng. Đã gửi bảng chiết khấu đại lý.',
        created_at: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
        updated_at: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
        messages: [
            {
                id: 'msg_004',
                sender: 'customer',
                text: 'Em ơi tháng này gửi chị 30 chai Serum Niacinamide 10% sang địa chỉ cũ nhé. Check hóa đơn đỏ gửi qua Zalo này nha.',
                created_at: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
                has_phone: false,
            },
        ],
    },
    {
        id: 'conv_th_005',
        brand_id: 'b_fashion',
        platform: 'threads',
        type: 'comment',
        customer: {
            id: 'cust_th_505',
            name: 'Trần Quốc Bảo',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
            phone: null,
        },
        post: {
            id: 'post_th_705',
            title: 'Drop áo phông graphic limited 200 chiếc toàn quốc',
            url: 'https://threads.net/@urbantrend/post/705',
            thumbnail: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=150&h=150&fit=crop',
        },
        status: 'resolved',
        has_phone: false,
        phone_hidden: false,
        shield_reason: null,
        tags: [],
        internal_notes: '',
        created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
        updated_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
        messages: [
            {
                id: 'msg_005_1',
                sender: 'customer',
                text: 'Áo này form boxy hay regular fit vậy brand?',
                created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
                has_phone: false,
            },
            {
                id: 'msg_005_2',
                sender: 'brand',
                text: 'Dạ form Boxy fit vai rủ nhẹ thời thượng bạn nha. Chất cotton 100% 260gsm đứng form cực đẹp!',
                created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
                has_phone: false,
            },
        ],
    },
];

// Quick response snippets template
export const QUICK_SNIPPETS = [
    {
        id: 'snip_greet',
        title: 'Chào khách & cảm ơn',
        text: 'Dạ chào bạn! Cảm ơn bạn đã quan tâm đến sản phẩm của shop. Shop có thể hỗ trợ tư vấn thông tin chi tiết gì cho bạn ạ?',
    },
    {
        id: 'snip_freeship',
        title: 'Chính sách Freeship',
        text: 'Dạ shop hiện đang có chương trình miễn phí giao hàng toàn quốc cho đơn từ 299k. Bạn gửi thông tin địa chỉ và SĐT để shop lên đơn ngay nhé!',
    },
    {
        id: 'snip_address',
        title: 'Xin địa chỉ & SĐT chốt đơn',
        text: 'Dạ shop đã ghi nhận đơn của bạn. Bạn cho shop xin Họ tên + SĐT + Địa chỉ nhận hàng cụ thể để shop gửi chuyển phát nhanh nhé ạ!',
    },
    {
        id: 'snip_phone_hidden_notice',
        title: 'Bảo mật SĐT khách',
        text: 'Dạ shop đã lưu thông tin và chủ động ẩn số điện thoại của bạn trên bình luận để bảo mật thông tin cá nhân và tránh bị quấy rối ạ!',
    },
    {
        id: 'snip_hotline',
        title: 'Hotline CSKH',
        text: 'Nếu cần hỗ trợ gấp về đơn hàng, bạn có thể gọi hotline cskh 1900 6868 (8:00 - 21:00 hàng ngày) để được xử lý ngay lập tức ạ.',
    },
];

// Helper to broadcast storage updates
function broadcastUpdate() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
}

/**
 * Load all conversations from LocalStorage or initialize with seed data
 * @returns {Array}
 */
export function getInboxData() {
    if (typeof window === 'undefined') return INITIAL_CONVERSATIONS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CONVERSATIONS));
            return INITIAL_CONVERSATIONS;
        }
        return JSON.parse(raw);
    } catch {
        return INITIAL_CONVERSATIONS;
    }
}

/**
 * Save conversations to LocalStorage
 * @param {Array} conversations
 */
export function saveInboxData(conversations) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
        broadcastUpdate();
    } catch (err) {
        console.error('Failed to save inbox data:', err);
    }
}

/**
 * Get filtered conversations
 * @param {Object} options
 * @param {string} [options.brandId]
 * @param {string} [options.platform] - 'all', 'facebook', 'instagram', 'tiktok', 'threads', 'zalo'
 * @param {string} [options.type] - 'all', 'comment', 'dm'
 * @param {string} [options.status] - 'all', 'unread', 'read', 'resolved', 'shielded'
 * @param {string} [options.search]
 * @returns {Array}
 */
export function getConversations({ brandId, platform, type, status, search } = {}) {
    const list = getInboxData();
    return list.filter((conv) => {
        // Brand filter
        if (brandId && brandId !== 'all' && conv.brand_id !== brandId) return false;

        // Platform filter
        if (platform && platform !== 'all' && conv.platform !== platform) return false;

        // Type filter (comment vs dm)
        if (type && type !== 'all' && conv.type !== type) return false;

        // Status filter
        if (status === 'unread' && conv.status !== 'unread') return false;
        if (status === 'resolved' && conv.status !== 'resolved') return false;
        if (status === 'shielded' && (!conv.has_phone || !conv.phone_hidden)) return false;

        // Search text
        if (search && search.trim()) {
            const query = search.trim().toLowerCase();
            const matchName = conv.customer?.name?.toLowerCase().includes(query);
            const matchPhone = conv.customer?.phone?.includes(query);
            const matchPost = conv.post?.title?.toLowerCase().includes(query);
            const matchNotes = conv.internal_notes?.toLowerCase().includes(query);
            const matchMessages = conv.messages?.some((m) => m.text?.toLowerCase().includes(query));
            if (!matchName && !matchPhone && !matchPost && !matchNotes && !matchMessages) {
                return false;
            }
        }

        return true;
    });
}

/**
 * Get single conversation by ID
 * @param {string} id
 * @returns {Object|null}
 */
export function getConversationById(id) {
    const list = getInboxData();
    return list.find((c) => c.id === id) || null;
}

/**
 * Send a reply message to a conversation
 * @param {string} convId
 * @param {string} text
 * @returns {Object} updated conversation
 */
export function replyToConversation(convId, text) {
    if (!text || !text.trim()) return null;
    const list = getInboxData();
    const index = list.findIndex((c) => c.id === convId);
    if (index === -1) return null;

    const conv = list[index];
    const newMsg = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sender: 'brand',
        text: text.trim(),
        created_at: new Date().toISOString(),
        has_phone: false,
    };

    const updated = {
        ...conv,
        status: 'read',
        updated_at: new Date().toISOString(),
        messages: [...(conv.messages || []), newMsg],
    };

    list[index] = updated;
    saveInboxData(list);
    return updated;
}

/**
 * Toggle the Anti-Theft Phone Shield (Hide/Unhide comment)
 * @param {string} convId
 * @returns {Object}
 */
export function togglePhoneShield(convId) {
    const list = getInboxData();
    const index = list.findIndex((c) => c.id === convId);
    if (index === -1) return null;

    const conv = list[index];
    const newHidden = !conv.phone_hidden;
    const updated = {
        ...conv,
        phone_hidden: newHidden,
        shield_reason: newHidden
            ? 'Đã tự động ẩn số điện thoại trên bài viết công khai để tránh bị cướp đơn.'
            : 'Đã mở lại hiển thị số điện thoại theo yêu cầu của nhân viên.',
        updated_at: new Date().toISOString(),
    };

    list[index] = updated;
    saveInboxData(list);
    return updated;
}

/**
 * Update conversation status (unread, read, resolved)
 * @param {string} convId
 * @param {'unread'|'read'|'resolved'} status
 */
export function updateConversationStatus(convId, status) {
    const list = getInboxData();
    const index = list.findIndex((c) => c.id === convId);
    if (index === -1) return null;

    const updated = {
        ...list[index],
        status,
        updated_at: new Date().toISOString(),
    };

    list[index] = updated;
    saveInboxData(list);
    return updated;
}

/**
 * Update internal notes for a customer conversation
 * @param {string} convId
 * @param {string} notes
 */
export function updateInternalNotes(convId, notes) {
    const list = getInboxData();
    const index = list.findIndex((c) => c.id === convId);
    if (index === -1) return null;

    const updated = {
        ...list[index],
        internal_notes: notes,
        updated_at: new Date().toISOString(),
    };

    list[index] = updated;
    saveInboxData(list);
    return updated;
}

/**
 * Update customer tags
 * @param {string} convId
 * @param {string[]} tags
 */
export function updateConversationTags(convId, tags) {
    const list = getInboxData();
    const index = list.findIndex((c) => c.id === convId);
    if (index === -1) return null;

    const updated = {
        ...list[index],
        tags,
        updated_at: new Date().toISOString(),
    };

    list[index] = updated;
    saveInboxData(list);
    return updated;
}

/**
 * Generate AI Copilot suggested replies based on conversation context
 * @param {Object} conv
 * @returns {Array<{ id: string, title: string, text: string }>}
 */
export function generateAiSuggestedReplies(conv) {
    if (!conv) return [];
    const lastMsg = conv.messages && conv.messages.length > 0
        ? conv.messages[conv.messages.length - 1]
        : null;

    const customerText = (lastMsg?.text || '').toLowerCase();
    const suggestions = [];

    // Context: Customer left phone or asked for order
    if (conv.has_phone || customerText.includes('ship') || customerText.includes('đặt') || customerText.includes('mua') || customerText.includes('sđt')) {
        suggestions.push({
            id: 'ai_order_confirm',
            title: 'Chốt đơn & ẩn SĐT',
            text: `Dạ em chào ${conv.customer.name}! Shop đã ghi nhận thông tin đặt hàng của bạn và chủ động ẩn số điện thoại trên bình luận để bảo mật thông tin. Nhân viên kho sẽ liên hệ chốt đơn giao hoả tốc cho bạn nha!`,
        });
        suggestions.push({
            id: 'ai_check_promo',
            title: 'Tư vấn khuyến mãi kèm theo',
            text: `Dạ ${conv.customer.name} ơi, hôm nay bên mình có thêm voucher giảm 20k cho đơn thanh toán trước qua chuyển khoản hoặc đặt trên TikTok Shop/Shopee, bạn có muốn shop hỗ trợ áp dụng không ạ?`,
        });
    }

    // Context: Inquiring about size/specs
    if (customerText.includes('size') || customerText.includes('mẫu') || customerText.includes('màu') || customerText.includes('chất')) {
        suggestions.push({
            id: 'ai_size_guide',
            title: 'Tư vấn chọn size chuẩn',
            text: `Dạ chào ${conv.customer.name}! Bạn có thể cho shop xin chiều cao và cân nặng để bên em tư vấn size vừa vặn và tôn dáng nhất cho bạn nhé ạ!`,
        });
    }

    // Context: Inquiring about coffee / ingredients / usage
    if (customerText.includes('pha') || customerText.includes('dùng') || customerText.includes('da') || customerText.includes('hạt')) {
        suggestions.push({
            id: 'ai_usage_guide',
            title: 'Hướng dẫn sử dụng & bảo quản',
            text: `Dạ chào bạn! Sản phẩm này bên mình khuyên dùng mỗi ngày sau bước làm sạch (hoặc pha ở nhiệt độ nước 90-93°C đối với cafe). Nếu bạn cần công thức chi tiết shop gửi thêm qua tin nhắn riêng nhé!`,
        });
    }

    // Generic polite fallbacks if few suggestions
    if (suggestions.length < 2) {
        suggestions.push({
            id: 'ai_friendly_reply',
            title: 'Hỏi thăm nhu cầu khách',
            text: `Dạ chào ${conv.customer.name}! Rất vui được hỗ trợ bạn hôm nay. Bạn đang quan tâm đến sản phẩm nào để shop gửi hình ảnh thực tế và báo giá ưu đãi nhất nhé ạ!`,
        });
    }

    return suggestions;
}
