'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import { ACCOUNT_TYPE_OPTIONS } from '@/lib/pro-signup'
import { PRO_DISCOUNT_RATE } from '@/lib/property-pricing'

// Codes partenaires : un code par agence, qu'elle transmet à ses clients.
// La remise va au client (jamais à l'agent) et le code indique quelle agence
// a recommandé ARIA. Le taux n'est visible qu'ici (équipe ARIA) : jamais sur
// le devis, qui affiche seulement « Tarif partenaire – code XXX ».

type Code = { id: string; code: string; label: string | null; discount_type: string; discount_value: number; active: boolean; account_id: string | null; created_at: string }
type Account = { id: string; company_name: string | null; first_name: string | null; last_name: string | null; account_type: string | null }
type QuoteRow = { promo_code: string | null; status: string; total_ttc: number | null }

const PRO_TYPES = new Set(ACCOUNT_TYPE_OPTIONS.map((o) => o.id))
const accountName = (a?: Account) => a ? (a.company_name || [a.first_name, a.last_name].filter(Boolean).join(' ') || 'Compte sans nom') : '—'
const euro = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const suggestCode = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 16) || 'PARTENAIRE'

export default function CodesPartenairesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [codes, setCodes] = useState<Code[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [quotes, setQuotes] = useState<QuoteRow[]>([])
  const [form, setForm] = useState({ account_id: '', code: '', percent: String(Math.round(PRO_DISCOUNT_RATE * 100)) })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const [c, a, q] = await Promise.all([
      supabase.from('promo_codes').select('id,code,label,discount_type,discount_value,active,account_id,created_at').order('created_at', { ascending: false }),
      supabase.from('client_accounts').select('id,company_name,first_name,last_name,account_type').eq('active', true),
      supabase.from('quotes').select('promo_code,status,total_ttc').not('promo_code', 'is', null),
    ])
    if (c.error) setError(c.error.message.includes('account_id') ? 'La mise à jour de la base (migration 031) n’est pas encore appliquée.' : c.error.message)
    setCodes((c.data || []) as Code[])
    setAccounts(((a.data || []) as Account[]).filter((x) => PRO_TYPES.has(String(x.account_type || ''))).sort((x, y) => accountName(x).localeCompare(accountName(y), 'fr')))
    setQuotes((q.data || []) as QuoteRow[])
    setLoading(false)
  }, [router])
  useEffect(() => { void load() }, [load])

  const byId = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts])
  const stats = (code: string) => {
    const rows = quotes.filter((q) => (q.promo_code || '').toUpperCase() === code.toUpperCase())
    const accepted = rows.filter((q) => q.status === 'accepted')
    return { total: rows.length, accepted: accepted.length, ca: accepted.reduce((s, q) => s + Number(q.total_ttc || 0), 0) }
  }

  const pickAccount = (id: string) => setForm((f) => ({ ...f, account_id: id, code: f.code || suggestCode(accountName(byId[id])) }))

  const create = async () => {
    setError('')
    const code = suggestCode(form.code)
    const percent = Number(form.percent.replace(',', '.'))
    if (!form.account_id) return setError('Choisis l’agence partenaire.')
    if (!code) return setError('Indique un code.')
    if (!(percent > 0 && percent <= 30)) return setError('Remise entre 1 et 30 %.')
    if (codes.some((c) => c.code.toUpperCase() === code)) return setError('Ce code existe déjà.')
    setBusy(true)
    const { error: e } = await supabase.from('promo_codes').insert({ code, label: `Tarif partenaire – ${accountName(byId[form.account_id])}`, discount_type: 'percent', discount_value: percent, active: true, account_id: form.account_id })
    setBusy(false)
    if (e) return setError(e.message)
    setForm({ account_id: '', code: '', percent: String(Math.round(PRO_DISCOUNT_RATE * 100)) })
    void load()
  }

  const toggle = async (c: Code) => {
    const { error: e } = await supabase.from('promo_codes').update({ active: !c.active }).eq('id', c.id)
    if (e) setError(e.message); else void load()
  }

  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(''), 1500) } catch { /* ignore */ }
  }

  if (loading) return <AppShell active="accueil" adminOnly><div className="loading">Chargement…</div></AppShell>

  return (
    <AppShell active="accueil" adminOnly>
      <main className="page" style={{ maxWidth: 980 }}>
        <Link href="/dashboard" className="back">← Accueil</Link>
        <div className="hero-row" style={{ marginTop: 12 }}>
          <div><div className="eyebrow">PARTENAIRES</div><h1>Codes partenaires</h1><p>Un code par agence, qu’elle donne à ses clients. La remise va au client ; le taux n’apparaît jamais sur le devis.</p></div>
        </div>
        {error && <div className="error">{error}</div>}

        <section className="card" style={{ padding: 20, marginBottom: 18 }}>
          <h2 style={{ margin: '0 0 12px', color: '#062b59', fontSize: 18 }}>Nouveau code</h2>
          <div className="edit-grid">
            <label className="edit-field wide"><span>Agence partenaire</span>
              <select value={form.account_id} onChange={(e) => pickAccount(e.target.value)}>
                <option value="">{accounts.length ? 'Choisir une agence…' : 'Aucun compte pro pour l’instant'}</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{accountName(a)}</option>)}
              </select>
            </label>
            <label className="edit-field"><span>Code</span><input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="Ex. LAFORET-MA" /></label>
            <label className="edit-field"><span>Remise client (%)</span><input inputMode="decimal" value={form.percent} onChange={(e) => setForm((f) => ({ ...f, percent: e.target.value }))} /></label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><button className="action-btn primary-action" disabled={busy} onClick={create}>{busy ? 'Création…' : 'Créer le code'}</button></div>
        </section>

        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {codes.length === 0 ? <div style={{ padding: 20, color: '#6f7d90' }}>Aucun code pour l’instant.</div> : codes.map((c) => {
            const s = stats(c.code)
            return (
              <div key={c.id} style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', padding: '14px 18px', borderTop: '1px solid #edf2f7', opacity: c.active ? 1 : 0.55 }}>
                <div style={{ minWidth: 180, flex: '1 1 200px' }}>
                  <button onClick={() => copy(c.code)} title="Copier" style={{ border: '1px dashed #23A5DF', background: '#EAF5FC', color: '#062b59', fontWeight: 900, letterSpacing: '.04em', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 14 }}>{copied === c.code ? 'Copié ✓' : c.code}</button>
                  <div style={{ fontSize: 13, color: '#52657a', marginTop: 6 }}>{c.account_id ? accountName(byId[c.account_id]) : (c.label || 'Code générique')} · {c.discount_type === 'percent' ? `${Number(c.discount_value)} %` : euro(Number(c.discount_value))}</div>
                </div>
                <div style={{ display: 'flex', gap: 18, fontSize: 13, color: '#52657a' }}>
                  <div><b style={{ display: 'block', fontSize: 18, color: '#062b59' }}>{s.total}</b>devis</div>
                  <div><b style={{ display: 'block', fontSize: 18, color: '#062b59' }}>{s.accepted}</b>acceptés</div>
                  <div><b style={{ display: 'block', fontSize: 18, color: '#062b59' }}>{euro(s.ca)}</b>CA apporté</div>
                </div>
                <button className="ghost-btn" onClick={() => toggle(c)}>{c.active ? 'Désactiver' : 'Réactiver'}</button>
              </div>
            )
          })}
        </section>
      </main>
    </AppShell>
  )
}
