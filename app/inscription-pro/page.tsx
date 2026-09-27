'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

// Catégories professionnelles uniquement (account_type de client_accounts
// inclut aussi 'individual', jamais proposé ici — réservé aux dossiers créés
// par le staff pour un particulier).
const ACCOUNT_TYPE_OPTIONS: { id: string; label: string }[] = [
  { id: 'agency', label: 'Agence immobilière' },
  { id: 'syndic', label: 'Syndic de copropriété' },
  { id: 'notary', label: 'Notaire' },
  { id: 'landlord', label: 'Bailleur / Propriétaire' },
  { id: 'company', label: 'Entreprise' },
  { id: 'other', label: 'Autre professionnel' },
]

// Client dédié (pas lib/supabase.ts, qui lève une exception au chargement du
// module si les variables d'env sont absentes) : /inscription-pro est une
// page publique, elle doit continuer à s'afficher même si Supabase est mal
// configuré — seul ce formulaire doit échouer proprement dans ce cas (même
// principe que getLeadsClient() dans app/assistant/page.tsx). Contrairement
// à ce client jetable, la persistance de session est activée ici : on crée
// un vrai compte utilisateur destiné à être réutilisé.
const getSignupClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
}

type Status = 'idle' | 'submitting' | 'done' | 'error'

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
  // Confirmation email activée sur ce projet Supabase si signUp() ne renvoie
  // aucune session : on ne peut pas lire ce réglage autrement depuis ce repo
  // (comme is_internal(), c'est un paramètre du projet Supabase live, jamais
  // versionné) — on s'adapte donc dynamiquement à la réponse plutôt que de
  // supposer un réglage fixe.
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false)

  const canSubmit = EMAIL_PATTERN.test(email.trim())
    && password.trim().length >= 6
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

    const { data: signUpData, error: signUpError } = await client.auth.signUp({
      email: email.trim(),
      password,
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

    setEmailConfirmationRequired(!signUpData.session)

    // Id choisi côté client plutôt qu'un .select() après insert : si
    // client_accounts n'accorde pas de droit SELECT à ce rôle, .select()
    // échouerait silencieusement après un insert pourtant réussi — même
    // précaution que pour public.leads dans app/assistant/page.tsx.
    const accountId = crypto.randomUUID()
    const { error: accountError } = await client.from('client_accounts').insert({
      id: accountId,
      account_type: accountType,
      company_name: companyName.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      siret: siret.trim(),
      justificatif: justificatif.trim() || null,
      submitted_at: new Date().toISOString(),
    })

    if (accountError) {
      setStatus('error')
      setError(`Votre compte de connexion a été créé, mais les informations de votre demande n’ont pas pu être enregistrées (${accountError.message}). Merci de nous contacter directement au 06 15 70 36 70.`)
      return
    }

    const { error: membershipError } = await client.from('account_memberships').insert({
      account_id: accountId,
      user_id: userId,
      membership_role: 'owner',
      active: true,
    })

    if (membershipError) {
      setStatus('error')
      setError(`Votre demande a été enregistrée, mais l’association à votre compte de connexion a échoué (${membershipError.message}). Merci de nous contacter directement au 06 15 70 36 70.`)
      return
    }

    setStatus('done')
    fetch('/api/pro-signup/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: companyName.trim(),
        account_type: accountType,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        siret: siret.trim(),
      }),
    }).catch(() => {})
  }

  if (status === 'done') {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-head"><div className="login-logo">ARIA DIAGNOSTICS</div></div>
          <div className="login-body">
            <h1>Inscription envoyée</h1>
            {emailConfirmationRequired && (
              <p>Vérifiez votre boîte mail pour confirmer votre adresse email.</p>
            )}
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
        <div className="login-head"><div className="login-logo">ARIA DIAGNOSTICS</div></div>
        <div className="login-body">
          <h1>Créer un compte professionnel</h1>
          <p>Agences, syndics, notaires, bailleurs... Créez votre compte pro pour accéder à l’assistant de diagnostics ARIA. Votre demande sera examinée par notre équipe avant activation.</p>
          {error && <div className="error">{error}</div>}
          <form onSubmit={(e) => { e.preventDefault(); void submit() }}>
            <div className="field"><label>Adresse email</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
            <div className="field"><label>Mot de passe</label><input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></div>
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
