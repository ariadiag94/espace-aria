'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard')
    })
  }, [router])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setError('Connexion impossible. Vérifie ton e-mail et ton mot de passe.')
    router.replace('/dashboard')
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-head"><div className="login-logo">ARIA DIAGNOSTICS</div></div>
        <div className="login-body">
          <h1>Bienvenue dans Espace ARIA</h1>
          <p>Accès sécurisé à l’administration interne.</p>
          {error && <div className="error">{error}</div>}
          <form onSubmit={submit}>
            <div className="field"><label>Adresse e-mail</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" /></div>
            <div className="field"><label>Mot de passe</label><input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" /></div>
            <button className="primary" disabled={loading}>{loading ? 'Connexion…' : 'Se connecter'}</button>
            <div style={{marginTop:14,textAlign:'center'}}><Link href="/mot-de-passe-oublie" style={{color:'#315f8f',fontWeight:700,fontSize:14}}>Mot de passe oublié ?</Link></div>
          </form>
        </div>
      </section>
    </main>
  )
}
