import { Link } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';

export default function PublicBlogFooter() {
    const { t } = useTranslation();

    return (
        <footer className="border-t border-border/80 bg-card py-12 px-4 sm:px-8 mt-16 font-body">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Brand Info */}
                <div className="md:col-span-1 space-y-3">
                    <Link to="/" className="flex items-center gap-2">
                        <img
                            src="/socialchoice-logo.png"
                            alt="Socialchoice"
                            className="h-6 w-auto object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                        <span className="font-heading font-bold text-base tracking-tight text-foreground">
                            Socialchoice
                        </span>
                    </Link>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('Nền tảng quản trị và tự động hóa phát sóng mạng xã hội đa kênh hàng đầu dành cho Content Creator & Doanh nghiệp.')}
                    </p>
                    <div className="text-[11px] text-muted-foreground font-mono">
                        v2.4 · Made with ❤️ in Vietnam
                    </div>
                </div>

                {/* Col 1: Product */}
                <div className="space-y-2.5 text-xs">
                    <h4 className="font-bold uppercase tracking-wider text-foreground text-[11px]">
                        {t('Sản phẩm')}
                    </h4>
                    <ul className="space-y-2 text-muted-foreground">
                        <li>
                            <Link to="/create" className="hover:text-foreground transition-colors">
                                {t('Studio Soạn thảo đa kênh')}
                            </Link>
                        </li>
                        <li>
                            <Link to="/calendar" className="hover:text-foreground transition-colors">
                                {t('Lịch đăng nội dung (Calendar)')}
                            </Link>
                        </li>
                        <li>
                            <Link to="/pricing" className="hover:text-foreground transition-colors">
                                {t('Bảng giá & Gói dịch vụ')}
                            </Link>
                        </li>
                        <li>
                            <Link to="/tools" className="hover:text-foreground transition-colors">
                                {t('Tiện ích Watermark & Giờ vàng')}
                            </Link>
                        </li>
                    </ul>
                </div>

                {/* Col 2: Resources */}
                <div className="space-y-2.5 text-xs">
                    <h4 className="font-bold uppercase tracking-wider text-foreground text-[11px]">
                        {t('Tài nguyên')}
                    </h4>
                    <ul className="space-y-2 text-muted-foreground">
                        <li>
                            <Link to="/blog" className="text-foreground font-bold hover:underline">
                                {t('Blog & Tri thức Marketing')}
                            </Link>
                        </li>
                        <li>
                            <Link to="/docs" className="hover:text-foreground transition-colors">
                                {t('Tài liệu hướng dẫn (Docs)')}
                            </Link>
                        </li>
                        <li>
                            <Link to="/tools?tab=golden_hours" className="hover:text-foreground transition-colors">
                                {t('Bản đồ Khung giờ vàng 24h')}
                            </Link>
                        </li>
                        <li>
                            <Link to="/tools?tab=auto_dm" className="hover:text-foreground transition-colors">
                                {t('Comment-to-Inbox Lead Bot')}
                            </Link>
                        </li>
                    </ul>
                </div>

                {/* Col 3: Legal */}
                <div className="space-y-2.5 text-xs">
                    <h4 className="font-bold uppercase tracking-wider text-foreground text-[11px]">
                        {t('Pháp lý & Hỗ trợ')}
                    </h4>
                    <ul className="space-y-2 text-muted-foreground">
                        <li>
                            <Link to="/terms" className="hover:text-foreground transition-colors">
                                {t('Điều khoản dịch vụ')}
                            </Link>
                        </li>
                        <li>
                            <Link to="/privacy" className="hover:text-foreground transition-colors">
                                {t('Chính sách quyền riêng tư')}
                            </Link>
                        </li>
                        <li>
                            <Link to="/data-deletion" className="hover:text-foreground transition-colors">
                                {t('Chính sách xóa dữ liệu')}
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="max-w-6xl mx-auto border-t border-border/70 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground">
                <div>
                    © 2026 Socialchoice Inc. {t('Tất cả các quyền được bảo lưu.')}
                </div>
                <div className="flex items-center gap-4">
                    <Link to="/terms" className="hover:underline">{t('Điều khoản')}</Link>
                    <Link to="/privacy" className="hover:underline">{t('Bảo mật')}</Link>
                    <Link to="/docs" className="hover:underline">{t('Hướng dẫn')}</Link>
                </div>
            </div>
        </footer>
    );
}
