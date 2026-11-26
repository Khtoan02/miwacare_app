# MiwaCare — Phân tích hệ thống

> Phiên bản 1 · 2026-11-25 · Trạng thái: **nháp, chờ chốt các câu hỏi ở mục 9**
> Phạm vi: app thành viên Android + iOS (Expo), kết nối Pancake POS, CRM riêng, bảo mật, chuẩn store, bảo trì.
> Ba ưu tiên theo thứ tự: **(1) chính xác → (2) realtime → (3) build đơn giản.**

---

## 0. Kết luận nhanh

> ⚠️ Cập nhật 2026-11-25: Pancake tạm hoãn; giai đoạn đầu máy chủ tự tính điểm theo cấu hình (xem `12-quyet-dinh-da-chot.md`, Q-05). Phần Pancake bên dưới áp dụng khi bật kết nối.

1. **Pancake là "sổ cái" duy nhất của điểm và hạng.** Điểm do Pancake tự cộng/trừ theo đơn hàng tại quầy. App và CRM chỉ **đọc** điểm, không tự tính lại. Chỉ có một nơi ghi điểm, nên không thể lệch số.
2. **Realtime bằng webhook + đối soát.** Pancake bắn webhook khi đơn hàng hoặc khách hàng thay đổi. Backend đọc lại dữ liệu mới nhất từ API Pancake, lưu vào cơ sở dữ liệu riêng, rồi đẩy xuống app trong vài giây. Ngoài ra, một tác vụ định kỳ đối soát lại để không sót dữ liệu khi webhook lỗi.
3. **Một nền tảng backend: Supabase** (Postgres + đăng nhập + function + realtime + lịch chạy). Không phải tự dựng server, nên build đơn giản và rẻ.
4. **CRM là bảng dữ liệu riêng** trong cùng Supabase: bản sao khách hàng và đơn hàng từ Pancake, cộng dữ liệu riêng của app (đồng ý nhận tin, sở thích, token push). Dùng để lọc phân khúc và gửi thông báo, bài viết.
5. **Đổi điểm ngay trong app (trừ điểm từ app) để giai đoạn 2.** API Pancake không có lệnh cộng/trừ điểm, chỉ có ghi đè số điểm, nên làm sớm sẽ có rủi ro sai số (chi tiết ở mục 2.4).

---

## 1. Kiến trúc tổng thể

```
 Khách tại quầy ──► Pancake POS (thu ngân)  ◄── sổ cái: đơn hàng, điểm, hạng
                         │  webhook (orders, customers)
                         ▼
                ┌──────────────────────────────┐
                │ Supabase (backend MiwaCare)  │
                │  • Edge Function: nhận webhook│
                │  • Đồng bộ + đối soát (cron) │
                │  • Postgres: bản sao + CRM   │
                │  • Auth: đăng nhập OTP       │
                │  • Realtime: đẩy thay đổi    │
                └──────────────────────────────┘
                   │ realtime / API      │ Expo Push
                   ▼                     ▼
             App MiwaCare (Android + iOS, Expo)
```

**Nguyên tắc vàng:** app **không bao giờ** gọi thẳng Pancake. Khoá API Pancake chỉ nằm trên server.

---

## 2. Tích hợp Pancake POS

### 2.1 Những gì API Pancake cung cấp (đã kiểm tra tài liệu chính thức)

- Địa chỉ gốc: `https://pos.pages.fm/api/v1`, xác thực bằng `api_key` trên query, `shop_id` nằm trong đường dẫn.
- Giới hạn: đọc dưới 30 request/giây, ghi dưới 100 request/giây (mỗi endpoint, mỗi shop). Sai khoá 20 lần trong 1 phút thì IP bị khoá 5 phút.
- Webhook gồm các loại: `orders` (tạo/sửa đơn), `customers` (tạo/sửa khách), `products`, `variations_warehouses`… **Không có chữ ký HMAC**, chỉ có header bí mật do mình đặt. Webhook lỗi thì Pancake thử lại sau 10 phút, rồi 30 phút nữa, sau đó **dừng hẳn**.
- **Không có** API cộng/trừ điểm. Chỉ có:
  - đọc lịch sử điểm: `GET /shops/{SHOP_ID}/customers/point_logs?shop_customer_id=…`
  - ghi đè trường `reward_point` qua `PUT /shops/{SHOP_ID}/customers/{ID}`. Tài liệu không nói đây là giá trị tuyệt đối hay cộng thêm, cũng không nói có tạo dòng lịch sử điểm hay không.
- Hạng thành viên: `GET /shops/{SHOP_ID}/customer_levels`, có ngưỡng lên hạng theo `upgrade_by_point`, `upgrade_by_total_purchase`, `upgrade_by_order_count`.

### 2.2 Lấy gì TỪ Pancake

| Dữ liệu | Endpoint | Trường dùng | Dùng cho |
|---|---|---|---|
| Khách hàng | `GET /customers`, `GET /customers/{id}` | `id`, `name`, `phone_numbers`, `date_of_birth`, `gender`, `emails`, `reward_point`, `level_id`, `tags`, `order_count`, `succeed_order_count`, `purchased_amount`, `last_order_at`, `referral_code` | Hồ sơ, điểm, hạng trên app; dữ liệu CRM |
| Hạng | `GET /customer_levels` | `id`, `name`, `color_customer_level`, `discount`, các ngưỡng `upgrade_by_*` | Hiển thị hạng, thanh tiến độ "còn X để lên hạng" |
| Lịch sử điểm | `GET /customers/point_logs` | `amount`, `current_point`, `inserted_at`, `note` | Màn hình lịch sử tích/tiêu điểm |
| Đơn hàng | `GET /orders?customer_id=…` hoặc theo `updated_at` | `id`, `status`, `inserted_at`, `updated_at`, `items[]`, `buyer_paid_amount`, `total_discount`, `discount_by_customer_level` | Lịch sử mua hàng; CRM (RFM, sản phẩm đã mua) |
| Ưu đãi | `GET /vouchers`, `GET /promotion_advance` | `name`, `promo_code_info`, `start_time`, `end_time`, `customer_tags`, `is_activated` | Màn hình ưu đãi, lọc theo tag khách |

### 2.3 Đẩy gì VỀ Pancake

| Khi nào | Ghi gì | Endpoint |
|---|---|---|
| Khách đăng ký app mà chưa có trong Pancake | Tạo khách: `name`, `phoneNumber`, `dateOfBirth` | `POST /customers` |
| Khách cập nhật hồ sơ trong app | `name`, `date_of_birth`, `gender`, `emails` (chỉ khi khách tự sửa) | `PUT /customers/{id}` |
| Khách kích hoạt app | Thêm tag `app_member` (thu ngân nhìn thấy khách có dùng app) | `PUT /customers/{id}` (`tags`) |
| Ưu đãi riêng cho một nhóm khách (từ CRM) | Tạo khuyến mãi cho danh sách khách | `POST /promotion_advance/create_multi` |

**Không ghi:** `reward_point`, `level_id`, `order_count`, `purchased_amount`. Đây là số liệu Pancake tự tính, app ghi đè vào là sai.

> ⚠️ Khi `PUT` khách hàng, phải đọc bản mới nhất trước rồi gửi lại đầy đủ `tags` (gộp tag cũ với tag mới), tránh xoá mất tag mà nhân viên đã gắn.

### 2.4 Quy cách tính điểm và trừ điểm

**Giai đoạn 1 (MVP): Pancake tính toàn bộ.**
- **Cộng điểm:** khách mua tại quầy, thu ngân gắn đơn cho khách (tìm theo số điện thoại; app không có mã khách). Pancake tự cộng điểm theo cấu hình tích điểm của shop.
- **Trừ điểm (dùng điểm):** khách dùng điểm tại quầy, thu ngân thao tác trên Pancake.
- **Hoàn/huỷ đơn:** Pancake tự xử lý điểm theo cấu hình của nó.
- **App:** chỉ hiển thị số dư, hạng, lịch sử. Số trên app luôn bằng số trên Pancake.
- **Việc cần làm trước:** xác nhận trong Pancake của khách rằng tính năng tích điểm đã bật, và ghi lại quy tắc (ví dụ 10.000đ = 1 điểm; 1 điểm = 1.000đ khi dùng; điểm có hết hạn không; đơn trả hàng thì trừ lại thế nào). Tài liệu API **không mô tả** phần này, nên phải xem trực tiếp trong phần cài đặt Pancake.

**Giai đoạn 2 (nếu cần đổi điểm lấy voucher ngay trong app):**
Vì Pancake chỉ cho ghi đè `reward_point`, cách làm an toàn là:
1. Mỗi khách có một hàng đợi riêng: tại một thời điểm chỉ có một lệnh trừ điểm.
2. Đọc `reward_point` mới nhất từ Pancake → kiểm tra đủ điểm → ghi số mới = số đọc được − số đổi.
3. Đọc lại ngay để xác nhận. Nếu số bị đổi bởi giao dịch khác trong lúc đó (thu ngân vừa bán hàng), huỷ lệnh và thử lại.
4. Ghi một dòng vào sổ giao dịch riêng của MiwaCare (ai đổi, bao nhiêu, lúc nào, số trước/sau) để đối soát.
5. **Test trước trên shop thử:** `PUT reward_point` có tạo dòng `point_logs` không, và có bị Pancake tính lại đè lên không.

Phần này chỉ làm khi đã test xong ở bước 5.

### 2.5 Ghép khách app với khách Pancake

- Đăng nhập bằng số điện thoại + OTP, nên **số điện thoại là khoá ghép**.
- Chuẩn hoá số: bỏ khoảng trắng, đổi `+84` / `84` về `0`, chỉ giữ chữ số.
- Tìm trên Pancake bằng `GET /customers?search=<số>`, rồi **so khớp chính xác** với `phone_numbers` đã chuẩn hoá (vì `search` là tìm gần đúng).
  - Khớp 1 khách: liên kết.
  - Không khớp: tạo khách mới trên Pancake.
  - Khớp nhiều khách (khách bị trùng trong POS): **không tự chọn**. Đưa vào danh sách chờ để nhân viên gộp trên Pancake, trong lúc chờ app hiển thị "đang xác minh tài khoản".
- Lưu `pancake_customer_id` vào hồ sơ app, các lần sau dùng ID, không tìm theo số nữa.

---

## 3. Đồng bộ realtime (chính xác trước, nhanh sau)

### 3.1 Ba lớp đồng bộ

| Lớp | Cách chạy | Độ trễ | Vai trò |
|---|---|---|---|
| **Webhook** | Pancake gọi Edge Function khi `orders` / `customers` thay đổi | 1–5 giây | Realtime cho khách |
| **Đối soát gần** | Cron mỗi 5 phút: đọc đơn và khách có `updated_at` trong 15 phút gần nhất | ≤ 5 phút | Bù webhook bị lỡ (Pancake chỉ thử lại 2 lần) |
| **Đối soát đêm** | Cron 2h sáng: so `reward_point` của tất cả khách đã liên kết app | 1 ngày | Lưới an toàn cuối, báo cáo số lệch |

### 3.2 Xử lý webhook "thông minh": coi webhook là chuông cửa

Webhook Pancake không có chữ ký, nên **không tin nội dung payload**:
1. Kiểm tra header bí mật. Sai thì trả 401.
2. Chỉ lấy `id` và loại sự kiện, ghi vào bảng hàng đợi `sync_queue`, rồi **trả 200 ngay** (Pancake chỉ chờ 30 giây).
3. Worker lấy từ hàng đợi, **gọi lại API Pancake** để đọc bản mới nhất của khách hoặc đơn đó, rồi upsert vào Postgres.
4. Chống trùng: bỏ qua nếu `updated_at` không mới hơn bản đang lưu.

Được ba điều: kẻ giả mạo webhook không thể đẩy dữ liệu sai vào (dữ liệu luôn lấy từ API thật), sự kiện trùng hay sai thứ tự không gây lỗi, và Pancake không bị timeout.

### 3.3 Đẩy xuống app

- App đăng ký **Supabase Realtime** trên dòng `members` của chính khách đó. Khi điểm đổi, màn hình tự cập nhật, không cần kéo để tải lại.
- Khi điểm tăng hoặc lên hạng, backend gửi **push** kiểu "Bạn vừa được cộng 25 điểm từ đơn hàng hôm nay".
- App mở lại sau thời gian dài: lấy dữ liệu từ Postgres (nhanh) và hiển thị "cập nhật lúc …".

### 3.4 Giám sát độ chính xác

- Bảng `sync_runs` ghi lại mỗi lần đồng bộ: thời gian, số bản ghi, lỗi.
- Cảnh báo (email hoặc Telegram) khi: webhook không về quá 30 phút trong giờ bán hàng, hoặc đối soát đêm thấy chênh lệch > 0.

---

## 4. CRM riêng

### 4.1 Dữ liệu

| Bảng | Nguồn | Nội dung chính |
|---|---|---|
| `members` | App + Pancake | hồ sơ, `pancake_customer_id`, điểm, hạng, ngày sinh, giới tính |
| `orders`, `order_items` | Pancake | đơn hàng và sản phẩm, để tính hành vi mua |
| `point_logs` | Pancake | lịch sử điểm |
| `consents` | App | đồng ý theo **từng mục đích** (bắt buộc dùng app / nhận khuyến mãi / cá nhân hoá), có thời điểm và phiên bản chính sách |
| `push_tokens` | App | token thiết bị |
| `interests` | App | chủ đề khách chọn quan tâm |
| `segments` | Admin | định nghĩa nhóm lọc |
| `campaigns`, `messages` | Admin | bài viết, thông báo đã gửi, ai mở |

### 4.2 Lọc khách: bắt đầu với các tiêu chí có sẵn
- **Theo hạng** (`level_id`) và **điểm**.
- **RFM:** lần mua gần nhất, số lần mua, tổng chi tiêu (tính từ `orders`). Ví dụ các nhóm "khách VIP", "khách sắp rời", "khách mới mua lần đầu".
- **Sinh nhật trong tháng.**
- **Sản phẩm / nhóm sản phẩm đã mua** (từ `order_items`).
- **Chủ đề quan tâm** do khách tự chọn trong app.
- **Tag** từ Pancake.

Mỗi nhóm là một truy vấn đã lưu. Chỉ gửi tới khách **đã đồng ý nhận tin khuyến mãi** (`consents`).

### 4.3 Gửi nội dung
- **Push** (Expo Push) kèm link mở thẳng vào bài viết trong app.
- **Hộp thư trong app:** lưu lại các thông báo, để khách tắt push vẫn xem được.
- **Ưu đãi riêng:** từ nhóm khách đã lọc, gọi `promotion_advance/create_multi` để Pancake áp ưu đãi tại quầy.

### 4.4 Trang quản trị
- Giai đoạn 1: dùng Supabase Dashboard cho nội bộ, cộng một trang quản trị nhỏ chỉ có 3 việc: đăng bài, chọn nhóm khách, gửi.
- Chưa cần dựng CRM đầy đủ tính năng từ đầu.

---

## 5. Bảo mật

### 5.1 Kỹ thuật

| Hạng mục | Làm gì |
|---|---|
| Khoá Pancake | Dùng **Shop API key** (chỉ một shop), không dùng Account key. Chỉ lưu trong Supabase Secrets, đổi khoá định kỳ và ngay khi có người nghỉ việc |
| Đăng nhập | OTP qua SMS brandname hoặc Zalo ZNS; giới hạn số lần gửi OTP theo số điện thoại và thiết bị; OTP hết hạn sau 5 phút |
| Phiên đăng nhập | Token ngắn hạn, refresh token lưu trong `expo-secure-store` (Keychain / Keystore), không dùng AsyncStorage |
| Phân quyền dữ liệu | Bật **Row Level Security** cho mọi bảng: khách chỉ đọc được dòng của chính mình; bảng CRM và đồng bộ chỉ server truy cập |
| Webhook | Header bí mật, đọc lại từ API (mục 3.2), giới hạn tần suất |
| Nhận diện tại quầy | Không có mã khách trong app. Thu ngân tìm bằng SĐT và đối chiếu tên trước khi dùng điểm |
| Mã QR chương trình | Mã do thương hiệu tạo cho từng chương trình, chỉ chứa mã chương trình ngẫu nhiên (không chứa dữ liệu khách). Server kiểm tra hạn, số lượt, mỗi khách 1 lần; giới hạn tần suất nhập mã để chống dò mã |
| Quản trị | Tài khoản riêng từng người, bật 2FA, phân vai (xem / gửi tin / quản trị), ghi log mọi thao tác xuất dữ liệu |
| Truyền tải và lưu trữ | HTTPS toàn bộ; dữ liệu được mã hoá khi lưu (mặc định của Supabase); sao lưu hằng ngày |
| App | Không ghi log số điện thoại hay token; không nhúng bất kỳ khoá bí mật nào trong code app |
| Tối thiểu dữ liệu | Chỉ đồng bộ trường cần dùng; không lấy `fb_id`, `conversation_link`, địa chỉ nếu chưa cần |

### 5.2 Pháp lý tại Việt Nam
- **Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15** (hiệu lực 01/01/2026), **Nghị định 356/2025/NĐ-CP** hướng dẫn thi hành (thay Nghị định 13), **Nghị định 330/2026/NĐ-CP** về xử phạt (hiệu lực 19/08/2026).
- Hệ quả cho app:
  - Xin **đồng ý riêng cho từng mục đích** (dùng app / nhận khuyến mãi / cá nhân hoá), **lưu bằng chứng đồng ý** (bảng `consents`), cho phép **rút lại** bất cứ lúc nào.
  - Có **chính sách bảo mật** tiếng Việt, đường link công khai.
  - Cho phép khách **xem, sửa, xoá** dữ liệu của mình.
  - Phân vai rõ: thương hiệu là bên kiểm soát dữ liệu, bên build và vận hành là bên xử lý. Cần **hợp đồng xử lý dữ liệu** giữa hai bên.
  - **Vị trí máy chủ:** Supabase đặt ở Singapore thì có yếu tố chuyển dữ liệu ra nước ngoài, có thể phải lập hồ sơ theo luật. Cần hỏi luật sư hoặc cân nhắc máy chủ tại Việt Nam trước khi chạy thật.
- ⚠️ Mục này là định hướng kỹ thuật, **không thay cho tư vấn pháp lý**. Nên cho luật sư rà lại hồ sơ đánh giá tác động và hồ sơ chuyển dữ liệu ra nước ngoài.

---

## 6. Chuẩn App Store (iOS) và Google Play (Android)

### 6.1 Apple App Store
| Quy định | Áp dụng cho MiwaCare |
|---|---|
| Build bằng **Xcode 26 / iOS 26 SDK** (bắt buộc từ 28/04/2026) | EAS Build xử lý trên cloud, không cần Xcode trên máy |
| **Xoá tài khoản trong app** (Guideline 5.1.1(v)) | Nút "Xoá tài khoản" trong Cài đặt, xoá thật trên server |
| **Đăng nhập bên thứ ba** (4.8) | Chỉ dùng OTP thì không cần Sign in with Apple. Thêm đăng nhập Google hoặc Zalo thì **phải** có thêm Sign in with Apple |
| **Chức năng tối thiểu** (4.2) | Có thẻ thành viên, điểm, ưu đãi, push là đủ; tránh làm app kiểu "web bọc lại" |
| **Tài khoản demo cho người duyệt** (2.1) | Cấp một số điện thoại thử có OTP cố định cho Apple |
| **Nhãn quyền riêng tư** + Privacy Manifest | Khai báo đúng dữ liệu thu thập trong App Store Connect; cấu hình qua Expo |
| Theo dõi quảng cáo (ATT) | Không theo dõi chéo app thì không cần hỏi quyền này |
| Thanh toán (3.1) | Điểm thưởng dùng cho hàng hoá thật thì không cần In-App Purchase |
| Tài khoản developer doanh nghiệp | Cần **mã D-U-N-S** của công ty |

### 6.2 Google Play
| Quy định | Áp dụng cho MiwaCare |
|---|---|
| **Target API 36 (Android 16)** cho app mới và bản cập nhật từ 31/08/2026 | Dùng Expo SDK mới nhất là đạt |
| **Xoá tài khoản**: trong app **và** qua một link web | Làm trang web nhỏ "Yêu cầu xoá tài khoản" |
| **Data safety form** | Khai báo khớp với nhãn quyền riêng tư bên Apple và chính sách bảo mật |
| Quyền thông báo (Android 13+) | Xin quyền đúng lúc, giải thích lợi ích trước khi hỏi |
| Tài khoản developer **cá nhân** mới | Phải test kín với **12 người trong 14 ngày** mới được phát hành, nên **dùng tài khoản tổ chức** |
| Phân loại nội dung, chính sách bảo mật | Điền bảng phân loại; dùng chung link chính sách với iOS |

### 6.3 Riêng tại Việt Nam
- Nếu sau này app có **đặt hàng hoặc bán hàng**, cần kiểm tra nghĩa vụ thông báo hoặc đăng ký với Bộ Công Thương (online.gov.vn). App chỉ có thành viên và ưu đãi thì thường chưa đến mức đó. Cần xác nhận khi mở rộng tính năng.

---

## 7. Bảo trì và vận hành

| Việc | Cách làm | Tần suất |
|---|---|---|
| Sửa lỗi giao diện và logic | **EAS Update** (cập nhật OTA), khách không cần tải lại từ store | Khi cần |
| Phát hành bản mới | Kênh `preview` (nội bộ test) → `production`; phát hành từ từ (staged rollout) | Theo đợt |
| Theo dõi crash | Sentry cho app và Edge Functions | Liên tục |
| Theo dõi đồng bộ | Cảnh báo theo mục 3.4; báo cáo đối soát mỗi sáng | Hằng ngày |
| Nâng cấp Expo SDK | Để đạt yêu cầu target API của Google và SDK của Apple | 1–2 lần/năm |
| Gia hạn | Apple Developer (hằng năm), tên miền, SMS brandname | Hằng năm |
| Sao lưu và khôi phục | Supabase backup hằng ngày; thử khôi phục mỗi quý | Hằng ngày / quý |
| Hỗ trợ khách | Mục "Hỗ trợ" trong app (link Zalo OA), mẫu trả lời cho các lỗi hay gặp như sai điểm hay không nhận OTP | Liên tục |
| Rà bảo mật | Đổi khoá Pancake, rà quyền quản trị, cập nhật thư viện | Hằng quý |

---

## 8. Lộ trình build

| Giai đoạn | Nội dung | Kết quả |
|---|---|---|
| **0. Chuẩn bị** | Chốt câu hỏi mục 9; xác minh cách Pancake tính điểm; test webhook trên shop thật; đăng ký Apple / Google (tổ chức), D-U-N-S, SMS OTP; dự thảo chính sách bảo mật | Đủ đầu vào để code |
| **1. Backend đồng bộ** | Supabase: schema, nhận webhook, worker, cron đối soát, RLS | Dữ liệu Pancake về Postgres chính xác, có báo cáo đối soát |
| **2. App MVP** | Đăng nhập OTP + đồng ý; thẻ thành viên; điểm + hạng + tiến độ; lịch sử điểm và đơn; ưu đãi; hộp thư; push; tài khoản + xoá tài khoản | App chạy trên Expo Go / development build |
| **3. CRM gửi tin** | Bảng phân khúc, trang quản trị nhỏ, gửi push và bài viết | Gửi đúng nhóm khách |
| **4. Phát hành** | Test kín (TestFlight + Internal testing), hồ sơ store, nộp duyệt | App lên App Store và Google Play |
| **5. Vận hành** | Theo mục 7; giai đoạn 2 thêm đổi điểm trong app (mục 2.4) | |

---

## 9. Câu hỏi cần chốt trước khi code

1. Pancake của khách **đã bật tích điểm và hạng thành viên** chưa? Quy tắc cụ thể ra sao: tỷ lệ tích, tỷ lệ dùng, hạn dùng điểm, xử lý đơn hoàn?
2. Bản đầu tiên chỉ **xem điểm và dùng điểm tại quầy** (khuyến nghị), hay cần **đổi điểm lấy voucher ngay trong app**?
3. Mua hàng online (Facebook, website) có đi qua Pancake và có được tích điểm không?
4. Khách đã có **SMS brandname** hoặc **Zalo OA** để gửi OTP chưa?
5. Tài khoản Apple và Google đứng tên **công ty khách** (có D-U-N-S chưa)?
6. Máy chủ đặt ở **Singapore** (Supabase) được không, hay bắt buộc ở Việt Nam?
7. Khách có cần app **nhiều cửa hàng / nhiều shop Pancake** không?

---

## Nguồn
- Pancake POS Open API: https://pos.pancake.vn/developers/api/en (Customer, Order, Webhooks, Voucher, Promotion)
- Apple — SDK minimum requirements: https://developer.apple.com/news/upcoming-requirements/
- Google Play — Target API level requirements: https://support.google.com/googleplay/android-developer/answer/11926878
- Luật 91/2025/QH15: https://thuvienphapluat.vn/van-ban/Bo-may-hanh-chinh/Luat-Bao-ve-du-lieu-ca-nhan-2025-91-2025-QH15-625628.aspx
- EY — Nghị định 356/2025/NĐ-CP: https://www.ey.com/vi_vn/technical/tax/tax-and-law-updates/nghi-dinh-so-356-2025-nd-cp-quy-dinh-chi-tiet-mot-so-dieu-va-bien-phap-thi-hanh-luat-bao-ve-du-lieu-ca-nhan
