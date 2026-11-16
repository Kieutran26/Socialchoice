import { useState, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import {
    Clock,
    Fire,
    Sparkle,
    ArrowUpRight,
    FacebookLogo,
    ThreadsLogo,
    TiktokLogo,
    LinkedinLogo,
    InstagramLogo,
    XLogo,
    Info,
    CalendarCheck,
    CheckCircle,
    WarningCircle,
} from '@phosphor-icons/react';

const PLATFORMS = [
    { id: 'facebook', label: 'Facebook', icon: FacebookLogo, color: 'text-[#1877F2]', bg: 'bg-[#1877F2]/10' },
    { id: 'threads', label: 'Threads', icon: ThreadsLogo, color: 'text-foreground', bg: 'bg-muted' },
    { id: 'tiktok', label: 'TikTok & Reels', icon: TiktokLogo, color: 'text-foreground', bg: 'bg-muted' },
    { id: 'linkedin', label: 'LinkedIn', icon: LinkedinLogo, color: 'text-[#0A66C2]', bg: 'bg-[#0A66C2]/10' },
    { id: 'instagram', label: 'Instagram', icon: InstagramLogo, color: 'text-[#E4405F]', bg: 'bg-[#E4405F]/10' },
    { id: 'x', label: 'X (Twitter)', icon: XLogo, color: 'text-foreground', bg: 'bg-muted' },
];

const INDUSTRIES = [
    { id: 'retail', label: '🛍️ Bán lẻ & E-Commerce', desc: 'Cao điểm giờ trưa và tối mua sắm' },
    { id: 'b2b', label: '👔 B2B & Dịch vụ chuyên môn', desc: 'Cao điểm giờ làm việc & đầu tuần' },
    { id: 'fnb', label: '☕ Ẩm thực & Nhà hàng (F&B)', desc: 'Cao điểm trước giờ ăn 11h & 17h' },
    { id: 'edu', label: '🎓 Giáo dục & Đào tạo', desc: 'Cao điểm buổi tối 20h - 22h' },
    { id: 'tech', label: '📱 Công nghệ, SaaS & Khởi nghiệp', desc: 'Cao điểm giữa tuần & sáng sớm' },
];

// Khung giờ vàng chi tiết theo từng kênh và ngành hàng
const PLATFORM_INSIGHTS = {
    facebook: {
        peaks: [
            { time: '19:30 - 21:30', score: 99, tag: 'Đỉnh điểm tối', bestFormat: 'Video ngắn / Storytelling / Livestream', tip: 'Tỷ lệ người dùng online thư giãn sau bữa tối cao nhất' },
            { time: '11:45 - 13:00', score: 94, tag: 'Nghỉ trưa', bestFormat: 'Ảnh sản phẩm / Khuyến mãi / Mini game', tip: 'Check newsfeed trong lúc ăn trưa và nghỉ ngơi' },
            { time: '07:30 - 08:30', score: 88, tag: 'Sáng sớm', bestFormat: 'Tin tức / Quote truyền cảm hứng', tip: 'Xem cập nhật đầu ngày trước khi bắt đầu làm việc' },
        ],
        goldenDays: ['Thứ 5', 'Thứ 6', 'Chủ nhật'],
        algorithmTips: [
            'Facebook ưu tiên các bài viết có tương tác 2 chiều (bình luận đối thoại qua lại).',
            'Không chèn link trực tiếp vào caption để tránh bị giảm 40-60% reach; hãy dùng tính năng Auto First Comment của Socialchoice.',
            'Tần suất tối ưu: 1 - 2 bài chất lượng mỗi ngày.',
        ],
    },
    threads: {
        peaks: [
            { time: '21:00 - 23:30', score: 98, tag: 'Tâm sự đêm', bestFormat: 'Tâm sự / Tranh luận / Góc nhìn trái chiều', tip: 'Khung giờ người dùng Threads đọc và thảo luận sôi nổi nhất' },
            { time: '08:00 - 09:30', score: 93, tag: 'Điểm tin sáng', bestFormat: 'Câu hỏi mở / Chuyện nghề / Tips ngắn', tip: 'Khởi đầu ngày mới với những dòng suy ngẫm ngắn' },
            { time: '13:30 - 15:00', score: 87, tag: 'Đầu giờ chiều', bestFormat: 'Chia sẻ kinh nghiệm / Case study mini', tip: 'Thời gian giải lao nhẹ nhàng trong giờ làm việc' },
        ],
        goldenDays: ['Thứ 3', 'Thứ 4', 'Thứ 7'],
        algorithmTips: [
            'Thuật toán Threads cực kỳ ưu ái bài viết kích thích người đọc để lại Reply.',
            'Dưới 500 ký tự, đi thẳng vào trọng tâm, câu đầu tiên phải mang tính tò mò/nghịch lý.',
            'Tần suất tối ưu: 2 - 4 threads mỗi ngày (khoảng cách 3-4 tiếng).',
        ],
    },
    tiktok: {
        peaks: [
            { time: '20:00 - 22:30', score: 100, tag: 'Giờ vàng giải trí', bestFormat: 'Kịch bản 15-30s / Trending / Biến hình', tip: 'Lượng người lướt For You Feed đạt đỉnh điểm lớn nhất' },
            { time: '17:30 - 19:00', score: 92, tag: 'Tan làm & di chuyển', bestFormat: 'Vlog ngắn / Tips nhanh / Hài hước', tip: 'Giải tỏa căng thẳng sau giờ làm việc' },
            { time: '11:30 - 13:00', score: 89, tag: 'Ăn trưa', bestFormat: 'Review món ăn / Khám phá / Unbox', tip: 'Lướt TikTok kèm lúc ăn uống' },
        ],
        goldenDays: ['Thứ 6', 'Thứ 7', 'Chủ nhật'],
        algorithmTips: [
            '3 giây đầu tiên quyết định 80% tỷ lệ giữ chân (Retention rate).',
            'Đăng trước khung giờ cao điểm 30-45 phút để thuật toán kịp kiểm duyệt và phân phối sơ khởi.',
            'Sử dụng âm thanh đang thịnh hành (Trending sound) kết hợp hashtag chuẩn ngành.',
        ],
    },
    linkedin: {
        peaks: [
            { time: '08:00 - 09:30', score: 97, tag: 'Khởi động ngày làm việc', bestFormat: 'Lãnh đạo tư tưởng / Bài học sự nghiệp / B2B', tip: 'Chuyên gia & CEO check LinkedIn trước giờ họp sáng' },
            { time: '12:00 - 13:15', score: 91, tag: 'Nghỉ trưa văn phòng', bestFormat: 'Tuyển dụng / Case study / Phân tích thị trường', tip: 'Đọc bài học kinh nghiệm trong lúc ăn trưa' },
            { time: '17:00 - 18:30', score: 86, tag: 'Tổng kết ngày', bestFormat: 'Thành tựu dự án / Lời cảm ơn / Đúc kết', tip: 'Kết thúc ngày làm việc, chia sẻ những bài học bổ ích' },
        ],
        goldenDays: ['Thứ 3', 'Thứ 4', 'Thứ 5'],
        algorithmTips: [
            'LinkedIn thưởng reach mạnh cho các bài viết nhận được bình luận chất lượng trong 60 phút đầu.',
            'Định dạng tài liệu nhiều trang (PDF / Carousel) mang lại tỷ lệ lưu trữ (Save) và share cao nhất.',
            'Tránh đăng vào cuối tuần (Thứ 7, CN) vì lượng người dùng B2B giảm sút đáng kể.',
        ],
    },
    instagram: {
        peaks: [
            { time: '18:30 - 20:30', score: 96, tag: 'Tối phong cách sống', bestFormat: 'Reels / Carousel nhiều ảnh / Ảnh thẩm mỹ', tip: 'Thời gian người dùng ngắm ảnh đẹp và xem Reels giải trí' },
            { time: '11:30 - 13:00', score: 91, tag: 'Nghỉ trưa', bestFormat: 'Stories tương tác / Ảnh sản phẩm', tip: 'Check story bạn bè và các thương hiệu yêu thích' },
            { time: '08:00 - 09:00', score: 85, tag: 'Cà phê sáng', bestFormat: 'Stories chào ngày mới / Check-in', tip: 'Thói quen lướt story khi vừa thức dậy' },
        ],
        goldenDays: ['Thứ 4', 'Thứ 6', 'Chủ nhật'],
        algorithmTips: [
            'Carousel có tỷ lệ tương tác cao gấp 3 lần so với bài đăng 1 ảnh đơn.',
            'Kết hợp Story có sticker bình chọn/câu hỏi để kéo tương tác cho tài khoản.',
            'Gắn từ 3 - 5 hashtag đúng chủ đề ở cuối caption hoặc bình luận đầu.',
        ],
    },
    x: {
        peaks: [
            { time: '08:00 - 10:00', score: 94, tag: 'Tin tức sốt dẻo', bestFormat: 'Cập nhật tin tức / Phân tích nhanh / Tech', tip: 'Đọc điểm tin nóng hổi của ngành và thế giới' },
            { time: '18:00 - 20:00', score: 90, tag: 'Bình luận sự kiện', bestFormat: 'Bàn luận xu hướng / Meme / Khảo sát', tip: 'Thời điểm các chủ đề nóng được thảo luận sôi nổi' },
            { time: '12:00 - 13:00', score: 86, tag: 'Nghỉ trưa', bestFormat: 'Thread chia sẻ tài nguyên hữu ích', tip: 'Đọc các chuỗi bài chia sẻ kiến thức' },
        ],
        goldenDays: ['Thứ 2', 'Thứ 3', 'Thứ 4'],
        algorithmTips: [
            'X ưu tiên tài khoản có trả lời nhanh và các chuỗi Thread dài có giá trị cao.',
            'Nội dung ngắn gọn, súc tích, mang tính tranh luận hoặc thông tin mới nhất.',
        ],
    },
};

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function GoldenHoursTool() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [platform, setPlatform] = useState('facebook');
    const [industry, setIndustry] = useState('retail');

    const insights = PLATFORM_INSIGHTS[platform] || PLATFORM_INSIGHTS.facebook;

    // Tính toán ma trận heatmap tương tác (7 ngày x 24 giờ)
    const heatmapMatrix = useMemo(() => {
        const matrix = [];
        const isB2B = industry === 'b2b';
        const isFnb = industry === 'fnb';

        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
            const row = [];
            const isWeekend = dayIdx >= 5;

            for (let hour = 0; hour < 24; hour++) {
                let score = 20; // baseline

                // Sleep hours (0h - 6h)
                if (hour >= 0 && hour <= 5) score = 10;
                // Morning peak (7h - 9h)
                else if (hour >= 7 && hour <= 9) score = isWeekend ? 65 : 85;
                // Lunch peak (11h - 13h)
                else if (hour >= 11 && hour <= 13) score = isFnb ? 98 : 92;
                // Afternoon working (14h - 16h)
                else if (hour >= 14 && hour <= 16) score = isB2B ? 88 : 70;
                // Rush / Dinner (17h - 19h)
                else if (hour >= 17 && hour <= 19) score = isFnb ? 96 : 82;
                // Evening Golden Peak (19h - 22h)
                else if (hour >= 19 && hour <= 22) score = isB2B ? (isWeekend ? 40 : 75) : 98;
                // Late night (22h - 23h)
                else if (hour >= 22) score = platform === 'threads' || platform === 'tiktok' ? 90 : 55;

                // Weekend modifiers
                if (isB2B && isWeekend) score = Math.round(score * 0.55);
                if (platform === 'tiktok' && isWeekend && hour >= 19) score = 100;

                row.push(score);
            }
            matrix.push(row);
        }
        return matrix;
    }, [platform, industry]);

    const handleScheduleAtHour = (hour) => {
        const timeStr = `${String(hour).padStart(2, '0')}:30`;
        navigate(`/create?time=${timeStr}`);
    };

    return (
        <div className="space-y-6">
            {/* Top Config: Platform & Industry */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                {/* Platform Selector Tabs */}
                <div>
                    <label className="text-xs font-bold text-foreground block mb-2">
                        {t('1. Chọn nền tảng mạng xã hội mục tiêu')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {PLATFORMS.map((p) => {
                            const isSelected = platform === p.id;
                            const Icon = p.icon;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setPlatform(p.id)}
                                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                                        isSelected
                                            ? 'border-brand-dark bg-brand text-brand-ink shadow-xs'
                                            : 'border-border bg-surface/60 text-muted-foreground hover:border-brand-dark/40 hover:text-foreground'
                                    }`}
                                >
                                    <Icon size={16} weight={isSelected ? 'fill' : 'bold'} className={isSelected ? 'text-brand-ink' : p.color} />
                                    <span>{p.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Industry Selector */}
                <div className="pt-3 border-t border-border/70">
                    <label className="text-xs font-bold text-foreground block mb-2">
                        {t('2. Ngành hàng / Nhóm khách hàng mục tiêu')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                        {INDUSTRIES.map((ind) => {
                            const isSelected = industry === ind.id;
                            return (
                                <button
                                    key={ind.id}
                                    type="button"
                                    onClick={() => setIndustry(ind.id)}
                                    className={`text-left p-2.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                                        isSelected
                                            ? 'border-brand-dark bg-brand/15 ring-1 ring-brand-dark'
                                            : 'border-border bg-surface/40 hover:border-brand-dark/40 hover:bg-card'
                                    }`}
                                >
                                    <span className="text-xs font-bold text-foreground">
                                        {ind.label}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground mt-1">
                                        {ind.desc}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Top 3 Golden Hour Cards */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Fire size={16} weight="fill" className="text-amber-500" />
                        <span>{t('Top 3 Khung Giờ Vàng Đạt Reach & Tương Tác Cao Nhất')}</span>
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                        {t('Ngày vàng khuyến nghị: ')}
                        <strong className="text-foreground">{insights.goldenDays.join(', ')}</strong>
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {insights.peaks.map((peak, idx) => (
                        <div
                            key={idx}
                            className="rounded-2xl border border-border bg-card p-4.5 space-y-3 flex flex-col justify-between hover:border-brand-dark/60 transition shadow-xs"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="rounded-full bg-brand/25 border border-brand-dark/40 px-2.5 py-0.5 text-[10px] font-extrabold text-brand-ink">
                                        #{idx + 1} {peak.tag}
                                    </span>
                                    <span className="flex items-center gap-1 font-mono text-xs font-extrabold text-brand-ink bg-brand px-2 py-0.5 rounded-lg border border-brand-dark">
                                        <span>🔥</span>
                                        <span>{peak.score}% Hot</span>
                                    </span>
                                </div>

                                <div>
                                    <h4 className="text-xl font-extrabold font-heading text-foreground">
                                        {peak.time}
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        {peak.tip}
                                    </p>
                                </div>

                                <div className="p-2.5 rounded-xl border border-border/80 bg-surface/50 text-[11px]">
                                    <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                                        {t('Định dạng ưu tiên đẩy reach:')}
                                    </span>
                                    <span className="font-semibold text-foreground mt-0.5 block">
                                        {peak.bestFormat}
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleScheduleAtHour(Number(peak.time.slice(0, 2)))}
                                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground hover:border-brand-dark hover:bg-brand hover:text-brand-ink transition cursor-pointer"
                            >
                                <span>{t('Soạn bài đăng vào giờ này')}</span>
                                <ArrowUpRight size={13} weight="bold" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* 7 Days x 24 Hours Heatmap Matrix */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                            <Clock size={16} weight="duotone" className="text-brand-dark" />
                            <span>{t('Bản Đồ Nhiệt Tương Tác 7 Ngày Trong Tuần (24h Heatmap)')}</span>
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {t('Nhấp vào bất kỳ ô giờ vàng nào để chuyển thẳng sang Studio lên lịch đăng')}
                        </p>
                    </div>

                    {/* Heatmap Legend */}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <span className="size-3 rounded bg-surface border border-border" />
                            <span>Giờ nghỉ (&lt;60%)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="size-3 rounded bg-amber-100 border border-amber-300" />
                            <span>Khá (60-84%)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="size-3 rounded bg-brand border border-brand-dark" />
                            <span className="font-bold text-brand-ink">Giờ Vàng (85-100%)</span>
                        </div>
                    </div>
                </div>

                {/* Heatmap Table */}
                <div className="overflow-x-auto pb-2">
                    <div className="min-w-[840px] space-y-1">
                        {/* Hour Header */}
                        <div
                            className="items-center text-center text-[10px] font-bold text-muted-foreground pb-2 border-b border-border/50"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '76px repeat(24, minmax(28px, 1fr))',
                                gap: '3px',
                            }}
                        >
                            <div className="text-left font-bold pl-1">{t('Ngày')}</div>
                            {HOURS.map((h) => (
                                <div key={h} className="font-mono text-center">
                                    {h}h
                                </div>
                            ))}
                        </div>

                        {/* Days Rows */}
                        <div className="divide-y divide-border/40">
                            {DAYS.map((dayLabel, dIdx) => (
                                <div
                                    key={dIdx}
                                    className="items-center py-1 hover:bg-surface/30 transition rounded-lg"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '76px repeat(24, minmax(28px, 1fr))',
                                        gap: '3px',
                                    }}
                                >
                                    <div className="text-xs font-bold text-foreground pl-1 truncate">
                                        {dayLabel}
                                    </div>
                                    {HOURS.map((h) => {
                                        const score = heatmapMatrix[dIdx][h];
                                        const isPeak = score >= 85;
                                        const isMedium = score >= 60 && score < 85;

                                        return (
                                            <button
                                                key={h}
                                                type="button"
                                                onClick={() => handleScheduleAtHour(h)}
                                                title={`${dayLabel} lúc ${h}:00 - Điểm tương tác: ${score}% (Nhấp để lên lịch)`}
                                                className={`h-7 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center ${
                                                    isPeak
                                                        ? 'bg-brand border border-brand-dark text-brand-ink shadow-2xs hover:scale-110 ring-1 ring-brand-dark/20'
                                                        : isMedium
                                                        ? 'bg-amber-100/90 border border-amber-200 text-amber-900 hover:bg-amber-200'
                                                        : 'bg-surface/60 border border-border/40 text-muted-foreground/30 hover:bg-muted'
                                                }`}
                                            >
                                                {isPeak ? '🔥' : ''}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Algorithm Best Practices & Checklist */}
            <div className="rounded-2xl border border-brand-dark/30 bg-brand/10 p-5 space-y-3">
                <h4 className="text-xs font-bold text-brand-ink flex items-center gap-2">
                    <CheckCircle size={17} weight="fill" className="text-brand-dark" />
                    <span>{t('Chiến lược tối ưu thuật toán phân phối trên {platform}', { platform: PLATFORMS.find(p => p.id === platform)?.label })}</span>
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-foreground">
                    {insights.algorithmTips.map((tip, idx) => (
                        <li key={idx} className="p-3 rounded-xl border border-brand-dark/25 bg-card flex items-start gap-2">
                            <span className="size-5 rounded-full bg-brand border border-brand-dark text-brand-ink text-[10px] font-bold grid place-items-center shrink-0 mt-0.5">
                                {idx + 1}
                            </span>
                            <span className="leading-relaxed">{tip}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
