import { isDesktop } from '@/api/desktop/runtime';
import FacebookPerformance from '@/components/analytics/FacebookPerformance';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ChartBar,
    FacebookLogo,
    SquaresFour,
    Article,
    CalendarBlank,
    CheckCircle,
    TrendUp,
    Users,
    Stack,
} from '@phosphor-icons/react';
import {
    BarChart,
    Bar,
    XAxis,
    ResponsiveContainer,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { JOB_STATUS_LABEL, CONNECTION_LABEL, CONNECTION_TONE, PLATFORM_LABEL } from '@/lib/constants';
import { formatNumber, percent, formatCalendarDate } from '@/lib/format';

const JOB_COLORS = {
    published: '#79D94B',
    pending: '#8FA9C6',
    processing: '#C6A15B',
    blocked: '#C2705F',
    failed: '#B4453F',
    cancelled: '#B9B9B9',
};

export default function Analytics() {
    const { t } = useTranslation();
    const { scope, timezone } = useWorkspace();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [activeTab, setActiveTab] = useState('all');
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
                appClient.entities.ContentPillar.filter(scope, { limit: 300, fields: ['id', 'name'] }),
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
        setData({
            postStatus,
            jobStatus,
            weekly: weekAgg.rows
                .filter((row) => row.bucket)
                .map((row) => ({ week: String(row.bucket).slice(0, 10), count: row.count })),
            accounts: accounts.items,
            perAccount,
            pillarRows: pillarAgg.rows,
            pillarMap: Object.fromEntries(pillars.items.map((pillar) => [pillar.id, pillar.name])),
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

if (loading) {
    return (
        <>
            <PageHeader title={t('Analytics')} description={t('Loading the latest numbers…')} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((key) => (
                    <Skeleton key={key} className="h-[104px] rounded-2xl" />
                ))}
            </div>
        </>
    );
}

if (loadError) {
    return (
        <>
            <PageHeader title={t('Analytics')} />
            {!isDesktop() && (
                <FacebookPerformance
                    key={String(scope.is_demo) + ':' + (scope.brand_id || 'all')}
                    scope={scope}
                    timezone={timezone}
                />
            )}
            <p role="alert" className="text-sm text-dangerFg">
                {t(loadError)}
            </p>
        </>
    );
}

const totalPosts = Object.values(data.postStatus).reduce((sum, value) => sum + value, 0);
const totalJobs = Object.values(data.jobStatus).reduce((sum, value) => sum + value, 0);
const attempted = (data.jobStatus.published || 0) + (data.jobStatus.failed || 0) + (data.jobStatus.blocked || 0);
const successRate = attempted ? percent(data.jobStatus.published || 0, attempted) : 0;
const jobPie = Object.entries(data.jobStatus).map(([status, count]) => ({
    name: JOB_STATUS_LABEL[status] || status,
    key: status,
    value: count,
}));
const pillarTotals = data.pillarRows.reduce((sum, row) => sum + row.count, 0);

const showFacebook = (activeTab === 'all' || activeTab === 'facebook') && !isDesktop();
const showWorkspace = activeTab === 'all' || activeTab === 'workspace';

return (
        <>
        <PageHeader
            title={t('Analytics')}
            description={t(
                'What the workspace has produced, how each destination performed, and where content is concentrated.'
            )}
        />

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 w-fit mb-6 border border-border/60">
            <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'all'
                        ? 'bg-background text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
            >
                <SquaresFour size={14} weight="bold" />
                <span>{t('All reports')}</span>
            </button>
            {!isDesktop() && (
                <button
                    type="button"
                    onClick={() => setActiveTab('facebook')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'facebook'
                            ? 'bg-background text-foreground shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <FacebookLogo size={14} weight="fill" className="text-[#1877F2]" />
                    <span>{t('Facebook Insights')}</span>
                </button>
            )}
            <button
                type="button"
                onClick={() => setActiveTab('workspace')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'workspace'
                        ? 'bg-background text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
            >
                <ChartBar size={14} weight="bold" />
                <span>{t('Workspace Overview')}</span>
            </button>
        </div>

                {/* Facebook Performance Section */}
                {showFacebook && (
                    <FacebookPerformance
                        key={String(scope.is_demo) + ':' + (scope.brand_id || 'all')}
                        scope={scope}
                        timezone={timezone}
                    />
            )}

                    {isDesktop() && (
                        <p role="status" className="panel p-4 mb-5 text-sm rounded-2xl border border-border/80">
                            {t('These charts use local content records. Live social metrics require a connected integration.')}
                        </p>
                    )}

                    {/* Workspace Analytics Section */}
                    {showWorkspace && (
                        <>
                            {totalPosts === 0 && totalJobs === 0 ? (
                                <EmptyState
                                    icon={ChartBar}
                                    title={t('Nothing to analyse yet')}
                                    description={t(
                                        'Once posts are scheduled or published, this page fills with publishing outcomes per destination, weekly volume and pillar mix.'
                                    )}
                                />
                                    ) : (
                                    <div className="space-y-6">
                                        {activeTab === 'all' && !isDesktop() && (
                                            <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground">
                                                    <ChartBar size={15} weight="bold" />
                                                </span>
                                                <h2 className="font-heading font-bold text-base text-foreground">
                                                    {t('Workspace Overview')}
                                                </h2>
                                            </div>
                            )}

                                                    {/* StatCards */}
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                        <StatCard
                                                            label={t('Content posts')}
                                                            value={totalPosts}
                                                            hint={t('{value1} publishing jobs created', { value1: totalJobs })}
                                                            icon={Article}
                                                        />
                                                        <StatCard
                                                            label={t('Scheduled')}
                                                            value={data.postStatus.scheduled || 0}
                                                            hint={t('Waiting for their publishing time')}
                                                            icon={CalendarBlank}
                                                        />
                                                        <StatCard
                                                            label={t('Published')}
                                                            value={data.postStatus.published || 0}
                                                            hint={t('Confirmed by the destination')}
                                                            icon={CheckCircle}
                                                        />
                                                        <StatCard
                                                            label={t('Delivery success rate')}
                                                            value={`${successRate}%`}
                                                            hint={
                                                                attempted
                                                                    ? t('{value1} jobs attempted', { value1: attempted })
                                                                    : t('No attempts recorded yet')
                                                            }
                                                            icon={TrendUp}
                                                        />
                                                    </div>

                                                    {/* Charts Row */}
                                                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                                                        <div className="panel p-5 xl:col-span-2 rounded-2xl border border-border/80 bg-card shadow-2xs">
                                                            <div className="flex items-center justify-between pb-3 mb-2 border-b border-border/50">
                                                                <div>
                                                                    <h3 className="font-heading font-semibold text-sm text-foreground">
                                                                        {t('Content created per week')}
                                                                    </h3>
                                                                    <p className="label-xs text-muted-foreground mt-0.5">
                                                                        {t('Based on when each post was written.')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                                                {data.weekly.length ? (
                                                                                    <div className="mt-4 h-[220px] overflow-hidden">
                                                                                        <ResponsiveContainer width="100%" height="100%">
                                                                                            <BarChart
                                                                                                data={data.weekly}
                                                                                                margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
                                                                                            >
                                                                                                <CartesianGrid vertical={false} stroke="oklch(0.922 0 0)" />
                                                                                                <XAxis
                                                                                                    dataKey="week"
                                                                                                    tickFormatter={(value) =>
                                                                                                        formatCalendarDate(value, { year: undefined })
                                                                                                    }
                                                                                                    tick={{ fontSize: 11, fill: 'oklch(0.556 0 0)' }}
                                                                                                    axisLine={false}
                                                                                                    tickLine={false}
                                                                                                />
                                                        <Tooltip
                                                            contentStyle={{
                                                                fontSize: 12,
                                                                borderRadius: 10,
                                                                border: '1px solid oklch(0.922 0 0)',
                                                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
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
                                                            fill="#79D94B"
                                                            radius={[4, 4, 0, 0]}
                                                        />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                        <p className="label-xs mt-4">{t('No posts in this workspace yet.')}</p>
                                    )}
                                    </div>

                                                <div className="panel p-5 rounded-2xl border border-border/80 bg-card shadow-2xs">
                                                    <div className="flex items-center justify-between pb-3 mb-2 border-b border-border/50">
                                                        <div>
                                                            <h3 className="font-heading font-semibold text-sm text-foreground">
                                                                {t('Publishing outcomes')}
                                                            </h3>
                                                            <p className="label-xs text-muted-foreground mt-0.5">
                                                                {t('Every destination job, by final state.')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {jobPie.length ? (
                                                        <>
                                                            <div className="mt-2 h-[180px] overflow-hidden">
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <PieChart>
                                                                        <Pie
                                                                            data={jobPie}
                                                                            dataKey="value"
                                                                            nameKey="name"
                                                                            innerRadius={46}
                                                                            outerRadius={72}
                                                                            paddingAngle={2}
                                                                        >
                                                                            {jobPie.map((entry) => (
                                                                                <Cell
                                                                                    key={entry.key}
                                                                                    fill={JOB_COLORS[entry.key] || '#B9B9B9'}
                                                                                    stroke="none"
                                                                                />
                                                                            ))}
                                                                        </Pie>
                                                                        <Tooltip
                                                                            contentStyle={{
                                                                                fontSize: 12,
                                                                                borderRadius: 10,
                                                                                border: '1px solid oklch(0.922 0 0)',
                                                                            }}
                                                                        />
                                                                    </PieChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                            <ul className="mt-2 space-y-2">
                                                                {jobPie.map((entry) => (
                                                                    <li
                                                                        key={entry.key}
                                                                        className="flex items-center justify-between gap-3 text-[12px]"
                                                                    >
                                                                        <span className="flex items-center gap-2">
                                                                            <span
                                                                                className="h-2 w-2 rounded-full"
                                                                                style={{
                                                                                    backgroundColor: JOB_COLORS[entry.key] || '#B9B9B9',
                                                                                }}
                                                                            />
                                                                            <span className="font-medium text-foreground">
                                                                                {entry.name}
                                                                            </span>
                                                                        </span>
                                                                        <span className="font-semibold text-foreground">
                                                                            {entry.value}
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </>
                                                    ) : (
                                                        <p className="label-xs mt-4">{t('No publishing jobs yet.')}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Tables Row */}
                                            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                                                <div className="panel p-5 rounded-2xl border border-border/80 bg-card shadow-2xs">
                                                    <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border/50">
                                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground">
                                                            <Users size={15} weight="bold" />
                                                        </span>
                                                        <h3 className="font-heading font-semibold text-sm text-foreground">
                                                            {t('Destinations')}
                                                        </h3>
                                                    </div>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-[13px]">
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
                                                                        <td className="py-2.5 px-3 font-medium text-foreground">
                                                                            {account.name}
                                                                        </td>
                                                                        <td className="py-2.5 px-2 text-muted-foreground">
                                                                            {PLATFORM_LABEL[account.platform] || account.platform}
                                                                        </td>
                                                                        <td className="py-2.5 px-2 text-right font-medium text-foreground">
                                                                            {account.followers ? formatNumber(account.followers) : '—'}
                                                                        </td>
                                                                        <td className="py-2.5 px-2 text-right font-medium text-foreground">
                                                                            {data.perAccount[account.id] || 0}
                                                                        </td>
                                                                        <td className="py-2.5 px-3 text-right">
                                                                            <StatusBadge
                                                                                tone={CONNECTION_TONE[account.connection_status]}
                                                                            >
                                                                                {CONNECTION_LABEL[account.connection_status]}
                                                                            </StatusBadge>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                <div className="panel p-5 rounded-2xl border border-border/80 bg-card shadow-2xs">
                                                    <div className="flex items-center gap-2 pb-3 mb-1 border-b border-border/50">
                                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground">
                                                            <Stack size={15} weight="bold" />
                                                        </span>
                                                        <div>
                                                            <h3 className="font-heading font-semibold text-sm text-foreground">
                                                                {t('Pillar concentration')}
                                                            </h3>
                                                            <p className="label-xs text-muted-foreground mt-0.5">
                                                                {t('Where published and planned content is concentrated.')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <ul className="mt-3 space-y-3">
                                                        {[...data.pillarRows]
                                                            .sort((a, b) => b.count - a.count)
                                                            .map((row) => {
                                                                const share = percent(row.count, pillarTotals);
                                                                return (
                                                                    <li key={row.pillar_id || 'unassigned'}>
                                                                        <div className="flex items-center justify-between gap-3 text-[13px]">
                                                                            <span className="font-medium text-foreground truncate">
                                                                                {data.pillarMap[row.pillar_id] || t('Unassigned')}
                                                                            </span>
                                                                            <span className="label-xs font-semibold text-foreground">
                                                                                {formatNumber(row.count)} · {share}%
                                                                            </span>
                                                                        </div>
                                                                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted/60">
                                                                            <div
                                                                                className="h-full rounded-full bg-[#ffd631] transition-all duration-300"
                                                                                style={{ width: `${share}%` }}
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
                        </>
            )}
                    </>
                    );
}
