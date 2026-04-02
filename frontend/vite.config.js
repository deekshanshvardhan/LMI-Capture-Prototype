import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'development' ? [basicSsl()] : [])],
  server: {
    port: 3000,
    host: true,
    ...(mode === 'development' ? { https: true } : {}),
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
}));
