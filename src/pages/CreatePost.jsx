import SaveTemplateDialog from '@/components/composer/save-template-dialog';
import TiktokSettings from '@/components/composer/TiktokSettings';
import PublishConfirmation from '@/components/posts/PublishConfirmation';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    FloppyDisk,
    PaperPlaneTilt,
    Trash,
    Copy,
    WarningCircle,
    CalendarBlank,
    Sparkle,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import PlatformMedia from '@/components/composer/platform-media';
import MediaUploader from '@/components/composer/MediaUploader';
import PillarAngleFields from '@/components/composer/PillarAngleFields';
import ScheduleFields from '@/components/composer/ScheduleFields';
import PostPreview from '@/components/composer/PostPreview';
import PageSettings from '@/components/composer/PageSettings';
import PlatformCaptions from '@/components/composer/PlatformCaptions';
import DestinationChecks from '@/components/composer/DestinationChecks';
import { PUBLISHING_PLATFORMS, destinationIssues, resolveMedia, referencedMediaIds } from '@/lib/publishing-content';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import DesktopAiWriter from '@/components/composer/desktop-ai-writer';
import { applyAiSuggestion, applyAiPlatformSuggestion } from '@/lib/ai-draft';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import PlatformLogo from '@/components/composer/PlatformLogo';

import { toUtcIso, toZonedParts, localInputDefault } from '@/lib/tz';
import { DEFAULT_TIMEZONE, PLATFORM_LABEL } from '@/lib/constants';

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
});

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
    const [aiModel, setAiModel] = useState('gemini');

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [accountPage, pillarPage, anglePage] = await Promise.all([
                    appClient.entities.SocialAccount.filter({ is_demo: demoMode }, { sort: 'name', limit: 300 }),
                    appClient.entities.ContentPillar.filter({ is_demo: demoMode, ...(desktop ? {} : { status: 'active' }) }, { sort: 'name', limit: 300 }),
                    appClient.entities.ContentAngle.filter({ is_demo: demoMode, ...(desktop ? {} : { status: 'active' }) }, { sort: 'name', limit: 500 }),
                ]);
                if (!active) return;
                setAccounts(accountPage.items);
                setPillars(pillarPage.items);
                setAngles(anglePage.items);
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

    const applyBrand = useCallback(
        (brandId) => {
            const preset = localInputDefault(brands.find((brand) => brand.id === brandId)?.timezone || DEFAULT_TIMEZONE);
            setForm((prev) => ({
                ...prev,
                brand_id: brandId,
                account_ids: [],
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

    useEffect(() => {
        if (loading) return;
        if (!sourceId) {
            setExisting(null);
            setSourceLoading(false);
            setForm(emptyForm(selectedBrandId === 'all' ? '' : selectedBrandId));
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
                            const parts = toZonedParts(setting.scheduled_at, post.timezone || DEFAULT_TIMEZONE);
                            return [
                                id,
                                {
                                    tiktok: setting.tiktok,
                                    caption: setting.caption || '',
                                    localTime: setting.scheduled_at ? parts.date + 'T' + parts.time : '',
                                },
                            ];
                        })
                    ),
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

    const brandAccounts = useMemo(() => accounts.filter((a) => a.brand_id === form.brand_id), [accounts, form.brand_id]);
    const brandPillars = useMemo(() => pillars.filter((p) => p.brand_id === form.brand_id && (p.status === 'active' || p.id === existing?.pillar_id)), [pillars, form.brand_id, existing]);
    const brandAngles = useMemo(() => angles.filter((a) => a.brand_id === form.brand_id && (a.status === 'active' || a.id === existing?.angle_id)), [angles, form.brand_id, existing]);
    const selectedAccounts = useMemo(() => accounts.filter((a) => form.account_ids.includes(a.id)), [accounts, form.account_ids]);
    const brand = brands.find((b) => b.id === form.brand_id);
    const scheduledAt = form.date && form.time ? toUtcIso(form.date, form.time, form.timezone) : null;
    const platforms = [...new Set(selectedAccounts.map((account) => account.platform))].filter((platform) => PUBLISHING_PLATFORMS.includes(platform));
    const checks = selectedAccounts.map((account) => ({
        account,
        issues: destinationIssues(form, account, resolveMedia(form, account), demoMode, tiktokCreators[account.id]),
    }));

    const connectedAccounts = useMemo(() => {
        return brandAccounts.filter((a) => {
            if (!PUBLISHING_PLATFORMS.includes(a.platform)) return false;
            if (desktop || demoMode) {
                return a.connection_status !== 'disconnected' && a.connection_status !== 'archived';
            }
            return a.connection_status === 'connected' || a.connection_status === 'demo';
        });
    }, [brandAccounts, desktop, demoMode]);

    // Toggle destination account selection
    const toggleAccount = (accountId) => {
        setForm((prev) => {
            const isSelected = prev.account_ids.includes(accountId);
            return {
                ...prev,
                account_ids: isSelected
                    ? prev.account_ids.filter((id) => id !== accountId)
                    : [...prev.account_ids, accountId],
            };
        });
    };

    const warnings = [];
    if (selectedAccounts.some((a) => a.platform === 'instagram')) warnings.push(t('Instagram uses one JPEG photo or one MP4 Reel with a caption up to 2200 characters.'));
    if (selectedAccounts.some((a) => a.platform === 'linkedin')) warnings.push(t('LinkedIn supports up to 3000 characters, JPEG/PNG images or one MP4 video up to 30 MiB. Posts are public.'));
    if (selectedAccounts.some((a) => a.platform === 'threads')) warnings.push(t('Threads supports text or one photo/video, with a caption up to 500 characters.'));
    if (selectedAccounts.length && selectedAccounts.every((a) => a.connection_status !== 'connected')) {
        warnings.push(t('These destinations are planning references. Connect a publishing account before publishing.'));
    }
    if (selectedAccounts.some((a) => !['facebook', 'instagram', 'threads', 'tiktok', 'linkedin'].includes(a.platform))) {
        warnings.push(t('Publishing supports connected Facebook, Instagram, Threads, TikTok and LinkedIn accounts.'));
    }
    if (form.account_ids.length > 30) warnings.push(t('Choose between 1 and 30 different publishing accounts'));
    if (!form.pillar_id || !form.angle_id) {
        warnings.push(t('Assign a pillar and an angle so this post counts towards your distribution targets.'));
    }

    const validate = (action) => {
        if (!form.brand_id) return t('Choose the brand this post belongs to.');
        if (!form.title.trim()) return t('Add an internal title so the post is easy to find later.');
        if (!form.caption.trim() && (!desktop || (action !== 'draft' && !form.media.length))) return t(desktop ? 'Add a caption or media before scheduling' : 'The main caption cannot be empty.');
        if (desktop) {
            if (action === 'publish') return t('Publishing is not included in this desktop prototype. No posts are sent.');
            if (action === 'schedule') {
                if (!scheduledAt) return t('Set the publishing date and time.');
                const local = toZonedParts(scheduledAt, form.timezone);
                if (local.date !== form.date || local.time !== form.time) return t('Choose a valid local time in this timezone.');
            }
            return null;
        }
        if (action !== 'draft' && !form.account_ids.length) return t('Select at least one destination to publish to.');
        if (['publish', 'schedule'].includes(action) && (form.account_ids.length > 30 || form.media.length > 10)) return t('Choose between 1 and 30 different publishing accounts');
        if (['publish', 'schedule'].includes(action) && !demoMode) {
            const failed = checks.find((check) => check.issues.length);
            if (failed) return `${failed.account.name}: ${t(failed.issues[0])}`;
        }
        if (action === 'schedule' && existing?.status === 'scheduled' && !demoMode) return t('Open the post details to confirm or cancel its existing schedule.');
        if (action === 'schedule' && !scheduledAt) return t('Set the publishing date and time.');
        if (action === 'schedule') {
            for (const account of selectedAccounts) {
                const localTime = form.destination_settings[account.id]?.localTime;
                const [date, time] = localTime?.split('T') || [];
                const instant = localTime ? toUtcIso(date, time, form.timezone) : scheduledAt;
                if (!instant || Date.parse(instant) < Date.now() + 60000) return `${account.name}: ${t('Choose a publishing time at least one minute in the future')}`;
            }
        }
        return null;
    };

    const submit = async (action) => {
        const error = validate(action);
        if (error) {
            toast({ variant: 'destructive', title: t('Cannot save yet'), description: error });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                brand_id: form.brand_id,
                title: form.title.trim(),
                caption: form.caption,
                platform_captions: Object.fromEntries(Object.entries(form.platform_captions).filter(([, caption]) => caption.trim())),
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
                            },
                        ];
                    })
                ),
                media_ids: form.media.map((asset) => asset.id),
                platform_media_ids: Object.fromEntries(Object.entries(form.platform_media).map(([platform, assets]) => [platform, assets.map((asset) => asset.id)])),
                account_ids: form.account_ids,
                pillar_id: form.pillar_id || '',
                angle_id: form.angle_id || '',
                timezone: form.timezone,
                scheduled_at: action === 'publish' || (desktop && action === 'draft') ? null : scheduledAt,
                status: action === 'schedule' && (demoMode || desktop) ? 'scheduled' : 'draft',
                is_demo: demoMode,
            };

            const saved = await appClient.posts.save({ id: existing?.id, data: payload });
            setExisting(saved);
            if (!desktop && (action === 'publish' || (action === 'schedule' && !demoMode))) {
                setPublishReview(action === 'schedule' ? await appClient.publishing.prepareSchedule(saved.id, scheduledAt, form.timezone) : await appClient.publishing.prepare(saved.id));
                return;
            }
            toast({
                title: action === 'draft' ? t('Draft saved') : t('Calendar plan saved'),
                description:
                    action === 'draft'
                        ? t('Find it again from All Posts.')
                        : t('Calendar plan saved for {value1} {value2} ({value3}). Automatic publishing is not configured.', {
                              value1: form.date,
                              value2: form.time,
                              value3: form.timezone,
                          }),
            });
            navigate(`/posts?post=${saved.id}`);
        } catch (error) {
            toast({ variant: 'destructive', title: t('Could not save post'), description: t(error.message) });
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        if (existing.status !== 'draft' && !(desktop && existing.status === 'cancelled')) throw new Error(t('Only drafts can be deleted. Cancel calendar plans instead.'));
        await appClient.entities.Post.delete(existing.id);
        toast({ title: t('Post deleted') });
        navigate('/posts');
    };

    if (loadError)
        return (
            <div role="alert" className="panel p-5">
                <p>{t(loadError)}</p>
                <Button variant="outline" className="mt-3" onClick={() => window.location.reload()}>
                    {t('Retry')}
                </Button>
            </div>
        );

    if (loading || sourceLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48 rounded-xl" />
                <div className="composer-shell">
                    <div className="composer-columns grid gap-6">
                        <Skeleton className="h-[520px] rounded-2xl" />
                        <Skeleton className="h-[420px] rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="composer-shell w-full pb-16">
            {/* Top Breadcrumbs & Page Header */}
            <div className="mb-6">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {t('CONTENT')} / {t('CREATE POST')}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="font-heading text-2xl font-bold text-foreground">
                            {existing ? t('Edit post') : t('Create Post')}
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {t('Compose once, choose platforms, schedule — all in one view.')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/50">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {t('Auto-saved')}
                        </span>

                        {existing && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-xl text-xs gap-1"
                                    onClick={() => navigate(`/create?duplicate=${existing.id}`)}
                                >
                                    <Copy size={13} />
                                    <span>{t('Duplicate')}</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 rounded-xl text-xs text-dangerFg hover:text-dangerFg gap-1"
                                    disabled={existing.status !== 'draft' && !(desktop && existing.status === 'cancelled')}
                                    onClick={() => setDeleteOpen(true)}
                                >
                                    <Trash size={13} />
                                    <span>{t('Delete')}</span>
                                </Button>
                            </>
                        )}

                        <SaveTemplateDialog form={form} demoMode={demoMode} disabled={saving || uploading || loading} />
                    </div>
                </div>
            </div>

            {/* Main 2-Column Composer */}
            <div className="composer-columns grid gap-6 items-start">
                {/* LEFT COLUMN: 4 Numbered Cards */}
                <div className="min-w-0 space-y-5">
                    {/* CARD 01: Đích đăng (Destinations) */}
                    <section className="panel p-5 bg-card border border-border rounded-2xl shadow-2xs space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">01</span>
                                    <h2 className="text-sm font-semibold text-foreground">{t('Destinations')}</h2>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {t('Choose which platforms you want your post to appear on.')}
                                </p>
                            </div>
                            <span className="text-[11px] font-semibold text-muted-foreground bg-muted/70 px-2.5 py-1 rounded-full border border-border/60 shrink-0">
                                {selectedAccounts.length} {t('destinations')}
                            </span>
                        </div>

                        {/* Connected Destinations Cards */}
                        {connectedAccounts.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center bg-muted/10 space-y-2">
                                <p className="text-xs text-muted-foreground">
                                    {t('No connected publishing destinations for this brand.')}
                                </p>
                                <Link
                                    to="/accounts"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:underline"
                                >
                                    <span>{t('Connect accounts in Social Accounts')}</span>
                                    <span>→</span>
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
                                {connectedAccounts.map((account) => {
                                    const isSelected = form.account_ids.includes(account.id);
                                    const platformName = PLATFORM_LABEL[account.platform] || account.platform;

                                    return (
                                        <div
                                            key={account.id}
                                            onClick={() => toggleAccount(account.id)}
                                            className={`group relative rounded-2xl border p-3.5 flex flex-col justify-between cursor-pointer transition-all select-none ${
                                                isSelected
                                                    ? 'border-[#ffd631] bg-[#ffd631]/8 ring-1 ring-[#ffd631] shadow-2xs'
                                                    : 'border-border/80 bg-card hover:bg-muted/30 hover:border-border'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className={`transition-transform ${isSelected ? 'scale-105' : 'opacity-85 group-hover:opacity-100'}`}>
                                                    <PlatformLogo platform={account.platform} size={32} />
                                                </div>
                                                {isSelected && (
                                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-[9px] font-bold">
                                                        ✓
                                                    </span>
                                                )}
                                            </div>

                                            <div>
                                                <div className="font-heading font-semibold text-xs text-foreground truncate">
                                                    {platformName}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                                                    <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-emerald-500" />
                                                    <span className="truncate">{account.name}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* CARD 02: Thông tin cơ bản (Basic Info & Caption) */}
                    <section className="panel p-5 bg-card border border-border rounded-2xl shadow-2xs space-y-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">02</span>
                                <h2 className="text-sm font-semibold text-foreground">{t('Basic information')}</h2>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t('This content will be used for all selected platforms.')}
                            </p>
                        </div>

                        {/* Row 1: Brand & Internal Title */}
                        <div className="grid gap-4 sm:grid-cols-2 pt-1">
                            <div>
                                <Label htmlFor="post-brand" className="text-xs font-medium text-foreground mb-1.5 block">
                                    {t('Brand')} *
                                </Label>
                                <Select value={form.brand_id} onValueChange={applyBrand} disabled={uploading}>
                                    <SelectTrigger id="post-brand" className="rounded-xl h-10 text-xs">
                                        <SelectValue placeholder={t('Select brand')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {brands.map((item) => (
                                            <SelectItem key={item.id} value={item.id} className="text-xs">
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <Label htmlFor="post-title" className="text-xs font-medium text-foreground block">
                                        {t('Internal title')}
                                    </Label>
                                    <span className="text-[11px] text-muted-foreground">
                                        {t('Only you see this')}
                                    </span>
                                </div>
                                <Input
                                    id="post-title"
                                    value={form.title}
                                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                                    placeholder={t('e.g. 5-post series about creative content')}
                                    className="rounded-xl h-10 text-xs"
                                />
                            </div>
                        </div>

                        {/* Row 2: Main Caption */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <Label htmlFor="post-caption" className="text-xs font-medium text-foreground block">
                                    {t('Main content')}
                                </Label>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                    {form.caption.length} {t('characters')}
                                </span>
                            </div>
                            <Textarea
                                id="post-caption"
                                rows={5}
                                value={form.caption}
                                onChange={(event) => setForm({ ...form, caption: event.target.value })}
                                placeholder={t('Write the content you want to share…')}
                                className="rounded-xl resize-none text-xs leading-relaxed bg-white"
                            />
                        </div>

                        {/* Row 3: Bottom AI Assistant Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50">
                            <div className="flex items-center gap-2 shrink-0">
                                <Sparkle size={15} weight="duotone" className="text-amber-500 shrink-0" />
                                <span className="text-xs font-medium text-foreground whitespace-nowrap shrink-0">{t('AI assistant')}</span>
                                <Select value={aiModel} onValueChange={setAiModel}>
                                    <SelectTrigger className="h-8 rounded-lg text-xs w-[140px] bg-muted/40 border-border/60">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gemini" className="text-xs">Google Gemini</SelectItem>
                                        <SelectItem value="openai" className="text-xs">OpenAI GPT-4o</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 rounded-lg text-xs font-medium gap-1.5 cursor-pointer"
                                onClick={() => setAiOpen((prev) => !prev)}
                            >
                                <Sparkle size={13} weight="bold" />
                                <span>{t('Suggest outline')}</span>
                            </Button>
                        </div>

                        {/* Collapsible Full AI Writing Workspace */}
                        {aiOpen && (
                            <div className="pt-2 animate-in fade-in duration-200">
                                <DesktopAiWriter
                                    key={`${form.brand_id}:${sourceId || 'new'}`}
                                    form={form}
                                    disabled={saving || uploading}
                                    onApply={(origin, text) => setForm((current) => applyAiSuggestion(current, origin, text))}
                                    onApplyPlatform={(origin, platform, previous, text) =>
                                        setForm((current) => applyAiPlatformSuggestion(current, origin, platform, previous, text))
                                    }
                                />
                            </div>
                        )}

                        {/* Per-platform custom captions */}
                        {!desktop && platforms.length > 1 && (
                            <div className="pt-3 border-t border-border/50">
                                <PlatformCaptions
                                    platforms={platforms}
                                    captions={form.platform_captions}
                                    mainCaption={form.caption}
                                    onChange={(platform_captions) => setForm((current) => ({ ...current, platform_captions }))}
                                />
                            </div>
                        )}

                        {/* TikTok creator and privacy settings */}
                        {!desktop &&
                            selectedAccounts
                                .filter((a) => a.platform === 'tiktok')
                                .map((account) => (
                                    <TiktokSettings
                                        key={account.id}
                                        account={account}
                                        value={form.destination_settings[account.id]?.tiktok}
                                        onCreatorChange={(creator) =>
                                            setTiktokCreators((current) => ({ ...current, [account.id]: creator }))
                                        }
                                        onChange={(tiktok) =>
                                            setForm((current) => ({
                                                ...current,
                                                destination_settings: {
                                                    ...current.destination_settings,
                                                    [account.id]: {
                                                        ...current.destination_settings[account.id],
                                                        tiktok,
                                                    },
                                                },
                                            }))
                                        }
                                    />
                                ))}

                        {/* Per-page settings */}
                        {!desktop && (
                            <PageSettings
                                accounts={selectedAccounts}
                                settings={form.destination_settings}
                                onChange={(destination_settings) => setForm({ ...form, destination_settings })}
                            />
                        )}
                    </section>

                    {/* CARD 03: Media chung (Attachments & Dropzone) */}
                    <section className="panel p-5 bg-card border border-border rounded-2xl shadow-2xs space-y-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">03</span>
                                <h2 className="text-sm font-semibold text-foreground">{t('General media')}</h2>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t('Photos or video attached to the post.')}
                            </p>
                        </div>

                        <fieldset disabled={uploading || saving}>
                            <MediaUploader
                                assets={form.media}
                                onChange={(media) =>
                                    setForm((prev) =>
                                        media.every((image) => !image.brand_id || image.brand_id === prev.brand_id)
                                            ? { ...prev, media }
                                            : prev
                                    )
                                }
                                brandId={form.brand_id}
                                demoMode={desktop ? false : demoMode}
                                onBusyChange={setUploading}
                            />
                        </fieldset>

                        {/* Platform-specific media overrides if needed */}
                        {!desktop && platforms.length > 0 && form.media.length > 0 && (
                            <PlatformMedia
                                platforms={platforms}
                                media={form.platform_media}
                                brandId={form.brand_id}
                                demoMode={demoMode}
                                disabled={uploading || saving}
                                onBusyChange={setUploading}
                                onChange={(platform_media) =>
                                    setForm((current) =>
                                        Object.values(platform_media)
                                            .flat()
                                            .every((asset) => !asset.brand_id || asset.brand_id === current.brand_id)
                                            ? { ...current, platform_media }
                                            : current
                                    )
                                }
                            />
                        )}
                    </section>

                    {/* CARD 04: Chiến lược & lịch đăng (Strategy & Schedule) */}
                    <section className="panel p-5 bg-card border border-border rounded-2xl shadow-2xs space-y-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">04</span>
                                <h2 className="text-sm font-semibold text-foreground">{t('Strategy & scheduling')}</h2>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t('Assign post to the right pillar, then choose publishing time.')}
                            </p>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 pt-1">
                            {/* Left: Content Strategy Fields */}
                            <div className="space-y-4">
                                <PillarAngleFields
                                    pillars={brandPillars}
                                    angles={brandAngles}
                                    value={form}
                                    onChange={(patch) => setForm({ ...form, ...patch })}
                                />
                            </div>

                            {/* Right: Schedule Date/Time/Timezone Fields */}
                            <div className="space-y-4">
                                <ScheduleFields value={form} onChange={(patch) => setForm({ ...form, ...patch })} />
                            </div>
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN: Live Social Preview & Action Panel */}
                <div className="space-y-5 composer-preview">
                    {/* Live Post Preview */}
                    <PostPreview
                        planning={desktop}
                        caption={form.caption}
                        media={form.media}
                        accounts={selectedAccounts}
                        scheduledAt={scheduledAt}
                        timezone={form.timezone}
                        pageSettings={form.destination_settings}
                        platformCaptions={form.platform_captions}
                        platformMedia={form.platform_media}
                    />

                    {/* Pre-Publish Checklist (Replaces channel check issues table with checklist) */}
                    <DestinationChecks checks={checks} post={form} />

                    {warnings.length ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-1.5">
                            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-900">
                                <WarningCircle size={15} weight="fill" className="text-amber-600 shrink-0" />
                                <span>{t(desktop ? 'Planning checks' : 'Before you publish')}</span>
                            </p>
                            <ul className="space-y-1 pt-0.5">
                                {warnings.map((warning) => (
                                    <li key={warning} className="text-[11px] text-amber-800 flex items-start gap-1.5 leading-relaxed">
                                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-600" />
                                        <span>{warning}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {/* Action Buttons Box */}
                    <div className="panel p-4 sm:p-5 bg-card border border-border rounded-2xl shadow-2xs space-y-3">
                        {!desktop && (
                            <button
                                type="button"
                                className="btn-skew w-full h-11 text-xs font-bold gap-2 justify-center cursor-pointer shadow-sm hover:shadow transition-all"
                                disabled={saving || uploading || demoMode}
                                onClick={() => submit('publish')}
                            >
                                <PaperPlaneTilt size={16} weight="bold" />
                                <span>{t('Publish now')}</span>
                            </button>
                        )}

                        {/* Secondary Actions: Schedule & Save Draft side-by-side on 1 row */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-10 rounded-xl border border-border bg-white text-foreground hover:bg-muted/50 text-xs font-semibold gap-1.5 justify-center transition-all cursor-pointer px-2"
                                disabled={saving || uploading}
                                onClick={() => submit('schedule')}
                            >
                                <CalendarBlank size={15} weight="bold" className="shrink-0" />
                                <span className="truncate">{t(desktop ? 'Save calendar plan' : 'Schedule post')}</span>
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-10 rounded-xl border border-border bg-muted/30 text-foreground hover:bg-muted/60 text-xs font-medium gap-1.5 justify-center transition-all cursor-pointer px-2"
                                disabled={saving || uploading}
                                onClick={() => submit('draft')}
                            >
                                <FloppyDisk size={15} className="shrink-0" />
                                <span className="truncate">{t('Save draft')}</span>
                            </Button>
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-relaxed pt-2 border-t border-border/50 text-center">
                            {t('Timezone {timezone} · drafts are saved locally in this browser', {
                                timezone: form.timezone,
                            })}
                        </p>
                    </div>
                </div>
            </div>

            {publishReview && (
                <PublishConfirmation
                    review={publishReview}
                    onClose={() => setPublishReview(null)}
                    onResult={(result) => {
                        setPublishReview(null);
                        toast({
                            title: t(
                                result.status === 'queued'
                                    ? 'Automatic schedule confirmed'
                                    : result.status === 'published'
                                    ? 'Post published'
                                    : result.status === 'processing'
                                    ? 'Publishing is still processing'
                                    : 'Delivery needs attention'
                            ),
                            description: t(result.message || 'Open publishing history for the result.'),
                            ...(result.status === 'failed' || result.status === 'unknown' ? { variant: 'destructive' } : {}),
                        });
                        navigate('/posts?post=' + result.postId);
                    }}
                />
            )}

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={t('Delete this post?')}
                description={t(
                    desktop
                        ? 'This draft is removed from this computer.'
                        : 'The post and its queued destination jobs are removed. Published history stays in the activity log.'
                )}
                confirmLabel={t('Delete post')}
                destructive
                onConfirm={remove}
            />
        </div>
    );
}
