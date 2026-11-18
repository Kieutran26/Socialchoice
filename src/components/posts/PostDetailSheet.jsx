import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowsClockwise,
    Article,
    Bookmark,
    CalendarCheck,
    CaretDown,
    ChatCircle,
    CheckCircle,
    Clock,
    CopySimple,
    Globe,
    Heart,
    PaperPlaneTilt,
    PencilSimple,
    ShieldCheck,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { DEFAULT_TIMEZONE, JOB_STATUS_LABEL, PLATFORM_LABEL, POST_STATUS_LABEL, POST_STATUS_TONE } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { referencedMediaIds } from '@/lib/publishing-content';
import { getAccountAvatarUrl } from '@/lib/account-avatar';
import { toUtcIso, toZonedParts } from '@/lib/tz';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { useToast } from '../ui/use-toast';
import StatusBadge from '../common/StatusBadge';
import { PLATFORM_CONFIG } from '../common/PlatformBadge';
import ScheduleFields from '../composer/ScheduleFields';
import RecurringPostSettings from './recurring-post-settings';
import PublishConfirmation from './PublishConfirmation';

export default function PostDetailSheet({ post, onClose, onChanged, accounts: initialAccounts = [] }) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { toast } = useToast();
    const [review, setReview] = useState(null);
    const [delivery, setDelivery] = useState(null);
    const [images, setImages] = useState([]);
    const [platformImages, setPlatformImages] = useState({});
    const [jobs, setJobs] = useState([]);
    const [variants, setVariants] = useState([]);
    const [accounts, setAccounts] = useState(initialAccounts);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [value, setValue] = useState(() => ({
        ...toZonedParts(post.scheduled_at, post.timezone || DEFAULT_TIMEZONE),
        timezone: post.timezone || DEFAULT_TIMEZONE,
    }));
    const [selectedPreviewPlatform, setSelectedPreviewPlatform] = useState('');

    const [openReschedule, setOpenReschedule] = useState(false);
    const [openRecurring, setOpenRecurring] = useState(false);
    const [openHistory, setOpenHistory] = useState(false);

    useEffect(() => {
        if (accounts.length) return;
        let active = true;
        appClient.entities.SocialAccount.filter({ is_demo: post.is_demo }, { limit: 100 })
            .then((page) => {
                if (active) setAccounts(page.items || []);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [post.is_demo, accounts.length]);

    useEffect(() => {
        let active = true;
        let timer;
        async function refresh() {
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
                if (pending) timer = setTimeout(refresh, 5000);
            } catch (e) {
                if (active) setError(e.message);
            }
        }
        refresh();
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
                .catch((e) => {
                    if (active) setError(e.message);
                });
        } else {
            setPlatformImages(
                Object.fromEntries(Object.keys(post.platform_media_ids || {}).map((platform) => [platform, []]))
            );
        }
        return () => {
            active = false;
        };
    }, [post.id, post.media_ids, post.platform_media_ids]);

    const items = delivery?.items || (delivery?.attemptId ? [delivery] : []);
    const queued = items.some((item) => item.status === 'queued');
    const status =
        delivery && !['prepared', 'calendar_plan'].includes(delivery.status)
            ? delivery.status === 'queued'
                ? 'scheduled'
                : delivery.status
            : post.status;
    const locked = !loaded || queued || items.some((item) => !['prepared', 'cancelled'].includes(item.status));
    const caption = delivery?.caption || post.caption || '';

    const targetAccounts = useMemo(() => {
        if (!post.account_ids || !post.account_ids.length) return [];
        return post.account_ids.map((id) => accounts.find((a) => a.id === id)).filter(Boolean);
    }, [post.account_ids, accounts]);

    const availablePlatforms = useMemo(() => {
        const set = new Set();
        if (items.length) {
            items.forEach((i) => {
                if (i.platform) set.add(i.platform.toLowerCase());
            });
        }
        if (targetAccounts.length) {
            targetAccounts.forEach((a) => {
                if (a.platform) set.add(a.platform.toLowerCase());
            });
        }
        if (!set.size) {
            set.add('facebook');
            set.add('instagram');
            set.add('threads');
        }
        return Array.from(set);
    }, [items, targetAccounts]);

    const activePlatform =
        selectedPreviewPlatform && availablePlatforms.includes(selectedPreviewPlatform)
            ? selectedPreviewPlatform
            : availablePlatforms[0] || 'facebook';

    const activePlatformMedia = platformImages[activePlatform]?.length ? platformImages[activePlatform] : images;
    const activeCaption = post.platform_captions?.[activePlatform] || caption;

    const previewAccount = useMemo(() => {
        const found = targetAccounts.find((a) => (a.platform || '').toLowerCase() === activePlatform);
        if (found) return found;
        const itemFound = items.find((i) => (i.platform || '').toLowerCase() === activePlatform);
        if (itemFound) return { name: itemFound.pageName || itemFound.pageId, username: itemFound.pageName, platform: activePlatform };
        return { name: 'Socialchoice', username: 'socialchoice', platform: activePlatform };
    }, [targetAccounts, items, activePlatform]);

    const previewAvatarUrl = previewAccount ? getAccountAvatarUrl(previewAccount) : '';
    const activePlatformCfg = PLATFORM_CONFIG[activePlatform] || {
        icon: Globe,
        label: activePlatform,
        color: 'text-foreground',
        bg: 'bg-zinc-900',
    };
    const ActivePlatformIcon = activePlatformCfg.icon || Globe;

    async function refresh() {
        setRefreshKey((key) => key + 1);
        await onChanged?.();
    }

    async function action(work) {
        setBusy(true);
        setError('');
        try {
            await work();
            await refresh();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function reschedule() {
        setBusy(true);
        setError('');
        try {
            const time = toUtcIso(value.date, value.time, value.timezone);
            if (post.is_demo || isDesktop()) {
                const { id, created_date, updated_date, ...data } = post;
                void created_date;
                void updated_date;
                if (
                    !time ||
                    toZonedParts(time, value.timezone).date !== value.date ||
                    toZonedParts(time, value.timezone).time !== value.time
                ) {
                    throw new Error('Choose a valid local time in this timezone.');
                }
                await appClient.posts.save({
                    id,
                    data: { ...data, scheduled_at: time, timezone: value.timezone, status: 'scheduled' },
                });
                await onChanged?.();
                onClose();
            } else {
                setReview(await appClient.publishing.prepareSchedule(post.id, time, value.timezone));
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

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
        <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
            <DialogContent className="flex max-h-[92vh] w-[calc(100%-2rem)] max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-2xl xl:max-w-6xl">
                {/* 1. CLEAN STUDIO HEADER */}
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-zinc-50/80 px-5 py-3.5 pr-14 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-dark bg-brand text-brand-ink">
                            <Article size={18} weight="duotone" />
                        </span>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="truncate font-heading text-sm font-semibold text-foreground sm:text-base">
                                    {t('Chi tiết & Kiểm duyệt bài viết')}
                                </h2>
                                <StatusBadge tone={POST_STATUS_TONE[status]}>
                                    {POST_STATUS_LABEL[status] || status}
                                </StatusBadge>
                                {post.needs_approval && (
                                    <StatusBadge tone="warn">{t('Chờ phê duyệt')}</StatusBadge>
                                )}
                                <span className="font-mono text-xs text-muted-foreground">
                                    #{post.id ? post.id.slice(-6).toUpperCase() : ''}
                                </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {post.scheduled_at
                                    ? `${t('Lịch xuất bản')}: ${formatDateTime(post.scheduled_at, post.timezone)} (${post.timezone || DEFAULT_TIMEZONE})`
                                    : t('Bản nháp chưa đặt lịch')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. BODY: CLEAN MOCKUP PREVIEW (LEFT) + CONTROLS (RIGHT) */}
                <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12 lg:overflow-hidden">
                    {/* LEFT COLUMN: Clean Social Feed Mockup (No clunky iPhone bezel) */}
                    <div className="flex flex-col space-y-4 border-b border-border bg-zinc-50/60 p-5 lg:col-span-5 lg:overflow-y-auto lg:border-b-0 lg:border-r">
                        {/* Platform Switcher */}
                        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1 self-start">
                            {availablePlatforms.map((platform) => {
                                const isActive = activePlatform === platform;
                                const cfg = PLATFORM_CONFIG[platform];
                                const Icon = cfg?.icon || Globe;
                                return (
                                    <button
                                        key={platform}
                                        type="button"
                                        onClick={() => setSelectedPreviewPlatform(platform)}
                                        className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium capitalize transition-colors ${
                                            isActive
                                                ? 'bg-brand font-semibold text-brand-ink'
                                                : 'text-zinc-600 hover:text-foreground'
                                        }`}
                                    >
                                        <Icon size={13} weight="bold" />
                                        <span>{platform}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Clean Social Post Mockup Card */}
                        <div className="panel space-y-3 bg-card p-4">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2.5">
                                    {previewAvatarUrl ? (
                                        <img
                                            src={previewAvatarUrl}
                                            alt=""
                                            className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-ink">
                                            {previewAccount?.name?.[0]?.toUpperCase() || 'S'}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="truncate text-xs font-semibold text-foreground">
                                            {previewAccount?.name || previewAccount?.username}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {post.scheduled_at
                                                ? formatDateTime(post.scheduled_at, post.timezone)
                                                : t('Vừa xong')}
                                        </div>
                                    </div>
                                </div>
                                <span
                                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${activePlatformCfg.bg || 'bg-zinc-900'} text-white`}
                                    title={activePlatform}
                                >
                                    <ActivePlatformIcon size={14} weight="fill" />
                                </span>
                            </div>

                            {/* Caption */}
                            <div className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground">
                                {activeCaption || t('Chưa có nội dung caption.')}
                            </div>

                            {/* Media */}
                            {activePlatformMedia.length > 0 && (
                                <div className="overflow-hidden rounded-xl border border-border bg-zinc-100">
                                    {activePlatformMedia[0]?.file_type === 'video' ? (
                                        <video
                                            src={activePlatformMedia[0].file_url}
                                            controls
                                            preload="metadata"
                                            className="max-h-56 w-full object-cover"
                                        />
                                    ) : (
                                        <img
                                            src={activePlatformMedia[0].file_url}
                                            alt=""
                                            className="max-h-56 w-full object-cover"
                                        />
                                    )}
                                </div>
                            )}

                            {/* Mockup Action Bar */}
                            <div className="flex items-center justify-between border-t border-border pt-2.5 text-muted-foreground">
                                <div className="flex items-center gap-4">
                                    <Heart size={15} />
                                    <ChatCircle size={15} />
                                    <PaperPlaneTilt size={15} />
                                </div>
                                <Bookmark size={15} />
                            </div>
                        </div>

                        {/* Compact QA Summary Strip */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="rounded-xl border border-border bg-card p-2.5">
                                <div className="text-muted-foreground">{t('Media')}</div>
                                <div className="mt-0.5 font-semibold text-foreground">
                                    {images.length > 0 ? `${images.length} ${t('tệp')}` : t('Văn bản')}
                                </div>
                            </div>
                            <div className="rounded-xl border border-border bg-card p-2.5">
                                <div className="text-muted-foreground">{t('Độ dài')}</div>
                                <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                                    {activeCaption?.length || 0} {t('ký tự')}
                                </div>
                            </div>
                            <div className="rounded-xl border border-border bg-card p-2.5">
                                <div className="text-muted-foreground">{t('Kênh đích')}</div>
                                <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                                    {targetAccounts.length || items.length} {t('kênh')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Post Metadata, Channels & Controls */}
                    <div className="space-y-5 p-5 sm:p-6 lg:col-span-7 lg:overflow-y-auto">
                        {/* Title */}
                        <div className="space-y-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('Tiêu đề bài viết')}
                            </span>
                            <h3 className="font-heading text-lg font-semibold leading-snug text-foreground">
                                {post.title || t('Bài viết chưa đặt tiêu đề')}
                            </h3>
                        </div>

                        {/* QA Checklist Card */}
                        <div className="panel space-y-2.5 bg-zinc-50/70 p-4">
                            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground">
                                <ShieldCheck size={16} weight="bold" className="text-emerald-600" />
                                <span>{t('Kiểm duyệt tiêu chuẩn xuất bản')}</span>
                            </div>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
                                    <span className="flex items-center gap-2 font-medium text-foreground">
                                        <CheckCircle size={15} weight="fill" className="text-emerald-600" />
                                        <span>{t('Định dạng nội dung & media')}</span>
                                    </span>
                                    <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                        {images.length > 0 ? `${images.length} ${t('tệp hợp lệ')}` : t('Chữ thuần túy')}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
                                    <span className="flex items-center gap-2 font-medium text-foreground">
                                        <CheckCircle size={15} weight="fill" className="text-emerald-600" />
                                        <span>{t('Giới hạn ký tự an toàn')} ({activeCaption?.length || 0})</span>
                                    </span>
                                    <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                        {t('Đạt chuẩn')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Target Channels / Results */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('Kênh phân phối & Trạng thái')} ({items.length || targetAccounts.length})
                            </h4>

                            {items.length > 0 ? (
                                <div className="space-y-2">
                                    {items.map((item) => (
                                        <div key={item.attemptId} className="space-y-2 rounded-xl border border-border bg-card p-3 text-xs">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="truncate font-semibold text-foreground">
                                                    {item.pageName} · {PLATFORM_LABEL[item.platform || 'facebook']}
                                                </p>
                                                <StatusBadge
                                                    tone={POST_STATUS_TONE[item.status === 'queued' ? 'scheduled' : item.status]}
                                                >
                                                    {t(
                                                        item.status === 'queued'
                                                            ? 'Scheduled'
                                                            : POST_STATUS_LABEL[item.status] || item.status
                                                    )}
                                                </StatusBadge>
                                            </div>
                                            <p className="line-clamp-2 whitespace-pre-wrap break-words text-muted-foreground">
                                                {item.caption}
                                            </p>
                                            {item.publishedUrl && (
                                                <a
                                                    href={item.publishedUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-block font-semibold text-brand-ink underline"
                                                >
                                                    {t('Xem bài viết đã đăng →')}
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : targetAccounts.length > 0 ? (
                                <div className="space-y-1.5">
                                    {targetAccounts.map((account) => {
                                        const platform = (account.platform || 'facebook').toLowerCase();
                                        const cfg = PLATFORM_CONFIG[platform] || {
                                            icon: Globe,
                                            label: platform,
                                            bg: 'bg-zinc-800',
                                            color: 'text-white',
                                        };
                                        const PlatformIcon = cfg.icon || Globe;
                                        return (
                                            <div
                                                key={account.id}
                                                className="flex items-center justify-between rounded-xl border border-border bg-card p-2.5"
                                            >
                                                <div className="flex min-w-0 items-center gap-2.5">
                                                    <span
                                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cfg.bg} text-white`}
                                                    >
                                                        <PlatformIcon size={14} weight="fill" />
                                                    </span>
                                                    <span className="truncate text-xs font-semibold text-foreground">
                                                        {account.name}
                                                    </span>
                                                    <span className="text-xs capitalize text-muted-foreground">
                                                        ({cfg.label})
                                                    </span>
                                                </div>
                                                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                                                    {t('Sẵn sàng')}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs italic text-muted-foreground">
                                    {t('Chưa gán kênh phân phối nào cho bài viết này.')}
                                </p>
                            )}
                        </div>

                        {/* Recurring Series Info Banner */}
                        {post.recurring_group_id && (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-dark/40 bg-brand-50 p-3 text-xs">
                                <div className="flex items-center gap-2.5">
                                    <ArrowsClockwise size={18} weight="bold" className="shrink-0 text-brand-ink" />
                                    <div>
                                        <div className="flex items-center gap-1.5 font-semibold text-brand-ink">
                                            <span>{t('Bài viết thuộc chuỗi định kỳ')}</span>
                                            {post.recurrence_index && (
                                                <span className="rounded border border-brand-dark bg-brand px-1.5 py-0.5 text-xs font-bold">
                                                    {t('Kỳ {index}/{total}', {
                                                        index: post.recurrence_index,
                                                        total: post.recurrence_total || '∞',
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {t('Tần suất:')}{' '}
                                            {post.recurrence_rule?.frequency === 'weekly'
                                                ? t('Hàng tuần')
                                                : post.recurrence_rule?.frequency === 'biweekly'
                                                ? t('Mỗi 2 tuần')
                                                : t('Hàng tháng')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={cancelRecurringSeries}
                                    className="shrink-0 cursor-pointer text-xs font-semibold text-red-700 hover:underline"
                                >
                                    {t('Hủy cả chuỗi')}
                                </button>
                            </div>
                        )}

                        {/* Auto-DM Info Banner */}
                        {post.auto_dm?.enabled && (
                            <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-blue-900">
                                        {t('Đang bật Comment-to-Inbox (Auto-DM)')}
                                    </span>
                                    <span className="rounded bg-blue-200/80 px-2 py-0.5 text-xs font-semibold text-blue-900">
                                        {post.auto_dm.matchAll ? t('Mọi comment') : t('Khớp từ khóa')}
                                    </span>
                                </div>
                                <div className="space-y-1 text-xs text-blue-800">
                                    <div>
                                        <strong>{t('Từ khóa:')}</strong>{' '}
                                        <span className="rounded border border-blue-200 bg-white/80 px-1.5 py-0.5 font-mono">
                                            {post.auto_dm.matchAll
                                                ? t('Tất cả')
                                                : (post.auto_dm.keywords || []).join(', ')}
                                        </span>
                                    </div>
                                    <div className="truncate">
                                        <strong>{t('Tin nhắn Inbox:')}</strong>{' '}
                                        {post.auto_dm.privateMessage?.slice(0, 80)}…
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Accordion 1: Đổi ngày & Giờ đăng */}
                        {!locked &&
                            ['draft', 'scheduled', 'cancelled'].includes(status) &&
                            !jobs.some((job) => job.attempts > 0) && (
                                <div className="overflow-hidden rounded-xl border border-border bg-card">
                                    <button
                                        type="button"
                                        onClick={() => setOpenReschedule(!openReschedule)}
                                        className="flex min-h-10 w-full cursor-pointer items-center justify-between bg-zinc-50/70 px-3.5 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-zinc-100"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Clock size={15} weight="bold" className="text-brand-ink" />
                                            <span>{t('Đổi ngày & giờ phát hành')}</span>
                                        </span>
                                        <CaretDown
                                            size={14}
                                            weight="bold"
                                            className={`transition-transform duration-200 ${openReschedule ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                    {openReschedule && (
                                        <div className="space-y-3 border-t border-border bg-card p-4 text-xs">
                                            <ScheduleFields
                                                value={value}
                                                onChange={(patch) => setValue({ ...value, ...patch })}
                                            />
                                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                                <button
                                                    className="btn-skew min-h-9 cursor-pointer"
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={reschedule}
                                                >
                                                    <span>
                                                        {t(isDesktop() ? 'Lưu lịch đăng' : 'Xác nhận đổi lịch')}
                                                    </span>
                                                </button>
                                                {isDesktop() && status === 'scheduled' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={busy}
                                                        onClick={() =>
                                                            action(async () => {
                                                                await appClient.posts.cancelPlans([post.id]);
                                                                onClose();
                                                            })
                                                        }
                                                    >
                                                        {t('Hủy lịch')}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        {/* Accordion 2: Tái đăng nội dung định kỳ */}
                        {!post.is_demo && !isDesktop() && (
                            <div className="overflow-hidden rounded-xl border border-border bg-card">
                                <button
                                    type="button"
                                    onClick={() => setOpenRecurring(!openRecurring)}
                                    className="flex min-h-10 w-full cursor-pointer items-center justify-between bg-zinc-50/70 px-3.5 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-zinc-100"
                                >
                                    <span className="flex items-center gap-2">
                                        <ArrowsClockwise size={15} weight="bold" className="text-blue-600" />
                                        <span>{t('Cài đặt đăng lại định kỳ')}</span>
                                    </span>
                                    <CaretDown
                                        size={14}
                                        weight="bold"
                                        className={`transition-transform duration-200 ${openRecurring ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {openRecurring && (
                                    <div className="border-t border-border bg-card p-4">
                                        <RecurringPostSettings key={post.id} post={post} onChanged={onChanged} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Accordion 3: Lịch sử đăng bài */}
                        <div className="overflow-hidden rounded-xl border border-border bg-card">
                            <button
                                type="button"
                                onClick={() => setOpenHistory(!openHistory)}
                                className="flex min-h-10 w-full cursor-pointer items-center justify-between bg-zinc-50/70 px-3.5 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-zinc-100"
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
                                <div className="space-y-2 border-t border-border bg-card p-4 text-xs">
                                    {jobs.length ? (
                                        jobs.map((job) => (
                                            <div
                                                className="border-b border-border py-2 text-xs last:border-b-0"
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
                                                    <p className="mt-1 text-red-700">{t(job.error_message)}</p>
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
                                }}
                            />
                        )}
                        {error && (
                            <p role="alert" className="text-xs font-medium text-red-700">
                                {t(error)}
                            </p>
                        )}
                    </div>
                </div>

                {/* 3. STICKY BOTTOM FOOTER */}
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-zinc-50/70 px-5 py-3.5 sm:px-6">
                    <span className="font-mono text-xs text-muted-foreground">
                        {post.scheduled_at ? formatDateTime(post.scheduled_at, post.timezone) : t('Bản nháp')}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                        {post.needs_approval &&
                            (!user?.isTeamMember || user?.role === 'admin' || user?.role === 'approver') && (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={handleApprove}
                                    className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    <CheckCircle size={14} weight="bold" />
                                    <span>{t('Phê duyệt bài viết')}</span>
                                </button>
                            )}
                        <Link
                            to={'/create?duplicate=' + post.id}
                            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-zinc-100"
                            onClick={onClose}
                        >
                            <CopySimple size={14} weight="bold" />
                            <span>{t('Nhân bản thành bản nháp')}</span>
                        </Link>
                        {!locked &&
                            (['draft', 'scheduled'].includes(status) || (isDesktop() && status === 'cancelled')) && (
                                <Link
                                    to={'/create?edit=' + post.id}
                                    className="btn-skew min-h-9 whitespace-nowrap"
                                    onClick={onClose}
                                >
                                    <PencilSimple size={14} weight="bold" />
                                    <span>{t('Chỉnh sửa bài viết')}</span>
                                </Link>
                            )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
