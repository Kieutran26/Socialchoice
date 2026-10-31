import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    CopySimple,
    NotePencil,
    PencilSimple,
    Trash,
    Plus,
    MagnifyingGlass,
    Images,
    Play,
    FileText,
    VideoCamera,
    Target,
    SquaresFour,
    ListBullets,
    X,
    ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { referencedMediaIds } from '@/lib/publishing-content';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import PlatformBadge from '@/components/common/PlatformBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function PostTemplates() {
    const { t } = useTranslation();
    const { scope, brands, demoMode, selectedBrandId } = useWorkspace();
    const { toast } = useToast();
    const navigate = useNavigate();
    const request = useRef(0);

    const [rows, setRows] = useState([]);
    const [mediaMap, setMediaMap] = useState({});
    const [accounts, setAccounts] = useState([]);
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [refresh, setRefresh] = useState(0);
    const [rename, setRename] = useState(null);
    const [name, setName] = useState('');
    const [remove, setRemove] = useState(null);

    // Filter and view state
    const [search, setSearch] = useState('');
    const [formatFilter, setFormatFilter] = useState('all'); // 'all' | 'text' | 'image' | 'video'
    const [brandFilter, setBrandFilter] = useState('all');
    const [pillarFilter, setPillarFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

    // Fetch supporting entities (accounts, pillars, angles)
    useEffect(() => {
        let active = true;
        Promise.all([
            appClient.entities.SocialAccount.filter({ is_demo: demoMode }, { sort: 'name', limit: 200 }),
            appClient.entities.ContentPillar.filter({ is_demo: demoMode }, { sort: 'name', limit: 200 }),
            appClient.entities.ContentAngle.filter({ is_demo: demoMode }, { sort: 'name', limit: 200 }),
        ])
            .then(([accs, pils, angs]) => {
                if (!active) return;
                setAccounts(accs.items || []);
                setPillars(pils.items || []);
                setAngles(angs.items || []);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [demoMode]);

    // Fetch templates
    useEffect(() => {
        const id = ++request.current;
        let active = true;
        setRows([]);
        setCursor(null);
        setLoading(true);
        setError('');
        setRename(null);
        setRemove(null);

        appClient.entities.PostTemplate.filter(
            { ...scope },
            { sort: '-updated_date', limit: 100 }
        )
            .then((page) => {
                if (active && request.current === id) {
                    setRows(page.items);
                    setCursor(page.next_cursor);
                }
            })
            .catch((failure) => {
                if (active) setError(failure.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
            request.current++;
        };
    }, [scope, refresh]);

    // Load media for templates
    useEffect(() => {
        const ids = [...new Set(rows.flatMap((item) => referencedMediaIds(item)))];
        if (!ids.length) {
            setMediaMap({});
            return;
        }
        let active = true;
        appClient.entities.MediaAsset.filter({ id: { $in: ids } }, { limit: 150 })
            .then((page) => {
                if (!active) return;
                const map = {};
                page.items?.forEach((m) => {
                    map[m.id] = m;
                });
                setMediaMap(map);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [rows]);

    async function more() {
        const id = request.current;
        setLoading(true);
        try {
            const page = await appClient.entities.PostTemplate.filter(
                { ...scope },
                { sort: '-updated_date', limit: 50, cursor }
            );
            if (id === request.current) {
                setRows((current) => [...current, ...page.items]);
                setCursor(page.next_cursor);
            }
        } catch (failure) {
            if (id === request.current) setError(failure.message);
        } finally {
            if (id === request.current) setLoading(false);
        }
    }

    async function startFromTemplate(template) {
        setBusy(true);
        setError('');
        try {
            const { post, warnings } = await appClient.templates.createDraft(template.id);
            toast({
                title: t('Draft created from template'),
                description: warnings?.length
                    ? warnings.map((warning) => t(warning)).join(' ')
                    : t('Review the accounts, media and a new publishing time before publishing.'),
            });
            navigate('/create?edit=' + post.id);
        } catch (failure) {
            setError(failure.message);
        } finally {
            setBusy(false);
        }
    }

    async function saveName(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            await appClient.entities.PostTemplate.update(rename.id, { name: name.trim() });
            setRename(null);
            setRefresh((value) => value + 1);
            toast({ title: t('Template updated') });
        } catch (failure) {
            setError(failure.message);
        } finally {
            setBusy(false);
        }
    }

    // Helper functions for template details
    const getTemplateFormat = (template) => {
        const ids = referencedMediaIds(template);
        if (!ids.length) return 'text';
        const first = mediaMap[ids[0]];
        if (first?.file_type === 'video') return 'video';
        return 'image';
    };

    const getBrand = (brandId) => brands.find((b) => b.id === brandId);
    const getPillar = (pillarId) => pillars.find((p) => p.id === pillarId);
    const getAngle = (angleId) => angles.find((a) => a.id === angleId);
    const getAccount = (accountId) => accounts.find((a) => a.id === accountId);

    // Format counts
    const counts = useMemo(() => {
        let text = 0;
        let image = 0;
        let video = 0;
        rows.forEach((item) => {
            const fmt = getTemplateFormat(item);
            if (fmt === 'video') video++;
            else if (fmt === 'image') image++;
            else text++;
        });
        return { all: rows.length, text, image, video };
    }, [rows, mediaMap]);

    // Filtered templates
    const filteredRows = useMemo(() => {
        return rows.filter((template) => {
            if (selectedBrandId === 'all' && brandFilter !== 'all' && template.brand_id !== brandFilter) {
                return false;
            }
            if (pillarFilter !== 'all' && template.pillar_id !== pillarFilter) {
                return false;
            }
            if (formatFilter !== 'all') {
                const fmt = getTemplateFormat(template);
                if (fmt !== formatFilter) return false;
            }
            if (search.trim()) {
                const query = search.trim().toLowerCase();
                const matchName = template.name?.toLowerCase().includes(query);
                const matchTitle = template.title?.toLowerCase().includes(query);
                const matchCaption = template.caption?.toLowerCase().includes(query);
                if (!matchName && !matchTitle && !matchCaption) return false;
            }
            return true;
        });
    }, [rows, selectedBrandId, brandFilter, pillarFilter, formatFilter, search, mediaMap]);

    const hasActiveFilters =
        Boolean(search.trim()) ||
        formatFilter !== 'all' ||
        brandFilter !== 'all' ||
        pillarFilter !== 'all';

    const resetFilters = () => {
        setSearch('');
        setFormatFilter('all');
        setBrandFilter('all');
        setPillarFilter('all');
    };

    return (
        <>
            <PageHeader
                title={t('Post templates')}
                description={t(
                    'Reuse brand content as a new draft. Templates never keep publishing schedules or TikTok choices.'
                )}
                actions={
                    <Link to="/templates/create" className="btn-skew">
                        <NotePencil size={16} weight="bold" />
                        {t('Compose a template')}
                    </Link>
                }
            />

            {/* Quick Format Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                    type="button"
                    onClick={() => setFormatFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                        formatFilter === 'all'
                            ? 'bg-foreground text-background shadow-2xs font-semibold'
                            : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                    {t('All templates')} ({counts.all})
                </button>
                <button
                    type="button"
                    onClick={() => setFormatFilter('text')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                        formatFilter === 'text'
                            ? 'bg-foreground text-background shadow-2xs font-semibold'
                            : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                    <FileText size={14} weight="bold" className={formatFilter === 'text' ? 'text-brand' : 'text-amber-500'} />
                    {t('Text only')} ({counts.text})
                </button>
                <button
                    type="button"
                    onClick={() => setFormatFilter('image')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                        formatFilter === 'image'
                            ? 'bg-foreground text-background shadow-2xs font-semibold'
                            : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                    <Images size={14} weight="bold" className={formatFilter === 'image' ? 'text-brand' : 'text-blue-500'} />
                    {t('With image')} ({counts.image})
                </button>
                <button
                    type="button"
                    onClick={() => setFormatFilter('video')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                        formatFilter === 'video'
                            ? 'bg-foreground text-background shadow-2xs font-semibold'
                            : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                    <VideoCamera size={14} weight="bold" className={formatFilter === 'video' ? 'text-brand' : 'text-purple-500'} />
                    {t('With video')} ({counts.video})
                </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="panel p-3.5 mb-6 space-y-3 bg-card border border-border rounded-2xl shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[240px] max-w-md">
                        <MagnifyingGlass
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <input
                            type="text"
                            aria-label={t('Search templates')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('Search templates…')}
                            className="w-full h-9 pl-9 pr-8 text-xs rounded-xl border border-border bg-white text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Filter Selects & Controls */}
                    <div className="flex items-center gap-2 flex-wrap ml-auto">
                        {/* Brand Filter */}
                        {selectedBrandId === 'all' && brands.length > 1 && (
                            <select
                                value={brandFilter}
                                onChange={(e) => setBrandFilter(e.target.value)}
                                className="h-9 px-3 text-xs rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                            >
                                <option value="all">{t('All brands')}</option>
                                {brands.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Pillar Filter */}
                        {pillars.length > 0 && (
                            <select
                                value={pillarFilter}
                                onChange={(e) => setPillarFilter(e.target.value)}
                                className="h-9 px-3 text-xs rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                            >
                                <option value="all">{t('All pillars')}</option>
                                {pillars.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Reset Filters Button */}
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetFilters}
                                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                            >
                                <ArrowCounterClockwise size={14} />
                                <span>{t('Clear filters')}</span>
                            </Button>
                        )}

                        {/* View Mode Toggle: Grid vs Table */}
                        <div className="flex items-center rounded-xl border border-border bg-muted/40 p-0.5">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                title={t('Grid view')}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all cursor-pointer ${
                                    viewMode === 'grid'
                                        ? 'bg-white text-foreground shadow-2xs font-bold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <SquaresFour size={16} weight={viewMode === 'grid' ? 'bold' : 'regular'} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                title={t('List view')}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all cursor-pointer ${
                                    viewMode === 'table'
                                        ? 'bg-white text-foreground shadow-2xs font-bold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <ListBullets size={16} weight={viewMode === 'table' ? 'bold' : 'regular'} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div role="alert" className="mb-4 space-y-2 panel p-4 border-dangerBg">
                    <p className="text-sm text-dangerFg">{t(error)}</p>
                    <Button variant="outline" size="sm" disabled={loading || busy} onClick={() => setRefresh((v) => v + 1)}>
                        {t('Try again')}
                    </Button>
                </div>
            )}

            {/* Main Content Area */}
            {loading && !rows.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="panel p-5 space-y-3.5 bg-card border border-border rounded-2xl">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-5 w-20 rounded-md" />
                                <Skeleton className="h-5 w-24 rounded-md" />
                            </div>
                            <Skeleton className="h-5 w-3/4 rounded-md" />
                            <Skeleton className="h-28 w-full rounded-xl" />
                            <Skeleton className="h-8 w-full rounded-xl" />
                        </div>
                    ))}
                </div>
            ) : !filteredRows.length ? (
                !error && (
                    <EmptyState
                        icon={CopySimple}
                        title={t(hasActiveFilters ? 'No matching templates' : 'No templates yet')}
                        description={t(
                            hasActiveFilters
                                ? "Try adjusting your search or filters to find what you're looking for."
                                : 'Compose reusable content and save it as a template to speed up creating future posts.'
                        )}
                    >
                        {hasActiveFilters ? (
                            <Button variant="outline" size="sm" onClick={resetFilters} className="mt-3 rounded-xl text-xs">
                                <ArrowCounterClockwise size={14} className="mr-1.5" />
                                {t('Clear filters')}
                            </Button>
                        ) : (
                            <Button asChild className="btn-skew mt-3">
                                <Link to="/templates/create">
                                    <Plus size={16} weight="bold" /> {t('Compose a template')}
                                </Link>
                            </Button>
                        )}
                    </EmptyState>
                )
            ) : viewMode === 'grid' ? (
                /* Grid View (Dạng ô) */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredRows.map((template) => {
                        const brand = getBrand(template.brand_id);
                        const pillar = getPillar(template.pillar_id);
                        const angle = getAngle(template.angle_id);
                        const templateAccounts = (template.account_ids || []).map(getAccount).filter(Boolean);

                        const mediaIds = referencedMediaIds(template);
                        const firstMedia = mediaIds.length ? mediaMap[mediaIds[0]] : null;
                        const isVideo = firstMedia?.file_type === 'video';
                        const format = getTemplateFormat(template);

                        return (
                            <article
                                key={template.id}
                                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card shadow-2xs hover:shadow-md hover:border-border/80 transition-all p-4.5"
                            >
                                <div>
                                    {/* 1. Card Header: Format badge + Brand Pill */}
                                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/50">
                                        {format === 'video' ? (
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-purple-700 bg-purple-50 rounded-md px-2 py-0.5 border border-purple-200">
                                                <VideoCamera size={13} weight="fill" />
                                                <span>Video</span>
                                            </span>
                                        ) : format === 'image' ? (
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 rounded-md px-2 py-0.5 border border-blue-200">
                                                <Images size={13} weight="fill" />
                                                <span>{mediaIds.length} {t('photos')}</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 rounded-md px-2 py-0.5 border border-amber-200">
                                                <FileText size={13} weight="fill" />
                                                <span>{t('Text post')}</span>
                                            </span>
                                        )}

                                        {brand && (
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground shrink-0 rounded-md bg-muted/60 px-2 py-0.5">
                                                <span
                                                    className="h-2 w-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: brand.color || '#9ca3af' }}
                                                />
                                                <span className="truncate max-w-[110px]">{brand.name}</span>
                                            </span>
                                        )}
                                    </div>

                                    {/* 2. Title & Subtitle */}
                                    <div className="mt-3 mb-2">
                                        <h2 className="font-heading font-semibold text-base text-foreground break-words line-clamp-1 group-hover:text-primary transition-colors">
                                            {template.name}
                                        </h2>
                                        {template.title && (
                                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                {t('Default title')}: <span className="font-medium text-foreground/85">{template.title}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* 3. Media Preview (if attached) */}
                                    {firstMedia && (
                                        <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border/80 bg-muted/60 my-2.5 group/media">
                                            {isVideo ? (
                                                <div className="relative w-full h-full">
                                                    <video
                                                        src={firstMedia.file_url}
                                                        className="w-full h-full object-cover"
                                                        preload="metadata"
                                                    />
                                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                                                        <div className="h-9 w-9 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-xs">
                                                            <Play size={15} weight="fill" className="ml-0.5" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <img
                                                    src={firstMedia.file_url}
                                                    alt={template.name}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover/media:scale-105"
                                                />
                                            )}
                                            {mediaIds.length > 1 && (
                                                <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                                                    <Images size={11} weight="bold" />
                                                    <span>{mediaIds.length}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 4. Caption Preview Quote */}
                                    <div className="my-2.5 rounded-xl border border-border/40 bg-muted/30 p-3 text-xs leading-relaxed text-foreground/85">
                                        <p className="line-clamp-3 whitespace-pre-wrap break-words font-body">
                                            {template.caption ? (
                                                `"${template.caption}"`
                                            ) : (
                                                <span className="italic text-muted-foreground">{t('No caption')}</span>
                                            )}
                                        </p>
                                    </div>

                                    {/* 5. Destination Channels & Strategy Tags */}
                                    <div className="flex flex-wrap items-center gap-1.5 my-2.5 min-h-[22px]">
                                        {templateAccounts.slice(0, 3).map((acc) => (
                                            <PlatformBadge
                                                key={acc.id}
                                                platform={acc.platform}
                                                name={acc.name}
                                                size="sm"
                                            />
                                        ))}
                                        {templateAccounts.length > 3 && (
                                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded-md px-1.5 py-0.5">
                                                +{templateAccounts.length - 3}
                                            </span>
                                        )}

                                        {pillar && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground/80 bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
                                                <Target size={11} className="text-muted-foreground" />
                                                <span className="truncate max-w-[120px]">{pillar.name}</span>
                                            </span>
                                        )}
                                        {angle && (
                                            <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-md truncate max-w-[100px]">
                                                {angle.name}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* 6. Action Footer */}
                                <div className="flex items-center gap-2 pt-3 border-t border-border/50 mt-2">
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => startFromTemplate(template)}
                                        className="btn-skew h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer flex-1 justify-center"
                                        title={t('Create post from this template')}
                                    >
                                        <NotePencil size={14} weight="bold" />
                                        <span>{t('Use template')}</span>
                                    </button>

                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2.5 rounded-lg text-xs gap-1"
                                        disabled={busy}
                                    >
                                        <Link to={`/templates/create?edit=${template.id}`}>
                                            <PencilSimple size={13} />
                                            <span>{t('Edit')}</span>
                                        </Link>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                                        disabled={busy}
                                        title={t('Rename')}
                                        onClick={() => {
                                            setRename(template);
                                            setName(template.name);
                                            setError('');
                                        }}
                                    >
                                        <NotePencil size={14} />
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-dangerFg hover:bg-dangerBg/20"
                                        disabled={busy}
                                        title={t('Delete')}
                                        onClick={() => setRemove(template)}
                                    >
                                        <Trash size={14} />
                                    </Button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                /* Table View (Dạng danh sách) */
                <div className="panel bg-card border border-border rounded-2xl shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-medium">
                                    <th className="p-3.5 pl-5">{t('Template')}</th>
                                    <th className="p-3.5">{t('Brand')}</th>
                                    <th className="p-3.5">{t('Destinations')}</th>
                                    <th className="p-3.5">{t('Format')}</th>
                                    <th className="p-3.5">{t('Pillar')}</th>
                                    <th className="p-3.5 pr-5 text-right">{t('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {filteredRows.map((template) => {
                                    const brand = getBrand(template.brand_id);
                                    const pillar = getPillar(template.pillar_id);
                                    const templateAccounts = (template.account_ids || []).map(getAccount).filter(Boolean);
                                    const mediaIds = referencedMediaIds(template);
                                    const firstMedia = mediaIds.length ? mediaMap[mediaIds[0]] : null;
                                    const format = getTemplateFormat(template);

                                    return (
                                        <tr key={template.id} className="hover:bg-muted/20 transition-colors">
                                            {/* Column 1: Template Info */}
                                            <td className="p-3.5 pl-5">
                                                <div className="flex items-center gap-3">
                                                    {firstMedia ? (
                                                        <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-border/60 bg-muted/60">
                                                            <img
                                                                src={firstMedia.file_url}
                                                                alt=""
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border/50">
                                                            <FileText size={18} />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 max-w-xs">
                                                        <div className="font-medium text-foreground text-sm truncate">
                                                            {template.name}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground truncate">
                                                            {template.caption || template.title || t('No caption')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Column 2: Brand */}
                                            <td className="p-3.5 whitespace-nowrap">
                                                {brand && (
                                                    <span className="inline-flex items-center gap-1.5 text-xs text-foreground font-medium">
                                                        <span
                                                            className="h-2 w-2 rounded-full shrink-0"
                                                            style={{ backgroundColor: brand.color || '#9ca3af' }}
                                                        />
                                                        {brand.name}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Column 3: Destinations */}
                                            <td className="p-3.5">
                                                <div className="flex items-center gap-1 flex-wrap max-w-[160px]">
                                                    {templateAccounts.slice(0, 3).map((acc) => (
                                                        <PlatformBadge
                                                            key={acc.id}
                                                            platform={acc.platform}
                                                            name={acc.name}
                                                            size="sm"
                                                        />
                                                    ))}
                                                    {templateAccounts.length > 3 && (
                                                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded-md px-1 py-0.5">
                                                            +{templateAccounts.length - 3}
                                                        </span>
                                                    )}
                                                    {!templateAccounts.length && (
                                                        <span className="text-muted-foreground text-[11px]">—</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Column 4: Format */}
                                            <td className="p-3.5 whitespace-nowrap">
                                                {format === 'video' ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 rounded-md px-2 py-0.5 border border-purple-200">
                                                        <VideoCamera size={13} weight="fill" />
                                                        <span>Video</span>
                                                    </span>
                                                ) : format === 'image' ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 rounded-md px-2 py-0.5 border border-blue-200">
                                                        <Images size={13} weight="fill" />
                                                        <span>{mediaIds.length} {t('photos')}</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 rounded-md px-2 py-0.5 border border-amber-200">
                                                        <FileText size={13} weight="fill" />
                                                        <span>{t('Text post')}</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Column 5: Pillar */}
                                            <td className="p-3.5 whitespace-nowrap">
                                                {pillar ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                                                        <Target size={12} className="text-muted-foreground" />
                                                        {pillar.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-[11px]">—</span>
                                                )}
                                            </td>

                                            {/* Column 6: Actions */}
                                            <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => startFromTemplate(template)}
                                                        className="btn-skew h-7 px-2.5 text-[11px] font-semibold gap-1 cursor-pointer"
                                                        title={t('Create post from this template')}
                                                    >
                                                        <NotePencil size={13} weight="bold" />
                                                        <span>{t('Use template')}</span>
                                                    </button>

                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 px-2 text-[11px] rounded-lg"
                                                        disabled={busy}
                                                    >
                                                        <Link to={`/templates/create?edit=${template.id}`}>
                                                            {t('Edit')}
                                                        </Link>
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                                                        disabled={busy}
                                                        title={t('Rename')}
                                                        onClick={() => {
                                                            setRename(template);
                                                            setName(template.name);
                                                            setError('');
                                                        }}
                                                    >
                                                        <NotePencil size={13} />
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-dangerFg"
                                                        disabled={busy}
                                                        title={t('Delete')}
                                                        onClick={() => setRemove(template)}
                                                    >
                                                        <Trash size={13} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination / Load more */}
            {cursor && (
                <div className="mt-6 text-center">
                    <Button variant="outline" className="rounded-xl text-xs px-4" disabled={loading || busy} onClick={more}>
                        {t('Load more')}
                    </Button>
                </div>
            )}

            {/* Rename Modal */}
            <Dialog open={!!rename} onOpenChange={(value) => !value && !busy && setRename(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Rename template')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={saveName} className="space-y-4">
                        <label className="block text-xs">
                            {t('Template name')}
                            <Input
                                className="mt-2 rounded-xl text-xs"
                                required
                                maxLength={160}
                                disabled={busy}
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                            />
                        </label>
                        {error && <p role="alert" className="text-sm text-dangerFg">{t(error)}</p>}
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" disabled={busy} onClick={() => setRename(null)}>
                                {t('Cancel')}
                            </Button>
                            <button type="submit" className="btn-skew" disabled={busy || !name.trim()}>
                                {t(busy ? 'Saving…' : 'Save')}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!remove}
                onOpenChange={(value) => !value && setRemove(null)}
                title={t('Delete template?')}
                description={t(
                    'This removes the template only. Existing drafts, published posts and media files remain.'
                )}
                confirmLabel="Delete template"
                destructive
                onConfirm={async () => {
                    await appClient.entities.PostTemplate.delete(remove.id);
                    setRemove(null);
                    setRefresh((value) => value + 1);
                    toast({ title: t('Template deleted') });
                }}
            />
        </>
    );
}