import { useEffect, useMemo, useState } from 'react';
import {
    ArrowClockwise,
    CheckCircle,
    Clock,
    EnvelopeSimple,
    MagnifyingGlass,
    Receipt,
} from '@phosphor-icons/react';
import StatCard from '@/components/common/StatCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function formatMoney(amount, market, gateway) {
    const num = Number(amount || 0);
    if (market === 'intl' || market === 'whop' || String(gateway).toLowerCase() === 'whop') {
        return `$${num.toLocaleString('en-US')}`;
    }
    return `${Math.round(num).toLocaleString('vi-VN')}₫`;
}

function readLocalFallbackOrders() {
    if (typeof window === 'undefined') return [];
    const rows = [];
    const seen = new Set();
    try {
        const desktop = JSON.parse(window.localStorage.getItem('socialchoice.desktop_licenses') || '[]');
        if (Array.isArray(desktop)) {
            for (const d of desktop) {
                if (!d?.orderCode || seen.has(d.orderCode)) continue;
                seen.add(d.orderCode);
                rows.push({
                    orderCode: d.orderCode,
                    email: d.email || '',
                    customerName: d.customerName || '',
                    planName: d.planName || 'Desktop SC2',
                    kind: 'desktop',
                    amount: Number(d.amount || 0),
                    market: d.market || 'vn',
                    gateway: d.market === 'intl' ? 'Polar.sh' : 'SePay VietQR',
                    emailSent: false,
                    emailId: null,
                    sepayPaidAmount: Number(d.amount || 0),
                    reconciled: true,
                    sepayReference: 'local-cache',
                    createdAt: d.activatedAt || '',
                });
            }
        }
    } catch {}
    try {
        const map = JSON.parse(window.localStorage.getItem('socialchoice.subscriptions_by_account') || '{}') || {};
        for (const sub of Object.values(map)) {
            if (!sub?.orderCode || seen.has(sub.orderCode)) continue;
            seen.add(sub.orderCode);
            rows.push({
                orderCode: sub.orderCode,
                email: sub.email || '',
                customerName: sub.customerName || '',
                planName: sub.planName || 'Cloud Plan',
                kind: 'cloud',
                amount: Number(sub.amount || 0),
                market: sub.market || 'vn',
                gateway: sub.market === 'intl' ? 'Polar.sh' : 'SePay VietQR',
                emailSent: false,
                emailId: null,
                sepayPaidAmount: Number(sub.amount || 0),
                reconciled: true,
                sepayReference: 'local-cache',
                createdAt: sub.upgradedAt || sub.activatedAt || '',
            });
        }
    } catch {}
    return rows;
}

export default function PurchaseReconciliationPanel() {
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    async function loadOrders(search = '') {
        setLoading(true);
        setError('');
        try {
            const url = `/api/admin/payments/reconcile${search ? `?q=${encodeURIComponent(search)}` : ''}`;
            const res = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                    'x-socialchoice-client': 'local-ui',
                },
            });
            const ct = res.headers.get('content-type') || '';
            if (!res.ok || !ct.includes('application/json')) {
                setItems(readLocalFallbackOrders());
                return;
            }
            const data = await res.json();
            const remote = Array.isArray(data?.items) ? data.items : [];
            setItems(remote);
        } catch (e) {
            setError(e?.message || 'Không tải được danh sách đối soát');
            setItems(readLocalFallbackOrders());
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadOrders('');
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter((it) =>
            [it.orderCode, it.email, it.customerName, it.planName, it.gateway, it.sepayReference]
                .some((v) => String(v || '').toLowerCase().includes(q))
        );
    }, [items, query]);

    const stats = useMemo(() => {
        const total = items.length;
        const reconciledCount = items.filter((i) => i.reconciled).length;
        const emailSentCount = items.filter((i) => i.emailSent).length;
        const vndTotal = items
            .filter((i) => i.reconciled && i.market !== 'intl' && i.market !== 'whop')
            .reduce((s, i) => s + Number(i.amount || 0), 0);
        return { total, reconciledCount, emailSentCount, vndTotal };
    }, [items]);

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <StatCard
                    label="Tổng lượt mua"
                    value={stats.total}
                    hint="Biên lai & giao dịch"
                    icon={Receipt}
                    iconBg="bg-muted/60 border-border/60"
                    iconColor="text-foreground"
                />
                <StatCard
                    label="Đã đối soát khớp"
                    value={stats.reconciledCount}
                    hint="Khớp SePay / Polar / Whop"
                    icon={CheckCircle}
                    iconBg="bg-muted/60 border-border/60"
                    iconColor="text-emerald-600"
                />
                <StatCard
                    label="Email biên lai đã gửi"
                    value={stats.emailSentCount}
                    hint="Gửi qua Resend"
                    icon={EnvelopeSimple}
                    iconBg="bg-muted/60 border-border/60"
                    iconColor="text-foreground"
                />
                <StatCard
                    label="Doanh thu VNĐ đã khớp"
                    value={`${Math.round(stats.vndTotal).toLocaleString('vi-VN')}₫`}
                    hint="Chưa gồm đơn USD"
                    icon={CheckCircle}
                    iconBg="bg-muted/60 border-border/60"
                    iconColor="text-foreground"
                />
            </div>

            <div className="panel p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[240px] max-w-md">
                        <MagnifyingGlass
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Tìm mã biên lai (#SCC...), email, tên khách, mã tham chiếu..."
                            className="pl-9 h-9 text-xs rounded-xl"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        onClick={() => loadOrders(query)}
                        className="h-9 px-3 rounded-xl text-xs font-medium gap-1.5"
                    >
                        <ArrowClockwise size={14} className={loading ? 'animate-spin' : ''} />
                        <span>{loading ? 'Đang tải…' : 'Làm mới đối soát'}</span>
                    </Button>
                </div>

                {error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        {error}
                    </div>
                )}

                <div className="overflow-x-auto border border-border/70 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground">
                                <th className="py-2.5 px-3.5 font-semibold">Mã biên lai</th>
                                <th className="py-2.5 px-3.5 font-semibold">Khách hàng / Email</th>
                                <th className="py-2.5 px-3.5 font-semibold">Gói &amp; Số tiền</th>
                                <th className="py-2.5 px-3.5 font-semibold">Cổng &amp; Đối soát</th>
                                <th className="py-2.5 px-3.5 font-semibold">Email biên lai</th>
                                <th className="py-2.5 px-3.5 font-semibold text-right">Thời gian</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                                        {loading
                                            ? 'Đang tải dữ liệu lượt mua...'
                                            : 'Chưa có lượt mua hoặc giao dịch nào khớp bộ lọc.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((row) => (
                                    <tr key={row.orderCode} className="hover:bg-muted/20">
                                        <td className="py-3 px-3.5 font-mono font-semibold text-foreground whitespace-nowrap">
                                            #{row.orderCode}
                                        </td>
                                        <td className="py-3 px-3.5">
                                            <div className="font-medium text-foreground">
                                                {row.customerName || '—'}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                                {row.email || 'Chưa gắn email'}
                                            </div>
                                        </td>
                                        <td className="py-3 px-3.5 whitespace-nowrap">
                                            <div className="font-medium text-foreground">{row.planName}</div>
                                            <div className="font-mono text-[11px] text-foreground tabular-nums">
                                                {formatMoney(row.amount, row.market, row.gateway)}
                                            </div>
                                        </td>
                                        <td className="py-3 px-3.5">
                                            <div className="flex items-center gap-1.5">
                                                {row.reconciled ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                                        <CheckCircle size={12} weight="fill" />
                                                        Khớp ({row.gateway})
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                                        <Clock size={12} weight="fill" />
                                                        Chờ tiền vào ({row.gateway})
                                                    </span>
                                                )}
                                            </div>
                                            {row.sepayReference && (
                                                <div className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">
                                                    Ref: {row.sepayReference}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 px-3.5 whitespace-nowrap">
                                            {row.emailSent ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                                                    <EnvelopeSimple size={13} />
                                                    Đã gửi
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-muted-foreground">Chưa gửi</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3.5 text-right text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">
                                            {row.createdAt
                                                ? new Date(row.createdAt).toLocaleString('vi-VN')
                                                : '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
