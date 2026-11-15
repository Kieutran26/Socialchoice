import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { Check, Copy, Download, ShieldCheck, Sparkles, Monitor, Cloud, ArrowUpRight, Mail } from 'lucide-react';

function downloadDesktopLicenseFile(licenseOrder) {
    const payload = {
        format: 'socialchoice-desktop-license-v2',
        orderCode: licenseOrder.orderCode,
        planId: licenseOrder.planId,
        planName: licenseOrder.planName,
        email: licenseOrder.email,
        machines: licenseOrder.machines,
        keys: licenseOrder.keys,
        issuedAt: licenseOrder.issuedAt,
        updatesIncludedMonths: 12,
        offlineVerified: true,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${licenseOrder.orderCode || 'SC2'}-desktop.scweblicense`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

const DEFAULT_FREE_SUBSCRIPTION = {
    type: 'cloud',
    planId: 'free',
    planName: 'Cloud Free (Mặc định)',
    status: 'active',
    mcpSync: true,
    quotas: {
        brands: '1 thương hiệu',
        channels: '3 tài khoản MXH',
        members: '1 người dùng (Cá nhân)',
        storage: '0.5 GB (500 MB)',
        shortLinks: '10 link miễn phí',
        aiStudio: 'Cơ bản (3 lượt thử/tháng)',
        bulkImport: 'Chưa mở khóa',
    }
};

export default function CustomerLicense() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [subscription, setSubscription] = useState(DEFAULT_FREE_SUBSCRIPTION);
    const [desktopLicenses, setDesktopLicenses] = useState([]);
    const [copiedKey, setCopiedKey] = useState('');

    useEffect(() => {
        try {
            const rawSub = localStorage.getItem('socialchoice.subscription');
            if (rawSub) {
                const parsed = JSON.parse(rawSub);
                if (parsed && parsed.planName) {
                    setSubscription(parsed);
                }
            }
        } catch (_e) {
            // ignore
        }

        try {
            const rawDesktop = localStorage.getItem('socialchoice.desktop_licenses');
            if (rawDesktop) {
                const parsed = JSON.parse(rawDesktop);
                if (Array.isArray(parsed)) {
                    setDesktopLicenses(parsed);
                }
            }
        } catch (_e) {
            // ignore
        }
    }, []);

    const copyText = (text) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setCopiedKey(text);
            setTimeout(() => setCopiedKey(''), 2000);
        }
    };

    const q = subscription?.quotas || DEFAULT_FREE_SUBSCRIPTION.quotas;

    return (
        <div className="space-y-4">
            {/* 1. Cloud / Custom Plan Auto-Activation Status */}
            <section className="panel p-5 space-y-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <Cloud className="w-3.5 h-3.5" />
                            <span>Cơ chế Hybrid · Gói Web Cloud kích hoạt tự động</span>
                        </div>
                        <h2 className="mt-2 text-base font-extrabold flex items-center gap-2">
                            <span>{subscription.planName}</span>
                            {subscription.orderCode && (
                                <span className="rounded bg-amber-400/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-700 dark:text-amber-300">
                                    #{subscription.orderCode}
                                </span>
                            )}
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {subscription.email
                                ? `Tài khoản nhận hóa đơn & kích hoạt: ${subscription.email}`
                                : user?.email
                                    ? `Tài khoản đang đăng nhập: ${user.email}`
                                    : 'Tài khoản Web Cloud hiện tại của bạn — nâng cấp tự động mở khóa hạn mức ngay lập tức mà không cần nhập mã key.'}
                        </p>
                    </div>

                    <a
                        href="/pricing"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFD43B] px-3.5 py-2 text-xs font-extrabold text-[#111319] hover:opacity-90 transition"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Nâng cấp / Tự thiết kế gói</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                </div>

                {/* Quota Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                        <div className="text-[11px] text-muted-foreground">Thương hiệu (Brands)</div>
                        <div className="mt-0.5 font-bold">{q.brands}</div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                        <div className="text-[11px] text-muted-foreground">Tài khoản MXH kết nối</div>
                        <div className="mt-0.5 font-bold">{q.channels}</div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                        <div className="text-[11px] text-muted-foreground">Thành viên duyệt bài (Teams)</div>
                        <div className="mt-0.5 font-bold">{q.members}</div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                        <div className="text-[11px] text-muted-foreground">Bộ nhớ đệm Media chờ đăng</div>
                        <div className="mt-0.5 font-bold">{q.storage}</div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                        <div className="text-[11px] text-muted-foreground">Link rút gọn & Tracking</div>
                        <div className="mt-0.5 font-bold">{q.shortLinks}</div>
                    </div>
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Đồng bộ cổng AI MCP</div>
                        <div className="mt-0.5 font-bold text-emerald-700 dark:text-emerald-300">
                            Đồng bộ 100% hạn mức gói
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3.5 py-2.5 text-xs text-muted-foreground">
                    <span>
                        <strong className="text-foreground">AI Content Studio:</strong> {q.aiStudio} ·{' '}
                        <strong className="text-foreground">Excel & Evergreen:</strong> {q.bulkImport}
                    </span>
                    {subscription.priceLabel && (
                        <span className="font-mono font-bold text-foreground">
                            Đã thanh toán: {subscription.priceLabel} {subscription.cycleLabel}
                        </span>
                    )}
                </div>
            </section>

            {/* 2. Windows Desktop (SC2) License Keys Section */}
            <section className="panel p-5 space-y-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                            <Monitor className="w-3.5 h-3.5" />
                            <span>Bản cài đặt Windows Desktop (SC2) · Cấp mã Key + Gửi Email dự phòng</span>
                        </div>
                        <h2 className="mt-2 text-base font-extrabold">
                            Mã bản quyền Windows Desktop (`SC2`) & File `.scweblicense`
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Khi mua gói Desktop (`Solo`, `Pro`, `Agency Pack`), mã key được hiển thị tại đây để sao chép hoặc tải file kích hoạt offline, đồng thời tự động gửi bản sao dự phòng qua Email.
                        </p>
                    </div>

                    <a
                        href="/pricing"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted transition"
                    >
                        <span>Mua thêm mã bản quyền Desktop</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                </div>

                {desktopLicenses.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <p className="font-semibold text-foreground">Chưa có mã bản quyền Windows Desktop (SC2) nào được lưu trên trình duyệt này.</p>
                            <p className="mt-0.5">
                                Nếu bạn dùng bản cài đặt Windows .exe (Lưu Database & Video 4K trực tiếp trên ổ cứng PC), hãy chọn tab <strong>Bản Desktop</strong> tại trang Bảng giá.
                            </p>
                        </div>
                        <a
                            href="/pricing"
                            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-foreground px-3 py-2 text-xs font-bold text-background hover:opacity-90"
                        >
                            <span>Xem gói Desktop (SC2)</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {desktopLicenses.map((lic, idx) => (
                            <div key={lic.orderCode || idx} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <span className="font-extrabold text-sm">{lic.planName}</span>
                                        <span className="ml-2 rounded bg-amber-400/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-700 dark:text-amber-300">
                                            #{lic.orderCode}
                                        </span>
                                        <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1.5">
                                            <Mail className="w-3 h-3" />
                                            <span>Đã gửi bản sao qua email: <strong>{lic.email}</strong> ({lic.machines} máy PC)</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => downloadDesktopLicenseFile(lic)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFD43B] px-3 py-1.5 text-xs font-extrabold text-[#111319] hover:opacity-90 transition cursor-pointer"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Tải file .scweblicense</span>
                                    </button>
                                </div>

                                <div className="space-y-1.5">
                                    {(lic.keys || []).map((k, kIdx) => (
                                        <div
                                            key={k}
                                            className="flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-background px-3 py-2 font-mono text-xs"
                                        >
                                            <span className="truncate">
                                                <strong className="text-muted-foreground mr-2">Máy #{kIdx + 1}:</strong>
                                                <span className="font-bold">{k}</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => copyText(k)}
                                                className="shrink-0 inline-flex items-center gap-1 rounded bg-muted px-2.5 py-1 text-[11px] font-bold hover:bg-muted/80 cursor-pointer"
                                            >
                                                {copiedKey === k ? (
                                                    <>
                                                        <Check className="w-3 h-3 text-emerald-500" />
                                                        <span className="text-emerald-600">Đã chép</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3 h-3" />
                                                        <span>Sao chép mã</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* 3. Existing Web-Customer Signed License Card (if logged in via .scweblicense) */}
            {user?.mode === 'web-customer' && user?.license && (
                <section className="panel p-5 space-y-2 text-sm">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                        <ShieldCheck className="w-4 h-4" />
                        <span>{t('License and account')}</span>
                    </div>
                    <p className="break-words">{t('Email')}: {user.email}</p>
                    <p>{t('Edition')}: {user.license.edition}</p>
                    <p className="break-all">{t('License ID')}: {user.license.license_id}</p>
                    <p>{t('One-time account license · Multiple devices')}</p>
                    <p className="text-muted-foreground">{t('Your social accounts and content belong to this workspace. Other customers cannot access them.')}</p>
                </section>
            )}
        </div>
    );
}
