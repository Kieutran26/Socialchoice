import { useEffect,useMemo,useRef,useState } from 'react';
import { ArrowsClockwise,ChartBar } from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { toZonedParts,toUtcIso,addDays,todayInZone } from '@/lib/tz';
import StatCard from '../common/StatCard';
import EmptyState from '../common/EmptyState';
import { Input } from '../ui/input';
import PerformanceTables,{metricValue} from './PerformanceTables';

export default function FacebookPerformance({scope,timezone}) {
    const {t}=useTranslation();
    const [dates,setDates]=useState(()=>({from:toZonedParts(new Date(Date.now()-29*86400000).toISOString(),timezone).date,to:todayInZone(timezone)}));
    const [accountId,setAccountId]=useState(''),[pillarId,setPillarId]=useState('');
    const [accounts,setAccounts]=useState([]),[pillars,setPillars]=useState([]);
    const [report,setReport]=useState(null),[loading,setLoading]=useState(false),[refreshing,setRefreshing]=useState(false),[error,setError]=useState(''),[reloadKey,setReloadKey]=useState(0);
    const generation=useRef(0);
    const options=useMemo(()=>{try{return {brandId:scope.brand_id||'',accountId,pillarId,start:toUtcIso(dates.from,'00:00',timezone),end:toUtcIso(addDays(dates.to,1),'00:00',timezone)};}catch{return null;}},[scope.brand_id,accountId,pillarId,dates,timezone]);
    useEffect(()=>{
        if(scope.is_demo)return;
        let active=true;
        Promise.all([appClient.entities.SocialAccount.filter({...scope,platform:'facebook'},{limit:300,sort:'name'}),appClient.entities.ContentPillar.filter(scope,{limit:300,sort:'name'})]).then(([a,p])=>{if(active){setAccounts(a.items);setPillars(p.items);}}).catch(e=>{if(active)setError(e.message);});
        return ()=>{active=false;};
    },[scope]);
    useEffect(()=>{
        const current=++generation.current;
        setRefreshing(false);setLoading(false);setReport(null);setError('');
        if(scope.is_demo)return;
        if(!options?.start||!options.end){setError('Choose a valid metrics date range of up to one year');return;}
        setLoading(true);
        appClient.metrics.list(options).then(result=>{if(current===generation.current)setReport(result);}).catch(e=>{if(current===generation.current)setError(e.message);}).finally(()=>{if(current===generation.current)setLoading(false);});
        return ()=>{generation.current++;};
    },[options,scope.is_demo,reloadKey]);
    useEffect(()=>{if(!report?.ready||report.pending>0||!report.total)return;const timer=setTimeout(()=>setReloadKey(key=>key+1),61000);return()=>clearTimeout(timer);},[report]);
    async function refresh() {
        const current=generation.current;setRefreshing(true);setError('');
        try{const result=await appClient.metrics.refresh(options);if(current===generation.current)setReport(result);}catch(e){if(current===generation.current)setError(e.message);}finally{if(current===generation.current)setRefreshing(false);}
    }
    if(scope.is_demo)return <section className="panel p-5 mb-5"><h2>{t('Facebook post performance')}</h2><p className="label-xs mt-2">{t('Real Facebook metrics are available only in the live workspace. Sample data is not platform evidence.')}</p></section>;
    return <section className="space-y-5 mb-8" aria-label={t('Facebook post performance')}>
        <div className="panel p-5"><div className="flex flex-wrap gap-3 items-start justify-between"><div className="min-w-0"><h2 className="text-lg">{t('Facebook post performance')}</h2><p className="label-xs mt-2">{t('Publication dates filter your posts. Metrics are the latest available lifetime counts from Facebook.')}</p></div><button type="button" className="btn-skew" disabled={loading||refreshing||!report?.ready||!report?.total||report.pending===0} onClick={refresh}><ArrowsClockwise size={16}/>{t(refreshing?'Refreshing metrics…':'Refresh next 3 publications')}</button></div>
            <div className="grid grid-cols-1 gap-3 mt-4 sm:grid-cols-2 xl:grid-cols-4">
                <label className="text-xs">{t('Published from')}<Input aria-label={t('Published from')} className="mt-2" type="date" value={dates.from} onChange={e=>setDates({...dates,from:e.target.value})}/></label>
                <label className="text-xs">{t('Published through')}<Input aria-label={t('Published through')} className="mt-2" type="date" value={dates.to} onChange={e=>setDates({...dates,to:e.target.value})}/></label>
                <label className="text-xs">{t('Page')}<select aria-label={t('Page')} className="w-full mt-2 border rounded-lg p-2 bg-background" value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">{t('All Pages')}</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
                <label className="text-xs">{t('Pillar')}<select aria-label={t('Pillar')} className="w-full mt-2 border rounded-lg p-2 bg-background" value={pillarId} onChange={e=>setPillarId(e.target.value)}><option value="">{t('All pillars')}</option>{pillars.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            </div><p className="label-xs mt-3">{timezone} · {t('Unavailable metrics stay blank. Reach, views and engagement rates are not collected.')}</p>
            {report&&!report.ready&&<p className="label-xs mt-2">{t('Configure Meta before refreshing metrics')}</p>}
            {report?.pending>0&&<p className="label-xs mt-2">{t('{count} publications ready to refresh',{count:report.pending})}</p>}
            {report?.pending===0&&report.total>0&&<p className="label-xs mt-2">{t('Refresh has a one-minute cooldown per publication. Availability updates automatically.')}</p>}
            {report?.limited&&<p role="status" className="text-xs text-warnFg mt-2">{t('Showing at most 1000 confirmed publications. Narrow the date range for complete totals.')}</p>}
            {report?.stale>0&&<p className="label-xs text-warnFg mt-2">{t('{count} publications include previous data. Check the metric timestamp and access status.',{count:report.stale})}</p>}
            {error&&<p role="alert" className="text-xs text-dangerFg mt-3">{t(error)}</p>}
        </div>
        {loading&&<p role="status" className="label-xs">{t('Loading the latest numbers…')}</p>}
        {report?.total===0&&<EmptyState icon={ChartBar} title={t('No confirmed Facebook publications in this range')} description={t('Only posts published through Socialchoice with a confirmed Facebook ID appear here. One connected Page is enough.')}/>}
        {!!report?.total&&<><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label={t('Published deliveries')} value={report.total}/>{['reactions','comments','shares'].map((name,index)=><StatCard key={name} label={t(['Reactions','Comments','Shares'][index])} value={metricValue(report.totals[name])} hint={t('{measured} of {total} publications measured',{measured:report.totals[name].measured,total:report.total})}/>)}</div><PerformanceTables report={report} timezone={timezone}/></>}
    </section>;
}
