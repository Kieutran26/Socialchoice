import { ArrowLeft } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-surface py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-card border rounded-2xl p-6 sm:p-10 shadow-sm">
                <Link to="/" className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground mb-6">
                    <ArrowLeft size={14} /> Quay lại trang chủ
                </Link>

                <div className="flex items-center gap-3 mb-6">
                    <img src="/socialchoice-logo.png" alt="Socialchoice" className="h-7 w-auto object-contain" />
                </div>

                <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground mb-4">
                    Chính sách quyền riêng tư (Privacy Policy)
                </h1>
                <p className="text-xs text-muted-foreground mb-8">
                    Cập nhật lần cuối: Ngày 2 tháng 11 năm 2026
                </p>

                <div className="space-y-6 text-sm text-foreground/90 leading-relaxed font-sans">
                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">1. Giới thiệu</h2>
                        <p>
                            Socialchoice ("chúng tôi", "nền tảng") tôn trọng và cam kết bảo vệ quyền riêng tư của bạn. Chính sách này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu khi bạn liên kết các tài khoản mạng xã hội (bao gồm Threads, Facebook, Instagram, LinkedIn, X, TikTok) với Socialchoice.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">2. Dữ liệu chúng tôi thu thập</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Thông tin tài khoản mạng xã hội:</strong> Tên người dùng (username), ID tài khoản công khai và ảnh đại diện để hiển thị trên bảng điều khiển.</li>
                            <li><strong>Mã xác thực (Access Tokens):</strong> Token xác thực OAuth do nền tảng (Meta/Threads/X/LinkedIn) cấp, được mã hóa an toàn để thực hiện thao tác đăng bài theo yêu cầu của bạn.</li>
                            <li><strong>Nội dung đăng tải:</strong> Văn bản bài viết, hình ảnh, video mà bạn chủ động tạo hoặc lên lịch trên Socialchoice.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">3. Cách chúng tôi sử dụng dữ liệu</h2>
                        <p>Dữ liệu chỉ được sử dụng cho các mục đích:</p>
                        <ul className="list-disc pl-5 space-y-1 mt-1">
                            <li>Xác thực và duy trì kết nối với tài khoản mạng xã hội của bạn.</li>
                            <li>Đăng tải nội dung theo lịch trình mà bạn đã lên lịch hoặc phê duyệt.</li>
                            <li>Hiển thị thống kê bài đăng và danh sách kênh đang hoạt động.</li>
                        </ul>
                        <p className="mt-2 text-muted-foreground text-xs">
                            Chúng tôi tuyệt đối không bán, không chia sẻ dữ liệu của bạn cho bất kỳ bên thứ ba nào vì mục đích quảng cáo.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">4. Lưu trữ và Bảo mật</h2>
                        <p>
                            Tất cả mã truy cập (tokens) đều được mã hóa bằng tiêu chuẩn mã hóa AES-256 trước khi lưu trữ và chỉ được giải mã trên môi trường máy chủ bảo mật khi thực hiện tác vụ đăng bài.
                        </p>
                    </section>

                    <section id="data-deletion">
                        <h2 className="text-base font-semibold text-foreground mb-2">5. Quyền của bạn và Xóa dữ liệu</h2>
                        <p>
                            Bạn có toàn quyền ngắt kết nối bất kỳ kênh mạng xã hội nào bất cứ lúc nào trong mục <strong>Tài khoản (Social Accounts)</strong> trên Socialchoice hoặc trong mục <strong>Cài đặt quyền ứng dụng</strong> trên Threads/Facebook/LinkedIn. Khi ngắt kết nối, token xác thực sẽ bị thu hồi và xóa vĩnh viễn.
                        </p>
                        <p className="mt-2">
                            Để yêu cầu xóa toàn bộ dữ liệu liên quan, bạn có thể xem hướng dẫn tại trang <Link to="/data-deletion" className="text-primary font-medium underline">Hướng dẫn xóa dữ liệu</Link> hoặc gửi email tới: <span className="font-mono text-xs">support@socialchoice.site</span>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">6. Liên hệ</h2>
                        <p>
                            Nếu có bất kỳ thắc mắc nào về chính sách bảo mật, vui lòng liên hệ:
                        </p>
                        <p className="mt-1 font-mono text-xs">
                            Email: contact@socialchoice.site · Website: https://socialchoice.site
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
