import Image from 'next/image'
import Link from 'next/link'

type HomeProps = {
  searchParams: Promise<{ v?: string }>
}

const navStyle = (active: boolean) => ({
  padding: '9px 13px',
  borderRadius: 999,
  textDecoration: 'none',
  fontWeight: 800,
  fontSize: 13,
  color: active ? '#fff' : '#315f8f',
  background: active ? '#062b59' : '#fff',
  border: '1px solid #d8e4ef',
  boxShadow: active ? '0 6px 18px rgba(6,43,89,.18)' : 'none',
})

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams
  const variant = ['a', 'b', 'c'].includes(String(params.v || '').toLowerCase())
    ? String(params.v).toLowerCase()
    : 'a'

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 24,
        background:
          variant === 'b'
            ? 'radial-gradient(circle at 50% 18%,#14477c 0%,#062b59 44%,#041d3d 100%)'
            : 'linear-gradient(180deg,#f8fbff 0%,#edf4fa 100%)',
        fontFamily: 'Arial,Helvetica,sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <nav
        style={{
          alignSelf: 'center',
          display: 'flex',
          gap: 8,
          padding: 6,
          borderRadius: 999,
          background: variant === 'b' ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.78)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 28px rgba(6,43,89,.10)',
          marginBottom: 24,
        }}
      >
        <Link href="/?v=a" style={navStyle(variant === 'a')}>A · Logo premium</Link>
        <Link href="/?v=b" style={navStyle(variant === 'b')}>B · Plein écran</Link>
        <Link href="/?v=c" style={navStyle(variant === 'c')}>C · Connexion directe</Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {variant === 'a' && (
          <section style={{ width: '100%', maxWidth: 760, textAlign: 'center' }}>
            <p style={{ margin: '0 0 14px', color: '#59708a', fontSize: 14, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
              Espace professionnel
            </p>
            <Link
              href="/login"
              aria-label="Entrer dans Espace ARIA"
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                width: 'min(100%, 620px)',
                minHeight: 380,
                padding: '48px 32px',
                background: '#fff',
                border: '1px solid #dbe7f2',
                borderRadius: 30,
                boxShadow: '0 24px 70px rgba(6,43,89,.14)',
                textDecoration: 'none',
              }}
            >
              <Image src="/logo-aria.svg" alt="ARIA Diagnostics" width={410} height={152} priority style={{ width: 'min(82vw,410px)', height: 'auto', objectFit: 'contain' }} />
              <div>
                <h1 style={{ margin: 0, color: '#062b59', fontSize: 'clamp(30px,5vw,48px)', lineHeight: 1.05, letterSpacing: '-.03em' }}>Espace ARIA</h1>
                <p style={{ margin: '12px 0 0', color: '#63768a', fontSize: 16 }}>Cliquez pour entrer</p>
              </div>
            </Link>
            <p style={{ margin: '20px 0 0', color: '#8090a1', fontSize: 12 }}>Accès sécurisé · ARIA Diagnostics</p>
          </section>
        )}

        {variant === 'b' && (
          <section style={{ width: '100%', maxWidth: 980, textAlign: 'center', color: '#fff' }}>
            <div style={{ display: 'inline-flex', padding: '34px 44px', borderRadius: 36, background: 'rgba(255,255,255,.96)', boxShadow: '0 30px 90px rgba(0,0,0,.26)' }}>
              <Image src="/logo-aria.svg" alt="ARIA Diagnostics" width={470} height={174} priority style={{ width: 'min(80vw,470px)', height: 'auto', objectFit: 'contain' }} />
            </div>
            <h1 style={{ margin: '34px 0 10px', fontSize: 'clamp(38px,7vw,68px)', lineHeight: 1, letterSpacing: '-.045em' }}>Espace ARIA</h1>
            <p style={{ margin: '0 auto 28px', maxWidth: 560, color: '#c9d8e8', fontSize: 17 }}>Votre espace professionnel ARIA Diagnostics</p>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 220, padding: '15px 24px', borderRadius: 14, background: '#fff', color: '#062b59', fontWeight: 900, textDecoration: 'none', boxShadow: '0 12px 30px rgba(0,0,0,.16)' }}>
              Accéder à l’espace →
            </Link>
          </section>
        )}

        {variant === 'c' && (
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
        )}
      </div>

      <p style={{ textAlign: 'center', margin: '22px 0 0', color: variant === 'b' ? '#9eb5cc' : '#8b9aaa', fontSize: 12 }}>
        Aperçu de conception · choisissez A, B ou C
      </p>
    </main>
  )
}
