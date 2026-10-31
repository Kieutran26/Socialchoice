import { isDesktop } from '@/api/desktop/runtime';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { aiRequest } from '@/api/ai';
import { aiDraftContext, sameAiDraft } from '@/lib/ai-draft';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sparkle, ArrowRight, Check, WarningCircle, CircleNotch } from '@phosphor-icons/react';

export default function DesktopAiWriter({ form, disabled, onApply, onApplyPlatform = undefined }) {
    const { t, language } = useTranslation();
    const [ready, setReady] = useState(false);
    const [settings, setSettings] = useState(null);
    const [error, setError] = useState('');
    const [brief, setBrief] = useState('');
    const [platform, setPlatform] = useState('facebook');
    const [action, setAction] = useState('draft');
    const [outputLanguage, setOutputLanguage] = useState(language);
    const [busy, setBusy] = useState(false);
    const [suggestion, setSuggestion] = useState(null);
    const active = useRef(true);

    useEffect(() => {
        active.current = true;
        aiRequest('status')
            .then((value) => {
                if (active.current) setSettings(value);
            })
            .catch((err) => {
                if (active.current) setError(err.message);
            })
            .finally(() => {
                if (active.current) setReady(true);
            });
        return () => {
            active.current = false;
        };
    }, []);

    async function generate() {
        const origin = aiDraftContext(form);
        setBusy(true);
        setError('');
        setSuggestion(null);
        try {
            const result = await aiRequest('generate', {
                ...origin,
                brief,
                action,
                ...(!isDesktop() ? { platform } : {}),
                language: outputLanguage,
                confirmed: true,
            });
            if (active.current) {
                setSuggestion({
                    ...result,
                    origin,
                    target: action === 'adapt' ? platform : null,
                    previousCaption: form.platform_captions?.[platform] || '',
                });
            }
        } catch (err) {
            if (active.current) setError(err.message);
        } finally {
            if (active.current) setBusy(false);
        }
    }

    const applied =
        suggestion &&
        (suggestion.target
            ? form.platform_captions?.[suggestion.target] === suggestion.text &&
              sameAiDraft(form, suggestion.origin)
            : form.caption === suggestion.text &&
              sameAiDraft({ ...form, caption: suggestion.origin.caption }, suggestion.origin));

    const stale =
        suggestion &&
        !applied &&
        (!sameAiDraft(form, suggestion.origin) ||
            (suggestion.target &&
                (form.platform_captions?.[suggestion.target] || '') !== suggestion.previousCaption));

    const providerName = settings?.provider === 'openai' ? 'OpenAI' : 'Google Gemini';

    return (
        <section className="panel p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-foreground">
                    <Sparkle size={18} weight="fill" className="shrink-0 text-amber-500" />
                    <h2 className="text-[15px] font-semibold text-foreground">{t('AI writing assistant')}</h2>
                </div>
                {settings?.configured && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {providerName}
                    </span>
                )}
            </div>

            {!ready ? (
                <div className="py-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <CircleNotch size={14} className="animate-spin" />
                    <span>{t('AI settings are loading.')}</span>
                </div>
            ) : !settings?.configured ? (
                <div className="rounded-xl border border-dashed border-border p-4 bg-muted/30">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('Configure your AI key in Settings')} —{' '}
                        <Link className="underline font-medium text-foreground hover:text-foreground/80" to="/settings">
                            {t('Open settings')}
                        </Link>
                    </p>
                </div>
            ) : (
                <>
                    <p className="label-xs mb-4 text-muted-foreground leading-relaxed">
                        {t(
                            isDesktop()
                                ? 'Generate sends your brief, title, current caption and selected brand/strategy text directly to {provider}. Media and other posts are not sent. Your API account is billed by the provider.'
                                : 'Generate sends your brief, title, caption and selected brand/strategy through PostChoice to {provider}. Media and other posts are not sent. Your API account is billed by the provider.',
                            { provider: providerName }
                        )}
                    </p>

                    <fieldset disabled={disabled || busy} className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="ai-action" className="label-xs mb-1.5 block">
                                    {t('Writing task')}
                                </Label>
                                <select
                                    id="ai-action"
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/80 focus:ring-1 focus:ring-foreground/20 outline-none transition-colors"
                                    value={action}
                                    onChange={(event) => setAction(event.target.value)}
                                >
                                    <option value="draft">{t('Write a caption')}</option>
                                    <option value="rewrite">{t('Rewrite caption')}</option>
                                    <option value="shorten">{t('Shorten caption')}</option>
                                    {!isDesktop() && (
                                        <>
                                            <option value="tone">{t('Change tone')}</option>
                                            <option value="cta">{t('Improve call to action')}</option>
                                            <option value="adapt">{t('Adapt for a platform')}</option>
                                        </>
                                    )}
                                    <option value="ideas">{t('Suggest five ideas')}</option>
                                </select>
                            </div>

                            <div>
                                <Label htmlFor="ai-language" className="label-xs mb-1.5 block">
                                    {t('Output language')}
                                </Label>
                                <select
                                    id="ai-language"
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/80 focus:ring-1 focus:ring-foreground/20 outline-none transition-colors"
                                    value={outputLanguage}
                                    onChange={(event) => setOutputLanguage(event.target.value)}
                                >
                                    <option value="vi">Tiếng Việt</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                        </div>

                        {action === 'adapt' && (
                            <div>
                                <Label htmlFor="ai-platform" className="label-xs mb-1.5 block">
                                    {t('Target platform')}
                                </Label>
                                <select
                                    id="ai-platform"
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/80 focus:ring-1 focus:ring-foreground/20 outline-none transition-colors"
                                    value={platform}
                                    onChange={(event) => setPlatform(event.target.value)}
                                >
                                    {['facebook', 'instagram', 'linkedin', 'threads', 'tiktok'].map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                                <p className="label-xs mt-1.5 text-muted-foreground">
                                    {t('The suggestion updates only this platform caption. Account overrides still take precedence.')}
                                </p>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="ai-brief" className="label-xs mb-1.5 block">
                                {t('Brief or editing instructions')}
                            </Label>
                            <Textarea
                                id="ai-brief"
                                rows={3}
                                className="rounded-xl border border-border bg-background p-3 text-sm resize-none focus:border-foreground/80 focus:ring-1 focus:ring-foreground/20"
                                placeholder={t('Provide context, keywords, tone, or specific requests...')}
                                value={brief}
                                maxLength={4000}
                                onChange={(event) => setBrief(event.target.value)}
                            />
                        </div>

                        <Button
                            variant="outline"
                            type="button"
                            className="w-full sm:w-auto rounded-xl font-medium"
                            disabled={
                                !form.brand_id ||
                                form.caption.length > 20000 ||
                                (['draft', 'ideas'].includes(action) ? !brief.trim() : !form.caption.trim()) ||
                                busy
                            }
                            onClick={generate}
                        >
                            {busy ? (
                                <>
                                    <CircleNotch size={15} className="mr-2 animate-spin" />
                                    {t('Waiting for your AI provider…')}
                                </>
                            ) : (
                                <>
                                    <Sparkle size={15} weight="fill" className="mr-2 text-amber-500" />
                                    {t('Generate AI suggestion')}
                                </>
                            )}
                        </Button>
                    </fieldset>

                    {form.caption.length > 20000 && (
                        <p className="label-xs mt-2 text-dangerFg">
                            {t('AI supports captions up to 20000 characters. Shorten the text before sending.')}
                        </p>
                    )}
                </>
            )}

            {error && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50/60 p-3 text-xs text-red-700">
                    <WarningCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                    <span>{t(error)}</span>
                </div>
            )}

            {suggestion && (
                <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="ai-suggestion" className="text-xs font-semibold text-foreground">
                            {t('AI suggestion — review before using')}
                        </Label>
                        <span className="label-xs text-muted-foreground">
                            {suggestion.provider} · {suggestion.model}
                        </span>
                    </div>

                    <Textarea
                        id="ai-suggestion"
                        readOnly
                        rows={7}
                        className="rounded-xl border border-border bg-background p-3 text-sm leading-relaxed"
                        value={suggestion.text}
                    />

                    {stale && (
                        <p role="status" className="text-xs text-amber-700 font-medium">
                            {t('The draft changed. Generate again or copy the suggestion manually.')}
                        </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                        <Button
                            variant="default"
                            type="button"
                            className="rounded-xl"
                            disabled={disabled || busy || stale || applied}
                            onClick={() =>
                                suggestion.target
                                    ? onApplyPlatform?.(suggestion.origin, suggestion.target, suggestion.previousCaption, suggestion.text)
                                    : onApply(suggestion.origin, suggestion.text)
                            }
                        >
                            {applied ? (
                                <>
                                    <Check size={14} className="mr-1.5" />
                                    {t('Suggestion is in the editor')}
                                </>
                            ) : (
                                <>
                                    <ArrowRight size={14} className="mr-1.5" />
                                    {t(suggestion.target ? 'Use suggestion for this platform' : 'Use suggestion in caption')}
                                </>
                            )}
                        </Button>
                        <p className="label-xs text-muted-foreground">
                            {t('This only changes the editor. Save the draft separately.')}
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
}
