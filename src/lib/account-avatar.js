// Helper to resolve authentic avatars for connected social accounts.
// Strictly NEVER uses fake stock photos of random people.

export function getAccountAvatarUrl(account) {
    if (!account) return '';

    // 1. If explicit avatar_url is provided in the account record
    if (account.avatar_url && typeof account.avatar_url === 'string' && account.avatar_url.trim().length > 0) {
        return account.avatar_url;
    }

    // 2. Check local storage if user set a custom avatar
    if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(`socialchoice:avatar:${account.id}`) 
            || window.localStorage.getItem(`socialchoice:avatar:${account.username}`)
            || window.localStorage.getItem(`socialchoice:avatar:${account.name}`);
        if (stored) return stored;
    }

    const platform = (account.platform || '').toLowerCase();
    const username = String(account.username || account.name || '').replace(/^@/, '').trim();
    const externalId = account.external_id;

    // 3. Facebook Page: Meta Graph API serves the real avatar for numeric Page IDs
    if (platform === 'facebook' && externalId && /^\d+$/.test(externalId)) {
        return `https://graph.facebook.com/${externalId}/picture?type=large`;
    }

    // 4. X (Twitter): Unavatar serves the live profile avatar of that X handle
    if (platform === 'x' && username) {
        return `https://unavatar.io/x/${encodeURIComponent(username)}`;
    }

    // 5. YouTube: Live channel avatar
    if (platform === 'youtube' && (username || externalId)) {
        return `https://unavatar.io/youtube/${encodeURIComponent(username || externalId)}`;
    }

    return '';
}

export function saveAccountAvatar(accountIdOrUsername, url) {
    if (typeof window !== 'undefined' && window.localStorage && accountIdOrUsername && url) {
        window.localStorage.setItem(`socialchoice:avatar:${accountIdOrUsername}`, url);
    }
}
