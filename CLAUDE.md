# MiwaCare — Hướng dẫn cho Claude

- **Dự án:** MiwaCare — app thành viên (membership) cho khách hàng
- **Nhóm khách hàng:** NP FOOD (cạnh dự án `../Miwako`)
- **Nền tảng:** Android + iOS
- **Công nghệ:** React Native với Expo (TypeScript), một codebase chung cho cả hai nền tảng
- **Section trên sidebar Claude:** NP FOOD — MiwaCare

## Tài liệu cốt lõi
- `docs/README.md`: mục lục bộ tài liệu 00–11 và các mã tham chiếu (BR, F, S, UC, AF). Khi code, ghi mã chức năng `F-xx` vào commit / pull request.
- Giao diện: `docs/05-tieu-chuan-thiet-ke.md` (guideline v2, màu MIWAKO chính thức, font Open Sans + Comfortaa), token ở `design/tokens.json` / `design/tokens.ts`, xem trước ở `design/preview.html`. Component chỉ dùng token vai trò, không viết HEX trực tiếp.
- `docs/00-checklist-chuan-bi.md`: trạng thái chuẩn bị. Chỉ bắt đầu code khi nhóm A và B đã xong.
- Đọc `docs/01-phan-tich-he-thong.md` trước khi làm: kiến trúc, tích hợp Pancake POS, đồng bộ, CRM, bảo mật, chuẩn store, bảo trì.
- **`docs/12-quyet-dinh-da-chot.md` ưu tiên hơn các tài liệu khác.**
- Nguyên tắc: điểm/hạng tính trên server theo cấu hình có phiên bản (sổ `point_ledger`); khi có Pancake thì Pancake làm sổ cái. App không bao giờ gọi thẳng Pancake; khoá bí mật chỉ nằm trên server.

## Bối cảnh sản phẩm (cần bổ sung)
<!-- Điền dần; Claude đọc file này ở đầu mỗi phiên mở trong thư mục này. -->
- Khách hàng / thương hiệu sở hữu app: MiwaCare là thương hiệu của chính bạn (người dùng) — không có bên thương hiệu riêng.
- Mục tiêu app (tích điểm, hạng thành viên, ưu đãi, đặt hàng…):
- Tính năng bắt buộc cho bản đầu tiên (MVP):
- Đăng nhập bằng gì (số điện thoại + OTP, Zalo, Apple/Google…):
- Backend / CRM / POS cần kết nối: Supabase Free (Singapore) + Cloudflare Pages (quản trị) + Expo Free. Pancake tạm hoãn; máy chủ tự tính điểm theo cấu hình.
- Bộ nhận diện (màu, font, logo): màu MIWAKO, Open Sans + Comfortaa (docs/05).
- Ngân sách: ~3 triệu/năm cho tất cả; luôn ưu tiên gói miễn phí.
- Hạn ra mắt:

## Mã nguồn (từ 2026-11-26)
- `apps/mobile/`: app Expo SDK 58 — xem `apps/mobile/README.md` (chạy thử, dữ liệu mẫu, cấu trúc). Đọc `apps/mobile/AGENTS.md` trước khi dùng API Expo.
- `supabase/migrations/`: schema + RLS; `supabase/seed.sql`: dữ liệu mẫu. Chưa áp lên Supabase thật.
- Chưa có: `apps/admin` (trang quản trị), Edge Functions, nối app với Supabase.

## Quy ước kỹ thuật
- Expo SDK mới nhất, TypeScript strict, Expo Router cho điều hướng.
- Build và phát hành qua EAS (EAS Build / EAS Submit); không commit khoá ký app, file `.env` hay keystore.
- Mọi màn hình phải chạy đúng trên cả Android và iOS; kiểm tra cả hai trước khi báo xong.
- Chuỗi hiển thị viết tiếng Việt, gom vào một chỗ để sau này dễ thêm ngôn ngữ.

## Môi trường máy hiện tại (kiểm tra ngày 2026-11-25)
- Có: Node 22, npm 10.
- Chưa có: Xcode (mới có Command Line Tools), Android Studio / Android SDK, watchman.
- Vì vậy: chạy thử bằng app Expo Go trên điện thoại thật, build bản cài đặt bằng EAS Build trên cloud. Muốn chạy simulator/emulator trên máy thì cần cài Xcode và Android Studio.

## Quy tắc làm việc
1. Trả lời bằng tiếng Việt.
2. Không bịa thông tin khách hàng, chính sách thành viên hay ưu đãi; thiếu thì hỏi.
3. Không tạo tài khoản, không đăng app lên store, không chi tiền khi chưa được đồng ý.
