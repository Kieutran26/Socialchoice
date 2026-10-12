import common from './locales/vi-common.json' with { type: 'json' };
import pages from './locales/vi-pages.json' with { type: 'json' };
import components from './locales/vi-components.json' with { type: 'json' };

export const LANGUAGE_STORAGE_KEY = 'socialchoice.language';
export const messages = { ...common, ...components, ...pages };
export const normalizeLanguage = (value) => value === 'vi' ? 'vi' : 'en';
const listeners = new Set();
function storedLanguage() {
    try { return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)); }
    catch { return 'en'; }
}
let language = storedLanguage();
export const getLanguage = () => language;
export const getLocale = () => language === 'vi' ? 'vi-VN' : 'en-GB';
export function setLanguage(value) {
    const next = normalizeLanguage(value);
    try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next); } catch { /* Preference still works for this session. */ }
    if (next === language) return;
    language = next;
    listeners.forEach((notify) => notify());
}
export function subscribeLanguage(notify) {
    listeners.add(notify);
    const onStorage = (event) => {
        if (event.key === LANGUAGE_STORAGE_KEY || event.key === null) {
            const next = storedLanguage();
            if (next !== language) { language = next; listeners.forEach((listener) => listener()); }
        }
    };
    if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
    return () => { listeners.delete(notify); if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage); };
}

/** @param {string} key @param {Record<string, string | number>} [values] @param {string} [locale] */
export function translate(key, values = {}, locale = language) {
    if (key == null) return '';
    let template = locale === 'vi' ? messages[key] ?? key : key;
    if (locale === 'vi' && template === key) {
        const patterns = [
            [/^Unsupported field: (.+)$/, 'Unsupported field: {field}'],
            [/^Invalid UTC timestamp: (.+)$/, 'Invalid UTC timestamp: {field}'],
            [/^(.+) is required$/, '{field} is required'],
            [/^Invalid (.+) items$/, 'Invalid {field} items'],
            [/^Invalid (.+)$/, 'Invalid {field}'],
        ];
        for (const [pattern, message] of patterns) {
            const match = key.match(/** @type {RegExp} */ (pattern));
            if (match) {
                template = messages[/** @type {string} */ (message)];
                values = { ...values, field: common[match[1]] || match[1] };
                break;
            }
        }
    }
    return template.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
}

/** Dynamic label maps retain internal English status keys and react to the current UI language. */
export function translatedLabels(labels) {
    return new Proxy(labels, { get: (target, key) => typeof target[key] === 'string' ? translate(target[key]) : target[key] });
}
