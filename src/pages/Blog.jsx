import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import BlogEditorModal from '@/components/blog/BlogEditorModal';
import PublicBlogHeader from '@/components/blog/PublicBlogHeader';
import PublicBlogFooter from '@/components/blog/PublicBlogFooter';
import {
    getBlogPosts,
    saveBlogPost,
    deleteBlogPost,
    likeBlogPost,
    getBlogCategories,
} from '@/lib/blog-service';
import {
    PencilSimple,
    MagnifyingGlass,
    Sparkle,
    Clock,
    Eye,
    Heart,
    ShareNetwork,
    LinkSimple,
    ArrowRight,
    Tag,
    Trash,
    Article,
    EnvelopeSimple,
    PaperPlaneRight,
    CheckCircle,
} from '@phosphor-icons/react';

export default function Blog({ inWorkspace = false }) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [posts, setPosts] = useState(() => getBlogPosts());
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [newsletterDone, setNewsletterDone] = useState(false);

    // Refresh posts from service
    const refreshPosts = () => {
        setPosts(getBlogPosts());
    };

    const categories = useMemo(() => getBlogCategories(), [posts]);

    // Filtered posts
    const filteredPosts = useMemo(() => {
        return posts.filter((p) => {
            const matchesCat = selectedCategory === 'Tất cả' || p.category === selectedCategory;
            const query = searchQuery.trim().toLowerCase();
            const matchesQuery =
                !query ||
                p.title.toLowerCase().includes(query) ||
                p.excerpt.toLowerCase().includes(query) ||
                (p.tags || []).some((t) => t.toLowerCase().includes(query)) ||
                (p.author?.name || '').toLowerCase().includes(query);
            return matchesCat && matchesQuery;
        });
    }, [posts, selectedCategory, searchQuery]);

    // Featured Hero post (the top featured post or the latest one)
    const featuredPost = useMemo(() => {
        return posts.find((p) => p.isFeatured) || posts[0];
    }, [posts]);

    const handleSavePost = (data) => {
        const saved = saveBlogPost(data);
        refreshPosts();
        toast({
            title: t('Đã xuất bản bài viết thành công!'),
            description: t('Bài viết đã xuất hiện trên trang Blog và sẵn sàng chia sẻ.'),
        });
    };

    const handleDeletePost = (id, e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        if (window.confirm(t('Bạn có chắc chắn muốn xóa bài viết này không?'))) {
            deleteBlogPost(id);
            refreshPosts();
            toast({ title: t('Đã xóa bài viết thành công') });
        }
    };

    const handleLike = (id, e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        const updated = likeBlogPost(id);
        if (updated) {
            refreshPosts();
            toast({ title: t('Đã thả tim bài viết! ❤️') });
        }
    };

    const handleCopyShare = (slug, e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        const url = `${window.location.origin}/blog/${slug}`;
        navigator.clipboard?.writeText?.(url);
        toast({ title: t('Đã sao chép link bài viết vào clipboard!') });
    };

    const handleNewsletterSubmit = (e) => {
        e.preventDefault();
        if (!newsletterEmail || !newsletterEmail.includes('@')) {
            toast({ variant: 'destructive', title: t('Vui lòng nhập email hợp lệ') });
            return;
        }
        setNewsletterDone(true);
        toast({
            title: t('Đăng ký thành công! 🎉'),
            description: t('Cảm ơn bạn! Chúng mình sẽ gửi các bài viết tăng trưởng chọn lọc mỗi sáng thứ 2.'),
        });
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-body">
            <PublicBlogHeader />

            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Page Header Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-brand border border-brand-dark text-brand-ink">
                            <Article size={16} weight="bold" />
                        </span>
                        <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-foreground">
                            {t('Blog & Chia Sẻ Kinh Nghiệm Marketing')}
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                        {t('Chia sẻ chiến lược phát sóng đa kênh, giải mã thuật toán Meta & TikTok 2026, bí quyết tăng trưởng dành cho Content Creator & Marketer.')}
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={() => {
                            setEditingPost(null);
                            setIsEditorOpen(true);
                        }}
                        className="btn-skew flex items-center gap-2 !py-2 !px-4 text-xs font-bold cursor-pointer shadow-xs"
                    >
                        <PencilSimple size={15} weight="bold" />
                        <span>{t('Viết bài mới & Chia sẻ')}</span>
                    </button>
                </div>
            </div>

            {/* Featured Hero Article */}
            {featuredPost && selectedCategory === 'Tất cả' && !searchQuery && (
                <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs hover:border-brand-dark/60 transition group">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                        <div className="lg:col-span-7 aspect-video rounded-xl overflow-hidden border border-border relative">
                            <img
                                src={featuredPost.coverImage}
                                alt={featuredPost.title}
                                className="size-full object-cover group-hover:scale-103 transition duration-500"
                            />
                            <span className="absolute top-3 left-3 rounded-full bg-brand border border-brand-dark px-3 py-0.5 text-[10px] font-extrabold text-brand-ink uppercase tracking-wider shadow-xs">
                                ★ {t('BÀI VIẾT NỔI BẬT')}
                            </span>
                        </div>

                        <div className="lg:col-span-5 space-y-4">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="rounded-md bg-brand/20 border border-brand-dark/30 px-2 py-0.5 text-[11px] font-bold text-brand-ink">
                                    {featuredPost.category}
                                </span>
                                <span className="text-muted-foreground font-mono text-[11px] flex items-center gap-1">
                                    <Clock size={12} />
                                    <span>{featuredPost.readTime}</span>
                                </span>
                                <span className="text-muted-foreground text-[11px]">· {featuredPost.publishedAt}</span>
                            </div>

                            <Link
                                to={`/blog/${featuredPost.slug}`}
                                className="block text-xl sm:text-2xl font-extrabold font-heading text-foreground group-hover:text-brand-dark transition-colors leading-tight"
                            >
                                {featuredPost.title}
                            </Link>

                            <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed line-clamp-3">
                                {featuredPost.excerpt}
                            </p>

                            <div className="flex items-center justify-between border-t border-border/70 pt-4">
                                <div className="flex items-center gap-2.5">
                                    <img
                                        src={featuredPost.author?.avatar}
                                        alt={featuredPost.author?.name}
                                        className="size-8 rounded-full object-cover border border-border"
                                    />
                                    <div>
                                        <div className="text-xs font-bold text-foreground">{featuredPost.author?.name}</div>
                                        <div className="text-[10px] text-muted-foreground">{featuredPost.author?.role}</div>
                                    </div>
                                </div>

                                <Link
                                    to={`/blog/${featuredPost.slug}`}
                                    className="btn-skew inline-flex items-center gap-1.5 !py-1.5 !px-3.5 text-xs font-bold"
                                >
                                    <span>{t('Đọc ngay')}</span>
                                    <ArrowRight size={13} weight="bold" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Bar: Category Tabs & Search */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-border pb-3">
                {/* Category Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scroll-slim">
                    {categories.map((cat) => {
                        const isSelected = selectedCategory === cat.name;
                        return (
                            <button
                                key={cat.name}
                                type="button"
                                onClick={() => setSelectedCategory(cat.name)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border whitespace-nowrap shrink-0 ${
                                    isSelected
                                        ? 'bg-brand border-brand-dark text-brand-ink shadow-2xs'
                                        : 'bg-card border-transparent text-muted-foreground hover:bg-surface hover:text-foreground'
                                }`}
                            >
                                <span>{cat.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                    isSelected ? 'bg-brand-dark/20 text-brand-ink' : 'bg-surface text-muted-foreground'
                                }`}>
                                    {cat.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Search Input */}
                <div className="relative min-w-[220px] shrink-0">
                    <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('Tìm kiếm bài viết, tác giả...')}
                        className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-1.5 text-xs text-foreground outline-none focus:border-brand-dark transition"
                    />
                </div>
            </div>

            {/* Posts Grid */}
            {filteredPosts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-3">
                    <Article size={32} className="mx-auto text-muted-foreground/60" />
                    <h3 className="text-sm font-bold text-foreground">
                        {t('Không tìm thấy bài viết nào phù hợp')}
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        {t('Hãy thử đổi từ khóa tìm kiếm hoặc chọn danh mục khác.')}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedCategory('Tất cả');
                            setSearchQuery('');
                        }}
                        className="btn-skew inline-flex items-center gap-1.5 !py-1.5 !px-3 text-xs font-bold cursor-pointer"
                    >
                        <span>{t('Xem tất cả bài viết')}</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPosts.map((p) => (
                        <div
                            key={p.id}
                            className="group rounded-2xl border border-border bg-card p-4.5 space-y-3.5 hover:border-brand-dark/70 transition shadow-2xs flex flex-col justify-between"
                        >
                            <div className="space-y-3">
                                {/* Thumbnail */}
                                <Link
                                    to={`/blog/${p.slug}`}
                                    className="block aspect-video rounded-xl overflow-hidden border border-border/80 relative"
                                >
                                    <img
                                        src={p.coverImage}
                                        alt={p.title}
                                        className="size-full object-cover group-hover:scale-104 transition duration-300"
                                    />
                                    <span className="absolute top-2 left-2 rounded-md bg-card/90 backdrop-blur-xs border border-border px-2 py-0.5 text-[10px] font-bold text-foreground">
                                        {p.category}
                                    </span>
                                </Link>

                                {/* Meta Header */}
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span className="flex items-center gap-1 font-mono">
                                        <Clock size={12} />
                                        <span>{p.readTime}</span>
                                    </span>
                                    <span>{p.publishedAt}</span>
                                </div>

                                {/* Title */}
                                <Link
                                    to={`/blog/${p.slug}`}
                                    className="block text-sm sm:text-base font-bold font-heading text-foreground group-hover:text-brand-dark transition-colors line-clamp-2 leading-snug"
                                >
                                    {p.title}
                                </Link>

                                {/* Excerpt */}
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {p.excerpt}
                                </p>
                            </div>

                            {/* Card Footer: Author + Actions */}
                            <div className="pt-3 border-t border-border/70 flex items-center justify-between">
                                <div className="flex items-center gap-2 truncate pr-2">
                                    <img
                                        src={p.author?.avatar}
                                        alt={p.author?.name}
                                        className="size-7 rounded-full object-cover border border-border shrink-0"
                                    />
                                    <div className="truncate">
                                        <div className="text-[11px] font-bold text-foreground truncate">{p.author?.name}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={(e) => handleLike(p.id, e)}
                                        title={t('Thích bài viết')}
                                        className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                    >
                                        <Heart size={14} />
                                        <span>{p.likes || 0}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => handleCopyShare(p.slug, e)}
                                        title={t('Sao chép liên kết')}
                                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                                    >
                                        <LinkSimple size={14} />
                                    </button>

                                    {/* Action to edit/delete user-created posts */}
                                    {p.id.startsWith('post-') && Number(p.id.replace('post-', '')) > 4 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setEditingPost(p);
                                                    setIsEditorOpen(true);
                                                }}
                                                title={t('Chỉnh sửa bài viết')}
                                                className="p-1.5 rounded-lg text-muted-foreground hover:text-brand-dark hover:bg-brand/10 transition cursor-pointer"
                                            >
                                                <PencilSimple size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeletePost(p.id, e)}
                                                title={t('Xóa bài viết')}
                                                className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                            >
                                                <Trash size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Newsletter Subscription Box */}
            <div className="rounded-2xl border border-brand-dark/40 bg-brand/15 p-6 sm:p-8 space-y-4 shadow-xs text-center max-w-2xl mx-auto">
                <span className="rounded-full bg-brand border border-brand-dark px-3 py-0.5 text-[10px] font-extrabold text-brand-ink uppercase tracking-wider inline-block">
                    ⚡ BẢN TIN GROWTH MARKETING HÀNG TUẦN
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold font-heading text-brand-ink">
                    {t('Nhận bí quyết thuật toán & case study mới nhất')}
                </h3>
                <p className="text-xs text-brand-ink/80 max-w-md mx-auto leading-relaxed">
                    {t('Gửi trực tiếp vào hòm thư của bạn mỗi sáng Thứ 2. Không spam, hủy đăng ký bất cứ lúc nào.')}
                </p>

                {newsletterDone ? (
                    <div className="p-3 rounded-xl bg-card border border-brand-dark text-xs font-bold text-foreground flex items-center justify-center gap-2 max-w-md mx-auto">
                        <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                        <span>{t('Bạn đã đăng ký nhận bản tin thành công!')}</span>
                    </div>
                ) : (
                    <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row items-center gap-2 max-w-md mx-auto">
                        <div className="relative w-full">
                            <EnvelopeSimple size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="email"
                                value={newsletterEmail}
                                onChange={(e) => setNewsletterEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-xs text-foreground outline-none focus:border-brand-dark transition"
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn-skew flex items-center gap-1.5 !py-2 !px-4 text-xs font-bold shrink-0 cursor-pointer w-full sm:w-auto justify-center"
                        >
                            <span>{t('Đăng ký')}</span>
                            <PaperPlaneRight size={13} weight="bold" />
                        </button>
                    </form>
                )}
            </div>

            {/* Blog Editor Modal */}
            <BlogEditorModal
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onSave={handleSavePost}
                initialData={editingPost}
            />
            </main>

            <PublicBlogFooter />
        </div>
    );
}
