import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),],
  server: {
    watch: {
      usePolling: true
    },
    proxy: {
    '/graphql': {
      target: 'http://localhost:4000',
      changeOrigin: true,
    },
    '/sync': {
      target: 'ws://localhost:4000',
      ws: true, // very important
    }
  }
  }
})
