'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

// Équipe d'un compte pro : collaborateurs (nom, e-mail, rôle), invitations
// en attente ; invitation et retrait pour le responsable ou l'admin.
// Utilisé dans Mon espace (pros) et Comptes pro (admin). Migration 029.

type Member = { user_id: string | null; display_name: string | null; email: string | null; team_role: string; active: boolean; pending: boolean }

const NAVY = '#062b59'
const input = { border: '1px solid #cfdce8', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', minWidth: 0, flex: '1 1 140px' } as const
const btn = { border: '1px solid #cddbe8', background: '#fff', color: '#174d80', borderRadius: 10, padding: '9px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer' } as const

export function TeamPanel({ client, accountId, canManage }: { client: SupabaseClient; accountId: string; canManage: boolean }) {
  const [members, setMembers] = useState<Member[]>([])
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await client.rpc('list_account_team', { p_account_id: accountId })
    if (error) { setMsg({ ok: false, text: error.message.includes('list_account_team') ? 'Fonction équipe indisponible (migration 029 à passer).' : error.message }); return }
    setMembers(((data || []) as Member[]).filter((m) => m.active || m.pending))
  }, [client, accountId])

  useEffect(() => { void load() }, [load])

  const invite = async () => {
    setBusy(true); setMsg(null)
    const { data: { session } } = await client.auth.getSession()
    const res = await fetch('/api/team/invite', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, accountId }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setMsg({ ok: false, text: data.error || 'Invitation impossible.' }); return }
    setMsg({ ok: true, text: `Invitation envoyée à ${form.email}.` })
    setForm({ firstName: '', lastName: '', email: '' })
    void load()
  }

  const remove = async (m: Member) => {
    if (!window.confirm(m.pending ? `Annuler l’invitation de ${m.email} ?` : `Retirer ${m.display_name || m.email} de l’équipe ? Il n’aura plus accès aux dossiers.`)) return
    const { error } = await client.rpc('remove_collaborator', { p_account_id: accountId, p_user_id: m.user_id, p_email: m.pending ? m.email : null })
    if (error) setMsg({ ok: false, text: error.message }); else void load()
  }

  const canSend = form.firstName.trim() && form.lastName.trim() && /^\S+@\S+\.\S+$/.test(form.email.trim())

  return (
    <div>
      <div style={{ display: 'grid', gap: 8 }}>
        {members.map((m, i) => (
          <div key={(m.user_id || m.email || '') + i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, background: '#fff', border: '1px solid #dbe7f2' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: NAVY, fontWeight: 700, fontSize: 14 }}>{m.display_name || m.email || 'Collaborateur'}</div>
              <div style={{ color: '#6f7d90', fontSize: 12, overflowWrap: 'anywhere' }}>{m.email}{m.team_role === 'owner' ? ' · Responsable' : ''}{m.pending ? ' · Invitation envoyée' : ''}</div>
            </div>
            {canManage && m.team_role !== 'owner' && <button type="button" style={btn} onClick={() => remove(m)}>{m.pending ? 'Annuler' : 'Retirer'}</button>}
          </div>
        ))}
      </div>
      {canManage && (
        <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: '#eef7fd', border: '1px solid #cfe7f6' }}>
          <b style={{ color: NAVY, fontSize: 14 }}>Ajouter un collaborateur</b>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <input style={input} placeholder="Prénom" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input style={input} placeholder="Nom" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <input style={{ ...input, flex: '2 1 220px' }} type="email" placeholder="E-mail professionnel" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <button type="button" disabled={!canSend || busy} onClick={invite} style={{ ...btn, background: canSend ? NAVY : '#9fb3c8', color: '#fff', borderColor: 'transparent' }}>{busy ? 'Envoi…' : 'Inviter'}</button>
          </div>
          <div style={{ fontSize: 12, color: '#6f7d90', marginTop: 8 }}>Il reçoit un lien par e-mail, crée son mot de passe et accède à tous les dossiers de l’agence, au tarif partenaire.</div>
        </div>
      )}
      {msg && <div style={{ marginTop: 10, fontSize: 13, color: msg.ok ? '#1f5c34' : '#a62d2d' }}>{msg.text}</div>}
    </div>
  )
}
