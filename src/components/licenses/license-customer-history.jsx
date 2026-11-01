import { useState } from 'react';
import {
    DownloadSimple,
    ArrowClockwise,
    MagnifyingGlass,
    CaretDown,
    ClockCounterClockwise,
    CheckCircle,
} from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDay, formatDateTime } from '@/lib/format';
import StatusBadge from '@/components/common/StatusBadge';

export default function LicenseCustomerHistory({
    items,
    busy,
    refreshing,
    onRefresh,
    onDownload,
    onRevoke,
}) {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [activation, setActivation] = useState('all');

    const query = search.trim().toLocaleLowerCase();
    const visible = items.filter(
        (item) =>
            (!query ||
                `${item.email} ${item.licensed_to}`.toLocaleLowerCase().includes(query)) &&
            (status === 'all' || (item.status || 'active') === status) &&
            (activation === 'all' ||
                (item.activated === true
                    ? 'activated'
                    : item.activated === false
                    ? 'pending'
                    : 'unknown') === activation)
    );

    const getEditionBadge = (edition) => {
        const ed = (edition || 'starter').toLowerCase();
        if (ed === 'business') {
            return 'bg-amber-50 text-amber-700 border-amber-200/60';
        }
        if (ed === 'professional') {
            return 'bg-purple-50 text-purple-700 border-purple-200/60';
        }
        return 'bg-blue-50 text-blue-700 border-blue-200/60';
    };

    return (
        <section className="panel min-w-0 p-5 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <ClockCounterClockwise size={18} weight="duotone" />
                    </span>
                    <div>
                        <h2 className="text-[15px] font-semibold text-foreground">
                            {t('Recently issued licenses')}
                        </h2>
                        <p className="label-xs text-muted-foreground mt-0.5">
                            {t(
                                'Up to 100 recent web-issued licenses. Downloading again keeps the same license. Earlier Windows-issued files are not listed here.'
                            )}
                        </p>
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={onRefresh}
                    className="h-9 px-3 rounded-xl text-xs font-medium gap-1.5"
                >
                    <ArrowClockwise size={14} className={refreshing ? 'animate-spin' : ''} />
                    <span>{t(refreshing ? 'Refreshing…' : 'Refresh customer status')}</span>
                </Button>
            </div>

            {/* Filter Toolbar */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                <div>
                    <label
                        htmlFor="customer-search"
                        className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
                    >
                        {t('Search customers')}
                    </label>
                    <div className="relative">
                        <MagnifyingGlass
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <Input
                            id="customer-search"
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={t('Email, customer name or order label')}
                            className="h-10 pl-9 rounded-xl border-border/80 bg-background text-xs"
                        />
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="customer-license-status"
                            className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
                        >
                            {t('License status')}
                        </label>
                        <div className="relative flex items-center">
                            <select
                                id="customer-license-status"
                                value={status}
                                onChange={(event) => setStatus(event.target.value)}
                                className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                            >
                                <option value="all">{t('All licenses')}</option>
                                <option value="active">{t('License active')}</option>
                                <option value="revoked">{t('Revoked')}</option>
                            </select>
                            <CaretDown
                                size={14}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="customer-activation"
                            className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
                        >
                            {t('Activation status')}
                        </label>
                        <div className="relative flex items-center">
                            <select
                                id="customer-activation"
                                value={activation}
                                onChange={(event) => setActivation(event.target.value)}
                                className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 pr-8 text-xs font-medium text-foreground transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                            >
                                <option value="all">{t('All activation states')}</option>
                                <option value="activated">{t('Account activated')}</option>
                                <option value="pending">{t('Not activated')}</option>
                            </select>
                            <CaretDown
                                size={14}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                        {t('Showing {count} of {total} licenses', {
                            count: visible.length,
                            total: items.length,
                        })}
                    </span>
                    {(status !== 'all' || activation !== 'all' || search.trim()) && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                setStatus('all');
                                setActivation('all');
                            }}
                            className="text-xs text-primary hover:underline font-medium"
                        >
                            {t('Reset')}
                        </button>
                    )}
                </div>
            </div>

            {items.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                    <p>{t('No licenses have been issued from the web yet.')}</p>
                </div>
            ) : visible.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                    <p>{t('No customers match these filters.')}</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-border/80">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                <th className="p-3.5">{t('Customer email')}</th>
                                <th className="p-3.5">{t('Edition')}</th>
                                <th className="p-3.5 whitespace-nowrap">{t('Issued')}</th>
                                <th className="p-3.5">{t('Status')}</th>
                                <th className="p-3.5">{t('Activation status')}</th>
                                <th className="p-3.5 whitespace-nowrap">{t('Last sign-in')}</th>
                                <th className="p-3.5 text-center">{t('File')}</th>
                                <th className="p-3.5 text-right">{t('Actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                            {visible.map((item) => (
                                <tr key={item.request_id} className="hover:bg-muted/20 transition-colors">
                                    <td className="p-3.5">
                                        <p className="font-semibold text-foreground max-w-64 break-words">
                                            {item.email}
                                        </p>
                                        <p className="max-w-64 break-words text-[11px] text-muted-foreground mt-0.5">
                                            {item.licensed_to}
                                        </p>
                                    </td>

                                    <td className="p-3.5">
                                        <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border capitalize ${getEditionBadge(
                                                item.edition
                                            )}`}
                                        >
                                            {item.edition}
                                        </span>
                                    </td>

                                    <td className="p-3.5 whitespace-nowrap text-muted-foreground font-medium">
                                        {formatDay(item.issued_at)}
                                    </td>

                                    <td className="p-3.5">
                                        {item.status === 'revoked' ? (
                                            <div>
                                                <StatusBadge tone="destructive">
                                                    {t('Revoked')}
                                                </StatusBadge>
                                                {item.revoked_at && (
                                                    <p className="mt-1 whitespace-nowrap text-[10px] text-muted-foreground font-mono">
                                                        {formatDateTime(item.revoked_at)}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <StatusBadge tone="success">
                                                {t('License active')}
                                            </StatusBadge>
                                        )}
                                    </td>

                                    <td className="p-3.5">
                                        {item.activated === true ? (
                                            <div>
                                                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                                    <CheckCircle size={13} weight="fill" />
                                                    <span>{t('Account activated')}</span>
                                                </span>
                                                {item.activated_at && (
                                                    <p className="mt-1 whitespace-nowrap text-[10px] text-muted-foreground font-mono">
                                                        {formatDateTime(item.activated_at)}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground font-medium">
                                                {t('Not activated')}
                                            </span>
                                        )}
                                    </td>

                                    <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                                        {item.last_login_at
                                            ? formatDateTime(item.last_login_at)
                                            : t(item.activated ? 'Sign-in date not recorded' : '—')}
                                    </td>

                                    <td className="p-3.5 text-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={busy || item.status === 'revoked'}
                                            onClick={() => onDownload(item)}
                                            aria-label={`${t('Download license')}: ${item.email}`}
                                            className="h-8 w-8 p-0 rounded-lg"
                                        >
                                            <DownloadSimple size={15} />
                                        </Button>
                                    </td>

                                    <td className="p-3.5 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={busy || item.status === 'revoked'}
                                            onClick={() => onRevoke(item)}
                                            className="h-8 rounded-lg text-xs text-dangerFg hover:text-dangerFg hover:bg-rose-50"
                                        >
                                            {t('Revoke license')}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <p className="label-xs text-muted-foreground pt-1 leading-relaxed">
                {t(
                    'Dates use Asia/Ho_Chi_Minh. Earlier account dates may not have been recorded. Last sign-in includes activation and successful recovery; it is not online status.'
                )}
            </p>
        </section>
    );
}
