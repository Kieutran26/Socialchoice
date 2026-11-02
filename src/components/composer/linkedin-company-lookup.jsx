import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { appClient } from '@/api/app-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { linkedinCompanyQuery } from '@/lib/linkedin-company-query';

export function LinkedinCompanyLookup({ linkedinAccounts = [], query = undefined, onChoose }) {
    const { t } = useTranslation();
    const [typed, setTyped] = useState(''), [accountId, setAccountId] = useState('');
    const [state, setState] = useState({ busy: false, error: '', companies: [], searched: false });
    const sequence = useRef(0);
    const accounts = linkedinAccounts.filter(account => !account.is_demo && account.connection_status === 'connected');
    const selected = accounts.find(account => account.id === accountId)?.id || accounts[0]?.id;
    const value = query === undefined ? typed : query;
    useEffect(() => {
        sequence.current++;
        setState({ busy: false, error: '', companies: [], searched: false });
        return () => { sequence.current++; };
    }, [value, selected]);
    async function search() {
        const ticket = ++sequence.current;
        setState({ busy: true, error: '', companies: [], searched: false });
        try {
            const normalized = linkedinCompanyQuery(value);
            const result = await appClient.linkedin.company(selected, normalized);
            if (sequence.current === ticket) setState({ busy: false, error: '', companies: result.companies, searched: true });
        } catch (error) {
            if (sequence.current === ticket) setState({ busy: false, error: error.message, companies: [], searched: false });
        }
    }
    return <div className="space-y-2 border-t border-border px-2 pt-2 text-xs">
        <p className="text-muted-foreground">{t("Find a company using its LinkedIn page name, for example microsoft.")}</p>
        {query === undefined && <Input value={typed} onChange={event => setTyped(event.target.value)} placeholder="microsoft / https://www.linkedin.com/company/microsoft" aria-label={t("LinkedIn company name or link")} className="h-8 text-xs" />}
        {accounts.length > 1 && <select value={selected} onChange={event => setAccountId(event.target.value)} aria-label={t("LinkedIn lookup account")} className="w-full rounded-md border border-border bg-card p-2">
            {accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>}
        <Button type="button" variant="outline" size="sm" disabled={!selected || !value.trim() || state.busy} onMouseDown={event => event.preventDefault()} onClick={search}>
            {state.busy ? t("Searching\u2026") : t("Find LinkedIn company")}
        </Button>
        {!selected && <p role="status">{t("Select a connected LinkedIn account to look up companies.")}</p>}
        {state.error && <p role="alert" className="text-destructive">{t(state.error)}</p>}
        {state.searched && !state.companies.length && <p role="status">{t("No company found. Check the name in the LinkedIn company page link.")}</p>}
        {state.companies.map(company => <button key={company.urn} type="button" className="block w-full rounded-md border border-border bg-card p-2 text-left hover:bg-muted" onMouseDown={event => event.preventDefault()} onClick={() => onChoose(company)}>@{company.name} · {t("Insert tag")}</button>)}
    </div>;
}
