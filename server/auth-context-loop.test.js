import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Helper to simulate the AuthContext state and lifecycle logic
function createAuthContextSimulation({ isDesktop = false } = {}) {
    let rawUser = null;
    let user = null;
    let error = '';
    let loading = true;
    let mounted = true;

    // rawUserRef pattern
    const rawUserRef = { current: null };

    const setRawUser = (newUser) => {
        rawUser = newUser;
        rawUserRef.current = newUser;
        // Effect B: [rawUser] triggers syncEffectiveUser
        syncEffectiveUser(newUser);
    };

    const setUser = (newEffectiveUser) => {
        user = newEffectiveUser;
    };

    const setError = (err) => {
        error = err;
    };

    const setLoading = (load) => {
        loading = load;
    };

    let activeMember = null;
    const getActiveMember = () => activeMember;
    const setActiveMember = (m) => { activeMember = m; };
    const clearActiveMember = () => { activeMember = null; };

    const applyMemberOverlay = (baseUser) => {
        if (!baseUser) return null;
        const member = getActiveMember();
        if (!member) return baseUser;
        return {
            ...baseUser,
            ...member,
            full_name: member.name || baseUser.full_name,
            role: member.role || 'editor',
            brandScope: member.brandScope || 'all',
            isTeamMember: true,
        };
    };

    const syncEffectiveUser = (base) => {
        if (!base) {
            setUser(null);
            return;
        }
        const effective = applyMemberOverlay(base);
        setUser(effective);
    };

    // Tracking mocks
    const calls = {
        me: 0,
        loginViaEmailPassword: [],
    };

    let mePromise = null;
    let loginPromise = null;

    const mockAppClient = {
        auth: {
            me: async () => {
                calls.me += 1;
                if (mePromise) return mePromise();
                return { id: 'usr-1', email: 'owner@test.com', full_name: 'Owner', role: 'admin' };
            },
            loginViaEmailPassword: async (pwd) => {
                calls.loginViaEmailPassword.push(pwd);
                if (loginPromise) return loginPromise(pwd);
                return { ok: true };
            },
        },
    };

    // Event listener registry
    const listeners = new Map();
    const mockWindow = {
        addEventListener: (event, handler) => {
            if (!listeners.has(event)) listeners.set(event, new Set());
            listeners.get(event).add(handler);
        },
        removeEventListener: (event, handler) => {
            if (listeners.has(event)) {
                listeners.get(event).delete(handler);
            }
        },
        dispatchEvent: (event, detail) => {
            const handlers = listeners.get(event);
            if (handlers) {
                for (const h of handlers) {
                    h({ type: event, detail });
                }
            }
        },
    };

    // 1. Session initialization (runs ONCE on mount [])
    async function initAuth() {
        try {
            const me = await mockAppClient.auth.me();
            if (!mounted) return;
            setRawUser(me);
            setError('');
        } catch (err) {
            if (!mounted) return;
            if (isDesktop) {
                try {
                    await mockAppClient.auth.loginViaEmailPassword('admin');
                    const me = await mockAppClient.auth.me();
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
                    setRawUser(null);
                    setError(msg || 'Lỗi kết nối máy chủ');
                }
            }
        } finally {
            if (mounted) setLoading(false);
        }
    }

    // 2. Event listeners (mounted once [])
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
            if (isDesktop) {
                mockAppClient.auth.loginViaEmailPassword('admin')
                    .then(() => mockAppClient.auth.me())
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
                clearActiveMember();
                setRawUser(null);
            }
        }
    };

    mockWindow.addEventListener('socialchoice:team', handleAuthOrTeamChange);
    mockWindow.addEventListener('socialchoice:auth', handleAuthOrTeamChange);
    mockWindow.addEventListener('socialchoice:error', handleSessionError);

    const cleanup = () => {
        mounted = false;
        mockWindow.removeEventListener('socialchoice:team', handleAuthOrTeamChange);
        mockWindow.removeEventListener('socialchoice:auth', handleAuthOrTeamChange);
        mockWindow.removeEventListener('socialchoice:error', handleSessionError);
    };

    return {
        get rawUser() { return rawUser; },
        get user() { return user; },
        get error() { return error; },
        get loading() { return loading; },
        get isMounted() { return mounted; },
        rawUserRef,
        setRawUser,
        initAuth,
        cleanup,
        mockWindow,
        listeners,
        calls,
        setMePromise: (fn) => { mePromise = fn; },
        setLoginPromise: (fn) => { loginPromise = fn; },
        setActiveMember,
        clearActiveMember,
    };
}

describe('AuthContext loop and lifecycle protection', () => {
    it('1. Updating rawUser does NOT re-run initAuth (no infinite session API calls)', async () => {
        const ctx = createAuthContextSimulation({ isDesktop: false });

        // Initial mount triggers initAuth() once
        await ctx.initAuth();
        assert.equal(ctx.calls.me, 1, 'appClient.auth.me() called exactly once on mount');
        assert.equal(ctx.rawUser?.id, 'usr-1');
        assert.equal(ctx.user?.id, 'usr-1');
        assert.equal(ctx.loading, false);

        // When rawUser updates with a new object reference (e.g. from background sync or state update)
        ctx.setRawUser({ id: 'usr-1', email: 'owner@test.com', full_name: 'Owner Updated', role: 'admin' });
        ctx.setRawUser({ id: 'usr-1', email: 'owner@test.com', full_name: 'Owner Updated 2', role: 'admin' });

        // initAuth is NOT called again because initAuth is detached from [rawUser]
        assert.equal(ctx.calls.me, 1, 'appClient.auth.me() is NOT re-triggered when rawUser reference changes');
        assert.equal(ctx.user?.full_name, 'Owner Updated 2');
    });

    it('2. Member events access the newest rawUser via rawUserRef (no stale closure)', async () => {
        const ctx = createAuthContextSimulation({ isDesktop: false });
        await ctx.initAuth();

        // User updates later
        ctx.setRawUser({ id: 'usr-2', email: 'newowner@test.com', full_name: 'New Owner', role: 'admin' });

        // Simulate switching active member
        ctx.setActiveMember({ name: 'Editor Alice', role: 'editor', brandScope: 'brand-1' });

        // Dispatch socialchoice:team event
        ctx.mockWindow.dispatchEvent('socialchoice:team');

        // Verify overlay applied to NEW user (usr-2), not the old one
        assert.equal(ctx.user.id, 'usr-2');
        assert.equal(ctx.user.full_name, 'Editor Alice');
        assert.equal(ctx.user.role, 'editor');
        assert.equal(ctx.user.isTeamMember, true);
    });

    it('3. Web mode (!isDesktop) does NOT auto-login as admin or create fake local-owner on 401', async () => {
        const ctx = createAuthContextSimulation({ isDesktop: false });
        ctx.setMePromise(() => {
            const err = new Error('Sign in required');
            err.status = 401;
            throw err;
        });

        await ctx.initAuth();

        assert.equal(ctx.calls.me, 1);
        assert.equal(ctx.calls.loginViaEmailPassword.length, 0, 'No admin login attempt on web 401');
        assert.equal(ctx.rawUser, null, 'rawUser is null');
        assert.equal(ctx.user, null, 'user is null, prompting sign-in cleanly');
        assert.equal(ctx.error, '', 'No unhandled error prompt for normal sign-in prompt');
        assert.equal(ctx.loading, false);
    });

    it('4. Web mode displays server error without looping on network/quota failure', async () => {
        const ctx = createAuthContextSimulation({ isDesktop: false });
        ctx.setMePromise(() => {
            const err = new Error('Lỗi máy chủ (Worker threw exception)');
            err.status = 500;
            throw err;
        });

        await ctx.initAuth();

        assert.equal(ctx.calls.me, 1, 'Only called once, no loop');
        assert.equal(ctx.calls.loginViaEmailPassword.length, 0, 'No admin login retry');
        assert.equal(ctx.user, null);
        assert.ok(ctx.error.includes('Worker threw exception'), 'Error displayed to user');
        assert.equal(ctx.loading, false);
    });

    it('5. Desktop mode (isDesktop) retains single-user offline fallback to admin and local-owner', async () => {
        const ctx = createAuthContextSimulation({ isDesktop: true });
        ctx.setMePromise(() => {
            throw new Error('Connection refused');
        });
        ctx.setLoginPromise(() => {
            throw new Error('Local daemon offline');
        });

        await ctx.initAuth();

        assert.equal(ctx.calls.loginViaEmailPassword.length, 1);
        assert.equal(ctx.calls.loginViaEmailPassword[0], 'admin');
        assert.equal(ctx.user?.id, 'local-owner');
        assert.equal(ctx.user?.mode, 'local-only');
    });

    it('6. Cleanup properly unregisters all listeners and ignores async results after unmount', async () => {
        const ctx = createAuthContextSimulation({ isDesktop: false });
        
        let delayedResolve;
        ctx.setMePromise(() => new Promise((resolve) => {
            delayedResolve = resolve;
        }));

        // Start initAuth
        const initPromise = ctx.initAuth();

        // Check listeners registered
        assert.equal(ctx.listeners.get('socialchoice:team').size, 1);
        assert.equal(ctx.listeners.get('socialchoice:auth').size, 1);
        assert.equal(ctx.listeners.get('socialchoice:error').size, 1);

        // Component unmounts
        ctx.cleanup();

        // Listeners removed
        assert.equal(ctx.listeners.get('socialchoice:team').size, 0);
        assert.equal(ctx.listeners.get('socialchoice:auth').size, 0);
        assert.equal(ctx.listeners.get('socialchoice:error').size, 0);

        // Resolve async call after unmount
        delayedResolve({ id: 'late-usr', full_name: 'Late' });
        await initPromise;

        // State remains unaffected because component was unmounted
        assert.equal(ctx.rawUser, null, 'rawUser was not set after unmount');
        assert.equal(ctx.user, null, 'user was not set after unmount');
    });

    it('7. socialchoice:error event on web clears active member and resets user without admin login loop', async () => {
        const ctx = createAuthContextSimulation({ isDesktop: false });
        await ctx.initAuth();

        ctx.setActiveMember({ name: 'Active Alice', role: 'editor' });
        ctx.mockWindow.dispatchEvent('socialchoice:team');
        assert.equal(ctx.user.full_name, 'Active Alice');

        // Trigger session error
        ctx.mockWindow.dispatchEvent('socialchoice:error', 'Sign in required');

        assert.equal(ctx.calls.loginViaEmailPassword.length, 0, 'No admin login called');
        assert.equal(ctx.rawUser, null);
        assert.equal(ctx.user, null);
    });
});
