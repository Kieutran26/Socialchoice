import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowUpRight,
    Briefcase,
    CalendarCheck,
    CheckCircle,
    Clock,
    Coffee,
    DeviceMobile,
    FacebookLogo,
    Fire,
    GraduationCap,
    InstagramLogo,
    LinkedinLogo,
    ShoppingBag,
    ThreadsLogo,
    TiktokLogo,
    XLogo,
} from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';

const PLATFORMS = [
    { id: 'facebook', label: 'Facebook', icon: FacebookLogo, color: 'text-[#1877F2]', weight: 'fill' },
    { id: 'threads', label: 'Threads', icon: ThreadsLogo, color: 'text-zinc-900', weight: 'regular' },
    { id: 'tiktok', label: 'TikTok & Reels', icon: TiktokLogo, color: 'text-zinc-900', weight: 'fill' },
    { id: 'linkedin', label: 'LinkedIn', icon: LinkedinLogo, color: 'text-[#0A66C2]', weight: 'fill' },
    { id: 'instagram', label: 'Instagram', icon: InstagramLogo, color: 'text-[#E4405F]', weight: 'regular' },
    { id: 'x', label: 'X (Twitter)', icon: XLogo, color: 'text-zinc-900', weight: 'regular' },
];

const INDUSTRIES = [
    { id: 'retail', label: 'Bán lẻ & E-Commerce', desc: 'Cao điểm giờ trưa & tối mua sắm', icon: ShoppingBag },
    { id: 'b2b', label: 'B2B & Dịch vụ', desc: 'Cao điểm giờ hành chính đầu tuần', icon: Briefcase },
    { id: 'fnb', label: 'Ẩm thực & F&B', desc: 'Cao điểm trước bữa ăn 11h & 17h', icon: Coffee },
    { id: 'edu', label: 'Giáo dục & Đào tạo', desc: 'Cao điểm buổi tối 20h – 22h', icon: GraduationCap },
    { id: 'tech', label: 'Công nghệ & SaaS', desc: 'Cao điểm giữa tuần & sáng sớm', icon: DeviceMobile },
];

const PLATFORM_INSIGHTS = {
    facebook: {
        peaks: [
            {
                time: '19:30 - 21:30',
                score: 99,
                tag: 'Đỉnh điểm tối',
                bestFormat: 'Video ngắn · Storytelling · Livestream',
                tip: 'Tỷ lệ người dùng online thư giãn sau bữa tối cao nhất',
            },
            {
                time: '11:45 - 13:00',
                score: 94,
                tag: 'Nghỉ trưa',
                bestFormat: 'Ảnh sản phẩm · Khuyến mãi · Mini game',
                tip: 'Người dùng lướt newsfeed trong giờ nghỉ trưa',
            },
            {
                time: '07:30 - 08:30',
                score: 88,
                tag: 'Sáng sớm',
                bestFormat: 'Tin tức · Quote truyền cảm hứng',
                tip: 'Cập nhật nhanh đầu ngày trước khi bắt đầu làm việc',
            },
        ],
        goldenDays: ['Thứ 5', 'Thứ 6', 'Chủ nhật'],
        algorithmTips: [
            'Facebook ưu tiên các bài viết có tương tác 2 chiều (bình luận đối thoại qua lại).',
            'Không chèn link trực tiếp vào caption để tránh giảm 40–60% reach; dùng tính năng Auto First Comment.',
            'Tần suất tối ưu: 1–2 bài chất lượng mỗi ngày.',
        ],
    },
    threads: {
        peaks: [
            {
                time: '21:00 - 23:30',
                score: 98,
                tag: 'Tâm sự đêm',
                bestFormat: 'Tâm sự · Tranh luận · Góc nhìn trái chiều',
                tip: 'Khung giờ người dùng Threads đọc và thảo luận sôi nổi nhất',
            },
            {
                time: '08:00 - 09:30',
                score: 93,
                tag: 'Điểm tin sáng',
                bestFormat: 'Câu hỏi mở · Chuyện nghề · Tips ngắn',
                tip: 'Khởi đầu ngày mới với những dòng suy ngẫm ngắn gọn',
            },
            {
                time: '13:30 - 15:00',
                score: 87,
                tag: 'Đầu giờ chiều',
                bestFormat: 'Chia sẻ kinh nghiệm · Case study mini',
                tip: 'Thời gian giải lao nhẹ nhàng trong giờ làm việc',
            },
        ],
        goldenDays: ['Thứ 3', 'Thứ 4', 'Thứ 7'],
        algorithmTips: [
            'Thuật toán Threads cực kỳ ưu ái bài viết kích thích người đọc để lại Reply.',
            'Dưới 500 ký tự, đi thẳng vào trọng tâm, câu mở đầu tạo tò mò hoặc nghịch lý.',
            'Tần suất tối ưu: 2–4 threads mỗi ngày (cách nhau 3–4 tiếng).',
        ],
    },
    tiktok: {
        peaks: [
            {
                time: '20:00 - 22:30',
                score: 100,
                tag: 'Giờ vàng giải trí',
                bestFormat: 'Kịch bản 15–30s · Trending · Biến hình',
                tip: 'Lượng người lướt For You Feed đạt đỉnh điểm lớn nhất',
            },
            {
                time: '17:30 - 19:00',
                score: 92,
                tag: 'Tan làm',
                bestFormat: 'Vlog ngắn · Tips nhanh · Hài hước',
                tip: 'Giải tỏa căng thẳng ngay sau giờ làm việc',
            },
            {
                time: '11:30 - 13:00',
                score: 89,
                tag: 'Ăn trưa',
                bestFormat: 'Review món ăn · Khám phá · Unbox',
                tip: 'Thói quen xem video ngắn kèm lúc nghỉ trưa',
            },
        ],
        goldenDays: ['Thứ 6', 'Thứ 7', 'Chủ nhật'],
        algorithmTips: [
            '3 giây đầu tiên quyết định 80% tỷ lệ giữ chân (Retention rate).',
            'Đăng trước khung giờ cao điểm 30–45 phút để thuật toán kịp kiểm duyệt và phân phối.',
            'Kết hợp âm thanh thịnh hành (Trending sound) với hashtag đúng ngành.',
        ],
    },
    linkedin: {
        peaks: [
            {
                time: '08:00 - 09:30',
                score: 97,
                tag: 'Đầu giờ sáng',
                bestFormat: 'Thought Leadership · Bài học sự nghiệp · B2B',
                tip: 'Chuyên gia và quản lý kiểm tra LinkedIn trước giờ họp sáng',
            },
            {
                time: '12:00 - 13:15',
                score: 91,
                tag: 'Nghỉ trưa văn phòng',
                bestFormat: 'Tuyển dụng · Case study · Phân tích ngành',
                tip: 'Đọc bài học kinh nghiệm trong giờ nghỉ trưa',
            },
            {
                time: '17:00 - 18:30',
                score: 86,
                tag: 'Tổng kết ngày',
                bestFormat: 'Thành tựu dự án · Lời cảm ơn · Đúc kết',
                tip: 'Kết thúc ngày làm việc, chia sẻ góc nhìn và bài học',
            },
        ],
        goldenDays: ['Thứ 3', 'Thứ 4', 'Thứ 5'],
        algorithmTips: [
            'LinkedIn thưởng reach mạnh cho bài viết nhận bình luận chất lượng trong 60 phút đầu.',
            'Định dạng tài liệu nhiều trang (PDF / Carousel) mang lại tỷ lệ Save và Share cao nhất.',
            'Hạn chế đăng vào cuối tuần khi lưu lượng người dùng B2B giảm rõ rệt.',
        ],
    },
    instagram: {
        peaks: [
            {
                time: '18:30 - 20:30',
                score: 96,
                tag: 'Tối phong cách sống',
                bestFormat: 'Reels · Carousel nhiều ảnh · Ảnh thẩm mỹ',
                tip: 'Khung giờ người dùng xem Reels giải trí và lướt ảnh đẹp',
            },
            {
                time: '11:30 - 13:00',
                score: 91,
                tag: 'Nghỉ trưa',
                bestFormat: 'Stories tương tác · Ảnh sản phẩm',
                tip: 'Xem nhanh Story của bạn bè và thương hiệu yêu thích',
            },
            {
                time: '08:00 - 09:00',
                score: 85,
                tag: 'Cà phê sáng',
                bestFormat: 'Stories chào ngày mới · Check-in',
                tip: 'Thói quen mở Instagram buổi sáng',
            },
        ],
        goldenDays: ['Thứ 4', 'Thứ 6', 'Chủ nhật'],
        algorithmTips: [
            'Carousel có tỷ lệ tương tác cao gấp 3 lần bài đăng 1 ảnh đơn.',
            'Kết hợp Story có sticker bình chọn / câu hỏi để kéo tương tác đều đặn.',
            'Gắn 3–5 hashtag đúng chủ đề ở cuối caption hoặc bình luận đầu.',
        ],
    },
    x: {
        peaks: [
            {
                time: '08:00 - 10:00',
                score: 94,
                tag: 'Tin tức sốt dẻo',
                bestFormat: 'Cập nhật tin tức · Phân tích nhanh · Tech',
                tip: 'Đọc điểm tin nóng hổi của ngành vào buổi sáng',
            },
            {
                time: '18:00 - 20:00',
                score: 90,
                tag: 'Bình luận sự kiện',
                bestFormat: 'Bàn luận xu hướng · Khảo sát nhanh',
                tip: 'Thời điểm các chủ đề nóng được thảo luận sôi nổi',
            },
            {
                time: '12:00 - 13:00',
                score: 86,
                tag: 'Nghỉ trưa',
                bestFormat: 'Thread chia sẻ tài nguyên hữu ích',
                tip: 'Đọc chuỗi bài kiến thức chuyên sâu',
            },
        ],
        goldenDays: ['Thứ 2', 'Thứ 3', 'Thứ 4'],
        algorithmTips: [
            'X ưu tiên tài khoản phản hồi nhanh và các chuỗi Thread giàu giá trị.',
            'Nội dung ngắn gọn, súc tích, có quan điểm rõ ràng hoặc thông tin mới nhất.',
            'Đăng kèm hình ảnh hoặc biểu đồ giúp tăng đáng kể tỷ lệ bookmark.',
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
    const [hoveredCell, setHoveredCell] = useState(null);

    const insights = PLATFORM_INSIGHTS[platform] || PLATFORM_INSIGHTS.facebook;
    const activePlatform = PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];
    const activeIndustry = INDUSTRIES.find((i) => i.id === industry) || INDUSTRIES[0];

    const heatmapMatrix = useMemo(() => {
        const matrix = [];
        const isB2B = industry === 'b2b';
        const isFnb = industry === 'fnb';

        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
            const row = [];
            const isWeekend = dayIdx >= 5;

            for (let hour = 0; hour < 24; hour++) {
                let score = 20;
                if (hour >= 0 && hour <= 5) score = 10;
                else if (hour >= 7 && hour <= 9) score = isWeekend ? 65 : 85;
                else if (hour >= 11 && hour <= 13) score = isFnb ? 98 : 92;
                else if (hour >= 14 && hour <= 16) score = isB2B ? 88 : 70;
                else if (hour >= 17 && hour <= 19) score = isFnb ? 96 : 82;
                else if (hour >= 19 && hour <= 22) score = isB2B ? (isWeekend ? 40 : 75) : 98;
                else if (hour >= 22) score = platform === 'threads' || platform === 'tiktok' ? 90 : 55;

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
        <div className="space-y-5">
            {/* Unified Filter Panel: Platform + Industry (Zero emojis, clean pills) */}
            <section className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                {/* Row 1: Platform */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {PLATFORMS.map((p) => {
                            const active = platform === p.id;
                            const Icon = p.icon;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setPlatform(p.id)}
                                    className={`h-8 px-3 rounded-lg border text-[12.5px] font-medium inline-flex items-center gap-2 transition-colors cursor-pointer ${
                                        active
                                            ? 'bg-[#ffd631]/30 border-[#d8b216] text-[#2b2100] font-semibold'
                                            : 'bg-white border-zinc-200/80 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
                                    }`}
                                >
                                    <Icon
                                        size={15}
                                        weight={p.weight}
                                        className={active ? 'text-[#2b2100]' : p.color}
                                    />
                                    <span>{p.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 shrink-0">
                        <CalendarCheck size={14} weight="duotone" className="text-zinc-400" />
                        <span>{t('Ngày vàng:')}</span>
                        <span className="font-medium text-zinc-900">
                            {insights.goldenDays.join(', ')}
                        </span>
                    </div>
                </div>

                {/* Row 2: Industry Chips */}
                <div className="pt-3.5 border-t border-zinc-100 flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] text-zinc-400 mr-1">{t('Ngành hàng:')}</span>
                    {INDUSTRIES.map((ind) => {
                        const active = industry === ind.id;
                        const IndIcon = ind.icon;
                        return (
                            <button
                                key={ind.id}
                                type="button"
                                onClick={() => setIndustry(ind.id)}
                                title={ind.desc}
                                className={`h-8 px-3 rounded-lg border text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                    active
                                        ? 'bg-zinc-900/5 border-zinc-400 text-zinc-900 font-semibold'
                                        : 'bg-zinc-50/70 border-zinc-200/70 text-zinc-600 hover:bg-white hover:border-zinc-300'
                                }`}
                            >
                                <IndIcon size={14} weight={active ? 'duotone' : 'regular'} className="text-zinc-500" />
                                <span>{ind.label}</span>
                            </button>
                        );
                    })}
                    <span className="text-[11.5px] text-zinc-400 ml-auto hidden xl:inline">
                        {activeIndustry.desc}
                    </span>
                </div>
            </section>

            {/* Top 3 Golden Hour Cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {insights.peaks.map((peak, idx) => (
                    <article
                        key={peak.time}
                        className="bg-white border border-zinc-200/80 hover:border-[#d8b216] rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors"
                    >
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[11.5px] font-medium">
                                    <span>#{idx + 1}</span>
                                    <span>{peak.tag}</span>
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ffd631]/30 border border-[#d8b216]/70 text-[#2b2100] font-mono text-[11.5px] font-semibold tabular-nums">
                                    <Fire size={12} weight="fill" />
                                    <span>{peak.score}/100</span>
                                </span>
                            </div>

                            <div>
                                <h3 className="metric text-zinc-900 tabular-nums">{peak.time}</h3>
                                <p className="text-[12.5px] text-zinc-500 mt-1 leading-relaxed">
                                    {peak.tip}
                                </p>
                            </div>

                            <div className="pt-2.5 border-t border-zinc-100 space-y-0.5">
                                <span className="text-[11px] font-medium text-zinc-400 block">
                                    {t('Định dạng ưu tiên đẩy reach')}
                                </span>
                                <span className="text-[12.5px] font-medium text-zinc-800 block">
                                    {peak.bestFormat}
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => handleScheduleAtHour(Number(peak.time.slice(0, 2)))}
                            className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white hover:border-[#d8b216] hover:bg-[#ffd631]/25 text-[12.5px] font-medium text-zinc-800 hover:text-[#2b2100] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <span>{t('Lên lịch vào khung giờ này')}</span>
                            <ArrowUpRight size={14} />
                        </button>
                    </article>
                ))}
            </section>

            {/* Clean 7x24 Interactive Heatmap (Brand Yellow intensity scale, zero emoji clutter) */}
            <section className="bg-white border border-zinc-200/80 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-zinc-100">
                    <div>
                        <h2 className="font-heading text-[15px] font-medium text-zinc-900 flex items-center gap-2">
                            <Clock size={16} weight="duotone" className="text-zinc-500" />
                            <span>{t('Bản đồ nhiệt tương tác 7 ngày × 24 giờ')}</span>
                        </h2>
                        <p className="text-[12px] text-zinc-500 mt-0.5">
                            {hoveredCell
                                ? `${hoveredCell.day} lúc ${String(hoveredCell.hour).padStart(2, '0')}:00 · Điểm tương tác ${hoveredCell.score}% — Bấm để lên lịch`
                                : t('Di chuột để xem điểm tương tác, bấm vào bất kỳ ô giờ nào để chuyển sang trình soạn bài.')}
                        </p>
                    </div>

                    {/* Clean Legend */}
                    <div className="flex items-center gap-3 text-[11.5px] text-zinc-500">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded bg-zinc-100 border border-zinc-200/80" />
                            <span>Thấp (&lt;60%)</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded bg-[#ffd631]/35 border border-[#d8b216]/40" />
                            <span>Khá (60–84%)</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded bg-[#ffd631] border border-[#d8b216]" />
                            <span className="font-medium text-zinc-800">Giờ vàng (85–100%)</span>
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto scrollbar-clean pb-1">
                    <div className="min-w-[820px] space-y-1">
                        {/* Hour Header */}
                        <div
                            className="items-center text-center text-[10.5px] font-mono text-zinc-400 pb-1.5"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '76px repeat(24, minmax(26px, 1fr))',
                                gap: '4px',
                            }}
                        >
                            <div className="text-left font-sans font-medium text-zinc-500 pl-1">
                                {t('Ngày')}
                            </div>
                            {HOURS.map((h) => (
                                <div key={h}>{h}h</div>
                            ))}
                        </div>

                        {/* Day Rows */}
                        {DAYS.map((dayLabel, dIdx) => (
                            <div
                                key={dayLabel}
                                className="items-center"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '76px repeat(24, minmax(26px, 1fr))',
                                    gap: '4px',
                                }}
                            >
                                <div className="text-[12px] font-medium text-zinc-700 pl-1 truncate">
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
                                            onMouseEnter={() =>
                                                setHoveredCell({ day: dayLabel, hour: h, score })
                                            }
                                            onMouseLeave={() => setHoveredCell(null)}
                                            title={`${dayLabel} ${String(h).padStart(2, '0')}:00 · ${score}%`}
                                            aria-label={`${dayLabel} ${h}h · ${score}%`}
                                            className={`h-7 rounded-md border transition-transform hover:scale-110 cursor-pointer flex items-center justify-center text-[10px] font-mono tabular-nums ${
                                                isPeak
                                                    ? 'bg-[#ffd631] border-[#d8b216] text-[#2b2100] font-semibold'
                                                    : isMedium
                                                    ? 'bg-[#ffd631]/30 border-[#d8b216]/35 text-[#2b2100]/70 hover:bg-[#ffd631]/50'
                                                    : 'bg-zinc-100/80 border-zinc-200/60 text-transparent hover:bg-zinc-200/70'
                                            }`}
                                        >
                                            {isPeak ? score : ''}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Algorithm Optimization Checklist (Clean white cards) */}
            <section className="bg-white border border-zinc-200/80 rounded-2xl p-5 space-y-3.5">
                <h2 className="font-heading text-[14.5px] font-medium text-zinc-900 flex items-center gap-2">
                    <CheckCircle size={16} weight="duotone" className="text-emerald-600" />
                    <span>
                        {t('Lưu ý tối ưu thuật toán phân phối trên {platform}', {
                            platform: activePlatform.label,
                        })}
                    </span>
                </h2>

                <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {insights.algorithmTips.map((tip, idx) => (
                        <li
                            key={tip}
                            className="p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/60 flex items-start gap-2.5 text-[12.5px] text-zinc-700 leading-relaxed"
                        >
                            <span className="h-5 w-5 rounded-full bg-[#ffd631]/40 border border-[#d8b216]/70 text-[#2b2100] text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                            </span>
                            <span>{tip}</span>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
