import { createContext, useContext, useEffect, useState } from 'react';
import { appClient } from '@/api/app-client';
import { useTranslation } from './i18n';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        appClient.auth.me().then(setUser).catch((e) => setError(e.message)).finally(() => setLoading(false));
    }, []);
    if (loading) return <p className="p-8">{t('Opening workspace…')}</p>;
    if (error) return <div role="alert" className="p-8"><h1>{t('Backend unavailable')}</h1><p>{t(error)}</p><p>{t('Start the local API with npm run dev:api, then refresh.')}</p></div>;
    return <AuthContext.Provider value={{ user, isAuthenticated: !!user, mode: 'local-only' }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
