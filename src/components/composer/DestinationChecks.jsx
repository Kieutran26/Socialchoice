import { useTranslation } from '@/lib/i18n';
import { PLATFORM_LABEL } from '@/lib/constants';
import { CAPTION_LIMITS, captionLength, resolveCaption } from '@/lib/publishing-content';

export default function DestinationChecks({ checks, post }) {
    const { t } = useTranslation();
    if (!checks.length) return null;
    return <section className="panel p-4 space-y-3" aria-label={t('Channel checks')}>
        <h2 className="text-[15px]">{t('Channel checks')}</h2>
        <p className="label-xs">{t('Fix the listed issues before reviewing publication. Drafts can be saved at any time. Server permissions are checked during review.')}</p>
        {checks.map(({ account, issues }) => <div key={account.id} className="border-t pt-3 text-xs space-y-2">
            <p className="font-medium break-words">{account.name} · {PLATFORM_LABEL[account.platform]}</p>
            <p className="label-xs">{captionLength(resolveCaption(post, account), account.platform)} / {CAPTION_LIMITS[account.platform] || '—'} {t('characters')}</p>
            {issues.length ? <ul className="list-disc pl-4 space-y-1 text-dangerFg">{issues.map(issue => <li key={issue}>{t(issue)}</li>)}</ul> : <p>{t('Content checks passed')}</p>}
        </div>)}
    </section>;
}
