import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Consume the workspace package's TS source directly so Vite compiles it
      // (avoids CJS named-import failures with the built dist in the dev server).
      // The Node API keeps using the built CJS dist via require().
      '@manga/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
})
