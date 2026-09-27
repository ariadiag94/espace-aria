'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import { ACCOUNT_TYPE_OPTIONS } from '@/lib/pro-signup'

type ClientAccountRow = {
  id: string
  company_name: string | null
  account_type: string | null
  siret: string | null
  justificatif: string | null
  email: string | null
  phone: string | null
  first_name: string | null
  last_name: string | null
  submitted_at: string | null
  validation_status: string
  validated_at: string | null
}

const accountTypeLabel = (value: string | null) => ACCOUNT_TYPE_OPTIONS.find((option) => option.id === value)?.label || value || '—'

const dateFr = (value: string | null) => (value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

const STATUS_LABEL: Record<string, string> = { pending: 'En attente', validated: 'Validé', rejected: 'Refusé' }

export default function AdminComptesProPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [pending, setPending] = useState<ClientAccountRow[]>([])
  const [processed, setProcessed] = useState<ClientAccountRow[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<Record<string, string>>({})

  const columns = 'id,company_name,account_type,siret,justificatif,email,phone,first_name,last_name,submitted_at,validation_status,validated_at'

  const load = async () => {
    const [pendingRes, processedRes] = await Promise.all([
      supabase.from('client_accounts').select(columns).eq('validation_status', 'pending').order('submitted_at', { ascending: true }),
      supabase.from('client_accounts').select(columns).in('validation_status', ['validated', 'rejected']).order('validated_at', { ascending: false }),
    ])
    setPending((pendingRes.data || []) as ClientAccountRow[])
    setProcessed((processedRes.data || []) as ClientAccountRow[])
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      // Distinct de is_internal() (qui couvre tout le staff ARIA au sens
      // large) : cette page est réservée au rôle admin strictement, vérifié
      // via profiles.role côté base (is_admin(), security definer — voir
      // supabase/migrations/019_client_accounts_admin_validation.sql), jamais
      // supposé côté client.
      const { data: isAdmin } = await supabase.rpc('is_admin')
      if (!isAdmin) {
        setAuthorized(false)
        setLoading(false)
        return
      }

      setAuthorized(true)
      await load()
      setLoading(false)
    })()
  }, [router])

  const decide = async (row: ClientAccountRow, decision: 'validated' | 'rejected') => {
    setProcessingId(row.id)
    setRowError((prev) => ({ ...prev, [row.id]: '' }))

    const { data: { session } } = await supabase.auth.getSession()
    const adminId = session?.user.id
    const { error } = await supabase.from('client_accounts').update({
      validation_status: decision,
      validated_at: new Date().toISOString(),
      validated_by: adminId,
    }).eq('id', row.id)

    if (error) {
      setRowError((prev) => ({ ...prev, [row.id]: error.message }))
      setProcessingId(null)
      return
    }

    if (row.email) {
      fetch('/api/pro-signup/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: row.email, company_name: row.company_name, decision }),
      }).catch(() => {})
    }

    await load()
    setProcessingId(null)
  }

  if (loading) return <AppShell active="admin"><div className="loading">Chargement…</div></AppShell>

  if (authorized === false) {
    return (
      <AppShell active="admin">
        <main className="page">
          <p>Accès réservé aux administrateurs.</p>
        </main>
      </AppShell>
    )
  }

  return (
    <AppShell active="admin">
      <main className="page">
        <div className="hero-row">
          <div>
            <h1>Comptes professionnels</h1>
            <p>Validation des inscriptions pro en attente.</p>
          </div>
        </div>

        <div className="section">
          <div className="section-title"><h2>En attente ({pending.length})</h2></div>
          {pending.length === 0 && <div className="empty-state">Aucune demande en attente.</div>}
          {pending.map((row) => (
            <div className="card" key={row.id} style={{ padding: 18, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <b style={{ color: 'var(--navy)', fontSize: 16 }}>{row.company_name || '—'}</b>
                  <div className="subline">{accountTypeLabel(row.account_type)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="action-btn primary-action" disabled={processingId === row.id} onClick={() => decide(row, 'validated')}>Valider</button>
                  <button className="action-btn" disabled={processingId === row.id} onClick={() => decide(row, 'rejected')}>Refuser</button>
                </div>
              </div>
              <div className="kv"><span>Contact</span><span>{row.first_name} {row.last_name}</span></div>
              <div className="kv"><span>Email</span><span>{row.email || '—'}</span></div>
              <div className="kv"><span>Téléphone</span><span>{row.phone || '—'}</span></div>
              <div className="kv"><span>SIRET</span><span>{row.siret || '—'}</span></div>
              <div className="kv"><span>Justificatif</span><span>{row.justificatif || '—'}</span></div>
              <div className="kv"><span>Soumis le</span><span>{dateFr(row.submitted_at)}</span></div>
              {rowError[row.id] && <div className="error" style={{ marginTop: 10 }}>{rowError[row.id]}</div>}
            </div>
          ))}
        </div>

        <div className="section">
          <div className="section-title"><h2>Historique</h2></div>
          {processed.length === 0 && <div className="empty-state">Aucun compte traité pour l’instant.</div>}
          {processed.length > 0 && (
            <div className="card table-card">
              <div className="table-head"><div>Société</div><div>Type</div><div>Statut</div><div>Traité le</div></div>
              {processed.map((row) => (
                <div className="table-row" key={row.id}>
                  <div><b>{row.company_name || '—'}</b><div className="subline">{row.email}</div></div>
                  <div>{accountTypeLabel(row.account_type)}</div>
                  <div><span className="status">{STATUS_LABEL[row.validation_status] || row.validation_status}</span></div>
                  <div>{dateFr(row.validated_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  )
}
