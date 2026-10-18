# Socialchoice Design System — AI implementation contract

Version: 1.2 · Updated: 2026-10-18 · Applies to all application UI.

Mục đích: AI hoặc developer thêm tính năng mà vẫn giữ đúng giao diện Socialchoice hiện có. Đây là hợp đồng triển khai, không phải đề xuất thiết kế lại. `MUST` = bắt buộc; `MUST NOT` = không được; `SHOULD` = mặc định nên làm.

## 1. Read first / quy tắc cho mọi AI

1. MUST đọc tài liệu này, [README](../README.md), component sắp sửa và một màn tương tự trước khi code UI.
2. MUST tái sử dụng token, component và layout hiện có; không dựng một design system song song.
3. MUST giữ font, palette, kiểu nút, mật độ và cấu trúc điều hướng khi yêu cầu chỉ là thêm tính năng/sửa lỗi.
4. MUST NOT đổi global CSS, theme hoặc shared component để giải quyết một nhu cầu chỉ có ở một màn.
5. Nếu người dùng yêu cầu đổi nhận diện, yêu cầu đó được ưu tiên. Đổi đúng phạm vi và cập nhật tài liệu này cùng nguồn token/component trong cùng thay đổi.
6. Khi có mâu thuẫn: yêu cầu trực tiếp mới nhất của người dùng → hợp đồng này cho UI → mã nguồn sở hữu giá trị thực tế → ví dụ/tài liệu cũ. Không tự sửa toàn bộ app để “chuẩn hóa”. Nếu mâu thuẫn ảnh hưởng nhận diện và không giải quyết được từ nguồn, nêu rõ điểm cần quyết định.
7. Hoàn thành phải nêu đã đổi gì và đã kiểm tra gì. Không tuyên bố pixel-perfect hoặc đạt accessibility khi chưa kiểm chứng.

Tài liệu này ghi lại hệ thống đang dùng. Các quy tắc cho UI mới không đồng nghĩa mọi UI cũ đã đáp ứng hoàn toàn.

## 2. Visual identity / những thứ phải giữ

- Premium minimalist SaaS: phẳng, gọn, nền trắng, trung tính, border mảnh, khoảng trắng có chủ đích.
- Green dùng cho action chính (.btn-skew, primary buttons), selection và nhận diện; không phủ xanh dashboard hoặc mọi card.
- Typography: Mona Sans cho heading; Space Grotesk cho nội dung.
- Icon: `@phosphor-icons/react`. Không thêm Lucide, Font Awesome, emoji hoặc icon library khác vào UI.
- Nút chính `.btn-skew`: nền xanh thương hiệu (`--brand-green` #79d94b), chữ xanh đậm (`--brand-green-ink` #203d17), viền `--brand-green-dark`, phẳng, radius 10px; không nghiêng, không bóng.
- MUST NOT thêm gradient, glassmorphism, glow, decorative blobs, đổ bóng mềm hàng loạt, nền tím/xanh dương hoặc phong cách landing-page vào workspace.
- MUST NOT thay bằng Inter/Poppins/Plus Jakarta Sans chỉ vì template hoặc package có sẵn. Font được tải trong HTML không tự động trở thành font được phép dùng.
- Giữ light interface. `darkMode: ['class']` trong Tailwind không có nghĩa app đã có dark theme hoàn chỉnh; không tự thêm dark mode.

## 3. Sources of truth / sửa đúng nơi

| Nội dung | Nguồn sở hữu |
|---|---|
| CSS variables, font, `.btn-skew`, `.panel`, `.label-xs`, `.metric`, composer container rules | [src/index.css](../src/index.css) |
| Tailwind colors, radii, fonts, animations | [tailwind.config.js](../tailwind.config.js) |
| Font tải ngoài và viewport | [index.html](../index.html) |
| Sidebar, topbar, content canvas | [Layout.jsx](../src/components/Layout.jsx) |
| Menu và active route | [sidebar-navigation.jsx](../src/components/layout/sidebar-navigation.jsx) |
| UI primitives | [src/components/ui](../src/components/ui) |
| Reusable page components | [src/components/common](../src/components/common) |
| Status label/tone và timezone | [constants.js](../src/lib/constants.js) |
| Ngôn ngữ và định dạng hiển thị | [i18n.jsx](../src/lib/i18n.jsx), [format.js](../src/lib/format.js) |
| Composer behavior riêng | [composer-preview.md](composer-preview.md) |

Không copy nguyên bảng token sang file CSS mới. Khi nguồn thay đổi có chủ đích, cập nhật bảng liên quan bên dưới. Nếu chỉ thêm màn hình, dùng nguồn hiện có.

## 4. Color tokens

MUST dùng class semantic (`bg-card`, `text-foreground`, `border-border`) hoặc brand (`bg-brand`, `text-brand-ink`). Không hardcode màu mới trong JSX. Ngoại lệ: màu dữ liệu do người dùng chọn, màu pillar/chart có ý nghĩa dữ liệu và preview mô phỏng nền tảng; ngoại lệ không được thay màu shell.

### Brand primitives — dùng cho nhận diện và nút

| CSS variable | Giá trị | Cách dùng |
|---|---|---|
| `--brand-green` | `#79d94b` | Identity/selection/primary action; Tailwind `brand` |
| `--brand-green-hover` | `#86e357` | Brand button hover tint |
| `--brand-green-dark` | `#568f38` | Border/active identity; `brand-dark` |
| `--brand-green-ink` | `#203d17` | Chữ button và selection; `brand-ink` |
| `--brand-gray` | `#eaeaea` | Neutral identity; `brand-neutral` |

### Semantic tokens — giá trị bên trong `oklch(...)`

| Token | Giá trị | Vai trò |
|---|---|---|
| `--background`, `--card`, `--popover` | `1 0 0` | Nền trắng |
| `--foreground`, `--card-foreground`, `--popover-foreground` | `0.269 0 0` | Chữ chính |
| `--surface` | `0.985 0 0` | Surface phụ/sidebar thực tế |
| `--primary`, `--ring` | `0.7457 0.1639 137.671` | Primary semantic/focus (brand green) |
| `--primary-foreground` | `0.3281 0.0721 137.671` | Chữ trên primary (brand green ink) |
| `--secondary`, `--muted`, `--accent` | `0.97 0 0` | Nền trung tính phụ |
| `--secondary-foreground`, `--accent-foreground` | `0.269 0 0` | Chữ trên nền phụ |
| `--muted-foreground` | `0.556 0 0` | Nhãn/helper/metadata |
| `--border`, `--input` | `0.922 0 0` | Border 1px |
| `--destructive` | `0.577 0.245 27.325` | Destructive semantic |
| `--destructive-foreground` | `1 0 0` | Foreground destructive |

Color tokens chứa OKLCH channels, không có wrapper. Consume bằng `oklch(var(--token))`. `.btn-skew` và primary button dùng màu xanh thương hiệu (`--brand-green` / `--brand-green-ink`).

### Status và chart

| Cặp variable | Background OKLCH | Foreground OKLCH | Class |
|---|---|---|---|
| `--success-bg` / `--success-fg` | `0.955 0.05 140` | `0.42 0.11 140` | `bg-successBg text-successFg` |
| `--warn-bg` / `--warn-fg` | `0.965 0.045 85` | `0.48 0.1 75` | `bg-warnBg text-warnFg` |
| `--danger-bg` / `--danger-fg` | `0.95 0.028 25` | `0.47 0.16 27` | `bg-dangerBg text-dangerFg` |
| `--info-bg` / `--info-fg` | `0.95 0.017 250` | `0.45 0.06 250` | `bg-infoBg text-infoFg` |

Chart `--chart-1..5`: lần lượt `0.7457 0.1639 137.671`, `0.62 0.09 90`, `0.55 0.06 250`, `0.66 0.05 200`, `0.4 0 0`. Dùng `oklch(var(--chart-1))` khi thư viện chart cần CSS color; tên `chart-1` không phải chuỗi màu hợp lệ để truyền trực tiếp.

Sidebar hiện dùng `bg-surface`, `border-r` trong Layout. Một số Tailwind `sidebar.*` alias trỏ về token semantic chung thay vì biến `--sidebar-*`; phải đọc mapping thực tế, không suy từ tên rồi sửa cả palette.

## 5. Typography

| Vai trò | Quy ước hiện tại |
|---|---|
| Body | `font-body`: Space Grotesk → system sans; mặc định 14px |
| Heading | `font-heading`: Mona Sans → Neue Haas Grotesk Display Pro → system sans |
| `h1..h4` | Weight 500; letter-spacing `-0.011em` |
| Page title | `PageHeader`: `text-2xl` = 24px |
| Section title | Thường `text-[15px]`, hoặc `text-base` = 16px trong preview |
| Form/table text | Thường `text-sm` = 14px; compact table `text-xs` = 12px |
| Helper | `.label-xs`: 12px / line-height 1.4; muted foreground |
| Status badge | 11px; không tăng thành pill chữ lớn |
| Metric | `.metric`: 26px / line-height 1.15 / weight 500 |
| Mono | `font-mono` chỉ dùng khi nội dung cần monospace |

Không tăng heading lên hero size, dùng heading đậm 700/800 khắp app hoặc làm body nhỏ hơn để nhồi nội dung. Không thu nhỏ toàn bộ UI bằng `transform: scale(...)`.

Mona Sans khai báo `@font-face` trong CSS; Space Grotesk tải qua HTML. Nếu font không tải được, chấp nhận fallback đã khai báo; không tự thay typography toàn app.

## 6. Spacing, radius và density

Hệ spacing hiện dùng Tailwind mặc định (1rem = 16px trong baseline): `1`=4px, `1.5`=6px, `2`=8px, `2.5`=10px, `3`=12px, `4`=16px, `5`=20px, `6`=24px, `8`=32px, `10`=40px. Không có generator spacing/token JSON riêng trong dự án.

- Panel: `.panel p-5` (20px); compact support panel `p-4` (16px).
- Gap giữa section: thường `space-y-5` hoặc `gap-5` (20px).
- Field group: thường `space-y-4` (16px); label cách input `mb-1.5` (6px).
- Page header: `mb-6`; description `mt-2`; actions wrap, gap `4`.
- Table cell: `p-3` (12px), border phân hàng; không bọc mỗi hàng thành card nổi.

| Radius class | Giá trị **custom** |
|---|---|
| `rounded-sm` | 3.6px |
| `rounded-md` | 4.8px |
| `rounded-lg` | 6px |
| `rounded-xl` | 8.4px |
| `rounded-2xl` | 10.8px |
| `rounded-3xl` | 13.2px |

`rounded-lg` không phải 8px và `rounded-2xl` không phải 16px của theme Tailwind mặc định. `.panel` dùng `rounded-2xl`; `.btn-skew` có radius **10px riêng**. Không “sửa cho đồng nhất” hai giá trị này. `rounded-full` chỉ cho avatar/chấm tròn, không thay toàn bộ button/card bằng pill.

## 7. Layout và responsive

| Thành phần | Contract |
|---|---|
| Sidebar | Fixed trái, `w-60` = 240px, `p-5`, border phải, `bg-surface`, z40 |
| Desktop | Từ `lg` = 1024px: sidebar hiện, nội dung `lg:ml-60` |
| Mobile/tablet | Dưới 1024px: sidebar dạng drawer, overlay z30; chọn route đóng drawer |
| Topbar | `h-14` = 56px, border dưới, `px-5`; hiện không fixed/sticky |
| Main | `mx-auto max-w-[1600px] p-5 lg:p-8` |
| Navigation | Active `bg-brand/15 text-brand-ink font-medium`; icon 18px; nhóm Content đóng/mở |
| Composer | Container query theo **chiều rộng canvas**, không phải viewport: từ 800px dùng 30/70, `minmax(0,3fr)` + `minmax(0,7fr)` |
| Composer preview | Sticky `top:76px` khi container ≥800px; dưới ngưỡng xếp chồng |
| Dialog | Overlay z40; content z50; giới hạn 90vh và scroll bên trong; reuse primitive |

Tailwind breakpoints chưa override: `sm`640, `md`768, `lg`1024, `xl`1280, `2xl`1536px. Composer800px là **container breakpoint riêng**.

MUST giữ `min-w-0` cho cột có caption/media. Caption/tên dài dùng `break-words`; metadata ngắn có thể truncate nếu có nơi xem đầy đủ. Table rộng đặt trong `overflow-x-auto`, không để cả trang tràn ngang. Không đổi composer sang 50/50 hoặc dùng `lg:grid-cols-2` vì tiện.

## 8. Component contracts — tái sử dụng trước

| Nhu cầu | Component/class | Quy tắc |
|---|---|---|
| Heading + mô tả + actions | `common/PageHeader` | Không tạo page header style riêng |
| Panel | `.panel` | Nền card, border1px, radius2xl, không có soft shadow |
| KPI | `common/StatCard` | `.metric`, số format qua `formatNumber` |
| CTA | `.btn-skew` | Một primary action mỗi surface; không override background/transform/shadow |
| Secondary action | `Button variant="outline"` | Border trung tính, hover muted |
| Subtle action | `Button variant="ghost"` | Border transparent; không dựng variant chưa có |
| Field | `ui/input`, `ui/textarea`, `ui/select`, `ui/label` | White, border-input, rounded-lg, padding3/2 |
| Status | `common/StatusBadge` | Tone lấy từ constants, không tự chọn màu ở từng màn |
| Empty | `common/EmptyState` | Icon32, heading, giải thích, CTA có tác dụng thật |
| Loading | `ui/skeleton` | Neutral pulse, giữ kích thước layout |
| Dialog | `ui/dialog` | Radix focus/keyboard, title rõ, có đóng/hủy |
| Xóa/xác nhận | `common/ConfirmDialog` | Tái sử dụng xử lý busy/error; không tự skin lại global |
| Review đăng bài | `posts/PublishConfirmation` | Xem đúng tài khoản/nội dung/tệp/giờ trước xác nhận |
| Danh sách bài | `posts/PostTable` | Header muted, row border, hover muted/50 |

### Button systems

- Một primary CTA mỗi page, dialog hoặc panel độc lập: dùng native button/link với `.btn-skew`.
- Header đã có primary: CTA lặp ở empty state dùng `Button variant="outline"`, link qua `asChild`.
- Composer: Publish now là primary; Schedule và Save draft dùng outline. Media upload trong composer là secondary; trong Media Library là primary.
- Các nút khác dùng shadcn `Button` (class-variance-authority + Radix Slot), giữ event handlers, ref và type.
- Variants: default (primary + shadow, hover primary/90), destructive (destructive, hover /90), outline (transparent border, hover accent), secondary (secondary, hover /80), ghost (transparent, hover accent), link (underline on hover).
- Sizes: default h9 px4 py2; sm h8 px3 text-xs; lg h10 px8; icon h9 w9. Base rounded-md, text-sm, font-medium, focus ring, disabled opacity0.5/cursor not-allowed. Tile/image/navigation controls may preserve contextual dimensions.
- Primary: nền brand-green (`#79d94b`), chữ brand-green-ink (`#203d17`); viền `var(--brand-green-dark)` 1px; radius 10px; padding 9px 16px; Space Grotesk 13px/500/line-height 1; gap 8px.
- Hover enabled: background `var(--brand-green-hover)` (`#86e357`); active background `var(--brand-green-dark)` (`#568f38`). Disabled giữ shape, chỉ opacity 0.5 và cursor. Focus dùng ring token. Transition background-color/border-color/opacity 120ms ease.
- Không gradients, glassmorphism, skew transform hoặc shadow trên primary. Không hardcode hex trên buttons.
- Icons: Phosphor; trong primary size 16, weight duotone.

## 9. States, accessibility và nội dung

- Mỗi màn mới SHOULD xử lý rõ loading, empty, success, error, busy/disabled. Không dùng màu làm tín hiệu duy nhất.
- Status post: draft/cancelled→neutral; scheduled→info; processing/partially_published/unknown→warn; published→success; failed→danger. Dùng `POST_STATUS_LABEL` + `POST_STATUS_TONE`; job/account có mapping riêng trong constants.
- `unknown` không được hiển thị như thất bại chắc chắn hoặc thành công; zero và unavailable phải phân biệt.
- UI dùng `useTranslation().t(...)`; bổ sung bản dịch vào locale phù hợp. Không hardcode riêng tiếng Anh trên màn mới. Không dịch caption/tên do người dùng nhập.
- Hiển thị ngày/số qua `format.js`, timezone qua contract hiện có; không tự gọi `toLocaleString()` thiếu timezone rồi tạo kết quả khác màn kế bên.
- Input mới MUST có label liên kết bằng `htmlFor`/`id` hoặc label bao control; placeholder không thay label. Icon-only button phải có accessible name.
- Giữ focus-visible: outline2px ring token, offset2px. Không bỏ outline nếu không có thay thế nhìn thấy được.
- Dùng button/link thật; hỗ trợ bàn phím. UI mới phải có vùng bấm tối thiểu24×24px hoặc spacing tương đương; ưu tiên44px ở thao tác touch chính. Đây là yêu cầu cho thay đổi mới, không phải chứng nhận các control cũ đã đạt.
- Lỗi quan trọng có `role="alert"`; trạng thái đang chạy có `role="status"` khi phù hợp. Không chỉ toast nếu người dùng cần sửa một field cụ thể.
- Giữ chữ đọc được trên nền status. Nếu phát hiện vấn đề contrast, sửa đúng phạm vi và kiểm tra thực tế; không tự đổi palette toàn app.
- Không thêm motion trang trí. Animation có sẵn: pulse, fade-up280ms/6px, accordion200ms; khi thêm motion phải tôn trọng `prefers-reduced-motion`. Không tuyên bố reduced-motion đã được triển khai cho mọi animation cũ.
- Preview từng nền tảng là mô phỏng nội dung, không cho phép thay đổi shell theo thương hiệu Facebook/TikTok/LinkedIn.

## 10. Example: thêm một form panel đúng phong cách

Ví dụ composition; callback/state do feature thật cung cấp, không thêm màn demo vào app:

```jsx
import { useTranslation } from '@/lib/i18n';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TitleEditor({ title, onTitleChange, onSave, busy }) {
    const { t } = useTranslation();
    return <>
        <PageHeader title={t('Edit post')} />
        <section className="panel p-5 space-y-4">
            <div>
                <Label htmlFor="post-title" className="label-xs mb-1.5 block">
                    {t('Post title (internal)')}
                </Label>
                <Input id="post-title" value={title}
                    onChange={event => onTitleChange(event.target.value)} />
            </div>
            <div className="flex flex-wrap justify-end gap-3">
                <button type="button" className="btn-skew" disabled={busy} onClick={onSave}>
                    {t(busy ? 'Saving…' : 'Save draft')}
                </button>
            </div>
        </section>
    </>;
}
```

## 11. Anti-drift checklist trước khi giao

- [ ] Đã đọc màn/component tương tự; không tạo bản sao của primitive có sẵn.
- [ ] Font, neutral/green identity palette, border, radius, flat brand-green CTA và navigation giữ đúng contract.
- [ ] Không sửa global token/layout ngoài phạm vi yêu cầu; không cài UI/icon/font library mới vì tiện.
- [ ] State loading/empty/error/disabled có ý nghĩa thật; không thêm số liệu hoặc trạng thái đăng giả.
- [ ] Nhãn/dịch/format nhất quán; caption và tên dài không phá bố cục.
- [ ] Kiểm tra màn rộng khoảng1440px và màn nhỏ khoảng390px; drawer và dialog dùng được bằng bàn phím.
- [ ] Với composer: kiểm tra canvas trên/dưới800px, không chỉ resize viewport; media và account preview còn hoạt động.
- [ ] Với shared component/token: kiểm tra ít nhất một màn khác đang tái sử dụng nó; không làm lệch các trang không liên quan.
- [ ] Chạy kiểm tra phù hợp trong package.json khi sửa mã; thay đổi tài liệu đơn thuần kiểm tra link và đối chiếu nguồn, không cần khởi động server.
- [ ] Nếu UI thay đổi: lưu bằng chứng screenshot khi có thể; ghi rõ phần nào chưa kiểm tra.
- [ ] Nếu chủ đích đổi design contract: cập nhật tài liệu này và nguồn sở hữu, không để hai bộ quy tắc mâu thuẫn.

## 12. Short instruction để mang sang AI khác

> Before editing Socialchoice UI, read `docs/design-system.md`, `README.md`, the affected component and a similar existing screen. Preserve the documented light neutral/green identity, Mona Sans/Space Grotesk typography, Phosphor icons, flat brand-green primary buttons, custom radii, layout and responsive contracts. Reuse existing tokens and components. Do not redesign, change global styles or add a new UI system unless the user explicitly requests that scope. Verify relevant states and desktop/mobile behavior; report what was actually checked. Update the design contract only when an intentional design change is requested.
