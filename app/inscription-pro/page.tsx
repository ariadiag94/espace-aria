'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ACCOUNT_TYPE_OPTIONS, createProAccount, getSignupClient } from '@/lib/pro-signup'

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/
// Minimum exigé par la configuration Auth de ce projet Supabase (constaté via
// l'erreur renvoyée lors d'un test réel, ce réglage n'étant pas visible depuis
// ce repo) — affiché explicitement sous le champ pour ne pas laisser
// l'utilisateur découvrir la contrainte seulement après un échec de soumission.
const MIN_PASSWORD_LENGTH = 8

type Status = 'idle' | 'submitting' | 'done' | 'awaiting-confirmation' | 'error'

export default function InscriptionProPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [accountType, setAccountType] = useState(ACCOUNT_TYPE_OPTIONS[0].id)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [siret, setSiret] = useState('')
  const [justificatif, setJustificatif] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  const canSubmit = EMAIL_PATTERN.test(email.trim())
    && password.trim().length >= MIN_PASSWORD_LENGTH
    && companyName.trim().length > 0
    && firstName.trim().length > 0
    && lastName.trim().length > 0
    && phone.trim().length > 0
    && siret.trim().length > 0

  const submit = async () => {
    if (!canSubmit || status === 'submitting') return
    setStatus('submitting')
    setError('')

    const client = getSignupClient()
    if (!client) {
      setStatus('error')
      setError('Le service d’inscription n’est pas encore configuré. Merci de réessayer plus tard, ou de nous contacter directement.')
      return
    }

    // Agence déjà inscrite (même SIRET) : le collaborateur doit être invité
    // par son responsable plutôt que de créer un second compte agence.
    const { data: siretTaken } = await client.rpc('pro_account_exists_for_siret', { p_siret: siret.trim() })
    if (siretTaken) {
      setStatus('error')
      setError('Votre agence a déjà un compte ARIA. Demandez à votre responsable de vous inviter depuis son espace (rubrique « Mon équipe »), ou appelez-nous au 06 15 70 36 70.')
      return
    }

    // Les informations du formulaire sont passées en user_metadata : la
    // confirmation email étant activée sur ce projet Supabase (constaté lors
    // d'un test réel), aucune session n'est disponible ici pour écrire tout
    // de suite dans client_accounts/account_memberships — ces données
    // doivent survivre jusqu'à ce que l'utilisateur clique le lien de
    // confirmation et atterrisse sur /inscription-pro/finalisation avec une
    // vraie session, sans dépendre d'un stockage intermédiaire (localStorage,
    // etc.) qui ne survivrait pas forcément au changement d'onglet/appareil.
    const { data: signUpData, error: signUpError } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          company_name: companyName.trim(),
          account_type: accountType,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          siret: siret.trim(),
          justificatif: justificatif.trim(),
        },
        emailRedirectTo: `${window.location.origin}/inscription-pro/finalisation`,
      },
    })

    if (signUpError) {
      setStatus('error')
      const message = signUpError.message.toLowerCase()
      setError(
        message.includes('already registered') || message.includes('already exists')
          ? 'Un compte existe déjà avec cette adresse email. Essayez de vous connecter, ou utilisez « Mot de passe oublié » sur la page de connexion.'
          : `Impossible de créer le compte : ${signUpError.message}`,
      )
      return
    }

    // Quand la confirmation email est activée, Supabase ne renvoie pas
    // d'erreur explicite pour un email déjà utilisé et déjà confirmé (pour ne
    // pas permettre l'énumération d'adresses) : le seul signal disponible est
    // un tableau identities vide sur l'utilisateur renvoyé.
    if (signUpData.user && Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
      setStatus('error')
      setError('Un compte existe déjà avec cette adresse email. Essayez de vous connecter, ou utilisez « Mot de passe oublié » sur la page de connexion.')
      return
    }

    const userId = signUpData.user?.id
    if (!userId) {
      setStatus('error')
      setError('Le compte n’a pas pu être créé. Merci de réessayer.')
      return
    }

    // Pas de session renvoyée : confirmation email requise, la création du
    // compte pro est différée jusqu'à /inscription-pro/finalisation (voir
    // cette page). Tenter l'insertion ici échouerait de toute façon (rôle
    // anon, aucune policy ne l'autorise) — inutile de le faire pour ensuite
    // afficher une erreur qui ne serait due qu'à une étape prématurée.
    if (!signUpData.session) {
      setStatus('awaiting-confirmation')
      return
    }

    const { error: createError } = await createProAccount(client, userId, email.trim(), {
      companyName: companyName.trim(),
      accountType,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      siret: siret.trim(),
      justificatif: justificatif.trim(),
    })

    if (createError) {
      setStatus('error')
      setError(createError)
      return
    }

    setStatus('done')
  }

  if (status === 'awaiting-confirmation') {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-head"><div className="login-logo"><img src="/logo-aria-white-sm.png" alt="ARIA Diagnostics" style={{ height: 58, width: 'auto', display: 'block', margin: '0 auto' }} /></div></div>
          <div className="login-body">
            <h1>Vérifiez votre boîte mail</h1>
            <p>Un email de confirmation vous a été envoyé à {email.trim()}. Cliquez sur le lien qu’il contient pour finaliser votre inscription — votre demande sera alors transmise à notre équipe.</p>
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <Link href="/" style={{ color: '#315f8f', fontWeight: 700, fontSize: 14 }}>Retour à l’accueil</Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (status === 'done') {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-head"><div className="login-logo"><img src="/logo-aria-white-sm.png" alt="ARIA Diagnostics" style={{ height: 58, width: 'auto', display: 'block', margin: '0 auto' }} /></div></div>
          <div className="login-body">
            <h1>Inscription envoyée</h1>
            <p>Merci pour votre inscription. Votre demande est en cours d’examen par notre équipe, vous recevrez un email de confirmation dès qu’elle sera validée.</p>
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
      <section className="login-card" style={{ width: 'min(560px, 100%)' }}>
        <div className="login-head"><div className="login-logo"><img src="/logo-aria-white-sm.png" alt="ARIA Diagnostics" style={{ height: 58, width: 'auto', display: 'block', margin: '0 auto' }} /></div></div>
        <div className="login-body">
          <h1>Créer un compte professionnel</h1>
          <p>Agences, syndics, notaires, bailleurs... Créez votre compte pro pour accéder à l’assistant de diagnostics ARIA. Votre demande sera examinée par notre équipe avant activation.</p>
          {error && <div className="error">{error}</div>}
          <form onSubmit={(e) => { e.preventDefault(); void submit() }}>
            <div className="field"><label>Adresse email</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
            <div className="field">
              <label>Mot de passe</label>
              <input type="password" required minLength={MIN_PASSWORD_LENGTH} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              <p style={{ margin: '7px 0 0', color: '#6f7d90', fontSize: 12 }}>{MIN_PASSWORD_LENGTH} caractères minimum.</p>
            </div>
            <div className="field"><label>Nom de la société / structure</label><input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
            <div className="field">
              <label>Type de compte</label>
              <select value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                {ACCOUNT_TYPE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <div className="field"><label>Prénom</label><input required value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
              <div className="field"><label>Nom</label><input required value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
            </div>
            <div className="field"><label>Téléphone</label><input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="field"><label>SIRET</label><input required value={siret} onChange={(e) => setSiret(e.target.value)} /></div>
            <div className="field"><label>Justificatif (carte professionnelle, si vous en avez un — optionnel)</label><input value={justificatif} onChange={(e) => setJustificatif(e.target.value)} /></div>
            <button className="primary" disabled={!canSubmit || status === 'submitting'}>{status === 'submitting' ? 'Envoi…' : 'Créer mon compte pro'}</button>
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <Link href="/login" style={{ color: '#315f8f', fontWeight: 700, fontSize: 14 }}>Déjà un compte pro ? Se connecter</Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
