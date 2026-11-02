import { BUILTIN_LINKEDIN_ORGANIZATIONS, getCustomLinkedinOrganizations } from './linkedin-company-directory.js';

const validId = /^[a-zA-Z0-9_-]{1,128}$/;

export function mentionRange(value, start, end = start) {
    if (typeof value !== 'string' || !Number.isInteger(start) || start !== end || start < 0 || start > value.length) return null;
    for (const token of value.matchAll(/@\[[^\]]{1,200}\]\(urn:li:(?:organization|person):[a-zA-Z0-9_-]{1,128}\)/g)) {
        if (start > token.index && start < token.index + token[0].length) return null;
    }
    const match = /(?:^|[\s(])@([^@\n\[\]]{0,80})$/.exec(value.slice(0, start));
    if (!match) return null;
    return { start: start - match[1].length - 1, end: start, query: match[1] };
}

    export function mentionSuggestions(accounts, text, query = '', { includeDirectory = true } = {}) {
        const candidates = new Map();
            const add = (name, type, id, vanity = '') => {
                const label = typeof name === 'string' ? name.replace(/[\]\r\n]/g, '').trim().slice(0, 200) : '';
                if (!label || !validId.test(id || '')) return;
                const urn = `urn:li:${type}:${id}`;
                if (!candidates.has(urn)) candidates.set(urn, { name: label, type, urn, vanity, token: `@[${label}](${urn})` });
            };
            for (const account of accounts || []) {
                if (account.platform === 'linkedin' && account.connection_status === 'connected' && !account.is_demo) add(account.name, account.account_type === 'page' ? 'organization' : 'person', account.external_id, account.username);
            }
            for (const match of (text || '').matchAll(/@\[([^\]]{1,200})\]\(urn:li:(organization|person):([a-zA-Z0-9_-]{1,128})\)/g)) add(match[1], match[2], match[3]);

            if (includeDirectory) {
                // Include custom and verified directory organizations for instant lookup without API limits
                for (const custom of getCustomLinkedinOrganizations()) {
                    add(custom.name, 'organization', custom.id, custom.vanity);
                }
                for (const org of BUILTIN_LINKEDIN_ORGANIZATIONS) {
                    add(org.name, 'organization', org.id, org.vanity);
                }
            }

            const normalize = value => (value || '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase().replace(/đ/g, 'd').trim();
            const needle = normalize(query);
            if (!needle) {
                return [...candidates.values()].filter(c => !includeDirectory || accounts?.some(a => a.external_id === c.urn.split(':').at(-1))).slice(0, 8);
            }
            return [...candidates.values()].filter(candidate => {
                const nameNorm = normalize(candidate.name);
                const vanityNorm = normalize(candidate.vanity);
                return nameNorm.includes(needle) || vanityNorm.includes(needle);
            }).slice(0, 8);
        }

        export function insertMention(value, range, token) {
            if (!range || !/^@\[[^\]\r\n]{1,200}\]\(urn:li:(organization|person):[a-zA-Z0-9_-]{1,128}\)$/.test(token)) return null;
            const trailing = value.slice(range.end);
            const inserted = token + (/^[\s.,!?;:)\]}]/.test(trailing) ? '' : ' ');
            return { value: value.slice(0, range.start) + inserted + trailing, caret: range.start + inserted.length };
        }
