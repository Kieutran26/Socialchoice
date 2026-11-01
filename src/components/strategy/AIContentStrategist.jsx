import { useState, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import PlatformBadge from '@/components/common/PlatformBadge';
import { applyPlanToCalendar, editPlanItem, summarizePlan } from '@/lib/ai-content-strategist';
import { Sparkle, ArrowsClockwise, PencilSimple, Trash, CheckSquareOffset } from '@phosphor-icons/react';

const platforms = ['facebook','instagram','linkedin','tiktok','threads'];
const frequencyFor = value => ({'1 bài/ngày':'1_per_day','2 bài/ngày':'2_per_day','3 bài/tuần':'3_per_week','5 bài/tuần':'5_per_week'}[value] || (['1_per_day','2_per_day','3_per_week','5_per_week'].includes(value)?value:'1_per_day'));

export default function AIContentStrategist({brand,pillars=[],angles=[],assets=[],appClient,onPlanApplied}) {
    const {t,language}=useTranslation(),{toast}=useToast();
    const [days,setDays]=useState(30),[frequency,setFrequency]=useState(frequencyFor(brand?.posting_frequency));
    const [selected,setSelected]=useState(['facebook']),[plan,setPlan]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
    const [view,setView]=useState('cards'),[search,setSearch]=useState(''),[editing,setEditing]=useState(null),[form,setForm]=useState(null);
    const [confirmation,setConfirmation]=useState(null);
    const lock=useRef(false), request=useRef(null);
    const activePillars=pillars.filter(p=>p.brand_id===brand?.id&&p.status!=='archived');
    const activeAngles=angles.filter(a=>a.brand_id===brand?.id&&a.status!=='archived');
    const enough=assets.length>=20;
    async function generate(item=null) {
        if(lock.current)return;
        lock.current=true;setBusy(true);setError('');
        // Keep the request ID after uncertain transport failures. A fresh paid request needs a new confirmation.
        const intent=JSON.stringify([brand.id,days,frequency,selected,language,item?.id,item?.time,item?.platform,plan?.id]);
        if(request.current?.intent!==intent)request.current={intent,id:crypto.randomUUID()};
        try {
            const result=await appClient.autopilot.call(item?'strategyRegenerate':'strategyGenerate',{
                brand_id:brand.id,request_id:request.current.id,confirmed:true,language,
                ...(item?{plan_id:plan.id,item_id:item.id,slot:{time:item.time,platform:item.platform}}:{options:{days,frequency,platforms:selected}}),
            });
            setPlan(item?summarizePlan({...plan,posts:plan.posts.map(p=>p.id===item.id?result.posts[0]:p)}):result);
            request.current=null;setConfirmation(null);
        }catch(e){setError(e.message);throw e;}finally{lock.current=false;setBusy(false);}
    }
    async function apply() {
        if(lock.current||!plan)return;
        lock.current=true;setBusy(true);setError('');
        try{const posts=await applyPlanToCalendar({plan,brand,appClient});setPlan({...plan,applied:true});onPlanApplied?.(posts);}
        catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}
    }
    function openEdit(item){setEditing(item);setForm({title:item.title,caption:item.caption,pillar_id:item.pillar.id,angle_id:item.angle.id,platform:item.platform,time:item.time,asset_id:item.asset?.id||'',reason:item.reason});}
    function saveEdit(){try{const updated=editPlanItem(editing,form,{brand,pillars:choices,angles:allAngles,assets});setPlan(summarizePlan({...plan,posts:plan.posts.map(p=>p.id===updated.id?updated:p)}));setEditing(null);}catch(e){toast({variant:'destructive',title:t(e.message)});}}
    const rows=plan?.posts.filter(p=>[p.title,p.caption,p.pillar.name,p.angle.name].join(' ').toLowerCase().includes(search.toLowerCase()))||[];
    const choices=[...new Map([...activePillars,...(plan?.posts.filter(p=>p.pillar.is_virtual).map(p=>p.pillar)||[])].map(p=>[p.id,p])).values()];
    const allAngles=[...new Map([...activeAngles,...(plan?.posts.filter(p=>p.angle.is_virtual).map(p=>p.angle)||[])].map(a=>[a.id,a])).values()];
    const angleChoices=form?allAngles.filter(a=>a.pillar_id===form.pillar_id):[];
    return <div className="space-y-5">
        {error&&<p role="alert" className="panel p-4 text-dangerFg">{t(error)}</p>}
        <section className="panel p-5 space-y-4" aria-busy={busy}>
            <h2 className="text-[15px] flex items-center gap-2"><Sparkle size={18}/>{t('AI Content Strategist')}</h2>
            <p className="text-sm text-muted-foreground">{t('Strategy uses your configured AI provider and eligible assets. Review every suggestion before saving drafts.')}</p>
            <p className="text-sm">{t('{count} eligible assets. At least 20 are required.',{count:assets.length})}</p>
            {!enough&&<p className="text-sm text-muted-foreground">{t('Import and approve image analysis in Media Library, or upload your own images. Sample URLs do not count.')}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label htmlFor="strategy-days">{t('Plan duration')}</Label><select id="strategy-days" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={days} disabled={busy} onChange={e=>setDays(Number(e.target.value))}>{[7,14,30].map(n=><option key={n} value={n}>{t('{days} days',{days:n})}</option>)}</select></div>
                <div className="space-y-1.5"><Label htmlFor="strategy-frequency">{t('Posting frequency')}</Label><select id="strategy-frequency" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={frequency} disabled={busy} onChange={e=>setFrequency(e.target.value)}>{[['1_per_day','1 post / day'],['2_per_day','2 posts / day'],['3_per_week','3 posts / week'],['5_per_week','5 posts / week']].map(([v,label])=><option key={v} value={v}>{t(label)}</option>)}</select></div>
            </div>
            <fieldset disabled={busy}><legend className="label-xs mb-2">{t('Platforms')}</legend><div className="flex flex-wrap gap-2">{platforms.map(p=><Button key={p} variant="outline" aria-pressed={selected.includes(p)} onClick={()=>setSelected(selected.includes(p)?selected.length>1?selected.filter(v=>v!==p):selected:[...selected,p])}><PlatformBadge platform={p}/></Button>)}</div></fieldset>
            <p className="label-xs">{t('Suggested times are fixed planning defaults, not account performance predictions.')}</p>
            <div className="flex justify-end"><button type="button" className="btn-skew" disabled={busy||!enough||!!brand?.is_demo} onClick={()=>{request.current=null;setConfirmation({item:null});}}><Sparkle size={16} weight="duotone"/>{t(busy?'Generating.':'Generate plan with AI')}</button></div>
            {busy&&<p role="status" className="label-xs">{t('Processing. Keep this page open.')}</p>}
        </section>
        {plan&&<section className="space-y-4">
            <div className="panel p-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-[15px]">{t('Review {count} draft posts',{count:plan.posts.length})}</h2><button type="button" className="btn-skew" disabled={busy||plan.applied||!plan.posts.length} onClick={apply}><CheckSquareOffset size={16} weight="duotone"/>{t(plan.applied?'Applied':'Apply to calendar')}</button></div><p className="label-xs">{plan.provider} · {plan.model} · {t('Drafts only. Nothing is published automatically.')}</p><Label htmlFor="strategy-search">{t('Search plan')}</Label><Input id="strategy-search" value={search} onChange={e=>setSearch(e.target.value)}/><div className="flex gap-2"><Button variant="outline" aria-pressed={view==='cards'} onClick={()=>setView('cards')}>{t('Cards')}</Button><Button variant="outline" aria-pressed={view==='table'} onClick={()=>setView('table')}>{t('Table')}</Button></div></div>
            {view==='cards'?<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{rows.map(item=><article key={item.id} className="panel p-5 min-w-0 space-y-3"><div className="flex flex-wrap items-center gap-2 text-sm"><span>{item.date} · {item.time}</span><PlatformBadge platform={item.platform}/></div><p className="label-xs break-words">{item.pillar.name} · {item.angle.name}</p><h3 className="text-[15px] break-words">{item.title}</h3><p className="text-sm whitespace-pre-wrap break-words">{item.caption}</p>{item.asset?.file_url&&<img src={item.asset.file_url} alt={item.asset.name} className="w-full h-40 object-contain rounded-lg"/>}<p className="label-xs break-words">{item.asset?.name||t('No asset')}</p><p className="text-sm break-words">{item.reason}</p><div className="flex flex-wrap gap-2 border-t pt-3"><Button variant="ghost" disabled={busy||plan.applied} onClick={()=>{request.current=null;setConfirmation({item});}}><ArrowsClockwise size={16}/>{t('Regenerate')}</Button><Button variant="outline" disabled={busy||plan.applied} onClick={()=>openEdit(item)}><PencilSimple size={16}/>{t('Edit')}</Button><Button variant="ghost" aria-label={t('Remove post')} disabled={busy||plan.applied} onClick={()=>setPlan(summarizePlan({...plan,posts:plan.posts.filter(p=>p.id!==item.id)}))}><Trash size={16}/></Button></div></article>)}</div>:<div className="panel overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted"><tr>{['Date','Platform','Pillar','Title','Asset','Actions'].map(label=><th key={label} className="text-left p-3">{t(label)}</th>)}</tr></thead><tbody>{rows.map(item=><tr key={item.id} className="border-t"><td className="p-3 whitespace-nowrap">{item.date}<br/>{item.time}</td><td className="p-3"><PlatformBadge platform={item.platform}/></td><td className="p-3">{item.pillar.name}</td><td className="p-3 break-words">{item.title}</td><td className="p-3">{item.asset?.name||t('No asset')}</td><td className="p-3"><Button variant="outline" disabled={busy||plan.applied} onClick={()=>openEdit(item)}>{t('Edit')}</Button></td></tr>)}</tbody></table></div>}
        </section>}
        <ConfirmDialog destructive={false} open={!!confirmation} onOpenChange={open=>{if(!open&&!busy)setConfirmation(null);}} title={t('Confirm AI generation')} description={t('Brand context and asset descriptions will be sent to your configured AI provider. Provider charges may apply. No image bytes are sent. Nothing will be published.')} confirmLabel="Generate" onConfirm={()=>generate(confirmation?.item)}/>
        <Dialog open={!!editing} onOpenChange={open=>{if(!open)setEditing(null);}}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{t('Edit draft suggestion')}</DialogTitle></DialogHeader>{form&&<div className="space-y-4">
            <div><Label htmlFor="strategy-title">{t('Title')}</Label><Input id="strategy-title" maxLength={200} value={form.title} onChange={e=>setForm(previous=>({...previous,title:e.target.value}))}/></div>
            <div><Label htmlFor="strategy-caption">{t('Caption')}</Label><Textarea id="strategy-caption" rows={5} maxLength={20000} value={form.caption} onChange={e=>setForm(previous=>({...previous,caption:e.target.value}))}/></div>
            <div><Label htmlFor="strategy-pillar">{t('Pillar')}</Label><select id="strategy-pillar" className="w-full border border-input rounded-lg p-2 text-sm" value={form.pillar_id} onChange={e=>{const id=e.target.value;setForm(previous=>({...previous,pillar_id:id,angle_id:allAngles.find(a=>a.pillar_id===id)?.id||''}));}}>{choices.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><Label htmlFor="strategy-angle">{t('Angle')}</Label><select id="strategy-angle" className="w-full border border-input rounded-lg p-2 text-sm" value={form.angle_id} onChange={e=>setForm(previous=>({...previous,angle_id:e.target.value}))}><option value="">{t('Choose an angle')}</option>{angleChoices.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div><Label htmlFor="strategy-platform">{t('Platform')}</Label><select id="strategy-platform" className="w-full border border-input rounded-lg p-2 text-sm" value={form.platform} onChange={e=>setForm(previous=>({...previous,platform:e.target.value}))}>{platforms.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
            <div><Label htmlFor="strategy-time">{t('Time')}</Label><Input id="strategy-time" type="time" onInput={e=>{const time=e.currentTarget.value;setForm(previous=>({...previous,time}));}} value={form.time} onChange={e=>setForm(previous=>({...previous,time:e.target.value}))}/></div>
            <div><Label htmlFor="strategy-asset">{t('Asset')}</Label><select id="strategy-asset" className="w-full border border-input rounded-lg p-2 text-sm" value={form.asset_id} onChange={e=>setForm(previous=>({...previous,asset_id:e.target.value}))}><option value="">{t('No asset')}</option>{assets.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div><Label htmlFor="strategy-reason">{t('Selection reason')}</Label><Textarea id="strategy-reason" maxLength={2000} value={form.reason} onChange={e=>setForm(previous=>({...previous,reason:e.target.value}))}/></div>
            <div className="flex justify-end gap-3"><Button variant="outline" onClick={()=>setEditing(null)}>{t('Cancel')}</Button><button type="button" className="btn-skew" onClick={saveEdit}>{t('Save changes')}</button></div>
        </div>}</DialogContent></Dialog>
    </div>;
}
