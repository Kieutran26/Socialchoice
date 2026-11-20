import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowSquareOut,
    CalendarCheck,
    ChartBar,
    ChatTeardropText,
    Check,
    CheckCircle,
    Compass,
    FacebookLogo,
    FloppyDisk,
    IdentificationCard,
    ImageSquare,
    InstagramLogo,
    Kanban,
    Lightning,
    LinkedinLogo,
    ListBullets,
    MagnifyingGlass,
    Package,
    Plus,
    SlidersHorizontal,
    Sparkle,
    Tag,
    Target,
    ThreadsLogo,
    TiktokLogo,
    Trash,
    Users,
    X,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { isDesktop } from '@/api/desktop/runtime';
import { useWorkspace } from '@/lib/workspace-context';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import LoadError from '@/components/common/load-error';
import EmptyState from '@/components/common/EmptyState';
import DistributionOverTime from '@/components/strategy/DistributionOverTime';
import { PLATFORMS, PLATFORM_LABEL } from '@/lib/constants';
import { formatCalendarDate, percent } from '@/lib/format';

const RANGE_DAYS = { past30: -30, past90: -90, next30: 30 };

const DEFAULT_STRATEGY_PILLARS = [
    {
        id: 'pillar-edu',
        name: 'Kiến thức chuyên môn & Hướng dẫn',
        color: '#2563eb',
        target_percentage: 40,
        actual: 42,
        count: 5,
        description: 'Chia sẻ kiến thức, tips, tutorials và hướng dẫn chuyên sâu.',
    },
    {
        id: 'pillar-case',
        name: 'Case Study & Khách hàng thực tế',
        color: '#059669',
        target_percentage: 25,
        actual: 25,
        count: 3,
        description: 'Câu chuyện thành công, phản hồi và kết quả thực tế.',
    },
    {
        id: 'pillar-feat',
        name: 'Giới thiệu Tính năng & Sản phẩm',
        color: '#d97706',
        target_percentage: 20,
        actual: 8,
        count: 1,
        description: 'Demo tính năng, cập nhật sản phẩm và giải pháp.',
    },
    {
        id: 'pillar-cul',
        name: 'Văn hóa & Hậu trường thương hiệu',
        color: '#7c3aed',
        target_percentage: 15,
        actual: 8,
        count: 1,
        description: 'Đội ngũ, giá trị cốt lõi và câu chuyện hậu trường.',
    },
];

const DEFAULT_STRATEGY_ANGLES = [
    { id: 'angle-1', name: 'Hướng dẫn từng bước (How-to)', count: 4, actual: 33 },
    { id: 'angle-2', name: 'Cảnh báo sai lầm thường gặp', count: 3, actual: 25 },
    { id: 'angle-3', name: 'Kể chuyện thực tế (Storytelling)', count: 2, actual: 17 },
    { id: 'angle-4', name: 'Review & So sánh giải pháp', count: 1, actual: 8 },
];

const PLATFORM_OPTIONS = [
    {
        key: 'facebook',
        label: 'Facebook',
        icon: FacebookLogo,
        dot: '#1877F2',
        activeCls: 'border-[#1877F2]/35 bg-[#1877F2]/10 text-[#1877F2]',
    },
    {
        key: 'instagram',
        label: 'Instagram',
        icon: InstagramLogo,
        dot: '#E4405F',
        activeCls: 'border-[#E4405F]/35 bg-[#E4405F]/10 text-[#E4405F]',
    },
    {
        key: 'linkedin',
        label: 'LinkedIn',
        icon: LinkedinLogo,
        dot: '#0A66C2',
        activeCls: 'border-[#0A66C2]/35 bg-[#0A66C2]/10 text-[#0A66C2]',
    },
    {
        key: 'threads',
        label: 'Threads',
        icon: ThreadsLogo,
        dot: '#3f3f46',
        activeCls: 'border-zinc-300 bg-zinc-100 text-zinc-800',
    },
    {
        key: 'tiktok',
        label: 'TikTok',
        icon: TiktokLogo,
        dot: '#3f3f46',
        activeCls: 'border-zinc-300 bg-zinc-100 text-zinc-800',
    },
];

const TONE_PRESETS = ['Chân thực', 'Chuyên nghiệp', 'Gần gũi', 'Khoa học', 'Năng động', 'Tinh gọn'];
const GOAL_PRESETS = [
    'Tăng nhận diện thương hiệu bền vững',
    'Tăng tương tác, bình luận & chia sẻ tự nhiên',
    'Thu hút khách hàng tiềm năng & chuyển đổi đơn hàng',
    'Giáo dục thị trường về giá trị sản phẩm',
];

const HOOK_GENERATORS = [
    (p, brand) => `3 nguyên tắc cốt lõi về ${p.name.toLowerCase()} dành cho khách hàng ${brand}`,
    (p) => `Sai lầm phổ biến nhất khi triển khai ${p.name.toLowerCase()} và cách khắc phục`,
    (p) => `Checklist nhanh 5 bước tối ưu ${p.name.toLowerCase()} trong tuần này`,
    (p, brand) => `Hậu trường ${brand}: Cách ứng dụng ${p.name.toLowerCase()} vào vận hành thực tế`,
    (p) => `Phân tích trước & sau khi chuẩn hóa ${p.name.toLowerCase()}`,
];

const formatPostSnippet = (text) => {
    if (!text) return '';
    return text
        .replace(/@\[([^\]]+)\](?:\([^)]+\)|\[[^\]]+\])/g, '@$1')
        .replace(/\s+/g, ' ')
        .trim();
};

const buildQuery = (scope, filters) => {
    const query = { ...scope };
    if (filters.status !== 'all') query.status = filters.status;
    if (filters.pillar_id !== 'all') query.pillar_id = filters.pillar_id;
    if (filters.angle_id !== 'all') query.angle_id = filters.angle_id;
    if (filters.range !== 'all') {
        const days = RANGE_DAYS[filters.range];
        const bound = new Date(Date.now() + days * 86400000).toISOString();
        const now = new Date().toISOString();
        query.scheduled_at = days < 0 ? { $gte: bound, $lte: now } : { $gte: now, $lte: bound };
    }
    return query;
};

function generatePlanItems({ days, frequency, platforms, pillars, angles, brandName }) {
    const activePillars = pillars.length ? pillars : DEFAULT_STRATEGY_PILLARS;
    const activeAngles = angles.length ? angles : DEFAULT_STRATEGY_ANGLES;
    const activePlatforms = platforms.length ? platforms : ['facebook'];

    const perDay =
        frequency === '2_per_day'
            ? 2
            : frequency === '3_per_week'
              ? 3 / 7
              : frequency === '5_per_week'
                ? 5 / 7
                : 1;
    const total = Math.max(4, Math.min(28, Math.round(days * perDay)));

    const pool = [];
    activePillars.forEach((p) => {
        const n = Math.max(1, Math.round(((p.target_percentage || 25) / 100) * total));
        for (let i = 0; i < n; i++) pool.push(p);
    });

    const now = Date.now();
    const stepDays = Math.max(1, Math.floor(days / total));

    return Array.from({ length: total }, (_, i) => {
        const pillar = pool[i % pool.length];
        const angle = activeAngles[i % activeAngles.length];
        const platform = activePlatforms[i % activePlatforms.length];
        const dayNum = i * stepDays + 1;
        const week = Math.min(4, Math.floor((dayNum - 1) / 7) + 1);
        const date = new Date(now + dayNum * 86400000);
        const hook = HOOK_GENERATORS[i % HOOK_GENERATORS.length](pillar, brandName || 'thương hiệu');
        return {
            id: `alt-plan-${i + 1}-${Date.now()}`,
            day: dayNum,
            week,
            time: i % 2 === 0 ? '09:00' : '19:30',
            dateIso: date.toISOString(),
            platform,
            pillar,
            angle,
            title: hook,
        };
    });
}

export default function ContentStrategyAlt() {
    const { t } = useTranslation();
    const { scope, brands, selectedBrandId, reload: reloadWorkspace } = useWorkspace();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const desktop = isDesktop();

    const [activeTab, setActiveTabState] = useState(
        ['strategist', 'knowledge', 'analytics'].includes(searchParams.get('tab'))
            ? searchParams.get('tab')
            : 'strategist'
    );

    useEffect(() => {
        const tabFromUrl = searchParams.get('tab');
        if (tabFromUrl && ['strategist', 'knowledge', 'analytics'].includes(tabFromUrl)) {
            setActiveTabState(tabFromUrl);
        }
    }, [searchParams]);

    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.set('tab', tab);
                return next;
            },
            { replace: true }
        );
    };

    const currentBrand = useMemo(
        () => brands.find((b) => b.id === selectedBrandId) || brands[0] || null,
        [brands, selectedBrandId]
    );

    // Core data
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [assets, setAssets] = useState([]);
    const [rows, setRows] = useState({ pillar: [], angle: [], total: 0 });
    const [unassignedPosts, setUnassignedPosts] = useState([]);

    // Strategist state
    const [days, setDays] = useState(28);
    const [frequency, setFrequency] = useState('5_per_week');
    const [selectedPlatforms, setSelectedPlatforms] = useState(['facebook', 'instagram']);
    const [planItems, setPlanItems] = useState([]);
    const [planView, setPlanView] = useState('board'); // 'board' | 'list'
    const [planSearch, setPlanSearch] = useState('');
    const [selectedPillarFilter, setSelectedPillarFilter] = useState('all');
    const [generating, setGenerating] = useState(false);
    const [applyingPlan, setApplyingPlan] = useState(false);

    // Knowledge state
    const [brandForm, setBrandForm] = useState({
        products: '',
        target_audience: '',
        tone_of_voice: '',
        goals: '',
        posting_frequency: '1 bài/ngày',
        description: '',
    });
    const [savingBrand, setSavingBrand] = useState(false);

    // Analytics state
    const [filters, setFilters] = useState({
        range: 'all',
        platform: 'all',
        status: 'all',
        pillar_id: 'all',
        angle_id: 'all',
    });
    const [unit, setUnit] = useState('posts');
    const [assigningPostId, setAssigningPostId] = useState(null);
    const [activating, setActivating] = useState(false);
    const [showAllAngles, setShowAllAngles] = useState(false);

    useEffect(() => {
        if (!currentBrand) return;
        setBrandForm({
            products: currentBrand.products || currentBrand.key_products || '',
            target_audience: currentBrand.target_audience || '',
            tone_of_voice: currentBrand.tone_of_voice || currentBrand.tone || currentBrand.voice || '',
            goals: currentBrand.goals || currentBrand.marketing_goals || '',
            posting_frequency: currentBrand.posting_frequency || '1 bài/ngày',
            description: currentBrand.description || '',
        });
    }, [currentBrand]);

    const loadAssets = useCallback(async () => {
        if (!currentBrand?.id) return;
        try {
            const [mediaRes, autopilotRes] = await Promise.allSettled([
                appClient.entities.MediaAsset.filter({ brand_id: currentBrand.id }, { limit: 200 }),
                appClient.autopilot.call('list', { brand_id: currentBrand.id }, { silent: true }),
            ]);
            const mediaItems = mediaRes.status === 'fulfilled' ? mediaRes.value?.items || [] : [];
            const autopilotItems =
                autopilotRes.status === 'fulfilled' ? autopilotRes.value?.assets || [] : [];
            setAssets([...mediaItems, ...autopilotItems]);
        } catch {
            // keep existing
        }
    }, [currentBrand?.id]);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const query = buildQuery(scope, filters);
            const [pillarList, angleList] = await Promise.all([
                appClient.entities.ContentPillar.filter(scope, { limit: 300 }),
                appClient.entities.ContentAngle.filter(scope, { limit: 500 }),
            ]);
            setPillars(pillarList.items || []);
            setAngles(angleList.items || []);

            let platformAccounts = null;
            if (filters.platform !== 'all') {
                const accounts = await appClient.entities.SocialAccount.filter(
                    { ...scope, platform: filters.platform },
                    { limit: 300, fields: ['id'] }
                );
                platformAccounts = (accounts.items || []).map((a) => a.id);
                if (!platformAccounts.length) {
                    setRows({ pillar: [], angle: [], total: 0 });
                    setLoading(false);
                    return;
                }
            }

            const postQuery = platformAccounts
                ? { ...query, account_ids: { $in: platformAccounts } }
                : query;
            const [pillarAgg, angleAgg, totalCount] = await Promise.all([
                appClient.entities.Post.aggregate({ query: postQuery, groupBy: 'pillar_id' }),
                appClient.entities.Post.aggregate({ query: postQuery, groupBy: 'angle_id' }),
                appClient.entities.Post.count(postQuery),
            ]);

            setRows({ pillar: pillarAgg.rows, angle: angleAgg.rows, total: totalCount });

            try {
                const sampleRes = await appClient.entities.Post.filter(
                    { ...scope },
                    { limit: 30, sort: '-created_at' }
                );
                setUnassignedPosts((sampleRes.items || []).filter((p) => !p.pillar_id).slice(0, 6));
            } catch {
                setUnassignedPosts([]);
            }
        } catch (err) {
            setLoadError(err.message);
        } finally {
            setLoading(false);
        }
    }, [scope, filters]);

    useEffect(() => {
        load();
        loadAssets();
    }, [load, loadAssets]);

    useEffect(() => {
        if (loading) return;
        setPlanItems(
            generatePlanItems({
                days,
                frequency,
                platforms: selectedPlatforms,
                pillars,
                angles,
                brandName: currentBrand?.name,
            })
        );
    }, [loading, pillars, angles, currentBrand?.name]); // eslint-disable-line react-hooks/exhaustive-deps

    const pillarStats = pillars.map((pillar) => {
        const count = rows.pillar.find((r) => r.pillar_id === pillar.id)?.count || 0;
        return { ...pillar, count, actual: percent(count, rows.total) };
    });
    const angleStats = angles.map((angle) => {
        const count = rows.angle.find((r) => r.angle_id === angle.id)?.count || 0;
        return { ...angle, count, actual: percent(count, rows.total) };
    });
    const unassignedPillarCount = rows.pillar.find((r) => !r.pillar_id)?.count || 0;
    const isSimulated = pillars.length === 0;
    const activePillarStats = isSimulated ? DEFAULT_STRATEGY_PILLARS : pillarStats;
    const activeAngleStats =
        angles.length > 0 && angleStats.some((a) => a.count > 0)
            ? angleStats
            : DEFAULT_STRATEGY_ANGLES;

    const balancedCount = activePillarStats.filter(
        (p) => Math.abs(p.actual - (p.target_percentage || 0)) <= 5
    ).length;
    const balanceRate = Math.round((balancedCount / activePillarStats.length) * 100);

    const knowledgeFieldsCount = [
        brandForm.products,
        brandForm.target_audience,
        brandForm.tone_of_voice,
        brandForm.goals,
        brandForm.description,
    ].filter(Boolean).length;

    const filteredPlanItems = useMemo(() => {
        const q = planSearch.trim().toLowerCase();
        return planItems.filter((item) => {
            if (selectedPillarFilter !== 'all' && item.pillar.id !== selectedPillarFilter) return false;
            if (
                q &&
                !item.title.toLowerCase().includes(q) &&
                !item.pillar.name.toLowerCase().includes(q) &&
                !item.angle.name.toLowerCase().includes(q)
            ) {
                return false;
            }
            return true;
        });
    }, [planItems, planSearch, selectedPillarFilter]);

    const weeksGrouped = useMemo(() => {
        const groups = new Map();
        filteredPlanItems.forEach((item) => {
            const list = groups.get(item.week) || [];
            list.push(item);
            groups.set(item.week, list);
        });
        return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
    }, [filteredPlanItems]);

    const togglePlatform = (key) => {
        setSelectedPlatforms((prev) =>
            prev.includes(key) ? (prev.length > 1 ? prev.filter((k) => k !== key) : prev) : [...prev, key]
        );
    };

    const handleRegeneratePlan = () => {
        setGenerating(true);
        setTimeout(() => {
            setPlanItems(
                generatePlanItems({
                    days,
                    frequency,
                    platforms: selectedPlatforms,
                    pillars,
                    angles,
                    brandName: currentBrand?.name,
                })
            );
            setGenerating(false);
            toast({ title: t('Đã tạo lộ trình mới') });
        }, 240);
    };

    const handleApplyPlan = async () => {
        if (!filteredPlanItems.length) return;
        setApplyingPlan(true);
        try {
            const batch = filteredPlanItems.slice(0, 12);
            for (const item of batch) {
                await appClient.entities.Post.create({
                    title: item.title,
                    caption: `${item.title}\n\n[${item.pillar.name} · ${item.angle.name}]`,
                    status: 'draft',
                    scheduled_at: item.dateIso,
                    pillar_id: isSimulated ? null : item.pillar.id,
                    angle_id: angles.length ? item.angle.id : null,
                    brand_id: currentBrand?.id || scope.brand_id || null,
                    is_demo: scope.is_demo || false,
                });
            }
            toast({
                title: t('Đã áp dụng {count} bài nháp vào Lịch nội dung', { count: batch.length }),
            });
            navigate('/calendar');
        } catch (err) {
            toast({ title: t('Lỗi áp dụng kế hoạch'), description: err.message, variant: 'destructive' });
        } finally {
            setApplyingPlan(false);
        }
    };

    const handleSaveBrand = async (e) => {
        e.preventDefault();
        if (!currentBrand?.id) return;
        setSavingBrand(true);
        try {
            await appClient.entities.Brand.update(currentBrand.id, {
                products: brandForm.products,
                target_audience: brandForm.target_audience,
                tone_of_voice: brandForm.tone_of_voice,
                tone: brandForm.tone_of_voice,
                goals: brandForm.goals,
                posting_frequency: brandForm.posting_frequency,
                description: brandForm.description,
            });
            toast({ title: t('Đã lưu tri thức thương hiệu') });
            await reloadWorkspace?.();
        } catch (err) {
            toast({ title: t('Lỗi lưu tri thức'), description: err.message, variant: 'destructive' });
        } finally {
            setSavingBrand(false);
        }
    };

    const handleAssignPillar = async (postId, pillarId) => {
        if (!pillarId || pillarId === 'none') return;
        setAssigningPostId(postId);
        try {
            await appClient.entities.Post.update(postId, { pillar_id: pillarId });
            toast({ title: t('Đã gán trụ cột thành công') });
            await load();
        } catch (err) {
            toast({ title: t('Lỗi gán trụ cột'), description: err.message, variant: 'destructive' });
        } finally {
            setAssigningPostId(null);
        }
    };

    const handleActivateDefaultPillars = async () => {
        if (!currentBrand?.id) return;
        setActivating(true);
        try {
            for (const p of DEFAULT_STRATEGY_PILLARS) {
                await appClient.entities.ContentPillar.create({
                    name: p.name,
                    color: p.color,
                    target_percentage: p.target_percentage,
                    description: p.description,
                    brand_id: currentBrand.id,
                    status: 'active',
                    is_demo: scope.is_demo || false,
                });
            }
            toast({ title: t('Đã kích hoạt 4 trụ cột chiến lược mẫu') });
            await load();
        } catch (err) {
            toast({ title: t('Lỗi kích hoạt trụ cột'), description: err.message, variant: 'destructive' });
        } finally {
            setActivating(false);
        }
    };

    const appendTone = (tone) => {
        const list = brandForm.tone_of_voice
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        if (list.includes(tone)) return;
        setBrandForm({ ...brandForm, tone_of_voice: [...list, tone].join(', ') });
    };

    if (loadError) return <LoadError message={loadError} onRetry={load} />;

    return (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* ================================================================= */}
            {/* LEFT STICKY STRATEGY RAIL (BRAND + 3 MODULES + LIVE PILLAR MIX) */}
            {/* ================================================================= */}
            <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-6 lg:w-72">
                {/* Brand Snapshot Card */}
                <div className="panel bg-card p-4">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-dark bg-brand font-heading text-sm font-bold text-brand-ink">
                            {(currentBrand?.name || 'SC').slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                            <h1 className="truncate font-heading text-base font-bold text-foreground">
                                {t('Chiến lược nội dung')}
                            </h1>
                            <p className="truncate text-xs text-muted-foreground">
                                {currentBrand?.name || t('Thương hiệu')} · {assets.length} {t('tài nguyên')}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-zinc-50/60 py-2 text-center">
                        <div>
                            <div className="font-heading text-sm font-bold tabular-nums text-foreground">
                                {rows.total}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{t('Bài viết')}</div>
                        </div>
                        <div>
                            <div className="font-heading text-sm font-bold tabular-nums text-foreground">
                                {activePillarStats.length}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{t('Trụ cột')}</div>
                        </div>
                        <div>
                            <div className="font-heading text-sm font-bold tabular-nums text-emerald-700">
                                {balanceRate}%
                            </div>
                            <div className="text-[10px] text-muted-foreground">{t('Cân bằng')}</div>
                        </div>
                    </div>
                </div>

                {/* Vertical 3-Module Switcher */}
                <nav className="panel space-y-1 bg-card p-2">
                    {[
                        {
                            key: 'strategist',
                            label: t('Trợ lý chiến lược AI'),
                            sub: t('Lộ trình {count} bài', { count: planItems.length }),
                            icon: Sparkle,
                        },
                        {
                            key: 'knowledge',
                            label: t('Cơ sở tri thức'),
                            sub: t('{count}/5 tiêu chí định vị', { count: knowledgeFieldsCount }),
                            icon: IdentificationCard,
                        },
                        {
                            key: 'analytics',
                            label: t('Phân bổ & Mục tiêu'),
                            sub: t('{rate}% cân bằng trụ cột', { rate: balanceRate }),
                            icon: ChartBar,
                        },
                    ].map((item) => {
                        const active = activeTab === item.key;
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setActiveTab(item.key)}
                                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                                    active
                                        ? 'border border-brand-dark/40 bg-brand/25 text-brand-ink'
                                        : 'border border-transparent text-foreground hover:bg-zinc-50'
                                }`}
                            >
                                <span
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                        active
                                            ? 'bg-brand text-brand-ink'
                                            : 'border border-border bg-zinc-50 text-muted-foreground'
                                    }`}
                                >
                                    <Icon size={16} weight={active ? 'fill' : 'regular'} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-xs font-semibold">{item.label}</div>
                                    <div
                                        className={`truncate text-[11px] ${
                                            active ? 'text-brand-ink/75' : 'text-muted-foreground'
                                        }`}
                                    >
                                        {item.sub}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </nav>

                {/* Always-Visible Pillar Mix Filter Widget */}
                <div className="panel space-y-3 bg-card p-4">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{t('Tỷ trọng trụ cột')}</span>
                        {selectedPillarFilter !== 'all' ? (
                            <button
                                type="button"
                                onClick={() => setSelectedPillarFilter('all')}
                                className="cursor-pointer text-[11px] font-semibold text-brand-dark hover:underline"
                            >
                                {t('Bỏ lọc')}
                            </button>
                        ) : (
                            <Link
                                to="/strategy/pillars"
                                className="text-[11px] text-muted-foreground hover:text-foreground"
                            >
                                {t('Tùy chỉnh')}
                            </Link>
                        )}
                    </div>

                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                        {activePillarStats.map((p) => (
                            <div
                                key={p.id}
                                style={{
                                    width: `${p.target_percentage || 25}%`,
                                    backgroundColor: p.color || '#2563eb',
                                }}
                                className="h-full"
                                title={`${p.name}: ${p.target_percentage}%`}
                            />
                        ))}
                    </div>

                    <div className="space-y-1">
                        {activePillarStats.map((p) => {
                            const selected = selectedPillarFilter === p.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() =>
                                        setSelectedPillarFilter(selected ? 'all' : p.id)
                                    }
                                    className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                                        selected
                                            ? 'bg-brand/25 font-semibold text-brand-ink'
                                            : 'text-foreground hover:bg-zinc-50'
                                    }`}
                                >
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span
                                            className="h-2 w-2 shrink-0 rounded-full"
                                            style={{ backgroundColor: p.color || '#2563eb' }}
                                        />
                                        <span className="truncate">{p.name}</span>
                                    </span>
                                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                                        {p.target_percentage || 0}%
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Quick Links */}
                <div className="flex flex-col gap-2">
                    <Link to="/create" className="btn-skew min-h-10 w-full justify-center">
                        <Plus size={15} weight="bold" />
                        <span>{t('Tạo bài viết mới')}</span>
                    </Link>
                    <Link
                        to="/strategy/campaigns"
                        className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground transition-colors hover:bg-zinc-50"
                    >
                        <Target size={14} weight="bold" className="text-brand-dark" />
                        <span>{t('Quản lý Chiến dịch')}</span>
                    </Link>
                </div>
            </aside>

            {/* ================================================================= */}
            {/* RIGHT MAIN STUDIO CANVAS */}
            {/* ================================================================= */}
            <main className="min-w-0 flex-1 space-y-5">
                {/* ------------------------------------------------------------- */}
                {/* VIEW 1: WEEKLY EDITORIAL ROADMAP BOARD (AI STRATEGIST) */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'strategist' && (
                    <div className="space-y-5">
                        {/* Compact Controls Bar */}
                        <div className="panel space-y-3.5 bg-card p-4 sm:p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="font-heading text-lg font-bold text-foreground">
                                        {t('Lộ trình nội dung theo tuần')}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        {t('Trợ lý AI chia bài đều theo từng tuần bám sát tỷ trọng trụ cột ở cột trái.')}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={generating}
                                        onClick={handleRegeneratePlan}
                                        className="btn-skew min-h-9 cursor-pointer whitespace-nowrap disabled:opacity-60"
                                    >
                                        <Lightning size={14} weight="fill" />
                                        <span>{generating ? t('Đang tạo…') : t('Tạo lại lộ trình')}</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={applyingPlan || !filteredPlanItems.length}
                                        onClick={handleApplyPlan}
                                        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-brand-dark bg-brand/20 px-3.5 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand/35 disabled:opacity-50"
                                    >
                                        <CalendarCheck size={14} weight="bold" />
                                        <span>
                                            {applyingPlan ? t('Đang áp dụng…') : t('Áp dụng vào lịch')}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5 text-xs">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-zinc-50 p-1">
                                        {[7, 14, 28].map((d) => (
                                            <button
                                                key={d}
                                                type="button"
                                                onClick={() => setDays(d)}
                                                className={`h-7 cursor-pointer rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                                                    days === d
                                                        ? 'bg-brand text-brand-ink'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                {d === 28 ? '4 tuần' : `${d}d`}
                                            </button>
                                        ))}
                                    </div>

                                    <select
                                        value={frequency}
                                        onChange={(e) => setFrequency(e.target.value)}
                                        className="h-9 cursor-pointer rounded-xl border border-border bg-card px-3 font-medium text-foreground focus:border-brand-dark focus:outline-none"
                                    >
                                        <option value="1_per_day">{t('1 bài / ngày')}</option>
                                        <option value="5_per_week">{t('5 bài / tuần')}</option>
                                        <option value="3_per_week">{t('3 bài / tuần')}</option>
                                        <option value="2_per_day">{t('2 bài / ngày')}</option>
                                    </select>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {PLATFORM_OPTIONS.map((p) => {
                                            const active = selectedPlatforms.includes(p.key);
                                            const Icon = p.icon;
                                            return (
                                                <button
                                                    key={p.key}
                                                    type="button"
                                                    onClick={() => togglePlatform(p.key)}
                                                    className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition-colors ${
                                                        active
                                                            ? `${p.activeCls} font-semibold`
                                                            : 'border-border bg-card text-muted-foreground hover:bg-zinc-50'
                                                    }`}
                                                >
                                                    <Icon size={14} weight="fill" style={{ color: p.dot }} />
                                                    <span className="hidden sm:inline">{p.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="relative w-44">
                                        <MagnifyingGlass
                                            size={13}
                                            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                                        />
                                        <input
                                            type="text"
                                            value={planSearch}
                                            onChange={(e) => setPlanSearch(e.target.value)}
                                            placeholder={t('Tìm nhanh…')}
                                            className="h-9 w-full rounded-xl border border-border bg-zinc-50/70 pl-8 pr-2.5 text-xs focus:border-brand-dark focus:bg-card focus:outline-none"
                                        />
                                    </div>

                                    <div className="inline-flex rounded-xl border border-border bg-zinc-50 p-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setPlanView('board')}
                                            className={`inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-xs font-medium ${
                                                planView === 'board'
                                                    ? 'bg-card font-semibold text-foreground shadow-xs'
                                                    : 'text-muted-foreground'
                                            }`}
                                        >
                                            <Kanban size={14} />
                                            <span>{t('Tuần')}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPlanView('list')}
                                            className={`inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-xs font-medium ${
                                                planView === 'list'
                                                    ? 'bg-card font-semibold text-foreground shadow-xs'
                                                    : 'text-muted-foreground'
                                            }`}
                                        >
                                            <ListBullets size={14} />
                                            <span>{t('Dòng')}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Weekly Kanban Board View */}
                        {planView === 'board' ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {weeksGrouped.map(([weekNum, items]) => (
                                    <section key={weekNum} className="panel overflow-hidden bg-card">
                                        <div className="flex items-center justify-between border-b border-border bg-zinc-50/60 px-4 py-3">
                                            <span className="font-heading text-sm font-bold text-foreground">
                                                {t('Tuần')} {weekNum}
                                            </span>
                                            <span className="rounded-full bg-brand/25 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-brand-ink">
                                                {items.length} {t('bài')}
                                            </span>
                                        </div>
                                        <div className="divide-y divide-border">
                                            {items.map((item) => {
                                                const pCfg =
                                                    PLATFORM_OPTIONS.find((p) => p.key === item.platform) ||
                                                    PLATFORM_OPTIONS[0];
                                                const PlatformIcon = pCfg.icon;
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="group space-y-2 p-4 transition-colors hover:bg-zinc-50/60"
                                                    >
                                                        <div className="flex items-center justify-between gap-2 text-[11px]">
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <PlatformIcon
                                                                    size={14}
                                                                    weight="fill"
                                                                    style={{ color: pCfg.dot }}
                                                                />
                                                                <span className="font-mono font-semibold text-foreground">
                                                                    {t('Ngày')} {item.day}
                                                                </span>
                                                                <span>· {item.time}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                                                                <Link
                                                                    to="/create"
                                                                    className="rounded-md border border-border bg-card px-2 py-0.5 font-medium text-foreground hover:bg-zinc-100"
                                                                >
                                                                    {t('Viết')}
                                                                </Link>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setPlanItems((prev) =>
                                                                            prev.filter((x) => x.id !== item.id)
                                                                        )
                                                                    }
                                                                    className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-zinc-100 hover:text-foreground"
                                                                    title={t('Xóa')}
                                                                >
                                                                    <Trash size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm font-medium leading-snug text-foreground">
                                                            {item.title}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                                            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                                                                <span
                                                                    className="h-2 w-2 rounded-full"
                                                                    style={{
                                                                        backgroundColor:
                                                                            item.pillar.color || '#2563eb',
                                                                    }}
                                                                />
                                                                {item.pillar.name}
                                                            </span>
                                                            <span>·</span>
                                                            <span>{item.angle.name}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        ) : (
                            <div className="panel divide-y divide-border overflow-hidden bg-card">
                                {filteredPlanItems.map((item) => {
                                    const pCfg =
                                        PLATFORM_OPTIONS.find((p) => p.key === item.platform) ||
                                        PLATFORM_OPTIONS[0];
                                    const PlatformIcon = pCfg.icon;
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-zinc-50/60"
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                <span className="w-14 shrink-0 font-mono text-xs font-semibold text-muted-foreground">
                                                    T{item.week} · N{item.day}
                                                </span>
                                                <PlatformIcon
                                                    size={15}
                                                    weight="fill"
                                                    style={{ color: pCfg.dot }}
                                                    className="shrink-0"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-foreground">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.pillar.name} · {item.angle.name}
                                                    </p>
                                                </div>
                                            </div>
                                            <Link
                                                to="/create"
                                                className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-zinc-50"
                                            >
                                                {t('Viết bài')}
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* VIEW 2: MODULAR 2x2 BRAND DNA BENTO BOARD (KNOWLEDGE) */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'knowledge' && (
                    <form onSubmit={handleSaveBrand} className="space-y-4">
                        {/* Top Compact Identity & Save Bar */}
                        <div className="panel flex flex-wrap items-center justify-between gap-4 bg-card p-5">
                            <div className="flex min-w-0 items-center gap-3.5">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-dark bg-brand font-heading text-sm font-bold text-brand-ink">
                                    {(currentBrand?.name || 'SC').slice(0, 2).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="font-heading text-lg font-bold text-foreground">
                                            {t('Cơ sở tri thức thương hiệu')}
                                        </h2>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            {knowledgeFieldsCount}/5 {t('hoàn thiện')}
                                        </span>
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-2.5">
                                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-zinc-100">
                                            <div
                                                className="h-full rounded-full bg-brand-dark transition-all duration-300"
                                                style={{ width: `${(knowledgeFieldsCount / 5) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {t('AI tự động đồng bộ ngữ cảnh này khi lập lịch')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                <select
                                    value={brandForm.posting_frequency}
                                    onChange={(e) =>
                                        setBrandForm({
                                            ...brandForm,
                                            posting_frequency: e.target.value,
                                        })
                                    }
                                    className="h-9 cursor-pointer rounded-xl border border-border bg-zinc-50 px-3 text-xs font-medium text-foreground focus:border-brand-dark focus:bg-card focus:outline-none"
                                >
                                    <option value="1 bài/ngày">{t('Nhịp: 1 bài / ngày')}</option>
                                    <option value="2 bài/ngày">{t('Nhịp: 2 bài / ngày')}</option>
                                    <option value="3 bài/tuần">{t('Nhịp: 3 bài / tuần')}</option>
                                    <option value="5 bài/tuần">{t('Nhịp: 5 bài / tuần')}</option>
                                </select>
                                <button
                                    type="submit"
                                    disabled={savingBrand}
                                    className="btn-skew min-h-9 cursor-pointer whitespace-nowrap disabled:opacity-60"
                                >
                                    <FloppyDisk size={14} weight="bold" />
                                    <span>{savingBrand ? t('Đang lưu…') : t('Lưu hồ sơ')}</span>
                                </button>
                            </div>
                        </div>

                        {/* 2x2 Brand DNA Bento Cards */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {/* Card 1: Sản phẩm & Định vị */}
                            <section className="panel flex flex-col gap-3.5 bg-card p-5">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-brand-dark/30 bg-brand/20 text-brand-ink">
                                        <Package size={16} weight="duotone" />
                                    </span>
                                    <div>
                                        <h3 className="font-heading text-sm font-bold text-foreground">
                                            {t('Sản phẩm & Dịch vụ chủ lực')}
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground">
                                            {t('Giá trị cốt lõi và giải pháp cần truyền thông')}
                                        </p>
                                    </div>
                                </div>

                                <textarea
                                    rows={3}
                                    value={brandForm.products}
                                    onChange={(e) =>
                                        setBrandForm({ ...brandForm, products: e.target.value })
                                    }
                                    placeholder={t('Liệt kê sản phẩm, dịch vụ hoặc giải pháp trọng tâm…')}
                                    className="w-full rounded-xl border border-border bg-zinc-50/60 p-3 text-xs leading-relaxed text-foreground focus:border-brand-dark focus:bg-card focus:outline-none"
                                />

                                <label className="space-y-1">
                                    <span className="text-[11px] font-semibold text-muted-foreground">
                                        {t('Mô tả định vị ngắn')}
                                    </span>
                                    <input
                                        type="text"
                                        value={brandForm.description}
                                        onChange={(e) =>
                                            setBrandForm({ ...brandForm, description: e.target.value })
                                        }
                                        placeholder={t('Một câu tóm tắt điểm khác biệt của thương hiệu…')}
                                        className="h-9 w-full rounded-xl border border-border bg-zinc-50/60 px-3 text-xs text-foreground focus:border-brand-dark focus:bg-card focus:outline-none"
                                    />
                                </label>
                            </section>

                            {/* Card 2: Khách hàng mục tiêu */}
                            <section className="panel flex flex-col gap-3.5 bg-card p-5">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-brand-dark/30 bg-brand/20 text-brand-ink">
                                        <Users size={16} weight="duotone" />
                                    </span>
                                    <div>
                                        <h3 className="font-heading text-sm font-bold text-foreground">
                                            {t('Khách hàng & Độc giả mục tiêu')}
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground">
                                            {t('Chân dung người đọc, nỗi đau và động lực ra quyết định')}
                                        </p>
                                    </div>
                                </div>

                                <textarea
                                    rows={6}
                                    value={brandForm.target_audience}
                                    onChange={(e) =>
                                        setBrandForm({ ...brandForm, target_audience: e.target.value })
                                    }
                                    placeholder={t('VD: Doanh nghiệp SME, đội ngũ Marketing, chủ thương hiệu 25-40 tuổi…')}
                                    className="flex-1 w-full rounded-xl border border-border bg-zinc-50/60 p-3 text-xs leading-relaxed text-foreground focus:border-brand-dark focus:bg-card focus:outline-none"
                                />
                            </section>

                            {/* Card 3: Giọng điệu thương hiệu (Interactive Tag Board) */}
                            <section className="panel flex flex-col gap-3.5 bg-card p-5">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-brand-dark/30 bg-brand/20 text-brand-ink">
                                        <ChatTeardropText size={16} weight="duotone" />
                                    </span>
                                    <div>
                                        <h3 className="font-heading text-sm font-bold text-foreground">
                                            {t('Giọng điệu thương hiệu')}
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground">
                                            {t('Bấm tag để thêm hoặc gỡ nhanh phong cách viết')}
                                        </p>
                                    </div>
                                </div>

                                {/* Active Tone Chips */}
                                <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-border bg-zinc-50/50 p-2.5">
                                    {brandForm.tone_of_voice
                                        .split(/[,·+]/)
                                        .map((s) => s.trim())
                                        .filter(Boolean)
                                        .map((tone, idx) => (
                                            <span
                                                key={`${tone}-${idx}`}
                                                className="inline-flex items-center gap-1 rounded-lg border border-brand-dark/40 bg-brand/25 px-2.5 py-1 text-xs font-semibold text-brand-ink"
                                            >
                                                <span>{tone}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const next = brandForm.tone_of_voice
                                                            .split(/[,·+]/)
                                                            .map((s) => s.trim())
                                                            .filter((s) => s && s !== tone);
                                                        setBrandForm({
                                                            ...brandForm,
                                                            tone_of_voice: next.join(', '),
                                                        });
                                                    }}
                                                    className="cursor-pointer rounded p-0.5 hover:bg-brand-dark/20"
                                                    aria-label={t('Xóa')}
                                                >
                                                    <X size={10} weight="bold" />
                                                </button>
                                            </span>
                                        ))}
                                    {!brandForm.tone_of_voice.trim() && (
                                        <span className="text-xs text-muted-foreground">
                                            {t('Chọn nhanh từ gợi ý bên dưới…')}
                                        </span>
                                    )}
                                </div>

                                <input
                                    type="text"
                                    value={brandForm.tone_of_voice}
                                    onChange={(e) =>
                                        setBrandForm({ ...brandForm, tone_of_voice: e.target.value })
                                    }
                                    placeholder={t('Nhập hoặc chỉnh sửa các từ khóa cách nhau bởi dấu phẩy…')}
                                    className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-brand-dark focus:outline-none"
                                />

                                <div className="flex flex-wrap gap-1.5">
                                    {TONE_PRESETS.map((tone) => (
                                        <button
                                            key={tone}
                                            type="button"
                                            onClick={() => appendTone(tone)}
                                            className="cursor-pointer rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-brand-dark hover:text-foreground"
                                        >
                                            + {tone}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Card 4: Mục tiêu Marketing & KPI */}
                            <section className="panel flex flex-col gap-3.5 bg-card p-5">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-brand-dark/30 bg-brand/20 text-brand-ink">
                                        <Target size={16} weight="duotone" />
                                    </span>
                                    <div>
                                        <h3 className="font-heading text-sm font-bold text-foreground">
                                            {t('Mục tiêu Marketing & KPI')}
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground">
                                            {t('Đích đến ưu tiên để AI tối ưu CTA cho bài viết')}
                                        </p>
                                    </div>
                                </div>

                                <input
                                    type="text"
                                    value={brandForm.goals}
                                    onChange={(e) =>
                                        setBrandForm({ ...brandForm, goals: e.target.value })
                                    }
                                    placeholder={t('Nhập mục tiêu chiến dịch hoặc KPI nội dung…')}
                                    className="h-9 w-full rounded-xl border border-border bg-zinc-50/60 px-3 text-xs text-foreground focus:border-brand-dark focus:bg-card focus:outline-none"
                                />

                                <div className="grid grid-cols-1 gap-1.5">
                                    {GOAL_PRESETS.map((goal) => {
                                        const active = brandForm.goals === goal;
                                        return (
                                            <button
                                                key={goal}
                                                type="button"
                                                onClick={() => setBrandForm({ ...brandForm, goals: goal })}
                                                className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                                                    active
                                                        ? 'border-brand-dark bg-brand/25 font-semibold text-brand-ink'
                                                        : 'border-border bg-zinc-50/40 font-medium text-muted-foreground hover:bg-zinc-50 hover:text-foreground'
                                                }`}
                                            >
                                                <span className="truncate">{goal}</span>
                                                {active && <Check size={13} weight="bold" className="shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>

                        {/* Bottom Compact Media Library Strip */}
                        <div className="panel flex flex-wrap items-center justify-between gap-3 bg-card px-5 py-3.5 text-xs">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-zinc-50 text-foreground">
                                    <ImageSquare size={16} weight="duotone" />
                                </span>
                                <div>
                                    <span className="font-semibold text-foreground">
                                        {t('Thư viện tài nguyên thương hiệu')}
                                    </span>
                                    <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                                        {assets.length} {t('tệp sẵn sàng')}
                                    </span>
                                </div>
                            </div>
                            <Link
                                to="/media"
                                className="inline-flex min-h-8 items-center gap-1 rounded-xl border border-border bg-card px-3 font-semibold text-foreground transition-colors hover:bg-zinc-50"
                            >
                                <span>{t('Mở thư viện')}</span>
                                <ArrowSquareOut size={13} className="text-muted-foreground" />
                            </Link>
                        </div>
                    </form>
                )}

                {/* ------------------------------------------------------------- */}
                {/* VIEW 3: DUAL-BAR VISUAL SPECTRUM + SPLIT INSIGHTS (ANALYTICS) */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'analytics' && (
                    <div className="space-y-4">
                        {/* Unified Filter & Header Bar */}
                        <div className="panel flex flex-wrap items-center justify-between gap-3 bg-card px-5 py-3.5">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <select
                                    value={filters.range}
                                    onChange={(e) => setFilters({ ...filters, range: e.target.value })}
                                    className="h-9 cursor-pointer rounded-xl border border-border bg-zinc-50 px-3 font-medium text-foreground focus:border-brand-dark focus:bg-card focus:outline-none"
                                >
                                    <option value="all">{t('Tất cả thời gian')}</option>
                                    <option value="past30">{t('30 ngày qua')}</option>
                                    <option value="past90">{t('90 ngày qua')}</option>
                                    <option value="next30">{t('30 ngày tới')}</option>
                                </select>
                                {!desktop && (
                                    <select
                                        value={unit}
                                        onChange={(e) => setUnit(e.target.value)}
                                        className="h-9 cursor-pointer rounded-xl border border-border bg-zinc-50 px-3 font-medium text-foreground focus:border-brand-dark focus:bg-card focus:outline-none"
                                    >
                                        <option value="posts">{t('Bài nội dung')}</option>
                                        <option value="jobs">{t('Lượt xuất bản')}</option>
                                    </select>
                                )}
                                <select
                                    value={filters.platform}
                                    onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
                                    className="h-9 cursor-pointer rounded-xl border border-border bg-zinc-50 px-3 font-medium text-foreground focus:border-brand-dark focus:bg-card focus:outline-none"
                                >
                                    <option value="all">{t('Tất cả nền tảng')}</option>
                                    {PLATFORMS.map((p) => (
                                        <option key={p.value} value={p.value}>
                                            {PLATFORM_LABEL[p.value] || p.short || p.value}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                {isSimulated && (
                                    <button
                                        type="button"
                                        disabled={activating}
                                        onClick={handleActivateDefaultPillars}
                                        className="btn-skew min-h-9 cursor-pointer text-xs"
                                    >
                                        {activating ? t('Đang lưu…') : t('Dùng 4 trụ cột mẫu')}
                                    </button>
                                )}
                                <Link
                                    to="/strategy/pillars"
                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-zinc-50"
                                >
                                    <SlidersHorizontal size={13} />
                                    <span>{t('Quản lý trụ cột')}</span>
                                </Link>
                            </div>
                        </div>

                        {loading ? (
                            <Skeleton className="h-64 rounded-2xl" />
                        ) : rows.total === 0 ? (
                            <EmptyState
                                icon={ChartBar}
                                title={t('Không có nội dung khớp bộ lọc')}
                                description={t('Điều chỉnh bộ lọc phía trên để xem phân bổ chiến lược.')}
                            />
                        ) : (
                            <>
                                {/* Hero Visual Analytics Card: SVG Donut Ring (Left) + Vertical Grouped Bar Chart (Right) */}
                                <section className="panel overflow-hidden bg-card">
                                    <div className="grid grid-cols-1 divide-y divide-border xl:grid-cols-12 xl:divide-x xl:divide-y-0">
                                        {/* LEFT (5 cols): Interactive SVG Donut Ring */}
                                        <div className="flex flex-col items-center justify-center gap-4 p-6 xl:col-span-5">
                                            <div className="w-full text-left">
                                                <h2 className="font-heading text-sm font-bold text-foreground">
                                                    {t('Cơ cấu thực tế')}
                                                </h2>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {t('Tỷ trọng phân bổ trên tổng {total} bài viết', {
                                                        total: rows.total,
                                                    })}
                                                </p>
                                            </div>

                                            {(() => {
                                                const radius = 64;
                                                const circumference = 2 * Math.PI * radius;
                                                let offset = 0;
                                                const totalPct = activePillarStats.reduce(
                                                    (sum, p) => sum + Math.max(0, p.actual || 0),
                                                    0
                                                ) || 100;
                                                return (
                                                    <div className="relative flex h-44 w-44 items-center justify-center">
                                                        <svg
                                                            viewBox="0 0 160 160"
                                                            className="h-full w-full -rotate-90"
                                                            role="img"
                                                            aria-label={t('Biểu đồ tròn phân bổ trụ cột')}
                                                        >
                                                            <circle
                                                                cx="80"
                                                                cy="80"
                                                                r={radius}
                                                                fill="none"
                                                                stroke="#f4f4f5"
                                                                strokeWidth="18"
                                                            />
                                                            {activePillarStats.map((p) => {
                                                                const frac = Math.max(0, p.actual || 0) / totalPct;
                                                                const dash = Math.max(0, frac * circumference - 2);
                                                                const curOffset = offset;
                                                                offset += frac * circumference;
                                                                return (
                                                                    <circle
                                                                        key={p.id}
                                                                        cx="80"
                                                                        cy="80"
                                                                        r={radius}
                                                                        fill="none"
                                                                        stroke={p.color || '#2563eb'}
                                                                        strokeWidth="18"
                                                                        strokeDasharray={`${dash} ${circumference}`}
                                                                        strokeDashoffset={-curOffset}
                                                                        className="transition-all duration-500"
                                                                    />
                                                                );
                                                            })}
                                                        </svg>
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                                            <span className="font-heading text-2xl font-bold tabular-nums text-foreground">
                                                                {balanceRate}%
                                                            </span>
                                                            <span className="text-[11px] font-medium text-emerald-700">
                                                                {t('Cân bằng')}
                                                            </span>
                                                            <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                                                                {rows.total} {t('bài')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-[11px]">
                                                {activePillarStats.map((p) => (
                                                    <span
                                                        key={p.id}
                                                        className="inline-flex items-center gap-1.5 text-muted-foreground"
                                                    >
                                                        <span
                                                            className="h-2 w-2 shrink-0 rounded-full"
                                                            style={{ backgroundColor: p.color || '#2563eb' }}
                                                        />
                                                        <span className="max-w-[120px] truncate font-medium text-foreground">
                                                            {p.name}
                                                        </span>
                                                        <span className="font-mono tabular-nums">{p.actual}%</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* RIGHT (7 cols): Vertical Grouped Bar Chart (Target vs Actual) */}
                                        <div className="flex flex-col justify-between gap-4 p-6 xl:col-span-7">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <h2 className="font-heading text-sm font-bold text-foreground">
                                                        {t('Biểu đồ cột Mục tiêu vs Thực tế')}
                                                    </h2>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {t('Cột xám là mục tiêu đề ra · Cột màu là tỷ lệ thực tế')}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <span className="h-2.5 w-2.5 rounded-xs bg-zinc-200" />
                                                        {t('Mục tiêu')}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <span className="h-2.5 w-2.5 rounded-xs bg-brand-dark" />
                                                        {t('Thực tế')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Vertical Bars Plot */}
                                            {(() => {
                                                const maxVal = Math.max(
                                                    40,
                                                    ...activePillarStats.map((p) =>
                                                        Math.max(p.actual || 0, p.target_percentage || 0)
                                                    )
                                                );
                                                return (
                                                    <div className="grid h-52 grid-flow-col auto-cols-fr items-end gap-3 border-b border-border pb-2 pt-6">
                                                        {activePillarStats.map((p) => {
                                                            const targetH = Math.max(
                                                                8,
                                                                Math.round(((p.target_percentage || 0) / maxVal) * 100)
                                                            );
                                                            const actualH = Math.max(
                                                                8,
                                                                Math.round(((p.actual || 0) / maxVal) * 100)
                                                            );
                                                            const diff = p.actual - (p.target_percentage || 0);
                                                            const isUnder = -diff > 5;
                                                            return (
                                                                <div
                                                                    key={p.id}
                                                                    className="flex h-full flex-col items-center justify-end gap-2"
                                                                >
                                                                    <div className="flex h-full w-full items-end justify-center gap-1.5">
                                                                        {/* Target Column */}
                                                                        <div className="flex h-full flex-col items-center justify-end">
                                                                            <span className="mb-1 font-mono text-[10px] tabular-nums text-muted-foreground">
                                                                                {p.target_percentage || 0}%
                                                                            </span>
                                                                            <div
                                                                                className="w-5 rounded-t-md bg-zinc-200 transition-all duration-500 sm:w-6"
                                                                                style={{ height: `${targetH}%` }}
                                                                                title={`Mục tiêu: ${p.target_percentage || 0}%`}
                                                                            />
                                                                        </div>
                                                                        {/* Actual Column */}
                                                                        <div className="flex h-full flex-col items-center justify-end">
                                                                            <span className="mb-1 font-mono text-[10px] font-bold tabular-nums text-foreground">
                                                                                {p.actual}%
                                                                            </span>
                                                                            <div
                                                                                className="w-5 rounded-t-md transition-all duration-500 sm:w-6"
                                                                                style={{
                                                                                    height: `${actualH}%`,
                                                                                    backgroundColor: p.color || '#2563eb',
                                                                                }}
                                                                                title={`Thực tế: ${p.actual}% (${p.count} bài)`}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="w-full text-center">
                                                                        <p
                                                                            className="truncate text-[11px] font-semibold text-foreground"
                                                                            title={p.name}
                                                                        >
                                                                            {p.name.split('&')[0].trim()}
                                                                        </p>
                                                                        <Link
                                                                            to={isUnder ? '/create' : '/strategy/pillars'}
                                                                            className="text-[10px] font-medium text-muted-foreground hover:text-brand-dark hover:underline"
                                                                        >
                                                                            {p.count} {t('bài')} · {isUnder ? '+ Lên bài' : 'Sửa'}
                                                                        </Link>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </section>

                                {/* Full-Width Weekly Scheduled Cadence (Zero unbalanced whitespace) */}
                                <DistributionOverTime scope={scope} filters={filters} />

                                {/* Full-Width Content Angles Grid (3 columns, collapsible if > 6) */}
                                <section className="panel space-y-4 bg-card p-5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-heading text-sm font-bold text-foreground">
                                                    {t('Ma trận Góc khai thác')}
                                                </h3>
                                                <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
                                                    {activeAngleStats.length} {t('góc')}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                                {t('Tỷ trọng từng góc tiếp cận nội dung, sắp xếp từ cao xuống thấp')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {activeAngleStats.length > 6 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAllAngles((v) => !v)}
                                                    className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-border bg-zinc-50 px-2.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-zinc-100"
                                                >
                                                    {showAllAngles
                                                        ? t('Thu gọn')
                                                        : t('Xem tất cả ({count})', {
                                                              count: activeAngleStats.length,
                                                          })}
                                                </button>
                                            )}
                                            <Link
                                                to="/strategy/angles"
                                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11px] font-semibold text-foreground hover:bg-zinc-50"
                                            >
                                                <span>{t('Quản lý')}</span>
                                                <ArrowSquareOut size={12} className="text-muted-foreground" />
                                            </Link>
                                        </div>
                                    </div>

                                    {(() => {
                                        const sortedAngles = [...activeAngleStats].sort(
                                            (a, b) => (b.count || 0) - (a.count || 0)
                                        );
                                        const visibleAngles = showAllAngles
                                            ? sortedAngles
                                            : sortedAngles.slice(0, 6);
                                        return (
                                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                                                {visibleAngles.map((angle) => (
                                                    <div
                                                        key={angle.id}
                                                        className="flex flex-col justify-between gap-2 rounded-xl border border-border bg-zinc-50/50 p-3.5"
                                                    >
                                                        <span
                                                            className="line-clamp-1 text-xs font-medium text-foreground"
                                                            title={angle.name}
                                                        >
                                                            {angle.name}
                                                        </span>
                                                        <div className="flex items-baseline justify-between">
                                                            <span className="font-heading text-lg font-bold tabular-nums text-foreground">
                                                                {angle.actual}%
                                                            </span>
                                                            <span className="rounded-md bg-brand/25 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-brand-ink">
                                                                {angle.count} {t('bài')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </section>

                                {/* Compact Unassigned Status */}
                                {unassignedPillarCount === 0 ? (
                                    <div className="panel flex items-center justify-between bg-card px-5 py-3.5 text-xs">
                                        <span className="inline-flex items-center gap-2 font-medium text-foreground">
                                            <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                                            <span>{t('100% bài viết đã được gắn trụ cột chiến lược.')}</span>
                                        </span>
                                        <Link to="/posts" className="font-medium text-muted-foreground hover:text-foreground">
                                            {t('Xem tất cả bài viết →')}
                                        </Link>
                                    </div>
                                ) : (
                                    <section className="panel overflow-hidden bg-card">
                                        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 text-xs">
                                            <span className="inline-flex items-center gap-2 font-semibold text-foreground">
                                                <Tag size={14} weight="bold" />
                                                <span>
                                                    {t('Bài chưa phân loại')} ({unassignedPillarCount})
                                                </span>
                                            </span>
                                            <Link to="/posts" className="text-muted-foreground hover:text-foreground">
                                                {t('Xem tất cả →')}
                                            </Link>
                                        </div>
                                        <div className="divide-y divide-border">
                                            {unassignedPosts.map((post) => (
                                                <div
                                                    key={post.id}
                                                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs"
                                                >
                                                    <p className="min-w-0 flex-1 truncate font-medium text-foreground">
                                                        {formatPostSnippet(post.caption || post.title) ||
                                                            t('Bài viết chưa đặt tiêu đề')}
                                                    </p>
                                                    <div className="flex shrink-0 items-center gap-2.5">
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {post.scheduled_at
                                                                ? formatCalendarDate(post.scheduled_at)
                                                                : t('Bản nháp')}
                                                        </span>
                                                        <select
                                                            disabled={assigningPostId === post.id}
                                                            defaultValue="none"
                                                            onChange={(e) =>
                                                                handleAssignPillar(post.id, e.target.value)
                                                            }
                                                            className="h-8 cursor-pointer rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground"
                                                        >
                                                            <option value="none" disabled>
                                                                + {t('Gán trụ cột…')}
                                                            </option>
                                                            {activePillarStats.map((p) => (
                                                                <option key={p.id} value={p.id}>
                                                                    {p.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
