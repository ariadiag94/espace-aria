'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

// Équipe interne ARIA (migration 030) : l'admin invite une assistante ou un
// stagiaire (profil « staff » : dossiers, agenda, documents, guide ; ni devis,
// ni tarifs, ni demandes, ni comptes pro, ni automatisations) et peut retirer
// l'accès à tout moment.

type Member = { user_id: string | null; name: string | null; email: string | null; role: string; pending: boolean }
const input = { border: '1px solid #cfdce8', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', minWidth: 0, flex: '1 1 140px' } as const

export default function EquipePage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('list_internal_team')
    if (error) setMsg({ ok: false, text: error.message })
    setMembers((data || []) as Member[])
  }, [])

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      await load()
    })()
  }, [router, load])

  const invite = async () => {
    setBusy(true); setMsg(null)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/team/invite', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, kind: 'staff' }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setMsg({ ok: false, text: data.error || 'Invitation impossible.' }); return }
    setMsg({ ok: true, text: `Invitation envoyée à ${form.email}.` }); setForm({ firstName: '', lastName: '', email: '' }); void load()
  }

  const remove = async (m: Member) => {
    if (!window.confirm(m.pending ? `Annuler l’invitation de ${m.email} ?` : `Retirer l’accès de ${m.name || m.email} ?`)) return
    const { error } = await supabase.rpc('remove_staff', { p_user_id: m.user_id, p_email: m.pending ? m.email : null })
    if (error) setMsg({ ok: false, text: error.message }); else void load()
  }

  const canSend = form.firstName.trim() && form.lastName.trim() && /^\S+@\S+\.\S+$/.test(form.email.trim())

  return (
    <AppShell active="accueil" adminOnly>
      <main className="page" style={{ maxWidth: 880 }}>
        <Link href="/dashboard" className="back">← Accueil</Link>
        <div className="hero-row" style={{ marginTop: 14 }}>
          <div>
            <div className="eyebrow">ÉQUIPE ARIA</div>
            <h1>Accès de l’équipe</h1>
            <p>Assistante, stagiaire : accès aux dossiers, à l’agenda, aux documents et au guide. Pas de devis, de tarifs, de demandes, de comptes pro ni d’automatisations.</p>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {members.map((m, i) => (
            <div key={(m.user_id || m.email || '') + i} className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <b style={{ color: 'var(--navy)' }}>{m.name || m.email}</b>
                <div className="subline">{m.email} · {m.role === 'admin' ? 'Administrateur' : m.pending ? 'Invitation envoyée' : 'Assistante / stagiaire'}</div>
              </div>
              {m.role !== 'admin' && <button className="ghost-btn" onClick={() => remove(m)}>{m.pending ? 'Annuler' : 'Retirer l’accès'}</button>}
            </div>
          ))}
        </div>
        <section className="card" style={{ padding: 16, marginTop: 16, background: '#eef7fd' }}>
          <b style={{ color: 'var(--navy)' }}>Donner un accès</b>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <input style={input} placeholder="Prénom" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input style={input} placeholder="Nom" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <input style={{ ...input, flex: '2 1 220px' }} type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <button className="action-btn primary-action" disabled={!canSend || busy} onClick={invite}>{busy ? 'Envoi…' : 'Inviter'}</button>
          </div>
          <div className="subline" style={{ marginTop: 8 }}>La personne reçoit un lien par e-mail et crée son mot de passe.</div>
        </section>
        {msg && <div style={{ marginTop: 10, fontSize: 13, color: msg.ok ? '#1f5c34' : '#a62d2d' }}>{msg.text}</div>}
      </main>
    </AppShell>
  )
}
