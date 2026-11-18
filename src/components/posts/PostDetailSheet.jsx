import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    CalendarBlank,
    CalendarCheck,
    CaretDown,
    CheckCircle,
    CopySimple,
    FloppyDisk,
    Globe,
    PencilSimple,
    Repeat,
    Sparkle,
    WarningCircle,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useAuth } from '@/lib/AuthContext';
import { DEFAULT_TIMEZONE, JOB_STATUS_LABEL, POST_STATUS_LABEL, POST_STATUS_TONE } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { useTranslation } from '@/lib/i18n';
import { referencedMediaIds } from '@/lib/publishing-content';
import { getAccountAvatarUrl } from '@/lib/account-avatar';
import { toUtcIso, toZonedParts } from '@/lib/tz';
import { useToast } from '../ui/use-toast';
import { Sheet, SheetContent } from '../ui/sheet';
import StatusBadge from '../common/StatusBadge';
import { PLATFORM_CONFIG } from '../common/PlatformBadge';
import SocialMockupPreview from '../composer/SocialMockupPreview';
import PublishConfirmation from './PublishConfirmation';

function toLocalDatetimeValue(iso, tz = DEFAULT_TIMEZONE) {
    if (!iso) return '';
    const p = toZonedParts(iso, tz);
    if (!p) return '';
    return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}T${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

const FREQ_LABEL = {
    daily: 'Hàng ngày',
    weekly: 'Hàng tuần',
    monthly: 'Hàng tháng',
};

export default function PostDetailSheet({ post, onClose, onChanged, accounts: initialAccounts = [] }) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { toast } = useToast();
    const [mode, setMode] = useState('view'); // 'view' | 'edit'
    const [accounts, setAccounts] = useState(initialAccounts);
    const [jobs, setJobs] = useState([]);
    const [variants, setVariants] = useState([]);
    const [images, setImages] = useState([]);
    const [platformImages, setPlatformImages] = useState({});
    const [delivery, setDelivery] = useState(null);
    const [loaded, setLoaded] = useState(false);

    // Edit form state
    const [editTitle, setEditTitle] = useState(post.title || '');
    const [editCaption, setEditCaption] = useState(post.caption || '');
    const [time, setTime] = useState(toLocalDatetimeValue(post.scheduled_at, post.timezone));
    const [review, setReview] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedPreviewPlatform, setSelectedPreviewPlatform] = useState('');
    const [openHistory, setOpenHistory] = useState(false);
    const [isRecurring, setIsRecurring] = useState(post.is_recurring || false);
    const [recurringFrequency, setRecurringFrequency] = useState(post.recurring_frequency || 'weekly');
    const [recurringEndDate, setRecurringEndDate] = useState(
        post.recurring_end_date ? String(post.recurring_end_date).slice(0, 10) : ''
    );

    const refresh = async () => {
        setRefreshKey((k) => k + 1);
        await onChanged?.();
    };

    useEffect(() => {
        setEditTitle(post.title || '');
        setEditCaption(post.caption || '');
        setTime(toLocalDatetimeValue(post.scheduled_at, post.timezone));
        setIsRecurring(post.is_recurring || false);
        setRecurringFrequency(post.recurring_frequency || 'weekly');
        setRecurringEndDate(post.recurring_end_date ? String(post.recurring_end_date).slice(0, 10) : '');
    }, [post]);

    useEffect(() => {
        let active = true;
        if (initialAccounts.length) {
            setAccounts(initialAccounts);
            return () => {
                active = false;
            };
        }
        appClient.entities.SocialAccount.list({ limit: 50 })
            .then((page) => {
                if (active) setAccounts(page.items || []);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [post.is_demo, initialAccounts]);

    useEffect(() => {
        let active = true;
        let timer;
        async function loadStatus() {
            try {
                let result = null;
                if (!post.is_demo) {
                    try {
                        result = await appClient.publishing.status(post.id);
                    } catch (e) {
                        if (e.status !== 404) throw e;
                    }
                }
                const [page, versions] = await Promise.all([
                    appClient.entities.PublishJob.filter({ post_id: post.id }, { limit: 200 }),
                    appClient.entities.PostVariant.filter({ post_id: post.id }, { limit: 200 }),
                ]);
                if (!active) return;
                setLoaded(true);
                setJobs(page.items || []);
                setVariants(versions.items || []);
                setDelivery(result);
                const pending = result?.items
                    ? result.items.some(
                          (item) =>
                              ['queued', 'processing'].includes(item.status) ||
                              ['queued', 'processing'].includes(item.commentStatus)
                      )
                    : ['queued', 'processing'].includes(result?.status) ||
                      ['queued', 'processing'].includes(result?.commentStatus);
                if (pending) timer = setTimeout(loadStatus, 5000);
            } catch (e) {
                if (active) setError(e.message);
            }
        }
        loadStatus();
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [post.id, post.is_demo, refreshKey]);

    useEffect(() => {
        let active = true;
        const ids = referencedMediaIds(post);
        setImages([]);
        setPlatformImages({});
        if (ids.length) {
            appClient.entities.MediaAsset.filter({ id: { $in: ids } }, { limit: 60 })
                .then((page) => {
                    if (!active) return;
                    const assets = (mediaIds) =>
                        mediaIds.map((id) => page.items.find((asset) => asset.id === id)).filter(Boolean);
                    setImages(assets(post.media_ids || []));
                    setPlatformImages(
                        Object.fromEntries(
                            Object.entries(post.platform_media_ids || {}).map(([platform, mediaIds]) => [
                                platform,
                                assets(mediaIds),
                            ])
                        )
                    );
                })
                .catch(() => {});
        }
        return () => {
            active = false;
        };
    }, [post]);

    const variantMap = useMemo(
        () => Object.fromEntries(variants.map((v) => [v.platform, v])),
        [variants]
    );
    const items = delivery?.items || [];
    const status = delivery?.status || post.status;
    const locked = useMemo(
        () =>
            ['publishing', 'published'].includes(status) ||
            items.some((item) => ['queued', 'processing', 'published'].includes(item.status)),
        [items, status]
    );
    const canEditContent =
        !locked &&
        (['draft', 'scheduled'].includes(status) || (isDesktop() && status === 'cancelled'));

    const targetAccounts = useMemo(() => {
        const ids = post.target_account_ids?.length ? post.target_account_ids : post.account_ids || [];
        return ids.map((id) => accounts.find((a) => a.id === id)).filter(Boolean);
    }, [accounts, post.target_account_ids, post.account_ids]);

    const availablePlatforms = useMemo(() => {
        const fromAccounts = targetAccounts.map((a) => a.platform).filter(Boolean);
        const fromVariants = Object.keys(variantMap);
        const fromDelivery = items.map((i) => i.platform).filter(Boolean);
        const fromPost = Array.isArray(post.platforms)
            ? post.platforms
            : post.platform
              ? [post.platform]
              : [];
        const merged = Array.from(
            new Set([...fromAccounts, ...fromVariants, ...fromDelivery, ...fromPost])
        ).filter(Boolean);
        return merged.length > 0 ? merged : ['facebook'];
    }, [targetAccounts, variantMap, items, post.platforms, post.platform]);

    useEffect(() => {
        if (!selectedPreviewPlatform || !availablePlatforms.includes(selectedPreviewPlatform)) {
            setSelectedPreviewPlatform(availablePlatforms[0]);
        }
    }, [availablePlatforms, selectedPreviewPlatform]);

    const activePlatform = selectedPreviewPlatform || availablePlatforms[0];
    const activePlatformCfg = PLATFORM_CONFIG[activePlatform] || PLATFORM_CONFIG.facebook;
    const ActivePlatformIcon = activePlatformCfg.icon || Globe;

    const activeCaption = useMemo(() => {
        if (mode === 'edit') return editCaption;
        return variantMap[activePlatform]?.caption || post.caption || '';
    }, [mode, editCaption, variantMap, activePlatform, post.caption]);

    const activePlatformMedia = useMemo(() => {
        const pMedia = platformImages[activePlatform];
        if (pMedia && pMedia.length > 0) return pMedia;
        return images;
    }, [platformImages, activePlatform, images]);

    const previewAccount = useMemo(() => {
        return (
            targetAccounts.find((a) => a.platform === activePlatform) ||
            targetAccounts[0] || {
                name: 'SocialChoice',
                username: 'socialchoice.vn',
                platform: activePlatform,
            }
        );
    }, [targetAccounts, activePlatform]);

    const previewAvatarUrl = useMemo(() => getAccountAvatarUrl(previewAccount), [previewAccount]);

    const failedJobs = useMemo(
        () => jobs.filter((j) => j.status === 'failed' || j.error_message),
        [jobs]
    );

    const handleSaveEdit = async () => {
        setBusy(true);
        setError('');
        try {
            const { id, created_date, updated_date, ...rest } = post;
            void id;
            void created_date;
            void updated_date;

            const nextData = {
                ...rest,
                is_recurring: isRecurring,
                recurring_frequency: isRecurring ? recurringFrequency : null,
                recurring_end_date: isRecurring && recurringEndDate ? recurringEndDate : null,
            };

            if (canEditContent) {
                nextData.title = editTitle.trim();
                nextData.caption = editCaption;
            }

            // If schedule time changed and post isn't locked, prepare reschedule
            const currentLocalTime = toLocalDatetimeValue(post.scheduled_at, post.timezone);
            const scheduleChanged = canEditContent && time && time !== currentLocalTime;

            await appClient.posts.save({
                id: post.id,
                data: nextData,
            });

            if (scheduleChanged) {
                const value = await appClient.entities.Post.get(post.id);
                const isoTime = toUtcIso(time, value.timezone || DEFAULT_TIMEZONE);
                if (isDesktop()) {
                    await appClient.posts.save({
                        id: post.id,
                        data: { ...value, scheduled_at: isoTime, status: 'scheduled' },
                    });
                } else {
                    setReview(await appClient.publishing.prepareSchedule(post.id, time, value.timezone));
                    setBusy(false);
                    return;
                }
            }

            toast({ title: t('Đã lưu thay đổi bài viết') });
            await refresh();
            setMode('view');
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const handleApprove = async () => {
        setBusy(true);
        setError('');
        try {
            const { id, created_date, updated_date, ...rest } = post;
            void id;
            void created_date;
            void updated_date;
            await appClient.posts.save({
                id: post.id,
                data: {
                    ...rest,
                    needs_approval: false,
                    approved_by: user?.email || user?.full_name || 'Approver',
                    approved_at: new Date().toISOString(),
                    status: post.scheduled_at ? 'scheduled' : 'draft',
                },
            });
            toast({ title: t('Đã phê duyệt bài viết thành công!') });
            await onChanged?.();
            onClose();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const cancelRecurringSeries = async () => {
        if (!post.recurring_group_id) return;
        if (
            !window.confirm(
                t('Bạn có chắc chắn muốn hủy tất cả các bài viết chưa xuất bản trong chuỗi định kỳ này?')
            )
        ) {
            return;
        }
        setBusy(true);
        setError('');
        try {
            const seriesPosts = await appClient.entities.Post.filter(
                { recurring_group_id: post.recurring_group_id },
                { limit: 100 }
            );
            const cancelable = (seriesPosts.items || []).filter((p) => ['draft', 'scheduled'].includes(p.status));
            for (const item of cancelable) {
                await appClient.posts.save({
                    id: item.id,
                    data: {
                        status: 'cancelled',
                        notes: `${item.notes || ''}\n[Đã hủy cả chuỗi định kỳ]`.trim(),
                    },
                });
            }
            toast({
                title: t('Đã hủy chuỗi bài viết định kỳ!'),
                description: t(`Đã hủy ${cancelable.length} bài viết còn lại trong chuỗi.`),
            });
            await refresh();
            onClose();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Sheet open onOpenChange={(open) => !open && !busy && onClose()}>
            <SheetContent className="max-w-lg sm:max-w-xl">
                {/* 1. COMPACT HEADER */}
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-zinc-50/80 px-5 py-3.5 pr-12">
                    <div className="flex min-w-0 items-center gap-2.5">
                        {mode === 'edit' ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setError('');
                                    setMode('view');
                                }}
                                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-zinc-100"
                                title={t('Quay lại xem bài')}
                            >
                                <ArrowLeft size={15} weight="bold" />
                            </button>
                        ) : (
                            <span
                                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${activePlatformCfg.bg || 'bg-zinc-100'} ${activePlatformCfg.border || 'border-border'} ${activePlatformCfg.color || 'text-zinc-900'}`}
                            >
                                <ActivePlatformIcon size={16} weight="fill" />
                            </span>
                        )}
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge tone={POST_STATUS_TONE[status]}>
                                    {POST_STATUS_LABEL[status] || status}
                                </StatusBadge>
                                {post.needs_approval && (
                                    <StatusBadge tone="warn">{t('Chờ phê duyệt')}</StatusBadge>
                                )}
                                {post.is_recurring && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-foreground">
                                        <Repeat size={11} weight="bold" />
                                        {FREQ_LABEL[post.recurring_frequency] || t('Định kỳ')}
                                    </span>
                                )}
                                {post.auto_dm_enabled && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-brand-dark/40 bg-brand/20 px-2 py-0.5 text-[11px] font-medium text-brand-ink">
                                        <Sparkle size={11} weight="fill" />
                                        Auto-DM
                                    </span>
                                )}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {post.scheduled_at
                                    ? formatDateTime(post.scheduled_at, post.timezone)
                                    : t('Bản nháp chưa đặt lịch')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. BODY */}
                {mode === 'view' ? (
                    /* VIEW MODE: Visual, clean, post-only */
                    <div className="flex-1 space-y-4 overflow-y-auto bg-zinc-50/40 p-5 sm:p-6">
                        {/* Platform Switcher (only when multiple platforms) */}
                        {availablePlatforms.length > 1 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                {availablePlatforms.map((platform) => {
                                    const isActive = activePlatform === platform;
                                    const cfg = PLATFORM_CONFIG[platform];
                                    const Icon = cfg?.icon || Globe;
                                    return (
                                        <button
                                            key={platform}
                                            type="button"
                                            onClick={() => setSelectedPreviewPlatform(platform)}
                                            className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-medium capitalize transition-colors ${
                                                isActive
                                                    ? 'border-brand-dark bg-brand font-semibold text-brand-ink'
                                                    : 'border-border bg-card text-zinc-600 hover:bg-zinc-100 hover:text-foreground'
                                            }`}
                                        >
                                            <Icon size={13} weight="bold" />
                                            <span>{platform}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Post Title (internal label) */}
                        {post.title && (
                            <h3 className="font-heading text-base font-semibold leading-snug text-foreground">
                                {post.title}
                            </h3>
                        )}

                        {/* Native Platform UI Mockup */}
                        <SocialMockupPreview
                            account={previewAccount}
                            text={activeCaption}
                            media={activePlatformMedia}
                            when={
                                post.scheduled_at
                                    ? formatDateTime(post.scheduled_at, post.timezone)
                                    : t('Vừa xong')
                            }
                        />

                        {/* Compact Channel Chips + Error Alert (only if relevant) */}
                        {targetAccounts.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                <span>{t('Kênh đăng')}:</span>
                                {targetAccounts.map((acc) => {
                                    const cfg = PLATFORM_CONFIG[acc.platform];
                                    const Icon = cfg?.icon || Globe;
                                    return (
                                        <span
                                            key={acc.id}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 font-medium text-foreground"
                                        >
                                            <Icon size={12} weight="bold" className={cfg?.color || 'text-zinc-700'} />
                                            <span>{acc.name}</span>
                                        </span>
                                    );
                                })}
                            </div>
                        )}

                        {failedJobs.length > 0 && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/70 p-3 text-xs text-red-800">
                                <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-red-600" />
                                <div className="space-y-0.5">
                                    <div className="font-semibold">{t('Có lỗi khi xuất bản')}</div>
                                    {failedJobs.map((job) => (
                                        <p key={job.id}>
                                            {job.account_name}: {t(job.error_message || 'Lỗi không xác định')}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {error && (
                            <p role="alert" className="text-xs font-medium text-red-700">
                                {t(error)}
                            </p>
                        )}
                    </div>
                ) : (
                    /* EDIT MODE: Clean, focused editing & schedule settings */
                    <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
                        {!canEditContent && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                                <WarningCircle size={16} weight="bold" className="mt-0.5 shrink-0 text-amber-600" />
                                <span>
                                    {t(
                                        'Bài viết đã xuất bản hoặc đang xử lý nên nội dung gốc bị khóa. Bạn vẫn có thể xem lịch sử hoặc nhân bản thành bản nháp mới.'
                                    )}
                                </span>
                            </div>
                        )}

                        {/* Title & Caption */}
                        <div className="space-y-3">
                            <label className="block space-y-1.5">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('Tiêu đề bài viết')}
                                </span>
                                <input
                                    type="text"
                                    value={editTitle}
                                    disabled={!canEditContent || busy}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder={t('Nhập tiêu đề bài viết...')}
                                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground focus:border-zinc-900 focus:outline-none disabled:bg-zinc-50 disabled:text-muted-foreground"
                                />
                            </label>

                            <label className="block space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {t('Nội dung (Caption)')}
                                    </span>
                                    <span className="text-xs tabular-nums text-muted-foreground">
                                        {editCaption.length} {t('ký tự')}
                                    </span>
                                </div>
                                <textarea
                                    rows={6}
                                    value={editCaption}
                                    disabled={!canEditContent || busy}
                                    onChange={(e) => setEditCaption(e.target.value)}
                                    placeholder={t('Nhập nội dung bài viết...')}
                                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm leading-relaxed text-foreground focus:border-zinc-900 focus:outline-none disabled:bg-zinc-50 disabled:text-muted-foreground"
                                />
                            </label>
                        </div>

                        {/* Schedule Time */}
                        <div className="panel space-y-3 bg-zinc-50/60 p-4">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                                <CalendarBlank size={15} weight="bold" />
                                <span>{t('Thời gian xuất bản')}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <input
                                    type="datetime-local"
                                    value={time}
                                    disabled={!canEditContent || busy}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="min-h-10 flex-1 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground focus:border-zinc-900 focus:outline-none disabled:bg-zinc-100 disabled:text-muted-foreground"
                                />
                                <span className="text-xs text-muted-foreground">
                                    {post.timezone || DEFAULT_TIMEZONE}
                                </span>
                            </div>
                        </div>

                        {/* Recurring Settings */}
                        <div className="panel space-y-3 bg-zinc-50/60 p-4">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                                    <Repeat size={15} weight="bold" />
                                    <span>{t('Đăng lại định kỳ')}</span>
                                </span>
                                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
                                    <input
                                        type="checkbox"
                                        checked={isRecurring}
                                        disabled={busy}
                                        onChange={(e) => setIsRecurring(e.target.checked)}
                                        className="h-4 w-4 accent-zinc-900"
                                    />
                                    <span>{t('Bật lặp lại')}</span>
                                </label>
                            </div>
                            {isRecurring && (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <label className="block space-y-1 text-xs">
                                        <span className="font-medium text-muted-foreground">{t('Tần suất')}</span>
                                        <select
                                            value={recurringFrequency}
                                            disabled={busy}
                                            onChange={(e) => setRecurringFrequency(e.target.value)}
                                            className="min-h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground"
                                        >
                                            <option value="daily">{t('Hàng ngày')}</option>
                                            <option value="weekly">{t('Hàng tuần')}</option>
                                            <option value="monthly">{t('Hàng tháng')}</option>
                                        </select>
                                    </label>
                                    <label className="block space-y-1 text-xs">
                                        <span className="font-medium text-muted-foreground">{t('Ngày kết thúc')}</span>
                                        <input
                                            type="date"
                                            value={recurringEndDate}
                                            disabled={busy}
                                            onChange={(e) => setRecurringEndDate(e.target.value)}
                                            className="min-h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground"
                                        />
                                    </label>
                                </div>
                            )}
                            {post.recurring_group_id && (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={cancelRecurringSeries}
                                    className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                                >
                                    {t('Hủy cả chuỗi bài viết định kỳ')}
                                </button>
                            )}
                        </div>

                        {/* Collapsible Publishing History */}
                        <div className="overflow-hidden rounded-xl border border-border bg-card">
                            <button
                                type="button"
                                onClick={() => setOpenHistory(!openHistory)}
                                className="flex min-h-10 w-full cursor-pointer items-center justify-between bg-zinc-50/70 px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-zinc-100"
                            >
                                <span className="flex items-center gap-2">
                                    <CalendarCheck size={15} weight="bold" className="text-zinc-600" />
                                    <span>
                                        {t('Lịch sử đăng bài')} ({jobs.length})
                                    </span>
                                </span>
                                <CaretDown
                                    size={14}
                                    weight="bold"
                                    className={`transition-transform duration-200 ${openHistory ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {openHistory && (
                                <div className="space-y-2 border-t border-border bg-card p-3.5 text-xs">
                                    {loaded && jobs.length > 0 ? (
                                        jobs.map((job) => (
                                            <div
                                                className="border-b border-border py-1.5 text-xs last:border-b-0"
                                                key={job.id}
                                            >
                                                <p className="font-semibold text-foreground">
                                                    {job.account_name} · {JOB_STATUS_LABEL[job.status] || job.status}
                                                </p>
                                                {job.scheduled_for && (
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        {formatDateTime(job.scheduled_for, post.timezone)}
                                                    </p>
                                                )}
                                                {job.error_message && (
                                                    <p className="mt-0.5 text-red-700">{t(job.error_message)}</p>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-muted-foreground">
                                            {t('Chưa có lượt xuất bản nào được ghi nhận.')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {review && (
                            <PublishConfirmation
                                review={review}
                                onClose={() => setReview(null)}
                                onResult={async () => {
                                    setReview(null);
                                    await refresh();
                                    setMode('view');
                                }}
                            />
                        )}

                        {error && (
                            <p role="alert" className="text-xs font-medium text-red-700">
                                {t(error)}
                            </p>
                        )}
                    </div>
                )}

                {/* 3. CLEAN FOOTER */}
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-t border-border bg-zinc-50/80 px-5 py-3.5">
                    {mode === 'view' ? (
                        <>
                            <div className="flex flex-wrap items-center gap-2">
                                <Link
                                    to={'/create?duplicate=' + post.id}
                                    className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-zinc-100"
                                    onClick={onClose}
                                >
                                    <CopySimple size={14} weight="bold" />
                                    <span>{t('Nhân bản')}</span>
                                </Link>
                                {post.needs_approval &&
                                    (!user?.isTeamMember || user?.role === 'admin' || user?.role === 'approver') && (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={handleApprove}
                                            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            <CheckCircle size={14} weight="bold" />
                                            <span>{t('Phê duyệt')}</span>
                                        </button>
                                    )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setMode('edit')}
                                className="btn-skew min-h-9 cursor-pointer whitespace-nowrap"
                            >
                                <PencilSimple size={14} weight="bold" />
                                <span>{t('Sửa thông tin')}</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                        setError('');
                                        setMode('view');
                                    }}
                                    className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-zinc-100"
                                >
                                    {t('Hủy')}
                                </button>
                                {canEditContent && (
                                    <Link
                                        to={'/create?edit=' + post.id}
                                        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-zinc-100"
                                        onClick={onClose}
                                    >
                                        <span>{t('Mở trình soạn đầy đủ')}</span>
                                    </Link>
                                )}
                            </div>

                            <button
                                type="button"
                                disabled={busy}
                                onClick={handleSaveEdit}
                                className="btn-skew min-h-9 cursor-pointer whitespace-nowrap disabled:opacity-50"
                            >
                                <FloppyDisk size={14} weight="bold" />
                                <span>{busy ? t('Đang lưu...') : t('Lưu thay đổi')}</span>
                            </button>
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
