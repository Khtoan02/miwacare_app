-- Sửa: khách vãng lai (anon) không được gọi is_writer()/is_admin() → tách chính sách đọc bài.
drop policy posts_public on public.posts;
create policy posts_public_anon on public.posts for select to anon
  using (status = 'published' and published_at <= now());
create policy posts_public_auth on public.posts for select to authenticated
  using ((status = 'published' and published_at <= now()) or is_writer() or is_admin());
