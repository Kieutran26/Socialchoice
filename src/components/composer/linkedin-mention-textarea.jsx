import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { Buildings, User } from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';
import { mentionSuggestions } from '@/lib/linkedin-mention-input';
import { linkedinCompanyQuery } from '@/lib/linkedin-company-query';
import { companyAvatarForNameOrVanity, saveCustomLinkedinOrganization } from '@/lib/linkedin-company-directory';

const TOKEN_REGEX = /@\[([^\]]{1,200})\]\(urn:li:(organization|person):([a-zA-Z0-9_-]{1,128})\)/g;

function escapeHtml(text = '') {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function rawToHtml(rawText = '') {
    if (!rawText) return '';
    const lines = rawText.split('\n');
    return lines
        .map(line => {
            let html = '';
            let lastIndex = 0;
            const regex = new RegExp(TOKEN_REGEX.source, 'g');
            let match;
            while ((match = regex.exec(line)) !== null) {
                html += escapeHtml(line.slice(lastIndex, match.index));
                const label = escapeHtml(match[1]);
                const type = escapeHtml(match[2]);
                const id = escapeHtml(match[3]);
                html += `<span class="linkedin-mention font-bold text-[#0a66c2] bg-[#0a66c2]/10 px-1.5 py-0.5 rounded cursor-default select-none inline-flex items-center gap-0.5" contenteditable="false" data-mention-label="${label}" data-mention-type="${type}" data-mention-id="${id}">@${label}</span>\u200B`;
                lastIndex = match.index + match[0].length;
            }
            html += escapeHtml(line.slice(lastIndex));
            return html || '<br>';
        })
        .join('<br>');
}

function domToRaw(root) {
    if (!root) return '';
    let result = '';

    function traverse(node) {
        if (!node) return;
        if (node.nodeType === Node.TEXT_NODE) {
            // Filter zero-width space after mention pill
            result += (node.nodeValue || '').replace(/\u200B/g, '');
            return;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = /** @type {HTMLElement} */ (node);
            if (el.classList.contains('linkedin-mention') || el.dataset?.mentionLabel) {
                const label = el.dataset.mentionLabel || el.textContent.replace(/^@/, '');
                const type = el.dataset.mentionType || 'organization';
                const id = el.dataset.mentionId || '';
                result += `@[${label}](urn:li:${type}:${id})`;
                return;
            }
            const tag = el.tagName.toLowerCase();
            if (tag === 'br') {
                result += '\n';
                return;
            }
            const isBlock = ['div', 'p'].includes(tag);
            if (isBlock && result && !result.endsWith('\n')) {
                result += '\n';
            }
            for (let i = 0; i < el.childNodes.length; i++) {
                traverse(el.childNodes[i]);
            }
            if (isBlock && result && !result.endsWith('\n')) {
                result += '\n';
            }
        }
    }

    for (let i = 0; i < root.childNodes.length; i++) {
        traverse(root.childNodes[i]);
    }
    return result;
}

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

/** @typedef {import('react').ComponentPropsWithoutRef<'div'> & { name?: string, enabled?: boolean, linkedinAccounts?: any[], value?: string, onChange?: (e: any) => void, rows?: number, placeholder?: string, disabled?: boolean }} MentionEditorProps */
export const LinkedinMentionTextarea = forwardRef(function LinkedinMentionTextarea(
    /** @type {MentionEditorProps} */ {
        enabled = false,
        linkedinAccounts = [],
        value = '',
        className = '',
        placeholder = '',
        disabled = false,
        rows = 5,
        onChange,
        onKeyDown,
        onBlur,
        ...props
    },
    /** @type {import('react').ForwardedRef<any>} */ forwardedRef
) {
    const { t } = useTranslation();
    const editorRef = useRef(null);
    const composing = useRef(false);
    const lastEmittedValue = useRef(value);
    const [mentionState, setMentionState] = useState(null); // { query: string, range: Range }
    const [active, setActive] = useState(0);
    const [remoteCompanies, setRemoteCompanies] = useState([]);
    const listId = useId();

    useImperativeHandle(forwardedRef, () => ({
        focus: () => editorRef.current?.focus(),
        get value() {
            return editorRef.current ? domToRaw(editorRef.current) : '';
        },
    }));

    // Synchronize content from outside only if changed remotely
    useEffect(() => {
            if (!editorRef.current) return;
            const currentRaw = domToRaw(editorRef.current);
            if (value !== currentRaw && value !== lastEmittedValue.current) {
                editorRef.current.innerHTML = rawToHtml(value);
                lastEmittedValue.current = value;
            }
        }, [value]);

    // Initial mount HTML
    useEffect(() => {
        if (editorRef.current && !editorRef.current.innerHTML) {
            editorRef.current.innerHTML = rawToHtml(value);
        }
    }, []);

    // Silently fetch live LinkedIn companies in the background when typing @query
    useEffect(() => {
        if (!enabled || !mentionState?.query || mentionState.query.trim().length < 2) {
            setRemoteCompanies([]);
            return;
        }
        const connected = (linkedinAccounts || []).find(
            acc => !acc.is_demo && acc.connection_status === 'connected' && acc.id
        );
        if (!connected) return;
        let normalized;
        try {
            normalized = linkedinCompanyQuery(mentionState.query);
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
                // Silent
            }
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
}, [enabled, mentionState?.query, linkedinAccounts]);

const suggestions =
        enabled && mentionState
    ? mentionSuggestions(linkedinAccounts, domToRaw(editorRef.current), mentionState.query, {
        extraCandidates: remoteCompanies,
    })
    : [];
const open = enabled && !!mentionState && suggestions.length > 0 && !disabled;

        function detectMentionTrigger() {
            if (!enabled || composing.current || disabled) {
                setMentionState(null);
                return;
            }
            const sel = window.getSelection();
            if (!sel || !sel.isCollapsed || !sel.anchorNode) {
                setMentionState(null);
                return;
            }
            const node = sel.anchorNode;
            if (node.nodeType !== Node.TEXT_NODE) {
                setMentionState(null);
                return;
            }
            const offset = sel.anchorOffset;
            const textBefore = node.nodeValue?.slice(0, offset) || '';
            const match = /(?:^|[\s(])@([^@\n\[\]]{0,80})$/.exec(textBefore);
            if (!match) {
                setMentionState(null);
                return;
            }
            const query = match[1];
            const matchStart = offset - query.length - 1;
            try {
                const range = document.createRange();
                range.setStart(node, matchStart);
                range.setEnd(node, offset);
                setMentionState({ query, range });
                setActive(0);
            } catch {
                setMentionState(null);
            }
        }

        function emitChange() {
            if (!editorRef.current) return;
            const raw = domToRaw(editorRef.current);
            lastEmittedValue.current = raw;
            const syntheticEvent = {
                target: { value: raw, name: props.name || 'caption' },
                currentTarget: { value: raw, name: props.name || 'caption' },
            };
            onChange?.(syntheticEvent);
        }

        function choose(candidate) {
            if (!candidate || !mentionState?.range || !editorRef.current) return;
            if (candidate.type === 'organization' && candidate.id && candidate.name) {
                saveCustomLinkedinOrganization({
                    id: candidate.id,
                    name: candidate.name,
                    vanity: candidate.vanity || '',
                    avatar: candidate.avatar || '',
                });
            }

            const sel = window.getSelection();
            const r = mentionState.range;
            r.deleteContents();

            const span = document.createElement('span');
            span.className =
                'linkedin-mention font-bold text-[#0a66c2] bg-[#0a66c2]/10 px-1.5 py-0.5 rounded cursor-default select-none inline-flex items-center gap-0.5';
            span.contentEditable = 'false';
            span.dataset.mentionLabel = candidate.name;
            span.dataset.mentionType = candidate.type || 'organization';
            span.dataset.mentionId = candidate.id;
            span.textContent = `@${candidate.name}`;

            r.insertNode(span);

            // Insert non-breaking space after mention so cursor moves naturally past it
            const spaceNode = document.createTextNode('\u00A0');
            span.after(spaceNode);

            if (sel) {
                sel.removeAllRanges();
                const nextRange = document.createRange();
                nextRange.setStart(spaceNode, 1);
                nextRange.collapse(true);
                sel.addRange(nextRange);
            }

            setMentionState(null);
            emitChange();
            editorRef.current.focus();
        }

        const minHeightClass = rows ? `min-h-[${rows * 1.5}rem]` : 'min-h-[6.5rem]';

        return (
            <div
                className="relative min-w-0"
                onBlur={event => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                        setMentionState(null);
                    }
                    onBlur?.(event);
                }}
            >
                            <div
                                ref={editorRef}
                                contentEditable={!disabled}
                                suppressContentEditableWarning
                                role="textbox"
                                aria-multiline="true"
                                aria-placeholder={placeholder}
                                data-placeholder={placeholder}
                                className={`w-full rounded-xl border border-input bg-white px-3 py-2 text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground ${minHeightClass} ${className}`}
                                onInput={() => {
                                    emitChange();
                                    detectMentionTrigger();
                                }}
                                onKeyUp={e => {
                                    if (!['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
                                        detectMentionTrigger();
                                    }
                                }}
                                onMouseUp={() => detectMentionTrigger()}
                                onCompositionStart={() => {
                                    composing.current = true;
                                    setMentionState(null);
                                }}
                                onCompositionEnd={() => {
                                    composing.current = false;
                                    detectMentionTrigger();
                                }}
                                onKeyDown={e => {
                                    if (open && !composing.current) {
                                        if (e.key === 'Escape') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setMentionState(null);
                                            return;
                                        }
                                        if (suggestions.length && ['ArrowDown', 'ArrowUp'].includes(e.key)) {
                                            e.preventDefault();
                                            setActive(
                                                index =>
                                                    (index + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) %
                                                    suggestions.length
                                            );
                                            return;
                                        }
                                        if (suggestions.length && e.key === 'Enter') {
                                            e.preventDefault();
                                            choose(suggestions[active] || suggestions[0]);
                                            return;
                                        }
                                    }
                                    onKeyDown?.(e);
                                }}
                                {...props}
                            />

                            {
                                open && (
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
        )
    }
        </div >
    );
});
