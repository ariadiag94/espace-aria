import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

// Page publique de présentation aux professionnels (agences, syndics,
// notaires, bailleurs) : à envoyer avec l'invitation. Prix calculés depuis la
// grille (lib/property-pricing.ts) et la remise partenaire (-10 %, arrondi
// supérieur comme /assistant) : jamais de chiffre recopié à la main.

export const metadata: Metadata = {
  title: 'Espace partenaires — ARIA Diagnostics',
  description: 'Agences, syndics, notaires : devis de diagnostics en quelques minutes, tarif partenaire -10 %, suivi de vos dossiers.',
}

const NAVY = '#062b59'
const SKY = '#23a5df'

const BENEFITS = [
  { title: 'Tarif partenaire -10 %', text: 'Sur toute la grille, appliqué automatiquement à chaque devis dès que votre compte est validé.' },
  { title: 'Un devis en quelques minutes', text: 'DiagAssist identifie les diagnostics obligatoires selon le projet (vente, location), l’année et la commune. Devis et ordre de mission partent aussitôt par e-mail.' },
  { title: 'Vous choisissez qui règle', text: 'Votre agence ou directement votre client : vous l’indiquez à chaque demande.' },
  { title: 'Vos dossiers au même endroit', text: 'Devis, acceptation et documents de chaque mission, consultables à tout moment dans votre espace.' },
  { title: 'Moins de relances à faire', text: 'La veille de l’intervention, votre client reçoit un rappel avec l’heure, l’adresse et la liste des documents à préparer.' },
  { title: 'Le guide réglementaire', text: 'Diagnostics obligatoires et durées de validité, points clés du DPE, arrêtés termites du Val-de-Marne, textes de référence.' },
]

const STEPS = [
  { n: '1', title: 'Créez votre compte', text: 'Raison sociale, SIRET, coordonnées : deux minutes.' },
  { n: '2', title: 'ARIA valide votre accès', text: 'Nous vérifions votre activité professionnelle puis activons le tarif partenaire.' },
  { n: '3', title: 'Envoyez vos demandes', text: 'Depuis votre téléphone ou votre ordinateur, 24 h/24, via DiagAssist.' },
]

export default function PartenairesPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#f8fbff', fontFamily: 'Arial,Helvetica,sans-serif', color: '#14243b' }}>
      <style>{`
        .p-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .p-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .p-cta { display: inline-flex; align-items: center; justify-content: center; background: #fff; color: ${NAVY}; border: 2px solid ${SKY}; border-radius: 14px; padding: 14px 28px; font-weight: 900; font-size: 16px; text-decoration: none; }
        .p-link { color: #c9d8e8; font-weight: 700; font-size: 14px; text-decoration: none; }
        .p-card { background: #fff; border: 1px solid #dce6f0; border-radius: 16px; padding: 18px; box-shadow: 0 10px 28px rgba(17,48,87,.07); }
        @media (max-width: 760px) { .p-grid, .p-steps { grid-template-columns: 1fr; } .p-cta { width: 100%; } .p-hero { padding: 28px 16px 64px !important; } }
      `}</style>

      <section className="p-hero" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #041d3d 100%)`, padding: '36px 24px 72px', textAlign: 'center', borderBottom: `4px solid ${SKY}` }}>
        <Link href="/"><Image src="/logo-aria-white.png" alt="ARIA Diagnostics" width={2596} height={1036} priority style={{ height: 110, width: 'auto', margin: '0 auto' }} /></Link>
        <div style={{ color: SKY, fontWeight: 800, letterSpacing: '.16em', fontSize: 12, marginTop: 18 }}>ESPACE PARTENAIRES</div>
        <h1 style={{ color: '#fff', fontSize: 'clamp(26px,4.5vw,40px)', margin: '10px auto 12px', maxWidth: 760, lineHeight: 1.15 }}>Vos diagnostics immobiliers, en quelques clics.</h1>
        <p style={{ color: '#c9d8e8', fontSize: 16, lineHeight: 1.6, maxWidth: 620, margin: '0 auto 26px' }}>Agences, syndics, notaires, bailleurs : un devis immédiat pour chaque bien, le tarif partenaire -10 % et le suivi de vos dossiers au même endroit.</p>
        <div style={{ display: 'flex', gap: 18, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/inscription-pro" className="p-cta">Créer mon compte pro →</Link>
          <Link href="/login?next=/mon-espace" className="p-link">Déjà partenaire ? Se connecter</Link>
        </div>
      </section>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 16px 56px' }}>
        <h2 style={{ color: NAVY, fontSize: 22, margin: '0 0 16px' }}>Ce que l’espace pro vous apporte</h2>
        <div className="p-grid">
          {BENEFITS.map((b) => (
            <div key={b.title} className="p-card" style={{ borderTop: `4px solid ${SKY}` }}>
              <b style={{ color: NAVY, fontSize: 16 }}>{b.title}</b>
              <p style={{ margin: '8px 0 0', color: '#50627a', fontSize: 14, lineHeight: 1.55 }}>{b.text}</p>
            </div>
          ))}
        </div>

        <h2 style={{ color: NAVY, fontSize: 22, margin: '40px 0 16px' }}>Comment ça marche</h2>
        <div className="p-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="p-card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ flex: '0 0 auto', width: 36, height: 36, borderRadius: '50%', background: NAVY, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900 }}>{s.n}</span>
              <div><b style={{ color: NAVY }}>{s.title}</b><p style={{ margin: '6px 0 0', color: '#50627a', fontSize: 14, lineHeight: 1.5 }}>{s.text}</p></div>
            </div>
          ))}
        </div>

        <div className="p-card" style={{ marginTop: 40, background: NAVY, color: '#fff', display: 'flex', gap: 20, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', borderLeft: `6px solid ${SKY}` }}>
          <div>
            <b style={{ fontSize: 18 }}>ARIA Diagnostics</b>
            <p style={{ margin: '6px 0 0', color: '#c9d8e8', fontSize: 14, lineHeight: 1.6 }}>Diagnostiqueur certifié (Bureau Veritas) · Assurance RC Pro AXA<br />18 rue de Budapest, 94140 Alfortville · Val-de-Marne<br />06 15 70 36 70 · contact@aria-diagnostics.fr</p>
          </div>
          <Link href="/inscription-pro" className="p-cta">Créer mon compte pro →</Link>
        </div>
      </div>
    </main>
  )
}
