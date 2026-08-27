'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
      else setError('Ce lien est invalide ou a expiré. Demande un nouveau lien depuis la page de connexion.')
    })
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault(); setError('')
    if (password.length < 10) return setError('Le mot de passe doit contenir au moins 10 caractères.')
    if (password !== confirmation) return setError('Les deux mots de passe ne correspondent pas.')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return setError('La modification a échoué. Demande un nouveau lien de réinitialisation.')
    await supabase.auth.signOut()
    router.replace('/login?password=updated')
  }

  return <main className="login-page"><section className="login-card"><div className="login-head"><div className="login-logo">ARIA DIAGNOSTICS</div></div><div className="login-body">
    <h1>Nouveau mot de passe</h1>
    <p>Choisis un mot de passe ARIA d’au moins 10 caractères.</p>
    {error&&<div className="error">{error}</div>}
    {ready&&<form onSubmit={submit}><div className="field"><label>Nouveau mot de passe</label><input type="password" required minLength={10} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" /></div><div className="field"><label>Confirmer le mot de passe</label><input type="password" required minLength={10} value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="new-password" /></div><button className="primary" disabled={loading}>{loading?'Modification…':'Enregistrer le nouveau mot de passe'}</button></form>}
  </div></section></main>
}
