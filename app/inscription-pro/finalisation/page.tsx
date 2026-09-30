'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createProAccount, getSignupClient } from '@/lib/pro-signup'

type Status = 'checking' | 'creating' | 'done' | 'no-session' | 'error'

// Atteinte via le lien de confirmation email envoyé par Supabase Auth
// (emailRedirectTo configuré dans /inscription-pro) : la confirmation email
// étant activée sur ce projet, signUp() ne renvoyait aucune session pour
// écrire tout de suite dans client_accounts/account_memberships — c'est ici,
// une fois l'utilisateur réellement authentifié après avoir cliqué le lien,
// que la création du compte pro est réellement effectuée.
export default function InscriptionProFinalisationPage() {
  const [status, setStatus] = useState<Status>('checking')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const client = getSignupClient()
      if (!client) {
        if (!cancelled) {
          setStatus('error')
          setError('Le service d’inscription n’est pas encore configuré. Merci de nous contacter directement au 06 15 70 36 70.')
        }
        return
      }

      const { data: sessionData } = await client.auth.getSession()
      const session = sessionData.session
      if (!session) {
        if (!cancelled) setStatus('no-session')
        return
      }

      const userId = session.user.id
      const email = session.user.email || ''
      const metadata = (session.user.user_metadata || {}) as Record<string, unknown>

      // Rechargement de cette page après une création déjà réussie (ou lien
      // cliqué deux fois) : ne jamais dupliquer la demande.
      const { data: existingMembership, error: membershipLookupError } = await client
        .from('account_memberships')
        .select('account_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (membershipLookupError) {
        if (!cancelled) {
          setStatus('error')
          setError(`Impossible de vérifier votre demande (${membershipLookupError.message}). Merci de nous contacter directement au 06 15 70 36 70.`)
        }
        return
      }

      if (existingMembership) {
        if (!cancelled) setStatus('done')
        return
      }

      const companyName = String(metadata.company_name || '').trim()
      const accountType = String(metadata.account_type || '').trim()
      const firstName = String(metadata.first_name || '').trim()
      const lastName = String(metadata.last_name || '').trim()
      const phone = String(metadata.phone || '').trim()
      const siret = String(metadata.siret || '').trim()
      const justificatif = String(metadata.justificatif || '').trim()

      if (!companyName || !accountType || !firstName || !lastName || !phone || !siret) {
        if (!cancelled) {
          setStatus('error')
          setError('Les informations de votre inscription sont introuvables. Merci de recommencer l’inscription.')
        }
        return
      }

      if (!cancelled) setStatus('creating')

      const { error: createError } = await createProAccount(client, userId, email, {
        companyName,
        accountType,
        firstName,
        lastName,
        phone,
        siret,
        justificatif,
      })

      if (!cancelled) {
        if (createError) {
          setStatus('error')
          setError(createError)
        } else {
          setStatus('done')
        }
      }
    }

    void run()
    return () => { cancelled = true }
  }, [])

  if (status === 'checking' || status === 'creating') {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-head"><div className="login-logo"><img src="/logo-aria-white-sm.png" alt="ARIA Diagnostics" style={{ height: 58, width: 'auto', display: 'block', margin: '0 auto' }} /></div></div>
          <div className="login-body">
            <p>Finalisation de votre inscription…</p>
          </div>
        </section>
      </main>
    )
  }

  if (status === 'no-session') {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-head"><div className="login-logo"><img src="/logo-aria-white-sm.png" alt="ARIA Diagnostics" style={{ height: 58, width: 'auto', display: 'block', margin: '0 auto' }} /></div></div>
          <div className="login-body">
            <h1>Lien invalide ou expiré</h1>
            <p>Ce lien de confirmation n’est plus valide, ou votre demande a déjà été traitée. Reconnectez-vous, ou recommencez l’inscription si vous n’avez pas encore de compte.</p>
            <div style={{ marginTop: 14, textAlign: 'center', display: 'grid', gap: 8 }}>
              <Link href="/login" style={{ color: '#315f8f', fontWeight: 700, fontSize: 14 }}>Se connecter</Link>
              <Link href="/inscription-pro" style={{ color: '#315f8f', fontWeight: 700, fontSize: 14 }}>Recommencer l’inscription</Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-head"><div className="login-logo"><img src="/logo-aria-white-sm.png" alt="ARIA Diagnostics" style={{ height: 58, width: 'auto', display: 'block', margin: '0 auto' }} /></div></div>
          <div className="login-body">
            <h1>Un problème est survenu</h1>
            <div className="error">{error}</div>
            <div style={{ marginTop: 14, textAlign: 'center' }}>
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
        <div className="login-head"><div className="login-logo"><img src="/logo-aria-white-sm.png" alt="ARIA Diagnostics" style={{ height: 58, width: 'auto', display: 'block', margin: '0 auto' }} /></div></div>
        <div className="login-body">
          <h1>Inscription confirmée</h1>
          <p>Merci pour votre inscription. Votre demande est en cours d’examen par notre équipe, vous recevrez un email de confirmation dès qu’elle sera validée.</p>
          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <Link href="/" style={{ color: '#315f8f', fontWeight: 700, fontSize: 14 }}>Retour à l’accueil</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
