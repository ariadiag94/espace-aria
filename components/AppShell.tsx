'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TabBar, type TabKey } from '@/components/TabBar'
import { useInternalRole } from '@/lib/use-role'

export function AppShell({ children, active = 'accueil', adminOnly = false }: { children: React.ReactNode; active?: string; adminOnly?: boolean }) {
  const router = useRouter()
  const role = useInternalRole()
  // Pages réservées à l'admin (devis, tarifs, demandes, automatisations…) :
  // un compte staff voit un message à la place (la base refuse aussi les écritures).
  const blocked = adminOnly && role === 'staff'
  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <a href="/dashboard" style={{ display: 'block' }}><img src="/logo-aria-white-sm.png" alt="ARIA Diagnostics" style={{ height: 44, width: 'auto', display: 'block' }} /></a>
          <div className="brand-copy" style={{ borderLeft: '1px solid rgba(255,255,255,.3)', paddingLeft: 14 }}><strong>Espace ARIA</strong><span>Administration interne</span></div>
        </div>
        <div className="top-actions"><button onClick={logout}>Déconnexion</button></div>
      </header>
      {blocked ? <main className="page"><div className="card" style={{ padding: 22 }}><b style={{ color: 'var(--navy)' }}>Accès réservé à l’administrateur.</b><p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 14 }}>Cette rubrique (devis, tarifs, demandes, comptes pro) n’est pas ouverte à ton profil.</p></div></main> : children}
      <TabBar variant="admin" active={(['accueil','demandes','dossiers','devis','agenda'].includes(active) ? active : '') as TabKey} />
    </div>
  )
}
