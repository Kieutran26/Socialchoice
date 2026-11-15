import { createContext, useContext, useEffect, useState } from 'react';
import { appClient } from '@/api/app-client';
import { useTranslation } from './i18n';
import AdminSignIn from '@/components/admin-sign-in';
import { isDesktop } from '@/api/desktop/runtime';
import { reconcileSubscriptionWithUser } from './team-seats';

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
            const withTimeout = (promise, ms = 4000) =>
                Promise.race([
                    promise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), ms)),
                ]);
            try {
                const me = await withTimeout(appClient.auth.me(), 4000);
                if (mounted) {
                    setUser(me);
                    reconcileSubscriptionWithUser(me);
                }
            } catch {
                try {
                    await withTimeout(appClient.auth.loginViaEmailPassword('admin'), 4000);
                    const me = await withTimeout(appClient.auth.me(), 4000);
                    if (mounted) {
                        setUser(me);
                        reconcileSubscriptionWithUser(me);
                    }
                } catch {
                    if (mounted) {
                        const localUser = { id: 'local-owner', full_name: 'Admin', role: 'admin', mode: 'local-only' };
                        setUser(localUser);
                        reconcileSubscriptionWithUser(localUser);
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
