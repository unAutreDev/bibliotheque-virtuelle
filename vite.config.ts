import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Chemins relatifs : l'app fonctionne aussi bien à la racine d'un domaine
// que dans un sous-dossier (GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Les fichiers de lecture de texte (plusieurs Mo) ne sont téléchargés qu'à la première
        // reconnaissance, puis gardés en cache pour les suivantes.
        globPatterns: ['**/*.{js,css,html,woff2}'],
        globIgnores: ['ocr/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/ocr/') || url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: { cacheName: 'reconnaissance', expiration: { maxEntries: 10 } },
          },
        ],
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Bibliothèque Virtuelle',
        short_name: 'Biblio',
        description: 'Suivi de mes lectures : livres, BD et mangas',
        lang: 'fr',
        theme_color: '#f6f7f4',
        background_color: '#f6f7f4',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
