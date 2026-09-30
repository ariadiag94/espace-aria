'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Panneau « Google Agenda » de la page Agenda : génère le lien
// d'abonnement secret (flux iCalendar) et explique comment l'ajouter.

export function CalendarSync() {
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('calendar_feed_tokens').select('token').eq('user_id', session.user.id).maybeSingle()
      setToken((data as { token?: string } | null)?.token || null)
    })()
  }, [open])

  const generate = async () => {
    if (token && !window.confirm('Un nouveau lien remplace l’ancien : il faudra le rajouter dans Google Agenda. Continuer ?')) return
    setBusy(true); setError('')
    const { data, error: e } = await supabase.rpc('create_calendar_feed_token')
    setBusy(false)
    if (e || !data) { setError(e?.message?.includes('calendar_feed') || e?.code === 'PGRST202' ? 'La migration 027 n’est pas encore passée dans Supabase.' : (e?.message || 'Impossible de créer le lien.')); return }
    setToken(String(data)); setCopied(false)
  }

  const link = token ? `${window.location.origin}/api/agenda/ics/${token}.ics` : ''
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true) } catch { setCopied(false) } }

  const btn = { border: '1px solid #cddbe8', background: '#fff', color: '#174d80', borderRadius: 10, padding: '10px 13px', fontWeight: 700, fontSize: 12, cursor: 'pointer' } as const

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={btn}>📅 Google Agenda</button>
      {open && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
        <div className="edit-modal" role="dialog" aria-modal="true" style={{ maxWidth: 620 }}>
          <div className="edit-modal-head"><div><span className="section-kicker">AGENDA</span><h2>Voir les RDV dans Google Agenda</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Fermer">×</button></div>
          <p style={{ margin: '0 0 12px', color: '#6f7d90', fontSize: 13 }}>Les rendez-vous de l’app apparaissent automatiquement dans ton Google Agenda (adresse, contact, accès, lien vers le dossier). Google met à jour l’abonnement toutes les quelques heures. Les RDV se créent et se modifient toujours ici.</p>
          {error && <div className="error">{error}</div>}
          {token ? (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} style={{ flex: '1 1 320px', border: '1px solid #d3e0ea', borderRadius: 10, padding: '10px 12px', fontSize: 12 }} />
                <button type="button" onClick={copy} style={{ ...btn, background: '#062b59', color: '#fff', borderColor: '#062b59' }}>{copied ? '✓ Copié' : 'Copier le lien'}</button>
                <button type="button" onClick={generate} disabled={busy} style={btn}>Régénérer</button>
              </div>
              <ol style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: 13, color: '#14243b', lineHeight: 1.6 }}>
                <li>Copie le lien ci-dessus.</li>
                <li>Ouvre <a href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" target="_blank" rel="noreferrer" style={{ color: '#0b65b5', fontWeight: 700 }}>Google Agenda → Ajouter à partir de l’URL</a> (sur ordinateur).</li>
                <li>Colle le lien, puis « Ajouter l’agenda ». L’agenda « ARIA — Interventions » apparaît aussi sur ton téléphone.</li>
              </ol>
              <p style={{ margin: '10px 0 0', fontSize: 12, color: '#a0552d' }}>Lien secret : ne le partage pas. En cas de doute, « Régénérer » coupe l’ancien lien.</p>
            </>
          ) : (
            <button type="button" onClick={generate} disabled={busy} style={{ ...btn, background: '#062b59', color: '#fff', borderColor: '#062b59' }}>{busy ? 'Création…' : 'Créer mon lien Google Agenda'}</button>
          )}
        </div>
        </div>
      )}
    </>
  )
}
