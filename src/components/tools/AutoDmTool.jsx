import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowUpRight,
    Briefcase,
    ChatCircleDots,
    CheckCircle,
    FileText,
    Heart,
    Lightning,
    PaperPlaneRight,
    Play,
    Sparkle,
    Tag,
    Ticket,
    Users,
} from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';

const PREMADE_TEMPLATES = [
    {
        id: 'lead_magnet',
        shortTitle: 'Tặng Ebook & Tài liệu',
        category: 'Lead Magnet',
        title: 'Tặng Ebook & Tài liệu độc quyền',
        desc: 'Tự động gửi link Google Drive hoặc Notion tài liệu ngay khi khách bình luận "Tài liệu" hoặc "Link".',
        icon: FileText,
        iconStyle: 'bg-sky-50 border-sky-200/80 text-sky-700',
        keywords: ['tài liệu', 'link', 'nhận', 'xin', 'ebook'],
        publicReplies: [
            'Dạ {name} kiểm tra hộp thư đến nhé, mình vừa gửi trọn bộ tài liệu cho bạn rồi ạ.',
            'Tài liệu đã được gửi thẳng vào tin nhắn của {name} rồi nha!',
        ],
        privateMessage:
            'Chào {name}! Cảm ơn bạn đã quan tâm. Dưới đây là đường dẫn tải trọn bộ tài liệu độc quyền:\nhttps://socialchoice.site/resources/growth-playbook\n\nChúc bạn áp dụng hiệu quả và đạt kết quả tốt!',
        ctaTitle: 'Mở trọn bộ tài liệu ngay',
        ctaUrl: 'https://socialchoice.site/resources/growth-playbook',
    },
    {
        id: 'sales_inbox',
        shortTitle: 'Báo giá & Tư vấn',
        category: 'E-Commerce',
        title: 'Báo giá & Tư vấn bán hàng nhanh',
        desc: 'Tự động thích, trả lời công khai và gửi bảng báo giá kèm ưu đãi vào tin nhắn khi khách hỏi giá.',
        icon: Tag,
        iconStyle: 'bg-amber-50 border-amber-200/80 text-amber-700',
        keywords: ['giá', 'inbox', 'ib', 'tư vấn', 'bao nhiêu', 'mua'],
        publicReplies: [
            'Dạ {name} kiểm tra tin nhắn riêng giúp em nhé, em đã gửi bảng giá chi tiết kèm ưu đãi hôm nay ạ.',
            'Em đã nhắn tin riêng cho {name} kèm voucher giảm giá rồi nha!',
        ],
        privateMessage:
            'Dạ em chào {name} ạ! Mẫu sản phẩm bạn quan tâm đang có giá ưu đãi hôm nay chỉ 299.000đ (giá gốc 450.000đ) kèm miễn phí vận chuyển toàn quốc.\n\nBạn xem chi tiết bảng màu và đặt hàng tại đây nhé:\nhttps://socialchoice.site/shop/flash-sale',
        ctaTitle: 'Xem bảng giá & Đặt hàng',
        ctaUrl: 'https://socialchoice.site/shop/flash-sale',
    },
    {
        id: 'promo_voucher',
        shortTitle: 'Tặng Voucher ưu đãi',
        category: 'Flash Promotion',
        title: 'Tặng Voucher giảm giá độc quyền',
        desc: 'Kích thích khách bình luận từ khóa để nhận mã giảm giá 20% - 50% tự động trước khi mua.',
        icon: Ticket,
        iconStyle: 'bg-emerald-50 border-emerald-200/80 text-emerald-700',
        keywords: ['voucher', 'mã', 'code', 'khuyến mãi', 'giảm giá'],
        publicReplies: [
            'Dạ {name} kiểm tra inbox để nhận mã giảm giá 20% độc quyền hôm nay nhé.',
            'Mã voucher đã sẵn sàng trong tin nhắn của {name} rồi nha!',
        ],
        privateMessage:
            'Chúc mừng {name} đã nhận được Voucher độc quyền giảm 20% cho đơn hàng đầu tiên!\n\nMã ưu đãi: SCCHOICE20\nHạn sử dụng: 24 giờ kể từ lúc nhận tin nhắn.\n\nÁp dụng trực tiếp tại giỏ hàng:',
        ctaTitle: 'Sử dụng Voucher 20%',
        ctaUrl: 'https://socialchoice.site/checkout?coupon=SCCHOICE20',
    },
    {
        id: 'recruitment',
        shortTitle: 'Tuyển dụng & Nhận JD',
        category: 'HR Hiring',
        title: 'Tuyển dụng & Gửi JD tự động',
        desc: 'Ứng viên bình luận "Quan tâm" hoặc "JD", hệ thống tự động gửi mô tả công việc và link nộp CV.',
        icon: Briefcase,
        iconStyle: 'bg-violet-50 border-violet-200/80 text-violet-700',
        keywords: ['jd', 'quan tâm', 'cv', 'ứng tuyển', 'tuyển dụng'],
        publicReplies: [
            'Chào {name}, bộ phận nhân sự đã gửi JD chi tiết và mức đãi ngộ vào inbox cho bạn rồi nhé.',
            'Bạn {name} kiểm tra tin nhắn để xem JD và link nộp CV trực tiếp nha!',
        ],
        privateMessage:
            'Chào bạn {name}, cảm ơn bạn đã quan tâm đến cơ hội nghề nghiệp tại công ty!\n\nChi tiết mô tả công việc (JD), mức lương và chế độ đãi ngộ:\nhttps://socialchoice.site/careers/open-roles\n\nRất mong được đồng hành cùng bạn!',
        ctaTitle: 'Xem JD & Nộp hồ sơ',
        ctaUrl: 'https://socialchoice.site/careers/open-roles',
    },
];

const MOCK_LEAD_LOGS = [
    {
        id: 1,
        name: 'Trần Minh Hoàng',
        keyword: 'giá',
        post: 'Bộ sưu tập thời trang Thu Đông 2026',
        time: '5 phút trước',
        liked: true,
        replied: true,
        dmed: true,
    },
    {
        id: 2,
        name: 'Lê Thuỳ Dung',
        keyword: 'tài liệu',
        post: 'Ebook 100+ Ý tưởng Content viral Facebook',
        time: '18 phút trước',
        liked: true,
        replied: true,
        dmed: true,
    },
    {
        id: 3,
        name: 'Nguyễn Văn Tuấn',
        keyword: 'inbox',
        post: 'Khóa học tối ưu thuật toán đa kênh 2026',
        time: '34 phút trước',
        liked: true,
        replied: true,
        dmed: true,
    },
    {
        id: 4,
        name: 'Phạm Quỳnh Nga',
        keyword: 'voucher',
        post: 'Flash Sale Cuối Tuần Giảm 50%',
        time: '1 giờ trước',
        liked: true,
        replied: true,
        dmed: true,
    },
    {
        id: 5,
        name: 'Vũ Đức Anh',
        keyword: 'jd',
        post: 'Tuyển dụng Senior Content Creator HN/HCM',
        time: '2 giờ trước',
        liked: true,
        replied: true,
        dmed: true,
    },
];

export default function AutoDmTool() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [selectedTemplate, setSelectedTemplate] = useState(PREMADE_TEMPLATES[1]);
    const [simInput, setSimInput] = useState('Shop ơi cho mình xin giá và tư vấn màu sắc với');
    const [simStep, setSimStep] = useState(4); // 0: idle, 1: commented, 2: liked, 3: replied, 4: dmed
    const [isRunning, setIsRunning] = useState(false);

    const timersRef = useRef([]);
    const simulatorRef = useRef(null);

    const clearSimTimers = () => {
        timersRef.current.forEach((id) => clearTimeout(id));
        timersRef.current = [];
    };

    useEffect(() => {
        return () => clearSimTimers();
    }, []);

    const handleRunSim = () => {
        clearSimTimers();
        setIsRunning(true);
        setSimStep(1);
        timersRef.current.push(setTimeout(() => setSimStep(2), 450));
        timersRef.current.push(setTimeout(() => setSimStep(3), 1000));
        timersRef.current.push(
            setTimeout(() => {
                setSimStep(4);
                setIsRunning(false);
            }, 1600)
        );
    };

    const handleSelectTemplateForSim = (tpl, shouldScroll = false) => {
        clearSimTimers();
        setSelectedTemplate(tpl);
        setSimInput(`Cho mình xin ${tpl.keywords[0]} với shop`);
        setIsRunning(false);
        setSimStep(4);
        if (shouldScroll && simulatorRef.current) {
            simulatorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleApplyTemplate = (tpl) => {
        const params = new URLSearchParams({
            auto_dm_enabled: '1',
            auto_dm_template: tpl.id,
            auto_dm_keywords: tpl.keywords.join(','),
            auto_dm_msg: tpl.privateMessage,
            auto_dm_cta_title: tpl.ctaTitle,
            auto_dm_cta_url: tpl.ctaUrl,
        });
        navigate(`/create?${params.toString()}`);
    };

    const matchedKeyword = selectedTemplate.keywords.find((k) =>
        simInput.toLowerCase().includes(k.toLowerCase())
    );

    const automationSteps = [
        { step: 2, label: t('Thích bình luận'), icon: Heart },
        { step: 3, label: t('Phản hồi công khai'), icon: ChatCircleDots },
        { step: 4, label: t('Gửi tin nhắn Inbox'), icon: PaperPlaneRight },
    ];

    return (
        <div className="space-y-5">
            {/* 1. Compact KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center justify-between gap-2 text-[12px] font-medium text-zinc-500">
                        <span className="whitespace-nowrap">{t('Bình luận đã xử lý')}</span>
                        <span className="h-7 w-7 rounded-lg bg-zinc-50 border border-zinc-200/70 text-zinc-600 flex items-center justify-center shrink-0">
                            <ChatCircleDots size={14} weight="duotone" />
                        </span>
                    </div>
                    <div className="metric text-[24px] font-semibold text-zinc-900 mt-1.5 leading-none">
                        1,842
                    </div>
                    <div className="text-[11.5px] text-zinc-500 mt-1.5 flex items-center gap-1.5">
                        <span className="font-semibold text-emerald-700">+24%</span>
                        <span>{t('so với tuần trước')}</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center justify-between gap-2 text-[12px] font-medium text-zinc-500">
                        <span className="whitespace-nowrap">{t('Tin nhắn DM đã gửi')}</span>
                        <span className="h-7 w-7 rounded-lg bg-sky-50 border border-sky-200/70 text-sky-700 flex items-center justify-center shrink-0">
                            <PaperPlaneRight size={14} weight="duotone" />
                        </span>
                    </div>
                    <div className="metric text-[24px] font-semibold text-zinc-900 mt-1.5 leading-none">
                        1,826
                    </div>
                    <div className="text-[11.5px] text-zinc-500 mt-1.5">
                        {t('Tỷ lệ gửi thành công')}{' '}
                        <span className="font-semibold text-zinc-800">99.1%</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center justify-between gap-2 text-[12px] font-medium text-zinc-500">
                        <span className="whitespace-nowrap">{t('Khách tiềm năng (Leads)')}</span>
                        <span className="h-7 w-7 rounded-lg bg-[#ffd631]/25 border border-[#d8b216]/70 text-[#2b2100] flex items-center justify-center shrink-0">
                            <Users size={14} weight="duotone" />
                        </span>
                    </div>
                    <div className="metric text-[24px] font-semibold text-zinc-900 mt-1.5 leading-none">
                        745
                    </div>
                    <div className="text-[11.5px] text-emerald-700 font-medium mt-1.5">
                        {t('Tỷ lệ mở DM đạt 88.4%')}
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center justify-between gap-2 text-[12px] font-medium text-zinc-500">
                        <span className="whitespace-nowrap">{t('Tốc độ phản hồi')}</span>
                        <span className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-200/70 text-emerald-700 flex items-center justify-center shrink-0">
                            <Lightning size={14} weight="duotone" />
                        </span>
                    </div>
                    <div className="metric text-[24px] font-semibold text-zinc-900 mt-1.5 leading-none">
                        15s
                    </div>
                    <div className="text-[11.5px] text-zinc-500 mt-1.5">
                        {t('Giãn cách tự nhiên chống spam')}
                    </div>
                </div>
            </div>

            {/* 2. Interactive Live Flow Simulator */}
            <section
                ref={simulatorRef}
                className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-5"
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                    <div>
                        <h2 className="text-[15px] font-heading font-semibold text-zinc-900 flex items-center gap-2">
                            <ChatCircleDots size={17} weight="duotone" className="text-zinc-700" />
                            <span>{t('Mô phỏng chuỗi phản hồi Comment-to-Inbox')}</span>
                        </h2>
                        <p className="text-[12.5px] text-zinc-500 mt-0.5">
                            {t('Kiểm tra toàn bộ luồng Thích → Phản hồi công khai → Gửi tin nhắn Inbox trước khi áp dụng cho bài đăng.')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => handleApplyTemplate(selectedTemplate)}
                            className="h-9 px-3.5 rounded-xl border border-zinc-200/90 bg-white text-[12.5px] font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>{t('Dùng kịch bản này')}</span>
                            <ArrowUpRight size={13} weight="bold" />
                        </button>
                        <button
                            type="button"
                            onClick={handleRunSim}
                            className="btn-skew !h-9 !px-4 !py-0 text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                            <Play size={13} weight="fill" />
                            <span>{isRunning ? t('Đang chạy...') : t('Chạy thử mô phỏng')}</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Left Controls (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        {/* Template quick selector */}
                        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3.5 space-y-2.5">
                            <span className="text-[12px] font-semibold text-zinc-700 block">
                                {t('Chọn kịch bản thử nghiệm')}
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                {PREMADE_TEMPLATES.map((tpl) => {
                                    const Icon = tpl.icon;
                                    const isActive = selectedTemplate.id === tpl.id;
                                    return (
                                        <button
                                            key={tpl.id}
                                            type="button"
                                            onClick={() => handleSelectTemplateForSim(tpl)}
                                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                                                isActive
                                                    ? 'bg-[#ffd631]/25 border-[#d8b216] text-[#2b2100] shadow-[0_1px_2px_rgba(216,178,22,0.12)]'
                                                    : 'bg-white border-zinc-200/80 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50/70'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Icon
                                                    size={14}
                                                    weight={isActive ? 'fill' : 'regular'}
                                                    className={isActive ? 'text-[#2b2100] shrink-0' : 'text-zinc-500 shrink-0'}
                                                />
                                                <span className="text-[12px] font-semibold truncate">
                                                    {tpl.shortTitle}
                                                </span>
                                            </div>
                                            <span className="font-mono text-[10.5px] text-zinc-500 truncate">
                                                {tpl.keywords.slice(0, 3).join(', ')}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Simulated customer comment */}
                        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3.5 space-y-2.5">
                            <label
                                htmlFor="auto-dm-sim-input"
                                className="text-[12px] font-semibold text-zinc-700 block"
                            >
                                {t('Giả lập bình luận của khách hàng')}
                            </label>
                            <input
                                id="auto-dm-sim-input"
                                type="text"
                                value={simInput}
                                onChange={(e) => setSimInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRunSim();
                                }}
                                placeholder={t('Nhập bình luận có chứa từ khóa...')}
                                className="w-full h-9 rounded-xl border border-zinc-200/90 bg-white px-3 text-[12.5px] text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-[#d8b216] focus:ring-2 focus:ring-[#ffd631]/25 transition"
                            />
                            <div className="flex items-center justify-between gap-2 text-[11.5px] text-zinc-500">
                                <span className="flex items-center gap-1.5 min-w-0">
                                    <span>{t('Từ khóa khớp:')}</span>
                                    <strong className="font-mono text-[11px] font-semibold text-[#2b2100] bg-[#ffd631]/30 border border-[#d8b216]/60 px-1.5 py-0.5 rounded-md truncate">
                                        {matchedKeyword || t('Mọi bình luận')}
                                    </strong>
                                </span>
                                <span className="text-[11px] text-zinc-400 shrink-0">
                                    {t('Nhấn Enter để chạy')}
                                </span>
                            </div>
                        </div>

                        {/* 3-Step Flow Indicator */}
                        <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 space-y-2">
                            <span className="text-[11.5px] font-semibold text-zinc-500 uppercase tracking-wide block">
                                {t('Trạng thái chuỗi tự động')}
                            </span>
                            <div className="space-y-1.5">
                                {automationSteps.map((item, idx) => {
                                    const StepIcon = item.icon;
                                    const done = simStep >= item.step;
                                    return (
                                        <div
                                            key={item.step}
                                            className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] transition-colors ${
                                                done
                                                    ? 'bg-emerald-50/70 text-emerald-900'
                                                    : 'bg-zinc-50 text-zinc-400'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <StepIcon
                                                    size={14}
                                                    weight={done ? 'fill' : 'regular'}
                                                    className={done ? 'text-emerald-600' : 'text-zinc-400'}
                                                />
                                                <span className="font-medium">
                                                    {idx + 1}. {item.label}
                                                </span>
                                            </div>
                                            <span className="text-[11px] font-semibold">
                                                {done ? t('Hoàn tất') : t('Đang chờ')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Live Preview (7 cols) */}
                    <div className="lg:col-span-7">
                        <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/40 p-4 space-y-4">
                            <div className="flex items-center justify-between border-b border-zinc-200/70 pb-2.5">
                                <span className="text-[12px] font-semibold text-zinc-700">
                                    {t('Xem trước Facebook Comment & Messenger Inbox')}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    <span>{t('Bot sẵn sàng')}</span>
                                </span>
                            </div>

                            {/* Visitor Comment */}
                            <div className="flex items-start gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-sky-600 text-white font-semibold text-[12px] flex items-center justify-center shrink-0">
                                    H
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="rounded-2xl bg-white border border-zinc-200/80 px-3.5 py-2.5 text-[12.5px]">
                                        <div className="font-semibold text-zinc-900">Hoàng Hải</div>
                                        <div className="text-zinc-700 mt-0.5 break-words">{simInput}</div>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 pl-2">
                                        <span>{t('Thích')}</span>
                                        <span>{t('Phản hồi')}</span>
                                        <span>{t('Vừa xong')}</span>
                                        {simStep >= 2 && (
                                            <span className="inline-flex items-center gap-1 text-rose-600 font-semibold ml-1">
                                                <Heart size={12} weight="fill" />
                                                <span>{t('Fanpage đã thích')}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Fanpage Public Reply */}
                            {simStep >= 3 && (
                                <div className="flex items-start gap-2.5 pl-9">
                                    <div className="h-7 w-7 rounded-full bg-[#ffd631] border border-[#d8b216] text-[#2b2100] font-bold text-[10px] flex items-center justify-center shrink-0">
                                        SC
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="rounded-2xl bg-[#ffd631]/15 border border-[#d8b216]/50 px-3.5 py-2.5 text-[12.5px]">
                                            <div className="font-semibold text-[#2b2100] flex items-center gap-1.5">
                                                <span>Socialchoice Fanpage</span>
                                                <span className="rounded bg-[#ffd631] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#2b2100] leading-none">
                                                    {t('Tác giả')}
                                                </span>
                                            </div>
                                            <div className="text-zinc-800 mt-0.5 leading-relaxed">
                                                {selectedTemplate.publicReplies[0].replace(/\{name\}/g, 'Hoàng Hải')}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-[11px] text-zinc-400 pl-2">
                                            <span>{t('Thích')}</span>
                                            <span>{t('Phản hồi')}</span>
                                            <span>{t('Tự động sau 15s')}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Instant Messenger Private DM Box */}
                            {simStep >= 4 && (
                                <div className="rounded-xl border border-[#d8b216] bg-white p-4 space-y-3 shadow-[0_2px_8px_rgba(216,178,22,0.08)]">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2.5">
                                        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-900">
                                            <PaperPlaneRight size={14} weight="fill" className="text-sky-600" />
                                            <span>{t('Tin nhắn Messenger gửi tới khách hàng')}</span>
                                        </div>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                                            <CheckCircle size={11} weight="fill" />
                                            <span>{t('Đã gửi vào Inbox')}</span>
                                        </span>
                                    </div>

                                    <div className="rounded-xl bg-zinc-50 border border-zinc-200/70 p-3 text-[12.5px] text-zinc-800 whitespace-pre-wrap leading-relaxed">
                                        {selectedTemplate.privateMessage.replace(/\{name\}/g, 'Hoàng Hải')}
                                    </div>

                                    {selectedTemplate.ctaTitle && (
                                        <div className="flex items-center justify-between gap-2 pt-0.5">
                                            <button
                                                type="button"
                                                onClick={() => window.open(selectedTemplate.ctaUrl, '_blank')}
                                                className="h-8 px-3.5 rounded-lg bg-[#ffd631]/30 border border-[#d8b216] text-[#2b2100] hover:bg-[#ffd631]/45 transition-colors inline-flex items-center gap-1.5 text-[12px] font-semibold cursor-pointer"
                                            >
                                                <span>{selectedTemplate.ctaTitle}</span>
                                                <ArrowUpRight size={12} weight="bold" />
                                            </button>
                                            <span className="text-[11px] text-zinc-400 truncate max-w-[220px]">
                                                {selectedTemplate.ctaUrl}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Pre-made Industry Templates (2x2 Grid) */}
            <section className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <h2 className="text-[15px] font-heading font-semibold text-zinc-900 flex items-center gap-2">
                        <Sparkle size={16} weight="duotone" className="text-[#9a7b00]" />
                        <span>{t('4 kịch bản Auto-DM chuẩn ngành dùng ngay')}</span>
                    </h2>
                    <span className="text-[12px] text-zinc-500">
                        {t('Nạp sẵn từ khóa, phản hồi công khai và tin nhắn Inbox sang Studio soạn bài')}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PREMADE_TEMPLATES.map((tpl) => {
                        const Icon = tpl.icon;
                        const isSelected = selectedTemplate.id === tpl.id;
                        return (
                            <div
                                key={tpl.id}
                                className={`rounded-2xl border bg-white p-5 flex flex-col justify-between gap-4 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${
                                    isSelected
                                        ? 'border-[#d8b216] ring-1 ring-[#ffd631]/35'
                                        : 'border-zinc-200/80 hover:border-zinc-300'
                                }`}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${tpl.iconStyle}`}
                                            >
                                                <Icon size={18} weight="duotone" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-[14px] font-heading font-semibold text-zinc-900 truncate">
                                                    {tpl.title}
                                                </h3>
                                                <span className="text-[11px] font-medium text-zinc-500">
                                                    {tpl.category}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-[12.5px] text-zinc-600 leading-relaxed">
                                        {tpl.desc}
                                    </p>

                                    <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/70 p-3 space-y-2 text-[12px]">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="text-zinc-500 font-medium mr-0.5">
                                                {t('Từ khóa:')}
                                            </span>
                                            {tpl.keywords.map((kw) => (
                                                <span
                                                    key={kw}
                                                    className="font-mono text-[11px] font-medium text-[#2b2100] bg-[#ffd631]/25 border border-[#d8b216]/50 px-1.5 py-0.5 rounded-md"
                                                >
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-[11.5px] text-zinc-500 line-clamp-2 leading-relaxed">
                                            <strong className="text-zinc-700 font-medium">
                                                {t('Tin nhắn DM:')}
                                            </strong>{' '}
                                            {tpl.privateMessage.replace(/\n+/g, ' ')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => handleSelectTemplateForSim(tpl, true)}
                                        className="h-9 px-3 rounded-xl border border-zinc-200/90 bg-white text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors cursor-pointer shrink-0"
                                    >
                                        {t('Xem mô phỏng')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleApplyTemplate(tpl)}
                                        className="flex-1 h-9 px-3.5 rounded-xl border border-zinc-200/90 bg-zinc-50/80 text-[12.5px] font-semibold text-zinc-900 hover:bg-[#ffd631]/30 hover:border-[#d8b216] hover:text-[#2b2100] transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <span>{t('Áp dụng sang Studio soạn bài')}</span>
                                        <ArrowUpRight size={13} weight="bold" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* 4. Recent Activity & Lead Log */}
            <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3.5">
                    <div>
                        <h2 className="text-[15px] font-heading font-semibold text-zinc-900 flex items-center gap-2">
                            <Users size={16} weight="duotone" className="text-zinc-700" />
                            <span>{t('Nhật ký tự động gửi tin & khách hàng tiềm năng')}</span>
                        </h2>
                        <p className="text-[12px] text-zinc-500 mt-0.5">
                            {t('Theo dõi các bình luận khớp từ khóa và trạng thái gửi tin nhắn thời gian thực.')}
                        </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-zinc-100 border border-zinc-200/80 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 self-start sm:self-center">
                        {t('5 tương tác gần nhất')}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12.5px]">
                        <thead>
                            <tr className="border-b border-zinc-200/80 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                                <th className="pb-2.5 pl-1">{t('Khách hàng')}</th>
                                <th className="pb-2.5">{t('Từ khóa khớp')}</th>
                                <th className="pb-2.5">{t('Bài viết kích hoạt')}</th>
                                <th className="pb-2.5">{t('Thời gian')}</th>
                                <th className="pb-2.5 pr-1 text-right">{t('Trạng thái')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {MOCK_LEAD_LOGS.map((log) => (
                                <tr key={log.id} className="hover:bg-zinc-50/70 transition-colors">
                                    <td className="py-3 pl-1 font-medium text-zinc-900">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-7 w-7 rounded-full bg-[#ffd631]/25 border border-[#d8b216]/60 text-[#2b2100] text-[11px] font-semibold flex items-center justify-center shrink-0">
                                                {log.name.slice(0, 1)}
                                            </div>
                                            <span className="whitespace-nowrap">{log.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-3">
                                        <span className="font-mono rounded-md bg-[#ffd631]/25 border border-[#d8b216]/60 px-2 py-0.5 text-[11px] font-semibold text-[#2b2100]">
                                            {log.keyword}
                                        </span>
                                    </td>
                                    <td className="py-3 text-zinc-600 max-w-[280px] truncate">
                                        {log.post}
                                    </td>
                                    <td className="py-3 text-zinc-500 text-[12px] whitespace-nowrap">
                                        {log.time}
                                    </td>
                                    <td className="py-3 pr-1 text-right">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 whitespace-nowrap">
                                            <CheckCircle size={12} weight="fill" />
                                            <span>{t('Đã gửi DM')}</span>
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
