# Chiến Lược Định Giá, Phân Hạng Gói & Bảo Vệ Chi Phí Lưu Trữ (Pricing & Editions)

Tài liệu này quy định cấu trúc định giá chính thức, phân bổ tính năng (Quotas), gói tự chọn (**Custom Builder**), lộ trình tính năng **Teams**, chính sách bản **Desktop App (`SC2`)** và các quy tắc bảo vệ dung lượng Database cho **Web App (`SCW1`)** trên 3 thị trường: **Việt Nam (VNĐ)**, **Quốc tế trực tiếp trên Web (USD)** và **Sàn Whop (USD)**.

---

## 1. Triết lý cốt lõi & Định vị 2 dòng sản phẩm

Socialchoice vận hành song song 2 dòng sản phẩm bổ trợ lẫn nhau để tối đa hóa doanh thu và kiểm soát hoàn toàn chi phí lưu trữ đám mây:

| Tiêu chí | 🌐 Bản Cloud Web App (`SCW1` - `socialchoice.site`) | 💻 Bản Windows Desktop App (`SC2` - `.exe`) |
| :--- | :--- | :--- |
| **Mô hình thu tiền** | **Subscription (Tháng / Năm)** + **Gói Custom** + **Lifetime giới hạn suất** trên Whop | **One-Time Purchase (Mua đứt 1 lần)** theo số lượng máy tính + **Update Pass** từ năm thứ 2 |
| **Đối tượng khách hàng** | Người cần **hẹn giờ tự động 24/7 trên mây** (kể cả khi tắt máy), làm việc trên nhiều thiết bị, và **làm việc nhóm (`Teams`)** | Người **ghét trả phí hàng tháng**, cần lưu trữ **kho ảnh/video 4K nặng không giới hạn** trên ổ cứng máy tính, tốc độ tức thì (0s chờ upload) và bảo mật cục bộ 100% |
| **Nơi lưu Database & Media** | Cloudflare Durable Objects SQLite (`CUSTOMER_WORKSPACES`). Ảnh/video chỉ lưu ở bộ nhớ đệm chờ đăng (`image_chunks`) và **tự động giải phóng sau khi bài đã đăng** | Lưu 100% trên ổ cứng máy tính của khách (`AppData` SQLite + thư mục Media cục bộ). Chi phí Server/DB của chủ phần mềm = **0đ** |
| **Chi phí AI (`ChatAgent` / `Autopilot`)** | **BYOK** (Khách tự gắn API Key OpenAI/Gemini) hoặc mua thêm Credit | **BYOK** (Bảo vệ khóa bằng Windows DPAPI trên máy khách) |

---

## 2. Bảng Giá Web Cloud (`SCW1`) Theo 3 Thị Trường

> **Nguyên tắc định giá trên Whop:** Giá trên Whop cao hơn Web trực tiếp khoảng **25%–40%** để bù phí sàn/cổng thanh toán (3%–10%), hỗ trợ chi trả hoa hồng **Whop Affiliates** (20%–30% cho đối tác giới thiệu) và phù hợp với mức chi tiêu của tệp khách hàng US/UK/EU trên Whop.

| Gói (Edition Key) | Số thành viên (`Teams`) | 🇻🇳 Khách Việt Nam (VNĐ) | 🌍 Khách Quốc Tế (Trên Web) | 🔥 Khách trên **WHOP** |
| :--- | :--- | :--- | :--- | :--- |
| **FREE** (`free`)<br>*(Trải nghiệm đủ 100% tính năng)* | **1 Owner** + 1 Thành viên Nháp *(hoặc 1 Guest Link)* | **0đ** | **\$0** | **Free Trial Pass (\$0)** |
| **STARTER** (`starter`)<br>*(Cá nhân / Freelancer)* | **1 Thành viên** + 3 Guest View Links | **99.000đ**/tháng<br>*(790.000đ/năm)* | **\$9**/tháng<br>*(hoặc \$79/năm)* | **\$15**/tháng<br>*(hoặc \$119/năm)* |
| **PROFESSIONAL** ⭐ (`professional`)<br>*(Gói Chủ Lực - Best Seller)* | **3 Thành viên (Team)**<br>*(Thêm ghế: +39k / \$4 / \$6)* | **199.000đ**/tháng<br>*(1.590.000đ/năm)* | **\$19**/tháng<br>*(hoặc \$149/năm)* | **\$29**/tháng *(hoặc \$199/năm)*<br>⚡ **Lifetime: \$149** *(Giới hạn 50 suất)* |
| **BUSINESS / AGENCY** (`business`)<br>*(Đội ngũ & Đa thương hiệu)* | **10 Thành viên (Agency Team)**<br>*(Thêm ghế: +29k / \$3 / \$5)* | **399.000đ**/tháng<br>*(3.290.000đ/năm)* | **\$39**/tháng<br>*(hoặc \$299/năm)* | **\$59**/tháng *(hoặc \$399/năm)*<br>⚡ **VIP Lifetime: \$299** *(Giới hạn 30 suất)* |

---

## 3. Ma Trận 13 Tính Năng & Hạn Mức (Quotas) Của Bản Web (`SCW1`)

Gói **FREE** mở khóa **đầy đủ 100% các tính năng** để người dùng trải nghiệm thực tế trọn vẹn (kết nối MXH thật, đăng bài thật, nhập Excel, dùng AI, tạo Shortlink...), nhưng giới hạn số lượng nhỏ và tự xóa ảnh ngay sau khi đăng để không phát sinh chi phí lưu trữ.

| # | Nhóm tính năng | FREE (`free`) | STARTER (`starter`) | PROFESSIONAL (`professional`) ⭐ | BUSINESS (`business`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Làm việc nhóm (`Teams`)** *(Lộ trình phát triển)* | **1 Owner + 1 Thành viên Nháp** *(Chỉ soạn nháp, không tự đăng)* | **1 Thành viên** + 3 Link chia sẻ lịch (View-only) | **3 Thành viên** + Phân quyền `Owner/Editor` + Ghi chú nội bộ | **10 Thành viên** + Phân quyền theo từng Brand + **Luồng Duyệt Bài (`Approval Workflow`)** + Nhật ký hoạt động |
| **2** | **Thương hiệu (`Brands`)** | **1 Brand** | **1 Brand** | **5 Brands** | **25 Brands** |
| **3** | **Tài khoản MXH thật (`SocialAccounts`)**<br>*(FB, IG, Threads, TikTok, LinkedIn, X)* | **2 tài khoản thật** | **5 tài khoản thật** | **20 tài khoản thật** | **60 tài khoản thật** |
| **4** | **Chiến lược (`Pillars` & `Angles`)** | **2 Pillars & 4 Angles** | **10 Pillars & 30 Angles** | **Không giới hạn** | **Không giới hạn** |
| **5** | **Đăng bài & Hẹn giờ tự động 24/7**<br>*(Calendar Tháng/Tuần/List, Kéo thả)* | **5 bài đăng/tháng**<br>*(Tối đa 2 bài hẹn giờ chờ sẵn cùng lúc)* | **100 bài đăng/tháng** | **Không giới hạn** | **Không giới hạn** |
| **6** | **Bộ nhớ đệm Ảnh/Video (`MediaLibrary` / `image_chunks`)** | **10 MB chờ đăng**<br>*(Tự xóa file gốc ngay sau khi đăng hoặc sau 48h)* | **50 MB chờ đăng**<br>*(Tự giải phóng 24h sau khi đăng)* | **150 MB chờ đăng**<br>*(Tự giải phóng 7 ngày sau khi đăng)* | **200 MB chờ đăng** + Kết nối Google Drive / Cloudflare R2 riêng |
| **7** | **Nhập hàng loạt Excel / CSV (`Bulk Upload`)** | **5 dòng/lần nhập** | **30 dòng/lần nhập** | **200 dòng/lần nhập (Full)** | **200 dòng/lần nhập (Full)** |
| **8** | **Bài đăng lặp lại (`Evergreen / Recurring`)** | **1 bài lặp lại đang bật** | **3 bài lặp lại** | **25 bài lặp lại** | **100 bài lặp lại** |
| **9** | **Rút gọn Link & UTM (`Shortlinks`)** | **3 Tracked Links** | **25 Tracked Links** | **250 Tracked Links** | **1.000 Tracked Links** |
| **10** | **Mẫu bài viết (`PostTemplates`)** | **2 Mẫu bài viết** | **15 Mẫu bài viết** | **Không giới hạn** | **Không giới hạn** |
| **11** | **Ảnh tương tác (`InteractiveImages`)**<br>*(Chạy 100% trên trình duyệt, tốn 0đ server)* | **5 vùng bấm/ảnh** | **10 vùng bấm/ảnh** | **20 vùng bấm/ảnh (Full)** | **20 vùng bấm/ảnh (Full)** |
| **12** | **Trợ lý AI & Autopilot (`ChatAgent` / `Autopilot`)** | **3 lượt AI/tháng (BYOK)** | **ChatAgent không giới hạn (BYOK)** | **Full ChatAgent + AI Autopilot (BYOK)** | **Full AI Autopilot + Đồng bộ Drive/R2** |
| **13** | **Thống kê (`Analytics` & `PublishingLog`)** | **7 ngày gần nhất** | **30 ngày gần nhất** | **Toàn bộ lịch sử** | **Toàn bộ lịch sử + Xuất báo cáo** |

---

## 4. Gói Tự Thiết Kế Theo Nhu Cầu (`Custom Builder` / Build Your Own Plan)

Dành cho khách hàng có nhu cầu đặc thù (ví dụ: chỉ làm 1 mình nhưng quản lý 30 kênh TikTok/Fanpage, hoặc chỉ có 2 Fanpage nhưng có 8 nhân sự Content cùng làm việc).

### 4.1. Bảng đơn giá từng thành phần (Cộng dồn tự động)

| Hạng mục trong Custom Builder | Đơn giá Việt Nam (VNĐ/tháng) | Đơn giá Quốc Tế (USD/tháng) | Quyền lợi đi kèm |
| :--- | :--- | :--- | :--- |
| **0. Phí nền tảng cơ bản (`Base Fee`)** *(Miễn phí khi chọn từ 150k / \$15)* | **49.000đ** *(Miễn phí từ 150k)* | **\$5.00** *(Miễn phí từ \$15)* | Đã gồm: 1 Brand, 1 Owner, AI viết bài & Tự lên lịch cả tuần, Lịch kéo thả, Duyệt bài nhóm, Nhập Excel, 50MB đệm Media |
| **1. Tài khoản MXH (`Social Accounts`)** | **+15.000đ** / 1 tài khoản | **+\$1.00** / 1 tài khoản | Mở thêm hạn mức kết nối OAuth thật |
| **2. Thành viên nhóm (`Team Seats`)** | **+30.000đ** / 1 thành viên | **+\$3.00** / 1 thành viên | Thêm ghế thành viên vào cùng Workspace (Đã bao gồm luồng Duyệt bài nhóm) |
| **3. Thương hiệu (`Brands`)** | **+20.000đ** / 1 Brand | **+\$1.50** / 1 Brand | Brand đầu tiên miễn phí, tính phí từ Brand thứ 2 |
| **4. Bộ nhớ đệm Ảnh/Video (`Staging Media`)** | **+20.000đ** / +50 MB | **+\$1.50** / +50 MB | 50MB đầu miễn phí, tăng thêm theo từng nấc 50MB |
| **5. Rút gọn link & Đo lượt nhấp (`Shortlinks`)** | **+5.000đ** / 10 link | **+\$0.50** / 10 link | Tăng hạn mức số lượng link rút gọn theo dõi lượt bấm (UTM & Click Analytics) |

### 4.2. Quy tắc "Neo giá thông minh" (Smart Upsell Banner)
* Khi khách hàng kéo thanh trượt Custom Builder mà tổng số tiền **lớn hơn hoặc gần bằng gói `Professional` (199.000đ / \$19)** trong khi thông số chọn vẫn nằm trong trần của `Professional`, giao diện sẽ tự động hiển thị gợi ý:
  > 💡 **Tiết kiệm hơn:** *Cấu hình tự chọn của bạn đang là **215.000đ/tháng**. Chuyển sang gói **Professional (199.000đ/tháng)** để tiết kiệm ngay và nhận trọn bộ 20 tài khoản MXH, 5 Brands, 3 Team Seats & Full Autopilot!*

### 4.3. Cấu trúc kỹ thuật trong License `SCW1` cho gói Custom
Trong payload JSON được ký bằng khóa `Ed25519` của file `.scweblicense`, ngoài `edition: "starter" | "professional" | "business"`, hệ thống có thể hỗ trợ `edition: "custom"` (hoặc ghi đè hạn mức khi khách mua thêm Add-on) thông qua trường `quotas`:

```json
{
  "version": "SCW1",
  "edition": "custom",
  "quotas": {
    "brands": 2,
    "social_accounts": 10,
    "team_seats": 2,
    "staging_media_mb": 100,
    "bulk_import_rows": 200,
    "recurring_posts": 25,
    "shortlinks": 250,
    "autopilot": true,
    "approval_workflow": false
  }
}
```

---

## 5. Bảng Giá & Chính Sách Update Bản Windows Desktop App (`SC2`)

Bản Desktop sử dụng khóa license `SC2` gắn liền với từng máy tính (**machine-bound**). Dữ liệu và kho Media nằm hoàn toàn trên ổ cứng của khách nên không giới hạn dung lượng lưu trữ.

### 5.1. Bảng giá mua lần đầu (Kèm 1 năm Update) & Giá gia hạn Update từ năm thứ 2 (`Update Pass` ~25%)

| Gói Desktop (`SC2`) | Số máy tính kích hoạt | Quyền lợi & Khác biệt với bản Web | 🇻🇳 Giá Việt Nam<br>*(Mua lần đầu / Update năm 2+)* | 🌍 Giá Web Quốc Tế<br>*(Mua lần đầu / Update năm 2+)* | 🔥 Giá trên **WHOP**<br>*(Mua lần đầu / Update năm 2+)* |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Desktop Solo** | **1 Máy tính** *(PC hoặc Laptop)* | • Tối đa **3 Brands** & **10 tài khoản MXH**<br>• Kho Media & Bài nháp **không giới hạn** theo ổ cứng máy<br>• Kéo thả ảnh/video 0s chờ upload, làm việc cả khi Offline<br>• Mã hóa khóa bằng Windows DPAPI + AI BYOK | Mua đứt: **390.000đ**<br>🔄 *Update năm 2+: **99.000đ/năm*** | Mua đứt: **\$39**<br>🔄 *Update năm 2+: **\$9/năm*** | Mua đứt: **\$49**<br>🔄 *Update năm 2+: **\$12/năm*** |
| **Desktop Pro** ⭐ *(Bán chạy nhất)* | **2 Máy tính** *(VD: 1 PC + 1 Laptop)* | • **Không giới hạn** Brands, Tài khoản MXH, Kho Media, Excel Import, Shortlink, Template<br>• Full AI Autopilot (BYOK)<br>• Xuất / Nhập toàn bộ Workspace ra file Backup (`.zip`) | Mua đứt: **590.000đ**<br>🔄 *Update năm 2+: **149.000đ/năm*** | Mua đứt: **\$59**<br>🔄 *Update năm 2+: **\$15/năm*** | Mua đứt: **\$79**<br>🔄 *Update năm 2+: **\$19/năm*** |
| **Desktop Agency Pack** | **5 Máy tính** *(Cho nhóm/nhân sự)* | • Mở khóa **100% không giới hạn** cho 5 máy tính<br>• Chia sẻ dữ liệu giữa các máy qua file Backup Workspace *(Lưu ý: Đồng bộ Teams thời gian thực chỉ có trên bản Web Cloud)* | Mua đứt: **1.190.000đ**<br>🔄 *Update năm 2+: **299.000đ/năm*** | Mua đứt: **\$119**<br>🔄 *Update năm 2+: **\$29/năm*** | Mua đứt: **\$159**<br>🔄 *Update năm 2+: **\$39/năm*** |

### 5.2. Bảng riêng: Gói Gia Hạn Cập Nhật Từ Năm Thứ 2 (`Yearly Update Pass` — Chỉ ~25% giá gốc)

Khách hàng mua bản Desktop **không bắt buộc** phải đóng phí hàng năm. Sau khi hết 12 tháng cập nhật miễn phí đầu tiên, khách hàng có 2 lựa chọn:
* **Lựa chọn 1 (Miễn phí):** Tiếp tục dùng phiên bản hiện có trên máy tính vĩnh viễn, không bao giờ bị khóa phần mềm hay mất dữ liệu.
* **Lựa chọn 2 (Mua `Update Pass` — chỉ ~25% giá mua ban đầu):** Mở khóa thêm 12 tháng nhận các bản nâng cấp tính năng lớn mới (Major Releases v2.0, v3.0...) và cập nhật tương thích API mạng xã hội mới nhất cho tất cả các máy trong gói:

| Gói Gia Hạn (`Update Pass`) | Áp dụng cho | 🇻🇳 Khách Việt Nam | 🌍 Khách Quốc Tế (Trên Web) | 🔥 Khách trên **WHOP** |
| :--- | :--- | :--- | :--- | :--- |
| **Solo Update Pass** *(+12 tháng)* | 1 Máy tính (`Desktop Solo`) | **99.000đ** / năm | **\$9** / năm | **\$12** / năm |
| **Pro Update Pass** ⭐ *(+12 tháng)* | 2 Máy tính (`Desktop Pro`) | **149.000đ** / năm | **\$15** / năm | **\$19** / năm |
| **Agency Update Pass** *(+12 tháng)* | 5 Máy tính (`Desktop Agency Pack`) | **299.000đ** / năm | **\$29** / năm | **\$39** / năm |

### 5.3. Kỹ thuật Giao bản Update & Bảo toàn Dữ liệu (0đ chi phí băng thông)
1. **Kiểm tra hạn Update trong License `SC2`:**
   * Trong file license `.sclicense` của bản Desktop có thể lưu trường `updates_until` (mặc định bằng `issued_at + 365 ngày`).
   * Các bản phát hành trước ngày `updates_until` được phép kích hoạt và cập nhật tự động. Khi khách mua **Update Pass**, bạn chỉ cần cấp lại file license với `updates_until` cộng thêm 1 năm.
2. **An toàn dữ liệu 100% khi cài bản mới:**
   * File cài đặt `.exe` nằm ở `Program Files`, tách biệt hoàn toàn với thư mục dữ liệu người dùng (`AppData`). Khi khách cài bản mới đè lên, 100% dữ liệu SQLite, kho ảnh/video và license đã kích hoạt được giữ nguyên vẹn.
   * File cài đặt bản mới được phân phối qua **GitHub Releases** hoặc mục **Releases trên Whop**, tốn **0đ** chi phí băng thông server.

---

## 6. Quy Tắc "Bảo Hiểm Database" Cho Bản Web (`SCW1`)

Để đảm bảo tài khoản Cloudflare (kể cả khi ở gói Free 5 GB hoặc gói Paid) có thể phục vụ hàng nghìn khách hàng mà không bị phình dung lượng:

1. **Tự động giải phóng `image_chunks` sau khi đăng bài (Smart Media Staging):**
   * Bảng `image_chunks` trong SQLite Durable Object chỉ đóng vai trò **bộ nhớ đệm chờ đăng (Staging)**, không lưu trữ vĩnh viễn các file ảnh/video đã xuất bản.
   * Sau khi bài viết chuyển sang trạng thái `published`:
     * Gói **Free**: Xóa các dòng `image_chunks` của bài đó ngay sau khi đăng thành công (hoặc sau 48h nếu để nháp không đăng).
     * Gói **Starter**: Tự động giải phóng sau **24 giờ** kể từ lúc đăng.
     * Gói **Professional / Business / Custom**: Tự động giải phóng sau **7 ngày** kể từ lúc đăng (nội dung chữ, lịch sử đăng, thống kê và đường dẫn bài viết vẫn được giữ lại vĩnh viễn vì chỉ tốn vài KB chữ).
2. **Đóng băng tài khoản Free bỏ hoang (`Dormant Free Account Policy`):**
   * Nếu tài khoản gói **Free** không đăng nhập trong vòng **14 ngày liên tục**, hệ thống tự động tạm dừng các bài đăng lặp lại (`Recurring`) và dọn dẹp bộ nhớ đệm ảnh nháp để không phát sinh lượt chạy `alarm` ngầm trên Cloudflare.
3. **Thu hồi License khi khách hủy thuê bao (`Revocation Cleanup`):**
   * Khi khách hàng hủy gói Subscription trên Whop hoặc không gia hạn, chủ sở hữu (hoặc Webhook của Whop) gọi `/api/admin/licenses/revoke` để chặn phiên đăng nhập, dừng toàn bộ `alarm` hẹn giờ của Workspace đó và giải phóng `image_chunks` sau thời gian ân hạn 14–30 ngày.
4. **Đồng bộ 100% hạn mức giữa Web App và cổng MCP (`Claude` / `ChatGPT` Connector):**
   * Mọi kết nối MCP (`/mcp` qua OAuth 2.1 hoặc Personal Token `sc_mcp_...` trong `server/mcp-server.js`) đều gắn trực tiếp vào cùng **Workspace `store`** của tài khoản đó.
   * Bộ kiểm tra hạn mức (`Quota Guard`) được đặt ở **tầng Backend (`store` / `savePostPlan` / `importMediaIntoStore` / `executeMcpTool`)**, không chỉ chặn ở giao diện React:
     * **Dùng chung 1 bộ đếm duy nhất:** Nếu khách ở gói Free đã dùng hết `5/5` bài nháp/hẹn giờ hoặc hết `15 MB` bộ nhớ đệm Media trên Web, khi ra lệnh cho Claude/ChatGPT gọi `create_draft`, `schedule_post`, `upload_media` hoặc `publish_now` qua MCP, hệ thống sẽ từ chối ngay và báo rõ: *"Đã đạt giới hạn gói hiện tại, vui lòng nâng cấp gói SocialChoice"*.
     * **Không thể vượt trần Brand & Kênh MXH qua MCP:** MCP chỉ có quyền đọc `list_brands` và `list_accounts` đã được tạo hợp lệ trong hạn mức gói trên Web, không có quyền tạo vượt rào.
     * **Khóa đồng thời khi hết hạn License:** Khi gói thuê bao hết hạn hoặc bị thu hồi, toàn bộ token MCP (`mcp_grants`) của Workspace đó cũng tự động bị chặn quyền `posts:write` và `posts:publish`.
