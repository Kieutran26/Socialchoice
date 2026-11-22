import { useEffect, useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    Buildings,
    Butterfly,
    CheckCircle,
    DiscordLogo,
    FacebookLogo,
    InstagramLogo,
    LinkedinLogo,
    PinterestLogo,
    RedditLogo,
    ShieldCheck,
    SlackLogo,
    Storefront,
    TelegramLogo,
    ThreadsLogo,
    TiktokLogo,
    XLogo,
    YoutubeLogo,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { isDesktop } from '@/api/desktop/runtime';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import ZaloIcon from '@/components/common/ZaloIcon';
import MetaConnectionCard from './MetaConnectionCard';
import LinkedinConnectionCard from './LinkedinConnectionCard';
import TiktokConnectionCard from './TiktokConnectionCard';
import XConnectionCard from './XConnectionCard';
import ZaloConnectionCard from './ZaloConnectionCard';
import TiktokShopConnectionCard from './TiktokShopConnectionCard';
import DesktopConnectionCard from './desktop-connection-card';

const channels = [
    // Primary active services (9 items -> clean 3x3 grid, zero orphan cells)
    { id: 'facebook', label: 'Facebook Page', icon: FacebookLogo, color: '#1877f2', bg: 'bg-[#1877f2]/10', border: 'border-[#1877f2]/20', service: 'meta', formats: ['Chữ', 'Ảnh', 'Video'], primary: true },
    { id: 'instagram', label: 'Instagram Business', icon: InstagramLogo, color: '#d62976', bg: 'bg-[#d62976]/10', border: 'border-[#d62976]/20', service: 'meta', formats: ['Ảnh', 'Reels'], primary: true },
    { id: 'threads', label: 'Threads', icon: ThreadsLogo, color: '#18181b', bg: 'bg-zinc-100', border: 'border-zinc-200', service: 'threads', formats: ['Chữ', 'Ảnh'], primary: true },
    { id: 'tiktok', label: 'TikTok', icon: TiktokLogo, color: '#18181b', bg: 'bg-zinc-100', border: 'border-zinc-200', service: 'tiktok', formats: ['Video'], primary: true },
    { id: 'tiktok-shop', label: 'TikTok Shop Seller', icon: Storefront, color: '#FE2C55', bg: 'bg-[#FE2C55]/10', border: 'border-[#FE2C55]/20', service: 'tiktok-shop', formats: ['Giỏ hàng', 'Sản phẩm'], primary: true },
    { id: 'linkedin', label: 'LinkedIn Profile', icon: LinkedinLogo, color: '#0a66c2', bg: 'bg-[#0a66c2]/10', border: 'border-[#0a66c2]/20', service: 'linkedin', formats: ['Chữ', 'Ảnh'], primary: true },
    { id: 'linkedin-page', label: 'LinkedIn Page', icon: Buildings, color: '#0a66c2', bg: 'bg-[#0a66c2]/10', border: 'border-[#0a66c2]/20', service: 'linkedin', formats: ['Chữ', 'Ảnh'], primary: true },
    { id: 'x', label: 'X (Twitter)', icon: XLogo, color: '#18181b', bg: 'bg-zinc-100', border: 'border-zinc-200', service: 'x', formats: ['Chữ', 'Ảnh'], primary: true },
    { id: 'zalo', label: 'Zalo Official Account', icon: ZaloIcon, color: '#0068FF', bg: 'bg-[#0068FF]/10', border: 'border-[#0068FF]/20', service: 'zalo', formats: ['Bài OA', 'Broadcast'], primary: true },

    // Secondary / Coming soon
    { id: 'reddit', label: 'Reddit', icon: RedditLogo, color: '#ff4500', formats: ['Text', 'Link'] },
    { id: 'youtube', label: 'YouTube', icon: YoutubeLogo, color: '#ff0033', formats: ['Video'] },
    { id: 'google-business', label: 'Google Business', icon: Storefront, color: '#4285f4', formats: ['Updates'] },
    { id: 'pinterest', label: 'Pinterest', icon: PinterestLogo, color: '#e60023', formats: ['Pins'] },
    { id: 'discord', label: 'Discord', icon: DiscordLogo, color: '#5865f2', formats: ['Messages'] },
    { id: 'slack', label: 'Slack', icon: SlackLogo, color: '#4a154b', formats: ['Messages'] },
    { id: 'bluesky', label: 'Bluesky', icon: Butterfly, color: '#0285ff', formats: ['Posts'] },
    { id: 'telegram', label: 'Telegram', icon: TelegramLogo, color: '#229ed9', formats: ['Channel'] },
];

export function connectionReturnPlatform() {
    const query = new URLSearchParams(window.location.search);
    return (
        ['linkedin', 'tiktok', 'threads', 'x'].find((key) => query.has(key)) ||
        (query.get('meta') === 'select' ? 'facebook' : '')
    );
}

export function hasConnectionReturn() {
    return ['meta', 'threads', 'linkedin', 'tiktok', 'x'].some((key) =>
        new URLSearchParams(window.location.search).has(key)
    );
}

export default function AddChannelDialog({
    open,
    onOpenChange,
    brands = [],
    defaultBrandId,
    demoMode,
    onChanged,
    onAddManually,
    initialPlatform = '',
}) {
    const { t } = useTranslation();
    const [selected, setSelected] = useState(connectionReturnPlatform);
    const [chosenPlatform, setChosenPlatform] = useState('facebook');
    const [targetBrandId, setTargetBrandId] = useState(defaultBrandId || brands[0]?.id || '');
    const [_health, setHealth] = useState(null);
    const [busy, setBusy] = useState(false);
    const [reload, _setReload] = useState(0);

    useEffect(() => {
        if (defaultBrandId) setTargetBrandId(defaultBrandId);
        else if (brands.length > 0 && !targetBrandId) setTargetBrandId(brands[0].id);
    }, [defaultBrandId, brands, targetBrandId]);

    useEffect(() => {
        if (open && initialPlatform) {
            setSelected(initialPlatform);
            setChosenPlatform(initialPlatform);
        }
    }, [open, initialPlatform]);

    useEffect(() => {
        if (!open) return;
        let active = true;
        const services = ['meta', 'threads', 'linkedin', 'tiktok', 'x'];
        setHealth(Object.fromEntries(services.map((key) => [key, { loading: true }])));
        services.forEach((key) => {
            if (appClient[key]) {
                appClient[key]
                    .status()
                    .then((value) => {
                        if (active) setHealth((current) => ({ ...current, [key]: value }));
                    })
                    .catch(() => {
                        if (active) setHealth((current) => ({ ...current, [key]: { error: true } }));
                    });
            }
        });
        return () => {
            active = false;
        };
    }, [open, reload]);

    function clearReturn() {
        const url = new URL(window.location.href);
        ['meta', 'threads', 'linkedin', 'tiktok', 'x'].forEach((key) => url.searchParams.delete(key));
        window.history.replaceState(window.history.state, '', url);
    }

    function changeOpen(value) {
        if (busy) return;
        if (!value) {
            setSelected('');
            clearReturn();
        }
        onOpenChange(value);
    }

    const metaOutcome = new URLSearchParams(window.location.search).get('meta');
    const xOutcome = new URLSearchParams(window.location.search).get('x');
    const currentChannel = channels.find((item) => item.id === (selected || chosenPlatform));
    const activeBrand = brands.find((b) => b.id === targetBrandId) || brands[0] || null;

    const props = {
        brands,
        defaultBrandId: targetBrandId || defaultBrandId,
        demoMode,
        embedded: true,
        onBusyChange: setBusy,
        onChanged: () => {
            onChanged();
            clearReturn();
            setBusy(false);
            setSelected('');
            onOpenChange(false);
        },
    };

    const handleContinueToOAuth = () => {
        if (!chosenPlatform) return;
        setSelected(chosenPlatform);
    };

    const currentStep = selected ? 3 : targetBrandId ? 2 : 1;

    return (
        <Dialog open={open} onOpenChange={changeOpen}>
            <DialogContent
                className="!w-[calc(100vw_-_2rem)] !max-w-[780px] p-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white flex flex-col max-h-[90vh]"
                aria-describedby="add-channel-description"
            >
                {/* Clean Header with 3-Step Indicator (Step 1: Brand -> Step 2: Platform -> Step 3: OAuth) */}
                <div className="px-6 py-4 border-b border-zinc-200/80 bg-zinc-50/70 shrink-0">
                    <DialogHeader className="space-y-1">
                        {selected ? (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                    setSelected('');
                                    clearReturn();
                                }}
                                className="mb-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-500 hover:text-zinc-900 self-start transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <ArrowLeft size={13} />
                                <span>{t('Quay lại chọn thương hiệu & nền tảng')}</span>
                            </button>
                        ) : null}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pr-7">
                            <DialogTitle className="font-heading text-[18px] font-medium text-zinc-900">
                                {selected
                                    ? t('Kết nối {platform}', { platform: currentChannel?.label || '' })
                                    : t('Thêm kênh mạng xã hội')}
                            </DialogTitle>

                            {/* Stepper: 1 Thương hiệu -> 2 Nền tảng -> 3 OAuth */}
                            <div className="flex items-center gap-2 text-[11.5px] font-medium">
                                {[
                                    { num: 1, label: t('Thương hiệu') },
                                    { num: 2, label: t('Nền tảng') },
                                    { num: 3, label: 'OAuth' },
                                ].map((step, idx) => {
                                    const active = currentStep >= step.num;
                                    return (
                                        <div key={step.num} className="flex items-center gap-2">
                                            {idx > 0 ? <span className="text-zinc-300">→</span> : null}
                                            <span
                                                className={`inline-flex items-center gap-1.5 ${
                                                    active ? 'text-zinc-900 font-semibold' : 'text-zinc-400'
                                                }`}
                                            >
                                                <span
                                                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                                                        active
                                                            ? 'bg-[#ffd631] text-[#2b2100] border border-[#d8b216]'
                                                            : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                                                    }`}
                                                >
                                                    {step.num}
                                                </span>
                                                <span>{step.label}</span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <DialogDescription
                            id="add-channel-description"
                            className="text-[12.5px] text-zinc-500"
                        >
                            {selected
                                ? t(
                                      'Đăng nhập trên nền tảng chính thức và cấp quyền đăng bài. Socialchoice không lưu mật khẩu của bạn.'
                                  )
                                : t(
                                      'Chọn thương hiệu đích trước, sau đó chọn nền tảng mạng xã hội bạn muốn xác thực OAuth 2.0.'
                                  )}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Body */}
                {!selected ? (
                    <>
                        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1 min-h-0 scrollbar-clean">
                            {/* Status alerts */}
                            {['failed', 'cancelled'].includes(metaOutcome) ? (
                                <p
                                    role="status"
                                    className="rounded-xl bg-amber-50 p-3 text-[12.5px] text-amber-900 border border-amber-200/80"
                                >
                                    {t(
                                        metaOutcome === 'cancelled'
                                            ? 'Connection cancelled. Choose a platform to try again.'
                                            : 'Connection failed. Choose the platform you want to reconnect.'
                                    )}
                                </p>
                            ) : null}
                            {['failed', 'cancelled'].includes(xOutcome) ? (
                                <p
                                    role="status"
                                    className="rounded-xl bg-amber-50 p-3 text-[12.5px] text-amber-900 border border-amber-200/80"
                                >
                                    {t(
                                        xOutcome === 'cancelled'
                                            ? 'Kết nối X đã bị hủy. Hãy thử lại.'
                                            : 'Kết nối X thất bại. Vui lòng kiểm tra quyền hạn và thử lại.'
                                    )}
                                </p>
                            ) : null}
                            {demoMode ? (
                                <p className="rounded-xl bg-amber-50 p-3 text-[12.5px] text-amber-900 border border-amber-200/80">
                                    {t('Switch to your real workspace to connect a channel.')}
                                </p>
                            ) : null}

                            {/* STEP 1: CHỌN THƯƠNG HIỆU */}
                            <section className="space-y-2.5">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ffd631] border border-[#d8b216] text-[11px] font-semibold text-[#2b2100]">
                                            1
                                        </span>
                                        <h3 className="font-heading text-[13.5px] font-medium text-zinc-900">
                                            {t('Chọn thương hiệu phụ trách')}
                                        </h3>
                                    </div>
                                    <span className="text-[11.5px] text-zinc-400">
                                        {t('Có thể đổi lại bất kỳ lúc nào')}
                                    </span>
                                </div>

                                {brands.length <= 4 ? (
                                    <div className={`grid grid-cols-1 ${brands.length > 1 ? 'sm:grid-cols-2' : ''} gap-2`}>
                                        {brands.map((brand) => {
                                            const isChosen = targetBrandId === brand.id;
                                            return (
                                                <button
                                                    key={brand.id}
                                                    type="button"
                                                    onClick={() => setTargetBrandId(brand.id)}
                                                    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                                                        isChosen
                                                            ? 'border-[#d8b216] bg-[#ffd631]/15'
                                                            : 'border-zinc-200/90 bg-white hover:border-zinc-300 hover:bg-zinc-50/70'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <span
                                                            className="h-3 w-3 rounded-full shrink-0 ring-2 ring-white"
                                                            style={{ backgroundColor: brand.color || '#ffd631' }}
                                                        />
                                                        <span className="text-[13px] font-medium text-zinc-900 truncate">
                                                            {brand.name}
                                                        </span>
                                                    </div>
                                                    {isChosen ? (
                                                        <CheckCircle
                                                            size={16}
                                                            weight="fill"
                                                            className="text-[#2b2100] shrink-0"
                                                        />
                                                    ) : null}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <Select value={targetBrandId} onValueChange={setTargetBrandId}>
                                        <SelectTrigger className="h-10 w-full rounded-xl bg-white border-zinc-200 text-[13px] font-medium">
                                            <SelectValue placeholder={t('Chọn thương hiệu...')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {brands.map((brand) => (
                                                <SelectItem key={brand.id} value={brand.id}>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="h-2.5 w-2.5 rounded-full shrink-0"
                                                            style={{ backgroundColor: brand.color || '#ffd631' }}
                                                        />
                                                        <span className="font-medium">{brand.name}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                <p className="text-[12px] text-zinc-500">
                                    {t(
                                        'Kênh sau khi xác thực sẽ tự động gắn vào thương hiệu đã chọn, sẵn sàng lên lịch ngay.'
                                    )}
                                </p>
                            </section>

                            {/* STEP 2: CHỌN NỀN TẢNG MẠNG XÃ HỘI (3x3 balanced grid) */}
                            <section className="space-y-2.5 pt-1">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ffd631] border border-[#d8b216] text-[11px] font-semibold text-[#2b2100]">
                                            2
                                        </span>
                                        <h3 className="font-heading text-[13.5px] font-medium text-zinc-900">
                                            {t('Chọn nền tảng mạng xã hội')}
                                        </h3>
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-[11.5px] text-zinc-400">
                                        <ShieldCheck size={13} className="text-emerald-600" />
                                        <span>OAuth 2.0 chính thức</span>
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                    {channels
                                        .filter((c) => c.primary)
                                        .map(({ id, label, icon: Icon, color, bg, border, formats }) => {
                                            const isChosen = chosenPlatform === id;
                                            return (
                                                <button
                                                    key={id}
                                                    type="button"
                                                    onClick={() => setChosenPlatform(id)}
                                                    className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                                                        isChosen
                                                            ? 'border-[#d8b216] bg-[#ffd631]/15 ring-1 ring-[#ffd631]'
                                                            : 'border-zinc-200/90 bg-white hover:border-zinc-300 hover:bg-zinc-50/70'
                                                    }`}
                                                >
                                                    <div
                                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${bg} ${border}`}
                                                    >
                                                        <Icon
                                                            size={19}
                                                            weight={
                                                                ['instagram', 'threads', 'x'].includes(id)
                                                                    ? 'regular'
                                                                    : 'fill'
                                                            }
                                                            style={{ color }}
                                                        />
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <span className="text-[13px] font-medium text-zinc-900 truncate">
                                                                {label}
                                                            </span>
                                                            {isChosen ? (
                                                                <CheckCircle
                                                                    size={15}
                                                                    weight="fill"
                                                                    className="text-[#2b2100] shrink-0"
                                                                />
                                                            ) : null}
                                                        </div>
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {formats.slice(0, 2).map((fmt) => (
                                                                <span
                                                                    key={fmt}
                                                                    className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-500"
                                                                >
                                                                    {t(fmt)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                </div>
                            </section>

                            {/* Roadmap chips (compact) */}
                            <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center gap-1.5">
                                <span className="text-[11.5px] text-zinc-400 mr-1">
                                    {t('Sắp hỗ trợ:')}
                                </span>
                                {channels
                                    .filter((c) => !c.primary)
                                    .map((c) => {
                                        const Icon = c.icon;
                                        return (
                                            <span
                                                key={c.id}
                                                className="inline-flex items-center gap-1 rounded-md border border-zinc-200/70 bg-zinc-50/70 px-2 py-0.5 text-[11px] text-zinc-500"
                                            >
                                                {Icon ? (
                                                    <Icon
                                                        size={12}
                                                        weight={
                                                            ['reddit', 'youtube', 'pinterest', 'discord'].includes(
                                                                c.id
                                                            )
                                                                ? 'fill'
                                                                : 'regular'
                                                        }
                                                        style={{ color: c.color }}
                                                        className="shrink-0"
                                                    />
                                                ) : null}
                                                <span>{c.label}</span>
                                            </span>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Sticky Footer */}
                        <div className="px-6 py-4 border-t border-zinc-200/80 bg-zinc-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    clearReturn();
                                    onAddManually();
                                }}
                                className="text-[12px] text-zinc-500 hover:text-zinc-900 underline underline-offset-4 cursor-pointer transition-colors"
                            >
                                {t('Thêm kênh tham chiếu thủ công')}
                            </button>

                            <button
                                type="button"
                                onClick={handleContinueToOAuth}
                                disabled={!chosenPlatform || (brands.length > 0 && !targetBrandId)}
                                className="btn-skew"
                            >
                                <span>
                                    {t('Tiếp tục kết nối {platform}', {
                                        platform: currentChannel?.label || '',
                                    })}
                                    {activeBrand ? ` · ${activeBrand.name}` : ''}
                                </span>
                                <ArrowRight size={14} weight="bold" />
                            </button>
                        </div>
                    </>
                ) : (
                    /* Step 3: Embed OAuth Connect Card */
                    <div className="p-6 overflow-y-auto flex-1 min-h-0 scrollbar-clean">
                        {isDesktop() ? (
                            <DesktopConnectionCard {...props} platform={selected} />
                        ) : selected === 'linkedin' ? (
                            <LinkedinConnectionCard {...props} mode="profile" />
                        ) : selected === 'linkedin-page' ? (
                            <LinkedinConnectionCard {...props} mode="page" />
                        ) : selected === 'tiktok' ? (
                            <TiktokConnectionCard {...props} />
                        ) : selected === 'tiktok-shop' ? (
                            <TiktokShopConnectionCard {...props} />
                        ) : selected === 'x' ? (
                            <XConnectionCard {...props} />
                        ) : selected === 'zalo' ? (
                            <ZaloConnectionCard {...props} />
                        ) : (
                            <MetaConnectionCard
                                {...props}
                                initialPlatform={selected}
                                onPlatformResolved={setSelected}
                                lockPlatform
                            />
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
