// Kết nối Supabase của trang quản lý blog. Chỉ dùng URL + khoá publishable (công khai);
// quyền do RLS quyết định (vai writer / editor / admin), gửi thông báo đi qua Edge Function `cms`.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined;
const key = import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
if (!url || !key) throw new Error('Thiếu EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY');

// 'implicit': link đăng nhập trong email mở được ở trình duyệt khác với nơi bấm gửi.
export const supabase = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } });

/** Địa chỉ trang blog công khai (để xem bài và lấy link chia sẻ). */
export const BLOG_URL = ((import.meta.env.VITE_BLOG_URL as string | undefined) ?? 'https://miwacare-blog.pages.dev').replace(/\/$/, '');

export const IMAGE_BUCKET = 'post-images';
