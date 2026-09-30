'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSignupClient } from '@/lib/pro-signup'
import { quoteStatusLabel } from '@/lib/dossier-status-labels'
import { ChatWidget } from '@/components/ChatWidget'

const NAVY = '#062b59'
const SKY = '#4db3e6'
const LIGHT = '#eef1f5'

const euro = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

type DossierRow = {
  id: string
  dossier_name: string | null
  property_address: string | null
  status: string | null
  contact_name: string | null
  contact_email: string | null
}

type QuoteRow = {
  id: string
  quote_number: string
  status: string
  total_ttc: number | null
  decided_at: string | null
  created_at: string
}

type QuoteLineRow = { id: string; quote_id: string; label: string; quantity: number; unit_ttc: number; total_ttc: number; sort_order: number }

type DocumentRow = { id: string; title: string | null; document_type: string | null; storage_path: string; created_at: string }

type AccessState = 'checking' | 'authorized' | 'unavailable' | 'not-found'


export default function MonEspaceDossierPage() {
  const router = useRouter()
  const params = useParams()
  const dossierId = String(params.dossierId)

  const [accessState, setAccessState] = useState<AccessState>('checking')
  const [dossier, setDossier] = useState<DossierRow | null>(null)
  const [quotes, setQuotes] = useState<QuoteRow[]>([])
  const [linesByQuote, setLinesByQuote] = useState<Record<string, QuoteLineRow[]>>({})
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [decidingId, setDecidingId] = useState<string | null>(null)
  const [decisionError, setDecisionError] = useState<Record<string, string>>({})

  const load = async (client: SupabaseClient) => {
    // Aucun filtre de compte ajouté manuellement ici non plus : si ce
    // dossier n'appartient pas au compte de l'utilisateur connecté, la RLS
    // dossiers_read renvoie simplement zéro ligne (pas une erreur) — traité
    // ci-dessous comme "not-found", jamais comme un accès accordé par erreur.
    const { data: dossierData } = await client
      .from('dossiers')
      .select('id, dossier_name, property_address, status, contact_name, contact_email')
      .eq('id', dossierId)
      .maybeSingle()

    if (!dossierData) return 'not-found' as const

    setDossier(dossierData as DossierRow)

    const { data: quotesData } = await client
      .from('quotes')
      .select('id, quote_number, status, total_ttc, decided_at, created_at')
      .eq('dossier_id', dossierId)
      .neq('status', 'draft')
      .order('created_at', { ascending: false })

    const quoteRows = (quotesData || []) as QuoteRow[]
    setQuotes(quoteRows)

    if (quoteRows.length > 0) {
      const { data: linesData } = await client
        .from('quote_lines')
        .select('id, quote_id, label, quantity, unit_ttc, total_ttc, sort_order')
        .in('quote_id', quoteRows.map((q) => q.id))
        .order('sort_order', { ascending: true })
      const grouped: Record<string, QuoteLineRow[]> = {}
      for (const line of (linesData || []) as QuoteLineRow[]) {
        grouped[line.quote_id] = grouped[line.quote_id] || []
        grouped[line.quote_id].push(line)
      }
      setLinesByQuote(grouped)
    }

    const { data: documentsData } = await client
      .from('documents')
      .select('id, title, document_type, storage_path, created_at')
      .eq('dossier_id', dossierId)
      .eq('visibility', 'client')
      .eq('locked', false)
      .order('created_at', { ascending: false })
    setDocuments((documentsData || []) as DocumentRow[])

    return 'authorized' as const
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const client = getSignupClient()
      if (!client) {
        if (!cancelled) setAccessState('unavailable')
        return
      }
      const { data: { session } } = await client.auth.getSession()
      if (!session) {
        router.replace(`/login?reason=anonymous&next=/mon-espace/${dossierId}`)
        return
      }
      const { data: hasAccess } = await client.rpc('has_assistant_access')
      if (!hasAccess) {
        const { data: status } = await client.rpc('my_client_account_validation_status')
        const reason = status === 'pending' ? 'pending' : status === 'rejected' ? 'rejected' : 'no-account'
        router.replace(`/login?reason=${reason}&next=/mon-espace/${dossierId}`)
        return
      }
      const result = await load(client)
      if (!cancelled) setAccessState(result)
    }
    void run()
    return () => { cancelled = true }
  }, [dossierId, router])

  const decide = async (quote: QuoteRow, decision: 'accepted' | 'refused') => {
    const client = getSignupClient()
    if (!client || !dossier) return
    setDecidingId(quote.id)
    setDecisionError((prev) => ({ ...prev, [quote.id]: '' }))

    const { error } = await client
      .from('quotes')
      .update({ status: decision, decided_at: new Date().toISOString() })
      .eq('id', quote.id)

    if (error) {
      setDecisionError((prev) => ({ ...prev, [quote.id]: error.message }))
      setDecidingId(null)
      return
    }

    // Synchronise dossiers.status (décision produit validée : accepté ->
    // 'quote_accepted', refusé -> 'quote_refused' — voir
    // supabase/migrations/023_dossiers_client_decision_sync.sql). Jamais
    // bloquant : quotes.status est déjà la source de vérité de la décision,
    // un échec ici est signalé sans laisser croire que la décision elle-même
    // a échoué.
    const dossierStatus = decision === 'accepted' ? 'quote_accepted' : 'quote_refused'
    const { error: dossierError } = await client
      .from('dossiers')
      .update({ status: dossierStatus })
      .eq('id', dossierId)

    if (dossierError) {
      setDecisionError((prev) => ({ ...prev, [quote.id]: `Votre décision a bien été enregistrée, mais le statut du dossier n’a pas pu être mis à jour (${dossierError.message}).` }))
    }

    if (dossier.contact_email) {
      fetch('/api/quotes/decision-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          quote_number: quote.quote_number,
          dossier_name: dossier.dossier_name,
          property_address: dossier.property_address,
          total_ttc: quote.total_ttc,
          contact_name: dossier.contact_name,
          contact_email: dossier.contact_email,
        }),
      }).catch(() => {})
    }

    await load(client)
    setDecidingId(null)
  }

  const downloadDocument = async (path: string) => {
    const client = getSignupClient()
    if (!client) return
    const { data, error } = await client.storage.from('dossier-documents').createSignedUrl(path, 120)
    if (error || !data?.signedUrl) {
      alert('Impossible d’ouvrir ce document pour le moment.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  if (accessState !== 'authorized') {
    return (
      <main style={{ minHeight: '100vh', background: LIGHT, display: 'grid', placeItems: 'center', fontFamily: 'Arial,Helvetica,sans-serif', padding: 24 }}>
        {accessState === 'unavailable' ? (
          <p style={{ color: NAVY, fontWeight: 700, textAlign: 'center' }}>Service momentanément indisponible. Merci de réessayer plus tard, ou de nous contacter au 06 15 70 36 70.</p>
        ) : accessState === 'not-found' ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: NAVY, fontWeight: 700 }}>Dossier introuvable.</p>
            <Link href="/mon-espace" style={{ color: '#315f8f', fontWeight: 700, fontSize: 14 }}>Retour à mon espace</Link>
          </div>
        ) : (
          <p style={{ color: '#6f7d90' }}>Chargement…</p>
        )}
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: LIGHT, fontFamily: 'Arial,Helvetica,sans-serif' }}>
      <div style={{ background: NAVY, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontWeight: 900, letterSpacing: '.04em' }}>ARIA DIAGNOSTICS</span>
        <Link href="/mon-espace" style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>← Mon espace</Link>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 60px' }}>
        <h1 style={{ color: NAVY, fontSize: 22, margin: '0 0 4px' }}>{dossier?.dossier_name || 'Dossier'}</h1>
        <p style={{ color: '#6f7d90', fontSize: 14, margin: '0 0 26px' }}>{dossier?.property_address || '—'}</p>

        <h2 style={{ color: NAVY, fontSize: 16, margin: '0 0 12px' }}>Devis</h2>
        {quotes.length === 0 && (
          <div style={{ padding: '16px 18px', borderRadius: 12, background: '#fff', border: '1px solid #dbe7f2', color: '#6f7d90', fontSize: 13, marginBottom: 24 }}>
            Aucun devis pour l’instant.
          </div>
        )}
        <div style={{ display: 'grid', gap: 14, marginBottom: 26 }}>
          {quotes.map((quote) => (
            <div key={quote.id} style={{ padding: '16px 18px', borderRadius: 14, border: '1px solid #dbe7f2', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <b style={{ color: NAVY, fontSize: 14 }}>{quote.quote_number}</b>
                <span style={{ display: 'inline-flex', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700, background: quote.status === 'sent' ? '#fff8e6' : quote.status === 'accepted' ? '#eaf6ee' : '#fff0f0', color: quote.status === 'sent' ? '#7a5612' : quote.status === 'accepted' ? '#1f5c34' : '#a62d2d' }}>
                  {quoteStatusLabel(quote.status)}
                </span>
              </div>

              <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
                {(linesByQuote[quote.id] || []).map((line) => (
                  <div key={line.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#44586c' }}>
                    <span>{line.label}{line.quantity > 1 ? ` × ${line.quantity}` : ''}</span>
                    <span>{euro(line.total_ttc)}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid #edf2f7' }}>
                <b style={{ color: NAVY, fontSize: 15 }}>Total TTC</b>
                <b style={{ color: NAVY, fontSize: 15 }}>{quote.total_ttc !== null ? euro(quote.total_ttc) : '—'}</b>
              </div>

              {quote.status === 'sent' && (
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button
                    onClick={() => decide(quote, 'accepted')}
                    disabled={decidingId === quote.id}
                    style={{ flex: 1, border: 0, borderRadius: 10, padding: '11px 14px', background: SKY, color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Accepter
                  </button>
                  <button
                    onClick={() => decide(quote, 'refused')}
                    disabled={decidingId === quote.id}
                    style={{ flex: 1, border: '1px solid #dbe7f2', borderRadius: 10, padding: '11px 14px', background: '#fff', color: NAVY, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Refuser
                  </button>
                </div>
              )}
              {quote.status !== 'sent' && quote.decided_at && (
                <p style={{ color: '#9aa6b5', fontSize: 12, margin: '10px 0 0' }}>Décision enregistrée le {new Date(quote.decided_at).toLocaleDateString('fr-FR')}.</p>
              )}
              {decisionError[quote.id] && <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: '#fff0f0', color: '#a62d2d', fontSize: 13 }}>{decisionError[quote.id]}</div>}
            </div>
          ))}
        </div>

        <h2 style={{ color: NAVY, fontSize: 16, margin: '0 0 12px' }}>Documents</h2>
        {documents.length === 0 && (
          <div style={{ padding: '16px 18px', borderRadius: 12, background: '#fff', border: '1px solid #dbe7f2', color: '#6f7d90', fontSize: 13 }}>
            Aucun document disponible pour l’instant.
          </div>
        )}
        <div style={{ display: 'grid', gap: 8 }}>
          {documents.map((document) => (
            <button
              key={document.id}
              onClick={() => downloadDocument(document.storage_path)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, textAlign: 'left', padding: '13px 16px', borderRadius: 12, border: '1px solid #dbe7f2', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <span style={{ color: NAVY, fontWeight: 700, fontSize: 13 }}>{document.title || document.document_type || 'Document'}</span>
              <span style={{ color: '#315f8f', fontWeight: 700, fontSize: 12 }}>Télécharger</span>
            </button>
          ))}
        </div>
      </div>
      <ChatWidget page="mon-espace-dossier" context="L'utilisateur consulte le suivi d'un de ses dossiers (devis, décision, documents)." />
    </main>
  )
}
