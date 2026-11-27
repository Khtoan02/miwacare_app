import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

export type Role = 'writer' | 'editor' | 'admin';
export interface Session {
  id: string;
  email: string;
  role: Role;
}

interface AuthValue {
  session: Session | null;
  ready: boolean;
  authError: string | null;
  sendLink: (email: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function apply(user: { id: string; email?: string } | null) {
      if (!user) {
        if (alive) setSession(null);
      } else {
        const { data, error } = await supabase.from('admin_users').select('role').eq('id', user.id).maybeSingle();
        if (!alive) return;
        if (error || !data || !['writer', 'editor', 'admin'].includes(data.role)) {
          setSession(null);
          setAuthError(error ? 'Không kiểm tra được quyền, thử lại sau' : 'Email này chưa được cấp quyền quản lý bài viết');
          await supabase.auth.signOut();
        } else {
          setAuthError(null);
          setSession({ id: user.id, email: user.email ?? '', role: data.role as Role });
        }
      }
      if (alive) setReady(true);
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
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
    async sendLink(email) {
      setAuthError(null);
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: window.location.origin } });
      if (error) throw new Error('Không gửi được link. Kiểm tra lại email (chỉ email đã được cấp quyền mới đăng nhập được).');
    },
    logout() {
      void supabase.auth.signOut();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth phải nằm trong AuthProvider');
  return v;
}

export const roleLabel: Record<Role, string> = { writer: 'Người viết', editor: 'Biên tập', admin: 'Quản trị' };
