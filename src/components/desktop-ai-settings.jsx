import { isDesktop } from '@/api/desktop/runtime';
import React, { useEffect, useState } from 'react';
import { aiRequest } from '@/api/ai';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkle, ShieldCheck, ArrowCounterClockwise } from '@phosphor-icons/react';

export default function DesktopAiSettings() {
    const { t } = useTranslation();
    const [saved, setSaved] = useState(null);
    const [provider, setProvider] = useState('openai');
    const [model, setModel] = useState('');
    const [key, setKey] = useState('');
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [models, setModels] = useState([]), [modelsBusy, setModelsBusy] = useState(false), [modelsError, setModelsError] = useState('');
    useEffect(() => {
        if (isDesktop() || provider !== 'openrouter') return;
        let active=true; setModelsBusy(true); setModelsError('');
        aiRequest('models').then(value=>{if(active)setModels(value.models);}).catch(error=>{if(active)setModelsError(error.message);}).finally(()=>{if(active)setModelsBusy(false);});
        return ()=>{active=false;};
    }, [provider]);

    function accept(value) {
        setSaved(value);
        setProvider(value.provider);
        setModel(value.model);
        setKey('');
    }

    useEffect(() => {
        let active = true;
        aiRequest('status')
            .then((value) => {
                if (active) accept(value);
            })
            .catch((error) => {
                if (active) setError(error.message);
            })
            .finally(() => {
                if (active) setBusy(false);
            });
        return () => {
            active = false;
        };
    }, []);

    async function run(action) {
        setBusy(true);
        setError('');
        setMessage('');
        try {
            const value = await aiRequest(action, action === 'save' ? { provider, model, key } : {});
            if (action === 'status' || action === 'save' || action === 'clear') accept(value);
            setMessage(
                t(
                    action === 'save'
                        ? isDesktop()
                            ? 'API key saved on this computer. Connection has not been tested.'
                            : 'AI settings saved securely. Connection has not been tested.'
                        : action === 'clear'
                        ? 'AI key removed. Local planning still works.'
                        : action === 'test'
                        ? 'AI connection verified.'
                        : 'AI settings loaded.'
                )
            );
        } catch (error) {
            setError(error.message);
        } finally {
            setBusy(false);
        }
    }

    const changed = !saved || provider !== saved.provider || model !== saved.model || !!key;

    return (
        <section className="panel p-5">
            <h2 className="text-[15px] font-bold text-foreground mb-2">{t('AI with your own API key')}</h2>
            <p className="label-xs mb-4 text-muted-foreground leading-relaxed">
                {t(
                    isDesktop()
                        ? 'Optional. Requests go directly to OpenAI or Google using your account and API quota. Socialchoice does not run an AI server. Keys are protected by Windows and excluded from workspace backups.'
                        : 'Your key is encrypted in your workspace. Requests pass through Socialchoice to your AI provider using your API quota. Keys are never returned to the browser.'
                )}
            </p>

            {/* Added APIs Card */}
            {saved?.configured && (
                <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkle size={14} weight="fill" className="text-amber-500" />
                            {t('Added APIs')}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {t('Configured — test connection to verify')}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-border shadow-2xs">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center font-bold text-base shrink-0 border border-border/60">
                                {saved.provider === 'gemini' ? (
                                    <span className="text-blue-500 text-lg">✦</span>
                                ) : (
                                    <span className="text-emerald-500 text-lg">🤖</span>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-foreground">
                                        {saved.provider === 'openrouter' ? 'OpenRouter' : saved.provider === 'gemini' ? 'Google Gemini' : 'OpenAI'}
                                    </span>
                                    <code className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted text-foreground font-semibold border border-border/50">
                                        {saved.model}
                                    </code>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                    <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                                    <span>
                                        API key:{' '}
                                        <span className="font-mono tracking-widest text-[11px] text-foreground font-medium">
                                            ••••••••••••••••
                                        </span>
                                    </span>
                                    <span>·</span>
                                    <span className="text-emerald-600 font-medium">{t('Saved & encrypted')}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-semibold rounded-lg gap-1.5 cursor-pointer"
                                disabled={busy}
                                onClick={() => run('test')}
                            >
                                <ArrowCounterClockwise size={13} weight="bold" />
                                <span>{t('Test connection')}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <Label htmlFor="ai-provider" className="text-xs font-semibold text-foreground">
                        {t('AI provider')}
                    </Label>
                    <select
                        id="ai-provider"
                        className="mt-2 w-full border border-border rounded-xl p-2.5 text-xs bg-background"
                        value={provider}
                        disabled={busy}
                        onChange={(event) => {
                            setProvider(event.target.value);
                            setModel('');
                            setKey('');
                            setMessage('');
                        }}
                    >
                        {!isDesktop() && <option value="openrouter">OpenRouter (Gemini / Claude / GPT)</option>}
                        <option value="openai">OpenAI</option>
                        <option value="gemini">Google Gemini</option>
                    </select>
                </div>
                <div>
                    <Label htmlFor="ai-model" className="text-xs font-semibold text-foreground">
                        {t('Model ID')}
                    </Label>
                    {provider === 'openrouter' && !isDesktop() ? <>
                        <select id="ai-model" aria-describedby="ai-model-help" className="mt-2 w-full border border-border rounded-xl p-2.5 text-sm bg-background" disabled={busy || modelsBusy} value={model} onChange={event=>{setModel(event.target.value);setMessage('');}}>
                            <option value="">{t(modelsBusy ? 'Loading models…' : 'Choose an image-capable model')}</option>
                            {model && !models.some(item=>item.id===model && item.vision) && <option value={model}>{model}</option>}
                            {models.filter(item=>item.vision).map(item=><option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}
                        </select>
                        {modelsError && <p role="alert" className="label-xs text-dangerFg mt-2">{t(modelsError)}</p>}
                    </> : <Input
                        id="ai-model"
                        value={model}
                        disabled={busy}
                        className="mt-2 h-10 text-xs rounded-xl"
                        aria-describedby="ai-model-help"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder={t('Enter a model ID available to your API account')}
                        onChange={(event) => {
                            setModel(event.target.value);
                            setMessage('');
                        }}
                        maxLength={100}
                    />}
                    <p id="ai-model-help" className="label-xs mt-2 break-words text-muted-foreground">
                        {t(
                            provider === 'openrouter' ? 'One OpenRouter key supports Gemini, Claude and GPT models. Images and prompts pass through OpenRouter to the selected provider. API usage is billed by OpenRouter; model availability and pricing can change.' : provider === 'gemini'
                                ? 'Copy the exact model ID from Google AI Studio, without spaces. Format example: gemini-2.5-flash (not Gemini 2.5 Flash). Choose a model available to your API account.'
                                : 'Copy the exact model ID from the OpenAI model list, without spaces. Format example: gpt-4.1 (not GPT 4.1). Choose a model available to your API account.'
                        )}
                    </p>
                </div>
                <div className="sm:col-span-2">
                    <Label htmlFor="ai-key" className="text-xs font-semibold text-foreground">
                        {t('API key')}
                    </Label>
                    <Input
                        id="ai-key"
                        type="password"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={512}
                        value={key}
                        disabled={busy}
                        placeholder={saved?.configured ? '••••••••••••••••••••••••••••••••' : ''}
                        className="mt-2 h-10 text-xs rounded-xl font-mono"
                        onChange={(event) => {
                            setKey(event.target.value);
                            setMessage('');
                        }}
                    />
                    <p className="label-xs mt-2 text-muted-foreground">
                        {t(
                            saved?.configured
                                ? 'A key is saved. Leave this field blank to keep it for the same provider.'
                                : 'Enter the key here, never in a post or chat message.'
                        )}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2.5 mt-5">
                <Button
                    variant="default"
                    className="h-9 px-4 text-xs font-semibold rounded-xl"
                    disabled={busy || !model.trim()}
                    onClick={() => run('save')}
                >
                    {t('Save AI settings')}
                </Button>
                <Button
                    variant="outline"
                    className="h-9 px-4 text-xs font-semibold rounded-xl"
                    disabled={busy || !saved?.configured || changed}
                    onClick={() => run('test')}
                >
                    {t('Test AI connection (uses API quota)')}
                </Button>
                <Button
                    variant="outline"
                    className="h-9 px-4 text-xs font-semibold rounded-xl text-dangerFg hover:text-dangerFg"
                    disabled={busy || !saved?.configured}
                    onClick={() => run('clear')}
                >
                    {t('Remove AI key')}
                </Button>
                <Button
                    variant="ghost"
                    className="h-9 px-4 text-xs font-medium rounded-xl"
                    disabled={busy}
                    onClick={() => run('status')}
                >
                    {t('Reload AI settings')}
                </Button>
            </div>

            {busy && <p role="status" className="label-xs mt-3 text-muted-foreground">{t('Working…')}</p>}
            {message && <p role="status" className="text-xs font-medium text-emerald-600 mt-3">{message}</p>}
            {error && <p role="alert" className="text-xs text-dangerFg mt-3">{t(error)}</p>}
        </section>
    );
}
