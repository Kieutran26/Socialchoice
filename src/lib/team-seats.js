export const SUBSCRIPTION_STORAGE_KEY = 'socialchoice.subscription';
export const SUBSCRIPTIONS_BY_ACCOUNT_KEY = 'socialchoice.subscriptions_by_account';
export const TEAM_MEMBERS_STORAGE_KEY = 'socialchoice.team_members';
export const TEAM_SETTINGS_STORAGE_KEY = 'socialchoice.team_settings';

export const CLOUD_PLAN_TIERS = {
    free: {
        planKey: 'free',
        planName: 'Cloud Free (Mặc định)',
        rank: 0,
        quotas: { brands: 1, accounts: 3, seats: 1, storageMb: 500, links: 10 },
        features: { aiStudio: false, bulkExcel: false, evergreen: false, approvalWorkflow: false, mcpSync: true },
    },
    starter: {
        planKey: 'starter',
        planName: 'Cloud Starter',
        rank: 1,
        quotas: { brands: 1, accounts: 5, seats: 1, storageMb: 50, links: 25 },
        features: { aiStudio: true, bulkExcel: false, evergreen: false, approvalWorkflow: false, mcpSync: true },
    },
    professional: {
        planKey: 'professional',
        planName: 'Cloud Professional',
        rank: 2,
        quotas: { brands: 5, accounts: 20, seats: 3, storageMb: 150, links: 250 },
        features: { aiStudio: true, bulkExcel: true, evergreen: true, approvalWorkflow: true, mcpSync: true },
    },
    business: {
        planKey: 'business',
        planName: 'Cloud Business',
        rank: 3,
        quotas: { brands: 25, accounts: 60, seats: 10, storageMb: 200, links: 1000 },
        features: { aiStudio: true, bulkExcel: true, evergreen: true, approvalWorkflow: true, mcpSync: true },
    },
};

export const TEAM_ROLES = [
    {
        id: 'admin',
        label: 'Quản trị viên (Admin)',
        labelEn: 'Admin',
        description: 'Toàn quyền quản lý thương hiệu, kết nối MXH, duyệt bài và mời thành viên.',
        descriptionEn: 'Full access to brands, social accounts, approvals, and team seats.',
        permissions: ['create', 'edit', 'approve', 'publish', 'manage_accounts', 'manage_team'],
    },
    {
        id: 'approver',
        label: 'Người duyệt bài (Approver)',
        labelEn: 'Approver',
        description: 'Xem lịch, chỉnh sửa nội dung và Phê duyệt / Từ chối bài trước khi đăng.',
        descriptionEn: 'Review calendar, edit drafts, and approve or reject scheduled posts.',
        permissions: ['create', 'edit', 'approve', 'publish'],
    },
    {
        id: 'editor',
        label: 'Biên tập viên (Editor)',
        labelEn: 'Editor',
        description: 'Soạn thảo nội dung, tải media, lên lịch nháp và gửi yêu cầu duyệt bài.',
        descriptionEn: 'Create drafts, upload media, and submit posts for approval.',
        permissions: ['create', 'edit'],
    },
    {
        id: 'viewer',
        label: 'Người xem (Viewer)',
        labelEn: 'Viewer',
        description: 'Chỉ xem lịch nội dung và báo cáo Analytics (không thể chỉnh sửa).',
        descriptionEn: 'Read-only access to calendar and analytics.',
        permissions: ['view'],
    },
];

export function getRoleMeta(roleId) {
    return TEAM_ROLES.find((r) => r.id === roleId) || TEAM_ROLES[2];
}

export function getActiveSubscription() {
    const fallback = {
        kind: 'cloud',
        planKey: 'free',
        planName: 'Cloud Free (Mặc định)',
        quotas: {
            brands: 1,
            accounts: 3,
            seats: 1,
            storageMb: 500,
            links: 10,
        },
        mcpSynced: true,
    };

    try {
        const raw = window.localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return fallback;

        const q = parsed.quotas || {};
        const planKey = parsed.planKey || 'free';
        const defaultSeatsByPlan = {
            free: 1,
            starter: 1,
            professional: 3,
            business: 10,
        };

        const tier = CLOUD_PLAN_TIERS[planKey] || CLOUD_PLAN_TIERS.free;

        return {
            ...fallback,
            ...parsed,
            quotas: {
                brands: Number(q.brands) || tier.quotas.brands,
                accounts: Number(q.accounts) || tier.quotas.accounts,
                seats: Number(q.seats) || Number(q.members) || tier.quotas.seats,
                storageMb: Number(q.storageMb) || tier.quotas.storageMb,
                links: Number(q.links) || tier.quotas.links,
            },
            features: {
                ...tier.features,
                ...(parsed.features || {}),
            },
        };
    } catch {
        return fallback;
    }
}

export function getTeamMembers() {
    try {
        const raw = window.localStorage.getItem(TEAM_MEMBERS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveTeamMembers(members) {
    try {
        window.localStorage.setItem(TEAM_MEMBERS_STORAGE_KEY, JSON.stringify(members));
        window.dispatchEvent(new Event('socialchoice:team'));
    } catch {
        // ignore storage errors
    }
}

export function getTeamSettings() {
    const defaults = {
        requireApprovalForEditors: true,
        notifyApproversOnSubmit: true,
    };
    try {
        const raw = window.localStorage.getItem(TEAM_SETTINGS_STORAGE_KEY);
        if (!raw) return defaults;
        const parsed = JSON.parse(raw);
        return { ...defaults, ...(parsed || {}) };
    } catch {
        return defaults;
    }
}

export function saveTeamSettings(settings) {
    try {
        window.localStorage.setItem(TEAM_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        window.dispatchEvent(new Event('socialchoice:team'));
    } catch {
        // ignore storage errors
    }
}

export function createInviteToken() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let token = 'INV-';
    for (let i = 0; i < 8; i += 1) {
        token += chars[Math.floor(Math.random() * chars.length)];
    }
    return token;
}

export function buildInviteUrl(token, email) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://socialchoice.site';
    const params = new URLSearchParams({ invite: token });
    if (email) params.set('email', email);
    return `${origin}/login?${params.toString()}`;
}

function normalizeAccountKey(userOrEmail) {
    if (!userOrEmail) return '';
    if (typeof userOrEmail === 'string') return userOrEmail.trim().toLowerCase();
    return String(userOrEmail.email || userOrEmail.id || '').trim().toLowerCase();
}

function readAccountSubscriptionsMap() {
    try {
        const raw = window.localStorage.getItem(SUBSCRIPTIONS_BY_ACCOUNT_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

export function persistSubscription(record, accountHint) {
    try {
        window.localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(record));
        const map = readAccountSubscriptionsMap();
        const keys = new Set(
            [
                normalizeAccountKey(record?.email),
                normalizeAccountKey(accountHint),
                'default',
            ].filter(Boolean)
        );
        keys.forEach((k) => {
            map[k] = record;
        });
        window.localStorage.setItem(SUBSCRIPTIONS_BY_ACCOUNT_KEY, JSON.stringify(map));
        window.dispatchEvent(new Event('socialchoice:subscription'));
        window.dispatchEvent(new Event('storage'));
    } catch {
        // ignore storage errors
    }
    return record;
}

/**
 * Safely upgrade an existing Cloud plan (e.g. Starter -> Professional) without
 * losing user data or regressing quotas, and persist across re-logins.
 */
export function upgradeCloudSubscription(targetPlanKey, options = {}) {
    const current = getActiveSubscription();
    const targetTier = CLOUD_PLAN_TIERS[targetPlanKey] || CLOUD_PLAN_TIERS.professional;
    const currentQ = current?.quotas || {};
    const targetQ = targetTier.quotas;

    const mergedQuotas = {
        brands: Math.max(Number(currentQ.brands || 1), targetQ.brands),
        accounts: Math.max(Number(currentQ.accounts || 3), targetQ.accounts),
        seats: Math.max(Number(currentQ.seats || 1), targetQ.seats),
        storageMb: Math.max(Number(currentQ.storageMb || 50), targetQ.storageMb),
        links: Math.max(Number(currentQ.links || 10), targetQ.links),
    };

    const mergedFeatures = {
        ...(current?.features || {}),
        ...targetTier.features,
        mcpSync: true,
    };

    const nowIso = new Date().toISOString();
    const orderCode =
        options.orderCode ||
        `UPG${Math.floor(100000 + Math.random() * 900000)}`;

    const upgradedRecord = {
        ...current,
        kind: 'cloud',
        orderCode,
        planKey: targetTier.planKey,
        planName: options.planName || targetTier.planName,
        previousPlanKey: current?.planKey || 'free',
        previousPlanName: current?.planName || 'Cloud Free (Mặc định)',
        billingCycle: options.billingCycle || current?.billingCycle || 'monthly',
        amount: options.amount ?? current?.amount ?? 0,
        email: options.email || current?.email || '',
        customerName: options.customerName || current?.customerName || '',
        quotas: mergedQuotas,
        features: mergedFeatures,
        mcpSynced: true,
        revision: Number(current?.revision || 0) + 1,
        upgradedAt: nowIso,
        activatedAt: current?.activatedAt || nowIso,
    };

    return persistSubscription(upgradedRecord, options.accountHint || upgradedRecord.email);
}

/**
 * Reconcile active subscription whenever auth state resolves or user logs back in.
 * Ensures an upgraded plan (e.g. Starter -> Professional) is never overwritten by
 * an older cached/default plan upon re-login.
 */
export function reconcileSubscriptionWithUser(user) {
    if (typeof window === 'undefined') return getActiveSubscription();
    const active = getActiveSubscription();
    const map = readAccountSubscriptionsMap();
    const userKey = normalizeAccountKey(user);
    const savedForUser = (userKey && map[userKey]) || map.default || null;

    if (!savedForUser) {
        if (active && active.planKey !== 'free') {
            persistSubscription(active, user);
        }
        return active;
    }

    const rankOf = (sub) => {
        const key = sub?.planKey || 'free';
        const tierRank = CLOUD_PLAN_TIERS[key]?.rank ?? (key === 'custom' ? 2 : 0);
        const rev = Number(sub?.revision || 0);
        const ts = Date.parse(sub?.upgradedAt || sub?.activatedAt || 0) || 0;
        return { tierRank, rev, ts };
    };

    const a = rankOf(active);
    const b = rankOf(savedForUser);

    const savedIsNewerOrHigher =
        b.tierRank > a.tierRank ||
        (b.tierRank === a.tierRank && (b.rev > a.rev || b.ts > a.ts));

    if (savedIsNewerOrHigher) {
        try {
            window.localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(savedForUser));
            window.dispatchEvent(new Event('socialchoice:subscription'));
        } catch {
            // ignore
        }
        return getActiveSubscription();
    }

    if (a.tierRank > b.tierRank || a.rev > b.rev || a.ts > b.ts) {
        persistSubscription(active, user);
    }

    return active;
}
