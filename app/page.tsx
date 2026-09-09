import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(180deg,#f8fbff 0%,#eef5fb 100%)',
        fontFamily: 'Arial,Helvetica,sans-serif',
      }}
    >
      <section style={{ width: '100%', maxWidth: 760, textAlign: 'center' }}>
        <p
          style={{
            margin: '0 0 14px',
            color: '#59708a',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
          }}
        >
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
            gap: 18,
            width: 'min(100%, 620px)',
            minHeight: 360,
            padding: '46px 32px',
            background: '#fff',
            border: '1px solid #dbe7f2',
            borderRadius: 30,
            boxShadow: '0 24px 70px rgba(6,43,89,.14)',
            textDecoration: 'none',
            transition: 'transform .18s ease, box-shadow .18s ease',
          }}
        >
          <Image
            src="/logo-aria.svg"
            alt="ARIA Diagnostics"
            width={390}
            height={144}
            priority
            style={{ width: 'min(82vw, 390px)', height: 'auto', objectFit: 'contain' }}
          />

          <div>
            <h1
              style={{
                margin: 0,
                color: '#062b59',
                fontSize: 'clamp(29px,5vw,46px)',
                lineHeight: 1.05,
                letterSpacing: '-.03em',
              }}
            >
              Espace ARIA
            </h1>
            <p style={{ margin: '12px 0 0', color: '#63768a', fontSize: 16 }}>
              Cliquez sur le logo pour entrer
            </p>
          </div>
        </Link>

        <p style={{ margin: '20px 0 0', color: '#8090a1', fontSize: 12 }}>
          Accès sécurisé · ARIA Diagnostics
        </p>
      </section>
    </main>
  )
}
