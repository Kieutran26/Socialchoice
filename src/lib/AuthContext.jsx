import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { appClient } from '@/api/app-client';
import { useTranslation } from './i18n';
import AdminSignIn from '@/components/admin-sign-in';
import { isDesktop } from '@/api/desktop/runtime';
import { reconcileSubscriptionWithUser, getActiveMember, clearActiveMember } from './team-seats';

const AuthContext = createContext(null);

export function applyMemberOverlay(baseUser) {
    if (!baseUser) return null;
    const activeMember = getActiveMember();
    if (!activeMember) return baseUser;
    return {
        ...baseUser,
        ...activeMember,
        full_name: activeMember.name || baseUser.full_name,
        role: activeMember.role || 'editor',
        brandScope: activeMember.brandScope || 'all',
        isTeamMember: true,
    };
}

export function AuthProvider({ children }) {
    const { t } = useTranslation();
    const [rawUser, setRawUser] = useState(null);
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    // Keep rawUserRef synchronized on every render so event handlers never close over stale user
    const rawUserRef = useRef(rawUser);
    rawUserRef.current = rawUser;

    // Helper to sync effective user (applies member overlay and subscription reconciliation)
    const syncEffectiveUser = useCallback((base) => {
        if (!base) {
            setUser(null);
            return;
        }
        const effective = applyMemberOverlay(base);
        setUser(effective);
        if (effective) {
            reconcileSubscriptionWithUser(effective);
        }
    }, []);

    // 1. Session initialization / authentication effect: runs ONCE on mount
    useEffect(() => {
        let mounted = true;

        async function initAuth() {
            try {
                const me = await appClient.auth.me();
                if (!mounted) return;
                setRawUser(me);
                setError('');
            } catch (err) {
                if (!mounted) return;
                if (isDesktop()) {
                    // Supported desktop offline / single-user fallback
                    try {
                        await appClient.auth.loginViaEmailPassword('admin');
                        const me = await appClient.auth.me();
                        if (!mounted) return;
                        setRawUser(me);
                        setError('');
                    } catch {
                        if (!mounted) return;
                        const localUser = { id: 'local-owner', full_name: 'Admin', role: 'admin', mode: 'local-only' };
                        setRawUser(localUser);
                        setError('');
                    }
                } else {
                    // Web environment:
                    // Never auto-login as 'admin' and never fabricate 'local-owner' on web failure.
                    const msg = err?.message || '';
                    const status = err?.status;
                    const isUnauthenticated =
                        status === 401 ||
                        msg.includes('Sign in required') ||
                        msg.includes('Chưa đăng nhập') ||
                        msg.includes('Unauthorized');

                    if (isUnauthenticated) {
                        setRawUser(null);
                        setError('');
                    } else {
                        // Network error, 500, or quota limit reached (e.g. Cloudflare Error 1101)
                        setRawUser(null);
                        setError(msg || 'Lỗi kết nối máy chủ');
                    }
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }

        initAuth();

        return () => {
            mounted = false;
        };
    }, []);

    // 2. Member sync effect: runs whenever rawUser changes (computes user, does NOT re-run auth)
    useEffect(() => {
        syncEffectiveUser(rawUser);
    }, [rawUser, syncEffectiveUser]);

    // 3. Event listeners effect: registered once on mount, cleaned up on unmount
    useEffect(() => {
        let mounted = true;

        const handleAuthOrTeamChange = () => {
            if (!mounted) return;
            const currentBase = rawUserRef.current;
            if (currentBase) {
                syncEffectiveUser(currentBase);
            }
        };

        const handleSessionError = (event) => {
            if (!mounted) return;
            const msg = event?.detail || '';
            const isSignInRequired =
                msg === 'Sign in required' ||
                msg.includes('Chưa đăng nhập') ||
                msg.includes('Unauthorized');

            if (isSignInRequired) {
                if (isDesktop()) {
                    appClient.auth.loginViaEmailPassword('admin')
                        .then(() => appClient.auth.me())
                        .then((me) => {
                            if (mounted) setRawUser(me);
                        })
                        .catch(() => {
                            if (mounted) {
                                const localUser = { id: 'local-owner', full_name: 'Admin', role: 'admin', mode: 'local-only' };
                                setRawUser(localUser);
                            }
                        });
                } else {
                    // Web: clear active member and reset user so login UI is presented without looping
                    clearActiveMember();
                    setRawUser(null);
                }
            }
        };

        window.addEventListener('socialchoice:team', handleAuthOrTeamChange);
        window.addEventListener('socialchoice:auth', handleAuthOrTeamChange);
        window.addEventListener('socialchoice:error', handleSessionError);

        return () => {
            mounted = false;
            window.removeEventListener('socialchoice:team', handleAuthOrTeamChange);
            window.removeEventListener('socialchoice:auth', handleAuthOrTeamChange);
            window.removeEventListener('socialchoice:error', handleSessionError);
        };
    }, [syncEffectiveUser]);

    if (loading) return <p className="p-8">{t('Opening workspace…')}</p>;
    if (error) {
        return (
            <div role="alert" className="p-8">
                <h1 className="text-xl font-bold mb-2">{t(isDesktop() ? 'Unable to open local workspace' : 'Backend unavailable')}</h1>
                <p className="text-sm text-red-600 mb-4">{t(error)}</p>
                <p className="text-xs text-muted-foreground">{t(isDesktop() ? 'Restart the application. Your local data has not been removed.' : 'Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.')}</p>
            </div>
        );
    }
    if (!user) return <AdminSignIn onSignedIn={(signedInUser) => setRawUser(signedInUser)} />;
    return <AuthContext.Provider value={{ user, isAuthenticated: !!user, mode: user.mode }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
