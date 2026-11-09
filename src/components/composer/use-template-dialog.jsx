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
    Eye,
    Globe,
    ChatText,
    ArrowRight,
    Sparkle,
    CaretRight,
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
import { PLATFORM_CONFIG } from '@/components/common/PlatformBadge';
import { referencedMediaIds } from '@/lib/publishing-content';

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
    const [accounts, setAccounts] = useState([]);
    const [mediaMap, setMediaMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [applyingId, setApplyingId] = useState(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);
    const [mobileTab, setMobileTab] = useState('list'); // 'list' | 'preview'

    const [search, setSearch] = useState('');
    const [formatFilter, setFormatFilter] = useState('all'); // 'all' | 'text' | 'image'

    // Fetch templates & accounts when opened
    useEffect(() => {
        if (!open) return;
        let active = true;
        setLoading(true);

        const query = { is_demo: demoMode };
        if (brandId && brandId !== 'all') {
            query.brand_id = brandId;
        }

                Promise.all([
                    appClient.entities.PostTemplate.filter(query, { sort: '-updated_date', limit: 100 }),
                    appClient.entities.SocialAccount.filter({ is_demo: demoMode }, { limit: 150 }).catch(() => ({ items: [] })),
                ])
                    .then(([resTemplates, resAccounts]) => {
                        if (!active) return;
                        const items = resTemplates.items || [];
                        setTemplates(items);
                        setAccounts(resAccounts.items || []);
                        if (items.length > 0) {
                            setSelectedTemplateId((prev) => (prev && items.some((it) => it.id === prev) ? prev : items[0].id));
                        }
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

        // Resolve media for templates
        useEffect(() => {
            if (!templates.length) {
                setMediaMap({});
                return;
            }
            const ids = [...new Set(templates.flatMap((item) => referencedMediaIds(item)))].filter(Boolean);
            if (!ids.length) {
                setMediaMap({});
                return;
            }

            let active = true;
            appClient.entities.MediaAsset.filter({ id: { $in: ids } }, { limit: 100 })
                .then((page) => {
                    if (!active) return;
                    const map = {};
                    page.items?.forEach((m) => {
                        map[m.id] = m;
                    });
                    setMediaMap(map);
                })
                .catch(() => { });

            return () => {
                active = false;
            };
        }, [templates]);

        // Format helper
        const getFormatType = (tmpl) => {
            const hasMedia = (tmpl.media_ids || []).length > 0 || Object.values(tmpl.platform_media_ids || {}).some((ids) => ids?.length > 0);
            if (!hasMedia) return 'text';
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

        // Selected template object
        const selectedTemplate = useMemo(() => {
            if (!filteredTemplates.length) return null;
            return filteredTemplates.find((t) => t.id === selectedTemplateId) || filteredTemplates[0];
        }, [filteredTemplates, selectedTemplateId]);

        // Map account IDs to account details
        const accountsById = useMemo(() => {
            const map = new Map();
            accounts.forEach((acc) => map.set(acc.id, acc));
            return map;
        }, [accounts]);

        async function applyTemplate(template) {
            if (!template) return;
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
                        <DialogContent className="max-w-5xl sm:max-w-5xl w-[95vw] h-[90vh] max-h-[850px] flex flex-col p-0 overflow-hidden rounded-3xl bg-white border border-neutral-200/90 shadow-2xl">
                            {/* Header */}
                                        <DialogHeader className="p-4 sm:p-5 pb-3.5 border-b border-neutral-200 bg-zinc-50/70 shrink-0">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                                        <Quotes size={18} weight="bold" />
                                                    </span>
                                                    <div>
                                                        <DialogTitle className="text-base font-heading font-bold text-zinc-900 flex items-center gap-2">
                                                            <span>{t('Chọn mẫu bài viết để tạo bài')}</span>
                                                            <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700 hidden sm:inline-block">
                                                                {filteredTemplates.length} {t('mẫu khả dụng')}
                                                            </span>
                                                        </DialogTitle>
                                                        <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                                                            {t('Xem trước mô phỏng bài viết thực tế và áp dụng tự động vào khung soạn thảo.')}
                                                        </DialogDescription>
                                                    </div>
                                                </div>

                                                    {/* Mobile Tabs Switcher */}
                                                    <div className="flex md:hidden items-center bg-zinc-200 p-0.5 rounded-xl text-xs font-semibold">
                                                        <button
                                                            type="button"
                                    onClick={() => setMobileTab('list')}
                                                            className={`px-3 py-1 rounded-lg transition ${mobileTab === 'list' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600'
                                                                }`}
                                                        >
                                                            {t('Danh sách')}
                                                        </button>
                                                        <button
                                                            type="button"
                                    onClick={() => setMobileTab('preview')}
                                                            className={`px-3 py-1 rounded-lg transition ${mobileTab === 'preview' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600'
                                                                }`}
                                                        >
                                                            {t('Xem trước')}
                                                        </button>
                                                    </div>
                                                </div>
                                        </DialogHeader>

                                                        {/* Master-Detail 2 Columns Container */}
                                                        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-neutral-200 overflow-hidden bg-neutral-50/30">
                                                            {/* ============================================================== */}
                                                            {/* CỘT TRÁI (MASTER): TÌM KIẾM & DANH SÁCH MẪU                     */}
                                                            {/* ============================================================== */}
                                                            <div
                                                                className={`md:col-span-5 flex flex-col min-h-0 bg-white md:flex ${mobileTab === 'list' ? 'flex' : 'hidden'
                                                                    }`}
                                                            >
                                                                {/* Search & Filter Bar */}
                                                                <div className="p-3.5 border-b border-neutral-100 space-y-2 bg-white shrink-0">
                                                                    <div className="relative">
                                                                        <MagnifyingGlass
                                                                            size={14}
                                                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                                                                        />
                                                                        <Input
                                                                            value={search}
                                                                            onChange={(e) => setSearch(e.target.value)}
                                                                            placeholder={t('Tìm kiếm mẫu theo tên, nội dung…')}
                                                                            className="h-8.5 w-full rounded-xl border border-neutral-200 bg-neutral-50/70 pl-8.5 pr-8 text-xs focus:bg-white"
                                                                        />
                                                                        {search && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setSearch('')}
                                                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5"
                                                                            >
                                                                                <X size={13} />
                                                                            </button>
                                                                        )}
                                                                    </div>

                                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setFormatFilter('all')}
                                                                                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer font-medium ${formatFilter === 'all'
                                                                                        ? 'bg-zinc-900 text-white font-bold shadow-2xs'
                                                                                        : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                                                                                    }`}
                                                                            >
                                                                            {t('Tất cả')} ({templates.length})
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setFormatFilter('text')}
                                                                            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 font-medium ${formatFilter === 'text'
                                                                                    ? 'bg-zinc-900 text-white font-bold shadow-2xs'
                                                                                    : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                                                                                }`}
                                                                        >
                                                                            <FileText size={12} weight="bold" />
                                                                            <span>{t('Chỉ chữ')}</span>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setFormatFilter('image')}
                                                                            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 font-medium ${formatFilter === 'image'
                                                                                    ? 'bg-zinc-900 text-white font-bold shadow-2xs'
                                                                                    : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                                                                                }`}
                                                                        >
                                                                            <Images size={12} weight="bold" />
                                                                            <span>{t('Có media')}</span>
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                                            {/* Scrollable Templates List */}
                                                                                            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-neutral-50/50">
                                                                                                {loading ? (
                                                                                                    <div className="space-y-2.5">
                                                                                                        {[1, 2, 3, 4].map((i) => (
                                                                                                            <div key={i} className="p-3.5 rounded-2xl bg-white border border-neutral-200/80 space-y-2">
                                                                                                                <Skeleton className="h-4 w-2/5 rounded" />
                                                                                                                <Skeleton className="h-3 w-4/5 rounded" />
                                                                                                                <Skeleton className="h-3 w-1/2 rounded" />
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                ) : filteredTemplates.length === 0 ? (
                                                                                                    <div className="py-12 px-4 text-center bg-white rounded-2xl border border-neutral-200/80">
                                                                                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 mx-auto mb-2.5">
                                                                                                            <Quotes size={20} weight="duotone" />
                                                                                                        </div>
                                                                                                        <h3 className="text-xs font-bold text-neutral-900">
                                                                                                            {search ? t('Không tìm thấy mẫu phù hợp') : t('Chưa có mẫu bài viết nào')}
                                                                                                        </h3>
                                                                                                        <p className="text-[11px] text-neutral-500 mt-1 max-w-xs mx-auto">
                                                                                                            {search
                                                                                                                ? t('Thử tìm kiếm với từ khóa khác hoặc bỏ lọc.')
                                                                                                                : t('Bạn có thể soạn bài viết và nhấn "Lưu thành mẫu" để tái sử dụng.')}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    filteredTemplates.map((tmpl) => {
                                                                                                        const isSelected = selectedTemplate?.id === tmpl.id;
                                                                                                        const mediaCount = (tmpl.media_ids || []).length;
                                                                                                        const accountsCount = (tmpl.account_ids || []).length;

                                                                                                        return (
                                                                                                            <div
                                                                                                                key={tmpl.id}
                                                                                                                onClick={() => {
                                                                                                                    setSelectedTemplateId(tmpl.id);
                                                                                                                    setMobileTab('preview');
                                                                                                                }}
                                                                                                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${isSelected
                                                                                                                        ? 'bg-white border-zinc-900 ring-2 ring-zinc-900/10 shadow-sm'
                                                                                                                        : 'bg-white border-neutral-200/80 hover:border-neutral-300 hover:bg-neutral-50/50 shadow-2xs'
                                                                                                                    }`}
                                                                                                            >
                                                                                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                                                                                    <h4 className="text-xs font-heading font-bold text-zinc-900 truncate flex-1">
                                                                                                                        {tmpl.name || tmpl.title || t('Mẫu không tên')}
                                                                                                                    </h4>
                                                    {isSelected ? (
                                                        <span className="inline-flex items-center gap-1 rounded bg-zinc-900 text-white text-[10px] font-semibold px-1.5 py-0.5 shrink-0">
                                                            <Check size={10} weight="bold" />
                                                            {t('Đang chọn')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-neutral-400 hover:text-neutral-700">
                                                            <CaretRight size={13} />
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-[11.5px] text-neutral-600 line-clamp-2 leading-relaxed">
                                                    {tmpl.caption || tmpl.title || t('(Mẫu không có nội dung văn bản)')}
                                                </p>

                                                <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between text-[10.5px] text-neutral-500">
                                                    <div className="flex items-center gap-1 font-mono">
                                                        {accountsCount > 0 ? (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700">
                                                                <ShareNetwork size={11} />
                                                                {accountsCount} {t('kênh')}
                                                            </span>
                                                        ) : (
                                                            <span className="text-neutral-400">{t('Chung')}</span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        {mediaCount > 0 ? (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 font-mono font-medium">
                                                                <Images size={11} weight="bold" />
                                                                {mediaCount} ảnh/media
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-mono">
                                                                <FileText size={11} />
                                                                {t('Văn bản')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Footer Cột Trái */}
                            <div className="p-3 px-4 border-t border-neutral-200 bg-white flex items-center justify-between text-xs text-neutral-500 shrink-0">
                                <span>
                                    {t('Tổng cộng')} <strong className="text-neutral-900 font-semibold">{filteredTemplates.length}</strong> {t('mẫu')}
                                </span>
                                <Link
                                    to="/templates"
                                    onClick={() => setOpen(false)}
                                    className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:underline"
                                >
                                    {t('Quản lý kho mẫu →')}
                                </Link>
                            </div>
                        </div>

                        {/* ============================================================== */}
                                                                                                                    {/* CỘT PHẢI (DETAIL): LIVE POST PREVIEW & ACTION                  */}
                                                                                                                    {/* ============================================================== */}
                                                                                                                    <div
                                                                                                                        className={`md:col-span-7 flex flex-col min-h-0 bg-white md:flex ${mobileTab === 'preview' ? 'flex' : 'hidden'
                                                                                                                            }`}
                                                                                                                    >
                                                                                                                        {selectedTemplate ? (
                                                                                                                            <div className="flex-1 flex flex-col min-h-0 justify-between">
                                                                                                                                {/* Preview Header Info */}
                                                                                                                                <div className="p-4 border-b border-neutral-200 bg-zinc-50/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
                                                                                                                                    <div className="flex items-center gap-2">
                                                                                                                                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                                                                                                                                        <span className="text-xs font-heading font-bold text-zinc-900 uppercase tracking-wider">
                                                                                                                                            {t('Mô phỏng bài viết thực tế (Live Preview)')}
                                                                                                                                        </span>
                                                                                                                                    </div>

                                                                                                                                    {/* Kênh phân phối */}
                                                                                                                                    <div className="flex items-center gap-1.5">
                                                                                                                                        {(selectedTemplate.account_ids || []).length > 0 ? (
                                                                                                                                            <div className="flex items-center gap-1">
                                                                                                                                                {(selectedTemplate.account_ids || []).map((accId) => {
                                                                                                                                                    const acc = accountsById.get(accId);
                                                                                                                                                    const cfg = acc ? PLATFORM_CONFIG[acc.platform] : null;
                                                                                                                                                    return (
                                                                                                                                                        <span
                                                                                                                                                            key={accId}
                                                                                                                                                            title={acc?.name || acc?.platform}
                                                                                                                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-[11px] font-medium text-zinc-700 shadow-2xs"
                                                                                                                                                        >
                                                                                                                                                            {cfg && <span className="font-bold text-xs">{cfg.icon || '🌐'}</span>}
                                                                                                                                                            <span>{acc?.name || acc?.platform || 'Kênh'}</span>
                                                                                                                                                        </span>
                                                                                                                                                    );
                                                                                                                                                })}
                                                                                                                                            </div>
                                                                                                                                        ) : (
                                                                                                                                            <span className="text-[11px] text-zinc-500 font-mono">
                                                                                                                                                {t('Áp dụng cho mọi kênh đã chọn')}
                                                                                                                                            </span>
                                                                                                                                        )}
                                                                                                                                    </div>
                                                                                                                                </div>

                                                                                                                                {/* Preview Content Canvas */}
                                                                                                                                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-zinc-50/40">
                                                                                                                                    {/* Social Mockup Card */}
                                                                                                                                    <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm p-4 sm:p-5 space-y-3.5">
                                                                                                                                        {/* Author header */}
                                                                                                                                        <div className="flex items-center gap-3">
                                                                                                                                            <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                                                                                                                                                S
                                                                                                                                            </div>
                                                                                                                                            <div>
                                                                                                                                                <div className="text-xs sm:text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                                                                                                                                                    <span>Socialchoice Composer</span>
                                                                                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                                                                                                </div>
                                                                                                                                                <div className="text-[11px] text-zinc-400 font-mono">
                                                                                                                                                    {t('Vừa xong')} · 🌐 {t('Công khai')}
                                                                                                                                                </div>
                                                                                                                                            </div>
                                                                                                                                        </div>

                                                                                                                                        {/* Caption Text */}
                                                                                                                                        <div className="text-xs sm:text-[13px] text-zinc-800 leading-relaxed whitespace-pre-wrap font-sans break-words select-text">
                                                                                                                                            {selectedTemplate.caption || (
                                                                                                                                                <span className="italic text-zinc-400">
                                                                                                                                                    {t('(Mẫu này không có văn bản caption)')}
                                                                                                                                                </span>
                                                                                                                                            )}
                                                                                                                                        </div>

                                                                                                                                        {/* Media Rendering */}
                                                                                                                                        {(() => {
                                                                                                                                            const mediaIds = referencedMediaIds(selectedTemplate);
                                                                                                                                            if (!mediaIds.length) {
                                                                                                                                                return (
                                                                                                                                                    <div className="p-3 rounded-xl bg-zinc-50 border border-dashed border-zinc-200 text-center text-xs text-zinc-400 font-mono">
                                                                                                                                                        {t('[ Mẫu thuần văn bản · Không đính kèm media ]')}
                                                                                                                                                    </div>
                                                                                                                                                );
                                                                                                                                            }

                                                                                                                                            return (
                                                                                                                                                <div className="space-y-2">
                                                                                                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                                                                                                        {mediaIds.map((mId, idx) => {
                                                                                                                                                            const asset = mediaMap[mId];
                                                                                                                                                            const url = asset?.thumbnail_url || asset?.file_url;
                                                                                                                                                            return (
                                                                                                                                                                <div
                                                                                                                                                                    key={mId || idx}
                                                                                                                                                                    className="relative h-44 rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center group"
                                                                                                                                                                >
                                                                                                                                                                    {url ? (
                                                                                                                                                                        <img
                                                                                                                                                                            src={url}
                                                                                                                                                                            alt={asset?.filename || 'Media'}
                                                                                                                                                                            className="w-full h-full object-cover"
                                                                                                                                                                            referrerPolicy="no-referrer"
                                                                                                                                                                            onError={(e) => {
                                                                                                                                                                                e.currentTarget.style.display = 'none';
                                                                                                                                                                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                                                                                                                                            }}
                                                                                                                                                                        />
                                                                                                                                                                    ) : null}
                                                                                                                                                                    <div
                                                                                                                                                                        className={`${url ? 'hidden' : 'flex'
                                                                                                                                                                            } flex-col items-center justify-center text-zinc-400 text-xs font-mono gap-1`}
                                                                                                                                                                    >
                                                                                                                                                                        <Images size={24} weight="duotone" />
                                                                                                                                                                        <span>{asset?.filename || `Ảnh đính kèm #${idx + 1}`}</span>
                                                                                                                                                                    </div>
                                                                                                                                                                </div>
                                                                                                                                                            );
                                                                                                                                                        })}
                                                                                                                                                    </div>
                                                                                                                                                    <div className="text-[10.5px] text-zinc-400 font-mono text-right">
                                                                                                                                                        {mediaIds.length} {t('tệp media đính kèm')}
                                                                                                                                                    </div>
                                                                                                                                                </div>
                                                                                                                                            );
                                                                                                                                        })()}

                                                                                                                                        {/* Pinned First Comment */}
                                                                                                                                        {selectedTemplate.first_comment && (
                                                                                                                                            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 flex items-start gap-2.5">
                                                                                                                                                <ChatText size={16} weight="duotone" className="text-zinc-600 shrink-0 mt-0.5" />
                                                                                                                                                <div className="space-y-0.5">
                                                                                                                                                    <span className="font-bold text-zinc-900 text-[11px] block">
                                                                                                                                                        {t('Bình luận ghim tự động:')}
                                                                                                                                                    </span>
                                                                                                                                                    <p className="text-[11.5px] text-zinc-600 leading-relaxed">
                                                                                                                                                        {selectedTemplate.first_comment}
                                                                                                                                                    </p>
                                                                                                                                                </div>
                                                                                                                                            </div>
                                                                                                                                        )}
                                                                                                                                    </div>
                                    </div>

                                                                                                                        {/* Detail Action Footer */}
                                                                                                                        <div className="p-3.5 sm:p-4 px-6 border-t border-neutral-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                                                                                                                            <div className="text-xs text-zinc-500 font-mono hidden lg:block">
                                                                                                                                {t('Áp dụng sẽ tự động nạp tiêu đề, caption, ảnh và kênh vào bài viết.')}
                                                                                                                            </div>

                                                                                                                            <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
                                                                                                                                <Button
                                                                                                                                    type="button"
                                                                                                                                    variant="outline"
                                                                                                                                    size="sm"
                                                                                                                                    onClick={() => setOpen(false)}
                                                                                                                                    className="rounded-xl border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 cursor-pointer h-9 px-4"
                                                                                                                                >
                                                                                                                                    {t('Đóng')}
                                                                                                                                </Button>

                                                                                                                                <Button
                                                                                                                                    type="button"
                                                                                                                                    disabled={applyingId !== null}
                                                                                                                                    onClick={() => applyTemplate(selectedTemplate)}
                                                                                                                                    className="btn-skew h-9 px-5 text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                                                                                                                                >
                                                                                                                                    <Check size={14} weight="bold" />
                                                                                                                                    <span>
                                                                                                                                        {applyingId === selectedTemplate.id
                                                                                                                                            ? t('Đang áp dụng…')
                                                                                                                                            : t('Dùng mẫu này để tạo bài')}
                                                                                                                                    </span>
                                                                                                                                </Button>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                    ) : (
                                                                                                                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
                                                                                                                        <Quotes size={32} weight="duotone" className="mb-2 text-zinc-300" />
                                                                                                                        <p className="text-xs">{t('Chọn một mẫu bài viết ở cột bên trái để xem trước.')}</p>
                                                                                                                    </div>
                            )}
                                                                                                                </div>
                                                                                                            </div>
                </DialogContent>
                                                                                        </Dialog>
                                                                                    </>
                                                                                    );
}
