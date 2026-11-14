import { DEFAULT_TIMEZONE } from './constants.js';
import { addDays, toUtcIso, todayInZone } from './tz.js';

export const STARTER_SEED_STORAGE_KEY = 'socialchoice_starter_seeded_v1';

const stripMeta = ({
    key,
    brandKey,
    pillarKey,
    angleKey,
    accountKeys,
    mediaKeys,
    ...rest
}) => rest;

const BRANDS = [
    {
        key: 'b_coffee',
        name: 'An Nhiên Coffee',
        description: 'Xưởng rang xay cà phê đặc sản Việt Nam & không gian thưởng thức chậm giữa lòng Sài Gòn.',
        color: '#8B5E3C',
        status: 'active',
        timezone: DEFAULT_TIMEZONE,
        is_demo: false,
        products: 'Cà phê hạt rang mộc Cầu Đất Arabica, Fine Robusta Đắk Lắk, Cold Brew ủ lạnh 18 giờ, Túi lọc Drip Bag tiện lợi',
        target_audience: 'Nhân viên văn phòng, freelancer và người yêu cà phê thủ công 22–38 tuổi tại các thành phố lớn',
        tone_of_voice: 'Ấm áp, tinh tế, chân thành, truyền cảm hứng sống chậm và trân trọng nông sản Việt',
        goals: 'Tăng đơn hàng cà phê rang xay tại nhà, xây dựng cộng đồng yêu cà phê đặc sản Việt Nam',
        posting_frequency: '4–5 bài/tuần',
    },
    {
        key: 'b_skincare',
        name: 'Lumina Skincare',
        description: 'Mỹ phẩm chăm sóc da tối giản, công thức khoa học dịu nhẹ cho khí hậu nhiệt đới nóng ẩm.',
        color: '#C6A15B',
        status: 'active',
        timezone: DEFAULT_TIMEZONE,
        is_demo: false,
        products: 'Serum Niacinamide 10% + Zinc, Gel rửa mặt pH 5.5 chiết xuất trà xanh, Kem chống nắng phổ rộng kiềm dầu SPF50+ PA++++, Kem dưỡng phục hồi B5',
        target_audience: 'Phụ nữ và nam giới 20–35 tuổi sống tại đô thị nhiệt đới, quan tâm chăm sóc da khoa học và lành tính',
        tone_of_voice: 'Khoa học, minh bạch, gần gũi, dễ hiểu, không thổi phồng công dụng',
        goals: 'Giáo dục thói quen skincare tối giản đúng cách và tăng tỷ lệ quay lại mua combo bảo vệ da',
        posting_frequency: '5 bài/tuần',
    },
    {
        key: 'b_tech',
        name: 'Kiên Tech Studio',
        description: 'Studio thiết kế sản phẩm số, phát triển web app & tự động hóa quy trình bằng AI cho doanh nghiệp vừa và nhỏ.',
        color: '#4F7CA8',
        status: 'active',
        timezone: DEFAULT_TIMEZONE,
        is_demo: false,
        products: 'Thiết kế UI/UX & Landing Page chuyển đổi cao, Phát triển Web App & SaaS MVP, Giải pháp tự động hóa vận hành & AI Workflow',
        target_audience: 'Founder startup, chủ doanh nghiệp SME và quản lý sản phẩm 25–42 tuổi tại Việt Nam',
        tone_of_voice: 'Sắc sảo, thực tế, chuyên nghiệp, chia sẻ kiến thức kỹ thuật dễ áp dụng',
        goals: 'Khẳng định uy tín chuyên môn qua case study thực tế và thu hút lịch tư vấn dự án mới',
        posting_frequency: '3–4 bài/tuần',
    },
];

const ACCOUNTS = [
    {
        key: 'acc_coffee_fb',
        brandKey: 'b_coffee',
        platform: 'facebook',
        account_type: 'page',
        name: 'An Nhiên Coffee Roastery',
        username: 'annhiencoffee.vn',
        followers: 18400,
        connection_status: 'configuration_required',
        connection_provider: 'native',
        is_demo: false,
    },
    {
        key: 'acc_coffee_ig',
        brandKey: 'b_coffee',
        platform: 'instagram',
        account_type: 'profile',
        name: 'An Nhiên Coffee',
        username: '@annhiencoffee.sg',
        followers: 9250,
        connection_status: 'configuration_required',
        connection_provider: 'native',
        is_demo: false,
    },
    {
        key: 'acc_skin_fb',
        brandKey: 'b_skincare',
        platform: 'facebook',
        account_type: 'page',
        name: 'Lumina Skincare Vietnam',
        username: 'luminaskincare.vn',
        followers: 24600,
        connection_status: 'configuration_required',
        connection_provider: 'native',
        is_demo: false,
    },
    {
        key: 'acc_skin_th',
        brandKey: 'b_skincare',
        platform: 'threads',
        account_type: 'profile',
        name: 'Lumina Skincare Lab',
        username: '@luminaskincare.vn',
        followers: 6100,
        connection_status: 'configuration_required',
        connection_provider: 'native',
        is_demo: false,
    },
    {
        key: 'acc_tech_fb',
        brandKey: 'b_tech',
        platform: 'facebook',
        account_type: 'page',
        name: 'Kiên Tech Studio',
        username: 'kientechstudio',
        followers: 11300,
        connection_status: 'configuration_required',
        connection_provider: 'native',
        is_demo: false,
    },
    {
        key: 'acc_tech_li',
        brandKey: 'b_tech',
        platform: 'linkedin',
        account_type: 'page',
        name: 'Kiên Tech Studio',
        username: 'kien-tech-studio',
        followers: 4850,
        connection_status: 'configuration_required',
        connection_provider: 'native',
        is_demo: false,
    },
];

const PILLARS = [
    // An Nhiên Coffee (35 + 25 + 25 + 15 = 100)
    {
        key: 'pil_coffee_1',
        brandKey: 'b_coffee',
        name: 'Nghệ thuật pha chế',
        description: 'Hướng dẫn công thức pha Pour-over, Cold Brew, Phin giấy và mẹo chọn cỡ xay chuẩn vị.',
        color: '#8B5E3C',
        target_percentage: 35,
        status: 'active',
        is_demo: false,
    },
    {
        key: 'pil_coffee_2',
        brandKey: 'b_coffee',
        name: 'Hành trình hạt cà phê',
        description: 'Câu chuyện nông trại Cầu Đất, Đắk Lắk, quy trình sơ chế và mẻ rang mới mỗi tuần.',
        color: '#79D94B',
        target_percentage: 25,
        status: 'active',
        is_demo: false,
    },
    {
        key: 'pil_coffee_3',
        brandKey: 'b_coffee',
        name: 'Nhịp sống chậm',
        description: 'Góc quán bình yên, thói quen buổi sáng và những câu chuyện nhỏ cùng khách quen.',
        color: '#C6A15B',
        target_percentage: 25,
        status: 'active',
        is_demo: false,
    },
    {
        key: 'pil_coffee_4',
        brandKey: 'b_coffee',
        name: 'Sản phẩm & Ưu đãi',
        description: 'Giới thiệu combo hạt rang, drip bag văn phòng và chương trình ưu đãi theo mùa.',
        color: '#C2705F',
        target_percentage: 15,
        status: 'active',
        is_demo: false,
    },

    // Lumina Skincare (35 + 25 + 25 + 15 = 100)
    {
        key: 'pil_skin_1',
        brandKey: 'b_skincare',
        name: 'Kiến thức da khoa học',
        description: 'Giải mã hoạt chất, cách kết hợp routine sáng/tối và chăm sóc da vùng khí hậu nóng ẩm.',
        color: '#C6A15B',
        target_percentage: 35,
        status: 'active',
        is_demo: false,
    },
    {
        key: 'pil_skin_2',
        brandKey: 'b_skincare',
        name: 'Bảng thành phần minh bạch',
        description: 'Nguồn gốc nguyên liệu, nồng độ hoạt chất an toàn và tiêu chuẩn kiểm nghiệm lâm sàng.',
        color: '#4F7CA8',
        target_percentage: 25,
        status: 'active',
        is_demo: false,
    },
    {
        key: 'pil_skin_3',
        brandKey: 'b_skincare',
        name: 'Nhật ký làn da',
        description: 'Trải nghiệm thực tế từ khách hàng sau 14–28 ngày sử dụng routine tối giản.',
        color: '#79D94B',
        target_percentage: 25,
        status: 'active',
        is_demo: false,
    },
    {
        key: 'pil_skin_4',
        brandKey: 'b_skincare',
        name: 'Routine & Combo',
        description: 'Gợi ý bộ sản phẩm theo từng loại da và ưu đãi đặc quyền cho thành viên.',
        color: '#C2705F',
        target_percentage: 15,
        status: 'active',
        is_demo: false,
    },

    // Kiên Tech Studio (35 + 30 + 20 + 15 = 100)
    {
        key: 'pil_tech_1',
        brandKey: 'b_tech',
        name: 'Case Study & Sản phẩm',
        description: 'Phân tích bài toán thực tế, kiến trúc hệ thống và kết quả đo lường sau khi bàn giao.',
        color: '#4F7CA8',
        target_percentage: 35,
        status: 'active',
        is_demo: false,
    },
    {
        key: 'pil_tech_2',
        brandKey: 'b_tech',
        name: 'AI & Tự động hóa',
        description: 'Ứng dụng AI workflow giúp doanh nghiệp SME tiết kiệm thời gian vận hành mỗi ngày.',
        color: '#79D94B',
        target_percentage: 30,
        status: 'active',
        is_demo: false,
    },
    {
        key: 'pil_tech_3',
        brandKey: 'b_tech',
        name: 'Thiết kế UI/UX thực chiến',
        description: 'Nguyên tắc tối ưu trải nghiệm người dùng, tốc độ tải trang và tỷ lệ chuyển đổi.',
        color: '#8A7FB5',
        target_percentage: 20,
        status: 'active',
        is_demo: false,
    },
    {
        key: 'pil_tech_4',
        brandKey: 'b_tech',
        name: 'Hậu trường Studio',
        description: 'Văn hóa làm việc, quy trình sprint và chia sẻ góc nhìn từ đội ngũ kỹ sư.',
        color: '#C6A15B',
        target_percentage: 15,
        status: 'active',
        is_demo: false,
    },
];

const ANGLES = [
    // Coffee - pil_coffee_1
    { key: 'ang_c_1_1', brandKey: 'b_coffee', pillarKey: 'pil_coffee_1', name: 'Công thức 3 phút buổi sáng', description: 'Hướng dẫn pha nhanh gọn cho người bận rộn trước giờ làm.', status: 'active', is_demo: false },
    { key: 'ang_c_1_2', brandKey: 'b_coffee', pillarKey: 'pil_coffee_1', name: 'Lỗi thường gặp khi pha tại nhà', description: 'Chỉ ra nguyên nhân cà phê bị chua gắt hoặc đắng khét và cách chỉnh.', status: 'active', is_demo: false },
    { key: 'ang_c_1_3', brandKey: 'b_coffee', pillarKey: 'pil_coffee_1', name: 'So sánh dụng cụ pha chế', description: 'Phin truyền thống, V60 hay Cold Brew — chọn cách nào hợp gu?', status: 'active', is_demo: false },
    // Coffee - pil_coffee_2
    { key: 'ang_c_2_1', brandKey: 'b_coffee', pillarKey: 'pil_coffee_2', name: 'Từ nông trại đến tách cà phê', description: 'Ghi chép chuyến thăm vùng nguyên liệu Cầu Đất & Đắk Lắk.', status: 'active', is_demo: false },
    { key: 'ang_c_2_2', brandKey: 'b_coffee', pillarKey: 'pil_coffee_2', name: 'Hồ sơ hương vị (Tasting Notes)', description: 'Giải thích nốt hương hoa, chocolate, trái cây chín trên từng túi hạt.', status: 'active', is_demo: false },
    { key: 'ang_c_2_3', brandKey: 'b_coffee', pillarKey: 'pil_coffee_2', name: 'Nhật ký mẻ rang mới', description: 'Cập nhật lịch rang hằng tuần để khách chọn hạt tươi nhất.', status: 'active', is_demo: false },
    // Coffee - pil_coffee_3
    { key: 'ang_c_3_1', brandKey: 'b_coffee', pillarKey: 'pil_coffee_3', name: 'Góc bàn làm việc cùng cà phê', description: 'Gợi ý playlist và không gian tạo cảm hứng tập trung.', status: 'active', is_demo: false },
    { key: 'ang_c_3_2', brandKey: 'b_coffee', pillarKey: 'pil_coffee_3', name: 'Chuyện người pha chế', description: 'Những cuộc trò chuyện ngắn bên quầy bar An Nhiên.', status: 'active', is_demo: false },
    { key: 'ang_c_3_3', brandKey: 'b_coffee', pillarKey: 'pil_coffee_3', name: 'Cuối tuần không vội', description: 'Gợi ý trải nghiệm thưởng thức cà phê cuối tuần thư thái.', status: 'active', is_demo: false },
    // Coffee - pil_coffee_4
    { key: 'ang_c_4_1', brandKey: 'b_coffee', pillarKey: 'pil_coffee_4', name: 'Combo tiết kiệm cho văn phòng', description: 'Giới thiệu gói Drip Bag và hạt rang theo tháng cho team.', status: 'active', is_demo: false },
    { key: 'ang_c_4_2', brandKey: 'b_coffee', pillarKey: 'pil_coffee_4', name: 'Quà tặng tinh tế', description: 'Hộp quà cà phê đặc sản cho đối tác và người thân.', status: 'active', is_demo: false },
    { key: 'ang_c_4_3', brandKey: 'b_coffee', pillarKey: 'pil_coffee_4', name: 'Ra mắt phiên bản giới hạn', description: 'Thông báo các lô hạt micro-lot số lượng ít theo mùa vụ.', status: 'active', is_demo: false },

    // Skincare - pil_skin_1
    { key: 'ang_s_1_1', brandKey: 'b_skincare', pillarKey: 'pil_skin_1', name: 'Giải đáp lầm tưởng skincare', description: 'Làm rõ những quan niệm sai phổ biến về da dầu, da nhạy cảm.', status: 'active', is_demo: false },
    { key: 'ang_s_1_2', brandKey: 'b_skincare', pillarKey: 'pil_skin_1', name: 'Checklist routine 3 bước', description: 'Tối giản hóa quy trình dưỡng da nhưng vẫn đủ ẩm và bảo vệ.', status: 'active', is_demo: false },
    { key: 'ang_s_1_3', brandKey: 'b_skincare', pillarKey: 'pil_skin_1', name: 'Chăm da theo thời tiết', description: 'Điều chỉnh kết cấu sản phẩm khi trời nắng gắt hoặc giao mùa.', status: 'active', is_demo: false },
    // Skincare - pil_skin_2
    { key: 'ang_s_2_1', brandKey: 'b_skincare', pillarKey: 'pil_skin_2', name: 'Spotlight một hoạt chất', description: 'Phân tích sâu cơ chế của Niacinamide, B5 hoặc Ceramide.', status: 'active', is_demo: false },
    { key: 'ang_s_2_2', brandKey: 'b_skincare', pillarKey: 'pil_skin_2', name: 'Cách đọc bảng thành phần', description: 'Hướng dẫn người dùng nhận biết thành phần dịu nhẹ và tránh kích ứng.', status: 'active', is_demo: false },
    { key: 'ang_s_2_3', brandKey: 'b_skincare', pillarKey: 'pil_skin_2', name: 'Tiêu chuẩn kiểm nghiệm tại Lab', description: 'Chia sẻ quy trình test độ ổn định và pH trước khi ra mắt.', status: 'active', is_demo: false },
    // Skincare - pil_skin_3
    { key: 'ang_s_3_1', brandKey: 'b_skincare', pillarKey: 'pil_skin_3', name: 'Hành trình phục hồi 28 ngày', description: 'Câu chuyện thật của khách hàng cải thiện hàng rào bảo vệ da.', status: 'active', is_demo: false },
    { key: 'ang_s_3_2', brandKey: 'b_skincare', pillarKey: 'pil_skin_3', name: 'Phản hồi sau lần dùng đầu tiên', description: 'Cảm nhận về kết cấu thấm nhanh, không nhờn rít dưới nắng.', status: 'active', is_demo: false },
    { key: 'ang_s_3_3', brandKey: 'b_skincare', pillarKey: 'pil_skin_3', name: 'Hỏi đáp cùng chuyên viên da', description: 'Tổng hợp câu hỏi thực tế từ inbox khách hàng mỗi tuần.', status: 'active', is_demo: false },
    // Skincare - pil_skin_4
    { key: 'ang_s_4_1', brandKey: 'b_skincare', pillarKey: 'pil_skin_4', name: 'Bộ đôi sáng - tối chuẩn chỉnh', description: 'Gợi ý kết hợp chống nắng ban ngày và phục hồi ban đêm.', status: 'active', is_demo: false },
    { key: 'ang_s_4_2', brandKey: 'b_skincare', pillarKey: 'pil_skin_4', name: 'Bộ mini du lịch tiện lợi', description: 'Giải pháp mang theo routine gọn nhẹ khi đi công tác.', status: 'active', is_demo: false },
    { key: 'ang_s_4_3', brandKey: 'b_skincare', pillarKey: 'pil_skin_4', name: 'Ưu đãi định kỳ cho khách thân thiết', description: 'Chính sách refill tiết kiệm và bảo vệ môi trường.', status: 'active', is_demo: false },

    // Tech - pil_tech_1
    { key: 'ang_t_1_1', brandKey: 'b_tech', pillarKey: 'pil_tech_1', name: 'Trước & Sau khi tái thiết kế', description: 'So sánh giao diện cũ và mới kèm số liệu chuyển đổi thực tế.', status: 'active', is_demo: false },
    { key: 'ang_t_1_2', brandKey: 'b_tech', pillarKey: 'pil_tech_1', name: 'Kiến trúc MVP trong 4 tuần', description: 'Cách đội ngũ chọn công nghệ gọn nhẹ để kịp ra mắt thị trường.', status: 'active', is_demo: false },
    { key: 'ang_t_1_3', brandKey: 'b_tech', pillarKey: 'pil_tech_1', name: 'Bài học tối ưu hiệu năng', description: 'Giảm thời gian tải trang từ 4.2s xuống dưới 1s cho e-commerce.', status: 'active', is_demo: false },
    // Tech - pil_tech_2
    { key: 'ang_t_2_1', brandKey: 'b_tech', pillarKey: 'pil_tech_2', name: 'Workflow tự động hóa thực tế', description: 'Ví dụ cụ thể cách tự động đồng bộ đơn hàng, báo cáo và chăm sóc khách.', status: 'active', is_demo: false },
    { key: 'ang_t_2_2', brandKey: 'b_tech', pillarKey: 'pil_tech_2', name: 'Tích hợp AI có kiểm soát', description: 'Nguyên tắc thiết kế AI agent an toàn, có bước duyệt của con người.', status: 'active', is_demo: false },
    { key: 'ang_t_2_3', brandKey: 'b_tech', pillarKey: 'pil_tech_2', name: 'Đo lường ROI của tự động hóa', description: 'Cách tính giờ công tiết kiệm được sau 30 ngày triển khai.', status: 'active', is_demo: false },
    // Tech - pil_tech_3
    { key: 'ang_t_3_1', brandKey: 'b_tech', pillarKey: 'pil_tech_3', name: 'Checklist Landing Page chuyển đổi cao', description: '5 điểm chạm quan trọng giúp khách hiểu giá trị sản phẩm trong 5 giây.', status: 'active', is_demo: false },
    { key: 'ang_t_3_2', brandKey: 'b_tech', pillarKey: 'pil_tech_3', name: 'Micro-interaction tinh tế', description: 'Những chi tiết nhỏ tạo cảm giác mượt mà và đáng tin cậy cho sản phẩm.', status: 'active', is_demo: false },
    { key: 'ang_t_3_3', brandKey: 'b_tech', pillarKey: 'pil_tech_3', name: 'Thiết kế hệ thống Design Token', description: 'Giữ đồng bộ giao diện khi sản phẩm mở rộng nhiều tính năng.', status: 'active', is_demo: false },
    // Tech - pil_tech_4
    { key: 'ang_t_4_1', brandKey: 'b_tech', pillarKey: 'pil_tech_4', name: 'Một ngày tại Kiên Tech Studio', description: 'Cách team phối hợp giữa thiết kế, lập trình và kiểm thử.', status: 'active', is_demo: false },
    { key: 'ang_t_4_2', brandKey: 'b_tech', pillarKey: 'pil_tech_4', name: 'Bộ công cụ yêu thích của team', description: 'Chia sẻ stack công nghệ giúp phát hành sản phẩm nhanh và ổn định.', status: 'active', is_demo: false },
    { key: 'ang_t_4_3', brandKey: 'b_tech', pillarKey: 'pil_tech_4', name: 'Góc nhìn Founder về sản phẩm số', description: 'Tại sao làm ít tính năng hơn nhưng đúng nhu cầu lại thắng lớn.', status: 'active', is_demo: false },
];

const MEDIA = [
    // Coffee
    {
        key: 'med_coffee_1',
        brandKey: 'b_coffee',
        name: 'Pha Pour-over V60 buổi sáng',
        file_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
        file_type: 'image',
        mime_type: 'image/jpeg',
        width: 1200,
        height: 800,
        filename: 'an-nhien-pour-over.jpg',
        notes: 'Ảnh pha chế thủ công dùng cho bài hướng dẫn.',
        is_demo: false,
    },
    {
        key: 'med_coffee_2',
        brandKey: 'b_coffee',
        name: 'Hạt cà phê rang mộc Cầu Đất',
        file_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80',
        file_type: 'image',
        mime_type: 'image/jpeg',
        width: 1200,
        height: 800,
        filename: 'an-nhien-roasted-beans.jpg',
        notes: 'Ảnh tách cà phê và hạt rang mộc.',
        is_demo: false,
    },
    {
        key: 'med_coffee_3',
        brandKey: 'b_coffee',
        name: 'Cold Brew ủ lạnh trong chai thủy tinh',
        file_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1200&q=80',
        file_type: 'image',
        mime_type: 'image/jpeg',
        width: 1200,
        height: 800,
        filename: 'an-nhien-cold-brew.jpg',
        notes: 'Ảnh sản phẩm Cold Brew giải nhiệt.',
        is_demo: false,
    },

    // Skincare
    {
        key: 'med_skin_1',
        brandKey: 'b_skincare',
        name: 'Serum Niacinamide tối giản',
        file_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1200&q=80',
        file_type: 'image',
        mime_type: 'image/jpeg',
        width: 1200,
        height: 800,
        filename: 'lumina-serum-minimal.jpg',
        notes: 'Ảnh lọ serum trên nền sáng tối giản.',
        is_demo: false,
    },
    {
        key: 'med_skin_2',
        brandKey: 'b_skincare',
        name: 'Routine dưỡng da buổi sáng',
        file_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80',
        file_type: 'image',
        mime_type: 'image/jpeg',
        width: 1200,
        height: 800,
        filename: 'lumina-morning-routine.jpg',
        notes: 'Ảnh bộ sản phẩm chăm sóc da hằng ngày.',
        is_demo: false,
    },
    {
        key: 'med_skin_3',
        brandKey: 'b_skincare',
        name: 'Kết cấu kem dưỡng dịu nhẹ',
        file_url: 'https://images.unsplash.com/photo-1570194065650-d99fb4b38b15?auto=format&fit=crop&w=1200&q=80',
        file_type: 'image',
        mime_type: 'image/jpeg',
        width: 1200,
        height: 800,
        filename: 'lumina-texture-cream.jpg',
        notes: 'Ảnh cận cảnh kết cấu kem mỏng nhẹ.',
        is_demo: false,
    },

    // Tech
    {
        key: 'med_tech_1',
        brandKey: 'b_tech',
        name: 'Không gian thiết kế sản phẩm số',
        file_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
        file_type: 'image',
        mime_type: 'image/jpeg',
        width: 1200,
        height: 800,
        filename: 'kien-tech-workspace.jpg',
        notes: 'Ảnh laptop lập trình và thiết kế hệ thống.',
        is_demo: false,
    },
    {
        key: 'med_tech_2',
        brandKey: 'b_tech',
        name: 'Họp sprint kiến trúc AI workflow',
        file_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
        file_type: 'image',
        mime_type: 'image/jpeg',
        width: 1200,
        height: 800,
        filename: 'kien-tech-team-sprint.jpg',
        notes: 'Ảnh đội ngũ thảo luận giải pháp.',
        is_demo: false,
    },
    {
        key: 'med_tech_3',
        brandKey: 'b_tech',
        name: 'Dashboard phân tích dữ liệu vận hành',
        file_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
        file_type: 'image',
        mime_type: 'image/jpeg',
        width: 1200,
        height: 800,
        filename: 'kien-tech-analytics-ui.jpg',
        notes: 'Ảnh minh họa giao diện dashboard.',
        is_demo: false,
    },
];

const TEMPLATES = [
    {
        key: 'tpl_coffee_1',
        brandKey: 'b_coffee',
        name: 'Công thức pha chế 3 bước',
        title: 'Bí quyết pha [Tên phương pháp] chuẩn vị tại nhà',
        caption: 'Chỉ với 3 bước đơn giản cùng hạt [Tên dòng hạt]:\n1. Tỷ lệ chuẩn: 15g cà phê / 240ml nước 92°C\n2. Ủ nở (Bloom) 30 giây đầu để đánh thức hương thơm\n3. Rót chậm theo vòng tròn trong 2 phút\n\nBạn thường pha theo gu đậm đà hay thanh ngọt?',
        pillarKey: 'pil_coffee_1',
        angleKey: 'ang_c_1_1',
        accountKeys: ['acc_coffee_fb', 'acc_coffee_ig'],
        mediaKeys: ['med_coffee_1'],
        is_demo: false,
    },
    {
        key: 'tpl_coffee_2',
        brandKey: 'b_coffee',
        name: 'Thông báo mẻ rang mới',
        title: 'Mẻ rang tuần này đã sẵn sàng lên kệ',
        caption: 'Sáng nay xưởng An Nhiên vừa hoàn thành mẻ rang mới từ vùng nguyên liệu [Vùng trồng].\n• Mức rang: [Light / Medium]\n• Nốt hương nổi bật: [Hương vị]\n• Phù hợp: Pha phin giấy, Pour-over hoặc Espresso.\n\nNhắn tin để được tư vấn cỡ xay phù hợp với dụng cụ tại nhà nhé!',
        pillarKey: 'pil_coffee_2',
        angleKey: 'ang_c_2_3',
        accountKeys: ['acc_coffee_fb'],
        mediaKeys: ['med_coffee_2'],
        is_demo: false,
    },
    {
        key: 'tpl_skin_1',
        brandKey: 'b_skincare',
        name: 'Giải mã hoạt chất skincare',
        title: 'Hiểu đúng về [Tên hoạt chất] cho làn da nhiệt đới',
        caption: 'Nhiều bạn hỏi Lumina: da dầu mụn ở khí hậu nóng ẩm có nên dùng [Tên hoạt chất] hằng ngày?\n\nCâu trả lời là CÓ, nếu bạn giữ 3 nguyên tắc:\n✓ Chọn nồng độ vừa đủ (5–10%)\n✓ Kết cấu thấm nhanh, không gây bí tắc\n✓ Luôn khóa bằng kem chống nắng phổ rộng vào ban ngày.\n\nLưu lại bài viết để kiểm tra lại routine tối nay nhé!',
        pillarKey: 'pil_skin_1',
        angleKey: 'ang_s_1_1',
        accountKeys: ['acc_skin_fb', 'acc_skin_th'],
        mediaKeys: ['med_skin_1'],
        is_demo: false,
    },
    {
        key: 'tpl_skin_2',
        brandKey: 'b_skincare',
        name: 'Nhật ký phục hồi da 28 ngày',
        title: 'Hành trình 28 ngày dịu da cùng routine tối giản',
        caption: 'Không cần 7–8 bước cầu kỳ, chị [Tên khách hàng] chỉ giữ đúng 3 bước: Làm sạch dịu nhẹ → Serum phục hồi → Chống nắng kiềm dầu.\n\nSau 4 tuần kiên trì, vùng da đổ dầu chữ T dịu hẳn và bề mặt da mịn màng hơn rõ rệt.',
        pillarKey: 'pil_skin_3',
        angleKey: 'ang_s_3_1',
        accountKeys: ['acc_skin_fb'],
        mediaKeys: ['med_skin_2'],
        is_demo: false,
    },
    {
        key: 'tpl_tech_1',
        brandKey: 'b_tech',
        name: 'Case Study Trước & Sau',
        title: 'Cách chúng tôi tối ưu [Tên dự án] tăng chuyển đổi',
        caption: 'Bài toán của khách hàng: [Mô tả vấn đề ban đầu].\n\nGiải pháp từ Kiên Tech Studio:\n1. Tái cấu trúc luồng người dùng từ 6 bước xuống còn 2 bước\n2. Chuẩn hóa Design System & tối ưu tốc độ tải trang dưới 1.2s\n3. Tự động hóa đồng bộ dữ liệu đơn hàng theo thời gian thực.\n\nKết quả sau 30 ngày: [Chỉ số đạt được].',
        pillarKey: 'pil_tech_1',
        angleKey: 'ang_t_1_1',
        accountKeys: ['acc_tech_fb', 'acc_tech_li'],
        mediaKeys: ['med_tech_3'],
        is_demo: false,
    },
    {
        key: 'tpl_tech_2',
        brandKey: 'b_tech',
        name: 'Chia sẻ AI Workflow cho SME',
        title: 'Tự động hóa quy trình [Tên quy trình] trong 15 phút/ngày',
        caption: 'Đội ngũ vận hành không cần sao chép dữ liệu thủ công giữa các bảng tính nữa.\n\nVới workflow kết hợp webhook + AI phân loại tự động, mỗi yêu cầu mới từ khách hàng được tóm tắt, gắn nhãn và chuyển đúng người phụ trách trong chưa đầy 5 giây.',
        pillarKey: 'pil_tech_2',
        angleKey: 'ang_t_2_1',
        accountKeys: ['acc_tech_li'],
        mediaKeys: ['med_tech_1'],
        is_demo: false,
    },
];

const SIGNATURES = [
    {
        key: 'sig_coffee_all',
        brandKey: 'b_coffee',
        name: 'Chữ ký mặc định An Nhiên',
        content: '—\nAn Nhiên Coffee Roastery | Cà phê rang mộc mỗi tuần\nĐặt hạt tươi tại: annhiencoffee.vn',
        platform: 'all',
        account_id: '',
        is_default: true,
        status: 'active',
        is_demo: false,
    },
    {
        key: 'sig_coffee_ig',
        brandKey: 'b_coffee',
        name: 'Hashtag Instagram An Nhiên',
        content: '#AnNhienCoffee #SpecialtyCoffeeVietnam #CaPheRangMoc #SlowLiving',
        platform: 'instagram',
        account_id: '',
        is_default: false,
        status: 'active',
        is_demo: false,
    },
    {
        key: 'sig_skin_all',
        brandKey: 'b_skincare',
        name: 'Chữ ký mặc định Lumina',
        content: '—\nLumina Skincare — Tối giản, Khoa học, Lành tính\nTư vấn routine miễn phí qua inbox.',
        platform: 'all',
        account_id: '',
        is_default: true,
        status: 'active',
        is_demo: false,
    },
    {
        key: 'sig_skin_fb',
        brandKey: 'b_skincare',
        name: 'Hashtag Facebook Lumina',
        content: '#LuminaSkincare #SkincareToiGian #ChamDaKhoaHoc #DaDauMun',
        platform: 'facebook',
        account_id: '',
        is_default: false,
        status: 'active',
        is_demo: false,
    },
    {
        key: 'sig_tech_all',
        brandKey: 'b_tech',
        name: 'Chữ ký mặc định Kiên Tech',
        content: '—\nKiên Tech Studio | Web App, UI/UX & AI Automation\nĐặt lịch trao đổi dự án: kientech.studio',
        platform: 'all',
        account_id: '',
        is_default: true,
        status: 'active',
        is_demo: false,
    },
    {
        key: 'sig_tech_li',
        brandKey: 'b_tech',
        name: 'Hashtag LinkedIn Kiên Tech',
        content: '#KienTechStudio #ProductDesign #AIAutomation #SaaS #VietnamTech',
        platform: 'linkedin',
        account_id: '',
        is_default: false,
        status: 'active',
        is_demo: false,
    },
];

/**
 * Pure builder returning the starter workspace dataset.
 * Exported so unit tests can validate every record against `server/validation.js`.
 */
export function buildStarterDataset(baseDate = todayInZone(DEFAULT_TIMEZONE)) {
    const scheduleIso = (dayOffset, time) =>
        toUtcIso(addDays(baseDate, dayOffset), time, DEFAULT_TIMEZONE);

    const posts = [
        // ============================================================
        // An Nhiên Coffee: 2 Drafts + 3 Scheduled (days +1, +5, +10)
        // ============================================================
        {
            key: 'post_coffee_d1',
            brandKey: 'b_coffee',
            title: '3 lỗi khiến ly Pour-over tại nhà bị chua gắt',
            caption: 'Nhiều bạn mua hạt Arabica Cầu Đất về tự pha nhưng lại thấy vị chua gắt bất thường. Trước khi đổi hạt, hãy thử kiểm tra 3 yếu tố nhỏ này nhé:\n\n1. Nhiệt độ nước quá thấp (dưới 88°C) làm cà phê chiết xuất thiếu.\n2. Cỡ xay quá thô khiến nước chảy qua phễu trong chưa đầy 1 phút 30 giây.\n3. Bỏ qua bước tráng giấy lọc và làm ấm bình.\n\nChỉnh lại một chút thôi, hậu vị ngọt thanh của hoa và cam chín sẽ hiện ra ngay!',
            status: 'draft',
            timezone: DEFAULT_TIMEZONE,
            pillarKey: 'pil_coffee_1',
            angleKey: 'ang_c_1_2',
            accountKeys: ['acc_coffee_fb', 'acc_coffee_ig'],
            mediaKeys: ['med_coffee_1'],
            notes: 'Bổ sung ảnh cận cảnh cỡ xay medium-fine trước khi lên lịch.',
            is_demo: false,
        },
        {
            key: 'post_coffee_d2',
            brandKey: 'b_coffee',
            title: 'Hộp quà Drip Bag cho team văn phòng bận rộn',
            caption: 'Không cần máy pha cồng kềnh, chỉ cần một tách nước nóng và 2 phút buổi sáng là cả văn phòng đã thơm lừng mùi cà phê rang mộc.\n\nAn Nhiên vừa đóng gói xong set 20 túi Drip Bag mix 2 vị Cầu Đất Arabica & Fine Robusta Đắk Lắk — sẵn sàng đồng hành cùng team bạn chạy deadline tuần này.',
            status: 'draft',
            timezone: DEFAULT_TIMEZONE,
            pillarKey: 'pil_coffee_4',
            angleKey: 'ang_c_4_1',
            accountKeys: ['acc_coffee_fb'],
            mediaKeys: ['med_coffee_2'],
            notes: 'Chờ chốt mã ưu đãi 10% cho đơn doanh nghiệp.',
            is_demo: false,
        },
        {
            key: 'post_coffee_s1',
            brandKey: 'b_coffee',
            title: 'Công thức Cold Brew ủ lạnh 18 giờ mượt vị socola',
            caption: 'Trời Sài Gòn nắng sớm, một ly Cold Brew ủ lạnh 18 giờ từ hạt Cầu Đất sẽ là lựa chọn dịu nhẹ mà vẫn đủ tỉnh táo cho cả buổi sáng.\n\nTỷ lệ An Nhiên khuyên dùng: 1 phần cà phê xay thô : 10 phần nước lọc, ủ trong ngăn mát tủ lạnh từ 16–18 tiếng rồi lọc qua giấy.\nThành phẩm có vị ngọt dịu, ít đắng, giữ được hương socola đen và hạt dẻ rất dễ uống.',
            status: 'scheduled',
            scheduled_at: scheduleIso(1, '08:30'),
            timezone: DEFAULT_TIMEZONE,
            pillarKey: 'pil_coffee_1',
            angleKey: 'ang_c_1_1',
            accountKeys: ['acc_coffee_fb', 'acc_coffee_ig'],
            mediaKeys: ['med_coffee_3'],
            notes: 'Đăng khung giờ sáng trước khi khách đi làm.',
            is_demo: false,
        },
        {
            key: 'post_coffee_s2',
            brandKey: 'b_coffee',
            title: 'Nhật ký mẻ rang tuần mới: Cầu Đất Honey Process',
            caption: 'Sáng nay xưởng vừa hạ nhiệt mẻ rang Cầu Đất sơ chế Honey đầu tuần. Hạt chín đỏ được hái tay ở độ cao 1.550m, phơi giàn 18 ngày để giữ trọn lớp mật ngọt tự nhiên.\n\nKhi pha nóng sẽ cảm nhận rõ nốt hương mật ong rừng, mơ khô và hậu vị kéo dài êm ái.',
            status: 'scheduled',
            scheduled_at: scheduleIso(5, '09:00'),
            timezone: DEFAULT_TIMEZONE,
            pillarKey: 'pil_coffee_2',
            angleKey: 'ang_c_2_3',
            accountKeys: ['acc_coffee_fb'],
            mediaKeys: ['med_coffee_2'],
            notes: 'Gắn link đặt hàng hạt rang mới ở bình luận đầu tiên.',
            is_demo: false,
        },
        {
            key: 'post_coffee_s3',
            brandKey: 'b_coffee',
            title: 'Cuối tuần không vội bên góc quán nhỏ',
            caption: 'Có những sáng cuối tuần chỉ cần ngồi cạnh ô cửa sổ, nghe tiếng nước sôi nhẹ và đợi từng giọt cà phê rơi chậm.\n\nHôm nay bạn chọn thưởng thức cà phê ở quán hay tự tay pha một ly ấm áp tại nhà?',
            status: 'scheduled',
            scheduled_at: scheduleIso(10, '09:30'),
            timezone: DEFAULT_TIMEZONE,
            pillarKey: 'pil_coffee_3',
            angleKey: 'ang_c_3_3',
            accountKeys: ['acc_coffee_ig'],
            mediaKeys: ['med_coffee_1'],
            notes: 'Bài tương tác nhẹ nhàng cho cuối tuần.',
            is_demo: false,
        },

        // ============================================================
        // Lumina Skincare: 2 Drafts + 3 Scheduled (days +2, +7, +12)
        // ============================================================
        {
            key: 'post_skin_d1',
            brandKey: 'b_skincare',
            title: 'Da dầu mụn có cần dưỡng ẩm vào mùa nóng?',
            caption: 'Một trong những hiểu lầm phổ biến nhất mà Lumina gặp mỗi tuần: "Da đã đổ nhiều dầu rồi thì không cần kem dưỡng nữa".\n\nThực tế, khi bề mặt da thiếu nước, tuyến bã nhờn lại càng tiết dầu mạnh hơn để tự bảo vệ. Bí quyết không phải là bỏ dưỡng ẩm, mà là chọn kết cấu gel-cream mỏng nhẹ chứa B5 và Hyaluronic Acid phân tử nhỏ để cấp nước mà không gây bí da.',
            status: 'draft',
            timezone: DEFAULT_TIMEZONE,
            pillarKey: 'pil_skin_1',
            angleKey: 'ang_s_1_1',
            accountKeys: ['acc_skin_fb', 'acc_skin_th'],
            mediaKeys: ['med_skin_3'],
            notes: 'Kiểm tra lại trích dẫn tài liệu da liễu trước khi duyệt.',
            is_demo: false,
        },
        {
            key: 'post_skin_d2',
            brandKey: 'b_skincare',
            title: 'Bộ mini du lịch 3 bước gọn nhẹ cho chuyến công tác',
            caption: 'Đi công tác hay du lịch ngắn ngày vẫn giữ trọn nhịp chăm da ổn định với bộ 3 sản phẩm dung tích mini 15ml–30ml của Lumina:\n• Gel rửa mặt trà xanh pH 5.5\n• Serum Niacinamide 10% kiềm dầu\n• Kem chống nắng phổ rộng không nâng tông lộ vệt trắng.',
            status: 'draft',
            timezone: DEFAULT_TIMEZONE,
            pillarKey: 'pil_skin_4',
            angleKey: 'ang_s_4_2',
            accountKeys: ['acc_skin_fb'],
            mediaKeys: ['med_skin_2'],
            notes: 'Đợi ảnh flatlay bộ kit du lịch từ studio.',
            is_demo: false,
        },
        {
            key: 'post_skin_s1',
            brandKey: 'b_skincare',
            title: 'Checklist routine sáng 3 bước cho da hỗn hợp thiên dầu',
            caption: 'Buổi sáng bận rộn chỉ cần đúng 3 bước khoa học để làn da khô thoáng suốt 8 tiếng:\n1. Làm sạch dịu nhẹ với gel pH 5.5 để giữ nguyên lớp màng ẩm tự nhiên.\n2. Thoa 2–3 giọt Serum Niacinamide 10% + Zinc hỗ trợ kiểm soát dầu thừa.\n3. Thoa đủ lượng kem chống nắng SPF50+ PA++++ trước khi ra ngoài 15 phút.\n\nTối giản nhưng đủ chất lượng là cách bền vững nhất để da khỏe lâu dài.',
            status: 'scheduled',
            scheduled_at: scheduleIso(2, '12:00'),
            timezone: DEFAULT_TIMEZONE,
            pillarKey: 'pil_skin_1',
            angleKey: 'ang_s_1_2',
            accountKeys: ['acc_skin_fb', 'acc_skin_th'],
            mediaKeys: ['med_skin_2'],
            notes: 'Đăng khung giờ nghỉ trưa.',
            is_demo: false,
        },
        {
            key: 'post_skin_s2',
            brandKey: 'b_skincare',
            title: 'Giải mã Niacinamide 10% + Zinc PCA trong bảng thành phần',
            caption: 'Vì sao Lumina chọn nồng độ Niacinamide 10% kết hợp 1% Zinc PCA thay vì chạy theo nồng độ quá cao?\n\nỞ mức 10%, Niacinamide phát huy tốt khả năng hỗ trợ điều tiết bã nhờn, làm đều màu da và củng cố hàng rào ceramide mà vẫn hạn chế tối đa cảm giác châm chích cho làn da nhạy cảm.',
            status: 'scheduled',
            scheduled_at: scheduleIso(7, '19:30'),
            timezone: DEFAULT_TIMEZONE,
            pillarKey: 'pil_skin_2',
            angleKey: 'ang_s_2_1',
            accountKeys: ['acc_skin_fb'],
            mediaKeys: ['med_skin_1'],
            notes: 'Khung giờ tối tương tác cao.',
            is_demo: false,
        },
        {
            key: 'post_skin_s3',
            brandKey: 'b_skincare',
            title: 'Nhật ký 28 ngày phục hồi hàng rào da của Minh Thư',
            caption: 'Sau thời gian dài dùng quá nhiều treatment mạnh khiến da đỏ rát và bong tróc, Minh Thư quyết định dừng toàn bộ acid tẩy tế bào chết và quay về routine 3 bước phục hồi cùng Lumina.\n\nTuần thứ 2: cảm giác căng rát giảm hẳn.\nTuần thứ 4: bề mặt da êm dịu, độ ẩm ổn định và ít đổ dầu bù trừ hơn trước.',
            status: 'scheduled',
            scheduled_at: scheduleIso(12, '20:00'),
            timezone: DEFAULT_TIMEZONE,
            pillarKey: 'pil_skin_3',
            angleKey: 'ang_s_3_1',
            accountKeys: ['acc_skin_fb', 'acc_skin_th'],
            mediaKeys: ['med_skin_3'],
            notes: 'Đã xin phép khách hàng sử dụng câu chuyện.',
            is_demo: false,
        },

        // ============================================================
        // Kiên Tech Studio: 2 Drafts + 3 Scheduled (days +3, +9, +14)
        // ============================================================
        {
            key: 'post_tech_d1',
            brandKey: 'b_tech',
            title: '5 điểm chạm giúp Landing Page B2B giữ chân khách trong 5 giây',
            caption: 'Phần lớn người dùng rời khỏi trang chủ chỉ vì không hiểu sản phẩm giải quyết vấn đề gì ngay ở màn hình đầu tiên.\n\nKhi thiết kế lại Landing Page cho các đối tác SaaS, Kiên Tech luôn rà soát 5 điểm:\n1. Tiêu đề chính nêu rõ kết quả đo lường được.\n2. Minh họa giao diện thật thay vì ảnh stock chung chung.\n3. Một nút CTA chính duy nhất, rõ ràng.\n4. Bằng chứng xã hội đặt ngay dưới fold đầu tiên.\n5. Thời gian tải trang dưới 1.5 giây trên di động.',
            status: 'draft',
            timezone: DEFAULT_TIMEZONE,
            pillarKey: 'pil_tech_3',
            angleKey: 'ang_t_3_1',
            accountKeys: ['acc_tech_fb', 'acc_tech_li'],
            mediaKeys: ['med_tech_1'],
            notes: 'Chèn thêm ảnh so sánh wireframe trước khi xuất bản.',
            is_demo: false,
        },
        {
            key: 'post_tech_d2',
            brandKey: 'b_tech',
            title: 'Vì sao SME nên bắt đầu tự động hóa từ quy trình nhỏ nhất?',
            caption: 'Nhiều doanh nghiệp muốn xây hệ thống AI thật lớn ngay từ đầu, nhưng thực tế hiệu quả nhất lại đến từ việc tự động hóa những tác vụ lặp lại 30 phút mỗi ngày: tổng hợp báo cáo bán hàng, phân loại ticket hỗ trợ hoặc nhắc lịch gia hạn hợp đồng.',
            status: 'draft',
            timezone: DEFAULT_TIMEZONE,
            pillarKey: 'pil_tech_2',
            angleKey: 'ang_t_2_3',
            accountKeys: ['acc_tech_li'],
            mediaKeys: ['med_tech_2'],
            notes: 'Bổ sung bảng tính ROI mẫu.',
            is_demo: false,
        },
        {
            key: 'post_tech_s1',
            brandKey: 'b_tech',
            title: 'Case Study: Rút ngắn 60% thời gian xử lý đơn hàng nhờ dashboard mới',
            caption: 'Trước khi hợp tác cùng Kiên Tech Studio, đội ngũ vận hành của đối tác bán lẻ phải đối chiếu thủ công 3 file Excel khác nhau mỗi cuối ngày.\n\nChúng tôi xây dựng lại hệ thống quản lý tập trung với 3 thay đổi cốt lõi:\n• Gom toàn bộ luồng duyệt đơn về một màn hình duy nhất.\n• Cảnh báo tự động các đơn có nguy cơ trễ hạn giao.\n• Đồng bộ trạng thái kho theo thời gian thực.\n\nKết quả sau 30 ngày vận hành: thời gian xử lý đơn giảm 60% và tỷ lệ sai sót nhập liệu gần như bằng 0.',
            status: 'scheduled',
            scheduled_at: scheduleIso(3, '10:00'),
            timezone: DEFAULT_TIMEZONE,
            pillarKey: 'pil_tech_1',
            angleKey: 'ang_t_1_1',
            accountKeys: ['acc_tech_fb', 'acc_tech_li'],
            mediaKeys: ['med_tech_3'],
            notes: 'Chia sẻ lên LinkedIn và Facebook Page.',
            is_demo: false,
        },
        {
            key: 'post_tech_s2',
            brandKey: 'b_tech',
            title: 'Thiết kế AI Workflow có bước duyệt của con người (Human-in-the-loop)',
            caption: 'Tự động hóa hoàn toàn không có nghĩa là thả nổi hoàn toàn.\n\nTrong các dự án tích hợp AI cho doanh nghiệp, Kiên Tech Studio luôn thiết kế cơ chế "Human-in-the-loop": AI đảm nhận phần tổng hợp dữ liệu, đề xuất bản nháp và gắn nhãn ưu tiên; còn quyết định gửi ra khách hàng hoặc thay đổi dữ liệu nhạy cảm luôn đi qua một nút xác nhận gọn nhẹ của nhân sự phụ trách.',
            status: 'scheduled',
            scheduled_at: scheduleIso(9, '14:30'),
            timezone: DEFAULT_TIMEZONE,
            pillarKey: 'pil_tech_2',
            angleKey: 'ang_t_2_2',
            accountKeys: ['acc_tech_li'],
            mediaKeys: ['med_tech_1'],
            notes: 'Bài chuyên môn cho tệp Founder & Tech Lead.',
            is_demo: false,
        },
        {
            key: 'post_tech_s3',
            brandKey: 'b_tech',
            title: 'Cách team Kiên Tech bàn giao MVP chỉn chu trong 4 tuần',
            caption: 'Làm sản phẩm nhanh nhưng không ẩu là nguyên tắc xuyên suốt ở Kiên Tech Studio.\n• Tuần 1: Chốt phạm vi lõi & dựng prototype tương tác.\n• Tuần 2–3: Phát triển song song Frontend, API và kiểm thử tự động.\n• Tuần 4: Tối ưu hiệu năng, nghiệm thu cùng khách hàng và bàn giao tài liệu vận hành.\n\nNếu bạn đang ấp ủ một sản phẩm số cho quý tới, hãy nhắn cho team để cùng lên lộ trình khả thi nhất.',
            status: 'scheduled',
            scheduled_at: scheduleIso(14, '10:30'),
            timezone: DEFAULT_TIMEZONE,
            pillarKey: 'pil_tech_1',
            angleKey: 'ang_t_1_2',
            accountKeys: ['acc_tech_fb', 'acc_tech_li'],
            mediaKeys: ['med_tech_2'],
            notes: 'Bài tổng kết tuần thứ 2 trong chuỗi lịch.',
            is_demo: false,
        },
    ];

    return {
        brands: BRANDS,
        accounts: ACCOUNTS,
        pillars: PILLARS,
        angles: ANGLES,
        media: MEDIA,
        templates: TEMPLATES,
        signatures: SIGNATURES,
        posts,
    };
}

let activeSeedPromise = null;

function readStarterFlag() {
    try {
        if (typeof localStorage === 'undefined') return false;
        return localStorage.getItem(STARTER_SEED_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function writeStarterFlag() {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(STARTER_SEED_STORAGE_KEY, '1');
    } catch {
        // Ignore storage quota or private-mode restrictions.
    }
}

/**
 * Seed a realistic Vietnamese starter workspace for new users (`is_demo: false`).
 * Idempotent by default unless `force: true` is explicitly passed.
 */
export async function seedStarterWorkspace({ force = false } = {}) {
    if (!force) {
        if (readStarterFlag()) {
            return { skipped: true };
        }
        if (activeSeedPromise) {
            return activeSeedPromise;
        }
    }

    const run = async () => {
        const { appClient } = await import('@/api/app-client');
        if (!force) {
            const existingCount = await appClient.entities.Brand.count({ is_demo: false });
            if (existingCount > 0) {
                writeStarterFlag();
                return { skipped: true };
            }
        }

        const data = buildStarterDataset();

        const brands = await appClient.entities.Brand.bulkCreate(
            data.brands.map((b) => stripMeta(b)),
        );
        const brandId = {};
        data.brands.forEach((b, index) => {
            brandId[b.key] = brands[index].id;
        });

        const accounts = await appClient.entities.SocialAccount.bulkCreate(
            data.accounts.map((a) => ({
                ...stripMeta(a),
                brand_id: brandId[a.brandKey],
            })),
        );
        const accountId = {};
        data.accounts.forEach((a, index) => {
            accountId[a.key] = accounts[index].id;
        });

        const pillars = await appClient.entities.ContentPillar.bulkCreate(
            data.pillars.map((p) => ({
                ...stripMeta(p),
                brand_id: brandId[p.brandKey],
            })),
        );
        const pillarId = {};
        data.pillars.forEach((p, index) => {
            pillarId[p.key] = pillars[index].id;
        });

        const angles = await appClient.entities.ContentAngle.bulkCreate(
            data.angles.map((a) => ({
                ...stripMeta(a),
                brand_id: brandId[a.brandKey],
                pillar_id: pillarId[a.pillarKey],
            })),
        );
        const angleId = {};
        data.angles.forEach((a, index) => {
            angleId[a.key] = angles[index].id;
        });

        const media = await appClient.entities.MediaAsset.bulkCreate(
            data.media.map((m) => ({
                ...stripMeta(m),
                brand_id: brandId[m.brandKey],
            })),
        );
        const mediaId = {};
        data.media.forEach((m, index) => {
            mediaId[m.key] = media[index].id;
        });

        const templates = await appClient.entities.PostTemplate.bulkCreate(
            data.templates.map((t) => ({
                ...stripMeta(t),
                brand_id: brandId[t.brandKey],
                pillar_id: pillarId[t.pillarKey],
                angle_id: angleId[t.angleKey],
                account_ids: (t.accountKeys || []).map((k) => accountId[k]).filter(Boolean),
                media_ids: (t.mediaKeys || []).map((k) => mediaId[k]).filter(Boolean),
            })),
        );

        const signatures = await appClient.entities.PostSignature.bulkCreate(
            data.signatures.map((s) => ({
                ...stripMeta(s),
                brand_id: brandId[s.brandKey],
            })),
        );

        const posts = await appClient.entities.Post.bulkCreate(
            data.posts.map((p) => ({
                ...stripMeta(p),
                brand_id: brandId[p.brandKey],
                pillar_id: pillarId[p.pillarKey],
                angle_id: angleId[p.angleKey],
                account_ids: (p.accountKeys || []).map((k) => accountId[k]).filter(Boolean),
                media_ids: (p.mediaKeys || []).map((k) => mediaId[k]).filter(Boolean),
            })),
        );

        writeStarterFlag();

        return {
            skipped: false,
            brands: brands.length,
            accounts: accounts.length,
            pillars: pillars.length,
            angles: angles.length,
            media: media.length,
            templates: templates.length,
            signatures: signatures.length,
            posts: posts.length,
        };
    };

    if (force) {
        return run();
    }

    activeSeedPromise = run().finally(() => {
        activeSeedPromise = null;
    });
    return activeSeedPromise;
}
