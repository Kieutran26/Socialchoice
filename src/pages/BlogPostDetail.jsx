import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import {
    getBlogPostBySlug,
    getBlogPosts,
    likeBlogPost,
    addCommentToBlogPost,
} from '@/lib/blog-service';
import PublicBlogHeader from '@/components/blog/PublicBlogHeader';
import PublicBlogFooter from '@/components/blog/PublicBlogFooter';
import {
    ArrowLeft,
    Clock,
    Eye,
    Heart,
    ShareNetwork,
    LinkSimple,
    FacebookLogo,
    XLogo,
    LinkedinLogo,
    ChatCircleText,
    Sparkle,
    CaretRight,
    Check,
    PaperPlaneTilt,
    Tag,
} from '@phosphor-icons/react';

export default function BlogPostDetail() {
    const { slug } = useParams();
    const { t } = useTranslation();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [post, setPost] = useState(null);
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [relatedPosts, setRelatedPosts] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [commentAuthor, setCommentAuthor] = useState('');
    const [commentsList, setCommentsList] = useState([]);

    useEffect(() => {
        window.scrollTo(0, 0);
        const found = getBlogPostBySlug(slug);
        if (found) {
            setPost(found);
            setLikesCount(found.likes || 0);
            setCommentsList(found.comments || []);

            // Related posts
            const all = getBlogPosts();
            const related = all
                .filter((p) => p.id !== found.id && (p.category === found.category || true))
                .slice(0, 3);
            setRelatedPosts(related);
        } else {
            // Not found
            navigate('/blog');
        }
    }, [slug, navigate]);

    if (!post) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <span className="text-xs font-semibold text-muted-foreground">{t('Đang tải bài viết...')}</span>
            </div>
        );
    }

    const handleLike = () => {
        if (liked) return;
        const updated = likeBlogPost(post.id);
        if (updated) {
            setLikesCount(updated.likes);
            setLiked(true);
            toast({ title: t('Cảm ơn bạn đã yêu thích bài viết! ❤️') });
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard?.writeText?.(window.location.href);
        toast({ title: t('Đã sao chép liên kết bài viết vào clipboard!') });
    };

    const handleAddComment = (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        const newComment = addCommentToBlogPost(post.id, {
            authorName: commentAuthor.trim() || 'Khách độc giả',
            text: commentText.trim(),
        });

        setCommentsList([newComment, ...commentsList]);
        setCommentText('');
        toast({ title: t('Đã gửi bình luận của bạn thành công!') });
    };

    // Render formatted markdown content
    const renderContent = (raw = '') => {
        const lines = raw.split('\n');
        return lines.map((line, idx) => {
            const trimmed = line.trim();

            if (trimmed.startsWith('### ')) {
                return (
                    <h3 key={idx} className="text-lg sm:text-xl font-bold font-heading text-foreground mt-6 mb-2">
                        {trimmed.replace('### ', '')}
                    </h3>
                );
            }
            if (trimmed.startsWith('## ')) {
                return (
                    <h2 key={idx} className="text-xl sm:text-2xl font-bold font-heading text-foreground mt-8 mb-3">
                        {trimmed.replace('## ', '')}
                    </h2>
                );
            }
            if (trimmed.startsWith('> ')) {
                return (
                    <blockquote
                        key={idx}
                        className="my-4 border-l-3 border-brand-dark bg-brand/10 p-3.5 rounded-r-xl text-xs sm:text-[13px] font-medium text-brand-ink italic leading-relaxed"
                    >
                        {trimmed.replace('> ', '')}
                    </blockquote>
                );
            }
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                    <li key={idx} className="ml-5 list-disc text-xs sm:text-[13px] text-foreground leading-relaxed my-1">
                        {trimmed.replace(/^[-*]\s+/, '')}
                    </li>
                );
            }
            if (/^\d+\.\s/.test(trimmed)) {
                return (
                    <li key={idx} className="ml-5 list-decimal text-xs sm:text-[13px] text-foreground leading-relaxed my-1">
                        {trimmed.replace(/^\d+\.\s+/, '')}
                    </li>
                );
            }
            if (trimmed === '---') {
                return <hr key={idx} className="my-6 border-border/70" />;
            }
            if (!trimmed) {
                return <div key={idx} className="h-2" />;
            }

            return (
                <p key={idx} className="text-xs sm:text-[13px] text-foreground/90 leading-relaxed font-body my-2">
                    {line}
                </p>
            );
        });
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-body">
            <PublicBlogHeader />

            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
                {/* Top Navigation & Breadcrumbs */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <Link
                    to="/blog"
                    className="inline-flex items-center gap-1.5 font-bold text-muted-foreground hover:text-brand-dark transition-colors cursor-pointer"
                >
                    <ArrowLeft size={14} weight="bold" />
                    <span>{t('Quay lại danh sách Blog')}</span>
                </Link>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleCopyLink}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:border-brand-dark hover:bg-brand/10 transition cursor-pointer"
                    >
                        <LinkSimple size={14} weight="bold" />
                        <span>{t('Sao chép link')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleLike}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer text-xs font-bold ${
                            liked
                                ? 'bg-rose-50 border-rose-300 text-rose-600'
                                : 'bg-card border-border text-foreground hover:border-rose-300 hover:text-rose-600'
                        }`}
                    >
                        <Heart size={14} weight={liked ? 'fill' : 'bold'} className={liked ? 'text-rose-500' : ''} />
                        <span>{likesCount}</span>
                    </button>
                </div>
            </div>

            {/* Article Header Card */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5 shadow-xs">
                {/* Category & Metadata */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    <span className="rounded-full bg-brand/25 border border-brand-dark/40 px-3 py-0.5 text-xs font-bold text-brand-ink">
                        {post.category}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground font-mono text-[11px]">
                        <Clock size={13} />
                        <span>{post.readTime}</span>
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground text-[11px]">{post.publishedAt}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="flex items-center gap-1 text-muted-foreground font-mono text-[11px]">
                        <Eye size={13} />
                        <span>{post.views?.toLocaleString('vi-VN')} {t('lượt xem')}</span>
                    </span>
                </div>

                {/* Main Heading */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-foreground leading-tight tracking-tight">
                    {post.title}
                </h1>

                {/* Excerpt */}
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed border-l-2 border-brand-dark pl-3 font-medium">
                    {post.excerpt}
                </p>

                {/* Author Info Bar */}
                <div className="flex items-center justify-between border-t border-border/80 pt-4">
                    <div className="flex items-center gap-3">
                        <img
                            src={post.author?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt={post.author?.name}
                            className="size-10 rounded-full object-cover border border-border ring-2 ring-brand/20"
                        />
                        <div>
                            <div className="text-xs font-bold text-foreground">{post.author?.name}</div>
                            <div className="text-[11px] text-muted-foreground">{post.author?.role || 'Author'}</div>
                        </div>
                    </div>

                    {/* Social Share Icons */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
                            title="Chia sẻ lên Facebook"
                            className="size-8 rounded-lg border border-border bg-surface text-[#1877F2] grid place-items-center hover:bg-[#1877F2]/10 transition cursor-pointer"
                        >
                            <FacebookLogo size={16} weight="fill" />
                        </button>
                        <button
                            type="button"
                            onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`, '_blank')}
                            title="Chia sẻ lên X (Twitter)"
                            className="size-8 rounded-lg border border-border bg-surface text-foreground grid place-items-center hover:bg-muted transition cursor-pointer"
                        >
                            <XLogo size={15} weight="bold" />
                        </button>
                        <button
                            type="button"
                            onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank')}
                            title="Chia sẻ lên LinkedIn"
                            className="size-8 rounded-lg border border-border bg-surface text-[#0A66C2] grid place-items-center hover:bg-[#0A66C2]/10 transition cursor-pointer"
                        >
                            <LinkedinLogo size={16} weight="fill" />
                        </button>
                    </div>
                </div>

                {/* Cover Image Banner */}
                {post.coverImage && (
                    <div className="rounded-2xl overflow-hidden border border-border aspect-video max-h-[440px] w-full">
                        <img
                            src={post.coverImage}
                            alt={post.title}
                            className="size-full object-cover"
                        />
                    </div>
                )}

                {/* Main Content Body */}
                <div className="pt-4 border-t border-border/80">
                    <div className="prose max-w-none">
                        {renderContent(post.content)}
                    </div>
                </div>

                {/* Tags Footer */}
                {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border/80">
                        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                            <Tag size={13} />
                            <span>{t('Chủ đề liên quan:')}</span>
                        </span>
                        {post.tags.map((tg) => (
                            <span
                                key={tg}
                                className="rounded-lg bg-surface border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground"
                            >
                                #{tg}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* In-Article Call to Action Banner */}
            <div className="rounded-2xl border border-brand-dark/40 bg-brand/15 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xs">
                <div className="space-y-1.5 text-center sm:text-left">
                    <span className="rounded-full bg-brand border border-brand-dark px-2.5 py-0.5 text-[10px] font-extrabold text-brand-ink uppercase tracking-wider">
                        ⚡ SOCIALCHOICE GROWTH SUITE
                    </span>
                    <h3 className="text-lg sm:text-xl font-extrabold font-heading text-brand-ink">
                        {t('Tự động hóa phát sóng & gom Lead đa kênh ngay hôm nay')}
                    </h3>
                    <p className="text-xs text-brand-ink/80 max-w-lg leading-relaxed">
                        {t('Soạn 1 lần phát sóng Facebook, TikTok, Instagram, Threads và LinkedIn kèm ghim comment, AI tái sinh nội dung và tự động hóa Auto-DM.')}
                    </p>
                </div>

                <Link
                    to="/create"
                    className="btn-skew flex items-center gap-2 !py-2.5 !px-5 text-xs font-bold shrink-0 cursor-pointer"
                >
                    <span>{t('Trải nghiệm miễn phí')}</span>
                    <Sparkle size={15} weight="bold" />
                </Link>
            </div>

            {/* Reader Comments Section */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xs">
                <h3 className="text-sm font-bold font-heading text-foreground flex items-center gap-2 border-b border-border/80 pb-3">
                    <ChatCircleText size={17} weight="bold" className="text-brand-dark" />
                    <span>{t('Bình luận & Thảo luận ({count})', { count: commentsList.length })}</span>
                </h3>

                {/* Comment Input Box */}
                <form onSubmit={handleAddComment} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                            type="text"
                            value={commentAuthor}
                            onChange={(e) => setCommentAuthor(e.target.value)}
                            placeholder={t('Tên của bạn...')}
                            className="rounded-xl border border-border bg-surface/50 px-3 py-1.5 text-xs text-foreground outline-none focus:border-brand-dark focus:bg-card transition"
                        />
                    </div>
                    <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={3}
                        placeholder={t('Chia sẻ suy nghĩ hoặc đặt câu hỏi về bài viết này...')}
                        className="w-full rounded-xl border border-border bg-surface/50 p-3 text-xs text-foreground outline-none resize-none focus:border-brand-dark focus:bg-card transition"
                    />
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="btn-skew flex items-center gap-1.5 !py-1.5 !px-4 text-xs font-bold cursor-pointer"
                        >
                            <span>{t('Gửi bình luận')}</span>
                            <PaperPlaneTilt size={13} weight="bold" />
                        </button>
                    </div>
                </form>

                {/* Comments List */}
                <div className="divide-y divide-border/60 pt-2">
                    {commentsList.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">
                            {t('Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ suy nghĩ!')}
                        </p>
                    ) : (
                        commentsList.map((c) => (
                            <div key={c.id} className="py-3 space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-foreground">{c.authorName}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">{c.createdAt}</span>
                                </div>
                                <p className="text-xs text-foreground/90 leading-relaxed font-body">
                                    {c.text}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Related Posts Grid */}
            {relatedPosts.length > 0 && (
                <div className="space-y-3 pt-4">
                    <h3 className="text-sm font-bold font-heading text-foreground">
                        {t('Bài viết liên quan cùng chủ đề')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {relatedPosts.map((r) => (
                            <Link
                                key={r.id}
                                to={`/blog/${r.slug}`}
                                className="group rounded-2xl border border-border bg-card p-4 space-y-2.5 hover:border-brand-dark/70 transition shadow-2xs flex flex-col justify-between"
                            >
                                <div className="space-y-2">
                                    <div className="aspect-video rounded-xl overflow-hidden border border-border/80">
                                        <img
                                            src={r.coverImage}
                                            alt={r.title}
                                            className="size-full object-cover group-hover:scale-105 transition duration-300"
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-brand-ink bg-brand/20 px-2 py-0.5 rounded-md inline-block">
                                        {r.category}
                                    </span>
                                    <h4 className="text-xs font-bold text-foreground group-hover:text-brand-dark transition-colors line-clamp-2">
                                        {r.title}
                                    </h4>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                                    <span>{r.publishedAt}</span>
                                    <span>{r.readTime}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
            </main>

            <PublicBlogFooter />
        </div>
    );
}
