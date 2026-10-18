import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { PLATFORM_LABEL } from '@/lib/constants';
import MediaUploader from './MediaUploader';

export default function PlatformMedia({ platforms, media, onChange, brandId, demoMode, disabled, onBusyChange }) {
    const { t } = useTranslation();
    const [selected, setSelected] = useState('');
    const platform = platforms.includes(selected) ? selected : platforms[0];
    if (!platform) return null;
    const overridden = Object.hasOwn(media, platform);
    function toggle(checked) {
        const next = { ...media };
        if (checked) next[platform] = [];
        else delete next[platform];
        onChange(next);
    }
    return <section className="panel p-5 space-y-4" aria-label={t('Media by platform')}>
        <h2 className="text-[15px]">{t('Media by platform')}</h2>
        <p className="label-xs">{t('Each platform uses shared media unless customized. An empty custom selection publishes without media where supported.')}</p>
        <fieldset disabled={disabled} className="space-y-4">
            <label className="block text-xs">{t('Media platform')}
                <select className="mt-2 w-full border rounded-lg p-2 bg-background" value={platform} onChange={event => setSelected(event.target.value)}>
                    {platforms.map(value => <option key={value} value={value}>{PLATFORM_LABEL[value]} · {t(Object.hasOwn(media, value) ? 'Custom media' : 'Shared media')}</option>)}
                </select>
            </label>
            <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={overridden} onChange={event => toggle(event.target.checked)} />
                {t('Use separate media for {platform}', { platform: PLATFORM_LABEL[platform] })}
            </label>
            {overridden ? <div key={platform} className="space-y-3">
                {!media[platform].length && <p role="status" className="label-xs">{t('No media for this platform. Choose files below, or leave empty for a text-only post where supported.')}</p>}
                <MediaUploader assets={media[platform]} onChange={assets => onChange({ ...media, [platform]: assets })} brandId={brandId} demoMode={demoMode} onBusyChange={onBusyChange} />
            </div> : <p className="label-xs">{t('Using shared media. Changes to shared media also apply to this platform.')}</p>}
        </fieldset>
    </section>;
}
