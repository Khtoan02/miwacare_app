# 02 — Yêu cầu nghiệp vụ (BRD)

> MiwaCare · v1 · 2026-11-25 · Liên quan: `01-phan-tich-he-thong.md`, `00-checklist-chuan-bi.md`
> Các mục có nhãn **[GIẢ ĐỊNH]** đang chờ chốt ở checklist nhóm A. Khi chốt xong thì sửa lại và bỏ nhãn.

## 1. Bối cảnh
- Thương hiệu bán hàng qua **Pancake POS** (tại quầy và có thể cả online).
- Dữ liệu khách hàng, đơn hàng và điểm hiện nằm trong Pancake. Khách **không tự xem được** điểm hay hạng, và thương hiệu **chưa có kênh riêng** để chăm sóc, nhắn tin cho khách.
- Chủ dự án là cá nhân kinh doanh. App phát hành bằng tài khoản developer cá nhân (xem `00-checklist` nhóm E).

## 2. Mục tiêu kinh doanh

| Mã | Mục tiêu | Chỉ số đo (KPI) | Đích 6 tháng [GIẢ ĐỊNH] |
|---|---|---|---|
| G1 | Khách tự theo dõi điểm và hạng | % khách mua hàng đã kích hoạt app | ≥ 30% khách quay lại |
| G2 | Tăng mua lại | Tần suất mua của thành viên app so với khách không dùng app | +15% |
| G3 | Có kênh chăm sóc riêng, không phụ thuộc mạng xã hội | Tỷ lệ mở push / hộp thư | ≥ 20% |
| G4 | Hiểu khách để gửi đúng nội dung | Số phân khúc đang dùng; tỷ lệ chuyển đổi theo chiến dịch | ≥ 5 phân khúc |
| G5 | Số liệu điểm luôn đúng | Số khách bị lệch điểm khi đối soát đêm | **0** |

## 3. Phạm vi

### Trong phạm vi bản 1 (MVP)
1. App thành viên Android + iOS.
2. Đồng bộ một chiều có kiểm soát với Pancake (đọc điểm, hạng, đơn; ghi hồ sơ và tag).
3. Database trung tâm (Supabase) phục vụ app, CRM và các hệ thống sau này.
4. CRM cơ bản: phân khúc khách, đăng bài, gửi push và tin trong hộp thư.
5. Trang quản trị nhỏ (web) cho người vận hành.
6. Trang web công khai: chính sách bảo mật, điều khoản, yêu cầu xoá tài khoản.

### Ngoài phạm vi bản 1
- Đặt hàng hoặc thanh toán trong app.
- **Đổi điểm lấy voucher ngay trong app** (để giai đoạn 2, xem `01` mục 2.4).
- Chat trực tiếp trong app (dùng link Zalo OA thay thế).
- Đa ngôn ngữ, gamification (vòng quay, nhiệm vụ), giới thiệu bạn bè có thưởng.
- Đồng bộ nhiều shop Pancake [GIẢ ĐỊNH: 1 shop].

## 4. Các bên liên quan và vai trò

| Vai trò | Là ai | Quyền và trách nhiệm |
|---|---|---|
| **Chủ dự án** | Bạn | Quyết định phạm vi, đứng tên app, duyệt phát hành |
| **Chủ thương hiệu** | Miwako / NP FOOD | Cung cấp quy tắc điểm, nội dung, thương hiệu; duyệt nội dung gửi khách |
| **Thành viên** | Khách hàng cuối | Dùng app |
| **Thu ngân** | Nhân viên cửa hàng | Tìm khách, tích và dùng điểm **trên Pancake** |
| **Người vận hành CRM** | Marketing | Đăng bài, lọc khách, gửi thông báo |
| **Kỹ thuật** | Claude + Bạn | Xây dựng, vận hành, xử lý sự cố |

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc |
|---|---|
| BR-01 | **Pancake là nguồn gốc duy nhất** của điểm, hạng, đơn hàng. MiwaCare không tự tính hay ghi đè các số này. |
| BR-02 | Mỗi thành viên app gắn với **đúng một** khách hàng Pancake, ghép theo số điện thoại đã chuẩn hoá. |
| BR-03 | Một số điện thoại chỉ có một tài khoản app. |
| BR-04 | Số điện thoại khớp với nhiều khách trên Pancake: **không tự ghép**, chuyển cho người vận hành xử lý. |
| BR-05 | Tích điểm: theo cấu hình Pancake. [GIẢ ĐỊNH: 10.000đ = 1 điểm, tính trên tiền khách trả sau giảm giá] |
| BR-06 | Dùng điểm: chỉ tại quầy, thu ngân thao tác trên Pancake. [GIẢ ĐỊNH: 1 điểm = 1.000đ] |
| BR-07 | Đơn huỷ hoặc trả hàng: điểm được Pancake điều chỉnh. App hiển thị theo Pancake. |
| BR-08 | Hạng: theo `customer_levels` của Pancake. App hiển thị tiến độ lên hạng tính từ ngưỡng `upgrade_by_*`. |
| BR-09 | Điểm hiển thị trên app chậm hơn Pancake **tối đa 5 phút**, mục tiêu dưới 10 giây. |
| BR-10 | Chỉ gửi nội dung khuyến mãi cho khách **đã đồng ý nhận khuyến mãi**. Thông báo giao dịch (cộng điểm, lên hạng) gửi cho mọi thành viên đã bật push. |
| BR-11 | Khách xoá tài khoản app: xoá dữ liệu riêng của app trong 30 ngày. Hồ sơ mua hàng trên Pancake vẫn giữ theo nghĩa vụ kế toán, nhưng gỡ tag `app_member`. |
| BR-12 | Khách đăng ký app mà chưa có trên Pancake: tạo khách mới trên Pancake với họ tên + số điện thoại. |
| BR-13 | Tiền và điểm hiển thị dạng số nguyên, định dạng Việt Nam (`1.250.000đ`, `1.250 điểm`). |

## 6. Yêu cầu phi chức năng

| Mã | Nhóm | Yêu cầu |
|---|---|---|
| NFR-01 | Chính xác | Đối soát đêm: 0 khách lệch điểm; nếu có lệch phải cảnh báo trong 15 phút |
| NFR-02 | Realtime | Từ lúc Pancake ghi nhận đơn tới khi app hiện điểm: p95 < 10 giây (khi webhook hoạt động), tối đa 5 phút (qua đối soát) |
| NFR-03 | Hiệu năng | Mở app tới khi thấy thẻ thành viên < 2 giây trên mạng 4G |
| NFR-04 | Sẵn sàng | Backend ≥ 99,5%/tháng. Pancake lỗi thì app vẫn mở được và hiện dữ liệu gần nhất kèm thời điểm cập nhật |
| NFR-05 | Bảo mật | Theo `07-bao-mat-phap-ly.md` |
| NFR-06 | Tương thích | iOS 16+ [GIẢ ĐỊNH], Android 8+ (API 26), target API theo yêu cầu Google hiện hành |
| NFR-07 | Khả năng truy cập | Cỡ chữ theo cài đặt máy, độ tương phản ≥ 4.5:1, vùng chạm ≥ 44pt |
| NFR-08 | Ngôn ngữ | Tiếng Việt, chuỗi gom một chỗ |
| NFR-09 | Bảo trì | Sửa lỗi JS qua EAS Update, không cần nộp store lại |

## 7. Ràng buộc và rủi ro

| Rủi ro | Ảnh hưởng | Cách giảm |
|---|---|---|
| API Pancake không có lệnh cộng/trừ điểm | Không làm được đổi điểm trong app một cách an toàn | Bản 1 chỉ dùng điểm tại quầy; test kỹ trước giai đoạn 2 |
| Webhook Pancake chỉ thử lại 2 lần, không có chữ ký | Mất sự kiện, dễ bị giả mạo | Đối soát 5 phút + đêm; webhook chỉ là tín hiệu, luôn đọc lại API |
| Khách trùng trên Pancake | Ghép sai tài khoản, lộ điểm của người khác | BR-04, danh sách chờ xử lý tay |
| Tài khoản Google cá nhân phải test kín 14 ngày | Chậm phát hành Android | Chuẩn bị 15–20 người test sớm |
| Đăng ký SMS brandname chậm | Chưa đăng nhập thật được | Dùng số test khi phát triển; đăng ký sớm |
| Thay đổi API Pancake | Đồng bộ hỏng | Giám sát + cảnh báo; tách module Pancake riêng |
| Pháp lý dữ liệu cá nhân | Bị xử phạt | Theo `07`; luật sư rà trước khi chạy thật |

## 8. Tiêu chí nghiệm thu bản 1
1. 100% tính năng mức **Must** trong `03` chạy đúng trên iPhone và Android thật.
2. Chạy thử 7 ngày với đơn thật: đối soát đêm 0 lệch, p95 độ trễ < 10 giây.
3. App được duyệt trên App Store và Google Play.
4. Chính sách bảo mật, điều khoản, trang xoá tài khoản đã công khai.
5. Người vận hành tự gửi được một chiến dịch cho một phân khúc mà không cần kỹ thuật hỗ trợ.
