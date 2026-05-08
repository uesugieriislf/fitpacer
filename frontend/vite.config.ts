import { defineConfig } from 'vite-plus'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/fitpacer/',
  define: {
    // 禁用 Options API → 树摇掉 setup() 以外的 Vue 运行时代码
    __VUE_OPTIONS_API__: 'false',
  },
  plugins: [
    vue(),
    vueJsx(),
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
  ],
  test: {
    environment: 'jsdom',
    globals: true
  }
})
