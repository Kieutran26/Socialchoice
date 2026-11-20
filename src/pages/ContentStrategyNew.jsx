import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowSquareOut,
    CalendarBlank,
    CalendarCheck,
    CaretDown,
    ChartBar,
    Check,
    CheckCircle,
    Compass,
    FacebookLogo,
    FloppyDisk,
    IdentificationCard,
    ImageSquare,
    InstagramLogo,
    Lightning,
    LinkedinLogo,
    ListBullets,
    MagnifyingGlass,
    Plus,
    SlidersHorizontal,
    Sparkle,
    SquaresFour,
    Tag,
    Target,
    ThreadsLogo,
    TiktokLogo,
    Trash,
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
        color: '#18181b',
        target_percentage: 40,
        actual: 42,
        count: 5,
        description: 'Chia sẻ kiến thức, tips, tutorials và hướng dẫn chuyên sâu.',
    },
    {
        id: 'pillar-case',
        name: 'Case Study & Khách hàng thực tế',
        color: '#2563eb',
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
        color: '#059669',
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
        dot: '#18181b',
        activeCls: 'border-zinc-400 bg-zinc-100 text-zinc-900',
    },
    {
        key: 'tiktok',
        label: 'TikTok',
        icon: TiktokLogo,
        dot: '#18181b',
        activeCls: 'border-zinc-400 bg-zinc-100 text-zinc-900',
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
    const total = Math.max(4, Math.min(30, Math.round(days * perDay)));

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
        const date = new Date(now + (i * stepDays + 1) * 86400000);
        const hook = HOOK_GENERATORS[i % HOOK_GENERATORS.length](pillar, brandName || 'thương hiệu');
        return {
            id: `plan-${i + 1}-${Date.now()}`,
            day: i * stepDays + 1,
            time: i % 2 === 0 ? '09:00' : '19:30',
            dateIso: date.toISOString(),
            platform,
            pillar,
            angle,
            title: hook,
        };
    });
}

export default function ContentStrategyNew() {
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

    // Data state
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [assets, setAssets] = useState([]);
    const [rows, setRows] = useState({ pillar: [], angle: [], total: 0 });
    const [unassignedPosts, setUnassignedPosts] = useState([]);

    // Tab 1: AI Strategist state
    const [days, setDays] = useState(30);
    const [frequency, setFrequency] = useState('1_per_day');
    const [selectedPlatforms, setSelectedPlatforms] = useState(['facebook', 'instagram']);
    const [planItems, setPlanItems] = useState([]);
    const [planView, setPlanView] = useState('table'); // 'table' | 'grid' | 'calendar'
    const [planSearch, setPlanSearch] = useState('');
    const [planFilterPillar, setPlanFilterPillar] = useState('all');
    const [planFilterPlatform, setPlanFilterPlatform] = useState('all');
    const [generating, setGenerating] = useState(false);
    const [applyingPlan, setApplyingPlan] = useState(false);

    // Tab 2: Brand Knowledge Base state
    const [brandForm, setBrandForm] = useState({
        products: '',
        target_audience: '',
        tone_of_voice: '',
        goals: '',
        posting_frequency: '1 bài/ngày',
        description: '',
    });
    const [savingBrand, setSavingBrand] = useState(false);

    // Tab 3: Analytics filters & actions
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

            let pillarRows;
            let angleRows;
            let total;

            if (unit === 'posts') {
                const postQuery = platformAccounts
                    ? { ...query, account_ids: { $in: platformAccounts } }
                    : query;
                const [pillarAgg, angleAgg, totalCount] = await Promise.all([
                    appClient.entities.Post.aggregate({ query: postQuery, groupBy: 'pillar_id' }),
                    appClient.entities.Post.aggregate({ query: postQuery, groupBy: 'angle_id' }),
                    appClient.entities.Post.count(postQuery),
                ]);
                pillarRows = pillarAgg.rows;
                angleRows = angleAgg.rows;
                total = totalCount;
            } else {
                const jobQuery = { ...scope };
                if (query.scheduled_at) jobQuery.scheduled_for = query.scheduled_at;
                if (filters.platform !== 'all') jobQuery.platform = filters.platform;
                const jobAgg = await appClient.entities.PublishJob.aggregate({
                    query: jobQuery,
                    groupBy: 'post_id',
                });
                const postIds = jobAgg.rows.map((r) => r.post_id);
                if (!postIds.length) {
                    setRows({ pillar: [], angle: [], total: 0 });
                    setLoading(false);
                    return;
                }
                const posts = await appClient.entities.Post.filter(
                    { ...scope, id: { $in: postIds } },
                    { limit: 500, fields: ['pillar_id', 'angle_id'] }
                );
                const byId = Object.fromEntries((posts.items || []).map((p) => [p.id, p]));
                const pTally = {};
                const aTally = {};
                let sum = 0;
                jobAgg.rows.forEach((r) => {
                    const p = byId[r.post_id];
                    if (!p) return;
                    sum += r.count;
                    pTally[p.pillar_id] = (pTally[p.pillar_id] || 0) + r.count;
                    aTally[p.angle_id] = (aTally[p.angle_id] || 0) + r.count;
                });
                pillarRows = Object.entries(pTally).map(([pillar_id, count]) => ({ pillar_id, count }));
                angleRows = Object.entries(aTally).map(([angle_id, count]) => ({ angle_id, count }));
                total = sum;
            }

            setRows({ pillar: pillarRows, angle: angleRows, total });

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
    }, [scope, filters, unit]);

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

    // Derived metrics
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
            if (planFilterPillar !== 'all' && item.pillar.id !== planFilterPillar) return false;
            if (planFilterPlatform !== 'all' && item.platform !== planFilterPlatform) return false;
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
    }, [planItems, planSearch, planFilterPillar, planFilterPlatform]);

    const planPillarSummary = useMemo(() => {
        const total = planItems.length || 1;
        const map = new Map();
        planItems.forEach((item) => {
            const cur = map.get(item.pillar.id) || {
                id: item.pillar.id,
                name: item.pillar.name,
                color: item.pillar.color || '#18181b',
                count: 0,
            };
            cur.count += 1;
            map.set(item.pillar.id, cur);
        });
        return Array.from(map.values()).map((item) => ({
            ...item,
            percentage: Math.round((item.count / total) * 100),
        }));
    }, [planItems]);

    // Handlers
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
            toast({ title: t('Đã tạo kế hoạch {days} ngày mới', { days }) });
        }, 250);
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
            toast({ title: t('Đã lưu cơ sở tri thức thương hiệu') });
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

    const filteredAngles = angles.filter(
        (a) => filters.pillar_id === 'all' || a.pillar_id === filters.pillar_id
    );

    return (
        <div className="space-y-6">
            {/* 1. CALM, MINIMAL HEADER */}
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-dark bg-brand text-brand-ink">
                        <Compass size={20} weight="duotone" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                {t('Chiến lược nội dung')}
                            </h1>
                            <span className="text-xs text-muted-foreground">
                                · {currentBrand?.name || t('Thương hiệu')} ({assets.length} {t('tài nguyên')})
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {t('Hoạch định kế hoạch AI, chuẩn hóa tri thức thương hiệu và theo dõi phân bổ trụ cột.')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        to="/strategy/campaigns"
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-zinc-50"
                    >
                        <Target size={14} weight="bold" className="text-muted-foreground" />
                        <span>{t('Chiến dịch')}</span>
                    </Link>
                    <Link to="/create" className="btn-skew min-h-9 whitespace-nowrap">
                        <Plus size={14} weight="bold" />
                        <span>{t('Tạo bài viết')}</span>
                    </Link>
                </div>
            </header>

            {/* 2. CLEAN UNDERLINE TAB NAVIGATION (NO COMPETING YELLOW BLOCKS) */}
            <nav className="flex items-center gap-6 overflow-x-auto border-b border-border">
                {[
                    {
                        key: 'strategist',
                        label: t('Trợ lý chiến lược AI'),
                        icon: Sparkle,
                        meta: `${planItems.length}`,
                    },
                    {
                        key: 'knowledge',
                        label: t('Cơ sở tri thức thương hiệu'),
                        icon: IdentificationCard,
                        meta: `${knowledgeFieldsCount}/5`,
                    },
                    {
                        key: 'analytics',
                        label: t('Phân bổ & Mục tiêu'),
                        icon: ChartBar,
                        meta: `${balanceRate}%`,
                    },
                ].map((tab) => {
                    const active = activeTab === tab.key;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`relative inline-flex cursor-pointer items-center gap-2 whitespace-nowrap pb-3 text-sm font-medium transition-colors ${
                                active
                                    ? 'font-semibold text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Icon size={16} weight={active ? 'fill' : 'regular'} />
                            <span>{tab.label}</span>
                            <span
                                className={`rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums ${
                                    active
                                        ? 'bg-brand/35 font-semibold text-brand-ink'
                                        : 'bg-zinc-100 text-muted-foreground'
                                }`}
                            >
                                {tab.meta}
                            </span>
                            {active && (
                                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-dark" />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* ================================================================= */}
            {/* TAB 1: TRỢ LÝ CHIẾN LƯỢC AI (CLEAN 2-SURFACE DESIGN) */}
            {/* ================================================================= */}
            {activeTab === 'strategist' && (
                <div className="space-y-5">
                    {/* Surface 1: Unified Compact Cockpit + Thin Distribution Bar */}
                    <section className="panel overflow-hidden bg-card">
                        <div className="flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                                {/* Duration */}
                                <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-zinc-50 p-1">
                                    {[7, 14, 30].map((d) => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => setDays(d)}
                                            className={`h-7 cursor-pointer rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                                                days === d
                                                    ? 'bg-brand text-brand-ink shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            {d}d
                                        </button>
                                    ))}
                                </div>

                                {/* Frequency */}
                                <div className="relative">
                                    <select
                                        value={frequency}
                                        onChange={(e) => setFrequency(e.target.value)}
                                        className="h-9 cursor-pointer appearance-none rounded-xl border border-border bg-card pl-3 pr-8 text-xs font-medium text-foreground focus:border-zinc-900 focus:outline-none"
                                    >
                                        <option value="1_per_day">{t('1 bài / ngày')}</option>
                                        <option value="2_per_day">{t('2 bài / ngày')}</option>
                                        <option value="3_per_week">{t('3 bài / tuần')}</option>
                                        <option value="5_per_week">{t('5 bài / tuần')}</option>
                                    </select>
                                    <CaretDown
                                        size={12}
                                        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    />
                                </div>

                                <span className="hidden h-5 w-px bg-border sm:block" />

                                {/* Platforms (Light Native Platform Tints) */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {PLATFORM_OPTIONS.map((p) => {
                                        const active = selectedPlatforms.includes(p.key);
                                        const Icon = p.icon;
                                        return (
                                            <button
                                                key={p.key}
                                                type="button"
                                                onClick={() => togglePlatform(p.key)}
                                                className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors ${
                                                    active
                                                        ? `${p.activeCls} font-semibold`
                                                        : 'border-border bg-card text-muted-foreground hover:bg-zinc-50 hover:text-foreground'
                                                }`}
                                            >
                                                <Icon
                                                    size={14}
                                                    weight="fill"
                                                    style={{ color: p.dot }}
                                                />
                                                <span>{p.label}</span>
                                                {active && <Check size={12} weight="bold" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Single Primary CTA */}
                            <button
                                type="button"
                                disabled={generating}
                                onClick={handleRegeneratePlan}
                                className="btn-skew min-h-9 shrink-0 cursor-pointer whitespace-nowrap disabled:opacity-60"
                            >
                                <Lightning size={14} weight="fill" />
                                <span>
                                    {generating
                                        ? t('Đang tổng hợp…')
                                        : t('Tạo kế hoạch {days} ngày', { days })}
                                </span>
                            </button>
                        </div>

                        {/* Integrated Subtle Distribution Strip */}
                        <div className="space-y-2 border-t border-border bg-zinc-50/50 px-5 py-3">
                            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/70">
                                {planPillarSummary.map((item) => (
                                    <div
                                        key={item.id}
                                        style={{
                                            width: `${item.percentage}%`,
                                            backgroundColor: item.color,
                                        }}
                                        className="h-full transition-all duration-300"
                                        title={`${item.name}: ${item.percentage}%`}
                                    />
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                    {planPillarSummary.map((item) => (
                                        <span key={item.id} className="inline-flex items-center gap-1.5">
                                            <span
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span className="font-medium text-foreground">{item.name}</span>
                                            <span className="tabular-nums">{item.percentage}%</span>
                                        </span>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('knowledge')}
                                    className="cursor-pointer font-medium text-foreground underline-offset-4 hover:underline"
                                >
                                    {t('Tri thức: {count}/5 tiêu chí', { count: knowledgeFieldsCount })}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Surface 2: Clean Content Plan Workspace */}
                    <section className="panel overflow-hidden bg-card">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <div className="relative w-52">
                                    <MagnifyingGlass
                                        size={14}
                                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    />
                                    <input
                                        type="text"
                                        value={planSearch}
                                        onChange={(e) => setPlanSearch(e.target.value)}
                                        placeholder={t('Tìm chủ đề, góc khai thác…')}
                                        className="h-9 w-full rounded-xl border border-border bg-zinc-50/70 pl-8 pr-3 text-xs text-foreground focus:border-zinc-900 focus:bg-card focus:outline-none"
                                    />
                                </div>

                                <select
                                    value={planFilterPillar}
                                    onChange={(e) => setPlanFilterPillar(e.target.value)}
                                    className="h-9 cursor-pointer rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground focus:border-zinc-900 focus:outline-none"
                                >
                                    <option value="all">{t('Tất cả trụ cột')}</option>
                                    {activePillarStats.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={planFilterPlatform}
                                    onChange={(e) => setPlanFilterPlatform(e.target.value)}
                                    className="h-9 cursor-pointer rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground focus:border-zinc-900 focus:outline-none"
                                >
                                    <option value="all">{t('Tất cả nền tảng')}</option>
                                    {PLATFORM_OPTIONS.map((p) => (
                                        <option key={p.key} value={p.key}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <div className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-zinc-50 p-0.5">
                                    {[
                                        { key: 'table', icon: ListBullets, label: t('Danh sách') },
                                        { key: 'grid', icon: SquaresFour, label: t('Thẻ') },
                                        { key: 'calendar', icon: CalendarBlank, label: t('Lịch') },
                                    ].map((v) => {
                                        const Icon = v.icon;
                                        const active = planView === v.key;
                                        return (
                                            <button
                                                key={v.key}
                                                type="button"
                                                onClick={() => setPlanView(v.key)}
                                                className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors ${
                                                    active
                                                        ? 'bg-card font-semibold text-foreground shadow-xs'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                <Icon size={14} weight={active ? 'bold' : 'regular'} />
                                                <span className="hidden sm:inline">{v.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    disabled={applyingPlan || !filteredPlanItems.length}
                                    onClick={handleApplyPlan}
                                    className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-brand-dark bg-brand/25 px-3.5 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand/40 disabled:opacity-50"
                                >
                                    <CalendarCheck size={14} weight="bold" />
                                    <span>
                                        {applyingPlan ? t('Đang áp dụng…') : t('Áp dụng vào lịch')}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {planView === 'table' && (
                            <div className="divide-y divide-border">
                                {filteredPlanItems.map((item) => {
                                    const pCfg =
                                        PLATFORM_OPTIONS.find((p) => p.key === item.platform) ||
                                        PLATFORM_OPTIONS[0];
                                    const PlatformIcon = pCfg.icon;
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-zinc-50/70"
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-3.5">
                                                <div className="w-16 shrink-0 text-xs">
                                                    <div className="font-semibold text-foreground">
                                                        {t('Ngày')} {item.day}
                                                    </div>
                                                    <div className="font-mono text-[11px] tabular-nums text-muted-foreground">
                                                        {item.time}
                                                    </div>
                                                </div>

                                                <span
                                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-card"
                                                    title={pCfg.label}
                                                >
                                                    <PlatformIcon
                                                        size={15}
                                                        weight="fill"
                                                        style={{ color: pCfg.dot }}
                                                    />
                                                </span>

                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-foreground">
                                                        {item.title}
                                                    </p>
                                                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <span
                                                                className="h-2 w-2 rounded-full"
                                                                style={{
                                                                    backgroundColor:
                                                                        item.pillar.color || '#18181b',
                                                                }}
                                                            />
                                                            <span className="font-medium text-foreground">
                                                                {item.pillar.name}
                                                            </span>
                                                        </span>
                                                        <span>·</span>
                                                        <span>{item.angle.name}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-1.5">
                                                <Link
                                                    to="/create"
                                                    className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-zinc-100"
                                                >
                                                    {t('Viết bài')}
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setPlanItems((prev) =>
                                                            prev.filter((x) => x.id !== item.id)
                                                        )
                                                    }
                                                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-foreground"
                                                    title={t('Bỏ bài này')}
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {planView === 'grid' && (
                            <div className="grid grid-cols-1 gap-3.5 p-5 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredPlanItems.map((item) => {
                                    const pCfg =
                                        PLATFORM_OPTIONS.find((p) => p.key === item.platform) ||
                                        PLATFORM_OPTIONS[0];
                                    const PlatformIcon = pCfg.icon;
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-zinc-300"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span className="font-mono font-medium tabular-nums">
                                                        {t('Ngày')} {item.day} · {item.time}
                                                    </span>
                                                    <PlatformIcon
                                                        size={15}
                                                        weight="fill"
                                                        style={{ color: pCfg.dot }}
                                                    />
                                                </div>
                                                <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                                                    {item.title}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-border pt-2.5 text-[11px] text-muted-foreground">
                                                <span className="inline-flex items-center gap-1.5 truncate">
                                                    <span
                                                        className="h-2 w-2 shrink-0 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                item.pillar.color || '#18181b',
                                                        }}
                                                    />
                                                    <span className="truncate">{item.pillar.name}</span>
                                                </span>
                                                <Link
                                                    to="/create"
                                                    className="shrink-0 font-semibold text-foreground hover:underline"
                                                >
                                                    {t('Viết →')}
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {planView === 'calendar' && (
                            <div className="grid grid-cols-2 gap-2.5 p-5 sm:grid-cols-4 lg:grid-cols-7">
                                {filteredPlanItems.map((item) => {
                                    const pCfg =
                                        PLATFORM_OPTIONS.find((p) => p.key === item.platform) ||
                                        PLATFORM_OPTIONS[0];
                                    const PlatformIcon = pCfg.icon;
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex min-h-24 flex-col justify-between rounded-xl border border-border bg-zinc-50/50 p-2.5"
                                        >
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-mono font-semibold text-muted-foreground">
                                                    N{item.day}
                                                </span>
                                                <PlatformIcon
                                                    size={13}
                                                    weight="fill"
                                                    style={{ color: pCfg.dot }}
                                                />
                                            </div>
                                            <p className="my-1.5 line-clamp-2 text-xs font-medium text-foreground">
                                                {item.title}
                                            </p>
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <span
                                                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            item.pillar.color || '#18181b',
                                                    }}
                                                />
                                                <span className="truncate">{item.time}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {/* ================================================================= */}
            {/* TAB 2: CƠ SỞ TRI THỨC THƯƠNG HIỆU (CALM 2-COLUMN SPLIT) */}
            {/* ================================================================= */}
            {activeTab === 'knowledge' && (
                <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
                    {/* Left Form (7 cols) */}
                    <form
                        onSubmit={handleSaveBrand}
                        className="panel space-y-5 bg-card p-6 xl:col-span-7"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                            <div>
                                <h2 className="font-heading text-base font-semibold text-foreground">
                                    {t('Thiết lập tri thức thương hiệu')}
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {t('Ngữ cảnh chuẩn giúp AI tạo nội dung đúng giọng điệu và mục tiêu.')}
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={savingBrand}
                                className="btn-skew min-h-9 cursor-pointer whitespace-nowrap disabled:opacity-60"
                            >
                                <FloppyDisk size={14} weight="bold" />
                                <span>{savingBrand ? t('Đang lưu…') : t('Lưu thay đổi')}</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <label className="space-y-1.5 text-xs">
                                <span className="font-semibold text-foreground">
                                    {t('Sản phẩm & Dịch vụ chủ lực')}
                                </span>
                                <textarea
                                    rows={3}
                                    value={brandForm.products}
                                    onChange={(e) =>
                                        setBrandForm({ ...brandForm, products: e.target.value })
                                    }
                                    placeholder={t('Mô tả các sản phẩm hoặc giải pháp trọng tâm…')}
                                    className="w-full rounded-xl border border-border bg-zinc-50/50 p-3 text-xs text-foreground focus:border-zinc-900 focus:bg-card focus:outline-none"
                                />
                            </label>

                            <label className="space-y-1.5 text-xs">
                                <span className="font-semibold text-foreground">
                                    {t('Khách hàng & Độc giả mục tiêu')}
                                </span>
                                <textarea
                                    rows={3}
                                    value={brandForm.target_audience}
                                    onChange={(e) =>
                                        setBrandForm({ ...brandForm, target_audience: e.target.value })
                                    }
                                    placeholder={t('Chân dung khách hàng, độ tuổi, nỗi đau và nhu cầu…')}
                                    className="w-full rounded-xl border border-border bg-zinc-50/50 p-3 text-xs text-foreground focus:border-zinc-900 focus:bg-card focus:outline-none"
                                />
                            </label>
                        </div>

                        <div className="space-y-2 text-xs">
                            <label className="block space-y-1.5">
                                <span className="font-semibold text-foreground">
                                    {t('Giọng điệu thương hiệu')}
                                </span>
                                <input
                                    type="text"
                                    value={brandForm.tone_of_voice}
                                    onChange={(e) =>
                                        setBrandForm({ ...brandForm, tone_of_voice: e.target.value })
                                    }
                                    placeholder={t('VD: Chuyên nghiệp, gần gũi, thực tiễn')}
                                    className="h-10 w-full rounded-xl border border-border bg-zinc-50/50 px-3 text-xs text-foreground focus:border-zinc-900 focus:bg-card focus:outline-none"
                                />
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {TONE_PRESETS.map((tone) => (
                                    <button
                                        key={tone}
                                        type="button"
                                        onClick={() => appendTone(tone)}
                                        className="cursor-pointer rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-zinc-400 hover:text-foreground"
                                    >
                                        + {tone}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2 text-xs">
                            <label className="block space-y-1.5">
                                <span className="font-semibold text-foreground">
                                    {t('Mục tiêu Marketing & KPI')}
                                </span>
                                <input
                                    type="text"
                                    value={brandForm.goals}
                                    onChange={(e) => setBrandForm({ ...brandForm, goals: e.target.value })}
                                    placeholder={t('VD: Tăng nhận diện thương hiệu và chuyển đổi tự nhiên')}
                                    className="h-10 w-full rounded-xl border border-border bg-zinc-50/50 px-3 text-xs text-foreground focus:border-zinc-900 focus:bg-card focus:outline-none"
                                />
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {GOAL_PRESETS.map((goal) => {
                                    const active = brandForm.goals === goal;
                                    return (
                                        <button
                                            key={goal}
                                            type="button"
                                            onClick={() => setBrandForm({ ...brandForm, goals: goal })}
                                            className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                                active
                                                    ? 'border-brand-dark bg-brand/30 font-semibold text-brand-ink'
                                                    : 'border-border bg-card text-muted-foreground hover:border-zinc-400 hover:text-foreground'
                                            }`}
                                        >
                                            {active ? <Check size={10} className="mr-1 inline" /> : '+ '}
                                            {goal}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <label className="space-y-1.5 text-xs">
                                <span className="font-semibold text-foreground">
                                    {t('Tần suất đăng mong muốn')}
                                </span>
                                <select
                                    value={brandForm.posting_frequency}
                                    onChange={(e) =>
                                        setBrandForm({ ...brandForm, posting_frequency: e.target.value })
                                    }
                                    className="h-10 w-full cursor-pointer rounded-xl border border-border bg-zinc-50/50 px-3 text-xs text-foreground focus:border-zinc-900 focus:bg-card focus:outline-none"
                                >
                                    <option value="1 bài/ngày">{t('1 bài / ngày')}</option>
                                    <option value="2 bài/ngày">{t('2 bài / ngày')}</option>
                                    <option value="3 bài/tuần">{t('3 bài / tuần')}</option>
                                    <option value="5 bài/tuần">{t('5 bài / tuần')}</option>
                                </select>
                            </label>

                            <label className="space-y-1.5 text-xs">
                                <span className="font-semibold text-foreground">
                                    {t('Mô tả chung thương hiệu')}
                                </span>
                                <textarea
                                    rows={2}
                                    value={brandForm.description}
                                    onChange={(e) =>
                                        setBrandForm({ ...brandForm, description: e.target.value })
                                    }
                                    placeholder={t('Tóm tắt định vị cốt lõi của thương hiệu…')}
                                    className="w-full rounded-xl border border-border bg-zinc-50/50 p-3 text-xs text-foreground focus:border-zinc-900 focus:bg-card focus:outline-none"
                                />
                            </label>
                        </div>
                    </form>

                    {/* Right Clean Spec Sheet (5 cols - Calm Monochrome) */}
                    <aside className="panel sticky top-20 overflow-hidden bg-card xl:col-span-5">
                        <div className="flex items-center justify-between gap-3 border-b border-border bg-zinc-50/60 px-5 py-4">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-dark/50 bg-brand font-heading text-xs font-bold text-brand-ink">
                                    {(currentBrand?.name || 'SC').slice(0, 2).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                    <h3 className="truncate font-heading text-sm font-semibold text-foreground">
                                        {currentBrand?.name || t('Thương hiệu')}
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground">
                                        {t('Hồ sơ định vị · {count}/5 tiêu chí', {
                                            count: knowledgeFieldsCount,
                                        })}
                                    </p>
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {t('Đang áp dụng')}
                            </span>
                        </div>

                        <div className="divide-y divide-border text-xs">
                            <div className="space-y-1 p-5">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('Định vị & Sản phẩm')}
                                </div>
                                <p className="font-medium leading-relaxed text-foreground">
                                    {brandForm.products || t('Chưa cập nhật sản phẩm chủ lực')}
                                </p>
                                {brandForm.description && (
                                    <p className="text-muted-foreground">{brandForm.description}</p>
                                )}
                            </div>

                            <div className="space-y-1 p-5">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('Độc giả mục tiêu')}
                                </div>
                                <p className="leading-relaxed text-foreground">
                                    {brandForm.target_audience || t('Chưa cập nhật độc giả mục tiêu')}
                                </p>
                            </div>

                            <div className="space-y-2 p-5">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('Giọng điệu')}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {(brandForm.tone_of_voice || 'Chuyên nghiệp, Gần gũi')
                                        .split(/[,·+]/)
                                        .map((k) => k.trim())
                                        .filter(Boolean)
                                        .map((kw, i) => (
                                            <span
                                                key={i}
                                                className="rounded-lg border border-border bg-zinc-50 px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                                            >
                                                {kw}
                                            </span>
                                        ))}
                                </div>
                            </div>

                            <div className="space-y-1 p-5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        {t('Mục tiêu & Tần suất')}
                                    </span>
                                    <span className="font-mono text-[11px] text-muted-foreground">
                                        {brandForm.posting_frequency}
                                    </span>
                                </div>
                                <p className="leading-relaxed text-foreground">
                                    {brandForm.goals || t('Chưa thiết lập mục tiêu KPI')}
                                </p>
                            </div>

                            <div className="flex items-center justify-between p-5">
                                <span className="inline-flex items-center gap-2 text-muted-foreground">
                                    <ImageSquare size={15} />
                                    <span>
                                        {t('Thư viện tài nguyên')}:{' '}
                                        <strong className="text-foreground">{assets.length}</strong>
                                    </span>
                                </span>
                                <Link
                                    to="/media"
                                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                                >
                                    {t('Mở thư viện →')}
                                </Link>
                            </div>
                        </div>
                    </aside>
                </div>
            )}

            {/* ================================================================= */}
            {/* TAB 3: PHÂN BỔ & MỤC TIÊU (ULTRA-CLEAN EXECUTIVE ANALYTICS) */}
            {/* ================================================================= */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    {/* KPI Strip + 100% Target Bar */}
                    <section className="panel overflow-hidden bg-card">
                        <div className="grid grid-cols-2 divide-y divide-border lg:grid-cols-4 lg:divide-x lg:divide-y-0">
                            <div className="p-5">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('Tổng bài viết')}
                                </span>
                                <div className="mt-1 font-heading text-2xl font-bold tabular-nums text-foreground">
                                    {rows.total}
                                </div>
                            </div>
                            <div className="p-5">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('Trụ cột nội dung')}
                                </span>
                                <div className="mt-1 font-heading text-2xl font-bold tabular-nums text-foreground">
                                    {activePillarStats.length}
                                </div>
                            </div>
                            <div className="p-5">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('Cân bằng chiến lược')}
                                </span>
                                <div className="mt-1 font-heading text-2xl font-bold tabular-nums text-foreground">
                                    {balanceRate}%
                                </div>
                            </div>
                            <div className="p-5">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('Chưa phân loại')}
                                </span>
                                <div className="mt-1 font-heading text-2xl font-bold tabular-nums text-foreground">
                                    {unassignedPillarCount}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 border-t border-border bg-zinc-50/50 px-5 py-3.5">
                            <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-200/70">
                                {activePillarStats.map((pillar) => (
                                    <div
                                        key={pillar.id}
                                        className="h-full"
                                        style={{
                                            width: `${pillar.target_percentage || 25}%`,
                                            backgroundColor: pillar.color || '#18181b',
                                        }}
                                        title={`${pillar.name}: ${pillar.target_percentage}%`}
                                    />
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {activePillarStats.map((pillar) => (
                                    <span key={pillar.id} className="inline-flex items-center gap-1.5">
                                        <span
                                            className="h-2 w-2 rounded-full"
                                            style={{ backgroundColor: pillar.color || '#18181b' }}
                                        />
                                        <span className="font-medium text-foreground">{pillar.name}</span>
                                        <span className="tabular-nums">{pillar.target_percentage}%</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Clean Emoji-Free Inline Filter Strip */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <select
                            value={filters.range}
                            onChange={(e) => setFilters({ ...filters, range: e.target.value })}
                            className="h-9 cursor-pointer rounded-xl border border-border bg-card px-3 font-medium text-foreground focus:border-zinc-900 focus:outline-none"
                        >
                            <option value="all">{t('Tất cả thời gian')}</option>
                            <option value="past30">{t('30 ngày qua')}</option>
                            <option value="past90">{t('90 ngày qua')}</option>
                            <option value="next30">{t('30 ngày tới')}</option>
                        </select>

                        <select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="h-9 cursor-pointer rounded-xl border border-border bg-card px-3 font-medium text-foreground focus:border-zinc-900 focus:outline-none"
                        >
                            <option value="posts">{t('Bài nội dung riêng biệt')}</option>
                            {!desktop && <option value="jobs">{t('Lượt xuất bản')}</option>}
                        </select>

                        <select
                            value={filters.platform}
                            onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
                            className="h-9 cursor-pointer rounded-xl border border-border bg-card px-3 font-medium text-foreground focus:border-zinc-900 focus:outline-none"
                        >
                            <option value="all">{t('Tất cả nền tảng')}</option>
                            {PLATFORMS.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {PLATFORM_LABEL[p.value] || p.short || p.value}
                                </option>
                            ))}
                        </select>

                        {pillars.length > 0 && (
                            <select
                                value={filters.pillar_id}
                                onChange={(e) =>
                                    setFilters({ ...filters, pillar_id: e.target.value, angle_id: 'all' })
                                }
                                className="h-9 cursor-pointer rounded-xl border border-border bg-card px-3 font-medium text-foreground focus:border-zinc-900 focus:outline-none"
                            >
                                <option value="all">{t('Tất cả trụ cột')}</option>
                                {pillars.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        )}

                        {filteredAngles.length > 0 && (
                            <select
                                value={filters.angle_id}
                                onChange={(e) => setFilters({ ...filters, angle_id: e.target.value })}
                                className="h-9 cursor-pointer rounded-xl border border-border bg-card px-3 font-medium text-foreground focus:border-zinc-900 focus:outline-none"
                            >
                                <option value="all">{t('Tất cả góc khai thác')}</option>
                                {filteredAngles.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {loading ? (
                        <Skeleton className="h-[320px] rounded-2xl" />
                    ) : rows.total === 0 ? (
                        <EmptyState
                            icon={ChartBar}
                            title={t('Không có nội dung khớp bộ lọc')}
                            description={t('Điều chỉnh bộ lọc phía trên để xem phân bổ chiến lược.')}
                        />
                    ) : (
                        <div className="space-y-6">
                            {/* Clean Target vs Actual Rows */}
                            <section className="panel overflow-hidden bg-card">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                                    <div>
                                        <h2 className="font-heading text-base font-semibold text-foreground">
                                            {t('Đối sánh Mục tiêu & Thực tế')}
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            {t('Tỷ lệ thực tế đạt được so với mốc mục tiêu của từng trụ cột.')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isSimulated && (
                                            <button
                                                type="button"
                                                disabled={activating}
                                                onClick={handleActivateDefaultPillars}
                                                className="btn-skew min-h-8 cursor-pointer text-xs"
                                            >
                                                {activating ? t('Đang lưu…') : t('Dùng 4 trụ cột mẫu')}
                                            </button>
                                        )}
                                        <Link
                                            to="/strategy/pillars"
                                            className="inline-flex min-h-8 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-zinc-50"
                                        >
                                            <SlidersHorizontal size={13} />
                                            <span>{t('Quản lý trụ cột')}</span>
                                        </Link>
                                    </div>
                                </div>

                                <div className="divide-y divide-border">
                                    {activePillarStats.map((pillar) => {
                                        const diff = pillar.actual - (pillar.target_percentage || 0);
                                        const isBalanced = Math.abs(diff) <= 5;
                                        const isUnder = -diff > 5;
                                        return (
                                            <div
                                                key={pillar.id}
                                                className="flex flex-col gap-3 px-5 py-3.5 transition-colors hover:bg-zinc-50/60 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div className="min-w-0 flex-1 space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                            style={{ backgroundColor: pillar.color || '#18181b' }}
                                                        />
                                                        <span className="truncate text-sm font-medium text-foreground">
                                                            {pillar.name}
                                                        </span>
                                                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                                            {pillar.count} {t('bài')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    width: `${Math.min(100, pillar.actual)}%`,
                                                                    backgroundColor: pillar.color || '#18181b',
                                                                }}
                                                            />
                                                            {pillar.target_percentage > 0 && (
                                                                <span
                                                                    className="absolute bottom-0 top-0 w-0.5 bg-zinc-900"
                                                                    style={{
                                                                        left: `calc(${pillar.target_percentage}% - 1px)`,
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                        <span className="w-24 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                                                            <strong className="text-foreground">
                                                                {pillar.actual}%
                                                            </strong>{' '}
                                                            / {pillar.target_percentage || 0}%
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex shrink-0 items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                                                            isBalanced
                                                                ? 'bg-emerald-50 text-emerald-700'
                                                                : isUnder
                                                                  ? 'bg-rose-50 text-rose-700'
                                                                  : 'bg-amber-50 text-amber-800'
                                                        }`}
                                                    >
                                                        {isBalanced
                                                            ? t('Cân bằng')
                                                            : `${diff > 0 ? '+' : ''}${Math.round(diff)}%`}
                                                    </span>
                                                    <Link
                                                        to={isUnder ? '/create' : '/strategy/pillars'}
                                                        className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-zinc-50"
                                                    >
                                                        {isUnder ? t('+ Lên bài') : t('Sửa')}
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Dual Grid: Angles + Distribution Over Time */}
                            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                                <section className="panel space-y-4 bg-card p-5">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="font-heading text-sm font-semibold text-foreground">
                                            {t('Phân bổ theo Góc khai thác')}
                                        </h3>
                                        <Link
                                            to="/strategy/angles"
                                            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                                        >
                                            <span>{t('Quản lý góc')}</span>
                                            <ArrowSquareOut size={13} />
                                        </Link>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                        {activeAngleStats.map((angle) => (
                                            <div
                                                key={angle.id}
                                                className="space-y-1.5 rounded-xl border border-border bg-zinc-50/50 p-3.5"
                                            >
                                                <div className="truncate text-xs font-medium text-foreground">
                                                    {angle.name}
                                                </div>
                                                <div className="flex items-baseline justify-between font-mono text-xs tabular-nums">
                                                    <strong className="text-foreground">
                                                        {angle.count} {t('bài')}
                                                    </strong>
                                                    <span className="text-muted-foreground">
                                                        {angle.actual}%
                                                    </span>
                                                </div>
                                                <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200">
                                                    <div
                                                        className="h-full rounded-full bg-brand-dark"
                                                        style={{ width: `${Math.min(100, angle.actual)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <DistributionOverTime scope={scope} filters={filters} />
                            </div>

                            {/* Compact Unassigned Queue */}
                            {unassignedPillarCount === 0 ? (
                                <div className="panel flex items-center justify-between gap-3 bg-card px-5 py-3.5 text-xs">
                                    <span className="inline-flex items-center gap-2 font-medium text-foreground">
                                        <CheckCircle size={17} weight="fill" className="text-emerald-600" />
                                        <span>{t('100% bài viết đã được phân loại trụ cột chiến lược.')}</span>
                                    </span>
                                    <Link
                                        to="/posts"
                                        className="font-medium text-muted-foreground hover:text-foreground"
                                    >
                                        {t('Xem tất cả bài viết →')}
                                    </Link>
                                </div>
                            ) : (
                                <section className="panel overflow-hidden bg-card">
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                            <Tag size={15} weight="bold" />
                                            <span>
                                                {t('Bài viết chưa phân loại')} ({unassignedPillarCount})
                                            </span>
                                        </div>
                                        <Link
                                            to="/posts"
                                            className="text-xs font-medium text-muted-foreground hover:text-foreground"
                                        >
                                            {t('Xem tất cả →')}
                                        </Link>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {unassignedPosts.map((post) => (
                                            <div
                                                key={post.id}
                                                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs hover:bg-zinc-50/70"
                                            >
                                                <p className="min-w-0 flex-1 truncate font-medium text-foreground">
                                                    {formatPostSnippet(post.caption || post.title) ||
                                                        t('Bài viết chưa đặt tiêu đề')}
                                                </p>
                                                <div className="flex shrink-0 items-center gap-3">
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
                                                        className="h-8 cursor-pointer rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:border-zinc-900 focus:outline-none"
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
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
