export function linkedinCompanyQuery(value) {
    if (typeof value !== 'string' || value.length > 512) throw new Error('Enter a LinkedIn company name or company page link.');
    let query = value.trim().replace(/^@/, '');
    if (/^(https?:\/\/|www\.)/i.test(query)) {
        let url;
        try { url = new URL(query.startsWith('www.') ? `https://${query}` : query); } catch { throw new Error('Invalid LinkedIn company link.'); }
        const match = url.pathname.match(/^\/company\/([a-zA-Z0-9_-]{1,100})\/?$/);
        if (!['linkedin.com', 'www.linkedin.com'].includes(url.hostname) || url.username || url.password || url.port || !match) throw new Error('Use a linkedin.com/company/name link.');
        query = match[1];
    }
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(query)) throw new Error('Use the exact company name from linkedin.com/company/name (for example microsoft).');
    return query.toLowerCase();
}
