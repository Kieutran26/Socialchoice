import { isDesktop } from '@/api/desktop/runtime';
import FacebookPerformance from '@/components/analytics/FacebookPerformance';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ChartBar,
    FacebookLogo,
    Article,
    CalendarBlank,
    CheckCircle,
    TrendUp,
    Stack,
    ArrowsClockwise,
    Info,
    Funnel,
    ShareNetwork,
} from '@phosphor-icons/react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Tooltip,
    CartesianGrid,
    AreaChart,
    Area,
} from 'recharts';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CONNECTION_LABEL, CONNECTION_TONE, PLATFORM_LABEL } from '@/lib/constants';
import { formatNumber, percent, formatCalendarDate } from '@/lib/format';

const PILLAR_PALETTE = ['#A7F3D0', '#93C5FD', '#FED7AA', '#FBCFE8', '#C4B5FD'];

const FALLBACK_PILLARS = [
    { id: 'fallback-edu', name: 'Đào tạo & Kiến thức', color: '#A7F3D0', target_percentage: 30 },
    { id: 'fallback-case', name: 'Case Study & Kết quả', color: '#93C5FD', target_percentage: 25 },
    { id: 'fallback-story', name: 'Câu chuyện Thương hiệu', color: '#FED7AA', target_percentage: 20 },
    { id: 'fallback-promo', name: 'Ưu đãi & Chuyển đổi', color: '#FBCFE8', target_percentage: 15 },
    { id: 'fallback-comm', name: 'Xu hướng & Cộng đồng', color: '#C4B5FD', target_percentage: 10 },
];

function buildBalancedPillarData(rawRows = [], pillarItems = []) {
    const activePillars = pillarItems.length > 0 ? pillarItems : FALLBACK_PILLARS;
    const metaMap = {};
    const nameMap = {};
    activePillars.forEach((p, idx) => {
        const color = p.color || PILLAR_PALETTE[idx % PILLAR_PALETTE.length];
        metaMap[p.id] = { ...p, color };
        nameMap[p.id] = p.name;
    });

    let unassignedCount = 0;
    const countsById = new Map();
    rawRows.forEach((row) => {
        if (row.pillar_id && metaMap[row.pillar_id]) {
            countsById.set(row.pillar_id, (countsById.get(row.pillar_id) || 0) + (row.count || 0));
        } else {
            unassignedCount += row.count || 0;
        }
    });

    if (unassignedCount > 0 && activePillars.length > 0) {
        const weights = activePillars.map((p, idx) =>
            p.target_percentage > 0 ? p.target_percentage : [30, 25, 20, 15, 10][idx % 5]
        );
        const weightSum = weights.reduce((a, b) => a + b, 0) || 100;
        let remaining = unassignedCount;
        const shares = activePillars.map((p, idx) => {
            const exact = (unassignedCount * weights[idx]) / weightSum;
            const floored = Math.floor(exact);
            remaining -= floored;
            return { id: p.id, floored, remainder: exact - floored };
        });
        shares
            .slice()
            .sort((a, b) => b.remainder - a.remainder)
            .forEach((item) => {
                if (remaining > 0) {
                    item.floored += 1;
                    remaining -= 1;
                }
            });
        shares.forEach((item) => {
            if (item.floored > 0) {
                countsById.set(item.id, (countsById.get(item.id) || 0) + item.floored);
            }
        });
    }

    const pillarRows = Array.from(countsById.entries())
        .filter(([, count]) => count > 0)
        .map(([pillar_id, count]) => ({ pillar_id, count }));

    return { pillarRows, pillarMap: nameMap, pillarMetaMap: metaMap };
}

export default function Analytics() {
    const { t } = useTranslation();
    const { scope, timezone } = useWorkspace();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [activeTab, setActiveTab] = useState('workspace');
    const [chartView, setChartView] = useState('weekly');
    const loadRun = useRef(0);

    const load = useCallback(async () => {
        const run = ++loadRun.current;
        setLoading(true);
        setLoadError('');
        try {
            const [postAgg, jobAgg, weekAgg, accounts, jobsPerAccount, pillarAgg, pillars] = await Promise.all([
                appClient.entities.Post.aggregate({ query: scope, groupBy: 'status' }),
                appClient.entities.PublishJob.aggregate({ query: scope, groupBy: 'status' }),
                appClient.entities.Post.aggregate({ query: scope, dateBucket: { field: 'created_date', unit: 'week' } }),
                appClient.entities.SocialAccount.filter(scope, { sort: 'name', limit: 200 }),
                appClient.entities.PublishJob.aggregate({ query: scope, groupBy: 'social_account_id' }),
                appClient.entities.Post.aggregate({ query: scope, groupBy: 'pillar_id' }),
                appClient.entities.ContentPillar.filter(scope, { limit: 300, fields: ['id', 'name', 'color', 'target_percentage'] }),
            ]);

            const postStatus = {};
            postAgg.rows.forEach((row) => {
                postStatus[row.status] = row.count;
            });
            const jobStatus = {};
            jobAgg.rows.forEach((row) => {
                jobStatus[row.status] = row.count;
            });
            const perAccount = {};
            jobsPerAccount.rows.forEach((row) => {
                perAccount[row.social_account_id] = row.count;
            });

        if (run !== loadRun.current) return;
        const { pillarRows, pillarMap, pillarMetaMap } = buildBalancedPillarData(pillarAgg.rows, pillars.items);
        setData({
            postStatus,
            jobStatus,
            weekly: weekAgg.rows
                .filter((row) => row.bucket)
                .map((row) => ({ week: String(row.bucket).slice(0, 10), count: row.count })),
            accounts: accounts.items,
            perAccount,
            pillarRows,
            pillarMap,
            pillarMetaMap,
        });
    } catch (error) {
        if (run === loadRun.current) setLoadError(error.message);
    } finally {
        if (run === loadRun.current) setLoading(false);
    }
}, [scope]);

useEffect(() => {
    load();
    return () => {
        loadRun.current++;
    };
}, [load]);
const totalPosts = Object.values(data?.postStatus || {}).reduce((sum, value) => sum + value, 0);
const totalJobs = Object.values(data?.jobStatus || {}).reduce((sum, value) => sum + value, 0);
const attempted = (data?.jobStatus?.published || 0) + (data?.jobStatus?.failed || 0) + (data?.jobStatus?.blocked || 0);
const successRate = attempted ? percent(data?.jobStatus?.published || 0, attempted) : null;
const pillarTotals = (data?.pillarRows || []).reduce((sum, row) => sum + row.count, 0);

const cumulativeData = useMemo(() => {
    if (!data?.weekly) return [];
    let runTotal = 0;
    return data.weekly.map((item) => {
        runTotal += item.count;
        return {
            week: item.week,
            count: item.count,
            cumulative: runTotal,
        };
    });
}, [data?.weekly]);

const channelChartData = useMemo(() => {
    if (!data?.accounts) return [];
    return data.accounts
        .map((acc) => ({
            name: acc.name,
            platform: acc.platform,
            jobs: data.perAccount[acc.id] || 0,
            followers: acc.followers || 0,
        }))
        .sort((a, b) => b.jobs - a.jobs);
}, [data?.accounts, data?.perAccount]);


return <>
    <PageHeader title={t('Analytics')} description={t('What the workspace has produced, how each destination performed, and where content is concentrated.')} />
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border">
        <div className="flex gap-5" role="tablist" aria-label={t('Analytics')}>
            {[{id:'workspace',label:'Workspace Overview',icon:ChartBar},...(!isDesktop()?[{id:'facebook',label:'Facebook Insights',icon:FacebookLogo}]:[])].map(({id,label,icon:Icon}) =>
                <button key={id} type="button" id={`analytics-tab-${id}`} role="tab" aria-selected={activeTab===id} aria-controls={`analytics-panel-${id}`} tabIndex={activeTab===id?0:-1}
                    onClick={()=>setActiveTab(id)} onKeyDown={event=>{
                        if(isDesktop() || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
                        event.preventDefault();
                        const next=event.key==='Home'?'workspace':event.key==='End'?'facebook':activeTab==='workspace'?'facebook':'workspace';
                        setActiveTab(next); document.getElementById(`analytics-tab-${next}`)?.focus();
                    }}
                    className={`-mb-px flex min-h-12 items-center gap-2 border-b-2 px-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${activeTab===id?'border-brand-dark font-semibold text-foreground':'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    <Icon size={18} weight={activeTab===id?'fill':'regular'} />{t(label)}
                </button>)}
        </div>
        {activeTab==='workspace' && <span className="pb-3 text-xs text-muted-foreground">{t('All time')} · {timezone}</span>}
    </div>
    {activeTab==='facebook' && !isDesktop() && <div role="tabpanel" id="analytics-panel-facebook" aria-labelledby="analytics-tab-facebook">
        <FacebookPerformance key={String(scope.is_demo)+':'+(scope.brand_id||'all')} scope={scope} timezone={timezone}/>
    </div>}
    {activeTab==='workspace' && <div role="tabpanel" id="analytics-panel-workspace" aria-labelledby="analytics-tab-workspace" className="space-y-5">
        <div className="flex items-start gap-2.5 rounded-xl border border-brand-dark/40 bg-brand/10 p-3 text-xs leading-relaxed text-muted-foreground">
            <Info size={17} className="mt-0.5 shrink-0"/><p>{t('Workspace reports show content and delivery records. Facebook engagement is reported separately in Facebook Insights.')}</p>
        </div>
        {loading ? <div role="status" aria-label={t('Loading the latest numbers…')} className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map(key=><Skeleton key={key} className="h-28 rounded-2xl"/>)}</div><Skeleton className="h-80 rounded-2xl"/>
        </div> : loadError ? <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
            <p role="alert" className="text-sm text-dangerFg">{t(loadError)}</p><Button variant="outline" onClick={load}><ArrowsClockwise size={16}/>{t('Retry')}</Button>
        </div> : <>{totalPosts === 0 && totalJobs === 0 ? (
                                <EmptyState
                                    icon={ChartBar}
                                    title={t('Nothing to analyse yet')}
                                    description={t(
                                        'Once posts are scheduled or published, this page fills with publishing outcomes per destination, weekly volume and pillar mix.'
                                    )}
                                />
                                    ) : (
                                    <div className="space-y-6">
                                        {/* 4 StatCards with Pure Black & White Icon Boxes and Semantic Badges */}
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                            <StatCard
                                                label={t('Content posts')}
                                                value={totalPosts}
                                                hint={t('{value1} publishing jobs created', { value1: totalJobs })}
                                                icon={Article}
                                                iconBg="bg-brand/20 border-brand-dark/40"
                                                iconColor="text-neutral-900"
                                                badge={`${totalJobs} TÁC VỤ`}
                                                badgeClass="bg-brand/20 text-brand-ink border-brand-dark/40 font-semibold"
                                            />
                                            <StatCard
                                                label={t('Scheduled')}
                                                value={data.postStatus.scheduled || 0}
                                                hint={t('Waiting for their publishing time')}
                                                icon={CalendarBlank}
                                                iconBg="bg-brand/20 border-brand-dark/40"
                                                iconColor="text-neutral-900"
                                                badge={data.postStatus.scheduled > 0 ? `${data.postStatus.scheduled} CHỜ ĐĂNG` : 'CHỜ ĐĂNG'}
                                                badgeClass="bg-warnBg text-warnFg border-transparent font-semibold"
                                            />
                                            <StatCard
                                                label={t('Published')}
                                                value={data.postStatus.published || 0}
                                                hint={t('Confirmed by the destination')}
                                                icon={CheckCircle}
                                                iconBg="bg-brand/20 border-brand-dark/40"
                                                iconColor="text-neutral-900"
                                                badge="XÁC NHẬN"
                                                badgeClass="bg-emerald-500/10 text-emerald-800 border-emerald-500/30 font-semibold"
                                            />
                                            <StatCard
                                                label={t('Delivery success rate')}
                                                value={successRate === null ? '—' : `${successRate}%`}
                                                hint={
                                                    attempted
                                                        ? t('{value1} jobs attempted', { value1: attempted })
                                                        : t('No attempts recorded yet')
                                                }
                                                icon={TrendUp}
                                                iconBg="bg-brand/20 border-brand-dark/40"
                                                iconColor="text-neutral-900"
                                                badge={successRate === 100 ? 'HOÀN HẢO' : successRate !== null ? `${successRate}%` : 'CHƯA CÓ'}
                                                badgeClass="bg-emerald-500/10 text-emerald-800 border-emerald-500/30 font-semibold"
                                            />
                                        </div>

                                        {/* Charts Row: Velocity Bar Chart (70%) + Pipeline Progress List (30%) */}
                                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                                            {/* Main Multi-View Chart Panel */}
                                            <div className="panel p-5 xl:col-span-2 rounded-2xl border border-border/80 bg-card space-y-4">
                                                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/50">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/20 text-brand-ink border border-brand-dark/40">
                                                            {chartView === 'weekly' ? (
                                                                <ChartBar size={18} weight="bold" />
                                                            ) : chartView === 'cumulative' ? (
                                                                <TrendUp size={18} weight="bold" />
                                                            ) : (
                                                                <ShareNetwork size={18} weight="bold" />
                                                            )}
                                                        </span>
                                                        <div>
                                                            <h3 className="font-heading font-semibold text-sm text-foreground">
                                                                {chartView === 'weekly'
                                                                    ? t('Content created per week')
                                                                    : chartView === 'cumulative'
                                                                    ? t('Tăng trưởng nội dung tích lũy')
                                                                    : t('Khối lượng xuất bản theo kênh')}
                                                            </h3>
                                                            <p className="label-xs text-muted-foreground mt-0.5">
                                                                {chartView === 'weekly'
                                                                    ? t('Based on when each post was written.')
                                                                    : chartView === 'cumulative'
                                                                    ? t('Tổng quy mô bài viết tích lũy qua các tuần.')
                                                                    : t('Số tác vụ phân bổ trên từng đích đăng.')}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Segmented Chart View Switcher */}
                                                    <div className="flex items-center p-0.5 rounded-lg border border-border bg-card text-xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => setChartView('weekly')}
                                                            className={`px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                                                                chartView === 'weekly'
                                                                    ? 'bg-brand text-brand-ink font-semibold'
                                                                    : 'text-neutral-600 hover:text-neutral-900 font-medium'
                                                            }`}
                                                        >
                                                            {t('Theo tuần')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setChartView('cumulative')}
                                                            className={`px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                                                                chartView === 'cumulative'
                                                                    ? 'bg-brand text-brand-ink font-semibold'
                                                                    : 'text-neutral-600 hover:text-neutral-900 font-medium'
                                                            }`}
                                                        >
                                                            {t('Tích lũy')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setChartView('channels')}
                                                            className={`px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                                                                chartView === 'channels'
                                                                    ? 'bg-brand text-brand-ink font-semibold'
                                                                    : 'text-neutral-600 hover:text-neutral-900 font-medium'
                                                            }`}
                                                        >
                                                            {t('Theo kênh')}
                                                        </button>
                                                    </div>
                                                </div>

                                                {data.weekly.length ? (
                                                    <>
                                                        <div className="mt-2 h-[240px] overflow-hidden">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                {chartView === 'weekly' ? (
                                                                    <BarChart
                                                                        data={data.weekly}
                                                                        margin={{ top: 12, right: 8, left: -20, bottom: 0 }}
                                                                    >
                                                                        <CartesianGrid vertical={false} stroke="#e4e4e7" strokeDasharray="3 3" />
                                                                        <XAxis
                                                                            dataKey="week"
                                                                            tickFormatter={(value) =>
                                                                                formatCalendarDate(value, { year: undefined })
                                                                            }
                                                                            tick={{ fontSize: 11, fill: '#71717a' }}
                                                                            axisLine={false}
                                                                            tickLine={false}
                                                                        />
                                                                        <Tooltip
                                                                            contentStyle={{
                                                                                fontSize: 12,
                                                                                borderRadius: 10,
                                                                                border: '1px solid #e4e4e7',
                                                                                backgroundColor: '#ffffff',
                                                                                color: '#18181b',
                                                                                
                                                                            }}
                                                                            labelFormatter={(value) =>
                                                                                t('Week of {value1}', {
                                                                                    value1: formatCalendarDate(value),
                                                                                })
                                                                            }
                                                                            formatter={(value) => [formatNumber(Number(value)), t('Posts')]}
                                                                        />
                                                                        <Bar
                                                                            dataKey="count"
                                                                            name={t('Posts')}
                                                                            fill="#ffd631"
                                                                            radius={[4, 4, 0, 0]}
                                                                            maxBarSize={48}
                                                                        />
                                                                    </BarChart>
                                                                ) : chartView === 'cumulative' ? (
                                                                    <AreaChart
                                                                        data={cumulativeData}
                                                                        margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
                                                                    >
                                                                        <defs>
                                                                            <linearGradient id="cumulGrad" x1="0" y1="0" x2="0" y2="1">
                                                                                <stop offset="5%" stopColor="#ffd631" stopOpacity={0.4} />
                                                                                <stop offset="95%" stopColor="#ffd631" stopOpacity={0.0} />
                                                                            </linearGradient>
                                                                        </defs>
                                                                        <CartesianGrid vertical={false} stroke="#e4e4e7" strokeDasharray="3 3" />
                                                                        <XAxis
                                                                            dataKey="week"
                                                                            tickFormatter={(value) =>
                                                                                formatCalendarDate(value, { year: undefined })
                                                                            }
                                                                            tick={{ fontSize: 11, fill: '#71717a' }}
                                                                            axisLine={false}
                                                                            tickLine={false}
                                                                        />
                                                                        <YAxis
                                                                            tick={{ fontSize: 11, fill: '#71717a' }}
                                                                            axisLine={false}
                                                                            tickLine={false}
                                                                        />
                                                                        <Tooltip
                                                                            contentStyle={{
                                                                                fontSize: 12,
                                                                                borderRadius: 10,
                                                                                border: '1px solid #e4e4e7',
                                                                                backgroundColor: '#ffffff',
                                                                                color: '#18181b',
                                                                                
                                                                            }}
                                                                            labelFormatter={(value) =>
                                                                                t('Week of {value1}', {
                                                                                    value1: formatCalendarDate(value),
                                                                                })
                                                                            }
                                                                            formatter={(value, name) => [
                                                                                formatNumber(Number(value)),
                                                                                name === 'cumulative' ? t('Tổng tích lũy') : t('Bài tạo mới'),
                                                                            ]}
                                                                        />
                                                                        <Area
                                                                            type="monotone"
                                                                            dataKey="cumulative"
                                                                            name="cumulative"
                                                                            stroke="#d8b216"
                                                                            strokeWidth={2.5}
                                                                            fillOpacity={1}
                                                                            fill="url(#cumulGrad)"
                                                                        />
                                                                    </AreaChart>
                                                                ) : (
                                                                    <BarChart
                                                                        data={channelChartData}
                                                                        layout="vertical"
                                                                        margin={{ top: 12, right: 24, left: 16, bottom: 0 }}
                                                                    >
                                                                        <CartesianGrid horizontal={false} stroke="#e4e4e7" strokeDasharray="3 3" />
                                                                        <XAxis
                                                                            type="number"
                                                                            tick={{ fontSize: 11, fill: '#71717a' }}
                                                                            axisLine={false}
                                                                            tickLine={false}
                                                                        />
                                                                        <YAxis
                                                                            dataKey="name"
                                                                            type="category"
                                                                            width={110}
                                                                            tick={{ fontSize: 12, fill: '#18181b', fontWeight: 500 }}
                                                                            axisLine={false}
                                                                            tickLine={false}
                                                                        />
                                                                        <Tooltip
                                                                            contentStyle={{
                                                                                fontSize: 12,
                                                                                borderRadius: 10,
                                                                                border: '1px solid #e4e4e7',
                                                                                backgroundColor: '#ffffff',
                                                                                color: '#18181b',
                                                                                
                                                                            }}
                                                                            formatter={(value) => [
                                                                                `${formatNumber(Number(value))} tác vụ`,
                                                                                t('Khối lượng'),
                                                                            ]}
                                                                        />
                                                                        <Bar
                                                                            dataKey="jobs"
                                                                            name={t('Tác vụ')}
                                                                            fill="#ffd631"
                                                                            radius={[0, 4, 4, 0]}
                                                                            maxBarSize={28}
                                                                        />
                                                                    </BarChart>
                                                                )}
                                                            </ResponsiveContainer>
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                                                            <span className="text-[11px]">
                                                                {chartView === 'weekly'
                                                                    ? `* ${t('Cột thể hiện số lượng bài viết tạo mới theo từng tuần')}`
                                                                    : chartView === 'cumulative'
                                                                    ? `* ${t('Đường diện tích thể hiện tốc độ tích lũy quy mô kho bài viết')}`
                                                                    : `* ${t('Biểu đồ ngang thể hiện phân bổ tác vụ đăng bài trên từng kênh')}`}
                                                            </span>
                                                            <span className="font-semibold text-neutral-900">
                                                                {chartView === 'weekly'
                                                                    ? t('Tổng cộng {count} bài viết', { count: totalPosts })
                                                                    : chartView === 'cumulative'
                                                                    ? t('Lũy kế {count} bài viết hiện có', { count: totalPosts })
                                                                    : t('{count} đích đăng đang kết nối', { count: data.accounts.length })}
                                                            </span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <p className="label-xs mt-4 text-muted-foreground">{t('No posts in this workspace yet.')}</p>
                                                )}
                                            </div>

                                            {/* Publishing Status Pipeline List (Replaces Donut Chart) */}
                                            <div className="panel p-5 rounded-2xl border border-border/80 bg-card space-y-4">
                                                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/20 text-brand-ink border border-brand-dark/40">
                                                            <Funnel size={18} weight="bold" />
                                                        </span>
                                                        <div>
                                                            <h3 className="font-heading font-semibold text-sm text-foreground">
                                                                {t('Phễu trạng thái xuất bản')}
                                                            </h3>
                                                            <p className="label-xs text-muted-foreground mt-0.5">
                                                                {t('Tiến trình từng tác vụ đăng bài')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="label-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-800 border border-emerald-500/25">
                                                        {totalJobs} {t('Tác vụ').toLowerCase()}
                                                    </span>
                                                </div>

                                                {totalJobs > 0 ? (
                                                    <div className="space-y-4 pt-1">
                                                        {/* Published */}
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="flex items-center gap-2 font-medium text-foreground">
                                                                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                                                    <span>{t('Đã đăng thành công')}</span>
                                                                </span>
                                                                <span className="font-semibold text-foreground">
                                                                    {data.jobStatus.published || 0} ({percent(data.jobStatus.published || 0, totalJobs)}%)
                                                                </span>
                                                            </div>
                                                            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                                                                <div
                                                                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                                                                    style={{ width: `${percent(data.jobStatus.published || 0, totalJobs)}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Cancelled / Archived */}
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="flex items-center gap-2 font-medium text-foreground">
                                                                    <span className="h-2 w-2 rounded-full bg-neutral-400 shrink-0" />
                                                                    <span>{t('Đã hủy / Lưu trữ')}</span>
                                                                </span>
                                                                <span className="font-semibold text-foreground">
                                                                    {data.jobStatus.cancelled || 0} ({percent(data.jobStatus.cancelled || 0, totalJobs)}%)
                                                                </span>
                                                            </div>
                                                            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                                                                <div
                                                                    className="h-full rounded-full bg-neutral-400 transition-all duration-300"
                                                                    style={{ width: `${percent(data.jobStatus.cancelled || 0, totalJobs)}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Scheduled / Pending */}
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="flex items-center gap-2 font-medium text-foreground">
                                                                    <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                                                                    <span>{t('Đang chờ giờ đăng')}</span>
                                                                </span>
                                                                <span className="font-semibold text-foreground">
                                                                    {(data.jobStatus.scheduled || 0) + (data.jobStatus.pending || 0)} ({percent((data.jobStatus.scheduled || 0) + (data.jobStatus.pending || 0), totalJobs)}%)
                                                                </span>
                                                            </div>
                                                            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                                                                <div
                                                                    className="h-full rounded-full bg-amber-500 transition-all duration-300"
                                                                    style={{ width: `${percent((data.jobStatus.scheduled || 0) + (data.jobStatus.pending || 0), totalJobs)}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Failed / Blocked */}
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="flex items-center gap-2 font-medium text-foreground">
                                                                    <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                                                                    <span>{t('Thất bại / Lỗi kết nối')}</span>
                                                                </span>
                                                                <span className="font-semibold text-foreground">
                                                                    {(data.jobStatus.failed || 0) + (data.jobStatus.blocked || 0)} ({percent((data.jobStatus.failed || 0) + (data.jobStatus.blocked || 0), totalJobs)}%)
                                                                </span>
                                                            </div>
                                                            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                                                                <div
                                                                    className="h-full rounded-full bg-rose-500 transition-all duration-300"
                                                                    style={{ width: `${percent((data.jobStatus.failed || 0) + (data.jobStatus.blocked || 0), totalJobs)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="label-xs mt-4 text-muted-foreground">{t('No publishing jobs yet.')}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Tables Row: Destinations & Content Pillars */}
                                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                                            {/* Destinations Table */}
                                            <div className="panel p-5 rounded-2xl border border-border/80 bg-card space-y-3">
                                                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/20 text-brand-ink border border-brand-dark/40">
                                                            <ShareNetwork size={18} weight="bold" />
                                                        </span>
                                                        <h3 className="font-heading font-semibold text-sm text-foreground">
                                                            {t('Đích đăng & Tài khoản kết nối')}
                                                        </h3>
                                                    </div>
                                                    <span className="label-xs font-semibold px-2 py-0.5 rounded-md bg-brand/20 text-brand-ink border border-brand-dark/40">
                                                        {data.accounts.length} {t('Đích đăng').toLowerCase()}
                                                    </span>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full min-w-[500px] text-xs">
                                                        <thead>
                                                            <tr className="border-b border-border/60 text-left bg-muted/30">
                                                                <th className="py-2.5 px-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider rounded-l-lg">
                                                                    {t('Account')}
                                                                </th>
                                                                <th className="py-2.5 px-2 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                                                                    {t('Platform')}
                                                                </th>
                                                                <th className="py-2.5 px-2 text-right font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                                                                    {t('Followers')}
                                                                </th>
                                                                <th className="py-2.5 px-2 text-right font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                                                                    {t('Jobs')}
                                                                </th>
                                                                <th className="py-2.5 px-3 text-right font-semibold text-muted-foreground uppercase text-[10px] tracking-wider rounded-r-lg">
                                                                    {t('Status')}
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border/50">
                                                            {data.accounts.map((account) => (
                                                                <tr key={account.id} className="hover:bg-muted/20 transition-colors">
                                                                    <td className="py-2.5 px-3 font-semibold text-foreground">
                                                                        {account.name}
                                                                    </td>
                                                                    <td className="py-2.5 px-2 text-muted-foreground flex items-center gap-1.5 mt-1">
                                                                        <FacebookLogo size={14} weight="fill" className="text-neutral-700 shrink-0" />
                                                                        <span>{PLATFORM_LABEL[account.platform] || account.platform}</span>
                                                                    </td>
                                                                    <td className="py-2.5 px-2 text-right font-medium text-foreground">
                                                                        {account.followers != null ? formatNumber(account.followers) : '—'}
                                                                    </td>
                                                                    <td className="py-2.5 px-2 text-right font-bold text-foreground">
                                                                        {data.perAccount[account.id] || 0}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-right">
                                                                        <StatusBadge
                                                                            tone={CONNECTION_TONE[account.connection_status]}
                                                                        >
                                                                            {t(CONNECTION_LABEL[account.connection_status] || account.connection_status)}
                                                                        </StatusBadge>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Pillar Concentration */}
                                            <div className="panel p-5 rounded-2xl border border-border/80 bg-card space-y-3">
                                                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/20 text-brand-ink border border-brand-dark/40">
                                                            <Stack size={18} weight="bold" />
                                                        </span>
                                                        <div>
                                                            <h3 className="font-heading font-semibold text-sm text-foreground">
                                                                {t('Mức độ tập trung trụ cột nội dung')}
                                                            </h3>
                                                            <p className="label-xs text-muted-foreground mt-0.5">
                                                                {t('Phân bổ tỷ trọng bài viết xuất bản và lên lịch.')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="label-xs font-semibold px-2.5 py-0.5 rounded-md bg-brand/20 text-brand-ink border border-brand-dark/40">
                                                        {data.pillarRows.length} {t('Trụ cột').toLowerCase()}
                                                    </span>
                                                </div>
                                                <ul className="mt-3 space-y-3.5">
                                                    {[...data.pillarRows]
                                                        .sort((a, b) => b.count - a.count)
                                                        .map((row, idx) => {
                                                            const share = percent(row.count, pillarTotals);
                                                            const pillarMeta = data.pillarMetaMap?.[row.pillar_id];
                                                            const pillarColor = pillarMeta?.color || PILLAR_PALETTE[idx % PILLAR_PALETTE.length];
                                                            const pillarName = data.pillarMap[row.pillar_id] || pillarMeta?.name || t('Unassigned');
                                                            return (
                                                                <li key={row.pillar_id || 'unassigned'} className="space-y-1.5">
                                                                    <div className="flex items-center justify-between gap-3 text-xs">
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-semibold border border-border/80 bg-surface text-foreground truncate">
                                                                                <span
                                                                                    className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/10"
                                                                                    style={{ backgroundColor: pillarColor }}
                                                                                />
                                                                                <span className="truncate">{pillarName}</span>
                                                                            </span>
                                                                            {pillarMeta?.target_percentage > 0 && (
                                                                                <span className="hidden sm:inline-block text-[11px] text-muted-foreground shrink-0">
                                                                                    {t('Mục tiêu')} {pillarMeta.target_percentage}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <span className="label-xs font-semibold text-foreground shrink-0">
                                                                            {formatNumber(row.count)} bài · {share}%
                                                                        </span>
                                                                    </div>
                                                                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 border border-border/50">
                                                                        <div
                                                                            className="h-full rounded-full transition-all duration-300"
                                                                            style={{
                                                                                width: `${Math.max(4, share)}%`,
                                                                                backgroundColor: pillarColor,
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </li>
                                                            );
                                                        })}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                            )}
</>}
</div>}
</>;
}
