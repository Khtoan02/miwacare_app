# MiwaCare — Checklist chuẩn bị trước khi thực thi

> Cập nhật: 2026-11-25 · Đánh dấu `[x]` khi xong. Đi kèm: `docs/01-phan-tich-he-thong.md`.
> **Điều kiện để bắt đầu code (cập nhật 2026-11-25):** có tài khoản B3–B5 (Supabase, Expo, GitHub) và Cloudflare. Pancake, SMS và quy tắc điểm cụ thể không còn chặn việc code. Nhóm C, D, E chạy song song trong lúc code, nhưng phải xong trước khi phát hành.

Ký hiệu người làm: **[Bạn]** = bạn tự làm · **[Khách]** = quyết định của chủ thương hiệu, **cũng chính là bạn** (xem `12-quyet-dinh-da-chot.md`, Q-01) · **[Claude]** = mình làm khi bắt đầu thực thi.

> Quyết định đã chốt ngày 2026-11-25 nằm ở `docs/12-quyet-dinh-da-chot.md` và được ưu tiên hơn file này.

---

## A. Quyết định nghiệp vụ (bắt buộc trước khi code)

- [ ] **A1. Quy tắc tích điểm trên Pancake** ⏳ _2026-11-25: làm thành **cấu hình** trên trang quản trị (Q-05), nhập số cụ thể sau, không chặn việc code._ [Khách]
  - Pancake đã bật tích điểm chưa?
  - Tỷ lệ tích (ví dụ 10.000đ = 1 điểm), có tính trên tiền sau giảm giá / phí ship không?
  - Tỷ lệ dùng (1 điểm = ?đ), số điểm tối thiểu để dùng, tối đa bao nhiêu % giá trị đơn.
  - Điểm có hết hạn không? Sau bao lâu?
  - Đơn huỷ / hoàn trả thì điểm xử lý thế nào?
  - 📸 Chụp màn hình phần cài đặt tích điểm trong Pancake, lưu vào `docs/pancake/`.
- [ ] **A2. Hạng thành viên** ⏳ _Cũng nằm trong cấu hình (Q-05), không chặn việc code._ [Khách]: tên các hạng, điều kiện lên hạng (theo điểm / tổng chi / số đơn), quyền lợi từng hạng, có xét xuống hạng không.
- [ ] **A3. Cách dùng điểm ở bản đầu** [Khách]: chỉ dùng tại quầy (khuyến nghị) hay đổi voucher ngay trong app (giai đoạn 2).
- [ ] **A4. Kênh bán** [Khách]: đơn online (Facebook, website, sàn) có đi qua Pancake và có được tích điểm không?
- [ ] **A5. Số shop / chi nhánh** [Khách]: một hay nhiều shop Pancake? Có dùng chung điểm giữa các chi nhánh không?
- [ ] **A6. Tính năng bản đầu (MVP)** [Bạn + Khách]: xác nhận danh sách:
  đăng nhập OTP · thẻ thành viên (không có mã khách; tại quầy nhận diện bằng SĐT) · quét mã QR chương trình (giai đoạn sau) · điểm + hạng + tiến độ lên hạng · lịch sử điểm và đơn · ưu đãi · hộp thư · push · tài khoản + xoá tài khoản.
- [x] **A7. Quy trình tại quầy** [Khách] (chốt 2026-11-25): thu ngân tìm khách bằng **số điện thoại** trên Pancake. App **không** hiển thị mã khách. Mã QR chỉ dùng cho **chương trình riêng**: thương hiệu tạo chương trình, gửi mã cho khách, khách quét trong app để nhận ưu đãi / tham gia.
- [ ] **A8. Nội dung CRM ban đầu** [Khách]: các loại thông báo sẽ gửi (khuyến mãi, sinh nhật, bài viết chăm sóc…) và các nhóm khách muốn lọc đầu tiên.

## B. Tài khoản & quyền truy cập kỹ thuật (bắt buộc trước khi code)

- [ ] **B1. Pancake Shop API key + Shop ID** ⏸ _Tạm hoãn (2026-11-25): chưa có Pancake. Khi code dùng dữ liệu mẫu._ [Bạn]
  - Pancake → Cài đặt → Ứng dụng → Webhook/API → tab API Key → Tạo.
  - Dùng **Shop API key** (một shop), **không** dùng Account key (`pos_user_…`).
  - ⚠️ Không gửi khoá qua chat, email hay Zalo. Điền thẳng vào file `.env` (mục B6).
- [ ] **B2. Shop Pancake để test** ⏸ _Tạm hoãn (2026-11-25): chưa có Pancake._ [Bạn + Khách]: shop thử hoặc vài khách và đơn thử trên shop thật, để test cộng/trừ điểm và webhook mà không ảnh hưởng số liệu thật.
- [ ] **B3. Tài khoản Supabase** _(gói Free, vùng Singapore)_ [Bạn]: đăng ký bằng email công việc, bật 2FA. Chưa cần tạo project, chờ chốt mục D3 (nơi đặt máy chủ).
- [ ] **B4. Tài khoản Expo** [Bạn]: đăng ký tại expo.dev, bật 2FA. Tạo Organization mang tên dự án (ví dụ `miwacare`) để sau này chuyển giao dễ.
- [ ] **B5. Tài khoản GitHub** [Bạn]: tạo repo **private** `miwacare` để lưu code. Nên để trong một Organization.
- [ ] **B6. File `.env`** [Bạn]: copy `.env.example` thành `.env`, điền khoá. File `.env` **không bao giờ** đưa lên GitHub.
- [ ] **B7. Thiết bị test** [Bạn]: ít nhất 1 iPhone + 1 Android, cài **Expo Go**.

## C. Thương hiệu & nội dung (cần trước khi làm giao diện)

- [ ] **C1. Tên app hiển thị** [Khách]: "MiwaCare"? Tên dưới icon tối đa ~12 ký tự.
- [ ] **C2. Logo** dạng SVG hoặc PNG 1024×1024 nền trong suốt [Khách] (kiểm tra thư mục `../Miwako`).
- [ ] **C3. Icon app** 1024×1024, không bo góc, không trong suốt (Apple yêu cầu) [Khách hoặc thiết kế].
- [ ] **C4. Bảng màu, font** [Khách].
- [ ] **C5. Ảnh splash / màn hình chào** [Khách hoặc thiết kế].
- [ ] **C6. Nội dung tĩnh** [Khách]: giới thiệu thương hiệu, thể lệ chương trình thành viên, câu hỏi thường gặp, thông tin liên hệ (hotline, Zalo OA, địa chỉ cửa hàng).

## D. Pháp lý & bảo mật (cần trước khi chạy thật với khách)

- [ ] **D1. Pháp nhân sở hữu app** [Khách]: tên công ty, mã số thuế, địa chỉ, người đại diện. App và dữ liệu phải đứng tên pháp nhân này.
- [x] ~~**D2. Phân vai dữ liệu**~~ ⛔ _Không cần (2026-11-25): bạn vừa là chủ thương hiệu vừa vận hành._ [Bạn + Khách]: thương hiệu là bên kiểm soát dữ liệu, bên build và vận hành là bên xử lý. Ký **hợp đồng xử lý dữ liệu cá nhân**.
- [ ] **D3. Nơi đặt máy chủ** ⏳ _Tạm chốt 2026-11-25: Supabase Singapore gói miễn phí, chỉ dữ liệu mẫu. Chốt hẳn (kèm hồ sơ D8) trước khi có khách thật._ [Khách + luật sư]: Supabase Singapore (nhanh, rẻ, phải có hồ sơ chuyển dữ liệu ra nước ngoài) hay máy chủ tại Việt Nam.
- [ ] **D4. Chính sách bảo mật** tiếng Việt, có link công khai (trên website thương hiệu) [Khách + luật sư]: dữ liệu thu thập, mục đích, thời gian lưu, quyền của khách, cách xoá tài khoản, liên hệ.
- [ ] **D5. Điều khoản sử dụng + thể lệ chương trình thành viên** [Khách].
- [ ] **D6. Nội dung các ô đồng ý** [Khách + luật sư]: tách riêng (1) dùng app, (2) nhận khuyến mãi, (3) cá nhân hoá.
- [ ] **D7. Trang web yêu cầu xoá tài khoản** (Google Play bắt buộc) [Claude dựng, Khách đặt link trên website].
- [ ] **D8. Hồ sơ theo Luật 91/2025/QH15** [Khách + luật sư]: hồ sơ đánh giá tác động xử lý dữ liệu cá nhân; hồ sơ chuyển dữ liệu ra nước ngoài nếu chọn Singapore.

## E. Phát hành store (bắt đầu ngay vì mất thời gian)

> **Cập nhật 2026-11-25:** chủ dự án hiện là **cá nhân kinh doanh, chưa có công ty**. Apple chỉ nhận tài khoản tổ chức khi là pháp nhân (không nhận DBA, tên thương mại, chi nhánh); cá nhân hoặc hộ kinh doanh thì đăng ký dạng **Individual**, không cần D-U-N-S. → Đi theo **phương án cá nhân**, khi có công ty thì chuyển app sang tài khoản công ty.

- [x] **E1. Quyết định đứng tên** ✅ _Chốt 2026-11-25: đứng tên bạn; ra cả Android và iOS ngay (Q-03)._ [Bạn]: app đứng tên ai (bạn hay chủ thương hiệu Miwako)? Người đứng tên chính là "người bán" hiển thị trên store và là bên kiểm soát dữ liệu (mục D).
- [ ] **E2. Apple Developer Program — tài khoản Individual** [Người đứng tên] (99 USD/năm): dùng Apple ID cá nhân có bật 2FA, **họ tên thật** như trên giấy tờ (không dùng tên shop). Tên hiển thị trên App Store là họ tên cá nhân. Không cần D-U-N-S.
- [ ] **E3. Google Play Console — tài khoản Personal** [Người đứng tên] (25 USD, trả một lần): xác minh danh tính bằng giấy tờ. ⚠️ Tài khoản cá nhân mới phải **test kín với ít nhất 12 người trong 14 ngày liên tục** mới được phát hành, nên chuẩn bị sẵn danh sách **15–20 người test** (Gmail + điện thoại Android).
- [x] ~~**E3b. Thư uỷ quyền dùng thương hiệu**~~ ⛔ _Không cần (2026-11-25): MiwaCare là thương hiệu của bạn._ [Chủ thương hiệu]: nếu app đứng tên bạn mà thương hiệu thuộc người khác, cần giấy uỷ quyền để nộp khi Apple hoặc Google hỏi về quyền sử dụng tên và logo.
- [ ] **E3c. (Sau này) Lập công ty** → xin D-U-N-S → mở tài khoản Organization → **chuyển app** sang tài khoản mới (Apple và Google đều hỗ trợ chuyển app, giữ nguyên người dùng và đánh giá).
- [ ] **E4. Email hỗ trợ + website** [Khách]: email kiểu `support@…` và trang web để điền vào hồ sơ store.
- [ ] **E5. Số điện thoại test cho người duyệt** [Claude cấu hình]: OTP cố định để Apple và Google đăng nhập được.

## F. Hạ tầng gửi tin

- [ ] **F1. OTP đăng nhập** ⏸ _Tạm hoãn (2026-11-25): lúc phát triển dùng số điện thoại test với OTP cố định của Supabase, chưa gửi SMS thật._ [Khách]: chọn **SMS brandname** (eSMS, SpeedSMS, VietGuys…; đăng ký brandname mất vài ngày đến vài tuần) hoặc **Zalo ZNS** (cần Zalo OA đã xác thực, duyệt mẫu tin). Supabase nối với nhà cung cấp Việt Nam qua "Send SMS Hook". Trong lúc phát triển dùng số test, không tốn phí.
- [ ] **F2. Zalo OA** của thương hiệu [Khách]: dùng làm kênh hỗ trợ trong app.
- [ ] **F3. Push notification**: dùng Expo Push, không cần chuẩn bị gì thêm. Chứng chỉ iOS tạo tự động khi có tài khoản Apple (E2).

## G. Vận hành

- [ ] **G1. Người duyệt nội dung** gửi cho khách [Khách].
- [ ] **G2. Người nhận cảnh báo kỹ thuật** (lỗi đồng bộ, lệch điểm) [Bạn]: email và/hoặc Telegram.
- [ ] **G3. Đầu mối hỗ trợ khách** (khách báo sai điểm, không nhận OTP…) [Khách].
- [x] **G4. Ngân sách** ✅ _Chốt 2026-11-25: ~3 triệu/năm. Máy chủ 0đ (Supabase Free + Cloudflare Pages + Expo Free); Google ~650k một lần; Apple ~2,6tr/năm; OTP Zalo ZNS ~300–600k/năm. Chi tiết: Q-02._

---

## Tóm tắt thời gian

| Nhóm | Chặn việc gì | Nên xong trước |
|---|---|---|
| A, B | Bắt đầu code | Tuần 0 |
| C | Làm giao diện thật | Tuần 1–2 |
| F1 | Đăng nhập thật | Trước khi test với khách thật |
| D | Chạy thật với khách | Trước phát hành |
| E | Lên store | Mở tài khoản sớm; Google cá nhân cần thêm **14 ngày test kín** trước khi phát hành |
| G | Vận hành | Trước phát hành |
