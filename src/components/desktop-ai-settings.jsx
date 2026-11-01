import { isDesktop } from '@/api/desktop/runtime';
import React, { useEffect, useState } from 'react';
import { aiRequest } from '@/api/ai';
import { providerReasonMessage } from '@/api/ai-diagnostics';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sparkle,
    ShieldCheck,
    ArrowCounterClockwise,
    CaretDown,
    Key,
    Cpu,
    Trash,
    ArrowsClockwise,
    Check,
    Info,
} from '@phosphor-icons/react';

export default function DesktopAiSettings() {
    const { t } = useTranslation();
    const [saved, setSaved] = useState(null);
    const [provider, setProvider] = useState('openai');
    const [model, setModel] = useState('');
    const [key, setKey] = useState('');
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [connection, setConnection] = useState('untested');
    const [models, setModels] = useState([]);
    const [modelsBusy, setModelsBusy] = useState(false);
    const [modelsError, setModelsError] = useState('');

    useEffect(() => {
        if (isDesktop() || provider !== 'openrouter') return;
        let active = true;
        setModelsBusy(true);
        setModelsError('');
        aiRequest('models')
            .then((value) => {
                if (active) setModels(value.models);
            })
            .catch((err) => {
                if (active) setModelsError(formatError(err));
            })
            .finally(() => {
                if (active) setModelsBusy(false);
            });
        return () => {
            active = false;
        };
    }, [provider]);

    function formatError(err) {
        if (!err) return '';
        const msg = t(providerReasonMessage(err.providerReason) || err.message || 'Could not connect to the AI provider. Please try again later.');
        return err.providerReason ? `${msg} (${err.providerReason})` : msg;
    }

    function accept(value) {
        setConnection('untested');
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
            .catch((err) => {
                if (active) setError(formatError(err));
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
            const value = await aiRequest(
                action,
                action === 'save' ? { provider, model, key } : {}
            );
            if (action === 'status' || action === 'save' || action === 'clear') accept(value);
            if (action === 'test') setConnection('verified');
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
        } catch (err) {
            if (action === 'test') setConnection('failed');
            setError(formatError(err));
        } finally {
            setBusy(false);
        }
    }

    const changed = !saved || provider !== saved.provider || model !== saved.model || !!key;

    return (
        <section className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Sparkle size={18} weight="duotone" />
                    </span>
                    <div>
                        <h2 className="text-[15px] font-semibold text-foreground">
                            {t('AI with your own API key')}
                        </h2>
                        <p className="label-xs text-muted-foreground mt-0.5">
                            {t(
                                isDesktop()
                                    ? 'Optional. Requests go directly to OpenAI or Google using your account and API quota. Socialchoice does not run an AI server. Keys are protected by Windows and excluded from workspace backups.'
                                    : 'Your key is encrypted in your workspace. Requests pass through Socialchoice to your AI provider using your API quota. Keys are never returned to the browser.'
                            )}
                        </p>
                    </div>
                </div>

                {saved?.configured && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>
                            {saved.provider === 'gemini'
                                ? 'Google Gemini'
                                : saved.provider === 'openrouter'
                                ? 'OpenRouter'
                                : 'OpenAI'}
                        </span>
                    </span>
                )}
            </div>

            {/* Added APIs Card */}
            {saved?.configured && (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-50/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkle size={13} weight="fill" className="text-amber-500" />
                            {t('Added APIs')}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {t(connection === 'verified' ? 'AI connection verified.' : connection === 'failed' ? 'AI connection failed.' : 'Configured — test connection to verify')}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border/80 shadow-2xs">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center font-bold text-base shrink-0 border border-border/60">
                                {saved.provider === 'gemini' ? (
                                    <span className="text-blue-500 text-lg font-mono">✦</span>
                                ) : saved.provider === 'openrouter' ? (
                                    <span className="text-purple-500 text-lg">⚡</span>
                                ) : (
                                    <span className="text-emerald-500 text-lg">🤖</span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-xs text-foreground">
                                        {saved.provider === 'openrouter'
                                            ? 'OpenRouter'
                                            : saved.provider === 'gemini'
                                            ? 'Google Gemini'
                                            : 'OpenAI'}
                                    </span>
                                    <code className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted text-foreground font-semibold border border-border/50">
                                        {saved.model}
                                    </code>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                                    <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                                    <span>API key:</span>
                                    <span className="font-mono tracking-widest text-[11px] text-foreground font-medium">
                                        ••••••••••••••••
                                    </span>
                                    <span>·</span>
                                    <span className="text-emerald-600 font-medium text-[11px]">
                                        {t('Saved & encrypted')}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-medium rounded-lg gap-1.5"
                            disabled={busy || changed}
                            onClick={() => run('test')}
                        >
                            <ArrowCounterClockwise size={13} className={busy ? 'animate-spin' : ''} />
                            <span>{t('Test connection')}</span>
                        </Button>
                    </div>
                </div>
            )}

            {/* Provider and Model Inputs */}
            <div className="grid gap-3.5 sm:grid-cols-2 pt-1">
                <div>
                    <Label htmlFor="ai-provider" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        {t('AI provider')}
                    </Label>
                    <div className="relative flex items-center">
                        <Cpu size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <select
                            id="ai-provider"
                            value={provider}
                            disabled={busy}
                            onChange={(event) => {
                                setProvider(event.target.value);
                                setModel('');
                                setKey('');
                                setMessage('');
                            }}
                            className="h-10 w-full rounded-xl border border-border/80 bg-background pl-9 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                        >
                            {!isDesktop() && <option value="openrouter">OpenRouter (Gemini / Claude / GPT)</option>}
                            <option value="gemini">Google Gemini</option>
                            <option value="openai">OpenAI</option>
                        </select>
                        <CaretDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                </div>

                <div>
                    <Label htmlFor="ai-model" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        {t('Model ID')}
                    </Label>
                    {provider === 'openrouter' && !isDesktop() ? (
                        <div className="relative flex items-center">
                            <select
                                id="ai-model"
                                aria-describedby="ai-model-help"
                                disabled={busy || modelsBusy}
                                value={model}
                                onChange={(event) => {
                                    setModel(event.target.value);
                                    setMessage('');
                                }}
                                className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                            >
                                <option value="">
                                    {t(modelsBusy ? 'Loading models…' : 'Choose an image-capable model')}
                                </option>
                                {model && !models.some((item) => item.id === model && item.vision) && (
                                    <option value={model}>{model}</option>
                                )}
                                {models
                                    .filter((item) => item.vision)
                                    .map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name} · {item.id}
                                        </option>
                                    ))}
                            </select>
                            <CaretDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            {modelsError && <p role="alert" className="label-xs text-dangerFg mt-1">{t(modelsError)}</p>}
                        </div>
                    ) : (
                        <div>
                            <Input
                                id="ai-model"
                                value={model}
                                disabled={busy}
                                className="h-10 text-xs rounded-xl border-border/80 bg-background font-mono"
                                aria-describedby="ai-model-help"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                placeholder={
                                    provider === 'gemini'
                                        ? 'gemini-2.5-flash'
                                        : 'gpt-4o-mini'
                                }
                                onChange={(event) => {
                                    setModel(event.target.value);
                                    setMessage('');
                                }}
                                maxLength={100}
                            />
                            {/* Preset suggestions */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {(provider === 'gemini'
                                    ? ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']
                                    : ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1']
                                ).map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => {
                                            setModel(preset);
                                            setMessage('');
                                        }}
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono border transition-all ${
                                            model === preset
                                                ? 'bg-primary/20 border-primary text-foreground font-bold'
                                                : 'bg-muted/60 border-border/60 text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <p id="ai-model-help" className="label-xs mt-1.5 break-words text-muted-foreground">
                        {t(
                            provider === 'openrouter'
                                ? 'One OpenRouter key supports Gemini, Claude and GPT models. Images and prompts pass through OpenRouter to the selected provider. API usage is billed by OpenRouter; model availability and pricing can change.'
                                : provider === 'gemini'
                                ? 'Copy the exact model ID from Google AI Studio, without spaces. Format example: gemini-2.5-flash (not Gemini 2.5 Flash). Choose a model available to your API account.'
                                : 'Copy the exact model ID from the OpenAI model list, without spaces. Format example: gpt-4.1 (not GPT 4.1). Choose a model available to your API account.'
                        )}
                    </p>
                </div>

                <div className="sm:col-span-2">
                    <Label htmlFor="ai-key" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        {t('API key')}
                    </Label>
                    <div className="relative flex items-center">
                        <Key size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                            id="ai-key"
                            type="password"
                            autoComplete="off"
                            spellCheck={false}
                            maxLength={512}
                            value={key}
                            disabled={busy}
                            placeholder={saved?.configured ? '••••••••••••••••••••••••••••••••' : ''}
                            className="h-10 pl-9 text-xs rounded-xl border-border/80 bg-background font-mono"
                            onChange={(event) => {
                                setKey(event.target.value);
                                setMessage('');
                            }}
                        />
                    </div>
                    <p className="label-xs mt-1.5 text-muted-foreground flex items-center gap-1.5">
                        <Info size={13} className="text-muted-foreground shrink-0" />
                        {t(
                            saved?.configured
                                ? 'A key is saved. Leave this field blank to keep it for the same provider.'
                                : 'Enter the key here, never in a post or chat message.'
                        )}
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-border/60">
                <button
                    type="button"
                    className="btn-skew inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2"
                    disabled={busy || !model.trim()}
                    onClick={() => run('save')}
                >
                    <Check size={14} weight="bold" />
                    <span>{t('Save AI settings')}</span>
                </button>

                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3.5 text-xs font-medium rounded-xl gap-1.5"
                    disabled={busy || !saved?.configured || changed}
                    onClick={() => run('test')}
                >
                    <ArrowCounterClockwise size={13} className={busy ? 'animate-spin' : ''} />
                    <span>{t('Test AI connection (uses API quota)')}</span>
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3.5 text-xs font-medium rounded-xl text-dangerFg hover:text-dangerFg hover:bg-rose-50 gap-1.5"
                    disabled={busy || !saved?.configured}
                    onClick={() => run('clear')}
                >
                    <Trash size={13} />
                    <span>{t('Remove AI key')}</span>
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 text-xs font-medium rounded-xl text-muted-foreground hover:text-foreground gap-1.5 ml-auto"
                    disabled={busy}
                    onClick={() => run('status')}
                >
                    <ArrowsClockwise size={13} className={busy ? 'animate-spin' : ''} />
                    <span>{t('Reload AI settings')}</span>
                </Button>
            </div>

            {busy && (
                <p role="status" className="label-xs text-muted-foreground flex items-center gap-1.5">
                    <ArrowsClockwise size={13} className="animate-spin" />
                    <span>{t('Working…')}</span>
                </p>
            )}
            {message && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/60 text-xs text-emerald-800 flex items-center gap-2">
                    <Check size={15} className="shrink-0 text-emerald-600" />
                    <span>{message}</span>
                </div>
            )}
            {error && (
                <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200/60 text-xs text-dangerFg flex items-center gap-2">
                    <Info size={15} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </section>
    );
}
