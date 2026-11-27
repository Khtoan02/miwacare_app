# MiwaCare — Trang blog công khai (apps/blog)

Cloudflare Pages project `miwacare-blog` (miễn phí). Không có framework: HTML dựng trên máy chủ bằng Pages Functions để Google, Zalo, Facebook đọc được tiêu đề / ảnh / tóm tắt.

| Đường dẫn | Nội dung |
|---|---|
| `/` | Danh sách bài đã đăng; lọc `?loai=cam-nang` / `?loai=khuyen-mai` |
| `/bai-viet/<slug>` | Một bài viết |
| `/sitemap.xml`, `/robots.txt` | Cho Google |

- Thêm `?app=1`: ẩn đầu trang / chân trang — app MiwaCare mở bài bằng WebView với tham số này.
- Đọc bài bằng khoá publishable của Supabase; RLS chỉ trả bài đã đăng.
- Markdown → HTML: `functions/_lib/markdown.ts` (giữ giống `apps/cms/src/lib/markdown.ts`). HTML viết tay bị hiện thành chữ.
- Màu: `npm run build` sinh `public/tokens.css` từ `design/tokens.json`.

## Cloudflare Pages
Root directory `apps/blog`, build command `npm run build`, output `public`. Biến môi trường (tuỳ chọn): `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

## Chạy trên máy
```bash
cd apps/blog && npm install && npm run dev   # http://localhost:8788
```
