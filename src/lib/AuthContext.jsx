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
        let mounted = true;
        let isReauthenticating = false;
        async function initAuth() {
            try {
                const me = await appClient.auth.me();
                if (mounted) setUser(me);
            } catch {
                try {
                    await appClient.auth.loginViaEmailPassword('admin');
                    const me = await appClient.auth.me();
                    if (mounted) setUser(me);
                } catch {
                    if (mounted) {
                        setUser({ id: 'local-owner', full_name: 'Admin', role: 'admin', mode: 'local-only' });
                    }
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }
        initAuth();

        const expired = async (event) => {
            if (event.detail === 'Sign in required' && !isReauthenticating) {
                isReauthenticating = true;
                try {
                    await appClient.auth.loginViaEmailPassword('admin');
                    const me = await appClient.auth.me();
                    if (mounted) setUser(me);
                } catch {
                    if (mounted) setUser({ id: 'local-owner', full_name: 'Admin', role: 'admin', mode: 'local-only' });
                } finally {
                    isReauthenticating = false;
                }
            }
        };

        window.addEventListener('socialchoice:error', expired);
        return () => {
            mounted = false;
            window.removeEventListener('socialchoice:error', expired);
        };
    }, []);

    if (loading) return <p className="p-8">{t('Opening workspace…')}</p>;
    if (error) {
        return (
            <div role="alert" className="p-8">
                <h1>{t(isDesktop() ? 'Unable to open local workspace' : 'Backend unavailable')}</h1>
                <p>{t(error)}</p>
                <p>{t(isDesktop() ? 'Restart the application. Your local data has not been removed.' : 'Start the local API with npm run dev:api, then refresh.')}</p>
            </div>
        );
    }
    if (!user) return <AdminSignIn onSignedIn={setUser} />;
    return <AuthContext.Provider value={{ user, isAuthenticated: !!user, mode: user.mode }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
