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

## Cấu trúc
| Thư mục | Nội dung |
|---|---|
| `src/app/` | Màn hình (Expo Router). `(auth)` đăng nhập · `(tabs)` 4 tab + nút quét · `(member)` màn cần đăng nhập ngoài tab |
| `src/ui/` | Thành phần giao diện dùng chung (chỉ dùng token màu theo vai trò) |
| `src/theme/` | Theme sáng/tối, lấy token từ `../../design/tokens.json` |
| `src/domain/` | Kiểu dữ liệu và **tính điểm/hạng theo cấu hình** (`points.ts`, hàm thuần) |
| `src/data/` | Lớp dữ liệu: `api.ts` (mock, sau này Supabase), `hooks.ts` (TanStack Query) |
| `src/i18n/vi.ts` | Toàn bộ chuỗi tiếng Việt |

## Kiểm tra trước khi báo xong
```bash
npx tsc --noEmit
npx expo lint
```
