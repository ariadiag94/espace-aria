'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Bulle « Une question ? » : chatbot d'accompagnement (voir app/api/chat).
// `context` décrit où en est l'utilisateur (ex. étape DiagAssist en cours et
// réponses déjà données) pour que l'assistant l'aide sur la bonne question.

const NAVY = '#062B59'
const SKY = '#23A5DF'
const PALE = '#EAF5FC'

type Turn = { role: 'user' | 'assistant'; content: string }

const WELCOME: Turn = {
  role: 'assistant',
  content: 'Bonjour ! Je peux vous aider à savoir quels diagnostics sont obligatoires, à répondre aux questions du devis ou à préparer la visite. Posez-moi votre question.',
}

const SUGGESTIONS = [
  'Quels diagnostics pour vendre un appartement ?',
  'Je ne connais pas l’année de construction',
  'Comment préparer la visite ?',
]

export function ChatWidget({ context, page }: { context?: string; page?: string }) {
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([WELCOME])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [turns, busy, open])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || busy) return
    setError('')
    const next: Turn[] = [...turns, { role: 'user', content }]
    setTurns(next)
    setInput('')
    setBusy(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Connectez-vous pour utiliser l’assistant.'); return }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        // Le message d'accueil n'est pas envoyé : l'historique commence au
        // premier message de l'utilisateur.
        body: JSON.stringify({ messages: next.slice(1), context, page }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.reply) { setError(data.error || 'L’assistant n’a pas pu répondre.'); return }
      setTurns((t) => [...t, { role: 'assistant', content: data.reply }])
    } catch {
      setError('Connexion impossible. Réessayez.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir l’assistant"
          style={{ position: 'fixed', right: 16, bottom: 'calc(84px + env(safe-area-inset-bottom))', zIndex: 60, border: 0, borderRadius: 999, padding: '12px 18px', background: NAVY, color: '#fff', fontWeight: 800, fontSize: 14, boxShadow: '0 10px 28px rgba(6,43,89,.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Arial,Helvetica,sans-serif' }}
        >
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: SKY, display: 'inline-block' }} />
          Une question ?
        </button>
      )}
      {open && (
        <div
          role="dialog"
          aria-label="Assistant ARIA"
          style={{ position: 'fixed', right: 12, left: 12, bottom: 'calc(12px + env(safe-area-inset-bottom))', marginLeft: 'auto', maxWidth: 400, height: 'min(560px, 78vh)', zIndex: 70, background: '#fff', borderRadius: 18, boxShadow: '0 24px 70px rgba(6,43,89,.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Arial,Helvetica,sans-serif' }}
        >
          <div style={{ background: NAVY, color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `3px solid ${SKY}` }}>
            <div>
              <div style={{ fontWeight: 800 }}>Assistant ARIA</div>
              <div style={{ fontSize: 11, opacity: .8 }}>Réponses indicatives, sous réserve de la visite</div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" style={{ border: 0, background: 'rgba(255,255,255,.15)', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, background: '#f7fafd', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {turns.map((t, i) => (
              <div key={i} style={{ alignSelf: t.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%', background: t.role === 'user' ? NAVY : '#fff', color: t.role === 'user' ? '#fff' : '#14243b', border: t.role === 'user' ? 0 : '1px solid #dce6f0', borderRadius: 14, padding: '10px 12px', fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                {t.content}
              </div>
            ))}
            {turns.length === 1 && !busy && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} style={{ border: `1px solid ${SKY}`, background: PALE, color: NAVY, borderRadius: 999, padding: '7px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{s}</button>
                ))}
              </div>
            )}
            {busy && <div style={{ alignSelf: 'flex-start', color: '#6f7d90', fontSize: 13 }}>L’assistant écrit…</div>}
            {error && <div style={{ background: '#fff0f0', color: '#a62d2d', border: '1px solid #ffcfcf', borderRadius: 10, padding: '8px 10px', fontSize: 13 }}>{error}</div>}
            <div ref={endRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void send(input) }} style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #dce6f0' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Votre question…"
              maxLength={1500}
              style={{ flex: 1, border: '1px solid #cfdce8', borderRadius: 12, padding: '11px 12px', fontSize: 16, outline: 'none', fontFamily: 'inherit' }}
            />
            <button type="submit" disabled={busy || !input.trim()} style={{ border: 0, borderRadius: 12, padding: '0 16px', background: busy || !input.trim() ? '#9fb3c8' : SKY, color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Envoyer</button>
          </form>
        </div>
      )}
    </>
  )
}
