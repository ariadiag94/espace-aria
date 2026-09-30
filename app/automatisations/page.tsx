'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import type { AutomationItem } from '@/lib/automations'

type Setting = { key: string; enabled: boolean }
type LogRow = { id: string; kind: string; recipient: string | null; step: number; created_at: string; dossier_id: string | null }

const LABELS: Record<string, { title: string; text: string }> = {
  quote_reminders: { title: 'Relance des devis sans réponse', text: 'E-mail au client 3 jours après l’envoi du devis (PDF joint), puis une dernière relance 4 jours plus tard. S’arrête dès que le devis est accepté/refusé ou que le dossier avance.' },
  appointment_reminders: { title: 'Rappel de rendez-vous la veille', text: 'E-mail au client la veille de l’intervention : date, heure, adresse et liste des documents à préparer.' },
}
const STATUS_COLOR: Record<string, string> = { 'à envoyer': '#0b65b5', envoyé: '#1f5c34', erreur: '#a62d2d', ignoré: '#8a98a8' }

export default function AutomatisationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<Setting[]>([])
  const [logs, setLogs] = useState<LogRow[]>([])
  const [dossierNames, setDossierNames] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<AutomationItem[] | null>(null)
  const [cronReady, setCronReady] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const call = async (dryRun: boolean) => {
    setBusy(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/cron/daily', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ dryRun }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(data.error || 'Erreur.'); return }
    setPreview(data.items || []); setCronReady(Boolean(data.cronReady))
    if (!dryRun) void load()
  }

  const load = useCallback(async () => {
    const [s, l] = await Promise.all([
      supabase.from('automation_settings').select('key,enabled').order('key'),
      supabase.from('automation_log').select('id,kind,recipient,step,created_at,dossier_id').order('created_at', { ascending: false }).limit(40),
    ])
    if (s.error) setError(s.error.message.includes('automation_settings') ? 'La migration 028 n’est pas encore passée dans Supabase.' : s.error.message)
    setSettings((s.data || []) as Setting[])
    const rows = (l.data || []) as LogRow[]
    setLogs(rows)
    const ids = Array.from(new Set(rows.map((r) => r.dossier_id).filter(Boolean))) as string[]
    if (ids.length) {
      const { data } = await supabase.from('dossiers').select('id,dossier_name').in('id', ids)
      const m: Record<string, string> = {}
      ;(data || []).forEach((d: { id: string; dossier_name: string }) => { m[d.id] = d.dossier_name })
      setDossierNames(m)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      await load()
      await call(true)
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = async (key: string, enabled: boolean) => {
    setSettings((all) => all.map((s) => (s.key === key ? { ...s, enabled } : s)))
    const { error: e } = await supabase.from('automation_settings').update({ enabled, updated_at: new Date().toISOString() }).eq('key', key)
    if (e) setError(e.message)
    void call(true)
  }

  if (loading) return <AppShell active="accueil" adminOnly><div className="loading">Chargement…</div></AppShell>

  return (
    <AppShell active="accueil" adminOnly>
      <main className="page" style={{ maxWidth: 980 }}>
        <Link href="/dashboard" className="back">← Accueil</Link>
        <div className="hero-row" style={{ marginTop: 14 }}>
          <div>
            <div className="eyebrow">AUTOMATISATIONS</div>
            <h1>Envois automatiques</h1>
            <p>Chaque matin vers 8 h, l’app relance les devis et rappelle les rendez-vous du lendemain. Tu reçois un récapitulatif des envois.</p>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        {cronReady === false && <div className="error" style={{ background: '#fff8e8', color: '#8a5a00', borderColor: '#f3dca6' }}>Envoi automatique du matin pas encore branché (clés Vercel à ajouter). Tu peux déjà prévisualiser et envoyer à la main.</div>}

        <div style={{ display: 'grid', gap: 12 }}>
          {settings.map((s) => (
            <section key={s.key} className="card" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <b style={{ color: '#062b59' }}>{LABELS[s.key]?.title || s.key}</b>
                <div style={{ fontSize: 13, color: '#6f7d90', marginTop: 4 }}>{LABELS[s.key]?.text}</div>
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', color: s.enabled ? '#1f5c34' : '#8a98a8' }}>
                <input type="checkbox" checked={s.enabled} onChange={(e) => toggle(s.key, e.target.checked)} style={{ width: 18, height: 18 }} /> {s.enabled ? 'Activé' : 'Désactivé'}
              </label>
            </section>
          ))}
        </div>

        <section className="section">
          <div className="section-title"><h2>Prochain passage (aperçu)</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="action-btn" disabled={busy} onClick={() => call(true)}>Actualiser</button>
              <button className="action-btn primary-action" disabled={busy || !preview?.some((i) => i.status === 'à envoyer')} onClick={() => { if (window.confirm('Envoyer maintenant les e-mails listés ?')) void call(false) }}>Envoyer maintenant</button>
            </div>
          </div>
          <div className="card" style={{ padding: 4 }}>
            {!preview || preview.length === 0 ? <div style={{ padding: 16, color: '#6f7d90', fontSize: 13 }}>Rien à envoyer pour l’instant.</div> : preview.map((i, n) => (
              <div key={n} style={{ padding: '12px 14px', borderTop: n ? '1px solid #edf2f7' : 0, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <b style={{ fontSize: 13, color: '#062b59' }}>{i.kind === 'quote_reminder' ? 'Relance devis' : 'Rappel RDV'} · {i.label}</b>
                  <div style={{ fontSize: 12, color: '#6f7d90' }}>{i.recipient} · {i.detail}{i.error ? ` · ${i.error}` : ''}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: STATUS_COLOR[i.status] }}>{i.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-title"><h2>Derniers envois</h2></div>
          <div className="card" style={{ padding: 4 }}>
            {logs.length === 0 ? <div style={{ padding: 16, color: '#6f7d90', fontSize: 13 }}>Aucun envoi pour l’instant.</div> : logs.map((l, n) => (
              <div key={l.id} style={{ padding: '10px 14px', borderTop: n ? '1px solid #edf2f7' : 0, display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                <span>{l.kind === 'quote_reminder' ? `Relance devis ${l.step}/2` : 'Rappel RDV'} · {(l.dossier_id && dossierNames[l.dossier_id]) || '—'} · {l.recipient}</span>
                <span style={{ color: '#6f7d90', whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  )
}
