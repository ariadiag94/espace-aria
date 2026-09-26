import './globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Espace ARIA',
  description: 'Application ARIA Diagnostics',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/pwa/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

// Icône provisoire (lettre "A" stylisée) : à remplacer par un vrai symbole
// graphique ARIA dès qu'un logo carré haute résolution sera disponible
// (voir public/icons/pwa/icon.svg et icon-maskable.svg, sources des PNG).
export const viewport: Viewport = {
  themeColor: '#062b59',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body>{children}</body></html>
}
