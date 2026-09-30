'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSignupClient } from '@/lib/pro-signup'
import { ChatWidget } from '@/components/ChatWidget'
import { TabBar } from '@/components/TabBar'
import { COMMUNE_RULES } from '@/lib/commune-rules'
import {
  DPE_FACTS, LAW_REFS, LOCATION_DIAGS, OFFICIAL_LINKS, PREPARATION_CHECKLIST,
  RESSOURCES_UPDATED_AT, VENTE_DIAGS, type DiagRow,
} from '@/lib/ressources-content'

const NAVY = '#062b59'
const SKY = '#23a5df'
const PALE = '#eaf5fc'

type Tab = 'diagnostics' | 'dpe' | 'lois' | 'preparer'
const TABS: { id: Tab; label: string }[] = [
  { id: 'diagnostics', label: 'Quels diagnostics ?' },
  { id: 'dpe', label: 'Le DPE' },
  { id: 'lois', label: 'Textes de loi' },
  { id: 'preparer', label: 'Préparer la visite' },
]

function DiagTable({ rows }: { rows: DiagRow[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: NAVY, color: '#fff', textAlign: 'left' }}>
            <th style={{ padding: '10px 12px' }}>Diagnostic</th>
            <th style={{ padding: '10px 12px' }}>Quand est-il obligatoire ?</th>
            <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Validité</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name} style={{ background: i % 2 ? '#f7fafc' : '#fff', borderBottom: '1px solid #e3eaf1' }}>
              <td style={{ padding: '10px 12px', fontWeight: 700, color: NAVY }}>{r.name}</td>
              <td style={{ padding: '10px 12px' }}>{r.when}</td>
              <td style={{ padding: '10px 12px' }}>{r.validity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const Card = ({ children }: { children: React.ReactNode }) => (
  <section style={{ background: '#fff', border: '1px solid #dbe7f2', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>{children}</section>
)
const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ color: NAVY, fontSize: 17, margin: '0 0 12px', borderLeft: `4px solid ${SKY}`, paddingLeft: 10 }}>{children}</h2>
)

export default function RessourcesPage() {
  const router = useRouter()
  const [state, setState] = useState<'checking' | 'ok'>('checking')
  const [tab, setTab] = useState<Tab>('diagnostics')

  // Réservé aux comptes autorisés (pros validés, staff) : même règle que /assistant.
  useEffect(() => {
    void (async () => {
      const client = getSignupClient()
      if (!client) return
      const { data: { session } } = await client.auth.getSession()
      if (!session) { router.replace('/login?reason=anonymous&next=/ressources'); return }
      const { data: ok } = await client.rpc('has_assistant_access')
      if (!ok) { router.replace('/login?reason=no-account&next=/ressources'); return }
      setState('ok')
    })()
  }, [router])

  if (state !== 'ok') return <div style={{ padding: 40, textAlign: 'center', color: '#6f7d90' }}>Chargement…</div>

  const termites = COMMUNE_RULES.filter((c) => c.coverage === 'entiere' || c.coverage === 'partielle')

  return (
    <div style={{ minHeight: '100vh', background: '#f3f6f9' }}>
      <div style={{ background: NAVY, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `3px solid ${SKY}` }}>
        <span style={{ color: '#fff', fontWeight: 900, letterSpacing: '.04em' }}>ARIA DIAGNOSTICS</span>
        <div style={{ display: 'flex', gap: 14 }}>
          <Link href="/assistant" style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>Demander un devis</Link>
          <Link href="/mon-espace" style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>Mon espace</Link>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '26px 18px 60px' }}>
        <div style={{ color: SKY, fontWeight: 800, fontSize: 12, letterSpacing: '.08em' }}>RESSOURCES PROFESSIONNELLES</div>
        <h1 style={{ color: NAVY, fontSize: 26, margin: '4px 0 6px' }}>Le guide des diagnostics immobiliers</h1>
        <p style={{ color: '#6f7d90', fontSize: 14, margin: '0 0 18px' }}>
          Les règles essentielles pour conseiller vos clients vendeurs et bailleurs. Mis à jour le {RESSOURCES_UPDATED_AT}.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '9px 16px', borderRadius: 999, border: `2px solid ${tab === t.id ? NAVY : '#dbe7f2'}`, background: tab === t.id ? NAVY : '#fff', color: tab === t.id ? '#fff' : NAVY, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'diagnostics' && (
          <>
            <Card><H2>Vente : le dossier de diagnostic technique (DDT)</H2><DiagTable rows={VENTE_DIAGS} /><p style={{ fontSize: 12, color: '#6f7d90', margin: '10px 0 0' }}>Le DDT est annexé à la promesse de vente ou, à défaut, à l’acte authentique.</p></Card>
            <Card><H2>Location : les diagnostics annexés au bail</H2><DiagTable rows={LOCATION_DIAGS} /><p style={{ fontSize: 12, color: '#6f7d90', margin: '10px 0 0' }}>Le DDT est remis à la signature du bail et à son renouvellement. Les diagnostics sont à la charge du bailleur.</p></Card>
            <Card>
              <H2>Termites dans le Val-de-Marne</H2>
              <p style={{ fontSize: 13, margin: '0 0 10px' }}>Communes couvertes par un arrêté préfectoral (entièrement ou en partie). Hors de ces zones, l’état termites n’est pas obligatoire.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {termites.map((c) => (
                  <span key={c.slug} style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: c.coverage === 'entiere' ? NAVY : PALE, color: c.coverage === 'entiere' ? '#fff' : NAVY }}>
                    {c.name}{c.coverage === 'partielle' ? ' (zone partielle)' : ''}
                  </span>
                ))}
              </div>
            </Card>
          </>
        )}

        {tab === 'dpe' && (
          <>
            <Card>
              <H2>Calendrier des interdictions de louer</H2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                {[['G', '1er janvier 2025', 'Interdit à la location', '#c0392b'], ['F', '1er janvier 2028', 'Interdiction prévue', '#e67e22'], ['E', '1er janvier 2034', 'Interdiction prévue', '#f1c40f']].map(([cls, date, txt, color]) => (
                  <div key={cls} style={{ borderRadius: 12, border: '1px solid #dbe7f2', padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ width: 42, height: 42, borderRadius: 10, background: color, color: '#fff', fontWeight: 900, fontSize: 22, display: 'grid', placeItems: 'center' }}>{cls}</span>
                    <div><b style={{ color: NAVY }}>{date}</b><div style={{ fontSize: 12, color: '#6f7d90' }}>{txt}</div></div>
                  </div>
                ))}
              </div>
            </Card>
            {DPE_FACTS.map((f) => (
              <Card key={f.title}><H2>{f.title}</H2><p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>{f.body}</p></Card>
            ))}
          </>
        )}

        {tab === 'lois' && (
          <>
            <Card>
              <H2>Textes de référence</H2>
              {LAW_REFS.map((l) => (
                <div key={l.label} style={{ padding: '10px 0', borderBottom: '1px solid #eef2f6' }}>
                  <a href={l.url} target="_blank" rel="noreferrer" style={{ color: NAVY, fontWeight: 700 }}>{l.label} ↗</a>
                  <div style={{ fontSize: 13, color: '#44586c', marginTop: 2 }}>{l.detail}</div>
                </div>
              ))}
            </Card>
            <Card>
              <H2>Fiches officielles à partager</H2>
              {OFFICIAL_LINKS.map((l) => (
                <div key={l.url} style={{ padding: '8px 0' }}>
                  <a href={l.url} target="_blank" rel="noreferrer" style={{ color: NAVY, fontWeight: 700 }}>{l.label} ↗</a>
                  <span style={{ fontSize: 12, color: '#6f7d90' }}> · {l.detail}</span>
                </div>
              ))}
            </Card>
          </>
        )}

        {tab === 'preparer' && (
          <Card>
            <H2>Préparer la visite du diagnostiqueur</H2>
            <p style={{ fontSize: 13, margin: '0 0 12px' }}>Une visite bien préparée, c’est un rapport sans réserve et des délais tenus. À transmettre à votre client :</p>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7 }}>
              {PREPARATION_CHECKLIST.map((item) => <li key={item}>{item}</li>)}
            </ol>
          </Card>
        )}

        <div style={{ background: PALE, borderRadius: 14, padding: '16px 18px', fontSize: 13, color: '#44586c', lineHeight: 1.6 }}>
          Ces informations sont générales et ne remplacent pas l’analyse de chaque situation. Une question sur un dossier ? ARIA Diagnostics · 06 15 70 36 70 · contact@aria-diagnostics.fr
        </div>
      </div>
      <TabBar active="guide" />
      <ChatWidget page="ressources" context="L'utilisateur consulte le guide pro (diagnostics, DPE, textes de loi)." />
    </div>
  )
}
