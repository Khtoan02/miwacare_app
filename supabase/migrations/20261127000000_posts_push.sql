-- Blog + hộp thư + thông báo đẩy (F-22, F-23, F-33, F-56, F-75, F-76).
-- - posts: bài viết / bài khuyến mãi. Bài đã đăng ai cũng đọc được (trang blog công khai, app).
-- - inbox: hộp thư từng khách (mỗi lần gửi tạo một dòng cho mỗi khách nhận).
-- - campaigns: lịch sử gửi thông báo.
-- - Vai mới 'writer': chỉ dùng trang quản lý blog, KHÔNG đọc được dữ liệu khách.
--   Người soạn bài (writer / editor / admin) đều được gửi thông báo (quyết định 2026-11-26).
-- - Tin khuyến mãi / bài viết chỉ gửi cho khách đã đồng ý nhận tin (BR-10).

-- ───────────────────────── Vai writer ─────────────────────────
alter table public.admin_users drop constraint admin_users_role_check;
alter table public.admin_users add constraint admin_users_role_check check (role in ('writer', 'viewer', 'editor', 'admin'));

-- is_admin() xét thứ bậc viewer < editor < admin; 'writer' không nằm trong thứ bậc → luôn false.
create or replace function public.is_writer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users a where a.id = auth.uid() and a.role in ('writer', 'editor', 'admin'));
$$;
revoke all on function public.is_writer() from public, anon;
grant execute on function public.is_writer() to authenticated, service_role;

-- ───────────────────────── Bài viết ─────────────────────────
create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind         text not null default 'article' check (kind in ('article', 'promo')),
  title        text not null check (length(title) between 1 and 200),
  excerpt      text,
  cover_url    text,
  body         text not null default '',          -- Markdown
  status       text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  offer_id     uuid references public.offers (id) on delete set null,  -- bài khuyến mãi gắn ưu đãi
  author       uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.posts (status, published_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger posts_touch before update on public.posts for each row execute function public.touch_updated_at();

-- ───────────────────────── Chiến dịch + hộp thư ─────────────────────────
create table public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid references public.posts (id) on delete set null,
  kind        text not null check (kind in ('article', 'promo')),
  title       text not null,
  body        text not null,
  sent_by     uuid references auth.users (id) on delete set null,
  sent_at     timestamptz not null default now(),
  recipients  int not null default 0,   -- số khách nhận vào hộp thư
  push_sent   int not null default 0,   -- số thiết bị Expo nhận thành công
  push_failed int not null default 0
);

create table public.inbox (
  id          bigint generated always as identity primary key,
  member_id   uuid not null references public.members (id) on delete cascade,
  kind        text not null check (kind in ('transaction', 'promo', 'article')),
  title       text not null,
  body        text not null,
  post_id     uuid references public.posts (id) on delete set null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index on public.inbox (member_id, created_at desc);

-- ───────────────────────── RLS ─────────────────────────
alter table public.posts     enable row level security;
alter table public.campaigns enable row level security;
alter table public.inbox     enable row level security;

-- Bài đã đăng: ai cũng đọc (kể cả chưa đăng nhập — trang blog công khai). Người soạn bài thấy cả bản nháp.
create policy posts_public on public.posts for select to anon, authenticated
  using ((status = 'published' and published_at <= now()) or is_writer() or is_admin());
create policy posts_write  on public.posts for all to authenticated using (is_writer()) with check (is_writer());

create policy campaigns_read on public.campaigns for select to authenticated using (is_writer() or is_admin());
-- campaigns: không có policy ghi → chỉ Edge Function `cms` (service_role) ghi.

create policy inbox_self   on public.inbox for select to authenticated using (member_id = auth.uid());
create policy inbox_read   on public.inbox for update to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());

grant select on public.posts to anon;
grant select, insert, update, delete on public.posts, public.campaigns, public.inbox to authenticated;
grant all on public.posts, public.campaigns, public.inbox to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Khách chỉ được đánh dấu đã đọc, không sửa nội dung tin.
revoke update on public.inbox from authenticated;
grant update (read_at) on public.inbox to authenticated;

-- ───────────────────────── Ảnh bài viết (Supabase Storage) ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy post_images_write on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and public.is_writer());
create policy post_images_update on storage.objects for update to authenticated
  using (bucket_id = 'post-images' and public.is_writer());
create policy post_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and public.is_writer());

-- ───────────────────────── Khách nhận tin khuyến mãi / bài viết ─────────────────────────
-- Đồng ý mới nhất của khách cho mục 'marketing' là true (BR-10). Chỉ máy chủ gọi.
create or replace function public.marketing_member_ids()
returns table (member_id uuid) language sql stable security definer set search_path = public as $$
  select m.id
  from members m
  where m.deleted_at is null
    and (select c.granted from consents c
         where c.member_id = m.id and c.purpose = 'marketing'
         order by c.created_at desc limit 1) is true;
$$;
revoke all on function public.marketing_member_ids() from public, anon, authenticated;
grant execute on function public.marketing_member_ids() to service_role;
