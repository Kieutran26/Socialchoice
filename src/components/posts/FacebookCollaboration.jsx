import { useEffect, useState } from 'react';
import { Users } from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export default function FacebookCollaboration({postId}) {
    const {t}=useTranslation();
    const [target,setTarget]=useState(''),[review,setReview]=useState(null),[history,setHistory]=useState([]),[remote,setRemote]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[diagnostic,setDiagnostic]=useState(null);
    useEffect(()=>{let active=true;appClient.collaboration.list(postId).then(value=>{if(active)setHistory(value);}).catch(e=>{if(active){setError(e.message);setDiagnostic(e.diagnostic);}});return()=>{active=false;};},[postId]);
    async function refresh(){setBusy(true);setError('');setDiagnostic(null);try{setRemote(await appClient.collaboration.remote(postId));setHistory(await appClient.collaboration.list(postId));}catch(e){setError(e.message);setDiagnostic(e.diagnostic);}finally{setBusy(false);}}
    async function prepare() {setBusy(true);setError('');setDiagnostic(null);try{const value=await appClient.collaboration.prepare(postId,target);if(value.status==='prepared')setReview(value);else setHistory(await appClient.collaboration.list(postId));}catch(e){setError(e.message);setDiagnostic(e.diagnostic);}finally{setBusy(false);}}
    async function invite(){setBusy(true);setError('');setDiagnostic(null);try{await appClient.collaboration.invite(review.id);setReview(null);setTarget('');setHistory(await appClient.collaboration.list(postId));}catch(e){setError(e.message);setDiagnostic(e.diagnostic);}finally{setBusy(false);}}
    return <section className="border-t mt-5 pt-4">
        <h3 className="flex gap-2 items-center"><Users size={18}/>{t('Collaborate on Facebook')}</h3>
        <p className="label-xs mt-2 mb-3">{t('Invite another Page to this published video. Joint authorship requires recipient acceptance; text and photo collaboration are not enabled here.')}</p>
        <label className="label-xs block mb-2" htmlFor="collaboration-target">{t('Collaborator Page ID or Facebook link')}</label>
        <div className="flex flex-wrap gap-2"><Input id="collaboration-target" className="flex-1 min-w-0" value={target} disabled={busy} onChange={e=>{setTarget(e.target.value);setReview(null);}} placeholder="https://www.facebook.com/apple"/><Button variant="outline" disabled={busy||!target.trim()} onClick={prepare}>{t('Review invitation')}</Button></div>
        {review&&<div className="rounded-lg border p-3 mt-3" aria-label={t('Review invitation')}>{review.metadataVerified === false && <p className="text-sm text-warnFg mb-2">{t('Meta could not read this Page’s name. Review the numeric ID you supplied; invitation access and recipient acceptance are not verified.')} <a className="underline" href={'https://www.facebook.com/profile.php?id='+review.targetId} target="_blank" rel="noreferrer">{t('Open recipient Page')}</a></p>}<p className="text-sm">{review.pageName} → {review.targetName} ({review.targetId})</p><p className="label-xs mt-1">{t('This sends a real Facebook collaboration invitation for this video.')}</p><div className="flex gap-2 mt-3"><Button disabled={busy} onClick={invite}>{t('Confirm invitation')}</Button><Button variant="outline" disabled={busy} onClick={()=>setReview(null)}>{t('Cancel')}</Button></div></div>}
        {history.filter(value=>value.status!=='prepared').map(value=><div key={value.id} className="mt-3 border-t pt-3 text-sm"><p>{value.targetName} · {t({submitted:'Invitation submitted',unknown:'Invitation unconfirmed',failed:'Invitation failed'}[value.status]||value.status)}</p><p className="label-xs mt-1">{t(value.message)}</p></div>)}
        <Button variant="outline" className="mt-3" disabled={busy} onClick={refresh}>{t('Check collaborators on Facebook')}</Button>
        {remote&&<div className="mt-3 text-sm"><p className="label-xs">{t('Live list returned by Facebook. Presence in this list does not by itself confirm acceptance.')}</p>{remote.entries.length?remote.entries.map(entry=><p key={entry.id}>{entry.name || entry.id}{entry.status ? ' · '+entry.status : ''}</p>):<p>{t('Facebook returned no collaborators.')}</p>}{remote.hasMore&&<p className="label-xs">{t('Facebook returned a partial list.')}</p>}</div>}
        {error&&<p role="alert" className="text-dangerFg text-sm mt-3">{t(error)}{Number.isSafeInteger(diagnostic?.code)&&<span className="block label-xs mt-1">{t('Meta code: {code}',{code:diagnostic.code})}{Number.isSafeInteger(diagnostic?.subcode)?' / '+diagnostic.subcode:''}</span>}</p>}
    </section>;
}
