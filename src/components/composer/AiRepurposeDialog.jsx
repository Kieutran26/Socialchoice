import { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import {
    Sparkle,
    MagicWand,
    Copy,
    Check,
    ArrowsClockwise,
    FacebookLogo,
    LinkedinLogo,
    ThreadsLogo,
    TiktokLogo,
    Info,
    CheckCircle,
    Article,
    VideoCamera,
    ChatTeardropDots,
    Lightning,
    ArrowBendDoubleUpRight,
} from '@phosphor-icons/react';
import { repurposeAllPlatforms, generateHeuristicVariants } from '@/lib/ai-repurposer';
import ZaloIcon from '@/components/common/ZaloIcon';

const TONES = [
    { id: 'engaging', label: '🔥 Hấp dẫn & Tương tác cao', desc: 'Tập trung vào hook gây chú ý, giữ chân và kích thích bình luận' },
    { id: 'professional', label: '💼 Lãnh đạo tư tưởng (B2B)', desc: 'Văn phong chuyên môn sâu sắc, số liệu và bài học thực chiến' },
    { id: 'storytelling', label: '📖 Kể chuyện & Cảm xúc', desc: 'Dẫn dắt tự nhiên theo trải nghiệm cá nhân và góc nhìn đa chiều' },
    { id: 'concise', label: '⚡ Ngắn gọn & Trực diện', desc: 'Đi thẳng vào cốt lõi, loại bỏ từ thừa, tối ưu thời gian đọc' },
];

export default function AiRepurposeDialog({
    open,
    onClose,
    baseCaption = '',
    baseTitle = '',
    brandId = '',
    selectedAccounts = [],
    aiConfig = null,
    onApply,
}) {
    const { t } = useTranslation();
    const { toast } = useToast();

    const [sourceText, setSourceText] = useState('');
    const [tone, setTone] = useState('engaging');
    const [busy, setBusy] = useState(false);
    const [progressStatus, setProgressStatus] = useState('');
    const [copiedKey, setCopiedKey] = useState(null);

    // Kết quả 4 biến thể
    const [variants, setVariants] = useState({
        facebook: '',
        threads: '',
        linkedin: '',
        tiktok: '',
        zalo: '',
    });

    const [hasGenerated, setHasGenerated] = useState(false);
    const [isAiMode, setIsAiMode] = useState(false);

    // Tự động nạp nội dung khi mở modal
    useEffect(() => {
        if (open) {
            const initial = baseCaption || baseTitle || '';
            setSourceText(initial);
            if (!hasGenerated && initial.trim().length > 10) {
                // Tự động tạo bản phác thảo ban đầu
                const heuristic = generateHeuristicVariants({ text: initial, title: baseTitle, tone: 'engaging' });
                setVariants(heuristic);
                setHasGenerated(true);
            }
        }
    }, [open, baseCaption, baseTitle]);

    const handleGenerate = async () => {
        if (!sourceText.trim()) {
            toast({
                title: t('Chưa có nội dung gốc'),
                description: t('Vui lòng nhập ý tưởng, dàn ý hoặc bài viết mẫu để AI phân tích.'),
                variant: 'destructive',
            });
            return;
        }

        setBusy(true);
        setProgressStatus(t('Đang phân tích ý tưởng cốt lõi...'));

        try {
            const result = await repurposeAllPlatforms({
                text: sourceText,
                title: baseTitle,
                brandId,
                tone,
                aiConfig,
                onProgress: ({ message }) => {
                    setProgressStatus(message);
                },
            });

            setVariants(result.variants);
            setHasGenerated(true);
            setIsAiMode(result.isAiGenerated);

            toast({
                title: t('Đã tái sinh nội dung đa kênh thành công!'),
                description: result.isAiGenerated
                    ? t('Đã sử dụng trí tuệ nhân tạo để viết riêng cho 4 nền tảng.')
                    : t('Đã áp dụng công thức copywriting tối ưu hóa theo thuật toán.'),
            });
        } catch (error) {
            console.error('Error repurposing:', error);
            // Fallback ngay lập tức
            const heuristic = generateHeuristicVariants({ text: sourceText, title: baseTitle, tone });
            setVariants(heuristic);
            setHasGenerated(true);
            setIsAiMode(false);
            toast({
                title: t('Đã tạo theo mẫu chuẩn thuật toán'),
                description: error.message || t('Tự động chuyển sang mô hình quy chuẩn do không thể kết nối server AI.'),
            });
        } finally {
            setBusy(false);
            setProgressStatus('');
        }
    };

    const handleCopy = (platform, text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(platform);
        setTimeout(() => setCopiedKey(null), 2000);
        toast({ title: t(`Đã sao chép nội dung cho ${platform.toUpperCase()}`) });
    };

    const handleApplyAll = () => {
        if (onApply) {
            onApply(variants);
        }
        onClose();
    };

    // Thống kê tài khoản theo nền tảng
    const accountsByPlatform = useMemo(() => {
        const map = { facebook: 0, threads: 0, linkedin: 0, tiktok: 0, instagram: 0, zalo: 0 };
        selectedAccounts.forEach((acc) => {
            if (map[acc.platform] !== undefined) {
                map[acc.platform]++;
            }
        });
        return map;
    }, [selectedAccounts]);

    return (
        <Dialog open={open} onOpenChange={(val) => !busy && onClose(val)}>
            <DialogContent className="max-w-5xl !p-0 overflow-hidden bg-background">
                {/* Header */}
                <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-brand border border-brand-dark text-brand-ink shrink-0">
                            <Sparkle size={22} weight="fill" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                <span>{t('AI Tái Sinh Nội Dung Đa Kênh (1-Click Repurposer)')}</span>
                                <span className="rounded-full bg-brand/25 border border-brand-dark/40 px-2 py-0.5 text-[10px] font-bold text-brand-ink uppercase">
                                    {t('Pro Feature')}
                                </span>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                {t('Từ 1 ý tưởng ban đầu, thuật toán sẽ tự động phân tách và viết riêng cho thuật toán Facebook, Threads, LinkedIn & TikTok')}
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="p-6 max-h-[calc(86vh-130px)] overflow-y-auto space-y-6">
                    {/* Top Input & Settings */}
                    <div className="rounded-2xl border border-border bg-card p-4.5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <Article size={16} weight="duotone" className="text-brand-dark" />
                                <span>{t('Nội dung / Ý tưởng gốc')}</span>
                            </label>
                            {baseCaption && sourceText !== baseCaption && (
                                <button
                                    type="button"
                                    onClick={() => setSourceText(baseCaption)}
                                    className="text-[11px] font-medium text-brand-dark hover:underline cursor-pointer"
                                >
                                    {t('Khôi phục từ bài viết Studio')}
                                </button>
                            )}
                        </div>

                        <textarea
                            value={sourceText}
                            onChange={(e) => setSourceText(e.target.value)}
                            rows={3}
                            placeholder={t('Nhập dàn ý, ý tưởng chính, bài viết mẫu hoặc đường link cần biến thể...')}
                            className="block w-full resize-none rounded-xl border border-border bg-surface/50 p-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-brand-dark focus:bg-card focus:ring-2 focus:ring-brand/20 transition"
                        />

                        {/* Tone Selector & Trigger Button */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] font-medium text-muted-foreground mr-1">
                                    {t('Phong cách:')}
                                </span>
                                {TONES.map((tItem) => (
                                    <button
                                        key={tItem.id}
                                        type="button"
                                        onClick={() => setTone(tItem.id)}
                                        title={tItem.desc}
                                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                                            tone === tItem.id
                                                ? 'border-brand-dark bg-brand text-brand-ink font-semibold'
                                                : 'border-border bg-card text-muted-foreground hover:border-brand-dark/40 hover:text-foreground'
                                        }`}
                                    >
                                        {tItem.label}
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                disabled={busy || !sourceText.trim()}
                                onClick={handleGenerate}
                                className="btn-skew flex items-center gap-2 !py-1.5 !px-4 text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                                <MagicWand size={16} weight="duotone" className={busy ? 'animate-spin' : ''} />
                                <span>{busy ? progressStatus || t('Đang tái sinh...') : t('✨ Phân tích & Tái sinh 5 kênh')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Notification info bar */}
                    <div className="flex items-center justify-between rounded-xl border border-border/80 bg-surface/60 px-3.5 py-2 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Info size={14} className="text-brand-dark shrink-0" />
                            <span>
                                {isAiMode
                                    ? t('Đang sử dụng mô hình AI kết hợp quy tắc phân phối nội dung đa kênh.')
                                    : t('Đang áp dụng bộ khuôn cấu trúc nội dung tối ưu theo thuật toán tương tác.')}
                            </span>
                        </div>
                        <span className="font-mono text-[10px]">
                            {selectedAccounts.length} {t('tài khoản đã chọn')} (FB: {accountsByPlatform.facebook}, Threads: {accountsByPlatform.threads}, IN: {accountsByPlatform.linkedin}, TikTok: {accountsByPlatform.tiktok}, Zalo: {accountsByPlatform.zalo})
                        </span>
                    </div>

                    {/* 4 Platform Output Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Facebook */}
                        <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col focus-within:border-[#1877F2]/60 focus-within:ring-2 focus-within:ring-[#1877F2]/10 transition">
                            <div className="flex items-center justify-between border-b border-border/70 bg-[#1877F2]/5 px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="size-6 rounded-md bg-[#1877F2]/15 text-[#1877F2] grid place-items-center">
                                        <FacebookLogo size={16} weight="fill" />
                                    </div>
                                    <span className="text-xs font-bold text-foreground">Facebook</span>
                                    <span className="rounded-md bg-card border border-border px-1.5 py-0.2 text-[10px] text-muted-foreground font-mono">
                                        {variants.facebook.length} {t('ký tự')}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleCopy('facebook', variants.facebook)}
                                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                    {copiedKey === 'facebook' ? <Check size={13} className="text-successFg" /> : <Copy size={13} />}
                                    <span>{copiedKey === 'facebook' ? t('Đã chép') : t('Sao chép')}</span>
                                </button>
                            </div>
                            <div className="p-3.5 flex-1 flex flex-col">
                                <textarea
                                    value={variants.facebook}
                                    onChange={(e) => setVariants((p) => ({ ...p, facebook: e.target.value }))}
                                    rows={8}
                                    className="w-full flex-1 resize-none bg-transparent text-xs leading-relaxed text-foreground outline-none font-sans"
                                />
                                <div className="mt-2 pt-2 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between">
                                    <span>🎯 Chuẩn Storytelling & Kêu gọi bình luận</span>
                                    <span className="text-brand-dark font-medium">Auto First Comment Friendly</span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Threads */}
                        <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col focus-within:border-foreground/50 focus-within:ring-2 focus-within:ring-foreground/10 transition">
                            <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="size-6 rounded-md bg-muted text-foreground grid place-items-center">
                                        <ThreadsLogo size={16} weight="fill" />
                                    </div>
                                    <span className="text-xs font-bold text-foreground">Threads</span>
                                    <span className={`rounded-md bg-card border px-1.5 py-0.2 text-[10px] font-mono ${
                                        variants.threads.length > 500 ? 'border-dangerFg text-dangerFg font-bold' : 'border-border text-muted-foreground'
                                    }`}>
                                        {variants.threads.length} / 500
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleCopy('threads', variants.threads)}
                                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                    {copiedKey === 'threads' ? <Check size={13} className="text-successFg" /> : <Copy size={13} />}
                                    <span>{copiedKey === 'threads' ? t('Đã chép') : t('Sao chép')}</span>
                                </button>
                            </div>
                            <div className="p-3.5 flex-1 flex flex-col">
                                <textarea
                                    value={variants.threads}
                                    onChange={(e) => setVariants((p) => ({ ...p, threads: e.target.value }))}
                                    rows={8}
                                    className="w-full flex-1 resize-none bg-transparent text-xs leading-relaxed text-foreground outline-none font-sans"
                                />
                                <div className="mt-2 pt-2 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between">
                                    <span>⚡ Hook tò mò & Kích thích lượt reply</span>
                                    <span className="text-foreground font-mono font-medium">&lt; 500 ký tự</span>
                                </div>
                            </div>
                        </div>

                        {/* 3. LinkedIn */}
                        <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col focus-within:border-[#0A66C2]/60 focus-within:ring-2 focus-within:ring-[#0A66C2]/10 transition">
                            <div className="flex items-center justify-between border-b border-border/70 bg-[#0A66C2]/5 px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="size-6 rounded-md bg-[#0A66C2]/15 text-[#0A66C2] grid place-items-center">
                                        <LinkedinLogo size={16} weight="fill" />
                                    </div>
                                    <span className="text-xs font-bold text-foreground">LinkedIn</span>
                                    <span className="rounded-md bg-card border border-border px-1.5 py-0.2 text-[10px] text-muted-foreground font-mono">
                                        {variants.linkedin.length} {t('ký tự')}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleCopy('linkedin', variants.linkedin)}
                                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                    {copiedKey === 'linkedin' ? <Check size={13} className="text-successFg" /> : <Copy size={13} />}
                                    <span>{copiedKey === 'linkedin' ? t('Đã chép') : t('Sao chép')}</span>
                                </button>
                            </div>
                            <div className="p-3.5 flex-1 flex flex-col">
                                <textarea
                                    value={variants.linkedin}
                                    onChange={(e) => setVariants((p) => ({ ...p, linkedin: e.target.value }))}
                                    rows={8}
                                    className="w-full flex-1 resize-none bg-transparent text-xs leading-relaxed text-foreground outline-none font-sans"
                                />
                                <div className="mt-2 pt-2 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between">
                                    <span>💼 Thought Leadership & Actionable Takeaways</span>
                                    <span className="text-[#0A66C2] font-medium">B2B Network</span>
                                </div>
                            </div>
                        </div>

                        {/* 4. TikTok / Reels Script */}
                        <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col focus-within:border-brand-dark/60 focus-within:ring-2 focus-within:ring-brand/20 transition">
                            <div className="flex items-center justify-between border-b border-border/70 bg-brand/10 px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="size-6 rounded-md bg-brand text-brand-ink grid place-items-center">
                                        <TiktokLogo size={16} weight="fill" />
                                    </div>
                                    <span className="text-xs font-bold text-foreground">TikTok & Reels Video Script</span>
                                    <span className="rounded-md bg-card border border-border px-1.5 py-0.2 text-[10px] text-muted-foreground font-mono">
                                        {variants.tiktok.length} {t('ký tự')}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleCopy('tiktok', variants.tiktok)}
                                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                    {copiedKey === 'tiktok' ? <Check size={13} className="text-successFg" /> : <Copy size={13} />}
                                    <span>{copiedKey === 'tiktok' ? t('Đã chép') : t('Sao chép')}</span>
                                </button>
                            </div>
                            <div className="p-3.5 flex-1 flex flex-col">
                                <textarea
                                    value={variants.tiktok}
                                    onChange={(e) => setVariants((p) => ({ ...p, tiktok: e.target.value }))}
                                    rows={8}
                                    className="w-full flex-1 resize-none bg-transparent text-xs leading-relaxed text-foreground outline-none font-mono"
                                />
                                <div className="mt-2 pt-2 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between">
                                    <span>🎬 Kịch bản 3s Hook + Thân bài + CTA</span>
                                    <span className="text-brand-dark font-medium">TikTok & Short-form</span>
                                </div>
                            </div>
                        </div>

                        {/* 5. Zalo OA */}
                        <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col focus-within:border-[#0068FF]/60 focus-within:ring-2 focus-within:ring-[#0068FF]/10 transition md:col-span-2">
                            <div className="flex items-center justify-between border-b border-border/70 bg-[#0068FF]/5 px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="size-6 rounded-md bg-[#0068FF] text-white grid place-items-center">
                                        <ZaloIcon size={16} />
                                    </div>
                                    <span className="text-xs font-bold text-foreground">Zalo Official Account (Broadcast & Bài viết)</span>
                                    <span className="rounded-md bg-card border border-border px-1.5 py-0.2 text-[10px] text-muted-foreground font-mono">
                                        {(variants.zalo || '').length} / 2000 {t('ký tự')}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleCopy('zalo', variants.zalo)}
                                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                    {copiedKey === 'zalo' ? <Check size={13} className="text-successFg" /> : <Copy size={13} />}
                                    <span>{copiedKey === 'zalo' ? t('Đã chép') : t('Sao chép')}</span>
                                </button>
                            </div>
                            <div className="p-3.5 flex-1 flex flex-col">
                                <textarea
                                    value={variants.zalo || ''}
                                    onChange={(e) => setVariants((p) => ({ ...p, zalo: e.target.value }))}
                                    rows={5}
                                    className="w-full flex-1 resize-none bg-transparent text-xs leading-relaxed text-foreground outline-none font-sans"
                                />
                                <div className="mt-2 pt-2 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between">
                                    <span>📢 Thông báo chuẩn Broadcast & Điều hướng Chat với OA</span>
                                    <span className="text-[#0068FF] font-medium">Zalo OA Chatbot & Feed</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-border bg-card px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ArrowBendDoubleUpRight size={16} className="text-brand-dark" />
                        <span>
                            {t('Nhấn “Áp dụng vào Studio” để đồng bộ trực tiếp nội dung riêng biệt vào từng tab kênh.')}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            disabled={busy}
                        >
                            {t('Đóng')}
                        </Button>
                        <button
                            type="button"
                            onClick={handleApplyAll}
                            disabled={busy || !hasGenerated}
                            className="btn-skew flex items-center gap-2 !py-2 !px-5 text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                            <Sparkle size={15} weight="fill" />
                            <span>{t('🚀 Áp dụng vào Studio (4 kênh)')}</span>
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
