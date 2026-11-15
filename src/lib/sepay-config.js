/**
 * Centralized SePay VietQR Configuration.
 * Default: ACB personal account currently connected in SePay.
 * To switch to a Household Business (Hộ Kinh Doanh) or another bank later,
 * simply set VITE_SEPAY_BANK_CODE, VITE_SEPAY_ACCOUNT_NUMBER, and
 * VITE_SEPAY_ACCOUNT_NAME in .env.local / Vercel Environment Variables
 * (no code changes required).
 */

export const DEFAULT_SEPAY_CONFIG = {
    bankCode: 'ACB',
    accountNumber: '9602381',
    accountName: 'NGUYEN NGOC KIEU TRAN',
    vaPrefix: '',
};

export function getSepayConfig() {
    const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
    return {
        bankCode: (env.VITE_SEPAY_BANK_CODE || DEFAULT_SEPAY_CONFIG.bankCode).trim(),
        accountNumber: (env.VITE_SEPAY_ACCOUNT_NUMBER || DEFAULT_SEPAY_CONFIG.accountNumber).trim(),
        accountName: (env.VITE_SEPAY_ACCOUNT_NAME || DEFAULT_SEPAY_CONFIG.accountName).trim(),
        vaPrefix: (env.VITE_SEPAY_VA_PREFIX || DEFAULT_SEPAY_CONFIG.vaPrefix).trim(),
        verifyUrl: (env.VITE_SEPAY_VERIFY_URL || '/api/sepay/verify').trim(),
    };
}

export async function checkSepayPaymentStatus({ orderCode, amount }) {
    const cfg = getSepayConfig();
    if (!cfg.verifyUrl) {
        return { configured: false, paid: false, reason: 'missing_verify_endpoint' };
    }
    try {
        const url = new URL(cfg.verifyUrl, typeof window !== 'undefined' ? window.location.origin : 'https://socialchoice.site');
        url.searchParams.set('orderCode', String(orderCode || ''));
        url.searchParams.set('amount', String(Math.round(Number(amount || 0))));
        const res = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            return { configured: false, paid: false, reason: 'no_api_server' };
        }
        if (!res.ok) {
            return { configured: true, paid: false, reason: `http_${res.status}` };
        }
        const data = await res.json();
        return {
            configured: true,
            paid: Boolean(data && (data.paid === true || data.status === 'paid' || data.status === 'completed')),
            transactionId: data?.transactionId || data?.id || null,
            reason: data?.reason || (data?.paid ? 'verified' : 'not_found_yet'),
        };
    } catch {
        return { configured: false, paid: false, reason: 'network_error' };
    }
}

export function buildSepayQrUrl({ amount, orderCode }) {
    const cfg = getSepayConfig();
    const acc = cfg.vaPrefix ? `${cfg.vaPrefix}${cfg.accountNumber}` : cfg.accountNumber;
    const cleanAmount = Math.max(0, Math.round(Number(amount || 0)));
    const params = new URLSearchParams({
        acc,
        bank: cfg.bankCode,
        amount: String(cleanAmount),
        des: String(orderCode || ''),
        template: 'compact',
    });
    return `https://qr.sepay.vn/img?${params.toString()}`;
}

if (typeof window !== 'undefined') {
    window.__SEPAY_CONFIG__ = {
        ...getSepayConfig(),
        checkPaymentStatus: checkSepayPaymentStatus,
    };
}
