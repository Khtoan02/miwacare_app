// Kết nối Supabase của trang quản trị. Chỉ dùng URL + khoá publishable (công khai);
// quyền đọc do RLS quyết định, thao tác ghi đi qua Edge Function `admin`.
import { createClient } from '@supabase/supabase-js';

import { IS_DEMO } from './env';

const url = import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined;
const key = import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

/** Dùng dữ liệu mẫu khi: bản demo, chưa cấu hình Supabase, hoặc ép bằng VITE_DATA=mock. */
export const USE_MOCK = IS_DEMO || !url || !key || import.meta.env.VITE_DATA === 'mock';

export const supabase = USE_MOCK
  ? null
  : createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } });
// 'implicit': link đăng nhập trong email mở được ở trình duyệt khác với nơi bấm gửi (ví dụ mở email trên điện thoại).
