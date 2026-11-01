import { useTranslation } from '@/lib/i18n';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { PLATFORM_LABEL } from '@/lib/constants';
import MediaUploader from './MediaUploader';
import CommentChainEditor from './CommentChainEditor';
import LinkedinMentionBar from './LinkedinMentionBar';

    export default function PageSettings({
        accounts,
        settings,
        onChange,
        brandId,
        demoMode = false,
        disabled = false,
        onBusyChange,
        showSchedule = true,
        linkedinAccounts = [],
    }) {
        const { t } = useTranslation();
        if (!accounts.length) return null;
        const change = (id, patch) => onChange({ ...settings, [id]: { ...settings[id], ...patch } });

        const toggleAccountMedia = (id, checked) => {
            const current = { ...(settings[id] || {}) };
            if (checked) {
                current.media = [];
            } else {
                delete current.media;
                delete current.media_ids;
            }
            onChange({ ...settings, [id]: current });
        };

        const toggleAccountComments = (id, checked) => {
            const current = { ...(settings[id] || {}) };
            if (checked) {
                current.comments = [];
            } else {
                delete current.comments;
            }
            onChange({ ...settings, [id]: current });
        };

                                return (
                                <section className="panel p-5 space-y-4">
                                    <h2 className="text-[15px]">{t('Per-account content and schedule')}</h2>
                                    <p className="label-xs">
                                        {t('Use the platform caption and shared schedule by default, or customize each account. Set media in Media by platform.')}
                                    </p>
                                    {accounts.map((account) => {
                                        const accountSetting = settings[account.id] || {};
                                        const hasCustomMedia = Object.hasOwn(accountSetting, 'media');
                                        const hasCustomComments = Object.hasOwn(accountSetting, 'comments');
                                        return (
                                            <fieldset key={account.id} disabled={disabled} className="border rounded-lg p-3 min-w-0 space-y-3">
                                                <legend className="text-sm px-1 break-words">
                                                    {account.name} · {PLATFORM_LABEL[account.platform]}
                                                </legend>
                                                <div className="block text-xs">
                                                    <label className="block">
                                                        <span>{t('Account caption (optional)')}</span>
                                                        <Textarea
                                                            aria-label={t('Caption for {account}', { account: account.name })}
                                                            className="mt-2"
                                                            rows={3}
                                                            value={accountSetting.caption || ''}
                                                            onChange={(event) => change(account.id, { caption: event.target.value })}
                                                            placeholder={t('Use platform or main caption')}
                                                        />
                                                    </label>
                            {account.platform === 'linkedin' && (
                                                        <LinkedinMentionBar
                                                            linkedinAccounts={linkedinAccounts}
                                                            onInsert={(token) => {
                                                                const current = accountSetting.caption || '';
                                                                const sep = current && !/\s$/.test(current) ? ' ' : '';
                                                                change(account.id, { caption: `${current}${sep}${token} ` });
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                                {showSchedule && (
                                                    <>
                                                        <label className="block text-xs">
                                                            <span>{t('Account publishing time (optional)')}</span>
                                                            <Input
                                                                aria-label={t('Publishing time for {account}', { account: account.name })}
                                                                className="mt-2 min-w-0"
                                                                type="datetime-local"
                                                                value={accountSetting.localTime || ''}
                                                                onChange={(event) => change(account.id, { localTime: event.target.value })}
                                                            />
                                                        </label>
                                                        <p className="label-xs">{t('Uses the timezone below. Account times apply only when scheduling.')}</p>
                                                    </>
                                                )}

                                                                {brandId && (
                                                                    <div className="pt-2 border-t border-border/50 space-y-2.5">
                                                                        <label className="flex items-start gap-2 text-xs font-medium cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="mt-0.5"
                                                                                checked={hasCustomMedia}
                                                                                onChange={(event) => toggleAccountMedia(account.id, event.target.checked)}
                                                                            />
                                                                            <span>{t('Use separate media for {account}', { account: account.name })}</span>
                                                                        </label>
                                                                        {hasCustomMedia && (
                                                                            <div className="pl-5 space-y-2">
                                                                                {!(accountSetting.media || []).length && (
                                                                                    <p role="status" className="label-xs">
                                                                                        {t('No media for this account. Choose files below, or leave empty for a text-only post where supported.')}
                                                                                    </p>
                                                                                )}
                                                                                <MediaUploader
                                                                                    assets={accountSetting.media || []}
                                                                                    onChange={(media) => change(account.id, { media })}
                                                                                    brandId={brandId}
                                                                                    demoMode={demoMode}
                                                                                    onBusyChange={onBusyChange}
                                                                                />
                                    </div>
                                                                        )}

                                                                        {account.platform !== 'tiktok' && (
                                                                            <>
                                                                                <label className="flex items-start gap-2 text-xs font-medium cursor-pointer">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="mt-0.5"
                                                                                        checked={hasCustomComments}
                                                                                        onChange={(event) => toggleAccountComments(account.id, event.target.checked)}
                                                                                    />
                                            <span>{t('Use separate comments for {account}', { account: account.name })}</span>
                                                                                        </label>
                                                                                        {hasCustomComments && (
                                                                                            <div className="pl-5 pt-1">
                                                                                                <CommentChainEditor
                                                                                                    comments={accountSetting.comments || []}
                                                                                                    onChange={(comments) => change(account.id, { comments })}
                                                                                                    brandId={brandId}
                                                                                                    demoMode={demoMode}
                                                                                                    disabled={disabled}
                                                                                                    onBusyChange={onBusyChange}
                                                                                                    compact
                                                                                                    platforms={[account.platform]}
                                                                                                    linkedinAccounts={linkedinAccounts}
                                                                                                />
                                                    </div>
                                                )}
                                            </>
                                        )
                                    }
                            </div>
                        )}
                        </fieldset>
                    );
                })}
            </section>
        );
    }
