import { useTranslation } from '@/lib/i18n';
import { Link } from 'react-router-dom';
export default function AuthLayout(/** @type {{children?: import('react').ReactNode, icon?: import('react').ElementType, title?: string, subtitle?: string, footer?: import('react').ReactNode}} */ _props) { const { t } = useTranslation();
    return <main className="min-h-screen flex items-center justify-center p-6"><section className="panel p-8 max-w-lg"><h1 className="text-xl">{t("Local workspace")}</h1><p className="text-sm text-muted-foreground mt-3">{t("Account login, registration and password recovery are unavailable in this local-only version.")}</p><Link to="/" className="btn-skew mt-6">{t("Open Socialchoice")}</Link></section></main>;
}
