// Client Supabase cho app khách. Chỉ dùng khoá publishable (công khai); RLS quyết định khách đọc được gì.
// Bật bằng EXPO_PUBLIC_DATA_SOURCE=supabase trong apps/mobile/.env (xem README).
import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const DATA_SOURCE: 'mock' | 'supabase' = process.env.EXPO_PUBLIC_DATA_SOURCE === 'supabase' && url && key ? 'supabase' : 'mock';

// SecureStore giới hạn ~2 KB mỗi mục, phiên Supabase lớn hơn → chia thành nhiều mảnh.
const CHUNK = 1800;
const safeKey = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, '_');

const secureStorage = {
  async getItem(k: string) {
    const n = Number(await SecureStore.getItemAsync(`${safeKey(k)}.n`));
    if (!n) return null;
    const parts = await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(`${safeKey(k)}.${i}`)));
    return parts.some((p) => p == null) ? null : parts.join('');
  },
  async setItem(k: string, value: string) {
    await secureStorage.removeItem(k);
    const n = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < n; i++) await SecureStore.setItemAsync(`${safeKey(k)}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    await SecureStore.setItemAsync(`${safeKey(k)}.n`, String(n));
  },
  async removeItem(k: string) {
    const n = Number(await SecureStore.getItemAsync(`${safeKey(k)}.n`));
    await SecureStore.deleteItemAsync(`${safeKey(k)}.n`);
    for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${safeKey(k)}.${i}`);
  },
};

// Bản web (chạy thử trên trình duyệt) không có SecureStore → dùng localStorage mặc định của supabase-js.
export const supabase: SupabaseClient | null =
  DATA_SOURCE === 'supabase'
    ? createClient(url!, key!, {
        auth: {
          storage: Platform.OS === 'web' ? undefined : secureStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

// Chỉ làm mới token khi app đang mở (khuyến nghị của Supabase cho React Native).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** "0912345678" → "+84912345678" (định dạng Supabase Auth dùng). */
export const toE164 = (phone: string) => `+84${phone.replace(/\D/g, '').replace(/^0/, '')}`;
