import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';

const empty={privacy:'',allowComment:false,allowDuet:false,allowStitch:false,commercial:false,ownBrand:false,brandedContent:false,aiGenerated:false,musicConsent:false};
export default function TiktokSettings({ account, value, onChange, onCreatorChange = (_creator) => {} }) {
    const { t }=useTranslation();
    const [creator,setCreator]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
    useEffect(()=>{let active=true;setBusy(true);setCreator(null);onCreatorChange(null);setError('');appClient.tiktok.creator(account.id).then(info=>{if(active){setCreator(info);onCreatorChange(info);onChange({...empty});}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[account.id,account.credential_id,refresh]); // Choices always reset when fresh creator settings arrive.
    const options=value||empty;
    const change=patch=>onChange({...options,...patch,...(patch.commercial===false?{ownBrand:false,brandedContent:false}:{})});
    const checkbox=(key,label,disabled=false)=><label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={!!options[key]} disabled={busy||!creator||disabled} onChange={e=>change({[key]:e.target.checked})}/>{t(label)}</label>;
    return <fieldset className="space-y-3 border rounded-lg p-3"><legend>TikTok</legend>
        <p className="text-sm">{creator?`${creator.nickname} · @${creator.username} · ${t('Maximum video duration')}: ${creator.maxDuration}s`:t('Loading TikTok creator settings…')}</p>
        <Button variant="ghost" type="button" disabled={busy} className="h-auto p-0 underline text-sm" onClick={()=>setRefresh(n=>n+1)}>{t('Refresh TikTok settings')}</Button>
        {error&&<p role="alert" className="text-sm text-dangerFg">{t(error)}</p>}
        <label className="block text-sm">{t('TikTok visibility')}<select aria-label={t('TikTok visibility')} className="block border rounded-lg p-2 mt-2" disabled={!creator||busy} value={options.privacy} onChange={e=>change({privacy:e.target.value})}><option value="">{t('Choose visibility')}</option>{creator?.privacy.map(p=><option key={p} value={p}>{t('Only me (sandbox)')}</option>)}</select></label>
        {checkbox('allowComment','Allow comments',creator?.commentDisabled)}{checkbox('allowDuet','Allow Duet',creator?.duetDisabled)}{checkbox('allowStitch','Allow Stitch',creator?.stitchDisabled)}
        {checkbox('commercial','Disclose promotional content')}
        {options.commercial&&<div className="space-y-2 pl-4">{checkbox('ownBrand','Your own brand')}<p className="text-xs">{t('Your video will be labeled Promotional content.')}</p><label className="flex items-start gap-3 text-sm opacity-60"><input type="checkbox" disabled/>{t('Branded content (paid partnership)')}</label><p className="text-xs">{t('Paid partnership content cannot be private, so it is unavailable in sandbox.')}</p></div>}
        {checkbox('aiGenerated','This video is AI-generated')}
        <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={!!options.musicConsent} disabled={!creator||busy} onChange={e=>change({musicConsent:e.target.checked})}/><span>{t('By posting, you agree to TikTok’s')} <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer" className="underline">Music Usage Confirmation</a>.</span></label>
        <p className="label-xs">{t('TikTok may take a few minutes to process a video. Private posts have no public link. Confirmed schedules run with the browser closed.')}</p>
    </fieldset>;
}
