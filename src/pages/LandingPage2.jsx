import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    SquaresFour,
    ChartLineUp,
    Sparkle,
    PencilSimple,
    CalendarBlank,
    Images,
    LinkSimple,
    Users,
    Check,
    ArrowRight,
    Sliders,
    Desktop,
    Cloud,
} from '@phosphor-icons/react';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const NAV = [
    { href: '#tinh-nang', label: 'Tính năng' },
    { href: '#quy-trinh', label: 'Quy trình' },
    { href: '#bang-gia', label: 'Bảng giá' },
];

const STATS = [
    { label: 'Bài đã lên lịch', value: '128' },
    { label: 'Kênh kết nối', value: '12' },
    { label: 'Lượt tiếp cận', value: '48.2K' },
    { label: 'Thời gian tiết kiệm', value: '14 giờ' },
];

const FEATURES = [
    { icon: Sparkle, title: 'AI Agent viết nội dung', text: 'Soạn caption theo từng nền tảng, giữ đúng giọng thương hiệu.' },
    { icon: PencilSimple, title: 'Soạn một lần, đăng nhiều nơi', text: 'Tùy chỉnh caption, media và giờ đăng cho từng kênh.' },
    { icon: CalendarBlank, title: 'Lịch nội dung trực quan', text: 'Xem theo tháng, tuần hoặc danh sách và kéo thả để dời lịch.' },
    { icon: ChartLineUp, title: 'Phân tích hiệu quả', text: 'Theo dõi lượt tiếp cận, tương tác và bài nổi bật theo kênh.' },
    { icon: Images, title: 'Thư viện media', text: 'Lưu ảnh, video và mẫu bài để tái sử dụng nhanh.' },
    { icon: LinkSimple, title: 'Shortlink & UTM', text: 'Rút gọn liên kết và gắn UTM để đo chuyển đổi chính xác.' },
];

const STEPS = [
    { n: '1', title: 'Kết nối tài khoản', text: 'Thêm Facebook, TikTok, LinkedIn, X trong vài phút.' },
    { n: '2', title: 'Soạn và lên lịch', text: 'Viết bài hoặc nhờ AI Agent, chọn giờ đăng.' },
    { n: '3', title: 'Theo dõi kết quả', text: 'Xem số liệu và tối ưu chiến lược nội dung.' },
];

const WEB_PLANS = [
    {
        key: 'free',
        name: 'Free (Trải nghiệm 100% tính năng)',
        price: { vn: 0, intl: 0, whop: 0 },
        yearly: { vn: 0, intl: 0, whop: 0 },
        items: [
            '1 Brand · 2 Tài khoản MXH thật',
            'Teams: 1 Owner + 1 Thành viên Nháp',
            '5 bài đăng & hẹn giờ / tháng',
            '10 MB đệm Media (tự giải phóng sau đăng)',
            'Nhập Excel 5 dòng · 1 bài Evergreen · 3 Shortlinks',
            'Interactive Images (5 vùng) · 3 lượt AI (BYOK)',
        ],
    },
    {
        key: 'starter',
        name: 'Starter (Cá nhân)',
        price: { vn: 99000, intl: 9, whop: 15 },
        yearly: { vn: 790000, intl: 79, whop: 119 },
        items: [
            '1 Brand · 5 Tài khoản MXH thật',
            'Teams: 1 Thành viên + 3 Guest View Links',
            '100 bài đăng & hẹn giờ 24/7 / tháng',
            '50 MB đệm Media (giải phóng 24h sau đăng)',
            'Nhập Excel 30 dòng · 3 bài Evergreen · 25 Shortlinks',
            'ChatAgent AI không giới hạn (BYOK)',
        ],
    },
    {
        key: 'professional',
        name: 'Professional (Chủ lực)',
        featured: true,
        price: { vn: 199000, intl: 19, whop: 29 },
        yearly: { vn: 1590000, intl: 149, whop: 199 },
        lifetimeWhop: 149,
        items: [
            '5 Brands · 20 Tài khoản MXH thật',
            'Teams: 3 Thành viên + Phân quyền & Ghi chú',
            'Không giới hạn bài đăng, Pillars & Angles',
            '150 MB đệm Media · Nhập Excel 200 dòng (Full)',
            '25 bài Evergreen · 250 Tracked Shortlinks',
            'Full AI Autopilot (BYOK) & Toàn bộ lịch sử',
        ],
    },
    {
        key: 'business',
        name: 'Business / Agency',
        price: { vn: 399000, intl: 39, whop: 59 },
        yearly: { vn: 3290000, intl: 299, whop: 399 },
        lifetimeWhop: 299,
        items: [
            '25 Brands · 60 Tài khoản MXH thật',
            'Teams: 10 Thành viên + Luồng Duyệt Bài (Approval)',
            '200 MB đệm Media + Nối Google Drive / R2 riêng',
            '100 bài Evergreen · 1.000 Tracked Shortlinks',
            'Full AI Autopilot + Đồng bộ danh mục Drive/R2',
            'Thống kê đa kênh toàn diện & Xuất báo cáo',
        ],
    },
];

const DESKTOP_PLANS = [
    {
        key: 'desktop-solo',
        name: 'Desktop Solo (1 Máy tính)',
        once: { vn: 390000, intl: 39, whop: 49 },
        update: { vn: 99000, intl: 9, whop: 12 },
        items: [
            '1 Máy tính Windows (SC2) · 3 Brands & 10 MXH',
            'Kho Media & Bài nháp không giới hạn trên ổ cứng',
            'Kéo thả ảnh/video 0 giây chờ upload',
            'Mã hóa khóa bằng Windows DPAPI + AI BYOK',
            'Sở hữu vĩnh viễn + 12 tháng cập nhật miễn phí',
        ],
    },
    {
        key: 'desktop-pro',
        name: 'Desktop Pro (2 Máy tính)',
        featured: true,
        once: { vn: 590000, intl: 59, whop: 79 },
        update: { vn: 149000, intl: 15, whop: 19 },
        items: [
            '2 Máy tính Windows (VD: 1 PC + 1 Laptop)',
            'Không giới hạn Brands, MXH, Media & Excel Import',
            'Full AI Autopilot (BYOK) + Interactive Images',
            'Xuất / Nhập toàn bộ Workspace ra file Backup (.zip)',
            'Sở hữu vĩnh viễn + 12 tháng cập nhật miễn phí',
        ],
    },
    {
        key: 'desktop-agency',
        name: 'Desktop Agency Pack (5 Máy tính)',
        once: { vn: 1190000, intl: 119, whop: 159 },
        update: { vn: 299000, intl: 29, whop: 39 },
        items: [
            'Bản quyền thương mại cho 5 máy tính Windows',
            'Mở khóa 100% tính năng & dung lượng ổ cứng',
            'Chia sẻ dự án nội bộ qua file Backup (.zip)',
            'Bảo mật dữ liệu khách hàng 100% trên máy cục bộ',
            'Sở hữu vĩnh viễn + 12 tháng cập nhật miễn phí',
        ],
    },
];

function formatPriceValue(amount, market) {
    if (amount === 0) return market === 'vn' ? '0₫' : '$0';
    if (market === 'vn') return `${amount.toLocaleString('vi-VN')}₫`;
    return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

const MENU = [
    { icon: SquaresFour, label: 'Overview', active: true },
    { icon: ChartLineUp, label: 'Analytics' },
    { icon: Sparkle, label: 'AI Agent Chat' },
    { icon: PencilSimple, label: 'Create Post' },
    { icon: CalendarBlank, label: 'Content Calendar' },
    { icon: Users, label: 'Accounts' },
];

function DashboardPreview() {
    return (
        <div className="panel overflow-hidden" aria-hidden="true">
            <div className="flex">
                <div className="hidden w-48 shrink-0 border-r bg-surface p-4 sm:block">
                    <div className="mb-4 font-heading text-[15px]">SocialChoice</div>
                    <div className="space-y-1">
                        {MENU.map(({ icon: Icon, label, active }) => (
                            <div key={label} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${active ? 'bg-brand/15 font-medium text-brand-ink' : 'text-muted-foreground'}`}>
                                <Icon size={18} /> {label}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="min-w-0 flex-1 bg-background p-4">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {STATS.map(s => (
                            <div key={s.label} className="panel p-4">
                                <div className="label-xs">{s.label}</div>
                                <div className="metric mt-1">{s.value}</div>
                            </div>
                        ))}
                    </div>
                    <div className="panel mt-3 p-4">
                        <div className="label-xs mb-3">Lượt tiếp cận 7 ngày</div>
                        <div className="flex h-24 items-end gap-2">
                            {[40, 55, 35, 70, 60, 85, 75].map((h, i) => (
                                <div key={i} className="flex-1 rounded-sm bg-brand" style={{ height: `${h}%` }} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LandingPage2() {
    return (
        <div className="min-h-screen bg-background font-body text-foreground">
            <header className="border-b bg-surface">
                <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-5">
                    <Link to="/landing-2" className="font-heading text-base">SocialChoice</Link>
                    <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Điều hướng chính">
                        {NAV.map(n => <a key={n.href} href={n.href} className="hover:text-foreground">{n.label}</a>)}
                    </nav>
                    <div className="flex items-center gap-3">
                        <Link to="/login" className="text-sm hover:underline">Đăng nhập</Link>
                        <Link to="/create" className="btn-skew">Dùng thử</Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-[1200px] space-y-16 p-5 lg:p-8">
                <section className="space-y-8 pt-6">
                    <div className="max-w-2xl">
                        <PageHeader
                            title="Quản lý mạng xã hội trong một workspace gọn gàng"
                            description="Soạn, lên lịch và đo hiệu quả nội dung trên mọi kênh, với giao diện quen thuộc như dashboard của bạn."
                        />
                        <div className="flex flex-wrap gap-3">
                            <Link to="/create" className="btn-skew">Bắt đầu miễn phí <ArrowRight size={16} weight="duotone" /></Link>
                            <Link to="/overview" className="inline-flex items-center rounded-lg border bg-card px-4 py-2 text-sm hover:bg-muted">Xem bản demo</Link>
                        </div>
                    </div>
                    <DashboardPreview />
                </section>

                <section id="tinh-nang" className="scroll-mt-6">
                    <h2 className="mb-5 text-2xl">Tính năng chính</h2>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {FEATURES.map(({ icon: Icon, title, text }) => (
                            <div key={title} className="panel p-5">
                                <Icon size={24} weight="duotone" />
                                <h3 className="mt-3 text-[15px]">{title}</h3>
                                <p className="label-xs mt-2 text-sm">{text}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section id="quy-trinh" className="scroll-mt-6">
                    <h2 className="mb-5 text-2xl">Quy trình 3 bước</h2>
                    <div className="grid gap-5 md:grid-cols-3">
                        {STEPS.map(s => (
                            <div key={s.n} className="panel p-5">
                                <div className="metric flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15 text-brand-ink">{s.n}</div>
                                <h3 className="mt-3 text-[15px]">{s.title}</h3>
                                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <PricingWorkspaceSection />
            </main>

            <footer className="border-t bg-surface">
                <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-muted-foreground">
                    <span>© SocialChoice</span>
                    <div className="flex gap-4">
                        <Link to="/terms" className="hover:underline">Điều khoản</Link>
                        <Link to="/privacy" className="hover:underline">Quyền riêng tư</Link>
                        <Link to="/cookies" className="hover:underline">Cookie</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function PricingWorkspaceSection() {
    const [mode, setMode] = useState('cloud');
    const [market, setMarket] = useState('vn');
    const [yearly, setYearly] = useState(false);

    const [cAccounts, setCAccounts] = useState(10);
    const [cSeats, setCSeats] = useState(1);
    const [cBrands, setCBrands] = useState(1);
    const [cStorage, setCStorage] = useState(50);
    const [cAutomation, setCAutomation] = useState(false);
    const [cApproval, setCApproval] = useState(false);

    const rates = {
        vn: { base: 49000, freeThreshold: 150000, account: 15000, seat: 30000, brand: 20000, storageStep: 20000, automation: 40000, approval: 35000, proMonthly: 199000 },
        intl: { base: 5, freeThreshold: 15, account: 1, seat: 3, brand: 1.5, storageStep: 1.5, automation: 4, approval: 3.5, proMonthly: 19 },
        whop: { base: 9, freeThreshold: 25, account: 1.5, seat: 5, brand: 2, storageStep: 2.5, automation: 6, approval: 5, proMonthly: 29 },
    }[market];

    const itemsSubtotal =
        cAccounts * rates.account +
        cSeats * rates.seat +
        Math.max(0, cBrands - 1) * rates.brand +
        Math.max(0, (cStorage - 50) / 50) * rates.storageStep +
        (cAutomation ? rates.automation : 0) +
        (cApproval ? rates.approval : 0);

    const appliedBase = itemsSubtotal >= rates.freeThreshold ? 0 : rates.base;
    const customMonthly = itemsSubtotal + appliedBase;
    const fitsInPro = cAccounts <= 20 && cBrands <= 5 && cSeats <= 2 && cStorage <= 150 && !cApproval;
    const showProUpsell = fitsInPro && customMonthly > rates.proMonthly;

    return (
        <section id="bang-gia" className="scroll-mt-6 space-y-5">
            <div className="flex flex-col gap-4 border-b pb-4">
                <div>
                    <h2 className="text-2xl">Bảng giá & Thiết kế gói</h2>
                    <p className="label-xs mt-1 text-sm">
                        Đầy đủ 100% tính năng ở gói Free giới hạn, gói Cloud có Teams, tự chọn hạn mức lẻ hoặc mua đứt bản Desktop.
                    </p>
                </div>

                {/* Row 1: Primary Mode Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-surface p-1">
                        <Button type="button" size="sm" variant={mode === 'cloud' ? 'default' : 'ghost'} onClick={() => setMode('cloud')}>
                            <Cloud size={15} weight="duotone" className="mr-1.5" />
                            <span>Gói Cloud</span>
                        </Button>
                        <Button type="button" size="sm" variant={mode === 'custom' ? 'default' : 'ghost'} onClick={() => setMode('custom')}>
                            <Sliders size={15} weight="duotone" className="mr-1.5" />
                            <span>Tự thiết kế gói</span>
                        </Button>
                        <Button type="button" size="sm" variant={mode === 'desktop' ? 'default' : 'ghost'} onClick={() => setMode('desktop')}>
                            <Desktop size={15} weight="duotone" className="mr-1.5" />
                            <span>Bản Desktop</span>
                        </Button>
                    </div>

                    {/* Row 2 / Right: Billing & Market Switcher */}
                    <div className="flex flex-wrap items-center gap-3">
                        {mode !== 'desktop' && (
                            <div className="inline-flex items-center gap-1 rounded-lg border bg-surface p-1">
                                <Button type="button" size="sm" variant={!yearly ? 'default' : 'ghost'} onClick={() => setYearly(false)}>
                                    Theo tháng
                                </Button>
                                <Button type="button" size="sm" variant={yearly ? 'default' : 'ghost'} onClick={() => setYearly(true)}>
                                    Theo năm (-20%)
                                </Button>
                            </div>
                        )}
                        <div className="inline-flex items-center gap-1 rounded-lg border bg-surface p-1">
                            {[
                                ['vn', 'VNĐ'],
                                ['intl', 'USD'],
                            ].map(([key, label]) => (
                                <Button
                                    key={key}
                                    type="button"
                                    size="sm"
                                    variant={market === key ? 'default' : 'ghost'}
                                    onClick={() => setMarket(key)}
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {mode === 'cloud' && (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                    {WEB_PLANS.map(p => {
                        const monthlyVal = yearly
                            ? (p.yearly[market] === 0 ? 0 : (market === 'vn' ? Math.round(p.yearly[market] / 12 / 1000) * 1000 : Math.round((p.yearly[market] / 12) * 10) / 10))
                            : p.price[market];
                        return (
                            <div key={p.key} className={`panel flex flex-col justify-between p-5 ${p.featured ? 'border-brand-dark' : ''}`}>
                                <div>
                                    <h3 className="text-[15px]">{p.name}</h3>
                                    <div className="metric mt-2">
                                        {formatPriceValue(monthlyVal, market)}
                                        <span className="label-xs ml-1 font-normal">/tháng</span>
                                    </div>
                                    <div className="label-xs mt-1">
                                        {p.price[market] === 0
                                            ? 'Miễn phí trọn đời'
                                            : `Gói năm: ${formatPriceValue(p.yearly[market], market)}/năm`}
                                    </div>
                                    {market === 'whop' && p.lifetimeWhop && (
                                        <div className="label-xs mt-1 font-medium text-foreground">
                                            Whop Lifetime: ${p.lifetimeWhop} (Giới hạn suất)
                                        </div>
                                    )}
                                    <ul className="mt-4 space-y-2 text-sm">
                                        {p.items.map(i => (
                                            <li key={i} className="flex items-start gap-2">
                                                <Check size={16} weight="bold" className="mt-0.5 shrink-0" />
                                                <span>{i}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <Link to="/create" className="btn-skew mt-5 justify-center">Bắt đầu</Link>
                            </div>
                        );
                    })}
                </div>
            )}

            {mode === 'custom' && (
                <div className="grid items-start gap-5 lg:grid-cols-2">
                    <div className="panel space-y-4 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                            <div>
                                <h3 className="text-[15px]">Tự chọn hạn mức theo nhu cầu</h3>
                                <p className="label-xs">
                                    Kéo thanh trượt hoặc chỉnh đúng số lượng bạn cần.
                                </p>
                            </div>
                            <Badge variant="outline">
                                {appliedBase === 0
                                    ? `Đã miễn phí nền (${formatPriceValue(rates.base, market)})`
                                    : `Thêm ${formatPriceValue(rates.freeThreshold - itemsSubtotal, market)} để miễn phí nền`}
                            </Badge>
                        </div>

                        <div className="grid gap-3.5 sm:grid-cols-2">
                            <div className="rounded-lg border bg-surface p-3.5">
                                <Label htmlFor="custom-accounts" className="label-xs mb-1.5 block">
                                    Tài khoản MXH ({formatPriceValue(rates.account, market)}/kênh): {cAccounts} kênh
                                </Label>
                                <input
                                    id="custom-accounts"
                                    type="range"
                                    min={1}
                                    max={60}
                                    value={cAccounts}
                                    onChange={e => setCAccounts(Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>

                            <div className="rounded-lg border bg-surface p-3.5">
                                <Label htmlFor="custom-seats" className="label-xs mb-1.5 block">
                                    Thành viên Teams ({formatPriceValue(rates.seat, market)}/người): +{cSeats} người
                                </Label>
                                <input
                                    id="custom-seats"
                                    type="range"
                                    min={0}
                                    max={20}
                                    value={cSeats}
                                    onChange={e => setCSeats(Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>

                            <div className="rounded-lg border bg-surface p-3.5">
                                <Label htmlFor="custom-brands" className="label-xs mb-1.5 block">
                                    Thương hiệu (+{formatPriceValue(rates.brand, market)}/Brand): {cBrands} Brands
                                </Label>
                                <input
                                    id="custom-brands"
                                    type="range"
                                    min={1}
                                    max={25}
                                    value={cBrands}
                                    onChange={e => setCBrands(Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>

                            <div className="rounded-lg border bg-surface p-3.5">
                                <Label htmlFor="custom-storage" className="label-xs mb-1.5 block">
                                    Bộ nhớ đệm Media (+{formatPriceValue(rates.storageStep, market)}/50MB): {cStorage} MB
                                </Label>
                                <input
                                    id="custom-storage"
                                    type="range"
                                    min={50}
                                    max={300}
                                    step={50}
                                    value={cStorage}
                                    onChange={e => setCStorage(Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div className="grid gap-3 pt-1 text-sm sm:grid-cols-2">
                            <label className="flex items-start gap-2 rounded-lg border bg-surface p-3">
                                <input type="checkbox" checked={cAutomation} onChange={e => setCAutomation(e.target.checked)} className="mt-1" />
                                <span>Pack Tự Động Hóa (+{formatPriceValue(rates.automation, market)}): AI Autopilot + Excel 200 dòng</span>
                            </label>
                            <label className="flex items-start gap-2 rounded-lg border bg-surface p-3">
                                <input type="checkbox" checked={cApproval} onChange={e => setCApproval(e.target.checked)} className="mt-1" />
                                <span>Pack Duyệt Bài & Link (+{formatPriceValue(rates.approval, market)}): Approval + 500 Shortlinks</span>
                            </label>
                        </div>
                    </div>

                    <div className="panel flex flex-col justify-between p-5">
                        <div className="space-y-4">
                            <h3 className="text-[15px]">Tóm tắt Gói Tự Thiết Kế</h3>
                            <div className="metric">
                                {formatPriceValue(customMonthly, market)}
                                <span className="label-xs ml-1 font-normal">/tháng</span>
                            </div>
                            <p className="label-xs">
                                {appliedBase === 0
                                    ? 'Đã được miễn phí nền tảng cơ bản (0₫).'
                                    : `Bao gồm phí nền tảng ${formatPriceValue(appliedBase, market)}/tháng.`}
                            </p>
                            {showProUpsell && (
                                <div role="status" className="rounded-lg border border-brand-dark bg-brand/15 p-3 text-sm text-brand-ink">
                                    Gợi ý tiết kiệm: Cấu hình này nằm gọn trong gói Professional ({formatPriceValue(rates.proMonthly, market)}/tháng). Chuyển sang gói Professional để tiết kiệm hơn!
                                </div>
                            )}
                        </div>
                        <Link to="/create" className="btn-skew mt-5 justify-center">Đăng ký cấu hình này</Link>
                    </div>
                </div>
            )}

            {mode === 'desktop' && (
                <div className="grid gap-5 md:grid-cols-3">
                    {DESKTOP_PLANS.map(p => (
                        <div key={p.key} className={`panel flex flex-col justify-between p-5 ${p.featured ? 'border-brand-dark' : ''}`}>
                            <div>
                                <h3 className="text-[15px]">{p.name}</h3>
                                <div className="metric mt-2">
                                    {formatPriceValue(p.once[market], market)}
                                    <span className="label-xs ml-1 font-normal">/ mua 1 lần</span>
                                </div>
                                <div className="label-xs mt-1 font-medium text-foreground">
                                    Gia hạn Update năm 2+ (Tùy chọn ~25%): {formatPriceValue(p.update[market], market)}/năm
                                </div>
                                <ul className="mt-4 space-y-2 text-sm">
                                    {p.items.map(i => (
                                        <li key={i} className="flex items-start gap-2">
                                            <Check size={16} weight="bold" className="mt-0.5 shrink-0" />
                                            <span>{i}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <Link to="/login" className="btn-skew mt-5 justify-center">Mua bản Desktop</Link>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
