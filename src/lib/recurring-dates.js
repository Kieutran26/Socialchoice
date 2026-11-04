import { toUtcIso, toZonedParts, addDays } from './tz.js';

export function recurringTime(policy, index) {
    if (index === 0) return new Date(policy.first_at).toISOString();
    const first = toZonedParts(policy.first_at, policy.timezone);
    let date = first.date;
    if (policy.frequency === 'biweekly') date = addDays(date, index * 14);
    else {
        const [year, month, day] = first.date.split('-').map(Number);
        const target = new Date(Date.UTC(year, month - 1 + index, 1));
        const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
        date = `${target.toISOString().slice(0, 7)}-${String(Math.min(day, last)).padStart(2, '0')}`;
    }
    const iso = toUtcIso(date, first.time, policy.timezone);
    // A nonexistent daylight-saving wall time must never silently publish at another hour.
    if (toZonedParts(iso, policy.timezone).date !== date || toZonedParts(iso, policy.timezone).time !== first.time) throw new Error('Recurring time does not exist in this timezone. Review a new schedule.');
    return iso;
}
export function validateRecurringPolicy(input) {
    if (!input || !['biweekly', 'monthly'].includes(input.frequency) || typeof input.first_at !== 'string' || !Number.isFinite(Date.parse(input.first_at)) || Date.parse(input.first_at) < Date.now() + 60000 || Date.parse(input.first_at) > Date.now() + 366 * 86400000) throw new Error('Choose the first recurrence between one minute and one year from now.');
    if (typeof input.timezone !== 'string') throw new Error('Valid timezone required');
    new Intl.DateTimeFormat('en', { timeZone: input.timezone });
    const first = new Date(input.first_at).toISOString();
    if (new Date(first).getUTCSeconds() || new Date(first).getUTCMilliseconds()) throw new Error('Choose a time with minute precision.');
    const limit = input.limit ?? 0;
    if (!Number.isInteger(limit) || limit < 0 || limit > 365) throw new Error('Choose between 1 and 365 publications, or 0 for no limit.');
    const end = input.end_date || '';
    if (typeof end !== 'string' || end && (!/^\d{4}-\d{2}-\d{2}$/.test(end) || !Number.isFinite(Date.parse(end)) || new Date(end).toISOString().slice(0, 10) !== end || end < toZonedParts(first, input.timezone).date)) throw new Error('End date must be on or after the first recurrence.');
    return { frequency: input.frequency, first_at: first, timezone: input.timezone, limit, end_date: end };
}
export function withinRecurringEnd(policy, index) {
    return (!policy.limit || index < policy.limit) && (!policy.end_date || toZonedParts(recurringTime(policy, index), policy.timezone).date <= policy.end_date);
}
