import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    PlugsConnected,
    CalendarDots,
    CheckCircle,
    WarningCircle,
    PaperPlaneTilt,
    SquaresFour,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import EmptyState from '@/components/common/EmptyState';
import UpcomingSchedule from '@/components/overview/UpcomingSchedule';
import RecentActivity from '@/components/overview/RecentActivity';
import DistributionPanel from '@/components/overview/DistributionPanel';
import { Skeleton } from '@/components/ui/skeleton';

export default function Overview() {
    const { t } = useTranslation();
    const { scope, brands, switchMode, seeding } = useWorkspace();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        const [statusAgg, pillarAgg, angleAgg, accounts, upcoming, logs, pillars, angles] = await Promise.all([
            appClient.entities.Post.aggregate({ query: scope, groupBy: 'status' }),
            appClient.entities.Post.aggregate({ query: scope, groupBy: 'pillar_id' }),
            appClient.entities.Post.aggregate({ query: scope, groupBy: 'angle_id' }),
            appClient.entities.SocialAccount.filter(scope, { limit: 200 }),
            appClient.entities.Post.filter(
                { ...scope, status: { $in: ['scheduled', 'processing'] } },
                { sort: 'scheduled_at', limit: 6 },
            ),
            appClient.entities.PublishingLog.filter(scope, { sort: '-occurred_at', limit: 8 }),
            appClient.entities.ContentPillar.filter(scope, { limit: 300 }),
            appClient.entities.ContentAngle.filter(scope, { limit: 500 }),
        ]);

        const byStatus = {};
        statusAgg.rows.forEach((row) => {
            byStatus[row.status] = row.count;
        });
        const total = Object.values(byStatus).reduce((sum, value) => sum + value, 0);

        setData({
            byStatus,
            total,
            accounts: accounts.items,
            upcoming: upcoming.items,
            logs: logs.items,
            pillarRows: pillarAgg.rows,
            angleRows: angleAgg.rows,
            pillarMap: Object.fromEntries(pillars.items.map((p) => [p.id, p])),
            angleMap: Object.fromEntries(angles.items.map((a) => [a.id, a])),
        });
        setLoading(false);
    }, [scope]);

    useEffect(() => {
        load();
    }, [load]);

    const connected = data?.accounts.filter((a) => a.connection_status === 'connected').length || 0;
    const demoAccounts = data?.accounts.filter((a) => a.connection_status === 'demo').length || 0;
    const hasContent = (data?.total || 0) > 0 || (data?.accounts.length || 0) > 0;

    return (
        <>
            <PageHeader
                title={t("Overview")}
                description={t("Saved content, calendar plans and content distribution in this workspace.")}
            />

            {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[0, 1, 2, 3].map((key) => (
                        <Skeleton key={key} className="h-[104px] rounded-2xl" />
                    ))}
                </div>
            ) : !hasContent ? (
                <EmptyState
                    icon={SquaresFour}
                    title={t("Your workspace is empty")}
                    description={t("Create a brand in Settings to start writing drafts and planning your calendar. The optional sample workspace is simulation only and never touches Meta.")}
                >
                    <button type="button" className="btn-skew" onClick={() => switchMode(true)} disabled={seeding}>
                        <SquaresFour size={15} weight="fill" />
                        {seeding ? t("Preparing sample data…") : t("Load sample workspace")}
                    </button>
                    <Link to="/accounts" className="rounded-lg border border-border px-4 py-2 text-[13px] hover:bg-surface"> {t("Manage destination references")} </Link>
                    <Link to="/create" className="rounded-lg border border-border px-4 py-2 text-[13px] hover:bg-surface"> {t("Create your first post")} </Link>
                </EmptyState>
            ) : (
                <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label={t("Connected accounts")}
                            value={connected}
                            hint={demoAccounts ? t("{value1} demo pages in this view", {value1: demoAccounts}) : t("Facebook Pages with a live connection")}
                            icon={PlugsConnected}
                        />
                        <StatCard
                            label={t("Scheduled posts")}
                            value={data.byStatus.scheduled || 0}
                            hint={t("{value1} currently processing", {value1: data.byStatus.processing || 0})}
                            icon={CalendarDots}
                        />
                        <StatCard
                            label={t("Published posts")}
                            value={data.byStatus.published || 0}
                            hint={t("Confirmed by the destination platform")}
                            icon={CheckCircle}
                        />
                        <StatCard
                            label={t("Failed posts")}
                            value={data.byStatus.failed || 0}
                            hint={t("{value1} partially published", {value1: data.byStatus.partially_published || 0})}
                            icon={WarningCircle}
                        />
                    </div>

                    <div className="grid gap-5 xl:grid-cols-2">
                        <UpcomingSchedule posts={data.upcoming} brands={brands} />
                        <RecentActivity logs={data.logs} />
                    </div>

                    <DistributionPanel
                        pillarRows={data.pillarRows}
                        angleRows={data.angleRows}
                        pillarMap={data.pillarMap}
                        angleMap={data.angleMap}
                        total={data.total}
                    />

                    {data.byStatus.draft ? (
                        <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
                            <div>
                                <p className="text-[13px] font-medium">{data.byStatus.draft} {t("drafts waiting")}</p>
                                <p className="label-xs mt-1">{t("Finish them off or schedule them for the coming weeks.")}</p>
                            </div>
                            <Link to="/posts?status=draft" className="btn-skew">
                                <PaperPlaneTilt size={15} weight="fill" /> {t("Review drafts")} </Link>
                        </div>
                    ) : null}
                </div>
            )}
        </>
    );
}
