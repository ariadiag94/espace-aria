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
// null si absent/invalide : dans ce cas la destination par défaut se décide
// dynamiquement (voir resolveDefaultDestination) plutôt que de supposer
// /dashboard pour tout le monde — un compte pro n'a rien à faire sur le
// dashboard staff.
const safeNextPath = (value: string | null) =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : null

// Chantier "compte pro", portail client V1 (2026-09-27) : sans next explicite
// (lien générique vers /login, ou next invalide), la destination dépend du
// type de compte — un membre interne (profiles.role in ('admin','staff'))
// reste dirigé vers /dashboard comme avant, tout le reste (compte pro
// aujourd'hui, compte individuel plus tard) part vers /mon-espace, qui gère
// lui-même l'affinage pending/rejected/no-account (même pattern que la garde
// de /assistant, Phase 4). En cas d'échec de la vérification (RPC en erreur),
// on ne suppose jamais /dashboard par défaut : direction la plus restrictive.
const resolveDefaultDestination = async (explicitNext: string | null) => {
  if (explicitNext) return explicitNext
  const { data: isStaff } = await supabase.rpc('is_staff_or_admin')
  return isStaff ? '/dashboard' : '/mon-espace'
}

function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const explicitNext = safeNextPath(searchParams.get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Session déjà active + reason renseigné : l'utilisateur est déjà connecté
  // mais n'a pas accès à la page d'où il vient (pro en attente/refusé) — dans
  // ce cas précis, ne pas le renvoyer silencieusement vers sa destination par
  // défaut (le comportement normal ci-dessous), afficher le message à la place.
  const [alreadyLoggedInBlocked, setAlreadyLoggedInBlocked] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      if (reason) {
        if (!cancelled) setAlreadyLoggedInBlocked(true)
        return
      }
      const destination = await resolveDefaultDestination(explicitNext)
      if (!cancelled) router.replace(destination)
    })
    return () => { cancelled = true }
  }, [router, reason, explicitNext])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoading(false)
      return setError('Connexion impossible. Vérifie ton e-mail et ton mot de passe.')
    }
    const destination = await resolveDefaultDestination(explicitNext)
    setLoading(false)
    router.replace(destination)
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
