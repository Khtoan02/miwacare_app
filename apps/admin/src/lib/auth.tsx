import { createContext, useContext, useState, type ReactNode } from 'react';

import { can, getSession, login as apiLogin, logout as apiLogout, setDemoRole } from '@/data/api';
import { IS_DEMO } from '@/lib/env';
import type { Role, Session } from '@/data/types';

interface AuthValue {
  session: Session | null;
  login: (email: string, password: string, role: Role) => Promise<void>;
  logout: () => void;
  /** Vai hiện tại có đủ quyền `min` không. */
  allow: (min: Role) => boolean;
  /** Chỉ bản demo: đổi vai để xem quyền khác nhau. */
  switchRole: (role: Role) => void;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => getSession() ?? (IS_DEMO ? setDemoRole('admin') : null));
  const value: AuthValue = {
    session,
    login: async (email, password, role) => setSession(await apiLogin(email, password, role)),
    logout: () => {
      if (IS_DEMO) return;
      apiLogout();
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
