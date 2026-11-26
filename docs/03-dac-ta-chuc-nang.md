# 03 — Đặc tả chức năng sản phẩm (FRS)

> MiwaCare · v1 · 2026-11-25 · Mức ưu tiên theo MoSCoW: **Must** (bắt buộc bản 1) · **Should** (nên có bản 1) · **Could** (nếu kịp) · **Won't** (không làm bản 1).
> Mỗi chức năng có mã `F-xx` để dẫn chiếu trong use case (`10`), luồng (`09`) và kế hoạch (`11`).

## A. App thành viên

### A1. Bắt đầu và tài khoản

| Mã | Chức năng | Ưu tiên | Mô tả | Tiêu chí chấp nhận |
|---|---|---|---|---|
| F-01 | Màn hình chào | Must | Logo, giới thiệu 1–3 trang, nút "Bắt đầu" | Chỉ hiện ở lần mở đầu tiên |
| F-02 | Đăng nhập bằng số điện thoại + OTP | Must | Nhập SĐT → nhận OTP 6 số → xác nhận | OTP hết hạn sau 5 phút; tối đa 5 lần gửi mỗi giờ mỗi SĐT; sai 5 lần thì khoá 15 phút; số test của người duyệt store dùng OTP cố định |
| F-03 | Đồng ý điều khoản và dữ liệu | Must | Lần đầu đăng nhập: (1) bắt buộc đồng ý điều khoản + chính sách để dùng app; (2) tuỳ chọn nhận khuyến mãi; (3) tuỳ chọn cá nhân hoá | Ô tuỳ chọn **mặc định không tick**; lưu thời điểm, phiên bản chính sách, thiết bị |
| F-04 | Ghép với khách Pancake | Must | Sau OTP: tìm và ghép theo BR-02/04/12 | Khớp 1 → vào app; không có → tạo mới; trùng → màn hình "Đang xác minh" + báo người vận hành |
| F-05 | Hoàn thiện hồ sơ lần đầu | Must | Nhập họ tên (bắt buộc), ngày sinh, giới tính (tuỳ chọn) | Họ tên điền sẵn nếu đã có trên Pancake |
| F-06 | Đăng xuất | Must | | Xoá token khỏi máy, huỷ token push của máy đó |
| F-07 | Xoá tài khoản | Must | Cài đặt → Xoá tài khoản → xác nhận bằng OTP | Theo BR-11; hiển thị rõ điều gì bị xoá và điều gì được giữ lại |
| F-08 | Đăng nhập lại tự động | Must | Mở app không phải nhập lại OTP | Refresh token lưu trong SecureStore; hết hạn sau 90 ngày không dùng |

### A2. Thành viên và điểm

| Mã | Chức năng | Ưu tiên | Mô tả | Tiêu chí chấp nhận |
|---|---|---|---|---|
| F-10 | Thẻ thành viên | Must | Tên, hạng (màu theo hạng), số điểm, SĐT che bớt ("Tích điểm bằng SĐT 0912 ••• 678"). **Không có mã vạch/QR khách** | Mở app → thẻ hiện < 2 giây |
| F-11 | Điểm hiện có | Must | Số điểm + "cập nhật lúc hh:mm" | Tự cập nhật realtime, không cần kéo tải lại |
| F-12 | Hạng và tiến độ | Must | Hạng hiện tại, quyền lợi, thanh tiến độ "còn X điểm / Yđ để lên hạng Z" | Tính từ ngưỡng `upgrade_by_*`; hạng cao nhất thì hiện "Bạn đang ở hạng cao nhất" |
| F-13 | Lịch sử điểm | Must | Danh sách cộng/trừ: ngày, số điểm (+/−), ghi chú, số dư sau | Lấy từ `point_logs`; phân trang 20 dòng |
| F-14 | Lịch sử mua hàng | Should | Danh sách đơn: ngày, tổng tiền, trạng thái; chạm vào để xem sản phẩm | Ẩn đơn đã xoá |
| F-15 | Thông báo cộng điểm và lên hạng | Must | Push + dòng trong hộp thư | Gửi trong 10 giây kể từ khi đồng bộ nhận thay đổi |
| F-16 | Thể lệ chương trình | Must | Trang tĩnh: cách tích, dùng điểm, hạng, hạn điểm | Nội dung quản lý từ trang quản trị |

### A3. Ưu đãi và nội dung

| Mã | Chức năng | Ưu tiên | Mô tả | Tiêu chí chấp nhận |
|---|---|---|---|---|
| F-20 | Danh sách ưu đãi | Must | Voucher và khuyến mãi đang hiệu lực, phù hợp với hạng và tag của khách | Lấy từ Pancake (vouchers / promotions) + ưu đãi soạn trên CRM; ẩn ưu đãi hết hạn |
| F-21 | Chi tiết ưu đãi | Must | Mô tả, điều kiện, hạn dùng, "Đọc số điện thoại cho thu ngân để dùng ưu đãi" | |
| F-22 | Hộp thư | Must | Danh sách thông báo và bài viết, đánh dấu đã đọc | Badge số chưa đọc ở tab |
| F-23 | Bài viết | Should | Bài viết có ảnh và nội dung định dạng | Mở được từ push (deep link) |
| F-24 | Trang chủ | Must | Thẻ thành viên rút gọn + điểm + 3 ưu đãi nổi bật + bài viết mới | |
| F-25 | Quét mã chương trình | Should (giai đoạn sau) | Nút quét ở giữa thanh tab: mở camera quét QR, hoặc nhập mã tay, hoặc chọn ảnh mã. Thành công → hiện chương trình + quà, lưu vào Ưu đãi | Mã sai / hết hạn / hết lượt / đã nhận → báo rõ lý do; mỗi khách nhận 1 lần; tối đa 5 lần nhập sai / 10 phút |

### A4. Cá nhân

| Mã | Chức năng | Ưu tiên | Mô tả | Tiêu chí chấp nhận |
|---|---|---|---|---|
| F-30 | Xem và sửa hồ sơ | Must | Họ tên, ngày sinh, giới tính, email | Lưu xong thì đồng bộ lên Pancake (F-52) |
| F-31 | Quản lý đồng ý | Must | Bật/tắt nhận khuyến mãi, cá nhân hoá | Mỗi lần đổi ghi một dòng `consents` mới |
| F-32 | Chọn chủ đề quan tâm | Should | Chọn nhiều chủ đề (danh sách do CRM quản lý) | Dùng để lọc phân khúc |
| F-33 | Cài đặt thông báo | Must | Bật/tắt push theo nhóm: giao dịch / khuyến mãi / bài viết | |
| F-34 | Hỗ trợ | Must | Hotline, Zalo OA, địa chỉ cửa hàng, câu hỏi thường gặp | |
| F-35 | Thông tin pháp lý | Must | Link chính sách bảo mật, điều khoản, phiên bản app | |

## B. Đồng bộ và backend

| Mã | Chức năng | Ưu tiên | Mô tả | Tiêu chí chấp nhận |
|---|---|---|---|---|
| F-50 | Nhận webhook Pancake | Must | Endpoint nhận `orders`, `customers`; kiểm tra header bí mật; đưa vào hàng đợi | Trả 2xx < 1 giây; sai header thì trả 401 |
| F-51 | Worker đồng bộ | Must | Lấy từ hàng đợi → gọi API Pancake → upsert | Idempotent; bỏ qua bản cũ hơn (`updated_at`); retry có backoff khi 429/5xx |
| F-52 | Ghi về Pancake | Must | Tạo khách, cập nhật hồ sơ, gắn tag `app_member` | Đọc bản mới nhất trước khi PUT; gộp tag, không xoá tag cũ |
| F-53 | Đối soát gần | Must | Cron 5 phút: đơn và khách `updated_at` trong 15 phút gần nhất | Ghi `sync_runs` |
| F-54 | Đối soát đêm | Must | So `reward_point` của toàn bộ thành viên app | Báo cáo số lệch; lệch > 0 thì cảnh báo |
| F-55 | Đồng bộ danh mục | Must | Hạng (`customer_levels`), voucher, khuyến mãi: mỗi giờ | |
| F-56 | Gửi push | Must | Hàng đợi push qua Expo Push; xử lý token hết hạn | Token báo lỗi `DeviceNotRegistered` thì xoá |
| F-57 | Cảnh báo kỹ thuật | Must | Telegram/email khi: webhook im lặng > 30 phút trong giờ bán, lỗi đồng bộ liên tiếp, lệch điểm | |
| F-58 | Nạp dữ liệu ban đầu | Must | Một lần: kéo toàn bộ khách, hạng, đơn 12 tháng gần nhất | Chạy lại được, không tạo trùng |

## C. Trang quản trị (web)

| Mã | Chức năng | Ưu tiên | Mô tả | Tiêu chí chấp nhận |
|---|---|---|---|---|
| F-70 | Đăng nhập quản trị | Must | Email + mật khẩu + 2FA | Phân vai: `viewer`, `editor`, `admin` |
| F-71 | Tổng quan | Should | Số thành viên app, kích hoạt mới, tỷ lệ mở tin, trạng thái đồng bộ | |
| F-72 | Danh sách thành viên | Must | Tìm theo tên/SĐT, xem hồ sơ, điểm, hạng, đơn, đồng ý | SĐT che một phần với vai `viewer` |
| F-73 | Xử lý khách trùng | Must | Danh sách SĐT khớp nhiều khách; chọn khách đúng sau khi đã gộp trên Pancake | |
| F-74 | Phân khúc | Must | Tạo nhóm bằng bộ lọc: hạng, điểm, RFM, sinh nhật, sản phẩm đã mua, chủ đề, tag; xem trước số lượng | Tự loại khách chưa đồng ý nhận khuyến mãi khi gửi tin khuyến mãi |
| F-75 | Soạn bài viết | Must | Tiêu đề, ảnh bìa, nội dung, xem trước | |
| F-76 | Chiến dịch | Must | Chọn phân khúc + nội dung + kênh (push / hộp thư) + gửi ngay hoặc hẹn giờ | Cần vai `editor` để soạn, `admin` để duyệt gửi |
| F-77 | Báo cáo chiến dịch | Should | Số gửi, số nhận, số mở | |
| F-78 | Nội dung tĩnh | Must | Thể lệ, câu hỏi thường gặp, liên hệ, chủ đề quan tâm | |
| F-79 | Nhật ký | Must | Nhật ký đồng bộ và nhật ký thao tác quản trị (ai, làm gì, lúc nào) | Chỉ đọc |
| F-80 | Ưu đãi riêng cho phân khúc | Could | Tạo khuyến mãi trên Pancake cho một nhóm khách (`promotion_advance/create_multi`) | |
| F-81 | Chương trình và mã QR | Should (giai đoạn sau) | Tạo chương trình (tên, thời gian, quà, số lượt, phân khúc được nhận) → sinh mã QR / mã nhập tay để in hoặc gửi qua push, Zalo, SMS; xem số khách đã quét | Quà là voucher thì tạo trên Pancake cho khách đã quét (`promotion_advance/create_multi`) |

## D. Trang web công khai

| Mã | Chức năng | Ưu tiên |
|---|---|---|
| F-90 | Chính sách bảo mật | Must |
| F-91 | Điều khoản sử dụng + thể lệ | Must |
| F-92 | Yêu cầu xoá tài khoản (form SĐT + OTP) | Must (Google Play bắt buộc) |
| F-93 | Trang giới thiệu app + link tải | Should |

## E. Không làm ở bản 1 (Won't)
Đổi điểm trong app · đặt hàng / thanh toán · chat · giới thiệu bạn bè · gamification · đa ngôn ngữ · đăng nhập Google / Zalo / Apple (nếu thêm đăng nhập bên thứ ba thì **bắt buộc** thêm Sign in with Apple).
