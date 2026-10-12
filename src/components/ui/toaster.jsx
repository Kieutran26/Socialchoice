import { useTranslation } from '@/lib/i18n';
import { Toaster as Sonner } from 'sonner';
import { useEffect } from 'react';
import { toast } from './use-toast';
export function Toaster() { const { t } = useTranslation();
   
    useEffect(() => {
        const handleError = event => toast({ title: t("Request failed"), description: t(String(event.detail || 'Please try again.')), variant: 'destructive' });
        window.addEventListener('socialchoice:error', handleError);
        return () => window.removeEventListener('socialchoice:error', handleError);
    }, [t]);
    return <Sonner position="bottom-right" richColors containerAriaLabel={t('Notifications')} toastOptions={{ closeButtonAriaLabel: t('Close toast') }} />;
}
