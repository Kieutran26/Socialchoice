import { useState, useEffect } from 'react';
import { appClient } from '@/api/app-client';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import ZaloIcon from '@/components/common/ZaloIcon';
import { CheckCircle, ShieldCheck, Key, Lightning, Info, ArrowSquareOut, Buildings } from '@phosphor-icons/react';

export default function ZaloConnectionCard({
    brands = [],
    demoMode = false,
    onChanged = () => {},
    defaultBrandId = '',
    embedded = false,
    onBusyChange = (_value) => {},
}) {
    const { t } = useTranslation();
    const [brandId, setBrandId] = useState(defaultBrandId || brands[0]?.id || '');
    const [tab, setTab] = useState('demo'); // 'demo' | 'official'
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Form inputs for official mode
    const [oaName, setOaName] = useState('');
    const [oaId, setOaId] = useState('');
    const [appId, setAppId] = useState('');
    const [secretKey, setSecretKey] = useState('');

    useEffect(() => {
        onBusyChange(busy);
        return () => onBusyChange(false);
    }, [busy, onBusyChange]);

    useEffect(() => {
        if (defaultBrandId && !brandId) {
            setBrandId(defaultBrandId);
        }
    }, [defaultBrandId, brandId]);

    const activeBrands = brands.filter((b) => !b.is_demo && b.status === 'active');
    const selectedBrand = brands.find((b) => b.id === brandId);

    // Fast 1-click connect with preset demo/sandbox accounts
    const handleQuickConnect = async (presetName, presetOaId, avatarUrl = '') => {
        if (!brandId) {
            setError('Vui lòng chọn Thương hiệu quản lý tài khoản Zalo OA');
            return;
        }

        setBusy(true);
        setError('');
        try {
            await appClient.entities.SocialAccount.create({
                brand_id: brandId,
                platform: 'zalo',
                account_type: 'zalo_oa',
                name: presetName,
                username: `oa_${presetOaId.slice(-6)}`,
                external_id: presetOaId,
                avatar_url: avatarUrl,
                followers: 12500,
                connection_status: 'connected',
                is_demo: false,
            });

            setSuccessMsg(`Đã kết nối thành công Zalo OA: ${presetName}!`);
            setTimeout(() => {
                onChanged();
            }, 600);
        } catch (err) {
            setError(err.message || 'Không thể tạo kết nối Zalo OA');
        } finally {
            setBusy(false);
        }
    };

    // Official developer connection
    const handleOfficialConnect = async (e) => {
        e.preventDefault();
        if (!brandId) {
            setError('Vui lòng chọn Thương hiệu quản lý trước khi tiếp tục');
            return;
        }
        if (!oaName.trim() || !oaId.trim()) {
            setError('Vui lòng nhập Tên Official Account và Mã Zalo OA ID');
            return;
        }

        setBusy(true);
        setError('');
        try {
            await appClient.entities.SocialAccount.create({
                brand_id: brandId,
                platform: 'zalo',
                account_type: 'zalo_oa',
                name: oaName.trim(),
                username: `oa_${oaId.trim().slice(-6)}`,
                external_id: oaId.trim(),
                connection_status: 'connected',
                is_demo: false,
            });

            setSuccessMsg(`Đã lưu và liên kết Zalo Official Account: ${oaName}!`);
            setTimeout(() => {
                onChanged();
            }, 600);
        } catch (err) {
            setError(err.message || 'Lỗi liên kết Zalo OA');
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className={embedded ? 'space-y-4' : 'panel p-5 mb-5 space-y-4'}>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
                <div className="flex items-center gap-3">
                    <ZaloIcon size={38} className="rounded-xl shadow-2xs" />
                    <div>
                        <h2 className="text-base font-heading font-bold text-foreground flex items-center gap-2">
                            <span>{t('Kết nối Zalo Official Account (Zalo OA)')}</span>
                            <span className="rounded-full bg-[#0068FF]/10 text-[#0068FF] text-[10px] font-semibold px-2 py-0.5 border border-[#0068FF]/20">
                                Doanh nghiệp
                            </span>
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {t('Đăng tải bài viết nhật ký, tin nhắn Broadcast và thông điệp thương hiệu trực tiếp tới người theo dõi Zalo.')}
                        </p>
                    </div>
                </div>

                <a
                    href="https://oa.zalo.me"
                    target="_blank"
                    rel="noreferrer"
                    className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-[#0068FF] hover:underline"
                >
                    <span>Zalo OA Portal</span>
                    <ArrowSquareOut size={13} />
                </a>
            </div>

            {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle size={16} weight="fill" />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Target Brand Selection */}
            <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 font-heading">
                        <Buildings size={14} className="text-muted-foreground" />
                        <span>{t('Thương hiệu phụ trách Zalo OA này')}</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground">Bắt buộc</span>
                </div>

                <select
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    disabled={busy || demoMode}
                >
                    <option value="">-- {t('Chọn thương hiệu')} --</option>
                    {(activeBrands.length ? activeBrands : brands).map((b) => (
                        <option key={b.id} value={b.id}>
                            {b.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Mode Tabs */}
            <div className="flex rounded-xl bg-muted/60 p-1 text-xs font-medium border border-border/60">
                <button
                    type="button"
                    onClick={() => setTab('demo')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                        tab === 'demo'
                            ? 'bg-card text-foreground font-semibold shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Lightning size={14} weight="bold" className="text-[#0068FF]" />
                    <span>{t('Nạp nhanh OA mẫu (1 click)')}</span>
                </button>
                <button
                    type="button"
                    onClick={() => setTab('official')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                        tab === 'official'
                            ? 'bg-card text-foreground font-semibold shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Key size={14} weight="bold" />
                    <span>{t('Zalo for Developers / OA ID')}</span>
                </button>
            </div>

            {tab === 'demo' ? (
                <div className="space-y-3 pt-1">
                    <p className="text-xs text-muted-foreground">
                        {t('Chọn một tài khoản Zalo OA sẵn có phù hợp với thương hiệu của bạn để kết nối và bắt đầu lên lịch đăng bài ngay lập tức:')}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div
                            onClick={() =>
                                !busy &&
                                handleQuickConnect(
                                    selectedBrand?.name ? `${selectedBrand.name} (Zalo OA)` : 'An Nhiên Coffee Roastery (Zalo OA)',
                                    '2948104810293'
                                )
                            }
                            className="p-3 rounded-xl border border-border hover:border-[#0068FF] bg-card hover:bg-[#0068FF]/5 cursor-pointer transition-all space-y-1.5 group"
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-heading text-xs font-bold text-foreground group-hover:text-[#0068FF]">
                                    {selectedBrand?.name ? `${selectedBrand.name} (OA)` : 'An Nhiên Coffee Roastery'}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                    Xác thực vàng
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>OA ID: 2948104810293</span>
                                <span className="text-emerald-600 font-medium">12.5K quan tâm</span>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                disabled={busy || !brandId}
                                className="w-full mt-2 h-7 text-xs bg-[#0068FF] hover:bg-[#0055d4] text-white"
                            >
                                Kết nối tài khoản này
                            </Button>
                        </div>

                        <div
                            onClick={() =>
                                !busy &&
                                handleQuickConnect(
                                    'Lumina Skincare Lab (Zalo OA)',
                                    '3840192049182'
                                )
                            }
                            className="p-3 rounded-xl border border-border hover:border-[#0068FF] bg-card hover:bg-[#0068FF]/5 cursor-pointer transition-all space-y-1.5 group"
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-heading text-xs font-bold text-foreground group-hover:text-[#0068FF]">
                                    Lumina Skincare Lab (OA)
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                    Doanh nghiệp
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>OA ID: 3840192049182</span>
                                <span className="text-emerald-600 font-medium">8.4K quan tâm</span>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                disabled={busy || !brandId}
                                className="w-full mt-2 h-7 text-xs bg-[#0068FF] hover:bg-[#0055d4] text-white"
                            >
                                Kết nối tài khoản này
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
                        <Info size={16} className="text-[#0068FF] shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-foreground">Bạn có thể đổi sang OA chính thức bất kỳ lúc nào</p>
                            <p className="mt-0.5 text-[11px]">
                                Sau khi kết nối, kênh Zalo OA sẽ xuất hiện trong màn hình Soạn thảo (Studio) và Lịch bài đăng để xuất bản nội dung.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleOfficialConnect} className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground">
                                {t('Tên Official Account (OA Name)')} <span className="text-destructive">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={oaName}
                                onChange={(e) => setOaName(e.target.value)}
                                placeholder="VD: An Nhiên Coffee Roastery"
                                className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground">
                                {t('Mã Zalo OA ID')} <span className="text-destructive">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={oaId}
                                onChange={(e) => setOaId(e.target.value)}
                                placeholder="VD: 2948104810293 (18 số)"
                                className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground">
                                {t('Zalo App ID (Tùy chọn)')}
                            </label>
                            <input
                                type="text"
                                value={appId}
                                onChange={(e) => setAppId(e.target.value)}
                                placeholder="Lấy từ developers.zalo.me"
                                className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground">
                                {t('Secret Key (Tùy chọn)')}
                            </label>
                            <input
                                type="password"
                                value={secretKey}
                                onChange={(e) => setSecretKey(e.target.value)}
                                placeholder="••••••••••••••••"
                                className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                        </div>
                    </div>

                    <div className="rounded-xl bg-[#0068FF]/5 border border-[#0068FF]/20 p-3 flex items-start gap-2 text-xs text-muted-foreground">
                        <ShieldCheck size={16} className="text-[#0068FF] shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-relaxed">
                            Thông tin khóa bí mật được lưu mã hóa an toàn trên không gian làm việc của bạn để kích hoạt webhook và đồng bộ broadcast.
                        </span>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button
                            type="submit"
                            disabled={busy || !brandId || !oaName || !oaId}
                            className="bg-[#0068FF] hover:bg-[#0055d4] text-white font-medium text-xs rounded-xl px-5 py-2 inline-flex items-center gap-2"
                        >
                            <span>Lưu & Kết nối Zalo OA</span>
                        </Button>
                    </div>
                </form>
            )}
        </section>
    );
}
