import { useState } from 'react';
import { DownloadSimple, ArrowClockwise } from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDay, formatDateTime } from '@/lib/format';

export default function LicenseCustomerHistory({ items, busy, refreshing, onRefresh, onDownload, onRevoke }) {
    const { t } = useTranslation();
    const [search, setSearch] = useState(''), [status, setStatus] = useState('all'), [activation, setActivation] = useState('all');
    const query = search.trim().toLocaleLowerCase();
    const visible = items.filter(item => (!query || `${item.email} ${item.licensed_to}`.toLocaleLowerCase().includes(query))
        && (status === 'all' || (item.status || 'active') === status)
        && (activation === 'all' || (item.activated === true ? 'activated' : item.activated === false ? 'pending' : 'unknown') === activation));
    const selectClass = 'h-9 w-full rounded-lg border border-input bg-background px-3 text-sm';
    return <section className="panel min-w-0 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px]">{t('Recently issued licenses')}</h2>
            <Button variant="outline" size="sm" disabled={busy} onClick={onRefresh}><ArrowClockwise size={16} />{t(refreshing ? 'Refreshing…' : 'Refresh customer status')}</Button>
        </div>
        <p className="text-xs text-muted-foreground">{t('Up to 100 recent web-issued licenses. Downloading again keeps the same license. Earlier Windows-issued files are not listed here.')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label htmlFor="customer-search" className="label-xs mb-1.5 block">{t('Search customers')}</label><Input id="customer-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={t('Email, customer name or order label')} /></div>
            <div><label htmlFor="customer-license-status" className="label-xs mb-1.5 block">{t('License status')}</label><select id="customer-license-status" className={selectClass} value={status} onChange={event => setStatus(event.target.value)}><option value="all">{t('All licenses')}</option><option value="active">{t('License active')}</option><option value="revoked">{t('Revoked')}</option></select></div>
            <div><label htmlFor="customer-activation" className="label-xs mb-1.5 block">{t('Activation status')}</label><select id="customer-activation" className={selectClass} value={activation} onChange={event => setActivation(event.target.value)}><option value="all">{t('All activation states')}</option><option value="activated">{t('Account activated')}</option><option value="pending">{t('Not activated')}</option></select></div>
        </div>
        <p role="status" className="text-xs text-muted-foreground">{t('Showing {count} of {total} licenses', { count: visible.length, total: items.length })}</p>
        {items.length === 0 ? <p className="py-5 text-sm text-muted-foreground">{t('No licenses have been issued from the web yet.')}</p> : visible.length === 0 ? <p className="py-5 text-sm text-muted-foreground">{t('No customers match these filters.')}</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs text-muted-foreground"><tr>{['Customer email', 'Edition', 'Issued', 'Status', 'Activation status', 'Last sign-in', 'File', 'Actions'].map(label => <th key={label} className="p-3">{t(label)}</th>)}</tr></thead>
            <tbody>{visible.map(item => <tr key={item.request_id} className="border-b hover:bg-muted/50">
                <td className="p-3"><p className="max-w-64 break-words">{item.email}</p><p className="max-w-64 break-words text-xs text-muted-foreground">{item.licensed_to}</p></td>
                <td className="p-3">{item.edition}</td><td className="p-3 whitespace-nowrap">{formatDay(item.issued_at)}</td>
                <td className="p-3"><span className={item.status === 'revoked' ? 'text-dangerFg' : 'text-muted-foreground'}>{t(item.status === 'revoked' ? 'Revoked' : 'License active')}</span>{item.revoked_at && <p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(item.revoked_at)}</p>}</td>
                <td className="p-3"><span>{t(item.activated === true ? 'Account activated' : item.activated === false ? 'Not activated' : 'Refresh to check')}</span>{item.activated && <p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">{item.activated_at ? formatDateTime(item.activated_at) : t('Activation date not recorded')}</p>}</td>
                <td className="p-3 whitespace-nowrap">{item.last_login_at ? formatDateTime(item.last_login_at) : t(item.activated ? 'Sign-in date not recorded' : '—')}</td>
                <td className="p-3"><Button variant="outline" size="sm" disabled={busy || item.status === 'revoked'} onClick={() => onDownload(item)} aria-label={`${t('Download license')}: ${item.email}`}><DownloadSimple size={16} /></Button></td>
                <td className="p-3"><Button variant="outline" size="sm" disabled={busy || item.status === 'revoked'} onClick={() => onRevoke(item)}>{t('Revoke license')}</Button></td>
            </tr>)}</tbody>
        </table></div>}
        <p className="text-xs text-muted-foreground">{t('Dates use Asia/Ho_Chi_Minh. Earlier account dates may not have been recorded. Last sign-in includes activation and successful recovery; it is not online status.')}</p>
    </section>;
}
