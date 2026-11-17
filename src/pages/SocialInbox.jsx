// src/pages/SocialInbox.jsx
// Centralized Social Inbox for Socialchoice
// Aggregates DMs and Comments across Facebook, Instagram, TikTok, Threads, and Zalo.
// Conforms to UI/UX standard skill (C:\Users\MECHREVO\.agents\skills\ui-ux) and docs/design-system.md.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    ChatTeardropDots,
    PaperPlaneTilt,
    ShieldCheck,
    ShieldWarning,
    Eye,
    EyeSlash,
    Copy,
    Sparkle,
    CheckCircle,
    Clock,
    Tag,
    NotePencil,
    ArrowSquareOut,
    MagnifyingGlass,
    FacebookLogo,
    InstagramLogo,
    TiktokLogo,
    ChatCircleDots,
    Phone,
    User,
    Check,
    ArrowsClockwise,
    ChatCenteredText,
    Lightning,
    X,
} from '@phosphor-icons/react';
import { useWorkspace } from '@/lib/workspace-context';
import { useTranslation } from '@/lib/i18n';
import {
    getInboxData,
    getConversations,
    getConversationById,
    replyToConversation,
    togglePhoneShield,
    updateConversationStatus,
    updateInternalNotes,
    updateConversationTags,
    generateAiSuggestedReplies,
    QUICK_SNIPPETS,
    maskPhoneNumber,
} from '@/lib/social-inbox-service';

// Platform visual definitions
const PLATFORMS = {
    all: { label: 'Tất cả nền tảng', icon: ChatTeardropDots, color: 'text-foreground' },
    facebook: { label: 'Facebook', icon: FacebookLogo, color: 'text-[#1877F2]' },
    instagram: { label: 'Instagram', icon: InstagramLogo, color: 'text-[#E4405F]' },
    tiktok: { label: 'TikTok', icon: TiktokLogo, color: 'text-foreground' },
    threads: { label: 'Threads', icon: ChatCircleDots, color: 'text-foreground' },
    zalo: { label: 'Zalo OA', icon: ChatCenteredText, color: 'text-[#0068FF]' },
};

// Available CRM tags
const AVAILABLE_TAGS = [
    { id: 'hot_lead', label: 'Lead nóng', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    { id: 'order_pending', label: 'Chờ chốt đơn', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'vip', label: 'Khách sỉ / VIP', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'consulting', label: 'Cần tư vấn sâu', color: 'bg-blue-50 text-blue-700 border-blue-200' },
];

export default function SocialInbox() {
    const { t } = useTranslation();
    const { brands, selectedBrandId } = useWorkspace();

    // Filters state
    const [selectedPlatform, setSelectedPlatform] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'unread' | 'comment' | 'dm' | 'shielded'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedConvId, setSelectedConvId] = useState(null);

    // Refresh trigger
    const [dataRevision, setDataRevision] = useState(0);

    // Reply & Notes state
    const [replyText, setReplyText] = useState('');
    const [internalNotes, setInternalNotes] = useState('');
    const [showRealPhone, setShowRealPhone] = useState(false);
    const [copiedPhone, setCopiedPhone] = useState(false);
    const [copiedSnippetId, setCopiedSnippetId] = useState(null);

    const messagesEndRef = useRef(null);

    // Listen to inbox updates from other tabs or actions
    useEffect(() => {
        function handleUpdate() {
            setDataRevision((v) => v + 1);
        }
        window.addEventListener('socialchoice:social_inbox_updated', handleUpdate);
        return () => window.removeEventListener('socialchoice:social_inbox_updated', handleUpdate);
    }, []);

    // Filter conversations
    const conversations = useMemo(() => {
        let typeFilter = 'all';
        let statusParam = 'all';

        if (statusFilter === 'unread') statusParam = 'unread';
        else if (statusFilter === 'shielded') statusParam = 'shielded';
        else if (statusFilter === 'comment') typeFilter = 'comment';
        else if (statusFilter === 'dm') typeFilter = 'dm';

        return getConversations({
            brandId: selectedBrandId || 'all',
            platform: selectedPlatform,
            type: typeFilter,
            status: statusParam,
            search: searchQuery,
        });
    }, [selectedBrandId, selectedPlatform, statusFilter, searchQuery, dataRevision]);

    // Auto-select first conversation if none selected
    useEffect(() => {
        if (!selectedConvId && conversations.length > 0) {
            setSelectedConvId(conversations[0].id);
        } else if (selectedConvId && !conversations.some((c) => c.id === selectedConvId)) {
            if (conversations.length > 0) {
                setSelectedConvId(conversations[0].id);
            } else {
                setSelectedConvId(null);
            }
        }
    }, [conversations, selectedConvId]);

    // Active conversation
    const activeConv = useMemo(() => {
        if (!selectedConvId) return null;
        return getConversationById(selectedConvId);
    }, [selectedConvId, dataRevision]);

    // Sync active conversation's notes
    useEffect(() => {
        if (activeConv) {
            setInternalNotes(activeConv.internal_notes || '');
            setShowRealPhone(false);
            setCopiedPhone(false);
        }
    }, [selectedConvId]);

    // Scroll to bottom of messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activeConv?.messages?.length]);

    // AI suggestions for active conversation
    const aiSuggestions = useMemo(() => {
        if (!activeConv) return [];
        return generateAiSuggestedReplies(activeConv);
    }, [activeConv]);

    // Handle sending reply
    const handleSendReply = (e) => {
        if (e) e.preventDefault();
        if (!replyText.trim() || !activeConv) return;
        replyToConversation(activeConv.id, replyText);
        setReplyText('');
        setDataRevision((v) => v + 1);
    };

    // Handle toggle phone shield
    const handleToggleShield = () => {
        if (!activeConv) return;
        togglePhoneShield(activeConv.id);
        setDataRevision((v) => v + 1);
    };

    // Handle status change
    const handleChangeStatus = (newStatus) => {
        if (!activeConv) return;
        updateConversationStatus(activeConv.id, newStatus);
        setDataRevision((v) => v + 1);
    };

    // Handle saving internal notes
    const handleSaveNotes = () => {
        if (!activeConv) return;
        updateInternalNotes(activeConv.id, internalNotes);
        setDataRevision((v) => v + 1);
    };

    // Handle toggling tags
    const handleToggleTag = (tagId) => {
        if (!activeConv) return;
        const currentTags = activeConv.tags || [];
        const nextTags = currentTags.includes(tagId)
            ? currentTags.filter((t) => t !== tagId)
            : [...currentTags, tagId];
        updateConversationTags(activeConv.id, nextTags);
        setDataRevision((v) => v + 1);
    };

    // Copy phone number
    const handleCopyPhone = () => {
        if (!activeConv?.customer?.phone) return;
        navigator.clipboard.writeText(activeConv.customer.phone);
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
    };

    // Insert AI Suggestion into reply
    const handleApplySuggestion = (text) => {
        setReplyText(text);
    };

    // Counts for badges
    const allList = useMemo(() => getInboxData(), [dataRevision]);
    const unreadCount = useMemo(() => allList.filter((c) => c.status === 'unread').length, [allList]);
    const shieldedCount = useMemo(() => allList.filter((c) => c.has_phone && c.phone_hidden).length, [allList]);

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] max-w-[1600px] mx-auto overflow-hidden">
            {/* Top Bar Header */}
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-5 py-3 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-dark bg-brand text-brand-ink">
                        <ChatTeardropDots size={22} weight="bold" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-heading text-lg font-bold tracking-tight text-foreground">
                                Hộp thư tập trung
                            </h1>
                            <span className="inline-flex items-center gap-1 rounded-md border border-brand-dark/40 bg-brand/20 px-2 py-0.5 font-heading text-[11px] font-semibold text-brand-ink">
                                <Sparkle size={12} weight="fill" />
                                Social Inbox + AI Copilot
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Gom toàn bộ tin nhắn & bình luận đa kênh về một màn hình · Tự động ẩn SĐT chống cướp đơn
                        </p>
                    </div>
                </div>

                {/* SĐT Shield Highlight Banner */}
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs text-amber-900">
                    <ShieldCheck size={18} weight="fill" className="text-amber-600 shrink-0" />
                    <div>
                        <span className="font-semibold">Lá chắn chống cướp đơn (SĐT Shield):</span>
                        <span className="ml-1 text-amber-800">
                            Đã tự động bảo vệ <strong className="font-bold">{shieldedCount}</strong> bình luận chứa số điện thoại.
                        </span>
                    </div>
                </div>
            </header>

            {/* 3-Pane Responsive Layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* 1. LEFT PANE: Conversation Queue */}
                <section className="flex flex-col w-full md:w-80 lg:w-96 border-r border-border bg-card shrink-0 overflow-hidden">
                    {/* Search & Filter Tabs */}
                    <div className="p-3 border-b border-border space-y-2.5">
                        <div className="relative">
                            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm khách hàng, SĐT, nội dung..."
                                className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-dark"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Status Filters */}
                        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs scrollbar-none">
                            {[
                                { id: 'all', label: 'Tất cả' },
                                { id: 'unread', label: 'Chưa đọc', badge: unreadCount },
                                { id: 'shielded', label: 'Ẩn SĐT', badge: shieldedCount, highlight: true },
                                { id: 'comment', label: 'Bình luận' },
                                { id: 'dm', label: 'Tin nhắn' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setStatusFilter(tab.id)}
                                    className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                        statusFilter === tab.id
                                            ? 'bg-brand text-brand-ink border border-brand-dark font-semibold'
                                            : 'bg-surface hover:bg-brand/10 text-muted-foreground hover:text-foreground border border-border/70'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    {tab.badge > 0 && (
                                        <span
                                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                                tab.highlight
                                                    ? 'bg-rose-500 text-white'
                                                    : statusFilter === tab.id
                                                    ? 'bg-brand-ink text-white'
                                                    : 'bg-muted-foreground/20 text-foreground'
                                            }`}
                                        >
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Platform Filter Badges */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                            {Object.entries(PLATFORMS).map(([key, item]) => {
                                const Icon = item.icon;
                                const isSelected = selectedPlatform === key;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedPlatform(key)}
                                        className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                                            isSelected
                                                ? 'border-brand-dark bg-brand/20 text-brand-ink font-semibold'
                                                : 'border-border/60 hover:border-brand-dark/50 text-muted-foreground'
                                        }`}
                                    >
                                        <Icon size={13} className={item.color} weight={isSelected ? 'bold' : 'regular'} />
                                        <span>{item.label.split(' ')[0]}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Conversation List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                        {conversations.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <ChatTeardropDots size={36} className="mx-auto mb-2 opacity-40" />
                                <p className="text-sm font-medium">Không tìm thấy hội thoại</p>
                                <p className="text-xs mt-1">Thử đổi bộ lọc hoặc xóa từ khóa tìm kiếm</p>
                            </div>
                        ) : (
                            conversations.map((conv) => {
                                const isSelected = conv.id === selectedConvId;
                                const lastMsg = conv.messages[conv.messages.length - 1];
                                const PlatformIcon = PLATFORMS[conv.platform]?.icon || ChatTeardropDots;
                                const isUnread = conv.status === 'unread';

                                return (
                                    <div
                                        key={conv.id}
                                        onClick={() => setSelectedConvId(conv.id)}
                                        className={`p-3 cursor-pointer transition-colors relative ${
                                            isSelected
                                                ? 'bg-brand/10 border-l-4 border-l-brand-dark'
                                                : isUnread
                                                ? 'bg-surface hover:bg-brand/5 font-medium'
                                                : 'hover:bg-surface/80'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Avatar with Platform Badge */}
                                            <div className="relative shrink-0">
                                                <img
                                                    src={conv.customer.avatar}
                                                    alt={conv.customer.name}
                                                    className="w-10 h-10 rounded-full object-cover border border-border"
                                                />
                                                <span
                                                    className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-card shadow-xs border border-border"
                                                    title={conv.platform}
                                                >
                                                    <PlatformIcon size={10} className={PLATFORMS[conv.platform]?.color} weight="bold" />
                                                </span>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <h3 className={`text-xs truncate ${isUnread ? 'font-bold text-foreground' : 'font-semibold text-foreground'}`}>
                                                            {conv.customer.name}
                                                        </h3>
                                                        {conv.type === 'comment' && (
                                                            <span className="shrink-0 px-1 py-0.2 rounded text-[10px] bg-secondary text-muted-foreground border border-border/50">
                                                                Comment
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                                        {new Date(conv.updated_at).toLocaleTimeString('vi-VN', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                </div>

                                                {/* Last Message Snippet */}
                                                <p className="text-xs text-muted-foreground truncate mb-1.5">
                                                    {lastMsg?.sender === 'brand' && <span className="font-semibold text-foreground">Bạn: </span>}
                                                    {conv.phone_hidden
                                                        ? lastMsg?.text?.replace(/(?:0|\+84)[0-9]{8,10}/g, '098****456')
                                                        : lastMsg?.text}
                                                </p>

                                                {/* Badges: Phone Shielded, Hot Lead, etc */}
                                                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                                    {conv.has_phone && (
                                                        <span
                                                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border ${
                                                                conv.phone_hidden
                                                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                            }`}
                                                            title={conv.phone_hidden ? 'Đã kích hoạt ẩn SĐT chống cướp đơn' : 'SĐT hiển thị công khai'}
                                                        >
                                                            <ShieldCheck size={11} weight="fill" />
                                                            {conv.phone_hidden ? 'Đã ẩn SĐT' : 'Có SĐT'}
                                                        </span>
                                                    )}

                                                    {conv.tags?.map((tId) => {
                                                        const tagDef = AVAILABLE_TAGS.find((t) => t.id === tId);
                                                        if (!tagDef) return null;
                                                        return (
                                                            <span
                                                                key={tId}
                                                                className={`px-1.5 py-0.5 rounded font-medium border ${tagDef.color}`}
                                                            >
                                                                {tagDef.label}
                                                            </span>
                                                        );
                                                    })}

                                                    {isUnread && (
                                                        <span className="ml-auto h-2 w-2 rounded-full bg-brand-dark" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                {/* 2. CENTER PANE: Chat Feed & Reply Box */}
                {activeConv ? (
                    <section className="flex flex-1 flex-col bg-background overflow-hidden">
                        {/* Conversation Header */}
                        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <img
                                    src={activeConv.customer.avatar}
                                    alt={activeConv.customer.name}
                                    className="w-9 h-9 rounded-full object-cover border border-border shrink-0"
                                />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-heading text-sm font-bold text-foreground truncate">
                                            {activeConv.customer.name}
                                        </h2>
                                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                            {React.createElement(PLATFORMS[activeConv.platform]?.icon || ChatTeardropDots, {
                                                size: 14,
                                                className: PLATFORMS[activeConv.platform]?.color,
                                                weight: 'bold',
                                            })}
                                            <span className="capitalize">{activeConv.platform}</span>
                                            <span>·</span>
                                            <span>{activeConv.type === 'comment' ? 'Bình luận bài viết' : 'Tin nhắn riêng (DM)'}</span>
                                        </span>
                                    </div>

                                    {/* Linked Post Preview if Comment */}
                                    {activeConv.post && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate mt-0.5">
                                            <span className="font-medium text-foreground truncate">
                                                Bài viết: {activeConv.post.title}
                                            </span>
                                            <a
                                                href={activeConv.post.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-brand-ink hover:underline inline-flex items-center gap-0.5 shrink-0"
                                            >
                                                <ArrowSquareOut size={12} />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                {activeConv.status !== 'resolved' ? (
                                    <button
                                        onClick={() => handleChangeStatus('resolved')}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-medium text-foreground hover:bg-card hover:border-brand-dark transition-colors cursor-pointer"
                                    >
                                        <CheckCircle size={14} className="text-emerald-600" weight="bold" />
                                        <span>Đánh dấu xong</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleChangeStatus('unread')}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-medium text-foreground hover:bg-card transition-colors cursor-pointer"
                                    >
                                        <Clock size={14} className="text-amber-600" />
                                        <span>Mở lại hội thoại</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Phone Shielding Alert Notice (if comment contains phone) */}
                        {activeConv.has_phone && activeConv.type === 'comment' && (
                            <div className="flex items-center justify-between gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 shrink-0">
                                <div className="flex items-center gap-2 min-w-0">
                                    <ShieldCheck size={18} weight="fill" className="text-amber-600 shrink-0" />
                                    <span className="truncate">
                                        <strong>Lá chắn SĐT:</strong>{' '}
                                        {activeConv.phone_hidden
                                            ? 'Bình luận chứa SĐT đã được ẩn tự động trên mạng xã hội để chống cướp đơn.'
                                            : 'Bình luận này đang hiển thị công khai trên mạng xã hội.'}
                                    </span>
                                </div>
                                <button
                                    onClick={handleToggleShield}
                                    className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
                                        activeConv.phone_hidden
                                            ? 'bg-amber-200/60 hover:bg-amber-200 border-amber-300 text-amber-900'
                                            : 'bg-brand hover:bg-[#ffe059] border-brand-dark text-brand-ink'
                                    }`}
                                >
                                    {activeConv.phone_hidden ? (
                                        <>
                                            <Eye size={13} />
                                            <span>Mở hiện lại SĐT</span>
                                        </>
                                    ) : (
                                        <>
                                            <EyeSlash size={13} />
                                            <span>Kích hoạt Ẩn SĐT ngay</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Messages Thread Feed */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {activeConv.messages.map((msg) => {
                                const isCustomer = msg.sender === 'customer';
                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-1 text-[11px] text-muted-foreground px-1">
                                            <span className="font-semibold text-foreground">
                                                {isCustomer ? activeConv.customer.name : 'Socialchoice Page'}
                                            </span>
                                            <span>·</span>
                                            <span>
                                                {new Date(msg.created_at).toLocaleTimeString('vi-VN', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>

                                        <div
                                            className={`max-w-[80%] rounded-2xl p-3.5 text-xs whitespace-pre-wrap leading-relaxed shadow-xs ${
                                                isCustomer
                                                    ? 'bg-card border border-border text-foreground rounded-tl-xs'
                                                    : 'bg-brand/20 border border-brand-dark/40 text-brand-ink rounded-tr-xs font-medium'
                                            }`}
                                        >
                                            {/* Mask phone preview if comment is hidden */}
                                            {isCustomer && activeConv.phone_hidden && msg.has_phone
                                                ? msg.text.replace(/(?:0|\+84)[0-9]{8,10}/g, (p) => maskPhoneNumber(p))
                                                : msg.text}

                                            {/* Indicator if this comment has phone */}
                                            {isCustomer && msg.has_phone && (
                                                <div className="mt-2 pt-2 border-t border-border/60 flex items-center gap-1.5 text-[11px] text-amber-700">
                                                    <ShieldCheck size={14} weight="fill" className="text-amber-600" />
                                                    <span>Phát hiện số điện thoại khách để lại</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* AI Copilot & Snippet Shortcuts Bar */}
                        <div className="border-t border-border bg-card px-4 pt-2.5 pb-2 shrink-0 space-y-2">
                            {/* AI Copilot Suggestions */}
                            {aiSuggestions.length > 0 && (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-ink">
                                        <Sparkle size={14} weight="fill" className="text-brand-dark" />
                                        <span>Gợi ý phản hồi AI (AI Copilot):</span>
                                    </div>
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                                        {aiSuggestions.map((sug) => (
                                            <button
                                                key={sug.id}
                                                type="button"
                                                onClick={() => handleApplySuggestion(sug.text)}
                                                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-dark/60 bg-brand/10 hover:bg-brand/25 text-xs text-foreground text-left transition-colors cursor-pointer"
                                            >
                                                <Lightning size={13} weight="fill" className="text-brand-ink shrink-0" />
                                                <span className="font-semibold text-brand-ink">{sug.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quick Snippets */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] text-muted-foreground scrollbar-none">
                                <span className="font-medium shrink-0">Mẫu câu nhanh:</span>
                                {QUICK_SNIPPETS.map((snip) => (
                                    <button
                                        key={snip.id}
                                        type="button"
                                        onClick={() => handleApplySuggestion(snip.text)}
                                        className="shrink-0 px-2 py-0.5 rounded-md border border-border bg-surface hover:bg-card hover:border-brand-dark transition-colors cursor-pointer text-foreground"
                                    >
                                        {snip.title}
                                    </button>
                                ))}
                            </div>

                            {/* Message Composer Form */}
                            <form onSubmit={handleSendReply} className="flex items-end gap-2 pt-1">
                                <div className="flex-1 relative">
                                    <textarea
                                        rows={2}
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendReply();
                                            }
                                        }}
                                        placeholder={`Phản hồi ${activeConv.customer.name} (nhấn Enter để gửi, Shift+Enter xuống dòng)...`}
                                        className="w-full resize-none rounded-xl border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-dark leading-relaxed"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!replyText.trim()}
                                    className="btn-skew flex items-center justify-center gap-1.5 px-4 h-11 text-xs shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <PaperPlaneTilt size={15} weight="bold" />
                                    <span>Gửi</span>
                                </button>
                            </form>
                        </div>
                    </section>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background text-muted-foreground">
                        <ChatTeardropDots size={48} className="opacity-30 mb-3" />
                        <h3 className="font-heading text-base font-bold text-foreground">Chọn một hội thoại để xử lý</h3>
                        <p className="text-xs mt-1 text-center max-w-sm">
                            Xem tin nhắn từ Facebook, Instagram, TikTok, Threads và Zalo. Tự động ẩn số điện thoại để chống đối thủ quét cướp đơn.
                        </p>
                    </div>
                )}

                {/* 3. RIGHT PANE: Customer CRM & Anti-Theft SĐT Shield */}
                {activeConv && (
                    <aside className="hidden xl:flex flex-col w-80 border-l border-border bg-card p-4 space-y-5 overflow-y-auto shrink-0">
                        {/* Customer Profile Header */}
                        <div className="flex flex-col items-center text-center pb-4 border-b border-border">
                            <img
                                src={activeConv.customer.avatar}
                                alt={activeConv.customer.name}
                                className="w-16 h-16 rounded-full object-cover border-2 border-brand-dark mb-2 shadow-xs"
                            />
                            <h3 className="font-heading text-sm font-bold text-foreground">
                                {activeConv.customer.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                ID: <span className="font-mono">{activeConv.customer.id}</span>
                            </p>
                        </div>

                        {/* Anti-Theft Phone Shield (Lá chắn chống cướp đơn) */}
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                                    <ShieldCheck size={18} weight="fill" className="text-amber-600" />
                                    <span>Lá chắn SĐT</span>
                                </div>
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        activeConv.phone_hidden
                                            ? 'bg-amber-200 text-amber-900'
                                            : 'bg-emerald-200 text-emerald-900'
                                    }`}
                                >
                                    {activeConv.phone_hidden ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                                </span>
                            </div>

                            {/* Detected Phone Box */}
                            <div className="rounded-xl border border-amber-200 bg-card p-2.5">
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Phone size={13} />
                                        <span>Số điện thoại khách:</span>
                                    </span>
                                    {activeConv.customer.phone && (
                                        <button
                                            type="button"
                                            onClick={() => setShowRealPhone((prev) => !prev)}
                                            className="text-amber-800 hover:text-amber-950 font-medium text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                        >
                                            {showRealPhone ? <EyeSlash size={12} /> : <Eye size={12} />}
                                            <span>{showRealPhone ? 'Ẩn lại' : 'Xem thật'}</span>
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center justify-between gap-2 mt-1">
                                    <span className="font-mono font-bold text-sm text-foreground">
                                        {activeConv.customer.phone ? (
                                            showRealPhone ? activeConv.customer.phone : maskPhoneNumber(activeConv.customer.phone)
                                        ) : (
                                            <span className="text-xs text-muted-foreground font-normal italic">Chưa phát hiện SĐT</span>
                                        )}
                                    </span>

                                    {activeConv.customer.phone && (
                                        <button
                                            type="button"
                                            onClick={handleCopyPhone}
                                            className="px-2 py-1 rounded-md border border-border bg-surface hover:bg-card text-xs text-foreground inline-flex items-center gap-1 cursor-pointer"
                                            title="Sao chép số điện thoại"
                                        >
                                            {copiedPhone ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                            <span className="text-[11px]">{copiedPhone ? 'Đã chép' : 'Chép'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <p className="text-[11px] text-amber-800/90 leading-relaxed">
                                {activeConv.phone_hidden
                                    ? '✓ Bình luận chứa SĐT đã được ẩn tự động trên Fanpage/TikTok để đối thủ không thể quét cướp đơn.'
                                    : '⚠ Bình luận đang hiển thị công khai. Bật tính năng để tự động ẩn số điện thoại.'}
                            </p>

                            <button
                                type="button"
                                onClick={handleToggleShield}
                                className="w-full py-2 px-3 rounded-xl border border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <ShieldWarning size={14} weight="bold" />
                                <span>{activeConv.phone_hidden ? 'Hủy ẩn bình luận này' : 'Bật ẩn bình luận này'}</span>
                            </button>
                        </div>

                        {/* CRM Tags */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                <Tag size={15} />
                                <span>Nhãn phân loại (CRM Tags):</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {AVAILABLE_TAGS.map((tagDef) => {
                                    const isSelected = activeConv.tags?.includes(tagDef.id);
                                    return (
                                        <button
                                            key={tagDef.id}
                                            type="button"
                                            onClick={() => handleToggleTag(tagDef.id)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                                isSelected
                                                    ? `${tagDef.color} font-bold ring-1 ring-offset-1 ring-brand-dark`
                                                    : 'bg-surface text-muted-foreground border-border/70 hover:text-foreground'
                                            }`}
                                        >
                                            {tagDef.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Internal Staff Notes */}
                        <div className="space-y-2 flex-1 flex flex-col">
                            <div className="flex items-center justify-between text-xs font-bold text-foreground">
                                <span className="flex items-center gap-1.5">
                                    <NotePencil size={15} />
                                    <span>Ghi chú nội bộ:</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={handleSaveNotes}
                                    className="text-[11px] text-brand-ink font-semibold hover:underline cursor-pointer"
                                >
                                    Lưu ghi chú
                                </button>
                            </div>
                            <textarea
                                rows={4}
                                value={internalNotes}
                                onChange={(e) => setInternalNotes(e.target.value)}
                                onBlur={handleSaveNotes}
                                placeholder="Ghi chú sở thích khách hàng, địa chỉ giao hàng, lưu ý giao nhanh..."
                                className="w-full flex-1 rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-dark resize-none leading-relaxed"
                            />
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
