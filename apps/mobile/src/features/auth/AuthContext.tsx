import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

const KEY = 'miwacare.session';

// Chế độ dữ liệu mẫu: giữ token giả trong SecureStore (web: chỉ trong bộ nhớ).
const storage = {
  get: () => (Platform.OS === 'web' ? Promise.resolve(null) : SecureStore.getItemAsync(KEY)),
  set: (v: string) => (Platform.OS === 'web' ? Promise.resolve() : SecureStore.setItemAsync(KEY, v)),
  clear: () => (Platform.OS === 'web' ? Promise.resolve() : SecureStore.deleteItemAsync(KEY)),
};

interface AuthState {
  ready: boolean;
  token: string | null;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Chế độ Supabase: phiên do supabase-js quản lý (tự làm mới, lưu trong SecureStore).
    if (supabase) {
      supabase.auth
        .getSession()
        .then(({ data }) => setToken(data.session?.access_token ?? null))
        .catch(() => setToken(null))
        .finally(() => setReady(true));
      const { data } = supabase.auth.onAuthStateChange((_event, session) => setToken(session?.access_token ?? null));
      return () => data.subscription.unsubscribe();
    }
    storage
      .get()
      .then(setToken)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const value: AuthState = {
    ready,
    token,
    signIn: async (t) => {
      // Supabase đã lưu phiên khi xác thực OTP; chỉ cần cập nhật trạng thái.
      if (!supabase) await storage.set(t);
      setToken(t);
    },
    signOut: async () => {
      if (supabase) await supabase.auth.signOut().catch(() => undefined);
      else await storage.clear();
      queryClient.clear(); // không để dữ liệu của khách trước hiện cho khách sau
      setToken(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider');
  return ctx;
}
