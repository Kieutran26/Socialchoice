import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import {
    ChatCircleDots,
    Sparkle,
    Heart,
    PaperPlaneRight,
    Play,
    Plus,
    CheckCircle,
    ArrowUpRight,
    Users,
    EnvelopeSimple,
    CursorClick,
    ArrowsClockwise,
    Lightning,
    FileText,
    Tag,
    Ticket,
    Briefcase,
} from '@phosphor-icons/react';

const PREMADE_TEMPLATES = [
    {
        id: 'lead_magnet',
        title: '🎁 Tặng Ebook & Tài liệu độc quyền (Lead Magnet)',
        desc: 'Tự động gửi link Google Drive / Notion tài liệu ngay khi khách comment "Tài liệu" hoặc "Link".',
        icon: FileText,
        keywords: ['tài liệu', 'link', 'nhận', 'xin', 'ebook'],
        publicReplies: [
            'Dạ {name} kiểm tra inbox của mình nhé, mình vừa gửi trọn bộ tài liệu cho bạn rồi! ❤️',
            'Tài liệu đã được gửi thẳng vào tin nhắn của {name} rồi nha!',
        ],
        privateMessage: 'Chào {name}! Cảm ơn bạn đã quan tâm. Dưới đây là link tải trọn bộ tài liệu độc quyền:\n👉 https://socialchoice.site/resources/growth-playbook\n\nChúc bạn áp dụng thành công và đạt nhiều kết quả bứt phá!',
        ctaTitle: 'Mở trọn bộ tài liệu ngay',
        ctaUrl: 'https://socialchoice.site/resources/growth-playbook',
    },
    {
        id: 'sales_inbox',
        title: '🏷️ Báo giá & Tư vấn bán hàng thần tốc (E-Commerce)',
        desc: 'Tự động like, trả lời và gửi bảng báo giá kèm ưu đãi vào tin nhắn khi khách hỏi giá.',
        icon: Tag,
        keywords: ['giá', 'inbox', 'ib', 'tư vấn', 'bao nhieu', 'mua'],
        publicReplies: [
            'Dạ {name} check tin nhắn riêng giúp em nhé, em gửi bảng giá chi tiết kèm ưu đãi hôm nay ạ! 🛍️',
            'Em đã nhắn tin riêng cho {name} kèm voucher giảm giá rồi nha!',
        ],
        privateMessage: 'Dạ em chào {name} ạ! Mẫu sản phẩm bạn quan tâm đang có giá ưu đãi đặc biệt hôm nay chỉ 299k (giá gốc 450k) + Freeship toàn quốc.\n\nBạn xem chi tiết bảng màu & đặt hàng tại đây nhé:\n👉 https://socialchoice.site/shop/flash-sale',
        ctaTitle: 'Xem bảng giá & Đặt hàng',
        ctaUrl: 'https://socialchoice.site/shop/flash-sale',
    },
    {
        id: 'promo_voucher',
        title: '🎟️ Tặng Voucher giảm giá độc quyền (Flash Promotion)',
        desc: 'Kích thích khách comment từ khóa để nhận mã giảm giá 20% - 50% trước khi mua.',
        icon: Ticket,
        keywords: ['voucher', 'mã', 'code', 'khuyến mãi', 'giam gia'],
        publicReplies: [
            'Dạ {name} kiểm tra inbox lấy mã giảm giá 20% độc quyền nhé! 🎉',
            'Mã voucher đã sẵn sàng trong tin nhắn của {name} rồi nha!',
        ],
        privateMessage: 'Chúc mừng {name} đã nhận được Voucher độc quyền giảm 20% cho đơn hàng đầu tiên!\n\nMã ưu đãi: SCCHOICE20\n(Hạn dùng: 24h kể từ bây giờ)\n\nÁp dụng trực tiếp tại giỏ hàng:',
        ctaTitle: 'Sử dụng Voucher 20%',
        ctaUrl: 'https://socialchoice.site/checkout?coupon=SCCHOICE20',
    },
    {
        id: 'recruitment',
        title: '💼 Tuyển dụng & Nhận JD mô tả công việc (HR Hiring)',
        desc: 'Ứng viên comment "Quan tâm" hoặc "JD", bot tự động gửi mô tả công việc và link nộp CV.',
        icon: Briefcase,
        keywords: ['jd', 'quan tâm', 'cv', 'ứng tuyển', 'tuyển dụng'],
        publicReplies: [
            'Chào {name}, team nhân sự đã gửi JD chi tiết và mức đãi ngộ vào inbox cho bạn rồi nhé!',
            'Bạn {name} kiểm tra tin nhắn để xem JD và link nộp CV trực tiếp nha!',
        ],
        privateMessage: 'Chào bạn {name}, cảm ơn bạn đã quan tâm đến cơ hội nghề nghiệp tại công ty!\n\nChi tiết mô tả công việc (JD), mức lương & chế độ đãi ngộ:\n👉 https://socialchoice.site/careers/open-roles\n\nRất mong được đồng hành cùng bạn!',
        ctaTitle: 'Xem JD & Nộp hồ sơ',
        ctaUrl: 'https://socialchoice.site/careers/open-roles',
    },
];

const MOCK_LEAD_LOGS = [
    { id: 1, name: 'Trần Minh Hoàng', keyword: 'giá', post: 'Bộ sưu tập thời trang Thu Đông 2026', time: '5 phút trước', liked: true, replied: true, dmed: true },
    { id: 2, name: 'Lê Thuỳ Dung', keyword: 'tài liệu', post: 'Ebook 100+ Ý tưởng Content viral Facebook', time: '18 phút trước', liked: true, replied: true, dmed: true },
    { id: 3, name: 'Nguyễn Văn Tuấn', keyword: 'inbox', post: 'Khóa học tối ưu thuật toán đa kênh 2026', time: '34 phút trước', liked: true, replied: true, dmed: true },
    { id: 4, name: 'Phạm Quỳnh Nga', keyword: 'voucher', post: 'Flash Sale Cuối Tuần Giảm 50%', time: '1 giờ trước', liked: true, replied: true, dmed: true },
    { id: 5, name: 'Vũ Đức Anh', keyword: 'jd', post: 'Tuyển dụng Senior Content Creator HN/HCM', time: '2 giờ trước', liked: true, replied: true, dmed: true },
];

export default function AutoDmTool() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Simulator State
    const [simKeyword, setSimKeyword] = useState('giá');
    const [simInput, setSimInput] = useState('Shop ơi cho mình xin giá và tư vấn màu sắc với');
    const [simStep, setSimStep] = useState(0); // 0: idle, 1: commented, 2: liked, 3: replied, 4: dmed
    const [selectedTemplate, setSelectedTemplate] = useState(PREMADE_TEMPLATES[0]);

    const handleRunSim = () => {
        setSimStep(1);
        setTimeout(() => setSimStep(2), 500); // Like
        setTimeout(() => setSimStep(3), 1100); // Public reply
        setTimeout(() => setSimStep(4), 1800); // Messenger DM
    };

    const handleApplyTemplate = (tpl) => {
        // Navigate to /create with encoded auto_dm params
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

    return (
        <div className="space-y-6">
            {/* Top KPI Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                        <span>{t('Bình luận đã xử lý')}</span>
                        <ChatCircleDots size={16} className="text-brand-dark" />
                    </div>
                    <div className="text-2xl font-extrabold font-heading text-foreground">1,842</div>
                    <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <span>↑ 24%</span>
                        <span className="text-muted-foreground font-normal">{t('so với tuần trước')}</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                        <span>{t('Tin nhắn DM đã bắn')}</span>
                        <PaperPlaneRight size={16} className="text-blue-500" />
                    </div>
                    <div className="text-2xl font-extrabold font-heading text-foreground">1,826</div>
                    <div className="text-[11px] text-muted-foreground">
                        {t('Tỷ lệ gửi thành công')} <strong className="text-foreground">99.1%</strong>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                        <span>{t('Leads thu thập')}</span>
                        <Users size={16} className="text-amber-500" />
                    </div>
                    <div className="text-2xl font-extrabold font-heading text-foreground">745</div>
                    <div className="text-[11px] text-emerald-600 font-bold">
                        {t('Tỷ lệ mở DM 88.4%')}
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                        <span>{t('Tốc độ phản hồi')}</span>
                        <Lightning size={16} weight="fill" className="text-brand-dark" />
                    </div>
                    <div className="text-2xl font-extrabold font-heading text-foreground">15s</div>
                    <div className="text-[11px] text-muted-foreground">
                        {t('Giãn cách tự nhiên chống spam')}
                    </div>
                </div>
            </div>

            {/* Interactive Live Chat Simulator */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                            <ChatCircleDots size={16} weight="duotone" className="text-brand-dark" />
                            <span>{t('Mô Phỏng Trải Nghiệm Khách Hàng (Interactive Chatbot Simulator)')}</span>
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {t('Kiểm tra chuỗi phản hồi tự động trong môi trường mô phỏng thực tế trước khi đăng bài')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSimStep(0);
                                setTimeout(handleRunSim, 100);
                            }}
                            className="btn-skew flex items-center gap-1.5 !py-1.5 !px-3.5 text-xs font-bold cursor-pointer"
                        >
                            <Play size={13} weight="fill" />
                            <span>{t('Chạy thử mô phỏng')}</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Simulator Inputs & Preset Selector (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
                            <label className="text-xs font-bold text-foreground block">
                                {t('Chọn kịch bản mẫu để thử nghiệm:')}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {PREMADE_TEMPLATES.map((tpl) => (
                                    <button
                                        key={tpl.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedTemplate(tpl);
                                            setSimInput(`Cho mình xin ${tpl.keywords[0]} với shop`);
                                            setSimStep(0);
                                        }}
                                        className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                                            selectedTemplate.id === tpl.id
                                                ? 'bg-brand/20 border-brand-dark text-brand-ink font-bold'
                                                : 'bg-card border-border text-foreground hover:bg-surface'
                                        }`}
                                    >
                                        <div className="truncate text-[11px] font-bold">{tpl.title.split(' ')[0]} {tpl.title.split(' ')[1]}</div>
                                        <span className="font-mono text-[10px] text-muted-foreground truncate">
                                            Từ khóa: {tpl.keywords.slice(0, 2).join(', ')}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
                            <label className="text-xs font-bold text-foreground block">
                                {t('Giả lập bình luận của khách:')}
                            </label>
                            <input
                                type="text"
                                value={simInput}
                                onChange={(e) => setSimInput(e.target.value)}
                                placeholder="Gõ bình luận có chứa từ khóa..."
                                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:border-brand-dark transition"
                            />
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>Từ khóa nhận diện: <strong className="text-brand-ink bg-brand/30 px-1.5 py-0.5 rounded font-mono">{selectedTemplate.keywords.find(k => simInput.toLowerCase().includes(k)) || 'Tất cả'}</strong></span>
                                <button
                                    type="button"
                                    onClick={handleRunSim}
                                    className="text-xs font-bold text-brand-dark hover:underline cursor-pointer"
                                >
                                    {t('Gửi ngay ➔')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Live Screen Preview (7 cols) */}
                    <div className="lg:col-span-7 space-y-3">
                        <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-sm">
                            <div className="text-xs font-bold text-muted-foreground flex items-center justify-between pb-2 border-b border-border/70">
                                <span>{t('Giao diện Facebook Post & Messenger Live')}</span>
                                <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                                    BOT ACTIVE
                                </span>
                            </div>

                            {/* Visitor Comment */}
                            <div className="flex items-start gap-3">
                                <div className="size-8 rounded-full bg-blue-600 text-white font-bold text-xs grid place-items-center shrink-0">
                                    H
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="rounded-2xl bg-surface border border-border px-3.5 py-2.5 text-xs">
                                        <div className="font-bold text-foreground">Hoàng Hải</div>
                                        <div className="text-foreground/90 mt-0.5">{simInput}</div>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground pl-2">
                                        <span>Thích</span>
                                        <span>Phản hồi</span>
                                        <span>1 phút trước</span>
                                        {simStep >= 2 && (
                                            <span className="flex items-center gap-1 text-rose-500 font-bold ml-2 animate-in zoom-in-75">
                                                <Heart size={12} weight="fill" />
                                                <span>Fanpage đã thích</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Fanpage Public Reply */}
                            {simStep >= 3 && (
                                <div className="flex items-start gap-3 pl-10 animate-in fade-in slide-in-from-top-2">
                                    <div className="size-7 rounded-full bg-brand border border-brand-dark text-brand-ink font-bold text-[10px] grid place-items-center shrink-0">
                                        SC
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="rounded-2xl bg-brand/15 border border-brand-dark/30 px-3.5 py-2.5 text-xs">
                                            <div className="font-bold text-brand-ink flex items-center gap-1.5">
                                                <span>Socialchoice Fanpage</span>
                                                <span className="rounded bg-brand px-1.5 py-0.2 text-[9px] font-extrabold text-brand-ink">
                                                    Tác giả
                                                </span>
                                            </div>
                                            <div className="text-foreground mt-0.5">
                                                {selectedTemplate.publicReplies[0].replace(/\{name\}/g, 'Hoàng Hải')}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground pl-2">
                                            <span>Thích</span>
                                            <span>Phản hồi</span>
                                            <span>Vừa xong</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Instant Messenger Private DM Box */}
                            {simStep >= 4 && (
                                <div className="mt-4 rounded-xl border-2 border-brand-dark bg-surface p-4 space-y-3 shadow-md animate-in fade-in slide-in-from-bottom-3">
                                    <div className="flex items-center justify-between text-xs font-bold border-b border-border pb-2">
                                        <div className="flex items-center gap-1.5 text-blue-600">
                                            <PaperPlaneRight size={15} weight="fill" />
                                            <span>Khách hàng nhận được tin nhắn Messenger:</span>
                                        </div>
                                        <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-bold">
                                            ✓ ĐÃ GỬI VÀO INBOX
                                        </span>
                                    </div>

                                    <div className="rounded-xl bg-card border border-border p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                                        {selectedTemplate.privateMessage.replace(/\{name\}/g, 'Hoàng Hải')}
                                    </div>

                                    {selectedTemplate.ctaTitle && (
                                        <div className="pt-1">
                                            <button
                                                type="button"
                                                onClick={() => window.open(selectedTemplate.ctaUrl, '_blank')}
                                                className="btn-skew inline-flex items-center gap-1.5 !py-1.5 !px-3.5 text-xs font-bold cursor-pointer"
                                            >
                                                <span>{selectedTemplate.ctaTitle}</span>
                                                <ArrowUpRight size={13} weight="bold" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Pre-made Templates Grid */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Sparkle size={16} weight="fill" className="text-brand-dark" />
                        <span>{t('4 Mẫu Kịch Bản Auto-DM Chuẩn Ngành Dùng Ngay')}</span>
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                        {t('Nhấp để nạp cấu hình và chuyển thẳng sang Studio soạn bài')}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PREMADE_TEMPLATES.map((tpl) => {
                        const Icon = tpl.icon;
                        return (
                            <div
                                key={tpl.id}
                                className="rounded-2xl border border-border bg-card p-4.5 space-y-3 flex flex-col justify-between hover:border-brand-dark/70 transition shadow-xs"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="size-8 rounded-xl bg-brand/20 text-brand-ink grid place-items-center">
                                                <Icon size={18} weight="bold" />
                                            </div>
                                            <h4 className="text-xs font-bold text-foreground">
                                                {tpl.title}
                                            </h4>
                                        </div>
                                    </div>

                                    <p className="text-[11px] text-muted-foreground">
                                        {tpl.desc}
                                    </p>

                                    <div className="p-2.5 rounded-xl border border-border bg-surface/50 text-[11px] space-y-1">
                                        <div className="flex items-center gap-1.5">
                                            <strong className="text-foreground">{t('Từ khóa kích hoạt:')}</strong>
                                            <span className="font-mono text-brand-ink bg-brand/25 px-1.5 py-0.2 rounded font-bold">
                                                {tpl.keywords.join(', ')}
                                            </span>
                                        </div>
                                        <div className="text-muted-foreground truncate">
                                            <strong>{t('Tin nhắn DM:')}</strong> {tpl.privateMessage.slice(0, 75)}...
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleApplyTemplate(tpl)}
                                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground hover:border-brand-dark hover:bg-brand hover:text-brand-ink transition cursor-pointer"
                                >
                                    <span>{t('Áp dụng mẫu này sang Studio soạn bài')}</span>
                                    <ArrowUpRight size={13} weight="bold" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Lead & Activity Log */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Users size={16} weight="duotone" className="text-brand-dark" />
                        <span>{t('Nhật Ký Tự Động Gửi Tin & Khách Hàng Tiềm Năng Gần Đây')}</span>
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                        {t('Tự động ghi nhận thời gian thực')}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-border/50 text-muted-foreground font-bold text-[10px] uppercase">
                                <th className="pb-2 pl-1">{t('Khách hàng')}</th>
                                <th className="pb-2">{t('Từ khóa')}</th>
                                <th className="pb-2">{t('Bài viết kích hoạt')}</th>
                                <th className="pb-2">{t('Thời gian')}</th>
                                <th className="pb-2 pr-1 text-right">{t('Trạng thái')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {MOCK_LEAD_LOGS.map((log) => (
                                <tr key={log.id} className="hover:bg-surface/40 transition">
                                    <td className="py-2.5 pl-1 font-semibold text-foreground flex items-center gap-2">
                                        <div className="size-6 rounded-full bg-brand/30 border border-brand-dark/40 text-brand-ink text-[10px] font-bold grid place-items-center">
                                            {log.name.slice(0, 1)}
                                        </div>
                                        <span>{log.name}</span>
                                    </td>
                                    <td className="py-2.5 font-mono">
                                        <span className="rounded-md bg-brand/20 border border-brand-dark/30 px-2 py-0.5 text-[10px] font-bold text-brand-ink">
                                            {log.keyword}
                                        </span>
                                    </td>
                                    <td className="py-2.5 text-muted-foreground max-w-[200px] truncate">
                                        {log.post}
                                    </td>
                                    <td className="py-2.5 text-muted-foreground text-[11px]">
                                        {log.time}
                                    </td>
                                    <td className="py-2.5 pr-1 text-right">
                                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                            <CheckCircle size={11} weight="fill" />
                                            <span>{t('Đã gửi DM')}</span>
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
