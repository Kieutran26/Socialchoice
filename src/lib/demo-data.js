import { DEFAULT_TIMEZONE } from './constants';
import { addDays, toUtcIso, todayInZone } from './tz';

const BRANDS = [
    {
        key: 'b1',
        name: 'Aster Coffee Roasters',
        description: 'Specialty roastery with four cafés across Saigon.',
        color: '#79D94B',
        timezone: DEFAULT_TIMEZONE,
        products: 'Cà phê hạt Single Origin Ethiopia & Cầu Đất, Cold Brew đóng chai, Phin Pour-over gốm thủ công, Drip bag tiện lợi',
        target_audience: 'Người yêu cà phê đặc sản 22-38 tuổi tại TP.HCM, dân văn phòng sáng tạo, người thích tự pha chế tại nhà',
        tone_of_voice: 'Chân thực, ấm áp, đam mê hương vị, truyền cảm hứng về nghệ thuật cà phê thủ công',
        goals: 'Tăng đơn hàng cà phê pha tại nhà, xây dựng thói quen uống specialty coffee, phát triển tệp khách hàng thân thiết',
        posting_frequency: '1 bài/ngày',
    },
    {
        key: 'b2',
        name: 'Northwind Fitness',
        description: 'Boutique strength and conditioning studios.',
        color: '#4F7CA8',
        timezone: DEFAULT_TIMEZONE,
        products: 'Gói tập Personal Training 1:1, Lớp nhóm Strength & Conditioning, Thẻ hội viên không giới hạn, Tư vấn dinh dưỡng cá nhân hóa',
        target_audience: 'Nhân viên văn phòng, người bận rộn 24-40 tuổi muốn rèn luyện thể lực bền bỉ, cải thiện vóc dáng và giải tỏa căng thẳng',
        tone_of_voice: 'Năng động, động viên, kỷ luật nhưng thấu hiểu, chuyên nghiệp',
        goals: 'Thu hút 50 khách hàng đăng ký trải nghiệm studio mới, nâng cao nhận diện thương hiệu về phong cách tập bền vững',
        posting_frequency: '1 bài/ngày',
    },
    {
        key: 'b3',
        name: 'Lumen Skincare',
        description: 'Clean-formula skincare built for tropical climates.',
        color: '#C6A15B',
        timezone: DEFAULT_TIMEZONE,
        products: 'Serum cấp ẩm Niacinamide 10%, Gel rửa mặt tràm trà kiềm dầu, Kem chống nắng kiềm dầu SPF50+ PA++++, Kem phục hồi da B5',
        target_audience: 'Phụ nữ & nam giới trẻ 18-35 tuổi tại vùng khí hậu nhiệt đới nóng ẩm, da dầu mụn, tìm kiếm giải pháp dưỡng da lành tính',
        tone_of_voice: 'Khoa học, minh bạch, ân cần, dễ hiểu, không thần thánh hóa',
        goals: 'Tăng 30% doanh số combo chống nắng kiềm dầu mùa hè, giáo dục người dùng về thứ tự skincare khoa học',
        posting_frequency: '1 bài/ngày',
    },
];

const PILLAR_TEMPLATES = [
    {
        key: 'p1',
        name: 'Product Education',
        description: 'Teach people how to get the most out of the product.',
        color: '#79D94B',
        target_percentage: 35,
    },
    {
        key: 'p2',
        name: 'Brand Awareness',
        description: 'Who we are, what we stand for, what happens behind the counter.',
        color: '#4F7CA8',
        target_percentage: 25,
    },
    {
        key: 'p3',
        name: 'Customer Stories',
        description: 'Real customers, real outcomes, told plainly.',
        color: '#C6A15B',
        target_percentage: 20,
    },
    {
        key: 'p4',
        name: 'Community Engagement',
        description: 'Conversations, questions and shout-outs.',
        color: '#8A7FB5',
        target_percentage: 12,
    },
    {
        key: 'p5',
        name: 'Promotional Content',
        description: 'Offers, launches and seasonal pushes.',
        color: '#C2705F',
        target_percentage: 8,
    },
];

const ANGLE_TEMPLATES = {
    p1: ['How-to', 'Common Mistakes', 'Problem–Solution', 'Myth vs Fact', 'Tips & Tricks'],
    p2: ['Behind the Scenes', 'Milestones', 'Culture & Values'],
    p3: ['Success Story', 'Testimonial', 'Transformation'],
    p4: ['Ask the Audience', 'Polls & Questions', 'Customer Shoutouts'],
    p5: ['Limited Offer', 'Seasonal Push', 'Bundle Deal'],
};

const ACCOUNTS = [
    { key: 'a1', brandKey: 'b1', name: 'Aster Coffee Roasters', username: '@astercoffee', external_id: 'demo-page-101', followers: 48210 },
    { key: 'a2', brandKey: 'b1', name: 'Aster Coffee — Thao Dien', username: '@asterthaodien', external_id: 'demo-page-102', followers: 12640 },
    { key: 'a3', brandKey: 'b2', name: 'Northwind Fitness', username: '@northwindfitness', external_id: 'demo-page-201', followers: 31780 },
    { key: 'a4', brandKey: 'b2', name: 'Northwind — District 2', username: '@northwindd2', external_id: 'demo-page-202', followers: 8940 },
    { key: 'a5', brandKey: 'b3', name: 'Lumen Skincare', username: '@lumenskin', external_id: 'demo-page-301', followers: 63920 },
    { key: 'a6', brandKey: 'b3', name: 'Lumen Beauty Vietnam', username: '@lumenbeautyvn', external_id: 'demo-page-302', followers: 15230 },
    {
        key: 'a7',
        brandKey: 'b3',
        name: 'Lumen Skincare (LinkedIn)',
        username: 'lumen-skincare',
        external_id: '',
        followers: 4310,
        platform: 'linkedin',
        account_type: 'profile',
        connection_status: 'configuration_required',
    },
];

const BRAND_ACCOUNTS = { b1: ['a1', 'a2'], b2: ['a3', 'a4'], b3: ['a5', 'a6'] };

const BRAND_POSTS = {
    b1: [
        ['p1', 0, 'Pour-over basics: three ratios that never miss', 'Water at 93°C, 1:15 ratio, 2:45 total brew time. Save this for tomorrow morning.'],
        ['p2', 0, '6am at the roastery: how a batch gets approved', 'Every batch is cupped three times before it goes on the shelf. Here is what we look for.'],
        ['p3', 0, 'Mai switched from instant coffee to single origin', '"I did not think I would notice the difference. Now I cannot go back."'],
        ['p1', 1, 'The five mistakes we see in home brewing', 'Stale beans, boiling water, uneven grind, no scale, and brewing the day after grinding.'],
        ['p5', 0, 'Weekend bundle: 2 bags + a ceramic dripper', 'Available at all four cafés until Sunday evening.'],
        ['p1', 2, 'Cold brew that stays smooth for five days', 'The trick is a coarse grind and a slow 16-hour steep in the fridge.'],
        ['p3', 1, 'From a pop-up cart to four cafés', 'A short look at the last five years, told by the people who were there from the start.'],
        ['p2', 1, 'Why we roast in small batches', 'Small batches cost us more. They also mean every bag reaches you within ten days of roasting.'],
        ['p5', 1, 'Single-origin Ethiopian back in stock', 'Blueberry, jasmine, and a long finish. Limited to 200 bags this month.'],
    ],
    b2: [
        ['p1', 0, 'The four-move warm-up that saves your shoulders', 'Five minutes before every session. No equipment needed.'],
        ['p2', 0, 'A look at how our coaching team plans a block', 'Twelve weeks, three phases, one very full whiteboard.'],
        ['p3', 0, 'Linh deadlifted 100kg for the first time', 'Eighteen months of twice-weekly sessions, and a lot of patience on the last rep.'],
        ['p1', 2, 'Training around a desk job: what actually helps', 'Short sessions, heavy carries, and walking meetings beat one long weekend workout.'],
        ['p5', 0, 'Founding member rate: 12 spots left', 'Locked-in pricing for the District 2 studio opening next month.'],
        ['p1', 3, 'Progress you can measure without a scale', 'Rep counts, sleep, and how stairs feel on a Monday.'],
        ['p3', 1, 'What members say after their first 90 days', 'Three members, three very different starting points.'],
        ['p2', 2, 'How we pick our coaches', 'Two practical assessments, one full week on the floor, and a lot of feedback.'],
        ['p5', 2, 'Bring-a-friend week starts Monday', 'Members can bring one guest to any class, free, all week.'],
    ],
    b3: [
        ['p1', 0, 'How to layer a serum without pilling', 'Thinnest to thickest, thirty seconds between layers, and no rubbing.'],
        ['p2', 0, 'Why we formulate for humidity', 'Most cleansers are built for dry climates. Ours are not.'],
        ['p3', 0, 'Hoa cleared her post-acne marks in 10 weeks', 'Niacinamide in the morning, retinol twice a week, and sunscreen every day.'],
        ['p1', 1, 'Three ingredients that fight each other', 'Retinol and strong acids are the usual culprits. Here is how to alternate them safely.'],
        ['p5', 0, 'Travel kit launch: five minis, one pouch', 'Everything you need for a two-week trip, under 100ml each.'],
        ['p1', 4, 'The order of your routine matters more than the price', 'A clear list you can follow with whatever is already on your shelf.'],
        ['p3', 1, 'A dermatologist on why she recommends our cleanser', 'Short interview, one honest caveat.'],
        ['p2', 1, 'Every batch is tested on 20 volunteers first', 'Here is what that process looks like from the inside.'],
        ['p5', 1, 'Rainy season set: 20% off this week', 'Cleanser, barrier cream and SPF, bundled for the wet months ahead.'],
    ],
};

const MEDIA = [
    // Aster Coffee Roasters (b1) - 22 rich assets for 30-day planner
    { key: 'm1', brandKey: 'b1', name: 'aster-roastery.jpg', file_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Xưởng rang cà phê mộc và mẻ rang Arabica Cầu Đất lúc sáng sớm' },
    { key: 'm2', brandKey: 'b1', name: 'aster-beans.jpg', file_url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Cà phê hạt Single Origin Ethiopia đóng túi zip van 1 chiều cao cấp' },
    { key: 'm3', brandKey: 'b1', name: 'aster-pourover.jpg', file_url: 'https://images.unsplash.com/photo-1521302200778-33500795e128?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Dòng nước rót thủ công trên phễu lọc V60 giấy Nhật Bản' },
    { key: 'm4', brandKey: 'b1', name: 'aster-coldbrew.jpg', file_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Chai thủy tinh Cold Brew ủ lạnh 16 tiếng với hương hoa nhài' },
    { key: 'm5', brandKey: 'b1', name: 'aster-latte-art.jpg', file_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Tách Flat White với lớp bọt sữa mịn màng và họa tiết tulip tinh tế' },
    { key: 'm6', brandKey: 'b1', name: 'aster-cupping.jpg', file_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Quy trình thử nếm cupping chuẩn SCA chấm điểm hương vị hạt' },
    { key: 'm7', brandKey: 'b1', name: 'aster-cafe-thaodien.jpg', file_url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Không gian mở tràn ngập ánh sáng tại chi nhánh Thảo Điền Quận 2' },
    { key: 'm8', brandKey: 'b1', name: 'aster-espresso-crema.jpg', file_url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Dòng espresso vàng óng chảy từ tay pha máy La Marzocco' },
    { key: 'm9', brandKey: 'b1', name: 'aster-drip-bag.jpg', file_url: 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Túi cà phê phin giấy tiện lợi mang đi làm và du lịch' },
    { key: 'm10', brandKey: 'b1', name: 'aster-ceramic-dripper.jpg', file_url: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Bộ phễu lọc gốm thủ công mộc mạc đặt riêng từ làng gốm Bát Tràng' },
    { key: 'm11', brandKey: 'b1', name: 'aster-iced-latte.jpg', file_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Ly Iced Oat Latte tầng lớp sữa và cà phê mát lạnh sảng khoái' },
    { key: 'm12', brandKey: 'b1', name: 'aster-coffee-farm.jpg', file_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Nông trại cà phê Arabica liên kết tại Cầu Đất, độ cao 1600m' },
    { key: 'm13', brandKey: 'b1', name: 'aster-croissant.jpg', file_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Bánh sừng bò nướng mới giòn rụm kết hợp cùng Americano đá' },
    { key: 'm14', brandKey: 'b1', name: 'aster-roast-machine.jpg', file_url: 'https://images.unsplash.com/photo-1518057111178-44a106bad636?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Hệ thống máy rang Giesen kiểm soát nhiệt lượng và luồng gió tối ưu' },
    { key: 'm15', brandKey: 'b1', name: 'aster-green-coffee.jpg', file_url: 'https://images.unsplash.com/photo-1524350876685-274059332603?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Hạt nhân xanh được sàng lọc kỹ lưỡng, loại bỏ hoàn toàn hạt lỗi' },
    { key: 'm16', brandKey: 'b1', name: 'aster-morning-regulars.jpg', file_url: 'https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Khách quen đọc sách và làm việc trong góc quán ngập tràn hương cà phê' },
    { key: 'm17', brandKey: 'b1', name: 'aster-brewing-workshop.jpg', file_url: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Buổi hướng dẫn kỹ thuật pour-over tại gia cùng trưởng nhóm barista' },
    { key: 'm18', brandKey: 'b1', name: 'aster-coldbrew-tonic.jpg', file_url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Signature Cold Brew Tonic sủi bọt cùng lát cam vàng mọng nước' },
    { key: 'm19', brandKey: 'b1', name: 'aster-gift-set.jpg', file_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Set quà tặng 3 vùng hương vị cà phê kèm bình giữ nhiệt inox' },
    { key: 'm20', brandKey: 'b1', name: 'aster-grinder-burrs.jpg', file_url: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Bộ lưỡi dao phẳng máy xay Mahlkönig cho kích thước bột đồng đều tuyệt đối' },
    { key: 'm21', brandKey: 'b1', name: 'aster-barista-team.jpg', file_url: 'https://images.unsplash.com/photo-1497636577773-f1231844b336?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Nụ cười rạng rỡ của đội ngũ pha chế Aster chào đón ngày mới' },
    { key: 'm22', brandKey: 'b1', name: 'aster-eco-cup.jpg', file_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Cốc mang đi tự phân hủy sinh học từ sợi bã mía bảo vệ môi trường' },

    // Northwind Fitness (b2)
    { key: 'm23', brandKey: 'b2', name: 'northwind-floor.jpg', file_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Khu vực thảm tập chức năng và tạ chuông kettlebell' },
    { key: 'm24', brandKey: 'b2', name: 'northwind-lifting.jpg', file_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Học viên thực hiện bài deadlift dưới sự giám sát của HLV' },
    { key: 'm25', brandKey: 'b2', name: 'northwind-dumbbells.jpg', file_url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Dàn tạ tay bọc urethane chuyên nghiệp từ 2.5kg đến 50kg' },

    // Lumen Skincare (b3)
    { key: 'm26', brandKey: 'b3', name: 'lumen-serum.jpg', file_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Chai serum Niacinamide kết cấu lỏng nhẹ thấm nhanh' },
    { key: 'm27', brandKey: 'b3', name: 'lumen-flatlay.jpg', file_url: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Bộ 4 bước chăm sóc da buổi sáng kiềm dầu và chống nắng' },
    { key: 'm28', brandKey: 'b3', name: 'lumen-bottles.jpg', file_url: 'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?auto=format&fit=crop&w=1200&q=80', file_type: 'image', notes: 'Bao bì thủy tinh tối màu bảo vệ hoạt chất khỏi ánh sáng' },
];

const SCHEDULE = [
    { offset: -18, status: 'published', hour: '09:00' },
    { offset: -12, status: 'published', hour: '18:00' },
    { offset: -6, status: 'published', hour: '12:30' },
    { offset: -2, status: 'failed', hour: '10:00' },
    { offset: 1, status: 'scheduled', hour: '09:00' },
    { offset: 3, status: 'scheduled', hour: '18:00' },
    { offset: 6, status: 'scheduled', hour: '12:00' },
    { offset: 0, status: 'draft', hour: '15:00' },
    { offset: 9, status: 'draft', hour: '11:00' },
];

const MEDIA_FOR_POST = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'];

export const DEMO_SEED_FLAG = 'sph_demo_seeded_v1';

/** Builds the full sample workspace. Ids are assigned when the records are written. */
export const buildDemoWorkspace = () => {
    const today = todayInZone(DEFAULT_TIMEZONE);
    const brands = BRANDS.map((b) => ({ ...b, status: 'active', is_demo: true }));
    const pillars = [];
    const angles = [];
    const posts = [];
    const jobs = [];
    const logs = [];

    BRANDS.forEach((brand) => {
        PILLAR_TEMPLATES.forEach((pillar) => {
            pillars.push({
                key: `${brand.key}-${pillar.key}`,
                brandKey: brand.key,
                name: pillar.name,
                description: pillar.description,
                color: pillar.color,
                target_percentage: pillar.target_percentage,
                status: 'active',
                is_demo: true,
            });
            ANGLE_TEMPLATES[pillar.key].forEach((angleName, index) => {
                angles.push({
                    key: `${brand.key}-${pillar.key}-a${index}`,
                    brandKey: brand.key,
                    pillarKey: `${brand.key}-${pillar.key}`,
                    name: angleName,
                    description: `${angleName} posts that support ${pillar.name.toLowerCase()} for ${brand.name}.`,
                    status: 'active',
                    is_demo: true,
                });
            });
        });

        BRAND_POSTS[brand.key].forEach((entry, index) => {
            const [pillarKey, angleIndex, title, caption] = entry;
            const plan = SCHEDULE[index];
            const dateKey = addDays(today, plan.offset);
            const scheduledAt = toUtcIso(dateKey, plan.hour, brand.timezone);
            const accountKeys = BRAND_ACCOUNTS[brand.key];
            const mediaKeys = index % 3 === 0 ? [MEDIA_FOR_POST[index % MEDIA_FOR_POST.length]] : [];
            const postKey = `${brand.key}-post-${index}`;

            posts.push({
                key: postKey,
                brandKey: brand.key,
                title,
                caption,
                platform_captions: {},
                accountKeys,
                mediaKeys,
                pillarKey: `${brand.key}-${pillarKey}`,
                angleKey: `${brand.key}-${pillarKey}-a${angleIndex}`,
                scheduled_at: scheduledAt,
                timezone: brand.timezone,
                status: plan.status,
                published_at: plan.status === 'published' ? scheduledAt : null,
                notes: '',
                is_demo: true,
            });

            if (plan.status === 'draft') return;

            accountKeys.forEach((accountKey, accountIndex) => {
                const account = ACCOUNTS.find((a) => a.key === accountKey);
                const published = plan.status === 'published';
                const blocked = plan.status === 'failed';
                jobs.push({
                    postKey,
                    accountKey,
                    brandKey: brand.key,
                    accountName: account.name,
                    platform: 'facebook',
                    status: published ? 'published' : blocked ? 'blocked' : 'pending',
                    scheduled_for: scheduledAt,
                    attempts: published ? 1 : blocked ? 1 : 0,
                    max_attempts: 3,
                    external_post_id: published ? `DEMO-${brand.key.toUpperCase()}-${1000 + index * 10 + accountIndex}` : '',
                    published_url: '',
                    error_message: blocked
                        ? 'Meta connection required: no approved Facebook Pages connection is available for this workspace, so nothing was sent to Facebook.'
                        : '',
                    last_attempt_at: published || blocked ? scheduledAt : null,
                    is_demo: true,
                });
                logs.push({
                    postKey,
                    jobIndex: jobs.length - 1,
                    account_name: account.name,
                    platform: 'facebook',
                    level: published ? 'success' : blocked ? 'error' : 'info',
                    message: published
                        ? 'Sample dataset: destination recorded as published. No external API call was made.'
                        : blocked
                            ? 'Job blocked before any API call — Meta connection not configured.'
                            : 'Queued for publishing in the sample dataset.',
                    occurred_at: scheduledAt,
                    is_demo: true,
                });
            });
        });
    });

    return {
        brands,
        accounts: ACCOUNTS.map((a) => ({
            ...a,
            platform: a.platform || 'facebook',
            account_type: a.account_type || 'page',
            connection_status: a.connection_status || 'demo',
            brand_id: '',
            avatar_url: '',
            last_synced_at: null,
            is_demo: true,
        })),
        media: MEDIA.map((m) => ({ ...m, file_type: m.file_type || 'image', mime_type: 'image/jpeg', size_bytes: 420000, is_demo: true })),
        pillars,
        angles,
        posts,
        jobs,
        logs,
    };
};