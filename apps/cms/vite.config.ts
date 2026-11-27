import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Trang quản lý blog: dự án riêng (Cloudflare Pages `miwacare-cms`), dùng chung token thiết kế ở design/.
export default defineConfig({
  plugins: [react()],
  tsconfig: './tsconfig.app.json',
  // Đọc .env ở gốc repo, chỉ lấy biến công khai (URL + khoá publishable Supabase).
  envDir: r('../..'),
  envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
  resolve: { alias: { '@': r('./src'), '@design': r('../../design') } },
  server: { port: 5175, fs: { allow: [r('../..')] } },
})
