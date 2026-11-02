import { forwardRef, useId, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/lib/i18n';
import { insertMention, mentionRange, mentionSuggestions } from '@/lib/linkedin-mention-input';
import { LinkedinCompanyLookup } from './linkedin-company-lookup';

/** @typedef {import('react').ComponentPropsWithoutRef<'textarea'> & { enabled?: boolean, linkedinAccounts?: any[] }} MentionProps */
export const LinkedinMentionTextarea = forwardRef(function LinkedinMentionTextarea(
    /** @type {MentionProps} */ { enabled = false, linkedinAccounts = [], value = '', onChange, onKeyDown, onSelect, onBlur, onCompositionStart, onCompositionEnd, ...props },
    /** @type {import('react').ForwardedRef<HTMLTextAreaElement>} */ forwardedRef,
) {
    const { t } = useTranslation();
    const input = useRef(null), composing = useRef(false), dismissed = useRef(null);
    const [range, setRange] = useState(null), [active, setActive] = useState(0);
    const listId = useId();
    const text = String(value);
    const suggestions = enabled && range ? mentionSuggestions(linkedinAccounts, text, range.query) : [];
    const open = enabled && !!range && !props.disabled && !props.readOnly;
    function updateRange(target) {
        if (dismissed.current?.value === target.value && dismissed.current?.caret === target.selectionStart) return;
        dismissed.current = null;
        setRange(enabled && !composing.current ? mentionRange(target.value, target.selectionStart, target.selectionEnd) : null);
        setActive(0);
    }
    function choose(candidate) {
        const current = input.current;
        if (!current || composing.current) return;
        const fresh = mentionRange(current.value, current.selectionStart, current.selectionEnd);
        const result = insertMention(current.value, fresh, candidate.token);
        if (!result) return;
        // Use the native textarea setter so the parent's existing change/autosave flow receives the edit.
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        setter.call(current, result.value);
        current.dispatchEvent(new Event('input', { bubbles: true }));
        setRange(null);
        requestAnimationFrame(() => { current.focus(); current.setSelectionRange(result.caret, result.caret); });
    }
    return <div className="relative min-w-0" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { dismissed.current = null; setRange(null); } }}>
        <Textarea {...props} value={value} ref={node => { input.current = node; if (typeof forwardedRef === 'function') forwardedRef(node); else if (forwardedRef) forwardedRef.current = node; }}
            role={enabled ? 'combobox' : props.role}
            aria-autocomplete={enabled ? 'list' : undefined} aria-controls={open ? listId : undefined} aria-expanded={enabled ? open : undefined}
            aria-activedescendant={open && suggestions[active] ? `${listId}-${active}` : undefined}
            onChange={event => { dismissed.current = null; onChange?.(event); updateRange(event.currentTarget); }}
            onSelect={event => { onSelect?.(event); updateRange(event.currentTarget); }}
            onBlur={onBlur}
            onCompositionStart={event => { composing.current = true; setRange(null); onCompositionStart?.(event); }}
            onCompositionEnd={event => { composing.current = false; updateRange(event.currentTarget); onCompositionEnd?.(event); }}
            onKeyDown={event => {
                if (open && !composing.current && !event.nativeEvent.isComposing) {
                    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismissed.current = { value: event.currentTarget.value, caret: event.currentTarget.selectionStart }; setRange(null); return; }
                    if (suggestions.length && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setActive(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length); return; }
                    if (suggestions.length && event.key === 'Enter') { event.preventDefault(); choose(suggestions[active] || suggestions[0]); return; }
                }
                onKeyDown?.(event);
            }} />
            {open && <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-border bg-card p-2 shadow-lg">
                <p className="label-xs px-2 pb-1">{t('Choose a LinkedIn mention')}</p>
                    <div id={listId} role="listbox" aria-label={t('LinkedIn mention suggestions')} className="max-h-60 overflow-y-auto">
                        {suggestions.map((candidate, index) => <button key={candidate.urn} id={`${listId}-${index}`} type="button" role="option" aria-selected={index === active}
                        className={`flex items-center justify-between w-full rounded-md px-2.5 py-1.5 text-left text-xs break-words ${index === active ? 'bg-[#0a66c2]/10 text-[#0a66c2] font-medium' : 'hover:bg-muted text-foreground'}`}
                        onMouseDown={event => event.preventDefault()} onClick={() => choose(candidate)}>
                        <span>@{candidate.name}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{candidate.type === 'organization' ? t('Company') : t('Member')}</span>
                    </button>)}
                </div>
                {!suggestions.length && <p role="status" className="px-2 py-1 text-xs text-muted-foreground">{t('No matching known LinkedIn account. Add another mention by name and ID below.')}</p>}
                <LinkedinCompanyLookup linkedinAccounts={linkedinAccounts} query={range.query} onChoose={choose} />
                <p className="px-2 pt-1 text-[11px] text-muted-foreground">{t('Suggestions use connected accounts, verified directory, and mentions in this text.')}</p>
            </div>}
        </div>;
});
