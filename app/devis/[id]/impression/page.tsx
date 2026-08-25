'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Quote = {
  id: string
  quote_number: string
  status: string
  total_ht: number
  total_vat: number
  total_ttc: number
  created_at: string
  dossier_id: string
  property_type?: string | null
  property_size?: string | null
  notes?: string | null
}

type Dossier = {
  id: string
  dossier_name: string
  property_address?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
}

type Line = {
  id?: string
  label: string
  quantity: number
  unit_ttc: number
  total_ttc: number
  sort_order: number
}

const euro = (n: number) =>
  Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

const dateFr = (v: string) =>
  new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export default function QuotePrintPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [lines, setLines] = useState<Line[]>([])

  useEffect(() => {
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      const { data: q, error: qErr } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single()

      if (qErr || !q) {
        setError(qErr?.message || 'Devis introuvable.')
        setLoading(false)
        return
      }

      setQuote(q as Quote)

      const [d, l] = await Promise.all([
        supabase
          .from('dossiers')
          .select('id,dossier_name,property_address,contact_name,contact_email,contact_phone')
          .eq('id', q.dossier_id)
          .single(),
        supabase
          .from('quote_lines')
          .select('*')
          .eq('quote_id', id)
          .order('sort_order', { ascending: true }),
      ])

      if (d.data) setDossier(d.data as Dossier)
      if (l.data) setLines(l.data as Line[])
      setLoading(false)
    })()
  }, [id, router])

  const totalTtc = useMemo(
    () => Math.round(lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_ttc || 0), 0) * 100) / 100,
    [lines],
  )
  const totalHt = Math.round((totalTtc / 1.2) * 100) / 100
  const vat = Math.round((totalTtc - totalHt) * 100) / 100

  if (loading) return <div className="simple-state">Chargement du devis…</div>
  if (!quote) return <div className="simple-state">{error || 'Devis introuvable.'}</div>

  const propertyLabel =
    quote.property_type === 'house'
      ? 'Maison'
      : quote.property_type === 'apartment'
        ? 'Appartement'
        : 'Bien'

  return (
    <main className="quote-print-page">
      <div className="quote-print-toolbar no-print">
        <Link href={`/devis/${quote.id}`}>← Retour au devis</Link>
        <button type="button" onClick={() => window.print()}>
          Imprimer / Enregistrer en PDF
        </button>
      </div>

      <article className="quote-sheet">
        <header className="quote-header">
          <div className="quote-brand">
            <img className="quote-logo" src="/logo-aria.svg" alt="ARIA Diagnostics" />
          </div>
          <div className="quote-meta">
            <div className="quote-title">DEVIS</div>
            <strong>{quote.quote_number}</strong>
            <span>Émis le {dateFr(quote.created_at)}</span>
            <span>Validité : 30 jours</span>
          </div>
        </header>

        <section className="quote-parties">
          <div className="quote-card provider-card">
            <h3>Prestataire</h3>
            <strong>ARIA Diagnostics</strong>
            <p>18 rue de Budapest · 94140 Alfortville</p>
            <p>06 15 70 36 70 · contact@aria-diagnostics.fr</p>
            <p>www.aria-diagnostics.fr</p>
            <p className="legal">
              SASU au capital de 1 000 € · SIRET 988 026 746 00012<br />
              TVA FR34 988026746 · APE 7120B<br />
              RCP AXA n°10988009704 · Certification Bureau Veritas
            </p>
          </div>

          <div className="quote-card">
            <h3>Donneur d’ordre / contact</h3>
            {dossier?.contact_name ? (
              <>
                <strong>{dossier.contact_name}</strong>
                <p>
                  {dossier.contact_phone || ''}
                  {dossier.contact_phone && dossier.contact_email ? <br /> : null}
                  {dossier.contact_email || ''}
                </p>
              </>
            ) : (
              <p>Contact non renseigné</p>
            )}
          </div>
        </section>

        <section className="property-card">
          <h3>Bien concerné par la mission</h3>
          <strong>{dossier?.property_address || dossier?.dossier_name || 'Adresse du bien non renseignée'}</strong>
          <p>{propertyLabel}{quote.property_size ? ` · ${quote.property_size}` : ''}</p>
        </section>

        <section className="quote-lines-wrap">
          <table className="quote-lines">
            <thead>
              <tr>
                <th>Prestation</th>
                <th>Qté</th>
                <th>Prix unitaire TTC</th>
                <th>Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id || index}>
                  <td>{line.label}</td>
                  <td>{Number(line.quantity || 0).toLocaleString('fr-FR')}</td>
                  <td>{euro(Number(line.unit_ttc || 0))}</td>
                  <td>{euro(Number(line.quantity || 0) * Number(line.unit_ttc || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="quote-summary">
          <div className="quote-note">
            <h3>Conditions</h3>
            <p>Paiement à réception. Validité du devis : 30 jours à compter de sa date d’émission.</p>
            <p>Les prestations seront réalisées selon le périmètre indiqué ci-dessus et les informations communiquées au moment de la commande.</p>
            {quote.notes ? (
              <>
                <h3>Précisions</h3>
                <p>{quote.notes}</p>
              </>
            ) : null}
          </div>

          <div className="quote-totals">
            <div><span>Total HT</span><strong>{euro(totalHt)}</strong></div>
            <div><span>TVA 20 %</span><strong>{euro(vat)}</strong></div>
            <div className="grand-total"><span>Total TTC</span><strong>{euro(totalTtc)}</strong></div>
          </div>
        </section>

        <section className="acceptance">
          <div>
            <h3>Bon pour accord</h3>
            <p>Je reconnais avoir pris connaissance du présent devis et en accepter les conditions.</p>
          </div>
          <div className="accept-grid">
            <div><span>Date</span><div className="sign-line" /></div>
            <div><span>Nom / qualité</span><div className="sign-line" /></div>
            <div className="signature">
              <span>Signature précédée de la mention « Bon pour accord »</span>
              <div className="signature-box" />
            </div>
          </div>
        </section>

        <footer className="quote-footer">
          <div className="quote-footer-line" />
          <div className="quote-footer-content">
            <div>ARIA Diagnostics · 18 rue de Budapest, 94140 Alfortville · 06 15 70 36 70 · contact@aria-diagnostics.fr</div>
            <div>Devis {quote.quote_number}</div>
          </div>
        </footer>
      </article>

      <style>{`
        body{margin:0;background:#eef3f8;color:#062b59;font-family:Arial,Helvetica,sans-serif}
        .simple-state{padding:30px;font-family:Arial,Helvetica,sans-serif}
        .quote-print-page{padding:24px}
        .quote-print-toolbar{max-width:920px;margin:0 auto 14px;display:flex;justify-content:space-between;align-items:center}
        .quote-print-toolbar a{color:#0868b8;text-decoration:none;font-weight:700}
        .quote-print-toolbar button{border:0;border-radius:10px;background:#062b59;color:#fff;padding:12px 18px;font-weight:700;cursor:pointer}
        .quote-sheet{position:relative;width:210mm;max-width:920px;min-height:297mm;margin:0 auto;background:#fff;padding:16mm 17mm 24mm;box-sizing:border-box;box-shadow:0 20px 50px rgba(6,43,89,.12);font-size:13px}
        .quote-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;border-bottom:3px solid #0b6cb8;padding-bottom:14px}
        .quote-logo{display:block;width:220px;height:auto;max-height:84px;object-fit:contain;object-position:left top}
        .quote-meta{text-align:right;display:grid;gap:3px;font-size:12px}
        .quote-meta strong{font-size:13px}
        .quote-title{font-size:18px;font-weight:500;letter-spacing:1px}
        .quote-meta span{color:#66788c;font-size:12px}
        .quote-parties{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px;align-items:start}
        .quote-card,.property-card{border:1px solid #dce6f0;border-radius:10px;padding:12px}
        .provider-card p{margin:3px 0}
        .property-card{margin-top:12px}
        .quote-card h3,.property-card h3,.quote-note h3,.acceptance h3{margin:0 0 5px;color:#0b6cb8;font-size:10px;text-transform:uppercase;letter-spacing:.9px}
        .quote-card>strong,.property-card>strong{font-size:13.5px}
        .quote-card p,.property-card p,.acceptance p{margin:4px 0;line-height:1.28;color:#3f5063;font-size:12px}
        .quote-note p{margin:2px 0;line-height:1.16;color:#3f5063;font-size:10.5px}
        .quote-note h3{margin-bottom:4px}
        .quote-note h3+ p{margin-top:0}
        .quote-note p+ p{margin-top:4px}
        .legal{font-size:9px!important;color:#66788c!important;line-height:1.24!important;margin-top:5px!important}
        .quote-lines-wrap{margin-top:12px}
        .quote-lines{width:100%;border-collapse:collapse;font-size:10.8px}
        .quote-lines th{background:#58c3e5;color:#062b59;text-align:left;padding:5px 7px;font-size:9.2px;line-height:1.1}
        .quote-lines th:nth-child(n+2),.quote-lines td:nth-child(n+2){text-align:right}
        .quote-lines td{padding:3px 7px;border-bottom:1px solid #e5ecf3;line-height:1.08}
        .quote-summary{display:grid;grid-template-columns:1fr 220px;gap:14px;margin-top:12px;align-items:start}
        .quote-note{padding:9px 11px;border:1px solid #e0e8f0;border-radius:10px}
        .quote-totals{border:1px solid #dce6f0;border-radius:10px;padding:8px 9px;font-size:10px}
        .quote-totals>div{display:flex;justify-content:space-between;gap:12px;padding:3px 0}
        .grand-total{border-top:1.5px solid #062b59;margin-top:4px;padding-top:6px!important;font-size:11.5px}
        .grand-total strong{font-size:13.5px}
        .acceptance{margin-top:14px;border:1px solid #dce6f0;border-radius:10px;padding:11px;break-inside:avoid}
        .accept-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;margin-top:9px}
        .accept-grid span{font-size:9px;color:#66788c}
        .sign-line{height:17px;border-bottom:1px solid #9aa9b8}
        .signature{grid-column:1/-1}
        .signature-box{height:38px;border:1px dashed #b8c5d2;border-radius:7px;margin-top:5px}
        .quote-footer{position:absolute;left:17mm;right:17mm;bottom:10mm;color:#66788c;font-size:8px}
        .quote-footer-line{height:2px;background:#58c3e5;margin-bottom:7px}
        .quote-footer-content{display:flex;justify-content:space-between;align-items:center;gap:18px}
        .quote-footer-content>div:first-child{flex:1}
        .quote-footer-content>div:last-child{white-space:nowrap}
        @media(max-width:700px){
          .quote-print-page{padding:0}.quote-sheet{width:100%;padding:24px;min-height:auto;box-shadow:none}.quote-header,.quote-footer-content{flex-direction:column}.quote-meta{text-align:left}.quote-parties,.quote-summary{grid-template-columns:1fr}.quote-logo{width:200px}.quote-lines{font-size:10.8px}.quote-lines th,.quote-lines td{padding:5px}.quote-print-toolbar{padding:12px}.accept-grid{grid-template-columns:1fr}.quote-footer{position:static;margin-top:16px}.quote-footer-content{align-items:flex-start}
        }
        @media print{
          @page{size:A4;margin:0}.no-print{display:none!important}html,body{background:#fff!important}.quote-print-page{padding:0}.quote-sheet{width:210mm;min-height:297mm;max-width:none;margin:0;box-shadow:none;padding:14mm 15mm 24mm}.quote-header,.quote-card,.property-card,.quote-lines tr,.quote-summary,.acceptance{break-inside:avoid}.quote-logo{print-color-adjust:exact;-webkit-print-color-adjust:exact}.quote-lines th,.quote-footer-line{print-color-adjust:exact;-webkit-print-color-adjust:exact}.quote-footer{left:15mm;right:15mm;bottom:9mm}
        }
      `}</style>
    </main>
  )
}
