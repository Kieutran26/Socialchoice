/**
 * Unicode text formatting helpers for social posts
 */

export function toUnicodeBold(text) {
    return Array.from(text || '').map((char) => {
        const code = char.codePointAt(0);
        if (code >= 65 && code <= 90) return String.fromCodePoint(120276 + code - 65);
        if (code >= 97 && code <= 122) return String.fromCodePoint(120302 + code - 97);
        if (code >= 48 && code <= 57) return String.fromCodePoint(120812 + code - 48);
        return char;
    }).join('');
}

export function toUnicodeUnderline(text) {
    return Array.from(text || '').map((char) => (char.trim() ? char + '\u0332' : char)).join('');
}

export const PLATFORM_CHAR_LIMITS = {
    x: 280,
    threads: 500,
    instagram: 2200,
    tiktok: 2200,
    linkedin: 3000,
    facebook: 63206,
};

