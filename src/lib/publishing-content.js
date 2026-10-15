// Match the owned adapters' supported subset, not all formats a platform may offer.
export const PUBLISHING_PLATFORMS = ['facebook', 'instagram', 'threads', 'tiktok', 'linkedin'];
export const CAPTION_LIMITS = { facebook: 63206, instagram: 2200, threads: 500, tiktok: 2200, linkedin: 3000 };

export function resolveCaption(post, account) {
    return post.destination_settings?.[account.id]?.caption?.trim()
        ? post.destination_settings[account.id].caption
        : post.platform_captions?.[account.platform]?.trim()
            ? post.platform_captions[account.platform] : post.caption || '';
}

export function captionLength(caption, platform) {
    return ['threads', 'linkedin'].includes(platform) ? Array.from(caption).length : caption.length;
}

export function contentIssues(platform, caption, media) {
    const issues = [];
    if (!PUBLISHING_PLATFORMS.includes(platform)) return ['Publishing supports connected Facebook, Instagram, Threads, TikTok and LinkedIn accounts.'];
    if (!caption.trim() || captionLength(caption, platform) > CAPTION_LIMITS[platform]) {
        issues.push({ facebook: 'Facebook caption must contain between 1 and 63206 characters',
            instagram: 'Instagram caption must contain between 1 and 2200 characters',
            threads: 'Threads caption must contain between 1 and 500 characters',
            tiktok: 'TikTok caption must contain between 1 and 2200 characters',
            linkedin: 'LinkedIn caption must contain between 1 and 3000 characters' }[platform]);
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
    const issues = contentIssues(account.platform, resolveCaption(post, account), media);
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
