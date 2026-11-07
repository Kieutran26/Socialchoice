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
    ChatCircleDots,
    PencilSimple,
    Eye,
    FacebookLogo,
    LinkedinLogo,
    ThreadsLogo,
    InstagramLogo,
    XLogo,
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

const PLATFORM_TABS = [
    { key: 'facebook', label: 'Facebook', icon: FacebookLogo, color: 'text-blue-600', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'linkedin', label: 'LinkedIn', icon: LinkedinLogo, color: 'text-sky-700', badgeClass: 'bg-sky-50 text-sky-800 border-sky-200' },
    { key: 'threads', label: 'Threads', icon: ThreadsLogo, color: 'text-zinc-900', badgeClass: 'bg-zinc-100 text-zinc-900 border-zinc-200' },
    { key: 'instagram', label: 'Instagram', icon: InstagramLogo, color: 'text-purple-600', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
];

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

    // Split-Screen Copilot States
    const [activeDraftMessageId, setActiveDraftMessageId] = useState(null);
    const [activePlatformTab, setActivePlatformTab] = useState('facebook');
    const [mobileTab, setMobileTab] = useState('chat'); // 'chat' | 'preview'
    const [isEditingCaption, setIsEditingCaption] = useState(false);

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
                    text: `Xin chào! Tôi là **Socialchoice AI Agent** 🤖.\n\nBạn chỉ cần gửi ý tưởng, ghi chú hoặc đính kèm hình ảnh. Tôi sẽ tự động:\n1. ✍️ **Viết caption hấp dẫn** & gắn hashtag phù hợp.\n2. 🎯 **Tối ưu nội dung** riêng cho Facebook, LinkedIn, Threads, Instagram...\n3. ⏰ **Tự động trích xuất thời gian** (ví dụ: *"lên lịch 9h sáng mai"* hoặc *"20:00 tối nay"*).\n4. 🚀 **Hiển thị bản xem trước trực tiếp** ở cột bên phải để bạn duyệt và lên lịch ngay!`,
                    createdAt: new Date().toISOString(),
                },
            ]);
        }
    }, [messages.length]);

    // Determine current active draft message
    const activeDraftMessage = useMemo(() => {
        if (activeDraftMessageId) {
            const found = messages.find((m) => m.id === activeDraftMessageId && m.postDraft);
            if (found) return found;
        }
        // Fallback to latest message with draft
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].postDraft) return messages[i];
        }
        return null;
    }, [messages, activeDraftMessageId]);

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

            const newMsgId = `agent-${Date.now()}`;
            const agentReply = {
                id: newMsgId,
                role: 'agent',
                text: `✨ Tôi đã soạn xong bài đăng và chuẩn bị lịch vào **${schedule.time} ngày ${schedule.date}**!\n\n👉 **Xem bản xem trước đa kênh trực tiếp ở cột bên phải** để kiểm tra và bấm **Xác nhận lên lịch ngay**.`,
                createdAt: new Date().toISOString(),
                postDraft,
            };

            setMessages((prev) => [...prev, agentReply]);
            setActiveDraftMessageId(newMsgId);
            setIsEditingCaption(false);

            // If mobile view, auto-switch to preview tab so user sees the result
            if (window.innerWidth < 1024) {
                setMobileTab('preview');
            }
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

            // Save post plan to backend
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

    // Get current caption to display in preview based on active platform tab
    const currentPreviewCaption = useMemo(() => {
        if (!activeDraftMessage?.postDraft) return '';
        const draft = activeDraftMessage.postDraft;
        return draft.platformCaptions?.[activePlatformTab] || draft.caption || '';
    }, [activeDraftMessage, activePlatformTab]);

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col -mx-4 -my-6 sm:-mx-8 bg-zinc-50/50">
            {/* Top Bar / Header */}
            <header className="border-b border-zinc-200 bg-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-2xs">
                        <Sparkle size={20} weight="bold" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold font-heading text-zinc-900">AI Scheduling Agent</h1>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Online
                            </span>
                        </div>
                        <p className="text-xs text-zinc-500">
                            Bố cục Split-Screen Copilot: Hội thoại tương tác (trái) & Xem trước trực quan đa kênh (phải)
                        </p>
                    </div>
                </div>

                {/* Brand & Connected accounts indicator */}
                <div className="flex items-center gap-3">
                    {brands.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-zinc-500 font-medium">Thương hiệu:</span>
                            <div className="relative">
                                <select
                                    value={currentBrand?.id || ''}
                                    onChange={(e) => setSelectedBrandId(e.target.value)}
                                    className="h-8 rounded-lg border border-zinc-200 bg-white px-2.5 pr-8 text-xs font-semibold text-zinc-800 focus:outline-none focus:border-zinc-900 appearance-none cursor-pointer"
                                >
                                    {brands.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                                <CaretDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-800 shadow-2xs">
                        <PlugsConnected size={14} className="text-zinc-900" weight="bold" />
                        <span>{brandAccounts.length}</span>
                        <span className="text-zinc-500 font-normal">kênh</span>
                    </div>
                </div>
            </header>

            {/* Mobile Tab Switcher (< lg screens) */}
            <div className="lg:hidden flex border-b border-zinc-200 bg-white shrink-0">
                <button
                    type="button"
                    onClick={() => setMobileTab('chat')}
                    className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                        mobileTab === 'chat'
                            ? 'border-zinc-900 text-zinc-900 bg-zinc-50'
                            : 'border-transparent text-zinc-500 hover:text-zinc-800'
                    }`}
                >
                    <ChatCircleDots size={16} weight="bold" />
                    Cuộc hội thoại ({messages.length})
                </button>
                <button
                    type="button"
                    onClick={() => setMobileTab('preview')}
                    className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                        mobileTab === 'preview'
                            ? 'border-zinc-900 text-zinc-900 bg-zinc-50'
                            : 'border-transparent text-zinc-500 hover:text-zinc-800'
                    }`}
                >
                    <Eye size={16} weight="bold" />
                    Xem trước trực quan
                    {activeDraftMessage && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    )}
                </button>
            </div>

            {/* 2-COLUMN SPLIT-SCREEN MAIN CANVAS */}
            <div className="flex-1 overflow-hidden p-4 sm:p-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 h-full">

                    {/* ========================================================= */}
                    {/* LEFT COLUMN: CHAT THREAD & PROMPT DOCK                     */}
                    {/* ========================================================= */}
                    <div className={`flex flex-col h-full rounded-2xl border border-zinc-200 bg-white shadow-2xs overflow-hidden ${
                        mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
                    }`}>
                        {/* Subheader */}
                        <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70 shrink-0">
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
                                <ChatCircleDots size={16} className="text-zinc-900" weight="bold" />
                                Luồng trao đổi với Agent
                            </span>
                            <span className="text-[11px] text-zinc-400 font-medium">
                                Tự động trích xuất ngày & giờ đăng
                            </span>
                        </div>

                        {/* Scrollable Message List */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.role === 'agent' && (
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-2xs text-xs">
                                            <Sparkle size={16} weight="bold" />
                                        </div>
                                    )}

                                    <div
                                        className={`flex flex-col space-y-2.5 max-w-[90%] sm:max-w-[85%] ${
                                            msg.role === 'user' ? 'items-end' : 'items-start'
                                        }`}
                                    >
                                        {/* Message Bubble */}
                                        <div
                                            className={`rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-line shadow-2xs ${
                                                msg.role === 'user'
                                                    ? 'bg-zinc-900 text-white font-medium rounded-tr-xs'
                                                    : 'bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-tl-xs'
                                            }`}
                                        >
                                            {msg.text}

                                            {/* User Attached Images */}
                                            {msg.attachedImages?.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {msg.attachedImages.map((img, i) => (
                                                        <div
                                                            key={i}
                                                            className="relative h-18 w-18 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800"
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

                                        {/* Compact Draft Summary Card in Left Column */}
                                        {msg.postDraft && (
                                            <div
                                                onClick={() => {
                                                    setActiveDraftMessageId(msg.id);
                                                    if (window.innerWidth < 1024) setMobileTab('preview');
                                                }}
                                                className={`w-full rounded-xl border p-3.5 transition-all cursor-pointer space-y-2.5 shadow-2xs ${
                                                    activeDraftMessageId === msg.id || (!activeDraftMessageId && msg.id === activeDraftMessage?.id)
                                                        ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900'
                                                        : 'border-zinc-200 bg-white hover:border-zinc-400'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-bold text-xs text-zinc-900 flex items-center gap-1.5">
                                                        <CalendarBlank size={15} className="text-zinc-900" weight="bold" />
                                                        {msg.postDraft.title || 'Bản thảo bài viết'}
                                                    </span>
                                                    {msg.postDraft.isScheduled ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                                            <CheckCircle size={12} weight="bold" /> Đã lên lịch
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                                            <Clock size={12} weight="bold" /> {msg.postDraft.scheduledTime} · {msg.postDraft.scheduledDate}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-[11px] text-zinc-500 line-clamp-2">
                                                    {msg.postDraft.caption}
                                                </p>

                                                <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-[11px]">
                                                    <span className="text-zinc-400 font-medium">
                                                        {msg.postDraft.selectedAccountIds?.length || 0} kênh đã chọn
                                                    </span>
                                                    <span className="font-bold text-zinc-900 flex items-center gap-1 hover:underline">
                                                        Xem & Tinh chỉnh 👉
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Agent Thinking Indicator */}
                            {isAgentThinking && (
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-2xs">
                                        <Sparkle size={16} weight="bold" />
                                    </div>
                                    <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-xs text-zinc-600 shadow-2xs">
                                        <span className="h-2 w-2 rounded-full bg-zinc-900 animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="h-2 w-2 rounded-full bg-zinc-900 animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="h-2 w-2 rounded-full bg-zinc-900 animate-bounce"></span>
                                        <span className="ml-1 font-medium">AI Agent đang soạn thảo & tối ưu lịch đăng...</span>
                                    </div>
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </div>

                        {/* Sticky Prompt Input Dock (Left Column Bottom) */}
                        <div className="p-3.5 border-t border-zinc-100 bg-white shrink-0 space-y-2.5">
                            {/* Quick Suggestion Chips */}
                            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-0.5 scrollbar-none">
                                <span className="font-bold text-zinc-400 uppercase text-[10px] shrink-0 flex items-center gap-1">
                                    <Lightning size={12} weight="bold" className="text-amber-500" /> Gợi ý:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleQuickPrompt('Ra mắt tính năng mới vào 9h sáng mai trên Threads và Facebook')}
                                    className="px-2.5 py-1 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-400 text-zinc-700 font-medium shrink-0 cursor-pointer transition-all"
                                >
                                    🚀 Ra mắt tính năng 9h sáng mai
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickPrompt('Chia sẻ bài học tối ưu nội dung MXH vào 20:00 tối nay trên LinkedIn')}
                                    className="px-2.5 py-1 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-400 text-zinc-700 font-medium shrink-0 cursor-pointer transition-all"
                                >
                                    📈 Bài học kinh nghiệm 20:00
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickPrompt('Lời chúc đầu tuần tràn đầy năng lượng lúc 8:30 sáng')}
                                    className="px-2.5 py-1 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-400 text-zinc-700 font-medium shrink-0 cursor-pointer transition-all"
                                >
                                    ☕ Chào tuần mới 8:30 sáng
                                </button>
                            </div>

                            {/* Pending Images Strip */}
                            {selectedImages.length > 0 && (
                                <div className="flex items-center gap-2 overflow-x-auto py-1">
                                    {selectedImages.map((img, idx) => (
                                        <div
                                            key={idx}
                                            className="relative group h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100 shadow-2xs"
                                        >
                                            <img src={img.url} alt="attached" className="h-full w-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeSelectedImage(idx)}
                                                className="absolute top-1 right-1 h-4 w-4 rounded-full bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={10} weight="bold" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Input Container */}
                            <div className="relative flex items-end gap-2 rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 focus-within:bg-white focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 transition-all">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />

                                <button
                                    type="button"
                                    disabled={isUploading || isAgentThinking}
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Đính kèm hình ảnh"
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-all cursor-pointer disabled:opacity-40"
                                >
                                    {isUploading ? (
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent"></span>
                                    ) : (
                                        <ImageIcon size={18} />
                                    )}
                                </button>

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
                                    placeholder="Nhập yêu cầu (VD: 'Đăng bài này lên Facebook & LinkedIn lúc 9h sáng mai')..."
                                    className="flex-1 max-h-32 resize-none bg-transparent py-1.5 px-1.5 text-xs text-zinc-900 focus:outline-none placeholder:text-zinc-400 leading-relaxed"
                                />

                                <button
                                    type="button"
                                    disabled={(!inputText.trim() && selectedImages.length === 0) || isAgentThinking}
                                    onClick={handleSendMessage}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-30 transition-all cursor-pointer shadow-2xs"
                                >
                                    <PaperPlaneRight size={16} weight="bold" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* RIGHT COLUMN: LIVE MULTI-CHANNEL PREVIEW & SCHEDULING      */}
                    {/* ========================================================= */}
                    <div className={`flex flex-col h-full rounded-2xl border border-zinc-200 bg-white shadow-2xs overflow-hidden ${
                        mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'
                    }`}>
                        {activeDraftMessage?.postDraft ? (
                            <>
                                {/* Preview Header: Platform Tabs + Schedule Info */}
                                <div className="px-5 py-3 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/70 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                                            Xem trước:
                                        </span>
                                        <div className="flex items-center p-0.5 rounded-lg border border-zinc-200 bg-white">
                                            {PLATFORM_TABS.map((tab) => {
                                                const Icon = tab.icon;
                                                const isActive = activePlatformTab === tab.key;
                                                return (
                                                    <button
                                                        key={tab.key}
                                                        type="button"
                                                        onClick={() => setActivePlatformTab(tab.key)}
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                                                            isActive
                                                                ? 'bg-zinc-900 text-white shadow-2xs'
                                                                : 'text-zinc-500 hover:text-zinc-900'
                                                        }`}
                                                    >
                                                        <Icon size={13} weight="bold" className={isActive ? 'text-white' : tab.color} />
                                                        <span>{tab.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {activeDraftMessage.postDraft.isScheduled ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                            <CheckCircle size={13} weight="bold" /> Đã xếp lịch đăng
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                                            <Clock size={13} weight="bold" />
                                            {activeDraftMessage.postDraft.scheduledTime} · {activeDraftMessage.postDraft.scheduledDate}
                                        </span>
                                    )}
                                </div>

                                {/* Scrollable Live Preview Content */}
                                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                                    {/* SOCIAL MOCKUP POST CARD */}
                                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
                                        {/* Mockup Author Bar */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-9 w-9 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                                                    {currentBrand?.name ? currentBrand.name.slice(0, 2) : 'SC'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xs text-zinc-900">
                                                        {currentBrand?.name || 'Socialchoice Brand'}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-400">
                                                        Lên lịch tự động bởi AI Agent · {activeDraftMessage.postDraft.scheduledTime} {activeDraftMessage.postDraft.scheduledDate}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Platform Badge */}
                                            {(() => {
                                                const currentTabConfig = PLATFORM_TABS.find((t) => t.key === activePlatformTab) || PLATFORM_TABS[0];
                                                const TabIcon = currentTabConfig.icon;
                                                return (
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${currentTabConfig.badgeClass}`}>
                                                        <TabIcon size={12} weight="bold" />
                                                        {currentTabConfig.label}
                                                    </span>
                                                );
                                            })()}
                                        </div>

                                        {/* Post Title Field */}
                                        <div>
                                            <input
                                                type="text"
                                                disabled={activeDraftMessage.postDraft.isScheduled}
                                                value={activeDraftMessage.postDraft.title}
                                                onChange={(e) => updateDraftField(activeDraftMessage.id, 'title', e.target.value)}
                                                placeholder="Tiêu đề nội bộ bài viết..."
                                                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-1.5 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-900 disabled:opacity-75"
                                            />
                                        </div>

                                        {/* Mockup Caption */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">
                                                    Nội dung ({activePlatformTab}):
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditingCaption(!isEditingCaption)}
                                                        className="text-zinc-600 hover:text-zinc-900 font-semibold flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <PencilSimple size={12} />
                                                        {isEditingCaption ? 'Xong' : 'Chỉnh sửa'}
                                                    </button>
                                                    <span className="text-zinc-400 font-mono">
                                                        {currentPreviewCaption.length} ký tự
                                                    </span>
                                                </div>
                                            </div>

                                            {isEditingCaption ? (
                                                <textarea
                                                    rows={5}
                                                    disabled={activeDraftMessage.postDraft.isScheduled}
                                                    value={
                                                        activeDraftMessage.postDraft.platformCaptions?.[activePlatformTab] ??
                                                        activeDraftMessage.postDraft.caption
                                                    }
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        const existing = activeDraftMessage.postDraft.platformCaptions || {};
                                                        updateDraftField(activeDraftMessage.id, 'platformCaptions', {
                                                            ...existing,
                                                            [activePlatformTab]: newVal,
                                                        });
                                                    }}
                                                    className="w-full rounded-xl border border-zinc-300 bg-white p-3 text-xs leading-relaxed text-zinc-900 focus:outline-none focus:border-zinc-900 resize-none"
                                                />
                                            ) : (
                                                <div className="p-3.5 rounded-xl border border-zinc-100 bg-zinc-50/50 text-xs leading-relaxed text-zinc-800 whitespace-pre-line">
                                                    {currentPreviewCaption}
                                                </div>
                                            )}
                                        </div>

                                        {/* Shortlink suggestion banner if URL detected */}
                                        {getShortlinkPreference() === 'ask' &&
                                            !activeDraftMessage.postDraft.shortlinkDismissed &&
                                            !activeDraftMessage.postDraft.isScheduled &&
                                            /https?:\/\/[^\s]+/i.test(activeDraftMessage.postDraft.caption) &&
                                            !/(?:\/api\/links\/go\/|\/s\/[a-zA-Z0-9_-]+)/i.test(activeDraftMessage.postDraft.caption) && (
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900">
                                                    <span className="flex items-center gap-1.5 font-medium">
                                                        <LinkSimple size={14} className="text-amber-800 shrink-0" weight="bold" />
                                                        Phát hiện link URL. Bạn có muốn rút gọn sang Shortlink để đo lường click?
                                                    </span>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                try {
                                                                    const res = await appClient.links.build({
                                                                        brand_id: currentBrand.id,
                                                                        form: {
                                                                            caption: activeDraftMessage.postDraft.caption,
                                                                            platform_captions: activeDraftMessage.postDraft.platformCaptions,
                                                                        },
                                                                        options: {
                                                                            medium: 'social',
                                                                            campaign: activeDraftMessage.postDraft.title || 'agent-post',
                                                                            tracking: true,
                                                                            short: true,
                                                                        },
                                                                    });
                                                                    if (res?.caption) {
                                                                        updateDraftField(activeDraftMessage.id, 'caption', res.caption);
                                                                        if (res.platform_captions) {
                                                                            updateDraftField(activeDraftMessage.id, 'platformCaptions', res.platform_captions);
                                                                        }
                                                                        toast({ title: t('Đã rút gọn liên kết thành công!') });
                                                                    }
                                                                } catch (e) {
                                                                    toast({ variant: 'destructive', title: t('Lỗi rút gọn link'), description: e.message });
                                                                }
                                                            }}
                                                            className="rounded-lg bg-zinc-900 text-white px-2.5 py-1 text-xs font-semibold cursor-pointer"
                                                        >
                                                            Rút gọn ngay
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateDraftField(activeDraftMessage.id, 'shortlinkDismissed', true)}
                                                            className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-600 hover:text-zinc-900 cursor-pointer"
                                                        >
                                                            Bỏ qua
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                        {/* Mockup Attached Media */}
                                        {activeDraftMessage.postDraft.media?.length > 0 && (
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                                    Ảnh đính kèm ({activeDraftMessage.postDraft.media.length}):
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    {activeDraftMessage.postDraft.media.map((img, i) => (
                                                        <div
                                                            key={i}
                                                            className="relative h-20 w-20 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-2xs"
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
                                    </div>

                                    {/* CHANNELS SELECTION */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold uppercase tracking-wider text-zinc-600 text-[11px]">
                                                Đích đăng ({activeDraftMessage.postDraft.selectedAccountIds?.length || 0} kênh đã chọn):
                                            </span>
                                            <Link to="/accounts" className="text-zinc-500 hover:text-zinc-900 underline text-[11px]">
                                                Quản lý kênh
                                            </Link>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {brandAccounts.length === 0 ? (
                                                <p className="text-xs text-zinc-500 italic">
                                                    Chưa có kênh nào được liên kết cho thương hiệu này.
                                                </p>
                                            ) : (
                                                brandAccounts.map((acc) => {
                                                    const isSelected = activeDraftMessage.postDraft.selectedAccountIds?.includes(acc.id);
                                                    const platformCfg = PLATFORM_CONFIG[acc.platform] || {
                                                        label: acc.platform,
                                                        color: 'text-zinc-900',
                                                    };
                                                    const Icon = platformCfg.icon;

                                                    return (
                                                        <button
                                                            key={acc.id}
                                                            type="button"
                                                            disabled={activeDraftMessage.postDraft.isScheduled}
                                                            onClick={() => toggleAccountSelection(activeDraftMessage.id, acc.id)}
                                                            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border ${
                                                                isSelected
                                                                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                                                                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                                                            }`}
                                                        >
                                                            {Icon && <Icon size={14} className={isSelected ? 'text-white' : platformCfg.color} />}
                                                            <span>{acc.name}</span>
                                                            {isSelected && <Check size={12} weight="bold" className="text-emerald-400" />}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* SCHEDULE DATE & TIME PICKER */}
                                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5 space-y-2.5">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                                                <Clock size={15} className="text-zinc-900" weight="bold" />
                                                Thời gian xuất bản:
                                            </span>
                                            <span className="text-[11px] text-zinc-500 font-mono">
                                                Múi giờ: {activeDraftMessage.postDraft.timezone}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <input
                                                type="date"
                                                disabled={activeDraftMessage.postDraft.isScheduled}
                                                value={activeDraftMessage.postDraft.scheduledDate}
                                                onChange={(e) => updateDraftField(activeDraftMessage.id, 'scheduledDate', e.target.value)}
                                                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 focus:outline-none focus:border-zinc-900 disabled:opacity-75"
                                            />
                                            <input
                                                type="time"
                                                disabled={activeDraftMessage.postDraft.isScheduled}
                                                value={activeDraftMessage.postDraft.scheduledTime}
                                                onChange={(e) => updateDraftField(activeDraftMessage.id, 'scheduledTime', e.target.value)}
                                                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 focus:outline-none focus:border-zinc-900 disabled:opacity-75"
                                            />

                                            {/* Quick Time Shortcuts */}
                                            {!activeDraftMessage.postDraft.isScheduled && (
                                                <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const today = todayInZone(activeDraftMessage.postDraft.timezone);
                                                            updateDraftField(activeDraftMessage.id, 'scheduledDate', addDays(today, 1));
                                                            updateDraftField(activeDraftMessage.id, 'scheduledTime', '09:00');
                                                        }}
                                                        className="rounded-md bg-white border border-zinc-200 px-2 py-1 text-[11px] hover:bg-zinc-100 font-medium cursor-pointer"
                                                    >
                                                        Sáng mai 09:00
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const today = todayInZone(activeDraftMessage.postDraft.timezone);
                                                            updateDraftField(activeDraftMessage.id, 'scheduledDate', addDays(today, 1));
                                                            updateDraftField(activeDraftMessage.id, 'scheduledTime', '15:00');
                                                        }}
                                                        className="rounded-md bg-white border border-zinc-200 px-2 py-1 text-[11px] hover:bg-zinc-100 font-medium cursor-pointer"
                                                    >
                                                        Chiều mai 15:00
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const today = todayInZone(activeDraftMessage.postDraft.timezone);
                                                            updateDraftField(activeDraftMessage.id, 'scheduledDate', today);
                                                            updateDraftField(activeDraftMessage.id, 'scheduledTime', '20:00');
                                                        }}
                                                        className="rounded-md bg-white border border-zinc-200 px-2 py-1 text-[11px] hover:bg-zinc-100 font-medium cursor-pointer"
                                                    >
                                                        Tối nay 20:00
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Sticky Bottom Action Bar */}
                                <div className="p-4 border-t border-zinc-100 bg-zinc-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
                                    {activeDraftMessage.postDraft.isScheduled ? (
                                        <>
                                            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                                                <CheckCircle size={16} weight="bold" />
                                                Bài đăng đã được xếp lịch xuất bản an toàn!
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    to="/calendar"
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 text-white px-4 py-2 text-xs font-semibold hover:bg-zinc-800 transition-all shadow-2xs"
                                                >
                                                    <CalendarBlank size={15} weight="bold" />
                                                    Xem trên Lịch
                                                </Link>
                                                {activeDraftMessage.postDraft.scheduledPostId && (
                                                    <Link
                                                        to={`/posts?post=${activeDraftMessage.postDraft.scheduledPostId}`}
                                                        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100"
                                                    >
                                                        <ArrowSquareOut size={13} /> Chi tiết
                                                    </Link>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-xs text-zinc-500">
                                                Bấm xác nhận để đưa bài vào hàng đợi xuất bản tự động
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    to="/create"
                                                    className="text-xs text-zinc-500 hover:text-zinc-900 font-medium hidden sm:inline-flex items-center gap-1 mr-2"
                                                >
                                                    Soạn thảo đầy đủ <ArrowSquareOut size={13} />
                                                </Link>
                                                <button
                                                    type="button"
                                                    disabled={activeDraftMessage.postDraft.isSaving}
                                                    onClick={() => handleConfirmSchedule(activeDraftMessage.id)}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 text-white px-5 py-2.5 text-xs font-bold hover:bg-zinc-800 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                                                >
                                                    {activeDraftMessage.postDraft.isSaving ? (
                                                        <>
                                                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                                            Đang lên lịch...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle size={16} weight="bold" />
                                                            Xác nhận lên lịch ngay
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Empty Guide State (When no draft has been requested yet) */
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                                <div className="h-16 w-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800 shadow-2xs">
                                    <Sparkle size={32} weight="bold" />
                                </div>
                                <div className="max-w-sm space-y-1.5">
                                    <h3 className="font-heading font-bold text-base text-zinc-900">
                                        Bản xem trước thời gian thực
                                    </h3>
                                    <p className="text-xs text-zinc-500 leading-relaxed">
                                        Nhập ý tưởng hoặc đính kèm ảnh ở cột bên trái. AI Agent sẽ tự động viết caption, định dạng theo từng mạng xã hội và hiển thị bản mô phỏng trực tiếp tại đây!
                                    </p>
                                </div>

                                <div className="pt-2 flex flex-col gap-2 w-full max-w-xs text-xs">
                                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                                        Thử nhanh một yêu cầu mẫu:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleQuickPrompt('Ra mắt tính năng mới vào 9h sáng mai trên Threads và Facebook')}
                                        className="p-2.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-400 text-zinc-800 font-medium text-left transition-all cursor-pointer shadow-2xs flex items-center justify-between"
                                    >
                                        <span>🚀 Ra mắt tính năng 9h sáng mai</span>
                                        <ArrowSquareOut size={14} className="text-zinc-400" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleQuickPrompt('Chia sẻ bài học tối ưu nội dung MXH vào 20:00 tối nay trên LinkedIn')}
                                        className="p-2.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-400 text-zinc-800 font-medium text-left transition-all cursor-pointer shadow-2xs flex items-center justify-between"
                                    >
                                        <span>📈 Bài học kinh nghiệm 20:00 tối</span>
                                        <ArrowSquareOut size={14} className="text-zinc-400" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
