import { useState, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    generateStrategyPlan,
    regeneratePlanItem,
    applyPlanToCalendar,
    seedBrandSampleAssets,
} from '@/lib/ai-content-strategist';
import {
    Sparkle,
    Stack,
    TreeStructure,
    Images,
    ArrowsClockwise,
    CheckCircle,
    Check,
    PencilSimple,
    Trash,
    Plus,
    WarningCircle,
    Table,
    SquaresFour,
    Lightning,
    MagnifyingGlass,
    CheckSquareOffset,
} from '@phosphor-icons/react';
import PlatformBadge from '@/components/common/PlatformBadge';

const PLATFORM_OPTIONS = [
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'threads', label: 'Threads' },
];

export default function AIContentStrategist({
    brand,
    pillars = [],
    angles = [],
    assets = [],
    appClient,
    onPlanApplied,
    onRefreshAssets,
}) {
    const { t } = useTranslation();
    const { toast } = useToast();

    // Configuration state
    const [days, setDays] = useState(30);
    const [frequency, setFrequency] = useState('1_per_day');
    const [selectedPlatforms, setSelectedPlatforms] = useState(['facebook', 'instagram']);
    const [generating, setGenerating] = useState(false);
    const [applying, setApplying] = useState(false);
    const [seedingAssets, setSeedingAssets] = useState(false);

    // Current generated plan
    const [currentPlan, setCurrentPlan] = useState(null);

    // Filter & view modes
    const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
    const [filterPillar, setFilterPillar] = useState('all');
    const [filterPlatform, setFilterPlatform] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Editing modal state
    const [editingItem, setEditingItem] = useState(null);
    const [editForm, setEditForm] = useState({
        title: '',
        caption: '',
        pillar_id: '',
        angle_id: '',
        platform: '',
        time: '',
        asset_id: '',
        reason: '',
    });

    const hasEnoughAssets = assets.length >= 20;

    // Toggle platform in selection
    const togglePlatform = (key) => {
        if (selectedPlatforms.includes(key)) {
            if (selectedPlatforms.length > 1) {
                setSelectedPlatforms(selectedPlatforms.filter((p) => p !== key));
            }
        } else {
            setSelectedPlatforms([...selectedPlatforms, key]);
        }
    };

    // Generate full strategy plan
    const handleGenerate = () => {
        if (!brand) return;
        setGenerating(true);
        try {
            const plan = generateStrategyPlan({
                brand,
                pillars,
                angles,
                assets,
                options: {
                    days,
                    frequency,
                    platforms: selectedPlatforms,
                },
            });
            setCurrentPlan(plan);
            toast({
                title: t('Kế hoạch nội dung {days} ngày đã sẵn sàng!', { days }),
                description: t('Đã tạo {count} bài viết chiến lược với trụ cột, góc khai thác và gắn kết tài nguyên tương ứng.', {
                    count: plan.totalPosts,
                }),
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('Lỗi tạo kế hoạch'),
                description: error.message,
            });
        } finally {
            setGenerating(false);
        }
    };

    // Regenerate a single item
    const handleRegenerateItem = (item) => {
        if (!currentPlan) return;
        const updatedItem = regeneratePlanItem({
            item,
            brand,
            pillars,
            angles,
            assets,
        });

        setCurrentPlan({
            ...currentPlan,
            posts: currentPlan.posts.map((p) => (p.id === item.id ? updatedItem : p)),
        });

        toast({
            title: t('Đã tạo lại ý tưởng Ngày {day}', { day: item.dayIndex }),
            description: t('Đã chọn góc khai thác mới và tài nguyên thay thế phù hợp.'),
        });
    };

    // Delete single item from plan
    const handleDeleteItem = (id) => {
        if (!currentPlan) return;
        const newPosts = currentPlan.posts.filter((p) => p.id !== id);
        setCurrentPlan({
            ...currentPlan,
            totalPosts: newPosts.length,
            posts: newPosts,
        });
    };

    // Open edit dialog for an item
    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setEditForm({
            title: item.title,
            caption: item.caption,
            pillar_id: item.pillar?.id || '',
            angle_id: item.angle?.id || '',
            platform: item.platform || 'facebook',
            time: item.time || '09:00',
            asset_id: item.asset?.id || '',
            reason: item.reason || '',
        });
    };

    // Save edited item
    const handleSaveEdit = () => {
        if (!editingItem || !currentPlan) return;
        const selectedPillar = pillars.find((p) => p.id === editForm.pillar_id) || editingItem.pillar;
        const selectedAngle = angles.find((a) => a.id === editForm.angle_id) || editingItem.angle;
        const selectedAsset = assets.find((a) => a.id === editForm.asset_id) || editingItem.asset;

        const updated = {
            ...editingItem,
            title: editForm.title,
            caption: editForm.caption,
            pillar: selectedPillar,
            angle: selectedAngle,
            platform: editForm.platform,
            time: editForm.time,
            asset: selectedAsset,
            reason: editForm.reason,
        };

        setCurrentPlan({
            ...currentPlan,
            posts: currentPlan.posts.map((p) => (p.id === editingItem.id ? updated : p)),
        });

        setEditingItem(null);
        toast({ title: t('Đã cập nhật bài viết') });
    };

    // Apply entire plan to Content Calendar (as DRAFTS)
    const handleApplyPlan = async () => {
        if (!currentPlan || !currentPlan.posts.length) return;
        setApplying(true);
        try {
            const created = await applyPlanToCalendar({
                plan: currentPlan,
                brand,
                appClient,
            });

            toast({
                title: t('Đã áp dụng {count} bài viết vào Lịch nội dung!', { count: created.length }),
                description: t('Tất cả bài viết được tạo ở trạng thái Nháp (Draft), sẵn sàng xem và tinh chỉnh trên lịch.'),
            });

            onPlanApplied?.(created);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('Không thể lưu vào lịch'),
                description: error.message,
            });
        } finally {
            setApplying(false);
        }
    };

    // Quick seed 20 sample assets
    const handleSeedAssets = async () => {
        setSeedingAssets(true);
        try {
            const added = await seedBrandSampleAssets({
                brandId: brand.id,
                isDemo: !!brand.is_demo,
                appClient,
            });
            toast({
                title: t('Đã nạp {count} tài nguyên mẫu vào Asset Library', { count: added.length }),
            });
            onRefreshAssets?.();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('Lỗi nạp tài nguyên'),
                description: error.message,
            });
        } finally {
            setSeedingAssets(false);
        }
    };

    // Filtered posts in the review section
    const filteredPosts = useMemo(() => {
        if (!currentPlan) return [];
        return currentPlan.posts.filter((post) => {
            if (filterPillar !== 'all' && post.pillar?.name !== filterPillar) return false;
            if (filterPlatform !== 'all' && post.platform !== filterPlatform) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = post.title.toLowerCase().includes(q);
                const matchAngle = post.angle?.name?.toLowerCase().includes(q);
                const matchReason = post.reason?.toLowerCase().includes(q);
                if (!matchTitle && !matchAngle && !matchReason) return false;
            }
            return true;
        });
    }, [currentPlan, filterPillar, filterPlatform, searchQuery]);

    return (
        <div className="space-y-6">
            {/* Asset Library Readiness Banner */}
            {!hasEnoughAssets && (
                <div className="panel p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-amber-800">
                        <WarningCircle size={20} weight="fill" className="text-amber-600 shrink-0" />
                        <div>
                            <span className="font-semibold text-foreground">
                                {t('Thư viện hiện có {count}/20 tài nguyên.', { count: assets.length })}
                            </span>{' '}
                            <span className="text-muted-foreground">
                                {t('Để đạt hiệu quả tối ưu cho lịch 30 ngày, hệ thống khuyến nghị nạp ít nhất 20 assets.')}
                            </span>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        onClick={handleSeedAssets}
                        disabled={seedingAssets}
                        className="btn-skew shrink-0 text-xs font-semibold h-8 px-3"
                    >
                        <Plus size={14} weight="bold" />
                        <span>{seedingAssets ? t('Đang nạp…') : t('Nạp 20 assets mẫu ngay')}</span>
                    </Button>
                </div>
            )}

            {/* AI Generator Control Bar */}
            <div className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-5">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-border/60 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/20 text-brand-ink">
                                <Sparkle size={18} weight="fill" />
                            </span>
                            <h2 className="text-base font-semibold text-foreground">
                                {t('AI Content Strategist — Lập kế hoạch nội dung tự động')}
                            </h2>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('AI phân tích thông tin thương hiệu, mục tiêu và thư viện tài nguyên Phase 1 để đề xuất content pillars, angles, chủ đề và lịch đăng.')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="label-xs rounded-xl bg-muted/60 px-3 py-1.5 font-medium text-muted-foreground border border-border/60">
                            {t('{count} assets sẵn sàng', { count: assets.length })}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Duration */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                            {t('Khoảng thời gian kế hoạch')}
                        </label>
                        <div className="flex items-center rounded-xl border border-border p-1 bg-muted/20">
                            {[7, 14, 30].map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setDays(d)}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${days === d
                                        ? 'bg-foreground text-background shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {d} {t('ngày')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Frequency */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                            {t('Tần suất đăng bài')}
                        </label>
                        <select
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value)}
                            className="w-full h-9 text-xs rounded-xl border border-border bg-background px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="1_per_day">{t('1 bài / ngày (Chuẩn 30 bài)')}</option>
                            <option value="2_per_day">{t('2 bài / ngày (Sáng & Tối)')}</option>
                            <option value="3_per_week">{t('3 bài / tuần (T2, T4, T6)')}</option>
                            <option value="5_per_week">{t('5 bài / tuần (T2 đến T6)')}</option>
                        </select>
                    </div>

                    {/* Target Platforms */}
                    <div className="space-y-1.5 lg:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">
                            {t('Nền tảng đích')}
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {PLATFORM_OPTIONS.map((p) => {
                                const selected = selectedPlatforms.includes(p.key);
                                return (
                                    <button
                                        key={p.key}
                                        type="button"
                                        onClick={() => togglePlatform(p.key)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${selected
                                            ? 'bg-brand/15 border-brand-dark/40 text-brand-ink font-semibold'
                                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        <PlatformBadge platform={p.key} />
                                        <span>{p.label}</span>
                                        {selected && <Check size={12} weight="bold" className="text-brand-dark" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                    <p className="text-[11px] text-muted-foreground">
                        {t('Kế hoạch sẽ được lập ở trạng thái Bản nháp (Draft), không tự động xuất bản.')}
                    </p>

                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={generating}
                        className="btn-skew inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold shadow-xs"
                    >
                        <Lightning size={16} weight="fill" />
                        <span>{generating ? t('AI đang phân tích & lập lịch…') : t('Tạo lịch {days} ngày với AI', { days })}</span>
                    </button>
                </div>
            </div>

            {/* Generated Plan Review Section */}
            {currentPlan && (
                <div className="space-y-5">
                    {/* Review Header Banner with Stats */}
                    <div className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-4">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h3 className="text-base font-semibold text-foreground">
                                        {t('Chiến lược nội dung đề xuất ({count} bài viết · {days} ngày)', {
                                            count: currentPlan.totalPosts,
                                            days: currentPlan.days,
                                        })}
                                    </h3>
                                    <span className="rounded-lg bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                        {t('Draft Plan')}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t('Xem lại, chỉnh sửa hoặc tạo lại từng ý tưởng. Nhấn "Áp dụng vào lịch" để đưa toàn bộ vào Content Calendar.')}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={handleGenerate}
                                    disabled={generating}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted/50 text-xs font-medium text-foreground transition-all"
                                >
                                    <ArrowsClockwise size={14} />
                                    <span>{t('Tạo lại toàn bộ')}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleApplyPlan}
                                    disabled={applying}
                                    className="btn-skew inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold"
                                >
                                    <CheckSquareOffset size={16} weight="bold" />
                                    <span>{applying ? t('Đang đưa vào lịch…') : t('Áp dụng vào lịch nội dung')}</span>
                                </button>
                            </div>
                        </div>

                        {/* Metric Highlights */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/60">
                            <div className="rounded-xl bg-muted/30 p-2.5 border border-border/40">
                                <span className="text-[11px] text-muted-foreground">{t('Tổng số bài')}</span>
                                <p className="text-lg font-bold text-foreground mt-0.5">{currentPlan.totalPosts}</p>
                            </div>
                            <div className="rounded-xl bg-muted/30 p-2.5 border border-border/40">
                                <span className="text-[11px] text-muted-foreground">{t('Assets được gắn khớp')}</span>
                                <p className="text-lg font-bold text-foreground mt-0.5">
                                    {currentPlan.summary.matchedAssetsCount} / {currentPlan.summary.totalAssetsAvailable}
                                </p>
                            </div>
                            <div className="rounded-xl bg-muted/30 p-2.5 border border-border/40">
                                <span className="text-[11px] text-muted-foreground">{t('Trụ cột nội dung')}</span>
                                <p className="text-lg font-bold text-foreground mt-0.5">
                                    {Object.keys(currentPlan.summary.pillarCounts || {}).length}
                                </p>
                            </div>
                            <div className="rounded-xl bg-muted/30 p-2.5 border border-border/40">
                                <span className="text-[11px] text-muted-foreground">{t('Trạng thái')}</span>
                                <p className="text-sm font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                                    <CheckCircle size={14} weight="fill" />
                                    <span>{t('Draft (Chưa đăng)')}</span>
                                </p>
                            </div>
                        </div>

                        {/* Filter & View Bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-60">
                                    <MagnifyingGlass size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t('Tìm kiếm chủ đề, góc khai thác…')}
                                        className="h-8 pl-8 text-xs rounded-xl border-border bg-background"
                                    />
                                </div>

                                <select
                                    value={filterPillar}
                                    onChange={(e) => setFilterPillar(e.target.value)}
                                    className="h-8 text-xs rounded-xl border border-border bg-background px-2.5 text-foreground"
                                >
                                    <option value="all">{t('Tất cả trụ cột')}</option>
                                    {Object.keys(currentPlan.summary.pillarCounts || {}).map((name) => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>

                                <select
                                    value={filterPlatform}
                                    onChange={(e) => setFilterPlatform(e.target.value)}
                                    className="h-8 text-xs rounded-xl border border-border bg-background px-2.5 text-foreground"
                                >
                                    <option value="all">{t('Tất cả nền tảng')}</option>
                                    {PLATFORM_OPTIONS.map((p) => (
                                        <option key={p.key} value={p.key}>{p.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-1 rounded-xl border border-border p-0.5 bg-muted/30">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('cards')}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'cards'
                                        ? 'bg-background text-foreground shadow-2xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    title={t('Dạng lưới thẻ')}
                                >
                                    <SquaresFour size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('table')}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'table'
                                        ? 'bg-background text-foreground shadow-2xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    title={t('Dạng bảng danh sách')}
                                >
                                    <Table size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Post Cards Grid */}
                    {viewMode === 'cards' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredPosts.map((post) => (
                                <div
                                    key={post.id}
                                    className="panel p-4 bg-card border border-border/80 rounded-2xl shadow-2xs flex flex-col justify-between transition-all hover:border-border"
                                >
                                    <div className="space-y-3">
                                        {/* Card Top: Day, Date, Time, Platform */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                                                    {t('Ngày {day}', { day: post.dayIndex })}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {post.date} · {post.time}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <PlatformBadge platform={post.platform} />
                                                <span className="label-xs rounded-md bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[10px] font-medium border border-emerald-200/50">
                                                    {t('Draft')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Pillar & Angle Badges */}
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span
                                                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border"
                                                style={{
                                                    borderColor: `${post.pillar.color}40`,
                                                    backgroundColor: `${post.pillar.color}15`,
                                                    color: post.pillar.color,
                                                }}
                                            >
                                                <Stack size={11} weight="bold" />
                                                <span>{post.pillar.name}</span>
                                            </span>

                                            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/60">
                                                <TreeStructure size={11} weight="bold" />
                                                <span>{post.angle.name}</span>
                                            </span>
                                        </div>

                                        {/* Title / Topic */}
                                        <div>
                                            <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-relaxed">
                                                {post.title}
                                            </h4>
                                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                                {post.caption}
                                            </p>
                                        </div>

                                        {/* Matched Asset Preview */}
                                        <div className="rounded-xl border border-border/70 bg-muted/20 p-2 flex items-center gap-2.5">
                                            {post.asset?.file_url ? (
                                                <img
                                                    src={post.asset.file_url}
                                                    alt={post.asset.name}
                                                    className="h-12 w-12 rounded-lg object-cover border border-border shrink-0 bg-muted"
                                                    onError={(e) => {
                                                        if (e.currentTarget) e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                                                    <Images size={20} />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/50">
                                                        {t('Matched Asset')}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] font-medium text-foreground truncate mt-0.5">
                                                    {post.asset?.name || t('Chưa gán asset')}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground truncate">
                                                    {post.asset?.notes || t('Ảnh sản phẩm/thương hiệu')}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Strategic Reason / "Lý do lựa chọn" Callout */}
                                        <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 p-2.5 text-[11px] space-y-1">
                                            <span className="font-semibold text-amber-800 flex items-center gap-1 text-[10px] uppercase tracking-wider">
                                                <Sparkle size={12} weight="fill" className="text-amber-600" />
                                                {t('Lý do lựa chọn & góc khai thác:')}
                                            </span>
                                            <p className="text-amber-900 leading-normal text-[11px]">
                                                {post.reason}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Card Actions Bottom */}
                                    <div className="flex items-center justify-between border-t border-border/60 pt-3 mt-4">
                                        <button
                                            type="button"
                                            onClick={() => handleRegenerateItem(post)}
                                            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                                            title={t('Tạo lại ý tưởng & chọn asset khác cho ngày này')}
                                        >
                                            <ArrowsClockwise size={13} />
                                            <span>{t('Đổi ý tưởng')}</span>
                                        </button>

                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleOpenEdit(post)}
                                                className="h-7 px-2 text-xs gap-1"
                                            >
                                                <PencilSimple size={13} />
                                                <span>{t('Sửa')}</span>
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeleteItem(post.id)}
                                                className="h-7 px-2 text-xs text-dangerFg hover:bg-dangerBg/20"
                                            >
                                                <Trash size={13} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Table View */
                        <div className="panel p-0 bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                                            <th className="p-3 w-16">{t('Ngày')}</th>
                                            <th className="p-3 w-28">{t('Thời gian')}</th>
                                            <th className="p-3 w-28">{t('Nền tảng')}</th>
                                            <th className="p-3 w-36">{t('Trụ cột')}</th>
                                            <th className="p-3">{t('Chủ đề bài viết')}</th>
                                            <th className="p-3 w-44">{t('Asset đề xuất')}</th>
                                            <th className="p-3 w-60">{t('Lý do lựa chọn')}</th>
                                            <th className="p-3 w-20 text-right">{t('Thao tác')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {filteredPosts.map((post) => (
                                            <tr key={post.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="p-3 font-mono font-bold text-foreground">
                                                    #{post.dayIndex}
                                                </td>
                                                <td className="p-3 text-muted-foreground">
                                                    {post.date}<br />
                                                    <span className="font-medium text-foreground">{post.time}</span>
                                                </td>
                                                <td className="p-3">
                                                    <PlatformBadge platform={post.platform} />
                                                </td>
                                                <td className="p-3">
                                                    <span
                                                        className="inline-block rounded px-2 py-0.5 text-[10px] font-medium"
                                                        style={{
                                                            backgroundColor: `${post.pillar.color}20`,
                                                            color: post.pillar.color,
                                                        }}
                                                    >
                                                        {post.pillar.name}
                                                    </span>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                        {post.angle.name}
                                                    </p>
                                                </td>
                                                <td className="p-3 font-medium text-foreground max-w-xs">
                                                    <p className="line-clamp-2">{post.title}</p>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        {post.asset?.file_url && (
                                                            <img
                                                                src={post.asset.file_url}
                                                                alt=""
                                                                className="h-8 w-8 rounded object-cover border border-border"
                                                            />
                                                        )}
                                                        <span className="text-[11px] truncate max-w-[120px]">
                                                            {post.asset?.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-muted-foreground text-[11px] max-w-xs">
                                                    <p className="line-clamp-2">{post.reason}</p>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleOpenEdit(post)}
                                                        className="h-7 w-7 p-0"
                                                    >
                                                        <PencilSimple size={14} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Edit Item Modal */}
            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{t('Chỉnh sửa bài viết Ngày {day}', { day: editingItem?.dayIndex })}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-xs">
                        {/* Title */}
                        <div className="space-y-1.5">
                            <label className="font-semibold text-foreground">{t('Chủ đề / Tiêu đề bài viết')}</label>
                            <Input
                                value={editForm.title}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                className="text-xs rounded-xl"
                            />
                        </div>

                        {/* Caption */}
                        <div className="space-y-1.5">
                            <label className="font-semibold text-foreground">{t('Nội dung chú thích (Caption)')}</label>
                            <Textarea
                                rows={4}
                                value={editForm.caption}
                                onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })}
                                className="text-xs rounded-xl"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Pillar */}
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">{t('Trụ cột nội dung (Pillar)')}</label>
                                <select
                                    value={editForm.pillar_id}
                                    onChange={(e) => setEditForm({ ...editForm, pillar_id: e.target.value })}
                                    className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs"
                                >
                                    {pillars.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Angle */}
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">{t('Góc khai thác (Angle)')}</label>
                                <select
                                    value={editForm.angle_id}
                                    onChange={(e) => setEditForm({ ...editForm, angle_id: e.target.value })}
                                    className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs"
                                >
                                    {angles.filter((a) => a.pillar_id === editForm.pillar_id).map((a) => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Platform */}
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">{t('Nền tảng đăng')}</label>
                                <select
                                    value={editForm.platform}
                                    onChange={(e) => setEditForm({ ...editForm, platform: e.target.value })}
                                    className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs"
                                >
                                    {PLATFORM_OPTIONS.map((p) => (
                                        <option key={p.key} value={p.key}>{p.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Time */}
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">{t('Giờ đăng')}</label>
                                <Input
                                    type="time"
                                    value={editForm.time}
                                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                                    className="text-xs rounded-xl"
                                />
                            </div>
                        </div>

                        {/* Matched Asset Picker */}
                        <div className="space-y-1.5">
                            <label className="font-semibold text-foreground">{t('Chọn tài nguyên đính kèm')}</label>
                            <select
                                value={editForm.asset_id}
                                onChange={(e) => setEditForm({ ...editForm, asset_id: e.target.value })}
                                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs"
                            >
                                <option value="">{t('Không gắn asset')}</option>
                                {assets.map((asset) => (
                                    <option key={asset.id} value={asset.id}>
                                        {asset.name} {asset.notes ? `(${asset.notes})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Reason */}
                        <div className="space-y-1.5">
                            <label className="font-semibold text-foreground">{t('Lý do lựa chọn')}</label>
                            <Input
                                value={editForm.reason}
                                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                                className="text-xs rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
                        <Button variant="outline" onClick={() => setEditingItem(null)}>
                            {t('Hủy')}
                        </Button>
                        <button type="button" onClick={handleSaveEdit} className="btn-skew px-4 py-2 text-xs font-semibold">
                            {t('Lưu thay đổi')}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}