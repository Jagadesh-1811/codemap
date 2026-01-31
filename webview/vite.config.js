import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Watch for changes in public folder (analysis-data.json)
    watch: {
      usePolling: true,
      interval: 500
    },
    // Disable caching for JSON files to always get fresh analysis data
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
    port: 5173,
    strictPort: true,
  },
  // Force full reload when public assets change
  publicDir: 'public',
})
