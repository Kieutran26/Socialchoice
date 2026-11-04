import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import {
    PenNib,
    Plus,
    PencilSimple,
    Trash,
    Check,
    Star,
    CaretDown,
    X,
    Sparkle,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useToast } from '@/components/ui/use-toast';
import { useWorkspace } from '@/lib/workspace-context';
import PlatformBadge, { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';

const PLATFORM_OPTIONS = [
    { value: 'all', label: 'Tất cả nền tảng' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'threads', label: 'Threads' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'x', label: 'X (Twitter)' },
];

export default function SignaturesSettingsCard() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const { brands, selectedBrandId, demoMode } = useWorkspace();

    const [signatures, setSignatures] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSig, setEditingSig] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        content: '',
        platform: 'all',
        account_id: '',
        is_default: false,
    });

    const activeBrand = useMemo(() => {
        if (!brands.length) return null;
        if (selectedBrandId && selectedBrandId !== 'all') {
            return brands.find((b) => b.id === selectedBrandId) || brands[0];
        }
        return brands[0];
    }, [brands, selectedBrandId]);

    // Load signatures and accounts
    const loadData = useCallback(async () => {
        if (!activeBrand?.id) return;
        setLoading(true);
        try {
            const [sigRes, accRes] = await Promise.all([
                appClient.entities.PostSignature.filter(
                    { brand_id: activeBrand.id, is_demo: demoMode },
                    { sort: 'created_date', limit: 100 }
                ).catch(() => ({ items: [] })),
                appClient.entities.SocialAccount.filter(
                    { is_demo: demoMode },
                    { sort: 'name', limit: 300 }
                ).catch(() => ({ items: [] })),
            ]);
            setSignatures(sigRes.items || []);
            setAccounts(accRes.items || []);
        } catch (err) {
            console.error('Failed to load signatures:', err);
        } finally {
            setLoading(false);
        }
    }, [activeBrand?.id, demoMode]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const openCreateModal = () => {
        setEditingSig(null);
        setFormData({
            name: '',
            content: '',
            platform: 'all',
            account_id: '',
            is_default: false,
        });
        setModalOpen(true);
    };

    const openEditModal = (sig) => {
        setEditingSig(sig);
        setFormData({
            name: sig.name || '',
            content: sig.content || '',
            platform: sig.platform || 'all',
            account_id: sig.account_id || '',
            is_default: !!sig.is_default,
        });
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e?.preventDefault();
        if (!formData.name.trim()) {
            toast({ variant: 'destructive', title: t('Vui lòng nhập tên chữ ký') });
            return;
        }
        if (!formData.content.trim()) {
            toast({ variant: 'destructive', title: t('Vui lòng nhập nội dung chữ ký') });
            return;
        }
        if (!activeBrand?.id) {
            toast({ variant: 'destructive', title: t('Chưa chọn thương hiệu') });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: formData.name.trim(),
                content: formData.content.trim(),
                platform: formData.platform,
                account_id: formData.account_id || '',
                is_default: formData.is_default,
                brand_id: activeBrand.id,
                status: 'active',
                is_demo: demoMode,
            };

            if (editingSig?.id) {
                await appClient.entities.PostSignature.update(editingSig.id, payload);
                toast({ title: t('Đã cập nhật chữ ký thành công') });
            } else {
                await appClient.entities.PostSignature.create(payload);
                toast({ title: t('Đã tạo chữ ký mới thành công') });
            }
            setModalOpen(false);
            loadData();
        } catch (err) {
            toast({ variant: 'destructive', title: t('Lỗi lưu chữ ký'), description: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget?.id) return;
        try {
            await appClient.entities.PostSignature.delete(deleteTarget.id);
            toast({ title: t('Đã xóa chữ ký thành công') });
            setDeleteTarget(null);
            loadData();
        } catch (err) {
            toast({ variant: 'destructive', title: t('Lỗi xóa chữ ký'), description: err.message });
        }
    };

    // Filter accounts by chosen platform
    const availableAccounts = useMemo(() => {
        let list = accounts.filter((acc) => !acc.brand_id || acc.brand_id === activeBrand?.id);
        if (formData.platform && formData.platform !== 'all') {
            list = list.filter((acc) => acc.platform === formData.platform);
        }
        return list;
    }, [accounts, activeBrand?.id, formData.platform]);

    return (
        <section className="panel p-5 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        <PenNib size={18} weight="bold" />
                    </span>
                    <div>
                        <h2 className="text-[15px] font-semibold text-foreground">
                            {t('Post Signatures (Chữ ký bài viết)')}
                        </h2>
                        <p className="label-xs text-muted-foreground mt-0.5">
                            {t('Tạo các mẫu chữ ký, lời kết, hashtag hoặc thông tin liên hệ để chèn nhanh cho từng kênh/tài khoản khi đăng bài.')}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={openCreateModal}
                    className="btn-skew inline-flex items-center gap-1.5 text-xs py-1.5 px-3.5 shadow-2xs cursor-pointer shrink-0"
                >
                    <Plus size={14} weight="bold" />
                    <span>{t('Thêm chữ ký')}</span>
                </button>
            </div>

            {/* List of signatures */}
            {loading ? (
                <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                    {t('Đang tải danh sách chữ ký…')}
                </div>
            ) : signatures.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 p-8 text-center bg-surface/30">
                    <PenNib size={32} className="mx-auto text-muted-foreground/60 mb-2" weight="duotone" />
                    <p className="text-sm font-semibold text-foreground">{t('Chưa có chữ ký nào')}</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                        {t('Tạo chữ ký mẫu để tiết kiệm thời gian chèn lời chào, hotline, website hoặc hashtag cho bài đăng.')}
                    </p>
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="btn-skew mt-4 text-xs py-1.5 px-4 cursor-pointer inline-flex items-center gap-1.5"
                    >
                        <Plus size={14} weight="bold" />
                        <span>{t('Tạo chữ ký đầu tiên')}</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {signatures.map((sig) => {
                        const targetAccount = accounts.find((a) => a.id === sig.account_id);
                        return (
                            <div
                                key={sig.id}
                                className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-surface/50 p-4 transition-all hover:border-[#ffd631]/60 hover:shadow-xs"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-xs text-foreground">
                                                {sig.name}
                                            </span>
                                            {sig.is_default && (
                                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                    <Star size={11} weight="fill" />
                                                    {t('Mặc định')}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(sig)}
                                                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                                                title={t('Sửa')}
                                            >
                                                <PencilSimple size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeleteTarget(sig)}
                                                className="p-1 rounded-lg text-muted-foreground hover:text-dangerFg hover:bg-dangerBg/20 cursor-pointer transition-colors"
                                                title={t('Xóa')}
                                            >
                                                <Trash size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Scope badges */}
                                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                        {sig.platform === 'all' ? (
                                            <span className="rounded-md border border-border bg-background px-2 py-0.5 text-muted-foreground font-medium">
                                                {t('Tất cả nền tảng')}
                                            </span>
                                        ) : (
                                            <PlatformBadge platform={sig.platform} size="sm" />
                                        )}

                                        {targetAccount ? (
                                            <span className="rounded-md border border-border bg-background px-2 py-0.5 text-foreground font-medium truncate max-w-[150px]">
                                                {targetAccount.name}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground text-[10px]">
                                                ({t('Mọi tài khoản')})
                                            </span>
                                        )}
                                    </div>

                                    {/* Content preview */}
                                    <div className="rounded-lg bg-background border border-border/50 p-2.5 text-xs text-muted-foreground whitespace-pre-wrap font-sans max-h-24 overflow-y-auto leading-relaxed">
                                        {sig.content}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Create / Edit Signature */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border p-5 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
                                    <PenNib size={16} weight="bold" />
                                </span>
                                <h3 className="text-sm font-semibold text-foreground">
                                    {editingSig ? t('Chỉnh sửa chữ ký') : t('Thêm chữ ký mới')}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-3.5">
                            {/* Signature Name */}
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                    {t('Tên chữ ký')} *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t('Ví dụ: Chữ ký Fanpage chính, Footer Hotline...')}
                                    className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-[#ffd631]"
                                />
                            </div>

                            {/* Platform & Account Selector Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                        {t('Nền tảng áp dụng')}
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={formData.platform}
                                            onChange={(e) => setFormData({ ...formData, platform: e.target.value, account_id: '' })}
                                            className="w-full h-9 rounded-xl border border-border bg-background px-3 pr-8 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-[#ffd631] cursor-pointer appearance-none"
                                        >
                                            {PLATFORM_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                        <CaretDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                        {t('Tài khoản cụ thể')}
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={formData.account_id}
                                            onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                                            className="w-full h-9 rounded-xl border border-border bg-background px-3 pr-8 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-[#ffd631] cursor-pointer appearance-none"
                                        >
                                            <option value="">{t('Tất cả tài khoản')}</option>
                                            {availableAccounts.map((acc) => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.name} ({acc.platform})
                                                </option>
                                            ))}
                                        </select>
                                        <CaretDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                                    </div>
                                </div>
                            </div>

                            {/* Content Textarea */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        {t('Nội dung chữ ký')} *
                                    </label>
                                    <span className="text-[11px] text-muted-foreground font-mono">
                                        {formData.content.length} ký tự
                                    </span>
                                </div>
                                <textarea
                                    required
                                    rows={5}
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder={t('Ví dụ:\n---\n📞 Hotline/Zalo: 0909 123 456\n🌐 Website: socialchoice.site\n#socialchoice #marketing')}
                                    className="w-full rounded-xl border border-border bg-background p-3 text-xs leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-[#ffd631] resize-none"
                                />
                            </div>

                            {/* Default Checkbox */}
                            <label className="flex items-center gap-2 cursor-pointer pt-1">
                                <input
                                    type="checkbox"
                                    checked={formData.is_default}
                                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                                    className="rounded border-border text-[#ffd631] focus:ring-[#ffd631] h-4 w-4"
                                />
                                <span className="text-xs text-foreground font-medium">
                                    {t('Đặt làm chữ ký mặc định cho kênh này')}
                                </span>
                            </label>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                                >
                                    {t('Hủy')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-skew text-xs py-1.5 px-4 shadow-2xs cursor-pointer disabled:opacity-60"
                                >
                                    {saving ? t('Đang lưu…') : t('Lưu chữ ký')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Delete Dialog */}
            {deleteTarget && (
                <ConfirmDialog
                    open={!!deleteTarget}
                    title={t('Xóa chữ ký?')}
                    description={t('Bạn có chắc chắn muốn xóa chữ ký "{name}"? Hành động này không thể hoàn tác.', { name: deleteTarget.name })}
                    confirmLabel={t('Xóa')}
                    variant="destructive"
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </section>
    );
}

