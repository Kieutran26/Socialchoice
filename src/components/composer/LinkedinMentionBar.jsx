import { useState } from 'react';
import { At, Buildings, User, Plus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';
import { LinkedinCompanyLookup } from './linkedin-company-lookup';
import { saveCustomLinkedinOrganization } from '@/lib/linkedin-company-directory';

export default function LinkedinMentionBar({ onInsert, linkedinAccounts = [] }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [entityType, setEntityType] = useState('organization');
    const [displayName, setDisplayName] = useState('');
    const [entityId, setEntityId] = useState('');

    const cleanId = entityId.trim().replace(/^urn:li:(organization|person):/, '');
    const canInsert = displayName.trim().length > 0 && /^[a-zA-Z0-9_-]{1,128}$/.test(cleanId);

    const handleInsertCustom = () => {
        if (!canInsert) return;
        const urn = `urn:li:${entityType}:${cleanId}`;
        const name = displayName.trim();
        if (entityType === 'organization') {
            saveCustomLinkedinOrganization({ id: cleanId, name });
        }
        onInsert(`@[${name}](${urn})`);
        setDisplayName('');
        setEntityId('');
        setOpen(false);
    };

    const handleQuickInsertAccount = (account) => {
        if (!account?.external_id || !account?.name) return;
        const type = account.account_type === 'page' ? 'organization' : 'person';
        onInsert(`@[${account.name}](urn:li:${type}:${account.external_id})`);
    };

    return (
        <div className="mt-2 rounded-lg border border-[#0a66c2]/20 bg-[#0a66c2]/5 p-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 font-medium text-[#0a66c2]">
                        <At size={14} weight="bold" />
                        {t('LinkedIn mention')}
                    </span>
                    {linkedinAccounts
                        .filter((acc) => acc.external_id)
                        .map((acc) => (
                            <button
                                key={acc.id}
                                type="button"
                                onClick={() => handleQuickInsertAccount(acc)}
                                className="inline-flex items-center gap-1 rounded-md border border-[#0a66c2]/25 bg-card px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:border-[#0a66c2] hover:bg-[#0a66c2]/10"
                                title={t('Insert mention for {value1}', { value1: acc.name })}
                            >
                                {acc.account_type === 'page' ? (
                                    <Buildings size={12} className="text-[#0a66c2]" />
                                ) : (
                                    <User size={12} className="text-[#0a66c2]" />
                                )}
                                <span>@{acc.name}</span>
                            </button>
                        ))}
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1 border-[#0a66c2]/30 text-[#0a66c2] hover:bg-[#0a66c2]/10"
                    onClick={() => setOpen((prev) => !prev)}
                >
                    <Plus size={12} weight="bold" />
                    {t('Tag LinkedIn company or member')}
                </Button>
            </div>

            {open && <LinkedinCompanyLookup linkedinAccounts={linkedinAccounts} onChoose={company => { onInsert(company.token); setOpen(false); }} />}
            {open && (
                <div className="mt-2.5 grid gap-2 border-t border-[#0a66c2]/15 pt-2.5 sm:grid-cols-[auto_1fr_1fr_auto] items-center">
                    <div className="inline-flex rounded-md border border-border bg-card p-0.5">
                        <button
                            type="button"
                            onClick={() => setEntityType('organization')}
                            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium ${entityType === 'organization'
                                    ? 'bg-[#0a66c2] text-white'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Buildings size={12} />
                            {t('Company')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setEntityType('person')}
                            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium ${entityType === 'person'
                                    ? 'bg-[#0a66c2] text-white'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <User size={12} />
                            {t('Member')}
                        </button>
                    </div>
                    <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={t('Display name (e.g. Acme Corp)')}
                        aria-label={t('LinkedIn mention display name')}
                        className="h-8 text-xs bg-card"
                    />
                    <Input
                        value={entityId}
                        onChange={(e) => setEntityId(e.target.value)}
                        placeholder={
                            entityType === 'organization'
                                ? t('Organization ID (e.g. 12345678)')
                                : t('Member ID / URN')
                        }
                        aria-label={t('LinkedIn mention ID')}
                        className="h-8 text-xs bg-card font-mono"
                    />
                    <Button
                        type="button"
                        size="sm"
                        disabled={!canInsert}
                        onClick={handleInsertCustom}
                        className="h-8 text-xs"
                    >
                        {t('Insert tag')}
                    </Button>
                </div>
            )}
        </div>
    );
}
