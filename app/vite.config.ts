import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA: deixa o sistema instalável no celular e no PC
    VitePWA({
      registerType: 'autoUpdate',
      // O provador 3D é uma página à parte (public/provador3d), não a tela do sistema
      workbox: { navigateFallbackDenylist: [/^\/provador3d\//] },
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'brand/*.svg'],
      manifest: {
        name: "Art's Brindes — Gestão",
        short_name: "Art's Gestão",
        description: "Sistema de gestão da Art's Brindes",
        lang: 'pt-BR',
        theme_color: '#424242',
        background_color: '#424242',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
