import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Fail loudly instead of silently switching to 3001 (which the backend uses).
    strictPort: true,
    // During local development the API runs on the backend container/process.
    // In production this proxy is handled by Nginx inside the web container.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
