-- Trang quản trị nối Supabase.
-- 1) View thành viên kèm số liệu từ sổ điểm, dùng cho danh sách / tổng quan.
-- 2) Cấu hình điểm chứa luôn danh sách hạng (mỗi phiên bản có hạng riêng, như kiểu LoyaltyRuleVersion trong apps/mobile/src/domain).
-- Mọi thao tác ghi có ảnh hưởng điểm chạy qua Edge Function `admin` (service_role), không ghi thẳng từ trình duyệt.

-- Điểm xét hạng = điểm được cộng (không tính điều chỉnh tay); đơn bị huỷ thì trừ lại (dòng adjust gắn order_id).
create view public.v_admin_members with (security_invoker = true) as
select
  m.id,
  m.phone,
  m.full_name,
  m.birthday,
  m.created_at,
  coalesce(l.points, 0)           as points,
  coalesce(l.lifetime_points, 0)  as lifetime_points,
  coalesce(o.order_count, 0)      as order_count,
  o.last_order_at,
  coalesce(c.granted, false)      as marketing
from public.members m
left join lateral (
  select sum(delta)::int as points,
         (coalesce(sum(delta) filter (where delta > 0 and reason <> 'adjust'), 0)
          + coalesce(sum(delta) filter (where reason = 'adjust' and order_id is not null), 0))::int as lifetime_points
  from public.point_ledger where member_id = m.id
) l on true
left join lateral (
  select count(*)::int as order_count, max(ordered_at) as last_order_at
  from public.orders where member_id = m.id and status <> 'cancelled'
) o on true
left join lateral (
  select granted from public.consents
  where member_id = m.id and purpose = 'marketing'
  order by created_at desc limit 1
) c on true
where m.deleted_at is null;

grant select on public.v_admin_members to authenticated, service_role;
grant select on public.v_member_balance to authenticated, service_role;

-- Gắn danh sách hạng hiện có vào các phiên bản cấu hình chưa có.
update public.loyalty_rule_versions v
set config = v.config || jsonb_build_object('tiers', (
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'minPoints', t.min_points, 'colorKey', t.color_key) order by t.sort), '[]'::jsonb)
  from public.tiers t))
where not (v.config ? 'tiers');
