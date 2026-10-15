import { Link } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { formatNumber,formatDateTime } from '@/lib/format';

export const metricValue=metric=>metric?.value===null||metric?.value===undefined?'—':formatNumber(metric.value);
export default function PerformanceTables({report,timezone}) {
    const {t}=useTranslation();
    const metrics=['reactions','comments','shares'];
    const labels={reactions:'Reactions',comments:'Comments',shares:'Shares'};
    function comparison(groups,title) {
        return <section className="panel p-5 min-w-0"><h3 className="text-[15px]">{t(title)}</h3><div className="overflow-x-auto mt-3"><table className="w-full text-xs"><thead><tr className="border-b text-left"><th className="py-2">{t('Name')}</th><th className="py-2 px-2">{t('Published deliveries')}</th>{metrics.map(name=><th className="py-2 px-2" key={name}>{t(labels[name])}</th>)}</tr></thead><tbody>{groups.map(group=><tr className="border-b" key={group.id}><td className="py-3 pr-2">{group.name||t('Unassigned')}</td><td className="px-2">{formatNumber(group.publications)}</td>{metrics.map(name=><td className="px-2 whitespace-nowrap" key={name}>{metricValue(group.totals[name])}<p className="label-xs">{group.totals[name].measured}/{group.publications} {t('measured')}</p></td>)}</tr>)}</tbody></table></div></section>;
    }
    return <div className="space-y-5">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">{comparison(report.accounts,'Page performance')}{comparison(report.pillars,'Pillar performance')}</div>
        <section className="panel p-5 min-w-0"><h3 className="text-[15px]">{t('Top publications by reactions')}</h3><p className="label-xs mt-1">{t('Up to 50 publications. Counts are lifetime totals, not interactions during the selected dates.')}</p>
            <div className="overflow-x-auto mt-3"><table className="w-full text-xs"><thead><tr className="border-b text-left"><th className="py-2 pr-3">{t('Post')}</th><th className="py-2 pr-3">{t('Page')}</th>{metrics.map(name=><th className="py-2 px-2" key={name}>{t(labels[name])}</th>)}<th className="py-2 px-2">{t('Last checked')}</th></tr></thead><tbody>{report.rows.map(row=><tr className="border-b" key={row.attemptId}>
                <td className="py-3 pr-3 min-w-36"><Link className="underline" to={'/posts?post='+row.postId}>{row.title}</Link><p className="label-xs mt-1">{formatDateTime(row.publishedAt,timezone)}</p>{row.publishedUrl&&<a href={row.publishedUrl} target="_blank" rel="noreferrer" className="block mt-1 underline">{t('View published post')}</a>}</td><td className="py-3 pr-3 min-w-28">{row.pageName}<p className="label-xs mt-1">{row.pillarName||t('Unassigned')}</p></td>
                {metrics.map(name=><td key={name} className="px-2 py-3 whitespace-nowrap">{metricValue(row.metrics[name])}{row.metrics[name].stale&&<p className="label-xs text-warnFg">{t('Previous data')}</p>}{row.metrics[name].error&&<p className="label-xs text-dangerFg">{t(row.metrics[name].error==='user_content_permission_required'?'Reconnect Facebook and grant pages_read_user_content':row.metrics[name].error==='permission_required'?'Check Facebook permissions':'Metric unavailable')}</p>}{row.metrics[name].updatedAt&&<p className="label-xs">{formatDateTime(new Date(row.metrics[name].updatedAt).toISOString(),timezone)}</p>}</td>)}
                <td className="px-2 py-3">{row.checkedAt?formatDateTime(new Date(row.checkedAt).toISOString(),timezone):t('Not synced')}</td>
            </tr>)}</tbody></table></div>
        </section>
    </div>;
}
