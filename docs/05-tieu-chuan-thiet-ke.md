# 05 — Guideline giao diện MiwaCare (Design System)

> MiwaCare · **v2** · 2026-11-25 · Thay thế bản v1 (bản có các mục TBD).
> **Nguồn màu:** *Design & Brand Guidelines 2023 – Dale & Cecil – MIWAKO Series*, trang "Product Colors for MIWAKO" và "Product Colors for MIWAKO A+" (`NP FOOD/Miwako/MIWAKO Brand guidelines_compressed.pdf`, ảnh trích ở `design/brand-source/`).
> **File dùng cho code:** `design/tokens.json`, `design/tokens.ts` · **Xem trước:** `design/preview.html`

---

## 1. Tinh thần thiết kế

MIWAKO là thức uống dinh dưỡng thực vật cho trẻ. Nhận diện gốc dùng trời xanh, mây trắng, đồi cỏ xanh, nắng vàng và nét vẽ tay vui tươi. MiwaCare dịch tinh thần đó sang ngôn ngữ app:

| Nguyên tắc | Trong app nghĩa là |
|---|---|
| **Trong trẻo, nhẹ nhàng** | Nền trắng và xanh trời nhạt, nhiều khoảng thở, bo góc lớn và mềm |
| **Đáng tin như một thương hiệu dinh dưỡng** | Chữ và nút chính dùng **xanh navy** để rõ ràng, chắc chắn |
| **Niềm vui khi được thưởng** | Vàng nắng chỉ dùng cho điểm thưởng, ưu đãi, hạng. Không dùng tràn lan |
| **Tự nhiên, lành mạnh** | Xanh lá cỏ cho trạng thái tốt (cộng điểm, thành công, xanh "organic") |
| **Điểm thưởng là trung tâm** | Thẻ thành viên luôn ở đầu trang chủ; nút Quét mã chương trình nằm giữa thanh tab, 1 chạm từ mọi màn hình |

**Không làm:** nền tối toàn màn hình ở chế độ sáng; chữ trắng trên nền pastel; nhiều hơn 2 màu nhấn trên một màn hình; dùng font vẽ tay (Dom Casual, Bubble Bobble) cho chữ nội dung.

---

## 2. Màu sắc

### 2.1 Bảng màu gốc của thương hiệu (không được đổi mã)

**MIWAKO (màu chủ đạo của app)**

| Tên trong app | HEX | Vai trò gốc |
|---|---|---|
| `white` | `#FFFFFF` | Trắng mây |
| `sky.50` | `#D1EEFC` | Trời nhạt |
| `sky.100` | `#ABE7FF` | Trời |
| `sky.400` | `#6BCAFA` | Trời đậm — màu nhận diện chính |
| `navy.900` | `#15234B` | Navy — chữ, nền tối |
| `lemon.50` | `#FCFBA9` | Vàng chanh nhạt |
| `lemon.100` | `#FBFB8A` | Vàng chanh |
| `leaf.200` | `#AED283` | Cỏ non |
| `leaf.400` | `#84BB60` | Cỏ — đồi cỏ |

**MIWAKO A+ (màu phụ: dành cho thưởng, hạng cao, ưu đãi)**

| Tên trong app | HEX |
|---|---|
| `sun.50` | `#FFFBB0` |
| `sun.75` | `#EFEFB4` |
| `sun.100` | `#F2DFA8` |
| `sun.300` | `#F1BC63` |
| `sun.400` | `#F2BE21` |
| `sun.500` | `#F7A231` |
| `sun.700` | `#D09F2A` |

### 2.2 Màu bổ sung để đạt chuẩn dễ đọc (dẫn xuất, không thuộc guideline gốc)
Các màu pastel của thương hiệu **không đủ tương phản để làm chữ trên nền trắng**: `sky.400` chỉ đạt 1.83:1, `leaf.400` 2.27:1, trong khi chuẩn WCAG AA cần 4.5:1. Vì vậy app cần thêm vài tông đậm, cùng họ màu, **chỉ dùng cho chữ và icon nhỏ**:

| Token | HEX | Tương phản trên trắng | Dùng cho |
|---|---|---|---|
| `sky.800` | `#0A5E8E` | 6.99 | Link, chữ nhấn màu xanh |
| `leaf.800` | `#336419` | 7.05 | Chữ "+điểm", thành công |
| `amber.800` | `#8A5A00` | 5.93 | Chữ cảnh báo, "sắp hết hạn" |
| `red.700` | `#B42318` | 6.57 | Lỗi, "−điểm", xoá |
| `ink.muted` | `#4A5677` | 7.27 | Chữ phụ |
| `navy.950` | `#0B1430` | 18.15 | Nền chế độ tối |
| `navy.800` | `#1E2F5E` | 12.94 | Bề mặt nổi ở chế độ tối |
| `ink.mutedDark` | `#A9B4D0` | 8.75 trên `navy.950` | Chữ phụ ở chế độ tối |

### 2.3 Màu theo vai trò (semantic): code **chỉ dùng tầng này**

| Token vai trò | Chế độ sáng | Chế độ tối |
|---|---|---|
| `bg` | `white` | `navy.950` |
| `bg.tint` (nền vùng thương hiệu) | `sky.50` | `navy.900` |
| `surface` (thẻ) | `white` + viền `sky.50` | `navy.900` |
| `surface.raised` | `white` + bóng | `navy.800` |
| `text` | `navy.900` | `white` |
| `text.muted` | `ink.muted` | `ink.mutedDark` |
| `text.link` | `sky.800` | `sky.400` |
| `border` | `#DDEAF3` | `navy.800` |
| `action.primary` (nút chính) | nền `navy.900`, chữ `white` (15.3:1) | nền `sky.400`, chữ `navy.900` |
| `action.brand` (nút thương hiệu) | nền `sky.400`, chữ `navy.900` (8.3:1) | nền `sky.100`, chữ `navy.900` |
| `action.reward` (đổi / xem ưu đãi) | nền `sun.400`, chữ `navy.900` (8.9:1) | như sáng |
| `focus` | viền 2px `sky.400` + 2px trắng | viền 2px `sky.100` |
| `success` | chữ `leaf.800`, nền `#EEF6E7` | chữ `leaf.400`, nền `#1F3A1A` |
| `warning` | chữ `amber.800`, nền `sun.50` | chữ `sun.500`, nền `#3A2C0B` |
| `danger` | chữ `red.700`, nền `#FDECEA` | chữ `#F97066`, nền `#3B1512` |
| `points` (số điểm) | `navy.900`, icon `sun.400` | `white`, icon `sun.400` |

### 2.4 Tỷ lệ dùng màu trên một màn hình
**60%** trắng hoặc `sky.50` · **30%** navy (chữ, nút chính) · **10%** nhấn (vàng cho thưởng, xanh lá cho trạng thái tốt).

### 2.5 Màu hạng thành viên (đề xuất, chờ tên hạng thật từ Pancake)

| Hạng (ví dụ) | Nền thẻ | Chữ | Ý nghĩa |
|---|---|---|---|
| Hạng 1 – Thành viên | Gradient `sky.50 → sky.100` | `navy.900` | Trời trong |
| Hạng 2 | Gradient `leaf.200 → leaf.400` | `navy.900` | Đồi cỏ |
| Hạng 3 | Gradient `sun.50 → sun.400` | `navy.900` | Nắng vàng (A+) |
| Hạng 4 – cao nhất | Gradient `navy.900 → #2A3F7A` + viền `sun.400` | `white` | Bầu trời đêm, sao vàng |

App ưu tiên ánh xạ này. Nếu có hạng mới chưa được ánh xạ, app dùng `color_customer_level` từ Pancake.

---

## 3. Font chữ

### 3.1 Danh sách font trong guideline thương hiệu
- **Tiêu đề:** Calibri Bold, Open Sans Bold, Poppins Bold, Coco Gothic, Gilroy, Comfortaa, Gotham.
- **Nội dung:** Calibri, Open Sans, Poppins, Coco Gothic, Arial, Comfortaa.
- **Trang trí:** Bubble Bobble, Dom Casual, Cavolini, Freestyle Script.

### 3.2 Phân tích để chọn font cho app

| Font | Có trong guideline | Giấy phép nhúng vào app | Tiếng Việt | Đọc tốt ở cỡ nhỏ trên điện thoại | Kết luận |
|---|---|---|---|---|---|
| **Open Sans** | Tiêu đề + nội dung | Miễn phí (OFL) | **Có bộ ký tự tiếng Việt đầy đủ** | Rất tốt: thiết kế cho màn hình, nét mở, nhiều độ đậm | ✅ **Font giao diện chính** |
| **Comfortaa** | Tiêu đề + nội dung | Miễn phí (OFL) | **Có** | Kém ở cỡ nhỏ (chữ tròn, hẹp) | ✅ **Font nhấn**, chỉ dùng cỡ ≥ 20 |
| Poppins | Có | Miễn phí (OFL) | **Không có bộ tiếng Việt riêng**, dấu chồng hay lệch hoặc rơi về font khác | Tốt | ❌ Rủi ro hiển thị dấu |
| Calibri, Arial | Có | Thuộc Microsoft, không được nhúng tự do vào app | Có | Tốt | ❌ Giấy phép |
| Gilroy, Gotham, Coco Gothic | Có | Thương mại, phải mua bản quyền app | Tuỳ bản | Tốt | ❌ Chi phí, giấy phép |
| Dom Casual, Bubble Bobble… | Trang trí | Tuỳ font | Tuỳ font | Kém | ❌ Chỉ dùng trong ảnh minh hoạ |

### 3.3 Kết luận: cặp font của MiwaCare
1. **Open Sans** cho toàn bộ giao diện: nội dung, nút, nhãn, số liệu. Tải các độ đậm 400 (Regular), 600 (SemiBold), 700 (Bold).
2. **Comfortaa Bold (700)** cho các điểm nhấn thương hiệu: lời chào trang chủ, tên hạng trên thẻ, tiêu đề lớn của màn hình chào, tiêu đề ưu đãi nổi bật. Nét tròn của Comfortaa gợi đúng chữ MIWAKO dạng bong bóng trên bao bì.

Cả hai đều có trong guideline gốc, miễn phí, nhúng được vào app iOS/Android qua `expo-font` (`@expo-google-fonts/open-sans`, `@expo-google-fonts/comfortaa`) và hiển thị tiếng Việt đầy đủ.

### 3.4 Thang chữ (đơn vị pt/dp)

| Token | Font | Cỡ / dòng | Đậm | Dùng cho |
|---|---|---|---|---|
| `display` | Comfortaa | 32 / 40 | 700 | Số điểm trên thẻ thành viên, tiêu đề màn hình chào |
| `title.brand` | Comfortaa | 24 / 32 | 700 | Lời chào trang chủ, tên hạng |
| `h1` | Open Sans | 24 / 32 | 700 | Tiêu đề màn hình |
| `h2` | Open Sans | 20 / 28 | 700 | Tiêu đề nhóm nội dung |
| `h3` | Open Sans | 17 / 24 | 600 | Tiêu đề thẻ, tiêu đề ưu đãi |
| `body` | Open Sans | 16 / 24 | 400 | Nội dung chính |
| `body.strong` | Open Sans | 16 / 24 | 600 | Nhấn mạnh trong câu |
| `body.sm` | Open Sans | 14 / 20 | 400 | Mô tả phụ |
| `label` | Open Sans | 15 / 20 | 600 | Nút, tab, nhãn ô nhập |
| `caption` | Open Sans | 12 / 16 | 400 | Thời gian, ghi chú, "cập nhật lúc…" |
| `number` | Open Sans | theo ngữ cảnh | 700 | Số tiền, điểm trong danh sách. Bật `fontVariant: ['tabular-nums']` |

Quy tắc chữ:
- Tiếng Việt có dấu chồng, nên **line-height ≥ 1.25 lần cỡ chữ**. Không dùng `letterSpacing` âm.
- **Không viết HOA toàn bộ** câu dài (khó đọc với dấu tiếng Việt). Chỉ viết hoa nhãn rất ngắn ≤ 3 từ, ví dụ "MỚI".
- Cho phép phóng chữ theo cài đặt máy tới 130%. Bố cục không được vỡ ở mức này.

---

## 4. Khoảng cách, lưới, bo góc, đổ bóng

**Khoảng cách** theo bước 4: `xs=4 · sm=8 · md=12 · lg=16 · xl=20 · 2xl=24 · 3xl=32 · 4xl=40 · 5xl=48`.
- Lề trái/phải màn hình: **20**. Khoảng giữa các khối: **24**. Đệm trong thẻ: **16–20**.
- Vùng chạm tối thiểu **44×44**.

**Bo góc**: ngôn ngữ "mây" của thương hiệu, nên bo lớn và mềm.

| Token | Giá trị | Dùng cho |
|---|---|---|
| `radius.sm` | 10 | Chip, badge chữ nhật |
| `radius.md` | 16 | Ô nhập, nút |
| `radius.lg` | 24 | Thẻ nội dung, thẻ ưu đãi |
| `radius.xl` | 28 | **Thẻ thành viên**, bottom sheet |
| `radius.full` | 999 | Nút dạng viên thuốc, avatar, chấm thông báo |

**Đổ bóng** (chế độ sáng, ánh xanh navy nhẹ như guideline web Miwako):
- `shadow.card`: `0 8 24 -8 rgba(21,35,75,0.10)`
- `shadow.raised`: `0 16 36 -10 rgba(21,35,75,0.16)` (thẻ thành viên, sheet)
- Chế độ tối: bỏ bóng, dùng nền `surface.raised` sáng hơn một bậc.

---

## 5. Biểu tượng và hình minh hoạ

- **Icon giao diện:** bộ **Lucide**, nét 2px, đầu nét tròn (hợp tinh thần mềm mại). Cỡ 20 (trong dòng), 24 (tab, nút icon).
- Icon tab: Trang chủ `home` · Thẻ `id-card` · Ưu đãi `ticket-percent` · Hộp thư `inbox` · Tài khoản `circle-user`.
- **Hình minh hoạ** (màn hình chào, trạng thái trống, thành công): dùng **tài sản gốc của thương hiệu**: mây viền nâu, đồi cỏ, bóng bay vàng, bướm, hoa vàng (`NP FOOD/Miwako`). Không tự vẽ phong cách khác.
- **Logo:** MIWAKO dạng bong bóng trên màn hình chào và đầu trang chủ; logo Dale & Cecil cỡ nhỏ ở màn hình chào và trang Pháp lý (bảo chứng thương hiệu mẹ, như guideline quy định).
- **Icon app:** nền `sky.100` → `sky.400` (gradient nhẹ), chữ/biểu tượng MIWAKO trắng viền navy. Cỡ 1024×1024, không trong suốt, không tự bo góc. Android dùng adaptive icon (nền + tiền cảnh tách lớp).

---

## 6. Thành phần giao diện (component)

### 6.1 Nút

| Loại | Nền | Chữ | Khi nào |
|---|---|---|---|
| `primary` | `navy.900` | `white` | Hành động chính duy nhất trên màn hình (Tiếp tục, Lưu) |
| `brand` | `sky.400` | `navy.900` | Hành động thương hiệu nổi bật (Bắt đầu, Xem thẻ) |
| `reward` | `sun.400` | `navy.900` | Liên quan điểm thưởng, ưu đãi |
| `secondary` | `white`, viền `navy.900` 1.5px | `navy.900` | Hành động phụ |
| `ghost` | trong suốt | `sky.800` | Hành động nhẹ (Bỏ qua, Xem tất cả) |
| `danger` | `red.700` | `white` | Xoá tài khoản (chỉ trong sheet xác nhận) |

Cao 52 (lg), 44 (md). Bo `radius.full`. Chữ `label`. Trạng thái: nhấn (tối hơn 8%, thu nhỏ 0.98) · đang tải (spinner, giữ nguyên độ rộng) · vô hiệu (độ mờ 40%).

### 6.2 Thẻ thành viên (`MemberCard`): thành phần quan trọng nhất
```
┌───────────────────────────────────────┐  radius.xl, gradient theo hạng
│ MIWAKO  ·  [Tên hạng – Comfortaa]      │  mây trắng trang trí góc phải (10% độ mờ)
│                                        │
│ 1.250 điểm          (display, ☀ vàng) │
│ Còn 250 điểm để lên Hạng Vàng ▓▓▓▓░░   │
│                                        │
│ - - - - - - - - - - - - - - - - - - - -│  đường kẻ đứt
│ Tích điểm bằng SĐT 0912 ••• 678 [Lịch sử ›]│
└───────────────────────────────────────┘
```
- Thẻ **không có mã khách**. Tại quầy khách đọc số điện thoại; SĐT trên thẻ được che giữa.
- Chạm thẻ → Lịch sử điểm.

### 6.2b Màn Quét mã chương trình (`ScanScreen`)
- Nền tối `navy.950` → `#2A3F7A` (giả lập camera), khung quét 260×260 góc bo `sky.400`, vạch quét `sky.100` chạy lên xuống.
- Tấm dưới nền trắng: giải thích mã đến từ đâu, ô "Nhập mã" + nút Xác nhận, nút "Chọn ảnh mã từ thư viện". Nút đèn flash góc phải trên.
- Kết quả thành công: vòng `leaf.400` có dấu tích, tiêu đề Comfortaa, thẻ chương trình + quà, nút "Xem trong Ưu đãi". Lỗi dùng `dangerBg`/`dangerText` và nói rõ lý do.
- Khi điểm tăng: số đếm lên trong 400ms, có hiệu ứng "nắng" vàng lan nhẹ quanh số điểm.

### 6.3 Thành phần khác

| Component | Quy tắc nhận diện |
|---|---|
| `TextField` | Nền `white`, viền `border`, khi focus viền `sky.400` 2px; nhãn luôn hiện phía trên |
| `OtpInput` | 6 ô 48×56, bo `radius.md`; ô đang nhập viền `sky.400` |
| `PointsBadge` | "+25" chữ `leaf.800` nền `success.bg`; "−10" chữ `red.700` nền `danger.bg` |
| `TierProgress` | Rãnh `sky.50`, thanh gradient `sky.400 → leaf.400`; hạng cao nhất dùng `sun.400` |
| `OfferCard` | Ảnh trên (bo `radius.lg`), tag hạn dùng; sắp hết hạn (≤ 3 ngày) tag `warning` |
| `InboxItem` | Chưa đọc: chấm `sky.400` + tiêu đề `body.strong` |
| `TabBar` | Nền `white`, viền trên `border`; tab đang chọn icon + chữ `navy.900`, có nền viên thuốc `sky.50` |
| `Banner` (mất mạng, nhắc bật thông báo) | Nền `sun.50`, chữ `navy.900`, icon `amber.800` |
| `EmptyState` | Minh hoạ thương hiệu + câu ngắn + nút `brand` (nếu có hành động) |
| `Skeleton` | Màu `sky.50`, nhấp nháy nhẹ |
| `Toast` | Nền `navy.900`, chữ `white`, icon theo trạng thái |

---

## 7. Chuyển động và phản hồi
- 150ms cho trạng thái nhỏ · 250ms chuyển màn hình · 400ms số điểm đếm lên.
- Đường cong `easeOut` mềm, không nảy mạnh.
- Rung nhẹ (haptic light) khi: được cộng điểm, OTP đúng, quét mã thành công.
- Tôn trọng "Giảm chuyển động": tắt hiệu ứng đếm và nắng lan.

---

## 8. Văn phong
- Xưng **"bạn"**, thân thiện, ấm áp như một người bạn chăm sóc gia đình. Chờ thương hiệu xác nhận; nếu đổi thì thay toàn bộ trong file chuỗi.
- Câu ngắn, chủ động, không thuật ngữ kỹ thuật, không mã lỗi.

| Tình huống | Câu mẫu |
|---|---|
| Chào trang chủ | "Chào bạn Lan 👋" |
| Cộng điểm | "Bạn vừa nhận **+25 điểm** từ đơn hôm nay ☀️" |
| Lên hạng | "Chúc mừng! Bạn đã lên **Hạng Vàng**" |
| Mất mạng | "Đang ngoại tuyến. Điểm hiển thị là số cập nhật gần nhất." |
| OTP sai | "Mã chưa đúng, bạn còn 3 lần thử." |
| Trống ưu đãi | "Chưa có ưu đãi mới. Quay lại sau nhé!" |

Định dạng: tiền `1.250.000đ` · điểm `1.250 điểm` · ngày `25/11/2026` · giờ `14:05`.

---

## 9. Khả năng truy cập (bắt buộc)
- Mọi cặp chữ/nền theo bảng 2.3 đều đạt **≥ 4.5:1**. Không đặt chữ trắng lên `sky.*`, `leaf.*`, `lemon.*`, `sun.*`.
- Không truyền đạt thông tin chỉ bằng màu: luôn có dấu `+`/`−`, icon hoặc chữ.
- Mọi icon có nhãn tiếng Việt cho trình đọc màn hình.
- Vùng chạm ≥ 44×44, cỡ chữ phóng tới 130% không vỡ bố cục.

---

## 10. Cách dùng trong code
- Token nằm ở `design/tokens.json` (nguồn) và `design/tokens.ts`. Khi dựng dự án, chuyển vào `packages/shared/theme/`.
- Component **chỉ dùng token vai trò** (`color.text`, `action.primary`…), không dùng mã HEX trực tiếp, không dùng token gốc (`sky.400`).
- Có một màn hình nội bộ (chỉ bản dev) hiển thị toàn bộ component ở cả hai chế độ sáng và tối.

## 11. Việc cần thương hiệu xác nhận
1. Đồng ý dùng **Open Sans + Comfortaa** (cả hai thuộc danh sách guideline).
2. Cách xưng hô: "bạn" hay "ba mẹ" / "anh chị".
3. Tên các hạng thành viên, để chốt màu ở mục 2.5.
4. File logo MIWAKO và minh hoạ (mây, đồi cỏ, bóng bay) bản gốc dạng vector (SVG/AI).
