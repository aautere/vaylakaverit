import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Väyläkaverit',
        short_name: 'Väyläkaverit',
        description: 'Yhteiset golfpelit kierrokselle.',
        lang: 'fi',
        theme_color: '#073b2d',
        background_color: '#f7f8f4',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:7071',
    },
  },
});
