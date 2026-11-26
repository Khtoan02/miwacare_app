# Phương án kết nối Pancake POS (đề xuất, chưa chốt)

> Ngày: 2026-11-26. Nguồn: tài liệu Open API chính thức https://pos.pancake.vn/developers/api/en (bản Markdown, đọc ngày 2026-11-26).
> Trạng thái: **đề xuất**. Q-05 trong `../12-quyet-dinh-da-chot.md` (Pancake tạm hoãn) vẫn có hiệu lực cho đến khi bạn chốt.
> Mục đích: trả lời câu hỏi mở số 1 của tài liệu 12, "điểm được tính từ đơn nào?".
> 2026-11-26: bạn cho biết Pancake POS có sẵn phần điểm thành viên; việc dùng hay tắt phần đó **để tính sau**. Bước tiếp theo là dựng Supabase.

## 1. Ba phương án

| | A. Pancake làm sổ cái điểm | **B. Pancake cấp đơn, MiwaCare tính điểm (đề xuất)** | C. Không dùng Pancake |
|---|---|---|---|
| **Đơn hàng** | Từ Pancake | Từ Pancake (webhook + đối soát) | Nhân viên nhập tay / nhập CSV trên trang quản trị |
| **Ai tính điểm, hạng** | Pancake (cấu hình trong POS) | Máy chủ MiwaCare, theo cấu hình có phiên bản (Q-05) | Máy chủ MiwaCare |
| **Quy tắc linh hoạt** (nhân điểm theo ngày, sinh nhật, theo hạng…) | Chỉ những gì Pancake có | Đủ như màn "Điểm & hạng" đã làm | Đủ |
| **Công sức nhân viên** | Không thêm | Không thêm: bán trên Pancake như cũ | Phải nhập lại từng đơn → dễ sót, sai |
| **Đổi điểm trong app** | Khó: API chỉ ghi đè `reward_point` (xem tài liệu 01, mục 2.4) | Dễ: trừ trong sổ `point_ledger` của mình | Dễ |
| **Đã có sẵn trong code** | Chưa | Phần lớn: sổ điểm, quy tắc, trang quản trị. Thêm bộ đồng bộ đơn | Đã có (bản mẫu) |

**Đề xuất B**, vì: giữ nguyên toàn bộ phần tính điểm và trang quản trị đã làm (công tắc `points_source` vẫn là `internal`), không bắt nhân viên nhập lại đơn, và tránh được giới hạn "chỉ ghi đè điểm" của Pancake.

Điều kiện đi kèm B: **không bật tích điểm của Pancake** (hoặc bật nhưng thông báo với thu ngân rằng số điểm đúng là số trên app). Nếu hai hệ cùng tính, khách sẽ thấy hai con số khác nhau.

## 2. Những gì API cho phép (đã kiểm tra)

- **Địa chỉ:** `https://pos.pages.fm/api/v1`, khoá `api_key` gửi qua query, `{SHOP_ID}` trong đường dẫn.
- **Khoá:** dùng **Shop API key** (Cài đặt › Ứng dụng › Webhook/API › API Key). Toàn quyền một shop, nên chỉ được nằm trên máy chủ.
- **Giới hạn:** đọc dưới 30 request/giây, ghi dưới 100 request/giây, tính theo từng endpoint và chung cho mọi khoá của shop. Sai khoá 20 lần/phút từ một IP thì IP bị khoá 5 phút.
- **Lấy đơn đã thay đổi:** `GET /shops/{SHOP_ID}/orders?updateStatus=updated_at&startDateTime=<unix>&endDateTime=<unix>&page_size=…&page_number=…`, có `include_removed` để lấy cả đơn đã xoá.
- **Webhook:** các loại `orders`, `customers`… Mình tự đặt header bí mật; **không có chữ ký**.
  - Phải trả 2xx trong 30 giây.
  - Lỗi thì Pancake gửi lại sau 10 phút, rồi 30 phút nữa, sau đó bỏ sự kiện đó.
  - Máy chủ lỗi liên tục: Pancake **tạm ngưng gửi** rồi gửi lại khi máy chủ ổn.
  - URL sai: Pancake **tắt hẳn webhook** của shop, phải bật lại tay.
  - Tài liệu không mô tả nội dung payload webhook (schema để trống), nên chỉ lấy ID rồi đọc lại qua API, đúng như tài liệu 01, mục 3.2.
- **Tiền:** shop VND lưu số nguyên đúng bằng số đồng. Nếu tiền tệ của shop là `VND100` thì phải chia 100, cần kiểm tra bằng `GET /shops`.

### Trường của đơn dùng để tính điểm

| Trường Pancake | Dùng làm gì |
|---|---|
| `id`, `updated_at` | Khoá đơn, chống xử lý trùng hoặc sai thứ tự |
| `bill_phone_number`, `customer.id` | Ghép với thành viên (số điện thoại chuẩn hoá; lưu `pancake_customer_id` sau lần ghép đầu) |
| `total_price`, `total_discount`, `shipping_fee`, `money_to_collect` | Số tiền tính điểm (cần chốt lấy trường nào, xem mục 4) |
| `status` | Đổi sang trạng thái của MiwaCare (bảng dưới) |
| `received_at_shop` | `true` = bán tại quầy, `false` = bán online |
| `order_sources` | Kênh bán (quầy, Facebook, website…) nếu muốn chỉ tích điểm một số kênh |
| `prepaid_by_point` | Đơn có trả bằng điểm của Pancake không (để phát hiện thu ngân vẫn dùng điểm Pancake) |
| `inserted_at` | Thời điểm mua → chọn phiên bản quy tắc đang hiệu lực |

### Đổi trạng thái đơn

| Pancake (`status`) | MiwaCare | Điểm |
|---|---|---|
| `3` Đã nhận, `16` Đã thu tiền | `done` | Cộng điểm (một lần mỗi đơn) |
| `6` Đã huỷ, `7` Đã xoá, `5` Đã hoàn | `cancelled` | Nếu đã cộng thì ghi dòng trừ lại |
| `4` Đang hoàn, `15` Hoàn một phần | Giữ trạng thái cũ, đưa vào danh sách cần xem | Cần chốt quy tắc (mục 4) |
| Các trạng thái khác (`0` Mới, `1` Đã xác nhận, `2` Đã gửi hàng, `8`, `9`, `11`, `12`, `13`, `17`, `20`) | `shipping` | Chưa cộng |

Cách tính này dùng đúng hàm `earnedPoints` / `ruleAt` đang có trong `apps/mobile/src/domain`. Bảng `orders` hiện đã cho phép `source = 'pancake'`; cần thêm cột `pancake_order_id` (unique) và `pancake_status`.

## 3. Luồng chạy (trên Supabase, không có trong app)

1. **Webhook `orders`** → Edge Function kiểm tra header bí mật → ghi ID vào `sync_queue` → trả 200 ngay.
2. **Worker** đọc lại đơn qua `GET /orders/{id}` → ghép khách theo số điện thoại → upsert `orders` → nếu trạng thái đổi sang `done` / `cancelled` thì ghi dòng `point_ledger` (khoá chống trùng: `pancake_order_id` + loại dòng).
3. **Đối soát mỗi 5 phút:** đọc các đơn có `updated_at` trong 15 phút gần nhất, bù webhook bị mất.
4. **Đối soát đêm:** đọc lại đơn 3 ngày gần nhất; báo cáo đơn có số điện thoại không khớp thành viên nào (khách chưa cài app: giữ lại, khi khách đăng ký thì cộng điểm bù nếu bạn muốn).
5. **Giám sát:** cảnh báo Telegram khi webhook im lặng quá lâu trong giờ bán hàng (dấu hiệu Pancake đã tắt webhook).

Không đẩy gì về Pancake ở giai đoạn này. Ghi về Pancake (tạo khách, gắn tag `app_member`) để sau.

## 4. Cần kiểm tra với dữ liệu thật trước khi chốt

Chỉ cần **đọc**, không ghi gì vào Pancake. Làm trên máy chủ hoặc máy của bạn với khoá trong `.env`, không dán khoá vào chat.

1. `GET /shops`: tiền tệ là `VND` hay `VND100`.
2. Đơn bán tại quầy: sau khi thanh toán có lên ngay `3` / `16` không, hay dừng ở trạng thái khác.
3. Số tiền tính điểm: `total_price` đã trừ giảm giá chưa, có gồm phí ship không. So 3–5 đơn thật với hoá đơn in.
4. Đơn hoàn một phần (`15`): trừ điểm theo tỷ lệ tiền hoàn hay không trừ. Endpoint `GET /orders_returned` có số tiền hoàn.
5. Shop đang bật tích điểm / hạng thành viên của Pancake không. Nếu có: tắt, hay để song song.
6. Bán online (Facebook, website) có đi qua Pancake không, có được tích điểm không.
7. Nội dung thật của webhook `orders` (bắt 1 lần trên URL thử).

## 5. Bảo mật

- Khoá Pancake chỉ nằm ở **Supabase Secrets** (`PANCAKE_API_KEY`, `PANCAKE_SHOP_ID`, `PANCAKE_WEBHOOK_SECRET`) và file `.env` trên máy (không commit).
- **Khoá đã lộ phải đổi:** xoá khoá cũ trong Cài đặt › Ứng dụng › Webhook/API, tạo khoá mới. Khoá cũ bị từ chối ngay.
- App và trang quản trị không bao giờ gọi Pancake.

## 6. Thứ tự làm nếu chọn B

1. Bạn: đổi khoá, điền `.env`, trả lời mục 4 (mình có thể soạn script chỉ-đọc để bạn chạy trên máy).
2. Tạo dự án Supabase (cần bạn tạo tài khoản), áp schema.
3. Edge Function nhận webhook + worker + cron đối soát; thêm cột `pancake_order_id`.
4. Trang quản trị: màn Đơn hàng hiện nguồn "Pancake", ẩn nhập tay/CSV (giữ lại cho trường hợp đặc biệt).
5. Chạy song song 1–2 tuần, so điểm với đơn thật, rồi mới mở cho khách.
