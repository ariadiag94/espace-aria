'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export function AppShell({ children, active = 'accueil' }: { children: React.ReactNode; active?: string }) {
  const router = useRouter()
  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">ARIA</div>
          <div className="brand-copy"><strong>Espace ARIA</strong><span>Administration interne</span></div>
        </div>
        <div className="top-actions"><button onClick={logout}>Déconnexion</button></div>
      </header>
      {children}
      <nav className="mobile-nav">
        <Link className={active==='accueil'?'active':''} href="/dashboard">Accueil</Link>
        <Link className={active==='devis'?'active':''} href="/dashboard">Devis</Link>
        <Link className={active==='dossiers'?'active':''} href="/dossiers">Dossiers</Link>
        <Link className={active==='menu'?'active':''} href="/dashboard">Menu</Link>
      </nav>
    </div>
  )
}
