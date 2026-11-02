import {
    BUILTIN_LINKEDIN_ORGANIZATIONS,
    companyAvatarForNameOrVanity,
    getCustomLinkedinOrganizations,
} from './linkedin-company-directory.js';

const validId = /^[a-zA-Z0-9_-]{1,128}$/;
const TOKEN_REGEX = /@\[([^\]]{1,200})\]\(urn:li:(organization|person):([a-zA-Z0-9_-]{1,128})\)/g;

export function mentionRange(value, start, end = start) {
    if (typeof value !== 'string' || !Number.isInteger(start) || start !== end || start < 0 || start > value.length) return null;
    for (const token of value.matchAll(TOKEN_REGEX)) {
        if (start > token.index && start < token.index + token[0].length) return null;
    }
    const match = /(?:^|[\s(])@([^@\n\[\]]{0,80})$/.exec(value.slice(0, start));
    if (!match) return null;
    return { start: start - match[1].length - 1, end: start, query: match[1] };
}

export function mentionSuggestions(accounts, text, query = '', { includeDirectory = true, extraCandidates = [] } = {}) {
    const candidates = new Map();
    const add = (name, type, id, vanity = '', avatar = '') => {
        const label = typeof name === 'string' ? name.replace(/[\]\r\n]/g, '').trim().slice(0, 200) : '';
        if (!label || !validId.test(id || '')) return;
        const urn = `urn:li:${type}:${id}`;
        const resolvedAvatar =
            type === 'organization' ? companyAvatarForNameOrVanity(label, vanity, avatar) : avatar || '';
        if (!candidates.has(urn)) {
            candidates.set(urn, {
                id: String(id),
                name: label,
                type,
                urn,
                vanity,
                avatar: resolvedAvatar,
                token: `@[${label}](${urn})`,
            });
        }
    };
    for (const account of accounts || []) {
        if (account.platform === 'linkedin' && account.connection_status === 'connected' && !account.is_demo) {
            add(
                account.name,
                account.account_type === 'page' ? 'organization' : 'person',
                account.external_id,
                account.username,
                account.avatar_url || ''
            );
        }
    }
    for (const match of (text || '').matchAll(TOKEN_REGEX)) {
        add(match[1], match[2], match[3]);
    }
    for (const extra of extraCandidates || []) {
        if (extra?.id && extra?.name) {
            add(extra.name, extra.type || 'organization', extra.id, extra.vanity || '', extra.avatar || '');
        }
    }

    if (includeDirectory) {
        for (const custom of getCustomLinkedinOrganizations()) {
            add(custom.name, 'organization', custom.id, custom.vanity, custom.avatar);
        }
        for (const org of BUILTIN_LINKEDIN_ORGANIZATIONS) {
            add(org.name, 'organization', org.id, org.vanity, org.avatar);
        }
    }

    const normalize = value =>
        (value || '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase().replace(/đ/g, 'd').trim();
    const needle = normalize(query);
    if (!needle) {
        return [...candidates.values()]
            .filter(c => !includeDirectory || accounts?.some(a => a.external_id === c.urn.split(':').at(-1)))
            .slice(0, 8);
    }
    return [...candidates.values()]
        .filter(candidate => {
            const nameNorm = normalize(candidate.name);
            const vanityNorm = normalize(candidate.vanity);
            return nameNorm.includes(needle) || vanityNorm.includes(needle);
        })
        .slice(0, 8);
}

export function insertMention(value, range, token) {
    if (!range || !/^@\[[^\]\r\n]{1,200}\]\(urn:li:(organization|person):[a-zA-Z0-9_-]{1,128}\)$/.test(token)) return null;
    const trailing = value.slice(range.end);
    const inserted = token + (/^[\s.,!?;:)\]}]/.test(trailing) ? '' : ' ');
    return { value: value.slice(0, range.start) + inserted + trailing, caret: range.start + inserted.length };
}

/**
 * Converts raw caption containing `@[Name](urn:li:...)` into clean display text `@Name`
 * and populates `mentionMap` (name -> token).
 */
export function toLinkedinDisplayValue(rawValue, mentionMap = new Map()) {
    const raw = String(rawValue ?? '');
    const display = raw.replace(TOKEN_REGEX, (fullToken, name, type, id) => {
        const cleanName = name.trim();
        if (cleanName) {
            mentionMap.set(cleanName, {
                name: cleanName,
                type,
                id,
                urn: `urn:li:${type}:${id}`,
                token: fullToken,
            });
        }
        return `@${cleanName}`;
    });
    return display;
}

/**
 * Converts clean display text `@Name` back into raw caption with `@[Name](urn:li:...)`
 * and maps the display caret position to the corresponding raw caret position.
 */
export function fromLinkedinDisplayValue(displayValue, displayCaret, mentionMap = new Map()) {
    const text = String(displayValue ?? '');
    const caret = typeof displayCaret === 'number' ? displayCaret : text.length;
    if (!mentionMap || mentionMap.size === 0) {
        return { rawValue: text, rawCaret: caret };
    }
    const names = [...mentionMap.keys()].filter(Boolean).sort((a, b) => b.length - a.length);
    if (!names.length) {
        return { rawValue: text, rawCaret: caret };
    }

    let rawValue = '';
    let rawCaret = 0;
    let caretMapped = false;
    let i = 0;

    while (i < text.length) {
        if (!caretMapped && i >= caret) {
            rawCaret = rawValue.length;
            caretMapped = true;
        }
        const prevChar = i === 0 ? '' : text[i - 1];
        const validStart = i === 0 || /[\s([{"']/.test(prevChar);
        if (validStart && text[i] === '@') {
            let matchedEntry = null;
            for (const name of names) {
                if (text.startsWith(`@${name}`, i)) {
                    const afterIdx = i + 1 + name.length;
                    const nextChar = afterIdx < text.length ? text[afterIdx] : '';
                    const validEnd = !nextChar || /[\s.,!?;:)\]}"']/.test(nextChar);
                    if (validEnd) {
                        matchedEntry = mentionMap.get(name);
                        break;
                    }
                }
            }
            if (matchedEntry) {
                const displayLen = 1 + matchedEntry.name.length;
                if (!caretMapped && caret > i && caret <= i + displayLen) {
                    rawCaret = rawValue.length + matchedEntry.token.length;
                    caretMapped = true;
                }
                rawValue += matchedEntry.token;
                i += displayLen;
                continue;
            }
        }
        rawValue += text[i];
        i += 1;
    }

    if (!caretMapped) {
        rawCaret = rawValue.length;
    }
    return { rawValue, rawCaret };
}

/**
 * Converts a raw caret index in `rawValue` to the corresponding display caret index in `displayValue`.
 */
export function toLinkedinDisplayCaret(rawValue, rawCaret) {
    const raw = String(rawValue ?? '');
    const target = Math.max(0, Math.min(typeof rawCaret === 'number' ? rawCaret : raw.length, raw.length));
    let displayCaret = 0;
    let lastIndex = 0;
    for (const match of raw.matchAll(TOKEN_REGEX)) {
        const start = match.index;
        const end = start + match[0].length;
        const displayLen = 1 + match[1].trim().length;
        if (target <= start) {
            displayCaret += target - lastIndex;
            return displayCaret;
        }
        displayCaret += start - lastIndex;
        if (target <= end) {
            return displayCaret + displayLen;
        }
        displayCaret += displayLen;
        lastIndex = end;
    }
    displayCaret += target - lastIndex;
    return displayCaret;
}
