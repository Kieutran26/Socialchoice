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
    ArrowsClockwise,
    Globe,
    Plus,
    Tag,
    ListBullets,
    MagicWand,
    BookmarkSimple,
    Quotes,
    Lightning,
    Target,
    ChatCircleText,
    PushPin,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import SaveTemplateDialog from '@/components/composer/save-template-dialog';
import UseTemplateDialog from '@/components/composer/use-template-dialog';
import AiRepurposeDialog from '@/components/composer/AiRepurposeDialog';
import RecurringSchedulePanel from '@/components/composer/RecurringSchedulePanel';
import AutoDmSettingsPanel from '@/components/composer/AutoDmSettingsPanel';
import TiktokShopProductPicker from '@/components/composer/TiktokShopProductPicker';
import { tiktokShopService } from '@/lib/tiktok-shop-service';
import { generateRecurringTimeline } from '@/lib/recurring-dates';
import PublishConfirmation from '@/components/posts/PublishConfirmation';
import SocialMockupPreview from '@/components/composer/SocialMockupPreview';
import PlatformLogo from '@/components/composer/PlatformLogo';
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import { getAccountAvatarUrl } from '@/lib/account-avatar';
import { toUnicodeBold, toUnicodeUnderline, PLATFORM_CHAR_LIMITS } from '@/lib/unicode-formatting';
import { aiRequest } from '@/api/ai';
import { toUtcIso, toZonedParts, localInputDefault } from '@/lib/tz';
import { DEFAULT_TIMEZONE, PLATFORM_LABEL } from '@/lib/constants';
import { PUBLISHING_PLATFORMS, referencedMediaIds } from '@/lib/publishing-content';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { getTeamSettings, hasPermission } from '@/lib/team-seats';

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
        campaign_id: '',
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

    const { user } = useAuth();
    const [teamSettings] = useState(getTeamSettings);
    const isViewer = user?.role === 'viewer';
    const isEditorNeedingApproval = user?.role === 'editor' && !!teamSettings?.requireApprovalForEditors;

    // Core states
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
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
    const [isAiRepurposeOpen, setIsAiRepurposeOpen] = useState(false);
    const [recurringConfig, setRecurringConfig] = useState({
        enabled: false,
        frequency: 'weekly',
        count: 4,
        autoRecycle: true,
    });
    const [autoDmConfig, setAutoDmConfig] = useState(() => {
        const isFromTool = params.get('auto_dm_enabled') === '1';
        const keywordsParam = params.get('auto_dm_keywords');
        const msgParam = params.get('auto_dm_msg');
        const ctaTitleParam = params.get('auto_dm_cta_title');
        const ctaUrlParam = params.get('auto_dm_cta_url');
        return {
            enabled: isFromTool,
            matchAll: false,
            keywords: keywordsParam ? keywordsParam.split(',') : ['inbox', 'giá', 'tư vấn'],
            autoLike: true,
            publicReplies: [
                'Dạ {name} kiểm tra tin nhắn riêng của page giúp mình nhé! ❤️',
                'Mình đã gửi thông tin chi tiết qua inbox cho {name} rồi nha!',
            ],
            privateMessage: msgParam || 'Chào {name}, cảm ơn bạn đã quan tâm đến bài viết của chúng mình!\n\nDưới đây là thông tin chi tiết & tài liệu bạn yêu cầu:\n👉 https://socialchoice.site\n\nNếu cần hỗ trợ thêm, bạn chỉ cần nhắn lại cho page nhé!',
            ctaTitle: ctaTitleParam || 'Xem chi tiết ngay',
            ctaUrl: ctaUrlParam || '',
            delaySeconds: 15,
        };
    });
    const [tiktokProduct, setTiktokProduct] = useState(() => {
        const prodId = params.get('tiktok_product_id');
        if (prodId) {
            return tiktokShopService.getProductById(prodId);
        }
        return null;
    });
    const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);
    const [isUtmOpen, setIsUtmOpen] = useState(false);
    const [aiConfig, setAiConfig] = useState(null);
    const [aiBusy, setAiBusy] = useState(false);

    // Quick Post Mode & Auto First Comment states & helpers
    const [isQuickPostMode, setIsQuickPostMode] = useState(() => {
        try {
            return localStorage.getItem('socialchoice:quick_post_mode') === 'true';
        } catch {
            return false;
        }
    });

    const handleToggleQuickPostMode = (val) => {
        setIsQuickPostMode(val);
        try {
            localStorage.setItem('socialchoice:quick_post_mode', String(val));
        } catch {}
    };

    const firstCommentMessage = form.comments?.[0]?.message || '';

    const handleFirstCommentChange = (message) => {
        setForm((prev) => {
            const existingComments = prev.comments ? [...prev.comments] : [];
            if (!message && existingComments.length <= 1) {
                return { ...prev, comments: [] };
            }
            if (existingComments.length === 0) {
                return { ...prev, comments: [{ message, delay_minutes: 0 }] };
            }
            const updated = [...existingComments];
            updated[0] = { ...updated[0], message, delay_minutes: 0 };
            return { ...prev, comments: updated };
        });
    };

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
                const [accountPage, campaignPage, pillarPage, anglePage, mediaPage] = await Promise.all([
                    appClient.entities.SocialAccount.filter({ is_demo: demoMode }, { sort: 'name', limit: 300 }),
                    appClient.entities.Campaign.filter({ is_demo: demoMode, ...(desktop ? {} : { status: 'active' }) }, { sort: 'name', limit: 300 }).catch(() => ({ items: [] })),
                    appClient.entities.ContentPillar.filter({ is_demo: demoMode, ...(desktop ? {} : { status: 'active' }) }, { sort: 'name', limit: 300 }),
                    appClient.entities.ContentAngle.filter({ is_demo: demoMode, ...(desktop ? {} : { status: 'active' }) }, { sort: 'name', limit: 500 }),
                    appClient.entities.MediaAsset.filter({ is_demo: demoMode }, { sort: '-created_at', limit: 100 }).catch(() => ({ items: [] })),
                ]);
                if (!active) return;
                setAccounts(accountPage.items);
                setCampaigns(campaignPage.items || []);
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
                campaign_id: '',
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
                    campaign_id: post.campaign_id || '',
                    pillar_id: duplicateId && !pillars.some((item) => item.id === post.pillar_id && item.status === 'active') ? '' : post.pillar_id || '',
                    angle_id: duplicateId && (!pillars.some((item) => item.id === post.pillar_id && item.status === 'active') || !angles.some((item) => item.id === post.angle_id && item.status === 'active')) ? '' : post.angle_id || '',
                    date: parts.date,
                    time: parts.time,
                    timezone: post.timezone || DEFAULT_TIMEZONE,
                    status: duplicateId ? 'draft' : ['draft', 'scheduled'].includes(post.status) ? post.status : 'draft',
                    media: (post.media_ids || []).map((id) => media.items.find((image) => image.id === id)).filter(Boolean),
                });
                if (post.auto_dm) {
                    setAutoDmConfig(post.auto_dm);
                }
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
    const brandCampaigns = useMemo(() => campaigns.filter((c) => !form.brand_id || c.brand_id === form.brand_id), [campaigns, form.brand_id]);
    const brandPillars = useMemo(() => {
        const list = pillars.filter((p) => !form.brand_id || p.brand_id === form.brand_id);
        if (form.campaign_id) {
            const forCampaign = list.filter((p) => p.campaign_id === form.campaign_id);
            if (forCampaign.length > 0) return forCampaign;
        }
        return list;
    }, [pillars, form.brand_id, form.campaign_id]);
    const brandAngles = useMemo(() => {
        if (!form.pillar_id) return [];
        return angles.filter((a) => a.pillar_id === form.pillar_id);
    }, [angles, form.pillar_id]);

    const handleCampaignChange = (campaignId) => {
        const found = campaigns.find((c) => c.id === campaignId);
        setForm((prev) => ({
            ...prev,
            campaign_id: campaignId,
            pillar_id: '',
            angle_id: '',
        }));
        if (found?.utm_campaign) {
            setUtmForm((prev) => ({ ...prev, campaign: found.utm_campaign }));
        }
    };

    useEffect(() => {
        const cid = params.get('campaign_id');
        const bid = params.get('brand_id');
        if (cid && !sourceId) {
            const found = campaigns.find((c) => c.id === cid);
            setForm((prev) => ({
                ...prev,
                campaign_id: cid,
                ...(bid ? { brand_id: bid } : {}),
            }));
            if (found?.utm_campaign) {
                setUtmForm((prev) => ({ ...prev, campaign: found.utm_campaign }));
            }
        }
    }, [params, sourceId, campaigns]);

    // Maintain preview account & auto-select first account if none selected
    useEffect(() => {
        if (!sourceId && form.account_ids.length === 0 && connectedAccounts.length > 0) {
            setForm((prev) => ({
                ...prev,
                account_ids: [connectedAccounts[0].id],
            }));
            setPreviewAccountId(connectedAccounts[0].id);
        } else if (selectedAccounts.length > 0) {
            if (!selectedAccounts.some((a) => a.id === previewAccountId)) {
                setPreviewAccountId(selectedAccounts[0].id);
            }
        } else if (connectedAccounts.length > 0 && !previewAccountId) {
            setPreviewAccountId(connectedAccounts[0].id);
        }
    }, [connectedAccounts, selectedAccounts, previewAccountId, sourceId, form.account_ids.length]);

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
        if (actionType === 'repurpose') {
            setIsAiRepurposeOpen(true);
            return;
        }
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

    // Áp dụng biến thể đa kênh từ AI Repurposer
    const handleApplyRepurposedCaptions = (repurposedVariants) => {
        setForm((prev) => {
            const nextPlatformCaptions = {
                ...(prev.platform_captions || {}),
                facebook: repurposedVariants.facebook || prev.platform_captions?.facebook || '',
                threads: repurposedVariants.threads || prev.platform_captions?.threads || '',
                linkedin: repurposedVariants.linkedin || prev.platform_captions?.linkedin || '',
                tiktok: repurposedVariants.tiktok || prev.platform_captions?.tiktok || '',
                zalo: repurposedVariants.zalo || prev.platform_captions?.zalo || '',
            };

            const nextDestinationSettings = { ...prev.destination_settings };
            selectedAccounts.forEach((acc) => {
                const variantText = repurposedVariants[acc.platform];
                if (variantText) {
                    nextDestinationSettings[acc.id] = {
                        ...(nextDestinationSettings[acc.id] || {}),
                        caption: variantText,
                    };
                }
            });

            return {
                ...prev,
                caption: prev.caption?.trim() ? prev.caption : (repurposedVariants.facebook || ''),
                platform_captions: nextPlatformCaptions,
                destination_settings: nextDestinationSettings,
            };
        });

        toast({
            title: t('Đã tái sinh nội dung cho các kênh!'),
            description: t('Đã đồng bộ phiên bản riêng biệt vào từng tab kênh Facebook, Threads, LinkedIn & TikTok.'),
        });
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
    const canSubmit = !isViewer && checklistItems[0].ok && checklistItems[1].ok && exceededAccounts.length === 0;

    // Save / Schedule / Publish execution
    const scheduledAt = form.date && form.time ? toUtcIso(form.date, form.time, form.timezone) : null;

    const submit = async (action) => {
        if (isViewer) {
            toast({
                variant: 'destructive',
                title: t('Chế độ chỉ xem'),
                description: t('Tài khoản của bạn có vai trò Người xem (Viewer), không thể lưu hoặc xuất bản.'),
            });
            return;
        }

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
            const isApprovalWorkflow = isEditorNeedingApproval && (action === 'publish' || action === 'schedule');
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
                campaign_id: form.campaign_id || '',
                pillar_id: form.pillar_id || '',
                angle_id: form.angle_id || '',
                timezone: form.timezone,
                scheduled_at: isApprovalWorkflow ? scheduledAt : action === 'publish' ? null : scheduledAt,
                status: isApprovalWorkflow ? 'draft' : action === 'schedule' ? 'scheduled' : 'draft',
                needs_approval: isApprovalWorkflow ? true : false,
                submitted_by: isApprovalWorkflow ? user?.email || user?.full_name || 'editor' : undefined,
                is_demo: demoMode,
                auto_dm: autoDmConfig?.enabled ? autoDmConfig : undefined,
            };

            const saved = await appClient.posts.save({ id: existing?.id, data: payload });
            setExisting(saved);

            if (isApprovalWorkflow) {
                toast({
                    title: t('Đã gửi bài để phê duyệt!'),
                    description: t('Bài viết đã được gửi đến Quản trị viên/Người phê duyệt xét duyệt trước khi xuất bản.'),
                });
                navigate('/posts');
                return;
            }

            if (action === 'publish') {
                const review = await appClient.publishing.prepare(saved.id);
                setPublishReview(review);
                return;
            }

            if (action === 'schedule' && recurringConfig.enabled) {
                const totalCount = Math.max(2, Number(recurringConfig.count) || 4);
                const timeline = generateRecurringTimeline(
                    form.date,
                    form.time,
                    form.timezone,
                    recurringConfig.frequency,
                    totalCount
                );
                const recurringGroupId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

                // Update Post 1 with recurring info
                await appClient.posts.save({
                    id: saved.id,
                    data: {
                        recurring_group_id: recurringGroupId,
                        recurrence_index: 1,
                        recurrence_total: totalCount,
                        recurrence_rule: {
                            frequency: recurringConfig.frequency,
                            count: totalCount,
                            auto_recycle: recurringConfig.autoRecycle,
                        },
                        notes: `${form.notes || ''}\n🔁 Đăng định kỳ: Kỳ 1/${totalCount} (${recurringConfig.frequency})`.trim(),
                    },
                });

                // Generate remaining future posts (Kỳ 2..N)
                const futurePosts = timeline.slice(1).map(async (item, idx) => {
                    const cycleNum = idx + 2;
                    let cycleCaption = form.caption;
                    if (recurringConfig.autoRecycle) {
                        cycleCaption = `${form.caption.trim()}\n\n—\n[#Kỳ ${cycleNum}/${totalCount}]`;
                    }
                    return appClient.posts.save({
                        data: {
                            ...payload,
                            caption: cycleCaption,
                            scheduled_at: item.iso,
                            recurring_group_id: recurringGroupId,
                            recurrence_index: cycleNum,
                            recurrence_total: totalCount,
                            recurrence_rule: {
                                frequency: recurringConfig.frequency,
                                count: totalCount,
                                auto_recycle: recurringConfig.autoRecycle,
                            },
                            notes: `${form.notes || ''}\n🔁 Đăng định kỳ: Kỳ ${cycleNum}/${totalCount} (${recurringConfig.frequency})`.trim(),
                        },
                    });
                });

                await Promise.all(futurePosts);

                toast({
                    title: t('Đã lên lịch thành công chuỗi bài định kỳ!'),
                    description: t(
                        `Đã lên lịch tự động chuỗi ${totalCount} bài viết (${
                            recurringConfig.frequency === 'weekly'
                                ? 'Hàng tuần'
                                : recurringConfig.frequency === 'biweekly'
                                ? 'Mỗi 2 tuần'
                                : 'Hàng tháng'
                        }). Kiểm tra trên Lịch đăng bài.`
                    ),
                });
                navigate('/calendar');
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
            if (existing.status !== 'draft') {
                if (existing.status === 'scheduled') {
                    if (isDesktop()) {
                        try {
                            await appClient.posts.cancelPlans([existing.id]);
                        } catch {}
                    } else {
                        try {
                            const st = await appClient.publishing.status(existing.id);
                            if (st?.status === 'queued') {
                                await appClient.publishing.cancelSchedule(existing.id);
                            }
                        } catch {}
                        await appClient.entities.PublishJob.updateMany(
                            { post_id: existing.id, status: 'pending' },
                            { $set: { status: 'cancelled', error_message: 'Cancelled and deleted.' } }
                        );
                    }
                }
                await appClient.entities.Post.update(existing.id, { status: 'draft' });
            }
            await appClient.entities.Post.delete(existing.id);
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
        return selectedAccounts.find((a) => a.id === previewAccountId) || selectedAccounts[0] || connectedAccounts[0] || null;
    }, [selectedAccounts, previewAccountId, connectedAccounts]);

    // Character counter for current active tab
    const currentTabLimit = currentTabAccount
        ? PLATFORM_CHAR_LIMITS[currentTabAccount.platform] || 63206
        : selectedAccounts.length > 0
            ? Math.min(...selectedAccounts.map((a) => PLATFORM_CHAR_LIMITS[a.platform] || 63206))
            : 63206;
    const currentTabCharCount = currentEditorValue.length + (PRESET_SIGNATURES[signatureKey]?.length || 0);

    return (
        <div className="w-full pb-20 space-y-6">
            {isViewer && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-zinc-900 shadow-xs flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-400 font-bold text-zinc-950 text-sm">
                        👁️
                    </span>
                    <div className="text-xs">
                        <span className="font-bold text-amber-950">{t('Chế độ xem (Viewer):')}</span>{' '}
                        <span className="text-amber-900">
                            {t('Tài khoản của bạn có quyền Người xem. Bạn có thể xem cấu trúc nội dung và xem trước, nhưng các thao tác lưu nháp và xuất bản bị vô hiệu hóa.')}
                        </span>
                    </div>
                </div>
            )}
            {isEditorNeedingApproval && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-3.5 text-zinc-900 shadow-xs flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500 font-bold text-white text-xs">
                        ✍️
                    </span>
                    <div className="text-xs">
                        <span className="font-bold text-blue-950">{t('Quy trình kiểm duyệt (Approval):')}</span>{' '}
                        <span className="text-blue-900">
                            {t('Workspace bật tính năng duyệt bài cho Biên tập viên. Bài viết sau khi soạn sẽ được gửi cho Quản trị viên/Người phê duyệt xét duyệt trước khi xuất bản.')}
                        </span>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
                {/* LEFT COLUMN: Main studio editor */}
                <div className="min-w-0 space-y-5">
                    {/* Studio Header & Quick Metadata Strip */}
                    <section className="panel p-4 sm:p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-border/80">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-dark bg-brand text-brand-ink">
                                    <PaperPlaneTilt size={20} weight="duotone" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="font-heading text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">
                                        {existing ? t('Chỉnh sửa bài viết') : t('Tạo bài viết')}
                                    </h1>
                                    <p className="label-xs text-muted-foreground truncate">
                                        {t('Soạn thảo đa kênh, tuỳ chỉnh nội dung riêng và kiểm tra hiển thị trực tiếp')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Quick Post vs Strategic Planner Mode Toggle */}
                                <div className="flex items-center rounded-xl border border-border bg-surface p-0.5 shadow-2xs">
                                    <button
                                        type="button"
                                        onClick={() => handleToggleQuickPostMode(true)}
                                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition cursor-pointer ${
                                            isQuickPostMode
                                                ? 'bg-brand text-brand-ink font-semibold border border-brand-dark/40 shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground font-medium'
                                        }`}
                                    >
                                        <Lightning size={14} weight="fill" className={isQuickPostMode ? 'text-brand-ink' : 'text-amber-500'} />
                                        <span>{t('Đăng nhanh')}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleQuickPostMode(false)}
                                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition cursor-pointer ${
                                            !isQuickPostMode
                                                ? 'bg-brand text-brand-ink font-semibold border border-brand-dark/40 shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground font-medium'
                                        }`}
                                    >
                                        <Target size={14} weight="bold" className={!isQuickPostMode ? 'text-brand-ink' : 'text-muted-foreground'} />
                                        <span>{t('Chiến lược (Pro)')}</span>
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsTemplatePickerOpen(true)}
                                    className="flex h-8 items-center gap-1.5 rounded-xl border border-brand-dark/50 bg-brand/15 px-3 text-xs font-semibold text-brand-ink hover:bg-brand/30 transition cursor-pointer"
                                >
                                    <Quotes size={14} weight="bold" className="text-brand-dark" />
                                    <span>{t('Dùng mẫu bài viết')}</span>
                                </button>
                                <span className="flex h-8 items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 text-[11px] font-medium text-muted-foreground">
                                    <span className="size-1.5 rounded-full bg-emerald-500" />
                                    {t('Đã lưu tự động')}
                                </span>
                                {existing && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/create?duplicate=${existing.id}`)}
                                            className="grid size-8 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:border-brand-dark hover:bg-brand/10 hover:text-brand-ink transition cursor-pointer"
                                            title={t('Nhân bản')}
                                        >
                                            <Copy size={15} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeleteOpen(true)}
                                            className="grid size-8 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:border-dangerFg hover:bg-dangerBg hover:text-dangerFg transition cursor-pointer"
                                            title={t('Xoá')}
                                        >
                                            <Trash size={15} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Metadata Strip: Quick Post (Streamlined) or Strategic (Full 4-Col) */}
                        {isQuickPostMode ? (
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-brand/10 border border-brand-dark/30 text-xs">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-ink font-bold border border-brand-dark/40">
                                        <Lightning size={15} weight="fill" />
                                    </span>
                                    <div className="min-w-0">
                                        <span className="font-semibold text-brand-ink block truncate">
                                            {t('Chế độ Đăng Nhanh (30 Giây)')}
                                        </span>
                                        <span className="text-muted-foreground text-[11px] block truncate">
                                            {t('Đã ẩn Pillar/Angle rườm rà. Chọn kênh, viết bài, ghim cmt và bắn ngay.')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <label htmlFor="quick-brand-select" className="font-semibold text-muted-foreground text-[11px]">
                                        {t('Thương hiệu:')}
                                    </label>
                                    <select
                                        id="quick-brand-select"
                                        value={form.brand_id}
                                        onChange={(e) => applyBrand(e.target.value)}
                                        className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground outline-none transition focus:border-brand-dark cursor-pointer"
                                    >
                                        {brands.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                                <div className="sm:col-span-2 lg:col-span-1">
                                    <label htmlFor="post-internal-title" className="label-xs font-semibold text-muted-foreground mb-1 block">
                                        {t('Tiêu đề nội bộ')} <span className="text-dangerFg">*</span>
                                    </label>
                                    <input
                                        id="post-internal-title"
                                        type="text"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        placeholder={t('VD: Bài đăng ra mắt sản phẩm')}
                                        className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground outline-none transition focus:border-brand-dark focus:ring-1 focus:ring-brand-dark"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="post-brand-select" className="label-xs font-semibold text-muted-foreground mb-1 block">
                                        {t('Thương hiệu')}
                                    </label>
                                    <select
                                        id="post-brand-select"
                                        value={form.brand_id}
                                        onChange={(e) => applyBrand(e.target.value)}
                                        className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground outline-none transition focus:border-brand-dark cursor-pointer"
                                    >
                                        {brands.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label htmlFor="post-campaign-select" className="label-xs font-semibold text-muted-foreground block">
                                            {t('Chiến dịch')}
                                        </label>
                                        {form.campaign_id && brandCampaigns.find((c) => c.id === form.campaign_id)?.utm_campaign && (
                                            <span className="text-[10px] font-mono text-brand-ink bg-brand/25 border border-brand-dark/30 rounded px-1.5 py-0.2" title={t('Tự động gắn mã UTM tracking')}>
                                                utm: {brandCampaigns.find((c) => c.id === form.campaign_id).utm_campaign}
                                            </span>
                                        )}
                                    </div>
                                    <select
                                        id="post-campaign-select"
                                        value={form.campaign_id}
                                        onChange={(e) => handleCampaignChange(e.target.value)}
                                        className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground outline-none transition focus:border-brand-dark cursor-pointer"
                                    >
                                        <option value="">{t('Không thuộc chiến dịch')}</option>
                                        {brandCampaigns.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {c.status === 'archived' ? `(${t('Lưu trữ')})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="post-pillar-select" className="label-xs font-semibold text-muted-foreground mb-1 block">
                                        {t('Trụ cột nội dung')}
                                    </label>
                                    <select
                                        id="post-pillar-select"
                                        value={form.pillar_id}
                                        onChange={(e) => setForm({ ...form, pillar_id: e.target.value, angle_id: '' })}
                                        className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground outline-none transition focus:border-brand-dark cursor-pointer"
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
                                    <label htmlFor="post-angle-select" className="label-xs font-semibold text-muted-foreground mb-1 block">
                                        {t('Góc khai thác')}
                                    </label>
                                    <select
                                        id="post-angle-select"
                                        value={form.angle_id}
                                        onChange={(e) => setForm({ ...form, angle_id: e.target.value })}
                                        disabled={!form.pillar_id}
                                        className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground outline-none transition focus:border-brand-dark cursor-pointer disabled:bg-muted/50 disabled:text-muted-foreground"
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
                        )}
                    </section>

                    {/* Unified Channel Picker & Per-Channel Mode Switcher */}
                    <section className="panel p-4 sm:p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/25 text-brand-ink border border-brand-dark/40">
                                    <Globe size={14} weight="bold" />
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                    {t('1. Chọn kênh phân phối')}
                                </span>
                                <span className="rounded-full bg-brand/20 border border-brand-dark/30 px-2 py-0.5 text-[11px] font-semibold text-brand-ink">
                                    {selectedAccounts.length}/{connectedAccounts.length} {t('đã chọn')}
                                </span>
                            </div>
                            <Link
                                to="/accounts"
                                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-brand-dark hover:bg-brand/10 hover:text-brand-ink"
                            >
                                <Plus size={13} weight="bold" />
                                <span>{t('Kết nối kênh mới')}</span>
                            </Link>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            {connectedAccounts.map((account) => {
                                const isSelected = form.account_ids.includes(account.id);
                                const cfg = PLATFORM_CONFIG[account.platform] || { icon: Globe, color: 'text-zinc-600' };
                                const PlatformIcon = cfg.icon;
                                const avatarUrl = getAccountAvatarUrl(account);
                                const initials = (account.name || account.platform).slice(0, 2).toUpperCase();

                                return (
                                    <button
                                        key={account.id}
                                        type="button"
                                        onClick={() => toggleAccountSelection(account.id)}
                                        title={`${account.name} · @${account.platform}`}
                                        className={`group relative flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition cursor-pointer focus:outline-hidden ${
                                            isSelected
                                                ? 'border-brand-dark bg-brand/20 text-brand-ink'
                                                : 'border-border bg-surface/60 text-muted-foreground hover:border-brand-dark/50 hover:bg-brand/5 hover:text-foreground'
                                        }`}
                                    >
                                        <div className="relative shrink-0">
                                            <div className="size-8 rounded-full overflow-hidden flex items-center justify-center font-bold text-[11px] bg-card border border-border text-foreground">
                                                {avatarUrl ? (
                                                    <img
                                                        src={avatarUrl}
                                                        alt={account.name}
                                                        className="size-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            if (e.currentTarget.nextSibling) {
                                                                e.currentTarget.nextSibling.style.display = 'inline';
                                                            }
                                                        }}
                                                    />
                                                ) : null}
                                                <span style={{ display: avatarUrl ? 'none' : 'inline' }}>
                                                    {initials}
                                                </span>
                                            </div>
                                            <span
                                                className="absolute -bottom-1 -right-1 size-4 rounded-full bg-white ring-1 ring-border flex items-center justify-center"
                                                title={cfg.label || account.platform}
                                            >
                                                <PlatformIcon size={10} weight="fill" className={cfg.color} />
                                            </span>
                                        </div>

                                        <div className="min-w-0 pr-1">
                                            <p className="text-xs font-semibold truncate max-w-[130px] text-foreground">
                                                {account.name}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground truncate">
                                                {cfg.label || account.platform}
                                            </p>
                                        </div>

                                        <span
                                            className={`ml-1 grid size-4 shrink-0 place-items-center rounded-full border text-[10px] transition ${
                                                isSelected
                                                    ? 'border-brand-dark bg-brand text-brand-ink font-bold'
                                                    : 'border-border bg-card text-transparent group-hover:border-brand-dark/50'
                                            }`}
                                        >
                                            <Check size={10} weight="bold" />
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Step 2: Editor Tab Bar for Global vs Per-Account Content */}
                        {selectedAccounts.length > 0 && (
                            <div className="pt-3 border-t border-border/70 flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
                                    {t('2. Soạn theo kênh')}:
                                </span>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('default')}
                                    className={`flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition cursor-pointer ${
                                        activeTab === 'default'
                                            ? 'border-brand-dark bg-brand text-brand-ink font-semibold'
                                            : 'border-border bg-card text-muted-foreground hover:border-brand-dark/50 hover:text-foreground'
                                    }`}
                                >
                                    <Globe size={14} weight={activeTab === 'default' ? 'fill' : 'regular'} />
                                    <span>{t('Nội dung chung')}</span>
                                </button>

                                {selectedAccounts.map((tab) => {
                                    const isSelectedTab = activeTab === tab.id;
                                    const isExceeded = !isSelectedTab && getResolvedAccountText(tab).length > (PLATFORM_CHAR_LIMITS[tab.platform] || 63206);
                                    const isCustomized = form.destination_settings[tab.id]?.caption !== undefined;
                                    const cfg = PLATFORM_CONFIG[tab.platform] || { icon: Globe, color: 'text-zinc-600' };
                                    const TabIcon = cfg.icon;

                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => {
                                                setActiveTab(tab.id);
                                                setPreviewAccountId(tab.id);
                                            }}
                                            title={t(`Tuỳ chỉnh cho ${tab.name}`)}
                                            className={`relative flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs transition cursor-pointer ${
                                                isSelectedTab
                                                    ? 'border-brand-dark bg-brand text-brand-ink font-semibold'
                                                    : 'border-border bg-card text-muted-foreground hover:border-brand-dark/50 hover:text-foreground font-medium'
                                            }`}
                                        >
                                            <TabIcon size={13} weight="fill" className={isSelectedTab ? 'text-brand-ink' : cfg.color} />
                                            <span className="truncate max-w-[110px]">{tab.name}</span>
                                            {isExceeded ? (
                                                <span className="size-2 rounded-full bg-dangerFg" title={t('Vượt giới hạn ký tự')} />
                                            ) : isCustomized ? (
                                                <span className="size-2 rounded-full bg-brand-dark" title={t('Đã tuỳ chỉnh riêng')} />
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Main Composer Studio Box */}
                    <div className="panel overflow-hidden transition focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand/25">
                        {/* Card Header */}
                        <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-surface/60 px-4 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="h-2 w-2 rounded-full bg-brand border border-brand-dark shrink-0" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-foreground truncate">
                                    {currentTabAccount
                                        ? `${t('Nội dung riêng')} · ${currentTabAccount.name}`
                                        : t('Nội dung dùng chung (tất cả kênh)')}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                {currentTabAccount && (
                                    <label className="flex items-center gap-2 rounded-lg border border-brand-dark/40 bg-brand/15 px-2.5 py-1 text-xs font-semibold text-brand-ink cursor-pointer">
                                        <span>{t('Tuỳ chỉnh riêng')}</span>
                                        <input
                                            type="checkbox"
                                            checked={hasCustomCaption}
                                            onChange={(e) => toggleCustomTab(e.target.checked)}
                                            className="h-4 w-4 rounded border-brand-dark text-brand-dark focus:ring-brand-dark cursor-pointer"
                                        />
                                    </label>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsComposerExpanded((p) => !p)}
                                    className="grid size-7 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:border-brand-dark hover:text-brand-ink cursor-pointer"
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
                                    className={`block w-full resize-none bg-card px-4 py-3.5 text-[14px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground ${currentTabAccount && !hasCustomCaption ? 'cursor-default text-muted-foreground bg-surface/40' : ''
                                        }`}
                                />

                                {currentTabAccount && !hasCustomCaption && (
                                    <div className="mx-4 mb-3 rounded-xl border border-brand-dark/40 bg-brand/15 px-3 py-2 text-xs text-brand-ink">
                                        {t('Kênh này đang dùng nội dung chung. Bật “Tuỳ chỉnh riêng” để viết phiên bản khác.')}
                                    </div>
                                )}

                                {signatureKey !== 'none' && PRESET_SIGNATURES[signatureKey] && (
                                    <div className="mx-4 mb-3 rounded-xl border border-dashed border-border bg-surface/60 px-3 py-2 whitespace-pre-wrap text-xs italic text-muted-foreground">
                                        {PRESET_SIGNATURES[signatureKey].trim()}
                                    </div>
                                )}

                                {/* Attached Media Thumbnails Strip */}
                                {form.media.length > 0 && (
                                    <div className="flex flex-wrap gap-2.5 border-t border-border/60 bg-surface/40 px-4 py-3">
                                        {form.media.map((asset, idx) => (
                                            <div
                                                key={asset.id || idx}
                                                className="group relative size-16 overflow-hidden rounded-xl border border-border bg-muted"
                                            >
                                                <img
                                                    src={asset.file_url || asset.url || asset.src}
                                                    alt={asset.name || 'Attachment'}
                                                    className="size-full object-cover"
                                                />
                                                {idx === 0 && (
                                                    <span className="absolute inset-x-0 bottom-0 bg-brand/95 text-center text-[9px] font-bold text-brand-ink">
                                                        {t('Bìa')}
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveMedia(idx)}
                                                    className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-black/65 text-white opacity-0 transition group-hover:opacity-100 cursor-pointer"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Action Toolbar */}
                                <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border/80 bg-surface/70 px-3 py-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setIsMediaDrawerOpen((p) => !p)}
                                        className={`flex h-8 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition cursor-pointer ${isMediaDrawerOpen
                                                ? 'border-brand-dark bg-brand text-brand-ink'
                                                : 'border-border bg-card text-foreground hover:border-brand-dark/50 hover:bg-brand/10'
                                            }`}
                                    >
                                        <ImageSquare size={15} weight="duotone" />
                                        <span>{t('Chèn media')}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsAiDrawerOpen((p) => !p)}
                                        className={`flex h-8 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition cursor-pointer ${isAiDrawerOpen
                                                ? 'border-brand-dark bg-brand text-brand-ink'
                                                : 'border-border bg-card text-foreground hover:border-brand-dark/50 hover:bg-brand/10'
                                            }`}
                                    >
                                        <Sparkle size={15} weight="fill" className={isAiDrawerOpen ? 'text-brand-ink' : 'text-brand-dark'} />
                                        <span>{t('Trợ lý AI')}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsAiRepurposeOpen(true)}
                                        className="flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-brand-dark/50 bg-brand/20 px-3 text-xs font-bold text-brand-ink transition hover:bg-brand cursor-pointer shadow-xs"
                                    >
                                        <MagicWand size={15} weight="duotone" className="text-brand-dark" />
                                        <span>{t('AI Tái sinh đa kênh')}</span>
                                        <span className="rounded-full bg-brand-dark text-white px-1.5 py-0.2 text-[9px] font-extrabold tracking-wide uppercase">
                                            1-Click
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsTemplatePickerOpen(true)}
                                        className="flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground hover:border-brand-dark/50 hover:bg-brand/10 transition cursor-pointer"
                                    >
                                        <Quotes size={15} weight="duotone" className="text-brand-dark" />
                                        <span>{t('Dùng mẫu')}</span>
                                    </button>

                                    {/* Signature Dropdown */}
                                    <div className="relative shrink-0">
                                        <select
                                            value={signatureKey}
                                            onChange={(e) => setSignatureKey(e.target.value)}
                                            className="h-8 appearance-none rounded-xl border border-border bg-card pl-7 pr-7 text-xs font-medium text-foreground outline-none hover:border-brand-dark/50 cursor-pointer"
                                        >
                                            <option value="none">{t('Chữ ký: Không')}</option>
                                            <option value="brand">{t('Chữ ký thương hiệu')}</option>
                                            <option value="contact">{t('Lời kêu gọi liên hệ')}</option>
                                        </select>
                                        <BookmarkSimple size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-dark" />
                                        <CaretDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    </div>

                                    <span className="mx-1 h-4 w-px shrink-0 bg-border" />

                                    {/* Formatting Buttons */}
                                    <button
                                        type="button"
                                        onClick={() => applyTextTransform(toUnicodeUnderline)}
                                        title={t('Gạch chân (Unicode)')}
                                        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-brand/15 hover:text-brand-ink cursor-pointer"
                                    >
                                        <TextUnderline size={15} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => applyTextTransform(toUnicodeBold)}
                                        title={t('In đậm (Unicode)')}
                                        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-brand/15 hover:text-brand-ink cursor-pointer"
                                    >
                                        <TextB size={15} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => insertTextAtCursor('✨')}
                                        title={t('Chèn biểu tượng ✨')}
                                        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-brand/15 hover:text-brand-ink cursor-pointer"
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
                                        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-brand/15 hover:text-brand-ink cursor-pointer"
                                    >
                                        <LinkSimple size={15} />
                                    </button>

                                    {/* Character Counter */}
                                    <span
                                        className={`ml-auto flex h-8 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 font-mono text-[11px] ${currentTabCharCount > currentTabLimit
                                                ? 'border-dangerFg bg-dangerBg text-dangerFg font-semibold'
                                                : 'border-brand-dark/30 bg-brand/10 text-brand-ink font-medium'
                                            }`}
                                        title={
                                            currentTabAccount
                                                ? `Giới hạn ${currentTabAccount.name}`
                                                : 'Giới hạn thấp nhất trong các kênh đã chọn'
                                        }
                                    >
                                        {currentTabCharCount > currentTabLimit && (
                                            <WarningCircle size={14} className="text-dangerFg" />
                                        )}
                                        {currentTabCharCount.toLocaleString('vi-VN')} / {currentTabLimit.toLocaleString('vi-VN')}
                                    </span>
                                </div>

                                {/* Inline Media Drawer */}
                                {isMediaDrawerOpen && (
                                    <div className="border-t border-brand-dark/30 bg-brand/10 p-3.5">
                                        <div className="mb-2.5 flex items-center justify-between text-xs">
                                            <span className="font-semibold text-brand-ink">
                                                {t('Thư viện tệp')}{' '}
                                                <span className="font-normal text-muted-foreground">· {t('tối đa 10 ảnh')}</span>
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
                                                    className="flex items-center gap-1 rounded-lg border border-brand-dark bg-brand px-2.5 py-1 text-xs font-semibold text-brand-ink hover:bg-[#ffe059] cursor-pointer"
                                                >
                                                    <UploadSimple size={14} weight="bold" />
                                                    {uploading ? t('Đang tải...') : t('Tải lên')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsMediaDrawerOpen(false)}
                                                    className="text-xs font-semibold text-brand-ink hover:underline cursor-pointer"
                                                >
                                                    {t('Xong')}
                                                </button>
                                            </div>
                                        </div>

                                        {mediaLibrary.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-brand-dark/40 bg-card/80 py-6 text-center text-xs text-muted-foreground">
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
                                                            className={`relative aspect-square overflow-hidden rounded-lg ring-offset-1 transition cursor-pointer ${isSelected
                                                                    ? 'ring-2 ring-brand-dark'
                                                                    : 'opacity-80 hover:opacity-100'
                                                                }`}
                                                        >
                                                            <img
                                                                src={item.file_url || item.url}
                                                                alt={item.name}
                                                                className="size-full object-cover"
                                                            />
                                                            {isSelected && (
                                                                <span className="absolute right-1 top-1 grid size-4 place-items-center rounded bg-brand text-brand-ink">
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
                                    <div className="border-t border-brand-dark/30 bg-brand/10 p-3.5">
                                        <div className="mb-2.5 flex items-center gap-2 text-[11px] text-brand-ink">
                                            <span className="size-2 rounded-full bg-brand border border-brand-dark" />
                                            <span className="font-semibold">{aiConfig?.provider || 'AI Assistant'}</span>
                                            <code className="rounded bg-card px-1.5 py-0.5 font-mono text-[10px] border border-brand-dark/30">
                                                {aiConfig?.model || 'gpt-4o-mini'}
                                            </code>
                                            {aiBusy && (
                                                <span className="ml-auto text-brand-ink font-semibold">
                                                    {t('Đang xử lý…')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                ['repurpose', t('🪄 Tái sinh 4 kênh (1-Click)'), MagicWand],
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
                                                    className="flex items-center gap-1.5 rounded-full border border-brand-dark/40 bg-card px-3 py-1 text-xs font-medium text-brand-ink transition hover:bg-brand hover:border-brand-dark cursor-pointer disabled:opacity-50"
                                                >
                                                    <IconComp size={14} weight="duotone" className="text-brand-dark" />
                                                    <span>{actionLabel}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Prominent Auto First Comment Panel */}
                    <section className="panel p-4 sm:p-5 space-y-3 bg-card border border-border/80">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-dark/40 bg-brand/20 text-brand-ink shrink-0">
                                    <ChatCircleText size={16} weight="fill" />
                                </span>
                                <div>
                                    <label htmlFor="first-comment-input" className="text-xs font-semibold text-foreground flex items-center gap-1.5 cursor-pointer">
                                        <span>{t('Ghim bình luận đầu tiên (Auto First Comment)')}</span>
                                        <span className="rounded-full bg-brand/25 border border-brand-dark/30 px-2 py-0.2 text-[10px] font-bold text-brand-ink">
                                            {t('Chống bóp reach')}
                                        </span>
                                    </label>
                                    <p className="text-[11px] text-muted-foreground">
                                        {t('Tự động đăng bình luận ngay khi bài vừa xuất bản (chèn link mua hàng, affiliate, số hotline...)')}
                                    </p>
                                </div>
                            </div>
                            {firstCommentMessage && (
                                <button
                                    type="button"
                                    onClick={() => handleFirstCommentChange('')}
                                    className="text-[11px] font-medium text-muted-foreground hover:text-dangerFg transition cursor-pointer"
                                >
                                    {t('Xóa bình luận đầu')}
                                </button>
                            )}
                        </div>

                        <div className="relative rounded-xl border border-border bg-surface/40 focus-within:border-brand-dark focus-within:bg-card focus-within:ring-2 focus-within:ring-brand/25 transition">
                            <textarea
                                id="first-comment-input"
                                value={firstCommentMessage}
                                onChange={(e) => handleFirstCommentChange(e.target.value)}
                                rows={2}
                                placeholder={t('Ví dụ: Bấm link bên dưới để nhận mã giảm giá 20% hoặc liên hệ Hotline: 090 123 4567...')}
                                className="block w-full resize-none bg-transparent px-3 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-surface/30 px-3 py-1.5 text-[11px] text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <PushPin size={12} weight="fill" className="text-brand-dark" />
                                    <span>{t('Tự động đăng ngay lập tức (delay 0s)')}</span>
                                </div>
                                <span className="font-mono text-[10px]">
                                    {firstCommentMessage.length} {t('ký tự')}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Character Limit Exceeded Alert Banner */}
                    {exceededAccounts.length > 0 && (
                        <div className="flex items-start gap-2 rounded-xl border border-dangerFg/40 bg-dangerBg px-3.5 py-2.5 text-xs text-dangerFg">
                            <WarningCircle size={15} className="mt-0.5 shrink-0" />
                            <div>
                                <span>{t('Vượt giới hạn ký tự trên: ')}</span>
                                {exceededAccounts.map((acc, idx) => (
                                    <button
                                        key={acc.id}
                                        type="button"
                                        onClick={() => setActiveTab(acc.id)}
                                        className="font-semibold underline underline-offset-2 cursor-pointer ml-1"
                                    >
                                        {acc.name} ({PLATFORM_CHAR_LIMITS[acc.platform]})
                                        {idx < exceededAccounts.length - 1 ? ',' : '.'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Comment Chain & UTM Link Builder Row */}
                    <section className="panel p-4 sm:p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-dark/40 bg-brand/20 text-brand-ink font-heading text-xs font-bold">
                                    {(form.comments || []).length}
                                </span>
                                <div>
                                    <h2 className="font-heading text-sm font-semibold text-foreground">
                                        {t('Chuỗi bài nối tiếp / Bình luận tiếp theo (#2, #3...)')}
                                    </h2>
                                    <p className="label-xs text-muted-foreground">
                                        {t('Tự động đăng các bình luận nối tiếp theo thời gian (delay 5–10 phút) để kích thích tương tác')}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    setForm((prev) => ({
                                        ...prev,
                                        comments: [...(prev.comments || []), { message: '', delay_minutes: (prev.comments || []).length === 0 ? 0 : 5 }],
                                    }))
                                }
                                className="flex h-8 items-center gap-1.5 rounded-xl border border-brand-dark bg-brand px-3 text-xs font-semibold text-brand-ink transition hover:bg-[#ffe059] cursor-pointer"
                            >
                                <Plus size={14} weight="bold" />
                                <span>{t('Thêm bài nối tiếp trong chuỗi')}</span>
                            </button>
                        </div>

                        {(form.comments || []).length > 0 && (
                            <div className="space-y-3 pt-1">
                                {(form.comments || []).map((comment, index) => (
                                    <div key={index} className="relative pl-6">
                                        <span className="absolute left-2.5 top-0 h-full w-px bg-brand-dark/40" />
                                        <span className="absolute left-1 top-3.5 size-3 rounded-full border border-brand-dark bg-brand" />
                                        <div className="rounded-xl border border-border bg-surface/40 focus-within:border-brand-dark focus-within:bg-card focus-within:ring-2 focus-within:ring-brand/25">
                                            <div className="flex items-center justify-between px-3 pt-2.5">
                                                <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-ink">
                                                    {t('Bình luận')} #{index + 1}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            comments: prev.comments.filter((_, i) => i !== index),
                                                        }))
                                                    }
                                                    className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-dangerBg hover:text-dangerFg cursor-pointer"
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
                                                className="block w-full resize-none bg-transparent px-3 pb-3 pt-1 text-[13px] outline-none placeholder:text-muted-foreground"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Collapsible UTM & Shortlink Tracking Panel */}
                    <section className="panel overflow-hidden">
                        <button
                            type="button"
                            onClick={() => {
                                setIsSettingsOpen((p) => !p);
                                setIsUtmOpen(true);
                            }}
                            className={`flex w-full items-center gap-2.5 px-4 py-3.5 text-left text-[13px] font-semibold transition cursor-pointer ${isSettingsOpen
                                    ? 'bg-brand/15 border-b border-brand-dark/30 text-brand-ink'
                                    : 'bg-card hover:bg-brand/10 text-foreground'
                                }`}
                        >
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-dark/40 bg-brand/25 text-brand-ink shrink-0">
                                <LinkSimple size={15} weight="bold" />
                            </span>
                            <div>
                                <span className="block">{t('Tạo UTM & Theo dõi liên kết rút gọn')}</span>
                                <span className="block text-[11px] font-normal text-muted-foreground">
                                    {t('Gắn mã chiến dịch và đếm lượt nhấp theo từng kênh')}
                                </span>
                            </div>
                            <span className="ml-auto mr-2 rounded-full border border-brand-dark/30 bg-brand/20 px-2 py-0.5 text-[10px] font-semibold text-brand-ink">
                                {trackedLinks.length} {t('link')}
                            </span>
                            <CaretDown size={16} className={`text-muted-foreground transition ${isSettingsOpen ? 'rotate-180 text-brand-ink' : ''}`} />
                        </button>

                        {isSettingsOpen && (
                            <div className="divide-y divide-border/70 bg-card p-4 space-y-4">
                                <div className="space-y-4">
                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                        {t('Gắn UTM cho liên kết trong nội dung trước khi áp dụng. Để trống nguồn để dùng nền tảng của từng tài khoản.')}
                                    </p>

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-xs font-medium text-foreground">
                                                {t('URL đích')}
                                            </label>
                                            {!utmForm.url && detectedUrlInCaption && (
                                                <span className="text-[11px] text-successFg font-medium">
                                                    {t('Đang dùng liên kết trong nội dung')}
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            value={utmForm.url}
                                            onChange={(e) => setUtmForm({ ...utmForm, url: e.target.value })}
                                            placeholder={detectedUrlInCaption || 'https://deszy.vn/san-pham'}
                                            className="h-9 w-full rounded-lg border border-border px-3 text-[13px] outline-none transition focus:border-brand-dark"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <div>
                                            <label className="block text-xs font-medium text-foreground mb-1">
                                                {t('Nguồn')} <span className="text-[11px] text-muted-foreground font-normal">({t('Trống = nền tảng')})</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={utmForm.source}
                                                onChange={(e) => setUtmForm({ ...utmForm, source: e.target.value })}
                                                placeholder="{platform}"
                                                className="h-9 w-full rounded-lg border border-border px-3 text-[13px] outline-none transition focus:border-brand-dark"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-foreground mb-1">
                                                {t('Phương tiện')} <span className="text-dangerFg">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={utmForm.medium}
                                                onChange={(e) => setUtmForm({ ...utmForm, medium: e.target.value })}
                                                placeholder="social"
                                                className="h-9 w-full rounded-lg border border-border px-3 text-[13px] outline-none transition focus:border-brand-dark"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-foreground mb-1">
                                                {t('Chiến dịch')} <span className="text-dangerFg">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={utmForm.campaign}
                                                onChange={(e) => setUtmForm({ ...utmForm, campaign: e.target.value })}
                                                placeholder="flash_sale_t11"
                                                className="h-9 w-full rounded-lg border border-border px-3 text-[13px] outline-none transition focus:border-brand-dark"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-foreground mb-1">
                                                {t('Nội dung')}
                                            </label>
                                            <input
                                                type="text"
                                                value={utmForm.content}
                                                onChange={(e) => setUtmForm({ ...utmForm, content: e.target.value })}
                                                placeholder="banner_a"
                                                className="h-9 w-full rounded-lg border border-border px-3 text-[13px] outline-none transition focus:border-brand-dark"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-foreground mb-1">
                                                {t('Từ khoá')}
                                            </label>
                                            <input
                                                type="text"
                                                value={utmForm.term}
                                                onChange={(e) => setUtmForm({ ...utmForm, term: e.target.value })}
                                                placeholder="socialchoice"
                                                className="h-9 w-full rounded-lg border border-border px-3 text-[13px] outline-none transition focus:border-brand-dark"
                                            />
                                        </div>
                                    </div>

                                    <div className="divide-y divide-border/70 rounded-xl border border-border">
                                        <label className="flex items-center justify-between gap-4 px-4 py-3 cursor-pointer">
                                            <span>
                                                <span className="block text-[13px] font-medium text-foreground">
                                                    {t('Liên kết chuyển hướng có thống kê')}
                                                </span>
                                                <span className="block text-xs text-muted-foreground">
                                                    {t('Đếm lượt nhấp qua đường dẫn rút gọn.')}
                                                </span>
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={useShortlink}
                                                onChange={(e) => setUseShortlink(e.target.checked)}
                                                className="h-4 w-4 rounded border-border text-brand-dark focus:ring-brand-dark cursor-pointer"
                                            />
                                        </label>

                                        <label className="flex items-center justify-between gap-4 px-4 py-3 cursor-pointer">
                                            <span>
                                                <span className="block text-[13px] font-medium text-foreground">
                                                    {t('Thay các giá trị UTM đã có')}
                                                </span>
                                                <span className="block text-xs text-muted-foreground">
                                                    {t('Ghi đè tham số utm_ sẵn có trong URL.')}
                                                </span>
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={overrideExistingUtm}
                                                onChange={(e) => setOverrideExistingUtm(e.target.checked)}
                                                className="h-4 w-4 rounded border-border text-brand-dark focus:ring-brand-dark cursor-pointer"
                                            />
                                        </label>
                                    </div>

                                    {/* Link Preview Card */}
                                    <div className="rounded-xl border border-brand-dark/30 bg-brand/10 p-4">
                                        <div className="mb-2 text-xs font-semibold text-brand-ink">
                                            {t('Xem trước liên kết')}
                                        </div>
                                        {generatedUtmUrl ? (
                                            <>
                                                <code className="block break-all font-mono text-xs text-foreground bg-card p-2 rounded-lg border border-brand-dark/30">
                                                    {displayUtmShortUrl}
                                                </code>
                                                {useShortlink && (
                                                    <code className="mt-1.5 block break-all font-mono text-[11px] text-muted-foreground">
                                                        → {displayUtmTargetUrl}
                                                    </code>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">
                                                {t('Cần nhập URL, phương tiện và chiến dịch.')}
                                            </p>
                                        )}
                                        <div className="mt-3 flex justify-end">
                                            <button
                                                type="button"
                                                disabled={!generatedUtmUrl}
                                                onClick={applyUtmToDraft}
                                                className="h-8 rounded-lg border border-brand-dark bg-brand px-3 text-xs font-semibold text-brand-ink transition hover:bg-[#ffe059] disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground cursor-pointer"
                                            >
                                                {t('Áp dụng liên kết vào bản nháp')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tracked Links Table */}
                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-[13px] font-semibold text-foreground">
                                                {t('Liên kết được theo dõi')} · {brands.find((b) => b.id === form.brand_id)?.name || 'Brand'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={refreshTrackedLinks}
                                                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition hover:bg-brand/15 hover:text-brand-ink cursor-pointer"
                                            >
                                                <ArrowsClockwise size={14} />
                                                {t('Cập nhật lúc')} {linksUpdatedAt}
                                            </button>
                                        </div>

                                        <ul className="divide-y divide-border/70 rounded-xl border border-border overflow-hidden bg-card">
                                            {trackedLinks.length === 0 ? (
                                                <li className="p-4 text-center text-xs text-muted-foreground">
                                                    {t('Chưa có liên kết theo dõi nào cho thương hiệu này.')}
                                                </li>
                                            ) : (
                                                trackedLinks.map((item) => (
                                                    <li key={item.id || item.url} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                                                        <LinkSimple size={14} className="text-brand-dark shrink-0" />
                                                        <span className="flex-1 truncate font-mono text-foreground">
                                                            {item.short_url || item.url}
                                                        </span>
                                                        <span className="hidden text-muted-foreground sm:inline truncate max-w-[120px]">
                                                            {item.campaign || 'campaign'}
                                                        </span>
                                                        <span className="w-20 text-right font-mono font-semibold text-brand-ink">
                                                            {(item.clicks || 0).toLocaleString('vi-VN')} {t('lượt')}
                                                        </span>
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Smart Recurring & Auto-Recycle Panel */}
                    <RecurringSchedulePanel
                        config={recurringConfig}
                        onChange={setRecurringConfig}
                        startDate={form.date}
                        startTime={form.time}
                        timezone={form.timezone}
                        disabled={isViewer}
                    />

                    {/* Comment-to-Inbox: Keyword Auto-DM Panel */}
                    <AutoDmSettingsPanel
                        config={autoDmConfig}
                        onChange={setAutoDmConfig}
                        disabled={isViewer}
                    />

                    {/* TikTok Shop: Product Anchor (Giỏ hàng vàng) Panel */}
                    <TiktokShopProductPicker
                        brandId={form.brand_id || selectedBrandId}
                        selectedProduct={tiktokProduct}
                        onSelectProduct={setTiktokProduct}
                        onInsertScript={(script) => {
                            setForm((prev) => ({
                                ...prev,
                                caption: prev.caption ? `${prev.caption}\n\n${script}` : script,
                            }));
                            toast({
                                title: t('Đã chèn kịch bản bán hàng TikTok Shop!'),
                                description: t('Kịch bản video ngắn và lời kêu gọi bấm giỏ hàng vàng đã được điền vào khung soạn thảo.'),
                            });
                        }}
                    />
                </div>

                {/* RIGHT COLUMN: Sticky preview & checklist */}
                <aside className="flex flex-col">
                    <div className="sticky top-4 panel p-5 space-y-4">
                        {/* Preview Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-border/80">
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-dark/40 bg-brand/25 text-brand-ink">
                                    <ImageSquare size={15} weight="duotone" />
                                </span>
                                <div>
                                    <h2 className="font-heading text-[15px] font-semibold text-foreground">
                                        {t('Xem trước trực tiếp')}
                                    </h2>
                                    <p className="text-[11px] text-muted-foreground">
                                        {t('Mô phỏng hiển thị theo thời gian thực')}
                                    </p>
                                </div>
                            </div>
                            <Link
                                to="/posts"
                                title={t('Đóng')}
                                className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:border-brand-dark hover:bg-brand/15 hover:text-brand-ink"
                            >
                                <X size={15} />
                            </Link>
                        </div>

                        {/* Account Switcher Pills */}
                        {selectedAccounts.length > 0 && (
                            <div className="flex gap-1.5 overflow-x-auto pb-1">
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
                                            className={`flex h-8 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-semibold transition cursor-pointer ${isCurrent
                                                    ? 'border-brand-dark bg-brand text-brand-ink'
                                                    : 'border-border bg-surface text-muted-foreground hover:border-brand-dark/50 hover:text-foreground'
                                                }`}
                                        >
                                            {(() => {
                                                const avatarUrl = getAccountAvatarUrl(account);
                                                return avatarUrl ? (
                                                    <div className="size-4.5 rounded-full overflow-hidden shrink-0 border border-white/20">
                                                        <img
                                                            src={avatarUrl}
                                                            alt=""
                                                            className="size-full object-cover"
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                        />
                                                    </div>
                                                ) : null;
                                            })()}
                                            <PlatformLogo platform={account.platform} className="size-3.5" />
                                            <span className="truncate max-w-[100px]">{account.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Mockup Preview Container */}
                        <div className="min-h-[360px] rounded-2xl border border-border bg-surface/60 p-4">
                            {currentPreviewAccount ? (
                                <SocialMockupPreview
                                    account={currentPreviewAccount}
                                    text={getResolvedAccountText(currentPreviewAccount) || t('🚀 Nội dung bài viết đang được soạn thảo sẽ hiển thị trực quan tại đây theo thời gian thực...')}
                                    media={form.media}
                                    when={t('Vừa xong')}
                                    tiktokProduct={tiktokProduct}
                                />
                            ) : (
                                <div className="grid h-full min-h-[328px] place-items-center text-center">
                                    <div>
                                        <div className="mx-auto grid size-11 place-items-center rounded-2xl border border-brand-dark/40 bg-brand/20 text-brand-ink">
                                            <ImageSquare size={18} weight="duotone" />
                                        </div>
                                        <p className="mt-3 text-[13px] font-semibold text-foreground">
                                            {selectedAccounts.length > 0
                                                ? t('Bắt đầu viết để xem trước')
                                                : t('Chọn tài khoản để xem trước')}
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {t('Mô phỏng giao diện từng nền tảng')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* "Trước khi đăng" Checklist */}
                        <div className="rounded-xl border border-brand-dark/30 bg-brand/10 p-3.5">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-semibold text-brand-ink">
                                    {t('Kiểm tra trước khi đăng')}
                                </span>
                                <span className="rounded-md border border-brand-dark/40 bg-brand px-1.5 py-0.5 font-mono text-[11px] font-bold text-brand-ink">
                                    {checklistPassedCount}/{checklistItems.length}
                                </span>
                            </div>

                            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-card border border-brand-dark/20">
                                <div
                                    className="h-full rounded-full bg-brand-dark transition-all duration-500"
                                    style={{ width: `${(checklistPassedCount / checklistItems.length) * 100}%` }}
                                />
                            </div>

                            <ul className="space-y-1.5">
                                {checklistItems.map((item) => (
                                    <li key={item.label} className="flex items-start gap-2 text-xs">
                                        {item.ok ? (
                                            <CheckCircle size={15} weight="fill" className="mt-0.5 shrink-0 text-emerald-600" />
                                        ) : (
                                            <WarningCircle size={15} weight="duotone" className="mt-0.5 shrink-0 text-brand-dark" />
                                        )}
                                        <span className={item.ok ? 'text-muted-foreground line-through' : 'font-medium text-brand-ink'}>
                                            {item.label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Sticky Bottom Action Bar */}
            <div className="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-dark/40 bg-card/95 px-5 py-3.5 backdrop-blur-md">
                <button
                    type="button"
                    disabled={isViewer || saving}
                    onClick={() => submit('draft')}
                    title={isViewer ? t('Chế độ xem không thể lưu nháp') : undefined}
                    className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-xs font-semibold text-foreground transition hover:border-brand-dark hover:bg-brand/15 hover:text-brand-ink cursor-pointer disabled:opacity-50"
                >
                    <FloppyDisk size={16} weight="duotone" />
                    <span>{t('Lưu nháp')}</span>
                </button>

                <SaveTemplateDialog form={form} demoMode={demoMode} disabled={isViewer || saving || uploading || loading} />

                <UseTemplateDialog
                    brandId={form.brand_id}
                    demoMode={demoMode}
                    disabled={isViewer || saving || uploading || loading}
                    open={isTemplatePickerOpen}
                    onOpenChange={setIsTemplatePickerOpen}
                />

                <div className="ml-auto flex flex-wrap items-center gap-2">
                    {/* Date & Time Picker */}
                    <div className="flex h-9 items-center gap-2 rounded-xl border border-brand-dark/40 bg-brand/10 px-3 text-xs">
                        <CalendarBlank size={15} weight="duotone" className="text-brand-ink shrink-0" />
                        <input
                            type="date"
                            value={form.date}
                            disabled={isViewer}
                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                            className="bg-transparent outline-none font-medium text-brand-ink text-xs disabled:opacity-60"
                        />
                        <span className="h-4 w-px bg-brand-dark/30" />
                        <Clock size={15} weight="duotone" className="text-brand-ink shrink-0" />
                        <input
                            type="time"
                            value={form.time}
                            disabled={isViewer}
                            onChange={(e) => setForm({ ...form, time: e.target.value })}
                            className="bg-transparent outline-none font-medium text-brand-ink text-xs disabled:opacity-60"
                        />
                        <span className="hidden font-mono text-[10px] font-semibold text-brand-ink/70 md:inline">
                            GMT+7
                        </span>
                    </div>

                    {/* Thêm vào lịch Button */}
                    <button
                        type="button"
                        disabled={!canSubmit || saving}
                        onClick={() => submit('schedule')}
                        title={isViewer ? t('Chế độ xem không thể lên lịch') : t(`Lên lịch ${form.date} ${form.time}`)}
                        className={`flex h-9 items-center gap-1.5 rounded-xl border border-brand-dark px-3.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
                            recurringConfig.enabled
                                ? 'bg-brand text-brand-ink font-bold shadow-xs'
                                : 'bg-brand/20 text-brand-ink hover:bg-brand/35'
                        }`}
                    >
                        {recurringConfig.enabled ? (
                            <ArrowsClockwise size={16} weight="bold" />
                        ) : (
                            <CalendarBlank size={16} weight="bold" />
                        )}
                        <span>
                            {isEditorNeedingApproval
                                ? t('Lên lịch & Gửi duyệt')
                                : recurringConfig.enabled
                                ? t('🔁 Lên lịch {count} kỳ định kỳ', { count: recurringConfig.count })
                                : t('Thêm vào lịch')}
                        </span>
                    </button>

                    {/* Đăng ngay Button */}
                    <button
                        type="button"
                        disabled={!canSubmit || saving}
                        onClick={() => submit('publish')}
                        title={isViewer ? t('Chế độ xem không thể đăng bài') : undefined}
                        className={`btn-skew disabled:opacity-40 disabled:cursor-not-allowed ${
                            isEditorNeedingApproval ? 'bg-amber-400 text-zinc-950 font-bold' : ''
                        }`}
                    >
                        <PaperPlaneTilt size={16} weight="bold" />
                        <span>
                            {isEditorNeedingApproval ? t('Gửi duyệt bài') : t('Đăng ngay')}
                            {selectedAccounts.length > 0 ? ` · ${selectedAccounts.length} kênh` : ''}
                        </span>
                    </button>
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

            {/* AI Multi-Platform Repurposer Dialog */}
            <AiRepurposeDialog
                open={isAiRepurposeOpen}
                onClose={() => setIsAiRepurposeOpen(false)}
                baseCaption={currentEditorValue || form.caption}
                baseTitle={form.title}
                brandId={form.brand_id}
                selectedAccounts={selectedAccounts}
                aiConfig={aiConfig}
                onApply={handleApplyRepurposedCaptions}
            />
        </div>
    );
}
