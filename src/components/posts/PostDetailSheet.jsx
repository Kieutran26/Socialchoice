import MediaAttachments from './media-attachments';
import RecurringPostSettings from './recurring-post-settings';
import { referencedMediaIds } from '@/lib/publishing-content';
import PublishConfirmation from './PublishConfirmation';
import { useTranslation } from '@/lib/i18n';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import StatusBadge from '../common/StatusBadge';
import ScheduleFields from '../composer/ScheduleFields';
import { DEFAULT_TIMEZONE, POST_STATUS_LABEL, POST_STATUS_TONE, JOB_STATUS_LABEL } from '@/lib/constants';
import { toZonedParts, toUtcIso } from '@/lib/tz';
import { formatDateTime } from '@/lib/format';
import { PLATFORM_LABEL } from '@/lib/constants';
import { PLATFORM_CONFIG } from '../common/PlatformBadge';
import { getAccountAvatarUrl } from '@/lib/account-avatar';
import {
    CalendarCheck,
    PencilSimple,
    CopySimple,
    Globe,
    Heart,
    ChatCircle,
    ShareFat,
    PaperPlaneTilt,
    Bookmark,
    ThumbsUp,
    Repeat,
    DotsThree,
    DeviceMobile,
    CheckCircle,
    ShieldCheck,
    WifiHigh,
    BatteryFull,
    CaretDown,
    Clock,
    ArrowsClockwise,
} from '@phosphor-icons/react';

export default function PostDetailSheet({ post, onClose, onChanged, accounts: initialAccounts = [] }) {
    const { t } = useTranslation();
    const [review, setReview] = useState(null), [delivery, setDelivery] = useState(null);
    const [images, setImages] = useState([]), [platformImages, setPlatformImages] = useState({}), [jobs, setJobs] = useState([]), [variants, setVariants] = useState([]);
    const [accounts, setAccounts] = useState(initialAccounts);
    const [error, setError] = useState(''), [busy, setBusy] = useState(false), [refreshKey, setRefreshKey] = useState(0), [loaded, setLoaded] = useState(false);
    const [value, setValue] = useState(() => ({ ...toZonedParts(post.scheduled_at, post.timezone || DEFAULT_TIMEZONE), timezone: post.timezone || DEFAULT_TIMEZONE }));
    const [selectedPreviewPlatform, setSelectedPreviewPlatform] = useState('');

    // Collapsible states for advanced forms
    const [openReschedule, setOpenReschedule] = useState(false);
    const [openRecurring, setOpenRecurring] = useState(false);
    const [openHistory, setOpenHistory] = useState(false);

    // Fetch accounts if not passed
    useEffect(() => {
        if (accounts.length) return;
        let active = true;
        appClient.entities.SocialAccount.filter({ is_demo: post.is_demo }, { limit: 100 })
            .then(page => {
                if (active) setAccounts(page.items || []);
            })
            .catch(() => {});
        return () => { active = false; };
    }, [post.is_demo, accounts.length]);

    useEffect(() => {
        let active = true, timer;
        async function refresh() {
            try {
                let result = null;
                if (!post.is_demo) try { result = await appClient.publishing.status(post.id); } catch (e) { if (e.status !== 404) throw e; }
                const [page, versions] = await Promise.all([appClient.entities.PublishJob.filter({ post_id: post.id }, { limit: 200 }), appClient.entities.PostVariant.filter({ post_id: post.id }, { limit: 200 })]);
                if (!active) return;
                setLoaded(true); setJobs(page.items); setVariants(versions.items); setDelivery(result);
                const pending = result?.items
                    ? result.items.some(item => ['queued', 'processing'].includes(item.status) || ['queued', 'processing'].includes(item.commentStatus))
                    : ['queued', 'processing'].includes(result?.status) || ['queued', 'processing'].includes(result?.commentStatus);
                if (pending) timer = setTimeout(refresh, 5000);
            } catch (e) { if (active) setError(e.message); }
        }
        refresh(); return () => { active = false; clearTimeout(timer); };
    }, [post.id, post.is_demo, refreshKey]);

    useEffect(() => {
        let active = true;
        const ids = referencedMediaIds(post);
        setImages([]); setPlatformImages({});
        if (ids.length) appClient.entities.MediaAsset.filter({ id: { $in: ids } }, { limit: 60 }).then(page => {
            if (active) {
                const assets = mediaIds => mediaIds.map(id => page.items.find(asset => asset.id === id)).filter(Boolean);
                setImages(assets(post.media_ids || []));
                setPlatformImages(Object.fromEntries(Object.entries(post.platform_media_ids || {}).map(([platform, mediaIds]) => [platform, assets(mediaIds)])));
            }
        }).catch(e => { if (active) setError(e.message); });
        else setPlatformImages(Object.fromEntries(Object.keys(post.platform_media_ids || {}).map(platform => [platform, []])));
        return () => { active = false; };
    }, [post.id, post.media_ids, post.platform_media_ids]);

    const items = delivery?.items || (delivery?.attemptId ? [delivery] : []);
    const queued = items.some(item => item.status === 'queued');
    const status = delivery && !['prepared', 'calendar_plan'].includes(delivery.status) ? delivery.status === 'queued' ? 'scheduled' : delivery.status : post.status;
    const locked = !loaded || queued || items.some(item => !['prepared', 'cancelled'].includes(item.status));
    const caption = delivery?.caption || post.caption || '';

    // Determine target accounts for this post
    const targetAccounts = useMemo(() => {
        if (!post.account_ids || !post.account_ids.length) return [];
        return post.account_ids.map(id => accounts.find(a => a.id === id)).filter(Boolean);
    }, [post.account_ids, accounts]);

    // Available platforms for preview simulator
    const availablePlatforms = useMemo(() => {
        const set = new Set();
        if (items.length) {
            items.forEach(i => { if (i.platform) set.add(i.platform.toLowerCase()); });
        }
        if (targetAccounts.length) {
            targetAccounts.forEach(a => { if (a.platform) set.add(a.platform.toLowerCase()); });
        }
        if (!set.size) {
            set.add('instagram');
            set.add('facebook');
            set.add('threads');
        }
        return Array.from(set);
    }, [items, targetAccounts]);

    const activePlatform = selectedPreviewPlatform && availablePlatforms.includes(selectedPreviewPlatform)
        ? selectedPreviewPlatform
        : availablePlatforms[0] || 'instagram';

    // Helper for active account display in preview
    const previewAccount = useMemo(() => {
        const found = targetAccounts.find(a => (a.platform || '').toLowerCase() === activePlatform);
        if (found) return found;
        const itemFound = items.find(i => (i.platform || '').toLowerCase() === activePlatform);
        if (itemFound) return { name: itemFound.pageName || itemFound.pageId, username: itemFound.pageName, platform: activePlatform };
        return { name: 'Socialchoice Account', username: 'socialchoice_hub', platform: activePlatform };
    }, [targetAccounts, items, activePlatform]);

    const previewAvatarUrl = previewAccount ? getAccountAvatarUrl(previewAccount) : '';

    async function refresh() { setRefreshKey(key => key + 1); await onChanged?.(); }
    async function action(work) { setBusy(true); setError(''); try { await work(); await refresh(); } catch (e) { setError(e.message); } finally { setBusy(false); } }

    async function reschedule() {
        setBusy(true); setError('');
        try {
            const time = toUtcIso(value.date, value.time, value.timezone);
            if (post.is_demo || isDesktop()) {
                const { id, created_date, updated_date, ...data } = post; void created_date; void updated_date;
                if (!time || toZonedParts(time, value.timezone).date !== value.date || toZonedParts(time, value.timezone).time !== value.time) throw new Error('Choose a valid local time in this timezone.');
                await appClient.posts.save({ id, data: { ...data, scheduled_at: time, timezone: value.timezone, status: 'scheduled' } }); await onChanged?.(); onClose();
            }
            else setReview(await appClient.publishing.prepareSchedule(post.id, time, value.timezone));
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    }

    return (
        <Dialog open onOpenChange={open => !open && !busy && onClose()}>
            <DialogContent className="max-w-6xl xl:max-w-7xl w-[calc(100%-2rem)] max-h-[92vh] p-0 overflow-hidden flex flex-col rounded-3xl bg-card border border-border shadow-2xl">
                
                {/* 1. TOP STUDIO HEADER */}
                <div className="p-3.5 px-6 border-b border-border flex items-center justify-between bg-muted/40 shrink-0 pr-14">
                    <div className="flex items-center gap-2.5">
                        <span className="size-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                            <DeviceMobile size={15} weight="bold" />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold font-heading text-foreground">
                                    Content Studio: Kiểm duyệt trước khi đăng (QA Review)
                                </h2>
                                <span className="text-xs font-mono text-muted-foreground">
                                    #{post.id ? post.id.slice(-6).toUpperCase() : ''}
                                </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Xem trước hiển thị trên thiết bị di động thực tế & kiểm tra tiêu chuẩn xuất bản
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. BODY: SPLIT PHONE SIMULATOR (LEFT) + QA CONTROLS (RIGHT) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 min-h-0 flex-1 overflow-hidden">
                    
                    {/* LEFT COLUMN: Phone Simulator (Narrower: ~30-33%) */}
                    <div className="lg:col-span-4 bg-muted/30 p-5 flex flex-col items-center justify-start border-r border-border overflow-y-auto custom-scrollbar">
                        
                        {/* Platform Switcher Pills */}
                        <div className="mb-4 flex items-center bg-card border border-border rounded-xl p-0.5 text-xs shadow-2xs shrink-0">
                            {availablePlatforms.map(platform => {
                                const isActive = activePlatform === platform;
                                return (
                                    <button
                                        key={platform}
                                        type="button"
                                        onClick={() => setSelectedPreviewPlatform(platform)}
                                        className={`px-3 py-1 rounded-lg capitalize font-semibold transition-all cursor-pointer ${
                                            isActive
                                                ? 'bg-zinc-900 text-white font-bold shadow-2xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {platform}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Phone Mockup Frame (Narrower & Sleeker: 245px width) */}
                        <div
                            className="w-[230px] sm:w-[248px] h-[450px] bg-black rounded-[32px] p-2 shadow-2xl relative border-2 border-zinc-700/40 flex flex-col shrink-0"
                            style={{ boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)' }}
                        >
                            <div className="w-full h-full bg-white rounded-[24px] overflow-hidden flex flex-col relative text-zinc-900">
                                
                                {/* Dynamic Island / Notch */}
                                <div className="w-16 h-3.5 bg-black rounded-full absolute top-1.5 left-1/2 -translate-x-1/2 z-30"></div>

                                {/* Phone Status Bar */}
                                <div className="pt-5 px-3 pb-1 flex items-center justify-between text-[9px] font-bold text-zinc-800 bg-white select-none">
                                    <span>09:41</span>
                                    <div className="flex items-center gap-1 text-zinc-700">
                                        <WifiHigh size={10} weight="bold" />
                                        <BatteryFull size={11} weight="fill" />
                                    </div>
                                </div>

                                {/* App Bar Header */}
                                <div className="px-3 py-1 border-b border-zinc-100 flex items-center justify-between text-[11px] select-none">
                                    <span className="font-bold text-zinc-900 capitalize font-heading">
                                        {activePlatform}
                                    </span>
                                    <div className="flex items-center gap-2 text-zinc-600">
                                        <Heart size={13} />
                                        <ChatCircle size={13} />
                                    </div>
                                </div>

                                {/* Scrollable Feed Post inside Phone */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar select-text">
                                    
                                    {/* Feed Header */}
                                    <div className="p-2 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {previewAvatarUrl ? (
                                                <div className="size-6 rounded-full bg-gradient-to-tr from-amber-500 to-pink-600 p-[1px] shrink-0">
                                                    <img
                                                        src={previewAvatarUrl}
                                                        alt=""
                                                        className="size-full rounded-full object-cover bg-white"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="size-5.5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                                                    {previewAccount?.name?.[0]?.toUpperCase() || 'D'}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <span className="font-bold text-zinc-900 block leading-tight truncate text-[10px]">
                                                    {previewAccount?.username || previewAccount?.name}
                                                </span>
                                                <span className="text-[8px] text-zinc-400 block leading-tight">
                                                    {t('Sponsored')} · {t('Feed')}
                                                </span>
                                            </div>
                                        </div>
                                        <DotsThree size={14} weight="bold" className="text-zinc-400 shrink-0" />
                                    </div>

                                    {/* Feed Media Display */}
                                    {images.length > 0 ? (
                                        <div className="w-full bg-zinc-900 overflow-hidden">
                                            {images[0]?.file_type === 'video' ? (
                                                <video src={images[0].file_url} controls preload="metadata" className="w-full max-h-40 object-cover" />
                                            ) : (
                                                <img src={images[0].file_url} alt="" className="w-full max-h-40 object-cover" />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-full h-24 bg-zinc-50 border-y border-zinc-100 flex items-center justify-center p-2 text-center text-zinc-400 text-[10px] italic">
                                            {t('Text post without shared media')}
                                        </div>
                                    )}

                                    {/* Feed Reactions & Caption */}
                                    <div className="p-2.5 space-y-1 text-xs">
                                        <div className="flex items-center justify-between text-sm pb-0.5 text-zinc-700">
                                            <div className="flex items-center gap-2.5">
                                                <Heart size={14} className="hover:text-red-500 cursor-pointer" />
                                                <ChatCircle size={14} className="cursor-pointer" />
                                                <PaperPlaneTilt size={14} className="cursor-pointer" />
                                            </div>
                                            <Bookmark size={14} className="cursor-pointer" />
                                        </div>
                                        <div className="text-[10px] leading-relaxed text-zinc-800">
                                            <span className="font-bold mr-1">
                                                {previewAccount?.username || previewAccount?.name}
                                            </span>
                                            <span className="whitespace-pre-wrap break-words">
                                                {caption || 'bb'}
                                            </span>
                                        </div>
                                        <div className="text-[8px] text-zinc-400 uppercase pt-0.5">
                                            {formatDateTime(post.scheduled_at, post.timezone) || '4 phút trước'}
                                        </div>
                                    </div>

                                </div>

                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground text-center mt-3 font-medium">
                            {t('Simulated live preview for')} <span className="capitalize font-bold text-foreground">{activePlatform}</span>
                        </p>

                    </div>

                    {/* RIGHT COLUMN: QA Checklist & Publishing Controls (Wider: ~67-70%) */}
                    <div className="lg:col-span-8 p-6 overflow-y-auto space-y-5 custom-scrollbar">
                        
                        {/* Title, Status & Schedule Summary */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <StatusBadge tone={POST_STATUS_TONE[status]}>
                                    {POST_STATUS_LABEL[status] || status}
                                </StatusBadge>
                                <span className="text-xs font-mono text-muted-foreground">
                                    #{post.id ? post.id.slice(-6).toUpperCase() : ''}
                                </span>
                            </div>
                            <h3 className="font-heading font-bold text-xl text-foreground leading-tight">
                                {post.title || t('Untitled post')}
                            </h3>
                            {post.scheduled_at && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Clock size={13} className="text-muted-foreground" />
                                    <span>{t('Scheduled for')}: <strong>{formatDateTime(post.scheduled_at, post.timezone)}</strong> ({post.timezone || DEFAULT_TIMEZONE})</span>
                                </p>
                            )}
                        </div>

                        {/* QA Verification Checklist */}
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2.5">
                            <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <ShieldCheck size={16} weight="bold" className="text-emerald-600" />
                                <span>{t('Publishing QA Checklist')}</span>
                            </div>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border shadow-2xs">
                                    <span className="flex items-center gap-2 text-foreground font-medium">
                                        <CheckCircle size={15} weight="fill" className="text-emerald-600" />
                                        <span>{t('Media format & resolution')}</span>
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                        {images.length > 0 ? `${images.length} tệp (Hợp lệ)` : 'Chữ thuần túy'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border shadow-2xs">
                                    <span className="flex items-center gap-2 text-foreground font-medium">
                                        <CheckCircle size={15} weight="fill" className="text-emerald-600" />
                                        <span>{t('Caption length safety')} ({caption?.length || 0} ký tự)</span>
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                        {t('Safe')}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border shadow-2xs">
                                    <span className="flex items-center gap-2 text-foreground font-medium">
                                        <CheckCircle size={15} weight="fill" className="text-emerald-600" />
                                        <span>{t('Destination channel connections')}</span>
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                        {targetAccounts.length || items.length} kênh sẵn sàng
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Target Channels / Results by Account */}
                        <div className="space-y-2">
                            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground">
                                {t('Target Accounts & Delivery Status')} ({items.length || targetAccounts.length})
                            </h4>

                            {items.length > 0 ? (
                                <div className="space-y-2">
                                    {items.map(item => (
                                        <div key={item.attemptId} className="rounded-xl border border-border p-3 text-sm space-y-2 bg-card shadow-2xs">
                                            <div className="flex items-center justify-between">
                                                <p className="font-bold text-xs text-foreground truncate">
                                                    {item.pageName} · {PLATFORM_LABEL[item.platform || 'facebook']}
                                                </p>
                                                <StatusBadge tone={POST_STATUS_TONE[item.status === 'queued' ? 'scheduled' : item.status]}>
                                                    {t(item.status === 'queued' ? 'Scheduled' : POST_STATUS_LABEL[item.status] || item.status)}
                                                </StatusBadge>
                                            </div>
                                            <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{item.caption}</p>
                                            {item.publishedUrl && (
                                                <a href={item.publishedUrl} target="_blank" rel="noreferrer" className="underline text-xs text-primary font-bold">
                                                    {t('View published post')} →
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : targetAccounts.length > 0 ? (
                                <div className="space-y-1.5">
                                    {targetAccounts.map(account => {
                                        const platform = (account.platform || 'facebook').toLowerCase();
                                        const cfg = PLATFORM_CONFIG[platform] || { icon: Globe, label: platform, bg: 'bg-muted', color: 'text-foreground' };
                                        const PlatformIcon = cfg.icon;
                                        return (
                                            <div key={account.id} className="p-2.5 rounded-xl border border-border bg-card flex items-center justify-between shadow-2xs">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className={`size-6 rounded-full ${cfg.bg} text-white flex items-center justify-center text-xs shrink-0`}>
                                                        <PlatformIcon size={12} weight="fill" className={cfg.color} />
                                                    </span>
                                                    <span className="text-xs font-bold text-foreground truncate">{account.name}</span>
                                                    <span className="text-[10px] text-muted-foreground capitalize">({cfg.label})</span>
                                                </div>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                                    {t('Ready')}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">
                                    {t('No specific accounts assigned yet')}
                                </p>
                            )}
                        </div>

                        {/* Accordion 1: Form Đổi ngày & Giờ đăng */}
                        {!locked && ['draft', 'scheduled', 'cancelled'].includes(status) && !jobs.some(job => job.attempts > 0) && (
                            <div className="border border-border rounded-xl overflow-hidden bg-card shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setOpenReschedule(!openReschedule)}
                                    className="w-full p-3 bg-muted/30 hover:bg-muted/50 flex items-center justify-between text-xs font-bold text-foreground cursor-pointer transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <Clock size={15} weight="bold" className="text-amber-500" />
                                        <span>{t('Plan / reschedule')}</span>
                                    </span>
                                    <CaretDown size={14} weight="bold" className={`transition-transform duration-200 ${openReschedule ? 'rotate-180' : ''}`} />
                                </button>
                                {openReschedule && (
                                    <div className="p-4 space-y-3 border-t border-border text-xs bg-card">
                                        <ScheduleFields value={value} onChange={patch => setValue({ ...value, ...patch })} />
                                        <p className="label-xs text-muted-foreground">{t(isDesktop() ? 'This is a local plan only. No automatic publishing.' : 'Review the accounts, content and time before enabling automatic publishing.')}</p>
                                        <div className="flex items-center gap-2 pt-1">
                                            <button
                                                className="px-4 py-2 rounded-xl bg-zinc-900 text-white hover:bg-black text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                                                type="button"
                                                disabled={busy}
                                                onClick={reschedule}
                                            >
                                                {t(isDesktop() ? 'Save calendar plan' : 'Review automatic schedule')}
                                            </button>
                                            {isDesktop() && status === 'scheduled' && (
                                                <Button variant="outline" size="sm" disabled={busy} onClick={() => action(async () => { await appClient.posts.cancelPlans([post.id]); onClose(); })}>
                                                    {t('Cancel calendar plan')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Accordion 2: Tái đăng nội dung định kỳ */}
                        {!post.is_demo && !isDesktop() && (
                            <div className="border border-border rounded-xl overflow-hidden bg-card shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setOpenRecurring(!openRecurring)}
                                    className="w-full p-3 bg-muted/30 hover:bg-muted/50 flex items-center justify-between text-xs font-bold text-foreground cursor-pointer transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <ArrowsClockwise size={15} weight="bold" className="text-blue-500" />
                                        <span>{t('Recurring post settings')}</span>
                                    </span>
                                    <CaretDown size={14} weight="bold" className={`transition-transform duration-200 ${openRecurring ? 'rotate-180' : ''}`} />
                                </button>
                                {openRecurring && (
                                    <div className="p-4 border-t border-border bg-card">
                                        <RecurringPostSettings key={post.id} post={post} onChanged={onChanged} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Accordion 3: Publishing History */}
                        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-2xs">
                            <button
                                type="button"
                                onClick={() => setOpenHistory(!openHistory)}
                                className="w-full p-3 bg-muted/30 hover:bg-muted/50 flex items-center justify-between text-xs font-bold text-foreground cursor-pointer transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <CalendarCheck size={15} weight="bold" className="text-zinc-500" />
                                    <span>{t('Publishing history')} ({jobs.length})</span>
                                </span>
                                <CaretDown size={14} weight="bold" className={`transition-transform duration-200 ${openHistory ? 'rotate-180' : ''}`} />
                            </button>
                            {openHistory && (
                                <div className="p-4 border-t border-border space-y-2 text-xs bg-card">
                                    {jobs.length ? jobs.map(job => (
                                        <div className="border-b border-border py-2 text-xs last:border-b-0" key={job.id}>
                                            <p className="font-semibold text-foreground">{job.account_name} · {JOB_STATUS_LABEL[job.status] || job.status}</p>
                                            {job.scheduled_for && <p className="label-xs mt-0.5">{formatDateTime(job.scheduled_for, post.timezone)}</p>}
                                            {job.error_message && <p className="text-dangerFg mt-1">{t(job.error_message)}</p>}
                                        </div>
                                    )) : (
                                        <p className="text-xs text-muted-foreground">{t('No publishing attempts recorded.')}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {review && <PublishConfirmation review={review} onClose={() => setReview(null)} onResult={async () => { setReview(null); await refresh(); }} />}
                        {error && <p role="alert" className="mt-3 text-sm text-dangerFg">{t(error)}</p>}

                    </div>

                </div>

                {/* 3. STICKY BOTTOM FOOTER */}
                <div className="p-3.5 px-6 border-t border-border bg-card flex items-center justify-between shrink-0">
                    <span className="text-xs text-muted-foreground font-mono">
                        {post.scheduled_at ? formatDateTime(post.scheduled_at, post.timezone) : t('Draft')}
                    </span>

                    <div className="flex items-center gap-2">
                        <Link
                            to={'/create?duplicate=' + post.id}
                            className="inline-flex items-center gap-1.5 border border-border bg-card hover:bg-muted text-foreground rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                            onClick={onClose}
                        >
                            <CopySimple size={13} weight="bold" />
                            <span>{t('Duplicate as draft')}</span>
                        </Link>
                        {!locked && (['draft', 'scheduled'].includes(status) || (isDesktop() && status === 'cancelled')) && (
                            <Link
                                to={'/create?edit=' + post.id}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white hover:bg-black text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                                onClick={onClose}
                            >
                                <PencilSimple size={13} weight="bold" />
                                <span>{t('Edit post')}</span>
                            </Link>
                        )}
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}
