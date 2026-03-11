import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/GPS/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', '*.svg'],
      manifest: {
        name: 'NSINV Map',
        short_name: 'NSINV',
        description: 'Interactive geospatial mapping for environmental professionals',
        theme_color: '#2d7d46',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/GPS/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/server\.arcgisonline\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'esri-basemap-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /\/arcgis\/rest\/services\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'esri-rest', networkTimeoutSeconds: 10 },
          },
          {
            urlPattern: /^https:\/\/nswetlands-mapping\.s3\..*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'xyz-tiles',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/arcgis-proxy': {
        target: 'https://nsgiwa2.novascotia.ca',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/arcgis-proxy/, '/arcgis/rest/services'),
      },
    },
  },
  optimizeDeps: {
    include: ['maplibre-gl', 'geotiff'],
  },
});
