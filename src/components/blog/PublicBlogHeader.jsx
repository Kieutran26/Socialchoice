import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { ArrowRight, BookOpen, Article, Sparkle } from '@phosphor-icons/react';

export default function PublicBlogHeader() {
    const { t } = useTranslation();
    const location = useLocation();

    return (
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/80 px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
                <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
                    <img
                        src="/socialchoice-logo.png"
                        alt="Socialchoice"
                        className="h-7 w-auto object-contain"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                    <span className="font-heading font-bold text-base sm:text-lg tracking-tight text-foreground group-hover:text-brand-ink transition">
                        Socialchoice
                    </span>
                </Link>

                <span className="text-muted-foreground/60 hidden sm:inline">/</span>

                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-2 py-0.5 rounded-md bg-brand border border-brand-dark text-brand-ink font-extrabold text-[10px] tracking-wider shrink-0">
                        BLOG
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground truncate hidden md:inline">
                        {t('Góc Chia Sẻ & Tri Thức Marketing')}
                    </span>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-muted-foreground">
                <Link to="/" className="hover:text-foreground transition-colors">
                    {t('Trang chủ')}
                </Link>
                <Link to="/pricing" className="hover:text-foreground transition-colors">
                    {t('Bảng giá')}
                </Link>
                <Link to="/docs" className="hover:text-foreground transition-colors">
                    {t('Tài liệu')}
                </Link>
                <Link
                    to="/blog"
                    className="text-foreground font-bold border-b-2 border-brand-dark pb-0.5"
                >
                    {t('Blog')}
                </Link>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2.5 shrink-0">
                <Link
                    to="/login"
                    className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-surface text-xs font-semibold text-foreground transition"
                >
                    <span>{t('Đăng nhập')}</span>
                </Link>
                <Link
                    to="/app"
                    className="btn-skew text-xs !px-3.5 !py-1.5 flex items-center gap-1.5 font-bold cursor-pointer"
                >
                    <span>{t('Vào Web App')}</span>
                    <ArrowRight size={13} weight="bold" />
                </Link>
            </div>
        </header>
    );
}
