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
    Check,
    CheckCircle,
    WarningCircle,
    CaretDown,
    CaretUp,
    X,
    UploadSimple,
    ImageSquare,
    TextB,
    TextUnderline,
    Clock,
    ArrowClockwise,
    ArrowsClockwise,
    Globe,
    Plus,
    Tag,
    ListBullets,
    MagicWand,
    ChatCircleDots,
    SlidersHorizontal,
    BookmarkSimple,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import SaveTemplateDialog from '@/components/composer/save-template-dialog';
import PublishConfirmation from '@/components/posts/PublishConfirmation';
import SocialMockupPreview from '@/components/composer/SocialMockupPreview';
import PlatformLogo from '@/components/composer/PlatformLogo';
import { toUnicodeBold, toUnicodeUnderline, PLATFORM_CHAR_LIMITS } from '@/lib/unicode-formatting';
import { aiRequest } from '@/api/ai';
import { getShortlinkPreference } from '@/components/settings/ShortlinkSettingsCard';
import { toUtcIso, toZonedParts, localInputDefault } from '@/lib/tz';
import { DEFAULT_TIMEZONE, PLATFORM_LABEL } from '@/lib/constants';
import { PUBLISHING_PLATFORMS, destinationIssues, resolveMedia, referencedMediaIds } from '@/lib/publishing-content';
import { useTranslation } from '@/lib/i18n';

const URL_REGEX = /https?:\/\/[^\s]+/i;

const PRESET_SIGNATURES = {
    none: '',
    brand: '\n\n—\nSocialchoice · Nền tảng phân phối & tối ưu nội dung đa kênh\n🌐 socialchoice.site',
    contact: '\n\n—\nInbox hoặc liên hệ hotline để nhận tư vấn chi tiết.\nHotline: 090 123 4567 | cskh@socialchoice.site',
};

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

const emptyForm = (brandId) => {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().slice(0, 5);
    return {
        brand_id: brandId || '',
        title: '',
        caption: '',
        platform_captions: {},
        account_ids: [],
        pillar_id: '',
        angle_id: '',
        date: today,
        time: nowTime,
        timezone: DEFAULT_TIMEZONE,
        status: 'draft',
        media: [],
        platform_media: {},
        destination_settings: {},
        comments: [],
    };
};

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

    // Core states
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [mediaLibrary, setMediaLibrary] = useState([]);
    const [existing, setExisting] = useState(null);
    const [form, setForm] = useState(emptyForm(selectedBrandId === 'all' ? '' : selectedBrandId));
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [publishReview, setPublishReview] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [sourceLoading, setSourceLoading] = useState(!!sourceId);

    // Studio UI interactive states matching mau-tao-bai-viet.html
    const [activeTab, setActiveTab] = useState('default'); // 'default' | accountId
    const [previewAccountId, setPreviewAccountId] = useState('');
    const [signatureKey, setSignatureKey] = useState('none');
    const [isComposerExpanded, setIsComposerExpanded] = useState(true);
    const [isMediaDrawerOpen, setIsMediaDrawerOpen] = useState(false);
    const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);
    const [isUtmOpen, setIsUtmOpen] = useState(false);
    const [aiConfig, setAiConfig] = useState(null);
    const [aiBusy, setAiBusy] = useState(false);

    // UTM & Shortlink states
    const [utmForm, setUtmForm] = useState({
        url: '',
        source: '',
        medium: 'social',
        campaign: '',
        content: '',
        term: '',
    });
    const [useShortlink, setUseShortlink] = useState(true);
    const [overrideExistingUtm, setOverrideExistingUtm] = useState(false);
    const [trackedLinks, setTrackedLinks] = useState([]);
    const [linksUpdatedAt, setLinksUpdatedAt] = useState(() => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));

    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    // Initial load of accounts, pillars, angles, media
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [accountPage, pillarPage, anglePage, mediaPage] = await Promise.all([
                    appClient.entities.SocialAccount.filter({ is_demo: demoMode }, { sort: 'name', limit: 300 }),
                    appClient.entities.ContentPillar.filter({ is_demo: demoMode, ...(desktop ? {} : { status: 'active' }) }, { sort: 'name', limit: 300 }),
                    appClient.entities.ContentAngle.filter({ is_demo: demoMode, ...(desktop ? {} : { status: 'active' }) }, { sort: 'name', limit: 500 }),
                    appClient.entities.MediaAsset.filter({ is_demo: demoMode }, { sort: '-created_at', limit: 100 }).catch(() => ({ items: [] })),
                ]);
                if (!active) return;
                setAccounts(accountPage.items);
                setPillars(pillarPage.items);
                setAngles(anglePage.items);
                setMediaLibrary(mediaPage.items || []);
                setLoading(false);
            } catch (error) {
                if (active) {
                    setLoadError(error.message);
                    setLoading(false);
                }
            }
        })();
        return () => {
            active = false;
        };
    }, [demoMode, desktop]);

    // Check AI status
    useEffect(() => {
        let active = true;
        aiRequest('status')
            .then((cfg) => {
                if (active && cfg?.configured) setAiConfig(cfg);
            })
            .catch(() => { });
        return () => {
            active = false;
        };
    }, []);

    // Load tracked links for brand
    const refreshTrackedLinks = useCallback(async () => {
        if (!form.brand_id) {
            setTrackedLinks([]);
            return;
        }
        try {
            const res = await appClient.links.list({ brand_id: form.brand_id });
            setTrackedLinks(res?.links || []);
            setLinksUpdatedAt(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
        } catch (err) {
            console.warn('Could not load tracked links:', err);
        }
    }, [form.brand_id]);

    useEffect(() => {
        refreshTrackedLinks();
    }, [refreshTrackedLinks]);

    // Apply Brand
    const applyBrand = useCallback(
        (brandId) => {
            const preset = localInputDefault(brands.find((brand) => brand.id === brandId)?.timezone || DEFAULT_TIMEZONE);
            setForm((prev) => ({
                ...prev,
                brand_id: brandId,
                pillar_id: '',
                angle_id: '',
                media: [],
                platform_media: {},
                destination_settings: {},
                platform_captions: {},
                timezone: brands.find((brand) => brand.id === brandId)?.timezone || DEFAULT_TIMEZONE,
                date: prev.date || preset.date,
                time: prev.time || preset.time,
            }));
        },
        [brands]
    );

    useEffect(() => {
        if (sourceId || form.brand_id || !brands.length) return;
        applyBrand(selectedBrandId === 'all' ? brands[0].id : selectedBrandId);
    }, [brands, selectedBrandId, form.brand_id, sourceId, applyBrand]);

    // Hydrate existing post if edit or duplicate
    useEffect(() => {
        if (loading) return;
        if (!sourceId) {
            setExisting(null);
            setSourceLoading(false);
            return;
        }
        let active = true;
        setSourceLoading(true);
        setLoadError('');
        (async () => {
            try {
                const post = await appClient.entities.Post.get(sourceId);
                const [media, jobs] = await Promise.all([
                    referencedMediaIds(post).length
                        ? appClient.entities.MediaAsset.filter({ id: { $in: referencedMediaIds(post) } }, { limit: 60 })
                        : Promise.resolve({ items: [] }),
                    appClient.entities.PublishJob.filter({ post_id: post.id }, { limit: 200 }),
                ]);
                const parts = toZonedParts(post.scheduled_at, post.timezone || DEFAULT_TIMEZONE);
                if (!active) return;
                setExisting(editId ? post : null);
                setForm({
                    brand_id: post.brand_id,
                    title: editId ? post.title : `${post.title} (copy)`,
                    caption: post.caption || '',
                    platform_captions: post.platform_captions || {},
                    platform_media: Object.fromEntries(
                        Object.entries(post.platform_media_ids || {}).map(([platform, ids]) => [
                            platform,
                            ids.map((id) => media.items.find((asset) => asset.id === id)).filter(Boolean),
                        ])
                    ),
                    destination_settings: Object.fromEntries(
                        Object.entries(post.destination_settings || {}).map(([id, setting]) => {
                            const settingParts = toZonedParts(setting.scheduled_at, post.timezone || DEFAULT_TIMEZONE);
                            return [
                                id,
                                {
                                    tiktok: setting.tiktok,
                                    caption: setting.caption || '',
                                    localTime: setting.scheduled_at ? settingParts.date + 'T' + settingParts.time : '',
                                    ...(Object.hasOwn(setting, 'media_ids')
                                        ? {
                                            media: (setting.media_ids || [])
                                                .map((mediaId) => media.items.find((asset) => asset.id === mediaId))
                                                .filter(Boolean),
                                        }
                                        : {}),
                                    ...(Object.hasOwn(setting, 'comments')
                                        ? {
                                            comments: (setting.comments || []).map((c) =>
                                                hydrateCommentFromApi(c, media.items)
                                            ),
                                        }
                                        : {}),
                                },
                            ];
                        })
                    ),
                    comments: (post.comments || []).map((c) => hydrateCommentFromApi(c, media.items)),
                    account_ids: post.account_ids?.length ? post.account_ids : jobs.items.map((job) => job.social_account_id),
                    pillar_id: duplicateId && !pillars.some((item) => item.id === post.pillar_id && item.status === 'active') ? '' : post.pillar_id || '',
                    angle_id: duplicateId && (!pillars.some((item) => item.id === post.pillar_id && item.status === 'active') || !angles.some((item) => item.id === post.angle_id && item.status === 'active')) ? '' : post.angle_id || '',
                    date: parts.date,
                    time: parts.time,
                    timezone: post.timezone || DEFAULT_TIMEZONE,
                    status: duplicateId ? 'draft' : ['draft', 'scheduled'].includes(post.status) ? post.status : 'draft',
                    media: (post.media_ids || []).map((id) => media.items.find((image) => image.id === id)).filter(Boolean),
                });
            } catch (error) {
                if (active) setLoadError(error.message);
            } finally {
                if (active) setSourceLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [sourceId, loading, editId, duplicateId, pillars, angles]);

    // Filtered lists
    const brandAccounts = useMemo(() => accounts.filter((a) => !form.brand_id || a.brand_id === form.brand_id), [accounts, form.brand_id]);
    const connectedAccounts = useMemo(() => {
        return brandAccounts.filter((a) => {
            if (!PUBLISHING_PLATFORMS.includes(a.platform)) return false;
            if (desktop || demoMode) return a.connection_status !== 'disconnected' && a.connection_status !== 'archived';
            return a.connection_status === 'connected' || a.connection_status === 'demo';
        });
    }, [brandAccounts, desktop, demoMode]);

    const selectedAccounts = useMemo(() => accounts.filter((a) => form.account_ids.includes(a.id)), [accounts, form.account_ids]);
    const brandPillars = useMemo(() => pillars.filter((p) => !form.brand_id || p.brand_id === form.brand_id), [pillars, form.brand_id]);
    const brandAngles = useMemo(() => {
        if (!form.pillar_id) return [];
        return angles.filter((a) => a.pillar_id === form.pillar_id);
    }, [angles, form.pillar_id]);

    // Maintain preview account
    useEffect(() => {
        if (selectedAccounts.length > 0) {
            if (!selectedAccounts.some((a) => a.id === previewAccountId)) {
                setPreviewAccountId(selectedAccounts[0].id);
            }
        } else {
            setPreviewAccountId('');
        }
    }, [selectedAccounts, previewAccountId]);

    // Active channel tab logic
    const currentTabAccount = useMemo(() => selectedAccounts.find((a) => a.id === activeTab), [selectedAccounts, activeTab]);
    const hasCustomCaption = currentTabAccount ? form.destination_settings[currentTabAccount.id]?.caption !== undefined : false;

    // Resolve text for a specific account
    const getResolvedAccountText = useCallback((acc) => {
        if (!acc) return form.caption;
        const custom = form.destination_settings[acc.id]?.caption;
        const base = custom !== undefined ? custom : form.caption;
        const sig = PRESET_SIGNATURES[signatureKey] || '';
        return (base + sig).replace(/\{platform\}/gi, PLATFORM_LABEL[acc.platform] || acc.platform);
    }, [form.caption, form.destination_settings, signatureKey]);

    // Check character limits across selected accounts
    const exceededAccounts = useMemo(() => {
        return selectedAccounts.filter((acc) => {
            const limit = PLATFORM_CHAR_LIMITS[acc.platform] || 63206;
            const text = getResolvedAccountText(acc);
            return text.length > limit;
        });
    }, [selectedAccounts, getResolvedAccountText]);

    // Text for current editor textarea
    const currentEditorValue = useMemo(() => {
        if (currentTabAccount && hasCustomCaption) {
            return form.destination_settings[currentTabAccount.id]?.caption || '';
        }
        return form.caption;
    }, [currentTabAccount, hasCustomCaption, form.destination_settings, form.caption]);

    const handleTextChange = (val) => {
        if (currentTabAccount) {
            setForm((prev) => ({
                ...prev,
                destination_settings: {
                    ...prev.destination_settings,
                    [currentTabAccount.id]: {
                        ...(prev.destination_settings[currentTabAccount.id] || {}),
                        caption: val,
                    },
                },
            }));
        } else {
            setForm((prev) => ({ ...prev, caption: val }));
        }
    };

    const toggleCustomTab = (enable) => {
        if (!currentTabAccount) return;
        setForm((prev) => {
            const nextSettings = { ...prev.destination_settings };
            if (enable) {
                nextSettings[currentTabAccount.id] = {
                    ...(nextSettings[currentTabAccount.id] || {}),
                    caption: prev.caption,
                };
            } else {
                if (nextSettings[currentTabAccount.id]) {
                    delete nextSettings[currentTabAccount.id].caption;
                }
            }
            return { ...prev, destination_settings: nextSettings };
        });
    };

    // Text formatting helpers
    const applyTextTransform = (transformFn) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        if (start === end) return;
        const selected = currentEditorValue.slice(start, end);
        const transformed = transformFn(selected);
        const nextVal = currentEditorValue.slice(0, start) + transformed + currentEditorValue.slice(end);
        handleTextChange(nextVal);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start, start + transformed.length);
        }, 10);
    };

    const insertTextAtCursor = (textToInsert) => {
        const textarea = textareaRef.current;
        const pos = textarea ? textarea.selectionStart : currentEditorValue.length;
        const nextVal = currentEditorValue.slice(0, pos) + textToInsert + currentEditorValue.slice(pos);
        handleTextChange(nextVal);
        setTimeout(() => {
            if (textarea) {
                textarea.focus();
                textarea.setSelectionRange(pos + textToInsert.length, pos + textToInsert.length);
            }
        }, 10);
    };

    // Account selection toggle
    const toggleAccountSelection = (accountId) => {
        setForm((prev) => {
            const exists = prev.account_ids.includes(accountId);
            const next = exists
                ? prev.account_ids.filter((id) => id !== accountId)
                : [...prev.account_ids, accountId];
            if (activeTab === accountId && exists) {
                setActiveTab('default');
            }
            return { ...prev, account_ids: next };
        });
    };

    // Media handling
    const handleToggleMedia = (asset) => {
        setForm((prev) => {
            const exists = prev.media.some((m) => m.id === asset.id);
            if (exists) {
                return { ...prev, media: prev.media.filter((m) => m.id !== asset.id) };
            }
            if (prev.media.length >= 10) {
                toast({ title: t('Tối đa 10 tệp media') });
                return prev;
            }
            return { ...prev, media: [...prev.media, asset] };
        });
    };

    const handleRemoveMedia = (index) => {
        setForm((prev) => ({
            ...prev,
            media: prev.media.filter((_, i) => i !== index),
        }));
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploading(true);
        try {
            const uploaded = [];
            for (const file of files) {
                const asset = await appClient.media.upload(file, { brand_id: form.brand_id });
                uploaded.push(asset);
            }
            setMediaLibrary((prev) => [...uploaded, ...prev]);
            setForm((prev) => ({
                ...prev,
                media: [...prev.media, ...uploaded].slice(0, 10),
            }));
            toast({ title: t('Tải lên media thành công') });
        } catch (err) {
            toast({ variant: 'destructive', title: t('Tải lên thất bại'), description: err.message });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // AI Drawer quick chips handler
    const handleAiChip = async (actionType) => {
        setAiBusy(true);
        try {
            if (actionType === 'outline') {
                const res = await aiRequest('generate', {
                    brief: form.caption || form.title || 'Bài viết đa kênh',
                    action: 'outline',
                    brand_id: form.brand_id,
                });
                if (res?.caption || res?.text) {
                    handleTextChange(res.caption || res.text);
                    toast({ title: t('Đã gợi ý dàn ý thành công!') });
                }
            } else if (actionType === 'hook') {
                const res = await aiRequest('generate', {
                    brief: currentEditorValue || form.title || 'Chia sẻ kiến thức bổ ích',
                    action: 'hook',
                    brand_id: form.brand_id,
                });
                if (res?.caption || res?.text) {
                    handleTextChange(res.caption || res.text);
                    toast({ title: t('Đã viết lại hấp dẫn hơn!') });
                }
            } else if (actionType === 'shorten_x') {
                const currentText = currentEditorValue || form.caption;
                const truncated = currentText.slice(0, 260) + (currentText.length > 260 ? '...' : '');
                handleTextChange(truncated);
                toast({ title: t('Đã rút gọn cho X!') });
            } else if (actionType === 'hashtags') {
                const brand = brands.find((b) => b.id === form.brand_id)?.name || 'Socialchoice';
                const tagString = `\n\n#${brand.replace(/\s+/g, '')} #SocialMedia #Marketing #Viral`;
                insertTextAtCursor(tagString);
                toast({ title: t('Đã chèn hashtag!') });
            } else if (actionType === 'create_image') {
                navigate('/ai-artist');
            }
        } catch (err) {
            toast({ variant: 'destructive', title: t('AI xử lý thất bại'), description: err.message });
        } finally {
            setAiBusy(false);
        }
    };

    // UTM URL generation
    const detectedUrlInCaption = useMemo(() => {
        const match = (form.caption || '').match(URL_REGEX);
        return match ? match[0] : '';
    }, [form.caption]);

    const activeUtmUrl = utmForm.url || detectedUrlInCaption || '';

    const generatedUtmUrl = useMemo(() => {
        if (!activeUtmUrl || !utmForm.medium || !utmForm.campaign) return '';
        const [baseUrl, query = ''] = activeUtmUrl.split('?');
        const paramsList = query
            .split('&')
            .filter(Boolean)
            .filter((p) => !overrideExistingUtm || !p.startsWith('utm_'));

        const addParam = (key, val) => {
            if (val) {
                paramsList.push(`${key}=${val === '{platform}' ? val : encodeURIComponent(val)}`);
            }
        };

        addParam('utm_source', utmForm.source || '{platform}');
        addParam('utm_medium', utmForm.medium);
        addParam('utm_campaign', utmForm.campaign);
        if (utmForm.content) addParam('utm_content', utmForm.content);
        if (utmForm.term) addParam('utm_term', utmForm.term);

        const full = `${baseUrl}?${paramsList.join('&')}`;
        if (useShortlink) {
            const fakeHash = Math.abs(
                full.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
            )
                .toString(36)
                .slice(0, 6);
            return `https://sc.link/r/${fakeHash}#${full}`;
        }
        return full;
    }, [activeUtmUrl, utmForm, overrideExistingUtm, useShortlink]);

    const displayUtmShortUrl = useShortlink && generatedUtmUrl ? generatedUtmUrl.split('#')[0] : generatedUtmUrl;
    const displayUtmTargetUrl = useShortlink && generatedUtmUrl ? generatedUtmUrl.split('#')[1] : generatedUtmUrl;

    const applyUtmToDraft = () => {
        if (!displayUtmShortUrl) return;
        setForm((prev) => {
            if (URL_REGEX.test(prev.caption)) {
                return { ...prev, caption: prev.caption.replace(URL_REGEX, displayUtmShortUrl) };
            }
            return {
                ...prev,
                caption: prev.caption ? `${prev.caption}\n\n${displayUtmShortUrl}` : displayUtmShortUrl,
            };
        });
        toast({ title: t('Đã gắn link UTM vào nội dung!') });
    };

    // Checklist "Trước khi đăng" (5 conditions)
    const checklistItems = useMemo(() => {
        return [
            {
                label: 'Chọn ít nhất một tài khoản',
                ok: selectedAccounts.length > 0,
            },
            {
                label: 'Viết nội dung chính',
                ok: form.caption.trim().length > 0,
            },
            {
                label: exceededAccounts.length > 0
                    ? `Rút gọn cho ${exceededAccounts.map((a) => a.name).join(', ')}`
                    : 'Trong giới hạn ký tự',
                ok: form.caption.trim().length > 0 && exceededAccounts.length === 0,
            },
            {
                label: 'Thêm media cho Instagram / TikTok',
                ok: !selectedAccounts.some((a) => a.platform === 'instagram' || a.platform === 'tiktok') || form.media.length > 0,
            },
            {
                label: 'Chọn trụ cột và góc khai thác',
                ok: !!form.pillar_id && !!form.angle_id,
            },
        ];
    }, [selectedAccounts, form.caption, exceededAccounts, form.media, form.pillar_id, form.angle_id]);

    const checklistPassedCount = checklistItems.filter((i) => i.ok).length;
    const canSubmit = checklistItems[0].ok && checklistItems[1].ok && exceededAccounts.length === 0;

    // Save / Schedule / Publish execution
    const scheduledAt = form.date && form.time ? toUtcIso(form.date, form.time, form.timezone) : null;

    const submit = async (action) => {
        if (!form.brand_id && brands.length > 0) {
            toast({ variant: 'destructive', title: t('Vui lòng chọn thương hiệu') });
            return;
        }
        if (action !== 'draft' && !selectedAccounts.length) {
            toast({ variant: 'destructive', title: t('Chọn ít nhất một tài khoản để đăng hoặc lên lịch') });
            return;
        }
        if (!form.caption.trim() && !form.media.length) {
            toast({ variant: 'destructive', title: t('Vui lòng nhập nội dung hoặc thêm ảnh/video') });
            return;
        }
        if (exceededAccounts.length > 0) {
            toast({ variant: 'destructive', title: t(`Nội dung vượt quá giới hạn trên ${exceededAccounts.map((a) => a.name).join(', ')}`) });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                brand_id: form.brand_id,
                title: form.title.trim() || form.caption.slice(0, 40) || 'Bài viết mới',
                caption: form.caption,
                platform_captions: form.platform_captions,
                destination_settings: Object.fromEntries(
                    form.account_ids.map((id) => {
                        const setting = form.destination_settings[id] || {};
                        return [
                            id,
                            {
                                ...(setting.caption?.trim() ? { caption: setting.caption } : {}),
                                ...(setting.localTime ? { scheduled_at: setting.localTime } : {}),
                            },
                        ];
                    })
                ),
                comments: (form.comments || []).map(serializeCommentForApi),
                media_ids: form.media.map((asset) => asset.id),
                platform_media_ids: {},
                account_ids: form.account_ids,
                pillar_id: form.pillar_id || '',
                angle_id: form.angle_id || '',
                timezone: form.timezone,
                scheduled_at: action === 'publish' ? null : scheduledAt,
                status: action === 'schedule' ? 'scheduled' : 'draft',
                is_demo: demoMode,
            };

            const saved = await appClient.posts.save({ id: existing?.id, data: payload });
            setExisting(saved);

            if (action === 'publish') {
                const review = await appClient.publishing.prepare(saved.id);
                setPublishReview(review);
                return;
            }

            toast({
                title: action === 'schedule' ? t('Đã lên lịch thành công!') : t('Đã lưu bản nháp!'),
                description: action === 'schedule' ? t(`Bài đăng đã được xếp lịch lúc ${form.date} ${form.time}`) : undefined,
            });

            if (action === 'schedule') {
                navigate('/posts');
            }
        } catch (err) {
            toast({ variant: 'destructive', title: t('Không thể lưu'), description: err.message });
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        if (!existing?.id) return;
        setSaving(true);
        try {
            await appClient.posts.delete(existing.id);
            toast({ title: t('Đã xoá bài viết') });
            navigate('/posts');
        } catch (err) {
            toast({ variant: 'destructive', title: t('Xoá thất bại'), description: err.message });
        } finally {
            setSaving(false);
        }
    };

    // Current preview account object
    const currentPreviewAccount = useMemo(() => {
        return selectedAccounts.find((a) => a.id === previewAccountId) || selectedAccounts[0];
    }, [selectedAccounts, previewAccountId]);

    // Character counter for current active tab
    const currentTabLimit = currentTabAccount
        ? PLATFORM_CHAR_LIMITS[currentTabAccount.platform] || 63206
        : selectedAccounts.length > 0
            ? Math.min(...selectedAccounts.map((a) => PLATFORM_CHAR_LIMITS[a.platform] || 63206))
            : 63206;
    const currentTabCharCount = currentEditorValue.length + (PRESET_SIGNATURES[signatureKey]?.length || 0);

    return (
        <div className="w-full pb-20">
            {/* Outer Card matching mau-tao-bai-viet.html */}
            <div className="overflow-clip rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-12px_rgba(16,24,40,0.08)]">
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px]">
                    {/* LEFT COLUMN: Main studio editor */}
                    <div className="min-w-0 p-6 lg:p-8">
                        {/* Header */}
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                                    {existing ? t('Chỉnh sửa bài viết') : t('Tạo bài viết')}
                                </h1>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 text-[11px] font-medium text-emerald-700">
                                    <span className="size-1.5 rounded-full bg-emerald-500" />
                                    {t('Đã lưu tự động')}
                                </span>
                                {existing && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/create?duplicate=${existing.id}`)}
                                            className="grid size-7 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
                                            title={t('Nhân bản')}
                                        >
                                            <Copy size={15} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeleteOpen(true)}
                                            className="grid size-7 place-items-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600 transition"
                                            title={t('Xoá')}
                                        >
                                            <Trash size={15} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Top Connected Accounts Circular Buttons Bar */}
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            {connectedAccounts.map((account) => {
                                const isSelected = form.account_ids.includes(account.id);
                                const initials = (account.name || account.platform).slice(0, 2).toUpperCase();
                                return (
                                    <button
                                        key={account.id}
                                        type="button"
                                        onClick={() => toggleAccountSelection(account.id)}
                                        title={`${account.name} · @${account.platform}`}
                                        className="group relative cursor-pointer focus:outline-hidden"
                                    >
                                        <span
                                            className={`grid size-12 place-items-center rounded-full text-[13px] font-semibold transition ${isSelected
                                                    ? 'bg-zinc-900 text-white ring-2 ring-brand-400 ring-offset-2'
                                                    : 'bg-zinc-100 text-zinc-400 opacity-70 hover:opacity-100'
                                                }`}
                                        >
                                            {account.avatar_url ? (
                                                <img
                                                    src={account.avatar_url}
                                                    alt={account.name}
                                                    className="size-full rounded-full object-cover"
                                                />
                                            ) : (
                                                initials
                                            )}
                                        </span>
                                        <PlatformLogo
                                            platform={account.platform}
                                            className={`absolute -bottom-0.5 -right-0.5 size-[18px] rounded-full ring-2 ring-white transition ${isSelected ? '' : 'grayscale'
                                                }`}
                                        />
                                    </button>
                                );
                            })}
                            <Link
                                to="/accounts"
                                title={t('Kết nối kênh mới')}
                                className="grid size-12 place-items-center rounded-full border border-dashed border-zinc-300 text-zinc-400 transition hover:border-zinc-400 hover:text-zinc-700"
                            >
                                <Plus size={16} />
                            </Link>
                        </div>

                        {/* Channel Customizer Tabs Sub-bar */}
                        <div className="mt-5 flex flex-wrap items-center gap-2">
                            {[{ id: 'default', label: 'Nội dung chung' }, ...selectedAccounts].map((tab) => {
                                const isDefault = tab.id === 'default';
                                const isSelectedTab = activeTab === tab.id;
                                const isExceeded = !isDefault && getResolvedAccountText(tab).length > (PLATFORM_CHAR_LIMITS[tab.platform] || 63206);
                                const isCustomized = !isDefault && form.destination_settings[tab.id]?.caption !== undefined;

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        title={isDefault ? t('Nội dung chung') : t(`Tuỳ chỉnh cho ${tab.name}`)}
                                        className={`relative grid size-9 place-items-center rounded-lg text-[10px] font-semibold transition cursor-pointer ${isSelectedTab
                                                ? 'bg-brand-50 text-zinc-900 ring-2 ring-brand-400'
                                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                            }`}
                                    >
                                        {isDefault ? (
                                            <Globe size={16} />
                                        ) : (
                                            (tab.name || tab.platform).slice(0, 2).toUpperCase()
                                        )}
                                        {!isDefault && (
                                            <PlatformLogo
                                                platform={tab.platform}
                                                className="absolute -bottom-1 -right-1 size-3.5 rounded-full ring-2 ring-white"
                                            />
                                        )}
                                        {(isExceeded || isCustomized) && (
                                            <span
                                                className={`absolute -right-1 -top-1 size-2.5 rounded-full ring-2 ring-white ${isExceeded ? 'bg-red-500' : 'bg-brand-500'
                                                    }`}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                            {selectedAccounts.length > 0 && (
                                <span className="ml-1 text-[12px] text-zinc-400">
                                    {currentTabAccount ? (
                                        <>
                                            {t('Đang chỉnh cho')}{' '}
                                            <span className="font-medium text-zinc-700">{currentTabAccount.name}</span>
                                        </>
                                    ) : (
                                        t('Chọn một kênh để tuỳ chỉnh riêng')
                                    )}
                                </span>
                            )}
                        </div>

                        {/* Main Composer Box */}
                        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50/40 transition focus-within:border-zinc-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
                            {/* Card Header */}
                            <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                                    {currentTabAccount
                                        ? `${t('Nội dung riêng')} · ${currentTabAccount.name}`
                                        : t('Nội dung dùng chung (tất cả kênh)')}
                                </span>
                                <div className="flex items-center gap-3">
                                    {currentTabAccount && (
                                        <label className="flex items-center gap-2 text-[12px] font-medium text-zinc-600 cursor-pointer">
                                            <span>{t('Tuỳ chỉnh riêng')}</span>
                                            <input
                                                type="checkbox"
                                                checked={hasCustomCaption}
                                                onChange={(e) => toggleCustomTab(e.target.checked)}
                                                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-brand-400 cursor-pointer"
                                            />
                                        </label>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsComposerExpanded((p) => !p)}
                                        className="grid size-6 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100"
                                    >
                                        {isComposerExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
                                    </button>
                                </div>
                            </div>

                            {/* Card Body */}
                            {isComposerExpanded && (
                                <>
                                    <textarea
                                        ref={textareaRef}
                                        value={currentEditorValue}
                                        readOnly={currentTabAccount && !hasCustomCaption}
                                        onChange={(e) => handleTextChange(e.target.value)}
                                        rows={8}
                                        placeholder={
                                            currentTabAccount && !hasCustomCaption
                                                ? ''
                                                : t('Viết điều gì đó… (hỗ trợ tag {platform} tự động thay tên kênh)')
                                        }
                                        className={`block w-full resize-none bg-transparent px-4 py-3 text-[14px] leading-relaxed outline-none placeholder:text-zinc-400 ${currentTabAccount && !hasCustomCaption ? 'cursor-default text-zinc-400' : ''
                                            }`}
                                    />

                                    {currentTabAccount && !hasCustomCaption && (
                                        <div className="mx-4 mb-2 rounded-lg bg-zinc-100 px-3 py-2 text-[12px] text-zinc-500">
                                            {t('Kênh này đang dùng nội dung chung. Bật “Tuỳ chỉnh riêng” để viết phiên bản khác.')}
                                        </div>
                                    )}

                                    {signatureKey !== 'none' && PRESET_SIGNATURES[signatureKey] && (
                                        <div className="whitespace-pre-wrap px-4 pb-2 text-[12px] italic text-zinc-400">
                                            {PRESET_SIGNATURES[signatureKey].trim()}
                                        </div>
                                    )}

                                    {/* Attached Media Thumbnails Strip */}
                                    {form.media.length > 0 && (
                                        <div className="flex flex-wrap gap-2 px-4 pb-3">
                                            {form.media.map((asset, idx) => (
                                                <div
                                                    key={asset.id || idx}
                                                    className="group relative size-16 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200"
                                                >
                                                    <img
                                                        src={asset.file_url || asset.url || asset.src}
                                                        alt={asset.name || 'Attachment'}
                                                        className="size-full object-cover"
                                                    />
                                                    {idx === 0 && (
                                                        <span className="absolute inset-x-0 bottom-0 bg-black/55 text-center text-[9px] font-medium text-white">
                                                            {t('Bìa')}
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveMedia(idx)}
                                                        className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Action Toolbar */}
                                    <div className="flex items-center gap-1 overflow-x-auto border-t border-zinc-100 px-3 py-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsMediaDrawerOpen((p) => !p)}
                                            className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition cursor-pointer ${isMediaDrawerOpen ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                                                }`}
                                        >
                                            <ImageSquare size={15} />
                                            <span>{t('Chèn media')}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setIsAiDrawerOpen((p) => !p)}
                                            className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition cursor-pointer ${isAiDrawerOpen ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                                                }`}
                                        >
                                            <Sparkle size={15} weight="duotone" className="text-amber-500" />
                                            <span>{t('Trợ lý AI')}</span>
                                        </button>

                                        {/* Signature Dropdown */}
                                        <div className="relative shrink-0">
                                            <select
                                                value={signatureKey}
                                                onChange={(e) => setSignatureKey(e.target.value)}
                                                className="h-8 appearance-none rounded-lg border border-zinc-200 bg-white pl-7 pr-7 text-[12px] font-medium text-zinc-700 outline-none hover:border-zinc-300 cursor-pointer"
                                            >
                                                <option value="none">{t('Chữ ký: Không')}</option>
                                                <option value="brand">{t('Chữ ký thương hiệu')}</option>
                                                <option value="contact">{t('Lời kêu gọi liên hệ')}</option>
                                            </select>
                                            <BookmarkSimple size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                                            <CaretDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                                        </div>

                                        <span className="mx-1 h-4 w-px shrink-0 bg-zinc-200" />

                                        {/* Formatting Buttons */}
                                        <button
                                            type="button"
                                            onClick={() => applyTextTransform(toUnicodeUnderline)}
                                            title={t('Gạch chân (Unicode)')}
                                            className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
                                        >
                                            <TextUnderline size={15} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => applyTextTransform(toUnicodeBold)}
                                            title={t('In đậm (Unicode)')}
                                            className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
                                        >
                                            <TextB size={15} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => insertTextAtCursor('✨')}
                                            title={t('Chèn biểu tượng ✨')}
                                            className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
                                        >
                                            <span>✨</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsSettingsOpen(true);
                                                setIsUtmOpen(true);
                                            }}
                                            title={t('Mở UTM Link Builder')}
                                            className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
                                        >
                                            <LinkSimple size={15} />
                                        </button>

                                        {/* Character Counter */}
                                        <span
                                            className={`ml-auto flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[11px] ${currentTabCharCount > currentTabLimit
                                                    ? 'border-red-200 bg-red-50 text-red-600 font-semibold'
                                                    : 'border-zinc-200 bg-white text-zinc-500'
                                                }`}
                                            title={
                                                currentTabAccount
                                                    ? `Giới hạn ${currentTabAccount.name}`
                                                    : 'Giới hạn thấp nhất trong các kênh đã chọn'
                                            }
                                        >
                                            {currentTabCharCount > currentTabLimit && (
                                                <WarningCircle size={14} className="text-red-500" />
                                            )}
                                            {currentTabCharCount.toLocaleString('vi-VN')} / {currentTabLimit.toLocaleString('vi-VN')}
                                        </span>
                                    </div>

                                    {/* Inline Media Drawer */}
                                    {isMediaDrawerOpen && (
                                        <div className="border-t border-zinc-100 p-3 bg-zinc-50/50">
                                            <div className="mb-2 flex items-center justify-between text-[12px]">
                                                <span className="font-medium text-zinc-700">
                                                    {t('Thư viện tệp')}{' '}
                                                    <span className="font-normal text-zinc-400">· {t('tối đa 10 ảnh')}</span>
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={handleFileUpload}
                                                        multiple
                                                        accept="image/*,video/*"
                                                        className="hidden"
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled={uploading}
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="flex items-center gap-1 text-zinc-600 hover:text-zinc-900 cursor-pointer text-[12px] font-medium"
                                                    >
                                                        <UploadSimple size={14} />
                                                        {uploading ? t('Đang tải...') : t('Tải lên')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsMediaDrawerOpen(false)}
                                                        className="font-medium text-zinc-900 cursor-pointer"
                                                    >
                                                        {t('Xong')}
                                                    </button>
                                                </div>
                                            </div>

                                            {mediaLibrary.length === 0 ? (
                                                <div className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-400">
                                                    {t('Chưa có ảnh trong thư viện. Bấm "Tải lên" để thêm.')}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                                                    {mediaLibrary.map((item) => {
                                                        const isSelected = form.media.some((m) => m.id === item.id);
                                                        return (
                                                            <button
                                                                key={item.id}
                                                                type="button"
                                                                onClick={() => handleToggleMedia(item)}
                                                                className={`relative aspect-square overflow-hidden rounded-md ring-offset-1 transition cursor-pointer ${isSelected
                                                                        ? 'ring-2 ring-brand-400'
                                                                        : 'opacity-80 hover:opacity-100'
                                                                    }`}
                                                            >
                                                                <img
                                                                    src={item.file_url || item.url}
                                                                    alt={item.name}
                                                                    className="size-full object-cover"
                                                                />
                                                                {isSelected && (
                                                                    <span className="absolute right-1 top-1 grid size-4 place-items-center rounded bg-zinc-900 text-white">
                                                                        <Check size={10} weight="bold" />
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Inline AI Assistant Drawer */}
                                    {isAiDrawerOpen && (
                                        <div className="rounded-b-2xl border-t border-zinc-100 bg-brand-50/50 p-3">
                                            <div className="mb-2.5 flex items-center gap-2 text-[11px] text-zinc-500">
                                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                                <span>{aiConfig?.provider || 'AI Assistant'}</span>
                                                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-zinc-200">
                                                    {aiConfig?.model || 'gpt-4o-mini'}
                                                </code>
                                                {aiBusy && (
                                                    <span className="ml-auto text-amber-600 font-medium">
                                                        {t('Đang xử lý…')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {[
                                                    ['outline', t('Gợi ý dàn ý'), ListBullets],
                                                    ['hook', t('Viết lại hấp dẫn hơn'), MagicWand],
                                                    ['shorten_x', t('Rút gọn cho X'), Sparkle],
                                                    ['hashtags', t('Thêm hashtag'), Tag],
                                                    ['create_image', t('Tạo ảnh AI'), ImageSquare],
                                                ].map(([actionId, actionLabel, IconComp]) => (
                                                    <button
                                                        key={actionId}
                                                        type="button"
                                                        disabled={aiBusy}
                                                        onClick={() => handleAiChip(actionId)}
                                                        className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[12px] text-zinc-700 transition hover:border-zinc-300 cursor-pointer disabled:opacity-50"
                                                    >
                                                        <IconComp size={14} className="text-zinc-400" />
                                                        <span>{actionLabel}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Character Limit Exceeded Alert Banner */}
                        {exceededAccounts.length > 0 && (
                            <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">
                                <WarningCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
                                <div>
                                    <span>{t('Vượt giới hạn ký tự trên: ')}</span>
                                    {exceededAccounts.map((acc, idx) => (
                                        <button
                                            key={acc.id}
                                            type="button"
                                            onClick={() => setActiveTab(acc.id)}
                                            className="font-medium underline underline-offset-2 cursor-pointer ml-1"
                                        >
                                            {acc.name} ({PLATFORM_CHAR_LIMITS[acc.platform]})
                                            {idx < exceededAccounts.length - 1 ? ',' : '.'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Comment Chain (Chuỗi bình luận) */}
                        <div className="mt-6 space-y-3">
                            {(form.comments || []).map((comment, index) => (
                                <div key={index} className="relative pl-6">
                                    <span className="absolute left-2 top-0 h-full w-px bg-zinc-200" />
                                    <span className="absolute left-[5px] top-4 size-2 rounded-full bg-zinc-300" />
                                    <div className="rounded-xl border border-zinc-200 bg-white focus-within:border-zinc-300 focus-within:ring-4 focus-within:ring-brand-100">
                                        <div className="flex items-center justify-between px-3 pt-2.5">
                                            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                                                {t('Bình luận')} {index + 1}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        comments: prev.comments.filter((_, i) => i !== index),
                                                    }))
                                                }
                                                className="grid size-6 place-items-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                                            >
                                                <Trash size={14} />
                                            </button>
                                        </div>
                                        <textarea
                                            value={comment.message || ''}
                                            onChange={(e) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    comments: prev.comments.map((c, i) =>
                                                        i === index ? { ...c, message: e.target.value } : c
                                                    ),
                                                }))
                                            }
                                            rows={2}
                                            placeholder={t('Bình luận đầu tiên hoặc bài tiếp theo trong chuỗi…')}
                                            className="block w-full resize-none bg-transparent px-3 pb-3 pt-1 text-[13px] outline-none placeholder:text-zinc-400"
                                        />
                                    </div>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={() =>
                                    setForm((prev) => ({
                                        ...prev,
                                        comments: [...(prev.comments || []), { message: '', delay_minutes: 0 }],
                                    }))
                                }
                                className="flex h-8 items-center gap-1.5 rounded-full bg-zinc-900 px-3.5 text-[12px] font-medium text-white transition hover:bg-zinc-800 cursor-pointer"
                            >
                                <Plus size={14} />
                                <span>{t('Thêm bình luận / bài tiếp')}</span>
                            </button>
                        </div>

                        {/* Collapsible "Cài đặt" (Thương hiệu · chiến lược · UTM) */}
                        <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200">
                            <button
                                type="button"
                                onClick={() => setIsSettingsOpen((p) => !p)}
                                className={`flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] font-semibold transition cursor-pointer ${isSettingsOpen ? 'bg-brand-400 text-zinc-900' : 'bg-white hover:bg-zinc-50'
                                    }`}
                            >
                                <SlidersHorizontal size={16} />
                                <span>{t('Cài đặt')}</span>
                                <span className={`ml-1 text-[11px] font-normal ${isSettingsOpen ? 'text-zinc-800/70' : 'text-zinc-400'}`}>
                                    {t('Thương hiệu · chiến lược · UTM')}
                                </span>
                                <CaretDown size={16} className={`ml-auto transition ${isSettingsOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isSettingsOpen && (
                                <div className="divide-y divide-zinc-100 bg-white">
                                    {/* Row 1: Tiêu đề nội bộ, Thương hiệu, Trụ cột, Góc khai thác */}
                                    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                                        <div>
                                            <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                                                {t('Tiêu đề nội bộ')} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                                placeholder={t('VD: Bài đăng ra mắt sản phẩm')}
                                                className="h-9 w-full rounded-lg border border-zinc-200 px-3 text-[13px] outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-brand-100"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                                                {t('Thương hiệu')}
                                            </label>
                                            <select
                                                value={form.brand_id}
                                                onChange={(e) => applyBrand(e.target.value)}
                                                className="h-9 w-full rounded-lg border border-zinc-200 px-3 text-[13px] outline-none transition focus:border-zinc-400 cursor-pointer bg-white"
                                            >
                                                {brands.map((b) => (
                                                    <option key={b.id} value={b.id}>
                                                        {b.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                                                {t('Trụ cột')}
                                            </label>
                                            <select
                                                value={form.pillar_id}
                                                onChange={(e) => setForm({ ...form, pillar_id: e.target.value, angle_id: '' })}
                                                className="h-9 w-full rounded-lg border border-zinc-200 px-3 text-[13px] outline-none transition focus:border-zinc-400 cursor-pointer bg-white"
                                            >
                                                <option value="">{t('Chưa phân loại')}</option>
                                                {brandPillars.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                                                {t('Góc khai thác')}
                                            </label>
                                            <select
                                                value={form.angle_id}
                                                onChange={(e) => setForm({ ...form, angle_id: e.target.value })}
                                                disabled={!form.pillar_id}
                                                className="h-9 w-full rounded-lg border border-zinc-200 px-3 text-[13px] outline-none transition focus:border-zinc-400 cursor-pointer bg-white disabled:bg-zinc-50 disabled:text-zinc-400"
                                            >
                                                <option value="">
                                                    {form.pillar_id ? t('Chọn góc khai thác') : t('Chọn trụ cột trước')}
                                                </option>
                                                {brandAngles.map((a) => (
                                                    <option key={a.id} value={a.id}>
                                                        {a.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Sub-accordion: UTM Link Builder */}
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => setIsUtmOpen((p) => !p)}
                                            className="flex w-full items-center gap-2.5 px-4 py-3 text-left hover:bg-zinc-50 cursor-pointer"
                                        >
                                            <LinkSimple size={16} className="text-zinc-500" />
                                            <span className="text-[13px] font-medium text-zinc-800">
                                                {t('Tạo UTM và theo dõi liên kết')}
                                            </span>
                                            <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                                                {t('Tuỳ chọn')}
                                            </span>
                                            <CaretDown size={14} className={`ml-auto text-zinc-400 transition ${isUtmOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isUtmOpen && (
                                            <div className="space-y-4 px-4 pb-4">
                                                <p className="text-[12px] leading-relaxed text-zinc-500">
                                                    {t('Gắn UTM cho liên kết trong nội dung trước khi áp dụng. Để trống nguồn để dùng nền tảng của từng tài khoản.')}
                                                </p>

                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label className="text-[12px] font-medium text-zinc-700">
                                                            {t('URL đích')}
                                                        </label>
                                                        {!utmForm.url && detectedUrlInCaption && (
                                                            <span className="text-[11px] text-brand-600">
                                                                {t('Đang dùng liên kết trong nội dung')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={utmForm.url}
                                                        onChange={(e) => setUtmForm({ ...utmForm, url: e.target.value })}
                                                        placeholder={detectedUrlInCaption || 'https://deszy.vn/san-pham'}
                                                        className="h-9 w-full rounded-lg border border-zinc-200 px-3 text-[13px] outline-none transition focus:border-zinc-400"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                                    <div>
                                                        <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                                                            {t('Nguồn')} <span className="text-[11px] text-zinc-400 font-normal">({t('Trống = nền tảng')})</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={utmForm.source}
                                                            onChange={(e) => setUtmForm({ ...utmForm, source: e.target.value })}
                                                            placeholder="{platform}"
                                                            className="h-9 w-full rounded-lg border border-zinc-200 px-3 text-[13px] outline-none transition focus:border-zinc-400"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                                                            {t('Phương tiện')} <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={utmForm.medium}
                                                            onChange={(e) => setUtmForm({ ...utmForm, medium: e.target.value })}
                                                            placeholder="social"
                                                            className="h-9 w-full rounded-lg border border-zinc-200 px-3 text-[13px] outline-none transition focus:border-zinc-400"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                                                            {t('Chiến dịch')} <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={utmForm.campaign}
                                                            onChange={(e) => setUtmForm({ ...utmForm, campaign: e.target.value })}
                                                            placeholder="flash_sale_t11"
                                                            className="h-9 w-full rounded-lg border border-zinc-200 px-3 text-[13px] outline-none transition focus:border-zinc-400"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                                                            {t('Nội dung')}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={utmForm.content}
                                                            onChange={(e) => setUtmForm({ ...utmForm, content: e.target.value })}
                                                            placeholder="banner_a"
                                                            className="h-9 w-full rounded-lg border border-zinc-200 px-3 text-[13px] outline-none transition focus:border-zinc-400"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                                                            {t('Từ khoá')}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={utmForm.term}
                                                            onChange={(e) => setUtmForm({ ...utmForm, term: e.target.value })}
                                                            placeholder="socialchoice"
                                                            className="h-9 w-full rounded-lg border border-zinc-200 px-3 text-[13px] outline-none transition focus:border-zinc-400"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
                                                    <label className="flex items-center justify-between gap-4 px-4 py-3 cursor-pointer">
                                                        <span>
                                                            <span className="block text-[13px] font-medium text-zinc-800">
                                                                {t('Liên kết chuyển hướng có thống kê')}
                                                            </span>
                                                            <span className="block text-[12px] text-zinc-500">
                                                                {t('Đếm lượt nhấp qua đường dẫn rút gọn.')}
                                                            </span>
                                                        </span>
                                                        <input
                                                            type="checkbox"
                                                            checked={useShortlink}
                                                            onChange={(e) => setUseShortlink(e.target.checked)}
                                                            className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-brand-400 cursor-pointer"
                                                        />
                                                    </label>

                                                    <label className="flex items-center justify-between gap-4 px-4 py-3 cursor-pointer">
                                                        <span>
                                                            <span className="block text-[13px] font-medium text-zinc-800">
                                                                {t('Thay các giá trị UTM đã có')}
                                                            </span>
                                                            <span className="block text-[12px] text-zinc-500">
                                                                {t('Ghi đè tham số utm_ sẵn có trong URL.')}
                                                            </span>
                                                        </span>
                                                        <input
                                                            type="checkbox"
                                                            checked={overrideExistingUtm}
                                                            onChange={(e) => setOverrideExistingUtm(e.target.checked)}
                                                            className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-brand-400 cursor-pointer"
                                                        />
                                                    </label>
                                                </div>

                                                {/* Link Preview Card */}
                                                <div className="rounded-xl bg-zinc-50 p-4">
                                                    <div className="mb-2 text-[12px] font-medium text-zinc-700">
                                                        {t('Xem trước liên kết')}
                                                    </div>
                                                    {generatedUtmUrl ? (
                                                        <>
                                                            <code className="block break-all font-mono text-[12px] text-zinc-900 bg-white p-2 rounded border border-zinc-200">
                                                                {displayUtmShortUrl}
                                                            </code>
                                                            {useShortlink && (
                                                                <code className="mt-1.5 block break-all font-mono text-[11px] text-zinc-400">
                                                                    → {displayUtmTargetUrl}
                                                                </code>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <p className="text-[12px] text-zinc-400">
                                                            {t('Cần nhập URL, phương tiện và chiến dịch.')}
                                                        </p>
                                                    )}
                                                    <div className="mt-3 flex justify-end">
                                                        <button
                                                            type="button"
                                                            disabled={!generatedUtmUrl}
                                                            onClick={applyUtmToDraft}
                                                            className="h-8 rounded-lg bg-zinc-900 px-3 text-[12px] font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 cursor-pointer"
                                                        >
                                                            {t('Áp dụng liên kết vào bản nháp')}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Tracked Links Table */}
                                                <div>
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <span className="text-[13px] font-medium text-zinc-800">
                                                            {t('Liên kết được theo dõi')} · {brands.find((b) => b.id === form.brand_id)?.name || 'Brand'}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={refreshTrackedLinks}
                                                            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
                                                        >
                                                            <ArrowsClockwise size={14} />
                                                            {t('Cập nhật lúc')} {linksUpdatedAt}
                                                        </button>
                                                    </div>

                                                    <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 overflow-hidden bg-white">
                                                        {trackedLinks.length === 0 ? (
                                                            <li className="p-4 text-center text-xs text-zinc-400">
                                                                {t('Chưa có liên kết theo dõi nào cho thương hiệu này.')}
                                                            </li>
                                                        ) : (
                                                            trackedLinks.map((item) => (
                                                                <li key={item.id || item.url} className="flex items-center gap-3 px-4 py-2.5 text-[12px]">
                                                                    <LinkSimple size={14} className="text-zinc-400 shrink-0" />
                                                                    <span className="flex-1 truncate font-mono text-zinc-800">
                                                                        {item.short_url || item.url}
                                                                    </span>
                                                                    <span className="hidden text-zinc-400 sm:inline truncate max-w-[120px]">
                                                                        {item.campaign || 'campaign'}
                                                                    </span>
                                                                    <span className="w-20 text-right font-mono font-medium text-zinc-900">
                                                                        {(item.clicks || 0).toLocaleString('vi-VN')} {t('lượt')}
                                                                    </span>
                                                                </li>
                                                            ))
                                                        )}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Sticky preview & checklist */}
                    <aside className="flex flex-col border-t border-zinc-100 bg-zinc-50/70 xl:border-l xl:border-t-0">
                        <div className="sticky top-14 flex flex-col p-6 lg:p-8">
                            {/* Preview Header */}
                            <div className="flex items-center justify-between">
                                <h2 className="text-[15px] font-semibold text-zinc-900">
                                    {t('Xem trước bài viết')}
                                </h2>
                                <Link
                                    to="/posts"
                                    title={t('Đóng')}
                                    className="grid size-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-200/60 hover:text-zinc-900"
                                >
                                    <X size={16} />
                                </Link>
                            </div>

                            {/* Account Switcher Pills */}
                            {selectedAccounts.length > 0 && (
                                <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
                                    {selectedAccounts.map((account) => {
                                        const isCurrent = (currentPreviewAccount?.id || selectedAccounts[0]?.id) === account.id;
                                        return (
                                            <button
                                                key={account.id}
                                                type="button"
                                                onClick={() => {
                                                    setPreviewAccountId(account.id);
                                                    if (activeTab !== 'default') {
                                                        setActiveTab(account.id);
                                                    }
                                                }}
                                                className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition cursor-pointer ${isCurrent
                                                        ? 'bg-zinc-900 text-white'
                                                        : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:ring-zinc-300'
                                                    }`}
                                            >
                                                <PlatformLogo platform={account.platform} className="size-3.5" />
                                                <span className="truncate max-w-[100px]">{account.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Mockup Preview Container */}
                            <div className="mt-4 min-h-[360px] rounded-2xl border border-dashed border-zinc-200 bg-white/60 p-4">
                                {currentPreviewAccount && (form.caption.trim() || form.media.length > 0 || hasCustomCaption) ? (
                                    <SocialMockupPreview
                                        account={currentPreviewAccount}
                                        text={getResolvedAccountText(currentPreviewAccount)}
                                        media={form.media}
                                        when={t('Vừa xong')}
                                    />
                                ) : (
                                    <div className="grid h-full min-h-[328px] place-items-center text-center">
                                        <div>
                                            <div className="mx-auto grid size-10 place-items-center rounded-full bg-zinc-100">
                                                <ImageSquare size={16} className="text-zinc-400" />
                                            </div>
                                            <p className="mt-3 text-[13px] font-medium text-zinc-600">
                                                {selectedAccounts.length > 0
                                                    ? t('Bắt đầu viết để xem trước')
                                                    : t('Chọn tài khoản để xem trước')}
                                            </p>
                                            <p className="mt-0.5 text-[12px] text-zinc-400">
                                                {t('Mô phỏng giao diện từng nền tảng')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* "Trước khi đăng" Checklist */}
                            <div className="mt-5">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-[12px] font-semibold text-zinc-800">
                                        {t('Trước khi đăng')}
                                    </span>
                                    <span className="font-mono text-[11px] text-zinc-400">
                                        {checklistPassedCount}/{checklistItems.length}
                                    </span>
                                </div>

                                <div className="mb-3 h-1 overflow-hidden rounded-full bg-zinc-200/70">
                                    <div
                                        className="h-full rounded-full bg-brand-400 transition-all duration-500"
                                        style={{ width: `${(checklistPassedCount / checklistItems.length) * 100}%` }}
                                    />
                                </div>

                                <ul className="space-y-1.5">
                                    {checklistItems.map((item) => (
                                        <li key={item.label} className="flex items-start gap-2 text-[12px]">
                                            {item.ok ? (
                                                <CheckCircle size={14} weight="fill" className="mt-0.5 shrink-0 text-emerald-500" />
                                            ) : (
                                                <WarningCircle size={14} className="mt-0.5 shrink-0 text-zinc-300" />
                                            )}
                                            <span className={item.ok ? 'text-zinc-400 line-through' : 'text-zinc-600'}>
                                                {item.label}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </aside>
                </div>

                {/* Sticky Bottom Action Bar matching mau-tao-bai-viet.html */}
                <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-zinc-200/80 bg-white/90 px-6 py-3 backdrop-blur-md lg:px-8">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => submit('draft')}
                        className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer disabled:opacity-50"
                    >
                        <FloppyDisk size={16} />
                        <span>{t('Lưu nháp')}</span>
                    </button>

                    <SaveTemplateDialog form={form} demoMode={demoMode} disabled={saving || uploading || loading} />

                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        {/* Date & Time Picker */}
                        <div className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 text-[13px]">
                            <CalendarBlank size={16} className="text-zinc-400 shrink-0" />
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                className="bg-transparent outline-none text-zinc-800 text-[13px]"
                            />
                            <span className="h-4 w-px bg-zinc-200" />
                            <Clock size={16} className="text-zinc-400 shrink-0" />
                            <input
                                type="time"
                                value={form.time}
                                onChange={(e) => setForm({ ...form, time: e.target.value })}
                                className="bg-transparent outline-none text-zinc-800 text-[13px]"
                            />
                            <span className="hidden font-mono text-[10px] text-zinc-400 md:inline">
                                GMT+7
                            </span>
                        </div>

                        {/* Thêm vào lịch Button */}
                        <button
                            type="button"
                            disabled={!canSubmit || saving}
                            onClick={() => submit('schedule')}
                            title={t(`Lên lịch ${form.date} ${form.time}`)}
                            className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        >
                            <CalendarBlank size={16} />
                            <span>{t('Thêm vào lịch')}</span>
                        </button>

                        {/* Đăng ngay Button */}
                        <button
                            type="button"
                            disabled={!canSubmit || saving}
                            onClick={() => submit('publish')}
                            className="btn-skew flex h-9 items-center gap-2 rounded-lg bg-brand-400 px-4 text-[13px] font-semibold text-zinc-900 shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)] transition hover:bg-brand-300 active:translate-y-px disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 disabled:shadow-none cursor-pointer"
                        >
                            <PaperPlaneTilt size={16} weight="fill" />
                            <span>
                                {t('Đăng ngay')}
                                {selectedAccounts.length > 0 ? ` · ${selectedAccounts.length} kênh` : ''}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Publishing Confirmation Dialog */}
            {publishReview && (
                <PublishConfirmation
                    review={publishReview}
                    onClose={() => setPublishReview(null)}
                    onResult={(result) => {
                        setPublishReview(null);
                        toast({
                            title: t(
                                result.status === 'queued'
                                    ? 'Lên lịch thành công'
                                    : result.status === 'published'
                                        ? 'Bài viết đã xuất bản'
                                        : result.status === 'processing'
                                            ? 'Đang xử lý xuất bản'
                                            : 'Cần kiểm tra lại phân phối'
                            ),
                            description: t(result.message || 'Xem lịch sử xuất bản để biết chi tiết.'),
                            ...(result.status === 'failed' || result.status === 'unknown' ? { variant: 'destructive' } : {}),
                        });
                        navigate('/posts?post=' + result.postId);
                    }}
                />
            )}

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={t('Xoá bài viết này?')}
                description={t('Bản nháp hoặc bài viết sẽ bị xoá khỏi hệ thống.')}
                confirmLabel={t('Xoá bài viết')}
                destructive
                onConfirm={remove}
            />
        </div>
    );
}
