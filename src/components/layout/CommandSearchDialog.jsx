import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Article,
    BookOpen,
    CalendarBlank,
    ChartLineUp,
    Compass,
    CopySimple,
    GearSix,
    IdentificationCard,
    Images,
    LinkSimple,
    MagnifyingGlass,
    PencilSimple,
    Sparkle,
    SquaresFour,
    Stack,
    Tag,
    Target,
    TreeStructure,
    Users,
    X,
} from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import StatusBadge from '@/components/common/StatusBadge';
import { appClient } from '@/api/app-client';
import { useWorkspace } from '@/lib/workspace-context';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { POST_STATUS_LABEL, POST_STATUS_TONE } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';

const QUICK_FEATURES = [
    { to: '/create', label: 'Create Post', hint: 'Soạn và xuất bản bài viết đa kênh', icon: PencilSimple, keywords: 'tao bai viet soan dang bai new post' },
    { to: '/agent', label: 'AI Agent Chat', hint: 'Trợ lý AI lên ý tưởng & lịch đăng', icon: Sparkle, keywords: 'ai agent chat tro ly' },
    { to: '/overview', label: 'Overview', hint: 'Tổng quan hiệu suất không gian làm việc', icon: SquaresFour, keywords: 'tong quan overview dashboard' },
    { to: '/analytics', label: 'Analytics', hint: 'Báo cáo bài viết và hiệu quả Facebook', icon: ChartLineUp, keywords: 'phan tich bao cao analytics insights' },
    { to: '/posts', label: 'All Posts', hint: 'Danh sách bài viết đã đăng, lên lịch & nháp', icon: Article, keywords: 'tat ca bai viet danh sach posts' },
    { to: '/calendar', label: 'Content Calendar', hint: 'Lịch phát sóng nội dung theo tháng', icon: CalendarBlank, keywords: 'lich noi dung calendar schedule' },
    { to: '/templates', label: 'Post templates', hint: 'Thư viện mẫu bài viết dùng lại', icon: CopySimple, keywords: 'mau bai viet templates' },
    { to: '/strategy', label: 'Content Strategy', hint: 'Chiến lược nội dung tổng thể', icon: Compass, keywords: 'chien luoc strategy' },
    { to: '/strategy/campaigns', label: 'Campaigns', hint: 'Quản lý chiến dịch tiếp thị & UTM tracking', icon: Target, keywords: 'chien dich campaigns utm muc tieu' },
    { to: '/strategy/pillars', label: 'Content Pillars', hint: 'Quản lý các trụ cột nội dung', icon: Stack, keywords: 'tru cot pillars' },
    { to: '/strategy/angles', label: 'Content Angles', hint: 'Quản lý góc khai thác nội dung', icon: TreeStructure, keywords: 'goc khai thac angles' },
    { to: '/brands', label: 'Brands', hint: 'Quản lý thương hiệu', icon: Tag, keywords: 'thuong hieu brands' },
    { to: '/accounts', label: 'Social Accounts', hint: 'Kết nối Facebook, Instagram, Threads, TikTok, LinkedIn', icon: Users, keywords: 'tai khoan mang xa hoi kenh accounts' },
    { to: '/media', label: 'Media Library', hint: 'Kho hình ảnh và video', icon: Images, keywords: 'thu vien anh media library' },
    { to: '/shortlinks', label: 'Shortlinks', hint: 'Liên kết rút gọn & UTM tracking', icon: LinkSimple, keywords: 'lien ket rut gon utm shortlinks' },
    { to: '/docs', label: 'Docs & Guide', hint: 'Tài liệu hướng dẫn sử dụng toàn bộ tính năng', icon: BookOpen, keywords: 'tai lieu huong dan docs guide help faq' },
    { to: '/settings', label: 'Settings', hint: 'Cài đặt hệ thống và AI', icon: GearSix, keywords: 'cai dat settings' },
    { to: '/admin/licenses', label: 'License management', hint: 'Quản lý license người dùng', icon: IdentificationCard, keywords: 'quan ly license admin', adminOnly: true },
];

export default function CommandSearchDialog({ open, onOpenChange }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { scope, timezone } = useWorkspace();
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [posts, setPosts] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!open) {
            setQuery('');
            setActiveIndex(0);
            return;
        }
        const timer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 20);

        let cancelled = false;
        setLoadingPosts(true);
        appClient.entities.Post.filter(scope, { sort: '-created_date', limit: 60 })
            .then((res) => {
                if (!cancelled) {
                    setPosts(res?.items || []);
                }
            })
            .catch(() => {
                if (!cancelled) setPosts([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingPosts(false);
            });

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [open, scope]);

    const normalizedQuery = query.trim().toLowerCase();

    const filteredFeatures = useMemo(() => {
        const isAdmin = user?.role === 'admin' && user?.mode === 'admin-session';
        const available = QUICK_FEATURES.filter((item) => !item.adminOnly || isAdmin);
        if (!normalizedQuery) return available.slice(0, 6);
        return available
            .filter((item) => {
                const localized = t(item.label).toLowerCase();
                return (
                    localized.includes(normalizedQuery) ||
                    item.label.toLowerCase().includes(normalizedQuery) ||
                    item.hint.toLowerCase().includes(normalizedQuery) ||
                    item.keywords.includes(normalizedQuery)
                );
            })
            .slice(0, 6);
    }, [normalizedQuery, t, user]);

    const filteredPosts = useMemo(() => {
        if (!normalizedQuery) return posts.slice(0, 4);
        return posts
            .filter((post) => {
                const title = String(post.title || '').toLowerCase();
                const content = String(post.content || post.caption || '').toLowerCase();
                const statusLabel = String(t(POST_STATUS_LABEL[post.status] || post.status || '')).toLowerCase();
                return (
                    title.includes(normalizedQuery) ||
                    content.includes(normalizedQuery) ||
                    statusLabel.includes(normalizedQuery)
                );
            })
            .slice(0, 6);
    }, [normalizedQuery, posts, t]);

    const combinedItems = useMemo(() => {
        return [
            ...filteredFeatures.map((f) => ({ kind: 'feature', to: f.to, item: f })),
            ...filteredPosts.map((p) => ({ kind: 'post', to: `/posts?post=${p.id}`, item: p })),
        ];
    }, [filteredFeatures, filteredPosts]);

    useEffect(() => {
        setActiveIndex(0);
    }, [normalizedQuery, open]);

    const handleSelect = (to) => {
        onOpenChange(false);
        navigate(to);
    };

    const handleKeyDown = (e) => {
        if (combinedItems.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => (prev + 1) % combinedItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => (prev - 1 + combinedItems.length) % combinedItems.length);
        } else if (e.key === 'Enter') {
            const target = combinedItems[activeIndex];
            if (target) {
                e.preventDefault();
                handleSelect(target.to);
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl !p-0 overflow-hidden border border-border bg-card">
                <DialogTitle className="sr-only">{t('Search')}</DialogTitle>

                {/* Top search input */}
                <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5 pr-12 bg-surface/60">
                    <MagnifyingGlass size={18} weight="bold" className="text-brand-dark shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('Tìm chức năng hoặc bài viết...')}
                        aria-label={t('Tìm chức năng hoặc bài viết...')}
                        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            aria-label={t('Clear')}
                            className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Results body */}
                <div className="max-h-[68vh] overflow-y-auto overscroll-contain p-4 space-y-5">
                    {/* Quick features */}
                    {filteredFeatures.length > 0 && (
                        <div>
                            <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                {t('Chức năng')}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {filteredFeatures.map((feat, idx) => {
                                    const Icon = feat.icon;
                                    const isActive = activeIndex === idx;
                                    return (
                                        <button
                                            key={feat.to}
                                            type="button"
                                            onMouseEnter={() => setActiveIndex(idx)}
                                            onClick={() => handleSelect(feat.to)}
                                            className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                                                isActive
                                                    ? 'border-brand-dark/50 bg-brand/20 text-brand-ink'
                                                    : 'border-transparent hover:bg-brand/10 text-foreground'
                                            }`}
                                        >
                                            <span
                                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                                                    isActive
                                                        ? 'border-brand-dark bg-brand text-brand-ink'
                                                        : 'border-border bg-surface text-muted-foreground'
                                                }`}
                                            >
                                                <Icon size={16} weight={isActive ? 'fill' : 'duotone'} />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold truncate">{t(feat.label)}</p>
                                                <p className="text-[11px] text-muted-foreground truncate">{feat.hint}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Posts */}
                    <div>
                        <div className="flex items-center justify-between px-2 pb-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                {t('Bài viết')}
                            </p>
                            {loadingPosts && (
                                <span className="text-[10px] text-muted-foreground">{t('Đang tải...')}</span>
                            )}
                        </div>

                        {filteredPosts.length === 0 && !loadingPosts ? (
                            <p className="px-2 py-3 text-xs text-muted-foreground">
                                {normalizedQuery
                                    ? t('Không tìm thấy bài viết nào khớp từ khoá.')
                                    : t('Chưa có bài viết nào trong không gian làm việc.')}
                            </p>
                        ) : (
                            <div className="space-y-0.5">
                                {filteredPosts.map((post, idx) => {
                                    const flatIdx = filteredFeatures.length + idx;
                                    const isActive = activeIndex === flatIdx;
                                    const snippet = post.title || post.content || post.caption || t('Bài viết chưa có tiêu đề');
                                    return (
                                        <button
                                            key={post.id}
                                            type="button"
                                            onMouseEnter={() => setActiveIndex(flatIdx)}
                                            onClick={() => handleSelect(`/posts?post=${post.id}`)}
                                            className={`flex w-full items-center justify-between gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                                                isActive
                                                    ? 'border-brand-dark/50 bg-brand/20 text-brand-ink'
                                                    : 'border-transparent hover:bg-brand/10 text-foreground'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <span
                                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                                                        isActive
                                                            ? 'border-brand-dark bg-brand text-brand-ink'
                                                            : 'border-border bg-surface text-muted-foreground'
                                                    }`}
                                                >
                                                    <Article size={16} weight={isActive ? 'fill' : 'duotone'} />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold truncate">{snippet}</p>
                                                    <p className="text-[11px] text-muted-foreground truncate">
                                                        {post.scheduled_at
                                                            ? formatDateTime(post.scheduled_at, timezone)
                                                            : post.created_date
                                                                ? formatDateTime(post.created_date, timezone)
                                                                : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <StatusBadge tone={POST_STATUS_TONE[post.status] || 'neutral'}>
                                                {t(POST_STATUS_LABEL[post.status] || post.status || 'draft')}
                                            </StatusBadge>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer keyboard hint */}
                <div className="flex items-center justify-between border-t border-border/80 bg-surface/60 px-4 py-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-3">
                        <span>↑↓ {t('Di chuyển')}</span>
                        <span>↵ {t('Mở')}</span>
                    </div>
                    <span>ESC {t('Đóng')}</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
