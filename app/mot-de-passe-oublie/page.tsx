'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const redirectTo = `${window.location.origin}/reinitialiser-mot-de-passe`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setLoading(false)
    if (error) return setError('Impossible d’envoyer l’e-mail de réinitialisation. Réessaie dans quelques minutes.')
    setSent(true)
  }

  return <main className="login-page"><section className="login-card"><div className="login-head"><div className="login-logo">ARIA DIAGNOSTICS</div></div><div className="login-body">
    <h1>Mot de passe oublié</h1>
    <p>Reçois un lien sécurisé pour choisir un nouveau mot de passe.</p>
    {error&&<div className="error">{error}</div>}
    {sent?<div><div style={{padding:13,border:'1px solid #b9e4c7',borderRadius:10,background:'#f1fbf4',color:'#176b35',fontWeight:700}}>E-mail envoyé. Ouvre le message Supabase puis clique sur « Reset password ».</div><div style={{marginTop:16,textAlign:'center'}}><Link href="/login">Retour à la connexion</Link></div></div>:<form onSubmit={submit}><div className="field"><label>Adresse e-mail ARIA</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" /></div><button className="primary" disabled={loading}>{loading?'Envoi…':'Envoyer le lien'}</button><div style={{marginTop:14,textAlign:'center'}}><Link href="/login">Retour à la connexion</Link></div></form>}
  </div></section></main>
}
