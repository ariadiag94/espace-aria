'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function QuotePrintPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [pdfUrl, setPdfUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let objectUrl = ''
    let cancelled = false

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      try {
        const response = await fetch(`/api/devis/${id}/pdf`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data?.error || 'Impossible de générer le PDF du devis.')
        }

        const blob = await response.blob()
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) setPdfUrl(objectUrl)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Impossible de générer le PDF du devis.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id, router])

  return (
    <main style={{ minHeight: '100vh', background: '#eef3f8', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          padding: '12px 18px',
          background: '#fff',
          borderBottom: '1px solid #dce6f0',
          fontFamily: 'Arial,Helvetica,sans-serif',
        }}
      >
        <Link href={`/devis/${id}`} style={{ color: '#0868b8', textDecoration: 'none', fontWeight: 700 }}>
          ← Retour au devis
        </Link>
        {pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              borderRadius: 10,
              background: '#062b59',
              color: '#fff',
              padding: '10px 15px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Ouvrir le PDF
          </a>
        ) : null}
      </div>

      {loading ? (
        <div style={{ padding: 30, fontFamily: 'Arial,Helvetica,sans-serif' }}>Génération du PDF…</div>
      ) : error ? (
        <div style={{ margin: 24, padding: 16, background: '#fff', border: '1px solid #e6b8b8', borderRadius: 10, color: '#8a2d2d', fontFamily: 'Arial,Helvetica,sans-serif' }}>
          {error}
        </div>
      ) : (
        <iframe
          title="Aperçu du devis PDF"
          src={pdfUrl}
          style={{ width: '100%', flex: 1, minHeight: 'calc(100vh - 62px)', border: 0, background: '#fff' }}
        />
      )}
    </main>
  )
}
