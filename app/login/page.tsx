'use client'

import Link from 'next/link'
import { FormEvent, Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Messages affichés quand /login est atteint via une redirection depuis une
// page fermée au grand public (voir app/assistant/page.tsx, chantier "compte
// pro" Phase 4) — ?reason=... précise pourquoi l'accès a été refusé.
const REASON_MESSAGE: Record<string, string> = {
  anonymous: 'Connectez-vous ou créez un compte professionnel pour accéder au simulateur.',
  pending: 'Votre compte est en cours de validation par notre équipe.',
  rejected: 'Votre demande de compte professionnel n’a pas été validée. Contactez-nous pour plus d’informations.',
  'no-account': 'Connectez-vous avec un compte professionnel validé, ou créez-en un, pour accéder au simulateur.',
}

// Un chemin relatif uniquement (jamais une URL absolue) : évite qu'un lien
// "next" forgé ne redirige l'utilisateur vers un site externe après connexion.
const safeNextPath = (value: string | null) =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'

function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const next = safeNextPath(searchParams.get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Session déjà active + reason renseigné : l'utilisateur est déjà connecté
  // mais n'a pas accès à la page d'où il vient (pro en attente/refusé) — dans
  // ce cas précis, ne pas le renvoyer silencieusement vers /dashboard (le
  // comportement normal ci-dessous), afficher le message à la place.
  const [alreadyLoggedInBlocked, setAlreadyLoggedInBlocked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        if (reason) setAlreadyLoggedInBlocked(true)
        else router.replace(next)
      }
    })
  }, [router, reason, next])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setError('Connexion impossible. Vérifie ton e-mail et ton mot de passe.')
    router.replace(next)
  }

  async function logout() {
    await supabase.auth.signOut()
    setAlreadyLoggedInBlocked(false)
  }

  if (alreadyLoggedInBlocked) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-head"><div className="login-logo">ARIA DIAGNOSTICS</div></div>
          <div className="login-body">
            <h1>Accès non disponible</h1>
            <p>{REASON_MESSAGE[reason || ''] || REASON_MESSAGE['no-account']}</p>
            <div style={{ marginTop: 14, textAlign: 'center', display: 'grid', gap: 8 }}>
              <button className="primary" onClick={logout} style={{ width: 'auto' }}>Se déconnecter</button>
              <Link href="/" style={{ color: '#315f8f', fontWeight: 700, fontSize: 14 }}>Retour à l’accueil</Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-head"><div className="login-logo">ARIA DIAGNOSTICS</div></div>
        <div className="login-body">
          <h1>Bienvenue dans Espace ARIA</h1>
          <p>Accès sécurisé à l’administration interne.</p>
          {reason && (
            <div className="error" style={{ background: '#fff8e6', color: '#7a5612', borderColor: '#f0c76a' }}>
              {REASON_MESSAGE[reason] || REASON_MESSAGE['no-account']}
            </div>
          )}
          {error && <div className="error">{error}</div>}
          <form onSubmit={submit}>
            <div className="field"><label>Adresse e-mail</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" /></div>
            <div className="field"><label>Mot de passe</label><input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" /></div>
            <button className="primary" disabled={loading}>{loading ? 'Connexion…' : 'Se connecter'}</button>
            <div style={{marginTop:14,textAlign:'center'}}><Link href="/mot-de-passe-oublie" style={{color:'#315f8f',fontWeight:700,fontSize:14}}>Mot de passe oublié ?</Link></div>
            {reason === 'anonymous' && (
              <div style={{marginTop:8,textAlign:'center'}}><Link href="/inscription-pro" style={{color:'#315f8f',fontWeight:700,fontSize:14}}>Créer un compte professionnel</Link></div>
            )}
          </form>
        </div>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}
