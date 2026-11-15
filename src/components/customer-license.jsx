import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Check,
    Copy,
    Download,
    ShieldCheck,
    Sparkle,
    Desktop,
    Cloud,
    ArrowUpRight,
    EnvelopeSimple,
    UsersThree,
} from '@phosphor-icons/react';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import {
    CLOUD_PLAN_TIERS,
    getActiveSubscription,
    getTeamMembers,
    upgradeCloudSubscription,
} from '@/lib/team-seats';

function downloadDesktopLicenseFile(licenseOrder) {
    const payload = {
        format: 'socialchoice-desktop-license-v2',
        orderCode: licenseOrder.orderCode,
        planId: licenseOrder.planId || licenseOrder.planKey,
        planName: licenseOrder.planName,
        email: licenseOrder.email,
        machines: licenseOrder.machines,
        keys: licenseOrder.keys,
        issuedAt: licenseOrder.issuedAt || licenseOrder.activatedAt,
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

export default function CustomerLicense() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const { toast } = useToast();
    const [subscription, setSubscription] = useState(getActiveSubscription);
    const [members, setMembers] = useState(getTeamMembers);
    const [desktopLicenses, setDesktopLicenses] = useState([]);
    const [copiedKey, setCopiedKey] = useState('');

    useEffect(() => {
        const loadAll = () => {
            setSubscription(getActiveSubscription());
            setMembers(getTeamMembers());
            try {
                const rawDesktop = localStorage.getItem('socialchoice.desktop_licenses');
                if (rawDesktop) {
                    const parsed = JSON.parse(rawDesktop);
                    if (Array.isArray(parsed)) {
                        setDesktopLicenses(parsed);
                    }
                }
            } catch {
                // ignore
            }
        };

        loadAll();
        window.addEventListener('storage', loadAll);
        window.addEventListener('socialchoice:subscription', loadAll);
        window.addEventListener('socialchoice:team', loadAll);
        return () => {
            window.removeEventListener('storage', loadAll);
            window.removeEventListener('socialchoice:subscription', loadAll);
            window.removeEventListener('socialchoice:team', loadAll);
        };
    }, []);

    const copyText = (text) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setCopiedKey(text);
            setTimeout(() => setCopiedKey(''), 2000);
        }
    };

    const q = subscription?.quotas || {};
    const maxSeats = Number(q.seats || 1);
    const usedSeats = 1 + members.length;
    const storageDisplay =
        Number(q.storageMb || 500) >= 1000
            ? `${(Number(q.storageMb) / 1000).toFixed(1).replace(/\.0$/, '')} GB`
            : `${Number(q.storageMb || 500)} MB`;
    const currentRank = CLOUD_PLAN_TIERS[subscription?.planKey]?.rank ?? 0;

    const handleInstantUpgrade = (targetKey) => {
        const nextSub = upgradeCloudSubscription(targetKey, {
            email: subscription?.email || user?.email || '',
            customerName: subscription?.customerName || user?.full_name || '',
            accountHint: user?.email || user?.id,
        });
        setSubscription(nextSub);
        toast({
            title: `Đã nâng cấp lên ${nextSub.planName}`,
            description: `Đã mở khóa ${nextSub.quotas.brands} Brands · ${nextSub.quotas.accounts} MXH · ${nextSub.quotas.seats} Ghế Teams · ${nextSub.quotas.links} Link rút gọn (giữ nguyên dữ liệu & bảo toàn khi đăng nhập lại).`,
        });
    };

    return (
        <div className="space-y-4">
            {/* 1. Cloud / Custom Plan Auto-Activation Status */}
            <section className="panel p-5 space-y-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-successBg px-2.5 py-0.5 text-xs font-semibold text-successFg">
                            <Cloud size={14} weight="duotone" />
                            <span>Cơ chế Hybrid · Gói Web Cloud kích hoạt tự động</span>
                        </div>
                        <h2 className="mt-2 text-base font-semibold flex items-center gap-2 text-foreground">
                            <span>{subscription.planName}</span>
                            {subscription.orderCode && (
                                <span className="rounded bg-warnBg px-2 py-0.5 font-mono text-xs font-semibold text-warnFg">
                                    #{subscription.orderCode}
                                </span>
                            )}
                        </h2>
                        <p className="mt-0.5 label-xs text-muted-foreground">
                            {subscription.email
                                ? `Tài khoản nhận hóa đơn & kích hoạt: ${subscription.email}`
                                : user?.email
                                    ? `Tài khoản đang đăng nhập: ${user.email}`
                                    : 'Tài khoản Web Cloud hiện tại của bạn — nâng cấp tự động mở khóa hạn mức ngay lập tức mà không cần nhập mã key.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            to="/settings?tab=team"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
                        >
                            <UsersThree size={14} weight="duotone" />
                            <span>Quản lý Team ({usedSeats}/{maxSeats} ghế)</span>
                        </Link>
                        <Link to="/pricing" className="btn-skew">
                            <Sparkle size={15} weight="duotone" />
                            <span>Nâng cấp / Tự thiết kế gói</span>
                            <ArrowUpRight size={14} />
                        </Link>
                    </div>
                </div>

                {/* Quota Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                        <div className="label-xs text-muted-foreground">Thương hiệu (Brands)</div>
                        <div className="mt-0.5 font-semibold text-foreground">{q.brands || 1} thương hiệu</div>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                        <div className="label-xs text-muted-foreground">Tài khoản MXH kết nối</div>
                        <div className="mt-0.5 font-semibold text-foreground">{q.accounts || 3} tài khoản</div>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                        <div className="label-xs text-muted-foreground">Ghế thành viên (Teams Seats)</div>
                        <div className="mt-0.5 font-semibold text-foreground">
                            {usedSeats} / {maxSeats} ghế đang dùng
                        </div>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                        <div className="label-xs text-muted-foreground">Bộ nhớ đệm Media chờ đăng</div>
                        <div className="mt-0.5 font-semibold text-foreground">{storageDisplay}</div>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                        <div className="label-xs text-muted-foreground">Link rút gọn & Tracking</div>
                        <div className="mt-0.5 font-semibold text-foreground">{q.links || 10} link</div>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-successBg p-3">
                        <div className="label-xs text-successFg font-semibold">Đồng bộ cổng AI MCP</div>
                        <div className="mt-0.5 font-semibold text-successFg">
                            Đồng bộ 100% hạn mức gói
                        </div>
                    </div>
                </div>

                {/* Quick In-App Upgrade Bar (Starter -> Professional / Business) */}
                {currentRank < 3 && (
                    <div className="rounded-xl border border-brand-dark/50 bg-brand/10 p-3.5 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs">
                            <div className="font-semibold text-foreground">
                                Nâng cấp gói ngay (giữ nguyên toàn bộ bài viết, tài khoản & đồng bộ khi đăng nhập lại)
                            </div>
                            <div className="label-xs text-muted-foreground mt-0.5">
                                {currentRank < 2
                                    ? 'Lên Cloud Professional để mở khóa ngay 5 Brands, 20 MXH, 3 Ghế Teams, 250 Link & Excel/Evergreen.'
                                    : 'Lên Cloud Business để mở khóa 25 Brands, 60 MXH, 10 Ghế Teams & 1.000 Link.'}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {currentRank < 1 && (
                                <button
                                    type="button"
                                    onClick={() => handleInstantUpgrade('starter')}
                                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                                >
                                    Lên Starter
                                </button>
                            )}
                            {currentRank < 2 && (
                                <button
                                    type="button"
                                    onClick={() => handleInstantUpgrade('professional')}
                                    className="btn-skew"
                                >
                                    <Sparkle size={14} weight="duotone" />
                                    <span>Nâng cấp lên Professional</span>
                                </button>
                            )}
                            {currentRank >= 2 && currentRank < 3 && (
                                <button
                                    type="button"
                                    onClick={() => handleInstantUpgrade('business')}
                                    className="btn-skew"
                                >
                                    <Sparkle size={14} weight="duotone" />
                                    <span>Nâng cấp lên Business</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </section>

            {/* 2. Windows Desktop (SC2) License Keys Section */}
            <section className="panel p-5 space-y-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-warnBg px-2.5 py-0.5 text-xs font-semibold text-warnFg">
                            <Desktop size={14} weight="duotone" />
                            <span>Bản cài đặt Windows Desktop (SC2) · Cấp mã Key + Gửi Email dự phòng</span>
                        </div>
                        <h2 className="mt-2 text-base font-semibold text-foreground">
                            Mã bản quyền Windows Desktop (SC2) & File .scweblicense
                        </h2>
                        <p className="mt-0.5 label-xs text-muted-foreground">
                            Khi mua gói Desktop (Solo, Pro, Agency Pack), mã key được hiển thị tại đây để sao chép hoặc tải file kích hoạt offline, đồng thời tự động gửi bản sao dự phòng qua Email.
                        </p>
                    </div>

                    <Link
                        to="/pricing"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition"
                    >
                        <span>Mua thêm mã bản quyền Desktop</span>
                        <ArrowUpRight size={14} />
                    </Link>
                </div>

                {desktopLicenses.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <p className="font-semibold text-foreground">Chưa có mã bản quyền Windows Desktop (SC2) nào được lưu trên trình duyệt này.</p>
                            <p className="mt-0.5">
                                Nếu bạn dùng bản cài đặt Windows .exe (Lưu Database & Video 4K trực tiếp trên ổ cứng PC), hãy chọn tab <strong>Bản Desktop</strong> tại trang Bảng giá.
                            </p>
                        </div>
                        <Link
                            to="/pricing"
                            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background hover:opacity-90"
                        >
                            <span>Xem gói Desktop (SC2)</span>
                            <ArrowUpRight size={14} />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {desktopLicenses.map((lic, idx) => (
                            <div key={lic.orderCode || idx} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <span className="font-semibold text-sm">{lic.planName}</span>
                                        <span className="ml-2 rounded bg-warnBg px-2 py-0.5 font-mono text-xs font-semibold text-warnFg">
                                            #{lic.orderCode}
                                        </span>
                                        <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1.5">
                                            <EnvelopeSimple size={13} />
                                            <span>Đã gửi bản sao qua email: <strong>{lic.email}</strong> ({lic.machines} máy PC)</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => downloadDesktopLicenseFile(lic)}
                                        className="btn-skew"
                                    >
                                        <Download size={15} weight="duotone" />
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
                                                <span className="font-semibold">{k}</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => copyText(k)}
                                                className="shrink-0 inline-flex items-center gap-1 rounded bg-muted px-2.5 py-1 text-[11px] font-semibold hover:bg-muted/80 cursor-pointer"
                                            >
                                                {copiedKey === k ? (
                                                    <>
                                                        <Check size={12} className="text-successFg" />
                                                        <span className="text-successFg">Đã chép</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={12} />
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
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-successFg">
                        <ShieldCheck size={16} weight="duotone" />
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
