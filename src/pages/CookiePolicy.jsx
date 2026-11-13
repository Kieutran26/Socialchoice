import { ArrowLeft } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export default function CookiePolicy() {
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
                    Chính sách Cookie (Cookie Policy)
                </h1>
                <p className="text-xs text-muted-foreground mb-8">
                    Cập nhật lần cuối: Ngày 13 tháng 11 năm 2026
                </p>

                <div className="space-y-6 text-sm text-foreground/90 leading-relaxed font-sans">
                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">1. Cookie là gì?</h2>
                        <p>
                            Cookie là các tệp văn bản nhỏ được lưu trữ trên trình duyệt hoặc thiết bị của bạn khi bạn truy cập website hoặc sử dụng ứng dụng web. Cookie giúp nền tảng nhận diện thiết bị, ghi nhớ phiên đăng nhập và các tùy chọn cá nhân nhằm mang lại trải nghiệm mượt mà, tiện lợi nhất.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">2. Cách Socialchoice sử dụng Cookie</h2>
                        <p>
                            Socialchoice ("chúng tôi", "nền tảng") sử dụng Cookie và các công nghệ lưu trữ tương tự (như LocalStorage và SessionStorage) để:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 mt-1">
                            <li>Duy trì trạng thái đăng nhập an toàn trong suốt phiên làm việc của bạn.</li>
                            <li>Ghi nhớ các cài đặt không gian làm việc, ngôn ngữ hiển thị và bộ lọc giao diện.</li>
                            <li>Bảo vệ tài khoản và nền tảng trước các hành vi tấn công giả mạo yêu cầu chéo trang (CSRF).</li>
                            <li>Đo lường độ ổn định và hiệu năng tải trang để liên tục tối ưu hóa hệ thống.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">3. Phân loại Cookie chúng tôi sử dụng</h2>
                        <div className="space-y-3 mt-2">
                            <div className="p-3.5 rounded-xl border bg-muted/30">
                                <h3 className="font-semibold text-foreground text-[13.5px]">a. Cookie thiết yếu (Strictly Necessary Cookies)</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Bắt buộc phải có để trang web và ứng dụng hoạt động bình thường. Những cookie này cho phép bạn đăng nhập, điều hướng an toàn giữa các trang tính năng và bảo vệ dữ liệu phiên làm việc. Bạn không thể tắt loại cookie này trong hệ thống.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl border bg-muted/30">
                                <h3 className="font-semibold text-foreground text-[13.5px]">b. Cookie tùy chọn chức năng (Functional Cookies)</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Cho phép hệ thống ghi nhớ các lựa chọn của bạn (ví dụ: bộ lọc kênh đang chọn, chế độ hiển thị lịch, mẫu bài viết thường dùng) để bạn không phải thiết lập lại mỗi lần mở trang.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl border bg-muted/30">
                                <h3 className="font-semibold text-foreground text-[13.5px]">c. Cookie phân tích & hiệu năng (Performance & Analytics)</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Thu thập thông tin tổng hợp, ẩn danh về cách người dùng tương tác với sản phẩm (thời gian phản hồi, lưu lượng truy cập). Chúng tôi sử dụng dữ liệu này để khắc phục lỗi và nâng cao tốc độ xử lý.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">4. Kiểm soát và quản lý Cookie</h2>
                        <p>
                            Bạn có toàn quyền quyết định việc chấp nhận hoặc từ chối cookie thông qua cài đặt trình duyệt của mình (Chrome, Safari, Firefox, Edge, v.v.). Bạn có thể xóa các cookie hiện có hoặc thiết lập trình duyệt chặn cookie mới.
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Lưu ý: Nếu bạn chọn tắt các cookie thiết yếu, một số tính năng chính của Socialchoice (như duy trì phiên đăng nhập hoặc lưu bản nháp bài viết) có thể không hoạt động chính xác.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">5. Cập nhật chính sách</h2>
                        <p>
                            Chúng tôi có thể cập nhật Chính sách Cookie này theo thời gian để phản ánh các thay đổi về công nghệ hoặc quy định pháp lý hiện hành. Mọi thay đổi quan trọng sẽ được thông báo trực tiếp trên nền tảng.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">6. Liên hệ</h2>
                        <p>
                            Nếu bạn có bất kỳ câu hỏi nào về việc sử dụng Cookie của chúng tôi, vui lòng liên hệ:
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
