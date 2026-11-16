import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import {
    ChatCircleDots,
    CaretUp,
    CaretDown,
    Plus,
    X,
    Sparkle,
    Heart,
    PaperPlaneRight,
    LinkSimple,
    Clock,
    CheckCircle,
    Info,
    WarningCircle,
    Play,
} from '@phosphor-icons/react';

const SUGGESTED_KEYWORDS = ['inbox', 'giá', 'tư vấn', 'tài liệu', 'link', 'code', 'mua', 'nhận'];

export default function AutoDmSettingsPanel({
    config,
    onChange,
    disabled = false,
}) {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(config?.enabled || false);
    const [keywordInput, setKeywordInput] = useState('');
    const [simulatorOpen, setSimulatorOpen] = useState(false);
    const [simComment, setSimComment] = useState('Inbox mình xin giá và tư vấn nhé');
    const [simResult, setSimResult] = useState(null);
    const [simStep, setSimStep] = useState(0);

    const isEnabled = !!config?.enabled;

    const updateConfig = (patch) => {
        onChange?.({
            ...config,
            ...patch,
        });
    };

    const handleToggle = (e) => {
        e?.stopPropagation?.();
        if (disabled) return;
        const next = !isEnabled;
        updateConfig({ enabled: next });
        if (next) setIsExpanded(true);
    };

    // Keyword tag management
    const handleAddKeyword = (kw) => {
        const clean = kw.trim().toLowerCase();
        if (!clean) return;
        const current = config?.keywords || [];
        if (!current.includes(clean)) {
            updateConfig({ keywords: [...current, clean] });
        }
        setKeywordInput('');
    };

    const handleRemoveKeyword = (kw) => {
        const current = config?.keywords || [];
        updateConfig({ keywords: current.filter((k) => k !== kw) });
    };

    // Public reply rotation templates
    const handleAddReply = () => {
        const current = config?.publicReplies || [];
        updateConfig({
            publicReplies: [
                ...current,
                'Dạ {name} kiểm tra tin nhắn chờ / inbox của page giúp mình nhé! ❤️',
            ],
        });
    };

    const handleUpdateReply = (index, value) => {
        const current = [...(config?.publicReplies || [])];
        current[index] = value;
        updateConfig({ publicReplies: current });
    };

    const handleRemoveReply = (index) => {
        const current = (config?.publicReplies || []).filter((_, i) => i !== index);
        updateConfig({ publicReplies: current });
    };

    // Simulator test run
    const runSimulator = () => {
        setSimStep(1);
        setSimResult(null);

        // Step 1: Customer comments
        setTimeout(() => {
            setSimStep(2); // Fanpage likes
        }, 600);

        setTimeout(() => {
            setSimStep(3); // Fanpage replies publicly
            const replies = config?.publicReplies || [
                'Dạ bạn kiểm tra tin nhắn riêng của page nhé! ❤️',
            ];
            const chosenReply = replies[Math.floor(Math.random() * replies.length)].replace(
                /\{name\}/g,
                'Khách hàng'
            );

            setSimResult({
                liked: config?.autoLike !== false,
                publicReply: chosenReply,
                privateMessage: (
                    config?.privateMessage ||
                    'Chào bạn, cảm ơn bạn đã quan tâm! Dưới đây là thông tin chi tiết dành cho bạn:'
                ).replace(/\{name\}/g, 'Khách hàng'),
                ctaTitle: config?.ctaTitle || 'Xem chi tiết ngay',
                ctaUrl: config?.ctaUrl || 'https://socialchoice.site',
            });
            setSimStep(4); // Fanpage sends DM
        }, 1400);
    };

    return (
        <section className="panel overflow-hidden border border-border transition shadow-2xs">
            {/* Header Accordion Bar */}
            <div
                onClick={() => {
                    if (disabled) return;
                    setIsExpanded((p) => !p);
                }}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[13px] font-semibold transition cursor-pointer select-none ${
                    isEnabled
                        ? 'bg-brand/15 border-b border-brand-dark/30 text-brand-ink'
                        : 'bg-card hover:bg-surface text-foreground'
                }`}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-dark/40 bg-brand/25 text-brand-ink shrink-0">
                        <ChatCircleDots size={16} weight="duotone" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">
                                {t('Comment-to-Inbox: Tự động Reply & Nhắn tin DM')}
                            </span>
                            <span className="rounded-md bg-amber-100 border border-amber-300 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
                                LEAD BOT
                            </span>
                        </div>
                        <span className="block text-[11px] font-normal text-muted-foreground truncate">
                            {t('Tự động like, trả lời bình luận và gửi tin nhắn riêng qua Messenger theo từ khóa')}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Toggle Switch */}
                    <button
                        type="button"
                        role="switch"
                        aria-checked={isEnabled}
                        disabled={disabled}
                        onClick={handleToggle}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
                            isEnabled ? 'bg-brand-dark' : 'bg-muted'
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                isEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsExpanded((p) => !p)}
                        className="grid size-7 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:border-brand-dark hover:text-brand-ink cursor-pointer"
                    >
                        {isExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
                    </button>
                </div>
            </div>

            {/* Expanded Config Body */}
            {isExpanded && (
                <div className="p-4 sm:p-5 space-y-5 bg-card/50">
                    {!isEnabled && (
                        <div className="rounded-xl border border-brand-dark/30 bg-brand/10 p-3 text-xs text-brand-ink flex items-center justify-between">
                            <span>
                                {t('Gạt công tắc góc phải để kích hoạt tính năng tự động gửi tin nhắn cho bài viết này.')}
                            </span>
                            <button
                                type="button"
                                onClick={handleToggle}
                                className="font-bold underline cursor-pointer ml-2 shrink-0"
                            >
                                {t('Bật ngay')}
                            </button>
                        </div>
                    )}

                    <div className={`space-y-5 transition-opacity ${isEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        {/* 1. Trigger Keywords */}
                        <div className="space-y-2.5">
                            <label className="text-xs font-bold text-foreground flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <Sparkle size={15} className="text-brand-dark" />
                                    <span>{t('1. Từ khóa kích hoạt (Trigger Keywords)')}</span>
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => updateConfig({ matchAll: false })}
                                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition ${
                                            !config?.matchAll
                                                ? 'bg-brand border-brand-dark text-brand-ink'
                                                : 'bg-surface border-border text-muted-foreground'
                                        }`}
                                    >
                                        {t('Theo từ khóa')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateConfig({ matchAll: true })}
                                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition ${
                                            config?.matchAll
                                                ? 'bg-brand border-brand-dark text-brand-ink'
                                                : 'bg-surface border-border text-muted-foreground'
                                        }`}
                                    >
                                        {t('Tất cả bình luận')}
                                    </button>
                                </div>
                            </label>

                            {!config?.matchAll ? (
                                <div className="space-y-2">
                                    {/* Keyword Tag Input */}
                                    <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-border bg-surface/40 focus-within:border-brand-dark focus-within:bg-card transition">
                                        {(config?.keywords || ['inbox', 'giá', 'tư vấn']).map((kw) => (
                                            <span
                                                key={kw}
                                                className="inline-flex items-center gap-1 rounded-lg bg-brand/20 border border-brand-dark/30 px-2.5 py-1 text-xs font-bold text-brand-ink"
                                            >
                                                <span>{kw}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveKeyword(kw)}
                                                    className="hover:opacity-75 cursor-pointer"
                                                >
                                                    <X size={12} weight="bold" />
                                                </button>
                                            </span>
                                        ))}

                                        <input
                                            type="text"
                                            value={keywordInput}
                                            onChange={(e) => setKeywordInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ',') {
                                                    e.preventDefault();
                                                    handleAddKeyword(keywordInput);
                                                }
                                            }}
                                            placeholder={t('Nhập từ khóa và gõ Enter...')}
                                            className="flex-1 min-w-[140px] bg-transparent text-xs text-foreground outline-none py-1 px-1 placeholder:text-muted-foreground"
                                        />
                                    </div>

                                    {/* Suggested Keyword Chips */}
                                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                        <span>{t('Gợi ý nhanh:')}</span>
                                        {SUGGESTED_KEYWORDS.map((s) => {
                                            const isAdded = (config?.keywords || []).includes(s);
                                            return (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    disabled={isAdded}
                                                    onClick={() => handleAddKeyword(s)}
                                                    className={`px-2 py-0.5 rounded-md border text-[10px] font-bold transition cursor-pointer ${
                                                        isAdded
                                                            ? 'border-border/40 text-muted-foreground/40 bg-surface/30'
                                                            : 'border-border bg-card text-foreground hover:border-brand-dark hover:bg-brand/10'
                                                    }`}
                                                >
                                                    +{s}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 rounded-xl border border-brand-dark/25 bg-brand/10 text-xs text-brand-ink">
                                    {t('Hệ thống sẽ phản hồi và gửi tin nhắn cho MỌI bình luận mới trên bài viết này.')}
                                </div>
                            )}
                        </div>

                        {/* 2. Public Comment Actions (Like & Public Reply Rotation) */}
                        <div className="space-y-3 pt-2 border-t border-border/60">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Heart size={15} weight="fill" className="text-rose-500" />
                                    <span>{t('2. Phản hồi công khai trên bình luận (Public Reply)')}</span>
                                </label>

                                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={config?.autoLike !== false}
                                        onChange={(e) => updateConfig({ autoLike: e.target.checked })}
                                        className="h-4 w-4 rounded border-border text-brand-dark focus:ring-brand-dark cursor-pointer"
                                    />
                                    <span>{t('Tự động Like bình luận')}</span>
                                </label>
                            </div>

                            {/* Rotational Public Replies */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>
                                        {t('Xoay vòng câu trả lời (tránh bị Meta coi là spam). Hỗ trợ ')}
                                        <code className="text-brand-ink bg-brand/20 px-1 py-0.2 rounded font-mono font-bold">
                                            {'{name}'}
                                        </code>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleAddReply}
                                        className="text-brand-dark hover:underline font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus size={12} weight="bold" />
                                        <span>{t('Thêm mẫu câu')}</span>
                                    </button>
                                </div>

                                {(
                                    config?.publicReplies || [
                                        'Dạ {name} kiểm tra tin nhắn riêng của page nhé! ❤️',
                                        'Mình đã gửi thông tin chi tiết qua inbox cho {name} rồi nha!',
                                    ]
                                ).map((reply, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="size-6 rounded-full bg-surface border border-border text-[10px] font-bold text-muted-foreground grid place-items-center shrink-0">
                                            #{idx + 1}
                                        </span>
                                        <input
                                            type="text"
                                            value={reply}
                                            onChange={(e) => handleUpdateReply(idx, e.target.value)}
                                            placeholder="Dạ {name} check inbox giúp mình nhé! ❤️"
                                            className="flex-1 rounded-xl border border-border bg-surface/40 px-3 py-1.5 text-xs text-foreground outline-none focus:border-brand-dark focus:bg-card transition"
                                        />
                                        {(config?.publicReplies || []).length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveReply(idx)}
                                                className="text-muted-foreground hover:text-dangerFg cursor-pointer p-1"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. Private DM Message (The Lead Offer) */}
                        <div className="space-y-2.5 pt-2 border-t border-border/60">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <PaperPlaneRight size={15} weight="fill" className="text-blue-500" />
                                <span>{t('3. Tin nhắn gửi vào Inbox khách hàng (Private DM)')}</span>
                            </label>

                            <div className="rounded-xl border border-border bg-surface/40 focus-within:border-brand-dark focus-within:bg-card transition">
                                <textarea
                                    value={
                                        config?.privateMessage ??
                                        'Chào {name}, cảm ơn bạn đã quan tâm đến bài viết của chúng mình!\n\nDưới đây là thông tin chi tiết & tài liệu bạn yêu cầu:\n👉 https://socialchoice.site\n\nNếu cần hỗ trợ thêm, bạn chỉ cần nhắn lại cho page nhé!'
                                    }
                                    onChange={(e) => updateConfig({ privateMessage: e.target.value })}
                                    rows={4}
                                    placeholder={t('Chào {name}, cảm ơn bạn đã quan tâm...')}
                                    className="w-full bg-transparent px-3 py-2 text-xs text-foreground outline-none resize-none placeholder:text-muted-foreground"
                                />
                                <div className="flex items-center justify-between border-t border-border/50 bg-surface/30 px-3 py-1.5 text-[11px] text-muted-foreground">
                                    <span>{t('Hỗ trợ chèn link, số điện thoại, tag {name}')}</span>
                                    <span className="font-mono text-[10px]">
                                        {(config?.privateMessage || '').length} {t('ký tự')}
                                    </span>
                                </div>
                            </div>

                            {/* Call to Action Button */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                <div>
                                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                                        {t('Tên nút bấm (CTA Button)')}
                                    </label>
                                    <input
                                        type="text"
                                        value={config?.ctaTitle ?? 'Mở liên kết ngay'}
                                        onChange={(e) => updateConfig({ ctaTitle: e.target.value })}
                                        placeholder="Xem chi tiết / Nhận ưu đãi"
                                        className="w-full rounded-xl border border-border bg-surface/40 px-3 py-1.5 text-xs text-foreground outline-none focus:border-brand-dark focus:bg-card transition"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                                        {t('Đường link nút bấm (URL)')}
                                    </label>
                                    <input
                                        type="url"
                                        value={config?.ctaUrl ?? ''}
                                        onChange={(e) => updateConfig({ ctaUrl: e.target.value })}
                                        placeholder="https://yourwebsite.com/offer"
                                        className="w-full rounded-xl border border-border bg-surface/40 px-3 py-1.5 text-xs text-foreground outline-none focus:border-brand-dark focus:bg-card transition"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 4. Natural Delay & Test Simulator Action */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
                            <div className="flex items-center gap-2 text-xs">
                                <Clock size={15} className="text-muted-foreground" />
                                <span className="font-bold text-muted-foreground">{t('Độ trễ gửi tin:')}</span>
                                <select
                                    value={config?.delaySeconds ?? 15}
                                    onChange={(e) => updateConfig({ delaySeconds: Number(e.target.value) })}
                                    className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground outline-none"
                                >
                                    <option value={0}>0s ({t('Ngay lập tức')})</option>
                                    <option value={15}>15s ({t('Tự nhiên - Khuyên dùng')})</option>
                                    <option value={30}>30s</option>
                                    <option value={60}>60s</option>
                                </select>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setSimulatorOpen(true);
                                    runSimulator();
                                }}
                                className="flex items-center gap-1.5 rounded-xl border border-brand-dark bg-brand px-3 py-1.5 text-xs font-bold text-brand-ink hover:bg-[#ffe059] transition cursor-pointer shadow-2xs"
                            >
                                <Play size={13} weight="fill" />
                                <span>{t('Mô phỏng thử nghiệm Auto-DM')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Test Simulator Modal */}
            {simulatorOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between border-b border-border/80 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="flex size-7 items-center justify-center rounded-lg bg-brand border border-brand-dark text-brand-ink">
                                    <ChatCircleDots size={16} weight="bold" />
                                </span>
                                <div>
                                    <h4 className="text-sm font-bold text-foreground">
                                        {t('Mô Phỏng Trải Nghiệm Khách Hàng')}
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground">
                                        {t('Kiểm tra quy trình: Khách comment ➔ Thích ➔ Reply ➔ Nhận tin nhắn DM')}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSimulatorOpen(false)}
                                className="size-7 rounded-lg text-muted-foreground hover:bg-muted grid place-items-center cursor-pointer"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Interactive Comment Input */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground">
                                {t('Giả lập bình luận của khách:')}
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={simComment}
                                    onChange={(e) => setSimComment(e.target.value)}
                                    placeholder="inbox mình xin giá"
                                    className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-brand-dark"
                                />
                                <button
                                    type="button"
                                    onClick={runSimulator}
                                    className="rounded-xl border border-brand-dark bg-brand px-3 py-2 text-xs font-bold text-brand-ink hover:bg-[#ffe059] cursor-pointer"
                                >
                                    {t('Gửi thử')}
                                </button>
                            </div>
                        </div>

                        {/* Simulation Visual Chain */}
                        <div className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
                            {/* Visitor Comment */}
                            <div className="flex items-start gap-2.5">
                                <div className="size-7 rounded-full bg-blue-500 text-white text-xs font-bold grid place-items-center shrink-0">
                                    K
                                </div>
                                <div className="flex-1">
                                    <div className="rounded-2xl bg-card border border-border px-3.5 py-2 text-xs space-y-1">
                                        <div className="font-bold text-foreground">Nguyễn Khách Hàng</div>
                                        <div className="text-foreground/90">{simComment}</div>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1 pl-2">
                                        <span>Vừa xong</span>
                                        {simStep >= 2 && (
                                            <span className="flex items-center gap-1 text-rose-500 font-bold">
                                                <Heart size={11} weight="fill" />
                                                <span>Fanpage đã thích</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Fanpage Public Reply */}
                            {simStep >= 3 && simResult && (
                                <div className="flex items-start gap-2.5 pl-8">
                                    <div className="size-6 rounded-full bg-brand border border-brand-dark text-brand-ink text-[10px] font-bold grid place-items-center shrink-0">
                                        SC
                                    </div>
                                    <div className="flex-1">
                                        <div className="rounded-2xl bg-brand/10 border border-brand-dark/30 px-3.5 py-2 text-xs space-y-1">
                                            <div className="font-bold text-brand-ink flex items-center gap-1.5">
                                                <span>Fanpage Thương hiệu</span>
                                                <span className="rounded bg-brand px-1 py-0.2 text-[9px] font-extrabold text-brand-ink">
                                                    Tác giả
                                                </span>
                                            </div>
                                            <div className="text-foreground">{simResult.publicReply}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Messenger Private DM Toast */}
                            {simStep >= 4 && simResult && (
                                <div className="mt-4 rounded-xl border-2 border-brand-dark bg-card p-3.5 space-y-2.5 shadow-md animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex items-center justify-between text-xs font-bold text-foreground border-b border-border/60 pb-2">
                                        <div className="flex items-center gap-1.5 text-blue-600">
                                            <PaperPlaneRight size={14} weight="fill" />
                                            <span>Messenger DM vừa nhận được:</span>
                                        </div>
                                        <span className="font-mono text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                            ĐÃ GỬI VÀO INBOX
                                        </span>
                                    </div>
                                    <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                                        {simResult.privateMessage}
                                    </p>
                                    {simResult.ctaTitle && (
                                        <div className="pt-1">
                                            <a
                                                href={simResult.ctaUrl || '#'}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn-skew inline-flex items-center gap-1.5 !py-1.5 !px-3 text-xs font-bold"
                                            >
                                                <span>{simResult.ctaTitle}</span>
                                                <LinkSimple size={13} weight="bold" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSimulatorOpen(false)}
                                className="rounded-xl border border-brand-dark bg-brand px-4 py-2 text-xs font-bold text-brand-ink hover:bg-[#ffe059] cursor-pointer"
                            >
                                {t('Hoàn tất & Tiếp tục')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
