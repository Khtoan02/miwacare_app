# 09 — Phân tích luồng hoạt động

> MiwaCare · v1 · 2026-11-25 · Mã luồng `AF-xx`. Đây là các luồng ở mức hệ thống (ai gọi ai, theo thứ tự nào), bổ sung cho luồng người dùng trong `04`.

## AF-01. Đăng nhập OTP

```mermaid
sequenceDiagram
  actor K as Khách
  participant A as App
  participant Au as Supabase Auth
  participant H as otp-sms-hook
  participant S as Nhà cung cấp SMS/ZNS
  K->>A: Nhập SĐT
  A->>A: Chuẩn hoá, kiểm tra định dạng
  A->>Au: signInWithOtp(phone)
  Au->>Au: Kiểm tra giới hạn gửi
  Au->>H: Send SMS hook (phone, otp)
  H->>S: Gửi OTP
  S-->>K: Tin nhắn OTP
  K->>A: Nhập OTP
  A->>Au: verifyOtp
  Au-->>A: Phiên (access + refresh token)
  A->>A: Lưu refresh token vào SecureStore
  A->>A: Chuyển sang AF-02
```

## AF-02. Ghép thành viên với khách Pancake

```mermaid
flowchart TD
  A[member-link nhận yêu cầu] --> B{members đã có pancake_customer_id?}
  B -- Có --> Z[Trả linked]
  B -- Chưa --> C[GET /customers?search=SĐT]
  C --> D[Lọc khớp chính xác phone_numbers sau chuẩn hoá]
  D --> E{Số kết quả}
  E -- 1 --> F[Lưu pancake_customer_id] --> G[Gộp tag + app_member, PUT] --> H[Đồng bộ khách, điểm, đơn 12 tháng] --> Z
  E -- 0 --> I[POST /customers name + phoneNumber] --> F
  E -- >1 --> J[link_status = pending_duplicate] --> K[Ghi duplicate_matches + cảnh báo admin] --> Y[Trả pending_duplicate]
  C -. Pancake lỗi .-> L[link_status = creating, đưa vào sync_queue] --> Y2[Trả creating: app hiện 'đang chuẩn bị']
```

## AF-03. Đồng bộ realtime khi có đơn mới tại quầy

```mermaid
sequenceDiagram
  participant P as Pancake POS
  participant W as pancake-webhook
  participant Q as sync_queue
  participant SW as sync-worker
  participant DB as Postgres
  participant RT as Realtime
  participant PW as push-worker
  participant A as App
  P->>W: POST webhook (orders / customers) + header bí mật
  W->>W: Kiểm tra header
  W->>Q: upsert (entity, id) pending
  W-->>P: 200 OK (< 1 giây)
  W->>SW: Gọi ngay (không chờ)
  SW->>Q: Lấy việc (khoá dòng)
  SW->>P: GET order / customer mới nhất
  SW->>DB: Upsert nếu updated_at mới hơn
  Note over SW,DB: Nếu là đơn → đọc thêm khách và point_logs của khách đó
  DB->>DB: Trigger: reward_point đổi → point_events + inbox + push_queue
  DB-->>RT: Thay đổi pancake_customers, inbox_messages
  RT-->>A: Cập nhật thẻ / hộp thư
  PW->>PW: Lấy push_queue
  PW-->>A: Push "+X điểm"
```

## AF-04. Đối soát

```mermaid
flowchart TD
  subgraph Gan[Mỗi 5 phút]
    G1[Đọc sync_cursors] --> G2[GET orders updateStatus=updated_at từ cursor−10 phút tới nay]
    G2 --> G3[GET customers theo updated_at cùng khoảng]
    G3 --> G4[Đưa id vào sync_queue với reason=reconcile]
    G4 --> G5[Cập nhật cursor khi thành công]
  end
  subgraph Dem[2h sáng]
    D1[Lấy toàn bộ thành viên đã ghép] --> D2[GET customer theo lô, tôn trọng rate limit]
    D2 --> D3{reward_point / level_id khác bản lưu?}
    D3 -- Có --> D4[Sửa theo Pancake, không gửi push, ghi lệch vào sync_runs]
    D3 -- Không --> D5[Bỏ qua]
    D4 --> D6[Báo cáo sáng: số lệch, nguyên nhân]
    D5 --> D6
  end
  G2 -. lỗi liên tiếp 3 lần .-> X[Cảnh báo Telegram]
  D6 -. lệch > 0 .-> X
```
Cửa sổ chồng lấn 10 phút giúp không bỏ sót bản ghi nằm ở biên thời gian.

## AF-05. Cập nhật hồ sơ

1. App gửi hồ sơ mới tới `member-profile` (đã kiểm tra bằng zod).
2. Function cập nhật `members`.
3. Khoá theo khách → `GET` khách Pancake → gộp trường → `PUT` → `GET` xác nhận.
4. Ghi `audit_logs`, trả kết quả. Nếu Pancake lỗi: vẫn lưu ở MiwaCare, đưa việc ghi Pancake vào hàng đợi.

## AF-06. Gửi chiến dịch

```mermaid
flowchart LR
  A[Editor tạo chiến dịch: phân khúc + nội dung] --> B[Xem trước số người nhận]
  B --> C[Gửi duyệt] --> D{Admin duyệt?}
  D -- Không --> A
  D -- Có --> E{Hẹn giờ?}
  E -- Có --> F[pg_cron tới giờ]
  E -- Không --> G
  F --> G[campaign-dispatch: chạy segment_members, lọc đồng ý + cài đặt thông báo]
  G --> H[Tạo campaign_recipients + inbox_messages]
  H --> I[push_queue theo lô]
  I --> J[push-worker gửi qua Expo] --> K[Đọc receipt, đánh dấu token hỏng]
  K --> L[Báo cáo: gửi / nhận / mở]
```

## AF-07. Xoá tài khoản

1. Khách xác nhận bằng OTP (trong app hoặc trên web F-92).
2. `account-delete`: đặt `deleted_at`, thu hồi mọi phiên, vô hiệu `devices`, huỷ mọi push đang chờ.
3. Gỡ tag `app_member` trên Pancake (theo quy tắc ghi an toàn).
4. Ghi `audit_logs` và `consents` (rút toàn bộ đồng ý).
5. Sau 30 ngày, job xoá cứng: `members`, `devices`, `member_interests`, `inbox_messages`, `campaign_recipients`. Dữ liệu 🟦 bản sao Pancake của khách đó cũng bị xoá khỏi MiwaCare.
6. Giữ lại: bằng chứng đồng ý và nhật ký xoá (không có dữ liệu nhận dạng ngoài mã băm SĐT) để chứng minh tuân thủ.

## AF-08. Phát hành bản cập nhật app

```mermaid
flowchart LR
  A[Merge vào main] --> B[CI: lint + test + RLS test]
  B --> C{Chỉ đổi JS / giao diện?}
  C -- Có --> D[EAS Update kênh preview] --> E[Test nội bộ] --> F[EAS Update kênh production, rollout 10% → 100%]
  C -- Không: đổi native --> G[EAS Build] --> H[TestFlight + Internal testing] --> I[EAS Submit] --> J[Store duyệt] --> K[Phát hành theo giai đoạn]
```
