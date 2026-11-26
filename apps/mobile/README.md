# MiwaCare — app di động (Expo SDK 58)

## Chạy thử
```bash
cd apps/mobile
npm install
npx expo start
```
- **Điện thoại thật:** cài app **Expo Go**, quét mã QR hiện trong terminal (máy tính và điện thoại cùng mạng Wi-Fi).
- **Trình duyệt:** nhấn `w` trong terminal, hoặc chạy `npm run web`. Bản web không quét được QR bằng camera; nhập mã bằng tay.

## Dữ liệu mẫu
Mặc định app dùng dữ liệu mẫu (`src/data/mock.ts`), chưa cần Supabase hay Pancake.
- Đăng nhập: số điện thoại bất kỳ hợp lệ, **mã OTP `123456`**.
- Mã chương trình để thử màn quét: `MIWA-WS0712` (thành công), `MIWA-TET2026` (hết hạn), `MIWA-FULL` (hết lượt), mã khác (sai).

## Chạy với Supabase thật (từ 2026-11-26)
Tạo `apps/mobile/.env` (đã nằm trong `.gitignore`; chỉ chứa giá trị công khai):
```
EXPO_PUBLIC_DATA_SOURCE=supabase
EXPO_PUBLIC_SUPABASE_URL=https://rbvbytqpsfqbspfnditx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<khoá publishable, xem .env ở gốc repo>
```
Không có file này (hoặc `EXPO_PUBLIC_DATA_SOURCE=mock`) thì app chạy dữ liệu mẫu như trên.

- **Đăng nhập:** SĐT + OTP của Supabase. Chưa gửi OTP thật (Q-06): hook `hook_send_sms` từ chối mọi số không phải số test.
  Số test: `0900000001`, `0900000002`, mã **`123456`**, dùng được đến 31/05/2027 (sửa ở Supabase › Authentication › Sign In / Providers › Phone).
- **Lần đăng nhập đầu:** trigger tạo dòng `members`; app gọi Edge Function `member` (`onboard`) để ghi đồng ý, ghép đơn đã nhập theo SĐT, cộng điểm đơn hoàn tất và thưởng tham gia. Gọi lại nhiều lần không cộng trùng.
- **Đọc dữ liệu:** truy vấn thẳng, RLS chỉ trả dữ liệu của chính khách. **Ghi:** chỉ qua Edge Function `member` (nhận quà bằng mã chương trình: `claimCode`).
- Phiên đăng nhập lưu trong SecureStore (chia nhỏ vì giới hạn 2 KB); bản web dùng localStorage.
- Khi có Zalo ZNS: thay hook `hook_send_sms` bằng hàm gửi ZNS và xoá số test; app không phải sửa.

## Cấu trúc
| Thư mục | Nội dung |
|---|---|
| `src/app/` | Màn hình (Expo Router). `(auth)` đăng nhập · `(tabs)` 4 tab + nút quét · `(member)` màn cần đăng nhập ngoài tab |
| `src/ui/` | Thành phần giao diện dùng chung (chỉ dùng token màu theo vai trò) |
| `src/theme/` | Theme sáng/tối, lấy token từ `../../design/tokens.json` |
| `src/domain/` | Kiểu dữ liệu và **tính điểm/hạng theo cấu hình** (`points.ts`, hàm thuần) |
| `src/data/` | Lớp dữ liệu: `api.ts` (chọn bản mẫu hoặc `api.remote.ts` nối Supabase), `hooks.ts` (TanStack Query) |
| `src/i18n/vi.ts` | Toàn bộ chuỗi tiếng Việt |

## Kiểm tra trước khi báo xong
```bash
npx tsc --noEmit
npx expo lint
```
