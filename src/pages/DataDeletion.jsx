import { ArrowLeft } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export default function DataDeletion() {
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
                    Hướng dẫn yêu cầu xóa dữ liệu người dùng (User Data Deletion Instructions)
                </h1>
                <p className="text-xs text-muted-foreground mb-8">
                    Cập nhật lần cuối: Ngày 2 tháng 11 năm 2026
                </p>

                <div className="space-y-6 text-sm text-foreground/90 leading-relaxed font-sans">
                    <p>
                        Theo chính sách bảo vệ dữ liệu của Meta Platform và quy định quyền riêng tư, người dùng có quyền yêu cầu xóa bỏ hoàn toàn dữ liệu tài khoản được lưu trữ trên Socialchoice.
                    </p>

                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">Cách 1: Tự ngắt kết nối trực tiếp trong ứng dụng</h2>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Đăng nhập vào bảng điều khiển <strong>Socialchoice</strong>.</li>
                            <li>Vào mục <strong>Tài khoản (Social Accounts)</strong> trên thanh điều hướng bên trái.</li>
                            <li>Tìm kênh mạng xã hội (Threads, Facebook, Instagram, LinkedIn, X, TikTok) bạn muốn ngắt kết nối.</li>
                            <li>Bấm vào biểu tượng tùy chọn và chọn <strong>Ngắt kết nối (Disconnect)</strong>.</li>
                        </ol>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Hệ thống sẽ ngay lập tức thu hồi và xóa vĩnh viễn Access Token cũng như thông tin định danh của tài khoản khỏi cơ sở dữ liệu Socialchoice.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">Cách 2: Gỡ quyền từ trang cài đặt Threads / Meta</h2>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Truy cập vào ứng dụng Threads hoặc trang cá nhân trên <strong>threads.net</strong>.</li>
                            <li>Vào <strong>Cài đặt</strong> → <strong>Quyền riêng tư</strong> → <strong>Quyền trên trang web (Website permissions)</strong>.</li>
                            <li>Tại mục ứng dụng <strong>Socialchoice</strong>, bấm <strong>Gỡ bỏ (Remove)</strong>.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">Cách 3: Gửi yêu cầu xóa toàn bộ dữ liệu thủ công</h2>
                        <p>
                            Nếu bạn muốn chúng tôi xóa sạch toàn bộ lịch sử đăng bài, nhật ký và tài khoản của bạn trên hệ thống, vui lòng gửi email về hòm thư hỗ trợ:
                        </p>
                        <div className="mt-3 p-4 bg-muted/40 rounded-xl border border-border">
                            <p className="font-semibold text-foreground">Email hỗ trợ tiếp nhận:</p>
                            <p className="font-mono text-sm text-primary mt-1">support@socialchoice.site</p>
                            <p className="text-xs text-muted-foreground mt-2">
                                Tiêu đề: <em>[Yêu cầu xóa dữ liệu] - Tên người dùng / ID tài khoản</em>
                            </p>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Yêu cầu sẽ được xử lý và phản hồi xác nhận trong vòng 48 giờ làm việc.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
