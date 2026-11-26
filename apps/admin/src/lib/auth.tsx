import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { can } from '@/data/api';
import { getSession as mockSession, login as mockLogin, logout as mockLogout, setDemoRole } from '@/data/api.mock';
import type { Role, Session } from '@/data/types';
import { IS_DEMO } from '@/lib/env';
import { supabase, USE_MOCK } from '@/lib/supabase';

interface AuthValue {
  session: Session | null;
  /** false khi đang kiểm tra phiên đăng nhập (bản thật). */
  ready: boolean;
  /** Lỗi khi đăng nhập được nhưng tài khoản không có quyền quản trị. */
  authError: string | null;
  /** Bản dữ liệu mẫu: đăng nhập giả với vai chọn sẵn. */
  login: (email: string, password: string, role: Role) => Promise<void>;
  /** Bản thật: gửi link đăng nhập qua email (không có mật khẩu). */
  sendLink: (email: string) => Promise<void>;
  logout: () => void;
  /** Vai hiện tại có đủ quyền `min` không. */
  allow: (min: Role) => boolean;
  /** Chỉ bản demo: đổi vai để xem quyền khác nhau. */
  switchRole: (role: Role) => void;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => (USE_MOCK ? (mockSession() ?? (IS_DEMO ? setDemoRole('admin') : null)) : null));
  const [ready, setReady] = useState(USE_MOCK);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;
    let alive = true;
    async function apply(user: { id: string; email?: string } | null) {
      if (!user) {
        if (alive) setSession(null);
      } else {
        const { data, error } = await sb.from('admin_users').select('role').eq('id', user.id).maybeSingle();
        if (!alive) return;
        if (error || !data) {
          setSession(null);
          setAuthError(error ? 'Không kiểm tra được quyền, thử lại sau' : 'Email này chưa được cấp quyền quản trị');
          await sb.auth.signOut();
        } else {
          setAuthError(null);
          setSession({ email: user.email ?? '', role: data.role as Role });
        }
      }
      if (alive) setReady(true);
    }
    sb.auth.getSession().then(({ data }) => apply(data.session?.user ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') void apply(s?.user ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthValue = {
    session,
    ready,
    authError,
    login: async (email, password, role) => setSession(await mockLogin(email, password, role)),
    sendLink: async (email) => {
      if (!supabase) throw new Error('Chưa cấu hình Supabase');
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false, emailRedirectTo: window.location.origin } });
      if (error) throw new Error(error.status === 429 ? 'Gửi quá nhiều lần, đợi một lúc rồi thử lại' : 'Không gửi được link. Kiểm tra email đã được cấp quyền chưa.');
    },
    logout: () => {
      if (IS_DEMO) return;
      if (supabase) void supabase.auth.signOut();
      else mockLogout();
      setSession(null);
    },
    allow: (min) => can(session?.role, min),
    switchRole: (role) => setSession(setDemoRole(role)),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth phải nằm trong AuthProvider');
  return v;
}
