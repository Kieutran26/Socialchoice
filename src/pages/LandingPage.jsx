import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Sparkle,
    PaperPlaneTilt,
    CalendarBlank,
    LinkSimple,
    Check,
    CheckCircle,
    CaretDown,
    CaretUp,
    ArrowRight,
    ShieldCheck,
    ChartLineUp,
    Lightning,
    ChatCircleDots,
    SlidersHorizontal,
    ImageSquare,
    Globe,
    CheckSquare,
    Star,
    DeviceMobile,
    Tag,
    Clock,
    X,
} from '@phosphor-icons/react';
import PlatformLogo from '@/components/composer/PlatformLogo';

export default function LandingPage() {
    // Pricing cycle state: 'monthly' | 'yearly'
    const [billingCycle, setBillingCycle] = useState('monthly');
    // FAQ expanded indices
    const [expandedFaq, setExpandedFaq] = useState(0);

    const faqs = [
        {
            q: 'Socialchoice hỗ trợ xuất bản lên những nền tảng mạng xã hội nào?',
            a: 'Hiện tại Socialchoice hỗ trợ kết nối và tự động xuất bản đồng thời lên 6 nền tảng lớn nhất: Facebook (Trang & Nhóm), Instagram, LinkedIn, TikTok, Threads và X (Twitter). Mỗi nền tảng đều có bộ quy chuẩn riêng về giới hạn ký tự và tỉ lệ media được hệ thống tự động kiểm tra.',
        },
        {
            q: 'Việc kết nối tài khoản có an toàn không? Có cần nhập mật khẩu không?',
            a: 'Tuyệt đối an toàn. Socialchoice sử dụng giao thức xác thực OAuth 2.0 chính thức từ Meta, LinkedIn, X và TikTok. Bạn chỉ cần đăng nhập trực tiếp trên trang xác thực của nền tảng, Socialchoice không bao giờ nhìn thấy hoặc lưu trữ mật khẩu mạng xã hội của bạn.',
        },
        {
            q: 'Tính năng "Tuỳ chỉnh riêng từng kênh" hoạt động như thế nào?',
            a: 'Khi bạn soạn thảo một bài viết chung, hệ thống cho phép bạn bật công tắc "Tuỳ chỉnh riêng" cho bất kỳ kênh nào. Ví dụ: Bạn có thể giữ bài viết dài trên LinkedIn, nhưng rút gọn lại dưới 280 ký tự cho X, hoặc thêm các thẻ hashtag đặc thù cho Instagram mà không làm ảnh hưởng đến nội dung của các kênh khác.',
        },
        {
            q: 'Hệ thống đo lường lượt nhấp (Clicks) qua link UTM ra sao?',
            a: 'Khi bạn gắn liên kết trong bài viết, công cụ UTM Builder của Socialchoice sẽ tự động sinh mã nguồn theo kênh ({platform}). Đồng thời hệ thống tạo đường dẫn rút gọn thông minh sc.link/r/.... Mỗi khi người dùng bấm vào liên kết, hệ thống sẽ ghi nhận 1 lượt click thời gian thực và tự động chuyển hướng người dùng đến trang đích an toàn.',
        },
        {
            q: 'Trợ lý AI trên Socialchoice có những tính năng gì nổi bật?',
            a: 'Trợ lý AI hỗ trợ bạn sáng tạo nội dung từ đầu hoặc nâng cấp bài viết có sẵn: gợi ý sườn bài viết theo chủ đề, viết lại mở bài (hook) cuốn hút, tối ưu độ dài cho X/Twitter, tự động tạo hashtag theo thương hiệu và hỗ trợ tạo hình ảnh minh họa bằng AI.',
        },
        {
            q: 'Tôi có thể dùng thử miễn phí và nâng cấp gói sau được không?',
            a: 'Hoàn toàn được. Bạn có thể bắt đầu ngay với Gói Miễn phí (Starter) để trải nghiệm toàn bộ quy trình soạn thảo, gắn link UTM và lên lịch đăng bài. Bạn có thể nâng cấp hoặc hủy gói bất kỳ lúc nào mà không gặp bất kỳ ràng buộc nào.',
        },
    ];

    const platforms = [
        { id: 'facebook', name: 'Facebook', desc: 'Trang & Nhóm' },
        { id: 'instagram', name: 'Instagram', desc: 'Reels & Bài viết' },
        { id: 'linkedin', name: 'LinkedIn', desc: 'Cá nhân & Công ty' },
        { id: 'tiktok', name: 'TikTok', desc: 'Video ngắn viral' },
        { id: 'threads', name: 'Threads', desc: 'Hội thoại nhanh' },
        { id: 'x', name: 'X / Twitter', desc: 'Cập nhật tức thì' },
    ];

    const strengths = [
        {
            icon: Lightning,
            title: 'Tiết kiệm 80% thời gian',
            desc: 'Soạn thảo một lần, phân phối đồng loạt lên 6 mạng xã hội lớn nhất. Không còn phải chuyển đổi qua lại giữa hàng loạt ứng dụng.',
            highlight: 'Nhanh gấp 5 lần',
        },
        {
            icon: SlidersHorizontal,
            title: 'Trụ cột & Góc khai thác',
            desc: 'Quản trị nội dung theo chiến lược phễu (Content Pillars & Angles). Đảm bảo thương hiệu của bạn luôn truyền tải thông điệp nhất quán và có chiều sâu.',
            highlight: 'Chiến lược bài bản',
        },
        {
            icon: LinkSimple,
            title: 'Đo lường Traffic & UTM',
            desc: 'Tự động gắn thẻ tham số utm_source={platform} và rút gọn link sc.link. Thống kê số lượt nhấp chuột theo từng bài viết và chiến dịch trong thời gian thực.',
            highlight: 'Dữ liệu chuyển đổi thật',
        },
        {
            icon: Sparkle,
            title: 'Trợ lý AI chuyên sâu',
            desc: 'Được tích hợp sẵn các mô hình AI tiên tiến: gợi ý dàn ý, viết lại tiêu đề cuốn hút, rút gọn văn bản phù hợp từng kênh và tự động gắn hashtag chuẩn.',
            highlight: 'Sáng tạo không giới hạn',
        },
        {
            icon: DeviceMobile,
            title: 'Mô phỏng Feed trực quan',
            desc: 'Xem trước bài viết chính xác 100% như trên giao diện thật của Facebook, Instagram, LinkedIn, TikTok trước khi bấm xuất bản.',
            highlight: 'Tránh lỗi hiển thị',
        },
        {
            icon: ShieldCheck,
            title: 'Bảo mật chuẩn Doanh nghiệp',
            desc: 'Kết nối an toàn qua giao thức OAuth 2.0 chính thức. Mã hoá Access Token nhiều lớp, không bao giờ yêu cầu hoặc lưu trữ mật khẩu của bạn.',
            highlight: 'An toàn tuyệt đối',
        },
    ];

    const features = [
        {
            tag: 'Studio Soạn thảo',
            title: 'Trình soạn thảo đa kênh linh hoạt bậc nhất',
            desc: 'Viết nội dung chung hoặc tuỳ chỉnh chuyên sâu cho từng mạng xã hội. Hỗ trợ in đậm và gạch chân bằng Unicode native hiển thị sắc nét trên mọi bảng tin.',
            bullets: [
                'Tùy chỉnh caption độc lập cho từng kênh khi cần',
                'Định dạng Unicode in đậm, gạch chân không bị lỗi font',
                'Tự động kiểm tra độ dài ký tự tối đa của từng nền tảng',
                'Quản lý chữ ký thương hiệu và lời kêu gọi hành động tự động',
            ],
            imageBadge: 'Studio Composer',
        },
        {
            tag: 'Kế hoạch phát sóng',
            title: 'Lịch nội dung trực quan & Chuỗi bình luận tự động',
            desc: 'Bao quát toàn bộ chiến dịch marketing theo chế độ xem lịch tháng, tuần và ngày. Lên lịch trước nhiều tuần với múi giờ chuẩn GMT+7.',
            bullets: [
                'Kéo thả và xem lịch phát sóng trực quan đa kênh',
                'Tự động đăng bình luận đầu tiên (Comment Chain / First Comment) chứa link',
                'Theo dõi trạng thái: Nháp, Đã lên lịch, Đã xuất bản',
                'Cảnh báo thông minh trước khi đến giờ phát sóng',
            ],
            imageBadge: 'Content Calendar',
        },
        {
            tag: 'Chiến lược & Chuyển đổi',
            title: 'Ma trận chiến lược & Đo lường UTM khép kín',
            desc: 'Định hình trụ cột nội dung, phân bổ tỷ trọng theo mục tiêu kinh doanh và đo lường chính xác từng lượt truy cập đến từ kênh nào.',
            bullets: [
                'Phân loại bài viết theo Trụ cột (Pillars) và Góc khai thác (Angles)',
                'Bộ sinh liên kết UTM thông minh với biến động {platform}',
                'Rút gọn link ngắn gọn, chuyên nghiệp, đếm click chính xác',
                'Báo cáo hiệu quả nội dung đa chiều và tỷ lệ tương tác',
            ],
            imageBadge: 'Strategy Matrix',
        },
    ];

    return (
        <div className="min-h-screen bg-[#fafafa] text-zinc-900 font-body selection:bg-brand-400 selection:text-zinc-900">
            {/* STICKY TOP NAVIGATION BAR */}
            <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Brand Logo */}
                    <Link to="/" className="flex items-center gap-2.5">
                        <img
                            src="/socialchoice-logo.png"
                            alt="Socialchoice"
                            className="h-8 w-auto object-contain"
                        />
                        <span className="font-heading text-lg font-bold tracking-tight text-zinc-950">
                            Socialchoice
                        </span>
                    </Link>

                    {/* Navigation Links */}
                    <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-zinc-600">
                        <a href="#intro" className="hover:text-zinc-950 transition">
                            Giới thiệu
                        </a>
                        <a href="#strengths" className="hover:text-zinc-950 transition">
                            Điểm mạnh
                        </a>
                        <a href="#features" className="hover:text-zinc-950 transition">
                            Tính năng
                        </a>
                        <a href="#pricing" className="hover:text-zinc-950 transition">
                            Bảng giá
                        </a>
                        <a href="#faq" className="hover:text-zinc-950 transition">
                            Hỏi đáp
                        </a>
                    </nav>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                        <Link
                            to="/overview"
                            className="hidden sm:inline-flex h-9 items-center rounded-lg border border-zinc-200 bg-white px-3.5 text-[13px] font-medium text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950"
                        >
                            Vào Dashboard
                        </Link>
                        <Link
                            to="/create"
                            className="btn-skew flex h-9 items-center gap-1.5 rounded-lg bg-brand-400 px-4 text-[13px] font-semibold text-zinc-950 shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)] transition hover:bg-brand-300"
                        >
                            <PaperPlaneTilt size={15} weight="fill" />
                            <span>Tạo bài viết ngay</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* HERO SECTION */}
            <section id="intro" className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
                {/* Subtle background glow */}
                <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[720px] rounded-full bg-brand-200/40 blur-[120px] opacity-60" />

                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
                    {/* Badge Pill */}
                    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/90 bg-white px-3.5 py-1.5 text-[12px] font-medium text-zinc-700 shadow-2xs">
                        <Sparkle size={14} weight="fill" className="text-amber-500" />
                        <span>Nền tảng phân phối & tối ưu nội dung đa kênh số 1 cho Creator & Doanh nghiệp</span>
                    </div>

                    {/* Main Headline */}
                    <h1 className="mt-6 font-heading text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl max-w-4xl mx-auto leading-[1.15]">
                        Tối ưu hóa & Phân phối nội dung đa kênh tự động với{' '}
                        <span className="relative whitespace-nowrap">
                            <span className="relative z-10 text-zinc-950 underline decoration-brand-400 decoration-wavy decoration-2">
                                AI thông minh
                            </span>
                        </span>
                    </h1>

                    {/* Subtitle */}
                    <p className="mt-6 text-sm sm:text-base lg:text-lg text-zinc-600 max-w-2xl mx-auto leading-relaxed">
                        Soạn thảo một lần, xuất bản chuẩn xác lên <strong>Facebook, Instagram, LinkedIn, TikTok, Threads, X</strong>. Quản trị theo Trụ cột & Góc khai thác, tự động gắn link UTM và theo dõi chuyển đổi thời gian thực.
                    </p>

                    {/* CTAs */}
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                        <Link
                            to="/create"
                            className="btn-skew flex h-11 items-center gap-2 rounded-xl bg-brand-400 px-6 text-[14px] font-semibold text-zinc-950 shadow-[inset_0_-2px_0_rgba(0,0,0,0.1)] transition hover:bg-brand-300"
                        >
                            <PaperPlaneTilt size={17} weight="fill" />
                            <span>Bắt đầu trải nghiệm miễn phí</span>
                        </Link>
                        <a
                            href="#features"
                            className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-[14px] font-medium text-zinc-800 transition hover:bg-zinc-50 hover:border-zinc-300 shadow-2xs"
                        >
                            <span>Khám phá tính năng</span>
                            <ArrowRight size={15} />
                        </a>
                    </div>

                    {/* Platform Avatars Strip */}
                    <div className="mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 border-t border-zinc-200/60 max-w-3xl mx-auto">
                        <span className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
                            Kết nối mượt mà với:
                        </span>
                        <div className="flex flex-wrap items-center gap-3">
                            {platforms.map((p) => (
                                <div
                                    key={p.id}
                                    className="flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white px-3 py-1 shadow-2xs"
                                >
                                    <PlatformLogo platform={p.id} size={20} />
                                    <span className="text-[12px] font-medium text-zinc-800">{p.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hero Showcase Mockup */}
                    <div className="mt-12 sm:mt-16 mx-auto max-w-5xl overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
                        {/* Mockup Header Bar */}
                        <div className="flex items-center justify-between border-b border-zinc-200/70 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
                            <div className="flex items-center gap-2">
                                <span className="size-3 rounded-full bg-red-400" />
                                <span className="size-3 rounded-full bg-amber-400" />
                                <span className="size-3 rounded-full bg-emerald-400" />
                                <span className="ml-2 font-mono text-[11px] text-zinc-400">socialchoice.site/create</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                <span>Hệ thống sẵn sàng xuất bản</span>
                            </div>
                        </div>

                        {/* Mockup Body Preview */}
                        <div className="p-6 sm:p-8 bg-white grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                            <div className="lg:col-span-7 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                        Studio Soạn thảo Đa Kênh
                                    </span>
                                    <span className="font-mono text-xs text-zinc-400">245 / 2.200 ký tự</span>
                                </div>
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
                                    <p className="text-[14px] leading-relaxed text-zinc-800 font-medium">
                                        🚀 Ra mắt phiên bản mới: Tối ưu hóa phân phối nội dung đa kênh tự động!
                                    </p>
                                    <p className="text-[13px] text-zinc-600 leading-relaxed">
                                        Viết 1 lần — xuất bản chuẩn hóa trên toàn bộ kênh xã hội của doanh nghiệp. Đã tích hợp sẵn UTM Tracking và phân tích số liệu chuyển đổi tức thì.
                                    </p>
                                    <div className="rounded-lg bg-white border border-zinc-200 p-2 text-xs font-mono text-brand-700">
                                        🔗 https://sc.link/r/launch26 (Theo dõi 1.420 clicks)
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 pt-2">
                                    <span className="rounded-md bg-brand-50 px-2.5 py-1 text-xs font-semibold text-zinc-900 border border-brand-300">
                                        ✨ Trợ lý AI: Sẵn sàng
                                    </span>
                                    <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
                                        Trụ cột: Giáo dục & Chia sẻ
                                    </span>
                                    <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
                                        Góc: Case study thực tế
                                    </span>
                                </div>
                            </div>

                            <div className="lg:col-span-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-semibold text-zinc-700">Mô phỏng Feed trực tiếp</span>
                                        <span className="text-[11px] text-zinc-400">Facebook & LinkedIn</span>
                                    </div>
                                    <div className="rounded-lg border border-zinc-200 bg-white p-3 space-y-2 shadow-2xs">
                                        <div className="flex items-center gap-2">
                                            <div className="size-8 rounded-full bg-zinc-900 text-white grid place-items-center text-xs font-bold">
                                                SC
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-zinc-900">Socialchoice Vietnam</div>
                                                <div className="text-[10px] text-zinc-400">Vừa xong · 🌐 Công khai</div>
                                            </div>
                                        </div>
                                        <p className="text-[12px] text-zinc-700 line-clamp-3">
                                            🚀 Ra mắt phiên bản mới: Tối ưu hóa phân phối nội dung đa kênh tự động! Viết 1 lần — xuất bản chuẩn hóa...
                                        </p>
                                        <div className="h-24 rounded bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-xs text-zinc-400">
                                            <ImageSquare size={24} className="opacity-40" />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-zinc-200 mt-4 flex items-center justify-between text-xs">
                                    <span className="text-zinc-500 font-medium">Lên lịch: Hôm nay lúc 20:00</span>
                                    <span className="text-emerald-600 font-semibold">5 kênh đã chọn</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ĐIỂM MẠNH (STRENGTHS / VALUE PROPOSITIONS) */}
            <section id="strengths" className="py-20 bg-white border-y border-zinc-200/80">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-brand-600">
                            Giá trị vượt trội
                        </span>
                        <h2 className="mt-2 font-heading text-2xl sm:text-4xl font-bold tracking-tight text-zinc-950">
                            Tại sao các đội ngũ Marketing hàng đầu tin dùng Socialchoice?
                        </h2>
                        <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed">
                            Giải quyết dứt điểm sự phân mảnh trong quản lý mạng xã hội, giúp bạn chuyển đổi từ việc đăng bài thủ công sang một hệ thống phân phối nội dung có chiến lược và đo lường được.
                        </p>
                    </div>

                    <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {strengths.map((item, idx) => {
                            const IconComponent = item.icon;
                            return (
                                <div
                                    key={idx}
                                    className="group relative rounded-2xl border border-zinc-200/90 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.08)] hover:border-zinc-300 transition-all duration-300"
                                >
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="grid size-12 place-items-center rounded-xl bg-brand-50 text-zinc-950 border border-brand-200 group-hover:scale-105 transition">
                                            <IconComponent size={24} weight="duotone" className="text-zinc-900" />
                                        </div>
                                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
                                            {item.highlight}
                                        </span>
                                    </div>
                                    <h3 className="font-heading text-lg font-bold text-zinc-950">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2.5 text-[13px] leading-relaxed text-zinc-600">
                                        {item.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* TÍNH NĂNG CỐT LÕI (FEATURES DEEP-DIVE) */}
            <section id="features" className="py-20 sm:py-28 bg-[#fafafa]">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-24">
                    <div className="text-center max-w-3xl mx-auto">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-brand-600">
                            Bộ công cụ toàn diện
                        </span>
                        <h2 className="mt-2 font-heading text-2xl sm:text-4xl font-bold tracking-tight text-zinc-950">
                            Mọi tính năng cần thiết để làm chủ nội dung đa kênh
                        </h2>
                        <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed">
                            Được thiết kế từ bài toán thực tế của các nhà sáng tạo nội dung, doanh nghiệp SMEs và Agency tiếp thị số.
                        </p>
                    </div>

                    {features.map((feat, idx) => (
                        <div
                            key={idx}
                            className={`grid grid-cols-1 lg:grid-cols-12 gap-10 items-center ${idx % 2 === 1 ? 'lg:flex-row-reverse' : ''
                                }`}
                        >
                            <div className={`lg:col-span-6 space-y-5 ${idx % 2 === 1 ? 'lg:order-2' : ''}`}>
                                <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-950 border border-brand-300">
                                    {feat.tag}
                                </span>
                                <h3 className="font-heading text-2xl sm:text-3xl font-bold text-zinc-950 leading-snug">
                                    {feat.title}
                                </h3>
                                <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
                                    {feat.desc}
                                </p>
                                <ul className="space-y-3 pt-2">
                                    {feat.bullets.map((b, bIdx) => (
                                        <li key={bIdx} className="flex items-start gap-2.5 text-[13px] text-zinc-700">
                                            <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-emerald-500" />
                                            <span>{b}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="pt-2">
                                    <Link
                                        to="/create"
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 underline underline-offset-4 hover:text-brand-600 transition"
                                    >
                                        <span>Trải nghiệm ngay trong Studio</span>
                                        <ArrowRight size={14} />
                                    </Link>
                                </div>
                            </div>

                            <div className={`lg:col-span-6 ${idx % 2 === 1 ? 'lg:order-1' : ''}`}>
                                <div className="relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                    <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-5">
                                        <span className="font-mono text-xs font-semibold text-zinc-500">
                                            {feat.imageBadge}
                                        </span>
                                        <span className="text-[11px] text-zinc-400">Active Module</span>
                                    </div>
                                    {/* Visual representation card */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-xl bg-zinc-900 text-white grid place-items-center font-bold text-sm">
                                                0{idx + 1}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-zinc-900">{feat.title}</div>
                                                <div className="text-xs text-zinc-500">Quy trình tự động hoá</div>
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-zinc-50 border border-zinc-200/70 p-4 space-y-2 font-mono text-xs text-zinc-700">
                                            <div className="flex justify-between text-zinc-500">
                                                <span>✓ Trạng thái dữ liệu</span>
                                                <span className="text-emerald-600 font-semibold">Hoạt động bình thường</span>
                                            </div>
                                            <div className="flex justify-between text-zinc-500">
                                                <span>✓ Mạng xã hội đích</span>
                                                <span>FB, IG, LI, TT, TH, X</span>
                                            </div>
                                            <div className="flex justify-between text-zinc-500">
                                                <span>✓ Đồng bộ thời gian thực</span>
                                                <span className="text-brand-700 font-semibold">100% Tự động</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* BẢNG GIÁ (PRICING) */}
            <section id="pricing" className="py-20 sm:py-28 bg-white border-y border-zinc-200/80">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-brand-600">
                            Bảng giá minh bạch
                        </span>
                        <h2 className="mt-2 font-heading text-2xl sm:text-4xl font-bold tracking-tight text-zinc-950">
                            Đầu tư xứng đáng cho sự phát triển kênh của bạn
                        </h2>
                        <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed">
                            Chọn gói dịch vụ phù hợp nhất với nhu cầu của cá nhân, đội ngũ hoặc doanh nghiệp bạn. Không phí ẩn, linh hoạt nâng cấp.
                        </p>

                        {/* Billing Cycle Switcher */}
                        <div className="mt-8 inline-flex items-center rounded-xl bg-zinc-100 p-1 border border-zinc-200">
                            <button
                                type="button"
                                onClick={() => setBillingCycle('monthly')}
                                className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${billingCycle === 'monthly'
                                        ? 'bg-white text-zinc-950 shadow-2xs'
                                        : 'text-zinc-600 hover:text-zinc-900'
                                    }`}
                            >
                                Thanh toán hàng tháng
                            </button>
                            <button
                                type="button"
                                onClick={() => setBillingCycle('yearly')}
                                className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${billingCycle === 'yearly'
                                        ? 'bg-white text-zinc-950 shadow-2xs'
                                        : 'text-zinc-600 hover:text-zinc-900'
                                    }`}
                            >
                                <span>Thanh toán theo năm</span>
                                <span className="rounded-full bg-brand-400 px-1.5 py-0.2 text-[10px] font-bold text-zinc-950">
                                    -20%
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* 3 Pricing Cards */}
                    <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                        {/* Plan 1: Starter */}
                        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-7 sm:p-8 shadow-2xs">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                                    Cá nhân
                                </span>
                                <h3 className="mt-1 font-heading text-xl font-bold text-zinc-950">
                                    Starter
                                </h3>
                                <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
                                    Phù hợp để làm quen với quy trình soạn thảo và lên lịch đa kênh.
                                </p>
                                <div className="mt-6 flex items-baseline gap-1">
                                    <span className="font-heading text-4xl font-extrabold text-zinc-950">0đ</span>
                                    <span className="text-xs text-zinc-500">/ mãi mãi</span>
                                </div>

                                <ul className="mt-7 space-y-3 border-t border-zinc-100 pt-6 text-[13px] text-zinc-700">
                                    <li className="flex items-center gap-2">
                                        <Check size={16} weight="bold" className="text-emerald-500 shrink-0" />
                                        <span>3 tài khoản mạng xã hội kết nối</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={16} weight="bold" className="text-emerald-500 shrink-0" />
                                        <span>30 bài đăng lên lịch / tháng</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={16} weight="bold" className="text-emerald-500 shrink-0" />
                                        <span>Studio soạn thảo & định dạng Unicode</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={16} weight="bold" className="text-emerald-500 shrink-0" />
                                        <span>Xem trước Mockup cơ bản</span>
                                    </li>
                                </ul>
                            </div>

                            <Link
                                to="/create"
                                className="mt-8 flex h-10 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50"
                            >
                                Bắt đầu miễn phí
                            </Link>
                        </div>

                        {/* Plan 2: Pro Creator (Highlighted) */}
                        <div className="relative flex flex-col justify-between rounded-2xl border-2 border-brand-400 bg-white p-7 sm:p-8 shadow-[0_12px_32px_-12px_rgba(255,214,49,0.35)] ring-4 ring-brand-100">
                            <span className="absolute -top-3.5 right-6 rounded-full bg-brand-400 px-3 py-1 text-[11px] font-bold text-zinc-950 uppercase tracking-wider shadow-2xs">
                                Phổ biến nhất
                            </span>

                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
                                    Chuyên nghiệp
                                </span>
                                <h3 className="mt-1 font-heading text-xl font-bold text-zinc-950">
                                    Pro Creator
                                </h3>
                                <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
                                    Dành cho Creator, Marketer và cá nhân kinh doanh muốn bứt phá lưu lượng truy cập.
                                </p>
                                <div className="mt-6 flex items-baseline gap-1">
                                    <span className="font-heading text-4xl font-extrabold text-zinc-950">
                                        {billingCycle === 'yearly' ? '239.000đ' : '299.000đ'}
                                    </span>
                                    <span className="text-xs text-zinc-500">/ tháng</span>
                                </div>

                                <ul className="mt-7 space-y-3 border-t border-zinc-100 pt-6 text-[13px] text-zinc-700">
                                    <li className="flex items-center gap-2 font-medium">
                                        <Check size={16} weight="bold" className="text-emerald-500 shrink-0" />
                                        <span>10 tài khoản mạng xã hội</span>
                                    </li>
                                    <li className="flex items-center gap-2 font-medium">
                                        <Check size={16} weight="bold" className="text-emerald-500 shrink-0" />
                                        <span>Không giới hạn bài đăng & lịch phát sóng</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={16} weight="bold" className="text-emerald-500 shrink-0" />
                                        <span>Toàn quyền Trợ lý AI (Gợi ý, viết hook, rút gọn)</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={16} weight="bold" className="text-emerald-500 shrink-0" />
                                        <span>Tự động tạo link UTM & Shortlink đếm click</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={16} weight="bold" className="text-emerald-500 shrink-0" />
                                        <span>Chiến lược theo Trụ cột & Góc khai thác</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={16} weight="bold" className="text-emerald-500 shrink-0" />
                                        <span>Chuỗi bình luận tự động (Comment Chain)</span>
                                    </li>
                                </ul>
                            </div>

                            <Link
                                to="/create"
                                className="btn-skew mt-8 flex h-10 w-full items-center justify-center rounded-xl bg-brand-400 text-xs font-semibold text-zinc-950 shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)] transition hover:bg-brand-300"
                            >
                                Trải nghiệm gói Pro ngay
                            </Link>
                        </div>

                        {/* Plan 3: Business & Agency */}
                        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-7 sm:p-8 shadow-2xs">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                                    Doanh nghiệp
                                </span>
                                <h3 className="mt-1 font-heading text-xl font-bold text-zinc-950">
                                    Business Agency
                                </h3>
                                <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
                                    Dành cho Agency và Doanh nghiệp quản lý nhiều thương hiệu và đội nhóm.
                                </p>
                                <div className="mt-6 flex items-baseline gap-1">
                                    <span className="font-heading text-4xl font-extrabold text-zinc-950">
                                        {billingCycle === 'yearly' ? '639.000đ' : '799.000đ'}
                                    </span>
                                    <span className="text-xs text-zinc-500">/ tháng</span>
                                </div>

                                <ul className="mt-7 space-y-3 border-t border-zinc-100 pt-6 text-[13px] text-zinc-700">
                                    <li className="flex items-center gap-2">
                                        <Check size={16} weight="bold" className="text-emerald-500 shrink-0" />
                                        <span>Không giới hạn tài khoản mạng xã hội</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={16} weight="bold" className="text-emerald-500 shrink-0" />
                                        <span>Quản lý nhiều Thương hiệu / Workspaces</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={16} weight="bold" className="text-emerald-500 shrink-0" />
                                        <span>Tích hợp AI cao cấp (OpenRouter, Gemini, OpenAI)</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={16} weight="bold" className="text-emerald-500 shrink-0" />
                                        <span>Thư viện media dung lượng lớn</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={16} weight="bold" className="text-emerald-500 shrink-0" />
                                        <span>Hỗ trợ ưu tiên 1-1 qua Zalo / Hotline</span>
                                    </li>
                                </ul>
                            </div>

                            <Link
                                to="/settings"
                                className="mt-8 flex h-10 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50"
                            >
                                Liên hệ tư vấn
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* CÂU HỎI THƯỜNG GẶP (FAQ) */}
            <section id="faq" className="py-20 sm:py-28 bg-[#fafafa]">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-brand-600">
                            Giải đáp thắc mắc
                        </span>
                        <h2 className="mt-2 font-heading text-2xl sm:text-4xl font-bold tracking-tight text-zinc-950">
                            Câu hỏi thường gặp
                        </h2>
                        <p className="mt-3 text-sm text-zinc-600">
                            Tất cả những thông tin bạn cần biết trước khi bắt đầu sử dụng Socialchoice.
                        </p>
                    </div>

                    <div className="mt-12 space-y-3.5">
                        {faqs.map((faq, index) => {
                            const isExpanded = expandedFaq === index;
                            return (
                                <div
                                    key={index}
                                    className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white transition shadow-2xs"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setExpandedFaq(isExpanded ? null : index)}
                                        className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-zinc-50 cursor-pointer"
                                    >
                                        <span className="font-heading text-[15px] font-semibold text-zinc-900">
                                            {faq.q}
                                        </span>
                                        <div className="grid size-7 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-500">
                                            {isExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
                                        </div>
                                    </button>
                                    {isExpanded && (
                                        <div className="border-t border-zinc-100 px-5 pb-5 pt-3 text-[13px] leading-relaxed text-zinc-600">
                                            {faq.a}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* BOTTOM CALL TO ACTION BANNER */}
            <section className="py-16 sm:py-20 bg-zinc-950 text-white relative overflow-hidden">
                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[600px] rounded-full bg-brand-400/20 blur-[130px]" />
                <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
                    <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
                        Sẵn sàng nâng tầm phân phối nội dung của bạn?
                    </h2>
                    <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                        Tham gia cùng hàng nghìn nhà sáng tạo và doanh nghiệp đang tối ưu hóa thời gian và gia tăng lượt tiếp cận mỗi ngày với Socialchoice.
                    </p>
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
                        <Link
                            to="/create"
                            className="btn-skew flex h-12 items-center gap-2 rounded-xl bg-brand-400 px-7 text-[14px] font-bold text-zinc-950 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition hover:bg-brand-300"
                        >
                            <PaperPlaneTilt size={18} weight="fill" />
                            <span>Tạo bài viết đầu tiên — Miễn phí</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="border-t border-zinc-200 bg-white py-12 text-xs text-zinc-500">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <img
                                src="/socialchoice-logo.png"
                                alt="Socialchoice Logo"
                                className="h-6 w-auto object-contain"
                            />
                            <span className="font-heading font-bold text-zinc-900 text-sm">
                                Socialchoice
                            </span>
                            <span className="text-zinc-300">|</span>
                            <span>Nền tảng phân phối & tối ưu nội dung đa kênh</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 font-medium text-zinc-600">
                            <Link to="/privacy" className="hover:text-zinc-950 transition">
                                Chính sách quyền riêng tư
                            </Link>
                            <Link to="/terms" className="hover:text-zinc-950 transition">
                                Điều khoản sử dụng
                            </Link>
                            <Link to="/data-deletion" className="hover:text-zinc-950 transition">
                                Xóa dữ liệu người dùng
                            </Link>
                        </div>
                    </div>

                    <div className="mt-8 border-t border-zinc-100 pt-6 text-center sm:text-left text-zinc-400 text-[11px]">
                        © 2026 Socialchoice. Mọi quyền được bảo lưu. Phát triển phục vụ cộng đồng Content Creator & Doanh nghiệp số.
                    </div>
                </div>
            </footer>
        </div>
    );
}

