import { DEFAULT_TIMEZONE } from './constants.js';

/** @returns {Record<string, string>} */
const partsOf = (date, timeZone) =>
    new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })
        .formatToParts(date)
        .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});

/** Offset of a timezone at a given instant, in milliseconds. */
const offsetMs = (date, timeZone) => {
    const p = partsOf(date, timeZone);
    const asUtc = Date.UTC(
        Number(p.year),
        Number(p.month) - 1,
        Number(p.day),
        Number(p.hour) % 24,
        Number(p.minute),
        Number(p.second),
    );
    return asUtc - date.getTime();
};

/** Convert a date + time the user typed in `timeZone` into an absolute ISO timestamp. */
export const toUtcIso = (dateValue, timeValue, timeZone = DEFAULT_TIMEZONE) => {
    if (!dateValue || !timeValue) return null;
    const [year, month, day] = dateValue.split('-').map(Number);
    const [hour, minute] = timeValue.split(':').map(Number);
    const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
    const first = new Date(guess - offsetMs(new Date(guess), timeZone));
    const second = new Date(guess - offsetMs(first, timeZone));
    return second.toISOString();
};

/** Split an absolute timestamp into date / time strings in `timeZone`. */
export const toZonedParts = (value, timeZone = DEFAULT_TIMEZONE) => {
    if (!value) return { date: '', time: '' };
    const p = partsOf(new Date(value), timeZone);
    return {
        date: `${p.year}-${p.month}-${p.day}`,
        time: `${p.hour === '24' ? '00' : p.hour}:${p.minute}`,
    };
};

export const todayInZone = (timeZone = DEFAULT_TIMEZONE) => toZonedParts(new Date().toISOString(), timeZone).date;

export const addDays = (dateValue, days) => {
    const d = new Date(`${dateValue}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};

export const startOfMonth = (dateValue) => `${dateValue.slice(0, 7)}-01`;

export const shiftMonths = (dateValue, delta) => {
    const [year, month] = dateValue.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    return d.toISOString().slice(0, 10);
};

/** Monday-first weekday index (0 = Monday). */
export const weekdayIndex = (dateValue) => {
    const day = new Date(`${dateValue}T00:00:00Z`).getUTCDay();
    return (day + 6) % 7;
};

export const localInputDefault = (timeZone = DEFAULT_TIMEZONE) => {
    const parts = toZonedParts(new Date(Date.now() + 3600 * 1000).toISOString(), timeZone);
    return { date: parts.date, time: parts.time };
};
