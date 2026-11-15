import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import {
    BookOpen,
    MagnifyingGlass,
    RocketLaunch,
    PencilSimple,
    Target,
    CalendarBlank,
    Sparkle,
    ChartLineUp,
    CreditCard,
    ArrowRight,
    ArrowLeft,
    Check,
    Copy,
    Lightning,
    ChatCircleText,
    ShareNetwork,
    Stack,
    TreeStructure,
    Tag,
    Clock,
    FileText,
    ShieldCheck,
    Desktop,
    Globe,
    CaretRight,
    CaretDown,
    PushPin,
    LinkSimple,
} from '@phosphor-icons/react';

const DOC_SECTIONS = [
    {
        id: 'quick-start',
        title: '1. Bắt đầu nhanh (Quick Start)',
        icon: RocketLaunch,
        badge: 'Cơ bản',
        description: 'Làm quen với Socialchoice và hoàn thành bài đăng đa kênh đầu tiên trong chưa đầy 3 phút.',
        articles: [
            {
                id: 'overview-concept',
                title: 'Tổng quan & Triết lý vận hành',
                content: `Socialchoice là nền tảng quản trị và phân phối nội dung mạng xã hội đa kênh (Omni-channel Social Management), được thiết kế tối ưu cho các Content Creator, Marketer và Doanh nghiệp Việt Nam.

Khác với các công cụ truyền thống chỉ đơn thuần "lên lịch bài viết", Socialchoice kết hợp 3 trụ cột:
1. **Soạn thảo thông minh**: Soạn 1 lần, tự động tối ưu hóa và phát sóng chuẩn xác lên Facebook Page, Instagram, Threads, TikTok và LinkedIn.
2. **Chiến lược & Chiến dịch phân cấp**: Quản lý nội dung chặt chẽ theo cấu trúc: Thương hiệu (Brand) ➔ Chiến dịch (Campaign) ➔ Trụ cột nội dung (Pillar) ➔ Góc khai thác (Angle).
3. **Tự động hóa bán hàng & Tương tác**: Tự động ghim bình luận đầu tiên (Auto First Comment) kèm link tracking UTM, chuỗi bình luận điều hướng (Comment Chain), và sẵn sàng cho Comment-to-Inbox.`,
            },
            {
                id: 'five-steps',
                title: 'Quy trình 5 bước phát sóng nội dung',
                content: `Quy trình chuẩn để đưa nội dung lên đa kênh với Socialchoice:

- **Bước 1 — Kết nối kênh**: Vào menu **Social Accounts** kết nối Facebook Page, Instagram, TikTok, Threads hoặc LinkedIn thông qua chuẩn OAuth an toàn.
- **Bước 2 — Thiết lập Chiến dịch & Trụ cột**: (Tùy chọn) Tạo chiến dịch mùa vụ trong **Campaigns** và phân bổ tỷ lệ trụ cột trong **Content Pillars**.
- **Bước 3 — Soạn bài trong Studio**: Vào **Create Post**, chọn kênh phát sóng, soạn nội dung dùng chung hoặc tùy chỉnh riêng từng kênh.
- **Bước 4 — Ghim bình luận & UTM**: Nhập link điều hướng bán hàng vào ô **Bình luận đầu tiên (First Comment)** để giữ thuật toán không bị bóp reach.
- **Bước 5 — Đăng ngay hoặc Lên lịch**: Chọn giờ vàng phát sóng hoặc bấm "Đăng ngay" để hệ thống tự động đẩy bài lên các nền tảng đã chọn.`,
            },
            {
                id: 'modes-comparison',
                title: 'Chế độ Đăng nhanh vs Chế độ Chiến lược (Pro)',
                content: `Tại Studio Soạn bài (**Create Post**), bạn có thể linh hoạt chuyển đổi giữa 2 chế độ phù hợp với nhu cầu:

| Tiêu chí | ⚡ Chế độ Đăng nhanh (Quick Post) | 🎯 Chế độ Chiến lược (Strategic Mode) |
|---|---|---|
| **Mục đích** | Bắn tin tức nhanh, cập nhật hàng ngày, không cần báo cáo phức tạp | Chạy chiến dịch bài bản, ra mắt sản phẩm, theo dõi KPI & ROI |
| **Tiêu đề nội bộ** | Tự động trích từ 40 ký tự đầu của caption | Cho phép đặt tên bài viết quản trị riêng biệt |
| **Gắn kết phân tầng** | Ẩn Pillar/Angle/Campaign để giao diện tối giản tối đa | Chọn Chiến dịch ➔ Trụ cột ➔ Góc khai thác đầy đủ |
| **Tự động gắn UTM** | Thủ công nếu cần | Tự động đồng bộ mã UTM từ chiến dịch vào link |
| **Bình luận đầu tiên** | Có sẵn ngay dưới ô viết bài | Có sẵn đầy đủ tính năng bình luận & chuỗi cmt |`,
            },
        ],
    },
    {
        id: 'composer-studio',
        title: '2. Studio Soạn thảo & Đăng đa kênh',
        icon: PencilSimple,
        badge: 'Trọng tâm',
        description: 'Tận dụng toàn bộ sức mạnh của bộ soạn thảo studio để nhân bản nội dung không lo trùng lặp.',
        articles: [
            {
                id: 'multi-channel-publishing',
                title: 'Soạn 1 lần — Phát sóng 5 nền tảng',
                content: `Studio cho phép bạn đăng tải đồng thời lên:
- **Facebook Page**: Hỗ trợ bài viết kèm album ảnh hoặc video.
- **Instagram**: Tự động chuyển đổi thành định dạng bài đăng ảnh/Reels.
- **Threads**: Đăng bài viết dạng status vi mô, kết nối trực tiếp với cộng đồng Threads.
- **TikTok**: Đăng video hoặc slide ảnh trực tiếp lên kênh TikTok với tiêu đề và hashtag.
- **LinkedIn**: Đăng bài chuyên nghiệp lên Personal Profile hoặc Company Page.

**Biến tự động hóa tag \`{platform}\`:**
Khi bạn viết trong nội dung: *"Đừng quên follow kênh {platform} của mình nhé!"*, khi phát sóng lên Facebook hệ thống sẽ tự thay bằng *"kênh Facebook"*, lên TikTok sẽ tự thay bằng *"kênh TikTok"*.`,
            },
            {
                id: 'per-channel-customization',
                title: 'Tùy chỉnh riêng từng kênh (Per-Channel Overrides)',
                content: `Mỗi mạng xã hội có phong cách hành văn và độ dài khác nhau. Socialchoice hỗ trợ tính năng **Soạn theo kênh**:
1. Ở tab **Nội dung chung**, bạn viết khung sườn bài viết gốc.
2. Bấm vào tab riêng của kênh (ví dụ: tab *TikTok* hoặc *Threads*).
3. Tích chọn **"Tùy chỉnh riêng"**:
   - Viết caption ngắn gọn hơn hoặc thêm hashtag đặc thù cho TikTok.
   - Chọn bộ ảnh/video riêng cho kênh đó.
   - Đặt giờ đăng riêng cho từng kênh để đón đúng giờ vàng của từng tập khán giả.`,
            },
            {
                id: 'auto-first-comment',
                title: 'Tự động Ghim Bình luận đầu tiên (First Comment)',
                content: `**Tại sao tính năng này quan trọng?**
Thuật toán của Facebook và LinkedIn thường "bóp reach" (giảm lượt hiển thị) đối với các bài đăng có chứa liên kết ngoài (external link) trong caption chính.

**Giải pháp của Socialchoice:**
- Ngay dưới khung soạn bài, có bảng điều khiển **"Tự động ghim Bình luận đầu tiên (First Comment)"**.
- Bạn chỉ cần dán link mua hàng, link Shopee, landing page hoặc thông tin liên hệ vào đây.
- Ngay sau khi bài viết được đăng tải thành công lên Page, Socialchoice sẽ tự động dùng nick Page để gửi bình luận này đầu tiên, giữ caption chính hoàn toàn trong sạch để đạt reach tự nhiên tối đa!`,
            },
            {
                id: 'comment-chain',
                title: 'Chuỗi bình luận tiếp nối (Comment Chain)',
                content: `Ngoài bình luận đầu tiên ngay lập tức, bạn có thể thiết lập **Chuỗi bình luận hẹn giờ (Comment Chain)**:
- Bình luận #2 sau 5 phút: Bổ sung hình ảnh feedback hoặc chứng nhận chất lượng.
- Bình luận #3 sau 15 phút: Kêu gọi tham gia mini-game hoặc nhắc mã giảm giá có hạn.
Hệ thống sẽ tự động canh đúng thời gian và đẩy bình luận vào bài đăng mà bạn không cần phải ngồi canh chừng.`,
            },
            {
                id: 'utm-and-shortlinks',
                title: 'Rút gọn link & Tự động gắn UTM Campaign',
                content: `Tích hợp ngay trong ngăn Tiện ích bên phải của Studio:
- **Tự động bắt link**: Khi bạn gõ bất kỳ đường link nào trong bài viết hoặc comment, hệ thống tự động phát hiện.
- **Gắn UTM tự động**: Nếu bài viết thuộc một Chiến dịch (Campaign), trường \`utm_campaign\` sẽ tự động điền.
- **Rút gọn link 1-click**: Bấm *"Chèn vào bài viết"* hoặc *"Tạo shortlink"*, hệ thống sẽ tạo link rút gọn chuyên nghiệp để đo lường tỷ lệ nhấp chuột (CTR).`,
            },
        ],
    },
    {
        id: 'strategy-and-campaigns',
        title: '3. Chiến dịch & Chiến lược nội dung',
        icon: Target,
        badge: 'Độc quyền',
        description: 'Vận hành cỗ máy tiếp thị theo cấu trúc phân tầng khoa học, không bao giờ bị cạn kiệt ý tưởng.',
        articles: [
            {
                id: 'hierarchy-model',
                title: 'Mô hình phân tầng 4 cấp độ (Brand Hierarchy)',
                content: `Socialchoice giải quyết triệt để sự lộn xộn trong quản lý nội dung bằng mô hình kim tự tháp 4 tầng:

\`\`\`text
Thương hiệu (Brand)
  └── Chiến dịch (Campaign: Ra mắt sản phẩm / Sale Tết / Brand Awareness)
        └── Trụ cột nội dung (Content Pillars: Kiến thức / Case Study / Bán hàng / Hậu trường)
              └── Góc khai thác (Angles: Hướng dẫn / Cảnh báo sai lầm / Kể chuyện thực tế)
                    └── Bài viết (Posts)
\`\`\`

Nhờ cấu trúc này:
- Bạn biết chính xác bài viết này phục vụ chiến dịch nào và đạt được bao nhiêu % tiến độ.
- Nhân viên hoặc agency khi vào làm việc chỉ cần chọn đúng Pillar và Angle đã được duyệt sẵn.`,
            },
            {
                id: 'campaign-management',
                title: 'Quản lý chiến dịch (Campaigns)',
                content: `Trong menu **STRATEGY ➔ Campaigns**, bạn có thể:
- Tạo chiến dịch mới với khung thời gian bắt đầu & kết thúc.
- Đặt mã **UTM Campaign** đồng bộ (ví dụ: \`tet_2027\`, \`black_friday\`).
- Đặt nhãn màu nhận diện riêng cho từng chiến dịch.
- Theo dõi số lượng bài viết và số lượng trụ cột nội dung đã gắn vào chiến dịch.
- Bấm **"Soạn bài viết"** trực tiếp từ thẻ chiến dịch để tự động điền sẵn metadata vào Studio.`,
            },
            {
                id: 'pillar-balance',
                title: 'Phân bổ tỷ lệ % Trụ cột nội dung (Pillar Balance)',
                content: `Một fanpage chỉ chăm chăm đăng bài bán hàng sẽ nhanh chóng bị người theo dõi bỏ rơi.
- Trong **Content Pillars**, bạn thiết lập tỷ lệ mục tiêu (ví dụ: *40% Kiến thức hữu ích, 25% Case Study, 20% Giới thiệu sản phẩm, 15% Văn hóa/Đời sống*).
- Hệ thống tự động tính toán tổng số bài viết thực tế đã đăng và hiển thị thanh đo **HUD 100% Phân bổ**:
  - Nhãn xanh lá: Đạt mức cân bằng hoàn hảo (±5%).
  - Nhãn xanh dương: Đang đăng vượt mục tiêu.
  - Nhãn đỏ hồng: Đang thiếu bài viết ở nhóm này.`,
            },
            {
                id: 'ai-content-strategist',
                title: 'AI Content Strategist (Lập kế hoạch 30 ngày)',
                content: `Tại trang **Content Strategy**:
- AI phân tích cơ sở tri thức thương hiệu (Brand Knowledge Base: sản phẩm, khách hàng mục tiêu, tôn chỉ giọng văn).
- Tự động đề xuất lịch nội dung 30 ngày với các góc khai thác độc đáo.
- Bạn có thể duyệt và áp dụng toàn bộ gợi ý này thành các bài nháp trên Lịch nội dung chỉ bằng 1 cú click chuột.`,
            },
        ],
    },
    {
        id: 'calendar-and-bulk',
        title: '4. Lên lịch & Lịch phát sóng',
        icon: CalendarBlank,
        badge: 'Tiện ích',
        description: 'Bao quát toàn cảnh lịch phát sóng nội dung tháng và nhập bài viết hàng loạt từ Excel.',
        articles: [
            {
                id: 'calendar-overview',
                title: 'Lịch nội dung trực quan (Content Calendar)',
                content: `Trang **Content Calendar** cung cấp góc nhìn toàn cảnh về mọi bài viết trong tháng:
- **Bộ lọc thông minh**: Lọc theo nền tảng (Facebook, TikTok, v.v.), theo trạng thái (Đã lên lịch, Đã đăng, Bản nháp) hoặc theo Trụ cột nội dung.
- **Xem nhanh chi tiết**: Bấm vào bài viết trên ô lịch để xem trước hình ảnh, caption và giờ phát sóng dự kiến.
- **Kéo thả / Đổi giờ linh hoạt**: Dễ dàng chỉnh sửa ngày giờ phát sóng phù hợp với kế hoạch mới.`,
            },
            {
                id: 'bulk-import',
                title: 'Nhập bài viết hàng loạt từ Excel / CSV',
                content: `Dành cho các đội ngũ sản xuất nội dung quy mô lớn:
1. Vào **All Posts** ➔ Bấm nút **"Import Excel / CSV"**.
2. Tải về file mẫu Excel chuẩn của Socialchoice.
3. Điền hàng chục bài viết gồm: Tiêu đề, Caption, Ngày giờ đăng, Kênh phân phối, Link ảnh/video.
4. Tải file lên: Hệ thống kiểm tra hợp lệ toàn bộ dữ liệu, chống lỗi giờ đăng và nhập toàn bộ thành các bản nháp an toàn.`,
            },
        ],
    },
    {
        id: 'ai-and-assets',
        title: '5. Trợ lý AI & Kho tài nguyên',
        icon: Sparkle,
        badge: 'Thông minh',
        description: 'Tận dụng trí tuệ nhân tạo để viết caption hay hơn và quản lý kho hình ảnh tập trung.',
        articles: [
            {
                id: 'ai-agent-chat',
                title: 'AI Agent Chat & Trợ lý viết bài',
                content: `Tại menu **AI Agent Chat** hoặc nút **"Trợ lý AI"** ngay trong Studio:
- **Biến đổi văn phong**: Chuyển bài viết nghiêm túc sang phong cách hài hước, kích thích tò mò, hoặc chuyên gia uy tín.
- **Tạo hook & Tiêu đề thu hút**: Đề xuất 5 dòng mở đầu giữ chân người đọc trong 3 giây đầu tiên.
- **Tạo CTA (Kêu gọi hành động)**: Tối ưu lời kêu gọi để tăng tỷ lệ comment, inbox hoặc click link.
- Hỗ trợ kết nối API trực tiếp (OpenRouter, Gemini, OpenAI) giúp bạn kiểm soát 100% chi phí AI mà không bị phụ thuộc.`,
            },
            {
                id: 'media-library',
                title: 'Kho tài nguyên Media Library',
                content: `Tập hợp hình ảnh và video dùng chung của tất cả các thương hiệu:
- Tải lên ảnh sản phẩm chất lượng cao, banner khuyến mại, video ngắn.
- Dễ dàng chèn media vào bài viết chỉ bằng 1 thao tác chọn trong Media Library.
- Hỗ trợ lưu trữ cục bộ hoặc đồng bộ đám mây Cloudflare R2 tốc độ cao, hoàn toàn miễn phí.`,
            },
        ],
    },
    {
        id: 'analytics-and-pricing',
        title: '6. Thống kê & Gói cước',
        icon: ChartLineUp,
        badge: 'Đo lường',
        description: 'Đo lường hiệu quả bài viết thực tế và tìm hiểu chính sách gói cước linh hoạt.',
        articles: [
            {
                id: 'analytics-tracking',
                title: 'Thống kê & Đo lường hiệu quả bài viết',
                content: `Tại trang **Analytics**:
- Theo dõi số lượng bài đăng thành công theo ngày/tuần/tháng.
- Thống kê lượt tiếp cận (Reach), tương tác (Engagement), lượt thích và bình luận trên Facebook Page.
- Đánh giá trụ cột nội dung nào mang lại nhiều tương tác nhất để tối ưu hóa chiến lược trong tương lai.`,
            },
            {
                id: 'pricing-and-editions',
                title: 'Mô hình Gói cước: Free Forever & Pro',
                content: `Socialchoice duy trì mô hình định giá công bằng và bền vững:

- **Free Forever (Miễn phí vĩnh viễn)**:
  - 1 Thương hiệu, kết nối 3 kênh mạng xã hội.
  - 15 bài đăng/tháng.
  - Hạn mức lưu trữ Cloudflare R2: **1GB dung lượng**.
- **7-Day Pro Kickstart**:
  - Dành cho người dùng mới trải nghiệm không giới hạn tính năng cao cấp trong 7 ngày đầu.
- **Starter (99.000đ/tháng)**:
  - 2 Thương hiệu, 10 kênh mạng xã hội, 60 bài đăng/tháng, **5GB Cloudflare R2**.
- **Pro (199.000đ/tháng)**:
  - 5 Thương hiệu, 25 kênh mạng xã hội, không giới hạn bài đăng, **25GB Cloudflare R2**, đầy đủ tính năng AI và Chiến dịch.
- **Business (399.000đ/tháng)**:
  - 15 Thương hiệu, không giới hạn kênh, **100GB Cloudflare R2**, hỗ trợ ưu tiên.`,
            },
            {
                id: 'future-roadmap',
                title: 'Lộ trình tính năng sắp ra mắt',
                content: `Những tính năng đang được phát triển để phục vụ nhu cầu kinh doanh tại Việt Nam:
1. **Comment-to-Inbox (Auto-reply & Auto-DM)**: Tự động trả lời comment và nhắn tin inbox riêng khi khách hàng gõ từ khóa (giá, inbox, tư vấn) qua Meta Private Replies API.
2. **TikTok Shop & Shopee Catalog Sync**: Tự động đồng bộ sản phẩm và link tiếp thị liên kết (Affiliate).
3. **Zalo Official Account (Zalo OA)**: Đăng bài và gửi tin Broadcast Zalo chính thống.
4. **Ứng dụng Desktop App (Tauri 2)**: Chạy mượt mà, lưu trữ dữ liệu an toàn trên máy tính cá nhân.`,
            },
        ],
    },
];

export default function Docs() {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();

    const initialSection = searchParams.get('section') || DOC_SECTIONS[0].id;
    const initialArticle = searchParams.get('article') || DOC_SECTIONS[0].articles[0].id;

    const [activeSectionId, setActiveSectionId] = useState(initialSection);
    const [activeArticleId, setActiveArticleId] = useState(initialArticle);
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedText, setCopiedText] = useState(null);

    // Sync state with URL params
    const selectArticle = (sectionId, articleId) => {
        setActiveSectionId(sectionId);
        setActiveArticleId(articleId);
        setSearchParams({ section: sectionId, article: articleId }, { replace: true });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Find current active section & article
    const currentSection = useMemo(() => {
        return DOC_SECTIONS.find((s) => s.id === activeSectionId) || DOC_SECTIONS[0];
    }, [activeSectionId]);

    const currentArticle = useMemo(() => {
        return currentSection.articles.find((a) => a.id === activeArticleId) || currentSection.articles[0];
    }, [currentSection, activeArticleId]);

    // Search filter across all sections & articles
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return null;
        const q = searchQuery.toLowerCase().trim();
        const results = [];
        for (const sec of DOC_SECTIONS) {
            for (const art of sec.articles) {
                if (
                    art.title.toLowerCase().includes(q) ||
                    art.content.toLowerCase().includes(q) ||
                    sec.title.toLowerCase().includes(q)
                ) {
                    results.push({
                        section: sec,
                        article: art,
                    });
                }
            }
        }
        return results;
    }, [searchQuery]);

    const copyShareLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        setCopiedText('link');
        setTimeout(() => setCopiedText(null), 2000);
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-body">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
                        <img
                            src="/socialchoice-logo.png"
                            alt="Socialchoice"
                            className="h-7 w-auto object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                        <span className="font-heading font-bold text-base sm:text-lg tracking-tight text-foreground group-hover:text-brand-ink transition">
                            Socialchoice
                        </span>
                    </Link>
                    <span className="text-muted-foreground/60 hidden sm:inline">/</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="px-2 py-0.5 rounded-md bg-brand/20 border border-brand-dark/30 text-brand-ink font-semibold text-[11px] shrink-0">
                            DOCS
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground truncate hidden md:inline">
                            Trung tâm Hướng dẫn & Tính năng
                        </span>
                    </div>
                </div>

                {/* Search Bar in Header */}
                <div className="flex-1 max-w-md relative hidden sm:block">
                    <MagnifyingGlass
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm tính năng, UTM, first comment, tiktok..."
                        className="w-full h-8.5 rounded-xl border border-border bg-surface/80 pl-9 pr-3 text-xs outline-none transition focus:border-brand-dark focus:ring-1 focus:ring-brand-dark"
                    />
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <Link
                        to="/"
                        className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-surface text-xs font-semibold text-foreground transition"
                    >
                        <span>Trang chủ</span>
                    </Link>
                    <Link
                        to="/app"
                        className="btn-skew text-xs px-3.5 py-1.5 flex items-center gap-1.5"
                    >
                        <span>Vào Web App</span>
                        <ArrowRight size={13} weight="bold" />
                    </Link>
                </div>
            </header>

            {/* Mobile Search Bar */}
            <div className="p-3 border-b border-border sm:hidden bg-card">
                <div className="relative">
                    <MagnifyingGlass
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm tính năng trong docs..."
                        className="w-full h-9 rounded-xl border border-border bg-surface pl-9 pr-3 text-xs outline-none focus:border-brand-dark"
                    />
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
                {/* Left Sidebar Table of Contents */}
                <aside className="w-full md:w-72 lg:w-80 shrink-0 border-b md:border-b-0 md:border-r border-border/80 bg-surface/40 p-4 sm:p-5 md:min-h-[calc(100vh-60px)] md:sticky md:top-[60px] md:max-h-[calc(100vh-60px)] md:overflow-y-auto scroll-slim">
                    {/* Search Results Mode */}
                    {searchResults ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                                <span>Kết quả ({searchResults.length})</span>
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="text-brand-ink hover:underline cursor-pointer"
                                >
                                    Xóa tìm kiếm
                                </button>
                            </div>
                            {searchResults.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-4">
                                    Không tìm thấy bài viết nào phù hợp với từ khóa "{searchQuery}".
                                </p>
                            ) : (
                                <div className="space-y-1.5">
                                    {searchResults.map((res) => (
                                        <button
                                            key={res.article.id}
                                            type="button"
                                            onClick={() => {
                                                selectArticle(res.section.id, res.article.id);
                                                setSearchQuery('');
                                            }}
                                            className="w-full text-left p-2.5 rounded-xl border border-border/60 bg-card hover:border-brand-dark hover:bg-brand/10 transition cursor-pointer"
                                        >
                                            <p className="text-xs font-bold text-foreground">
                                                {res.article.title}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                {res.section.title}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Normal Section Navigation */
                        <nav className="space-y-6">
                            {DOC_SECTIONS.map((section) => {
                                const SectionIcon = section.icon;
                                const isSectionActive = section.id === activeSectionId;

                                return (
                                    <div key={section.id} className="space-y-1.5">
                                        <div className="flex items-center justify-between px-2 py-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <SectionIcon
                                                    size={16}
                                                    weight="duotone"
                                                    className="text-brand-dark shrink-0"
                                                />
                                                <span className="font-heading font-bold text-xs uppercase tracking-wider text-foreground truncate">
                                                    {section.title}
                                                </span>
                                            </div>
                                            {section.badge && (
                                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-muted text-muted-foreground shrink-0">
                                                    {section.badge}
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-0.5 pl-2 border-l-2 border-border/60">
                                            {section.articles.map((article) => {
                                                const isArticleActive =
                                                    isSectionActive && article.id === activeArticleId;

                                                return (
                                                    <button
                                                        key={article.id}
                                                        type="button"
                                                        onClick={() => selectArticle(section.id, article.id)}
                                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-between gap-2 ${
                                                            isArticleActive
                                                                ? 'bg-brand text-brand-ink font-bold border border-brand-dark shadow-xs'
                                                                : 'text-muted-foreground hover:text-foreground hover:bg-surface font-medium'
                                                        }`}
                                                    >
                                                        <span className="truncate">{article.title}</span>
                                                        {isArticleActive && (
                                                            <CaretRight size={12} weight="bold" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </nav>
                    )}
                </aside>

                {/* Right Content Canvas */}
                <main className="flex-1 p-5 sm:p-8 lg:p-10 max-w-4xl space-y-8">
                    {/* Breadcrumbs */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Link to="/" className="hover:text-foreground">
                            Trang chủ
                        </Link>
                        <span>/</span>
                        <span>Docs</span>
                        <span>/</span>
                        <span className="text-foreground font-semibold">
                            {currentSection.title}
                        </span>
                    </div>

                    {/* Article Header Card */}
                    <div className="p-6 sm:p-8 bg-card border border-border rounded-3xl space-y-4 relative overflow-hidden shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand/20 border border-brand-dark/30 text-brand-ink font-semibold text-xs">
                                <currentSection.icon size={15} weight="duotone" />
                                <span>{currentSection.title}</span>
                            </span>

                            <button
                                type="button"
                                onClick={copyShareLink}
                                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border bg-surface px-2.5 py-1 rounded-lg transition cursor-pointer"
                                title="Sao chép liên kết bài hướng dẫn này"
                            >
                                {copiedText === 'link' ? (
                                    <>
                                        <Check size={13} className="text-emerald-600" />
                                        <span className="text-emerald-600 font-semibold">Đã chép link</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={13} />
                                        <span>Chia sẻ</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground tracking-tight">
                            {currentArticle.title}
                        </h1>

                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            {currentSection.description}
                        </p>
                    </div>

                    {/* Article Body Content */}
                    <article className="space-y-6 text-sm text-foreground/90 leading-relaxed font-body">
                        {currentArticle.content.split('\n\n').map((paragraph, idx) => {
                            // Table parsing
                            if (paragraph.includes('|') && paragraph.includes('---')) {
                                const rows = paragraph.trim().split('\n').filter(Boolean);
                                const headers = rows[0].split('|').map((c) => c.trim()).filter(Boolean);
                                const dataRows = rows.slice(2).map((r) => r.split('|').map((c) => c.trim()).filter(Boolean));

                                return (
                                    <div key={idx} className="my-6 overflow-x-auto rounded-xl border border-border bg-card">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-surface/80 border-b border-border font-bold text-foreground">
                                                <tr>
                                                    {headers.map((h, i) => (
                                                        <th key={i} className="p-3">
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/60">
                                                {dataRows.map((row, ri) => (
                                                    <tr key={ri} className="hover:bg-surface/40 transition">
                                                        {row.map((cell, ci) => (
                                                            <td key={ci} className="p-3 text-muted-foreground">
                                                                {cell}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            }

                            // Code block parsing
                            if (paragraph.startsWith('```')) {
                                const cleanCode = paragraph.replace(/```[a-z]*\n?/g, '').trim();
                                return (
                                    <pre
                                        key={idx}
                                        className="my-5 p-4 rounded-xl bg-zinc-900 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800"
                                    >
                                        <code>{cleanCode}</code>
                                    </pre>
                                );
                            }

                            // Bullet lists
                            if (paragraph.includes('- ') || paragraph.includes('1. ')) {
                                const lines = paragraph.split('\n');
                                return (
                                    <ul key={idx} className="space-y-2 pl-4 list-disc marker:text-brand-dark">
                                        {lines.map((line, li) => {
                                            const cleanLine = line.replace(/^[-*]|\d+\.\s*/, '').trim();
                                            return (
                                                <li key={li} className="text-foreground/90 leading-relaxed">
                                                    <span
                                                        dangerouslySetInnerHTML={{
                                                            __html: cleanLine
                                                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                                .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">$1</code>'),
                                                        }}
                                                    />
                                                </li>
                                            );
                                        })}
                                    </ul>
                                );
                            }

                            // Standard Paragraph
                            return (
                                <p
                                    key={idx}
                                    className="leading-relaxed"
                                    dangerouslySetInnerHTML={{
                                        __html: paragraph
                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">$1</code>'),
                                    }}
                                />
                            );
                        })}
                    </article>

                    {/* Quick Interactive Actions Banner */}
                    <div className="p-5 sm:p-6 bg-surface border border-border/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-foreground">
                                Trải nghiệm ngay tính năng này trên Socialchoice
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                Mở studio hoặc không gian làm việc để thực hành theo tài liệu.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Link
                                to="/create"
                                className="btn-skew text-xs px-3.5 py-1.5 flex items-center gap-1.5"
                            >
                                <Lightning size={14} weight="fill" />
                                <span>Thử tạo bài viết</span>
                            </Link>
                            <Link
                                to="/strategy/campaigns"
                                className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-surface text-xs font-semibold text-foreground transition"
                            >
                                <span>Xem Chiến dịch</span>
                            </Link>
                        </div>
                    </div>

                    {/* Pagination Previous / Next */}
                    <div className="pt-6 border-t border-border/60 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link
                                to="/"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft size={14} />
                                <span>Trang chủ</span>
                            </Link>
                            <span className="text-muted-foreground/40">·</span>
                            <Link
                                to="/app"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:underline"
                            >
                                <span>Vào Dashboard</span>
                            </Link>
                        </div>

                        <Link
                            to="/pricing"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-ink hover:underline"
                        >
                            <span>Xem các gói cước & tính năng</span>
                            <ArrowRight size={14} />
                        </Link>
                    </div>
                </main>
            </div>
        </div>
    );
}
