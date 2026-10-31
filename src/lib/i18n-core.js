import ai from './locales/vi-ai.json' with { type: 'json' };
import interactiveImages from './locales/vi-interactive-images.json' with { type: 'json' };
import channels from './locales/vi-channels.json' with { type: 'json' };
import crossPlatform from './locales/vi-cross-platform.json' with { type: 'json' };
import linkedin from './locales/vi-linkedin.json' with { type: 'json' };
import tiktok from './locales/vi-tiktok.json' with { type: 'json' };
import common from './locales/vi-common.json' with { type: 'json' };
import pages from './locales/vi-pages.json' with { type: 'json' };
import components from './locales/vi-components.json' with { type: 'json' };
import instagram from './locales/vi-instagram.json' with { type: 'json' };
import threads from './locales/vi-threads.json' with { type: 'json' };
import desktop from './locales/vi-desktop.json' with { type: 'json' };
import webLicense from './locales/vi-web-license.json' with { type: 'json' };

export const LANGUAGE_STORAGE_KEY = 'socialchoice.language';
export const messages = { ...common, ...components, ...pages, ...instagram, ...threads, ...tiktok, ...linkedin, ...channels, ...crossPlatform, ...desktop, ...webLicense, ...ai, ...interactiveImages };
export const normalizeLanguage = (value) => value === 'en' ? 'en' : 'vi';
const listeners = new Set();
function storedLanguage() {
    try { return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)); }
    catch { return 'vi'; }
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
    let template = locale === 'vi' && Object.hasOwn(messages, key) ? messages[key] : key;
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
                values = { ...values, field: Object.hasOwn(common, match[1]) ? common[match[1]] : match[1] };
                break;
            }
        }
    }
    return template.replace(/\{(\w+)\}/g, (match, name) => {
        if (!Object.hasOwn(values, name)) return match;
        const value = values[name];
        return typeof value === 'number' ? new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-GB').format(value) : String(value);
    });
}

/** Dynamic label maps retain internal English status keys and react to the current UI language. */
export function translatedLabels(labels) {
    return new Proxy(labels, { get: (target, key) => typeof target[key] === 'string' ? translate(target[key]) : target[key] });
}
