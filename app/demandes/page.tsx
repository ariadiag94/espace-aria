'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

// Demandes reçues depuis /assistant (table public.leads, lisible par le staff
// uniquement — policy leads_staff_all, migration 011). Un clic transforme une
// demande en dossier (+ fiche bien) pré-rempli, puis ouvre /devis sur ce
// dossier : plus aucune ressaisie.

type Lead = {
  id: string
  created_at: string
  created_by?: string | null
  contact_name: string
  contact_phone: string
  contact_email: string
  property_address: string | null
  property_type: string
  purpose: string
  estimated_price: number | null
  diagnostics_summary: Record<string, unknown> | null
  status: string
  floor?: string | null
  dependencies?: string[] | null
  payer_type?: string | null
  client_documents_sent_at?: string | null
}
type Account = { id: string; company_name: string | null; first_name: string | null; last_name: string | null }

const accountLabel = (a: Account) => a.company_name || [a.first_name, a.last_name].filter(Boolean).join(' ') || 'Compte sans nom'
const PURPOSE: Record<string, string> = { sale: 'Vente', rental: 'Location', alaCarte: 'À la carte' }
const TYPE: Record<string, string> = { apartment: 'Appartement', house: 'Maison' }
const ALACARTE: Record<string, string> = { dpe: 'DPE', erp: 'ERP', surface: 'Mesurage', plomb: 'Plomb / CREP', amiante: 'Amiante', elec: 'Électricité', gaz: 'Gaz', termites: 'Termites' }
const euro = (v: number | null) => (v == null ? 'Sur devis' : v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }))
const dateFr = (v: string) => new Date(v).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })

const labels = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((x) => (x && typeof x === 'object' ? String((x as Record<string, unknown>).label || '') : String(x || ''))).filter(Boolean)
    : []

function leadDiagnostics(lead: Lead): string[] {
  const s = lead.diagnostics_summary || {}
  const out: string[] = []
  const add = (l: string) => { if (l && !out.includes(l)) out.push(l) }
  if (lead.purpose === 'alaCarte') {
    if (Array.isArray(s.checkedItems)) s.checkedItems.forEach((id) => add(ALACARTE[String(id)] || String(id)))
  } else {
    labels(s.mandatory).forEach(add)
    labels(s.addedToConfirm).forEach(add)
    labels(s.addedOptions).forEach(add)
  }
  if (s.assainissement === true) add('Assainissement')
  return out
}

export default function DemandesPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountFor, setAccountFor] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all')

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const [l, a] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('client_accounts').select('id, company_name, first_name, last_name').eq('active', true),
      ])
      if (l.error) setError(l.error.message)
      const list = (l.data || []) as Lead[]
      setLeads(list)
      setAccounts([...(a.data || [])].sort((x, y) => accountLabel(x).localeCompare(accountLabel(y), 'fr')))
      // Compte pro de l'auteur de la demande, quand il est lisible.
      const authors = Array.from(new Set(list.map((x) => x.created_by).filter(Boolean))) as string[]
      if (authors.length) {
        const { data: members } = await supabase.from('account_memberships').select('user_id, account_id').in('user_id', authors)
        const byUser: Record<string, string> = {}
        ;(members || []).forEach((m: { user_id: string; account_id: string }) => { byUser[m.user_id] = m.account_id })
        const pre: Record<string, string> = {}
        list.forEach((x) => { if (x.created_by && byUser[x.created_by]) pre[x.id] = byUser[x.created_by] })
        setAccountFor(pre)
      }
      setLoading(false)
    })()
  }, [router])

  const convert = async (lead: Lead) => {
    setError('')
    const accountId = accountFor[lead.id]
    if (!accountId) { setError('Choisis le compte client rattaché à cette demande.'); return }
    setBusy(lead.id)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }

    // Fiche bien : mêmes colonnes que /dossiers/nouveau (schéma lu sur une ligne existante).
    const { data: sample } = await supabase.from('properties').select('*').limit(1).maybeSingle()
    const cols = new Set(Object.keys(sample || {}))
    const address = String(lead.property_address || '').trim()
    const pc = address.match(/(\d{5})\s+(.+)$/)
    const prop: Record<string, unknown> = { account_id: accountId }
    const put = (names: string[], v: unknown) => names.forEach((n) => { if (cols.has(n)) prop[n] = v })
    put(['address', 'property_address', 'full_address', 'address_line1', 'street_address'], address)
    if (pc) { put(['postal_code', 'zip_code', 'postcode'], pc[1]); put(['city', 'town'], pc[2].trim()) }
    put(['property_type', 'type'], lead.property_type)
    put(['name', 'title', 'property_name'], lead.contact_name)
    put(['created_by', 'user_id', 'owner_id'], session.user.id)
    const { data: property, error: pErr } = await supabase.from('properties').insert(prop).select('id').single()
    if (pErr || !property) { setError(pErr?.message || 'Impossible de créer la fiche du bien.'); setBusy(null); return }

    const s = lead.diagnostics_summary || {}
    const year = Number(s.constructionYear)
    const { data: dossier, error: dErr } = await supabase.from('dossiers').insert({
      account_id: accountId,
      property_id: property.id,
      dossier_name: lead.contact_name,
      status: 'draft',
      purpose: lead.purpose === 'sale' || lead.purpose === 'rental' ? lead.purpose : 'other',
      construction_year: Number.isFinite(year) && year > 1000 ? year : null,
      property_address: address || null,
      contact_name: lead.contact_name,
      contact_phone: lead.contact_phone,
      contact_email: lead.contact_email,
      floor: lead.floor || null,
      dependencies: Array.isArray(lead.dependencies) && lead.dependencies.length ? lead.dependencies.join(', ') : null,
      diagnostics: leadDiagnostics(lead).length ? leadDiagnostics(lead) : null,
    }).select('id').single()
    if (dErr || !dossier) {
      await supabase.from('properties').delete().eq('id', property.id)
      setError(dErr?.message || 'Impossible de créer le dossier.'); setBusy(null); return
    }
    await supabase.from('leads').update({ status: 'converted' }).eq('id', lead.id)
    router.push(`/devis?dossier=${dossier.id}`)
  }

  const todoCount = leads.filter((l) => l.status !== 'converted').length
  const doneCount = leads.length - todoCount
  const visible = leads.filter((l) => filter === 'all' || (filter === 'done') === (l.status === 'converted'))

  return (
    <AppShell active="demandes">
      <main className="page" style={{ maxWidth: 1080 }}>
        <Link href="/dashboard" className="back">← Accueil</Link>
        <div className="hero-row" style={{ marginTop: 14 }}>
          <div>
            <div className="eyebrow">DIAGASSIST</div>
            <h1>Demandes reçues</h1>
            <p>Demandes envoyées depuis l’assistant. Un clic crée le dossier pré-rempli et ouvre le devis.</p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([['all', `Toutes (${leads.length})`], ['todo', `À traiter (${todoCount})`], ['done', `Traitées (${doneCount})`]] as const).map(([k, label]) => (
              <button key={k} type="button" className={filter === k ? 'action-btn primary-action' : 'action-btn'} onClick={() => setFilter(k)}>{label}</button>
            ))}
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        {loading ? <p>Chargement…</p> : visible.length === 0 ? <section className="card" style={{ padding: 22 }}>Aucune demande dans cette liste.</section> : (
          <div style={{ display: 'grid', gap: 12 }}>
            {visible.map((lead) => {
              const diags = leadDiagnostics(lead)
              const s = lead.diagnostics_summary || {}
              const done = lead.status === 'converted'
              return (
                <section key={lead.id} className="card" style={{ padding: 18, opacity: done ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <b style={{ fontSize: 16 }}>{lead.contact_name}</b>
                      <div style={{ fontSize: 13, color: '#5f6b7a' }}>{lead.contact_phone} · {lead.contact_email}</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>{lead.property_address || 'Adresse non renseignée'}{lead.floor ? ` · étage ${lead.floor}` : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#5f6b7a' }}>{dateFr(lead.created_at)}</div>
                      <b style={{ fontSize: 18, color: '#062b59' }}>{euro(lead.estimated_price)}</b>
                      <div style={{ fontSize: 12 }}>{PURPOSE[lead.purpose] || lead.purpose} · {TYPE[lead.property_type] || lead.property_type}{typeof s.sizeLabel === 'string' ? ` · ${s.sizeLabel}` : ''}</div>
                      {lead.payer_type && <div style={{ fontSize: 12, color: '#23a5df' }}>Compte pro · règle : {lead.payer_type === 'pro' ? 'le pro' : 'le client final'}</div>}
                      {lead.client_documents_sent_at && <div style={{ fontSize: 12, color: '#1f5c34' }}>Devis estimatif envoyé automatiquement</div>}
                    </div>
                  </div>
                  {diags.length > 0 && <div style={{ fontSize: 13, marginTop: 10 }}><b>Diagnostics :</b> {diags.join(' · ')}</div>}
                  {!done && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                      <select value={accountFor[lead.id] || ''} onChange={(e) => setAccountFor((m) => ({ ...m, [lead.id]: e.target.value }))} style={{ minWidth: 260 }}>
                        <option value="">Compte client…</option>
                        {accounts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
                      </select>
                      <button className="action-btn primary-action" disabled={busy === lead.id} onClick={() => convert(lead)}>
                        {busy === lead.id ? 'Création…' : 'Créer le dossier et préparer le devis'}
                      </button>
                    </div>
                  )}
                  {done && <div style={{ fontSize: 13, marginTop: 10, color: '#1f5c34' }}>✓ Dossier créé</div>}
                </section>
              )
            })}
          </div>
        )}
      </main>
    </AppShell>
  )
}
