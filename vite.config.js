import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages는 https://<계정>.github.io/lotto-weight/ 아래에서 서빙되므로
// 빌드할 때만 base 경로를 붙인다. 로컬 개발은 그대로 루트.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/lotto-weight/' : '/',
  plugins: [react(), tailwindcss()],
  server: { port: 5180, strictPort: false },
}))
