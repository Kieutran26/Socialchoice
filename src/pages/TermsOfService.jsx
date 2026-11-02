import { ArrowLeft } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
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
                    Điều khoản dịch vụ (Terms of Service)
                </h1>
                <p className="text-xs text-muted-foreground mb-8">
                    Cập nhật lần cuối: Ngày 2 tháng 11 năm 2026
                </p>

                <div className="space-y-6 text-sm text-foreground/90 leading-relaxed font-sans">
                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">1. Chấp thuận điều khoản</h2>
                        <p>
                            Bằng việc truy cập hoặc sử dụng nền tảng Socialchoice, bạn đồng ý tuân thủ các Điều khoản dịch vụ này cùng Chính sách quyền riêng tư của chúng tôi. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">2. Sử dụng dịch vụ</h2>
                        <p>
                            Socialchoice cung cấp giải pháp quản lý, soạn thảo, lên lịch và phân tích nội dung trên các nền tảng mạng xã hội. Bạn cam kết:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 mt-1">
                            <li>Chỉ kết nối các tài khoản mà bạn có quyền sở hữu hoặc được ủy quyền hợp pháp.</li>
                            <li>Không phát tán thư rác (spam), nội dung độc hại hoặc vi phạm tiêu chuẩn cộng đồng của các nền tảng liên kết (Meta, Threads, LinkedIn, v.v.).</li>
                            <li>Bảo vệ thông tin tài khoản đăng nhập của bạn trên Socialchoice.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">3. Tích hợp bên thứ ba</h2>
                        <p>
                            Dịch vụ sử dụng các API chính thức do Meta, Threads, LinkedIn, X và TikTok cung cấp. Việc sử dụng các mạng xã hội này phải tuân thủ điều khoản tương ứng của từng nền tảng. Chúng tôi không chịu trách nhiệm nếu tài khoản mạng xã hội của bạn bị hạn chế do vi phạm chính sách của nền tảng bên thứ ba.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">4. Chấm dứt dịch vụ</h2>
                        <p>
                            Bạn có thể ngắt kết nối tài khoản hoặc xóa tài khoản của mình bất kỳ lúc nào. Chúng tôi có quyền tạm ngừng hoặc chấm dứt quyền truy cập nếu phát hiện hành vi vi phạm nghiêm trọng các điều khoản này.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-2">5. Liên hệ</h2>
                        <p>
                            Mọi câu hỏi liên quan đến điều khoản dịch vụ, vui lòng liên hệ:
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

