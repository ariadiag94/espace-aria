import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: '#f8fbff', fontFamily: 'Arial,Helvetica,sans-serif' }}>
      <style>{`
        .hero-top-link { color: rgba(255,255,255,.82); text-decoration: none; font-size: 13px; font-weight: 700; white-space: nowrap; }
        .hero-top-link:hover { color: #fff; }
        .hero-cta { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #fff; color: #062b59; border: 2px solid #4db3e6; border-radius: 14px; padding: 15px 34px; font-weight: 900; font-size: 16px; text-decoration: none; box-shadow: 0 12px 30px rgba(77,179,230,.35); }
        @media (max-width: 600px) {
          .hero-banner { padding: 24px 16px 84px !important; }
          .hero-top-row { justify-content: center !important; text-align: center; }
          .hero-logo { height: 90px !important; }
          .hero-title { font-size: 30px !important; margin-top: 18px !important; }
          .hero-subtitle { font-size: 14px !important; }
          .hero-tagline { font-size: 13px !important; }
          .hero-cta { width: 100%; }
        }
      `}</style>

      <div className="hero-banner" style={{ position: 'relative', padding: '28px 32px 96px' }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', clipPath: 'ellipse(75% 100% at 50% 0%)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#062b59 0%,#041d3d 100%)' }} />
          <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: '60%', height: '70%', background: 'radial-gradient(circle,rgba(77,179,230,.18) 0%,transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '60%', height: '70%', background: 'radial-gradient(circle,rgba(77,179,230,.12) 0%,transparent 70%)' }} />
        </div>

        <div style={{ position: 'relative' }}>
          <div className="hero-top-row" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
            <Link href="#" className="hero-top-link">Espace pro</Link>
            <span style={{ width: 1, height: 14, background: 'rgba(77,179,230,.5)' }} />
            <Link href="#" className="hero-top-link">Déjà client ? Suivre mon dossier →</Link>
          </div>

          <div style={{ textAlign: 'center', maxWidth: 640, margin: '36px auto 0' }}>
            <Image src="/logo-aria-white.png" alt="ARIA Diagnostics" width={2596} height={1036} priority className="hero-logo" style={{ height: 230, width: 'auto', margin: '0 auto' }} />
            <h1 className="hero-title" style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(30px,5vw,46px)', margin: '28px 0 0', letterSpacing: '-.02em' }}>DiagAssist</h1>
            <div style={{ width: 56, height: 3, background: '#4db3e6', borderRadius: 2, margin: '14px auto 18px' }} />
            <p className="hero-subtitle" style={{ color: '#fff', fontWeight: 600, fontSize: 16, margin: '0 0 10px' }}>L’assistant qui identifie vos diagnostics obligatoires</p>
            <p className="hero-tagline" style={{ color: '#c9d8e8', fontSize: 15, lineHeight: 1.6, maxWidth: 520, margin: '0 auto 28px' }}>Votre bien, votre projet, vos diagnostics obligatoires — identifiés en quelques minutes, devis gratuit inclus.</p>
            <Link href="#" className="hero-cta">Commencer →</Link>
            <div style={{ marginTop: 22 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999, background: 'rgba(77,179,230,.12)', border: '1px solid rgba(77,179,230,.35)', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                <span style={{ color: '#f5c542', letterSpacing: 2 }}>★★★★★</span>
                <span>5.0 · 106 avis Google</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <section className="avis-clients" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h2 style={{ color: '#062b59', marginBottom: '12px' }}>Ce que disent nos clients</h2>
        <p style={{ color: '#555', maxWidth: '600px', margin: '0 auto 20px' }}>
          La satisfaction de nos clients est au cœur de notre activité. Découvrez
          les avis laissés après leurs interventions avec ARIA Diagnostics.
        </p>
        <div id="avis-clients" style={{ margin: '30px 0', maxHeight: '420px', overflowY: 'auto', borderRadius: '12px' }}>
          <Script defer strategy="afterInteractive" src="https://cdn.trustindex.io/loader.js?b559cd170fb0098f50767e4f916" />
        </div>
      </section>
    </main>
  )
}
