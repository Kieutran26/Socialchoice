import { isDesktop } from '@/api/desktop/runtime';
import { useEffect, useState } from 'react';
import { aiRequest } from '@/api/ai';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DesktopAiSettings() {
    const { t }=useTranslation();
    const [saved,setSaved]=useState(null),[provider,setProvider]=useState('openai'),[model,setModel]=useState(''),[key,setKey]=useState('');
    const [busy,setBusy]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState('');
    function accept(value){setSaved(value);setProvider(value.provider);setModel(value.model);setKey('');}
    useEffect(()=>{
        let active=true;
        aiRequest('status').then(value=>{if(active)accept(value);}).catch(error=>{if(active)setError(error.message);}).finally(()=>{if(active)setBusy(false);});
        return()=>{active=false;};
    },[]);
    async function run(action) {
        setBusy(true);setError('');setMessage('');
        try {
            const value=await aiRequest(action,action==='save'?{provider,model,key}:{});
            if(action==='status'||action==='save'||action==='clear')accept(value);
            setMessage(t(action==='save'?(isDesktop()?'API key saved on this computer. Connection has not been tested.':'AI settings saved securely. Connection has not been tested.'):action==='clear'?'AI key removed. Local planning still works.':action==='test'?'AI connection verified.':'AI settings loaded.'));
        }catch(error){setError(error.message);}
        finally{setBusy(false);}
    }
    const changed=!saved || provider!==saved.provider || model!==saved.model || !!key;
    return <section className="panel p-5">
        <h2 className="text-[15px] mb-2">{t('AI with your own API key')}</h2>
        <p className="label-xs mb-4">{t(isDesktop()?'Optional. Requests go directly to OpenAI or Google using your account and API quota. Socialchoice does not run an AI server. Keys are protected by Windows and excluded from workspace backups.':'Your key is encrypted in your workspace. Requests pass through Socialchoice to your AI provider using your API quota. Keys are never returned to the browser.')}</p>
        <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="ai-provider">{t('AI provider')}</Label><select id="ai-provider" className="mt-2 w-full border rounded-lg p-2 bg-background" value={provider} disabled={busy} onChange={event=>{setProvider(event.target.value);setModel('');setKey('');setMessage('');}}><option value="openai">OpenAI</option><option value="gemini">Google Gemini</option></select></div>
            <div><Label htmlFor="ai-model">{t('Model ID')}</Label><Input id="ai-model" value={model} disabled={busy} className="mt-2" aria-describedby="ai-model-help" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={t('Enter a model ID available to your API account')} onChange={event=>{setModel(event.target.value);setMessage('');}} maxLength={100} /><p id="ai-model-help" className="label-xs mt-2 break-words">{t(provider==='gemini'?'Copy the exact model ID from Google AI Studio, without spaces. Format example: gemini-2.5-flash (not Gemini 2.5 Flash). Choose a model available to your API account.':'Copy the exact model ID from the OpenAI model list, without spaces. Format example: gpt-4.1 (not GPT 4.1). Choose a model available to your API account.')}</p></div>
            <div className="sm:col-span-2"><Label htmlFor="ai-key">{t('API key')}</Label><Input id="ai-key" type="password" autoComplete="off" spellCheck={false} maxLength={512} value={key} disabled={busy} className="mt-2" onChange={event=>{setKey(event.target.value);setMessage('');}} /><p className="label-xs mt-2">{t(saved?.configured?'A key is saved. Leave this field blank to keep it for the same provider.':'Enter the key here, never in a post or chat message.')}</p></div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
            <Button variant="outline" disabled={busy || !model.trim()} onClick={()=>run('save')}>{t('Save AI settings')}</Button>
            <Button variant="outline" disabled={busy || !saved?.configured || changed} onClick={()=>run('test')}>{t('Test AI connection (uses API quota)')}</Button>
            <Button variant="outline" disabled={busy} onClick={()=>run('clear')}>{t('Remove AI key')}</Button>
            <Button variant="ghost" disabled={busy} onClick={()=>run('status')}>{t('Reload AI settings')}</Button>
        </div>
        {busy&&<p role="status" className="label-xs mt-3">{t('Working…')}</p>}
        {message&&<p role="status" className="text-sm mt-3">{message}</p>}
        {error&&<p role="alert" className="text-sm text-dangerFg mt-3">{t(error)}</p>}
    </section>;
}
