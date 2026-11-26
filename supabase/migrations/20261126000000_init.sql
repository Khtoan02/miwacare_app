-- MiwaCare — schema khởi tạo (giai đoạn chưa có Pancake; xem docs/12, Q-05).
-- Điểm là SỔ GIAO DỊCH (point_ledger): số dư = tổng sổ, không sửa dòng cũ.
-- Mọi bảng bật RLS: khách chỉ đọc dữ liệu của chính mình; ghi điểm chỉ qua server (service_role / Edge Functions).


-- ───────────────────────── Cấu hình chương trình thành viên ─────────────────────────
create table public.loyalty_rule_versions (
  version        int primary key,
  effective_from timestamptz not null,
  config         jsonb not null,            -- earn, tierMultipliers, weekdayMultipliers, bonus, redeemValue, expiryMonths
  created_by     uuid,
  created_at     timestamptz not null default now()
);
comment on table public.loyalty_rule_versions is 'Phiên bản quy tắc điểm; đơn tính theo phiên bản hiệu lực tại thời điểm mua.';

create table public.tiers (
  id          text primary key,             -- tier1..tier4
  name        text not null,
  min_points  int  not null check (min_points >= 0),
  color_key   text not null check (color_key in ('tier1','tier2','tier3','tier4')),
  benefits    text,
  sort        int  not null default 0
);

create table public.settings (
  key   text primary key,
  value jsonb not null
);
insert into public.settings (key, value) values ('points_source', '"internal"');  -- 'internal' | 'pancake'

-- ───────────────────────── Thành viên ─────────────────────────
create table public.members (
  id                  uuid primary key references auth.users (id) on delete cascade,
  phone               text not null unique check (phone ~ '^0[35789][0-9]{8}$'),
  full_name           text,
  birthday            date,
  gender              text check (gender in ('female','male','other')),
  tier_id             text references public.tiers (id),
  pancake_customer_id text unique,          -- dùng khi bật kết nối Pancake
  created_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create table public.consents (
  id             bigint generated always as identity primary key,
  member_id      uuid not null references public.members (id) on delete cascade,
  purpose        text not null check (purpose in ('terms','marketing','personalization')),
  granted        boolean not null,
  policy_version text not null,
  device         text,
  created_at     timestamptz not null default now()
);
create index on public.consents (member_id, purpose, created_at desc);

-- ───────────────────────── Đơn hàng (nguồn tạm khi chưa có Pancake) ─────────────────────────
create table public.orders (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  member_id   uuid references public.members (id) on delete set null,
  phone       text not null,                -- để ghép khách khi nhập đơn bằng SĐT
  status      text not null check (status in ('done','shipping','cancelled')),
  channel     text not null,
  items       jsonb not null default '[]',
  subtotal    bigint not null check (subtotal >= 0),
  discount    bigint not null default 0 check (discount >= 0),
  ordered_at  timestamptz not null,
  source      text not null default 'admin' check (source in ('admin','import','pancake')),
  created_at  timestamptz not null default now()
);
create index on public.orders (member_id, ordered_at desc);

-- ───────────────────────── Sổ điểm ─────────────────────────
create table public.point_ledger (
  id           bigint generated always as identity primary key,
  member_id    uuid not null references public.members (id) on delete cascade,
  delta        int not null check (delta <> 0),
  reason       text not null check (reason in ('order','redeem','birthday','signup','program','adjust','expire')),
  title        text not null,
  meta         text,
  order_id     uuid references public.orders (id),
  rule_version int references public.loyalty_rule_versions (version),
  created_by   uuid,                        -- admin thực hiện (nếu có)
  created_at   timestamptz not null default now(),
  unique (order_id, reason)                 -- một đơn chỉ được cộng điểm một lần
);
create index on public.point_ledger (member_id, created_at desc);

create view public.v_member_balance with (security_invoker = true) as
  select member_id,
         coalesce(sum(delta), 0)::int                               as points,
         coalesce(sum(delta) filter (where delta > 0), 0)::int      as lifetime_points,
         max(created_at)                                            as updated_at
  from public.point_ledger group by member_id;

-- ───────────────────────── Ưu đãi ─────────────────────────
create table public.offers (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('voucher','redeem','event')),
  value      text not null,
  unit       text not null,
  tone       text not null check (tone in ('sun','sky','leaf','lemon')),
  title      text not null,
  body       text,
  starts_at  timestamptz,
  ends_at    timestamptz,
  points_cost int,
  public     boolean not null default true, -- false = chỉ khách được cấp mới thấy
  created_at timestamptz not null default now()
);

create table public.member_offers (
  member_id  uuid not null references public.members (id) on delete cascade,
  offer_id   uuid not null references public.offers (id) on delete cascade,
  granted_at timestamptz not null default now(),
  used_at    timestamptz,
  primary key (member_id, offer_id)
);

-- ───────────────────────── Chương trình + mã QR (F-25, F-81) ─────────────────────────
create table public.programs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  place       text,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  gift_offer_id uuid references public.offers (id),
  max_claims  int,
  status      text not null default 'active' check (status in ('draft','active','ended')),
  created_at  timestamptz not null default now()
);

create table public.program_codes (
  code        text primary key check (length(code) >= 8),
  program_id  uuid not null references public.programs (id) on delete cascade,
  single_use  boolean not null default false,
  used_count  int not null default 0
);

create table public.program_claims (
  program_id uuid not null references public.programs (id) on delete cascade,
  member_id  uuid not null references public.members (id) on delete cascade,
  code       text not null,
  claimed_at timestamptz not null default now(),
  primary key (program_id, member_id)
);

create table public.code_attempts (
  id         bigint generated always as identity primary key,
  member_id  uuid not null references public.members (id) on delete cascade,
  ok         boolean not null,
  created_at timestamptz not null default now()
);
create index on public.code_attempts (member_id, created_at desc);

-- ───────────────────────── Thiết bị, quản trị, nhật ký ─────────────────────────
create table public.devices (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members (id) on delete cascade,
  push_token  text not null unique,
  platform    text not null check (platform in ('ios','android','web')),
  push_points boolean not null default true,
  push_promo  boolean not null default false,
  updated_at  timestamptz not null default now()
);

create table public.admin_users (
  id   uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('viewer','editor','admin'))
);

create table public.audit_logs (
  id         bigint generated always as identity primary key,
  actor      uuid,
  action     text not null,
  target     text,
  detail     jsonb,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Hàm tiện ích ─────────────────────────
create or replace function public.is_admin(min_role text default 'viewer')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admin_users a
    where a.id = auth.uid()
      and array_position(array['viewer','editor','admin'], a.role) >= array_position(array['viewer','editor','admin'], min_role)
  );
$$;

-- ───────────────────────── RLS ─────────────────────────
alter table public.loyalty_rule_versions enable row level security;
alter table public.tiers                 enable row level security;
alter table public.settings              enable row level security;
alter table public.members               enable row level security;
alter table public.consents              enable row level security;
alter table public.orders                enable row level security;
alter table public.point_ledger          enable row level security;
alter table public.offers                enable row level security;
alter table public.member_offers         enable row level security;
alter table public.programs              enable row level security;
alter table public.program_codes         enable row level security;
alter table public.program_claims        enable row level security;
alter table public.code_attempts         enable row level security;
alter table public.devices               enable row level security;
alter table public.admin_users           enable row level security;
alter table public.audit_logs            enable row level security;

-- Cấu hình, hạng: ai đã đăng nhập cũng đọc được (để hiển thị tiến độ, thể lệ). Chỉ admin sửa.
create policy rules_read  on public.loyalty_rule_versions for select to authenticated using (true);
create policy rules_write on public.loyalty_rule_versions for all    to authenticated using (is_admin('admin')) with check (is_admin('admin'));
create policy tiers_read  on public.tiers for select to authenticated using (true);
create policy tiers_write on public.tiers for all    to authenticated using (is_admin('admin')) with check (is_admin('admin'));
create policy settings_admin on public.settings for all to authenticated using (is_admin('admin')) with check (is_admin('admin'));

-- Khách: chỉ dòng của mình.
create policy members_self   on public.members      for select to authenticated using (id = auth.uid() or is_admin());
create policy members_update on public.members      for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy consents_self  on public.consents     for select to authenticated using (member_id = auth.uid() or is_admin());
create policy consents_add   on public.consents     for insert to authenticated with check (member_id = auth.uid());
create policy orders_self    on public.orders       for select to authenticated using (member_id = auth.uid() or is_admin());
create policy orders_admin   on public.orders       for all    to authenticated using (is_admin('editor')) with check (is_admin('editor'));
create policy ledger_self    on public.point_ledger for select to authenticated using (member_id = auth.uid() or is_admin());
-- point_ledger: KHÔNG có policy insert/update/delete → chỉ server (service_role) ghi được.
create policy offers_read    on public.offers       for select to authenticated using (
  public or is_admin() or exists (select 1 from member_offers mo where mo.offer_id = offers.id and mo.member_id = auth.uid()));
create policy offers_admin   on public.offers       for all    to authenticated using (is_admin('editor')) with check (is_admin('editor'));
create policy moffers_self   on public.member_offers for select to authenticated using (member_id = auth.uid() or is_admin());
create policy programs_admin on public.programs      for all    to authenticated using (is_admin('editor')) with check (is_admin('editor'));
create policy codes_admin    on public.program_codes for all    to authenticated using (is_admin('editor')) with check (is_admin('editor'));
create policy claims_self    on public.program_claims for select to authenticated using (member_id = auth.uid() or is_admin());
create policy devices_self   on public.devices       for all    to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy admins_read    on public.admin_users   for select to authenticated using (id = auth.uid() or is_admin('admin'));
create policy audit_admin    on public.audit_logs    for select to authenticated using (is_admin('admin'));

-- ───────────────────────── Quyền API (Data API) ─────────────────────────
-- Dự án tạo với "Grant API access to new tables automatically" TẮT, nên cấp quyền rõ ràng.
-- anon (chưa đăng nhập): không có quyền gì. authenticated: có quyền ở mức bảng, còn
-- được đọc/ghi dòng nào là do RLS ở trên quyết định. service_role: máy chủ, toàn quyền.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
revoke all on function public.is_admin(text) from public, anon;
grant execute on function public.is_admin(text) to authenticated, service_role;
