import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'fonts/*.woff2'],
      manifest: {
        name: 'Life OS',
        short_name: 'Life OS',
        description: 'Tu sistema de vida personal',
        theme_color: '#F4F3EB',
        background_color: '#F4F3EB',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Agenda', url: '/agenda', icons: [{ src: 'icon-192.png', sizes: '192x192' }] },
          { name: 'Hábitos', url: '/habitos', icons: [{ src: 'icon-192.png', sizes: '192x192' }] },
          { name: 'Físico', url: '/fisico', icons: [{ src: 'icon-192.png', sizes: '192x192' }] },
          { name: 'Nutrición', url: '/nutricion', icons: [{ src: 'icon-192.png', sizes: '192x192' }] },
          { name: 'Finanzas', url: '/finanzas', icons: [{ src: 'icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
