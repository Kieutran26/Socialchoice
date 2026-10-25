import { Button } from '../ui/button';
import { useTranslation } from '@/lib/i18n';

export default function LoadError({ message, onRetry }) {
    const { t } = useTranslation();
    return <div role="alert" className="panel p-5"><p>{t(message)}</p><Button variant="outline" className="mt-3" onClick={onRetry}>{t('Retry')}</Button></div>;
}
