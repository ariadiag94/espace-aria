import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 24,
        background: 'linear-gradient(180deg,#f8fbff 0%,#edf4fa 100%)',
        fontFamily: 'Arial,Helvetica,sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <section style={{ width: '100%', maxWidth: 1020, display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(320px,.9fr)', background: '#fff', border: '1px solid #dbe7f2', borderRadius: 30, overflow: 'hidden', boxShadow: '0 24px 70px rgba(6,43,89,.14)' }}>
          <div style={{ padding: '64px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(155deg,#f9fcff 0%,#edf6fd 100%)' }}>
            <Image src="/logo-aria.svg" alt="ARIA Diagnostics" width={390} height={144} priority style={{ width: 'min(70vw,390px)', height: 'auto', objectFit: 'contain' }} />
            <h1 style={{ margin: '28px 0 10px', color: '#062b59', fontSize: 'clamp(34px,5vw,54px)', lineHeight: 1, letterSpacing: '-.04em' }}>Espace ARIA</h1>
            <p style={{ margin: 0, color: '#63768a', fontSize: 16, lineHeight: 1.6 }}>Dossiers, devis, agenda et outils métier ARIA Diagnostics dans un seul espace sécurisé.</p>
          </div>
          <div style={{ padding: '58px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ margin: '0 0 8px', color: '#0b6ebd', fontSize: 13, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>Connexion</p>
            <h2 style={{ margin: '0 0 24px', color: '#062b59', fontSize: 28 }}>Accéder à votre espace</h2>
            <Link href="/login" style={{ display: 'flex', justifyContent: 'center', padding: '14px 18px', borderRadius: 12, background: '#062b59', color: '#fff', fontWeight: 900, textDecoration: 'none' }}>
              Se connecter
            </Link>
            <p style={{ margin: '16px 0 0', textAlign: 'center', color: '#8090a1', fontSize: 12 }}>Accès réservé · Connexion sécurisée</p>
          </div>
        </section>
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
