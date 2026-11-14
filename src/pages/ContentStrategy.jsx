import LoadError from '@/components/common/load-error';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ChartBar,
    Target,
    CheckCircle,
    SlidersHorizontal,
    ArrowSquareOut,
    Sparkle,
    IdentificationCard,
    Tag,
    Compass,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StrategyFilters from '@/components/strategy/StrategyFilters';
import DistributionOverTime from '@/components/strategy/DistributionOverTime';
import AIContentStrategist from '@/components/strategy/AIContentStrategist';
import BrandKnowledgeBase from '@/components/strategy/BrandKnowledgeBase';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCalendarDate, percent } from '@/lib/format';

const RANGE_DAYS = { past30: -30, past90: -90, next30: 30 };

const DEFAULT_STRATEGY_PILLARS = [
    { id: 'pillar-edu', name: 'Kiến thức chuyên môn & Hướng dẫn', color: '#181818', target_percentage: 40, actual: 42, count: 5, description: 'Chia sẻ kiến thức, tips, tutorials và hướng dẫn chuyên sâu.' },
    { id: 'pillar-case', name: 'Case Study & Khách hàng thực tế', color: '#3f3f46', target_percentage: 25, actual: 25, count: 3, description: 'Câu chuyện thành công, feedback và trải nghiệm khách hàng.' },
    { id: 'pillar-feat', name: 'Giới thiệu Tính năng & Sản phẩm', color: '#71717a', target_percentage: 20, actual: 8, count: 1, description: 'Demo tính năng, cập nhật sản phẩm và giải pháp.' },
    { id: 'pillar-cul', name: 'Văn hóa & Đằng sau hậu trường', color: '#a1a1aa', target_percentage: 15, actual: 8, count: 1, description: 'Đội ngũ, giá trị cốt lõi và câu chuyện hậu trường.' },
];

const DEFAULT_STRATEGY_ANGLES = [
    { id: 'angle-1', name: 'How-to / Hướng dẫn từng bước', count: 4, actual: 33 },
    { id: 'angle-2', name: 'Mistake / Cảnh báo sai lầm', count: 3, actual: 25 },
    { id: 'angle-3', name: 'Storytelling / Kể chuyện thực tế', count: 2, actual: 17 },
    { id: 'angle-4', name: 'Review / Giới thiệu giải pháp', count: 1, actual: 8 },
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

export default function ContentStrategy() {
    const { t } = useTranslation();
    const { scope, brands, selectedBrandId, reload: reloadWorkspace } = useWorkspace();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Tabs: 'strategist' | 'knowledge' | 'analytics' (default: 'strategist')
    const [activeTab, setActiveTabState] = useState(searchParams.get('tab') || 'strategist');

    useEffect(() => {
        const tabFromUrl = searchParams.get('tab');
        if (tabFromUrl && ['strategist', 'knowledge', 'analytics'].includes(tabFromUrl)) {
            setActiveTabState(tabFromUrl);
        }
    }, [searchParams]);

    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('tab', tab);
            return next;
        }, { replace: true });
    };

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [filters, setFilters] = useState({
        range: 'all',
        platform: 'all',
        status: 'all',
        pillar_id: 'all',
        angle_id: 'all',
    });
    const [unit, setUnit] = useState('posts');
    const [pillars, setPillars] = useState([]);
    const [angles, setAngles] = useState([]);
    const [assets, setAssets] = useState([]);
    const [rows, setRows] = useState({ pillar: [], angle: [], total: 0 });
    const [unassignedPosts, setUnassignedPosts] = useState([]);
    const [assigningPostId, setAssigningPostId] = useState(null);

    const currentBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];

    const loadAssets = useCallback(async () => {
        if (!currentBrand?.id) return;
        try {
            const [mediaRes, autopilotRes] = await Promise.allSettled([
                appClient.entities.MediaAsset.filter({ brand_id: currentBrand.id }, { limit: 200 }),
                appClient.autopilot.call('list', { brand_id: currentBrand.id }),
            ]);

            const mediaItems = mediaRes.status === 'fulfilled' ? mediaRes.value?.items || [] : [];
            const autopilotItems = autopilotRes.status === 'fulfilled'
                ? (autopilotRes.value?.assets || []).map((a) => ({
                    id: a.id,
                    name: a.name,
                    file_url: a.file_url || (a.external_id ? `https://drive.google.com/thumbnail?id=${a.external_id}&sz=w600` : ''),
                    notes: [a.analysis?.summary, ...(a.analysis?.tags || [])].filter(Boolean).join(' · '),
                    is_autopilot: true,
                }))
                : [];

            setAssets([...mediaItems, ...autopilotItems]);
        } catch {
            // Keep existing assets
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
            setPillars(pillarList.items);
            setAngles(angleList.items);

            let platformAccounts = null;
            if (filters.platform !== 'all') {
                const accounts = await appClient.entities.SocialAccount.filter(
                    { ...scope, platform: filters.platform },
                    { limit: 300, fields: ['id'] }
                );
                platformAccounts = accounts.items.map((a) => a.id);
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
                const JOB_STATUS_FOR_POST = {
                    scheduled: 'pending',
                    processing: 'processing',
                    published: 'published',
                    failed: 'failed',
                    partially_published: 'blocked',
                    cancelled: 'cancelled',
                };
                if (filters.status !== 'all') {
                    const mapped = JOB_STATUS_FOR_POST[filters.status];
                    if (!mapped) {
                        setRows({ pillar: [], angle: [], total: 0 });
                        setLoading(false);
                        return;
                    }
                    jobQuery.status = mapped;
                }
                if (filters.platform !== 'all') jobQuery.platform = filters.platform;
                const jobAgg = await appClient.entities.PublishJob.aggregate({
                    query: jobQuery,
                    groupBy: 'post_id',
                });
                const postIds = jobAgg.rows.map((row) => row.post_id);
                if (!postIds.length) {
                    setRows({ pillar: [], angle: [], total: 0 });
                    setLoading(false);
                    return;
                }
                const posts = await appClient.entities.Post.filter(
                    {
                        ...scope,
                        id: { $in: postIds },
                        ...(filters.pillar_id === 'all' ? {} : { pillar_id: filters.pillar_id }),
                        ...(filters.angle_id === 'all' ? {} : { angle_id: filters.angle_id }),
                    },
                    { limit: 500, fields: ['pillar_id', 'angle_id'] }
                );
                const byId = Object.fromEntries(posts.items.map((p) => [p.id, p]));
                const pillarTally = {};
                const angleTally = {};
                let sum = 0;
                jobAgg.rows.forEach((row) => {
                    const post = byId[row.post_id];
                    if (!post) return;
                    sum += row.count;
                    pillarTally[post.pillar_id] = (pillarTally[post.pillar_id] || 0) + row.count;
                    angleTally[post.angle_id] = (angleTally[post.angle_id] || 0) + row.count;
                });
                pillarRows = Object.entries(pillarTally).map(([key, count]) => ({
                    pillar_id: key,
                    count,
                }));
                angleRows = Object.entries(angleTally).map(([key, count]) => ({
                    angle_id: key,
                    count,
                }));
                total = sum;
            }

            setRows({ pillar: pillarRows, angle: angleRows, total });

            // Fetch sample unassigned posts for Action Hub
            try {
                const sampleRes = await appClient.entities.Post.filter(
                    { ...scope },
                    { limit: 30, sort: '-created_at' }
                );
                const unassignedItems = (sampleRes.items || []).filter((p) => !p.pillar_id);
                setUnassignedPosts(unassignedItems.slice(0, 4));
            } catch {
                setUnassignedPosts([]);
            }
        } catch (error) {
            setLoadError(error.message);
        } finally {
            setLoading(false);
        }
    }, [scope, filters, unit]);

    const handleAssignPillar = async (postId, pillarId) => {
        if (!pillarId || pillarId === 'none') return;
        setAssigningPostId(postId);
        try {
            await appClient.entities.Post.update(postId, { pillar_id: pillarId });
            toast({ title: t('Đã gán trụ cột thành công!') });
            await load();
        } catch (e) {
            toast({ title: t('Lỗi khi gán trụ cột'), description: e.message, variant: 'destructive' });
        } finally {
            setAssigningPostId(null);
        }
    };

    useEffect(() => {
        load();
        loadAssets();
    }, [load, loadAssets]);

    const pillarStats = pillars.map((pillar) => {
        const count = rows.pillar.find((row) => row.pillar_id === pillar.id)?.count || 0;
        return { ...pillar, count, actual: percent(count, rows.total) };
    });

    const angleStats = angles.map((angle) => {
        const count = rows.angle.find((row) => row.angle_id === angle.id)?.count || 0;
        return { ...angle, count, actual: percent(count, rows.total) };
    });

    const unassignedPillarRow = rows.pillar.find((row) => !row.pillar_id);
    const unassignedPillarCount = unassignedPillarRow?.count || 0;

    const isSimulated = pillars.length === 0;
    const activePillarStats = isSimulated ? DEFAULT_STRATEGY_PILLARS : pillarStats;
    const activeAngleStats = (angles.length > 0 && angleStats.some(a => a.count > 0)) ? angleStats : DEFAULT_STRATEGY_ANGLES;

    const [activating, setActivating] = useState(false);
    const handleActivateDefaultPillars = async () => {
        if (!currentBrand?.id) return;
        setActivating(true);
        try {
            const createdPillars = [];
            for (const p of DEFAULT_STRATEGY_PILLARS) {
                const created = await appClient.entities.ContentPillar.create({
                    name: p.name,
                    color: p.color,
                    target_percentage: p.target_percentage,
                    description: p.description,
                    brand_id: currentBrand.id,
                    status: 'active',
                    is_demo: scope.is_demo || false,
                });
                createdPillars.push(created);
            }

            // Distribute sample unassigned posts
            const allPosts = await appClient.entities.Post.filter({ ...scope }, { limit: 50 });
            const unassignedItems = (allPosts.items || []).filter((item) => !item.pillar_id);
            for (let i = 0; i < unassignedItems.length; i++) {
                const targetPillar = createdPillars[i % createdPillars.length];
                await appClient.entities.Post.update(unassignedItems[i].id, { pillar_id: targetPillar.id });
            }

            toast({ title: t('Đã kích hoạt thành công 4 trụ cột chiến lược!') });
            await load();
        } catch (e) {
            toast({ title: t('Lỗi kích hoạt trụ cột'), description: e.message, variant: 'destructive' });
        } finally {
            setActivating(false);
        }
    };

    const overrepresented = activePillarStats.filter(
        (p) => p.actual - (p.target_percentage || 0) > 5
    );
    const underrepresented = activePillarStats.filter(
        (p) => (p.target_percentage || 0) - p.actual > 5
    );
    const balancedCount = activePillarStats.filter(
        (p) => Math.abs(p.actual - (p.target_percentage || 0)) <= 5
    ).length;
    const balanceRate = Math.round((balancedCount / activePillarStats.length) * 100);

    if (loadError) return <LoadError message={loadError} onRetry={load} />;

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('Chiến lược nội dung (Content Strategy)')}
                description={t(
                    'AI Content Strategist tự động đề xuất content pillars, angles, chủ đề và lịch 30 ngày dựa trên Brand Context & Asset Library.'
                )}
                actions={
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs font-medium text-neutral-700 shadow-2xs">
                            {t('Thương hiệu')}: <strong className="text-neutral-900">{currentBrand?.name || t('Brand')}</strong> · {assets.length} {t('assets sẵn sàng')}
                        </span>
                    </div>
                }
            />

            {/* Strategic Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-neutral-200 pb-3 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveTab('strategist')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all whitespace-nowrap ${activeTab === 'strategist'
                        ? 'bg-foreground text-background shadow-xs'
                        : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                        }`}
                >
                    <Sparkle size={16} weight={activeTab === 'strategist' ? 'fill' : 'regular'} />
                    <span>{t('AI Content Strategist (Phase 2)')}</span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${activeTab === 'strategist' ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-200 text-neutral-800'}`}>
                        AI
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('knowledge')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all whitespace-nowrap ${activeTab === 'knowledge'
                        ? 'bg-foreground text-background shadow-xs'
                        : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                        }`}
                >
                    <IdentificationCard size={16} weight={activeTab === 'knowledge' ? 'bold' : 'regular'} />
                    <span>{t('Brand Knowledge Base')}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('analytics')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all whitespace-nowrap ${activeTab === 'analytics'
                        ? 'bg-foreground text-background shadow-xs'
                        : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                        }`}
                >
                    <ChartBar size={16} weight={activeTab === 'analytics' ? 'bold' : 'regular'} />
                    <span>{t('Phân bổ & Mục tiêu (Analytics)')}</span>
                </button>
            </div>

            {/* TAB 1: AI Content Strategist (Phase 2 Flagship) */}
            {activeTab === 'strategist' && (
                <AIContentStrategist
                    brand={currentBrand}
                    pillars={pillars}
                    angles={angles}
                    assets={assets}
                    appClient={appClient}
                    onOpenKnowledge={() => setActiveTab('knowledge')}
                    onPlanApplied={(posts) => {
                        load();
                        toast({
                            title: t('Đã áp dụng thành công {count} bài viết!', { count: posts.length }),
                            description: t('Xem các bài nháp đã tạo trên Lịch nội dung.'),
                        });
                        navigate('/calendar');
                    }}
                    onRefreshAssets={loadAssets}
                />
            )}

            {/* TAB 2: Brand Knowledge Base */}
            {activeTab === 'knowledge' && (
                <BrandKnowledgeBase
                    brand={currentBrand}
                    assetsCount={assets.length}
                    assets={assets}
                    onUpdated={() => {
                        reloadWorkspace();
                        loadAssets();
                    }}
                />
            )}

            {/* TAB 3: Strategy Analytics & Mix */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    {/* OPTION 1 · FULL-WIDTH EXECUTIVE FLOW (BÁO CÁO PHÂN TẦNG TOÀN MÀN HÌNH) */}

                    {/* BLOCK 1: Top KPI Panel with Stacked 100% Strategy Bar */}
                    <div className="p-5 bg-white border border-neutral-200 rounded-2xl shadow-2xs space-y-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                                    {t('Tổng bài viết')}
                                </span>
                                <div className="text-2xl font-bold text-neutral-900 font-heading mt-1">
                                    {rows.total}
                                </div>
                                <span className="text-xs text-neutral-500">
                                    {unit === 'posts' ? t('Bài nội dung riêng biệt') : t('Publishing jobs')}
                                </span>
                            </div>

                            <div>
                                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                                    {t('Trụ cột nội dung')}
                                </span>
                                <div className="text-2xl font-bold text-neutral-900 font-heading mt-1">
                                    {activePillarStats.length} {t('chủ đề')}
                                </div>
                                <span className="text-xs text-neutral-500">
                                    {pillars.length > 0 ? t('{count} đã lưu', { count: pillars.length }) : t('4 trụ cột chuẩn')}
                                </span>
                            </div>

                            <div>
                                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                                    {t('Cân bằng chiến lược')}
                                </span>
                                <div className="text-2xl font-bold text-neutral-900 font-heading mt-1">
                                    {balanceRate}%
                                </div>
                                <span className="text-xs text-neutral-700 font-medium">
                                    {overrepresented.length + underrepresented.length === 0
                                        ? t('Tất cả trụ cột cân bằng')
                                        : t('{count} trụ cột lệch mục tiêu', { count: overrepresented.length + underrepresented.length })
                                    }
                                </span>
                            </div>

                            <div>
                                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                                    {t('Cần phân loại')}
                                </span>
                                <div className="text-2xl font-bold text-neutral-900 font-heading mt-1">
                                    {unassignedPillarCount} {t('bài')}
                                </div>
                                <span className="text-xs text-neutral-500">
                                    {unassignedPillarCount > 0
                                        ? t('{percent}% chưa gán pillar', { percent: percent(unassignedPillarCount, rows.total) })
                                        : t('100% đã được gán')
                                    }
                                </span>
                            </div>
                        </div>

                        {/* Full-Width Stacked 100% Strategy Bar */}
                        <div className="pt-4 border-t border-neutral-100 space-y-2">
                            <div className="flex items-center justify-between text-xs text-neutral-500">
                                <span className="font-semibold text-neutral-800">
                                    {t('Phân bổ tổng thể 100% mục tiêu chiến lược')}
                                </span>
                                <span>{activePillarStats.length} {t('phân khúc chủ đề')}</span>
                            </div>

                            <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden flex border border-neutral-200/80">
                                {activePillarStats.map((pillar) => (
                                    <div
                                        key={pillar.id}
                                        className="h-full transition-all duration-500"
                                        style={{
                                            width: `${pillar.target_percentage || 25}%`,
                                            backgroundColor: pillar.color || '#181818',
                                        }}
                                        title={`${pillar.name}: ${pillar.target_percentage}%`}
                                    />
                                ))}
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-600 pt-1">
                                {activePillarStats.map((pillar) => (
                                    <span key={pillar.id} className="flex items-center gap-1.5">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: pillar.color || '#181818' }}
                                        />
                                        <span className="font-medium text-neutral-800">{pillar.name}</span>
                                        <span className="text-neutral-500">({pillar.target_percentage}%)</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Unified Filter Bar (Compact 1-Row Monochrome) */}
                    <StrategyFilters
                        filters={filters}
                        setFilters={setFilters}
                        pillars={pillars}
                        angles={angles}
                        unit={unit}
                        setUnit={setUnit}
                        compact={true}
                    />

                    {loading ? (
                        <div className="grid gap-5 xl:grid-cols-2">
                            <Skeleton className="h-[360px] rounded-2xl" />
                            <Skeleton className="h-[360px] rounded-2xl" />
                        </div>
                    ) : rows.total === 0 ? (
                        <EmptyState
                            icon={ChartBar}
                            title={t('No content matches these filters')}
                            description={t(
                                'Adjust the filters above, or create posts with a pillar and angle assigned to see distribution here.'
                            )}
                        />
                    ) : (
                        <div className="space-y-6">
                            {/* BLOCK 2: Full-Width Data-Dense Target vs Actual Table */}
                            <div className="p-5 bg-white border border-neutral-200 rounded-2xl shadow-2xs space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900">
                                                <Target size={18} weight="bold" />
                                            </span>
                                            <h2 className="text-[15px] font-semibold text-neutral-900">
                                                {t('Bảng đối sánh Mục tiêu vs Thực tế từng Trụ cột')}
                                            </h2>
                                        </div>
                                        <p className="text-xs text-neutral-500 mt-1">
                                            {t('So sánh chi tiết tỷ lệ % thực tế đạt được so với mục tiêu đề ra.')}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {isSimulated && (
                                            <button
                                                type="button"
                                                disabled={activating}
                                                onClick={handleActivateDefaultPillars}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-medium shadow-xs transition-all"
                                            >
                                                <Sparkle size={13} weight="fill" />
                                                <span>{activating ? t('Đang lưu...') : t('⚡ Áp dụng 4 trụ cột này')}</span>
                                            </button>
                                        )}
                                        <Link
                                            to="/strategy/pillars"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-800 transition-all"
                                        >
                                            <SlidersHorizontal size={14} />
                                            <span>{t('Manage pillars')}</span>
                                            <ArrowSquareOut size={13} className="text-neutral-400" />
                                        </Link>
                                    </div>
                                </div>

                                {/* Full-Width Data Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200">
                                            <tr>
                                                <th className="p-3 font-semibold">{t('Tên Trụ cột')}</th>
                                                <th className="p-3 font-semibold">{t('Mục tiêu %')}</th>
                                                <th className="p-3 font-semibold">{t('Thực tế %')}</th>
                                                <th className="p-3 font-semibold w-52">{t('Thanh so sánh')}</th>
                                                <th className="p-3 font-semibold">{t('Số bài')}</th>
                                                <th className="p-3 font-semibold">{t('Trạng thái')}</th>
                                                <th className="p-3 font-semibold text-right">{t('Thao tác')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100">
                                            {activePillarStats.map((pillar) => {
                                                const diff = pillar.actual - (pillar.target_percentage || 0);
                                                const isBalanced = Math.abs(diff) <= 5;
                                                const isOver = diff > 5;
                                                const isUnder = -diff > 5;

                                                return (
                                                    <tr key={pillar.id} className="hover:bg-neutral-50/50 transition-colors">
                                                        <td className="p-3 font-medium text-neutral-900">
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                                                    style={{ backgroundColor: pillar.color || '#181818' }}
                                                                />
                                                                <span className="font-semibold text-neutral-900">{pillar.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3 font-mono font-medium text-neutral-600">
                                                            {pillar.target_percentage || 0}%
                                                        </td>
                                                        <td className="p-3 font-mono font-bold text-neutral-900">
                                                            {pillar.actual}%
                                                        </td>
                                                        <td className="p-3 w-52">
                                                            <div className="relative h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden border border-neutral-200/60">
                                                                <div
                                                                    className="h-full rounded-full transition-all duration-500"
                                                                    style={{
                                                                        width: `${Math.min(100, Math.max(0, pillar.actual))}%`,
                                                                        backgroundColor: pillar.color || '#181818',
                                                                    }}
                                                                />
                                                                {pillar.target_percentage > 0 && (
                                                                    <span
                                                                        className="absolute top-0 bottom-0 w-1 bg-neutral-900 shadow-xs z-10"
                                                                        title={`Mục tiêu: ${pillar.target_percentage}%`}
                                                                        style={{ left: `calc(${pillar.target_percentage}% - 2px)` }}
                                                                    />
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 font-mono font-semibold text-neutral-800">
                                                            {pillar.count} {t('posts')}
                                                        </td>
                                                        <td className="p-3">
                                                            {isBalanced && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-900 text-white font-medium text-[11px] shadow-2xs">
                                                                    ✓ {t('Balanced')}
                                                                </span>
                                                            )}
                                                            {isOver && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-900 border border-neutral-300 font-medium text-[11px]">
                                                                    +{Math.round(diff)}% {t('over target')}
                                                                </span>
                                                            )}
                                                            {isUnder && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-900 border border-neutral-300 font-bold text-[11px]">
                                                                    {Math.round(diff)}% {t('under target')}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            {isUnder ? (
                                                                <Link
                                                                    to="/create"
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 font-medium text-[11px] transition-all"
                                                                >
                                                                    <span>+ {t('Lên bài')}</span>
                                                                </Link>
                                                            ) : (
                                                                <Link
                                                                    to="/strategy/pillars"
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 font-medium text-[11px] transition-all"
                                                                >
                                                                    <span>{t('Sửa')}</span>
                                                                </Link>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* BLOCK 3: Dual Grid 50/50 (Angles Matrix + Weekly Cadence) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                {/* Left Half: Angles Breakdown */}
                                <div className="p-5 bg-white border border-neutral-200 rounded-2xl shadow-2xs space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900">
                                                <Compass size={18} weight="bold" />
                                            </span>
                                            <div>
                                                <h3 className="text-[15px] font-semibold text-neutral-900">
                                                    {t('Phân bổ theo Góc tiếp cận (Content Angles)')}
                                                </h3>
                                                <p className="text-xs text-neutral-500">
                                                    {t('Đa dạng hóa góc độ truyền tải để tối ưu tương tác')}
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            to="/strategy/angles"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-800 transition-all"
                                        >
                                            <SlidersHorizontal size={14} />
                                            <span>{t('Quản lý góc')}</span>
                                            <ArrowSquareOut size={13} className="text-neutral-400" />
                                        </Link>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        {activeAngleStats.map((angle) => (
                                            <div key={angle.id} className="p-3.5 bg-neutral-50/70 border border-neutral-200 rounded-xl space-y-2">
                                                <div className="text-xs font-medium text-neutral-900 truncate" title={angle.name}>
                                                    {angle.name}
                                                </div>
                                                <div className="flex items-baseline justify-between text-xs">
                                                    <span className="text-base font-bold text-neutral-900 font-heading">
                                                        {angle.count} <span className="text-[11px] font-normal text-neutral-500">{t('bài')}</span>
                                                    </span>
                                                    <span className="font-semibold text-neutral-600 text-[11px]">{angle.actual}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-neutral-900 rounded-full" style={{ width: `${Math.min(100, angle.actual)}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right Half: Distribution Over Time */}
                                <DistributionOverTime scope={scope} filters={filters} />
                            </div>

                            {/* BLOCK 4: Bulk Tagging Table for Unassigned Posts */}
                            <div className="p-5 bg-white border border-neutral-200 rounded-2xl shadow-2xs space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900">
                                            <Tag size={16} weight="bold" />
                                        </span>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-[15px] font-semibold text-neutral-900">
                                                    {t('Khay xử lý bài viết chưa phân loại (Unassigned Queue)')}
                                                </h3>
                                                <span className="rounded-md bg-neutral-900 text-white px-2 py-0.5 text-xs font-semibold">
                                                    {unassignedPillarCount} {t('bài')}
                                                </span>
                                            </div>
                                            <p className="text-xs text-neutral-500 mt-0.5">
                                                {t('Gán nhanh trụ cột cho các bài viết để hoàn thiện số liệu phân bổ chiến lược.')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Link
                                            to="/posts"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-800 transition-all"
                                        >
                                            <span>{t('Xem danh sách tất cả')}</span>
                                            <ArrowSquareOut size={13} className="text-neutral-400" />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('strategist')}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-medium shadow-xs transition-all"
                                        >
                                            <Sparkle size={13} weight="fill" />
                                            <span>{t('⚡ AI tự động phân bổ')}</span>
                                        </button>
                                    </div>
                                </div>

                                {unassignedPillarCount === 0 ? (
                                    <div className="py-6 text-center flex flex-col items-center justify-center space-y-1.5">
                                        <CheckCircle size={28} className="text-neutral-900 mb-1" weight="regular" />
                                        <p className="text-xs font-medium text-neutral-900">{t('Tất cả bài viết đã được phân loại!')}</p>
                                        <p className="text-[11px] text-neutral-500 max-w-xs">{t('100% nội dung đã được gán trụ cột chiến lược.')}</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
                                        {unassignedPosts.map((post) => (
                                            <div
                                                key={post.id}
                                                className="p-3.5 bg-white hover:bg-neutral-50/70 flex flex-wrap items-center justify-between gap-3 text-xs transition-colors"
                                            >
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
                                                    <p className="font-medium text-neutral-900 truncate">
                                                        {formatPostSnippet(post.caption || post.title) || t('Bài viết không tiêu đề')}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-[11px] text-neutral-500">
                                                        {post.scheduled_at ? formatCalendarDate(post.scheduled_at) : t('Bản nháp')}
                                                    </span>

                                                    <select
                                                        disabled={assigningPostId === post.id}
                                                        onChange={(e) => handleAssignPillar(post.id, e.target.value)}
                                                        defaultValue="none"
                                                        className="text-xs h-7.5 px-2.5 rounded-lg border border-neutral-300 bg-white font-medium text-neutral-900 cursor-pointer hover:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                                                    >
                                                        <option value="none" disabled>+ {t('Gán trụ cột...')}</option>
                                                        {activePillarStats.map((p) => (
                                                            <option key={p.id} value={p.id}>{p.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
