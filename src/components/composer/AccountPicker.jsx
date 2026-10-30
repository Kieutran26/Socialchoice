import { useTranslation } from '@/lib/i18n';
import { CONNECTION_LABEL, PLATFORM_LABEL } from '@/lib/constants';
import {
    FacebookLogo,
    InstagramLogo,
    TiktokLogo,
    LinkedinLogo,
    ThreadsLogo,
    ShareNetwork,
    Check,
} from '@phosphor-icons/react';

const PLATFORM_CONFIG = {
    facebook: {
        icon: FacebookLogo,
        color: 'text-[#1877F2]',
        bg: 'bg-blue-50 border-blue-200/60',
    },
    instagram: {
        icon: InstagramLogo,
        color: 'text-[#E4405F]',
        bg: 'bg-pink-50 border-pink-200/60',
    },
    tiktok: {
        icon: TiktokLogo,
        color: 'text-[#000000]',
        bg: 'bg-neutral-100 border-neutral-300',
    },
    threads: {
        icon: ThreadsLogo,
        color: 'text-[#000000]',
        bg: 'bg-neutral-100 border-neutral-300',
    },
    linkedin: {
        icon: LinkedinLogo,
        color: 'text-[#0A66C2]',
        bg: 'bg-sky-50 border-sky-200/60',
    },
};

export default function AccountPicker({ accounts, selectedIds, onToggle, onSelectAll, brandName }) {
    const { t } = useTranslation();
    const allSelected = Boolean(accounts.length && accounts.every((a) => selectedIds.includes(a.id)));
    const selectedCount = accounts.filter((a) => selectedIds.includes(a.id)).length;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => onSelectAll(!allSelected)}
                    className="inline-flex items-center gap-2 text-xs font-medium text-foreground hover:text-foreground/80 transition-colors cursor-pointer select-none"
                >
                    <div
                        className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                            allSelected
                                ? 'bg-foreground border-foreground text-background'
                                : 'border-border bg-background'
                        }`}
                    >
                        {allSelected && <Check size={12} weight="bold" />}
                    </div>
                    <span>{t("Select all destinations")}</span>
                </button>
                {accounts.length > 0 && (
                    <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {selectedCount} / {accounts.length} {t("selected")}
                    </span>
                )}
            </div>

            {!accounts.length ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                    <p className="label-xs text-muted-foreground">
                        {t('No destinations for {brandName}. Add destination references in Social Accounts.', { brandName })}
                    </p>
                </div>
            ) : (
                <div className="grid gap-2.5 sm:grid-cols-2">
                    {accounts.map((a) => {
                        const isSelected = selectedIds.includes(a.id);
                        const platformCfg = PLATFORM_CONFIG[a.platform] || {
                            icon: ShareNetwork,
                            color: 'text-foreground',
                            bg: 'bg-muted border-border',
                        };
                        const IconComponent = platformCfg.icon;
                        const isConnected = a.connection_status === 'connected';

                        return (
                            <div
                                key={a.id}
                                onClick={() => onToggle(a.id)}
                                onKeyDown={(e) => {
                                    if (e.key === ' ' || e.key === 'Enter') {
                                        e.preventDefault();
                                        onToggle(a.id);
                                    }
                                }}
                                role="checkbox"
                                aria-checked={isSelected}
                                tabIndex={0}
                                className={`relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                                    isSelected
                                        ? 'border-foreground/80 bg-muted/40 shadow-sm ring-1 ring-foreground/20'
                                        : 'border-border hover:border-border-hover hover:bg-card/60 bg-card'
                                }`}
                            >
                                <div
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                                        isSelected
                                            ? 'bg-foreground border-foreground text-background'
                                            : 'border-border bg-background'
                                    }`}
                                >
                                    {isSelected && <Check size={13} weight="bold" />}
                                </div>

                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${platformCfg.bg}`}>
                                    <IconComponent size={20} weight={/** @type {const} */ ('fill')} className={platformCfg.color} />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-foreground truncate">{a.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[11px] text-muted-foreground truncate">
                                            {PLATFORM_LABEL[a.platform] || a.platform}
                                        </span>
                                        <span className="text-muted-foreground/40 text-[10px]">•</span>
                                        <span className="inline-flex items-center gap-1 text-[11px]">
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full ${
                                                    isConnected ? 'bg-emerald-500' : 'bg-muted-foreground/50'
                                                }`}
                                            />
                                            <span className={isConnected ? 'text-emerald-700 font-medium' : 'text-muted-foreground'}>
                                                {CONNECTION_LABEL[a.connection_status] || t("Not connected")}
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
