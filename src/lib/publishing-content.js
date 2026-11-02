// Match the owned adapters' supported subset, not all formats a platform may offer.
export const PUBLISHING_PLATFORMS = ['facebook', 'instagram', 'threads', 'tiktok', 'linkedin', 'x'];
export const CAPTION_LIMITS = { facebook: 63206, instagram: 2200, threads: 500, tiktok: 2200, linkedin: 3000, x: 280 };
export const COMMENT_MEDIA_PLATFORMS = ['facebook', 'threads'];

export function resolveCaption(post, account) {
    return post.destination_settings?.[account.id]?.caption?.trim()
        ? post.destination_settings[account.id].caption
        : post.platform_captions?.[account.platform]?.trim()
            ? post.platform_captions[account.platform] : post.caption || '';
}

// An explicit empty account or platform list means text-only, not inheritance.
export function resolveMediaIds(post, account) {
    const accountSettings = post.destination_settings?.[account?.id] || {};
    if (Object.hasOwn(accountSettings, 'media_ids')) return accountSettings.media_ids || [];
    return Object.hasOwn(post.platform_media_ids || {}, account.platform)
        ? post.platform_media_ids[account.platform] : post.media_ids || [];
}

export function resolveComments(post, account) {
    const accountSettings = post.destination_settings?.[account?.id] || {};
    if (Object.hasOwn(accountSettings, 'comments')) return accountSettings.comments || [];
    return post.comments || [];
}

export function referencedMediaIds(post) {
    const commentIds = (list = []) => (Array.isArray(list) ? list : []).flatMap(item => item?.media_ids || []);
    const destinationIds = Object.values(post.destination_settings || {}).flatMap(setting => [
        ...(setting?.media_ids || []),
        ...commentIds(setting?.comments),
    ]);
    return [...new Set([
        ...(post.media_ids || []),
        ...Object.values(post.platform_media_ids || {}).flat(),
        ...commentIds(post.comments),
        ...destinationIds,
    ])];
}

export function resolveMedia(post, account, sharedMedia = post.media || [], platformMedia = post.platform_media || {}) {
    const accountSettings = post.destination_settings?.[account?.id] || {};
    if (Object.hasOwn(accountSettings, 'media')) return accountSettings.media || [];
    return Object.hasOwn(platformMedia, account.platform) ? platformMedia[account.platform] : sharedMedia;
}

const LINKEDIN_MENTION_PATTERN = /@\[([^\]]{1,200})\]\((urn:li:(?:organization|person):[a-zA-Z0-9_-]{1,128})\)/g;

export function parseLinkedinMentions(text) {
    const raw = typeof text === 'string' ? text : '';
    let rendered = '';
    let lastIndex = 0;
    const attributes = [];
    for (const match of raw.matchAll(LINKEDIN_MENTION_PATTERN)) {
        const matchIndex = match.index ?? 0;
        rendered += raw.slice(lastIndex, matchIndex);
        const displayName = match[1].trim() || match[1];
        const urn = match[2];
        const start = rendered.length;
        rendered += displayName;
        attributes.push({
            start,
            length: displayName.length,
            value: urn.startsWith('urn:li:organization:')
                ? { 'com.linkedin.common.CompanyAttributedEntity': { company: urn } }
                : { 'com.linkedin.common.MemberAttributedEntity': { member: urn } },
        });
        lastIndex = matchIndex + match[0].length;
    }
    rendered += raw.slice(lastIndex);
    return { text: rendered, attributes };
}

export function splitLinkedinSegments(text) {
    const raw = typeof text === 'string' ? text : '';
    const segments = [];
    let lastIndex = 0;
    for (const match of raw.matchAll(LINKEDIN_MENTION_PATTERN)) {
        const matchIndex = match.index ?? 0;
        if (matchIndex > lastIndex) {
            segments.push({ type: 'text', text: raw.slice(lastIndex, matchIndex) });
        }
        segments.push({
            type: 'mention',
            text: match[1].trim() || match[1],
            urn: match[2],
            entityType: match[2].startsWith('urn:li:organization:') ? 'organization' : 'person',
        });
        lastIndex = matchIndex + match[0].length;
    }
    if (lastIndex < raw.length) {
        segments.push({ type: 'text', text: raw.slice(lastIndex) });
    }
    return segments.length ? segments : [{ type: 'text', text: raw }];
}

export function captionLength(caption, platform) {
    if (platform === 'linkedin') return Array.from(parseLinkedinMentions(caption).text).length;
    return platform === 'threads' ? Array.from(caption).length : caption.length;
}

export function commentIssues(platform, comments = []) {
    const issues = [];
    if (!Array.isArray(comments) || !comments.length) return issues;
    if (comments.length > 10) issues.push('Choose up to 10 follow-up comments');
    if (platform === 'tiktok') {
        issues.push('TikTok does not support automatic comments');
        return issues;
    }
    for (const comment of comments) {
        const text = comment?.message || '';
        const media = comment?.media || comment?.media_ids || [];
        const delay = comment?.delay_minutes ?? 0;
        if (!text.trim() && !media.length) issues.push('Each comment requires text or an image');
        if (text && captionLength(text, platform) > (CAPTION_LIMITS[platform] || 3000)) issues.push('Comment exceeds platform character limit');
        if (!Number.isInteger(delay) || delay < 0 || delay > 10080) issues.push('Comment delay must be between 0 and 10080 minutes');
        if (media.length > 1) issues.push('Each comment supports at most one image');
        if (media.length > 0) {
            if (platform === 'instagram') issues.push('Instagram comments do not support media attachments');
            else if (platform === 'linkedin') issues.push('LinkedIn comments do not support media attachments');
            else if (media.some(asset => typeof asset === 'object' && asset.file_type === 'video')) issues.push('Comment attachments only support images');
            else if (platform === 'threads' && media.some(asset => typeof asset === 'object' && asset.mime_type && asset.mime_type !== 'image/jpeg')) issues.push('Threads comment images must be JPEG');
        }
    }
    return [...new Set(issues)];
}

export function contentIssues(platform, caption, media) {
    const issues = [];
    if (!PUBLISHING_PLATFORMS.includes(platform)) return ['Publishing supports connected Facebook, Instagram, Threads, TikTok, LinkedIn and X accounts.'];
    if (!caption.trim() || captionLength(caption, platform) > CAPTION_LIMITS[platform]) {
        issues.push({
            facebook: 'Facebook caption must contain between 1 and 63206 characters',
            instagram: 'Instagram caption must contain between 1 and 2200 characters',
            threads: 'Threads caption must contain between 1 and 500 characters',
            tiktok: 'TikTok caption must contain between 1 and 2200 characters',
            linkedin: 'LinkedIn caption must contain between 1 and 3000 characters',
            x: 'X tweet must contain between 1 and 280 characters'
        }[platform]);
    }
    if (media.length > 10) issues.push('Choose up to 10 different images');
    if (media.some(asset => asset.file_type === 'video') && media.length !== 1) issues.push('Choose one video or up to 10 images, not both');
    if (platform === 'instagram') {
        if (media.length !== 1 || !['image/jpeg', 'video/mp4'].includes(media[0]?.mime_type)) issues.push('Instagram requires one JPEG image or one MP4 Reel');
        const image = media[0];
        if (image?.file_type === 'image' && (image.width / image.height < 0.8 || image.width / image.height > 1.91)) issues.push('Instagram image aspect ratio must be between 4:5 and 1.91:1');
    }
    if (platform === 'threads' && (media.length > 1 || media.length === 1 && !['image/jpeg', 'video/mp4'].includes(media[0].mime_type))) issues.push('Threads requires text, one JPEG image or one MP4 video');
    if (platform === 'linkedin') {
        if (media.some(asset => !['image/jpeg', 'image/png', 'video/mp4'].includes(asset.mime_type))) issues.push('LinkedIn supports stored JPEG/PNG images or one MP4 video');
        if (media.some(asset => asset.file_type === 'video' && asset.size_bytes > 30 * 1024 * 1024)) issues.push('LinkedIn videos must be at most 30 MiB');
    }
    if (platform === 'tiktok' && (media.length !== 1 || media[0]?.file_type !== 'video' || media[0]?.mime_type !== 'video/mp4')) issues.push('TikTok requires one MP4 video.');
    return issues;
}

export function destinationIssues(post, account, media, demoMode = false, creator = null) {
    const issues = [
        ...contentIssues(account.platform, resolveCaption(post, account), media),
        ...commentIssues(account.platform, resolveComments(post, account)),
    ];
    if (!demoMode && (account.connection_status !== 'connected' || account.platform === 'facebook' && account.account_type !== 'page')) issues.unshift('Connect the selected publishing accounts before publishing');
    if (account.platform === 'tiktok') {
        const options = post.destination_settings?.[account.id]?.tiktok;
        if (!options || options.privacy !== 'SELF_ONLY' || !options.musicConsent) issues.push('Review TikTok privacy, interactions and music consent before publishing');
        if (options && (options.brandedContent || options.commercial !== options.ownBrand)) issues.push('Paid partnership content cannot use private sandbox visibility. Select your own brand or turn disclosure off.');
        if (!creator) issues.push('Refresh TikTok creator settings before reviewing publication');
        else {
            if (options && (!creator.privacy?.includes(options.privacy) || options.allowComment && creator.commentDisabled || options.allowDuet && creator.duetDisabled || options.allowStitch && creator.stitchDisabled)) issues.push('TikTok creator permissions changed. Refresh settings and review again.');
            if (media.length === 1 && media[0].file_type === 'video' && (!Number.isFinite(media[0].duration_seconds) || media[0].duration_seconds <= 0 || media[0].duration_seconds > creator.maxDuration)) issues.push('TikTok requires one MP4 within the creator duration limit');
        }
    }
    return issues;
}
