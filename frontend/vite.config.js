import { defineConfig } from 'vite';

const backend = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
const proxy = {
  '/api': { target: backend, changeOrigin: false },
  '/sanctum': { target: backend, changeOrigin: false },
};

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    proxy,
  },
});
