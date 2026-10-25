import { useEffect, useState } from 'react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import CustomerSignIn from '@/components/customer-sign-in';
import { Button } from '@/components/ui/button';

export default function AdminSignIn({ onSignedIn }) {
    const { t, language, setLanguage } = useTranslation();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [customerReady, setCustomerReady] = useState(false), [owner, setOwner] = useState(false), [opening, setOpening] = useState(true);
    useEffect(() => { let active = true; appClient.customers.config().then(value => { if (active) setCustomerReady(value.ready === true); }).catch(() => {}).finally(() => { if (active) setOpening(false); }); return () => { active = false; }; }, []);
    async function submit(event) {
        event.preventDefault(); setBusy(true); setError('');
        try { await appClient.auth.loginViaEmailPassword(password); setPassword(''); onSignedIn(await appClient.auth.me()); }
        catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }
    return <main className="min-h-screen bg-white flex items-center justify-center p-6"><div className="w-full max-w-sm border rounded-xl p-8 space-y-6">
        <div className="font-heading text-xl">socialchoice<span className="text-brand">.</span></div>
        {opening ? <p role="status" className="text-sm">{t('Opening sign-in…')}</p> : customerReady && !owner ? <CustomerSignIn onSignedIn={onSignedIn} /> : <>
        <h1 className="font-heading text-2xl">{t('Admin sign-in')}</h1>
        <p className="text-sm text-muted-foreground">{t('Use your Socialchoice password. Facebook connects separately through Meta.')}</p>
        <form onSubmit={submit} className="space-y-4">
            <label htmlFor="admin-password" className="block text-sm">{t('Socialchoice password')}</label>
            <Input id="admin-password" type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={e => setPassword(e.target.value)} />
            {error && <p role="alert" className="text-sm text-red-700">{t(error)}</p>}
            <button type="submit" disabled={busy} className="btn-skew w-full">{t(busy ? 'Signing in…' : 'Sign in')}</button>
        </form>
        </>}
        {customerReady && <Button variant="ghost" size="sm" disabled={busy || opening} onClick={() => { setOwner(!owner); setPassword(''); setError(''); }}>{t(owner ? 'Customer sign-in' : 'Site owner sign-in')}</Button>}
        <select aria-label={t('Language')} className="border rounded-lg p-2 text-sm" value={language} onChange={e => setLanguage(e.target.value)}><option value="en">English</option><option value="vi">Tiếng Việt</option></select>
    </div></main>;
}
