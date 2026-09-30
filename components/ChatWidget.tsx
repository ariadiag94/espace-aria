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

// La conversation suit l'utilisateur d'une page à l'autre (DiagAssist →
// Mon espace → Guide) pendant toute la session du navigateur.
const STORAGE_KEY = 'aria-chat-turns'
const OPEN_EVENT = 'aria-chat:open'

/** Ouvre la bulle depuis n'importe quel écran, avec une question pré-envoyée si fournie. */
export const openAriaChat = (question?: string) => {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { question } }))
}

// Le chat n'apparaît que si la clé Anthropic est configurée sur le serveur
// (GET /api/chat) : tant qu'il n'est pas activé, seuls les conseils des
// cartes ChatCoach s'affichent, sans lien vers le chat.
let enabledPromise: Promise<boolean> | null = null
const fetchChatEnabled = () => {
  enabledPromise ??= fetch('/api/chat').then((r) => r.json()).then((d) => d?.enabled === true).catch(() => false)
  return enabledPromise
}
const useChatEnabled = () => {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => { let alive = true; void fetchChatEnabled().then((v) => { if (alive) setEnabled(v) }); return () => { alive = false } }, [])
  return enabled
}

const loadTurns = (): Turn[] | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) && parsed.length ? parsed.slice(-30) : null
  } catch { return null }
}

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
  useEffect(() => { const saved = loadTurns(); if (saved) setTurns(saved) }, [])
  useEffect(() => { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(turns.slice(-30))) } catch { /* navigation privée */ } }, [turns])
  const sendRef = useRef<(text: string) => void>(() => {})
  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true)
      const q = (e as CustomEvent<{ question?: string }>).detail?.question
      if (q) sendRef.current(q)
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

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
        body: JSON.stringify({ messages: next.filter((t) => t !== WELCOME), context, page }),
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

  sendRef.current = (text: string) => { void send(text) }
  const enabled = useChatEnabled()
  if (!enabled) return null

  const reset = () => { setTurns([WELCOME]); setError('') }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir l’assistant"
          style={{ position: 'fixed', right: 16, bottom: 'calc(90px + env(safe-area-inset-bottom))', zIndex: 60, border: 0, borderRadius: 999, padding: '12px 18px', background: NAVY, color: '#fff', fontWeight: 800, fontSize: 14, boxShadow: '0 10px 28px rgba(6,43,89,.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Arial,Helvetica,sans-serif' }}
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
            <div style={{ display: 'flex', gap: 6 }}>
            {turns.length > 1 && <button type="button" onClick={reset} style={{ border: 0, background: 'rgba(255,255,255,.15)', color: '#fff', borderRadius: 999, padding: '0 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Nouvelle conversation</button>}
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" style={{ border: 0, background: 'rgba(255,255,255,.15)', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>
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

// Carte « Assistant ARIA » affichée dans le parcours, à chaque étape : un
// conseil immédiat (sans attente ni coût) + accès direct au chat.
export function ChatCoach({ tip, question }: { tip: string; question?: string }) {
  const enabled = useChatEnabled()
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 18, padding: '12px 14px', borderRadius: 14, background: PALE, border: `1px solid #cfe7f6`, fontFamily: 'Arial,Helvetica,sans-serif' }}>
      <span aria-hidden style={{ flex: '0 0 auto', width: 30, height: 30, borderRadius: '50%', background: NAVY, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13, borderBottom: `2px solid ${SKY}` }}>A</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.45, color: '#14243b' }}>{tip}</div>
        {enabled && <button type="button" onClick={() => openAriaChat(question)} style={{ marginTop: 8, border: 0, background: 'none', padding: 0, color: '#0b65b5', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          {question ? `« ${question} » →` : 'Poser une question à l’assistant →'}
        </button>}
      </div>
    </div>
  )
}
