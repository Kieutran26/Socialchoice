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
    Plus,
    ArrowClockwise,
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

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
    const [issueOpen, setIssueOpen] = useState(false);

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
                actions={
                    <div className="flex items-center gap-2.5">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={busy || refreshing}
                            onClick={refresh}
                            className="h-9 px-3 rounded-xl text-xs font-medium gap-1.5"
                        >
                            <ArrowClockwise size={14} className={refreshing ? 'animate-spin' : ''} />
                            <span>{t(refreshing ? 'Refreshing…' : 'Refresh customer status')}</span>
                        </Button>
                        <button
                            type="button"
                            onClick={() => {
                                setResult(null);
                                setError('');
                                setIssueOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 transition-colors shadow-xs"
                        >
                            <Plus size={15} weight="bold" />
                            <span>{t('Issue a web license')}</span>
                        </button>
                    </div>
                }
            />

            {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/60 text-xs text-dangerFg flex items-center gap-2">
                    <Info size={15} className="shrink-0" />
                    <span>{t(error)}</span>
                </div>
            )}

            {/* KPI Stat Cards (Monochrome Minimalist) */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <StatCard
                    label={t('Total licenses')}
                    value={totalLicenses}
                    hint={t('Issued via web')}
                    icon={Key}
                    iconBg="bg-muted/60 border-border/60"
                    iconColor="text-foreground"
                />
                <StatCard
                    label={t('Active licenses')}
                    value={activeLicenses}
                    hint={t('{percent}% active', { percent: activePercent })}
                    icon={CheckCircle}
                    iconBg="bg-muted/60 border-border/60"
                    iconColor="text-foreground"
                />
                <StatCard
                    label={t('Activated accounts')}
                    value={activatedAccounts}
                    hint={t('{count} customers', { count: activatedAccounts })}
                    icon={UserCheck}
                    iconBg="bg-muted/60 border-border/60"
                    iconColor="text-foreground"
                />
                <StatCard
                    label={t('Revoked licenses')}
                    value={revokedLicenses}
                    hint={t('Blocked access')}
                    icon={Prohibit}
                    iconBg="bg-muted/60 border-border/60"
                    iconColor="text-foreground"
                />
            </div>

            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-[280px] rounded-2xl" />
                    <Skeleton className="h-[340px] rounded-2xl" />
                </div>
            ) : (
                <div className="min-w-0">
                    {/* Full Ledger Table Component (Option C Style) */}
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

            {/* Modal Dialog: Cấp license bản web (Option C style) */}
            <Dialog
                open={issueOpen}
                onOpenChange={(open) => {
                    setIssueOpen(open);
                    if (!open) {
                        setResult(null);
                        setError('');
                    }
                }}
            >
                <DialogContent className="!w-[calc(100vw_-_2rem)] !max-w-[560px] p-0 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                    <div className="px-6 py-5 border-b border-border bg-muted/20">
                        <DialogHeader className="mb-0 space-y-1">
                            <DialogTitle className="text-base sm:text-lg font-heading font-semibold text-foreground">
                                {t('Issue a web license')}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                {t(
                                    'Create a license file after verifying customer payment details.'
                                )}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-6 space-y-4">
                        {!ready && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/60 text-xs text-amber-800 flex items-center gap-2">
                                <Info size={15} className="shrink-0" />
                                <span>{t('Web license signing is not configured')}</span>
                            </div>
                        )}

                        {result ? (
                            <div className="space-y-4 py-2">
                                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                                    <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                                        <CheckCircle size={18} weight="fill" className="text-emerald-500" />
                                        <span>{t('License created. Send only the downloaded license file to the customer.')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="font-semibold text-foreground">{result.email}</span>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="capitalize font-mono px-2 py-0.5 rounded-md bg-card border border-border text-foreground text-[11px]">
                                            {result.edition}
                                        </span>
                                    </div>
                                    <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                                        {t(
                                            'The customer activates with this email and chooses their own password. Ask them to save the recovery code.'
                                        )}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        type="button"
                                        onClick={() => {
                                            setResult(null);
                                            setRequestId(crypto.randomUUID());
                                        }}
                                        className="h-9 px-3.5 rounded-xl text-xs font-medium"
                                    >
                                        {t('Issue another license')}
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={() => redownload(result)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 transition-colors shadow-xs"
                                    >
                                        <DownloadSimple size={14} />
                                        <span>{t('Download license')}</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form className="space-y-4" onSubmit={issue}>
                                <div className="space-y-3.5">
                                    <div>
                                        <label
                                            htmlFor="modal-license-email"
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
                                                id="modal-license-email"
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
                                            htmlFor="modal-license-name"
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
                                                id="modal-license-name"
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
                                            htmlFor="modal-license-edition"
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
                                                id="modal-license-edition"
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

                                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 flex items-start gap-3">
                                    <input
                                        id="modal-license-confirm"
                                        type="checkbox"
                                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-foreground focus:ring-foreground/20 cursor-pointer"
                                        required
                                        checked={confirmed}
                                        disabled={busy || refreshing || !ready}
                                        onChange={(e) => setConfirmed(e.target.checked)}
                                    />
                                    <label
                                        htmlFor="modal-license-confirm"
                                        className="text-xs text-foreground font-medium cursor-pointer leading-relaxed"
                                    >
                                        {t(
                                            'I have verified payment for this customer. This action does not collect payment.'
                                        )}
                                    </label>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        disabled={busy}
                                        onClick={() => setIssueOpen(false)}
                                        className="h-9 px-4 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground"
                                    >
                                        {t('Cancel')}
                                    </Button>
                                    <button
                                        type="submit"
                                        disabled={busy || refreshing || !ready || !confirmed}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 transition-colors shadow-xs disabled:opacity-50"
                                    >
                                        <Key size={14} weight="bold" />
                                        <span>{t(busy ? 'Issuing…' : 'Create license')}</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

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
