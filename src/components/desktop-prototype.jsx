import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import DesktopLicenseNotice from './desktop-license-notice';

export default function DesktopPrototype({ children }) {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const supported = ['/', '/settings', '/create', '/posts', '/calendar', '/strategy', '/strategy/pillars', '/strategy/angles', '/media', '/templates', '/analytics', '/accounts'].includes(pathname);
    return <>
        <DesktopLicenseNotice />
        <div role="status" className="panel mb-5 p-4 text-sm">
            <p>{t('Drafts, strategy and calendar plans are saved on this computer. Web and cloud data are separate.')}</p>
            <p className="mt-2 text-muted-foreground">{t('Calendar plans do not publish automatically. Optional AI uses your own API account. Social connections require a configured login service.')}</p>
            <Link to="/settings" className="mt-2 inline-block underline">{t('Manage brands')}</Link>
        </div>
        {supported ? children : <p role="status" className="panel p-5">{t('Feature unavailable in this desktop prototype')}</p>}
    </>;
}
