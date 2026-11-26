# MiwaCare — trang quản trị (Vite + React)

Trang web nội bộ để quản lý thành viên, đơn hàng, điểm, ưu đãi và chương trình QR.
Sẽ đặt trên **Cloudflare Pages** (miễn phí). File `public/_redirects` để mọi đường dẫn mở đúng trang.

## Chạy thử
```bash
cd apps/admin
npm install
npm run dev        # mở http://localhost:5174
```
- Đăng nhập: email bất kỳ, **mật khẩu bất kỳ từ 6 ký tự**, chọn vai để thử quyền.
- Dữ liệu mẫu lưu trong trình duyệt (localStorage). Bấm **“Khôi phục dữ liệu mẫu”** trên dải vàng để về ban đầu.

## Các màn (mã chức năng trong docs/03)
| Màn | Làm được gì | Vai tối thiểu |
|---|---|---|
| Tổng quan (F-71) | Số thành viên, đơn, điểm tháng này, phân bố hạng | Chỉ xem |
| Thành viên (F-72) | Tìm theo tên/SĐT, lọc hạng, xem lịch sử điểm + đơn | Chỉ xem (SĐT bị che) |
| Điều chỉnh điểm | Cộng/trừ tay, bắt buộc lý do, ghi nhật ký | Quản trị |
| Đơn hàng | Nhập tay, nhập CSV (có file mẫu), đổi trạng thái, ghép đơn theo SĐT | Biên tập |
| Điểm & hạng (Q-05) | Xem luật đang áp dụng, tạo **phiên bản mới** có ngày hiệu lực, thử tính điểm | Quản trị |
| Ưu đãi | Tạo/xoá voucher, quà đổi điểm, sự kiện; ưu đãi riêng | Biên tập |
| Chương trình & mã QR (F-81) | Tạo chương trình, sinh mã, tải PNG / in mã QR | Biên tập |
| Nhật ký thao tác (F-79) | Ai làm gì, lúc nào (chỉ đọc) | Chỉ xem |

Chưa làm (giai đoạn sau): phân khúc (F-74), bài viết (F-75), chiến dịch push (F-76/77), nội dung tĩnh (F-78), khách trùng (F-73, cần Pancake).

## Quy tắc nghiệp vụ đã cài (dữ liệu mẫu)
- Điểm tính bằng **đúng hàm của app** (`apps/mobile/src/domain/points.ts`) → app và trang quản trị luôn ra cùng con số.
- Một đơn chỉ được cộng điểm một lần. Huỷ đơn đã cộng → trừ lại đúng số đó; đơn đã huỷ không đổi lại được.
- Đơn của SĐT chưa có tài khoản app vẫn lưu; khi khách đăng ký, bấm “Ghép đơn theo SĐT”.
- Đổi luật điểm không sửa luật cũ: tạo phiên bản mới, đơn cũ vẫn tính theo luật lúc mua.
- Mã QR chứa `miwacare://p/<MÃ>` — khớp với màn quét trong app.

## Cấu trúc
| Thư mục | Nội dung |
|---|---|
| `src/data/api.ts` | Toàn bộ thao tác dữ liệu. **Khi nối Supabase chỉ sửa file này** (giữ chữ ký hàm) |
| `src/data/mock.ts` | Sinh dữ liệu mẫu (48 khách, đơn, sổ điểm khớp số dư) |
| `src/pages/` | Từng màn |
| `src/ui/` | Khung trang, thành phần dùng chung, ảnh QR |
| `src/lib/` | Đăng nhập/phân quyền, nhãn tiếng Việt, đọc CSV, biến màu từ `design/tokens.json` |

Alias: `@domain` → `apps/mobile/src/domain`, `@shared` → `apps/mobile/src/lib`, `@design` → `design/`.

## Kiểm tra trước khi báo xong
```bash
npm run typecheck
npm run lint
npm run build
```

## Khi nối thật (chưa làm)
- Đăng nhập bằng Supabase Auth (email + mật khẩu + 2FA), vai lấy từ bảng `admin_users`.
- Cộng điểm / nhập CSV / điều chỉnh điểm chạy trong Edge Function (dùng service_role trên server), **không** từ trình duyệt.
- Biến môi trường trên Cloudflare Pages: chỉ `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
