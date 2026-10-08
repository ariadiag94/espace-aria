'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

// Suivi des devis : tous les devis par statut (brouillons, envoyés en attente
// de réponse, acceptés, refusés), avec date d'envoi et relances automatiques.
type Quote = { id: string; quote_number: string; status: string; total_ttc: number | null; created_at: string; accepted_at: string | null; dossier_id: string }
type Dossier = { id: string; dossier_name: string | null; contact_name: string | null; property_address: string | null }
type SendEvent = { quote_id: string; sent_at: string; recipient: string }
type Relance = { target_id: string | null; kind: string; created_at: string }

const TABS = [
  { id: 'sent', label: 'Envoyés', hint: 'En attente de réponse', match: (s: string) => s === 'sent' || s === 'viewed' || s === 'change_requested' },
  { id: 'draft', label: 'Brouillons', hint: 'Pas encore envoyés', match: (s: string) => s === 'draft' },
  { id: 'accepted', label: 'Acceptés', hint: 'Mission confirmée', match: (s: string) => s === 'accepted' },
  { id: 'refused', label: 'Refusés / expirés', hint: 'Sans suite', match: (s: string) => s === 'refused' || s === 'expired' },
] as const

const euro = (n: number | null) => Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
const dateFr = (v?: string | null) => v ? new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'
const daysSince = (v?: string | null) => v ? Math.floor((Date.now() - new Date(v).getTime()) / 86400000) : null

export default function SuiviDevisPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('sent')
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [dossiers, setDossiers] = useState<Record<string, Dossier>>({})
  const [sends, setSends] = useState<Record<string, SendEvent>>({})
  const [relances, setRelances] = useState<Record<string, number>>({})

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const [q, d, e, r] = await Promise.all([
        supabase.from('quotes').select('id,quote_number,status,total_ttc,created_at,accepted_at,dossier_id').neq('status', 'superseded').order('created_at', { ascending: false }).limit(300),
        supabase.from('dossiers').select('id,dossier_name,contact_name,property_address'),
        supabase.from('quote_email_events').select('quote_id,sent_at,recipient').order('sent_at', { ascending: true }),
        supabase.from('automation_log').select('target_id,kind,created_at').ilike('kind', '%quote%'),
      ])
      setQuotes((q.data || []) as Quote[])
      setDossiers(Object.fromEntries(((d.data || []) as Dossier[]).map((x) => [x.id, x])))
      const s: Record<string, SendEvent> = {}
      for (const ev of (e.data || []) as SendEvent[]) s[ev.quote_id] = ev // garde le dernier envoi
      setSends(s)
      const rc: Record<string, number> = {}
      for (const x of (r.data || []) as Relance[]) if (x.target_id) rc[x.target_id] = (rc[x.target_id] || 0) + 1
      setRelances(rc)
      setLoading(false)
    })()
  }, [router])

  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.id, quotes.filter((q) => t.match(q.status))])), [quotes])
  const current = TABS.find((t) => t.id === tab)!
  const rows = (counts[tab] || []) as Quote[]
  const total = rows.reduce((s, q) => s + Number(q.total_ttc || 0), 0)

  if (loading) return <AppShell active="devis" adminOnly><div className="loading">Chargement…</div></AppShell>

  return (
    <AppShell active="devis" adminOnly>
      <main className="page" style={{ maxWidth: 1000 }}>
        <Link href="/devis" className="back">← Devis Express</Link>
        <div className="hero-row" style={{ marginTop: 12 }}>
          <div><div className="eyebrow">DEVIS</div><h1>Suivi des devis</h1><p>Où en est chaque devis : envoyé, en attente, accepté ou refusé.</p></div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ border: '1px solid ' + (tab === t.id ? '#0a5fae' : '#cddbe8'), background: tab === t.id ? '#0a5fae' : '#fff', color: tab === t.id ? '#fff' : '#174d80', borderRadius: 999, padding: '9px 14px', fontWeight: 800, cursor: 'pointer' }}>
              {t.label} <span style={{ opacity: 0.8 }}>({(counts[t.id] || []).length})</span>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 13, color: '#52657a', marginBottom: 10 }}>{current.hint} · {rows.length} devis · {euro(total)} TTC</div>
        <div className="card" style={{ overflow: 'hidden' }}>
          {rows.length === 0 ? <div style={{ padding: 20, color: '#6f7d90' }}>Aucun devis ici.</div> : rows.map((q) => {
            const d = dossiers[q.dossier_id]
            const sent = sends[q.id]
            const wait = daysSince(sent?.sent_at)
            const nbRelances = relances[q.id] || 0
            return (
              <Link key={q.id} href={`/devis/${q.id}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 12, padding: '14px 16px', borderTop: '1px solid #edf2f7', textDecoration: 'none', color: 'inherit', background: '#fff' }}>
                <div style={{ minWidth: 0 }}>
                  <b style={{ color: '#062b59' }}>{d?.dossier_name || 'Dossier'}</b>
                  <div style={{ fontSize: 12.5, color: '#52657a', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.quote_number}{d?.property_address ? ` · ${d.property_address}` : ''}</div>
                  <div style={{ fontSize: 12.5, color: '#52657a', marginTop: 3 }}>
                    {q.status === 'draft' ? `Créé le ${dateFr(q.created_at)}` : sent ? `Envoyé le ${dateFr(sent.sent_at)} à ${sent.recipient}` : 'Envoyé (date non enregistrée)'}
                    {q.status === 'accepted' && q.accepted_at ? ` · accepté le ${dateFr(q.accepted_at)}` : ''}
                  </div>
                  {current.id === 'sent' && (wait !== null || nbRelances > 0) && (
                    <div style={{ fontSize: 12, marginTop: 4, color: wait !== null && wait >= 7 ? '#a45121' : '#0b65b5', fontWeight: 700 }}>
                      {wait !== null ? `En attente depuis ${wait} jour${wait > 1 ? 's' : ''}` : ''}{nbRelances ? ` · ${nbRelances} relance${nbRelances > 1 ? 's' : ''} envoyée${nbRelances > 1 ? 's' : ''}` : ''}
                    </div>
                  )}
                </div>
                <b style={{ color: '#062b59', whiteSpace: 'nowrap', alignSelf: 'center' }}>{euro(q.total_ttc)}</b>
              </Link>
            )
          })}
        </div>
      </main>
    </AppShell>
  )
}
