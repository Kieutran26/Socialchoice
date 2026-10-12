import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { getLanguage, setLanguage, subscribeLanguage, translate } from './i18n-core.js';

export function useTranslation() {
    const language = useSyncExternalStore(subscribeLanguage, getLanguage, () => 'vi');
    const t = useMemo(() => (key, values = {}) => translate(key, values, language), [language]);
    return { t, language, setLanguage };
}

export function LanguageProvider({ children }) {
    const { language, t } = useTranslation();
    useEffect(() => {
        document.documentElement.lang = language;
        document.title = t('Social Publishing Hub');
    }, [language, t]);
    return children;
}
