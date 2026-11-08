import { useState, useMemo, useEffect } from 'react';
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
    Stack,
    TreeStructure,
    Images,
    ArrowsClockwise,
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
    Calendar,
    SlidersHorizontal,
    ImageSquare,
    Clock,
    FacebookLogo,
    InstagramLogo,
    LinkedinLogo,
    TiktokLogo,
    ThreadsLogo,
} from '@phosphor-icons/react';

const PLATFORM_OPTIONS = [
    { key: 'facebook', label: 'Facebook', short: 'FB', icon: FacebookLogo, color: '#1877F2', activeBg: 'bg-blue-50 text-[#1877F2] border-blue-300' },
    { key: 'instagram', label: 'Instagram', short: 'IG', icon: InstagramLogo, color: '#E4405F', activeBg: 'bg-pink-50 text-[#E4405F] border-pink-300' },
    { key: 'linkedin', label: 'LinkedIn', short: 'LI', icon: LinkedinLogo, color: '#0A66C2', activeBg: 'bg-sky-50 text-[#0A66C2] border-sky-300' },
    { key: 'tiktok', label: 'TikTok', short: 'TT', icon: TiktokLogo, color: '#000000', activeBg: 'bg-neutral-900 text-white border-neutral-900' },
    { key: 'threads', label: 'Threads', short: 'TH', icon: ThreadsLogo, color: '#000000', activeBg: 'bg-neutral-800 text-white border-neutral-800' },
];

const renderPlatformBadge = (platform) => {
    const key = (platform || '').toLowerCase();
    if (key === 'facebook') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200/90 text-[#1877F2] font-semibold text-[10.5px] uppercase tracking-wide shadow-2xs whitespace-nowrap">
                <FacebookLogo size={13} weight="fill" className="text-[#1877F2] shrink-0" />
                <span>Facebook</span>
            </span>
        );
    }
    if (key === 'instagram') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-pink-50 border border-pink-200/90 text-[#E4405F] font-semibold text-[10.5px] uppercase tracking-wide shadow-2xs whitespace-nowrap">
                <InstagramLogo size={13} weight="fill" className="text-[#E4405F] shrink-0" />
                <span>Instagram</span>
            </span>
        );
    }
    if (key === 'linkedin') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-50 border border-sky-200/90 text-[#0A66C2] font-semibold text-[10.5px] uppercase tracking-wide shadow-2xs whitespace-nowrap">
                <LinkedinLogo size={13} weight="fill" className="text-[#0A66C2] shrink-0" />
                <span>LinkedIn</span>
            </span>
        );
    }
    if (key === 'tiktok') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-neutral-900 border border-neutral-900 text-white font-semibold text-[10.5px] uppercase tracking-wide shadow-2xs whitespace-nowrap">
                <TiktokLogo size={13} weight="fill" className="shrink-0" />
                <span>TikTok</span>
            </span>
        );
    }
    if (key === 'threads') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-neutral-800 border border-neutral-800 text-white font-semibold text-[10.5px] uppercase tracking-wide shadow-2xs whitespace-nowrap">
                <ThreadsLogo size={13} weight="fill" className="shrink-0" />
                <span>Threads</span>
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-800 font-semibold text-[10.5px] uppercase tracking-wide whitespace-nowrap">
            {platform}
        </span>
    );
};

export default function AIContentStrategist({
    brand,
    pillars = [],
    angles = [],
    assets = [],
    appClient,
    onOpenKnowledge,
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

    // Tri-view modes: 'table' (Option B default) | 'cards' | 'calendar' (Option C)
    const [viewMode, setViewMode] = useState('table');
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

    // Auto-generate initial plan if brand exists so Option B + Option C are populated immediately
    useEffect(() => {
        if (brand && !currentPlan) {
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
            } catch {
                // Ignore initialization error
            }
        }
    }, [brand, pillars, angles, assets]);

    // Generate / Regenerate full strategy plan
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
            posts: newPosts,
            totalPosts: newPosts.length,
        });
        toast({ title: t('Đã xóa bài viết khỏi kế hoạch nháp') });
    };

    // Open edit modal for an item
    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setEditForm({
            title: item.title,
            caption: item.caption,
            pillar_id: item.pillar?.id || pillars[0]?.id || '',
            angle_id: item.angle?.id || angles[0]?.id || '',
            platform: item.platform || 'facebook',
            time: item.time || '09:00',
            asset_id: item.asset?.id || '',
            reason: item.reason || '',
        });
    };

    // Save edited item
    const handleSaveEdit = () => {
        if (!editingItem || !currentPlan) return;

        const updatedPillar = pillars.find((p) => p.id === editForm.pillar_id) || editingItem.pillar;
        const updatedAngle = angles.find((a) => a.id === editForm.angle_id) || editingItem.angle;
        const updatedAsset = assets.find((a) => a.id === editForm.asset_id) || null;

        const updated = {
            ...editingItem,
            title: editForm.title,
            caption: editForm.caption,
            pillar: updatedPillar,
            angle: updatedAngle,
            platform: editForm.platform,
            time: editForm.time,
            asset: updatedAsset,
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
                const matchTitle = post.title?.toLowerCase().includes(q);
                const matchAngle = post.angle?.name?.toLowerCase().includes(q);
                const matchReason = post.reason?.toLowerCase().includes(q);
                if (!matchTitle && !matchAngle && !matchReason) return false;
            }
            return true;
        });
    }, [currentPlan, filterPillar, filterPlatform, searchQuery]);

    // Strategic pillars distribution summary
    const pillarSummary = useMemo(() => {
        if (!currentPlan || !currentPlan.posts.length) return [];
        const counts = {};
        currentPlan.posts.forEach((p) => {
            const name = p.pillar?.name || 'Chung';
            counts[name] = (counts[name] || 0) + 1;
        });
        const total = currentPlan.posts.length;
        const monochromePalette = ['#181818', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];
        return Object.entries(counts).map(([name, count], index) => ({
            name,
            count,
            percentage: Math.round((count / total) * 100),
            color: monochromePalette[index % monochromePalette.length],
        }));
    }, [currentPlan]);

    return (
        <div className="space-y-6">
            {/* Asset Library Readiness Notification (Monochrome) */}
            {!hasEnoughAssets && (
                <div className="p-4 bg-neutral-100 border border-neutral-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-neutral-800">
                        <WarningCircle size={18} weight="bold" className="text-neutral-900 shrink-0" />
                        <div>
                            <span className="font-semibold text-neutral-900">
                                {t('Thư viện hiện có {count}/20 tài nguyên.', { count: assets.length })}
                            </span>{' '}
                            <span className="text-neutral-600">
                                {t('Để đạt hiệu quả tối ưu cho lịch 30 ngày, hệ thống khuyến nghị nạp ít nhất 20 assets.')}
                            </span>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        onClick={handleSeedAssets}
                        disabled={seedingAssets}
                        className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl shrink-0 text-xs font-semibold h-8 px-3.5"
                    >
                        <Plus size={14} weight="bold" />
                        <span>{seedingAssets ? t('Đang nạp…') : t('Nạp 20 assets mẫu ngay')}</span>
                    </Button>
                </div>
            )}

            {/* Stepper Bar: 3 Milestones (Monochrome Minimalist) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Step 1 */}
                <button
                    type="button"
                    onClick={() => onOpenKnowledge?.()}
                    className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-2xs flex items-center gap-3 text-left transition-all hover:border-neutral-300 cursor-pointer"
                >
                    <div className="size-8 rounded-lg bg-neutral-100 text-neutral-900 border border-neutral-200 flex items-center justify-center font-bold text-xs shrink-0">
                        <Check size={14} weight="bold" />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                            {t('BƯỚC 1')}
                        </span>
                        <span className="text-xs font-semibold text-neutral-900 block truncate">
                            {t('Tri thức thương hiệu (Brand Context)')}
                        </span>
                        <span className="text-[11px] text-neutral-500 block truncate">
                            {t('Tone: {tone} · {count} assets', {
                                tone: brand?.tone || brand?.voice || t('Tự tin, Chuyên nghiệp'),
                                count: assets.length,
                            })}
                        </span>
                    </div>
                </button>

                {/* Step 2 */}
                <div className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-2xs flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-neutral-100 text-neutral-900 border border-neutral-200 flex items-center justify-center font-bold text-xs shrink-0">
                        <Check size={14} weight="bold" />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                            {t('BƯỚC 2')}
                        </span>
                        <span className="text-xs font-semibold text-neutral-900 block truncate">
                            {t('Ma trận trụ cột nội dung')}
                        </span>
                        <span className="text-[11px] text-neutral-500 block truncate">
                            {t('{pillars} Trụ cột · {angles} Góc khai thác', {
                                pillars: pillars.length || 4,
                                angles: angles.length || 12,
                            })}
                        </span>
                    </div>
                </div>

                {/* Step 3 (Active) */}
                <div className="p-3.5 rounded-xl bg-neutral-900 text-white shadow-2xs flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-white text-neutral-950 flex items-center justify-center font-bold text-xs shrink-0">
                        3
                    </div>
                    <div className="min-w-0">
                        <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider block">
                            {t('BƯỚC 3 (ĐANG CHỌN)')}
                        </span>
                        <span className="text-xs font-bold text-white block truncate">
                            {t('Cấu hình xuất bản & Lập lịch {days} ngày', { days })}
                        </span>
                        <span className="text-[11px] text-neutral-300 block truncate">
                            {frequency === '1_per_day' ? t('1 bài/ngày') : frequency} · {t('{count} kênh mục tiêu', { count: selectedPlatforms.length })}
                        </span>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* TẦNG 1: INLINE PARAMETER COCKPIT BAR (OPTION B) */}
            {/* ========================================================================= */}
            <div className="p-4 bg-white border border-neutral-200 rounded-2xl shadow-2xs flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs w-full xl:w-auto">
                    {/* Duration Segmented Control */}
                    <div className="h-9 flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200/60 shrink-0">
                        <span className="px-2 py-0.5 text-[11px] font-medium text-neutral-500 whitespace-nowrap">{t('Kỳ hạn')}:</span>
                        {[7, 14, 30].map((d) => (
                            <button
                                key={d}
                                type="button"
                                onClick={() => setDays(d)}
                                className={`h-7 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${days === d
                                    ? 'bg-neutral-900 text-white shadow-2xs'
                                    : 'text-neutral-600 hover:text-neutral-900'
                                    }`}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>

                    {/* Frequency Dropdown */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-neutral-500 text-[11px] whitespace-nowrap">{t('Tần suất')}:</span>
                        <select
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value)}
                            className="h-9 px-3 text-xs rounded-xl border border-neutral-200 bg-neutral-50 font-medium text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900 cursor-pointer"
                        >
                            <option value="1_per_day">{t('1 bài / ngày (Chuẩn 30 bài)')}</option>
                            <option value="2_per_day">{t('2 bài / ngày (Sáng & Tối)')}</option>
                            <option value="3_per_week">{t('3 bài / tuần (T2, T4, T6)')}</option>
                            <option value="5_per_week">{t('5 bài / tuần (T2 đến T6)')}</option>
                        </select>
                    </div>

                    {/* Platforms Multi-select Chips (Authentic Social Colors) */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-neutral-500 text-[11px] whitespace-nowrap">{t('Kênh')}:</span>
                        {PLATFORM_OPTIONS.map((p) => {
                            const isSelected = selectedPlatforms.includes(p.key);
                            const Icon = p.icon;
                            return (
                                <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => togglePlatform(p.key)}
                                    className={`h-9 px-3 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${isSelected
                                        ? `${p.activeBg} font-semibold shadow-2xs border`
                                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium border border-neutral-200/60'
                                        }`}
                                >
                                    <Icon size={13} weight="fill" className={isSelected ? '' : 'text-neutral-500'} />
                                    <span>{p.label}</span>
                                    {isSelected && <Check size={12} weight="bold" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main AI Regeneration Trigger */}
                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="h-9 px-5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition disabled:opacity-60 shrink-0 w-full xl:w-auto"
                >
                    <Lightning size={15} weight="fill" className="shrink-0" />
                    <span className="whitespace-nowrap">
                        {generating ? t('AI đang phân tích…') : t('Tạo lại kế hoạch {days} ngày', { days })}
                    </span>
                </button>
            </div>

            {/* ========================================================================= */}
            {/* TẦNG 2: STRATEGY DISTRIBUTION HUD (OPTION B) */}
            {/* ========================================================================= */}
            <div className="p-4 bg-white border border-neutral-200 rounded-2xl shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal size={16} weight="bold" className="text-neutral-900" />
                        <span className="font-bold text-neutral-900">
                            {t('Phân bổ 100% tỷ trọng chiến lược cho {total} bài viết nháp', {
                                total: currentPlan?.totalPosts || days,
                            })}
                        </span>
                    </div>
                    <span className="text-neutral-500 font-mono text-[11px]">
                        {pillars.length || 4} {t('Trụ cột')} · {angles.length || 12} {t('Góc khai thác')}
                    </span>
                </div>

                {/* Stacked 100% Strategy Bar */}
                <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden flex border border-neutral-200">
                    {pillarSummary.map((item, idx) => (
                        <div
                            key={idx}
                            style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                            className="h-full transition-all duration-500"
                            title={`${item.name}: ${item.count} bài (${item.percentage}%)`}
                        />
                    ))}
                </div>

                {/* Legend Chips */}
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-600 pt-1">
                    {pillarSummary.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span>
                                <strong>{item.percentage}%</strong> {item.name} ({item.count} {t('bài')})
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* TẦNG 3: REVIEW WORKSPACE & TRI-VIEW SWITCHER (TABLE + CARDS + CALENDAR OPTION C) */}
            {/* ========================================================================= */}
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xs overflow-hidden space-y-0">
                {/* Control Header Toolbar */}
                <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                        <div className="flex items-center gap-2 shrink-0">
                            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider whitespace-nowrap">
                                {t('Kế hoạch nội dung đề xuất ({count} bài viết)', {
                                    count: currentPlan?.totalPosts || 0,
                                })}
                            </h4>
                            <span className="px-2 py-0.5 rounded-md bg-neutral-900 text-white font-mono text-[10px] font-semibold whitespace-nowrap">
                                DRAFT PLAN
                            </span>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-44 sm:w-52 shrink-0">
                            <MagnifyingGlass size={13} className="absolute left-2.5 top-3 text-neutral-400" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('Tìm kiếm chủ đề, góc…')}
                                className="h-9 pl-7 text-xs rounded-xl border-neutral-200 bg-white"
                            />
                        </div>

                        {/* Filter by Pillar */}
                        <select
                            value={filterPillar}
                            onChange={(e) => setFilterPillar(e.target.value)}
                            className="h-9 text-xs rounded-xl border border-neutral-200 bg-white px-3 text-neutral-700 shrink-0 cursor-pointer"
                        >
                            <option value="all">{t('Tất cả trụ cột')}</option>
                            {Object.keys(currentPlan?.summary?.pillarCounts || {}).map((name) => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>

                        {/* Filter by Platform */}
                        <select
                            value={filterPlatform}
                            onChange={(e) => setFilterPlatform(e.target.value)}
                            className="h-9 text-xs rounded-xl border border-neutral-200 bg-white px-3 text-neutral-700 shrink-0 cursor-pointer"
                        >
                            <option value="all">{t('Tất cả nền tảng')}</option>
                            {PLATFORM_OPTIONS.map((p) => (
                                <option key={p.key} value={p.key}>{p.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* View Mode Switcher + Action CTA (Even height h-9, nowrap, perfect alignment) */}
                    <div className="flex items-center gap-2.5 w-full xl:w-auto justify-between xl:justify-end shrink-0 pt-1 xl:pt-0">
                        {/* 3-View Switcher: Table | Cards | Calendar (Option C) */}
                        <div className="h-9 flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200/70 shrink-0">
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`h-7 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${viewMode === 'table'
                                    ? 'bg-neutral-900 text-white shadow-2xs'
                                    : 'text-neutral-600 hover:text-neutral-900'
                                    }`}
                                title={t('Xem dạng Bảng (Table)')}
                            >
                                <Table size={14} weight={viewMode === 'table' ? 'bold' : 'regular'} className="shrink-0" />
                                <span className="whitespace-nowrap">{t('Bảng')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setViewMode('cards')}
                                className={`h-7 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${viewMode === 'cards'
                                    ? 'bg-neutral-900 text-white shadow-2xs'
                                    : 'text-neutral-600 hover:text-neutral-900'
                                    }`}
                                title={t('Xem dạng Lưới thẻ (Cards)')}
                            >
                                <SquaresFour size={14} weight={viewMode === 'cards' ? 'bold' : 'regular'} className="shrink-0" />
                                <span className="whitespace-nowrap">{t('Lưới thẻ')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setViewMode('calendar')}
                                className={`h-7 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${viewMode === 'calendar'
                                    ? 'bg-neutral-900 text-white shadow-2xs'
                                    : 'text-neutral-600 hover:text-neutral-900'
                                    }`}
                                title={t('Xem dạng Lịch tháng 30 ngày (Option C)')}
                            >
                                <Calendar size={14} weight={viewMode === 'calendar' ? 'bold' : 'regular'} className="shrink-0" />
                                <span className="whitespace-nowrap">{t('Lịch tháng')}</span>
                            </button>
                        </div>

                        {/* Apply Plan to Calendar CTA */}
                        <button
                            type="button"
                            onClick={handleApplyPlan}
                            disabled={applying || !currentPlan?.posts?.length}
                            className="h-9 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-2xs flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition disabled:opacity-60"
                        >
                            <CheckSquareOffset size={15} weight="bold" className="shrink-0" />
                            <span className="whitespace-nowrap">{applying ? t('Đang lưu…') : t('Áp dụng vào lịch')}</span>
                        </button>
                    </div>
                </div>

                {/* VIEW 1: DATA TABLE (OPTION B DEFAULT) */}
                {viewMode === 'table' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                                    <th className="p-3 w-16 text-center">{t('Ngày')}</th>
                                    <th className="p-3 w-28">{t('Thời gian')}</th>
                                    <th className="p-3 w-24">{t('Nền tảng')}</th>
                                    <th className="p-3 w-36">{t('Trụ cột & Góc')}</th>
                                    <th className="p-3">{t('Chủ đề bài viết')}</th>
                                    <th className="p-3 w-40">{t('Asset gán kèm')}</th>
                                    <th className="p-3 w-52">{t('Lý do lựa chọn')}</th>
                                    <th className="p-3 w-24 text-right">{t('Thao tác')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {filteredPosts.map((post) => (
                                    <tr key={post.id} className="hover:bg-neutral-50/60 transition-colors">
                                        <td className="p-3 text-center font-mono font-bold text-neutral-900">
                                            #{post.dayIndex}
                                        </td>
                                        <td className="p-3">
                                            <div className="font-mono text-neutral-900 font-semibold">{post.time}</div>
                                            <div className="text-[11px] text-neutral-500">{post.date}</div>
                                        </td>
                                        <td className="p-3">
                                            {renderPlatformBadge(post.platform)}
                                        </td>
                                        <td className="p-3">
                                            <div className="font-semibold text-neutral-900 truncate max-w-[140px]" title={post.pillar?.name}>
                                                {post.pillar?.name}
                                            </div>
                                            <div className="text-[10px] text-neutral-500 truncate max-w-[140px]" title={post.angle?.name}>
                                                {post.angle?.name}
                                            </div>
                                        </td>
                                        <td className="p-3 font-medium text-neutral-900 max-w-sm">
                                            <p className="line-clamp-2 leading-relaxed font-semibold">{post.title}</p>
                                            <p className="line-clamp-1 text-neutral-500 text-[11px] mt-0.5">{post.caption}</p>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                {post.asset?.file_url ? (
                                                    <img
                                                        src={post.asset.file_url}
                                                        alt=""
                                                        className="h-8 w-8 rounded-lg object-cover border border-neutral-200 shrink-0"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="h-8 w-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 text-neutral-400 border border-neutral-200">
                                                        <ImageSquare size={14} />
                                                    </div>
                                                )}
                                                <span className="text-[11px] text-neutral-700 truncate max-w-[110px]" title={post.asset?.name}>
                                                    {post.asset?.name || t('Chưa gán')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-[11px] text-neutral-500 max-w-xs">
                                            <p className="line-clamp-2">{post.reason}</p>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(post)}
                                                    className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
                                                    title={t('Chỉnh sửa')}
                                                >
                                                    <PencilSimple size={14} weight="bold" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRegenerateItem(post)}
                                                    className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
                                                    title={t('Tạo lại ý tưởng')}
                                                >
                                                    <ArrowsClockwise size={14} weight="bold" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteItem(post.id)}
                                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition"
                                                    title={t('Xóa')}
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* VIEW 2: CARDS GRID VIEW */}
                {viewMode === 'cards' && (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredPosts.map((post) => (
                            <div
                                key={post.id}
                                className="p-4 bg-white border border-neutral-200 rounded-2xl shadow-2xs flex flex-col justify-between hover:border-neutral-300 transition-all space-y-3"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2 text-[11px]">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-neutral-900 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md">
                                                {t('Ngày {day}', { day: post.dayIndex })}
                                            </span>
                                            <span className="text-neutral-500">
                                                {post.date} · {post.time}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {renderPlatformBadge(post.platform)}
                                            <span className="rounded bg-neutral-900 text-white px-1.5 py-0.5 text-[9px] font-bold">
                                                DRAFT
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
                                            <Stack size={11} weight="bold" />
                                            <span>{post.pillar?.name}</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-neutral-600 border border-neutral-200">
                                            <TreeStructure size={11} weight="bold" />
                                            <span>{post.angle?.name}</span>
                                        </span>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold text-neutral-900 line-clamp-2 leading-relaxed">
                                            {post.title}
                                        </h4>
                                        <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                                            {post.caption}
                                        </p>
                                    </div>

                                    {/* Matched Asset Preview */}
                                    <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-2 flex items-center gap-2.5">
                                        {post.asset?.file_url ? (
                                            <img
                                                src={post.asset.file_url}
                                                alt={post.asset.name}
                                                className="h-10 w-10 rounded-lg object-cover border border-neutral-200 shrink-0 bg-white"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="h-10 w-10 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 text-neutral-400">
                                                <Images size={16} />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-medium text-neutral-900 truncate">
                                                {post.asset?.name || t('Chưa gán asset')}
                                            </p>
                                            <p className="text-[10px] text-neutral-500 truncate">
                                                {post.asset?.notes || t('Ảnh thương hiệu')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Strategic Reason */}
                                    <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-2 text-[11px] space-y-0.5">
                                        <span className="font-semibold text-neutral-800 text-[10px] uppercase tracking-wider block">
                                            {t('Lý do đề xuất')}:
                                        </span>
                                        <p className="text-neutral-600 leading-normal text-[11px] line-clamp-2">
                                            {post.reason}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-neutral-100 pt-3 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => handleRegenerateItem(post)}
                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                                    >
                                        <ArrowsClockwise size={13} weight="bold" />
                                        <span>{t('Đổi ý tưởng')}</span>
                                    </button>

                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleOpenEdit(post)}
                                            className="h-7 px-2 text-xs gap-1 text-neutral-800"
                                        >
                                            <PencilSimple size={13} />
                                            <span>{t('Sửa')}</span>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteItem(post.id)}
                                            className="h-7 px-2 text-xs text-neutral-400 hover:text-neutral-900"
                                        >
                                            <Trash size={13} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* VIEW 3: CALENDAR MONTH MATRIX (OPTION C INTEGRATED!) */}
                {viewMode === 'calendar' && (
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs text-neutral-500 pb-1">
                            <span className="font-medium text-neutral-800">
                                {t('Lưới lịch 30 ngày (Chu kỳ tháng tiếp theo) · Nhấp vào ô ngày bất kỳ để xem/sửa chi tiết')}
                            </span>
                            <span className="font-mono text-[11px]">{filteredPosts.length} {t('bài đã xếp lịch')}</span>
                        </div>

                        {/* 7-Day Header */}
                        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-neutral-600 pb-2 border-b border-neutral-100">
                            <div>{t('Thứ 2')}</div>
                            <div>{t('Thứ 3')}</div>
                            <div>{t('Thứ 4')}</div>
                            <div>{t('Thứ 5')}</div>
                            <div>{t('Thứ 6')}</div>
                            <div className="text-neutral-900 font-bold">{t('Thứ 7')}</div>
                            <div className="text-neutral-900 font-bold">{t('Chủ nhật')}</div>
                        </div>

                        {/* 30 Day Cells Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                            {filteredPosts.map((post) => (
                                <div
                                    key={post.id}
                                    onClick={() => handleOpenEdit(post)}
                                    className="p-2.5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-900 hover:shadow-2xs min-h-[110px] flex flex-col justify-between space-y-1.5 cursor-pointer transition-all group"
                                    title={t('Nhấp để chỉnh sửa bài viết')}
                                >
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-bold font-mono text-neutral-900 group-hover:underline">
                                            #{post.dayIndex}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <span className="font-mono text-neutral-500 text-[9px] flex items-center gap-0.5">
                                                <Clock size={10} />
                                                <span>{post.time}</span>
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase ${
                                                post.platform === 'facebook' ? 'bg-blue-50 text-[#1877F2] border border-blue-200' :
                                                post.platform === 'instagram' ? 'bg-pink-50 text-[#E4405F] border border-pink-200' :
                                                post.platform === 'linkedin' ? 'bg-sky-50 text-[#0A66C2] border border-sky-200' :
                                                'bg-neutral-900 text-white'
                                            }`}>
                                                {post.platform.slice(0, 2)}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-[11px] font-semibold text-neutral-900 line-clamp-2 leading-snug group-hover:text-black">
                                        {post.title}
                                    </p>

                                    <div className="flex items-center justify-between text-[9px] text-neutral-500 pt-1 border-t border-neutral-100">
                                        <span className="truncate max-w-[80px]" title={post.pillar?.name}>
                                            {post.pillar?.name}
                                        </span>
                                        {post.asset?.file_url ? (
                                            <ImageSquare size={12} weight="bold" className="text-neutral-900 shrink-0" />
                                        ) : (
                                            <span className="text-[8px] text-neutral-400">text</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Item Modal (Monochrome) */}
            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent className="max-w-xl bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-neutral-900">
                            {t('Chỉnh sửa bài viết Ngày {day}', { day: editingItem?.dayIndex })}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-xs">
                        {/* Title */}
                        <div className="space-y-1.5">
                            <label className="font-semibold text-neutral-800">{t('Chủ đề / Tiêu đề bài viết')}</label>
                            <Input
                                value={editForm.title}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                className="text-xs rounded-xl border-neutral-200 bg-neutral-50/50"
                            />
                        </div>

                        {/* Caption */}
                        <div className="space-y-1.5">
                            <label className="font-semibold text-neutral-800">{t('Nội dung chú thích (Caption)')}</label>
                            <Textarea
                                rows={4}
                                value={editForm.caption}
                                onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })}
                                className="text-xs rounded-xl border-neutral-200 bg-neutral-50/50"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Pillar */}
                            <div className="space-y-1.5">
                                <label className="font-semibold text-neutral-800">{t('Trụ cột nội dung (Pillar)')}</label>
                                <select
                                    value={editForm.pillar_id}
                                    onChange={(e) => setEditForm({ ...editForm, pillar_id: e.target.value })}
                                    className="w-full h-9 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs"
                                >
                                    {pillars.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Angle */}
                            <div className="space-y-1.5">
                                <label className="font-semibold text-neutral-800">{t('Góc khai thác (Angle)')}</label>
                                <select
                                    value={editForm.angle_id}
                                    onChange={(e) => setEditForm({ ...editForm, angle_id: e.target.value })}
                                    className="w-full h-9 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs"
                                >
                                    {angles.filter((a) => !editForm.pillar_id || a.pillar_id === editForm.pillar_id).map((a) => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Platform */}
                            <div className="space-y-1.5">
                                <label className="font-semibold text-neutral-800">{t('Nền tảng đăng')}</label>
                                <select
                                    value={editForm.platform}
                                    onChange={(e) => setEditForm({ ...editForm, platform: e.target.value })}
                                    className="w-full h-9 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs"
                                >
                                    {PLATFORM_OPTIONS.map((p) => (
                                        <option key={p.key} value={p.key}>{p.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Time */}
                            <div className="space-y-1.5">
                                <label className="font-semibold text-neutral-800">{t('Giờ đăng')}</label>
                                <Input
                                    type="time"
                                    value={editForm.time}
                                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                                    className="text-xs rounded-xl border-neutral-200 bg-neutral-50"
                                />
                            </div>
                        </div>

                        {/* Matched Asset Picker */}
                        <div className="space-y-1.5">
                            <label className="font-semibold text-neutral-800">{t('Chọn tài nguyên đính kèm')}</label>
                            <select
                                value={editForm.asset_id}
                                onChange={(e) => setEditForm({ ...editForm, asset_id: e.target.value })}
                                className="w-full h-9 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs"
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
                            <label className="font-semibold text-neutral-800">{t('Lý do lựa chọn')}</label>
                            <Input
                                value={editForm.reason}
                                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                                className="text-xs rounded-xl border-neutral-200 bg-neutral-50"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
                        <Button variant="outline" onClick={() => setEditingItem(null)} className="rounded-xl text-xs">
                            {t('Hủy')}
                        </Button>
                        <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs"
                        >
                            {t('Lưu thay đổi')}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
