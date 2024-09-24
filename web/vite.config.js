import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer(),
    VitePWA({
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3,woff2}'],
        runtimeCaching: [
          {
            urlPattern: '*.mp3',
            handler: 'CacheFirst', // Or NetworkFirst, StaleWhileRevalidate,CacheOnly, CacheFirst
            options: {
              cacheName: 'media',
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 1 month
              },
              cacheableResponse: {
                statuses: [200, 206],
              },
              rangeRequests: true,
            },
          },
          {
            // Caching woff2 fonts
            urlPattern: '*.woff2',
            handler: 'CacheFirst', // You can also use StaleWhileRevalidate or another strategy
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 1 month
              },
              cacheableResponse: {
                statuses: [200, 206],
              },
            },
          },
          // Other caching rules can go here
        ],
      },
      injectRegister: 'auto',
      immediate: true,
      registerType: 'autoUpdate',
      manifest: {
        name: 'Happy Pregnancy',
        short_name: 'Pregency',
        description: 'Make your dreams come true',
        icons: [
          {
            src: './logo/happy-pregnancy-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: './logo/happy-pregnancy-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: './logo/happy-pregnancy-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        theme_color: '#0b7dc2',
      },
    }),
  ],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react-dom': 'preact/compat', // Must be below test-utils
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
});
