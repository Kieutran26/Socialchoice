# SocialChoice Roadmap & Architecture Guide

Tài liệu này định hình kiến trúc hệ thống, quy chuẩn kỹ thuật, bài học kinh nghiệm từ các sự cố vận hành (post-mortem), cùng lộ trình phát triển (roadmap) của dự án **SocialChoice**. Tất cả lập trình viên và **AI Agent** tiếp quản dự án bắt buộc phải đọc và tuân thủ các nguyên tắc trong tài liệu này.

---

## 1. Kiến trúc hệ thống (System Architecture)

SocialChoice hỗ trợ 3 môi trường thực thi song song:

```
                      ┌──────────────────────────────────────────────┐
                      │             SocialChoice Frontend            │
                      │       React 19 + Vite + Tailwind CSS         │
                      └──────┬────────────────────┬────────────┬─────┘
                             │                    │            │
             (1) Local Dev   │    (2) Desktop App │            │ (3) Production Cloud
                             ▼                    ▼            ▼
                   ┌──────────────────┐ ┌───────────────┐ ┌──────────────────────┐
                   │ Node.js + SQLite │ │ Tauri Runtime │ │  Cloudflare Workers  │
                   │   Port 3002/API  │ │  Local-only   │ │  Durable Objects (DO)│
                   │ (Dev & Demos)    │ │ (Offline mode)│ │  + Vercel (SPA Host) │
                   └──────────────────┘ └───────────────┘ └──────────────────────┘
```

1. **Môi trường Cục bộ (Local Development & Demos)**:
   - Frontend chạy Vite (mặc định port `5174`).
   - Backend chạy Node.js HTTP server với database SQLite lưu tại `data/socialchoice.sqlite` (port `3002`).
   - File cấu hình `.env.local` kích hoạt `SOCIALCHOICE_LOCAL_API=true`, điều hướng toàn bộ request `/api/*` từ Vite proxy sang `http://127.0.0.1:3002`.
   - **Đặc điểm**: Độc lập 100% với Cloudflare, không bị giới hạn hạn mức request, tài khoản quản trị mặc định: `admin`. Dùng để phát triển tính năng, kiểm thử và demo tức thời.

2. **Môi trường Desktop (Tauri)**:
   - Sử dụng Tauri (`src-tauri`), đóng gói ứng dụng desktop native cho Windows/macOS.
   - Nhận diện qua cờ `isDesktop()` (`window.__TAURI__`).
   - Hỗ trợ chế độ offline single-user (`local-owner`).

3. **Môi trường Cloud Production**:
   - Tên miền chính: `https://socialchoice.site` (Vercel phục vụ Frontend bundle).
   - API Worker: `socialchoice-api.nguyenngockieutran.workers.dev` (Cloudflare Workers).
   - Cơ sở dữ liệu Cloud: Cloudflare Durable Objects (`CustomerDirectory` quản lý tài khoản & license; `Workspace` quản lý bài viết, kênh MXH, lịch đăng).
   - **Giới hạn quan trọng**: Gói Cloudflare Workers Free bị giới hạn cứng **100.000 requests/ngày** cho Durable Objects (reset lúc 00:00:00 UTC hàng ngày).

---

## 2. Bài học sự cố: Cloudflare Error 1101 & Vòng lặp gọi API vô tận (Tháng 11/2026)

### Bối cảnh & Hiện trạng
- Cloudflare gửi cảnh báo vượt 90% rồi chạm trần 100.000 DO requests/ngày, dẫn đến việc toàn bộ request vào Durable Objects bị Cloudflare chặn cứng.
- Người dùng truy cập trang web gặp màn hình lỗi **Cloudflare Error 1101: Worker threw exception**.

### Nguyên nhân gốc rễ (Root Cause)
1. **Lỗi Re-render Loop trong `AuthContext.jsx`**:
   - `useEffect` trước đây phụ thuộc vào `[rawUser]`.
   - Bên trong effect gọi `initAuth()`, hàm này gọi API `appClient.auth.me()` (`/api/session`).
   - Khi API trả kết quả, `setRawUser(me)` được gọi. Vì object trả về từ JSON luôn là một object reference mới trong bộ nhớ, React coi state đã thay đổi (`prevRawUser !== newRawUser`), kích hoạt re-render ngay lập tức và chạy lại `useEffect`.
   - Vòng lặp này lặp đi lặp lại vô tận (mỗi chu kỳ ~0 - 4 giây) ngay cả khi người dùng chỉ mở tab trình duyệt để đó.
2. **Fallback âm thầm thử lại bằng `'admin'` và tạo fake `'local-owner'`**:
   - Khi API gặp lỗi (401 hoặc lỗi quá hạn mức Cloudflare), khối `catch` bên trong `initAuth()` tiếp tục gọi `appClient.auth.loginViaEmailPassword('admin')`, rồi gọi lại `appClient.auth.me()`. Nếu vẫn lỗi thì tạo `localUser = { id: 'local-owner', ... }` và gọi `setRawUser(localUser)`. Do `localUser` cũng là object mới, nó tiếp tục kích hoạt effect chạy lại.
   - Khi xảy ra sự kiện `socialchoice:error` với `'Sign in required'`, listener lại tự động gửi request đăng nhập bằng mật khẩu `'admin'`.
3. **Mỗi request đốt cháy hạn mức Durable Objects**:
   - Trên Cloudflare Workers, mỗi request `/api/session` và `/api/auth/login` đều định tuyến qua DO `CustomerDirectory` và `Workspace`, dẫn tới việc chỉ cần 1 vài tab mở có thể tạo ra hàng chục nghìn request DO trong thời gian ngắn.

### Giải pháp kỹ thuật đã áp dụng (Không được vi phạm trong tương lai)
1. **Tách biệt 3 luồng trong `src/lib/AuthContext.jsx`**:
   - `initAuth()` chạy **duy nhất 1 lần khi mount** (`useEffect(..., [])`).
   - Hiệu chỉnh thành viên (`applyMemberOverlay`) và đồng bộ license (`reconcileSubscriptionWithUser`) nằm ở effect riêng chỉ xử lý dữ liệu local, **tuyệt đối không gọi bất kỳ network API nào**.
   - Dùng `rawUserRef = useRef(rawUser)` để các listener sự kiện luôn lấy được user mới nhất mà không bị stale closure và không cần đưa `rawUser` vào dependency array.
2. **Phân định ranh giới Web vs Desktop**:
   - Trên Web: Khi phiên hết hạn (401), chuyển sang trạng thái chưa đăng nhập để render `<AdminSignIn />`. Không bao giờ tự động thử lại bằng `'admin'` và không tự sinh fake user `'local-owner'`. Khi gặp lỗi mạng / lỗi máy chủ / hết quota, hiển thị thông báo lỗi tĩnh và dừng lại.
   - Desktop: Giữ nguyên fallback offline cho môi trường desktop.
3. **Xử lý lỗi phi-JSON tại `src/api/app-client.js`**:
   - Khi backend trả HTML (như trang Error 1101 của Cloudflare, 502, 504), khử toàn bộ raw HTML và chuẩn hóa thành:
     > *“Máy chủ đang tạm thời không khả dụng. Vui lòng thử lại sau.”*
   - Bảo toàn mã `status` HTTP (`500`, `502`, `401`, v.v.).
   - Tuyệt đối không để thông báo lỗi này kích hoạt nhầm cơ chế `Sign in required`.
4. **Giãn tần suất Polling**:
   - Các tác vụ polling định kỳ tại `Overview.jsx`, `Shortlinks.jsx`, `PublishingNotifications.jsx` đều được nâng lên **5 phút (300.000ms)** và chỉ chạy khi tab đang active (`document.visibilityState === 'visible'`).
5. **Kiểm thử tự động hóa**:
   - Đã thiết lập `server/auth-context-loop.test.js` (7 bài test) và `server/app-client-error.test.js` (5 bài test).
   - Kịch bản đo kiểm Network tự động qua Chrome CDP: `scripts/verify-network-loop.js` (giữ tab mở 3 phút kiểm tra 0 request lặp).

---

## 3. Lộ trình phát triển & Tính năng tiếp theo (Roadmap)

### Giai đoạn hiện tại (Đã hoàn thành)
- [x] Xuất bản bài viết đa kênh: Facebook Pages, Instagram Business, TikTok, Threads, LinkedIn, X.
- [x] Trợ lý sáng tạo nội dung AI (OpenRouter, Gemini, OpenAI) với ma trận nội dung & góc tiếp cận.
- [x] Quản lý chiến dịch, trụ cột nội dung và lịch đăng bài tự động.
- [x] Rút gọn liên kết & theo dõi chuyển đổi UTM (Shortlinks).
- [x] Tích hợp TikTok Shop: Quản lý Seller Center, kho sản phẩm và gắn giỏ hàng vàng (Product Anchor).
- [x] Tích hợp Shopee Affiliate Catalog: Quản lý sản phẩm tiếp thị, tính hoa hồng, tạo link SubID và sinh kịch bản chốt đơn đa kênh.
- [x] Quản trị phân quyền thành viên và chỗ ngồi nhóm (Team Seats & Roles).
- [x] Đóng gói ứng dụng Desktop chạy offline qua Tauri.
- [x] Khắc phục triệt để lỗi vòng lặp Auth API và bảo vệ hạn mức Cloudflare Durable Objects.

### Milestone 1: Tích hợp Zalo Official Account (Zalo OA) 🚀
- [ ] **Mục tiêu**: Hỗ trợ xuất bản bài viết và tin nhắn chăm sóc khách hàng trực tiếp qua Zalo OA (mạng xã hội phổ biến nhất tại Việt Nam).
- [ ] **Kỹ thuật**:
  - Đăng ký và kết nối Zalo App qua Zalo OpenAPI (Zalo Developer Portal).
  - Triển khai OAuth 2.0 PKCE exchange cho Zalo access_token / refresh_token.
  - Hỗ trợ định dạng bài viết: Broadcast bài viết, bài viết Zalo Article, tin nhắn ZNS / tương tác.
  - Tích hợp Zalo Account Card trong màn hình Kênh MXH ([src/pages/Accounts.jsx](file:///d:/Socialchoice/src/pages/Accounts.jsx)).

### Milestone 2: Tích hợp TikTok Shop & Shopee Affiliate Catalog 🛍️
- [x] **TikTok Shop**: Quản lý sản phẩm, tồn kho và liên kết video bán hàng.
- [x] **Shopee Affiliate Catalog**:
  - Quản lý danh mục sản phẩm tiếp thị liên kết Shopee (hoa hồng, giảm giá, số lượng bán, đánh giá).
  - Tự động tạo Deep Link Shopee Affiliate kèm SubID theo dõi chiến dịch / kênh mạng xã hội.
  - Tích hợp AI Copilot gợi ý kịch bản bài đăng Shopee (Facebook, Instagram, TikTok, Threads).
  - Tích hợp ShopeeProductPicker vào trình soạn thảo bài viết `CreatePost.jsx`.

### Milestone 3: Hộp thư tập trung (Social Inbox) & Lá chắn SĐT chống cướp đơn 🛡️
- [x] **Mục tiêu**: Gom toàn bộ comment và tin nhắn từ Fanpage Facebook, Instagram, TikTok, Threads, Zalo OA về một màn hình duy nhất.
- [x] **Kỹ thuật & Tính năng**:
  - Bố cục 3-pane chuẩn SaaS theo tiêu chuẩn UI/UX (`C:\Users\MECHREVO\.agents\skills\ui-ux` & `docs/design-system.md`).
  - **Lá chắn chống cướp đơn (SĐT Shield)**: Tự động quét và phát hiện số điện thoại khách hàng Việt Nam (09x, 08x, 07x, 05x, 03x, +84, kèm khoảng trắng, dấu chấm, dấu gạch ngang) trong bình luận công khai.
  - Tự động ẩn bình luận chứa SĐT trên mạng xã hội và che hiển thị (`098****456`) để chống đối thủ quét cướp đơn hàng.
  - Nhân viên có thể xem số thật, 1-click sao chép SĐT hoặc toggle bật/tắt hiển thị bình luận.
  - **AI Quick Reply (AI Copilot)**: Tự động phân tích ngữ cảnh tin nhắn/bình luận (chốt đơn, xin tư vấn kích cỡ, chính sách giao hàng, khuyến mãi) để gợi ý phản hồi cá nhân hóa theo tên khách.
  - **Mẫu phản hồi nhanh (Quick Snippets)**: Lời chào, Freeship, Xin địa chỉ giao hàng, Hotline hỗ trợ.
  - **CRM mini**: Gắn nhãn khách hàng (Lead nóng, Chờ chốt đơn, Khách sỉ VIP, Cần tư vấn) và ghi chú nội bộ cho từng hội thoại.

### Milestone 4: Tách rời Landing Page tiếp thị khỏi Dashboard 🌐
- [ ] **Mục tiêu**: Đưa Landing Page ra độc lập bên ngoài, tối ưu SEO, tốc độ tải trang và chuyển đổi khách hàng tiềm năng.
- [ ] **Kỹ thuật**:
  - Route `/` phục vụ Landing Page công khai ([landing-page.html](file:///d:/Socialchoice/landing-page.html)).
  - Dashboard quản trị chuyển về route `/app` hoặc `/overview`.
  - Giảm dung lượng bundle ban đầu cho khách vãng lai, tăng điểm Google Core Web Vitals.

### Milestone 5: Tối ưu hạ tầng Cloudflare & Bộ đệm (Caching & Scale) ⚡
- [ ] **Mục tiêu**: Đảm bảo hệ thống chịu tải cao khi có hàng nghìn người dùng sử dụng cùng lúc.
- [ ] **Kỹ thuật**:
  - Xem xét nâng cấp gói Cloudflare Workers Paid ($5/tháng) khi số lượng người dùng thực tế vượt ngưỡng 100.000 requests/ngày.
  - Bổ sung tầng Edge Cache (KV Cache hoặc Cache API) cho các API đọc dữ liệu tĩnh (như cấu hình, danh sách template, thông tin công khai).
  - Tối ưu kích thước Durable Objects SQL storage.

---

## 4. Hướng dẫn dành cho AI Agent tiếp quản

Mỗi khi bạn được giao một tác vụ trong repository này, bạn **PHẢI** tuân thủ các bước sau:

1. **Quy chuẩn UI/UX & Design Contract**:
   - Tuân thủ skill tiêu chuẩn UI/UX tại: `C:\Users\MECHREVO\.agents\skills\ui-ux` (tham chiếu `SKILL.md` và thư mục `references/` về component, layout, responsive, form controls, quy tắc màu sắc và accessibility).
   - Đồng thời đọc [docs/design-system.md](file:///d:/Socialchoice/docs/design-system.md) trước khi tạo hoặc sửa bất kỳ component UI nào. Giữ đúng tone màu, font chữ, nút bấm vát góc (`btn-skew`), và thư viện `@phosphor-icons/react`.
2. **Không sửa đổi cấu trúc AuthContext nếu không có lý do**:
   - Giữ nguyên cấu trúc tách biệt giữa `initAuth()` và `syncEffectiveUser()`.
   - Tuyệt đối không thêm biến state vào dependency array của các effect gọi API nếu state đó thay đổi reference khi API trả về.
3. **Môi trường Test**:
   - Khi chạy test máy chủ, chạy: `node --test server/auth-context-loop.test.js server/app-client-error.test.js`.
   - Trước khi báo hoàn thành, luôn chạy `npm run build` để đảm bảo bundle Vite không bị lỗi cú pháp hay import hỏng.
4. **Môi trường Local**:
   - Khi cần demo hoặc phát triển tính năng không phụ thuộc internet, hãy đảm bảo `.env.local` có `SOCIALCHOICE_LOCAL_API=true` và khởi động qua `npm run dev`.
