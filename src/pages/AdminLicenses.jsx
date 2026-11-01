import { useEffect, useState } from 'react';
import {
    DownloadSimple,
    Key,
    CheckCircle,
    EnvelopeSimple,
    IdentificationCard,
    Sparkle,
    CaretDown,
    Prohibit,
    UserCheck,
    Info,
} from '@phosphor-icons/react';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { appClient } from '@/api/app-client';
import PageHeader from '@/components/common/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import LicenseCustomerHistory from '@/components/licenses/license-customer-history';
import StatCard from '@/components/common/StatCard';
import { Skeleton } from '@/components/ui/skeleton';

function downloadLicense(item) {
    const url = URL.createObjectURL(
        new Blob([item.token + '\n'], { type: 'text/plain;charset=utf-8' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `socialchoice-${item.license_id}.scweblicense`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function OwnerLicenseManager() {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [edition, setEdition] = useState('starter');
    const [confirmed, setConfirmed] = useState(false);
    const [requestId, setRequestId] = useState(() => crypto.randomUUID());
    const [ready, setReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [items, setItems] = useState([]);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [revokeTarget, setRevokeTarget] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    async function refresh() {
        setRefreshing(true);
        setError('');
        try {
            setItems((await appClient.licenses.list()).items);
        } catch (e) {
            setError(e.message);
        } finally {
            setRefreshing(false);
        }
    }

    useEffect(() => {
        let cancelled = false;
        Promise.all([appClient.licenses.status(), appClient.licenses.list()])
            .then(([status, history]) => {
                if (!cancelled) {
                    setReady(status.ready);
                    setItems(history.items);
                }
            })
            .catch((e) => {
                if (!cancelled) setError(e.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    function change(setter, value) {
        setter(value);
        setConfirmed(false);
        setResult(null);
        setError('');
        setRequestId(crypto.randomUUID());
    }

    async function issue(event) {
        event.preventDefault();
        if (busy || !confirmed || !ready) return;
        setBusy(true);
        setError('');
        try {
            const issued = await appClient.licenses.issue({
                requestId,
                email,
                licensedTo: name,
                edition,
                purchaseConfirmed: confirmed,
            });
            setResult(issued);
            setConfirmed(false);
            setEmail('');
            setName('');
            setItems((await appClient.licenses.list()).items);
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function redownload(item) {
        setBusy(true);
        setError('');
        try {
            downloadLicense(await appClient.licenses.download(item.request_id));
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function revoke() {
        setBusy(true);
        try {
            const revoked = await appClient.licenses.revoke({
                requestId: revokeTarget.request_id,
                confirmed: true,
            });
            setItems((previous) =>
                previous.map((item) =>
                    item.request_id === revoked.request_id ? { ...item, ...revoked } : item
                )
            );
            if (result?.request_id === revoked.request_id) setResult(null);
        } finally {
            setBusy(false);
        }
    }

    // KPI Metrics
    const totalLicenses = items.length;
    const activeLicenses = items.filter((i) => (i.status || 'active') === 'active').length;
    const activatedAccounts = items.filter((i) => i.activated === true).length;
    const revokedLicenses = items.filter((i) => i.status === 'revoked').length;
    const activePercent = totalLicenses ? Math.round((activeLicenses / totalLicenses) * 100) : 100;

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('License management')}
                description={t(
                    'Issue an account license after verifying the customer purchase. Each account can use multiple devices.'
                )}
            />

            {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/60 text-xs text-dangerFg flex items-center gap-2">
                    <Info size={15} className="shrink-0" />
                    <span>{t(error)}</span>
                </div>
            )}

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <StatCard
                    label={t('Total licenses')}
                    value={totalLicenses}
                    hint={t('Issued via web')}
                    icon={Key}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                />
                <StatCard
                    label={t('Active licenses')}
                    value={activeLicenses}
                    hint={t('{percent}% active', { percent: activePercent })}
                    icon={CheckCircle}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                />
                <StatCard
                    label={t('Activated accounts')}
                    value={activatedAccounts}
                    hint={t('{count} customers', { count: activatedAccounts })}
                    icon={UserCheck}
                    iconBg="bg-purple-50"
                    iconColor="text-purple-600"
                />
                <StatCard
                    label={t('Revoked licenses')}
                    value={revokedLicenses}
                    hint={t('Blocked access')}
                    icon={Prohibit}
                    iconBg="bg-rose-50"
                    iconColor="text-rose-600"
                />
            </div>

            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-[280px] rounded-2xl" />
                    <Skeleton className="h-[340px] rounded-2xl" />
                </div>
            ) : (
                <div className="grid min-w-0 gap-6">
                    {/* Section: Issue a Web License */}
                    <section className="panel min-w-0 p-5 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-4">
                        <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                <Key size={18} weight="duotone" />
                            </span>
                            <div>
                                <h2 className="text-[15px] font-semibold text-foreground">
                                    {t('Issue a web license')}
                                </h2>
                                <p className="label-xs text-muted-foreground mt-0.5">
                                    {t(
                                        'Create a license file after verifying customer payment details.'
                                    )}
                                </p>
                            </div>
                        </div>

                        {!ready && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/60 text-xs text-amber-800 flex items-center gap-2">
                                <Info size={15} className="shrink-0" />
                                <span>{t('Web license signing is not configured')}</span>
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={issue}>
                            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <label
                                        htmlFor="license-email"
                                        className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
                                    >
                                        {t('Customer email')}
                                    </label>
                                    <div className="relative flex items-center">
                                        <EnvelopeSimple
                                            size={15}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                        />
                                        <Input
                                            id="license-email"
                                            type="email"
                                            maxLength={254}
                                            required
                                            value={email}
                                            disabled={busy || refreshing}
                                            placeholder="customer@example.com"
                                            onChange={(e) => change(setEmail, e.target.value)}
                                            className="h-10 pl-9 rounded-xl border-border/80 bg-background text-xs"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="license-name"
                                        className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
                                    >
                                        {t('Customer name or order label')}
                                    </label>
                                    <div className="relative flex items-center">
                                        <IdentificationCard
                                            size={15}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                        />
                                        <Input
                                            id="license-name"
                                            maxLength={160}
                                            required
                                            value={name}
                                            disabled={busy || refreshing}
                                            placeholder={t('e.g. John Doe / #ORD-2026')}
                                            onChange={(e) => change(setName, e.target.value)}
                                            className="h-10 pl-9 rounded-xl border-border/80 bg-background text-xs"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="license-edition"
                                        className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
                                    >
                                        {t('Edition')}
                                    </label>
                                    <div className="relative flex items-center">
                                        <Sparkle
                                            size={15}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                        />
                                        <select
                                            id="license-edition"
                                            value={edition}
                                            disabled={busy || refreshing}
                                            onChange={(e) => change(setEdition, e.target.value)}
                                            className="h-10 w-full rounded-xl border border-border/80 bg-background pl-9 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                                        >
                                            {['starter', 'professional', 'business'].map((value) => (
                                                <option key={value} value={value}>
                                                    {value.charAt(0).toUpperCase() + value.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                        <CaretDown
                                            size={14}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <p className="label-xs text-muted-foreground flex items-center gap-1.5">
                                <Info size={13} className="shrink-0 text-muted-foreground" />
                                {t(
                                    'All three editions currently have the same features. Prices and separate limits have not been configured.'
                                )}
                            </p>

                            {/* Verification Checkbox */}
                            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 flex items-start gap-3">
                                <input
                                    id="license-confirm"
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                                    required
                                    checked={confirmed}
                                    disabled={busy || refreshing || !ready}
                                    onChange={(e) => setConfirmed(e.target.checked)}
                                />
                                <label
                                    htmlFor="license-confirm"
                                    className="text-xs text-foreground font-medium cursor-pointer leading-relaxed"
                                >
                                    {t(
                                        'I have verified payment for this customer. This action does not collect payment.'
                                    )}
                                </label>
                            </div>

                            <div className="pt-1">
                                <button
                                    className="btn-skew inline-flex items-center gap-2 text-xs font-semibold px-4 py-2"
                                    type="submit"
                                    disabled={busy || refreshing || !ready || !confirmed}
                                >
                                    <Key size={15} weight="bold" />
                                    <span>{t(busy ? 'Issuing…' : 'Create license')}</span>
                                </button>
                            </div>
                        </form>

                        {/* Result Status Banner */}
                        {result && (
                            <div
                                role="status"
                                className="space-y-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-4 text-xs"
                            >
                                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                                    <CheckCircle size={18} weight="fill" className="text-emerald-600" />
                                    <span>
                                        {t(
                                            'License created. Send only the downloaded license file to the customer.'
                                        )}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-foreground">
                                        {result.email}
                                    </span>
                                    <span>•</span>
                                    <span className="capitalize font-mono px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-700">
                                        {result.edition}
                                    </span>
                                </div>
                                <div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={busy || refreshing}
                                        onClick={() => redownload(result)}
                                        className="h-8 rounded-lg gap-1.5 text-xs bg-white text-foreground"
                                    >
                                        <DownloadSimple size={14} />
                                        <span>{t('Download license')}</span>
                                    </Button>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    {t(
                                        'The customer activates with this email and chooses their own password. Ask them to save the recovery code.'
                                    )}
                                </p>
                            </div>
                        )}
                    </section>

                    {/* Section: License Customer History */}
                    <LicenseCustomerHistory
                        items={items}
                        busy={busy || refreshing}
                        refreshing={refreshing}
                        onRefresh={refresh}
                        onDownload={redownload}
                        onRevoke={setRevokeTarget}
                    />
                </div>
            )}

            <ConfirmDialog
                key={revokeTarget?.request_id || 'none'}
                open={!!revokeTarget}
                onOpenChange={(open) => {
                    if (!open) setRevokeTarget(null);
                }}
                title={t('Revoke license')}
                description={t(
                    'Revoke the license for {email}? Sign-in, activation and further publishing will be blocked. Customer data stays stored. Requests already sent to a platform may finish.',
                    { email: revokeTarget?.email || '' }
                )}
                confirmLabel="Revoke license"
                destructive
                onConfirm={revoke}
            />
        </div>
    );
}

export default function AdminLicenses() {
    const { user } = useAuth();
    const { t } = useTranslation();
    if (user?.role !== 'admin' || user?.mode !== 'admin-session')
        return (
            <div className="panel p-6 text-center text-xs text-muted-foreground rounded-2xl border border-border/80 bg-card">
                <p role="alert">{t('Site owner access required')}</p>
            </div>
        );
    return <OwnerLicenseManager />;
}
