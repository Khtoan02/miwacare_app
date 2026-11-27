# MiwaCare — Trang quản lý bài viết & thông báo (apps/cms)

Trang riêng cho người viết bài (Cloudflare Pages project `miwacare-cms`). Dùng chung Supabase với app và trang quản trị.

- **Đăng nhập:** link email (không mật khẩu). Chỉ email có trong `admin_users` với vai `writer`, `editor` hoặc `admin`.
  Vai `writer` chỉ vào được trang này, không xem được dữ liệu khách (trang quản trị chặn vai này).
- **Bài viết:** soạn Markdown, ảnh bìa + chèn ảnh (Supabase Storage, bucket `post-images`, tối đa 5 MB), xem trước, đăng / gỡ.
  Bài đã đăng hiện ở trang blog công khai (`apps/blog`) và trong app.
- **Gửi thông báo:** sau khi đăng bài, hoặc gửi tin không kèm bài ở mục "Thông báo đã gửi".
  Chạy qua Edge Function `cms`: chỉ khách **đã đồng ý nhận tin** (BR-10); mỗi khách nhận một dòng trong hộp thư, máy bật thông báo nhận push qua Expo.
  Ai đăng nhập được trang này đều gửi được (quyết định 2026-11-26).

## Chạy trên máy
```bash
cd apps/cms
npm install
npm run dev   # http://localhost:5175 — đọc .env ở gốc repo (EXPO_PUBLIC_SUPABASE_URL/ANON_KEY)
```
Link đăng nhập mở về địa chỉ đã khai trong Supabase › Authentication › URL Configuration (redirect URLs).

## Cấp quyền người viết
Tạo người dùng bằng lời mời email trong Supabase › Authentication › Users, rồi:
```sql
insert into public.admin_users (id, role) select id, 'writer' from auth.users where email = '<email>';
```
