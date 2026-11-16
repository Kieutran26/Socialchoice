// Service quản lý Blog & Bài viết chia sẻ trên Socialchoice
const STORAGE_KEY = 'socialchoice:blog_posts';

// Helper tạo slug từ tiêu đề tiếng Việt
export function generateSlug(title = '') {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

// 4 Bài viết mẫu khởi tạo chất lượng cao
export const INITIAL_BLOG_POSTS = [
    {
        id: 'post-1',
        slug: 'giai-ma-thuat-toan-meta-2026-cach-tang-reach-organic',
        title: 'Giải mã thuật toán Meta 2026: Bí quyết tăng 300% Reach tự nhiên cho Fanpage',
        excerpt: 'Phân tích cơ chế chấm điểm tương tác 2 chiều (Conversational Score), thuật toán phạt link ngoài và cách thức ứng dụng Auto First Comment để giữ chân người xem đạt đỉnh reach.',
        category: 'Thuật toán Mạng xã hội',
        author: {
            name: 'Mây Creative',
            role: 'Lead Growth Strategist',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
        coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
        readTime: '6 phút đọc',
        publishedAt: '15 Th11, 2026',
        views: 2410,
        likes: 142,
        isFeatured: true,
        tags: ['Facebook', 'Meta 2026', 'Thuật toán', 'Organic Reach'],
        content: `### 1. Sự dịch chuyển trọng tâm của thuật toán Meta năm 2026

Trong năm 2026, Meta đã cập nhật hệ thống chấm điểm phân phối bài viết (EdgeRank v4). Điểm số quan trọng nhất không còn là số lượt Like đơn thuần, mà là **Conversational Velocity** — tốc độ và chiều sâu của các cuộc hội thoại diễn ra trong phần bình luận.

> "Một bài viết có 20 lượt bình luận đối thoại qua lại giữa Fanpage và độc giả sẽ được phân phối rộng gấp 5 lần so với bài viết có 200 lượt like nhưng không có thảo luận." — Meta Engineering Blog.

---

### 2. Ba yếu tố quyết định bài viết của bạn có "Viral" hay không

1. **Tỷ lệ giữ chân 3 giây đầu tiên (Hook Retention)**: Người dùng dừng ngón tay lại đọc caption hoặc xem ảnh đầu tiên trong album tối thiểu 3 giây.
2. **Đối thoại 2 chiều**: Khi khách hàng đặt câu hỏi hoặc để lại ý kiến, Fanpage phản hồi trong vòng dưới 15 phút sẽ kích hoạt vòng lặp phân phối cấp 2.
3. **Tránh phạt liên kết ngoài (External Link Penalty)**: Khi bạn chèn trực tiếp link website vào caption, Facebook sẽ tự động giảm từ 40% đến 60% lượng phân phối tự nhiên để giữ người dùng ở lại ứng dụng.

---

### 3. Chiến thuật "Auto First Comment" kết hợp Comment-to-Inbox

Thay vì dẫn link trực tiếp vào bài viết:
- Hãy để bài viết tập trung 100% vào giá trị nội dung, kích thích tranh luận hoặc đặt câu hỏi mở.
- Sử dụng tính năng **Auto First Comment** của Socialchoice để ghim đường link kèm mã UTM đo lường ngay trong 0 giây đầu tiên.
- Kích hoạt **Comment-to-Inbox (Auto-DM)**: Kêu gọi người đọc gõ *"TÀI LIỆU"* hoặc *"INBOX"* để hệ thống tự động bắn link tài liệu đầy đủ vào Messenger, vừa đẩy tương tác bình luận tăng vọt, vừa thu thập Lead tự động.

---

### 4. Tần suất đăng bài khuyến nghị
- **Fanpage Doanh nghiệp / B2B**: 1 - 2 bài chất lượng cao mỗi ngày vào khung giờ 11h30 và 20h00.
- **Creator / KOL**: 2 - 3 bài/ngày kết hợp xen kẽ giữa Story, Reel ngắn và bài viết chiều sâu.`,
    },
    {
        id: 'post-2',
        slug: 'chien-luoc-comment-to-inbox-tu-dong-chot-don',
        title: 'Chiến lược Comment-to-Inbox: Biến mọi bài viết Facebook & TikTok thành cỗ máy gom Lead',
        excerpt: 'Hướng dẫn thiết lập phễu chuyển đổi tự động 4 bước: Khách comment từ khóa ➔ Page thả tim ➔ Phản hồi công khai xoay vòng ➔ Bắn tin nhắn riêng kèm ưu đãi giúp tăng x3 tỷ lệ chốt đơn.',
        category: 'Tự động hóa & Lead',
        author: {
            name: 'Minh Hoàng',
            role: 'Automation Specialist',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        },
        coverImage: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&auto=format&fit=crop&q=80',
        readTime: '8 phút đọc',
        publishedAt: '12 Th11, 2026',
        views: 1890,
        likes: 189,
        isFeatured: false,
        tags: ['Auto-DM', 'Chốt đơn', 'Lead Generation', 'Messenger'],
        content: `### Tại sao Comment-to-Inbox là "Vũ khí bí mật" của các nhà bán hàng hiện đại?

Khi lướt mạng xã hội, tâm lý người mua hàng muốn nhận được câu trả lời ngay lập tức. Nếu phải chờ đợi nhân viên trực chat 30 phút - 1 tiếng, 70% khách hàng đã sang đối thủ khác hoặc nguội lạnh ý định mua sắm.

**Comment-to-Inbox (Auto-DM)** giải quyết triệt để bài toán này bằng quy trình 4 bước hoàn toàn tự động:

1. **Khách hàng để lại bình luận** có chứa từ khóa: *"giá"*, *"tư vấn"*, *"inbox"*, *"nhận mã"*.
2. **Fanpage tự động Thả Tim (Like)** bình luận đó ngay sau 5 giây.
3. **Fanpage tự động Trả lời công khai (Public Reply)** với nội dung xoay vòng tự nhiên: *"Dạ {name} kiểm tra tin nhắn riêng của shop nhé, mình vừa gửi thông tin kèm voucher 20% rồi nha! ❤️"*
4. **Hệ thống tự động gửi tin nhắn riêng (Private DM)** qua Messenger với báo giá, hình ảnh sản phẩm và nút bấm đặt hàng trực tiếp.

---

### Quy tắc xoay vòng câu trả lời để chống spam Meta
Một sai lầm phổ biến khi dùng bot là trả lời hàng trăm bình luận bằng đúng 1 câu duy nhất giống hệt nhau. Thuật toán chống spam sẽ khóa tính năng trả lời của Page ngay lập tức.

Với **Socialchoice Auto-DM**, bạn nên cài đặt tối thiểu 3 - 5 biến thể câu trả lời khác nhau, kết hợp thẻ cá nhân hóa \`{name}\` để mỗi câu trả lời đều là duy nhất.`,
    },
    {
        id: 'post-3',
        slug: 'bi-quyet-tai-sinh-noi-dung-da-kenh-1-click',
        title: 'Tái sinh nội dung 1-Click: Từ 1 ý tưởng biến thành bài viết chuẩn 4 nền tảng',
        excerpt: 'Không cần viết lại từ đầu cho từng kênh. Khám phá công thức biến 1 bài Facebook dài thành Thread tâm sự ngắn, bài phân tích chuyên sâu trên LinkedIn và kịch bản video TikTok 30s.',
        category: 'Chiến lược Marketing',
        author: {
            name: 'Thuỳ Dung',
            role: 'Content Lead',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        },
        coverImage: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=1200&auto=format&fit=crop&q=80',
        readTime: '5 phút đọc',
        publishedAt: '08 Th11, 2026',
        views: 3120,
        likes: 254,
        isFeatured: false,
        tags: ['Content Repurposing', 'Đa kênh', 'Omni-channel', 'AI'],
        content: `### Nghịch lý của Content Creator: Tạo nhiều nhưng tiếp cận ít

Nhiều người sáng tạo nội dung dành 4 tiếng để viết một bài phân tích xuất sắc trên Facebook, nhưng sau 24 giờ bài viết chìm vào quên lãng. Trong khi đó, khán giả tiềm năng của họ trên TikTok, LinkedIn và Threads lại chưa từng đọc được nội dung đó.

Giải pháp thông minh không phải là làm việc chăm chỉ gấp 4 lần, mà là **Tái sinh nội dung (Content Repurposing)**.

---

### Công thức "1 Gốc ➔ 4 Ngọn"
- **Kênh Gốc (Facebook)**: Bài viết hoàn chỉnh, cấu trúc tiêu đề hấp dẫn, thân bài chia luận điểm và lời kêu gọi hành động (CTA).
- **Chuyển thể sang Threads**: Cắt gọt dưới 500 ký tự, giọng điệu tâm sự chân thật, chia sẻ bài học hoặc góc nhìn phản biện gây tò mò.
- **Chuyển thể sang LinkedIn**: Thêm góc nhìn quản trị, bài học lãnh đạo, văn phong chuyên nghiệp và chèn 3-5 hashtag định vị ngành.
- **Chuyển thể sang TikTok & Reels**: Trích xuất thành kịch bản video 30-45 giây: 3 giây Hook gây sốc ➔ 3 luận điểm nhanh ➔ Call to Action.

Với tính năng **🪄 AI Tái sinh đa kênh (1-Click)** trên Socialchoice Studio, bạn chỉ cần gõ nội dung 1 lần và bấm nút, hệ thống sẽ tự động chuyển ngữ phong cách cho cả 4 nền tảng chỉ trong 2 giây!`,
    },
    {
        id: 'post-4',
        slug: 'khung-gio-vang-dang-bai-2026-viet-nam',
        title: 'Bản đồ nhiệt Khung Giờ Vàng đăng bài 2026 tại Việt Nam theo từng ngành hàng',
        excerpt: 'Dữ liệu phân tích từ 500,000 bài đăng tại Việt Nam: Giờ vàng của E-Commerce, F&B, B2B và Giáo dục khác nhau như thế nào? Cách lên lịch thông minh để đón đỉnh tương tác.',
        category: 'Nghiên cứu & Dữ liệu',
        author: {
            name: 'Socialchoice Analytics',
            role: 'Data Intelligence',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        },
        coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
        readTime: '7 phút đọc',
        publishedAt: '03 Th11, 2026',
        views: 4560,
        likes: 310,
        isFeatured: false,
        tags: ['Giờ Vàng', 'Heatmap', 'Data Analytics', 'Lên lịch'],
        content: `### Không có "Khung giờ vàng chung" cho tất cả mọi người

Một sai lầm rất lớn là áp dụng khung giờ chung (ví dụ 19h tối) cho mọi ngành nghề. Dữ liệu từ hệ thống phân tích Socialchoice cho thấy hành vi người dùng tại Việt Nam phân hóa rất rõ rệt:

1. **Ngành Bán lẻ & E-Commerce**:
   - Đỉnh 1: **11h45 - 13h00** (Giờ nghỉ trưa, mua sắm giải tỏa áp lực).
   - Đỉnh 2: **20h00 - 22h30** (Thời điểm thư giãn tại nhà, tỷ lệ chốt đơn cao nhất tuần vào tối Thứ 5 và Chủ Nhật).
2. **Ngành B2B & Dịch vụ chuyên nghiệp**:
   - Đỉnh 1: **07h45 - 08h45** (Trước giờ làm việc chính thức).
   - Đỉnh 2: **13h30 - 14h30** (Bắt đầu giờ làm buổi chiều).
   - Thứ 3 và Thứ 4 là 2 ngày có lượng đọc tài liệu B2B cao nhất.
3. **Ngành Ẩm thực & Nhà hàng (F&B)**:
   - Đỉnh vàng: **10h30 - 11h15** (Trước giờ ăn trưa 45 phút) và **16h30 - 17h30** (Trước giờ hẹn ăn tối).

Hãy sử dụng công cụ **Gợi ý Khung Giờ Vàng (Golden Hours Tool)** trong mục Tiện ích của Socialchoice để xem bản đồ nhiệt 24h chi tiết cho ngành của bạn!`,
    },
];

// Khởi tạo và đọc danh sách bài viết
export function getBlogPosts() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BLOG_POSTS));
            return INITIAL_BLOG_POSTS;
        }
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BLOG_POSTS));
            return INITIAL_BLOG_POSTS;
        }
        return parsed;
    } catch {
        return INITIAL_BLOG_POSTS;
    }
}

// Lấy 1 bài viết theo slug
export function getBlogPostBySlug(slug) {
    const posts = getBlogPosts();
    return posts.find((p) => p.slug === slug || p.id === slug) || null;
}

// Thêm hoặc cập nhật bài viết
export function saveBlogPost(postData) {
    const posts = getBlogPosts();
    const now = new Date();
    const formattedDate = `${now.getDate()} Th${now.getMonth() + 1}, ${now.getFullYear()}`;

    if (postData.id) {
        // Cập nhật
        const updated = posts.map((p) => {
            if (p.id === postData.id) {
                return {
                    ...p,
                    ...postData,
                    updatedAt: formattedDate,
                };
            }
            return p;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return postData;
    } else {
        // Tạo mới
        const slug = generateSlug(postData.title) || `post-${Date.now()}`;
        const newPost = {
            id: `post-${Date.now()}`,
            slug,
            title: postData.title,
            excerpt: postData.excerpt || '',
            category: postData.category || 'Chia sẻ kinh nghiệm',
            author: postData.author || {
                name: 'Tác giả Socialchoice',
                role: 'Content Creator',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            },
            coverImage: postData.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
            readTime: postData.readTime || `${Math.max(3, Math.ceil((postData.content || '').split(' ').length / 200))} phút đọc`,
            publishedAt: formattedDate,
            views: 1,
            likes: 0,
            isFeatured: false,
            tags: postData.tags || ['Socialchoice', 'Marketing'],
            content: postData.content || '',
            comments: [],
        };

        const updated = [newPost, ...posts];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return newPost;
    }
}

// Xóa bài viết
export function deleteBlogPost(id) {
    const posts = getBlogPosts();
    const filtered = posts.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
}

// Thích bài viết
export function likeBlogPost(id) {
    const posts = getBlogPosts();
    const updated = posts.map((p) => {
        if (p.id === id) {
            return { ...p, likes: (p.likes || 0) + 1 };
        }
        return p;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated.find((p) => p.id === id);
}

// Thêm bình luận vào bài viết
export function addCommentToBlogPost(id, comment) {
    const posts = getBlogPosts();
    const now = new Date();
    const formattedDate = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} · ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    const newComment = {
        id: `c_${Date.now()}`,
        authorName: comment.authorName || 'Khách độc giả',
        text: comment.text,
        createdAt: formattedDate,
    };

    const updated = posts.map((p) => {
        if (p.id === id) {
            const currentComments = p.comments || [];
            return { ...p, comments: [newComment, ...currentComments] };
        }
        return p;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newComment;
}

// Danh sách danh mục bài viết
export function getBlogCategories() {
    const posts = getBlogPosts();
    const categoryMap = { 'Tất cả': posts.length };

    posts.forEach((p) => {
        const cat = p.category || 'Khác';
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    return Object.entries(categoryMap).map(([name, count]) => ({ name, count }));
}
