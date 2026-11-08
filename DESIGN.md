# DESIGN.md — Socialchoice Design System & Implemented Screens

## 1. Visual Identity & Brand Context
- **Phong cách:** Flat SaaS, Premium Minimalist, Monochrome Đen - Trắng - Xám theo chuẩn skill `ui-ux`.
- **Màu sắc:** Tối giản đơn sắc (Deep Charcoal `#181818`, Neutral Grays `#3f3f46`, `#71717a`, `#a1a1aa`, nền trắng card `#ffffff`, đường kẻ hairline `#e5e7eb` / `#eaeaea`). Không lạm dụng màu sặc sỡ để duy trì sự chuyên nghiệp, tập trung cao độ vào dữ liệu.
- **Nút bấm & Tương tác:** Nút chính màu đen nguyên bản `bg-neutral-900 text-white`, nút phụ viền mảnh `border-neutral-200 bg-white`.
- **Typography:** Mona Sans (Headings, 500-600) / Space Grotesk (Body, 400-500).
- **Icons:** Phosphor Icons (`@phosphor-icons/react`), tone trung tính `bg-neutral-100 text-neutral-900`.

## 2. Implemented Screens (Màn đã dựng)

### Content Strategy — Tab Phân bổ & Mục tiêu (Analytics)
- **Phương án đã chọn:** **Phương án 1 / Option A · Full-Width Executive Flow (Báo cáo Phân tầng Toàn màn hình)** theo chuẩn Style Đen - Trắng (Monochrome):
  - **Khối 1 (Top Executive Panel):**
    - 4 thẻ KPI chỉ số chính: Tổng bài viết, Trụ cột nội dung (4 chủ đề), Cân bằng chiến lược (75%), Cần phân loại (12 bài).
    - **Thanh phân bổ tổng thể 100% (Full-Width Stacked Strategy Bar):** Dải tiến độ 100% chia làm 4 phân khúc đơn sắc đen - xám (`#181818`, `#3f3f46`, `#71717a`, `#a1a1aa`) kèm hàng nhãn chú thích phần trăm mục tiêu từng chủ đề.
  - **Khối 2 (Bảng đối sánh Mục tiêu vs Thực tế - Full Width Data Table):**
    - Bảng số liệu chi tiết toàn màn hình đối sánh từng trụ cột: Tên trụ cột, Mục tiêu %, Thực tế %, Thanh so sánh tiến độ có vạch chỉ tiêu, Số lượng bài viết, Huy hiệu trạng thái cân bằng (`✓ Cân bằng`, `+X% Vượt`, `-X% Thiếu`), và Nút hành động nhanh (`+ Lên bài` / `Sửa`).
  - **Khối 3 (Dual Grid 50/50):**
    - Nửa trái: **Ma trận Góc tiếp cận (Angles Matrix)** với 4 ô góc nội dung (How-to, Mistake, Storytelling, Review).
    - Nửa phải: **Lịch xuất bản theo tuần (`DistributionOverTime`)** hiển thị cột tuần màu đen tối giản.
  - **Khối 4 (Khay xử lý hàng loạt bài viết chưa phân loại - Unassigned Queue Table):**
    - Liệt kê toàn bộ các bài viết chưa gán trụ cột, xem trước nội dung sạch (đã dọn cú pháp URN), ngày đăng/bản nháp, và dropdown gán nhanh 1-chạm vào trụ cột ngay tại chỗ, kèm nút "⚡ AI tự động phân bổ".
- **Ngày hoàn thiện:** 2026-11-08
