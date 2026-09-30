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

// Icônes PWA générées depuis public/logo-aria-white.png (seul logo existant,
// wordmark rectangulaire) centré sur un fond navy carré — solution
// pragmatique en attendant un vrai symbole carré isolé, à remplacer si
// besoin (voir la génération dans l'historique de la PR "PWA installable").
export const viewport: Viewport = {
  themeColor: '#062b59',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body>{children}</body></html>
}
