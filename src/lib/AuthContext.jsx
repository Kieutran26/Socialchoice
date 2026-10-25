import { createContext, useContext, useEffect, useState } from 'react';
import { appClient } from '@/api/app-client';
import { useTranslation } from './i18n';
import AdminSignIn from '@/components/admin-sign-in';
import { isDesktop } from '@/api/desktop/runtime';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        appClient.auth.me().then(setUser).catch((e) => { if (e.status !== 401) setError(e.message); }).finally(() => setLoading(false));
        const expired = (event) => { if (event.detail === 'Sign in required') setUser(null); };
        window.addEventListener('socialchoice:error', expired);
        return () => window.removeEventListener('socialchoice:error', expired);
    }, []);
    if (loading) return <p className="p-8">{t('Opening workspace…')}</p>;
    if (error) return <div role="alert" className="p-8"><h1>{t(isDesktop() ? 'Unable to open local workspace' : 'Backend unavailable')}</h1><p>{t(error)}</p><p>{t(isDesktop() ? 'Restart the application. Your local data has not been removed.' : 'Start the local API with npm run dev:api, then refresh.')}</p></div>;
    if (!user) return <AdminSignIn onSignedIn={setUser} />;
    return <AuthContext.Provider value={{ user, isAuthenticated: !!user, mode: user.mode }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
