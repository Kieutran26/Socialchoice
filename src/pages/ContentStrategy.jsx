import LoadError from '@/components/common/load-error';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ChartBar,
    Stack,
    TreeStructure,
    Target,
    TrendUp,
    TrendDown,
    CheckCircle,
    Article,
    Plus,
    SlidersHorizontal,
    ArrowSquareOut,
    Info,
    Sparkle,
    IdentificationCard,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatCard from '@/components/common/StatCard';
import DistributionBar from '@/components/strategy/DistributionBar';
import StrategyFilters from '@/components/strategy/StrategyFilters';
import DistributionOverTime from '@/components/strategy/DistributionOverTime';
import AIContentStrategist from '@/components/strategy/AIContentStrategist';
import BrandKnowledgeBase from '@/components/strategy/BrandKnowledgeBase';
import { Skeleton } from '@/components/ui/skeleton';
import { percent } from '@/lib/format';

const RANGE_DAYS = { past30: -30, past90: -90, next30: 30 };

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

    // Tabs: 'strategist' | 'knowledge' | 'analytics'
    const [activeTab, setActiveTab] = useState('strategist');

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

    const currentBrand = brands.find((b) => b.id === selectedBrandId) || null;
    const [assetError, setAssetError] = useState('');
    const assetVersion = useRef(0);

    const loadAssets = useCallback(async () => {
        const version = ++assetVersion.current;
        setAssets([]); setAssetError('');
        if (!currentBrand?.id) return;
        try {
            const media = await appClient.entities.MediaAsset.filter({brand_id:currentBrand.id,is_demo:!!currentBrand.is_demo},{limit:200});
            const catalog = [];
            let offset = 0;
            if (!currentBrand.is_demo) do {
                const page = await appClient.autopilot.call('list',{brand_id:currentBrand.id,offset});
                const connected = new Set(page.sources.filter(s=>s.status==='connected').map(s=>s.id));
                catalog.push(...page.assets.filter(a=>connected.has(a.source_id)&&a.size<=3*1024*1024&&a.availability==='available'&&a.analysis_status==='analyzed'&&a.review==='approved'&&['image/png','image/jpeg','image/webp'].includes(a.mime)).map(a=>({
                    id:a.id,brand_id:a.brand_id,name:a.name,file_url:'',file_type:'image',notes:[a.analysis?.summary,...(a.analysis?.tags||[])].filter(Boolean).join(' · '),is_autopilot:true,
                })));
                offset = page.nextOffset;
            } while(offset!==null);
            if(version===assetVersion.current) setAssets([...media.items.filter(a=>a.file_type==='image'&&a.storage_id),...catalog]);
        } catch(error) { if(version===assetVersion.current) setAssetError(error.message); }
    }, [currentBrand?.id, currentBrand?.is_demo]);

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
        } catch (error) {
            setLoadError(error.message);
        } finally {
            setLoading(false);
        }
    }, [scope, filters, unit]);

    useEffect(() => {
        load();
        loadAssets();
    }, [load, loadAssets]);

    const pillarStats = pillars.map((pillar) => {
        const count = rows.pillar.find((row) => row.pillar_id === pillar.id)?.count || 0;
        return { ...pillar, count, actual: percent(count, rows.total) };
    });

    const unassignedPillarRow = rows.pillar.find((row) => !row.pillar_id);
    const unassignedPillarCount = unassignedPillarRow?.count || 0;

    const overrepresented = pillarStats.filter(
        (p) => p.actual - (p.target_percentage || 0) > 5
    );
    const underrepresented = pillarStats.filter(
        (p) => (p.target_percentage || 0) - p.actual > 5
    );
    const balancedCount = pillarStats.filter(
        (p) => Math.abs(p.actual - (p.target_percentage || 0)) <= 5
    ).length;
    const balanceRate =
        pillars.length > 0 ? Math.round((balancedCount / pillars.length) * 100) : 100;

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
                        <span className="label-xs rounded-xl bg-muted/60 px-3 py-1.5 font-medium text-muted-foreground border border-border/60">
                            {currentBrand?.name || t('Brand')} · <strong className="text-foreground">{assets.length}</strong> {t('assets')}
                        </span>
                    </div>
                }
            />

            {/* Strategic Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-border/80 pb-3 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveTab('strategist')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                        activeTab === 'strategist'
                            ? 'bg-foreground text-background shadow-xs'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                >
                    <Sparkle size={16} weight={activeTab === 'strategist' ? 'fill' : 'regular'} className={activeTab === 'strategist' ? 'text-brand' : ''} />
                    <span>{t('AI Content Strategist (Phase 2)')}</span>
                    <span className="rounded-md bg-brand/20 text-brand-ink px-1.5 py-0.2 text-[10px] font-bold">
                        AI
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('knowledge')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                        activeTab === 'knowledge'
                            ? 'bg-foreground text-background shadow-xs'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                >
                    <IdentificationCard size={16} weight={activeTab === 'knowledge' ? 'bold' : 'regular'} />
                    <span>{t('Brand Knowledge Base')}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('analytics')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                        activeTab === 'analytics'
                            ? 'bg-foreground text-background shadow-xs'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                >
                    <ChartBar size={16} weight={activeTab === 'analytics' ? 'bold' : 'regular'} />
                    <span>{t('Phân bổ & Mục tiêu (Analytics)')}</span>
                </button>
            </div>

            {/* TAB 1: AI Content Strategist (Phase 2 Flagship) */}
            {activeTab === 'strategist' && !currentBrand && <EmptyState icon={IdentificationCard} title={t('Choose a brand first')} description={t('Select one brand in the sidebar to create its content plan.')} />}
            {assetError && <p role="alert" className="panel p-4 text-dangerFg">{t(assetError)}</p>}
            {activeTab === 'strategist' && currentBrand && (
                <AIContentStrategist
                    key={currentBrand.id + JSON.stringify([currentBrand.products,currentBrand.target_audience,currentBrand.tone_of_voice,currentBrand.goals,currentBrand.posting_frequency,currentBrand.timezone])}
                    brand={currentBrand}
                    pillars={pillars}
                    angles={angles}
                    assets={assets}
                    appClient={appClient}
                    onPlanApplied={(posts) => {
                        load();
                        toast({
                            title: t('Đã áp dụng thành công {count} bài viết!', { count: posts.length }),
                            description: t('Xem các bài nháp đã tạo trên Lịch nội dung.'),
                        });
                        navigate('/calendar');
                    }}
                />
            )}

            {/* TAB 2: Brand Knowledge Base */}
            {activeTab === 'knowledge' && !currentBrand && <EmptyState icon={IdentificationCard} title={t('Choose a brand first')} description={t('Select one brand in the sidebar to edit its knowledge base.')} />}
            {activeTab === 'knowledge' && currentBrand && (
                <BrandKnowledgeBase
                    brand={currentBrand}
                    assetsCount={assets.length}
                    onUpdated={() => {
                        reloadWorkspace();
                        loadAssets();
                    }}
                />
            )}

            {/* TAB 3: Strategy Analytics & Mix */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    {/* KPI Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        <StatCard
                            label={t('Total content')}
                            value={rows.total}
                            hint={
                                unit === 'posts'
                                    ? t('Unique content posts')
                                    : t('Publishing jobs')
                            }
                            icon={Article}
                            iconBg="bg-blue-50"
                            iconColor="text-blue-600"
                        />
                        <StatCard
                            label={t('Content Pillars')}
                            value={pillars.length}
                            hint={
                                pillars.length
                                    ? t('{count} configured', { count: pillars.length })
                                    : t('Not set up')
                            }
                            icon={Stack}
                            iconBg="bg-amber-50"
                            iconColor="text-amber-600"
                        />
                        <StatCard
                            label={t('Content Angles')}
                            value={angles.length}
                            hint={
                                angles.length
                                    ? t('{count} configured', { count: angles.length })
                                    : t('Not set up')
                            }
                            icon={TreeStructure}
                            iconBg="bg-purple-50"
                            iconColor="text-purple-600"
                        />
                        <StatCard
                            label={t('Target alignment')}
                            value={pillars.length > 0 ? `${balanceRate}%` : '—'}
                            hint={
                                pillars.length > 0
                                    ? overrepresented.length + underrepresented.length === 0
                                        ? t('All pillars balanced')
                                        : t('{count} pillars off target', {
                                              count: overrepresented.length + underrepresented.length,
                                          })
                                    : t('Create pillars to set targets')
                            }
                            icon={Target}
                            iconBg="bg-emerald-50"
                            iconColor="text-emerald-600"
                        />
                    </div>

                    {/* Unified Filter Bar */}
                    <StrategyFilters
                        filters={filters}
                        setFilters={setFilters}
                        pillars={pillars}
                        angles={angles}
                        unit={unit}
                        setUnit={setUnit}
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
                            {/* Section 1: Pillar targets vs actual mix */}
                            <div className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs">
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                                <Target size={18} weight="duotone" />
                                            </span>
                                            <h2 className="text-[15px] font-semibold text-foreground">
                                                {t('Pillar targets vs actual mix')}
                                            </h2>
                                        </div>
                                        <p className="label-xs text-muted-foreground mt-1.5">
                                            {t(
                                                'The marker on each bar is the target share you defined for that pillar.'
                                            )}
                                        </p>
                                    </div>
                                    <Link
                                        to="/strategy/pillars"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-background hover:bg-muted/30 text-xs font-medium text-foreground transition-all"
                                    >
                                        <SlidersHorizontal size={14} />
                                        <span>{t('Manage pillars')}</span>
                                        <ArrowSquareOut size={13} className="text-muted-foreground" />
                                    </Link>
                                </div>

                                {pillars.length === 0 ? (
                                    <div className="py-10 text-center flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/10 p-6">
                                        <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                                            <Stack size={24} weight="duotone" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-foreground">
                                            {t('No pillars set up yet')}
                                        </h3>
                                        <p className="text-xs text-muted-foreground max-w-md mt-1 mb-4">
                                            {t(
                                                'Set up content pillars and target percentages to track your topic distribution effectively.'
                                            )}
                                        </p>
                                        <Link
                                            to="/strategy/pillars"
                                            className="btn-skew inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold"
                                        >
                                            <Plus size={15} weight="bold" />
                                            <span>{t('Create first pillar')}</span>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/60">
                                        {pillarStats.map((pillar) => (
                                            <DistributionBar
                                                key={pillar.id}
                                                label={pillar.name}
                                                color={pillar.color}
                                                target={pillar.target_percentage || 0}
                                                actual={pillar.actual}
                                                count={pillar.count}
                                            />
                                        ))}
                                    </div>
                                )}

                                {unassignedPillarCount > 0 && (
                                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
                                        <Info size={15} className="text-amber-500 shrink-0" />
                                        <span>
                                            {unassignedPillarCount} {t('posts')} {t('Unassigned')} ({percent(unassignedPillarCount, rows.total)}%)
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Section 2: 3 Cards Grid */}
                            <div className="grid gap-5 xl:grid-cols-3">
                                <DistributionOverTime scope={scope} filters={filters} />

                                {/* Overrepresented pillars card */}
                                <div className="panel p-5 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                                    <TrendUp size={16} weight="duotone" />
                                                </span>
                                                <h2 className="text-[15px] font-semibold text-foreground">
                                                    {t('Overrepresented pillars')}
                                                </h2>
                                            </div>
                                            {overrepresented.length > 0 && (
                                                <span className="rounded-lg bg-amber-50 border border-amber-200/60 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                                    {overrepresented.length}
                                                </span>
                                            )}
                                        </div>
                                        <p className="label-xs text-muted-foreground mt-1 mb-4">
                                            {t('Pillars receiving more than +5% above their target share.')}
                                        </p>

                                        {overrepresented.length === 0 ? (
                                            <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center">
                                                <CheckCircle size={28} className="text-emerald-500 mb-1" weight="duotone" />
                                                <span>{t('No pillars are overrepresented')}</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {overrepresented.map((p) => (
                                                    <div key={p.id} className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                                                            <span className="font-medium text-foreground">{p.name}</span>
                                                        </div>
                                                        <span className="font-semibold text-amber-600">
                                                            +{Math.round(p.actual - (p.target_percentage || 0))}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Underrepresented pillars card */}
                                <div className="panel p-5 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                                                    <TrendDown size={16} weight="duotone" />
                                                </span>
                                                <h2 className="text-[15px] font-semibold text-foreground">
                                                    {t('Underrepresented pillars')}
                                                </h2>
                                            </div>
                                            {underrepresented.length > 0 && (
                                                <span className="rounded-lg bg-rose-50 border border-rose-200/60 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                                    {underrepresented.length}
                                                </span>
                                            )}
                                        </div>
                                        <p className="label-xs text-muted-foreground mt-1 mb-4">
                                            {t('Pillars falling behind their target share by more than 5%.')}
                                        </p>

                                        {underrepresented.length === 0 ? (
                                            <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center">
                                                <CheckCircle size={28} className="text-emerald-500 mb-1" weight="duotone" />
                                                <span>{t('All pillars are on or near target')}</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {underrepresented.map((p) => (
                                                    <div key={p.id} className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                                                            <span className="font-medium text-foreground">{p.name}</span>
                                                        </div>
                                                        <span className="font-semibold text-rose-600">
                                                            -{Math.round((p.target_percentage || 0) - p.actual)}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
