import { useTranslation } from '@/lib/i18n';
import { Textarea } from '../ui/textarea';
import { PLATFORM_LABEL } from '@/lib/constants';
import { CAPTION_LIMITS, captionLength } from '@/lib/publishing-content';

export default function PlatformCaptions({ platforms, captions, mainCaption, onChange }) {
    const { t } = useTranslation();
    if (!platforms.length) return null;
    return <section className="panel p-5 space-y-4">
        <h2 className="text-[15px]">{t('Captions by platform')}</h2>
        <p className="label-xs">{t('Leave empty to use the main caption. Account captions override platform captions.')}</p>
        {platforms.map(platform => {
            const count = captionLength(captions[platform]?.trim() ? captions[platform] : mainCaption, platform);
            const limit = CAPTION_LIMITS[platform];
            return <label key={platform} className="block text-xs">{PLATFORM_LABEL[platform]}
                <Textarea aria-label={t('Caption for {platform}', { platform: PLATFORM_LABEL[platform] })} className="mt-2" rows={3}
                    placeholder={mainCaption || t('Uses the main caption when empty')} value={captions[platform] || ''}
                    onChange={e => onChange({ ...captions, [platform]: e.target.value })} />
                <span className={`block mt-1 ${count > limit ? 'text-dangerFg' : 'label-xs'}`}>{count} / {limit} {t('characters')}</span>
            </label>;
        })}
    </section>;
}
