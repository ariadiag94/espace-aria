import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Espace ARIA',
  description: 'Application ARIA Diagnostics',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body>{children}</body></html>
}
