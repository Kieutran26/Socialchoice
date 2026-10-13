import PublishConfirmation from '@/components/posts/PublishConfirmation';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    FloppyDisk,
    CalendarDots,
    PaperPlaneTilt,
    Trash,
    Copy,
    WarningCircle,
    Info,
    Users,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import StatusBadge from '@/components/common/StatusBadge';
import AccountPicker from '@/components/composer/AccountPicker';
import MediaUploader from '@/components/composer/MediaUploader';
import PillarAngleFields from '@/components/composer/PillarAngleFields';
import ScheduleFields from '@/components/composer/ScheduleFields';
import PlatformCaptions from '@/components/composer/PlatformCaptions';
import PostPreview from '@/components/composer/PostPreview';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';


import { toUtcIso, toZonedParts, localInputDefault } from '@/lib/tz';
import { DEFAULT_TIMEZONE, POST_STATUS_LABEL, POST_STATUS_TONE } from '@/lib/constants';

const emptyForm = (brandId) => ({
    brand_id: brandId || '',
    title: '',
    caption: '',
    account_ids: [],
    pillar_id: '',
    angle_id: '',
    date: '',
    time: '',
    timezone: DEFAULT_TIMEZONE,
    status: 'draft',
    platform_captions: {},
    media: [],
});

export default function CreatePost() {
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
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [existing, setExisting] = useState(null);
    const [form, setForm] = useState(emptyForm(selectedBrandId === 'all' ? '' : selectedBrandId));
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [publishReview, setPublishReview] = useState(null);

    useEffect(() => {
        let active = true;
        (async () => {
            const [accountPage, pillarPage, anglePage] = await Promise.all([
                appClient.entities.SocialAccount.filter({ is_demo: demoMode }, { sort: 'name', limit: 300 }),
                appClient.entities.ContentPillar.filter({ is_demo: demoMode, status: 'active' }, { sort: 'name', limit: 300 }),
                appClient.entities.ContentAngle.filter({ is_demo: demoMode, status: 'active' }, { sort: 'name', limit: 500 }),
            ]);
            if (!active) return;
            setAccounts(accountPage.items);
            setPillars(pillarPage.items);
            setAngles(anglePage.items);
            setLoading(false);
        })();
        return () => {
            active = false;
        };
    }, [demoMode]);

    const applyBrand = useCallback(
        (brandId) => {
            const preset = localInputDefault(brands.find((brand) => brand.id === brandId)?.timezone || DEFAULT_TIMEZONE);
            setForm((prev) => ({
                ...prev,
                brand_id: brandId,
                account_ids: [], pillar_id: '', angle_id: '', media: [],
                timezone: brands.find((brand) => brand.id === brandId)?.timezone || DEFAULT_TIMEZONE,
                date: prev.date || preset.date,
                time: prev.time || preset.time,
            }));
        },
        [brands],
    );

    useEffect(() => {
        if (sourceId || form.brand_id || !brands.length) return;
        applyBrand(selectedBrandId === 'all' ? brands[0].id : selectedBrandId);
    }, [brands, selectedBrandId, form.brand_id, sourceId, applyBrand]);

    useEffect(() => {
        if (!sourceId || loading) return;
        (async () => {
            const post = await appClient.entities.Post.get(sourceId);
            const [media, jobs] = await Promise.all([
                post.media_ids?.length
                    ? appClient.entities.MediaAsset.filter({ id: { $in: post.media_ids } }, { limit: 50 })
                    : Promise.resolve({ items: [] }),
                appClient.entities.PublishJob.filter({ post_id: post.id }, { limit: 200 }),
            ]);
            const parts = toZonedParts(post.scheduled_at, post.timezone || DEFAULT_TIMEZONE);
            setExisting(editId ? post : null);
            setForm({
                brand_id: post.brand_id,
                title: editId ? post.title : `${post.title} (copy)`,
                caption: post.caption || '',
                platform_captions: post.platform_captions || {},
                account_ids: post.account_ids?.length ? post.account_ids : jobs.items.map((job) => job.social_account_id),
                pillar_id: post.pillar_id || '',
                angle_id: post.angle_id || '',
                date: parts.date,
                time: parts.time,
                timezone: post.timezone || DEFAULT_TIMEZONE,
                status: duplicateId ? 'draft' : ['draft', 'scheduled'].includes(post.status) ? post.status : 'draft',
                media: (post.media_ids || []).map(id => media.items.find(image => image.id === id)).filter(Boolean),
            });
        })();
    }, [sourceId, loading, editId, duplicateId]);

    const brandAccounts = useMemo(() => accounts.filter((a) => a.brand_id === form.brand_id), [accounts, form.brand_id]);
    const brandPillars = useMemo(() => pillars.filter((p) => p.brand_id === form.brand_id), [pillars, form.brand_id]);
    const brandAngles = useMemo(() => angles.filter((a) => a.brand_id === form.brand_id), [angles, form.brand_id]);
    const selectedAccounts = useMemo(
        () => accounts.filter((a) => form.account_ids.includes(a.id)),
        [accounts, form.account_ids],
    );
    const selectedPlatforms = useMemo(
        () => Array.from(new Set(selectedAccounts.map((a) => a.platform))),
        [selectedAccounts],
    );
    const brand = brands.find((b) => b.id === form.brand_id);
    const scheduledAt = form.date && form.time ? toUtcIso(form.date, form.time, form.timezone) : null;
    const previewCaption = form.platform_captions[selectedPlatforms[0]] || form.caption;

    const warnings = [];
    if (selectedAccounts.length && selectedAccounts.every((a) => a.connection_status !== 'connected')) {
        warnings.push(
            t("These destinations are planning references. Connect a Facebook Page before publishing."),
        );
    }
    if (selectedAccounts.some((a) => a.platform !== 'facebook')) {
        warnings.push(t("Publish now is available only for Facebook Pages. Other destinations are calendar references."));
    }
    if (form.account_ids.length !== 1) warnings.push(t("Publish now supports text, up to 10 images, or one MP4 video on one Facebook Page. Automatic publishing is not available yet."));
    if (!form.pillar_id || !form.angle_id) {
        warnings.push(t("Assign a pillar and an angle so this post counts towards your distribution targets."));
    }

    const validate = (action) => {
        if (!form.brand_id) return t("Choose the brand this post belongs to.");
        if (!form.title.trim()) return t("Add an internal title so the post is easy to find later.");
        if (!form.caption.trim()) return t("The main caption cannot be empty.");
        if (action !== 'draft' && !form.account_ids.length) return t("Select at least one destination to publish to.");
        if (action === 'publish' && (form.account_ids.length !== 1 || form.media.length > 10)) return t('Publish now requires exactly one Facebook Page');
        if (action === 'schedule' && !scheduledAt) return t("Set the publishing date and time.");
        if (action === 'schedule' && new Date(scheduledAt) <= new Date()) {
            return t("Pick a publishing time in the future, or use Publish now.");
        }
        return null;
    };

    const submit = async (action) => {
        const error = validate(action);
        if (error) {
            toast({ variant: 'destructive', title: t("Cannot save yet"), description: error });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                brand_id: form.brand_id,
                title: form.title.trim(),
                caption: form.caption,
                platform_captions: form.platform_captions,
                media_ids: form.media.map((asset) => asset.id),
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
                setPublishReview(await appClient.publishing.prepare(saved.id));
                return;
            }
            toast({
                title: action === 'draft' ? t("Draft saved") : t("Calendar plan saved"),
                description: action === 'draft' ? t("Find it again from All Posts.") : t("Calendar plan saved for {value1} {value2} ({value3}). Automatic publishing is not configured.", {value1: form.date, value2: form.time, value3: form.timezone}),
            });
            navigate(`/posts?post=${saved.id}`);
        } catch (error) {
            toast({ variant: 'destructive', title: t("Could not save post"), description: t(error.message) });
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        if (existing.status !== 'draft') throw new Error(t("Only drafts can be deleted. Cancel calendar plans instead."));
        await appClient.entities.Post.delete(existing.id);
        toast({ title: t("Post deleted") });
        navigate('/posts');
    };

    if (loading) {
        return (
            <>
                <PageHeader title={existing ? t("Edit post") : t("Create Post")} />
                <div className="composer-shell"><div className="composer-columns grid gap-5">
                    <Skeleton className="h-[520px] rounded-2xl" />
                    <Skeleton className="h-[420px] rounded-2xl" />
                </div></div>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title={existing ? t("Edit post") : t("Create Post")}
                description={t("Create a text, photo or video post for one Facebook Page, or save a calendar plan.")}
                actions={
                    existing ? (
                        <>
                            <StatusBadge tone={POST_STATUS_TONE[existing.status]}>
                                {POST_STATUS_LABEL[existing.status]}
                            </StatusBadge>
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg"
                                onClick={() => navigate(`/create?duplicate=${existing.id}`)}
                            >
                                <Copy size={14} className="mr-1.5" /> {t("Duplicate")} </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg text-dangerFg hover:text-dangerFg"
                                disabled={existing.status !== 'draft'}
                                onClick={() => setDeleteOpen(true)}
                            >
                                <Trash size={14} className="mr-1.5" /> {t("Delete")} </Button>
                        </>
                    ) : null
                }
            />

            <div className="composer-shell"><div className="composer-columns grid gap-5">
                <div className="min-w-0 space-y-5">
                    <section className="panel p-5">
                        <h2 className="mb-4 text-[15px]">{t("Basics")}</h2>
                        <div className="space-y-4">
                            <div className="grid gap-4">
                                <div>
                                    <Label className="label-xs mb-1.5 block">{t("Brand")}</Label>
                                    <Select value={form.brand_id} onValueChange={applyBrand} disabled={uploading}>
                                        <SelectTrigger className="rounded-lg">
                                            <SelectValue placeholder={t("Select brand")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {brands.map((item) => (
                                                <SelectItem key={item.id} value={item.id}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="label-xs mb-1.5 block">{t("Post title (internal)")}</Label>
                                    <Input
                                        value={form.title}
                                        onChange={(event) => setForm({ ...form, title: event.target.value })}
                                        placeholder={t("Week 42 — product education")}
                                        className="rounded-lg"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="label-xs mb-1.5 block">{t("Main caption")}</Label>
                                <Textarea
                                    rows={5}
                                    value={form.caption}
                                    onChange={(event) => setForm({ ...form, caption: event.target.value })}
                                    placeholder={t("What should every destination say by default?")}
                                    className="rounded-lg"
                                />
                                <p className="label-xs mt-1">{form.caption.length} {t("characters")}</p>
                            </div>
                        </div>
                    </section>

                    <section className="panel p-5">
                        <h2 className="mb-3 text-[15px]">{t("Destinations")}</h2>
                        <AccountPicker
                            accounts={brandAccounts}
                            selectedIds={form.account_ids}
                            brandName={brand?.name || t("this brand")}
                            onToggle={(id) =>
                                setForm({
                                    ...form,
                                    account_ids: form.account_ids.includes(id)
                                        ? form.account_ids.filter((value) => value !== id)
                                        : [...form.account_ids, id],
                                })
                            }
                            onSelectAll={(checked) =>
                                setForm({ ...form, account_ids: checked ? brandAccounts.map((a) => a.id) : [] })
                            }
                        />
                    </section>

                    <section className="panel p-5">
                        <h2 className="mb-3 text-[15px]">{t("Media")}</h2>
                        <MediaUploader
                            assets={form.media}
                            onChange={(media) => setForm(prev => media.every(image => !image.brand_id || image.brand_id === prev.brand_id) ? { ...prev, media } : prev)}
                            brandId={form.brand_id}
                            demoMode={demoMode}
                            onBusyChange={setUploading}
                        />
                    </section>

                    <section className="panel p-5">
                        <h2 className="mb-3 text-[15px] flex gap-2 items-center"><Users size={18}/>{t('Collaborate on Facebook')}</h2>
                        <p className="label-xs">{t('Invite collaborators from the video details after publishing. Text and photo collaboration are not enabled here.')}</p>
                        {existing?.status === 'published' && form.media[0]?.file_type === 'video' && <Link className="inline-block underline text-sm mt-3" to={'/posts?post='+existing.id}>{t('Open video details')}</Link>}
                    </section>

                    <section className="panel p-5">
                        <h2 className="mb-4 text-[15px]">{t("Content strategy")}</h2>
                        <PillarAngleFields
                            pillars={brandPillars}
                            angles={brandAngles}
                            value={form}
                            onChange={(patch) => setForm({ ...form, ...patch })}
                        />
                    </section>

                    <section className="panel p-5">
                        <h2 className="mb-4 text-[15px]">{t("Schedule")}</h2>
                        <ScheduleFields value={form} onChange={(patch) => setForm({ ...form, ...patch })} />
                    </section>

                    <section className="panel p-5">
                        <h2 className="mb-1 text-[15px]">{t("Platform captions")}</h2>
                        <p className="label-xs mb-4"> {t("Override the main caption per platform without rewriting the whole post.")} </p>
                        <PlatformCaptions
                            platforms={selectedPlatforms}
                            captions={form.platform_captions}
                            mainCaption={form.caption}
                            onChange={(platform_captions) => setForm({ ...form, platform_captions })}
                        />
                    </section>
                </div>

                <div className="composer-preview min-w-0 space-y-4">
                    <PostPreview
                        caption={previewCaption}
                        media={form.media}
                        accounts={selectedAccounts}
                        scheduledAt={scheduledAt}
                        timezone={form.timezone}                    />

                    {warnings.length ? (
                        <div className="panel p-4">
                            <p className="mb-2 flex items-center gap-2 text-[12px] font-medium">
                                <WarningCircle size={14} className="text-warnFg" /> {t("Before you publish")} </p>
                            <ul className="space-y-2">
                                {warnings.map((warning) => (
                                    <li key={warning} className="label-xs flex gap-2">
                                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warnFg" />
                                        {warning}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    <div className="panel space-y-2 p-4">
                        <button type="button" className="btn-skew w-full" disabled={saving || uploading || demoMode} onClick={() => submit('publish')}>
                            <PaperPlaneTilt size={15} weight="fill" /> {t("Publish now")} </button>
                        <button type="button" className="btn-skew w-full" disabled={saving || uploading} onClick={() => submit('schedule')}>
                            <CalendarDots size={15} weight="fill" /> {t("Schedule post")} </button>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full rounded-lg"
                            disabled={saving || uploading}
                            onClick={() => submit('draft')}
                        >
                            <FloppyDisk size={15} className="mr-1.5" /> {t("Save draft")} </Button>
                        <p className="label-xs flex gap-2 pt-1">
                            <Info size={13} className="mt-0.5 shrink-0" /> {t("Calendar plans use timezone")} {form.timezone}{t(". Publish now requires pages_manage_posts. Calendar plans do not send content automatically.")} </p>
                    </div>
                </div>
            </div></div>

            {publishReview && <PublishConfirmation review={publishReview} onClose={() => setPublishReview(null)} onResult={result => {
                setPublishReview(null);
                toast({ title: t(result.status === 'published' ? 'Facebook post published' : result.status === 'processing' ? 'Publishing is still processing' : 'Facebook delivery needs attention'), description: t(result.message || 'Open publishing history for the result.'), ...(result.status === 'failed' || result.status === 'unknown' ? { variant: 'destructive' } : {}) });
                navigate('/posts?post=' + result.postId);
            }} />}
            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={t("Delete this post?")}
                description={t("The post and its queued destination jobs are removed. Published history stays in the activity log.")}
                confirmLabel={t("Delete post")}
                destructive
                onConfirm={remove}
            />
        </>
    );
}


