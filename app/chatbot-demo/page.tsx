import Script from 'next/script'

export const metadata = {
  title: 'Assistant ARIA Diagnostics',
  description: 'Démonstration du chatbot ARIA Diagnostics',
}

export default function ChatbotDemoPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#eef6fb 0%,#ffffff 58%)',
        color: '#16324f',
        fontFamily: 'Arial, Helvetica, sans-serif',
        padding: '48px 20px',
      }}
    >
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <img
          src="/logo-aria.svg"
          alt="ARIA Diagnostics"
          width={210}
          height={78}
          style={{ objectFit: 'contain', objectPosition: 'left center' }}
        />

        <section
          style={{
            marginTop: 28,
            background: '#fff',
            border: '1px solid #d9e4ef',
            borderRadius: 22,
            padding: '30px',
            boxShadow: '0 18px 55px rgba(6,43,89,.08)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0b6cb8', letterSpacing: '.08em' }}>
            VERSION DE TEST
          </div>
          <h1 style={{ margin: '7px 0 12px', fontSize: 34, color: '#062b59' }}>
            Assistant ARIA Diagnostics
          </h1>
          <p style={{ maxWidth: 690, lineHeight: 1.65, margin: 0, color: '#52657a' }}>
            Le bouton « Une question ? » en bas à droite ouvre le chatbot. Cette première version
            utilise uniquement des réponses métier contrôlées par ARIA : elle ne génère pas de
            réponse libre et n’enregistre pas les conversations.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))',
              gap: 12,
              marginTop: 24,
            }}
          >
            {[
              'T1 5 diagnostics',
              'Quels diagnostics pour une vente ?',
              'Faites-vous l’assainissement à Alfortville ?',
              'Quelle différence entre Carrez et Boutin ?',
            ].map((question) => (
              <div
                key={question}
                style={{
                  border: '1px solid #dce7f1',
                  borderRadius: 14,
                  padding: 14,
                  background: '#f8fbfd',
                  fontSize: 14,
                  lineHeight: 1.45,
                }}
              >
                {question}
              </div>
            ))}
          </div>
        </section>
      </div>

      <Script src="/aria-chatbot.js" strategy="afterInteractive" />
    </main>
  )
}
