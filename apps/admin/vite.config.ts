import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Dùng chung logic tính điểm với app di động (apps/mobile/src/domain) và token thiết kế (design/).
export default defineConfig(({ mode }) => ({
  // Bản demo đăng lên link riêng tư → đường dẫn tương đối
  base: mode === 'demo' ? './' : '/',
  plugins: [react()],
  // Đọc .env ở gốc repo, chỉ lấy biến công khai (URL + khoá publishable Supabase, dùng chung với app).
  envDir: r('../..'),
  envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
  resolve: {
    alias: {
      '@': r('./src'),
      '@domain': r('../mobile/src/domain'),
      '@shared': r('../mobile/src/lib'),
      '@design': r('../../design'),
    },
  },
  server: { port: 5174, fs: { allow: [r('../..')] } },
}))
