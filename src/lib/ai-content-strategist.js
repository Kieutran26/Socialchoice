import { addDays, toUtcIso, todayInZone } from './tz.js';
import { DEFAULT_TIMEZONE } from './constants.js';
export { editPlanItem, summarizePlan } from './strategy-plan.js';

const PLATFORM_PEAK_HOURS = {
    facebook: ['09:00', '12:00', '19:30', '21:00'],
    instagram: ['11:30', '15:00', '19:00', '21:30'],
    linkedin: ['08:00', '10:30', '13:00', '17:30'],
    tiktok: ['12:00', '18:30', '20:00', '22:00'],
    threads: ['09:30', '12:30', '18:00', '20:30'],
};

const DEFAULT_STRATEGY_PILLARS = [
    { id: 'p_edu', name: 'Product Education', color: '#79D94B', target_percentage: 35, description: 'Hướng dẫn sử dụng, giải thích kiến thức sản phẩm và chuyên môn sâu.' },
    { id: 'p_aware', name: 'Brand Awareness', color: '#4F7CA8', target_percentage: 25, description: 'Hậu trường, giá trị cốt lõi, văn hóa thương hiệu và con người đứng sau.' },
    { id: 'p_story', name: 'Customer Stories', color: '#C6A15B', target_percentage: 20, description: 'Trải nghiệm thực tế của khách hàng, đánh giá và câu chuyện chuyển đổi.' },
    { id: 'p_comm', name: 'Community Engagement', color: '#8A7FB5', target_percentage: 12, description: 'Khơi gợi thảo luận, câu hỏi mở, khảo sát và tương tác hai chiều.' },
    { id: 'p_promo', name: 'Promotional Content', color: '#C2705F', target_percentage: 8, description: 'Chương trình khuyến mãi, ưu đãi có hạn, ra mắt bộ sản phẩm mới.' },
];

const DEFAULT_ANGLES = {
    'Product Education': ['How-to', 'Common Mistakes', 'Problem–Solution', 'Myth vs Fact', 'Tips & Tricks', 'Deep Dive'],
    'Brand Awareness': ['Behind the Scenes', 'Milestones', 'Culture & Values', 'Founder Note', 'Craftsmanship'],
    'Customer Stories': ['Success Story', 'Testimonial', 'Transformation', 'Day in the Life', 'Real Feedback'],
    'Community Engagement': ['Ask the Audience', 'Polls & Questions', 'Community Spotlight', 'This or That'],
    'Promotional Content': ['Limited Offer', 'Seasonal Push', 'Bundle Deal', 'Early Bird Access', 'Exclusive Perk'],
};

// Curated sample asset sets for quick population
export const SAMPLE_ASSET_TEMPLATES = {
    coffee: [
        { name: 'aster-roastery.jpg', file_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80', notes: 'Xưởng rang cà phê mộc và mẻ rang Arabica Cầu Đất lúc sáng sớm' },
        { name: 'aster-beans.jpg', file_url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80', notes: 'Cà phê hạt Single Origin Ethiopia đóng túi zip van 1 chiều cao cấp' },
        { name: 'aster-pourover.jpg', file_url: 'https://images.unsplash.com/photo-1521302200778-33500795e128?auto=format&fit=crop&w=1200&q=80', notes: 'Dòng nước rót thủ công trên phễu lọc V60 giấy Nhật Bản' },
        { name: 'aster-coldbrew.jpg', file_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1200&q=80', notes: 'Chai thủy tinh Cold Brew ủ lạnh 16 tiếng với hương hoa nhài' },
        { name: 'aster-latte-art.jpg', file_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=1200&q=80', notes: 'Tách Flat White với lớp bọt sữa mịn màng và họa tiết tulip tinh tế' },
        { name: 'aster-cupping.jpg', file_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80', notes: 'Quy trình thử nếm cupping chuẩn SCA chấm điểm hương vị hạt' },
        { name: 'aster-cafe-thaodien.jpg', file_url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80', notes: 'Không gian mở tràn ngập ánh sáng tại chi nhánh Thảo Điền Quận 2' },
        { name: 'aster-espresso-crema.jpg', file_url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=1200&q=80', notes: 'Dòng espresso vàng óng chảy từ tay pha máy La Marzocco' },
        { name: 'aster-drip-bag.jpg', file_url: 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?auto=format&fit=crop&w=1200&q=80', notes: 'Túi cà phê phin giấy tiện lợi mang đi làm và du lịch' },
        { name: 'aster-ceramic-dripper.jpg', file_url: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=1200&q=80', notes: 'Bộ phễu lọc gốm thủ công mộc mạc đặt riêng từ làng gốm Bát Tràng' },
        { name: 'aster-iced-latte.jpg', file_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1200&q=80', notes: 'Ly Iced Oat Latte tầng lớp sữa và cà phê mát lạnh sảng khoái' },
        { name: 'aster-coffee-farm.jpg', file_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80', notes: 'Nông trại cà phê Arabica liên kết tại Cầu Đất, độ cao 1600m' },
        { name: 'aster-croissant.jpg', file_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80', notes: 'Bánh sừng bò nướng mới giòn rụm kết hợp cùng Americano đá' },
        { name: 'aster-roast-machine.jpg', file_url: 'https://images.unsplash.com/photo-1518057111178-44a106bad636?auto=format&fit=crop&w=1200&q=80', notes: 'Hệ thống máy rang Giesen kiểm soát nhiệt lượng và luồng gió tối ưu' },
        { name: 'aster-green-coffee.jpg', file_url: 'https://images.unsplash.com/photo-1524350876685-274059332603?auto=format&fit=crop&w=1200&q=80', notes: 'Hạt nhân xanh được sàng lọc kỹ lưỡng, loại bỏ hoàn toàn hạt lỗi' },
        { name: 'aster-morning-regulars.jpg', file_url: 'https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&w=1200&q=80', notes: 'Khách quen đọc sách và làm việc trong góc quán ngập tràn hương cà phê' },
        { name: 'aster-brewing-workshop.jpg', file_url: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1200&q=80', notes: 'Buổi hướng dẫn kỹ thuật pour-over tại gia cùng trưởng nhóm barista' },
        { name: 'aster-coldbrew-tonic.jpg', file_url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=1200&q=80', notes: 'Signature Cold Brew Tonic sủi bọt cùng lát cam vàng mọng nước' },
        { name: 'aster-gift-set.jpg', file_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1200&q=80', notes: 'Set quà tặng 3 vùng hương vị cà phê kèm bình giữ nhiệt inox' },
        { name: 'aster-grinder-burrs.jpg', file_url: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=1200&q=80', notes: 'Bộ lưỡi dao phẳng máy xay Mahlkönig cho kích thước bột đồng đều tuyệt đối' },
        { name: 'aster-barista-team.jpg', file_url: 'https://images.unsplash.com/photo-1497636577773-f1231844b336?auto=format&fit=crop&w=1200&q=80', notes: 'Nụ cười rạng rỡ của đội ngũ pha chế Aster chào đón ngày mới' },
        { name: 'aster-eco-cup.jpg', file_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80', notes: 'Cốc mang đi tự phân hủy sinh học từ sợi bã mía bảo vệ môi trường' },
    ],
    fitness: [
        { name: 'northwind-floor.jpg', file_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80', notes: 'Khu vực thảm tập chức năng và tạ chuông kettlebell' },
        { name: 'northwind-lifting.jpg', file_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80', notes: 'Học viên thực hiện bài deadlift dưới sự giám sát của HLV' },
        { name: 'northwind-dumbbells.jpg', file_url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=80', notes: 'Dàn tạ tay bọc urethane chuyên nghiệp từ 2.5kg đến 50kg' },
        { name: 'northwind-coach.jpg', file_url: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?auto=format&fit=crop&w=1200&q=80', notes: 'HLV hướng dẫn kỹ thuật gập gối chuẩn xác tránh chấn thương' },
        { name: 'northwind-stretch.jpg', file_url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80', notes: 'Giãn cơ sau buổi tập cường độ cao giúp hồi phục nhanh' },
    ],
    general: [
        { name: 'product-hero.jpg', file_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80', notes: 'Ảnh chụp sản phẩm chủ lực góc cận cảnh sắc nét' },
        { name: 'team-workspace.jpg', file_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80', notes: 'Không gian làm việc năng động và tập thể nhân viên sáng tạo' },
        { name: 'customer-smile.jpg', file_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80', notes: 'Khách hàng nở nụ cười hài lòng khi nhận sản phẩm trên tay' },
    ]
};

/**
 * Intelligent topic & copy generation engine matching brand knowledge base, pillars, angles, and assets.
 */
function buildContentIdea({ brand, pillar, angleName, asset, dayIndex, date, platform, time, audience, products, tone, goals }) {
    const brandName = brand.name || 'Thương hiệu';
    const cleanAngle = angleName || 'Góc chia sẻ';
    const pName = pillar.name || 'Product Education';

    let title = '';
    let hook = '';
    let body = '';
    let cta = '';
    let reason = '';

    const assetName = asset?.name || 'Tài nguyên hình ảnh';
    const assetDesc = asset?.notes || asset?.name || 'hình ảnh thực tế';

    if (pName.toLowerCase().includes('product') || pName.toLowerCase().includes('giáo dục')) {
        if (cleanAngle.includes('How-to') || cleanAngle.includes('Hướng dẫn')) {
            title = `Bí quyết tận dụng tối đa ${products || 'sản phẩm'}: 3 bước chuẩn xác`;
            hook = `Bạn đã bao giờ tự hỏi làm sao để khai thác trọn vẹn hương vị và công năng của ${products || 'sản phẩm'} ngay tại nhà?`;
            body = `Nhiều người thường bỏ qua các bước căn bản như nhiệt độ, liều lượng và thời gian. Khi điều chỉnh đúng tỷ lệ, bạn sẽ cảm nhận sự khác biệt rõ rệt ngay từ lần đầu tiên.`;
            cta = `👉 Lưu ngay bài viết này và thử áp dụng vào sáng mai nhé! Bình luận bên dưới nếu bạn cần tư vấn thêm.`;
            reason = `Góc khai thác 'Hướng dẫn (How-to)' kết hợp ảnh ${assetName} (${assetDesc}) giúp đối tượng mục tiêu (${audience}) nắm bắt quy trình trực quan, làm nổi bật chất lượng sản phẩm chuẩn xác.`;
        } else if (cleanAngle.includes('Mistake') || cleanAngle.includes('Sai lầm')) {
            title = `5 sai lầm phổ biến khi sử dụng ${products || 'sản phẩm'} mà 80% người mới mắc phải`;
            hook = `Đừng để những thói quen nhỏ vô tình làm giảm 50% chất lượng trải nghiệm của bạn!`;
            body = `1. Không chú ý bảo quản đúng cách khiến sản phẩm bị ẩm/mất mùi.\n2. Dùng sai tỷ lệ khuyến nghị.\n3. Nôn nóng muốn thấy kết quả mà bỏ qua bước chuẩn bị căn bản.\nHãy cùng kiểm tra xem bạn có đang mắc phải điểm nào không nhé!`;
            cta = `Bạn đang mắc phải bao nhiêu lỗi trong số 5 điều trên? Chia sẻ thật lòng cùng ${brandName} nhé!`;
            reason = `Góc 'Sai lầm thường gặp' đánh trúng tâm lý tò mò và e ngại sai sót của khách hàng, kết hợp ảnh cận cảnh ${assetName} tạo cảm giác chân thực và đáng tin cậy.`;
        } else {
            title = `Khám phá chi tiết: Điều gì làm nên sự khác biệt của ${brandName}?`;
            hook = `Không phải ngẫu nhiên mà từng mẻ sản phẩm của ${brandName} luôn giữ được sự ổn định và tươi mới đặc trưng.`;
            body = `Từ khâu tuyển chọn nguyên liệu khắt khe tại nguồn đến quy trình chế biến thủ công tỉ mỉ, mỗi sản phẩm trao đến tay bạn là cả một hành trình của sự tận tâm.`;
            cta = `Khám phá thêm thông tin và chọn cho mình sản phẩm ưng ý tại liên kết ở phần tiểu sử!`;
            reason = `Góc phân tích sâu giúp củng cố nhận thức thương hiệu cho ${audience}, gắn liền với visual ${assetName} để tăng độ thuyết phục.`;
        }
    } else if (pName.toLowerCase().includes('aware') || pName.toLowerCase().includes('thương hiệu')) {
        if (cleanAngle.includes('Behind') || cleanAngle.includes('Hậu trường')) {
            title = `Một buổi sáng tại xưởng cùng đội ngũ ${brandName}: Điều ít ai nhìn thấy`;
            hook = `6:00 sáng, khi phố phường còn yên ắng, những chiếc máy tại xưởng đã bắt đầu ấm dần.`;
            body = `Mỗi ngày làm việc đều bắt đầu bằng việc kiểm tra chất lượng nghiêm ngặt. Từng chi tiết nhỏ đều được căn chỉnh để đảm bảo khi đến tay bạn, mọi thứ đều ở trạng thái hoàn hảo nhất.`;
            cta = `Thả một ❤️ nếu bạn trân trọng những công việc thủ công đầy đam mê này!`;
            reason = `Góc 'Hậu trường' thể hiện đúng tone of voice (${tone}), sử dụng ảnh thực tế ${assetName} để xây dựng lòng tin vững chắc cho mục tiêu (${goals}).`;
        } else {
            title = `Câu chuyện đằng sau triết lý thương hiệu của ${brandName}`;
            hook = `Tại sao chúng tôi luôn kiên định với con đường thủ công thay vì chọn phương án sản xuất đại trà nhanh hơn?`;
            body = `Bởi vì sự vội vã không bao giờ tạo nên những trải nghiệm sâu sắc. Chúng tôi tin rằng giá trị thật sự nằm ở sự kiên nhẫn và cam kết không thỏa hiệp với chất lượng.`;
            cta = `Cảm ơn bạn đã luôn đồng hành cùng hành trình của ${brandName}!`;
            reason = `Góc 'Giá trị cốt lõi' kết hợp ảnh ${assetName} giúp truyền cảm hứng cho người đọc, gia tăng kết nối cảm xúc thương hiệu.`;
        }
    } else if (pName.toLowerCase().includes('story') || pName.toLowerCase().includes('khách hàng')) {
        title = `“Tôi không nghĩ mình lại thay đổi thói quen nhanh đến vậy” — Chia sẻ từ khách quen`;
        hook = `Đôi khi, một sự thay đổi nhỏ trong lựa chọn hàng ngày lại mở ra một nguồn cảm hứng hoàn toàn mới.`;
        body = `“Trước đây tôi hay chọn giải pháp tiện lợi nhanh chóng, nhưng từ ngày thử trải nghiệm ${products || 'sản phẩm'} của ${brandName}, tôi nhận ra mình xứng đáng với những điều tốt nhất.”`;
        cta = `Bạn đã gắn bó với ${brandName} được bao lâu rồi? Hãy kể cho chúng mình nghe kỷ niệm đầu tiên nhé!`;
        reason = `Góc 'Câu chuyện khách hàng' đóng vai trò bằng chứng xã hội (Social Proof), ảnh ${assetName} tạo sự gần gũi và thôi thúc đối tượng (${audience}) chuyển đổi.`;
    } else if (pName.toLowerCase().includes('comm') || pName.toLowerCase().includes('cộng đồng')) {
        title = `Hỏi nhanh đáp thật: Bạn thuộc trường phái nào trong số này?`;
        hook = `Mỗi người một phong cách, nhưng điểm chung là đều có tình yêu đặc biệt với chất lượng tinh tế.`;
        body = `A. Tận hưởng trọn vẹn sự nguyên bản, mộc mạc và đậm sâu.\nB. Thích biến tấu mới mẻ, kết hợp những nốt hương tươi mát đầy sáng tạo.\nĐể lại chữ cái đại diện cho phong cách của bạn ngay bên dưới nhé! 👇`;
        cta = `Bình luận phương án của bạn để xem có bao nhiêu người cùng gu nhé!`;
        reason = `Góc 'Khảo sát / Tương tác cộng đồng' với câu hỏi mở kích thích thảo luận tự nhiên, ghép đôi ảnh ${assetName} bắt mắt để tối ưu tỷ lệ click trên ${platform}.`;
    } else {
        // Promotional
        title = `Ưu đãi giới hạn: Trọn bộ combo trải nghiệm dành riêng cho tuần này`;
        hook = `Cơ hội tốt nhất trong tháng để làm mới thói quen hàng ngày của bạn cùng ${brandName}!`;
        body = `Nhận ngay quà tặng đặc biệt khi đặt mua bộ đôi ${products || 'sản phẩm'} trong tuần này. Số lượng ưu đãi chỉ giới hạn cho 50 đơn hàng đầu tiên.`;
        cta = `👉 Đặt hàng ngay hôm nay qua inbox hoặc truy cập liên kết để không bỏ lỡ!`;
        reason = `Góc 'Ưu đãi có hạn' tạo tính cấp thiết (Scarcity), ảnh sản phẩm đóng gói chỉn chu ${assetName} thúc đẩy trực tiếp hành vi mua hàng.`;
    }

    const brandTag = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hashtags = `#${brandTag} #${pName.toLowerCase().replace(/[^a-z0-9]/g, '')} #SpecialtyChoice #SocialchoicePlan`;
    const fullCaption = `${hook}\n\n${body}\n\n${cta}\n\n${hashtags}`;

    return {
        title,
        caption: fullCaption,
        reason,
    };
}

/**
 * Generate a complete 7, 14, or 30 day content strategy plan.
 * @param {{ brand: any, pillars?: any[], angles?: any[], assets?: any[], options?: Record<string, any> }} params
 */
export function generateStrategyPlan({ brand, pillars = [], angles = [], assets = [], options = {} }) {
    if (!brand || !brand.name) {
        throw new Error('Vui lòng chọn một thương hiệu hợp lệ để lập chiến lược nội dung.');
    }

    const daysCount = Number(options.days) || 30; // 7, 14, or 30 days
    const frequency = options.frequency || '1_per_day'; // 1_per_day, 2_per_day, 3_per_week, 5_per_week
    const platforms = options.platforms && options.platforms.length ? options.platforms : ['facebook', 'instagram'];
    const timezone = brand.timezone || DEFAULT_TIMEZONE;
    const startDate = options.startDate || addDays(todayInZone(timezone), 1);

    // Ensure we have active pillars
    const activePillars = pillars.filter(p => p.status !== 'archived');
    const usablePillars = activePillars.length ? activePillars : DEFAULT_STRATEGY_PILLARS.map(p => ({
        ...p,
        id: `virtual_${p.id}`,
        brand_id: brand.id,
        is_virtual: true
    }));

    // Ensure we have angles
    const anglesByPillar = {};
    usablePillars.forEach(p => {
        const matching = angles.filter(a => a.pillar_id === p.id && a.status !== 'archived');
        if (matching.length) {
            anglesByPillar[p.id] = matching;
        } else {
            const defaults = DEFAULT_ANGLES[p.name] || ['How-to', 'Behind the Scenes', 'Story', 'Tips & Tricks'];
            anglesByPillar[p.id] = defaults.map((name, idx) => ({
                id: `virtual_ang_${p.id}_${idx}`,
                pillar_id: p.id,
                brand_id: brand.id,
                name,
                is_virtual: true
            }));
        }
    });

    // Available assets pool
    const usableAssets = assets.length ? assets : SAMPLE_ASSET_TEMPLATES.coffee.map((a, i) => ({
        id: `sample_asset_${i}`,
        ...a,
        brand_id: brand.id,
        is_sample: true
    }));

    // Calculate dates & post slots
    const postSlots = [];
    let assetCursor = 0;

    for (let dayOffset = 0; dayOffset < daysCount; dayOffset++) {
        const currentDate = addDays(startDate, dayOffset);
        const dayOfWeek = (new Date(currentDate + 'T00:00:00Z').getUTCDay() + 6) % 7; // 0=Mon, 6=Sun

        let postsForThisDay = 0;
        if (frequency === '1_per_day') {
            postsForThisDay = 1;
        } else if (frequency === '2_per_day') {
            postsForThisDay = 2;
        } else if (frequency === '3_per_week') {
            // Mon, Wed, Fri
            postsForThisDay = [0, 2, 4].includes(dayOfWeek) ? 1 : 0;
        } else if (frequency === '5_per_week') {
            // Mon to Fri
            postsForThisDay = dayOfWeek < 5 ? 1 : 0;
        } else {
            postsForThisDay = 1;
        }

        for (let slotIndex = 0; slotIndex < postsForThisDay; slotIndex++) {
            postSlots.push({
                dayIndex: dayOffset + 1,
                date: currentDate,
                slotIndex,
            });
        }
    }

    // Distribute pillars according to their target percentages
    const totalSlots = postSlots.length;
    const pillarSchedule = [];
    usablePillars.forEach(pillar => {
        const targetShare = pillar.target_percentage || Math.round(100 / usablePillars.length);
        const slotsCount = Math.max(1, Math.round((targetShare / 100) * totalSlots));
        for (let i = 0; i < slotsCount; i++) {
            pillarSchedule.push(pillar);
        }
    });

    // Pad or trim pillarSchedule to exact totalSlots
    while (pillarSchedule.length < totalSlots) {
        pillarSchedule.push(usablePillars[pillarSchedule.length % usablePillars.length]);
    }
    pillarSchedule.length = totalSlots;

    // Shuffle slightly to distribute evenly across days
    const distributedPillars = [];
    const pillarBuckets = {};
    usablePillars.forEach(p => { pillarBuckets[p.id] = []; });
    pillarSchedule.forEach(p => { pillarBuckets[p.id].push(p); });

    let roundIndex = 0;
    while (distributedPillars.length < totalSlots) {
        const p = usablePillars[roundIndex % usablePillars.length];
        if (pillarBuckets[p.id]?.length) {
            distributedPillars.push(pillarBuckets[p.id].pop());
        }
        roundIndex++;
    }

    // Build the planned posts
    const plannedPosts = postSlots.map((slot, index) => {
        const pillar = distributedPillars[index] || usablePillars[0];
        const angleList = anglesByPillar[pillar.id] || [];
        const angle = angleList[index % Math.max(1, angleList.length)] || { id: 'default_ang', name: 'Chia sẻ kiến thức' };

        // Match asset intelligently
        const matchedAsset = usableAssets[assetCursor % usableAssets.length];
        assetCursor++;

        // Platform & peak engagement hour
        const platform = platforms[index % platforms.length];
        const peakHours = PLATFORM_PEAK_HOURS[platform] || ['10:00', '19:30'];
        const time = slot.slotIndex === 1 ? peakHours[1] || '19:30' : peakHours[0] || '10:00';
        const scheduled_at = toUtcIso(slot.date, time, timezone);

        // Generate customized copy & rationale
        const content = buildContentIdea({
            brand,
            pillar,
            angleName: angle.name,
            asset: matchedAsset,
            dayIndex: slot.dayIndex,
            date: slot.date,
            platform,
            time,
            audience: brand.target_audience || 'khách hàng mục tiêu',
            products: brand.products || 'sản phẩm đặc trưng',
            tone: brand.tone_of_voice || 'chuyên nghiệp, chân thành',
            goals: brand.goals || 'tăng trưởng tương tác và chuyển đổi',
        });

        return {
            id: `plan_item_${index + 1}_${Date.now()}`,
            dayIndex: slot.dayIndex,
            date: slot.date,
            time,
            scheduled_at,
            platform,
            pillar: {
                id: pillar.id,
                name: pillar.name,
                color: pillar.color || '#79D94B',
                is_virtual: !!pillar.is_virtual
            },
            angle: {
                id: angle.id,
                name: angle.name,
                is_virtual: !!angle.is_virtual
            },
            asset: {
                id: matchedAsset.id,
                name: matchedAsset.name,
                file_url: matchedAsset.file_url,
                file_type: matchedAsset.file_type || 'image',
                notes: matchedAsset.notes || '',
                is_sample: !!matchedAsset.is_sample
            },
            title: content.title,
            caption: content.caption,
            reason: content.reason,
            status: 'draft', // Acceptance criteria: Kế hoạch ở trạng thái draft, không tự đăng!
        };
    });

    // Calculate plan summary metrics
    const pillarCounts = {};
    const platformCounts = {};
    const usedAssetIds = new Set();

    plannedPosts.forEach(post => {
        pillarCounts[post.pillar.name] = (pillarCounts[post.pillar.name] || 0) + 1;
        platformCounts[post.platform] = (platformCounts[post.platform] || 0) + 1;
        if (post.asset?.id) usedAssetIds.add(post.asset.id);
    });

    return {
        id: `plan_${Date.now()}`,
        brandId: brand.id,
        brandName: brand.name,
        days: daysCount,
        frequency,
        totalPosts: plannedPosts.length,
        createdAt: new Date().toISOString(),
        posts: plannedPosts,
        summary: {
            totalDays: daysCount,
            totalPosts: plannedPosts.length,
            matchedAssetsCount: usedAssetIds.size,
            totalAssetsAvailable: usableAssets.length,
            pillarCounts,
            platformCounts,
        }
    };
}

/**
 * Regenerate / Re-roll a single plan item with an alternative angle and matched asset.
 */
export function regeneratePlanItem({ item, brand, pillars = [], angles = [], assets = [] }) {
    const usableAssets = assets.length ? assets : SAMPLE_ASSET_TEMPLATES.coffee;
    // Pick next asset from pool
    const currentAssetIdx = usableAssets.findIndex(a => a.id === item.asset?.id);
    const nextAsset = usableAssets[(currentAssetIdx + 1) % usableAssets.length] || usableAssets[0];

    // Pick an alternative angle within the current pillar
    const matchingAngles = angles.filter(a => a.pillar_id === item.pillar?.id);
    const currentAngleIdx = matchingAngles.findIndex(a => a.id === item.angle?.id);
    const nextAngle = matchingAngles.length > 1
        ? matchingAngles[(currentAngleIdx + 1) % matchingAngles.length]
        : { id: item.angle?.id || 'ang_alt', name: item.angle?.name === 'How-to' ? 'Sai lầm thường gặp' : 'Mẹo hay mỗi ngày' };

    const content = buildContentIdea({
        brand,
        pillar: item.pillar,
        angleName: nextAngle.name,
        asset: nextAsset,
        dayIndex: item.dayIndex,
        date: item.date,
        platform: item.platform,
        time: item.time,
        audience: brand.target_audience || 'khách hàng mục tiêu',
        products: brand.products || 'sản phẩm đặc trưng',
        tone: brand.tone_of_voice || 'chuyên nghiệp, chân thành',
        goals: brand.goals || 'tăng trưởng tương tác và chuyển đổi',
    });

    return {
        ...item,
        angle: {
            id: nextAngle.id,
            name: nextAngle.name,
            is_virtual: !!nextAngle.is_virtual
        },
        asset: {
            id: nextAsset.id,
            name: nextAsset.name,
            file_url: nextAsset.file_url,
            file_type: nextAsset.file_type || 'image',
            notes: nextAsset.notes || '',
        },
        title: content.title,
        caption: content.caption,
        reason: content.reason,
    };
}

/**
 * Apply the generated strategy plan to the database as draft Post records.
 * Acceptance criteria: Kế hoạch ở trạng thái draft, không tự đăng.
 */
export async function applyPlanToCalendar({ plan, brand, appClient }) {
    if (!plan || !plan.posts || !plan.posts.length) {
        throw new Error('Không có bài viết nào trong kế hoạch để áp dụng vào lịch.');
    }

    const createdPosts = [];
    const isDemo = !!brand.is_demo;

    // First ensure virtual pillars and angles are saved if needed
    const pillarMap = {};
    const angleMap = {};

    for (const item of plan.posts) {
        let pillarId = item.pillar.id;
        if (item.pillar.is_virtual && !pillarMap[item.pillar.name]) {
            const newPillar = await appClient.entities.ContentPillar.create({
                brand_id: brand.id,
                name: item.pillar.name,
                description: `Trụ cột ${item.pillar.name} đề xuất bởi AI Content Strategist`,
                color: item.pillar.color || '#79D94B',
                target_percentage: 20,
                status: 'active',
                is_demo: isDemo
            });
            pillarMap[item.pillar.name] = newPillar.id;
            pillarId = newPillar.id;
        } else if (pillarMap[item.pillar.name]) {
            pillarId = pillarMap[item.pillar.name];
        }

        let angleId = item.angle.id;
        if (item.angle.is_virtual && !angleMap[item.angle.name]) {
            const newAngle = await appClient.entities.ContentAngle.create({
                brand_id: brand.id,
                pillar_id: pillarId,
                name: item.angle.name,
                description: `Góc ${item.angle.name} đề xuất bởi AI Content Strategist`,
                status: 'active',
                is_demo: isDemo
            });
            angleMap[item.angle.name] = newAngle.id;
            angleId = newAngle.id;
        } else if (angleMap[item.angle.name]) {
            angleId = angleMap[item.angle.name];
        }

        // Create the post as DRAFT with scheduled_at timestamp
        const postData = {
            brand_id: brand.id,
            title: item.title,
            caption: item.caption,
            pillar_id: pillarId,
            angle_id: angleId,
            media_ids: item.asset?.id && !item.asset.is_sample ? [item.asset.id] : [],
            scheduled_at: item.scheduled_at,
            timezone: brand.timezone || DEFAULT_TIMEZONE,
            status: 'draft', // MUST BE DRAFT
            notes: `[AI Content Strategist] Lý do lựa chọn: ${item.reason}`,
            is_demo: isDemo,
            platform_captions: {
                [item.platform]: item.caption
            }
        };

        const post = await appClient.entities.Post.create(postData);
        createdPosts.push(post);
    }

    return createdPosts;
}

/**
 * Seed 20+ sample assets for any brand that currently has fewer than 20 assets.
 */
export async function seedBrandSampleAssets({ brandId, isDemo = false, appClient }) {
    if (!isDemo) throw new Error('Sample assets can only be added in demo mode');
    const assets = SAMPLE_ASSET_TEMPLATES.coffee;
    const inserted = [];

    for (const item of assets) {
        const record = await appClient.entities.MediaAsset.create({
            brand_id: brandId,
            name: item.name,
            file_url: item.file_url,
            file_type: 'image',
            mime_type: 'image/jpeg',
            size_bytes: 420000,
            notes: item.notes,
            is_demo: isDemo,
        });
        inserted.push(record);
    }

    return inserted;
}