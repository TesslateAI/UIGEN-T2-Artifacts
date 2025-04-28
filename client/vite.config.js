// client/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy /api requests to our backend server
      '/api': {
        target: 'http://localhost:3001', // Your backend server URL
        changeOrigin: true, // Recommended for virtual hosted sites
        secure: false, // Allow self-signed certs if backend uses HTTPS locally (not typical)
        // Optional: rewrite path if needed, but usually not for /api prefix
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})