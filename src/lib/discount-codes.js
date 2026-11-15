/**
 * Centralized Discount & Coupon Management for SocialChoice.
 * Supports default system codes + custom admin-created codes with usage limits & counters.
 */

export const DEFAULT_DISCOUNT_CODES = [
    { code: 'TEST100', percent: 100, note: 'Mã thử nghiệm kích hoạt miễn phí 100%', isSystem: true, maxUses: null },
    { code: 'FREE100', percent: 100, note: 'Miễn phí 100% tài khoản', isSystem: true, maxUses: 50 },
    { code: 'VIP50', percent: 50, note: 'Ưu đãi khách VIP giảm 50%', isSystem: true, maxUses: 100 },
    { code: 'CREATOR30', percent: 30, note: 'Dành riêng cho Content Creator giảm 30%', isSystem: true, maxUses: 200 },
    { code: 'WELCOME20', percent: 20, note: 'Chào mừng thành viên mới giảm 20%', isSystem: true, maxUses: null },
    { code: 'SC10', percent: 10, note: 'Ưu đãi trải nghiệm giảm 10%', isSystem: true, maxUses: null },
];

export function getDiscountUsageMap() {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem('socialchoice.discount_usage');
        return JSON.parse(raw || '{}') || {};
    } catch {
        return {};
    }
}

export function saveDiscountUsageMap(map) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem('socialchoice.discount_usage', JSON.stringify(map));
        window.dispatchEvent(new CustomEvent('socialchoice:discounts'));
    } catch {}
}

export function getCustomDiscounts() {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem('socialchoice.custom_discounts');
        const list = JSON.parse(raw || '[]');
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

export function saveCustomDiscounts(list) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem('socialchoice.custom_discounts', JSON.stringify(list));
        window.dispatchEvent(new CustomEvent('socialchoice:discounts'));
    } catch {}
}

export function getAllDiscounts() {
    const custom = getCustomDiscounts();
    const usage = getDiscountUsageMap();
    const customCodes = new Set(custom.map((c) => String(c.code).toUpperCase()));

    const enrichedCustom = custom.map((c) => {
        const codeUpper = c.code.toUpperCase();
        const used = typeof c.usedCount === 'number'
            ? Math.max(c.usedCount, Number(usage[codeUpper] || 0))
            : Number(usage[codeUpper] || 0);
        return {
            ...c,
            maxUses: c.maxUses !== undefined && c.maxUses !== null && c.maxUses !== '' ? Number(c.maxUses) : null,
            usedCount: used,
        };
    });

    const enrichedDefaults = DEFAULT_DISCOUNT_CODES
        .filter((d) => !customCodes.has(d.code.toUpperCase()))
        .map((d) => {
            const codeUpper = d.code.toUpperCase();
            return {
                ...d,
                maxUses: d.maxUses !== undefined && d.maxUses !== null ? Number(d.maxUses) : null,
                usedCount: Number(usage[codeUpper] || 0),
            };
        });

    return [...enrichedCustom, ...enrichedDefaults];
}

export function applyDiscountCode(rawCode, baseAmount) {
    const cleanCode = String(rawCode || '').trim().toUpperCase();
    if (!cleanCode) {
        return { valid: false, code: '', percent: 0, discountAmount: 0, finalAmount: baseAmount, message: '' };
    }

    const all = getAllDiscounts();
    const found = all.find((d) => d.code.toUpperCase() === cleanCode);
    if (!found) {
        return {
            valid: false,
            code: cleanCode,
            percent: 0,
            discountAmount: 0,
            finalAmount: baseAmount,
            message: 'Mã giảm giá không tồn tại hoặc đã hết hạn',
        };
    }

    const usedCount = Number(found.usedCount || 0);
    const maxUses = found.maxUses !== null && found.maxUses !== undefined ? Number(found.maxUses) : null;
    if (maxUses !== null && maxUses > 0 && usedCount >= maxUses) {
        return {
            valid: false,
            code: found.code,
            percent: 0,
            discountAmount: 0,
            finalAmount: baseAmount,
            message: `Mã ${found.code} đã hết lượt sử dụng (${usedCount}/${maxUses} lượt)`,
            isExhausted: true,
        };
    }

    const numBase = Math.max(0, Number(baseAmount || 0));
    const percent = Math.min(100, Math.max(1, Number(found.percent || 0)));
    const discountAmount = Math.round((numBase * percent) / 100);
    const finalAmount = Math.max(0, numBase - discountAmount);

    return {
        valid: true,
        code: found.code,
        percent,
        discountAmount,
        finalAmount,
        note: found.note || '',
        maxUses,
        usedCount,
        remainingUses: maxUses !== null ? Math.max(0, maxUses - usedCount) : null,
        message: `Đã áp dụng mã ${found.code} (−${percent}%)`,
    };
}

export function recordDiscountUse(rawCode) {
    const cleanCode = String(rawCode || '').trim().toUpperCase();
    if (!cleanCode) return { success: false };

    const usage = getDiscountUsageMap();
    const nextCount = Number(usage[cleanCode] || 0) + 1;
    usage[cleanCode] = nextCount;
    saveDiscountUsageMap(usage);

    const custom = getCustomDiscounts();
    let hasCustom = false;
    const updatedCustom = custom.map((item) => {
        if (item.code.toUpperCase() === cleanCode) {
            hasCustom = true;
            return {
                ...item,
                usedCount: (item.usedCount || 0) + 1,
            };
        }
        return item;
    });
    if (hasCustom) {
        saveCustomDiscounts(updatedCustom);
    }

    return { success: true, code: cleanCode, count: nextCount };
}

export function resetDiscountUses(rawCode) {
    const cleanCode = String(rawCode || '').trim().toUpperCase();
    const usage = getDiscountUsageMap();
    delete usage[cleanCode];
    saveDiscountUsageMap(usage);

    const custom = getCustomDiscounts();
    const updatedCustom = custom.map((item) => {
        if (item.code.toUpperCase() === cleanCode) {
            return { ...item, usedCount: 0 };
        }
        return item;
    });
    saveCustomDiscounts(updatedCustom);
    return { success: true };
}

export function updateDiscountLimit({ code, maxUses }) {
    const cleanCode = String(code || '').trim().toUpperCase();
    const numMax = maxUses === '' || maxUses === null || maxUses === undefined ? null : Math.max(0, Number(maxUses));

    const custom = getCustomDiscounts();
    const updatedCustom = custom.map((item) => {
        if (item.code.toUpperCase() === cleanCode) {
            return { ...item, maxUses: numMax };
        }
        return item;
    });
    saveCustomDiscounts(updatedCustom);
    return { success: true };
}

export function addCustomDiscount({ code, percent, note, maxUses }) {
    const cleanCode = String(code || '').trim().toUpperCase();
    if (!cleanCode) return { success: false, reason: 'Mã không được để trống' };
    const numPercent = Math.min(100, Math.max(1, Math.round(Number(percent || 0))));
    if (!numPercent) return { success: false, reason: 'Phần trăm giảm phải từ 1 đến 100%' };

    const parsedMax = maxUses === '' || maxUses === null || maxUses === undefined
        ? null
        : Math.max(1, Math.round(Number(maxUses)));

    const current = getCustomDiscounts();
    const filtered = current.filter((c) => c.code.toUpperCase() !== cleanCode);
    const item = {
        code: cleanCode,
        percent: numPercent,
        note: String(note || '').trim(),
        maxUses: parsedMax,
        usedCount: 0,
        isSystem: false,
        createdAt: new Date().toISOString(),
    };
    saveCustomDiscounts([item, ...filtered]);
    return { success: true, item };
}

export function removeCustomDiscount(code) {
    const cleanCode = String(code || '').trim().toUpperCase();
    const current = getCustomDiscounts();
    saveCustomDiscounts(current.filter((c) => c.code.toUpperCase() !== cleanCode));
    return { success: true };
}

if (typeof window !== 'undefined') {
    window.__DISCOUNT_CODES__ = {
        getAll: getAllDiscounts,
        apply: applyDiscountCode,
        add: addCustomDiscount,
        remove: removeCustomDiscount,
        recordUse: recordDiscountUse,
        resetUses: resetDiscountUses,
        updateLimit: updateDiscountLimit,
    };
}
