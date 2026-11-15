import { useEffect, useState } from 'react';
import {
    Copy,
    Plus,
    Tag,
    Trash,
    CheckCircle,
    Percent,
    Sparkle,
    ArrowClockwise,
    WarningCircle,
    Hash,
} from '@phosphor-icons/react';
import StatCard from '@/components/common/StatCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    getAllDiscounts,
    addCustomDiscount,
    removeCustomDiscount,
    resetDiscountUses,
    updateDiscountLimit,
} from '@/lib/discount-codes';

export default function AdminDiscountsPanel() {
    const [discounts, setDiscounts] = useState([]);
    const [code, setCode] = useState('');
    const [percent, setPercent] = useState('20');
    const [maxUses, setMaxUses] = useState('');
    const [note, setNote] = useState('');
    const [msg, setMsg] = useState(null);
    const [copiedCode, setCopiedCode] = useState(null);

    function refresh() {
        setDiscounts(getAllDiscounts());
    }

    useEffect(() => {
        refresh();
        const onUpdate = () => refresh();
        window.addEventListener('socialchoice:discounts', onUpdate);
        return () => window.removeEventListener('socialchoice:discounts', onUpdate);
    }, []);

    function handleAdd(e) {
        e.preventDefault();
        setMsg(null);
        const parsedMax = maxUses.trim() === '' ? null : Number(maxUses);
        const res = addCustomDiscount({
            code,
            percent: Number(percent),
            note,
            maxUses: parsedMax,
        });
        if (res.success) {
            const limitTxt = res.item.maxUses ? ` (giới hạn ${res.item.maxUses} lượt)` : ' (không giới hạn)';
            setMsg({
                type: 'success',
                text: `Đã tạo mã giảm giá ${res.item.code} (-${res.item.percent}%)${limitTxt}`,
            });
            setCode('');
            setNote('');
            setMaxUses('');
            refresh();
        } else {
            setMsg({ type: 'error', text: res.reason || 'Không tạo được mã' });
        }
    }

    function handleDelete(c) {
        removeCustomDiscount(c);
        refresh();
    }

    function handleResetUses(c) {
        resetDiscountUses(c);
        setMsg({ type: 'success', text: `Đã đặt lại 0 lượt dùng cho mã ${c}` });
        refresh();
    }

    function copyCode(c) {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(c).then(() => {
            setCopiedCode(c);
            setTimeout(() => setCopiedCode(null), 1500);
        });
    }

    const total = discounts.length;
    const totalUses = discounts.reduce((sum, d) => sum + Number(d.usedCount || 0), 0);
    const exhaustedCount = discounts.filter(
        (d) => d.maxUses !== null && Number(d.usedCount || 0) >= Number(d.maxUses)
    ).length;
    const activeCount = total - exhaustedCount;

    return (
        <div className="space-y-5">
            {/* 4 StatCards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <StatCard
                    label="Tổng số mã"
                    value={total}
                    hint="Tất cả mã ưu đãi"
                    icon={Tag}
                    iconBg="bg-muted/60 border-border/60"
                    iconColor="text-foreground"
                />
                <StatCard
                    label="Tổng lượt đã dùng"
                    value={totalUses}
                    hint="Lượt thanh toán áp mã"
                    icon={Hash}
                    iconBg="bg-muted/60 border-border/60"
                    iconColor="text-brand-ink"
                />
                <StatCard
                    label="Mã đang hiệu lực"
                    value={activeCount}
                    hint="Còn lượt sử dụng"
                    icon={CheckCircle}
                    iconBg="bg-muted/60 border-border/60"
                    iconColor="text-emerald-600"
                />
                <StatCard
                    label="Mã đã hết lượt"
                    value={exhaustedCount}
                    hint="Cần nới thêm quota"
                    icon={WarningCircle}
                    iconBg="bg-muted/60 border-border/60"
                    iconColor="text-rose-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Form Tạo mã giảm giá mới */}
                <div className="panel p-5 space-y-4 rounded-2xl border border-border/80 bg-card">
                    <div>
                        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Plus size={16} weight="bold" />
                            Thêm mã giảm giá mới
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">
                            Cấu hình mã, % chiết khấu và giới hạn số lượt áp dụng.
                        </p>
                    </div>

                    {msg && (
                        <div
                            className={`p-3 rounded-xl text-xs border ${
                                msg.type === 'success'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-rose-50 border-rose-200 text-rose-800'
                            }`}
                        >
                            {msg.text}
                        </div>
                    )}

                    <form onSubmit={handleAdd} className="space-y-3.5">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                Mã giảm giá (Code) *
                            </label>
                            <Input
                                required
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                                placeholder="VD: BLACKFRIDAY, SALE30"
                                className="font-mono text-xs h-9 uppercase"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                    Mức giảm (%) *
                                </label>
                                <div className="flex items-center gap-1.5">
                                    <Input
                                        type="number"
                                        min="1"
                                        max="100"
                                        required
                                        value={percent}
                                        onChange={(e) => setPercent(e.target.value)}
                                        className="font-mono text-xs h-9 tabular-nums"
                                    />
                                    <span className="text-xs text-muted-foreground font-semibold">%</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                    Số lượt dùng
                                </label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={maxUses}
                                    onChange={(e) => setMaxUses(e.target.value)}
                                    placeholder="∞ Vô hạn"
                                    className="font-mono text-xs h-9 tabular-nums"
                                    title="Để trống = Không giới hạn số lượt"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                Mô tả / Ghi chú chiến dịch
                            </label>
                            <Input
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="VD: Dành cho 50 khách hàng đầu tiên"
                                className="text-xs h-9"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-brand-ink hover:bg-[#ffe059] transition-colors cursor-pointer shadow-xs"
                        >
                            <Plus size={14} weight="bold" />
                            <span>Tạo mã giảm giá</span>
                        </button>
                    </form>
                </div>

                {/* Danh sách các mã hiện có */}
                <div className="lg:col-span-2 panel p-5 space-y-4 rounded-2xl border border-border/80 bg-card">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Tag size={16} weight="bold" />
                            Danh sách mã giảm giá & Số lượt dùng ({discounts.length})
                        </h2>
                    </div>

                    <div className="overflow-x-auto border border-border/70 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground">
                                    <th className="py-2.5 px-3.5 font-semibold">Mã code</th>
                                    <th className="py-2.5 px-3 font-semibold">Mức giảm</th>
                                    <th className="py-2.5 px-3.5 font-semibold">Đã dùng / Giới hạn</th>
                                    <th className="py-2.5 px-3 font-semibold">Trạng thái</th>
                                    <th className="py-2.5 px-3.5 font-semibold text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {discounts.map((d) => {
                                    const used = Number(d.usedCount || 0);
                                    const max = d.maxUses !== null && d.maxUses !== undefined ? Number(d.maxUses) : null;
                                    const isExhausted = max !== null && used >= max;
                                    const percentProgress = max ? Math.min(100, Math.round((used / max) * 100)) : 0;

                                    return (
                                        <tr key={d.code} className="hover:bg-muted/20">
                                            <td className="py-3 px-3.5 font-mono font-bold text-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <span>{d.code}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyCode(d.code)}
                                                        title="Copy mã"
                                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                                    >
                                                        <Copy size={13} />
                                                    </button>
                                                    {copiedCode === d.code && (
                                                        <span className="text-[10px] text-emerald-600 font-sans font-medium">
                                                            Đã copy
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] font-sans font-normal text-muted-foreground truncate max-w-[160px]">
                                                    {d.note || '—'}
                                                </div>
                                            </td>

                                            <td className="py-3 px-3">
                                              <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 font-mono font-bold text-amber-800 text-[11px]">
                                                  −{d.percent}%
                                              </span>
                                            </td>

                                            <td className="py-3 px-3.5">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 font-mono text-[11.5px]">
                                                        <strong className="text-foreground">{used}</strong>
                                                        <span className="text-muted-foreground">/</span>
                                                        <span>{max !== null ? `${max} lượt` : '∞ (vô hạn)'}</span>
                                                    </div>
                                                    {max !== null && (
                                                        <div className="w-24 h-1.5 rounded-full bg-muted/80 overflow-hidden">
                                                            <div
                                                                className={`h-full transition-all ${
                                                                    isExhausted ? 'bg-rose-500' : 'bg-brand'
                                                                }`}
                                                                style={{ width: `${percentProgress}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="py-3 px-3">
                                                {isExhausted ? (
                                                    <span className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                                                        Hết lượt
                                                    </span>
                                                ) : max !== null ? (
                                                    <span className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                                        Còn {max - used}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                                        Vô hạn
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-3 px-3.5 text-right">
                                                <div className="inline-flex items-center gap-1">
                                                    {used > 0 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleResetUses(d.code)}
                                                            className="size-7 text-muted-foreground hover:text-foreground"
                                                            title="Đặt lại số lượt về 0"
                                                        >
                                                            <ArrowClockwise size={13} />
                                                        </Button>
                                                    )}
                                                    {!d.isSystem && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(d.code)}
                                                            className="size-7 text-muted-foreground hover:text-rose-600"
                                                            title="Xóa mã này"
                                                        >
                                                            <Trash size={14} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
