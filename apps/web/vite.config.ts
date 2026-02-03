import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0', // Bind to all interfaces for IDE embedded browser compatibility
    port: 5173,
    strictPort: false, // Allow port fallback if 5173 is busy
    hmr: {
      host: 'localhost', // HMR host
    },
    // Allow access from IDE embedded browsers
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // Don't rewrite - keep /api prefix as backend expects it
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/billing': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/apps': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
