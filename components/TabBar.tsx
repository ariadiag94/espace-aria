'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchInternalRole } from '@/lib/use-role'

// Barre d'onglets façon application iPhone.
// - iPhone / mobile : barre fixe en bas, pleine largeur, zone « home » respectée.
// - PC / tablette : dock flottant centré en bas de l'écran.
// Deux jeux d'onglets : admin (ARIA) et pro (agences). Sur les pages
// partagées (DiagAssist, Guide), la variante est choisie selon le rôle.

type Variant = 'admin' | 'pro' | 'staff'
export type TabKey = 'accueil' | 'demandes' | 'dossiers' | 'devis' | 'agenda' | 'pro-dossiers' | 'pro-devis' | 'guide' | ''

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const ICONS: Record<string, React.ReactElement> = {
  home: <svg viewBox="0 0 24 24" {...P}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>,
  inbox: <svg viewBox="0 0 24 24" {...P}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" /></svg>,
  folder: <svg viewBox="0 0 24 24" {...P}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>,
  file: <svg viewBox="0 0 24 24" {...P}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></svg>,
  calendar: <svg viewBox="0 0 24 24" {...P}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>,
  book: <svg viewBox="0 0 24 24" {...P}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" /><path d="M4 19.5V21h16" /></svg>,
  phone: <svg viewBox="0 0 24 24" {...P}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>,
  plus: <svg viewBox="0 0 24 24" {...P} strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg>,
}

type Tab = { key: TabKey | 'call'; label: string; href: string; icon: string; big?: boolean; badge?: number }

export function TabBar({ variant, active }: { variant?: Variant; active: TabKey }) {
  const [resolved, setResolved] = useState<Variant | null>(variant === 'pro' ? 'pro' : null)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    let alive = true
    void (async () => {
      let v: Variant | undefined = variant
      if (!v || v === 'admin') {
        const role = await fetchInternalRole()
        v = role === 'admin' ? 'admin' : role === 'staff' ? 'staff' : variant === 'admin' ? 'admin' : 'pro'
        if (alive) setResolved(v)
      }
      if (v === 'admin') {
        const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).neq('status', 'converted')
        if (alive) setPending(count || 0)
      }
    })()
    return () => { alive = false }
  }, [variant])

  if (!resolved) return <div className="tabbar-spacer" />

  const tabs: Tab[] = resolved === 'admin'
    ? [
        { key: 'accueil', label: 'Accueil', href: '/dashboard', icon: 'home' },
        { key: 'demandes', label: 'Demandes', href: '/demandes', icon: 'inbox', badge: pending },
        { key: 'dossiers', label: 'Dossiers', href: '/dossiers', icon: 'folder' },
        { key: 'devis', label: 'Devis', href: '/devis', icon: 'file' },
        { key: 'agenda', label: 'Agenda', href: '/agenda', icon: 'calendar' },
      ]
    : resolved === 'staff'
    ? [
        { key: 'accueil', label: 'Accueil', href: '/dashboard', icon: 'home' },
        { key: 'dossiers', label: 'Dossiers', href: '/dossiers', icon: 'folder' },
        { key: 'agenda', label: 'Agenda', href: '/agenda', icon: 'calendar' },
        { key: 'guide', label: 'Guide', href: '/ressources', icon: 'book' },
      ]
    : [
        { key: 'pro-dossiers', label: 'Dossiers', href: '/mon-espace', icon: 'folder' },
        { key: 'pro-devis', label: 'Devis', href: '/assistant', icon: 'plus', big: true },
        { key: 'guide', label: 'Guide', href: '/ressources', icon: 'book' },
        { key: 'call', label: 'Appeler', href: 'tel:+33615703670', icon: 'phone' },
      ]

  return (
    <>
      <div className="tabbar-spacer" />
      <nav className="tabbar" aria-label="Navigation principale">
        {tabs.map((t) => {
          const on = t.key === active
          const inner = (
            <>
              <span className={t.big ? 'tab-icon tab-big' : 'tab-icon'}>
                {ICONS[t.icon]}
                {!!t.badge && <span className="tab-badge">{t.badge > 99 ? '99+' : t.badge}</span>}
              </span>
              <span className="tab-label">{t.label}</span>
            </>
          )
          return t.href.startsWith('tel:')
            ? <a key={t.key} href={t.href} className="tab">{inner}</a>
            : <Link key={t.key} href={t.href} className={on ? 'tab on' : 'tab'} aria-current={on ? 'page' : undefined}>{inner}</Link>
        })}
      </nav>
    </>
  )
}
