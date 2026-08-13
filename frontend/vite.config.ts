/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        /**
         * serverless-offline/Hapi drops Path on Set-Cookie. Browsers then default Path to the
         * request directory (/api/login → /api, /api/admin/login → /api/admin), so admin cookies
         * never reach /api/users. Force Path=/ for all proxied auth cookies.
         */
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            const setCookie = proxyRes.headers['set-cookie'];
            if (!setCookie) return;
            const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
            proxyRes.headers['set-cookie'] = cookies.map((cookie) => {
              if (/;\s*path=/i.test(cookie)) {
                return cookie.replace(/;\s*path=[^;]*/i, '; Path=/');
              }
              return `${cookie}; Path=/`;
            });
          });
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
