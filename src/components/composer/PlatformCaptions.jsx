import { useTranslation } from '@/lib/i18n';
import { Textarea } from '../ui/textarea';
import { PLATFORM_LABEL } from '@/lib/constants';
export default function PlatformCaptions({ platforms, captions, mainCaption, onChange }) { const { t } = useTranslation(); return <div className="space-y-3">{!platforms.length && <p className="label-xs">{t("Select destinations to customize platform captions.")}</p>}{platforms.map(p => <label key={p} className="block text-xs">{PLATFORM_LABEL[p]}<Textarea className="mt-2" placeholder={mainCaption || t("Uses the main caption when empty")} value={captions[p] || ''} onChange={e => onChange({ ...captions, [p]: e.target.value })} /></label>)}</div>; }
