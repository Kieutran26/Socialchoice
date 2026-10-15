import { translatedLabels, translate } from './i18n-core.js';
export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

export const TIMEZONES = [
    'Asia/Ho_Chi_Minh',
    'Asia/Bangkok',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Australia/Sydney',
    'Europe/London',
    'Europe/Berlin',
    'America/New_York',
    'America/Los_Angeles',
    'UTC',
];

export const PLATFORMS = [
    { value: 'facebook', get label() { return translate('Facebook Pages'); }, short: 'Facebook', live: false },
    { value: 'instagram', label: 'Instagram', short: 'Instagram', live: false },
    { value: 'threads', label: 'Threads', short: 'Threads', live: false },
    { value: 'linkedin', label: 'LinkedIn', short: 'LinkedIn', live: true },
    { value: 'tiktok', label: 'TikTok', short: 'TikTok', live: true },
    { value: 'youtube', label: 'YouTube', short: 'YouTube', live: false },
    { value: 'x', label: 'X', short: 'X', live: false },
    { value: 'reddit', label: 'Reddit', short: 'Reddit', live: false },
];

export const PLATFORM_LABEL = translatedLabels(Object.fromEntries(PLATFORMS.map((platform) => [platform.value, platform.value === 'facebook' ? 'Facebook Pages' : platform.short])));

export const POST_STATUSES = [
    'draft',
    'scheduled',
    'processing',
    'published',
    'partially_published',
    'unknown',
    'failed',
    'cancelled',
];

export const POST_STATUS_LABEL = translatedLabels({
    draft: 'Draft',
    scheduled: 'Scheduled',
    processing: 'Processing',
    published: 'Published',
    partially_published: 'Partially published',
    unknown: 'Delivery unconfirmed',
    failed: 'Failed',
    cancelled: 'Cancelled',
});

export const POST_STATUS_TONE = {
    draft: 'neutral',
    scheduled: 'info',
    processing: 'warn',
    published: 'success',
    partially_published: 'warn',
    unknown: 'warn',
    failed: 'danger',
    cancelled: 'neutral',
};

export const JOB_STATUS_LABEL = translatedLabels({
    pending: 'Waiting',
    processing: 'Publishing',
    published: 'Published',
    unknown: 'Delivery unconfirmed',
    failed: 'Failed',
    blocked: 'Blocked — setup required',
    cancelled: 'Cancelled',
});

export const JOB_STATUS_TONE = {
    pending: 'info',
    processing: 'warn',
    published: 'success',
    unknown: 'warn',
    failed: 'danger',
    blocked: 'warn',
    cancelled: 'neutral',
};

export const CONNECTION_LABEL = translatedLabels({
    connected: 'Connected',
    configuration_required: 'Configuration required',
    expired: 'Reauthorization needed',
    disconnected: 'Disconnected',
    demo: 'Demo account',
});

export const CONNECTION_TONE = {
    connected: 'success',
    configuration_required: 'warn',
    expired: 'danger',
    disconnected: 'neutral',
    demo: 'neutral',
};

export const PILLAR_COLORS = [
    '#79D94B',
    '#4F7CA8',
    '#C6A15B',
    '#8A7FB5',
    '#C2705F',
    '#3F8F5B',
    '#6B7F86',
    '#9AA36B',
];

export const MEDIA_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime';
export const MAX_IMAGE_MB = 10;
export const MAX_VIDEO_MB = 100;

export const META_SETUP_MESSAGE =
    'Meta connection not configured: no approved Facebook Pages connection is available for this workspace, so nothing is sent to Facebook.';
