export const UTM_FIELDS = ['source', 'medium', 'campaign', 'content', 'term'];
export function validateUtm(options) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw new Error('Invalid UTM settings');
    for (const field of UTM_FIELDS) if (options[field] !== undefined && (typeof options[field] !== 'string' || options[field].length > 200 || /[\r\n\u0000-\u001f]/.test(options[field]))) throw new Error('UTM values must be text up to 200 characters');
    if (!options.medium?.trim() || !options.campaign?.trim()) throw new Error('Medium and campaign are required');
    for (const key of ['tracking', 'replace']) if (options[key] !== undefined && typeof options[key] !== 'boolean') throw new Error('Invalid UTM settings');
    return options;
}
export function publicDestination(value) {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.href.length > 8192) throw new Error('Use a public HTTP or HTTPS destination without credentials');
    const host = url.hostname.toLowerCase();
    if (!host.includes('.') || host.endsWith('.localhost') || host.endsWith('.local') || host.startsWith('[') || /^(0|10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(host)) throw new Error('Use a public HTTP or HTTPS destination without credentials');
    return url;
}
function ownedTracking(url, origin) {
    return url.origin === origin && (
        /^\/api\/links\/go\/(owner|[a-f0-9-]{36})\/[a-f0-9-]{36}$/.test(url.pathname) ||
        /^\/s\/[a-zA-Z0-9_-]{4,36}$/.test(url.pathname)
    );
}
export function tagUrl(original, options, platform, ownedOrigin = '') {
    validateUtm(options);
    const url = publicDestination(original);
    // Reapplying never wraps an existing tracking URL or mutates signed URLs.
    if (ownedTracking(url, ownedOrigin) || [...url.searchParams.keys()].some(key => /^(x-amz-signature|x-goog-signature|signature|sig)$/i.test(key))) return original;
    let changed = false;
    for (const field of UTM_FIELDS) {
        const value = (options[field] || (field === 'source' ? platform || 'social' : '')).trim();
        const key = `utm_${field}`;
        if (value && (options.replace || !url.searchParams.has(key))) { url.searchParams.set(key, value); changed = true; }
    }
    return changed ? url.href : original;
}
export function mapCaptionLinks(caption, convert) {
    return caption.replace(/https?:\/\/[^\s<>"\u0000-\u001f]+/giu, match => {
        let url = match, tail = '';
        while (/[.,!?;:'\u3002\uFF0C\uFF01\uFF1F]$/.test(url) || url.endsWith(')') && (url.match(/\)/g) || []).length > (url.match(/\(/g) || []).length || url.endsWith(']')) {
            tail = url.at(-1) + tail; url = url.slice(0, -1);
        }
        try { publicDestination(url); } catch { return match; }
        return convert(url) + tail;
    });
}
export function linkFormSnapshot(form) {
    return JSON.stringify([form.brand_id, form.caption, form.platform_captions || {}, form.account_ids, Object.fromEntries((form.account_ids || []).map(id => [id, form.destination_settings?.[id]?.caption || '']))]);
}
export function buildUtmCaptions(form, accounts, options, convert = (value, context) => { void context; return value; }, ownedOrigin = '') {
    validateUtm(options);
    const links = [];
    const map = (caption, platform, accountId = '') => mapCaptionLinks(caption, original => {
        const tagged = tagUrl(original, options, platform, ownedOrigin);
        if (ownedTracking(new URL(tagged), ownedOrigin) || tagged === original && /[?&](?:sig|signature|X-Amz-Signature|X-Goog-Signature)=/i.test(original)) return original;
        const final = convert(tagged, { platform, accountId });
        links.push({ original, tagged, final, platform, accountId });
        return final;
    });
    if (!form.account_ids?.length) return { caption: map(form.caption, 'social'), platform_captions: Object.fromEntries(Object.entries(form.platform_captions || {}).map(([p, c]) => [p, map(c, p)])), destination_captions: {}, links };
    const destination_captions = {};
    for (const id of form.account_ids) {
        const account = accounts.find(a => a.id === id);
        if (!account) throw new Error('Selected account is unavailable');
        const caption = form.destination_settings?.[id]?.caption?.trim() ? form.destination_settings[id].caption : form.platform_captions?.[account.platform]?.trim() ? form.platform_captions[account.platform] : form.caption;
        destination_captions[id] = map(caption, account.platform, id);
    }
    return { caption: form.caption, platform_captions: form.platform_captions || {}, destination_captions, links };
}
