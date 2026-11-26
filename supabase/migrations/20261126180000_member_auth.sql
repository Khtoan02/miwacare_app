-- Đăng nhập khách bằng số điện thoại + OTP (docs/12, Q-06).
-- 1) Khách đăng nhập lần đầu → tự tạo dòng members (SĐT dạng 0xxxxxxxxx).
-- 2) Hook "Send SMS": Supabase gọi hàm này thay cho nhà cung cấp SMS (Twilio…).
--    Hiện chưa gửi OTP thật → trả lỗi cho mọi số không phải số test. Khi có Zalo ZNS
--    thì thay hàm này bằng Edge Function gửi ZNS, app không phải sửa.

-- ───────────────────────── Tạo hồ sơ khách ─────────────────────────
create or replace function public.handle_new_member()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- auth.users.phone lưu dạng E.164 không có dấu +, ví dụ 84912345678.
  if new.phone is not null and new.phone ~ '^84[35789][0-9]{8}$' then
    insert into public.members (id, phone)
    values (new.id, '0' || substr(new.phone, 3))
    on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.handle_new_member() from public, anon, authenticated;

create trigger on_auth_user_created_member
  after insert on auth.users
  for each row execute function public.handle_new_member();

-- ───────────────────────── Hook gửi SMS ─────────────────────────
create or replace function public.hook_send_sms(event jsonb)
returns jsonb language plpgsql as $$
begin
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 503,
    'message', 'Chưa bật gửi mã OTP thật. Trong giai đoạn thử nghiệm chỉ dùng số điện thoại test.'));
end;
$$;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_send_sms(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_send_sms(jsonb) from public, anon, authenticated;
