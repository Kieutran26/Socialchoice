import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { Buildings, User } from '@phosphor-icons/react';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/lib/i18n';
import {
    insertMention,
    mentionRange,
    mentionSuggestions,
} from '@/lib/linkedin-mention-input';
import { linkedinCompanyQuery } from '@/lib/linkedin-company-query';
import { companyAvatarForNameOrVanity, saveCustomLinkedinOrganization } from '@/lib/linkedin-company-directory';

function MentionAvatar({ candidate }) {
    const [failed, setFailed] = useState(false);
    const isOrg = candidate.type === 'organization';
    if (candidate.avatar && !failed) {
        return (
            <img
                src={candidate.avatar}
                alt={candidate.name}
                onError={() => setFailed(true)}
                className="h-6 w-6 shrink-0 rounded-full border border-border bg-white object-contain p-0.5"
            />
        );
    }
    return (
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0a66c2]/15 text-[#0a66c2]">
            {isOrg ? <Buildings size={14} weight="fill" /> : <User size={14} weight="fill" />}
        </span>
    );
}

/** @typedef {import('react').ComponentPropsWithoutRef<'textarea'> & { enabled?: boolean, linkedinAccounts?: any[] }} MentionProps */
export const LinkedinMentionTextarea = forwardRef(function LinkedinMentionTextarea(
    /** @type {MentionProps} */ {
        enabled = false,
        linkedinAccounts = [],
        value = '',
        className = '',
        onChange,
        onKeyDown,
        onSelect,
        onBlur,
        onCompositionStart,
        onCompositionEnd,
        ...props
    },
    /** @type {import('react').ForwardedRef<HTMLTextAreaElement>} */ forwardedRef
) {
    const { t } = useTranslation();
    const input = useRef(null);
    const composing = useRef(false);
    const dismissed = useRef(null);
    const [range, setRange] = useState(null);
    const [active, setActive] = useState(0);
    const [remoteCompanies, setRemoteCompanies] = useState([]);
    const listId = useId();

    const rawText = String(value ?? '');

    // Silently fetch live LinkedIn companies in the background when typing @query (never triggers error toasts)
    useEffect(() => {
        if (!enabled || !range?.query || range.query.trim().length < 2) {
            setRemoteCompanies([]);
            return;
        }
        const connected = (linkedinAccounts || []).find(
            acc => !acc.is_demo && acc.connection_status === 'connected' && acc.id
        );
        if (!connected) return;
        let normalized;
        try {
            normalized = linkedinCompanyQuery(range.query);
        } catch {
            return;
        }
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const res = await fetch('/api/linkedin/company', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Socialchoice-Client': 'local-ui' },
                    body: JSON.stringify({ args: [connected.id, normalized] }),
                });
                if (!res.ok || cancelled) return;
                const data = await res.json();
                if (!cancelled && Array.isArray(data?.companies)) {
                    setRemoteCompanies(
                        data.companies.map(c => ({
                            id: c.id,
                            name: c.name,
                            type: 'organization',
                            urn: c.urn,
                            token: c.token,
                            avatar: c.avatar || companyAvatarForNameOrVanity(c.name, normalized),
                        }))
                    );
                }
            } catch {
                // Silent background lookup
            }
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [enabled, range?.query, linkedinAccounts]);

    const suggestions =
        enabled && range
            ? mentionSuggestions(linkedinAccounts, rawText, range.query, {
                extraCandidates: remoteCompanies,
            })
            : [];
    const open = enabled && !!range && suggestions.length > 0 && !props.disabled && !props.readOnly;

    function updateRange(target) {
        if (dismissed.current?.value === target.value && dismissed.current?.caret === target.selectionStart) return;
        dismissed.current = null;
        if (!enabled || composing.current) {
            setRange(null);
            return;
        }
        setRange(mentionRange(target.value, target.selectionStart, target.selectionEnd));
        setActive(0);
    }

    function choose(candidate) {
        const current = input.current;
        if (!current || composing.current || !candidate?.token) return;
        if (candidate.type === 'organization' && candidate.id && candidate.name) {
            saveCustomLinkedinOrganization({
                id: candidate.id,
                name: candidate.name,
                vanity: candidate.vanity || '',
                avatar: candidate.avatar || '',
            });
        }
        const fresh = mentionRange(current.value, current.selectionStart, current.selectionEnd);
        const result = insertMention(current.value, fresh, candidate.token);
        if (!result) return;
        setRange(null);

        // Native value setter ensures 100% standard React event flow with zero caret displacement
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        setter.call(current, result.value);
        current.dispatchEvent(new Event('input', { bubbles: true }));
        requestAnimationFrame(() => {
            current.focus();
            current.setSelectionRange(result.caret, result.caret);
        });
    }

    return (
        <div
            className="relative min-w-0"
            onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    dismissed.current = null;
                    setRange(null);
                }
            }}
        >
                            <Textarea
                                {...props}
                                className={className}
                                value={value}
                                ref={node => {
                                    input.current = node;
                                    if (typeof forwardedRef === 'function') forwardedRef(node);
                                    else if (forwardedRef) forwardedRef.current = node;
                                }}
                                role={enabled ? 'combobox' : props.role}
                                aria-autocomplete={enabled ? 'list' : undefined}
                                aria-controls={open ? listId : undefined}
                                aria-expanded={enabled ? open : undefined}
                                aria-activedescendant={open && suggestions[active] ? `${listId}-${active}` : undefined}
                                onChange={event => {
                                    dismissed.current = null;
                                    onChange?.(event);
                                    updateRange(event.currentTarget);
                                }}
                                onSelect={event => {
                                    onSelect?.(event);
                                    updateRange(event.currentTarget);
                                }}
                                onBlur={onBlur}
                                onCompositionStart={event => {
                                    composing.current = true;
                                    setRange(null);
                                    onCompositionStart?.(event);
                                }}
                                onCompositionEnd={event => {
                                    composing.current = false;
                                    updateRange(event.currentTarget);
                                    onCompositionEnd?.(event);
                                }}
                                onKeyDown={event => {
                                    if (open && !composing.current && !event.nativeEvent.isComposing) {
                                        if (event.key === 'Escape') {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            dismissed.current = {
                                                value: event.currentTarget.value,
                                                caret: event.currentTarget.selectionStart,
                                            };
                                            setRange(null);
                                            return;
                                        }
                                        if (suggestions.length && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
                                            event.preventDefault();
                                            setActive(
                                                index =>
                                                    (index + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) %
                                                    suggestions.length
                                            );
                                            return;
                                        }
                                            if (suggestions.length && event.key === 'Enter') {
                                                event.preventDefault();
                                                choose(suggestions[active] || suggestions[0]);
                                                return;
                                            }
                    }
            onKeyDown?.(event);
                }}
            />
            {open && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-border bg-card p-1.5 shadow-lg">
                    <div
                        id={listId}
                        role="listbox"
                        aria-label={t('LinkedIn mention suggestions')}
                        className="max-h-60 overflow-y-auto space-y-0.5"
                    >
                        {suggestions.map((candidate, index) => (
                            <button
                                key={candidate.urn}
                                id={`${listId}-${index}`}
                                type="button"
                                role="option"
                                aria-selected={index === active}
                                className={`flex items-center justify-between gap-2.5 w-full rounded-md px-2.5 py-1.5 text-left text-xs break-words transition-colors ${index === active
                                        ? 'bg-[#0a66c2]/10 text-[#0a66c2] font-semibold'
                                        : 'hover:bg-muted text-foreground'
                                    }`}
                                onMouseDown={event => event.preventDefault()}
                                onClick={() => choose(candidate)}
                            >
                                <span className="flex items-center gap-2 min-w-0">
                                    <MentionAvatar candidate={candidate} />
                                    <span className="truncate font-semibold">@{candidate.name}</span>
                                </span>
                                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    {candidate.type === 'organization' ? t('Company') : t('Member')}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});
