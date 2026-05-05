import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/fitpacer/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'FitPacer 个人训练助手',
        short_name: 'FitPacer',
        description: '极简智能的个人训练助手',
        theme_color: '#4CAF50',
        background_color: '#121212',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/fitpacer/',
        start_url: '/fitpacer/',
        icons: [
          { src: '/fitpacer/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/fitpacer/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
})
