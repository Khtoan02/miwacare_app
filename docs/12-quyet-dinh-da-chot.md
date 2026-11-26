# MiwaCare — Các quyết định đã chốt

> Tài liệu này **ưu tiên hơn** các tài liệu 00–11 khi có chỗ mâu thuẫn. Mỗi quyết định ghi ngày chốt.

## Q-01. Chủ sở hữu (2026-11-25)
- MiwaCare là **thương hiệu của chính bạn**. Vai "Khách" / "thương hiệu" trong các tài liệu 00–11 chính là bạn.
- Hệ quả: **không cần** thư uỷ quyền thương hiệu (E3b) và hợp đồng xử lý dữ liệu giữa hai bên (D2). Bạn vừa là bên kiểm soát dữ liệu, vừa vận hành.

## Q-02. Ngân sách (2026-11-25)
Khoảng **100 USD/năm (~3 triệu đồng)** cho toàn bộ: store, máy chủ, OTP. Quy mô dự kiến **~2.000 khách**.

| Khoản | Năm đầu | Các năm sau |
|---|---|---|
| Máy chủ: Supabase Free + Cloudflare Pages + Expo Free | 0đ | 0đ |
| Google Play (25 USD, một lần) | ~650.000đ | 0đ |
| Apple Developer (99 USD/năm) | ~2.600.000đ | ~2.600.000đ |
| OTP Zalo ZNS (~300đ/tin, giá tham khảo) | ~600.000đ | ~300.000đ |
| **Tổng** | **~3.850.000đ** | **~2.900.000đ** |

Năm đầu vượt khoảng 850.000đ (đã chấp nhận). Tỷ giá tính ~26.000đ/USD; kiểm tra lại giá khi đăng ký.

## Q-03. Phát hành cả Android và iOS ngay (2026-11-25)
- Google Play tài khoản **Personal**, App Store tài khoản **Individual**, đứng tên bạn.
- Google tài khoản cá nhân mới: cần **12 người test kín trong 14 ngày** trước khi phát hành.
- Nếu Apple hỏi quyền dùng tên MIWAKO / MiwaCare: chuẩn bị giấy đăng ký nhãn hiệu (nếu có).

## Q-04. Hạ tầng: 3 dịch vụ gói miễn phí (2026-11-25)
| Dịch vụ | Vai trò | Gói |
|---|---|---|
| **Supabase** (vùng Singapore) | Cơ sở dữ liệu, đăng nhập OTP, Edge Functions (tính điểm, quét mã…), realtime, cron | Free: 500 MB, 50.000 người dùng/tháng, 200 kết nối realtime |
| **Cloudflare Pages** | Trang quản trị + trang công khai (chính sách, điều khoản, xoá tài khoản) | Free, **cho phép dùng thương mại** (thay Vercel: gói miễn phí của Vercel cấm thương mại) |
| **Expo (EAS)** | Build, nộp store, gửi push | Free |

Hệ quả kỹ thuật:
- Trang quản trị là **ứng dụng web tĩnh (Vite + React)**, gọi thẳng Supabase. Quyền quản trị kiểm soát bằng RLS + vai trò; thao tác đặc quyền đi qua Edge Functions. Không cần máy chủ Node riêng.
- Supabase Free **không tự sao lưu**: thêm job sao lưu hằng ngày (GitHub Actions chạy `pg_dump`, mã hoá, lưu sang kho miễn phí như Cloudflare R2). Thử khôi phục mỗi quý.
- Supabase Free tạm dừng dự án sau 7 ngày không có truy cập: chỉ ảnh hưởng lúc phát triển.
- Khi vượt gói miễn phí (vài chục nghìn khách): nâng Supabase Pro (~25 USD/tháng), không phải viết lại.
- Đặt dữ liệu ở Singapore là chuyển dữ liệu cá nhân ra nước ngoài: cần lập hồ sơ theo Luật 91/2025 trước khi có dữ liệu khách thật (D8). Lúc phát triển chỉ dùng dữ liệu mẫu.

## Q-05. Quy tắc điểm là cấu hình, máy chủ tự tính khi chưa có Pancake (2026-11-25)
- Pancake **tạm hoãn**. Lúc này **Supabase tự tính điểm và hạng** theo cấu hình; khi có Pancake thì chuyển công tắc `points_source = 'pancake'` để Pancake làm sổ cái như thiết kế ở tài liệu 01.
- Trang quản trị có màn **Cấu hình chương trình thành viên**, bạn tự chỉnh, không cần sửa code:

| Nhóm | Thiết lập |
|---|---|
| Tích điểm | Số tiền cho 1 điểm; tính trên tiền trước hay sau giảm giá; làm tròn lên / xuống |
| Hạng | Tên, màu, điều kiện lên hạng (điểm / tổng chi / số đơn), thời gian xét, có xuống hạng không |
| Thưởng thêm | Nhân điểm theo hạng, theo ngày (cuối tuần, dịp lễ), sinh nhật, điểm khi tải app |
| Dùng điểm | 1 điểm = bao nhiêu đồng; điểm có hết hạn không, sau bao lâu |

- Cấu hình **có phiên bản và ngày hiệu lực**: đơn được tính theo quy tắc đang hiệu lực tại thời điểm mua; sửa quy tắc không làm đổi điểm cũ.
- Điểm lưu dạng **sổ giao dịch** (`point_ledger`: mỗi dòng là một lần cộng/trừ, có lý do và phiên bản quy tắc). Số dư = tổng sổ. Không sửa dòng cũ; sai thì ghi dòng điều chỉnh.
- Bảng dữ liệu thêm: `loyalty_rule_versions` (cấu hình dạng JSON + `effective_from`), `point_ledger`, `tiers`.

## Q-06. OTP (2026-11-25)
- Gửi OTP thật **tạm hoãn**. Lúc phát triển dùng số điện thoại test với mã cố định của Supabase.
- Khi chạy thật: ưu tiên **Zalo ZNS** (rẻ hơn SMS brandname), cần Zalo OA đã xác thực. Phiên đăng nhập kéo dài để mỗi khách chỉ nhận mã khoảng 1 lần/năm.

## Q-07. Nhận diện tại quầy và mã QR (2026-11-25)
- App **không có mã khách**. Tại quầy tìm khách bằng số điện thoại.
- Mã QR chỉ dùng cho **chương trình riêng** (F-25, F-81, giai đoạn sau).

## Câu hỏi còn mở
1. **Nguồn đơn hàng khi chưa có Pancake:** điểm được tính từ đơn nào? Phương án tạm: nhân viên nhập đơn hoặc nhập file Excel/CSV trên trang quản trị. Cần chốt trước khi chạy thật. Đề xuất mới (2026-11-26): lấy đơn từ Pancake, máy chủ MiwaCare vẫn tự tính điểm — xem `pancake/phuong-an-ket-noi.md`.
2. Tên các hạng, quy tắc tích điểm cụ thể (nhập vào cấu hình khi bạn sẵn sàng).
3. Tỷ lệ khách dùng iPhone / Android (để ưu tiên kiểm thử).
