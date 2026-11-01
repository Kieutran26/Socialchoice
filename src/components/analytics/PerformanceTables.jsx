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
} from '@phosphor-icons/react';

        export const metricValue = (metric) =>
            metric?.value === null || metric?.value === undefined ? '—' : formatNumber(metric.value);

        export default function PerformanceTables({ report, timezone }) {
            const { t } = useTranslation();
            const metrics = ['reactions', 'comments', 'shares'];
            const labels = { reactions: 'Reactions', comments: 'Comments', shares: 'Shares' };
            const metricIcons = {
                reactions: <ThumbsUp size={12} weight="duotone" className="text-blue-500 shrink-0" />,
                comments: <ChatDots size={12} weight="duotone" className="text-indigo-500 shrink-0" />,
                shares: <ShareFat size={12} weight="duotone" className="text-amber-500 shrink-0" />,
            };

            function renderComparisonTable(groups, title, isPage = false) {
                return (
                    <section className="panel p-5 min-w-0 rounded-2xl border border-border/80 bg-card shadow-2xs">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
                            <div className="flex items-center gap-2">
                                <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${isPage ? 'bg-blue-50 text-[#1877F2]' : 'bg-muted text-foreground'}`}>
                                    {isPage ? <FacebookLogo size={15} weight="fill" /> : <Stack size={15} weight="bold" />}
                                </span>
                                <h3 className="font-heading font-semibold text-sm text-foreground">{t(title)}</h3>
                            </div>
                            <span className="label-xs text-muted-foreground font-medium">
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
                                        {metrics.map((name, idx) => (
                                            <th
                                                key={name}
                                                className={`py-2.5 px-2 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider text-right ${idx === metrics.length - 1 ? 'rounded-r-lg pr-3' : ''
                                                    }`}
                                            >
                                                <div className="inline-flex items-center justify-end gap-1">
                                                    {metricIcons[name]}
                                                    <span>{t(labels[name])}</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {groups.map((group) => (
                                        <tr key={group.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-3 px-3 font-medium text-foreground">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className="h-2 w-2 rounded-full shrink-0"
                                                        style={{ backgroundColor: group.color || '#9ca3af' }}
                                                    />
                                                    <span className="truncate">{group.name || t('Unassigned')}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 text-right font-medium text-foreground">
                                                {formatNumber(group.publications)}
                                            </td>
                                            {metrics.map((name) => (
                                                <td key={name} className="py-3 px-2 text-right whitespace-nowrap">
                                                    <div className="font-medium text-foreground">
                                                        {metricValue(group.totals[name])}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                                                        {group.totals[name].measured}/{group.publications} {t('measured')}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                );
            }

            return (
                <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                        {renderComparisonTable(report.accounts, 'Page performance', true)}
                        {renderComparisonTable(report.pillars, 'Pillar performance', false)}
                    </div>

                    <section className="panel p-5 min-w-0 rounded-2xl border border-border/80 bg-card shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-border/50">
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                                    <TrendUp size={16} weight="bold" />
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
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border/60 text-left bg-muted/30">
                                        <th className="py-2.5 px-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider rounded-l-lg min-w-44">
                                            {t('Post')}
                                        </th>
                                        <th className="py-2.5 px-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider min-w-32">
                                            {t('Page')}
                                        </th>
                                        {metrics.map((name) => (
                                            <th
                                                key={name}
                                                className="py-2.5 px-2 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider text-right"
                                            >
                                                <div className="inline-flex items-center justify-end gap-1">
                                                    {metricIcons[name]}
                                                    <span>{t(labels[name])}</span>
                                                </div>
                                            </th>
                                        ))}
                                        <th className="py-2.5 px-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider text-right rounded-r-lg">
                                            {t('Last checked')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {report.rows.map((row) => (
                                        <tr key={row.attemptId} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-3 px-3 min-w-44">
                                                <div className="flex items-start gap-2">
                                                    <Article size={15} className="text-muted-foreground shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <Link
                                                            className="font-medium text-foreground hover:underline line-clamp-1"
                                                            to={'/posts?post=' + row.postId}
                                                        >
                                                            {row.title}
                                                        </Link>
                                                        <p className="label-xs text-muted-foreground/75 mt-0.5">
                                                            {formatDateTime(row.publishedAt, timezone)}
                                                        </p>
                                                        {row.publishedUrl && (
                                                            <a
                                                                href={row.publishedUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 text-[11px] text-[#1877F2] hover:underline mt-1 font-medium"
                                                            >
                                                                <span>{t('View published post')}</span>
                                                                <ArrowSquareOut size={11} />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 min-w-32">
                                                <div className="font-medium text-foreground truncate">{row.pageName}</div>
                                                <span className="inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                                                    {row.pillarName || t('Unassigned')}
                                                </span>
                                            </td>
                                            {metrics.map((name) => (
                                                <td key={name} className="px-2 py-3 text-right whitespace-nowrap">
                                                    <span className="font-semibold text-foreground">
                                                        {metricValue(row.metrics[name])}
                                                    </span>
                                                    {row.metrics[name].stale && (
                                                        <p className="label-xs text-warnFg">{t('Previous data')}</p>
                                                    )}
                                                    {row.metrics[name].error && (
                                                        <p className="label-xs text-dangerFg">
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
                                            <td className="px-3 py-3 text-right text-muted-foreground whitespace-nowrap">
                                                {row.checkedAt ? (
                                                    <div className="flex items-center justify-end gap-1 text-xs">
                                                        <CheckCircle size={12} weight="bold" className="text-emerald-500" />
                                                        <span>{formatDateTime(new Date(row.checkedAt).toISOString(), timezone)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                                        {t('Not synced')}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            );
        }
