import { useTranslation } from '@/lib/i18n';
import { PLATFORM_LABEL } from '@/lib/constants';
import { CAPTION_LIMITS, captionLength, resolveCaption, resolveMedia } from '@/lib/publishing-content';
import { CheckCircle, WarningCircle, ShieldCheck } from '@phosphor-icons/react';

export default function DestinationChecks({ checks, post }) {
    const { t } = useTranslation();
    if (!checks.length) return null;

    const hasAnyIssues = checks.some((c) => c.issues.length > 0);

    return (
        <section className="panel p-4 sm:p-5 space-y-3.5" aria-label={t('Channel checks')}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${hasAnyIssues ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                        {hasAnyIssues ? <WarningCircle size={17} weight="fill" /> : <ShieldCheck size={17} weight="fill" />}
                    </div>
                    <h2 className="text-[14px] font-semibold text-foreground">{t('Channel checks')}</h2>
                </div>
                <span className={`label-xs font-medium px-2 py-0.5 rounded-full ${hasAnyIssues ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {hasAnyIssues ? t('Issues detected') : t('All checks passed')}
                </span>
            </div>

            <p className="label-xs text-muted-foreground leading-relaxed">
                {t('Fix the listed issues before reviewing publication. Drafts can be saved at any time. Server permissions are checked during review.')}
            </p>

            <div className="space-y-2.5 pt-1">
                {checks.map(({ account, issues }) => {
                    const currentLength = captionLength(resolveCaption(post, account), account.platform);
                    const maxLimit = CAPTION_LIMITS[account.platform];
                    const isOverLimit = maxLimit && currentLength > maxLimit;
                    const mediaCount = resolveMedia(post, account).length;
                    const hasIssues = issues.length > 0;

                    return (
                        <div
                            key={account.id}
                            className={`rounded-xl border p-3 text-xs transition-colors ${
                                hasIssues
                                    ? 'border-red-200/80 bg-red-50/40'
                                    : 'border-border bg-card'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="font-semibold text-foreground truncate">{account.name}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {PLATFORM_LABEL[account.platform] || account.platform}
                                    </p>
                                </div>
                                <span
                                    className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                        hasIssues
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-emerald-100 text-emerald-700'
                                    }`}
                                >
                                    {hasIssues ? (
                                        <>
                                            <WarningCircle size={12} weight="bold" />
                                            {issues.length} {t('issues')}
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={12} weight="fill" />
                                            {t('Ready')}
                                        </>
                                    )}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
                                <span className={isOverLimit ? 'text-red-600 font-semibold' : ''}>
                                    {currentLength} / {maxLimit || '—'} {t('characters')}
                                </span>
                                <span>•</span>
                                <span>
                                    {t(Object.hasOwn(post.platform_media || {}, account.platform) ? 'Custom media' : 'Shared media')} ({mediaCount})
                                </span>
                            </div>

                            {hasIssues && (
                                <ul className="mt-2.5 space-y-1 rounded-lg bg-red-100/60 p-2 text-[11px] text-red-800">
                                    {issues.map((issue) => (
                                        <li key={issue} className="flex items-start gap-1.5">
                                            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-red-600" />
                                            <span>{t(issue)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
