'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSignupClient } from '@/lib/pro-signup'

// Page d'invitation d'un collaborateur (lien reçu par e-mail, migration 029).
// - Connecté avec la bonne adresse : « Rejoindre » → rattachement au compte.
// - Pas de compte : création du mot de passe (adresse imposée), puis
//   rattachement, immédiatement ou après confirmation de l'e-mail (retour ici).
// - Compte existant : connexion puis retour ici.

type Invitation = { company_name: string; email: string; first_name: string | null; last_name: string | null; accepted: boolean }
const NAVY = '#062b59'
const SKY = '#23a5df'

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [inv, setInv] = useState<Invitation | null>(null)
  const [state, setState] = useState<'loading' | 'invalid' | 'ready' | 'wrong-user' | 'check-email' | 'joining'>('loading')
  const [sessionEmail, setSessionEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const client = getSignupClient()

  const accept = async () => {
    if (!client) return
    setState('joining'); setError('')
    const { error: e } = await client.rpc('accept_invitation', { p_token: token })
    if (e) { setError(e.message); setState('ready'); return }
    router.replace('/mon-espace')
  }

  useEffect(() => {
    void (async () => {
      if (!client) { setState('invalid'); return }
      const { data } = await client.rpc('get_invitation', { p_token: token })
      const row = (Array.isArray(data) ? data[0] : null) as Invitation | null
      if (!row) { setState('invalid'); return }
      setInv(row)
      const { data: { session } } = await client.auth.getSession()
      if (session) {
        const email = (session.user.email || '').toLowerCase()
        setSessionEmail(email)
        if (email !== row.email.toLowerCase()) { setState('wrong-user'); return }
        if (!row.accepted) { await accept(); return }
        router.replace('/mon-espace'); return
      }
      setState('ready')
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const signUp = async () => {
    if (!client || !inv) return
    setError(''); setState('joining')
    const { data, error: e } = await client.auth.signUp({
      email: inv.email,
      password,
      options: { data: { first_name: inv.first_name, last_name: inv.last_name }, emailRedirectTo: `${window.location.origin}/invitation/${token}` },
    })
    if (e) { setError(e.message.toLowerCase().includes('password') ? 'Mot de passe trop faible (8 caractères minimum).' : e.message); setState('ready'); return }
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError('Un compte existe déjà avec cette adresse : connectez-vous.'); setState('ready'); return
    }
    if (data.session) { await accept(); return }
    setState('check-email')
  }

  const name = inv ? [inv.first_name, inv.last_name].filter(Boolean).join(' ') : ''

  return (
    <main style={{ minHeight: '100vh', background: '#f3f6f9', fontFamily: 'Arial,Helvetica,sans-serif', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div style={{ width: 'min(440px,100%)', background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 60px rgba(11,45,83,.15)' }}>
        <div style={{ background: NAVY, padding: '22px 24px', borderBottom: `3px solid ${SKY}`, color: '#fff', fontWeight: 900, letterSpacing: '.06em' }}>ARIA DIAGNOSTICS</div>
        <div style={{ padding: 24 }}>
          {state === 'loading' && <p style={{ color: '#6f7d90' }}>Chargement…</p>}
          {state === 'invalid' && <><h1 style={{ color: NAVY, fontSize: 22 }}>Invitation introuvable</h1><p style={{ color: '#6f7d90' }}>Ce lien a expiré ou n’est plus valable. Demandez une nouvelle invitation à votre responsable, ou appelez ARIA au 06 15 70 36 70.</p></>}
          {inv && state !== 'invalid' && state !== 'loading' && (
            <>
              <h1 style={{ color: NAVY, fontSize: 22, margin: '0 0 6px' }}>Rejoindre {inv.company_name}</h1>
              <p style={{ color: '#6f7d90', margin: '0 0 18px', fontSize: 14 }}>{name ? `${name}, v` : 'V'}ous êtes invité(e) sur l’espace ARIA de votre agence : demandes de devis, tarif partenaire et dossiers partagés.</p>
              {state === 'wrong-user' && (
                <div style={{ fontSize: 14 }}>
                  <p>Vous êtes connecté(e) avec <b>{sessionEmail}</b>, mais l’invitation a été envoyée à <b>{inv.email}</b>.</p>
                  <button onClick={async () => { await client?.auth.signOut(); setState('ready') }} style={{ border: 0, borderRadius: 11, padding: '12px 16px', background: NAVY, color: '#fff', fontWeight: 800, cursor: 'pointer', width: '100%' }}>Changer de compte</button>
                </div>
              )}
              {state === 'check-email' && <p style={{ fontSize: 14 }}>Dernière étape : cliquez sur le lien de confirmation envoyé à <b>{inv.email}</b>. Vous reviendrez ici et accéderez directement à l’espace de l’agence.</p>}
              {state === 'joining' && <p style={{ color: '#6f7d90' }}>Un instant…</p>}
              {state === 'ready' && (
                <div style={{ display: 'grid', gap: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#42536a' }}>E-mail<input value={inv.email} readOnly style={{ display: 'block', width: '100%', marginTop: 6, border: '1px solid #cfdce8', borderRadius: 11, padding: '12px 13px', background: '#f5f8fc', fontSize: 16 }} /></label>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#42536a' }}>Choisissez un mot de passe (8 caractères minimum)<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" style={{ display: 'block', width: '100%', marginTop: 6, border: '1px solid #cfdce8', borderRadius: 11, padding: '12px 13px', fontSize: 16 }} /></label>
                  <button disabled={password.length < 8} onClick={signUp} style={{ border: 0, borderRadius: 11, padding: '13px 16px', background: password.length < 8 ? '#9fb3c8' : NAVY, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Créer mon accès et rejoindre</button>
                  <Link href={`/login?next=/invitation/${token}`} style={{ textAlign: 'center', color: '#0b65b5', fontWeight: 700, fontSize: 13 }}>J’ai déjà un compte ARIA : me connecter</Link>
                </div>
              )}
              {error && <div style={{ marginTop: 12, background: '#fff0f0', color: '#a62d2d', border: '1px solid #ffcfcf', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>{error}</div>}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
