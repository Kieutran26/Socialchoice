import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';

export default function CustomerLicense() {
    const { user } = useAuth(), { t } = useTranslation();
    if (user?.mode !== 'web-customer') return null;
    return <section className="panel p-5 space-y-2 text-sm">
        <h2 className="text-[15px]">{t('License and account')}</h2>
        <p className="break-words">{t('Email')}: {user.email}</p>
        <p>{t('Edition')}: {user.license.edition}</p>
        <p className="break-all">{t('License ID')}: {user.license.license_id}</p>
        <p>{t('One-time account license · Multiple devices')}</p>
        <p className="text-muted-foreground">{t('Your social accounts and content belong to this workspace. Other customers cannot access them.')}</p>
    </section>;
}
