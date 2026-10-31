import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    FloppyDisk,
    NotePencil,
    Images,
    ShareNetwork,
    Target,
    Info,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import AccountPicker from '@/components/composer/AccountPicker';
import MediaUploader from '@/components/composer/MediaUploader';
import PillarAngleFields from '@/components/composer/PillarAngleFields';
import PostPreview from '@/components/composer/PostPreview';
import PlatformCaptions from '@/components/composer/PlatformCaptions';
import PageSettings from '@/components/composer/PageSettings';
import { templateDataFromForm } from '@/lib/post-templates';
import { referencedMediaIds, PUBLISHING_PLATFORMS } from '@/lib/publishing-content';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const emptyTemplateForm = (brandId = '') => ({
    brand_id: brandId || '',
    title: '',
    caption: '',
    platform_captions: {},
    account_ids: [],
    pillar_id: '',
    angle_id: '',
    media: [],
    platform_media: {},
    destination_settings: {},
});

export default function CreateTemplate() {
    const { t } = useTranslation();
    const { brands, demoMode, selectedBrandId } = useWorkspace();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const editId = params.get('edit');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [templateName, setTemplateName] = useState('');
    const [form, setForm] = useState(() =>
        emptyTemplateForm(selectedBrandId === 'all' ? '' : selectedBrandId)
    );
    const [loadError, setLoadError] = useState('');

    // Fetch accounts, pillars, angles
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [accountPage, pillarPage, anglePage] = await Promise.all([
                    appClient.entities.SocialAccount.filter({ is_demo: demoMode }, { sort: 'name', limit: 300 }),
                    appClient.entities.ContentPillar.filter({ is_demo: demoMode }, { sort: 'name', limit: 300 }),
                    appClient.entities.ContentAngle.filter({ is_demo: demoMode }, { sort: 'name', limit: 500 }),
                ]);
                if (!active) return;
                setAccounts(accountPage.items);
                setPillars(pillarPage.items);
                setAngles(anglePage.items);
            } catch (err) {
                if (active) setLoadError(err.message);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [demoMode]);

    // Apply default brand
    const applyBrand = useCallback(
        (brandId) => {
            setForm((prev) => ({
                ...prev,
                brand_id: brandId,
                pillar_id: '',
                angle_id: '',
                account_ids: [],
                destination_settings: {},
            }));
        },
        []
    );

    useEffect(() => {
        if (editId || form.brand_id || !brands.length) return;
        applyBrand(selectedBrandId === 'all' ? brands[0].id : selectedBrandId);
    }, [brands, selectedBrandId, form.brand_id, editId, applyBrand]);

    // Load existing template if edit mode
    useEffect(() => {
        if (!editId) return;
        let active = true;
        setLoading(true);
        (async () => {
            try {
                const template = await appClient.entities.PostTemplate.get(editId);
                const mediaIds = referencedMediaIds(template);
                const mediaAssets = mediaIds.length
                    ? await appClient.entities.MediaAsset.filter({ id: { $in: mediaIds } }, { limit: 60 })
                    : { items: [] };

                if (!active) return;
                setTemplateName(template.name || '');
                setForm({
                    brand_id: template.brand_id || '',
                    title: template.title || '',
                    caption: template.caption || '',
                    platform_captions: template.platform_captions || {},
                    account_ids: template.account_ids || [],
                    pillar_id: template.pillar_id || '',
                    angle_id: template.angle_id || '',
                    media: (template.media_ids || [])
                        .map((id) => mediaAssets.items.find((a) => a.id === id))
                        .filter(Boolean),
                    platform_media: Object.fromEntries(
                        Object.entries(template.platform_media_ids || {}).map(([platform, ids]) => [
                            platform,
                            ids.map((id) => mediaAssets.items.find((a) => a.id === id)).filter(Boolean),
                        ])
                    ),
                    destination_settings: template.destination_settings || {},
                });
            } catch (err) {
                if (active) setLoadError(err.message);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [editId]);

    const brand = brands.find((b) => b.id === form.brand_id);
    const brandAccounts = useMemo(
        () => accounts.filter((a) => a.brand_id === form.brand_id),
        [accounts, form.brand_id]
    );
    const selectedAccounts = useMemo(
        () => accounts.filter((a) => form.account_ids.includes(a.id)),
        [accounts, form.account_ids]
    );
    const brandPillars = useMemo(
        () => pillars.filter((p) => p.brand_id === form.brand_id),
        [pillars, form.brand_id]
    );
    const brandAngles = useMemo(
        () => angles.filter((a) => a.brand_id === form.brand_id),
        [angles, form.brand_id]
    );

    const platforms = useMemo(
        () =>
            [...new Set(selectedAccounts.map((a) => a.platform))].filter((platform) =>
                PUBLISHING_PLATFORMS.includes(platform)
            ),
        [selectedAccounts]
    );

    const handleSave = async (e) => {
        if (e) e.preventDefault();

        if (!templateName.trim()) {
            toast({
                variant: 'destructive',
                title: t('Cannot save template'),
                description: t('Please enter a template name.'),
            });
            return;
        }

        if (!form.brand_id) {
            toast({
                variant: 'destructive',
                title: t('Cannot save template'),
                description: t('Choose the brand this template belongs to.'),
            });
            return;
        }

        if (!form.caption.trim() && !form.media.length && !form.title.trim()) {
            toast({
                variant: 'destructive',
                title: t('Cannot save template'),
                description: t('Add a caption, media, or default title for this template.'),
            });
            return;
        }

        setSaving(true);
        try {
            const data = templateDataFromForm(form, demoMode);
            await appClient.templates.save({
                ...(editId ? { id: editId } : {}),
                name: templateName.trim(),
                data,
            });

            toast({
                title: editId ? t('Template updated') : t('Template saved'),
                description: t('Find it under Post templates.'),
            });
            navigate('/templates');
        } catch (err) {
            toast({
                variant: 'destructive',
                title: t('Failed to save template'),
                description: t(err.message),
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-5">
                <Skeleton className="h-10 w-48 rounded-xl" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <Skeleton className="lg:col-span-7 h-[500px] rounded-2xl" />
                    <Skeleton className="lg:col-span-5 h-[500px] rounded-2xl" />
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="panel p-6 text-center space-y-4">
                <p className="text-dangerFg text-sm">{loadError}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                    {t('Try again')}
                </Button>
            </div>
        );
    }

    return (
        <div className="composer-shell max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                        <Link to="/templates">
                            <ArrowLeft size={18} />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="font-heading text-2xl font-semibold text-foreground">
                            {editId ? t('Edit post template') : t('Compose a template')}
                        </h1>
                        <p className="label-xs mt-0.5">
                            {t('Reuse brand content as a new draft. Templates never keep publishing schedules or TikTok choices.')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button asChild variant="outline" className="rounded-xl h-9 text-xs">
                        <Link to="/templates">{t('Cancel')}</Link>
                    </Button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || uploading}
                        className="btn-skew h-9 px-4 text-xs font-medium cursor-pointer"
                    >
                        <FloppyDisk size={15} weight="bold" />
                        <span>{saving ? t('Saving…') : t('Save template')}</span>
                    </button>
                </div>
            </div>

            {/* Main Composer Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Form Fields */}
                <div className="lg:col-span-7 space-y-5 min-w-0">
                    {/* Section 1: Template Info */}
                    <div className="panel p-5 bg-card border border-border rounded-2xl shadow-2xs space-y-4">
                        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                            <NotePencil size={18} weight="duotone" className="text-foreground" />
                            <h2 className="text-sm font-semibold text-foreground">
                                {t('Template details')}
                            </h2>
                        </div>

                        {/* Template Name (Required) */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-foreground flex items-center justify-between">
                                <span>{t('Template name')} *</span>
                                <span className="text-[11px] text-muted-foreground font-normal">
                                    {templateName.length}/160
                                </span>
                            </Label>
                            <Input
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder={t('e.g. New feature announcement, Weekend sale promo…')}
                                maxLength={160}
                                required
                                className="h-10 rounded-xl text-sm bg-white"
                            />
                        </div>

                        {/* Brand & Default Title Grid */}
                        <div className="grid sm:grid-cols-2 gap-3.5">
                            {/* Brand Selector */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-foreground">
                                    {t('Brand')} *
                                </Label>
                                <Select
                                    value={form.brand_id}
                                    onValueChange={(val) => applyBrand(val)}
                                >
                                    <SelectTrigger className="h-10 rounded-xl text-xs bg-white">
                                        <SelectValue placeholder={t('Select brand')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {brands.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="h-2 w-2 rounded-full shrink-0"
                                                        style={{ backgroundColor: b.color || '#9ca3af' }}
                                                    />
                                                    <span>{b.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Default Internal Title */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-foreground">
                                    {t('Default post title')}
                                </Label>
                                <Input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder={t('Internal title for created drafts')}
                                    className="h-10 rounded-xl text-xs bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Destinations */}
                    <div className="panel p-5 bg-card border border-border rounded-2xl shadow-2xs space-y-4">
                        <div className="flex items-center justify-between border-b border-border/50 pb-3">
                            <div className="flex items-center gap-2">
                                <ShareNetwork size={18} weight="duotone" className="text-foreground" />
                                <h2 className="text-sm font-semibold text-foreground">
                                    {t('Default destinations')}
                                </h2>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                                {form.account_ids.length} {t('selected')}
                            </span>
                        </div>

                        <p className="label-xs">
                            {t('Choose which channels will be pre-selected when creating a post from this template.')}
                        </p>

                        <AccountPicker
                            accounts={brandAccounts}
                            selectedIds={form.account_ids}
                            brandName={brand?.name || t('this brand')}
                            onToggle={(id) =>
                                setForm((prev) => ({
                                    ...prev,
                                    account_ids: prev.account_ids.includes(id)
                                        ? prev.account_ids.filter((v) => v !== id)
                                        : [...prev.account_ids, id],
                                }))
                            }
                            onSelectAll={(checked) =>
                                setForm((prev) => ({
                                    ...prev,
                                    account_ids: checked ? brandAccounts.map((a) => a.id) : [],
                                }))
                            }
                        />
                    </div>

                    {/* Section 3: Content & Media */}
                    <div className="panel p-5 bg-card border border-border rounded-2xl shadow-2xs space-y-4">
                        <div className="flex items-center justify-between border-b border-border/50 pb-3">
                            <div className="flex items-center gap-2">
                                <Images size={18} weight="duotone" className="text-foreground" />
                                <h2 className="text-sm font-semibold text-foreground">
                                    {t('Template content & media')}
                                </h2>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                                {form.caption.length} {t('characters')}
                            </span>
                        </div>

                        {/* Caption Textarea */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-foreground">
                                {t('Main caption')}
                            </Label>
                            <Textarea
                                rows={6}
                                value={form.caption}
                                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                                placeholder={t('Write your reusable template caption here…')}
                                className="rounded-xl text-sm leading-relaxed p-3.5 bg-white resize-y"
                            />
                        </div>

                        {/* Media Uploader */}
                        <div className="pt-2">
                            <Label className="text-xs font-medium text-foreground mb-2 block">
                                {t('Shared media attachments')}
                            </Label>
                            <MediaUploader
                                assets={form.media}
                                brandId={form.brand_id}
                                demoMode={demoMode}
                                onChange={(media) => setForm((prev) => ({ ...prev, media }))}
                                onBusyChange={setUploading}
                            />
                        </div>

                        {/* Per-platform custom captions */}
                        {platforms.length > 1 && (
                            <div className="pt-4 border-t border-border/50">
                                <PlatformCaptions
                                    platforms={platforms}
                                    captions={form.platform_captions}
                                    mainCaption={form.caption}
                                    onChange={(caps) => setForm({ ...form, platform_captions: caps })}
                                />
                            </div>
                        )}

                        {/* Per-page settings */}
                        {selectedAccounts.length > 0 && (
                            <div className="pt-3 border-t border-border/50">
                                <PageSettings
                                    accounts={selectedAccounts}
                                    settings={form.destination_settings}
                                    onChange={(destination_settings) =>
                                        setForm((prev) => ({ ...prev, destination_settings }))
                                    }
                                />
                            </div>
                        )}
                    </div>

                    {/* Section 4: Content Strategy (Optional) */}
                    <div className="panel p-5 bg-card border border-border rounded-2xl shadow-2xs space-y-4">
                        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                            <Target size={18} weight="duotone" className="text-foreground" />
                            <h2 className="text-sm font-semibold text-foreground">
                                {t('Content Strategy')}
                            </h2>
                        </div>

                        <PillarAngleFields
                            pillars={brandPillars}
                            angles={brandAngles}
                            value={form}
                            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
                        />
                    </div>
                </div>

                {/* Right Column: Social Preview & Save Actions (Sticky) */}
                <div className="lg:col-span-5 space-y-5 composer-preview">
                    {/* Live Social Preview */}
                    <PostPreview
                        planning={true}
                        caption={form.caption}
                        media={form.media}
                        accounts={selectedAccounts}
                        scheduledAt={null}
                        timezone={brand?.timezone || 'Asia/Ho_Chi_Minh'}
                        pageSettings={form.destination_settings}
                        platformCaptions={form.platform_captions}
                        platformMedia={form.platform_media}
                    />

                    {/* Quick Save Card */}
                    <div className="panel p-5 bg-card border border-border rounded-2xl shadow-2xs space-y-3.5">
                        <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border/50">
                            <Info size={18} className="text-brand-dark shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                                {t(
                                    'When saved, this template can be applied at any time in "Create Post" with a single click.'
                                )}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || uploading}
                            className="btn-skew w-full h-11 text-xs font-semibold cursor-pointer justify-center"
                        >
                            <FloppyDisk size={16} weight="bold" />
                            <span>{saving ? t('Saving…') : t('Save template')}</span>
                        </button>

                        <Button asChild variant="outline" className="w-full h-9 rounded-xl text-xs">
                            <Link to="/templates">{t('Cancel and return')}</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
