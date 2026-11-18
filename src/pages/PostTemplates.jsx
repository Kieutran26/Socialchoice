import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowCounterClockwise,
    ArrowDown,
    DotsThree,
    Eye,
    FileText,
    Images,
    ListBullets,
    MagnifyingGlass,
    NotePencil,
    PencilSimple,
    Play,
    Plus,
    Quotes,
    SquaresFour,
    Trash,
    VideoCamera,
    X,
} from '@phosphor-icons/react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { referencedMediaIds } from '@/lib/publishing-content';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import { getAccountAvatarUrl } from '@/lib/account-avatar';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

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
    const [previewTemplate, setPreviewTemplate] = useState(null);

    const [search, setSearch] = useState('');
    const [formatFilter, setFormatFilter] = useState('all'); // 'all' | 'text' | 'image' | 'video'
    const [brandFilter, setBrandFilter] = useState('all');
    const [pillarFilter, setPillarFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

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
                    setRows(page.items || []);
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
                setRows((current) => [...current, ...(page.items || [])]);
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
                title: t('Đã tạo bản nháp từ mẫu'),
                description: warnings?.length
                    ? warnings.map((warning) => t(warning)).join(' ')
                    : t('Kiểm tra lại kênh đăng, media và thời gian xuất bản trước khi đăng.'),
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
            toast({ title: t('Đã cập nhật tên mẫu') });
        } catch (failure) {
            setError(failure.message);
        } finally {
            setBusy(false);
        }
    }

    const getTemplateFormat = (template) => {
        const ids = referencedMediaIds(template);
        if (!ids.length) return 'text';
        const first = mediaMap[ids[0]];
        if (first?.file_type === 'video') return 'video';
        return 'image';
    };

    const brandsById = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);
    const pillarsById = useMemo(() => new Map(pillars.map((p) => [p.id, p])), [pillars]);
    const anglesById = useMemo(() => new Map(angles.map((a) => [a.id, a])), [angles]);
    const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

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

    const formatTabs = [
        { key: 'all', label: t('Tất cả'), count: counts.all, icon: Quotes },
        { key: 'text', label: t('Văn bản'), count: counts.text, icon: FileText },
        { key: 'image', label: t('Hình ảnh'), count: counts.image, icon: Images },
        { key: 'video', label: t('Video'), count: counts.video, icon: VideoCamera },
    ];

    const formatBadgeMeta = {
        text: { label: t('Văn bản'), icon: FileText, cls: 'bg-zinc-100 text-zinc-700 border-border' },
        image: { label: t('Hình ảnh'), icon: Images, cls: 'bg-brand-100 text-brand-ink border-brand-dark/30' },
        video: { label: t('Video'), icon: VideoCamera, cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    };

    return (
        <div className="w-full space-y-5">
            {/* Đầu trang Clean Studio */}
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-dark bg-brand text-brand-ink">
                        <Quotes size={20} weight="duotone" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="truncate font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                {t('Mẫu bài viết')}
                            </h1>
                            <span className="inline-flex shrink-0 items-center rounded-full border border-brand-dark/30 bg-brand-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand-ink">
                                {counts.all} {t('mẫu')}
                            </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {t('Tái sử dụng nhanh cấu trúc nội dung, media và kênh phân phối cho thương hiệu.')}
                        </p>
                    </div>
                </div>

                <Link to="/templates/create" className="btn-skew min-h-9 shrink-0 self-start whitespace-nowrap sm:self-center">
                    <Plus size={15} weight="bold" />
                    <span>{t('Tạo mẫu mới')}</span>
                </Link>
            </header>

            {/* Thanh điều khiển lọc & chuyển chế độ xem */}
            <section className="panel space-y-3 p-3.5 sm:p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    {/* Format Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {formatTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = formatFilter === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setFormatFilter(tab.key)}
                                    className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors ${
                                        isActive
                                            ? 'border-brand-dark bg-brand font-semibold text-brand-ink'
                                            : 'border-border bg-card text-foreground hover:bg-zinc-100'
                                    }`}
                                >
                                    <Icon size={13} weight="bold" />
                                    <span>{tab.label}</span>
                                    <span
                                        className={`tabular-nums text-xs ${
                                            isActive ? 'font-bold text-brand-ink' : 'text-muted-foreground'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search + Dropdowns + View Toggle */}
                    <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
                        <div className="relative w-full min-w-0 sm:w-56 xl:w-64">
                            <MagnifyingGlass
                                size={15}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                            <input
                                type="text"
                                aria-label={t('Tìm kiếm mẫu bài viết')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('Tìm tên mẫu, nội dung…')}
                                className="h-9 w-full rounded-xl border border-border bg-zinc-50/70 pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-brand-dark focus:bg-card focus:outline-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    aria-label={t('Xóa từ khóa')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {selectedBrandId === 'all' && brands.length > 1 && (
                            <select
                                aria-label={t('Lọc theo thương hiệu')}
                                value={brandFilter}
                                onChange={(e) => setBrandFilter(e.target.value)}
                                className="h-9 cursor-pointer rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:border-brand-dark focus:outline-none"
                            >
                                <option value="all">{t('Tất cả thương hiệu')}</option>
                                {brands.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        )}

                        {pillars.length > 0 && (
                            <select
                                aria-label={t('Lọc theo trụ cột')}
                                value={pillarFilter}
                                onChange={(e) => setPillarFilter(e.target.value)}
                                className="h-9 cursor-pointer rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:border-brand-dark focus:outline-none"
                            >
                                <option value="all">{t('Tất cả trụ cột')}</option>
                                {pillars.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        )}

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="inline-flex min-h-9 cursor-pointer items-center gap-1 whitespace-nowrap rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-zinc-100"
                            >
                                <ArrowCounterClockwise size={14} />
                                <span>{t('Đặt lại')}</span>
                            </button>
                        )}

                        <div className="flex items-center rounded-xl border border-border bg-zinc-100 p-0.5">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                aria-label={t('Xem dạng thẻ')}
                                className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-xs font-medium transition-colors ${
                                    viewMode === 'grid'
                                        ? 'bg-brand font-semibold text-brand-ink'
                                        : 'text-zinc-600 hover:text-foreground'
                                }`}
                            >
                                <SquaresFour size={15} weight="bold" />
                                <span className="hidden sm:inline">{t('Thẻ mẫu')}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                aria-label={t('Xem dạng danh sách')}
                                className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-xs font-medium transition-colors ${
                                    viewMode === 'list'
                                        ? 'bg-brand font-semibold text-brand-ink'
                                        : 'text-zinc-600 hover:text-foreground'
                                }`}
                            >
                                <ListBullets size={15} weight="bold" />
                                <span className="hidden sm:inline">{t('Danh sách')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Error state */}
            {error && (
                <div role="alert" className="panel flex flex-wrap items-center justify-between gap-3 border-red-200 bg-red-50 p-4">
                    <p className="text-xs font-medium text-red-700">{t(error)}</p>
                    <button
                        type="button"
                        disabled={loading || busy}
                        onClick={() => setRefresh((v) => v + 1)}
                        className="inline-flex min-h-8 cursor-pointer items-center rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                        {t('Thử lại')}
                    </button>
                </div>
            )}

            {/* Main Content */}
            {loading && !rows.length ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="panel space-y-3 p-4">
                            <Skeleton className="h-36 w-full rounded-xl" />
                            <Skeleton className="h-5 w-2/3 rounded-md" />
                            <Skeleton className="h-4 w-full rounded-md" />
                            <Skeleton className="h-9 w-full rounded-xl" />
                        </div>
                    ))}
                </div>
            ) : !filteredRows.length ? (
                <EmptyState
                    icon={Quotes}
                    title={rows.length ? t('Không có mẫu phù hợp') : t('Chưa có mẫu bài viết nào')}
                    description={
                        rows.length
                            ? t('Thử xóa bộ lọc hoặc tìm kiếm với từ khóa khác.')
                            : t('Lưu lại những bài viết hiệu quả thành mẫu để cả team tái sử dụng chỉ với 1 click.')
                    }
                >
                    {rows.length ? (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground hover:bg-zinc-100"
                        >
                            {t('Xóa bộ lọc')}
                        </button>
                    ) : (
                        <Link to="/templates/create" className="btn-skew min-h-9 whitespace-nowrap">
                            <Plus size={15} weight="bold" />
                            <span>{t('Tạo mẫu đầu tiên')}</span>
                        </Link>
                    )}
                </EmptyState>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredRows.map((template) => {
                        const fmt = getTemplateFormat(template);
                        const fmtMeta = formatBadgeMeta[fmt];
                        const FmtIcon = fmtMeta.icon;
                        const brand = brandsById.get(template.brand_id);
                        const pillar = pillarsById.get(template.pillar_id);
                        const angle = anglesById.get(template.angle_id);
                        const templateAccounts = (template.account_ids || [])
                            .map((id) => accountsById.get(id))
                            .filter(Boolean);
                        const mediaIds = referencedMediaIds(template);
                        const firstMedia = mediaIds.length ? mediaMap[mediaIds[0]] : null;

                        return (
                            <article
                                key={template.id}
                                className="panel flex min-w-0 flex-col justify-between overflow-hidden transition-colors hover:border-zinc-300"
                            >
                                <div className="space-y-3 p-4">
                                    {/* Top Row: Format Badge + Brand + Menu */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span
                                                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${fmtMeta.cls}`}
                                            >
                                                <FmtIcon size={12} weight="bold" />
                                                <span>{fmtMeta.label}</span>
                                            </span>
                                            {brand && (
                                                <span className="flex min-w-0 items-center gap-1 truncate text-xs font-medium text-muted-foreground">
                                                    <span
                                                        className="h-2 w-2 shrink-0 rounded-full"
                                                        style={{ backgroundColor: brand.color || '#ffd631' }}
                                                    />
                                                    <span className="truncate">{brand.name}</span>
                                                </span>
                                            )}
                                        </div>

                                        <DropdownMenu.Root>
                                            <DropdownMenu.Trigger asChild>
                                                <button
                                                    type="button"
                                                    aria-label={t('Tùy chọn mẫu')}
                                                    className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-zinc-100 hover:text-foreground"
                                                >
                                                    <DotsThree size={18} weight="bold" />
                                                </button>
                                            </DropdownMenu.Trigger>
                                            <DropdownMenu.Portal>
                                                <DropdownMenu.Content
                                                    align="end"
                                                    className="z-50 min-w-[160px] rounded-xl border border-border bg-card p-1 shadow-lg"
                                                >
                                                    <DropdownMenu.Item
                                                        onSelect={() => setPreviewTemplate(template)}
                                                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground outline-none hover:bg-zinc-100"
                                                    >
                                                        <Eye size={14} />
                                                        <span>{t('Xem chi tiết')}</span>
                                                    </DropdownMenu.Item>
                                                    <DropdownMenu.Item
                                                        onSelect={() => navigate(`/templates/create?edit=${template.id}`)}
                                                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground outline-none hover:bg-zinc-100"
                                                    >
                                                        <PencilSimple size={14} />
                                                        <span>{t('Chỉnh sửa mẫu')}</span>
                                                    </DropdownMenu.Item>
                                                    <DropdownMenu.Item
                                                        onSelect={() => {
                                                            setRename(template);
                                                            setName(template.name || '');
                                                            setError('');
                                                        }}
                                                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground outline-none hover:bg-zinc-100"
                                                    >
                                                        <NotePencil size={14} />
                                                        <span>{t('Đổi tên')}</span>
                                                    </DropdownMenu.Item>
                                                    <DropdownMenu.Separator className="my-1 h-px bg-border" />
                                                    <DropdownMenu.Item
                                                        onSelect={() => setRemove(template)}
                                                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-red-700 outline-none hover:bg-red-50"
                                                    >
                                                        <Trash size={14} />
                                                        <span>{t('Xóa mẫu')}</span>
                                                    </DropdownMenu.Item>
                                                </DropdownMenu.Content>
                                            </DropdownMenu.Portal>
                                        </DropdownMenu.Root>
                                    </div>

                                    {/* Visual Media or Text Quote Preview */}
                                    <div
                                        onClick={() => setPreviewTemplate(template)}
                                        className="cursor-pointer overflow-hidden rounded-xl border border-border bg-zinc-50"
                                    >
                                        {firstMedia ? (
                                            <div className="relative aspect-[16/9] w-full bg-zinc-100">
                                                {firstMedia.file_type === 'video' ? (
                                                    <>
                                                        <video
                                                            src={firstMedia.file_url}
                                                            className="h-full w-full object-cover"
                                                            preload="metadata"
                                                        />
                                                        <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                                                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60">
                                                                <Play size={16} weight="fill" />
                                                            </span>
                                                        </span>
                                                    </>
                                                ) : (
                                                    <img
                                                        src={firstMedia.file_url}
                                                        alt={template.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                )}
                                                {mediaIds.length > 1 && (
                                                    <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
                                                        +{mediaIds.length - 1}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex min-h-[112px] flex-col justify-between p-3.5">
                                                <Quotes size={18} weight="duotone" className="text-brand-dark" />
                                                <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                                                    {template.caption || template.title || t('Mẫu nội dung văn bản')}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Template Name & Caption */}
                                    <div className="space-y-1">
                                        <h2
                                            onClick={() => setPreviewTemplate(template)}
                                            className="cursor-pointer break-words font-heading text-sm font-semibold text-foreground hover:underline"
                                        >
                                            {template.name}
                                        </h2>
                                        {firstMedia && (template.caption || template.title) && (
                                            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                                {template.caption || template.title}
                                            </p>
                                        )}
                                    </div>

                                    {/* Strategy & Channels */}
                                    {(pillar || angle || templateAccounts.length > 0) && (
                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                            {(pillar || angle) && (
                                                <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                                                    {pillar?.name}
                                                    {pillar && angle ? ' · ' : ''}
                                                    {angle?.name}
                                                </span>
                                            )}
                                            {templateAccounts.slice(0, 3).map((acc) => {
                                                const cfg = PLATFORM_CONFIG[acc.platform];
                                                const Icon = cfg?.icon;
                                                const avatar = getAccountAvatarUrl(acc);
                                                return (
                                                    <span
                                                        key={acc.id}
                                                        title={acc.name}
                                                        className="inline-flex h-6 items-center gap-1 rounded-full border border-border bg-card px-2 text-xs text-foreground"
                                                    >
                                                        {avatar ? (
                                                            <img
                                                                src={avatar}
                                                                alt={acc.name}
                                                                className="h-4 w-4 rounded-full object-cover"
                                                            />
                                                        ) : Icon ? (
                                                            <Icon size={12} className={cfg.color} />
                                                        ) : null}
                                                        <span className="max-w-[70px] truncate">{acc.name}</span>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Card Action Footer */}
                                <div className="flex items-center gap-2 border-t border-border bg-zinc-50/70 px-4 py-3">
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => startFromTemplate(template)}
                                        className="btn-skew min-h-9 flex-1 justify-center whitespace-nowrap cursor-pointer disabled:opacity-50"
                                    >
                                        <NotePencil size={15} weight="bold" />
                                        <span>{t('Dùng mẫu ngay')}</span>
                                    </button>
                                    <Link
                                        to={`/templates/create?edit=${template.id}`}
                                        className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-zinc-100"
                                    >
                                        {t('Sửa')}
                                    </Link>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                /* List View (No Horizontal Overflow) */
                <section className="panel divide-y divide-border overflow-hidden">
                    {filteredRows.map((template) => {
                        const fmt = getTemplateFormat(template);
                        const fmtMeta = formatBadgeMeta[fmt];
                        const FmtIcon = fmtMeta.icon;
                        const brand = brandsById.get(template.brand_id);
                        const pillar = pillarsById.get(template.pillar_id);
                        const mediaIds = referencedMediaIds(template);
                        const firstMedia = mediaIds.length ? mediaMap[mediaIds[0]] : null;

                        return (
                            <article
                                key={template.id}
                                className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-50/80 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewTemplate(template)}
                                        className="relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-border bg-zinc-100"
                                    >
                                        {firstMedia ? (
                                            <img
                                                src={firstMedia.file_url}
                                                alt={template.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <Quotes size={20} weight="duotone" className="text-brand-dark" />
                                        )}
                                    </button>

                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                onClick={() => setPreviewTemplate(template)}
                                                className="cursor-pointer break-words font-heading text-sm font-semibold text-foreground hover:underline"
                                            >
                                                {template.name}
                                            </span>
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${fmtMeta.cls}`}
                                            >
                                                <FmtIcon size={11} weight="bold" />
                                                <span>{fmtMeta.label}</span>
                                            </span>
                                            {brand && (
                                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                    <span
                                                        className="h-2 w-2 rounded-full"
                                                        style={{ backgroundColor: brand.color || '#ffd631' }}
                                                    />
                                                    <span>{brand.name}</span>
                                                </span>
                                            )}
                                            {pillar && (
                                                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                                                    {pillar.name}
                                                </span>
                                            )}
                                        </div>
                                        {(template.caption || template.title) && (
                                            <p className="line-clamp-1 text-xs text-muted-foreground">
                                                {template.caption || template.title}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center justify-end gap-1.5">
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => startFromTemplate(template)}
                                        className="btn-skew min-h-8 whitespace-nowrap cursor-pointer disabled:opacity-50"
                                    >
                                        <NotePencil size={14} weight="bold" />
                                        <span>{t('Dùng mẫu')}</span>
                                    </button>
                                    <Link
                                        to={`/templates/create?edit=${template.id}`}
                                        className="inline-flex min-h-8 items-center rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-zinc-100"
                                    >
                                        {t('Sửa')}
                                    </Link>
                                    <button
                                        type="button"
                                        disabled={busy}
                                        title={t('Đổi tên')}
                                        onClick={() => {
                                            setRename(template);
                                            setName(template.name || '');
                                            setError('');
                                        }}
                                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-zinc-100 hover:text-foreground"
                                    >
                                        <PencilSimple size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busy}
                                        title={t('Xóa mẫu')}
                                        onClick={() => setRemove(template)}
                                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                    >
                                        <Trash size={14} />
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}

            {/* Pagination */}
            {cursor && (
                <div className="flex justify-center pt-2">
                    <button
                        type="button"
                        disabled={loading || busy}
                        onClick={more}
                        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground hover:bg-zinc-100 disabled:opacity-50"
                    >
                        <ArrowDown size={14} weight="bold" />
                        <span>{t('Tải thêm mẫu')}</span>
                    </button>
                </div>
            )}

            {/* Preview Modal */}
            <Dialog open={Boolean(previewTemplate)} onOpenChange={(o) => !o && setPreviewTemplate(null)}>
                <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6">
                    {previewTemplate && (
                        <div className="space-y-4">
                            <DialogHeader className="text-left">
                                <DialogTitle className="font-heading text-base font-semibold text-foreground">
                                    {previewTemplate.name}
                                </DialogTitle>
                                {previewTemplate.title && (
                                    <DialogDescription className="text-xs text-muted-foreground">
                                        {previewTemplate.title}
                                    </DialogDescription>
                                )}
                            </DialogHeader>

                            {(() => {
                                const mediaIds = referencedMediaIds(previewTemplate);
                                const firstMedia = mediaIds.length ? mediaMap[mediaIds[0]] : null;
                                return firstMedia?.file_url ? (
                                    <div className="overflow-hidden rounded-xl border border-border bg-zinc-50">
                                        <img
                                            src={firstMedia.file_url}
                                            alt={previewTemplate.name}
                                            className="max-h-72 w-full object-contain"
                                        />
                                    </div>
                                ) : null;
                            })()}

                            <div className="whitespace-pre-wrap rounded-xl border border-border bg-zinc-50/70 p-4 text-xs leading-relaxed text-foreground">
                                {previewTemplate.caption || t('Chưa có nội dung caption.')}
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                                <Link
                                    to={`/templates/create?edit=${previewTemplate.id}`}
                                    className="inline-flex min-h-9 items-center rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground hover:bg-zinc-100"
                                >
                                    {t('Chỉnh sửa mẫu')}
                                </Link>
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                        const target = previewTemplate;
                                        setPreviewTemplate(null);
                                        startFromTemplate(target);
                                    }}
                                    className="btn-skew min-h-9 cursor-pointer whitespace-nowrap"
                                >
                                    <NotePencil size={15} weight="bold" />
                                    <span>{t('Dùng mẫu này để tạo bài')}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Rename Modal */}
            <Dialog open={!!rename} onOpenChange={(value) => !value && !busy && setRename(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Đổi tên mẫu bài viết')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={saveName} className="space-y-4">
                        <label className="block text-xs font-medium text-foreground">
                            {t('Tên mẫu')}
                            <Input
                                className="mt-2 rounded-xl text-xs"
                                required
                                maxLength={160}
                                disabled={busy}
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                            />
                        </label>
                        {error && (
                            <p role="alert" className="text-xs font-medium text-red-700">
                                {t(error)}
                            </p>
                        )}
                        <div className="flex justify-end gap-2.5">
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => setRename(null)}
                                className="min-h-9 cursor-pointer rounded-xl border border-border bg-card px-4 text-xs font-medium text-foreground hover:bg-zinc-100"
                            >
                                {t('Hủy')}
                            </button>
                            <button type="submit" className="btn-skew min-h-9 cursor-pointer" disabled={busy || !name.trim()}>
                                <span>{busy ? t('Đang lưu…') : t('Lưu thay đổi')}</span>
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!remove}
                onOpenChange={(value) => !value && setRemove(null)}
                title={t('Xóa mẫu bài viết này?')}
                description={t(
                    'Thao tác này chỉ xóa mẫu khỏi thư viện. Các bài nháp, bài đã xuất bản và tệp media liên quan vẫn được giữ nguyên.'
                )}
                confirmLabel={t('Xóa mẫu')}
                destructive
                onConfirm={async () => {
                    await appClient.entities.PostTemplate.delete(remove.id);
                    setRemove(null);
                    setRefresh((value) => value + 1);
                    toast({ title: t('Đã xóa mẫu bài viết') });
                }}
            />
        </div>
    );
}
