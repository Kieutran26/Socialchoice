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
    DotsThree,
    Quotes,
    Globe,
    TextT,
} from '@phosphor-icons/react';
import * as HoverCard from '@radix-ui/react-hover-card';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { referencedMediaIds } from '@/lib/publishing-content';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import { getAccountAvatarUrl } from '@/lib/account-avatar';
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
                    <Link
                        to="/templates/create"
                        className="btn-skew"
                    >
                        <NotePencil size={16} weight="bold" />
                        {t('Compose a template')}
                    </Link>
                }
            />

            {/* Unified Smart Toolbar */}
            <div className="panel p-3 mb-6 space-y-3 bg-card border border-border rounded-2xl shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Format Segmented Capsule Pills */}
                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto scroll-slim">
                        <button
                            type="button"
                            onClick={() => setFormatFilter('all')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                                formatFilter === 'all'
                                    ? 'bg-card text-foreground font-bold shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <span>{t('All templates')}</span>
                            <span
                                className={`min-w-[18px] h-4.5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    formatFilter === 'all'
                                        ? 'bg-foreground text-background'
                                        : 'bg-muted text-muted-foreground'
                                }`}
                            >
                                {counts.all}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormatFilter('text')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                                formatFilter === 'text'
                                    ? 'bg-card text-foreground font-bold shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <FileText size={13} weight="bold" className="text-amber-500" />
                            <span>{t('Text only')}</span>
                            <span
                                className={`min-w-[18px] h-4.5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    formatFilter === 'text'
                                        ? 'bg-foreground text-background'
                                        : 'bg-muted text-muted-foreground'
                                }`}
                            >
                                {counts.text}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormatFilter('image')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                                formatFilter === 'image'
                                    ? 'bg-card text-foreground font-bold shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Images size={13} weight="bold" className="text-blue-500" />
                            <span>{t('With image')}</span>
                            <span
                                className={`min-w-[18px] h-4.5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    formatFilter === 'image'
                                        ? 'bg-foreground text-background'
                                        : 'bg-muted text-muted-foreground'
                                }`}
                            >
                                {counts.image}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormatFilter('video')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                                formatFilter === 'video'
                                    ? 'bg-card text-foreground font-bold shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <VideoCamera size={13} weight="bold" className="text-purple-500" />
                            <span>{t('With video')}</span>
                            <span
                                className={`min-w-[18px] h-4.5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    formatFilter === 'video'
                                        ? 'bg-foreground text-background'
                                        : 'bg-muted text-muted-foreground'
                                }`}
                            >
                                {counts.video}
                            </span>
                        </button>
                    </div>

                    {/* Right: Search + Quick Filters + View Toggle */}
                    <div className="flex items-center gap-2 flex-wrap ml-auto">
                        {/* Search Input */}
                        <div className="relative w-56 md:w-64">
                            <MagnifyingGlass
                                size={15}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                            />
                            <input
                                type="text"
                                aria-label={t('Search templates')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('Search templates…')}
                                className="w-full h-8.5 pl-8 pr-7 text-xs rounded-xl border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Brand Filter */}
                        {selectedBrandId === 'all' && brands.length > 1 && (
                            <select
                                value={brandFilter}
                                onChange={(e) => setBrandFilter(e.target.value)}
                                className="h-8.5 px-2.5 text-xs rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/10 cursor-pointer"
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
                                className="h-8.5 px-2.5 text-xs rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/10 cursor-pointer"
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
                                className="h-8.5 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                            >
                                <ArrowCounterClockwise size={13} />
                                <span>{t('Clear filters')}</span>
                            </Button>
                        )}

                        {/* View Mode Toggle: Grid vs Table */}
                        <div className="flex items-center rounded-xl border border-border bg-muted/40 p-0.5">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                title={t('Grid view')}
                                className={`flex h-7.5 w-7.5 items-center justify-center rounded-lg transition-all cursor-pointer ${
                                    viewMode === 'grid'
                                        ? 'bg-white text-foreground shadow-2xs font-bold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <SquaresFour size={15} weight={viewMode === 'grid' ? 'bold' : 'regular'} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                title={t('List view')}
                                className={`flex h-7.5 w-7.5 items-center justify-center rounded-lg transition-all cursor-pointer ${
                                    viewMode === 'table'
                                        ? 'bg-white text-foreground shadow-2xs font-bold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <ListBullets size={15} weight={viewMode === 'table' ? 'bold' : 'regular'} />
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
                            <Link
                                to="/templates/create"
                                className="btn-skew mt-3"
                            >
                                <Plus size={16} weight="bold" /> {t('Compose a template')}
                            </Link>
                        )}
                    </EmptyState>
                )
            ) : viewMode === 'grid' ? (
                /* Grid View (Dạng ô 4 cột chuẩn Option A) */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4.5">
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
                                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card shadow-2xs hover:shadow-lg transition-all duration-200 overflow-hidden h-full"
                            >
                                <div>
                                    {/* 1. TOP 16:9 BANNER */}
                                    <div className="relative w-full aspect-[16/9] bg-muted/40 overflow-hidden border-b border-border/50 shrink-0">
                                        {firstMedia ? (
                                            isVideo ? (
                                                <div
                                                    className="relative w-full h-full cursor-pointer bg-zinc-900"
                                                    onClick={() => startFromTemplate(template)}
                                                >
                                                    <video
                                                        src={firstMedia.file_url}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        preload="metadata"
                                                    />
                                                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center text-white">
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 backdrop-blur-xs shadow-md group-hover:scale-110 transition-transform">
                                                            <Play size={16} weight="fill" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    className="w-full h-full cursor-pointer bg-zinc-100"
                                                    onClick={() => startFromTemplate(template)}
                                                >
                                                    <img
                                                        src={firstMedia.file_url}
                                                        alt={template.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                </div>
                                            )
                                        ) : (
                                            /* Typographic Text Canvas for text-only templates */
                                            <div
                                                className="relative w-full h-full p-4 pt-9 bg-gradient-to-br from-amber-50/40 via-zinc-50 to-zinc-100/50 border-border/40 flex flex-col justify-center cursor-pointer select-none"
                                                onClick={() => startFromTemplate(template)}
                                            >
                                                <Quotes
                                                    size={28}
                                                    weight="duotone"
                                                    className="absolute top-7 left-3 text-amber-200 pointer-events-none opacity-50"
                                                />
                                                <p className="relative text-xs text-zinc-700 italic line-clamp-3 leading-relaxed font-serif pl-3 border-l-2 border-amber-400">
                                                    {template.caption ? `“${template.caption}”` : template.title || t('Chưa có nội dung văn bản...')}
                                                </p>
                                            </div>
                                        )}

                                        {/* Top Badges Overlay (Format on left, 3-dots Menu on right) */}
                                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
                                            <div className="pointer-events-auto">
                                                {format === 'video' ? (
                                                    <span className="px-2 py-0.5 rounded-md bg-purple-600/90 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                                                        <VideoCamera size={11} weight="fill" />
                                                        <span>Video</span>
                                                    </span>
                                                ) : format === 'image' ? (
                                                    <span className="px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                                                        <Images size={11} weight="bold" />
                                                        <span>{mediaIds.length} {t('photos')}</span>
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-md text-amber-700 text-[10px] font-bold border border-amber-200/80 shadow-2xs flex items-center gap-1">
                                                        <FileText size={11} weight="bold" />
                                                        <span>{t('Text post')}</span>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Dropdown Menu (3-dots) */}
                                            <div className="pointer-events-auto">
                                                <DropdownMenu.Root>
                                                    <DropdownMenu.Trigger asChild>
                                                        <button
                                                            type="button"
                                                            className="h-7 w-7 rounded-lg bg-white/95 backdrop-blur-md text-zinc-700 hover:text-zinc-900 hover:bg-white flex items-center justify-center shadow-xs border border-zinc-200/60 cursor-pointer transition-colors"
                                                            title={t('Options')}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <DotsThree size={18} weight="bold" />
                                                        </button>
                                                    </DropdownMenu.Trigger>
                                                    <DropdownMenu.Portal>
                                                        <DropdownMenu.Content
                                                            side="bottom"
                                                            align="end"
                                                            sideOffset={4}
                                                            className="z-50 min-w-[150px] rounded-xl bg-white p-1 text-xs shadow-xl border border-zinc-200/80 animate-in fade-in-0 zoom-in-95"
                                                        >
                                                            <DropdownMenu.Item
                                                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer outline-none font-medium"
                                                                onSelect={() => navigate(`/templates/create?edit=${template.id}`)}
                                                            >
                                                                <PencilSimple size={14} />
                                                                <span>{t('Edit')}</span>
                                                            </DropdownMenu.Item>
                                                            <DropdownMenu.Item
                                                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer outline-none font-medium"
                                                                onSelect={() => {
                                                                    setRename(template);
                                                                    setName(template.name);
                                                                    setError('');
                                                                }}
                                                            >
                                                                <TextT size={14} />
                                                                <span>{t('Rename')}</span>
                                                            </DropdownMenu.Item>
                                                            <DropdownMenu.Separator className="h-px bg-zinc-100 my-1" />
                                                            <DropdownMenu.Item
                                                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer outline-none font-medium"
                                                                onSelect={() => setRemove(template)}
                                                            >
                                                                <Trash size={14} />
                                                                <span>{t('Delete')}</span>
                                                            </DropdownMenu.Item>
                                                        </DropdownMenu.Content>
                                                    </DropdownMenu.Portal>
                                                </DropdownMenu.Root>
                                            </div>
                                        </div>

                                        {/* Hover Overlay Action (Dùng mẫu ngay) */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3 pointer-events-none group-hover:pointer-events-auto">
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => startFromTemplate(template)}
                                                className="h-8 px-4 rounded-xl bg-zinc-900 text-white hover:bg-black text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
                                            >
                                                <CopySimple size={14} weight="bold" />
                                                <span>{t('Dùng mẫu ngay')}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 2. BODY INFO */}
                                    <div className="p-3.5 space-y-2">
                                        {/* Brand & Content Pillar Tag */}
                                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                                            {brand && (
                                                <span
                                                    className="h-2 w-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: brand.color || '#9ca3af' }}
                                                />
                                            )}
                                            <span className="font-semibold text-foreground truncate max-w-[100px]">
                                                {brand?.name || '—'}
                                            </span>
                                            {pillar && (
                                                <>
                                                    <span className="text-muted-foreground/50">·</span>
                                                    <span className="px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-medium truncate max-w-[120px]">
                                                        {pillar.name}
                                                        {angle?.name ? ` / ${angle.name}` : ''}
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        {/* Template Name */}
                                        <h3
                                            onClick={() => startFromTemplate(template)}
                                            className="font-heading font-bold text-sm text-foreground hover:text-brand-dark transition-colors line-clamp-1 cursor-pointer leading-snug"
                                            title={template.name}
                                        >
                                            {template.name}
                                        </h3>

                                        {/* Template Subtitle / Default Title */}
                                        {template.title ? (
                                            <p className="text-[11px] text-muted-foreground truncate">
                                                {t('Default title')}: <span className="font-medium text-foreground/80">{template.title}</span>
                                            </p>
                                        ) : firstMedia ? (
                                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                                {template.caption || <span className="italic text-muted-foreground/50">{t('No caption')}</span>}
                                            </p>
                                        ) : (
                                            <p className="text-[11px] text-muted-foreground/70 truncate">
                                                {angle?.name ? angle.name : t('Mẫu bài viết')}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* 3. CARD FOOTER */}
                                <div className="px-3.5 py-2.5 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-2 mt-auto">
                                    {/* Stacked Avatars with Radix White Tooltip */}
                                    {templateAccounts.length > 0 ? (
                                        <HoverCard.Root openDelay={80} closeDelay={150}>
                                            <HoverCard.Trigger asChild>
                                                <div className="inline-flex items-center -space-x-2 cursor-pointer py-0.5 shrink-0">
                                                    {templateAccounts.slice(0, 2).map((acc) => {
                                                        const cfg = PLATFORM_CONFIG[acc.platform] || {
                                                            icon: Globe,
                                                            color: 'text-zinc-600',
                                                            bg: 'bg-zinc-100',
                                                            border: 'border-zinc-200',
                                                        };
                                                        const Icon = cfg.icon;
                                                        const avatarUrl = getAccountAvatarUrl(acc);

                                                        return (
                                                            <div
                                                                key={acc.id}
                                                                className="relative h-7 w-7 rounded-full ring-2 ring-white shadow-2xs shrink-0 transition-transform hover:-translate-y-0.5 hover:scale-110 hover:z-20 bg-zinc-100"
                                                                style={{ width: '28px', height: '28px' }}
                                                            >
                                                                <div className="h-full w-full rounded-full overflow-hidden flex items-center justify-center">
                                                                    {avatarUrl ? (
                                                                        <img
                                                                            src={avatarUrl}
                                                                            alt={acc.name}
                                                                            className="h-full w-full object-cover block rounded-full"
                                                                            style={{ width: '100%', height: '100%' }}
                                                                            onError={(e) => {
                                                                                e.currentTarget.style.display = 'none';
                                                                            }}
                                                                        />
                                                                    ) : null}
                                                                    <span
                                                                        className={`h-full w-full flex items-center justify-center font-bold text-[10px] text-zinc-700 ${cfg.bg}`}
                                                                        style={{ display: avatarUrl ? 'none' : 'flex' }}
                                                                    >
                                                                        {acc.name
                                                                            ? acc.name.slice(0, 2).toUpperCase()
                                                                            : <Icon size={12} weight="fill" className={cfg.color} />}
                                                                    </span>
                                                                </div>
                                                                {/* Platform corner badge */}
                                                                <span
                                                                    className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-2xs flex items-center justify-center ring-1 ring-white"
                                                                    style={{ width: '14px', height: '14px' }}
                                                                >
                                                                    <Icon size={9} weight="fill" className={cfg.color} />
                                                                </span>
                                                            </div>
                                                        );
                                                    })}

                                                    {templateAccounts.length > 2 && (
                                                        <div
                                                            className="relative h-7 w-7 rounded-full ring-2 ring-white bg-zinc-100 text-zinc-700 font-bold text-[10px] flex items-center justify-center shadow-2xs shrink-0 hover:bg-zinc-200 transition-colors"
                                                            style={{ width: '28px', height: '28px' }}
                                                        >
                                                            +{templateAccounts.length - 2}
                                                        </div>
                                                    )}
                                                </div>
                                            </HoverCard.Trigger>

                                            {/* White Tooltip Portal */}
                                            <HoverCard.Portal>
                                                <HoverCard.Content
                                                    side="top"
                                                    align="start"
                                                    sideOffset={8}
                                                    className="z-50 flex flex-col gap-1.5 rounded-xl bg-white text-zinc-900 p-3 text-[11px] shadow-xl border border-zinc-200/80 min-w-[210px] max-w-[280px]"
                                                >
                                                    <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
                                                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                                            {t('Kênh áp dụng mẫu')}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded-full">
                                                            {templateAccounts.length}
                                                        </span>
                                                    </div>
                                                    <div className="divide-y divide-zinc-100 max-h-56 overflow-y-auto scroll-slim">
                                                        {templateAccounts.map((acc) => {
                                                            const cfg = PLATFORM_CONFIG[acc.platform] || {
                                                                icon: Globe,
                                                                color: 'text-zinc-600',
                                                                bg: 'bg-zinc-100',
                                                            };
                                                            const Icon = cfg.icon;
                                                            const avUrl = getAccountAvatarUrl(acc);
                                                            return (
                                                                <div key={acc.id} className="py-1.5 flex items-center gap-2 truncate">
                                                                    <div className="relative h-6 w-6 rounded-full overflow-hidden shrink-0 bg-zinc-100 ring-1 ring-zinc-200/80 flex items-center justify-center text-[10px] font-bold text-zinc-700">
                                                                        {avUrl ? (
                                                                            <img
                                                                                src={avUrl}
                                                                                alt=""
                                                                                className="h-full w-full object-cover block"
                                                                                onError={(e) => {
                                                                                    e.currentTarget.style.display = 'none';
                                                                                }}
                                                                            />
                                                                        ) : null}
                                                                        <Icon size={12} weight="fill" className={cfg.color} />
                                                                    </div>
                                                                    <span className="font-semibold text-zinc-800 truncate flex-1">
                                                                        {acc.name}
                                                                    </span>
                                                                    <span className="text-[10px] text-zinc-400 font-medium shrink-0 flex items-center gap-1">
                                                                        <Icon size={11} weight="fill" className={cfg.color} />
                                                                        {cfg.label || acc.platform}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <HoverCard.Arrow className="fill-white" />
                                                </HoverCard.Content>
                                            </HoverCard.Portal>
                                        </HoverCard.Root>
                                    ) : (
                                        <span className="text-muted-foreground text-[11px]">—</span>
                                    )}

                                    {/* Footer Actions */}
                                    <div className="flex items-center gap-1.5 ml-auto">
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="h-7 px-2.5 rounded-lg text-xs gap-1"
                                            disabled={busy}
                                        >
                                            <Link to={`/templates/create?edit=${template.id}`}>
                                                <PencilSimple size={12} />
                                                <span>{t('Edit')}</span>
                                            </Link>
                                        </Button>
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => startFromTemplate(template)}
                                            className="h-7 px-3 text-xs font-bold rounded-lg bg-zinc-900 text-white hover:bg-black gap-1.5 cursor-pointer flex items-center shadow-xs transition-colors"
                                            title={t('Create post from this template')}
                                        >
                                            <CopySimple size={13} weight="bold" />
                                            <span>{t('Use template')}</span>
                                        </button>
                                    </div>
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
                                                {templateAccounts.length > 0 ? (
                                                    <HoverCard.Root openDelay={80} closeDelay={150}>
                                                        <HoverCard.Trigger asChild>
                                                            <div className="inline-flex items-center -space-x-2 cursor-pointer py-0.5">
                                                                {templateAccounts.slice(0, 3).map((acc) => {
                                                                    const cfg = PLATFORM_CONFIG[acc.platform] || {
                                                                        icon: Globe,
                                                                        color: 'text-zinc-600',
                                                                        bg: 'bg-zinc-100',
                                                                        border: 'border-zinc-200',
                                                                    };
                                                                    const Icon = cfg.icon;
                                                                    const avatarUrl = getAccountAvatarUrl(acc);

                                                                    return (
                                                                        <div
                                                                            key={acc.id}
                                                                            className="relative h-7 w-7 rounded-full ring-2 ring-white shadow-2xs shrink-0 transition-transform hover:-translate-y-0.5 hover:scale-110 hover:z-20 bg-zinc-100"
                                                                            style={{ width: '28px', height: '28px' }}
                                                                        >
                                                                            <div className="h-full w-full rounded-full overflow-hidden flex items-center justify-center">
                                                                                {avatarUrl ? (
                                                                                    <img
                                                                                        src={avatarUrl}
                                                                                        alt={acc.name}
                                                                                        className="h-full w-full object-cover block rounded-full"
                                                                                        style={{ width: '100%', height: '100%' }}
                                                                                        onError={(e) => {
                                                                                            e.currentTarget.style.display = 'none';
                                                                                        }}
                                                                                    />
                                                                                ) : null}
                                                                                <span
                                                                                    className={`h-full w-full flex items-center justify-center font-bold text-[10px] text-zinc-700 ${cfg.bg}`}
                                                                                    style={{ display: avatarUrl ? 'none' : 'flex' }}
                                                                                >
                                                                                    {acc.name
                                                                                        ? acc.name.slice(0, 2).toUpperCase()
                                                                                        : <Icon size={12} weight="fill" className={cfg.color} />}
                                                                                </span>
                                                                            </div>
                                                                            <span
                                                                                className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-2xs flex items-center justify-center ring-1 ring-white"
                                                                                style={{ width: '14px', height: '14px' }}
                                                                            >
                                                                                <Icon size={9} weight="fill" className={cfg.color} />
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}

                                                                {templateAccounts.length > 3 && (
                                                                    <div
                                                                        className="relative h-7 w-7 rounded-full ring-2 ring-white bg-zinc-100 text-zinc-700 font-bold text-[10px] flex items-center justify-center shadow-2xs shrink-0 hover:bg-zinc-200 transition-colors"
                                                                        style={{ width: '28px', height: '28px' }}
                                                                    >
                                                                        +{templateAccounts.length - 3}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </HoverCard.Trigger>
                                                        <HoverCard.Portal>
                                                            <HoverCard.Content
                                                                side="top"
                                                                align="center"
                                                                sideOffset={8}
                                                                className="z-50 flex flex-col gap-1.5 rounded-xl bg-white text-zinc-900 p-3 text-[11px] shadow-xl border border-zinc-200/80 min-w-[210px] max-w-[280px]"
                                                            >
                                                                <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
                                                                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                                                        {t('Kênh áp dụng mẫu')}
                                                                    </span>
                                                                    <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded-full">
                                                                        {templateAccounts.length}
                                                                    </span>
                                                                </div>
                                                                <div className="divide-y divide-zinc-100 max-h-56 overflow-y-auto scroll-slim">
                                                                    {templateAccounts.map((acc) => {
                                                                        const cfg = PLATFORM_CONFIG[acc.platform] || {
                                                                            icon: Globe,
                                                                            color: 'text-zinc-600',
                                                                            bg: 'bg-zinc-100',
                                                                        };
                                                                        const Icon = cfg.icon;
                                                                        const avUrl = getAccountAvatarUrl(acc);
                                                                        return (
                                                                            <div key={acc.id} className="py-1.5 flex items-center gap-2 truncate">
                                                                                <div className="relative h-6 w-6 rounded-full overflow-hidden shrink-0 bg-zinc-100 ring-1 ring-zinc-200/80 flex items-center justify-center text-[10px] font-bold text-zinc-700">
                                                                                    {avUrl ? (
                                                                                        <img
                                                                                            src={avUrl}
                                                                                            alt=""
                                                                                            className="h-full w-full object-cover block"
                                                                                            onError={(e) => {
                                                                                                e.currentTarget.style.display = 'none';
                                                                                            }}
                                                                                        />
                                                                                    ) : null}
                                                                                    <Icon size={12} weight="fill" className={cfg.color} />
                                                                                </div>
                                                                                <span className="font-semibold text-zinc-800 truncate flex-1">
                                                                                    {acc.name}
                                                                                </span>
                                                                                <span className="text-[10px] text-zinc-400 font-medium shrink-0 flex items-center gap-1">
                                                                                    <Icon size={11} weight="fill" className={cfg.color} />
                                                                                    {cfg.label || acc.platform}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <HoverCard.Arrow className="fill-white" />
                                                            </HoverCard.Content>
                                                        </HoverCard.Portal>
                                                    </HoverCard.Root>
                                                ) : (
                                                    <span className="text-muted-foreground text-[11px]">—</span>
                                                )}
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
                                                        className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-zinc-900 text-white hover:bg-black gap-1 cursor-pointer flex items-center shadow-xs transition-colors"
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