import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowsClockwise,
    Article,
    BookmarkSimple,
    CalendarBlank,
    CaretDown,
    CaretUp,
    Check,
    CheckCircle,
    Copy,
    FloppyDisk,
    Globe,
    ImageSquare,
    Lightning,
    LinkSimple,
    MagicWand,
    PaperPlaneTilt,
    Plus,
    Quotes,
    ShareNetwork,
    Sparkle,
    Target,
    TextB,
    TextUnderline,
    Trash,
    WarningCircle,
    X,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { getTeamSettings } from '@/lib/team-seats';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import SaveTemplateDialog from '@/components/composer/save-template-dialog';
import UseTemplateDialog from '@/components/composer/use-template-dialog';
import AiRepurposeDialog from '@/components/composer/AiRepurposeDialog';
import RecurringSchedulePanel from '@/components/composer/RecurringSchedulePanel';
import AutoDmSettingsPanel from '@/components/composer/AutoDmSettingsPanel';
import TiktokShopProductPicker from '@/components/composer/TiktokShopProductPicker';
import ShopeeProductPicker from '@/components/composer/ShopeeProductPicker';
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
import { generateRecurringTimeline } from '@/lib/recurring-dates';
import { tiktokShopService } from '@/lib/tiktok-shop-service';
import { shopeeAffiliateService } from '@/lib/shopee-affiliate-service';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

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

    // Studio UI interactive states
    const [activeTab, setActiveTab] = useState('default'); // 'default' | accountId
    const [previewAccountId, setPreviewAccountId] = useState('');
    const [signatureKey, setSignatureKey] = useState('none');
    const [isMediaDrawerOpen, setIsMediaDrawerOpen] = useState(false);
    const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
    const [isAiRepurposeOpen, setIsAiRepurposeOpen] = useState(false);
    const [publishMode, setPublishMode] = useState('schedule'); // 'schedule' | 'now'

    // Expandable tool drawers
    const [expandedTool, setExpandedTool] = useState(null); // 'strategy' | 'utm' | 'recurring' | 'autodm' | 'affiliate' | null

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
            privateMessage:
                msgParam ||
                'Chào {name}, cảm ơn bạn đã quan tâm đến bài viết của chúng mình!\n\nDưới đây là thông tin chi tiết & tài liệu bạn yêu cầu:\n👉 https://socialchoice.site\n\nNếu cần hỗ trợ thêm, bạn chỉ cần nhắn lại cho page nhé!',
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

    const [shopeeProduct, setShopeeProduct] = useState(() => {
        const prodId = params.get('shopee_product_id');
        if (prodId) {
            return shopeeAffiliateService.getProductById(prodId);
        }
        return null;
    });

    const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
    const [aiBusy, setAiBusy] = useState(false);

    // Quick Post Mode toggle
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

    // First Comment logic (anti-suppression pinning)
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
    const [linksUpdatedAt, setLinksUpdatedAt] = useState(() =>
        new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    );

    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    // Initial load of accounts, campaigns, pillars, angles, media
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [accountPage, campaignPage, pillarPage, anglePage, mediaPage] =
                    await Promise.all([
                        appClient.entities.SocialAccount.filter(
                            { is_demo: demoMode },
                            { sort: 'name', limit: 300 }
                        ),
                        appClient.entities.Campaign.filter(
                            { is_demo: demoMode, ...(desktop ? {} : { status: 'active' }) },
                            { sort: 'name', limit: 300 }
                        ).catch(() => ({ items: [] })),
                        appClient.entities.ContentPillar.filter(
                            { is_demo: demoMode, ...(desktop ? {} : { status: 'active' }) },
                            { sort: 'name', limit: 300 }
                        ),
                        appClient.entities.ContentAngle.filter(
                            { is_demo: demoMode, ...(desktop ? {} : { status: 'active' }) },
                            { sort: 'name', limit: 500 }
                        ),
                        appClient.entities.MediaAsset.filter(
                            { is_demo: demoMode },
                            { sort: '-created_at', limit: 100 }
                        ).catch(() => ({ items: [] })),
                    ]);
                if (!active) return;
                setAccounts(accountPage.items || []);
                setCampaigns(campaignPage.items || []);
                setPillars(pillarPage.items || []);
                setAngles(anglePage.items || []);
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

    // Load tracked links for brand
    const refreshTrackedLinks = useCallback(async () => {
        if (!form.brand_id) {
            setTrackedLinks([]);
            return;
        }
        try {
            const res = await appClient.links.list(
                { brand_id: form.brand_id },
                { silent: true }
            );
            setTrackedLinks(res?.links || []);
            setLinksUpdatedAt(
                new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            );
        } catch {
            // Giữ nguyên danh sách hiện tại nếu tải ngầm gặp lỗi
        }
    }, [form.brand_id]);

    useEffect(() => {
        refreshTrackedLinks();
    }, [refreshTrackedLinks]);

    // Apply Brand
    const applyBrand = useCallback(
        (brandId) => {
            const currentBrand = brands.find((b) => b.id === brandId);
            const preset = localInputDefault(currentBrand?.timezone || DEFAULT_TIMEZONE);
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
                timezone: currentBrand?.timezone || DEFAULT_TIMEZONE,
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
                        ? appClient.entities.MediaAsset.filter(
                              { id: { $in: referencedMediaIds(post) } },
                              { limit: 60 }
                          )
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
                            const settingParts = toZonedParts(
                                setting.scheduled_at,
                                post.timezone || DEFAULT_TIMEZONE
                            );
                            return [
                                id,
                                {
                                    tiktok: setting.tiktok,
                                    caption: setting.caption || '',
                                    localTime: setting.scheduled_at
                                        ? settingParts.date + 'T' + settingParts.time
                                        : '',
                                    ...(Object.hasOwn(setting, 'media_ids')
                                        ? {
                                              media: (setting.media_ids || [])
                                                  .map((mId) => media.items.find((a) => a.id === mId))
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
                    account_ids: post.account_ids?.length
                        ? post.account_ids
                        : jobs.items.map((job) => job.social_account_id),
                    campaign_id: post.campaign_id || '',
                    pillar_id:
                        duplicateId &&
                        !pillars.some((item) => item.id === post.pillar_id && item.status === 'active')
                            ? ''
                            : post.pillar_id || '',
                    angle_id:
                        duplicateId &&
                        (!pillars.some((item) => item.id === post.pillar_id && item.status === 'active') ||
                            !angles.some((item) => item.id === post.angle_id && item.status === 'active'))
                            ? ''
                            : post.angle_id || '',
                    date: parts.date,
                    time: parts.time,
                    timezone: post.timezone || DEFAULT_TIMEZONE,
                    status: duplicateId
                        ? 'draft'
                        : ['draft', 'scheduled'].includes(post.status)
                        ? post.status
                        : 'draft',
                    media: (post.media_ids || [])
                        .map((id) => media.items.find((image) => image.id === id))
                        .filter(Boolean),
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
    const brandAccounts = useMemo(
        () => accounts.filter((a) => !form.brand_id || a.brand_id === form.brand_id),
        [accounts, form.brand_id]
    );

    const connectedAccounts = useMemo(() => {
        return brandAccounts.filter((a) => {
            if (!PUBLISHING_PLATFORMS.includes(a.platform)) return false;
            if (desktop || demoMode)
                return a.connection_status !== 'disconnected' && a.connection_status !== 'archived';
            return a.connection_status === 'connected' || a.connection_status === 'demo';
        });
    }, [brandAccounts, desktop, demoMode]);

    const selectedAccounts = useMemo(
        () => accounts.filter((a) => form.account_ids.includes(a.id)),
        [accounts, form.account_ids]
    );

    const brandCampaigns = useMemo(
        () => campaigns.filter((c) => !form.brand_id || c.brand_id === form.brand_id),
        [campaigns, form.brand_id]
    );

    const brandPillars = useMemo(() => {
        const list = pillars.filter((p) => !form.brand_id || p.brand_id === form.brand_id);
        if (form.campaign_id) {
            const forCampaign = list.filter((p) => p.campaign_id === form.campaign_id);
            if (forCampaign.length > 0) return forCampaign;
        }
        return list;
    }, [pillars, form.brand_id, form.campaign_id]);

    const brandAngles = useMemo(() => {
        const list = angles.filter((a) => !form.brand_id || a.brand_id === form.brand_id);
        if (form.pillar_id) {
            return list.filter((a) => a.pillar_id === form.pillar_id);
        }
        return list;
    }, [angles, form.brand_id, form.pillar_id]);

    const handleCampaignChange = (campaignId) => {
        const camp = brandCampaigns.find((c) => c.id === campaignId);
        setForm((prev) => ({
            ...prev,
            campaign_id: campaignId,
            pillar_id: '',
            angle_id: '',
        }));
        if (camp?.utm_campaign) {
            setUtmForm((prev) => ({ ...prev, campaign: camp.utm_campaign }));
        }
    };

    // Text & Customization resolution
    const currentTabAccount = useMemo(
        () => (activeTab === 'default' ? null : accounts.find((a) => a.id === activeTab)),
        [activeTab, accounts]
    );

    const currentEditorValue = useMemo(() => {
        if (!currentTabAccount) return form.caption || '';
        const customized = form.destination_settings[currentTabAccount.id]?.caption;
        if (customized !== undefined) return customized;
        if (form.platform_captions[currentTabAccount.platform] !== undefined) {
            return form.platform_captions[currentTabAccount.platform];
        }
        return form.caption || '';
    }, [currentTabAccount, form.destination_settings, form.platform_captions, form.caption]);

    const hasCustomCaption = useMemo(() => {
        if (!currentTabAccount) return false;
        return form.destination_settings[currentTabAccount.id]?.caption !== undefined;
    }, [currentTabAccount, form.destination_settings]);

    const toggleCustomTab = (isCustom) => {
        if (!currentTabAccount) return;
        setForm((prev) => {
            const nextSettings = { ...prev.destination_settings };
            if (isCustom) {
                nextSettings[currentTabAccount.id] = {
                    ...(nextSettings[currentTabAccount.id] || {}),
                    caption: prev.caption || '',
                };
            } else {
                if (nextSettings[currentTabAccount.id]) {
                    const copy = { ...nextSettings[currentTabAccount.id] };
                    delete copy.caption;
                    if (Object.keys(copy).length === 0) {
                        delete nextSettings[currentTabAccount.id];
                    } else {
                        nextSettings[currentTabAccount.id] = copy;
                    }
                }
            }
            return { ...prev, destination_settings: nextSettings };
        });
    };

    const handleTextChange = (value) => {
        if (!currentTabAccount) {
            setForm((prev) => ({ ...prev, caption: value }));
        } else {
            setForm((prev) => ({
                ...prev,
                destination_settings: {
                    ...prev.destination_settings,
                    [currentTabAccount.id]: {
                        ...(prev.destination_settings[currentTabAccount.id] || {}),
                        caption: value,
                    },
                },
            }));
        }
    };

    const getResolvedAccountText = useCallback(
        (acc) => {
            if (!acc) return '';
            const specific = form.destination_settings[acc.id]?.caption;
            if (specific !== undefined) return specific;
            if (form.platform_captions[acc.platform] !== undefined) {
                return form.platform_captions[acc.platform];
            }
            return form.caption || '';
        },
        [form.destination_settings, form.platform_captions, form.caption]
    );

    // Text Transforms
    const applyTextTransform = (transformFn) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        if (start === end) {
            toast({ title: t('Vui lòng bôi đen đoạn văn bản cần định dạng') });
            return;
        }
        const selectedText = currentEditorValue.slice(start, end);
        const transformed = transformFn(selectedText);
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
        const nextVal =
            currentEditorValue.slice(0, pos) + textToInsert + currentEditorValue.slice(pos);
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
                caption: prev.caption?.trim() ? prev.caption : repurposedVariants.facebook || '',
                platform_captions: nextPlatformCaptions,
                destination_settings: nextDestinationSettings,
            };
        });

        toast({
            title: t('Đã tái sinh nội dung cho các kênh!'),
            description: t(
                'Đã đồng bộ phiên bản riêng biệt vào từng tab kênh Facebook, Threads, LinkedIn & TikTok.'
            ),
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

    const displayUtmShortUrl =
        useShortlink && generatedUtmUrl ? generatedUtmUrl.split('#')[0] : generatedUtmUrl;
    const displayUtmTargetUrl =
        useShortlink && generatedUtmUrl ? generatedUtmUrl.split('#')[1] : generatedUtmUrl;

    const applyUtmToDraft = () => {
        if (!displayUtmShortUrl) return;
        setForm((prev) => {
            if (URL_REGEX.test(prev.caption)) {
                return { ...prev, caption: prev.caption.replace(URL_REGEX, displayUtmShortUrl) };
            }
            return {
                ...prev,
                caption: prev.caption
                    ? `${prev.caption}\n\n${displayUtmShortUrl}`
                    : displayUtmShortUrl,
            };
        });
        toast({ title: t('Đã gắn link UTM vào nội dung!') });
    };

    // Checklist & Exceeded Account Validation
    const exceededAccounts = useMemo(() => {
        return selectedAccounts.filter((acc) => {
            const text = getResolvedAccountText(acc);
            const limit = PLATFORM_CHAR_LIMITS[acc.platform] || 63206;
            return text.length > limit;
        });
    }, [selectedAccounts, getResolvedAccountText]);

    const checklistItems = useMemo(() => {
        return [
            {
                label: t('Chọn ít nhất một tài khoản đích'),
                ok: selectedAccounts.length > 0,
            },
            {
                label: t('Nhập nội dung bài viết'),
                ok: form.caption.trim().length > 0,
            },
            {
                label:
                    exceededAccounts.length > 0
                        ? t('Rút gọn cho {names}', {
                              names: exceededAccounts.map((a) => a.name).join(', '),
                          })
                        : t('Nằm trong giới hạn ký tự các kênh'),
                ok: form.caption.trim().length > 0 && exceededAccounts.length === 0,
            },
            {
                label: t('Đính kèm ảnh/video cho Instagram / TikTok'),
                ok:
                    !selectedAccounts.some(
                        (a) => a.platform === 'instagram' || a.platform === 'tiktok'
                    ) || form.media.length > 0,
            },
            {
                label: t('Chọn trụ cột và góc khai thác nội dung'),
                ok: isQuickPostMode || (Boolean(form.pillar_id) && Boolean(form.angle_id)),
            },
        ];
    }, [selectedAccounts, form.caption, exceededAccounts, form.media, form.pillar_id, form.angle_id, isQuickPostMode, t]);

    const checklistPassedCount = checklistItems.filter((i) => i.ok).length;
    const canSubmit =
        !isViewer && checklistItems[0].ok && checklistItems[1].ok && exceededAccounts.length === 0;

    // Save / Schedule / Publish execution
    const scheduledAt =
        form.date && form.time ? toUtcIso(form.date, form.time, form.timezone) : null;

    const submit = async (action) => {
        if (isViewer) {
            toast({
                variant: 'destructive',
                title: t('Chế độ chỉ xem'),
                description: t(
                    'Tài khoản của bạn có vai trò Người xem (Viewer), không thể lưu hoặc xuất bản.'
                ),
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
            toast({
                variant: 'destructive',
                title: t(`Nội dung vượt quá giới hạn trên ${exceededAccounts.map((a) => a.name).join(', ')}`),
            });
            return;
        }

        setSaving(true);
        try {
            const isApprovalWorkflow =
                isEditorNeedingApproval && (action === 'publish' || action === 'schedule');
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
                scheduled_at: isApprovalWorkflow
                    ? scheduledAt
                    : action === 'publish'
                    ? null
                    : scheduledAt,
                status: isApprovalWorkflow ? 'draft' : action === 'schedule' ? 'scheduled' : 'draft',
                needs_approval: isApprovalWorkflow ? true : false,
                submitted_by: isApprovalWorkflow
                    ? user?.email || user?.full_name || 'editor'
                    : undefined,
                is_demo: demoMode,
                auto_dm: autoDmConfig?.enabled ? autoDmConfig : undefined,
            };

            const saved = await appClient.posts.save({ id: existing?.id, data: payload });
            setExisting(saved);

            if (isApprovalWorkflow) {
                toast({
                    title: t('Đã gửi bài để phê duyệt!'),
                    description: t(
                        'Bài viết đã được gửi đến Quản trị viên/Người phê duyệt xét duyệt trước khi xuất bản.'
                    ),
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
                        notes: `${form.notes || ''}\n🔁 Đăng định kỳ: Kỳ 1/${totalCount} (${
                            recurringConfig.frequency
                        })`.trim(),
                    },
                });

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
                            notes: `${form.notes || ''}\n🔁 Đăng định kỳ: Kỳ ${cycleNum}/${totalCount} (${
                                recurringConfig.frequency
                            })`.trim(),
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
                        }).`
                    ),
                });
                navigate('/calendar');
                return;
            }

            toast({
                title: action === 'schedule' ? t('Đã lên lịch thành công!') : t('Đã lưu bản nháp!'),
                description:
                    action === 'schedule'
                        ? t(`Bài đăng đã được xếp lịch lúc ${form.date} ${form.time}`)
                        : undefined,
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
        return (
            selectedAccounts.find((a) => a.id === previewAccountId) ||
            selectedAccounts[0] ||
            connectedAccounts[0] ||
            null
        );
    }, [selectedAccounts, previewAccountId, connectedAccounts]);

    // Character counter for current active tab
    const currentTabLimit = currentTabAccount
        ? PLATFORM_CHAR_LIMITS[currentTabAccount.platform] || 63206
        : selectedAccounts.length > 0
        ? Math.min(...selectedAccounts.map((a) => PLATFORM_CHAR_LIMITS[a.platform] || 63206))
        : 63206;

    const currentTabCharCount =
        currentEditorValue.length + (PRESET_SIGNATURES[signatureKey]?.length || 0);

    return (
        <div className="w-full space-y-5 pb-32">
            {/* Vai trò Viewer / Approval Notice */}
            {isViewer && (
                <div className="panel flex items-center gap-3 border-amber-300 bg-amber-50 p-4 text-zinc-900">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-sm font-bold text-zinc-950">
                        👁️
                    </span>
                    <div className="text-xs">
                        <span className="font-bold text-amber-950">{t('Chế độ xem (Viewer):')}</span>{' '}
                        <span className="text-amber-900">
                            {t(
                                'Tài khoản của bạn có quyền Người xem. Các thao tác lưu nháp và xuất bản bị vô hiệu hóa.'
                            )}
                        </span>
                    </div>
                </div>
            )}

            {isEditorNeedingApproval && (
                <div className="panel flex items-center gap-3 border-blue-200 bg-blue-50/80 p-3.5 text-zinc-900">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-xs font-bold text-white">
                        ✍️
                    </span>
                    <div className="text-xs">
                        <span className="font-bold text-blue-950">{t('Quy trình kiểm duyệt (Approval):')}</span>{' '}
                        <span className="text-blue-900">
                            {t(
                                'Bài viết sau khi soạn sẽ được gửi cho Quản trị viên xét duyệt trước khi xuất bản.'
                            )}
                        </span>
                    </div>
                </div>
            )}

            {/* Đầu trang: Tiêu đề + Chuyển chế độ Đăng nhanh / Chiến lược + Nút tiện ích */}
            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-dark bg-brand text-brand-ink">
                        <PaperPlaneTilt size={20} weight="duotone" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                            <h1 className="truncate font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                {existing ? t('Chỉnh sửa bài viết') : t('Tạo bài viết')}
                            </h1>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/25">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                <span>{t('Đã lưu tự động')}</span>
                            </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {t('Soạn thảo đa kênh, tinh chỉnh nội dung riêng và kiểm tra hiển thị trực quan.')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Toggle Đăng nhanh vs Chiến lược */}
                    <div
                        role="group"
                        aria-label={t('Chế độ soạn thảo')}
                        className="inline-flex items-center rounded-xl border border-border bg-card p-1"
                    >
                        <button
                            type="button"
                            aria-pressed={isQuickPostMode}
                            onClick={() => handleToggleQuickPostMode(true)}
                            className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1 text-xs transition-colors ${
                                isQuickPostMode
                                    ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                    : 'font-medium text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Lightning size={14} weight="fill" />
                            <span>{t('Đăng nhanh')}</span>
                        </button>
                        <button
                            type="button"
                            aria-pressed={!isQuickPostMode}
                            onClick={() => handleToggleQuickPostMode(false)}
                            className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1 text-xs transition-colors ${
                                !isQuickPostMode
                                    ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                    : 'font-medium text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Target size={14} weight="bold" />
                            <span>{t('Chiến lược Pro')}</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsTemplatePickerOpen(true)}
                        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-zinc-100"
                    >
                        <Quotes size={14} weight="bold" className="text-brand-ink" />
                        <span>{t('Dùng mẫu')}</span>
                    </button>

                    {existing && (
                        <>
                            <button
                                type="button"
                                onClick={() => navigate(`/create?duplicate=${existing.id}`)}
                                title={t('Nhân bản bài viết')}
                                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-foreground"
                            >
                                <Copy size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeleteOpen(true)}
                                title={t('Xoá bài viết')}
                                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                            >
                                <Trash size={16} />
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Bố cục 2 Cột: Cột trái Studio soạn thảo (1fr) + Cột phải Live Mockup (420px) */}
            <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                {/* CỘT TRÁI: Studio soạn thảo */}
                <div className="min-w-0 space-y-4">
                    {/* KHỐI 1: Chọn Kênh phân phối & Thương hiệu */}
                    <section className="panel space-y-3.5 p-4 sm:p-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-dark/40 bg-brand-100 text-brand-ink">
                                    <Globe size={15} weight="bold" />
                                </span>
                                <h2 className="text-sm font-heading font-semibold text-foreground">
                                    {t('Kênh phân phối nội dung')}
                                </h2>
                                <span className="rounded-full border border-brand-dark/30 bg-brand-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-brand-ink">
                                    {selectedAccounts.length}/{connectedAccounts.length} {t('đã chọn')}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {brands.length > 1 && (
                                    <div className="w-44">
                                        <Select
                                            value={form.brand_id}
                                            onValueChange={(val) => applyBrand(val)}
                                        >
                                            <SelectTrigger
                                                aria-label={t('Chọn thương hiệu')}
                                                className="min-h-9 rounded-xl border-border bg-card text-xs font-medium"
                                            >
                                                <SelectValue placeholder={t('Chọn thương hiệu')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {brands.map((b) => (
                                                    <SelectItem key={b.id} value={b.id}>
                                                        {b.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <Link
                                    to="/accounts"
                                    className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-zinc-100"
                                >
                                    <Plus size={14} weight="bold" />
                                    <span>{t('Kết nối kênh')}</span>
                                </Link>
                            </div>
                        </div>

                        {/* Danh sách thẻ kênh mạng xã hội */}
                        {connectedAccounts.length === 0 ? (
                            <div className="rounded-xl border border-border bg-zinc-50 p-6 text-center">
                                <p className="text-sm text-muted-foreground">
                                    {t('Chưa có tài khoản mạng xã hội nào sẵn sàng trong không gian này.')}
                                </p>
                                <Link
                                    to="/accounts"
                                    className="mt-2 inline-flex items-center text-xs font-semibold text-brand-ink underline underline-offset-4"
                                >
                                    {t('Kết nối tài khoản ngay')}
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                                {connectedAccounts.map((account) => {
                                    const isSelected = form.account_ids.includes(account.id);
                                    const cfg =
                                        PLATFORM_CONFIG[account.platform] || {
                                            icon: Globe,
                                            color: 'text-zinc-600',
                                        };
                                    const PlatformIcon = cfg.icon;
                                    const avatarUrl = getAccountAvatarUrl(account);
                                    const initials = (account.name || account.platform)
                                        .slice(0, 2)
                                        .toUpperCase();

                                    return (
                                        <button
                                            key={account.id}
                                            type="button"
                                            onClick={() => toggleAccountSelection(account.id)}
                                            className={`flex cursor-pointer items-center justify-between gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
                                                isSelected
                                                    ? 'border-brand-dark bg-brand-50 text-brand-ink ring-1 ring-brand-dark/40'
                                                    : 'border-border bg-card text-muted-foreground hover:bg-zinc-50 hover:text-foreground'
                                            }`}
                                        >
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <div className="relative shrink-0">
                                                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-zinc-100 text-xs font-bold text-foreground">
                                                        {avatarUrl ? (
                                                            <img
                                                                src={avatarUrl}
                                                                alt=""
                                                                className="h-full w-full object-cover"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <span>{initials}</span>
                                                        )}
                                                    </div>
                                                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-card ring-1 ring-border">
                                                        <PlatformIcon
                                                            size={10}
                                                            weight="fill"
                                                            className={cfg.color}
                                                        />
                                                    </span>
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-semibold text-foreground">
                                                        {account.name}
                                                    </p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {account.handle || cfg.label || account.platform}
                                                    </p>
                                                </div>
                                            </div>

                                            <span
                                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                                    isSelected
                                                        ? 'border-brand-dark bg-brand text-brand-ink'
                                                        : 'border-border bg-card text-transparent'
                                                }`}
                                            >
                                                <Check size={11} weight="bold" />
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* KHỐI 2: Khung Soạn Thảo Đa Kênh (Main Composer Studio) */}
                    <div className="panel overflow-hidden transition focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand/20">
                        {/* Thanh Tab chọn kênh để tùy chỉnh nội dung */}
                        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border bg-zinc-50/70 p-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('default')}
                                className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1 text-xs transition-colors ${
                                    activeTab === 'default'
                                        ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                        : 'font-medium text-muted-foreground hover:bg-zinc-200/60 hover:text-foreground'
                                }`}
                            >
                                <Globe size={14} weight={activeTab === 'default' ? 'fill' : 'regular'} />
                                <span>{t('Nội dung chung')}</span>
                            </button>

                            {selectedAccounts.map((tab) => {
                                const isSelectedTab = activeTab === tab.id;
                                const isExceeded =
                                    !isSelectedTab &&
                                    getResolvedAccountText(tab).length >
                                        (PLATFORM_CHAR_LIMITS[tab.platform] || 63206);
                                const isCustomized =
                                    form.destination_settings[tab.id]?.caption !== undefined;
                                const cfg =
                                    PLATFORM_CONFIG[tab.platform] || {
                                        icon: Globe,
                                        color: 'text-zinc-600',
                                    };
                                const TabIcon = cfg.icon;

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setPreviewAccountId(tab.id);
                                        }}
                                        className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs transition-colors ${
                                            isSelectedTab
                                                ? 'bg-brand font-semibold text-brand-ink ring-1 ring-brand-dark/50'
                                                : 'font-medium text-muted-foreground hover:bg-zinc-200/60 hover:text-foreground'
                                        }`}
                                    >
                                        <TabIcon
                                            size={13}
                                            weight="fill"
                                            className={isSelectedTab ? 'text-brand-ink' : cfg.color}
                                        />
                                        <span className="max-w-[100px] truncate">{tab.name}</span>
                                        {isExceeded ? (
                                            <span
                                                className="h-1.5 w-1.5 rounded-full bg-red-600"
                                                title={t('Vượt giới hạn')}
                                            />
                                        ) : isCustomized ? (
                                            <span
                                                className="h-1.5 w-1.5 rounded-full bg-brand-dark"
                                                title={t('Đã tùy chỉnh')}
                                            />
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Banner thông báo khi xem tab kênh chưa tùy chỉnh */}
                        {currentTabAccount && !hasCustomCaption && (
                            <div className="flex items-center justify-between gap-3 border-b border-border/80 bg-brand-50/70 px-4 py-2 text-xs text-brand-ink">
                                <span>
                                    {t(
                                        'Kênh này đang thừa hưởng nội dung chung. Bật "Tùy chỉnh riêng" nếu muốn đổi câu chữ cho kênh này.'
                                    )}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => toggleCustomTab(true)}
                                    className="cursor-pointer whitespace-nowrap font-semibold underline underline-offset-4"
                                >
                                    {t('Tùy chỉnh riêng')}
                                </button>
                            </div>
                        )}

                        {currentTabAccount && hasCustomCaption && (
                            <div className="flex items-center justify-between gap-3 border-b border-border/80 bg-zinc-50 px-4 py-2 text-xs text-foreground">
                                <span className="font-medium">
                                    {t('Đang soạn bản nội dung độc lập cho')} <strong>{currentTabAccount.name}</strong>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => toggleCustomTab(false)}
                                    className="cursor-pointer whitespace-nowrap text-muted-foreground hover:text-foreground"
                                >
                                    {t('Khôi phục dùng chung')}
                                </button>
                            </div>
                        )}

                        {/* Textarea soạn thảo chính */}
                        <div className="p-4">
                            <textarea
                                ref={textareaRef}
                                value={currentEditorValue}
                                readOnly={Boolean(currentTabAccount && !hasCustomCaption)}
                                onChange={(e) => handleTextChange(e.target.value)}
                                rows={8}
                                placeholder={
                                    currentTabAccount && !hasCustomCaption
                                        ? ''
                                        : t('Viết nội dung bài đăng tại đây… Hỗ trợ gắn tag {platform} tự động thay thế tên kênh khi xuất bản.')
                                }
                                className={`block w-full resize-y bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground ${
                                    currentTabAccount && !hasCustomCaption
                                        ? 'cursor-default text-muted-foreground'
                                        : ''
                                }`}
                            />

                            {/* Khối chữ ký tự động (nếu có) */}
                            {signatureKey !== 'none' && PRESET_SIGNATURES[signatureKey] && (
                                <div className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-zinc-50 p-3 text-xs italic text-muted-foreground">
                                    {PRESET_SIGNATURES[signatureKey].trim()}
                                </div>
                            )}

                            {/* Dải ảnh / video đính kèm */}
                            {form.media.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2.5 border-t border-border pt-3">
                                    {form.media.map((asset, idx) => (
                                        <div
                                            key={asset.id || idx}
                                            className="group relative h-16 w-16 overflow-hidden rounded-xl border border-border bg-zinc-100"
                                        >
                                            <img
                                                src={asset.file_url || asset.url || asset.src}
                                                alt={asset.name || 'Attachment'}
                                                className="h-full w-full object-cover"
                                            />
                                            {idx === 0 && (
                                                <span className="absolute inset-x-0 bottom-0 bg-brand/95 py-0.5 text-center text-xs font-bold text-brand-ink">
                                                    {t('Bìa')}
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveMedia(idx)}
                                                className="absolute right-1 top-1 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Thanh công cụ Studio Toolbar */}
                        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-zinc-50/70 p-2.5">
                            <button
                                type="button"
                                onClick={() => setIsMediaDrawerOpen((p) => !p)}
                                className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
                                    isMediaDrawerOpen
                                        ? 'border-brand-dark bg-brand text-brand-ink font-semibold'
                                        : 'border-border bg-card text-foreground hover:bg-zinc-100'
                                }`}
                            >
                                <ImageSquare size={15} weight="duotone" />
                                <span>{t('Media')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsAiDrawerOpen((p) => !p)}
                                className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
                                    isAiDrawerOpen
                                        ? 'border-brand-dark bg-brand text-brand-ink font-semibold'
                                        : 'border-border bg-card text-foreground hover:bg-zinc-100'
                                }`}
                            >
                                <Sparkle
                                    size={15}
                                    weight="fill"
                                    className={isAiDrawerOpen ? 'text-brand-ink' : 'text-brand-ink'}
                                />
                                <span>{t('Trợ lý AI')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsAiRepurposeOpen(true)}
                                className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-brand-dark/50 bg-brand-50 px-3 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand-200"
                            >
                                <MagicWand size={15} weight="duotone" />
                                <span>{t('Tái sinh đa kênh')}</span>
                            </button>

                            <div className="h-4 w-px bg-border/80" />

                            {/* Formatting actions */}
                            <button
                                type="button"
                                onClick={() => applyTextTransform(toUnicodeBold)}
                                title={t('In đậm')}
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-zinc-100 hover:text-foreground"
                            >
                                <TextB size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={() => applyTextTransform(toUnicodeUnderline)}
                                title={t('Gạch chân')}
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-zinc-100 hover:text-foreground"
                            >
                                <TextUnderline size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={() => insertTextAtCursor('✨')}
                                title={t('Chèn emoji')}
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-zinc-100 hover:text-foreground"
                            >
                                <span>✨</span>
                            </button>

                            <div className="h-4 w-px bg-border/80" />

                            {/* Preset signatures */}
                            <div className="w-36">
                                <Select value={signatureKey} onValueChange={setSignatureKey}>
                                    <SelectTrigger className="min-h-8 rounded-lg border-border bg-card text-xs">
                                        <SelectValue placeholder={t('Chữ ký')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t('Không chữ ký')}</SelectItem>
                                        <SelectItem value="brand">{t('Thương hiệu')}</SelectItem>
                                        <SelectItem value="contact">{t('Kêu gọi liên hệ')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Bộ đếm ký tự chuẩn hairline */}
                            <div className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap tabular-nums text-xs font-medium text-muted-foreground">
                                {currentTabCharCount > currentTabLimit && (
                                    <WarningCircle size={15} className="text-red-600" />
                                )}
                                <span
                                    className={
                                        currentTabCharCount > currentTabLimit
                                            ? 'font-semibold text-red-600'
                                            : ''
                                    }
                                >
                                    {currentTabCharCount.toLocaleString('vi-VN')} /{' '}
                                    {currentTabLimit.toLocaleString('vi-VN')}
                                </span>
                            </div>
                        </div>

                        {/* Drawer đính kèm media inline */}
                        {isMediaDrawerOpen && (
                            <div className="border-t border-border bg-zinc-50 p-4">
                                <div className="mb-3 flex items-center justify-between text-xs">
                                    <span className="font-semibold text-foreground">
                                        {t('Tải lên hoặc chọn từ thư viện')} ({form.media.length}/10 {t('tệp')})
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-brand-dark bg-brand px-3 py-1 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand-200 disabled:opacity-50"
                                    >
                                        {uploading ? t('Đang tải…') : t('Tải tệp từ máy tính')}
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept="image/*,video/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </div>

                                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                                    {mediaLibrary.slice(0, 16).map((asset) => {
                                        const isSelected = form.media.some((m) => m.id === asset.id);
                                        return (
                                            <button
                                                key={asset.id}
                                                type="button"
                                                onClick={() => handleToggleMedia(asset)}
                                                className={`group relative aspect-square overflow-hidden rounded-xl border transition-colors ${
                                                    isSelected
                                                        ? 'border-brand-dark ring-2 ring-brand'
                                                        : 'border-border bg-card hover:border-brand-dark/50'
                                                }`}
                                            >
                                                <img
                                                    src={asset.file_url || asset.url}
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                />
                                                {isSelected && (
                                                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-brand-ink font-bold">
                                                        <Check size={10} weight="bold" />
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Drawer Trợ lý AI inline */}
                        {isAiDrawerOpen && (
                            <div className="border-t border-border bg-brand-50/50 p-4">
                                <div className="mb-2 flex items-center justify-between text-xs">
                                    <span className="font-semibold text-brand-ink">
                                        {t('Gợi ý xử lý nhanh với Trợ lý AI')}
                                    </span>
                                    {aiBusy && (
                                        <span className="inline-flex items-center gap-1 font-medium text-brand-ink">
                                            <ArrowsClockwise size={13} className="animate-spin" />
                                            <span>{t('Đang suy nghĩ…')}</span>
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {[
                                        { id: 'outline', label: t('Gợi ý dàn ý theo chủ đề') },
                                        { id: 'hook', label: t('Viết lại câu mở đầu hấp dẫn') },
                                        { id: 'hashtags', label: t('Chèn 5 hashtag thịnh hành') },
                                        { id: 'shorten_x', label: t('Rút gọn vừa 280 ký tự') },
                                        { id: 'repurpose', label: t('Mở hộp thoại tái sinh đa kênh') },
                                    ].map((chip) => (
                                        <button
                                            key={chip.id}
                                            type="button"
                                            disabled={aiBusy}
                                            onClick={() => handleAiChip(chip.id)}
                                            className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-brand-dark/40 bg-card px-3 py-1 text-xs font-medium text-brand-ink transition-colors hover:bg-brand-100 disabled:opacity-50"
                                        >
                                            <Sparkle size={13} weight="fill" />
                                            <span>{chip.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* KHỐI 3: Bình luận ghim đầu tiên (First Comment / Pin link) */}
                    <section className="panel space-y-3 p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-zinc-100 text-foreground">
                                    <Quotes size={15} weight="duotone" />
                                </span>
                                <div>
                                    <h3 className="text-sm font-heading font-semibold text-foreground">
                                        {t('Bình luận đầu tiên (Ghim link)')}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {t('Tự động bình luận ngay sau khi đăng bài để chống bóp tương tác.')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <input
                            type="text"
                            value={firstCommentMessage}
                            onChange={(e) => handleFirstCommentChange(e.target.value)}
                            placeholder={t('Ví dụ: Xem chi tiết sản phẩm và nhận ưu đãi tại: https://...')}
                            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-brand-dark focus:ring-1 focus:ring-brand-dark"
                        />
                    </section>

                    {/* KHỐI 4: Tiện ích mở rộng theo dạng Thẻ xếp lớp (Collapsible Cards) */}
                    <div className="space-y-3">
                        {/* Tab Tiện ích 1: Chiến lược nội dung (Pillar, Angle, Campaign) */}
                        {!isQuickPostMode && (
                            <section className="panel overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpandedTool((prev) => (prev === 'strategy' ? null : 'strategy'))
                                    }
                                    className="flex w-full cursor-pointer items-center justify-between p-4 text-left transition-colors hover:bg-zinc-50"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-zinc-100 text-foreground">
                                            <Target size={15} weight="duotone" />
                                        </span>
                                        <div>
                                            <h3 className="text-sm font-heading font-semibold text-foreground">
                                                {t('Chiến lược nội dung & Chiến dịch')}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                {form.pillar_id
                                                    ? `${brandPillars.find((p) => p.id === form.pillar_id)?.name || ''}`
                                                    : t('Gắn bài viết vào trụ cột và góc tiếp cận để phân tích hiệu suất')}
                                            </p>
                                        </div>
                                    </div>
                                    <CaretDown
                                        size={16}
                                        className={`text-muted-foreground transition-transform ${
                                            expandedTool === 'strategy' ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>

                                {expandedTool === 'strategy' && (
                                    <div className="grid grid-cols-1 gap-3.5 border-t border-border p-4 sm:grid-cols-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                                {t('Chiến dịch')}
                                            </label>
                                            <Select
                                                value={form.campaign_id || '__none__'}
                                                onValueChange={(val) =>
                                                    handleCampaignChange(val === '__none__' ? '' : val)
                                                }
                                            >
                                                <SelectTrigger className="min-h-9 rounded-xl border-border bg-card text-xs">
                                                    <SelectValue placeholder={t('Chọn chiến dịch')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">
                                                        {t('Không thuộc chiến dịch')}
                                                    </SelectItem>
                                                    {brandCampaigns.map((c) => (
                                                        <SelectItem key={c.id} value={c.id}>
                                                            {c.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                                {t('Trụ cột nội dung')}
                                            </label>
                                            <Select
                                                value={form.pillar_id || '__none__'}
                                                onValueChange={(val) =>
                                                    setForm((p) => ({
                                                        ...p,
                                                        pillar_id: val === '__none__' ? '' : val,
                                                        angle_id: '',
                                                    }))
                                                }
                                            >
                                                <SelectTrigger className="min-h-9 rounded-xl border-border bg-card text-xs">
                                                    <SelectValue placeholder={t('Chọn trụ cột')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">
                                                        {t('Chưa phân loại')}
                                                    </SelectItem>
                                                    {brandPillars.map((p) => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            {p.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                                {t('Góc tiếp cận')}
                                            </label>
                                            <Select
                                                value={form.angle_id || '__none__'}
                                                disabled={!form.pillar_id}
                                                onValueChange={(val) =>
                                                    setForm((p) => ({
                                                        ...p,
                                                        angle_id: val === '__none__' ? '' : val,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger className="min-h-9 rounded-xl border-border bg-card text-xs">
                                                    <SelectValue
                                                        placeholder={
                                                            form.pillar_id
                                                                ? t('Chọn góc khai thác')
                                                                : t('Chọn trụ cột trước')
                                                        }
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">
                                                        {t('Chưa phân loại')}
                                                    </SelectItem>
                                                    {brandAngles.map((a) => (
                                                        <SelectItem key={a.id} value={a.id}>
                                                            {a.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Tab Tiện ích 2: Bộ tạo UTM & Link rút gọn */}
                        <section className="panel overflow-hidden">
                            <button
                                type="button"
                                onClick={() =>
                                    setExpandedTool((prev) => (prev === 'utm' ? null : 'utm'))
                                }
                                className="flex w-full cursor-pointer items-center justify-between p-4 text-left transition-colors hover:bg-zinc-50"
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-zinc-100 text-foreground">
                                        <LinkSimple size={15} weight="bold" />
                                    </span>
                                    <div>
                                        <h3 className="text-sm font-heading font-semibold text-foreground">
                                            {t('Bộ tạo UTM & Đo lường nhấp chuột (Shortlink)')}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {t('Tự động gắn mã UTM và theo dõi chuyển đổi về website')}
                                        </p>
                                    </div>
                                </div>
                                <CaretDown
                                    size={16}
                                    className={`text-muted-foreground transition-transform ${
                                        expandedTool === 'utm' ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>

                            {expandedTool === 'utm' && (
                                <div className="space-y-3.5 border-t border-border p-4">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-foreground">
                                            {t('URL trang đích')}
                                        </label>
                                        <input
                                            type="text"
                                            value={utmForm.url}
                                            onChange={(e) => setUtmForm({ ...utmForm, url: e.target.value })}
                                            placeholder={detectedUrlInCaption || 'https://yourwebsite.com/landing-page'}
                                            className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground outline-none transition focus:border-brand-dark"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                                {t('Nguồn (Source)')}
                                            </label>
                                            <input
                                                type="text"
                                                value={utmForm.source}
                                                onChange={(e) =>
                                                    setUtmForm({ ...utmForm, source: e.target.value })
                                                }
                                                placeholder="{platform}"
                                                className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground outline-none transition focus:border-brand-dark"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                                {t('Phương tiện (Medium)')}
                                            </label>
                                            <input
                                                type="text"
                                                value={utmForm.medium}
                                                onChange={(e) =>
                                                    setUtmForm({ ...utmForm, medium: e.target.value })
                                                }
                                                placeholder="social"
                                                className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground outline-none transition focus:border-brand-dark"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                                {t('Chiến dịch (Campaign)')}
                                            </label>
                                            <input
                                                type="text"
                                                value={utmForm.campaign}
                                                onChange={(e) =>
                                                    setUtmForm({ ...utmForm, campaign: e.target.value })
                                                }
                                                placeholder="flash_sale_t11"
                                                className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground outline-none transition focus:border-brand-dark"
                                            />
                                        </div>
                                    </div>

                                    {generatedUtmUrl && (
                                        <div className="flex flex-col gap-2 rounded-xl border border-brand-dark/40 bg-brand-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0">
                                                <p className="truncate font-mono text-xs font-medium text-brand-ink">
                                                    {displayUtmShortUrl}
                                                </p>
                                                <p className="truncate font-mono text-xs text-muted-foreground">
                                                    → {displayUtmTargetUrl}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={applyUtmToDraft}
                                                className="inline-flex min-h-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-brand-dark bg-brand px-3 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand-200"
                                            >
                                                {t('Gắn vào bài viết')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* Tab Tiện ích 3: Hẹn giờ lặp lại thông minh */}
                        <section className="panel overflow-hidden">
                            <button
                                type="button"
                                onClick={() =>
                                    setExpandedTool((prev) => (prev === 'recurring' ? null : 'recurring'))
                                }
                                className="flex w-full cursor-pointer items-center justify-between p-4 text-left transition-colors hover:bg-zinc-50"
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-zinc-100 text-foreground">
                                        <CalendarBlank size={15} weight="duotone" />
                                    </span>
                                    <div>
                                        <h3 className="text-sm font-heading font-semibold text-foreground">
                                            {t('Đăng định kỳ & Tự động tái chế')}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {recurringConfig.enabled
                                                ? t('Đang bật chuỗi {n} bài ({freq})', {
                                                      n: recurringConfig.count,
                                                      freq: recurringConfig.frequency,
                                                  })
                                                : t('Thiết lập bài viết phát sóng lặp lại theo tuần hoặc tháng')}
                                        </p>
                                    </div>
                                </div>
                                <CaretDown
                                    size={16}
                                    className={`text-muted-foreground transition-transform ${
                                        expandedTool === 'recurring' ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>

                            {expandedTool === 'recurring' && (
                                <div className="border-t border-border p-4">
                                    <RecurringSchedulePanel
                                        config={recurringConfig}
                                        onChange={setRecurringConfig}
                                        startDate={form.date}
                                        startTime={form.time}
                                        timezone={form.timezone}
                                        disabled={isViewer}
                                    />
                                </div>
                            )}
                        </section>

                        {/* Tab Tiện ích 4: Auto-DM khi bình luận */}
                        <section className="panel overflow-hidden">
                            <button
                                type="button"
                                onClick={() =>
                                    setExpandedTool((prev) => (prev === 'autodm' ? null : 'autodm'))
                                }
                                className="flex w-full cursor-pointer items-center justify-between p-4 text-left transition-colors hover:bg-zinc-50"
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-zinc-100 text-foreground">
                                        <PaperPlaneTilt size={15} weight="bold" />
                                    </span>
                                    <div>
                                        <h3 className="text-sm font-heading font-semibold text-foreground">
                                            {t('Tự động gửi tin nhắn riêng (Auto-DM)')}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {autoDmConfig?.enabled
                                                ? t('Đang bật theo dõi từ khóa: {kw}', {
                                                      kw: autoDmConfig.keywords.join(', '),
                                                  })
                                                : t('Tự động inbox khi khách để lại từ khóa hoặc bình luận')}
                                        </p>
                                    </div>
                                </div>
                                <CaretDown
                                    size={16}
                                    className={`text-muted-foreground transition-transform ${
                                        expandedTool === 'autodm' ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>

                            {expandedTool === 'autodm' && (
                                <div className="border-t border-border p-4">
                                    <AutoDmSettingsPanel
                                        config={autoDmConfig}
                                        onChange={setAutoDmConfig}
                                        disabled={isViewer}
                                    />
                                </div>
                            )}
                        </section>

                        {/* Tab Tiện ích 5: Tiếp thị liên kết (TikTok Shop & Shopee) */}
                        <section className="panel overflow-hidden">
                            <button
                                type="button"
                                onClick={() =>
                                    setExpandedTool((prev) => (prev === 'affiliate' ? null : 'affiliate'))
                                }
                                className="flex w-full cursor-pointer items-center justify-between p-4 text-left transition-colors hover:bg-zinc-50"
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-zinc-100 text-foreground">
                                        <Sparkle size={15} weight="fill" />
                                    </span>
                                    <div>
                                        <h3 className="text-sm font-heading font-semibold text-foreground">
                                            {t('Sản phẩm TikTok Shop & Shopee Affiliate')}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {t('Gắn link sản phẩm hoa hồng và kịch bản bán hàng')}
                                        </p>
                                    </div>
                                </div>
                                <CaretDown
                                    size={16}
                                    className={`text-muted-foreground transition-transform ${
                                        expandedTool === 'affiliate' ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>

                            {expandedTool === 'affiliate' && (
                                <div className="space-y-4 border-t border-border p-4">
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
                                            });
                                        }}
                                    />

                                    <ShopeeProductPicker
                                        brandId={form.brand_id || selectedBrandId}
                                        selectedProduct={shopeeProduct}
                                        onSelectProduct={setShopeeProduct}
                                        onInsertLink={(script) => {
                                            setForm((prev) => ({
                                                ...prev,
                                                caption: prev.caption ? `${prev.caption}\n\n${script}` : script,
                                            }));
                                            toast({ title: t('Đã chèn kịch bản Shopee Affiliate!') });
                                        }}
                                        onInsertFirstComment={(commentText) => {
                                            handleFirstCommentChange(commentText);
                                            toast({
                                                title: t('Đã chèn vào Bình luận đầu tiên!'),
                                            });
                                        }}
                                    />
                                </div>
                            )}
                        </section>
                    </div>
                </div>

                {/* CỘT PHẢI: Khung xem trước trực tiếp (Live Mockup) & Checklist */}
                <aside className="sticky top-4 space-y-4">
                    {/* Thẻ xem trước trực tiếp */}
                    <section className="panel space-y-3.5 p-4 sm:p-5">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-dark/40 bg-brand-100 text-brand-ink">
                                    <ImageSquare size={15} weight="duotone" />
                                </span>
                                <div>
                                    <h2 className="text-sm font-heading font-semibold text-foreground">
                                        {t('Xem trước trực quan')}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        {t('Mô phỏng hiển thị thật trên từng mạng xã hội')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Switcher các kênh đã chọn để xem trước */}
                        {selectedAccounts.length > 0 && (
                            <div className="flex gap-1.5 overflow-x-auto pb-1">
                                {selectedAccounts.map((account) => {
                                    const isCurrent =
                                        (currentPreviewAccount?.id || selectedAccounts[0]?.id) === account.id;
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
                                            className={`inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors ${
                                                isCurrent
                                                    ? 'border-brand-dark bg-brand font-semibold text-brand-ink'
                                                    : 'border-border bg-card text-muted-foreground hover:bg-zinc-100 hover:text-foreground'
                                            }`}
                                        >
                                            <PlatformLogo platform={account.platform} className="h-3.5 w-3.5" />
                                            <span className="max-w-[90px] truncate">{account.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Khung mô phỏng mạng xã hội */}
                        <div className="min-h-[360px] rounded-2xl border border-border bg-zinc-50/70 p-3.5">
                            {currentPreviewAccount ? (
                                <SocialMockupPreview
                                    account={currentPreviewAccount}
                                    text={
                                        getResolvedAccountText(currentPreviewAccount) ||
                                        t('Nội dung bài viết sẽ xuất hiện tại đây theo thời gian thực…')
                                    }
                                    media={form.media}
                                    when={t('Vừa xong')}
                                    tiktokProduct={tiktokProduct}
                                />
                            ) : (
                                <div className="flex min-h-[320px] flex-col items-center justify-center p-6 text-center">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-muted-foreground">
                                        <ImageSquare size={20} />
                                    </span>
                                    <p className="mt-3 text-sm font-semibold text-foreground">
                                        {selectedAccounts.length > 0
                                            ? t('Nhập nội dung để xem trước')
                                            : t('Chọn kênh đăng để xem trước')}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {t('Hiển thị giao diện Facebook, TikTok, LinkedIn…')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Thẻ Checklist kiểm tra trước khi xuất bản */}
                    <section className="panel space-y-3 p-4">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">
                                {t('Kiểm tra trước khi xuất bản')}
                            </span>
                            <span className="rounded-md border border-brand-dark/40 bg-brand-100 px-2 py-0.5 font-mono text-xs font-bold text-brand-ink">
                                {checklistPassedCount}/{checklistItems.length}
                            </span>
                        </div>

                        {/* Thanh tiến độ vàng */}
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                            <div
                                className="h-full rounded-full bg-brand-dark transition-all duration-300"
                                style={{
                                    width: `${(checklistPassedCount / checklistItems.length) * 100}%`,
                                }}
                            />
                        </div>

                        <ul className="space-y-2">
                            {checklistItems.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-xs">
                                    {item.ok ? (
                                        <CheckCircle
                                            size={15}
                                            weight="fill"
                                            className="mt-0.5 shrink-0 text-emerald-600"
                                        />
                                    ) : (
                                        <WarningCircle
                                            size={15}
                                            weight="duotone"
                                            className="mt-0.5 shrink-0 text-amber-700"
                                        />
                                    )}
                                    <span
                                        className={
                                            item.ok
                                                ? 'text-muted-foreground line-through'
                                                : 'font-medium text-foreground'
                                        }
                                    >
                                        {item.label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                </aside>
            </div>

            {/* THANH ĐIỀU KHIỂN DÍNH CUỐI TRANG (Sticky Bottom Action Bar) */}
            <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-brand-dark/40 bg-card/95 p-3.5 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={isViewer || saving}
                        onClick={() => submit('draft')}
                        className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-zinc-100 disabled:opacity-50"
                    >
                        <FloppyDisk size={16} weight="duotone" />
                        <span>{t('Lưu bản nháp')}</span>
                    </button>

                    <SaveTemplateDialog
                        form={form}
                        demoMode={demoMode}
                        disabled={isViewer || saving || uploading || loading}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Hẹn giờ phát hành */}
                    <div className="flex min-h-10 items-center gap-2 rounded-xl border border-border bg-zinc-50 px-3 py-1 text-xs text-foreground">
                        <CalendarBlank size={15} className="shrink-0 text-muted-foreground" />
                        <input
                            type="date"
                            value={form.date}
                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                            className="min-h-[32px] bg-transparent font-medium outline-none cursor-pointer"
                        />
                        <span className="text-muted-foreground">·</span>
                        <input
                            type="time"
                            value={form.time}
                            onChange={(e) => setForm({ ...form, time: e.target.value })}
                            className="min-h-[32px] bg-transparent font-medium outline-none cursor-pointer"
                        />
                    </div>

                    {/* Nút hành động chính (.btn-skew) */}
                    <button
                        type="button"
                        disabled={!canSubmit || saving}
                        onClick={() => submit('schedule')}
                        className="btn-skew min-h-10 shrink-0 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <CalendarBlank size={16} weight="bold" />
                        <span>{saving ? t('Đang lưu…') : t('Lên lịch phát hành')}</span>
                    </button>

                    <button
                        type="button"
                        disabled={!canSubmit || saving}
                        onClick={() => submit('publish')}
                        className="inline-flex min-h-10 shrink-0 whitespace-nowrap cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <PaperPlaneTilt size={15} weight="bold" />
                        <span>{t('Đăng ngay')}</span>
                    </button>
                </div>
            </div>

            {/* Modal xác nhận xuất bản ngay (PublishConfirmation) */}
            {publishReview && (
                <PublishConfirmation
                    review={publishReview}
                    onClose={() => setPublishReview(null)}
                    onResult={(result) => {
                        setPublishReview(null);
                        toast({
                            title: t('Đã xuất bản bài viết thành công!'),
                            description: t('Các kênh đã tiếp nhận bài đăng.'),
                        });
                        navigate('/posts');
                    }}
                />
            )}

            {/* Hộp thoại xác nhận xoá bài */}
            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={t('Xoá bài viết')}
                description={t('Bạn có chắc chắn muốn xoá bài viết này? Hành động này không thể hoàn tác.')}
                onConfirm={remove}
            />

            {/* Hộp thoại Dùng Mẫu bài viết */}
            <UseTemplateDialog
                brandId={form.brand_id}
                demoMode={demoMode}
                disabled={isViewer || saving || uploading || loading}
                open={isTemplatePickerOpen}
                onOpenChange={setIsTemplatePickerOpen}
                trigger={() => null}
                onSelect={(template) => {
                    setForm((prev) => ({
                        ...prev,
                        title: template.title || prev.title,
                        caption: template.caption || prev.caption,
                    }));
                    toast({ title: t('Đã áp dụng mẫu bài viết!') });
                }}
            />

            {/* Hộp thoại Tái sinh đa kênh với AI */}
            <AiRepurposeDialog
                open={isAiRepurposeOpen}
                onOpenChange={setIsAiRepurposeOpen}
                sourceText={currentEditorValue || form.caption}
                sourceMedia={form.media}
                selectedAccounts={selectedAccounts}
                brandId={form.brand_id}
                onApply={handleApplyRepurposedCaptions}
            />
        </div>
    );
}
