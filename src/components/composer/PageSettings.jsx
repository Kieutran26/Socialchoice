import { useTranslation } from '@/lib/i18n';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

export default function PageSettings({ accounts, settings, onChange }) {
    const { t } = useTranslation();
    if (!accounts.length) return null;
    const change = (id, patch) => onChange({ ...settings, [id]: { ...settings[id], ...patch } });
    return <section className="panel p-5 space-y-4">
        <h2 className="text-[15px]">{t('Per-Page content and schedule')}</h2>
        <p className="label-xs">{t('Use the main caption and schedule by default, or customize each Page. Media is shared.')}</p>
        {accounts.map(account => <fieldset key={account.id} className="border rounded-lg p-3 min-w-0 space-y-3">
            <legend className="text-sm px-1 break-words">{account.name}</legend>
            <label className="block text-xs"><span>{t('Page caption (optional)')}</span><Textarea aria-label={t('Page caption (optional)')} className="mt-2" rows={3} value={settings[account.id]?.caption || ''} onChange={event => change(account.id, { caption: event.target.value })} placeholder={t('Use main caption')} /></label>
            <label className="block text-xs"><span>{t('Page publishing time (optional)')}</span><Input aria-label={t('Page publishing time (optional)')} className="mt-2 min-w-0" type="datetime-local" value={settings[account.id]?.localTime || ''} onChange={event => change(account.id, { localTime: event.target.value })} /></label>
            <p className="label-xs">{t('Uses the timezone below. Page times apply only when scheduling.')}</p>
        </fieldset>)}
    </section>;
}
