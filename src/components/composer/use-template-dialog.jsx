import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Quotes,
    MagnifyingGlass,
    FileText,
    Images,
    VideoCamera,
    Plus,
    X,
    Check,
    Tag,
    ShareNetwork,
} from '@phosphor-icons/react';
import { appClient } from '@/api/app-client';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

export default function UseTemplateDialog({
    brandId,
    demoMode,
    disabled = false,
    trigger,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
}) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const setOpen = isControlled ? controlledOnOpenChange : setUncontrolledOpen;

    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [applyingId, setApplyingId] = useState(null);
    const [search, setSearch] = useState('');
    const [formatFilter, setFormatFilter] = useState('all'); // 'all' | 'text' | 'image' | 'video'

    // Fetch templates when opened
    useEffect(() => {
        if (!open) return;
        let active = true;
        setLoading(true);

        const query = { is_demo: demoMode };
        if (brandId && brandId !== 'all') {
            query.brand_id = brandId;
        }

        appClient.entities.PostTemplate.filter(query, { sort: '-updated_date', limit: 100 })
            .then((res) => {
                if (!active) return;
                setTemplates(res.items || []);
            })
            .catch((err) => {
                console.error('Failed to load templates:', err);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [open, brandId, demoMode]);

    // Format helper
    const getFormatType = (tmpl) => {
        const hasMedia = (tmpl.media_ids || []).length > 0 || Object.values(tmpl.platform_media_ids || {}).some((ids) => ids?.length > 0);
        if (!hasMedia) return 'text';
        // If has media, default to image/media
        return 'image';
    };

    // Filter templates
    const filteredTemplates = useMemo(() => {
        return templates.filter((tmpl) => {
            if (formatFilter !== 'all') {
                const type = getFormatType(tmpl);
                if (type !== formatFilter) return false;
            }
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return (
                tmpl.name?.toLowerCase().includes(q) ||
                tmpl.title?.toLowerCase().includes(q) ||
                tmpl.caption?.toLowerCase().includes(q)
            );
        });
    }, [templates, search, formatFilter]);

    async function applyTemplate(template) {
        setApplyingId(template.id);
        try {
            const { post, warnings } = await appClient.templates.createDraft(template.id);
            toast({
                title: t('Đã áp dụng mẫu bài viết'),
                description: warnings?.length
                    ? warnings.map((w) => t(w)).join(' ')
                    : t('Bản nháp đã được tạo từ mẫu. Bạn có thể chỉnh sửa nội dung và lên lịch đăng ngay.'),
            });
            setOpen(false);
            navigate(`/create?edit=${post.id}`);
        } catch (err) {
            toast({
                variant: 'destructive',
                title: t('Không thể áp dụng mẫu'),
                description: t(err.message || 'Vui lòng thử lại sau.'),
            });
        } finally {
            setApplyingId(null);
        }
    }

    return (
        <>
            {trigger ? (
                trigger(() => setOpen(true))
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => setOpen(true)}
                    className="flex h-9 items-center gap-1.5 rounded-lg border-zinc-300 bg-white px-3 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 shadow-2xs cursor-pointer"
                >
                    <Quotes size={16} weight="duotone" className="text-amber-500" />
                    <span>{t('Dùng mẫu bài viết')}</span>
                </Button>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl sm:max-w-3xl w-[94vw] max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-white border border-neutral-200/90 shadow-2xl">
                    {/* Header */}
                    <DialogHeader className="p-5 pb-3 border-b border-neutral-100 bg-white shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                                <Quotes size={18} weight="duotone" />
                            </span>
                            <div>
                                <DialogTitle className="text-base font-bold text-neutral-900">
                                    {t('Chọn mẫu bài viết để tạo bài')}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-neutral-500 mt-0.5">
                                    {t('Áp dụng mẫu đã lưu sẵn để tự động điền tiêu đề, nội dung, kênh đăng và cài đặt chiến lược.')}
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-1">
                            <div className="relative flex-1 min-w-[220px]">
                                <MagnifyingGlass
                                    size={14}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                                />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t('Tìm kiếm mẫu theo tên, nội dung…')}
                                    className="h-8.5 w-full rounded-xl border border-neutral-200 bg-neutral-50/70 pl-8.5 pr-3 text-xs focus:bg-white"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-xs font-medium">
                                <button
                                    type="button"
                                    onClick={() => setFormatFilter('all')}
                                    className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                                        formatFilter === 'all'
                                            ? 'bg-white text-neutral-900 font-bold shadow-2xs'
                                            : 'text-neutral-600 hover:text-neutral-900'
                                    }`}
                                >
                                    {t('Tất cả')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormatFilter('text')}
                                    className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 ${
                                        formatFilter === 'text'
                                            ? 'bg-white text-neutral-900 font-bold shadow-2xs'
                                            : 'text-neutral-600 hover:text-neutral-900'
                                    }`}
                                >
                                    <FileText size={12} weight="bold" className="text-amber-500" />
                                    <span>{t('Chỉ chữ')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormatFilter('image')}
                                    className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 ${
                                        formatFilter === 'image'
                                            ? 'bg-white text-neutral-900 font-bold shadow-2xs'
                                            : 'text-neutral-600 hover:text-neutral-900'
                                    }`}
                                >
                                    <Images size={12} weight="bold" className="text-blue-500" />
                                    <span>{t('Có media')}</span>
                                </button>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Template List Container */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-neutral-50/50">
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-white border border-neutral-200/80 space-y-2">
                                        <Skeleton className="h-4 w-1/3 rounded" />
                                        <Skeleton className="h-3 w-3/4 rounded" />
                                        <Skeleton className="h-8 w-24 rounded-lg mt-2" />
                                    </div>
                                ))}
                            </div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="py-12 px-4 text-center bg-white rounded-2xl border border-neutral-200/80">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 mx-auto mb-3">
                                    <Quotes size={24} weight="duotone" />
                                </div>
                                <h3 className="text-sm font-bold text-neutral-900">
                                    {search
                                        ? t('Không tìm thấy mẫu bài viết phù hợp')
                                        : t('Chưa có mẫu bài viết nào')}
                                </h3>
                                <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                                    {search
                                        ? t('Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc định dạng.')
                                        : t('Bạn có thể soạn bài viết và nhấn "Lưu thành mẫu" ở thanh công cụ bên dưới để tái sử dụng sau này.')}
                                </p>
                                <div className="mt-4 flex items-center justify-center gap-2">
                                    <Link
                                        to="/templates/create"
                                        onClick={() => setOpen(false)}
                                        className="btn-skew text-xs px-3 py-1.5"
                                    >
                                        <Plus size={14} weight="bold" />
                                        <span>{t('Tạo mẫu mới')}</span>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {filteredTemplates.map((template) => {
                                    const isApplying = applyingId === template.id;
                                    const mediaCount = (template.media_ids || []).length;
                                    const accountsCount = (template.account_ids || []).length;

                                    return (
                                        <div
                                            key={template.id}
                                            className="p-4 rounded-2xl bg-white border border-neutral-200/80 hover:border-neutral-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                        >
                                            <div className="space-y-1.5 min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="text-sm font-bold text-neutral-900 truncate">
                                                        {template.name}
                                                    </h4>
                                                    {mediaCount > 0 ? (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 text-[10px] font-semibold">
                                                            <Images size={11} weight="bold" />
                                                            {mediaCount} media
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200 px-1.5 py-0.5 text-[10px] font-medium">
                                                            <FileText size={11} />
                                                            {t('Văn bản')}
                                                        </span>
                                                    )}
                                                    {accountsCount > 0 && (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 text-neutral-600 px-1.5 py-0.5 text-[10px] font-mono">
                                                            <ShareNetwork size={11} />
                                                            {accountsCount} kênh
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                                                    {template.caption || template.title || t('(Mẫu không có nội dung văn bản)')}
                                                </p>
                                            </div>

                                            <div className="shrink-0 flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled={isApplying || applyingId !== null}
                                                    onClick={() => applyTemplate(template)}
                                                    className="btn-skew text-xs h-8 px-3.5 shadow-2xs whitespace-nowrap cursor-pointer disabled:opacity-50"
                                                >
                                                    <Check size={13} weight="bold" />
                                                    <span>{t(isApplying ? 'Đang áp dụng…' : 'Dùng mẫu này')}</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3.5 px-5 border-t border-neutral-100 bg-white flex items-center justify-between text-xs text-neutral-500 shrink-0">
                        <span>
                            {t('Tổng cộng')} <strong className="text-neutral-900 font-semibold">{filteredTemplates.length}</strong> {t('mẫu bài viết')}
                        </span>
                        <Link
                            to="/templates"
                            onClick={() => setOpen(false)}
                            className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:underline"
                        >
                            {t('Quản lý tất cả mẫu →')}
                        </Link>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

