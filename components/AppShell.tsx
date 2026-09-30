'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TabBar, type TabKey } from '@/components/TabBar'

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
      <TabBar variant="admin" active={(['accueil','demandes','dossiers','devis','agenda'].includes(active) ? active : '') as TabKey} />
    </div>
  )
}
