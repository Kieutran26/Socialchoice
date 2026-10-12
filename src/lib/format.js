import { DEFAULT_TIMEZONE } from './constants.js';
import { getLocale, translate } from './i18n-core.js';

export const formatDateTime = (value, timeZone = DEFAULT_TIMEZONE) =>
    value
        ? new Intl.DateTimeFormat(getLocale(), {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone,
        }).format(new Date(value))
        : '—';

export const formatShortDateTime = (value, timeZone = DEFAULT_TIMEZONE) =>
    value
        ? new Intl.DateTimeFormat(getLocale(), {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone,
        }).format(new Date(value))
        : '—';

export const formatDay = (value, timeZone = DEFAULT_TIMEZONE) =>
    value
        ? new Intl.DateTimeFormat(getLocale(), {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone,
        }).format(new Date(value))
        : '—';

export const formatTime = (value, timeZone = DEFAULT_TIMEZONE) =>
    value
        ? new Intl.DateTimeFormat(getLocale(), {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone,
        }).format(new Date(value))
        : '—';

/** YYYY-MM-DD in the given timezone — safe key for grouping by calendar day. */
export const dateKey = (value, timeZone = DEFAULT_TIMEZONE) =>
    new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone,
    }).format(new Date(value));

export const relativeTime = (value) => {
    if (!value) return '—';
    const diff = Date.now() - new Date(value).getTime();
    const mins = Math.round(diff / 60000);
    if (Math.abs(mins) < 1) return translate('just now');
    if (Math.abs(mins) < 60) return translate(mins > 0 ? '{count}m ago' : 'in {count}m', { count: Math.abs(mins) });
    const hours = Math.round(mins / 60);
    if (Math.abs(hours) < 24) return translate(hours > 0 ? '{count}h ago' : 'in {count}h', { count: Math.abs(hours) });
    const days = Math.round(hours / 24);
    return translate(days > 0 ? '{count}d ago' : 'in {count}d', { count: Math.abs(days) });
};

export const formatBytes = (bytes) => {
    if (!bytes) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${new Intl.NumberFormat(getLocale(), { maximumFractionDigits: value >= 10 || unit === 0 ? 0 : 1 }).format(value)} ${units[unit]}`;
};

export const formatNumber = (value) =>
    value === null || value === undefined ? '0' : new Intl.NumberFormat(getLocale()).format(value);

export const percent = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);
