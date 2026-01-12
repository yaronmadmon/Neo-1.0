import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
