import { useState } from 'react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function CustomerSignIn({ onSignedIn }) {
    const { t } = useTranslation();
    const [mode, setMode] = useState('login'), [email, setEmail] = useState(''), [password, setPassword] = useState('');
    const [license, setLicense] = useState(''), [recovery, setRecovery] = useState(''), [receipt, setReceipt] = useState('');
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    async function finish() { setBusy(true); setError(''); try { onSignedIn(await appClient.auth.me()); } catch (e) { setError(e.message); } finally { setBusy(false); } }
    async function submit(event) {
        event.preventDefault(); setBusy(true); setError('');
        try {
            const input = { email, password, ...(mode === 'register' ? { license } : mode === 'recover' ? { recoveryCode: recovery } : {}) };
            const result = await appClient.customers[mode](input);
            setPassword(''); setLicense(''); setRecovery('');
            if (result.recoveryCode) setReceipt(result.recoveryCode); else onSignedIn(await appClient.auth.me());
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }
    if (receipt) return <section className="space-y-4">
        <h1 className="font-heading text-2xl">{t('Save your recovery code')}</h1>
        <p className="text-sm text-muted-foreground">{t('Keep this code somewhere private. It can reset your password and is shown only now. A new recovery replaces the previous code.')}</p>
        <label htmlFor="customer-recovery-receipt" className="block text-sm">{t('Recovery code')}</label>
        <Textarea id="customer-recovery-receipt" readOnly value={receipt} className="break-all" />
        {error && <p role="alert" className="text-sm text-dangerFg">{t(error)}</p>}
        <button className="btn-skew w-full" disabled={busy} onClick={finish}>{t('I saved the code — open workspace')}</button>
    </section>;
    return <section className="space-y-4">
        <h1 className="font-heading text-2xl">{t(mode === 'register' ? 'Activate your account' : mode === 'recover' ? 'Recover your account' : 'Customer sign-in')}</h1>
        <p className="text-sm text-muted-foreground">{t('One license belongs to your account. Use it on multiple devices; your workspace stays private.')}</p>
        <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5"><label htmlFor="customer-email" className="block text-sm">{t('Email')}</label><Input id="customer-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /></div>
            <div className="space-y-1.5"><label htmlFor="customer-password" className="block text-sm">{t(mode === 'login' ? 'Password' : 'New password')}</label><Input id="customer-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'login' ? undefined : 15} maxLength={256} required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />{mode !== 'login' && <p className="label-xs">{t('Use at least 15 characters.')}</p>}</div>
            {mode === 'register' && <div className="space-y-1.5"><label htmlFor="customer-license" className="block text-sm">{t('Web license')}</label><Textarea id="customer-license" rows={3} maxLength={8192} required value={license} onChange={e => setLicense(e.target.value)} disabled={busy} /><p className="label-xs">{t('Paste the license issued for this email address. Desktop licenses are separate.')}</p></div>}
            {mode === 'recover' && <div className="space-y-1.5"><label htmlFor="customer-recovery" className="block text-sm">{t('Recovery code')}</label><Input id="customer-recovery" autoComplete="off" maxLength={64} required value={recovery} onChange={e => setRecovery(e.target.value)} disabled={busy} /></div>}
            {error && <p role="alert" className="text-sm text-dangerFg">{t(error)}</p>}
            <button type="submit" disabled={busy} className="btn-skew w-full">{t(busy ? 'Signing in…' : mode === 'register' ? 'Activate and create account' : mode === 'recover' ? 'Reset password' : 'Sign in')}</button>
        </form>
        <div className="flex flex-wrap gap-2">{['login', 'register', 'recover'].filter(value => value !== mode).map(value => <Button key={value} variant="ghost" size="sm" disabled={busy} onClick={() => { setMode(value); setError(''); setPassword(''); setLicense(''); setRecovery(''); }}>{t(value === 'login' ? 'Sign in' : value === 'register' ? 'Activate a license' : 'Recover account')}</Button>)}</div>
    </section>;
}
