/**
 * IP-based Geolocation & Strict Market Enforcement.
 * - Vietnam IP (country === 'VN') -> market = 'vn' (VNĐ + SePay VietQR ONLY)
 * - Non-Vietnam IP (abroad)        -> market = 'intl' (USD + International Checkout ONLY)
 *
 * Supports ?geo=VN or ?geo=US query param for local testing.
 */

const GEO_CACHE_KEY = 'socialchoice.geo_country';

function guessInitialCountry() {
    try {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const qGeo = (params.get('geo') || '').trim().toUpperCase();
            if (qGeo && /^[A-Z]{2}$/.test(qGeo)) {
                window.sessionStorage.setItem(GEO_CACHE_KEY, qGeo);
                return qGeo;
            }
            const cached = window.sessionStorage.getItem(GEO_CACHE_KEY);
            if (cached && /^[A-Z]{2}$/.test(cached)) return cached;
        }
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const lang = (navigator.language || '').toLowerCase();
        if (tz === 'Asia/Ho_Chi_Minh' || tz === 'Asia/Saigon' || lang.startsWith('vi')) {
            return 'VN';
        }
        return 'US';
    } catch {
        return 'VN';
    }
}

function toMarket(countryCode) {
    return String(countryCode || 'VN').toUpperCase() === 'VN' ? 'vn' : 'intl';
}

function syncLanguageFromGeo(market, forceOverride = false) {
    try {
        if (typeof window === 'undefined') return;
        const hasManualLang = window.sessionStorage.getItem('socialchoice.manual_lang') === '1';
        if (hasManualLang && !forceOverride) return;
        const targetLang = market === 'intl' ? 'en' : 'vi';
        const current = window.localStorage.getItem('socialchoice.language');
        if (current !== targetLang) {
            window.localStorage.setItem('socialchoice.language', targetLang);
            window.dispatchEvent(new StorageEvent('storage', { key: 'socialchoice.language', newValue: targetLang }));
        }
        if (typeof document !== 'undefined') {
            document.documentElement.lang = targetLang;
        }
    } catch {
        // ignore storage errors
    }
}

export function getGeoMarketState() {
    const countryCode = guessInitialCountry();
    return {
        countryCode,
        market: toMarket(countryCode),
    };
}

export async function detectGeoMarket() {
    if (typeof window === 'undefined') return getGeoMarketState();

    // Respect explicit ?geo=XX testing override
    const params = new URLSearchParams(window.location.search);
    const qGeo = (params.get('geo') || '').trim().toUpperCase();
    if (qGeo && /^[A-Z]{2}$/.test(qGeo)) {
        const market = toMarket(qGeo);
        const state = { countryCode: qGeo, market };
        window.__GEO_MARKET__ = state;
        syncLanguageFromGeo(market, true);
        window.dispatchEvent(new CustomEvent('socialchoice:geo', { detail: state }));
        return state;
    }

    // Return cached lookup if already fetched this session
    try {
        const cached = window.sessionStorage.getItem(GEO_CACHE_KEY);
        if (cached && /^[A-Z]{2}$/.test(cached)) {
            const market = toMarket(cached);
            const state = { countryCode: cached, market };
            window.__GEO_MARKET__ = state;
            syncLanguageFromGeo(market, false);
            return state;
        }
    } catch {
        // ignore
    }

    const fetchWithTimeout = async (url, ms = 2500) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        try {
            const res = await fetch(url, { signal: controller.signal });
            if (!res.ok) throw new Error('Geo fetch failed');
            return await res.json();
        } finally {
            clearTimeout(timer);
        }
    };

    let detectedCode = '';
    try {
        const data = await fetchWithTimeout('https://api.country.is/', 2500);
        if (data && data.country) detectedCode = String(data.country).toUpperCase();
    } catch {
        try {
            const data2 = await fetchWithTimeout('https://ipapi.co/json/', 2500);
            if (data2 && data2.country_code) detectedCode = String(data2.country_code).toUpperCase();
        } catch {
            // keep initial timezone/locale guess
        }
    }

    if (detectedCode && /^[A-Z]{2}$/.test(detectedCode)) {
        try {
            window.sessionStorage.setItem(GEO_CACHE_KEY, detectedCode);
        } catch {
            // ignore
        }
        const market = toMarket(detectedCode);
        const state = { countryCode: detectedCode, market };
        window.__GEO_MARKET__ = state;
        syncLanguageFromGeo(market, false);
        window.dispatchEvent(new CustomEvent('socialchoice:geo', { detail: state }));
        return state;
    }

    const fallbackState = getGeoMarketState();
    syncLanguageFromGeo(fallbackState.market, false);
    return fallbackState;
}

if (typeof window !== 'undefined') {
    const initial = getGeoMarketState();
    window.__GEO_MARKET__ = initial;
    syncLanguageFromGeo(initial.market, false);
    detectGeoMarket();
}
