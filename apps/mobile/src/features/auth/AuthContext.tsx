import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

const KEY = 'miwacare.session';

// SecureStore không có trên web: khi chạy web chỉ giữ phiên trong bộ nhớ.
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
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
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
      await storage.set(t);
      setToken(t);
    },
    signOut: async () => {
      await storage.clear();
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
