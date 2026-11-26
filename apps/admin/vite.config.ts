import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Dùng chung logic tính điểm với app di động (apps/mobile/src/domain) và token thiết kế (design/).
export default defineConfig(({ mode }) => ({
  // Bản demo đăng lên link riêng tư → đường dẫn tương đối
  base: mode === 'demo' ? './' : '/',
  plugins: [react()],
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
