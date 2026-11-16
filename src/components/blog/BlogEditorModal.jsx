import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import {
    X,
    ImageSquare,
    Sparkle,
    TextB,
    TextItalic,
    TextHTwo,
    Quotes,
    ListBullets,
    LinkSimple,
    Eye,
    PencilSimple,
    Check,
    UploadSimple,
} from '@phosphor-icons/react';

const COVER_PRESETS = [
    { label: 'Công nghệ & Marketing', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80' },
    { label: 'Tự động hóa & Số liệu', url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&auto=format&fit=crop&q=80' },
    { label: 'Làm việc nhóm & Kế hoạch', url: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=1200&auto=format&fit=crop&q=80' },
    { label: 'Biểu đồ & Tăng trưởng', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80' },
    { label: 'Mạng xã hội đa kênh', url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&auto=format&fit=crop&q=80' },
    { label: 'Sáng tạo nội dung', url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&auto=format&fit=crop&q=80' },
];

const CATEGORY_OPTIONS = [
    'Chiến lược Marketing',
    'Thuật toán Mạng xã hội',
    'Tự động hóa & Lead',
    'Kinh nghiệm thực chiến',
    'Case Study & Tăng trưởng',
    'Cập nhật tính năng',
];

export default function BlogEditorModal({
    isOpen,
    onClose,
    onSave,
    initialData = null,
}) {
    const { t } = useTranslation();

    const [title, setTitle] = useState(initialData?.title || '');
    const [category, setCategory] = useState(initialData?.category || CATEGORY_OPTIONS[0]);
    const [customCategory, setCustomCategory] = useState('');
    const [excerpt, setExcerpt] = useState(initialData?.excerpt || '');
    const [coverImage, setCoverImage] = useState(initialData?.coverImage || COVER_PRESETS[0].url);
    const [authorName, setAuthorName] = useState(initialData?.author?.name || 'Mây Creative');
    const [authorRole, setAuthorRole] = useState(initialData?.author?.role || 'Content Creator');
    const [tagsText, setTagsText] = useState((initialData?.tags || ['Socialchoice', 'Marketing']).join(', '));
    const [content, setContent] = useState(initialData?.content || '');
    const [tab, setTab] = useState('edit'); // 'edit' | 'preview'
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const insertFormat = (prefix, suffix = '') => {
        const textarea = document.getElementById('blog-content-area');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = content.substring(start, end) || 'nội dung';
        const next = content.substring(0, start) + prefix + selected + suffix + content.substring(end);
        setContent(next);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
        }, 50);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) {
            setError(t('Vui lòng nhập tiêu đề bài viết'));
            return;
        }
        if (!content.trim()) {
            setError(t('Vui lòng nhập nội dung bài viết'));
            return;
        }

        const tags = tagsText
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);

        const finalCategory = category === 'Khác' && customCategory.trim() ? customCategory.trim() : category;

        const postData = {
            ...(initialData || {}),
            title: title.trim(),
            category: finalCategory,
            excerpt: excerpt.trim() || title.trim(),
            coverImage: coverImage.trim() || COVER_PRESETS[0].url,
            author: {
                name: authorName.trim() || 'Tác giả Socialchoice',
                role: authorRole.trim() || 'Marketer',
                avatar: initialData?.author?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            },
            tags: tags.length > 0 ? tags : ['Socialchoice'],
            content: content.trim(),
        };

        onSave(postData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-2xl my-8 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/80 pb-3 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <span className="flex size-8 items-center justify-center rounded-xl bg-brand border border-brand-dark text-brand-ink">
                            <PencilSimple size={18} weight="bold" />
                        </span>
                        <div>
                            <h3 className="text-sm sm:text-base font-bold font-heading text-foreground">
                                {initialData ? t('Chỉnh sửa bài viết') : t('Viết bài mới & Chia sẻ lên Blog')}
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                                {t('Đăng tải kinh nghiệm, hướng dẫn, chiến lược marketing tiếp cận độc giả')}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="size-8 rounded-lg text-muted-foreground hover:bg-muted grid place-items-center cursor-pointer transition"
                    >
                        <X size={16} />
                    </button>
                </div>

                {error && (
                    <div className="p-3 rounded-xl border border-rose-300 bg-rose-50 text-xs text-rose-800 font-medium">
                        {error}
                    </div>
                )}

                {/* Form Body - Scrollable */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {/* View Switcher: Edit vs Preview */}
                    <div className="flex items-center justify-between border-b border-border pb-2">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setTab('edit')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                    tab === 'edit'
                                        ? 'bg-brand border border-brand-dark text-brand-ink shadow-2xs'
                                        : 'bg-surface border border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <PencilSimple size={14} />
                                <span>{t('Soạn thảo')}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab('preview')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                    tab === 'preview'
                                        ? 'bg-brand border border-brand-dark text-brand-ink shadow-2xs'
                                        : 'bg-surface border border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Eye size={14} />
                                <span>{t('Xem trước (Preview)')}</span>
                            </button>
                        </div>
                    </div>

                    {tab === 'edit' ? (
                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="text-xs font-bold text-foreground block mb-1">
                                    {t('Tiêu đề bài viết')} <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => {
                                        setTitle(e.target.value);
                                        setError('');
                                    }}
                                    placeholder={t('Ví dụ: 5 Cách tăng tương tác Facebook tự nhiên 2026...')}
                                    className="w-full rounded-xl border border-border bg-surface/40 px-3.5 py-2 text-sm font-semibold text-foreground outline-none focus:border-brand-dark focus:bg-card transition"
                                />
                            </div>

                            {/* Category & Tags */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-foreground block mb-1">
                                        {t('Chủ đề / Danh mục')}
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full rounded-xl border border-border bg-surface/40 px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-brand-dark"
                                    >
                                        {CATEGORY_OPTIONS.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                        <option value="Khác">{t('Khác (Tự nhập...)')}</option>
                                    </select>
                                    {category === 'Khác' && (
                                        <input
                                            type="text"
                                            value={customCategory}
                                            onChange={(e) => setCustomCategory(e.target.value)}
                                            placeholder={t('Nhập tên danh mục mới...')}
                                            className="w-full mt-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-brand-dark"
                                        />
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-foreground block mb-1">
                                        {t('Tags từ khóa (cách nhau bằng dấu phẩy)')}
                                    </label>
                                    <input
                                        type="text"
                                        value={tagsText}
                                        onChange={(e) => setTagsText(e.target.value)}
                                        placeholder="Marketing, Facebook, Tips, SEO..."
                                        className="w-full rounded-xl border border-border bg-surface/40 px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-brand-dark"
                                    />
                                </div>
                            </div>

                            {/* Excerpt */}
                            <div>
                                <label className="text-xs font-bold text-foreground block mb-1">
                                    {t('Tóm tắt ngắn (Excerpt)')}
                                </label>
                                <textarea
                                    value={excerpt}
                                    onChange={(e) => setExcerpt(e.target.value)}
                                    rows={2}
                                    placeholder={t('Đoạn mô tả ngắn gọn 1-2 câu về nội dung bài viết để hiển thị trên thẻ bài...')}
                                    className="w-full rounded-xl border border-border bg-surface/40 px-3 py-2 text-xs text-foreground outline-none resize-none focus:border-brand-dark focus:bg-card transition"
                                />
                            </div>

                            {/* Cover Image & Presets */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                                    <span>{t('Ảnh bìa bài viết (Cover Image URL)')}</span>
                                    <span className="text-[11px] text-muted-foreground font-normal">
                                        {t('Chọn ảnh mẫu bên dưới hoặc dán link ảnh')}
                                    </span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="url"
                                        value={coverImage}
                                        onChange={(e) => setCoverImage(e.target.value)}
                                        placeholder="https://images.unsplash.com/photo-..."
                                        className="flex-1 rounded-xl border border-border bg-surface/40 px-3 py-1.5 text-xs text-foreground outline-none focus:border-brand-dark"
                                    />
                                </div>

                                {/* Preset Thumbnails */}
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                                    {COVER_PRESETS.map((p, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setCoverImage(p.url)}
                                            className={`group relative aspect-video rounded-lg overflow-hidden border transition cursor-pointer ${
                                                coverImage === p.url
                                                    ? 'ring-2 ring-brand-dark border-brand-dark scale-105'
                                                    : 'border-border/80 opacity-75 hover:opacity-100'
                                            }`}
                                        >
                                            <img src={p.url} alt={p.label} className="size-full object-cover" />
                                            {coverImage === p.url && (
                                                <span className="absolute inset-0 bg-brand/30 flex items-center justify-center text-brand-ink font-bold">
                                                    <Check size={14} weight="bold" />
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Author Information */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-border bg-surface/30">
                                <div>
                                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                                        {t('Tên tác giả')}
                                    </label>
                                    <input
                                        type="text"
                                        value={authorName}
                                        onChange={(e) => setAuthorName(e.target.value)}
                                        placeholder="Mây Creative / Tên của bạn"
                                        className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-brand-dark"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                                        {t('Vai trò / Chức vụ')}
                                    </label>
                                    <input
                                        type="text"
                                        value={authorRole}
                                        onChange={(e) => setAuthorRole(e.target.value)}
                                        placeholder="Content Creator / Marketer"
                                        className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-brand-dark"
                                    />
                                </div>
                            </div>

                            {/* Markdown Toolbar & Content Area */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-foreground">
                                        {t('Nội dung bài viết (Hỗ trợ Markdown)')} <span className="text-rose-500">*</span>
                                    </label>
                                    {/* Formatting Toolbar */}
                                    <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0.5 text-xs">
                                        <button
                                            type="button"
                                            title="Tiêu đề mục (H2)"
                                            onClick={() => insertFormat('\n\n### ', '\n')}
                                            className="size-6 grid place-items-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            <TextHTwo size={14} weight="bold" />
                                        </button>
                                        <button
                                            type="button"
                                            title="Chữ đậm"
                                            onClick={() => insertFormat('**', '**')}
                                            className="size-6 grid place-items-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            <TextB size={14} weight="bold" />
                                        </button>
                                        <button
                                            type="button"
                                            title="Chữ nghiêng"
                                            onClick={() => insertFormat('*', '*')}
                                            className="size-6 grid place-items-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            <TextItalic size={14} weight="bold" />
                                        </button>
                                        <button
                                            type="button"
                                            title="Trích dẫn"
                                            onClick={() => insertFormat('\n> ', '\n')}
                                            className="size-6 grid place-items-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            <Quotes size={14} weight="bold" />
                                        </button>
                                        <button
                                            type="button"
                                            title="Danh sách gạch đầu dòng"
                                            onClick={() => insertFormat('\n- ', '\n')}
                                            className="size-6 grid place-items-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            <ListBullets size={14} weight="bold" />
                                        </button>
                                        <button
                                            type="button"
                                            title="Chèn link"
                                            onClick={() => insertFormat('[Tiêu đề link](', ')')}
                                            className="size-6 grid place-items-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            <LinkSimple size={14} weight="bold" />
                                        </button>
                                    </div>
                                </div>

                                <textarea
                                    id="blog-content-area"
                                    value={content}
                                    onChange={(e) => {
                                        setContent(e.target.value);
                                        setError('');
                                    }}
                                    rows={10}
                                    placeholder={t('Viết nội dung bài viết của bạn tại đây... Hỗ trợ tiêu đề ###, trích dẫn >, gạch đầu dòng -, và chèn link.')}
                                    className="w-full rounded-xl border border-border bg-surface/40 p-3.5 text-xs text-foreground outline-none font-mono leading-relaxed focus:border-brand-dark focus:bg-card transition"
                                />
                            </div>
                        </div>
                    ) : (
                        /* Live Preview */
                        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
                            <span className="rounded-full bg-brand/25 border border-brand-dark/40 px-3 py-0.5 text-xs font-bold text-brand-ink">
                                {category}
                            </span>
                            <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-foreground">
                                {title || t('(Chưa có tiêu đề)')}
                            </h2>
                            <div className="flex items-center gap-2.5 text-xs text-muted-foreground border-b border-border/80 pb-3">
                                <span>{authorName} ({authorRole})</span>
                                <span>·</span>
                                <span>{t('Hôm nay')}</span>
                            </div>
                            {coverImage && (
                                <img
                                    src={coverImage}
                                    alt={title}
                                    className="w-full aspect-video max-h-[300px] object-cover rounded-xl border border-border"
                                />
                            )}
                            <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed space-y-2 font-body">
                                {content || t('(Chưa có nội dung)')}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between border-t border-border/80 pt-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                    >
                        {t('Hủy bỏ')}
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="btn-skew flex items-center gap-1.5 !py-2 !px-5 text-xs font-bold cursor-pointer"
                    >
                        <span>{initialData ? t('Lưu thay đổi') : t('Xuất bản bài viết ngay')}</span>
                        <Sparkle size={14} weight="bold" />
                    </button>
                </div>
            </div>
        </div>
    );
}
