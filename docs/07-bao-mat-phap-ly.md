# 07 — Bảo mật và tuân thủ pháp lý

> MiwaCare · v1 · 2026-11-25 · Mở rộng `01` mục 5.
> ⚠️ Phần pháp lý là định hướng kỹ thuật dựa trên văn bản công khai, **không thay tư vấn của luật sư**.

## 1. Dữ liệu được thu thập và mức nhạy cảm

| Dữ liệu | Nguồn | Mục đích | Mức |
|---|---|---|---|
| Số điện thoại | Khách nhập | Đăng nhập, ghép Pancake | Cơ bản, định danh |
| Họ tên, ngày sinh, giới tính, email | Khách / Pancake | Hồ sơ, ưu đãi sinh nhật, phân khúc | Cơ bản |
| Điểm, hạng, lịch sử mua | Pancake | Hiển thị, CRM | Cơ bản (hành vi mua) |
| Chủ đề quan tâm | Khách chọn | Cá nhân hoá | Cơ bản |
| Token push, thông tin thiết bị | App | Gửi thông báo | Kỹ thuật |
| Bằng chứng đồng ý | App / web | Tuân thủ | Pháp lý |

**Không thu thập:** vị trí, danh bạ, ảnh, số CCCD, thông tin tài chính, dữ liệu sức khoẻ. Không dùng SDK quảng cáo hay theo dõi bên thứ ba. Nhờ đó app không cần ATT trên iOS, và nhãn quyền riêng tư đơn giản.

## 2. Mô hình đe doạ (rút gọn)

| Mối đe doạ | Hậu quả | Biện pháp |
|---|---|---|
| Lộ khoá API Pancake | Kẻ xấu đọc / sửa toàn bộ khách và đơn | Khoá chỉ ở Supabase Secrets; không bao giờ có trong app hay repo; đổi định kỳ; dùng Shop key |
| Chiếm tài khoản qua SĐT | Xem điểm, hồ sơ người khác | OTP 6 số, hết hạn 5 phút, giới hạn gửi và nhập; cảnh báo khi đăng nhập thiết bị mới [Should] |
| Spam OTP (tốn tiền SMS) | Mất tiền, bị nhà mạng chặn | Giới hạn theo SĐT, IP, thiết bị; CAPTCHA vô hình trên web; theo dõi chi phí SMS hằng ngày |
| Khách A đọc dữ liệu khách B | Lộ dữ liệu | RLS mọi bảng; app chỉ đọc qua view lọc theo `auth.uid()`; test RLS tự động |
| Giả mạo webhook | Dữ liệu sai | Header bí mật + luôn đọc lại API (webhook chỉ là tín hiệu) |
| Ghép nhầm khách trùng SĐT | Lộ điểm, lịch sử mua | BR-04: không tự ghép khi trùng |
| Nhân viên quản trị lạm quyền / xuất dữ liệu | Rò rỉ hàng loạt | Phân vai, 2FA, che SĐT với `viewer`, ghi log mọi thao tác xem chi tiết và xuất; không có nút "xuất toàn bộ" ở bản 1 |
| Lộ `service_role` key | Bỏ qua mọi RLS | Chỉ dùng trong Edge Function; không đưa vào app hay admin phía trình duyệt |
| Máy mất / bị đánh cắp | Người khác mở app | Token trong SecureStore; khách có thể đăng xuất mọi thiết bị [Could]; thẻ thành viên không chứa thông tin nhạy cảm |
| Thư viện có lỗ hổng | Bị khai thác | Dependabot, cập nhật định kỳ hằng quý |

## 3. Biện pháp kỹ thuật (checklist triển khai)

### Ứng dụng
- [ ] Không khoá bí mật nào trong mã app (chỉ `SUPABASE_URL` + `ANON_KEY` công khai).
- [ ] Token lưu trong `expo-secure-store`.
- [ ] HTTPS toàn bộ (mặc định của Supabase và Expo).
- [ ] Không log SĐT, OTP, token ra console hay Sentry (bật lọc dữ liệu nhạy cảm của Sentry).
- [ ] Thẻ thành viên che giữa SĐT; app không hiển thị mã khách.
- [ ] Mã QR chương trình chỉ chứa mã ngẫu nhiên, không chứa dữ liệu khách; server giới hạn số lần nhập sai để chống dò mã.

### Backend
- [ ] RLS bật cho **mọi** bảng; mặc định chặn, chỉ mở theo chính sách rõ ràng.
- [ ] Bảng `consents`, `audit_logs`: chỉ cho thêm, chặn sửa và xoá ở mức database.
- [ ] Edge Function kiểm tra JWT và đầu vào (zod) ở mọi endpoint.
- [ ] Giới hạn tần suất cho `member-link`, `member-profile`, `account-delete`, webhook.
- [ ] Secrets riêng cho từng môi trường; có lịch đổi khoá Pancake 6 tháng một lần và ngay khi có người rời dự án.
- [ ] Sao lưu hằng ngày (Supabase PITR ở môi trường prod); thử khôi phục hằng quý.
- [ ] Dữ liệu dev và staging là dữ liệu giả hoặc shop thử, **không** sao chép dữ liệu khách thật.

### Quản trị
- [ ] 2FA bắt buộc; mật khẩu ≥ 12 ký tự.
- [ ] Phân vai `viewer` / `editor` / `admin`; nguyên tắc quyền tối thiểu.
- [ ] Ghi log: đăng nhập, xem chi tiết thành viên, sửa, gửi chiến dịch, đổi quyền.
- [ ] Tự đăng xuất sau 30 phút không thao tác.

### Tài khoản dịch vụ
- [ ] Bật 2FA cho: Apple ID, Google Play, Expo, Supabase, GitHub, Cloudflare, Pancake, nhà cung cấp SMS.
- [ ] Danh sách ai có quyền vào từng dịch vụ (lưu ở `docs/truy-cap.md`, không lưu mật khẩu ở đó).

## 4. Tuân thủ pháp luật Việt Nam

### 4.1 Văn bản áp dụng
- **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15**, hiệu lực từ 01/01/2026.
- **Nghị định 356/2025/NĐ-CP** hướng dẫn thi hành, thay thế Nghị định 13/2023.
- **Nghị định 330/2026/NĐ-CP** xử phạt vi phạm, hiệu lực từ 19/08/2026. Có các lỗi như không đảm bảo đồng ý riêng cho từng mục đích, không lưu bằng chứng đồng ý.

### 4.2 Vai trò
- Chủ dự án hiện là **cá nhân kinh doanh**, đứng tên app → là **bên kiểm soát dữ liệu** (chịu trách nhiệm chính).
- Nếu thương hiệu thuộc người khác: cần thoả thuận rõ ai là bên kiểm soát, ai là bên xử lý, ký **hợp đồng xử lý dữ liệu**.
- Nhà cung cấp hạ tầng (Supabase, Expo, Cloudflare, nhà cung cấp OTP, Sentry) là bên xử lý phụ, nêu tên trong chính sách bảo mật.

### 4.3 Việc phải làm

| Yêu cầu | Cách đáp ứng trong MiwaCare | Chức năng |
|---|---|---|
| Đồng ý tự nguyện, rõ ràng, **riêng cho từng mục đích** | 3 ô tách biệt, ô tuỳ chọn mặc định không tick | F-03 |
| **Lưu bằng chứng** đồng ý | Bảng `consents` chỉ thêm, có phiên bản chính sách và thời điểm | F-03 |
| Rút lại đồng ý | Công tắc trong S-52, có hiệu lực ngay | F-31 |
| Thông báo xử lý dữ liệu | Chính sách bảo mật tiếng Việt, hiện trước khi đồng ý | F-90 |
| Quyền xem, sửa | Màn hình hồ sơ, lịch sử | F-30 |
| Quyền xoá | Xoá tài khoản trong app + qua web | F-07, F-92 |
| Bảo vệ dữ liệu | Toàn bộ mục 3 | |
| Hồ sơ đánh giá tác động xử lý dữ liệu | Luật sư hướng dẫn; kỹ thuật cung cấp mô tả hệ thống (tài liệu này + `06`) | — |
| Chuyển dữ liệu ra nước ngoài (nếu dùng Supabase Singapore) | Hồ sơ đánh giá tác động chuyển dữ liệu; hoặc chọn máy chủ tại Việt Nam | Quyết định D3 |
| Thông báo khi có sự cố rò rỉ | Quy trình ứng phó (mục 5) | — |
| Gửi tin quảng cáo | Chỉ gửi khi đã đồng ý `marketing`; có cách từ chối trong mỗi tin | F-74, F-76 |

### 4.4 Nội dung chính sách bảo mật (khung)
1. Bên kiểm soát dữ liệu và thông tin liên hệ.
2. Dữ liệu thu thập (mục 1).
3. Mục đích và căn cứ xử lý (từng mục đích tương ứng một ô đồng ý).
4. Bên nhận dữ liệu: Pancake (nhà cung cấp POS), nhà cung cấp hạ tầng, nhà cung cấp SMS.
5. Nơi lưu trữ (có ở nước ngoài không).
6. Thời gian lưu: khi còn là thành viên; xoá trong 30 ngày sau khi yêu cầu; dữ liệu mua hàng theo thời hạn kế toán.
7. Quyền của khách và cách thực hiện.
8. Bảo mật.
9. Cập nhật chính sách (phiên bản, ngày hiệu lực).

## 5. Ứng phó sự cố
1. **Phát hiện:** cảnh báo bất thường (truy cập hàng loạt, lỗi xác thực tăng đột biến) hoặc có người báo.
2. **Khoanh vùng (trong 1 giờ):** đổi khoá Pancake, khoá Supabase, thu hồi phiên quản trị, tắt chức năng bị ảnh hưởng.
3. **Đánh giá:** dữ liệu nào, bao nhiêu người, từ lúc nào (dựa vào `audit_logs`, log Supabase).
4. **Thông báo:** cho cơ quan có thẩm quyền và người bị ảnh hưởng theo thời hạn luật định. Luật sư xác nhận thời hạn cụ thể.
5. **Khắc phục và rút kinh nghiệm:** ghi biên bản, sửa lỗ hổng, cập nhật tài liệu.

## 6. Yêu cầu của store liên quan bảo mật
| | Apple | Google |
|---|---|---|
| Khai báo dữ liệu | Nhãn quyền riêng tư (App Privacy) + Privacy Manifest | Data safety form |
| Xoá tài khoản | Trong app | Trong app **và** link web |
| Chính sách bảo mật | Link bắt buộc | Link bắt buộc |
| Quyền thông báo | Xin khi cần, có giải thích | Android 13+ phải xin quyền |
| Theo dõi | Không theo dõi → không cần ATT | — |

Hai bản khai báo phải **khớp nhau** và khớp với chính sách bảo mật, vì Google đã tăng kiểm tra tự động sự khớp này.
