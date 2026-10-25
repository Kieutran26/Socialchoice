import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { aiRequest } from '@/api/desktop/ai';
import { aiDraftContext, sameAiDraft } from '@/lib/ai-draft';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function DesktopAiWriter({ form, disabled, onApply }) {
    const { t,language }=useTranslation();
    const [settings,setSettings]=useState(null),[error,setError]=useState(''),[brief,setBrief]=useState('');
    const [action,setAction]=useState('draft'),[outputLanguage,setOutputLanguage]=useState(language),[busy,setBusy]=useState(false),[suggestion,setSuggestion]=useState(null);
    const active=useRef(true);
    useEffect(()=>{active.current=true;aiRequest('status').then(value=>{if(active.current)setSettings(value);}).catch(error=>{if(active.current)setError(error.message);});return()=>{active.current=false;};},[]);
    async function generate() {
        const origin=aiDraftContext(form);setBusy(true);setError('');setSuggestion(null);
        try {
            const result=await aiRequest('generate',{...origin,brief,action,language:outputLanguage,confirmed:true});
            if(active.current)setSuggestion({...result,origin});
        }catch(error){if(active.current)setError(error.message);}
        finally{if(active.current)setBusy(false);}
    }
    const applied=suggestion&&form.caption===suggestion.text&&sameAiDraft({...form,caption:suggestion.origin.caption},suggestion.origin);
    const stale=suggestion&&!applied&&!sameAiDraft(form,suggestion.origin);
    return <section className="panel p-5">
        <h2 className="text-[15px] mb-2">{t('AI writing assistant')}</h2>
        {!settings?.configured?<p className="text-sm"><Link className="underline" to="/settings">{t('Configure your AI key in Settings')}</Link></p>:<>
            <p className="label-xs mb-4">{t('Generate sends your brief, title, current caption and selected brand/strategy text directly to {provider}. Media and other posts are not sent. Your API account is billed by the provider.',{provider:settings.provider==='openai'?'OpenAI':'Google Gemini'})}</p>
            <fieldset disabled={disabled||busy} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="ai-action">{t('Writing task')}</Label><select id="ai-action" className="w-full mt-2 border rounded-lg p-2 bg-background" value={action} onChange={event=>setAction(event.target.value)}><option value="draft">{t('Write a caption')}</option><option value="rewrite">{t('Rewrite caption')}</option><option value="shorten">{t('Shorten caption')}</option><option value="ideas">{t('Suggest five ideas')}</option></select></div>
                <div><Label htmlFor="ai-language">{t('Output language')}</Label><select id="ai-language" className="w-full mt-2 border rounded-lg p-2 bg-background" value={outputLanguage} onChange={event=>setOutputLanguage(event.target.value)}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></div></div>
                <div><Label htmlFor="ai-brief">{t('Brief or editing instructions')}</Label><Textarea id="ai-brief" rows={3} className="mt-2" value={brief} maxLength={4000} onChange={event=>setBrief(event.target.value)} /></div>
                <Button variant="outline" disabled={!form.brand_id||form.caption.length>20000||(['draft','ideas'].includes(action)?!brief.trim():!form.caption.trim())} onClick={generate}>{t('Generate AI suggestion')}</Button>
            </fieldset>
            {form.caption.length>20000&&<p className="label-xs mt-2">{t('AI supports captions up to 20000 characters. Shorten the text before sending.')}</p>}
        </>}
        {busy&&<p role="status" className="label-xs mt-3">{t('Waiting for your AI provider…')}</p>}
        {error&&<p role="alert" className="text-sm text-dangerFg mt-3">{t(error)}</p>}
        {suggestion&&<div className="space-y-3 mt-4"><Label htmlFor="ai-suggestion">{t('AI suggestion — review before using')}</Label><Textarea id="ai-suggestion" readOnly rows={7} value={suggestion.text} /><p className="label-xs">{suggestion.provider} · {suggestion.model}</p>
            {stale&&<p role="status" className="text-sm">{t('The draft changed. Generate again or copy the suggestion manually.')}</p>}
            <Button variant="outline" disabled={disabled||busy||stale||applied} onClick={()=>onApply(suggestion.origin,suggestion.text)}>{t(applied?'Suggestion is in the editor':'Use suggestion in caption')}</Button><p className="label-xs">{t('This only changes the editor. Save the draft separately.')}</p>
        </div>}
    </section>;
}
