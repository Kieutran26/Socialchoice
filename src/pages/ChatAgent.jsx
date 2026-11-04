import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Sparkle,
    PaperPlaneRight,
    Image as ImageIcon,
    CalendarBlank,
    CheckCircle,
    Clock,
    Trash,
    ArrowSquareOut,
    ArrowsClockwise,
    X,
    Check,
    PlugsConnected,
    Lightning,
    CaretDown,
    LinkSimple,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { aiRequest } from '@/api/ai';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from '@/lib/i18n';
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import { toUtcIso, toZonedParts, todayInZone, addDays, localInputDefault } from '@/lib/tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { getShortlinkPreference } from '@/components/settings/ShortlinkSettingsCard';

// Smart natural language schedule time extractor
function parseScheduleTime(input = '', timezone = DEFAULT_TIMEZONE) {
    const text = input.toLowerCase();
    const today = todayInZone(timezone);
    let targetDate = today;
    let targetTime = '09:00';

    // Date detection
    if (text.includes('sáng mai') || text.includes('ngày mai') || text.includes('mai')) {
        targetDate = addDays(today, 1);
    } else if (text.includes('ngày mốt') || text.includes('ngày kia') || text.includes('hôm sau')) {
        targetDate = addDays(today, 2);
    } else if (text.includes('tuần sau') || text.includes('thứ hai tuần tới')) {
        targetDate = addDays(today, 7);
    } else if (text.includes('tối nay') || text.includes('hôm nay') || text.includes('chiều nay')) {
        targetDate = today;
    } else {
        // Default: If after 18:00 today, schedule for tomorrow 09:00; else today 20:00
        const nowParts = toZonedParts(new Date().toISOString(), timezone);
        const currentHour = parseInt(nowParts.time.split(':')[0], 10) || 12;
        if (currentHour >= 18) {
            targetDate = addDays(today, 1);
            targetTime = '09:00';
        } else {
            targetTime = '20:00';
        }
    }

    // Time detection: e.g. "9h", "9h30", "20:00", "15h", "14:30"
    const hourColonMinMatch = text.match(/(\d{1,2}):(\d{2})/);
    const hourHMinMatch = text.match(/(\d{1,2})h(\d{2})?/);

    if (hourColonMinMatch) {
        const hh = String(parseInt(hourColonMinMatch[1], 10)).padStart(2, '0');
        const mm = String(parseInt(hourColonMinMatch[2], 10)).padStart(2, '0');
        targetTime = `${hh}:${mm}`;
    } else if (hourHMinMatch) {
        const hh = String(parseInt(hourHMinMatch[1], 10)).padStart(2, '0');
        const mm = hourHMinMatch[2] ? String(parseInt(hourHMinMatch[2], 10)).padStart(2, '0') : '00';
        targetTime = `${hh}:${mm}`;
    } else if (text.includes('sáng')) {
        targetTime = '09:00';
    } else if (text.includes('trưa')) {
        targetTime = '11:30';
    } else if (text.includes('chiều')) {
        targetTime = '15:00';
    } else if (text.includes('tối')) {
        targetTime = '20:00';
    }

    return { date: targetDate, time: targetTime };
}

// Generate platform adaptations locally or as fallback
function generatePlatformContent(baseCaption, userPrompt) {
    const cleanPrompt = userPrompt.trim() || 'Nội dung chia sẻ từ Socialchoice';
    const hashtags = ['#Socialchoice', '#Marketing', '#SocialMedia', '#Automation', '#TechUpdate'];

    const threadsCaption = `${baseCaption}\n\n💬 Mọi người nghĩ sao về điều này? Hãy để lại ý kiến bên dưới nhé!\n\n${hashtags.slice(0, 3).join(' ')}`;
    const linkedinCaption = `🚀 ${baseCaption}\n\nKey takeaways:\n• Tối ưu hoá quy trình làm việc\n• Tiếp cận đúng đối tượng mục tiêu\n• Tiết kiệm 80% thời gian sáng tạo nội dung\n\nBạn đã áp dụng phương pháp này vào doanh nghiệp của mình chưa?\n\n${hashtags.join(' ')}`;
    const fbCaption = `✨ ${baseCaption}\n\n👉 Nhấn Theo dõi để không bỏ lỡ các cập nhật mới nhất từ chúng mình!\n\n${hashtags.slice(0, 4).join(' ')}`;
    const xCaption = `${baseCaption.slice(0, 200)}...\n\n${hashtags.slice(0, 2).join(' ')}`;

    return {
        threads: threadsCaption,
        linkedin: linkedinCaption,
        facebook: fbCaption,
        instagram: fbCaption,
        x: xCaption,
    };
}

export default function ChatAgent() {
    const { t } = useTranslation();
    const { brands, selectedBrandId, setSelectedBrandId, timezone, demoMode } = useWorkspace();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [accounts, setAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [selectedImages, setSelectedImages] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isAgentThinking, setIsAgentThinking] = useState(false);

    const fileInputRef = useRef(null);
    const chatEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Active brand
    const currentBrand = useMemo(() => {
        if (!brands.length) return null;
        if (selectedBrandId && selectedBrandId !== 'all') {
            return brands.find((b) => b.id === selectedBrandId) || brands[0];
        }
        return brands[0];
    }, [brands, selectedBrandId]);

    // Load social accounts
    const loadAccounts = useCallback(async () => {
        setLoadingAccounts(true);
        try {
            const page = await appClient.entities.SocialAccount.filter(
                { is_demo: demoMode },
                { sort: 'name', limit: 300 }
            );
            setAccounts(page.items || []);
        } catch (err) {
            console.error('Failed to load accounts:', err);
        } finally {
            setLoadingAccounts(false);
        }
    }, [demoMode]);

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]);

    // Available accounts for current brand
    const brandAccounts = useMemo(() => {
        if (!currentBrand) return [];
        return accounts.filter((acc) => !acc.brand_id || acc.brand_id === currentBrand.id);
    }, [accounts, currentBrand]);

    // Initial welcome message
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    id: 'welcome',
                    role: 'agent',
                    text: `Xin chào! Tôi là **Socialchoice AI Agent** 🤖.\n\nBạn chỉ cần gửi ý tưởng, ghi chú hoặc đính kèm hình ảnh. Tôi sẽ tự động:\n1. ✍️ **Viết caption hấp dẫn** & gắn hashtag phù hợp.\n2. 🎯 **Tối ưu nội dung** riêng cho Threads, LinkedIn, Facebook, Instagram...\n3. ⏰ **Tự động trích xuất thời gian** (ví dụ: *"lên lịch 9h sáng mai"* hoặc *"20:00 tối nay"*).\n4. 🚀 **Lên lịch đăng bài ngay** chỉ với 1 cú click!`,
                    createdAt: new Date().toISOString(),
                },
            ]);
        }
    }, [messages.length]);

    // Auto scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isAgentThinking]);

    // Auto resize input textarea
    const handleInputChange = (e) => {
        setInputText(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
        }
    };

    // Handle image file selection and upload
    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        if (!currentBrand?.id) {
            toast({ variant: 'destructive', title: t('Vui lòng chọn Brand trước khi tải ảnh.') });
            return;
        }

        setIsUploading(true);
        try {
            const uploaded = [];
            for (const file of files) {
                const asset = await appClient.media.upload(file, currentBrand.id);
                uploaded.push(asset);
            }
            setSelectedImages((prev) => [...prev, ...uploaded]);
            toast({ title: t(`Đã tải lên ${uploaded.length} hình ảnh thành công`) });
        } catch (err) {
            toast({ variant: 'destructive', title: t('Tải ảnh thất bại'), description: err.message });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeSelectedImage = (index) => {
        setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    };

    // Quick prompt template click
    const handleQuickPrompt = (promptText) => {
        setInputText(promptText);
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    // User submits message
    const handleSendMessage = async () => {
        const userText = inputText.trim();
        const attached = [...selectedImages];

        if (!userText && attached.length === 0) return;
        if (!currentBrand) {
            toast({ variant: 'destructive', title: t('Chưa có thương hiệu nào được chọn.') });
            return;
        }

        const userMsg = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: userText || (attached.length ? `[Đã đính kèm ${attached.length} ảnh]` : ''),
            attachedImages: attached,
            createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputText('');
        setSelectedImages([]);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        setIsAgentThinking(true);

        try {
            // 1. Extract schedule time
            const schedule = parseScheduleTime(userText, timezone || DEFAULT_TIMEZONE);

            // 2. Determine target accounts
            const lowerText = userText.toLowerCase();
            let targetAccountIds = [];

            // Detect platform mentions
            const platformKeywords = ['threads', 'linkedin', 'facebook', 'instagram', 'tiktok', 'x'];
            const mentionedPlatforms = platformKeywords.filter((p) => lowerText.includes(p));

            if (mentionedPlatforms.length > 0) {
                targetAccountIds = brandAccounts
                    .filter((acc) => mentionedPlatforms.includes(acc.platform))
                    .map((acc) => acc.id);
            }

            // Fallback: if no specific platform mentioned or none matched, select all brand accounts
            if (targetAccountIds.length === 0) {
                targetAccountIds = brandAccounts.map((acc) => acc.id);
            }

            // 3. Draft caption using AI API or smart local generator
            let generatedCaption = '';
            let generatedTitle = '';

            try {
                const aiResult = await aiRequest('generate', {
                    action: 'draft',
                    brief: userText || `Bài viết giới thiệu sản phẩm và thương hiệu ${currentBrand.name}`,
                    confirmed: true,
                    language: 'vi',
                    brand_id: currentBrand.id,
                });
                if (aiResult?.caption) {
                    generatedCaption = aiResult.caption;
                    generatedTitle = aiResult.title || userText.slice(0, 45);
                }
            } catch {
                // Heuristic fallback if AI server endpoint is not configured or in offline mode
                const topic = userText.replace(/mai|sáng|chiều|tối|lên lịch|đăng bài|lúc|\d+h|\d+:\d+/gi, '').trim() || 'Nội dung chia sẻ hôm nay';
                generatedTitle = `[AI] ${topic.slice(0, 40)}`;
                generatedCaption = `🌟 ${topic.toUpperCase()} — Góc chia sẻ từ ${currentBrand.name}\n\nTrong thời đại số hiện nay, việc tối ưu hóa và liên tục cập nhật là chìa khóa để dẫn đầu. Cùng ${currentBrand.name} khám phá và bứt phá mỗi ngày nhé!\n\n👉 Thả tim và lưu lại bài viết nếu bạn thấy hữu ích!`;
            }

            if (!generatedTitle) generatedTitle = `[AI] ${userText.slice(0, 40) || 'Kế hoạch đăng bài'}`;

            // 4. Build platform adaptations
            let platformCaptions = generatePlatformContent(generatedCaption, userText);

            // Auto-shorten links in caption if preference is 'always'
            const currentPref = getShortlinkPreference();
            if (currentPref === 'always' && /https?:\/\/[^\s]+/i.test(generatedCaption) && !/(?:\/api\/links\/go\/|\/s\/[a-zA-Z0-9_-]+)/i.test(generatedCaption)) {
                try {
                    const linkRes = await appClient.links.build({
                        brand_id: currentBrand.id,
                        form: { caption: generatedCaption, platform_captions: platformCaptions },
                        options: { medium: 'social', campaign: generatedTitle || 'agent-post', tracking: true, short: true },
                    });
                    if (linkRes?.caption) {
                        generatedCaption = linkRes.caption;
                        if (linkRes.platform_captions) {
                            platformCaptions = { ...platformCaptions, ...linkRes.platform_captions };
                        }
                    }
                } catch (linkErr) {
                    console.warn('Agent auto-shorten warning:', linkErr);
                }
            }

            // 5. Create Draft Post object
            const postDraft = {
                title: generatedTitle,
                caption: generatedCaption,
                platformCaptions,
                media: attached,
                selectedAccountIds: targetAccountIds,
                scheduledDate: schedule.date,
                scheduledTime: schedule.time,
                timezone: timezone || DEFAULT_TIMEZONE,
                isScheduled: false,
                scheduledPostId: null,
            };

            const agentReply = {
                id: `agent-${Date.now()}`,
                role: 'agent',
                text: `Tôi đã soạn xong bài đăng và chuẩn bị lịch vào **${schedule.time} ngày ${schedule.date}** cho bạn! 📅\n\nBạn hãy kiểm tra nội dung và các kênh bên dưới, sau đó bấm **Xác nhận lên lịch ngay** nhé.`,
                createdAt: new Date().toISOString(),
                postDraft,
            };

            setMessages((prev) => [...prev, agentReply]);
        } catch (err) {
            console.error('Agent error:', err);
            setMessages((prev) => [
                ...prev,
                {
                    id: `agent-error-${Date.now()}`,
                    role: 'agent',
                    text: `Xin lỗi, đã xảy ra lỗi trong quá trình xử lý: ${err.message}. Vui lòng thử lại!`,
                    createdAt: new Date().toISOString(),
                },
            ]);
        } finally {
            setIsAgentThinking(false);
        }
    };

    // Confirm and schedule post
    const handleConfirmSchedule = async (messageId) => {
        const msgIndex = messages.findIndex((m) => m.id === messageId);
        if (msgIndex === -1) return;

        const draft = messages[msgIndex].postDraft;
        if (!draft) return;

        // Update state to saving
        setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, postDraft: { ...m.postDraft, isSaving: true, error: null } } : m))
        );

        try {
            const scheduledAtIso = toUtcIso(draft.scheduledDate, draft.scheduledTime, draft.timezone);
            if (!scheduledAtIso) throw new Error('Ngày hoặc giờ lên lịch không hợp lệ.');

            let effectiveCaption = draft.caption;
            let effectivePlatformCaptions = draft.platformCaptions || {};
            const pref = getShortlinkPreference();
            if (pref === 'always' && /https?:\/\/[^\s]+/i.test(effectiveCaption) && !/(?:\/api\/links\/go\/|\/s\/[a-zA-Z0-9_-]+)/i.test(effectiveCaption)) {
                try {
                    const linkRes = await appClient.links.build({
                        brand_id: currentBrand.id,
                        form: { caption: effectiveCaption, platform_captions: effectivePlatformCaptions },
                        options: { medium: 'social', campaign: draft.title || 'agent-post', tracking: true, short: true },
                    });
                    if (linkRes?.caption) {
                        effectiveCaption = linkRes.caption;
                        effectivePlatformCaptions = linkRes.platform_captions || effectivePlatformCaptions;
                    }
                } catch (linkErr) {
                    console.warn('Agent confirm auto-shorten warning:', linkErr);
                }
            }

            const payload = {
                brand_id: currentBrand.id,
                title: draft.title.trim(),
                caption: effectiveCaption,
                platform_captions: Object.fromEntries(
                    Object.entries(effectivePlatformCaptions).filter(([, c]) => c && c.trim())
                ),
                destination_settings: {},
                media_ids: (draft.media || []).map((m) => m.id),
                platform_media_ids: {},
                account_ids: draft.selectedAccountIds,
                pillar_id: '',
                angle_id: '',
                timezone: draft.timezone,
                scheduled_at: scheduledAtIso,
                status: 'scheduled',
                is_demo: demoMode,
            };

            // Save post plan to SQLite backend
            const saved = await appClient.posts.save({ data: payload });

            // Arm publishing queue if not demo and accounts exist
            if (!demoMode && draft.selectedAccountIds.length > 0) {
                try {
                    const review = await appClient.publishing.prepareSchedule(saved.id, scheduledAtIso, draft.timezone);
                    if (review?.attemptId) {
                        await appClient.publishing.schedule(review.attemptId);
                    }
                } catch (queueErr) {
                    console.warn('Queue scheduling warning:', queueErr);
                }
            }

            toast({
                title: t('Lên lịch bài đăng thành công!'),
                description: t(`Đã lên lịch lúc ${draft.scheduledTime} ngày ${draft.scheduledDate}.`),
            });

            // Mark postDraft as scheduled
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId
                        ? {
                              ...m,
                              postDraft: {
                                  ...m.postDraft,
                                  isSaving: false,
                                  isScheduled: true,
                                  scheduledPostId: saved.id,
                              },
                          }
                        : m
                )
            );
        } catch (err) {
            toast({ variant: 'destructive', title: t('Không thể lên lịch bài đăng'), description: err.message });
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId ? { ...m, postDraft: { ...m.postDraft, isSaving: false, error: err.message } } : m
                )
            );
        }
    };

    // Update draft fields within card
    const updateDraftField = (messageId, key, value) => {
        setMessages((prev) =>
            prev.map((m) => {
                if (m.id !== messageId || !m.postDraft) return m;
                return {
                    ...m,
                    postDraft: {
                        ...m.postDraft,
                        [key]: value,
                    },
                };
            })
        );
    };

    // Toggle account selection for draft
    const toggleAccountSelection = (messageId, accountId) => {
        setMessages((prev) =>
            prev.map((m) => {
                if (m.id !== messageId || !m.postDraft) return m;
                const current = m.postDraft.selectedAccountIds || [];
                const updated = current.includes(accountId)
                    ? current.filter((id) => id !== accountId)
                    : [...current, accountId];
                return {
                    ...m,
                    postDraft: {
                        ...m.postDraft,
                        selectedAccountIds: updated,
                    },
                };
            })
        );
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col -mx-4 -my-6 sm:-mx-8">
            {/* Top Bar / Header */}
            <header className="border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffd631] text-[#2b2100] shadow-sm">
                        <Sparkle size={22} weight="bold" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold font-heading text-foreground">AI Scheduling Agent</h1>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Online
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Gửi nội dung hoặc hình ảnh — Agent tự động viết bài và lên lịch đăng đa kênh
                        </p>
                    </div>
                </div>

                {/* Brand & Connected accounts indicator */}
                <div className="flex items-center gap-3">
                    {brands.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground font-medium">Thương hiệu:</span>
                            <div className="relative">
                                <select
                                    value={currentBrand?.id || ''}
                                    onChange={(e) => setSelectedBrandId(e.target.value)}
                                    className="h-8 rounded-lg border border-border bg-background px-2.5 pr-8 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#ffd631] appearance-none cursor-pointer"
                                >
                                    {brands.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                                <CaretDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-xs">
                        <PlugsConnected size={14} className="text-[#ffd631]" weight="bold" />
                        <span className="font-semibold text-foreground">{brandAccounts.length}</span>
                        <span className="text-muted-foreground">kênh kết nối</span>
                    </div>
                </div>
            </header>

            {/* Chat Thread Canvas */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'agent' && (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ffd631] text-[#2b2100]">
                                    <Sparkle size={18} weight="bold" />
                                </div>
                            )}

                            <div
                                className={`flex flex-col space-y-3 max-w-[90%] sm:max-w-[85%] ${
                                    msg.role === 'user' ? 'items-end' : 'items-start'
                                }`}
                            >
                                {/* Message bubble */}
                                <div
                                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line shadow-2xs ${
                                        msg.role === 'user'
                                            ? 'bg-foreground text-background font-medium rounded-tr-xs'
                                            : 'bg-card border border-border text-foreground rounded-tl-xs'
                                    }`}
                                >
                                    {msg.text}

                                    {/* User attached images preview in bubble */}
                                    {msg.attachedImages?.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {msg.attachedImages.map((img, i) => (
                                                <div
                                                    key={i}
                                                    className="relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted/40"
                                                >
                                                    <img
                                                        src={img.url}
                                                        alt={img.name || 'image'}
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Post Scheduling Card (if attached to agent reply) */}
                                {msg.postDraft && (
                                    <div className="w-full rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                                        {/* Status Header */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                                            <div className="flex items-center gap-2">
                                                <CalendarBlank size={18} className="text-[#d8b216]" weight="bold" />
                                                <span className="font-heading font-bold text-sm text-foreground">
                                                    {msg.postDraft.isScheduled
                                                        ? 'Đã lên lịch thành công 🎉'
                                                        : 'Kế hoạch đăng bài tự động'}
                                                </span>
                                            </div>
                                            {msg.postDraft.isScheduled ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                                                    <CheckCircle size={14} weight="bold" /> Đã xếp lịch đăng
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-[#ffd631]/20 px-2.5 py-1 text-xs font-semibold text-[#806400]">
                                                    <Clock size={14} weight="bold" /> Sẵn sàng lên lịch
                                                </span>
                                            )}
                                        </div>

                                        {/* Internal Title */}
                                        <div>
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                                Tiêu đề bài viết:
                                            </label>
                                            <input
                                                type="text"
                                                disabled={msg.postDraft.isScheduled}
                                                value={msg.postDraft.title}
                                                onChange={(e) => updateDraftField(msg.id, 'title', e.target.value)}
                                                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#ffd631] disabled:opacity-75"
                                            />
                                        </div>

                                        {/* Main Caption Preview */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    Nội dung bài viết:
                                                </label>
                                                <span className="text-[11px] text-muted-foreground font-mono">
                                                    {msg.postDraft.caption?.length || 0} ký tự
                                                </span>
                                            </div>
                                            <textarea
                                                rows={4}
                                                disabled={msg.postDraft.isScheduled}
                                                value={msg.postDraft.caption}
                                                onChange={(e) => updateDraftField(msg.id, 'caption', e.target.value)}
                                                className="w-full rounded-xl border border-border bg-background p-3 text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#ffd631] disabled:opacity-75 resize-none"
                                            />

                                            {/* Shortlink Prompt if preference is 'ask' and contains URL */}
                                            {getShortlinkPreference() === 'ask' &&
                                                !msg.postDraft.shortlinkDismissed &&
                                                !msg.postDraft.isScheduled &&
                                                /https?:\/\/[^\s]+/i.test(msg.postDraft.caption) &&
                                                !/(?:\/api\/links\/go\/|\/s\/[a-zA-Z0-9_-]+)/i.test(msg.postDraft.caption) && (
                                                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-[#ffd631]/40 bg-[#ffd631]/10 p-2.5 text-xs text-foreground">
                                                        <span className="flex items-center gap-1.5 font-medium">
                                                            <LinkSimple size={15} className="text-[#806400] shrink-0" weight="bold" />
                                                            {t('Phát hiện liên kết URL. Bạn có muốn rút gọn sang Shortlink để theo dõi nhấp chuột?')}
                                                        </span>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    try {
                                                                        const res = await appClient.links.build({
                                                                            brand_id: currentBrand.id,
                                                                            form: { caption: msg.postDraft.caption, platform_captions: msg.postDraft.platformCaptions },
                                                                            options: { medium: 'social', campaign: msg.postDraft.title || 'agent-post', tracking: true, short: true },
                                                                        });
                                                                        if (res?.caption) {
                                                                            setMessages((prev) =>
                                                                                prev.map((m) =>
                                                                                    m.id === msg.id
                                                                                        ? {
                                                                                              ...m,
                                                                                              postDraft: {
                                                                                                  ...m.postDraft,
                                                                                                  caption: res.caption,
                                                                                                  platformCaptions: res.platform_captions || m.postDraft.platformCaptions,
                                                                                              },
                                                                                          }
                                                                                        : m
                                                                                )
                                                                            );
                                                                            toast({ title: t('Đã rút gọn liên kết thành công!') });
                                                                        }
                                                                    } catch (e) {
                                                                        toast({ variant: 'destructive', title: t('Lỗi rút gọn link'), description: e.message });
                                                                    }
                                                                }}
                                                                className="btn-skew text-xs py-1 px-3 shadow-2xs cursor-pointer"
                                                            >
                                                                {t('Rút gọn ngay')}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateDraftField(msg.id, 'shortlinkDismissed', true)}
                                                                className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                                            >
                                                                {t('Bỏ qua')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                        </div>

                                        {/* Media Preview inside card */}
                                        {msg.postDraft.media?.length > 0 && (
                                            <div>
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                                    Ảnh đính kèm ({msg.postDraft.media.length}):
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {msg.postDraft.media.map((img, i) => (
                                                        <div
                                                            key={i}
                                                            className="relative h-18 w-18 overflow-hidden rounded-xl border border-border bg-muted/30"
                                                        >
                                                            <img
                                                                src={img.url}
                                                                alt={img.name || 'image'}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Target Channel Selector */}
                                        <div>
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                                Đích đăng ({msg.postDraft.selectedAccountIds?.length || 0} kênh đã chọn):
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {brandAccounts.length === 0 ? (
                                                    <p className="text-xs text-muted-foreground italic">
                                                        Chưa có kênh nào được liên kết cho thương hiệu này.{' '}
                                                        <Link to="/accounts" className="text-foreground underline">
                                                            Kết nối ngay
                                                        </Link>
                                                    </p>
                                                ) : (
                                                    brandAccounts.map((acc) => {
                                                        const isSelected = msg.postDraft.selectedAccountIds?.includes(acc.id);
                                                        const platformCfg = PLATFORM_CONFIG[acc.platform] || {
                                                            label: acc.platform,
                                                            color: 'text-foreground',
                                                        };
                                                        const Icon = platformCfg.icon;

                                                        return (
                                                            <button
                                                                key={acc.id}
                                                                type="button"
                                                                disabled={msg.postDraft.isScheduled}
                                                                onClick={() => toggleAccountSelection(msg.id, acc.id)}
                                                                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border ${
                                                                    isSelected
                                                                        ? 'bg-foreground text-background border-foreground shadow-2xs'
                                                                        : 'bg-background text-muted-foreground border-border hover:border-foreground/50'
                                                                }`}
                                                            >
                                                                {Icon && <Icon size={14} className={isSelected ? 'text-background' : platformCfg.color} />}
                                                                <span>{acc.name}</span>
                                                                {isSelected && <Check size={12} weight="bold" className="text-[#ffd631]" />}
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>

                                        {/* Schedule Date & Time Picker */}
                                        <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <Clock size={15} className="text-[#d8b216]" weight="bold" />
                                                    Thời gian xuất bản:
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    Múi giờ: {msg.postDraft.timezone}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3">
                                                <input
                                                    type="date"
                                                    disabled={msg.postDraft.isScheduled}
                                                    value={msg.postDraft.scheduledDate}
                                                    onChange={(e) => updateDraftField(msg.id, 'scheduledDate', e.target.value)}
                                                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#ffd631] disabled:opacity-75"
                                                />
                                                <input
                                                    type="time"
                                                    disabled={msg.postDraft.isScheduled}
                                                    value={msg.postDraft.scheduledTime}
                                                    onChange={(e) => updateDraftField(msg.id, 'scheduledTime', e.target.value)}
                                                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#ffd631] disabled:opacity-75"
                                                />

                                                {/* Quick time shortcuts */}
                                                {!msg.postDraft.isScheduled && (
                                                    <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const today = todayInZone(msg.postDraft.timezone);
                                                                updateDraftField(msg.id, 'scheduledDate', addDays(today, 1));
                                                                updateDraftField(msg.id, 'scheduledTime', '09:00');
                                                            }}
                                                            className="rounded-md bg-background border border-border px-2 py-1 text-[11px] hover:bg-muted font-medium cursor-pointer"
                                                        >
                                                            Sáng mai 09:00
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const today = todayInZone(msg.postDraft.timezone);
                                                                updateDraftField(msg.id, 'scheduledDate', addDays(today, 1));
                                                                updateDraftField(msg.id, 'scheduledTime', '15:00');
                                                            }}
                                                            className="rounded-md bg-background border border-border px-2 py-1 text-[11px] hover:bg-muted font-medium cursor-pointer"
                                                        >
                                                            Chiều mai 15:00
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const today = todayInZone(msg.postDraft.timezone);
                                                                updateDraftField(msg.id, 'scheduledDate', today);
                                                                updateDraftField(msg.id, 'scheduledTime', '20:00');
                                                            }}
                                                            className="rounded-md bg-background border border-border px-2 py-1 text-[11px] hover:bg-muted font-medium cursor-pointer"
                                                        >
                                                            Tối nay 20:00
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                            {msg.postDraft.isScheduled ? (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Link
                                                        to="/calendar"
                                                        className="btn-skew inline-flex items-center gap-1.5"
                                                    >
                                                        <CalendarBlank size={16} weight="bold" />
                                                        Xem trên Lịch (Calendar)
                                                    </Link>
                                                    {msg.postDraft.scheduledPostId && (
                                                        <Link
                                                            to={`/posts?post=${msg.postDraft.scheduledPostId}`}
                                                            className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted flex items-center gap-1.5"
                                                        >
                                                            <ArrowSquareOut size={14} /> Chi tiết bài viết
                                                        </Link>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        disabled={msg.postDraft.isSaving}
                                                        onClick={() => handleConfirmSchedule(msg.id)}
                                                        className="btn-skew inline-flex items-center gap-2 cursor-pointer shadow-sm"
                                                    >
                                                        {msg.postDraft.isSaving ? (
                                                            <>
                                                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#2b2100] border-t-transparent"></span>
                                                                Đang lên lịch...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle size={16} weight="bold" />
                                                                Xác nhận lên lịch ngay
                                                            </>
                                                        )}
                                                    </button>

                                                    <Link
                                                        to="/create"
                                                        className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1"
                                                    >
                                                        Mở bộ soạn thảo đầy đủ <ArrowSquareOut size={13} />
                                                    </Link>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Agent Thinking Indicator */}
                    {isAgentThinking && (
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffd631] text-[#2b2100]">
                                <Sparkle size={18} weight="bold" />
                            </div>
                            <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
                                <span className="h-2 w-2 rounded-full bg-[#ffd631] animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="h-2 w-2 rounded-full bg-[#ffd631] animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="h-2 w-2 rounded-full bg-[#ffd631] animate-bounce"></span>
                                <span className="ml-2 font-medium">Agent đang soạn nội dung & lên lịch...</span>
                            </div>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>
            </main>

            {/* Quick Suggestions & Input Footer */}
            <footer className="border-t border-border bg-card/80 backdrop-blur-sm p-4 sm:px-8 space-y-3">
                <div className="max-w-4xl mx-auto space-y-3">
                    {/* Quick prompt chips */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase shrink-0 flex items-center gap-1">
                            <Lightning size={13} weight="bold" className="text-[#ffd631]" /> Gợi ý:
                        </span>
                        <button
                            type="button"
                            onClick={() => handleQuickPrompt('Ra mắt tính năng mới vào 9h sáng mai trên Threads và LinkedIn')}
                            className="shrink-0 rounded-full border border-border bg-background px-3 py-1 font-medium hover:bg-muted hover:border-foreground/30 transition-all cursor-pointer"
                        >
                            🚀 Ra mắt tính năng 9h sáng mai
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickPrompt('Chia sẻ bí quyết tăng trưởng nội dung MXH vào 20:00 tối nay')}
                            className="shrink-0 rounded-full border border-border bg-background px-3 py-1 font-medium hover:bg-muted hover:border-foreground/30 transition-all cursor-pointer"
                        >
                            📈 Bài học kinh nghiệm 20:00 tối nay
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickPrompt('Lời chúc đầu tuần năng lượng và lời khuyên năng suất lúc 8:30 sáng')}
                            className="shrink-0 rounded-full border border-border bg-background px-3 py-1 font-medium hover:bg-muted hover:border-foreground/30 transition-all cursor-pointer"
                        >
                            ☕ Chào tuần mới 8:30 sáng
                        </button>
                    </div>

                    {/* Pending attached images preview */}
                    {selectedImages.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto py-1">
                            {selectedImages.map((img, idx) => (
                                <div
                                    key={idx}
                                    className="relative group h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-border bg-muted/40 shadow-2xs"
                                >
                                    <img src={img.url} alt="attached" className="h-full w-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeSelectedImage(idx)}
                                        className="absolute top-1 right-1 h-4 w-4 rounded-full bg-black/75 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={10} weight="bold" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Chat Input Box */}
                    <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-background p-2 shadow-xs focus-within:ring-1 focus-within:ring-[#ffd631]">
                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        {/* Attach image button */}
                        <button
                            type="button"
                            disabled={isUploading || isAgentThinking}
                            onClick={() => fileInputRef.current?.click()}
                            title="Đính kèm hình ảnh"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
                        >
                            {isUploading ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"></span>
                            ) : (
                                <ImageIcon size={20} />
                            )}
                        </button>

                        {/* Textarea */}
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            value={inputText}
                            onChange={handleInputChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Nhập nội dung, yêu cầu hoặc kèm ảnh (VD: 'Đăng ảnh này lên Threads lúc 9h sáng mai')..."
                            className="flex-1 max-h-36 resize-none bg-transparent py-2.5 px-2 text-xs sm:text-sm focus:outline-none placeholder:text-muted-foreground leading-relaxed"
                        />

                        {/* Send button */}
                        <button
                            type="button"
                            disabled={(!inputText.trim() && selectedImages.length === 0) || isAgentThinking}
                            onClick={handleSendMessage}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffd631] text-[#2b2100] hover:bg-[#ffe059] disabled:opacity-40 transition-all cursor-pointer shadow-2xs font-bold"
                        >
                            <PaperPlaneRight size={18} weight="bold" />
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}

