SOCIALCHOICE — PROJECT GUIDE
Project name: Socialchoice / Social Publishing Hub
Project location (Windows): D:\Socialchoice
Document purpose: Source of truth for developers and coding assistants working on this project.
Status: Product requirements and implementation guidance, not a claim that the features below already work.
Language: Vietnamese-first interface; technical code and identifiers may be in English.

1. Mục tiêu sản phẩm
Socialchoice là webapp quản lý và lên lịch nội dung mạng xã hội dành cho một người dùng, dự kiến quản lý 10–30 tài khoản thuộc nhiều thương hiệu. Nhu cầu cốt lõi là soạn nội dung một lần, chọn nhiều nơi đăng, tùy chỉnh nội dung theo kênh, đặt lịch, và theo dõi kết quả từng nơi mà không phải chuyển qua lại liên tục giữa các nền tảng.
Ưu tiên số 1: Facebook Pages (Fanpage) thông qua Meta OAuth và Graph API chính thức, kể cả khi người dùng đăng nhập một tài khoản Facebook cá nhân của mình hoặc một tài khoản được công ty cho phép sử dụng. Không hứa hẹn hỗ trợ đăng tự động lên profile/timeline Facebook cá nhân: đăng nhập bằng profile là cách xác thực, còn điểm đến xuất bản là Page có quyền hợp lệ.
Sau Facebook: LinkedIn, Instagram Professional, TikTok, YouTube, X và Reddit (chỉ triển khai khi API và điều kiện từng nền tảng cho phép). Không dùng automation giả lập trình duyệt để lách kiểm soát truy cập, không thu thập Facebook username/password trên giao diện ứng dụng.
Nguyên tắc sản phẩm
- Một người quản trị, nhiều brand và social account; có thể mở rộng thành SaaS sau nhưng không overengineer MVP.
- Giao diện giống sản phẩm SaaS thực tế; dữ liệu lưu bền vững; không tạo nút giả, trạng thái đăng giả.
- Hỗ trợ một nội dung gốc → nhiều phiên bản caption → nhiều publishing jobs (một job/đích đăng).
- Trọng tâm thứ hai, quan trọng ngang trình đăng bài: Content Pillars, Content Angles, và tỷ lệ phân bổ content theo brand/khoảng thời gian.
- Dùng giờ hiển thị mặc định Asia/Ho_Chi_Minh, lưu thời điểm server ở UTC.
- Luôn phân biệt demo/simulation với tài khoản kết nối thật và bài đã đăng thật.
2. Các màn hình chính
1. Overview / Dashboard: tổng số tài khoản kết nối, bài nháp, bài sắp đăng, bài đã đăng, bài lỗi; danh sách upcoming; phân bổ pillar/angle.
2. Brands / Workspaces: tạo/sửa brand, chọn brand; nhóm tài khoản theo brand.
3. Social Accounts: Connect Facebook, Connect another Facebook account, chọn nhiều Pages có quyền truy cập, kiểm tra trạng thái token, reconnect, disconnect.
4. Create Post / Composer: tên nội bộ, brand, caption, ảnh/video, chọn tài khoản đích, phiên bản caption theo nền tảng, pillar, angle, lịch đăng; Save Draft / Publish Now / Schedule.
5. All Posts: tìm kiếm, lọc, xem/sửa/nhân bản/xóa draft; trạng thái và publishing history.
6. Content Calendar: month/week/list; lọc brand, account, pillar, angle, trạng thái; click để xem/sửa, reschedule bài chưa đăng.
7. Content Strategy: quản lý pillar và angle, mục tiêu tỷ lệ, phân bổ thực tế, xem những nhóm chủ đề đang thiếu/thừa.
8. Media Library: upload, xem, gắn media vào post, xóa khi không còn sử dụng.
9. Analytics: trước tiên phân tích nội dung đã tạo và lịch đăng; số liệu hiệu suất từ nền tảng chỉ hiển thị nếu API thực sự cung cấp.
10. Settings: profile, timezone, Meta integration configuration/health, danh sách tác vụ lỗi, bảo mật.
3. Content Pillar & Angle — YÊU CẦU BẮT BUỘC
Pillar = nhóm chủ đề chiến lược dài hạn; Angle = góc khai thác nội dung cụ thể nằm trong một pillar.
- Pillar thuộc một brand. Thuộc tính: name, description, color, target_percentage (0–100), status (active/archived).
- Angle thuộc một pillar, cùng brand. Thuộc tính: name, description, status.
- Tạo bài: chọn brand → chọn pillar của brand → angle chỉ hiển thị các angle thuộc pillar vừa chọn. Đổi pillar thì xóa angle không tương thích.
- Mỗi post có một primary pillar và một primary angle ở MVP. Có thể mở rộng tags phụ về sau.
- Hiển thị Target % vs Actual % theo pillar, đếm theo unique content post làm mặc định: đăng cùng một post lên 7 Page không nhân số lượng nội dung lên 7 lần. Có tùy chọn đổi sang số publishing jobs khi cần.
- Lọc theo brand, khoảng thời gian, kênh, trạng thái, pillar và angle.
- Pillar/angle đã dùng phải được archive thay vì xóa gây mất lịch sử; cần xử lý an toàn nếu người dùng yêu cầu xóa.
- KPI cần nói rõ đếm trên draft/scheduled/published hoặc subset nào; các mốc ngày không có dữ liệu hiển thị empty state.
- Có thể tạo ví dụ: Product Education → How-to, Common Mistakes, Problem–Solution; Brand Awareness → Behind the Scenes, Storytelling; nhưng không hardcode.
4. Publishing workflow và trạng thái
Luồng: Draft → Scheduled → Processing → Published; khi gặp lỗi: Retry Pending / Failed; hỗ trợ Cancelled, Partially Published (aggregate status của post).
- Tạo một publish job cho mỗi destination Page; mọi job có ID riêng, liên kết đến phiên bản nội dung đã khóa để không bị thay đổi ngầm khi sửa draft.
- Worker chạy trên server, không phụ thuộc máy tính người dùng hoặc tab trình duyệt đang mở.
- Retry có giới hạn và exponential backoff cho lỗi tạm thời; xử lý rate limit; token hết hạn; log thông tin đủ để debug nhưng không tiết lộ secret/token.
- Nếu API timeout/không rõ kết quả, kiểm tra tình trạng xuất bản trước khi gửi lại nhằm hạn chế đăng trùng.
- Một Page lỗi không được làm đăng trùng trên các Page đã thành công.
- Chỉ đặt Published khi API cung cấp xác nhận đủ tin cậy; lưu external_post_id, published_url, published_at khi có.
- Nếu chưa cấu hình Meta hoặc chưa được duyệt quyền API, hiển thị rõ Configuration Required / Not Connected, không giả lập đăng thật.
- Upload ảnh/video có thể đòi hỏi workflow bất đồng bộ khác với bài text; có validation riêng.
5. Kết nối Facebook — chi tiết kỹ thuật và ranh giới
- Facebook Login / Meta OAuth thực hiện tại domain Meta chính thức; người dùng có thể kết nối lần lượt nhiều account mà mình được ủy quyền dùng.
- Không bao giờ xây form yêu cầu nhập password Facebook vào Socialchoice; không scrape cookie; không dùng login bot.
- OAuth authorization code xử lý backend, sử dụng state chống CSRF, callback URL cấu hình đúng trên Meta App.
- API list accessible Pages theo scopes được cấp; chỉ hiển thị các Pages thực sự API trả về. Có thể đòi hỏi các quyền như pages_show_list, pages_read_engagement, pages_manage_posts tùy luồng hiện hành; đối chiếu lại Meta docs trước khi code.
- Store token ở server, mã hóa ở trạng thái lưu, không gửi ra client, không log, không commit vào Git. Có cơ chế expiry/reconnect/revoke.
- Quyền quản trị Page không đồng nghĩa có quyền API. App role, Standard/Advanced Access, App Review, Business Verification và các yêu cầu platform có thể ảnh hưởng đến kết nối account không nằm trong nhóm tester/developer.
- Meta API trực tiếp không đồng nghĩa chắc chắn không tốn chi phí: không cần mua Base44 Builder+ để tích hợp, nhưng vẫn có thể có chi phí hosting hay điều kiện/quota/chính sách của Meta.
- Công ty cấp tài khoản/mật khẩu không phải là quyền blanket để chuyển token/dữ liệu ra app cá nhân: chỉ tích hợp tài khoản được phép, tuân thủ chính sách công ty.
- Tương lai có thể dùng các adapter FacebookPublisher, LinkedInPublisher, v.v. với interface chung: validate, publish, getStatus, revoke.
6. Design system — GIỮ ĐÚNG PHONG CÁCH
Phong cách: premium minimalist SaaS, desktop-first, neutral, phẳng, bố cục gọn, nhiều khoảng trắng và separator mảnh. Không gradient, không glassmorphism, không glow, không decorative floating blobs, không màu mè kiểu AI demo.
Màu nhận diện:
- Brand green: #79D94B
- Neutral gray: #EAEAEA
- White surfaces: #FFFFFF
- Text gần charcoal/dark neutral; dùng green có tiết chế cho CTA/selection, không nhuộm cả dashboard màu xanh.
Tokens tham chiếu từ Custom Style (initium.sh) người dùng đưa:
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.269 0 0);
  --card: oklch(1 0 0);
  --primary: oklch(0.7457 0.1639 137.671);
  --primary-foreground: oklch(0.3281 0.0721 137.671);
  --secondary: oklch(0.97 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --border: oklch(0.922 0 0);
  --ring: oklch(0.7457 0.1639 137.671);
}
- Heading: Mona Sans, weight 500 (fallback system sans).
- Body: Space Grotesk, weight 400 (fallback system sans).
- Icons: Phosphor Icons (@phosphor-icons/react nếu dùng React), không trộn Lucide/emoji.
- Buttons: style bold-skewed như ảnh Get lifetime access: primary background green, border xanh đậm, transform: skewX(-5deg), hard shadow xuống 4px, bấm dịch xuống và shadow mất; không dùng soft shadow.
- Form controls: outline, bo tròn dễ chịu; inputs rõ nét; focus ring màu primary.
- Radii tham chiếu: sm 3.6px, md 4.8px, lg 6px, xl 8.4px, 2xl 10.8px, 3xl 13.2px.
- Layout: left sidebar cố định, header/topbar rõ, responsive cho màn nhỏ, compact tables, clean cards, badges trạng thái.
- Không tự ý đổi font, palette, icon family hay tái thiết kế lại UI đang hoạt động nếu không có yêu cầu rõ.
Primary button reference
.btn-primary {
  background: #79D94B;
  color: #203D17;
  border: 1px solid #568F38;
  border-radius: 12px;
  transform: skewX(-5deg);
  box-shadow: 0 4px 0 #568F38;
  transition: transform .1s, box-shadow .1s;
}
.btn-primary:active {
  transform: skewX(-5deg) translateY(4px);
  box-shadow: 0 0 0 #568F38;
}
7. Kiến trúc mong muốn và migration khỏi Base44
Định hướng khi tách Base44: React/Next.js (tùy source hiện tại), PostgreSQL/Supabase, Cloudflare R2 hoặc storage phù hợp, backend riêng quản lý OAuth, background worker/scheduler, adapter cho từng social platform. Không yêu cầu phải dùng đúng folder structure của Base44.
Quan trọng: Hiện có bản source local tại D:\Socialchoice nhưng chưa xác minh framework, cấu trúc dependencies hay trạng thái chức năng. AI/dev mới tham gia phải đọc project hiện tại trước khi sửa:
1. Xem package.json, src/, config, routes, component tree, cơ chế Auth và database.
2. Tìm mọi usage của Base44 SDK/services, liệt kê các chỗ cần thay.
3. Giữ code, screens và styles đã hoạt động; chuyển backend theo từng lát dọc, không rewrite bừa bãi.
4. Kiểm tra tồn tại .env.example; không đọc/in/commit giá trị secrets; dùng biến môi trường riêng.
5. Chạy local, build, lint/test, mở thử dashboard; ghi lại vấn đề thực tế.
6. Tách rõ Implemented, Mock/Demo, Blocked by Meta approval, Not Started.
Cấu trúc tham khảo (có thể điều chỉnh theo source thật):
src/
  app/ or pages/
  components/
    ui/ dashboard/ posts/ calendar/ strategy/
  hooks/
  lib/
    db/ auth/ meta/ scheduler/ storage/ validations/
  types/
  styles/
Không đổi stack chỉ vì một bản template khác đẹp hơn. Quyết định giữ React/Vite hay migrate Next.js chỉ sau khi kiểm tra code và chi phí di chuyển.
8. Data model gợi ý
- users / auth profile — một admin cho MVP.
- brands — brand/workspace metadata.
- social_accounts — provider, remote account id, Page ID, brand id, status, scopes, expiry (metadata không chứa plaintext password).
- oauth_credentials — token encrypted, server-only.
- posts — original content and internal title, brand, primary pillar/angle, draft state.
- post_variants — caption/platform variations, immutable snapshot per scheduled execution.
- content_pillars — brand id, name, color, target percentage, status.
- content_angles — parent pillar id, name, status.
- media_assets — storage key, metadata, mime, size, owner/brand.
- publish_jobs — post revision, destination account, scheduled_at_utc, state, attempt count, external id/url, error.
- publishing_logs — timestamps, safe diagnostics, redacted errors.
DB should enforce tenant/owner access and valid brand/pillar/angle associations. Even with one user, do not expose privileged DB credentials on frontend.
9. MVP priorities
Phase A — Audit and make existing app work standalone
- Audit local source and Base44 references.
- Run current UI locally, retain design and navigation.
- Implement persistent Brands, Pillars, Angles, Drafts, Posts, Calendar using own backend.
Phase B — Real Facebook integration
- Create/configure Meta Developer App (App ID/Secret provided by owner in environment, never in Git).
- Implement OAuth + Page discovery + disconnect + token lifecycle.
- Test text publishing to one authorized Page using real Meta API.
- Implement per-Page publish jobs and reliable scheduler/worker; test scheduling with browser closed.
Phase C — Enhance and scale
- Photo/video publishing, multi-Page batch, platform-specific captions, retries/status, analytics, extra platforms.
External app approval can be slower than coding: do not claim approval or live publishing without real tests.
10. Definition of Done / nghiệm thu
- [ ] UI chạy local, không phụ thuộc Base44 paid connector.
- [ ] Phong cách khớp design tokens, đúng Phosphor icons, không gradient.
- [ ] Brands/Pillars/Angles CRUD thật và lưu sau refresh.
- [ ] Angle filter phụ thuộc selected Pillar; brand isolation chính xác.
- [ ] Create/edit/duplicate drafts; select multiple destinations.
- [ ] Calendar month/week/list hiển thị và reschedule chính xác múi giờ.
- [ ] Content mix: actual vs target đúng theo unique posts, có bộ lọc.
- [ ] OAuth state/callback hoạt động; có khả năng kết nối nhiều Facebook accounts được phép.
- [ ] Lấy Pages và scope từ API thật; không có “connected” giả.
- [ ] Đăng một bài text lên Page test được phép bằng Meta Graph API.
- [ ] Một post đăng nhiều Pages sinh nhiều jobs và không đăng trùng khi retry.
- [ ] Scheduler thực thi ngay cả khi trình duyệt đóng.
- [ ] Log/cảnh báo lỗi, token refresh/reconnect/revoke an toàn.
- [ ] Không lộ secret hoặc token trong client, logs, repo.
- [ ] Có .env.example và README về setup/deploy.
11. Quy tắc cho AI coding agent khi làm trong D:\Socialchoice
Hãy xem file này là product brief và design contract của dự án. Trước khi coding, đọc source thật, xác định các dependency Base44, lập checklist và ưu tiên sửa từng phần nhỏ. Không xóa tính năng đang có. Không claim chức năng Facebook OAuth/publishing đã hoạt động nếu chưa có API credentials, phê duyệt và test thành công. Giữ giao diện hiện tại, màu #79D94B / #EAEAEA, Phosphor Icons, font Mona Sans / Space Grotesk, nút bold-skewed, không gradient. Ưu tiên một luồng end-to-end có thể kiểm thử hơn nhiều nút demo. Sau mỗi thay đổi, ghi rõ file nào sửa, cách chạy, kết quả kiểm thử và blockers. Nếu yêu cầu cần dữ liệu nhạy cảm, chỉ hướng dẫn tạo biến môi trường, không yêu cầu dán secret vào chat.**