import { Link } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { formatNumber, formatDateTime } from '@/lib/format';
import {
    FacebookLogo,
    Stack,
    TrendUp,
    ThumbsUp,
    ChatDots,
    ShareFat,
    ArrowSquareOut,
    CheckCircle,
    Article,
    Clock,
} from '@phosphor-icons/react';

export const metricValue = (metric) =>
    metric?.value === null || metric?.value === undefined ? '—' : formatNumber(metric.value);

export default function PerformanceTables({ report, timezone }) {
    const { t } = useTranslation();
    const metrics = ['reactions', 'comments', 'shares'];
    const labels = { reactions: 'Reactions', comments: 'Comments', shares: 'Shares' };
    const metricIcons = {
        reactions: <ThumbsUp size={13} weight="bold" className="text-neutral-700 shrink-0" />,
        comments: <ChatDots size={13} weight="bold" className="text-neutral-700 shrink-0" />,
        shares: <ShareFat size={13} weight="bold" className="text-neutral-700 shrink-0" />,
    };

    function renderComparisonTable(groups, title, isPage = false) {
        const totalPublications = groups.reduce((acc, g) => acc + (g.publications || 0), 0) || 1;

        return (
            <section className="panel p-5 min-w-0 rounded-2xl border border-border/80 bg-card space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                    <div className="flex items-center gap-2.5">
                        {/* Monochrome Neutral Icon Box */}
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-300 bg-white text-neutral-900 shadow-2xs">
                            {isPage ? <FacebookLogo size={18} weight="fill" /> : <Stack size={18} weight="bold" />}
                        </span>
                        <div>
                            <h3 className="font-heading font-semibold text-sm text-foreground">{t(title)}</h3>
                        </div>
                    </div>
                    <span
                        className={`label-xs font-semibold px-2 py-0.5 rounded-md border ${
                            isPage
                                ? 'bg-blue-500/10 text-blue-800 border-blue-500/25'
                                : 'bg-purple-500/10 text-purple-800 border-purple-500/25'
                        }`}
                    >
                        {groups.length} {isPage ? t('Pages') : t('All pillars').toLowerCase()}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border/60 text-left bg-muted/30">
                                <th className="py-2.5 px-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider rounded-l-lg">
                                    {t('Name')}
                                </th>
                                <th className="py-2.5 px-2 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider text-right">
                                    {t('Published deliveries')}
                                </th>
                                <th className="py-2.5 px-2 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider text-center">
                                    {t('measured')}
                                </th>
                                {metrics.map((name, idx) => (
                                    <th
                                        key={name}
                                        className={`py-2.5 px-2 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider text-right ${
                                            idx === metrics.length - 1 ? 'rounded-r-lg pr-3' : ''
                                        }`}
                                    >
                                        <div className="inline-flex items-center justify-end gap-1.5">
                                            {metricIcons[name]}
                                            <span>{t(labels[name])}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {groups.map((group) => {
                                const measuredCount = group.totals?.reactions?.measured || 0;
                                const pct = Math.round((group.publications / totalPublications) * 100);

                                return (
                                    <tr key={group.id} className="hover:bg-muted/20 transition-colors">
                                        {/* Name + Proportional bar */}
                                        <td className="py-3 px-3 font-medium text-foreground min-w-36">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="h-2 w-2 rounded-full shrink-0 bg-neutral-400" />
                                                <span className="truncate">{group.name || t('Unassigned')}</span>
                                            </div>
                                            {/* Micro volume distribution bar - Monochrome */}
                                            <div className="mt-1.5 h-1.5 w-full max-w-28 rounded-full bg-neutral-100 overflow-hidden">
                                                <div
                                                    className="h-full bg-neutral-900 rounded-full transition-all"
                                                    style={{ width: `${Math.max(8, pct)}%` }}
                                                />
                                            </div>
                                        </td>

                                        {/* Published deliveries */}
                                        <td className="py-3 px-2 text-right font-medium text-foreground whitespace-nowrap">
                                            <div className="font-semibold">{formatNumber(group.publications)}</div>
                                            <div className="text-[10px] text-muted-foreground font-medium mt-0.5">{pct}%</div>
                                        </td>

                                        {/* Measured Ratio Badge */}
                                        <td className="py-3 px-2 text-center whitespace-nowrap">
                                            <span
                                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                                    measuredCount > 0
                                                        ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25'
                                                        : 'bg-muted/70 text-muted-foreground border-border/60'
                                                }`}
                                            >
                                                {measuredCount}/{group.publications}
                                            </span>
                                        </td>

                                        {/* Metrics columns */}
                                        {metrics.map((name) => (
                                            <td key={name} className="py-3 px-2 text-right whitespace-nowrap">
                                                <span className="font-semibold text-foreground">
                                                    {metricValue(group.totals[name])}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        );
    }

    return (
        <div className="space-y-5">
            {/* Comparison Grid: Pages & Pillars */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {renderComparisonTable(report.accounts, 'Page performance', true)}
                {renderComparisonTable(report.pillars, 'Pillar performance', false)}
            </div>

            {/* Detailed Publications Table */}
            <section className="panel p-5 min-w-0 rounded-2xl border border-border/80 bg-card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/50">
                    <div className="flex items-center gap-2.5">
                        {/* Monochrome Neutral Icon Box */}
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-neutral-900 border border-neutral-300 shadow-2xs">
                            <TrendUp size={18} weight="bold" />
                        </span>
                        <div>
                            <h3 className="font-heading font-semibold text-sm text-foreground">
                                {t('Top publications by reactions')}
                            </h3>
                            <p className="label-xs text-muted-foreground mt-0.5">
                                {t('Up to 50 publications. Counts are lifetime totals, not interactions during the selected dates.')}
                            </p>
                        </div>
                    </div>
                    <span className="label-xs text-neutral-900 font-semibold bg-white border border-neutral-300 px-2.5 py-1 rounded-md">
                        {report.rows.length} {t('Content').toLowerCase()}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border/60 text-left bg-muted/30">
                                <th className="py-2.5 px-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider rounded-l-lg min-w-52">
                                    {t('Post')}
                                </th>
                                <th className="py-2.5 px-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider min-w-32">
                                    {t('Page')} & {t('Pillar')}
                                </th>
                                {metrics.map((name) => (
                                    <th
                                        key={name}
                                        className="py-2.5 px-2 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider text-right"
                                    >
                                        <div className="inline-flex items-center justify-end gap-1.5">
                                            {metricIcons[name]}
                                            <span>{t(labels[name])}</span>
                                        </div>
                                    </th>
                                ))}
                                <th className="py-2.5 px-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider text-right rounded-r-lg min-w-28">
                                    {t('Last checked')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {report.rows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-muted-foreground label-xs">
                                        {t('Chưa có bài đăng nào có dữ liệu. Bấm "Cập nhật 3 bài tiếp theo" ở trên để đồng bộ số liệu từ Facebook.')}
                                    </td>
                                </tr>
                            ) : (
                                report.rows.map((row) => (
                                    <tr key={row.attemptId} className="hover:bg-muted/20 transition-colors">
                                        {/* Post info */}
                                        <td className="py-3 px-3 min-w-52">
                                            <div className="flex items-start gap-2.5">
                                                <Article size={17} weight="duotone" className="text-neutral-700 shrink-0 mt-0.5" />
                                                <div className="min-w-0">
                                                    <Link
                                                        className="font-medium text-foreground hover:underline line-clamp-1"
                                                        to={'/posts?post=' + row.postId}
                                                    >
                                                        {row.title}
                                                    </Link>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <span className="label-xs text-muted-foreground/75">
                                                            {formatDateTime(row.publishedAt, timezone)}
                                                        </span>
                                                        {row.publishedUrl && (
                                                            <a
                                                                href={row.publishedUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 text-[11px] text-neutral-900 hover:underline font-semibold"
                                                            >
                                                                <span>Xem trên Facebook</span>
                                                                <ArrowSquareOut size={12} weight="bold" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Page & Pillar Badge */}
                                        <td className="py-3 px-3 min-w-32">
                                            <div className="flex items-center gap-1.5 font-medium text-foreground truncate">
                                                <FacebookLogo size={14} weight="fill" className="text-neutral-700 shrink-0" />
                                                <span className="truncate">{row.pageName}</span>
                                            </div>
                                            <span
                                                className={`inline-block mt-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                                                    row.pillarName
                                                        ? 'bg-purple-500/10 text-purple-800 border-purple-500/25'
                                                        : 'bg-amber-500/10 text-amber-900 border-amber-500/25'
                                                }`}
                                            >
                                                {row.pillarName || t('Unassigned')}
                                            </span>
                                        </td>

                                        {/* Metrics columns */}
                                        {metrics.map((name) => (
                                            <td key={name} className="px-2 py-3 text-right whitespace-nowrap">
                                                <span className="font-semibold text-foreground">
                                                    {metricValue(row.metrics[name])}
                                                </span>
                                                {row.metrics[name].stale && (
                                                    <p className="label-xs text-muted-foreground mt-0.5">{t('Previous data')}</p>
                                                )}
                                                {row.metrics[name].error && (
                                                    <p className="label-xs text-neutral-600 mt-0.5">
                                                        {t(
                                                            row.metrics[name].error ===
                                                                'user_content_permission_required'
                                                                ? 'Reconnect Facebook and grant pages_read_user_content'
                                                                : row.metrics[name].error === 'permission_required'
                                                                ? 'Check Facebook permissions'
                                                                : 'Metric unavailable'
                                                        )}
                                                    </p>
                                                )}
                                            </td>
                                        ))}

                                        {/* Last checked / Sync state */}
                                        <td className="px-3 py-3 text-right text-muted-foreground whitespace-nowrap">
                                            {row.checkedAt ? (
                                                <span className="inline-flex items-center justify-end gap-1.5 text-xs text-emerald-800 bg-emerald-500/10 border border-emerald-500/25 rounded-md px-2 py-0.5 font-medium">
                                                    <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                                                    <span>{formatDateTime(new Date(row.checkedAt).toISOString(), timezone)}</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[10px] text-amber-900 font-semibold">
                                                    <Clock size={12} weight="fill" className="text-amber-600" />
                                                    {t('Not synced')}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
