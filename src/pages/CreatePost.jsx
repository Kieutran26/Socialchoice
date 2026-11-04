import SaveTemplateDialog from '@/components/composer/save-template-dialog';
import TiktokSettings from '@/components/composer/TiktokSettings';
import PublishConfirmation from '@/components/posts/PublishConfirmation';
import CommentChainEditor from '@/components/composer/CommentChainEditor';
import LinkedinMentionBar from '@/components/composer/LinkedinMentionBar';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    FloppyDisk,
    PaperPlaneTilt,
    Trash,
    Copy,
    CalendarBlank,
    Sparkle,
    LinkSimple,
    ImageSquare,
    Palette,
    PenNib,
    Smiley,
    TextB,
    TextUnderline,
    Warning,
    Gear,
    CaretDown,
    CaretUp,
    Tag,
    Repeat,
    X,
    Plus,
    Check,
    Globe,
    CheckCircle,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import PlatformMedia from '@/components/composer/platform-media';
import PostPreview from '@/components/composer/PostPreview';
import PageSettings from '@/components/composer/PageSettings';
import UtmLinkBuilder from '@/components/composer/utm-link-builder';
import PlatformCaptions from '@/components/composer/PlatformCaptions';
import DestinationChecks from '@/components/composer/DestinationChecks';
import { PUBLISHING_PLATFORMS, destinationIssues, resolveMedia, referencedMediaIds, CAPTION_LIMITS } from '@/lib/publishing-content';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LinkedinMentionTextarea as Textarea } from '@/components/composer/linkedin-mention-textarea';
import DesktopAiWriter from '@/components/composer/desktop-ai-writer';
import { applyAiSuggestion, applyAiPlatformSuggestion } from '@/lib/ai-draft';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import PlatformLogo from '@/components/composer/PlatformLogo';
import SignatureSelector from '@/components/composer/SignatureSelector';
import { aiRequest } from '@/api/ai';
import { getShortlinkPreference } from '@/components/settings/ShortlinkSettingsCard';

import { toUtcIso, toZonedParts, localInputDefault } from '@/lib/tz';
import { DEFAULT_TIMEZONE, PLATFORM_LABEL, TIMEZONES } from '@/lib/constants';

const serializeCommentForApi = (item = {}) => {
    const mediaIds = Array.isArray(item.media)
        ? item.media.map((asset) => asset.id)
        : Array.isArray(item.media_ids)
            ? [...item.media_ids]
            : [];
    const delayMinutes = Number.isInteger(item.delay_minutes) ? item.delay_minutes : 0;
    return {
        ...(item.id ? { id: item.id } : {}),
        message: item.message || '',
        ...(mediaIds.length ? { media_ids: mediaIds } : {}),
        ...(delayMinutes > 0 ? { delay_minutes: delayMinutes } : {}),
        ...(item.actor_account_id ? { actor_account_id: item.actor_account_id } : {}),
    };
};

const hydrateCommentFromApi = (item = {}, mediaItems = []) => ({
    ...(item.id ? { id: item.id } : {}),
    message: item.message || '',
    delay_minutes: Number.isInteger(item.delay_minutes) ? item.delay_minutes : 0,
    media: (item.media_ids || [])
        .map((id) => mediaItems.find((asset) => asset.id === id))
        .filter(Boolean),
    ...(item.actor_account_id ? { actor_account_id: item.actor_account_id } : {}),
});

const emptyForm = (brandId) => ({
    brand_id: brandId || '',
    title: '',
    caption: '',
    platform_captions: {},
    account_ids: [],
    pillar_id: '',
    angle_id: '',
    date: '',
    time: '',
    timezone: DEFAULT_TIMEZONE,
    status: 'draft',
    media: [],
    platform_media: {},
    destination_settings: {},
    comments: [],
});

function formatScheduleTime(date, time) {
    if (!date || !time) return 'Select date & time';
    try {
        const [y, m, d] = date.split('-');
        let [hours, mins] = time.split(':');
        let h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        const hStr = h < 10 ? `0${h}` : `${h}`;
        return `${m}/${d}/${y} ${hStr}:${mins} ${ampm}`;
    } catch {
        return `${date} ${time}`;
    }
}

const EMOJI_LIST = ['🔥', '🚀', '💡', '✨', '🌟', '🎉', '💯', '❤️', '👍', '👏', '👉', '👇', '📌', '🎯', '🛒', '📞', '🌐', '💬', '✉️', '🔔', '😊', '😎', '🤔', '🥳', '🙌', '🤝', '⚡', '🏆', '💎', '📈'];

export default function CreatePost() {
    const desktop = isDesktop();
    const { t } = useTranslation();
    const { brands, demoMode, selectedBrandId } = useWorkspace();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const editId = params.get('edit');
    const duplicateId = params.get('duplicate');
    const sourceId = editId || duplicateId;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [tiktokCreators, setTiktokCreators] = useState({});
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [existing, setExisting] = useState(null);
    const [form, setForm] = useState(emptyForm(selectedBrandId === 'all' ? '' : selectedBrandId));
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [publishReview, setPublishReview] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [sourceLoading, setSourceLoading] = useState(!!sourceId);
    const [aiOpen, setAiOpen] = useState(false);
    const [aiConfig, setAiConfig] = useState(null);
    const [shortlinkPref, setShortlinkPref] = useState(getShortlinkPreference);
    const [previewPlatform, setPreviewPlatform] = useState('threads');
    const [shortlinkDismissed, setShortlinkDismissed] = useState(false);

    // Modern Postiz-style UI states
    const [activeChannelTab, setActiveChannelTab] = useState('all'); // 'all' or account.id
    const [showComments, setShowComments] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [showPreview, setShowPreview] = useState(true);
    const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
    const [repeatDropdownOpen, setRepeatDropdownOpen] = useState(false);
    const [repeatFrequency, setRepeatFrequency] = useState('none');
    const [schedulePickerOpen, setSchedulePickerOpen] = useState(false);
    const [publishDropdownOpen, setPublishDropdownOpen] = useState(false);
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
    const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
    const [brandMediaAssets, setBrandMediaAssets] = useState([]);

    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const schedulePickerRef = useRef(null);
    const publishDropdownRef = useRef(null);
    const tagDropdownRef = useRef(null);
    const repeatDropdownRef = useRef(null);
    const emojiPickerRef = useRef(null);

    // Sync shortlink preference from localStorage
    useEffect(() => {
        const handleSync = () => setShortlinkPref(getShortlinkPreference());
        window.addEventListener('storage', handleSync);
        return () => window.removeEventListener('storage', handleSync);
    }, []);

    // Close click-outside dropdowns
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (schedulePickerRef.current && !schedulePickerRef.current.contains(e.target)) {
                setSchedulePickerOpen(false);
            }
            if (publishDropdownRef.current && !publishDropdownRef.current.contains(e.target)) {
                setPublishDropdownOpen(false);
            }
            if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target)) {
                setTagDropdownOpen(false);
            }
            if (repeatDropdownRef.current && !repeatDropdownRef.current.contains(e.target)) {
                setRepeatDropdownOpen(false);
            }
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
                setEmojiPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-shorten links in caption if preference is 'always'
    useEffect(() => {
        if (shortlinkPref !== 'always' || !form.brand_id || !form.caption) return;
        if (!/https?:\/\/[^\s]+/i.test(form.caption) || /(?:\/api\/links\/go\/|\/s\/[a-zA-Z0-9_-]+)/i.test(form.caption)) return;

        const timer = setTimeout(async () => {
            try {
                const res = await appClient.links.build({
                    brand_id: form.brand_id,
                    form,
                    options: { medium: 'social', campaign: form.title || 'post', tracking: true, short: true },
                });
                if (res?.caption && res.caption !== form.caption) {
                    setForm((curr) => ({
                        ...curr,
                        caption: res.caption,
                        platform_captions: res.platform_captions || curr.platform_captions,
                    }));
                    toast({
                        title: t('Đã tự động rút gọn liên kết!'),
                        description: t('Đã chuyển đổi sang Shortlink theo cài đặt "Always shorten".'),
                    });
                }
            } catch (err) {
                console.warn('Auto-shorten debounce warning:', err);
            }
        }, 1200);

        return () => clearTimeout(timer);
    }, [form.caption, form.brand_id, form.title, shortlinkPref, t, toast]);

    // Load initial accounts, pillars, angles
    useEffect(() => {
        let active = true;
        setLoading(true);
        Promise.all([
            appClient.entities.SocialAccount.filter({ is_demo: demoMode }, { sort: 'name', limit: 1000 }),
            appClient.entities.ContentPillar.filter({ is_demo: demoMode }, { sort: 'name', limit: 1000 }),
            appClient.entities.ContentAngle.filter({ is_demo: demoMode }, { sort: 'name', limit: 1000 }),
            aiRequest('status').catch(() => null),
        ])
            .then(([accountsPage, pillarsPage, anglesPage, config]) => {
                if (!active) return;
                setAccounts(accountsPage.items || []);
                setPillars(pillarsPage.items || []);
                setAngles(anglesPage.items || []);
                setAiConfig(config);
            })
            .catch((error) => {
                if (active) setLoadError(error.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [demoMode]);

    // Load source post if editing or duplicating
    useEffect(() => {
        if (!sourceId) return;
        let active = true;
        setSourceLoading(true);
        appClient.entities.Post.get(sourceId)
            .then(async (post) => {
                if (!active) return;
                const mediaItems = post.media_ids?.length
                    ? (await appClient.entities.MediaAsset.filter({ is_demo: demoMode }, { limit: 1000 })).items.filter((item) => post.media_ids.includes(item.id))
                    : [];
                const platformMedia = {};
                for (const [platform, ids] of Object.entries(post.platform_media_ids || {})) {
                    platformMedia[platform] = (await appClient.entities.MediaAsset.filter({ is_demo: demoMode }, { limit: 1000 })).items.filter((item) => ids.includes(item.id));
                }

                const brandTimezone = brands.find((brand) => brand.id === post.brand_id)?.timezone || DEFAULT_TIMEZONE;
                const parts = toZonedParts(post.scheduled_at, brandTimezone);
                const isDupe = !!duplicateId;

                setExisting(isDupe ? null : post);
                setForm({
                    brand_id: post.brand_id,
                    title: isDupe ? `${post.title} (Copy)` : post.title,
                    caption: post.caption,
                    platform_captions: post.platform_captions || {},
                    account_ids: post.account_ids || [],
                    pillar_id: post.pillar_id || '',
                    angle_id: post.angle_id || '',
                    date: parts.date,
                    time: parts.time,
                    timezone: post.timezone || brandTimezone,
                    status: isDupe ? 'draft' : post.status,
                    media: mediaItems,
                    platform_media: platformMedia,
                    destination_settings: Object.fromEntries(
                        Object.entries(post.destination_settings || {}).map(([id, setting]) => {
                            const settingParts = toZonedParts(setting.scheduled_at, post.timezone || brandTimezone);
                            return [
                                id,
                                {
                                    tiktok: setting.tiktok,
                                    caption: setting.caption || '',
                                    localTime: setting.scheduled_at ? settingParts.date + 'T' + settingParts.time : '',
                                    ...(Object.hasOwn(setting, 'media_ids')
                                        ? {
                                            media: (setting.media_ids || [])
                                                .map((assetId) => mediaItems.find((item) => item.id === assetId))
                                                .filter(Boolean),
                                        }
                                        : {}),
                                },
                            ];
                        })
                    ),
                    comments: (post.comments || []).map((c) => hydrateCommentFromApi(c, mediaItems)),
                });
            })
            .catch((error) => {
                if (active) setLoadError(error.message);
            })
            .finally(() => {
                if (active) setSourceLoading(false);
            });
        return () => {
            active = false;
        };
    }, [sourceId, duplicateId, demoMode, brands]);

    // Active brand selection
    useEffect(() => {
        if (form.brand_id) return;
        const fallback = selectedBrandId !== 'all' ? selectedBrandId : brands[0]?.id;
        if (!fallback) return;
        const brand = brands.find((b) => b.id === fallback);
        const preset = localInputDefault(brand?.timezone || DEFAULT_TIMEZONE);
        setForm((prev) => ({
            ...prev,
            brand_id: fallback,
            timezone: brand?.timezone || DEFAULT_TIMEZONE,
            date: prev.date || preset.date,
            time: prev.time || preset.time,
        }));
    }, [brands, selectedBrandId, form.brand_id]);

    const activeBrandName = useMemo(() => {
        return brands.find((b) => b.id === form.brand_id)?.name || 'Socialchoice';
    }, [brands, form.brand_id]);

    const brandAccounts = useMemo(() => {
        return accounts.filter((account) => !account.brand_id || account.brand_id === form.brand_id);
    }, [accounts, form.brand_id]);

    const personalAccounts = useMemo(() => {
        const list = brandAccounts.filter((acc) => ['threads', 'x', 'instagram'].includes(acc.platform) || (!acc.is_page && !acc.is_business && acc.platform === 'facebook'));
        return list.length > 0 ? list : brandAccounts.slice(0, Math.ceil(brandAccounts.length / 2));
    }, [brandAccounts]);

    const businessAccounts = useMemo(() => {
        const list = brandAccounts.filter((acc) => ['linkedin', 'tiktok'].includes(acc.platform) || acc.is_page || acc.is_business || (acc.platform === 'facebook' && (acc.is_page || acc.is_business)));
        return list.length > 0 ? list : brandAccounts.slice(Math.ceil(brandAccounts.length / 2));
    }, [brandAccounts]);

    const selectedAccounts = useMemo(() => {
        return accounts.filter((account) => form.account_ids.includes(account.id));
    }, [accounts, form.account_ids]);

    const brandPillars = useMemo(() => {
        return pillars.filter((pillar) => pillar.brand_id === form.brand_id && pillar.status === 'active');
    }, [pillars, form.brand_id]);

    const brandAngles = useMemo(() => {
        return angles.filter((angle) => angle.pillar_id === form.pillar_id && angle.status === 'active');
    }, [angles, form.pillar_id]);

    const platforms = useMemo(() => {
        return Array.from(new Set(selectedAccounts.map((account) => account.platform)));
    }, [selectedAccounts]);

    const linkedinAccounts = useMemo(() => {
        return selectedAccounts.filter((account) => account.platform === 'linkedin');
    }, [selectedAccounts]);

    // Current platform context & limits
    const currentActivePlatform = useMemo(() => {
        if (activeChannelTab === 'all') {
            const first = selectedAccounts[0];
            return first ? first.platform : 'facebook';
        }
        const acc = accounts.find((a) => a.id === activeChannelTab);
        return acc ? acc.platform : 'facebook';
    }, [activeChannelTab, selectedAccounts, accounts]);

    const prePublishChecks = useMemo(() => {
        const hasAccount = selectedAccounts.length > 0;
        const hasContent = !!(form.caption && form.caption.trim().length > 0);
        const withinLimit = (currentActiveCaption?.length || 0) <= (CAPTION_LIMITS[currentActivePlatform] || 63206);
        const validSchedule = !form.date || !form.time || true;
        const activeAccounts = selectedAccounts.length > 0 && selectedAccounts.every((a) => a.status !== 'disconnected');

        return [
            { id: 'account', label: t('Chọn ít nhất một kênh đăng bài'), passed: hasAccount },
            { id: 'content', label: t('Nội dung không để trống'), passed: hasContent },
            { id: 'limit', label: t('Không vượt quá giới hạn ký tự'), passed: withinLimit },
            { id: 'schedule', label: t('Thời gian đăng hợp lệ'), passed: validSchedule },
            { id: 'connected', label: t('Tài khoản kết nối hoạt động'), passed: activeAccounts },
        ];
    }, [selectedAccounts, form.caption, form.date, form.time, currentActiveCaption, currentActivePlatform, t]);

    const passedChecksCount = prePublishChecks.filter((c) => c.passed).length;

    const currentActiveCaption = useMemo(() => {
        if (activeChannelTab === 'all') return form.caption;
        return form.destination_settings[activeChannelTab]?.caption ?? form.caption;
    }, [activeChannelTab, form.caption, form.destination_settings]);

    const maxLimit = CAPTION_LIMITS[currentActivePlatform] || 63206;
    const currentCount = (currentActiveCaption || '').length;

    // Toggle account selection
    const toggleAccount = (account) => {
        setForm((current) => {
            const exists = current.account_ids.includes(account.id);
            const next = exists
                ? current.account_ids.filter((id) => id !== account.id)
                : [...current.account_ids, account.id];
            return { ...current, account_ids: next };
        });
    };

    // Apply caption change for active tab
    const handleActiveCaptionChange = (val) => {
        if (activeChannelTab === 'all') {
            setForm((curr) => ({ ...curr, caption: val }));
        } else {
            setForm((curr) => ({
                ...curr,
                destination_settings: {
                    ...curr.destination_settings,
                    [activeChannelTab]: {
                        ...(curr.destination_settings[activeChannelTab] || {}),
                        caption: val,
                    },
                },
            }));
        }
    };

    // Upload files directly from toolbar
    const handleDirectUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length || !form.brand_id) return;
        setUploading(true);
        const added = [...form.media];
        try {
            for (const file of files) {
                if (file.type === 'video/mp4' || /\.mp4$/i.test(file.name)) {
                    if (file.size > 100 * 1024 * 1024) throw new Error('Video MP4 tối đa 100MB');
                    const asset = await appClient.media.uploadVideo(file, form.brand_id, () => { });
                    added.push(asset);
                } else {
                    if (file.size > 5 * 1024 * 1024) throw new Error('Ảnh tối đa 5MB');
                    const asset = await appClient.media.upload(file, form.brand_id, () => { });
                    added.push(asset);
                }
            }
            setForm((curr) => ({ ...curr, media: added }));
            toast({ title: t('Tải lên tệp thành công!') });
        } catch (err) {
            toast({ variant: 'destructive', title: t('Lỗi tải tệp'), description: err.message });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveMedia = (index) => {
        setForm((curr) => ({
            ...curr,
            media: curr.media.filter((_, i) => i !== index),
        }));
    };

    // Text formatting helpers
    const formatSelection = (prefix, suffix) => {
        const el = textareaRef.current;
        const current = currentActiveCaption || '';
        if (!el) {
            handleActiveCaptionChange(`${current} ${prefix}văn bản${suffix}`);
            return;
        }
        const start = el.selectionStart ?? current.length;
        const end = el.selectionEnd ?? current.length;
        const selected = current.slice(start, end) || 'văn bản';
        const next = current.slice(0, start) + prefix + selected + suffix + current.slice(end);
        handleActiveCaptionChange(next);
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
        }, 50);
    };

    const insertEmoji = (emoji) => {
        const current = currentActiveCaption || '';
        const el = textareaRef.current;
        if (!el) {
            handleActiveCaptionChange(`${current} ${emoji} `);
            return;
        }
        const start = el.selectionStart ?? current.length;
        const next = current.slice(0, start) + emoji + current.slice(start);
        handleActiveCaptionChange(next);
        setEmojiPickerOpen(false);
    };

    // Validation logic
    const validate = (action) => {
        if (!form.brand_id) return t('Choose a brand');
        if (!form.title.trim()) return t('Enter a post title');
        if (form.title.length > 200) return t('Title must be 200 characters or fewer');
        if (!form.account_ids.length) return t('Choose at least one publishing account');

        const scheduledAt = toUtcIso(form.date, form.time, form.timezone);
        if (action === 'schedule') {
            if (!scheduledAt) return t('Choose a valid publishing time');
            if (Date.parse(scheduledAt) < Date.now() + 60000) return t('Choose a publishing time at least one minute in the future');
        }

        const issues = destinationIssues(form, selectedAccounts);
        if (issues.length) return issues[0];
        return null;
    };

    // Submit handler
    const submit = async (action) => {
        const error = validate(action);
        if (error) {
            toast({ variant: 'destructive', title: t('Cannot save yet'), description: error });
            return;
        }
        setSaving(true);
        try {
            let effectiveCaption = form.caption;
            let effectivePlatformCaptions = form.platform_captions;

            // Auto-shorten links on submit if 'always' preference
            if (shortlinkPref === 'always' && /https?:\/\/[^\s]+/i.test(effectiveCaption) && !/(?:\/api\/links\/go\/|\/s\/[a-zA-Z0-9_-]+)/i.test(effectiveCaption) && form.brand_id) {
                try {
                    const linkRes = await appClient.links.build({
                        brand_id: form.brand_id,
                        form,
                        options: { medium: 'social', campaign: form.title || 'post', tracking: true, short: true },
                    });
                    if (linkRes?.caption) {
                        effectiveCaption = linkRes.caption;
                        effectivePlatformCaptions = linkRes.platform_captions || effectivePlatformCaptions;
                        setForm((curr) => ({ ...curr, caption: effectiveCaption, platform_captions: effectivePlatformCaptions }));
                    }
                } catch (linkErr) {
                    console.warn('Auto-shorten on submit warning:', linkErr);
                }
            }

            const payload = {
                brand_id: form.brand_id,
                title: form.title.trim(),
                caption: effectiveCaption,
                platform_captions: Object.fromEntries(Object.entries(effectivePlatformCaptions).filter(([, caption]) => caption.trim())),
                destination_settings: Object.fromEntries(
                    form.account_ids.map((id) => {
                        const setting = form.destination_settings[id] || {};
                        const [date, time] = setting.localTime?.split('T') || [];
                        return [
                            id,
                            {
                                ...(setting.tiktok ? { tiktok: setting.tiktok } : {}),
                                ...(setting.caption?.trim() ? { caption: setting.caption } : {}),
                                ...(date && time ? { scheduled_at: toUtcIso(date, time, form.timezone) } : {}),
                                ...(Object.hasOwn(setting, 'media')
                                    ? { media_ids: (setting.media || []).map((asset) => asset.id) }
                                    : {}),
                            },
                        ];
                    })
                ),
                media_ids: form.media.map((asset) => asset.id),
                platform_media_ids: Object.fromEntries(
                    Object.entries(form.platform_media || {}).map(([platform, items]) => [
                        platform,
                        (items || []).map((asset) => asset.id),
                    ])
                ),
                account_ids: form.account_ids,
                pillar_id: form.pillar_id,
                angle_id: form.angle_id,
                timezone: form.timezone,
                status: action === 'draft' ? 'draft' : 'scheduled',
                scheduled_at: action === 'draft' ? null : toUtcIso(form.date, form.time, form.timezone),
                is_demo: demoMode,
                comments: (form.comments || []).map(serializeCommentForApi),
            };

            const saved = await appClient.posts.save({
                id: existing?.id,
                data: payload,
            });

            if (action === 'publish' && !demoMode) {
                const review = await appClient.publishing.prepare(saved.id);
                setPublishReview(review);
                return;
            }

            if (action === 'schedule' && !demoMode) {
                try {
                    const review = await appClient.publishing.prepareSchedule(
                        saved.id,
                        toUtcIso(form.date, form.time, form.timezone),
                        form.timezone
                    );
                    if (review?.attemptId) {
                        await appClient.publishing.schedule(review.attemptId);
                    }
                } catch (scheduleError) {
                    console.warn('Queue review error:', scheduleError);
                }
            }

            toast({
                title: action === 'draft' ? t('Đã lưu bản nháp thành công!') : t('Đã lên lịch bài đăng thành công!'),
                description: t('Bài viết đã được đồng bộ vào hệ thống Socialchoice.'),
            });

            navigate('/posts');
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('Save failed'),
                description: error.message,
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading || sourceLoading) {
        return (
            <div className="min-h-[500px] flex items-center justify-center p-8 bg-[#121215] rounded-3xl border border-neutral-800">
                <div className="text-center space-y-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent mx-auto" />
                    <p className="text-xs text-neutral-400 font-medium">{t('Đang tải trình soạn thảo bài viết…')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="composer-shell w-full pb-16 space-y-6">
            {/* Top Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-slate-900">
                        {existing ? t('Edit post') : t('Tạo bài viết')}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {t('Soạn thảo một lần, chọn nền tảng, lên lịch — tất cả trong một chế độ xem.')}
                    </p>
                </div>
                {!showPreview && (
                    <button
                        type="button"
                        onClick={() => setShowPreview(true)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                    >
                        {t('Hiện xem trước')}
                    </button>
                )}
            </div>

            {/* Split Screen 2-Column Grid */}
            <div className="composer-columns grid gap-6 items-start">
                
                {/* LEFT COLUMN: Composer */}
                <div className="space-y-4 min-w-0">
                    
                    {/* CARD 1: TÀI KHOẢN NHẬN BÀI */}
                    <div className="panel p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                                    {t('TÀI KHOẢN NHẬN BÀI')}
                                </span>
                                <span className="text-xs text-slate-400 font-medium">
                                    {brandAccounts.length} {t('tài khoản')}
                                </span>
                            </div>
                            <span className="text-xs font-medium text-slate-500">
                                {selectedAccounts.length} {t('đã chọn')}
                            </span>
                        </div>

                        {/* Group 1: TRANG CÁ NHÂN */}
                        <div className="space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                {t('TRANG CÁ NHÂN')}
                            </span>
                            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
                                {/* Globe all channels toggle icon */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectedAccounts.length === brandAccounts.length) {
                                            setForm((curr) => ({ ...curr, account_ids: [] }));
                                        } else {
                                            setForm((curr) => ({ ...curr, account_ids: brandAccounts.map((a) => a.id) }));
                                        }
                                    }}
                                    className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all cursor-pointer ${
                                        selectedAccounts.length === brandAccounts.length && brandAccounts.length > 0
                                            ? 'border-2 border-[#ffd631] bg-[#ffd631]/20 text-[#2b2100] shadow-xs'
                                            : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                    title={t('Chọn tất cả tài khoản')}
                                >
                                    <Globe size={18} weight="bold" />
                                </button>

                                {personalAccounts.map((account) => {
                                    const isSelected = form.account_ids.includes(account.id);
                                    return (
                                        <button
                                            key={account.id}
                                            type="button"
                                            onClick={() => toggleAccount(account)}
                                            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'ring-2 ring-[#ffd631] ring-offset-2 ring-offset-white opacity-100 scale-105 shadow-xs'
                                                    : 'opacity-40 hover:opacity-80 border border-slate-200 bg-slate-100'
                                            }`}
                                            title={`${account.name} (${PLATFORM_LABEL[account.platform]})`}
                                        >
                                            {account.avatar_url ? (
                                                <img
                                                    src={account.avatar_url}
                                                    alt={account.name}
                                                    className="h-full w-full rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white uppercase">
                                                    {account.name.slice(0, 2)}
                                                </div>
                                            )}
                                            <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5 shadow-xs border border-slate-200/60">
                                                <PlatformLogo platform={account.platform} size={13} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Group 2: TRANG DOANH NGHIỆP */}
                        {businessAccounts.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                    {t('TRANG DOANH NGHIỆP')}
                                </span>
                                <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
                                    {businessAccounts.map((account) => {
                                        const isSelected = form.account_ids.includes(account.id);
                                        return (
                                            <button
                                                key={account.id}
                                                type="button"
                                                onClick={() => toggleAccount(account)}
                                                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'ring-2 ring-[#ffd631] ring-offset-2 ring-offset-white opacity-100 scale-105 shadow-xs'
                                                        : 'opacity-40 hover:opacity-80 border border-slate-200 bg-slate-100'
                                                }`}
                                                title={`${account.name} (${PLATFORM_LABEL[account.platform]})`}
                                            >
                                                {account.avatar_url ? (
                                                    <img
                                                        src={account.avatar_url}
                                                        alt={account.name}
                                                        className="h-full w-full rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white uppercase">
                                                        {account.name.slice(0, 2)}
                                                    </div>
                                                )}
                                                <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5 shadow-xs border border-slate-200/60">
                                                    <PlatformLogo platform={account.platform} size={13} />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CARD 2: NỘI DUNG DÙNG CHUNG (ALL CHANNELS) */}
                    <div className="panel p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                                {activeChannelTab === 'all'
                                    ? t('NỘI DUNG DÙNG CHUNG (ALL CHANNELS)')
                                    : t('TÙY CHỈNH RIÊNG CHO {account}', { account: accounts.find((a) => a.id === activeChannelTab)?.name || '' })}
                            </span>
                            <div className="flex items-center gap-1 text-slate-400">
                                <CaretUp size={14} className="hover:text-slate-800 cursor-pointer" />
                                <CaretDown size={14} className="hover:text-slate-800 cursor-pointer" />
                            </div>
                        </div>

                        {/* Textarea */}
                        <textarea
                            ref={textareaRef}
                            rows={7}
                            value={currentActiveCaption}
                            onChange={(e) => handleActiveCaptionChange(e.target.value)}
                            placeholder={t('Viết nội dung bài đăng ở đây…')}
                            className="w-full bg-transparent text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 resize-none outline-none focus:ring-0 min-h-[160px]"
                        />

                        {/* LinkedIn mention helper */}
                        {platforms.includes('linkedin') && (
                            <LinkedinMentionBar
                                linkedinAccounts={linkedinAccounts}
                                onInsert={(token) => {
                                    const sep = currentActiveCaption && !/s$/.test(currentActiveCaption) ? ' ' : '';
                                    handleActiveCaptionChange(`${currentActiveCaption}${sep}${token} `);
                                }}
                            />
                        )}

                        {/* Attached Media Thumbnails inside Editor Box */}
                        {form.media?.length > 0 && (
                            <div className="flex flex-wrap gap-2.5 pt-2 border-t border-slate-100">
                                {form.media.map((img, i) => (
                                    <div
                                        key={img.id || i}
                                        className="group relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                                    >
                                        {img.file_type === 'video' ? (
                                            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-500 font-medium">
                                                MP4
                                            </div>
                                        ) : (
                                            <img
                                                src={img.file_url || img.url}
                                                alt={img.name || 'image'}
                                                className="h-full w-full object-cover"
                                            />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMedia(i)}
                                            className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp,video/mp4"
                            className="hidden"
                            onChange={handleDirectUpload}
                        />

                        {/* Bottom Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    disabled={uploading}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3.5 py-1.5 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
                                >
                                    <ImageSquare size={15} />
                                    <span>{uploading ? t('Đang tải…') : t('Chèn media')}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAiOpen(true)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3.5 py-1.5 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
                                >
                                    <Sparkle size={15} className="text-amber-500" />
                                    <span>{t('AI image')}</span>
                                </button>

                                {/* Signature Selector */}
                                <SignatureSelector
                                    brandId={form.brand_id}
                                    platform={currentActivePlatform}
                                    accountId={activeChannelTab !== 'all' ? activeChannelTab : ''}
                                    currentCaption={currentActiveCaption}
                                    onApply={(newCap) => handleActiveCaptionChange(newCap)}
                                />

                                <div className="h-4 w-px bg-slate-200 mx-0.5" />

                                {/* Format Tools */}
                                <button
                                    type="button"
                                    onClick={() => formatSelection('**', '**')}
                                    className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors font-bold text-xs"
                                    title={t('Bold')}
                                >
                                    B
                                </button>
                                <button
                                    type="button"
                                    onClick={() => formatSelection('<u>', '</u>')}
                                    className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors underline text-xs"
                                    title={t('Underline')}
                                >
                                    U
                                </button>

                                {/* Emoji Popover */}
                                <div className="relative" ref={emojiPickerRef}>
                                    <button
                                        type="button"
                                        onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                                        className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                                        title={t('Emoji')}
                                    >
                                        <Smiley size={16} />
                                    </button>

                                    {emojiPickerOpen && (
                                        <div className="absolute left-0 bottom-full mb-2 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl animate-in fade-in zoom-in-95">
                                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                                <span className="text-[11px] font-semibold text-slate-500">Chọn Emoji</span>
                                                <button type="button" onClick={() => setEmojiPickerOpen(false)} className="text-slate-400 hover:text-slate-800">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
                                                {EMOJI_LIST.map((emoji) => (
                                                    <button
                                                        key={emoji}
                                                        type="button"
                                                        onClick={() => insertEmoji(emoji)}
                                                        className="p-1.5 rounded-lg hover:bg-slate-100 text-lg transition-transform active:scale-90"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Counter badge */}
                            <div className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/80">
                                {currentCount}/{maxLimit}
                            </div>
                        </div>
                    </div>

                    {/* Shortlink Prompt if 'ask' preference and has URL */}
                    {shortlinkPref === 'ask' && !shortlinkDismissed && /https?:\/\/[^\s]+/i.test(currentActiveCaption) && !/(?:\/api\/links\/go\/|\/s\/[a-zA-Z0-9_-]+)/i.test(currentActiveCaption) && (
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#ffd631]/15 border border-[#ffd631]/60 text-xs shadow-2xs">
                            <span className="flex items-center gap-2 text-slate-800 font-medium">
                                <LinkSimple size={16} className="text-[#d8b216]" weight="bold" />
                                {t('Phát hiện liên kết URL. Bạn có muốn chuyển thành Shortlink để theo dõi nhấp chuột?')}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            const res = await appClient.links.build({
                                                brand_id: form.brand_id,
                                                form,
                                                options: { medium: 'social', campaign: form.title || 'post', tracking: true, short: true },
                                            });
                                            if (res?.caption) {
                                                handleActiveCaptionChange(res.caption);
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
                                    onClick={() => setShortlinkDismissed(true)}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer shadow-2xs"
                                >
                                    {t('Bỏ qua')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Button + Thêm bình luận / bài viết */}
                    <div>
                        <button
                            type="button"
                            onClick={() => setShowComments(!showComments)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300/80 bg-white hover:bg-slate-50 text-slate-800 px-4 py-2 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                        >
                            <Plus size={14} weight="bold" />
                            <span>{t('+ Thêm bình luận / bài viết')}</span>
                            {form.comments?.length > 0 && (
                                <span className="rounded-full bg-slate-200 text-slate-800 px-1.5 text-[10px]">
                                    {form.comments.length}
                                </span>
                            )}
                        </button>

                        {/* Collapsible Follow-up Comment Editor */}
                        {showComments && (
                            <div className="mt-3 panel p-4 bg-slate-50/60 border border-slate-200 rounded-2xl animate-in fade-in duration-150">
                                <CommentChainEditor
                                    comments={form.comments}
                                    onChange={(comments) => setForm({ ...form, comments })}
                                    brandId={form.brand_id}
                                    demoMode={demoMode}
                                    disabled={saving || uploading}
                                    onBusyChange={setUploading}
                                    accounts={selectedAccounts}
                                    linkedinAccounts={linkedinAccounts}
                                />
                            </div>
                        )}
                    </div>

                    {/* CARD 3: Cài đặt (Yellow Brand Accordion) */}
                    <div className="space-y-2">
                        <div
                            onClick={() => setSettingsOpen(!settingsOpen)}
                            className="flex items-center justify-between rounded-2xl bg-[#ffd631] hover:bg-[#ffe059] text-[#2b2100] font-bold px-5 py-3.5 text-sm cursor-pointer shadow-xs transition-all select-none"
                        >
                            <div className="flex items-center gap-2">
                                <Gear size={18} weight="bold" />
                                <span>{t('Cài đặt')}</span>
                            </div>
                            <CaretDown
                                size={16}
                                weight="bold"
                                className={`transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`}
                            />
                        </div>

                        {/* Collapsible Settings Panel */}
                        {settingsOpen && (
                            <div className="panel p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-xs animate-in fade-in duration-150">
                                {/* Title and Brand Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                            {t('Tiêu đề nội bộ')} *
                                        </label>
                                        <input
                                            type="text"
                                            value={form.title}
                                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                                            placeholder={t('Ví dụ: Bài đăng ra mắt sản phẩm')}
                                            className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                            {t('Thương hiệu')}
                                        </label>
                                        <select
                                            value={form.brand_id}
                                            onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
                                            className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                                        >
                                            {brands.map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    {b.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* UTM Link Builder */}
                                <div className="pt-2 border-t border-slate-100">
                                    <UtmLinkBuilder form={form} accounts={selectedAccounts} setForm={setForm} disabled={uploading || saving} />
                                </div>

                                {/* Per-Account Settings */}
                                {selectedAccounts.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100">
                                        <PageSettings
                                            accounts={selectedAccounts}
                                            settings={form.destination_settings}
                                            brandId={form.brand_id}
                                            demoMode={demoMode}
                                            disabled={uploading || saving}
                                            onBusyChange={setUploading}
                                            linkedinAccounts={linkedinAccounts}
                                            onChange={(destination_settings) => setForm({ ...form, destination_settings })}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bottom Action Footer Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200/80">
                        {/* Left Side: Tag and Repeat Dropdowns */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Add New Tag Dropdown */}
                            <div className="relative" ref={tagDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
                                >
                                    <Tag size={15} />
                                    <span>
                                        {form.pillar_id
                                            ? brandPillars.find((p) => p.id === form.pillar_id)?.name || t('Tag')
                                            : t('Thêm thẻ')}
                                    </span>
                                    <CaretDown size={11} className="opacity-70" />
                                </button>

                                {tagDropdownOpen && (
                                    <div className="absolute left-0 bottom-full mb-2 z-50 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl space-y-1">
                                        <span className="block px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            {t('Pillar / Chủ đề')}
                                        </span>
                                        {brandPillars.length === 0 ? (
                                            <p className="px-2 py-1 text-xs text-slate-400 italic">{t('Chưa có Pillar nào')}</p>
                                        ) : (
                                            brandPillars.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setForm((curr) => ({ ...curr, pillar_id: curr.pillar_id === p.id ? '' : p.id }));
                                                        setTagDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer ${
                                                        form.pillar_id === p.id
                                                            ? 'bg-[#ffd631]/20 text-[#2b2100] font-semibold'
                                                            : 'text-slate-700 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color || '#ffd631' }} />
                                                    <span className="truncate">{p.name}</span>
                                                    {form.pillar_id === p.id && <Check size={12} className="ml-auto" />}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Repeat Post Every... Dropdown */}
                            <div className="relative" ref={repeatDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setRepeatDropdownOpen(!repeatDropdownOpen)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
                                >
                                    <Repeat size={15} />
                                    <span>
                                        {repeatFrequency === 'none'
                                            ? t('Lặp lại bài viết…')
                                            : t('Lặp lại: {freq}', { freq: repeatFrequency })}
                                    </span>
                                    <CaretDown size={11} className="opacity-70" />
                                </button>

                                {repeatDropdownOpen && (
                                    <div className="absolute left-0 bottom-full mb-2 z-50 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl space-y-0.5">
                                        {[
                                            { value: 'none', label: t('Không lặp lại') },
                                            { value: 'daily', label: t('Mỗi ngày') },
                                            { value: 'weekly', label: t('Mỗi tuần') },
                                            { value: 'biweekly', label: t('Mỗi 2 tuần') },
                                            { value: 'monthly', label: t('Mỗi tháng') },
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => {
                                                    setRepeatFrequency(opt.value);
                                                    setRepeatDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                                    repeatFrequency === opt.value
                                                        ? 'bg-[#ffd631]/20 text-[#2b2100] font-semibold'
                                                        : 'text-slate-700 hover:bg-slate-100'
                                                }`}
                                            >
                                                <span>{opt.label}</span>
                                                {repeatFrequency === opt.value && <Check size={13} weight="bold" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Schedule Datetime & Primary Action Buttons */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                            {/* Schedule Date & Time Trigger */}
                            <div className="relative" ref={schedulePickerRef}>
                                <button
                                    type="button"
                                    onClick={() => setSchedulePickerOpen(!schedulePickerOpen)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
                                >
                                    <CalendarBlank size={14} className="text-slate-400" />
                                    <span>{formatScheduleTime(form.date, form.time)}</span>
                                </button>

                                {schedulePickerOpen && (
                                    <div className="absolute right-0 bottom-full mb-2 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl space-y-3 animate-in fade-in zoom-in-95">
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                            <span className="text-xs font-bold text-slate-900">Thời gian đăng bài</span>
                                            <button type="button" onClick={() => setSchedulePickerOpen(false)} className="text-slate-400 hover:text-slate-800">
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] text-slate-500 font-semibold block mb-1">Ngày</label>
                                                <input
                                                    type="date"
                                                    value={form.date}
                                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 shadow-2xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 font-semibold block mb-1">Giờ</label>
                                                <input
                                                    type="time"
                                                    value={form.time}
                                                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 shadow-2xs"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 font-semibold block mb-1">Múi giờ</label>
                                            <select
                                                value={form.timezone}
                                                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 shadow-2xs"
                                            >
                                                {TIMEZONES.map((z) => (
                                                    <option key={z} value={z}>
                                                        {z}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Save as draft button */}
                            <button
                                type="button"
                                disabled={saving || uploading}
                                onClick={() => submit('draft')}
                                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs px-3.5 py-2 transition-colors cursor-pointer disabled:opacity-60 shadow-2xs"
                            >
                                {t('Save as draft')}
                            </button>

                            {/* Add to Calendar ▾ primary button */}
                            <div className="relative inline-flex items-center" ref={publishDropdownRef}>
                                <button
                                    type="button"
                                    disabled={saving || uploading}
                                    onClick={() => submit('schedule')}
                                    className="btn-skew inline-flex items-center gap-1.5 rounded-l-xl text-xs font-semibold px-4 py-2 shadow-2xs cursor-pointer disabled:opacity-60"
                                >
                                    <span>{saving ? t('Đang lưu…') : t('Lên lịch')}</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={saving || uploading}
                                    onClick={() => setPublishDropdownOpen(!publishDropdownOpen)}
                                    className="rounded-r-xl border border-l-0 border-[#d8b216] bg-[#ffd631] hover:bg-[#ffe059] text-[#2b2100] px-2 py-2 transition-all cursor-pointer disabled:opacity-60 shadow-2xs"
                                >
                                    <CaretDown size={14} weight="bold" />
                                </button>

                                {publishDropdownOpen && (
                                    <div className="absolute right-0 bottom-full mb-2 z-50 w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl space-y-0.5 animate-in fade-in zoom-in-95">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPublishDropdownOpen(false);
                                                submit('schedule');
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                                        >
                                            <CalendarBlank size={14} className="text-amber-600" />
                                            <span>{t('Lên lịch đăng')}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPublishDropdownOpen(false);
                                                submit('publish');
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer font-semibold"
                                        >
                                            <PaperPlaneTilt size={14} className="text-emerald-600" />
                                            <span>{t('Đăng ngay')}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPublishDropdownOpen(false);
                                                submit('draft');
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                                        >
                                            <FloppyDisk size={14} className="text-slate-500" />
                                            <span>{t('Lưu bản nháp')}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Post Preview & Checklist */}
                {showPreview && (
                    <div className="composer-preview space-y-5 w-full">
                        {/* CARD 1: Post preview */}
                        <div className="panel p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between pb-1">
                                <h3 className="font-heading font-bold text-sm text-slate-900 tracking-wide">
                                    {t('Post preview')}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
                                    title={t('Close preview')}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Platform switch tabs */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                                {['threads', 'facebook', 'instagram', 'x', 'linkedin', 'tiktok'].map((plat) => {
                                    const isActive = previewPlatform === plat;
                                    return (
                                        <button
                                            key={plat}
                                            type="button"
                                            onClick={() => setPreviewPlatform(plat)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer capitalize shrink-0 ${
                                                isActive
                                                    ? 'bg-[#ffd631] text-[#2b2100] font-bold shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                            }`}
                                        >
                                            {plat === 'threads' ? 'Threads' : plat === 'facebook' ? 'Facebook' : plat === 'instagram' ? 'Instagram' : plat === 'x' ? 'X' : plat === 'linkedin' ? 'LinkedIn' : 'TikTok'}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Realistic Social Post Mockup Card */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3 shadow-2xs">
                                {/* Author */}
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ffd631] text-xs font-bold text-[#2b2100] shadow-xs">
                                        {activeBrandName.slice(0, 2).toUpperCase() || 'SC'}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                                            {activeBrandName || 'Socialchoice'}
                                        </h4>
                                        <p className="text-[11px] text-slate-400">
                                            @{activeBrandName ? activeBrandName.toLowerCase().replace(/\s+/g, '') : 'socialchoice.vn'}
                                        </p>
                                    </div>
                                </div>

                                {/* Post text */}
                                <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line min-h-[60px]">
                                    {currentActiveCaption || (
                                        <span className="text-slate-400 italic">
                                            {t('Nội dung bài viết sẽ hiển thị ở đây…')}
                                        </span>
                                    )}
                                </div>

                                {/* Media Box */}
                                {form.media?.length > 0 ? (
                                    <div className="overflow-hidden rounded-xl border border-slate-200 max-h-60 bg-black/5">
                                        {form.media[0]?.file_type === 'video' ? (
                                            <video src={form.media[0]?.file_url} controls className="w-full h-auto max-h-60 object-cover" />
                                        ) : (
                                            <img src={form.media[0]?.file_url || form.media[0]?.url} alt="media" className="w-full h-auto max-h-60 object-cover" />
                                        )}
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-100/70 py-12 flex items-center justify-center text-xs text-slate-400 font-medium">
                                        {t('Chưa có media')}
                                    </div>
                                )}

                                {/* Reactions Bar */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-slate-400 text-xs">
                                    <div className="flex items-center gap-3">
                                        <span className="hover:text-rose-500 cursor-pointer">♡</span>
                                        <span className="hover:text-slate-700 cursor-pointer">💬</span>
                                        <span className="hover:text-slate-700 cursor-pointer">↗</span>
                                    </div>
                                    <span className="hover:text-slate-700 cursor-pointer">🔖</span>
                                </div>
                            </div>

                            {/* Footer limit */}
                            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                                <span>{t('Giới hạn {limit}', { limit: CAPTION_LIMITS[previewPlatform] || 500 })}</span>
                                <span>{currentCount} / {CAPTION_LIMITS[previewPlatform] || 500}</span>
                            </div>
                        </div>

                        {/* CARD 2: Trước khi đăng (Pre-publish checks) */}
                        <div className="panel p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-heading font-bold text-sm text-slate-900">
                                    {t('Trước khi đăng')}
                                </h4>
                                <span className="text-xs font-bold text-slate-600 font-mono">
                                    {passedChecksCount}/{prePublishChecks.length}
                                </span>
                            </div>

                            {/* Yellow Progress Bar */}
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#ffd631] transition-all duration-300 rounded-full"
                                    style={{ width: `${(passedChecksCount / prePublishChecks.length) * 100}%` }}
                                />
                            </div>

                            {/* Checklist */}
                            <div className="space-y-2 pt-1 text-xs">
                                {prePublishChecks.map((chk) => (
                                    <div key={chk.id} className="flex items-center gap-2">
                                        <span
                                            className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                                chk.passed
                                                    ? 'bg-[#ffd631] text-[#2b2100]'
                                                    : 'bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            ✓
                                        </span>
                                        <span className={chk.passed ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                                            {chk.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* AI Assistant Modal */}
            <DesktopAiWriter
                open={aiOpen}
                onOpenChange={setAiOpen}
                form={form}
                brand={brands.find((b) => b.id === form.brand_id)}
                pillars={pillars}
                angles={angles}
                onApply={(suggestion) => {
                    const next = applyAiSuggestion(form, suggestion);
                    setForm(next);
                    toast({ title: t('Đã áp dụng gợi ý từ AI thành công!') });
                }}
            />

            {/* Design Media Library Picker Modal */}
            {mediaLibraryOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-border p-5 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Palette size={16} className="text-purple-600" />
                                <span>{t('Thư viện tệp phương tiện (Design Media)')}</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setMediaLibraryOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {brandMediaAssets.length === 0 ? (
                            <div className="text-center py-10 text-xs text-muted-foreground">
                                {t('Chưa có tệp nào trong thư viện.')}
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1">
                                {brandMediaAssets.map((asset) => {
                                    const isChosen = form.media.some((m) => m.id === asset.id);
                                    return (
                                        <div
                                            key={asset.id}
                                            onClick={() => {
                                                if (isChosen) {
                                                    setForm((curr) => ({ ...curr, media: curr.media.filter((m) => m.id !== asset.id) }));
                                                } else {
                                                    setForm((curr) => ({ ...curr, media: [...curr.media, asset] }));
                                                }
                                            }}
                                            className={`relative aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all ${
                                                isChosen ? 'border-[#ffd631] ring-2 ring-[#ffd631]' : 'border-border hover:border-muted-foreground/50'
                                            }`}
                                        >
                                            <img src={asset.file_url} alt={asset.name} className="h-full w-full object-cover" />
                                            {isChosen && (
                                                <div className="absolute top-1 right-1 rounded-full bg-[#ffd631] text-[#2b2100] p-0.5 shadow-xs">
                                                    <CheckCircle size={14} weight="fill" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Draft Confirm Dialog */}
            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={t('Xóa bài viết')}
                description={t('Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.')}
                onConfirm={handleDelete}
            />

            {/* Publishing Confirmation Dialog */}
            {publishReview && (
                <PublishConfirmation
                    review={publishReview}
                    onClose={() => setPublishReview(null)}
                    onResult={() => {
                        setPublishReview(null);
                        navigate('/posts');
                    }}
                />
            )}
        </div>
    );
}
