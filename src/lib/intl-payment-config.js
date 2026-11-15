/**
 * Centralized International Payment (Merchant of Record) Configuration.
 * Recommended provider: Polar.sh (4% + $0.40, Visa/Mastercard/Apple Pay/Google Pay,
 * automatic global VAT/Sales Tax handling, supports VN payout).
 * Also compatible with Lemon Squeezy.
 *
 * Set VITE_INTL_CHECKOUT_* URLs in .env.local or Vercel Environment Variables
 * to route USD checkouts to live hosted Polar.sh / Lemon Squeezy links.
 */

export function getIntlPaymentConfig() {
    const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
    const provider = (env.VITE_INTL_PROVIDER || 'polar').trim().toLowerCase();

    const productUrls = {
        'starter:monthly': env.VITE_INTL_CHECKOUT_STARTER_MONTHLY || 'https://buy.polar.sh/polar_cl_hQ2dRIMaNCARFzhUSIQrX3TY3KVBZeJ78VEV43TeWbD',
        'starter:yearly': env.VITE_INTL_CHECKOUT_STARTER_YEARLY || 'https://buy.polar.sh/polar_cl_sJeGJ8fAVD3xP8ho3RhBJH114tJNQwBcdRikX3ZgUzL',
        'professional:monthly': env.VITE_INTL_CHECKOUT_PRO_MONTHLY || 'https://buy.polar.sh/polar_cl_ccdyNIWkhUWHRD3vgFMcmgbFcuSbctSIrc4gV0ICnj9',
        'professional:yearly': env.VITE_INTL_CHECKOUT_PRO_YEARLY || 'https://buy.polar.sh/polar_cl_QsybQ7KbLRkBosZkCJlkHajgpmOyOGM0SX7Cm3gGBTX',
        'business:monthly': env.VITE_INTL_CHECKOUT_BUSINESS_MONTHLY || 'https://buy.polar.sh/polar_cl_UAhyf46O4CIQHraHLxf1hvb5Lp3GZk2ryMtTi4bU2qM',
        'business:yearly': env.VITE_INTL_CHECKOUT_BUSINESS_YEARLY || 'https://buy.polar.sh/polar_cl_N3JejRPqAogFaIqpDl1RXQdPrWkyC06GvN7LV0F0YWk',
        'custom:monthly': env.VITE_INTL_CHECKOUT_CUSTOM_MONTHLY || '',
        'custom:yearly': env.VITE_INTL_CHECKOUT_CUSTOM_YEARLY || '',
        'desktop-solo:lifetime': env.VITE_INTL_CHECKOUT_DESKTOP_SOLO || 'https://buy.polar.sh/polar_cl_so9bBzHIwVhp1Wf3ONwR2ZpaSvu83axxwMd913905mo',
        'desktop-pro:lifetime': env.VITE_INTL_CHECKOUT_DESKTOP_PRO || 'https://buy.polar.sh/polar_cl_EM3IzUgxfJk6ZFfQFb3xurpJGsDOM59aQRDv40zabVN',
        'desktop-agency:lifetime': env.VITE_INTL_CHECKOUT_DESKTOP_AGENCY || 'https://buy.polar.sh/polar_cl_6W4hRrl9jc58JacahMtfUN39VelI5fyUsHRh71XEb3L',
    };

    const hasAnyLiveUrl = Object.values(productUrls).some((v) => Boolean(v && v.trim()));

    return {
        provider,
        providerLabel: provider === 'lemonsqueezy' ? 'Lemon Squeezy' : 'Polar.sh',
        hasAnyLiveUrl,
        productUrls,
    };
}

export function buildIntlCheckoutUrl({ planKey, billingCycle, email, customerName, orderCode }) {
    const cfg = getIntlPaymentConfig();
    const cycleKey = billingCycle || 'monthly';
    const rawUrl =
        cfg.productUrls[`${planKey}:${cycleKey}`] ||
        cfg.productUrls[`${planKey}:lifetime`] ||
        '';
    if (!rawUrl) return '';

    try {
        const url = new URL(rawUrl);
        if (cfg.provider === 'lemonsqueezy') {
            if (email) url.searchParams.set('checkout[email]', email);
            if (customerName) url.searchParams.set('checkout[name]', customerName);
            if (orderCode) url.searchParams.set('checkout[custom][order_code]', orderCode);
        } else {
            if (email) url.searchParams.set('customer_email', email);
            if (customerName) url.searchParams.set('customer_name', customerName);
            if (orderCode) url.searchParams.set('reference_id', orderCode);
        }
        return url.toString();
    } catch {
        return rawUrl;
    }
}

if (typeof window !== 'undefined') {
    window.__INTL_PAYMENT_CONFIG__ = {
        ...getIntlPaymentConfig(),
        buildCheckoutUrl: buildIntlCheckoutUrl,
    };
}
