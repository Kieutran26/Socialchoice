import { Plus, Trash, Clock, ChatCircleText, LinkedinLogo } from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LinkedinMentionTextarea as Textarea } from '@/components/composer/linkedin-mention-textarea';
import MediaUploader from './MediaUploader';
import LinkedinMentionBar from './LinkedinMentionBar';

export default function CommentChainEditor({
    comments = [],
    onChange,
    brandId,
    demoMode,
    disabled = false,
    onBusyChange,
    compact = false,
    platforms = [],
    linkedinAccounts = [],
}) {
    const { t } = useTranslation();
    const hasLinkedin = platforms.includes('linkedin') || linkedinAccounts.length > 0;

    const addComment = () => {
        if (comments.length >= 10) return;
        onChange([
            ...comments,
            {
                message: '',
                delay_minutes: comments.length === 0 ? 0 : 5,
                media: [],
                actor_account_id: '',
            },
        ]);
    };

    const updateComment = (index, patch) => {
        onChange(
            comments.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
        );
    };

    const removeComment = (index) => {
        onChange(comments.filter((_, idx) => idx !== index));
    };

    return (
        <div className="space-y-3" aria-label={t('Follow-up comments')}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <div className="flex items-center gap-1.5">
                        <ChatCircleText size={16} weight="duotone" className="text-foreground shrink-0" />
                        <h3 className={compact ? 'text-xs font-semibold text-foreground' : 'text-sm font-bold text-foreground'}>
                            {t('Follow-up comments')}
                        </h3>
                        <span className="text-[11px] font-semibold text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-full border border-border/60">
                            {comments.length}/10
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {t('Automatically post a comment chain after the main post is published. Supports image attachments on Facebook and Threads.')}
                    </p>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || comments.length >= 10}
                    onClick={addComment}
                    className="h-8 rounded-xl text-xs gap-1.5 shrink-0"
                >
                    <Plus size={13} weight="bold" />
                    <span>{t('Add comment')}</span>
                </Button>
            </div>

            {comments.length > 0 && (
                <div className="space-y-3 pt-1">
                    {comments.map((comment, index) => {
                        const hasMedia = Object.hasOwn(comment, 'media') && Array.isArray(comment.media);
                        return (
                            <div
                                key={index}
                                className="rounded-xl border border-border/80 bg-muted/15 p-3.5 space-y-3"
                            >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-bold">
                                                {index + 1}
                                            </span>
                                            <span className="text-xs font-semibold text-foreground">
                                                {t('Comment #{number}', { number: index + 1 })}
                                            </span>
                                        </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                {hasLinkedin && linkedinAccounts.length > 0 && (
                                                    <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <LinkedinLogo size={14} weight="fill" className="text-[#0a66c2] shrink-0" />
                                                        <span>{t('Comment as')}</span>
                                                        <select
                                                            disabled={disabled}
                                                            aria-label={t('LinkedIn comment actor for comment #{number}', { number: index + 1 })}
                                                            value={comment.actor_account_id || ''}
                                                            onChange={(event) =>
                                                                updateComment(index, {
                                                                    actor_account_id: event.target.value || '',
                                                                })
                                                            }
                                                            className="h-7 rounded-lg border border-border bg-white px-2 text-xs text-foreground"
                                                        >
                                                            <option value="">{t('Posting account (default)')}</option>
                                                            {linkedinAccounts.map((acc) => (
                                                                <option key={acc.id} value={acc.id}>
                                                                    {acc.name} ({acc.account_type === 'page' ? t('Company Page') : t('Personal Profile')})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                )}

                                                <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Clock size={13} className="shrink-0" />
                                                    <span>{t('Delay (min)')}</span>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={10080}
                                                        disabled={disabled}
                                                        aria-label={t('Delay in minutes for comment #{number}', { number: index + 1 })}
                                                        value={comment.delay_minutes ?? 0}
                                                        onChange={(event) => {
                                                            const raw = parseInt(event.target.value, 10);
                                                            updateComment(index, {
                                                                delay_minutes: Number.isFinite(raw) ? Math.max(0, Math.min(10080, raw)) : 0,
                                                            });
                                                        }}
                                                        className="h-7 w-20 rounded-lg text-xs px-2 bg-white"
                                                    />
                                                </label>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={disabled}
                                                    onClick={() => removeComment(index)}
                                                    aria-label={t('Remove comment #{number}', { number: index + 1 })}
                                                    className="h-7 px-2 rounded-lg text-xs text-dangerFg hover:text-dangerFg"
                                                >
                                                    <Trash size={13} />
                                                </Button>
                                            </div>
                                        </div>

                                        <div>
                                            <Textarea enabled={hasLinkedin} linkedinAccounts={linkedinAccounts}
                                                rows={2}
                                                disabled={disabled}
                                                aria-label={t('Message for comment #{number}', { number: index + 1 })}
                                                value={comment.message || ''}
                                                onChange={(event) => updateComment(index, { message: event.target.value })}
                                                placeholder={t('Write follow-up comment, link, or extra context…')}
                                                className="rounded-xl resize-none text-xs leading-relaxed bg-white"
                                            />
                                            <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
                                                <span>
                                                    {(comment.delay_minutes || 0) === 0
                                                        ? t('Publishes immediately after the main post')
                                                        : t('Publishes {minutes} min after previous step', { minutes: comment.delay_minutes })}
                                                </span>
                                                <span className="font-mono">{(comment.message || '').length} {t('characters')}</span>
                                            </div>
                                            {hasLinkedin && (
                                                <LinkedinMentionBar
                                                    linkedinAccounts={linkedinAccounts}
                                                    onInsert={(token) => {
                                                        const current = comment.message || '';
                                                        const sep = current && !/\s$/.test(current) ? ' ' : '';
                                                        updateComment(index, { message: `${current}${sep}${token} ` });
                                                    }}
                                                />
                                            )}
                                        </div>

                                        {brandId && (
                                            <div className="pt-1 border-t border-border/50 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-medium text-muted-foreground">
                                                        {t('Comment image (optional, max 1 on Facebook & Threads)')}
                                                    </span>
                                                    {(comment.media || []).length > 0 && (
                                                        <button
                                                            type="button"
                                                            disabled={disabled}
                                                            onClick={() => updateComment(index, { media: [] })}
                                                            className="text-[11px] text-dangerFg hover:underline"
                                                        >
                                                            {t('Clear image')}
                                                        </button>
                                                    )}
                                                </div>
                                                {hasMedia && (
                                                    <MediaUploader
                                                        assets={comment.media || []}
                                                        onChange={(assets) => updateComment(index, { media: assets.slice(0, 1) })}
                                                        brandId={brandId}
                                                        demoMode={demoMode}
                                                        onBusyChange={onBusyChange}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    );
                    })}
                                </div>
            )}
                            </div>
                        );
                    }
