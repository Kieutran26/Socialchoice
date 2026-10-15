import { fail } from './validation.js';

export function validateTiktokOptions(options, creator, media) {
    const keys = ['privacy','allowComment','allowDuet','allowStitch','commercial','ownBrand','brandedContent','aiGenerated','musicConsent'];
    if (!options || typeof options !== 'object' || Array.isArray(options) || Object.keys(options).some(k => !keys.includes(k)) || options.privacy !== 'SELF_ONLY' || keys.filter(k => k !== 'privacy').some(k => typeof options[k] !== 'boolean') || !options.musicConsent) fail('Review TikTok privacy, interactions and music consent before publishing', 409);
    if (options.brandedContent || options.commercial !== options.ownBrand) fail('Paid partnership content cannot use private sandbox visibility. Select your own brand or turn disclosure off.', 409);
    if (!creator || !creator.privacy?.includes(options.privacy) || options.allowComment && creator.commentDisabled || options.allowDuet && creator.duetDisabled || options.allowStitch && creator.stitchDisabled) fail('TikTok creator permissions changed. Refresh settings and review again.', 409);
    if (media.length !== 1 || media[0].file_type !== 'video' || media[0].mime_type !== 'video/mp4' || !Number.isFinite(media[0].duration_seconds) || media[0].duration_seconds <= 0 || media[0].duration_seconds > creator.maxDuration) fail('TikTok requires one MP4 within the creator duration limit', 409);
    return options;
}
